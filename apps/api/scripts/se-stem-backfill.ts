import { execFile } from 'child_process';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { load } from 'cheerio';
import { FileState, GoogleGenAI, createPartFromText } from '@google/genai';
import {
  IngestionJobStatus,
  Prisma,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import type { IngestionOpsService } from '../src/ingestion/ingestion-ops.service';
import {
  normalizeIngestionDraft,
  type DraftNode,
  type IngestionDraft,
} from '../src/ingestion/ingestion.contract';
import type { IngestionService } from '../src/ingestion/ingestion.service';
import { validateIngestionDraft } from '../src/ingestion/ingestion-validation';
import { mapWithConcurrency } from '../src/ingestion/intake-runtime';
import {
  buildCanonicalEddirasaDocumentFileName,
  buildEddirasaDocumentStorageKey,
  type EddirasaStorageContext,
} from '../src/ingestion/eddirasa-normalization';
import { splitCombinedPdf } from '../src/ingestion/pdf-split';
import {
  R2StorageClient,
  readR2ConfigFromEnv,
} from '../src/ingestion/r2-storage';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createIngestionScriptContext } from './ingestion-script-context';

const execFileAsync = promisify(execFile);
let prisma: PrismaService;
let ingestionOpsService: IngestionOpsService;
let ingestionService: IngestionService;

const TARGET_STREAM_CODE = 'SE';
const TARGET_SUBJECT_CODES = [
  'MATHEMATICS',
  'PHYSICS',
  'NATURAL_SCIENCES',
] as const;
const SUBJECT_PRIORITY: Record<(typeof TARGET_SUBJECT_CODES)[number], number> =
  {
    MATHEMATICS: 0,
    PHYSICS: 1,
    NATURAL_SCIENCES: 2,
  };
const MIN_YEAR = 2008;
const MAX_YEAR = 2025;
const GEMINI_MODEL = 'gemini-3-flash-preview';
const GEMINI_MAX_OUTPUT_TOKENS = 32768;
const GEMINI_TEMPERATURE = 0.1;
const PAGE_STAGE_CONCURRENCY = 2;
const FILE_READY_TIMEOUT_MS = 120_000;
const FILE_READY_POLL_MS = 2_000;

const REVIEW_SYSTEM_INSTRUCTION = `
You review extracted Algerian BAC exam drafts and assign metadata only.

Return strict JSON only.
Do not rewrite exam content.
Do not invent new topic codes.
Assign topic codes only to root EXERCISE nodes.
Review maxPoints for EXERCISE, QUESTION, and SUBQUESTION nodes.
Keep existing explicit point values unless they are clearly inconsistent with the draft.
Only infer missing point values when they are reasonably supported by the extracted statement or correction.
If a point value is not reasonably recoverable, prefer null over guessing.
When inferring point values, keep them consistent with the parent exercise total when possible and prefer common BAC quarter-point increments.
Choose the smallest faithful set of topic codes that covers each exercise.
If an exercise clearly spans multiple official topics, you may return multiple codes.
Keep to the provided allowed topic codes only.
`.trim();

const REVIEW_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['exerciseTopics', 'nodePoints', 'notes'],
  properties: {
    exerciseTopics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nodeId', 'topicCodes'],
        properties: {
          nodeId: { type: 'string' },
          topicCodes: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    nodePoints: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nodeId', 'maxPoints'],
        properties: {
          nodeId: { type: 'string' },
          maxPoints: {
            anyOf: [{ type: 'number' }, { type: 'null' }],
          },
        },
      },
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

const SUBJECT_PAGE_URLS: Record<(typeof TARGET_SUBJECT_CODES)[number], string> =
  {
    MATHEMATICS: 'https://www.dzexams.com/fr/bac/mathematiques/se',
    PHYSICS: 'https://www.dzexams.com/fr/bac/physique/se',
    NATURAL_SCIENCES: 'https://www.dzexams.com/fr/bac/sciences-naturelles/se',
  };

type GeminiKeyState = {
  envName: string;
  value: string;
  exhausted: boolean;
};

type CanonicalJob = {
  id: string;
  label: string;
  provider: string;
  year: number;
  streamCode: string | null;
  subjectCode: string | null;
  sessionType: SessionType | null;
  status: IngestionJobStatus;
  reviewNotes: string | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  publishedExamId: string | null;
  publishedPaperId: string | null;
  metadata: Prisma.JsonValue | null;
  draftJson: Prisma.JsonValue;
  sourceDocuments: Array<{
    id: string;
    kind: SourceDocumentKind;
    storageKey: string;
    fileName: string;
    pageCount: number | null;
    sha256: string | null;
    sourceUrl: string | null;
    metadata: Prisma.JsonValue | null;
    pages: Array<{
      id: string;
      pageNumber: number;
    }>;
  }>;
};

type TopicOption = {
  id: string;
  code: string;
  name: string;
};

type TagReviewResult = {
  exerciseTopics: Array<{
    nodeId: string;
    topicCodes: string[];
  }>;
  nodePoints: Array<{
    nodeId: string;
    maxPoints: number | null;
  }>;
  notes: string[];
};

type RootExerciseEntry = {
  node: DraftNode;
  text: string;
};

async function main() {
  await loadApiEnv();
  const {
    app,
    prisma: prismaService,
    ingestionOpsService: opsService,
    ingestionService: adminIngestionService,
  } = await createIngestionScriptContext();
  prisma = prismaService;
  ingestionOpsService = opsService;
  ingestionService = adminIngestionService;

  try {
    const storage = new R2StorageClient(readR2ConfigFromEnv());
    const geminiKeys = loadGeminiKeys();

    if (geminiKeys.length === 0) {
      throw new Error(
        'No Gemini API keys were found in apps/api/.env, apps/api/.env.local, or the current shell.',
      );
    }

    const topicOptionsBySubject = await loadTopicOptionsBySubject();
    const canonicalJobs = await loadCanonicalJobs();

    const runSummary = {
      repairedCorrections: [] as string[],
      rasterizedJobs: [] as string[],
      reExtractedJobs: [] as string[],
      approvedJobs: [] as string[],
      taggedPublishedJobs: [] as string[],
      skippedDuplicates: [] as string[],
      blockedJobs: [] as Array<{ jobId: string; reason: string }>,
      exhaustedKeys: [] as string[],
    };

    for (const job of canonicalJobs) {
      const slug = readJobSlug(job);
      if (slug?.endsWith('-2')) {
        runSummary.skippedDuplicates.push(
          `${job.year} ${job.subjectCode} ${slug}`,
        );
        continue;
      }

      if (!isTargetJob(job)) {
        continue;
      }

      if (job.provider !== 'eddirasa') {
        continue;
      }

      const repaired = await ensureCorrectionDocument(job, storage);
      if (repaired) {
        runSummary.repairedCorrections.push(
          `${job.year} ${job.subjectCode} ${job.id}`,
        );
      }
    }

    const refreshedJobs = await loadCanonicalJobs();
    const canonicalById = new Map(refreshedJobs.map((job) => [job.id, job]));

    const jobsNeedingRasterization = refreshedJobs.filter((job) => {
      const slug = readJobSlug(job);

      if (
        !isTargetJob(job) ||
        slug?.endsWith('-2') ||
        job.provider !== 'eddirasa'
      ) {
        return false;
      }

      if (job.status === IngestionJobStatus.PUBLISHED) {
        return false;
      }

      return needsRasterization(job);
    });

    const rasterizedLabels = await mapWithConcurrency(
      jobsNeedingRasterization,
      PAGE_STAGE_CONCURRENCY,
      async (job) => {
        await runIngestionStage('pages', job.id);
        return `${job.year} ${job.subjectCode} ${job.id}`;
      },
    );

    runSummary.rasterizedJobs.push(...rasterizedLabels);

    let stopForGeminiExhaustion = false;

    for (const job of await loadCanonicalJobs()) {
      const slug = readJobSlug(job);
      if (
        !isTargetJob(job) ||
        slug?.endsWith('-2') ||
        job.provider !== 'eddirasa'
      ) {
        continue;
      }

      const extractionModel = readExtractionModel(job.draftJson);
      const shouldReextract =
        (job.status === IngestionJobStatus.DRAFT &&
          !isGemini3Model(extractionModel)) ||
        job.status === IngestionJobStatus.FAILED ||
        (job.status === IngestionJobStatus.APPROVED &&
          !isGemini3Model(extractionModel));

      if (!shouldReextract) {
        continue;
      }

      if (job.status === IngestionJobStatus.APPROVED) {
        await ingestionOpsService.resetToDraft(job.id);
      }

      let extractionOutcome: Awaited<ReturnType<typeof withGeminiKey<void>>>;

      try {
        extractionOutcome = await withGeminiKey(
          geminiKeys,
          async (key) => {
            await runIngestionStage('ocr', job.id, key.value, true);
          },
          {
            taskLabel: `ocr ${job.year} ${job.subjectCode} ${job.id}`,
            maxAttemptsPerKey: 3,
            shouldRetry: isRetryableGeminiTaskError,
          },
        );
      } catch (error) {
        runSummary.blockedJobs.push({
          jobId: job.id,
          reason: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      if (extractionOutcome === 'exhausted') {
        stopForGeminiExhaustion = true;
        break;
      }

      runSummary.reExtractedJobs.push(
        `${job.year} ${job.subjectCode} ${job.id}`,
      );
    }

    if (stopForGeminiExhaustion) {
      runSummary.exhaustedKeys.push(
        ...geminiKeys
          .filter((entry) => entry.exhausted)
          .map((entry) => entry.envName),
      );
    }

    for (const job of await loadCanonicalJobs()) {
      const slug = readJobSlug(job);
      if (!isTargetJob(job) || slug?.endsWith('-2')) {
        continue;
      }

      const subjectCode =
        job.subjectCode as (typeof TARGET_SUBJECT_CODES)[number];
      const topicOptions = topicOptionsBySubject.get(subjectCode) ?? [];
      const draft = normalizeIngestionDraft(job.draftJson);
      const rootExercises = collectRootExercises(draft);

      if (rootExercises.length > 0) {
        let reviewOutcome: Awaited<
          ReturnType<typeof withGeminiKey<TagReviewResult>>
        >;

        try {
          reviewOutcome = await withGeminiKey(
            geminiKeys,
            async (key) => {
              const result = await reviewDraftMetadataWithGemini({
                key: key.value,
                job,
                draft,
                topicOptions,
                rootExercises,
              });

              applyExerciseTopicCodes(draft, result.exerciseTopics);
              applyReviewedNodePoints(draft, result.nodePoints);
              return result;
            },
            {
              taskLabel: `topics ${job.year} ${job.subjectCode} ${job.id}`,
              maxAttemptsPerKey: 2,
              shouldRetry: isRetryableGeminiTaskError,
            },
          );
        } catch (error) {
          runSummary.blockedJobs.push({
            jobId: job.id,
            reason: error instanceof Error ? error.message : String(error),
          });
          continue;
        }

        if (reviewOutcome === 'exhausted') {
          stopForGeminiExhaustion = true;
          break;
        }

        const pointCoverage = summarizePointCoverage(draft);
        const nextReviewNotes = [
          `Automated SE backlog review on ${new Date().toISOString()}.`,
          `Topic tags added at exercise level.`,
          `Question and subquestion points reviewed on a best-effort basis.`,
          `Point coverage: ${pointCoverage.withPoints}/${pointCoverage.totalQuestionNodes} question nodes have maxPoints.`,
          ...reviewOutcome.notes.slice(0, 5),
        ].join(' ');

        await ingestionOpsService.saveDraft(job.id, {
          draft,
          reviewNotes: nextReviewNotes,
        });

        if (
          job.status === IngestionJobStatus.PUBLISHED &&
          job.publishedPaperId
        ) {
          await syncPublishedPaperTopics(
            job.publishedPaperId,
            subjectCode,
            draft,
          );
          runSummary.taggedPublishedJobs.push(
            `${job.year} ${job.subjectCode} ${job.id}`,
          );
        }
      }

      if (
        job.status === IngestionJobStatus.DRAFT ||
        job.status === IngestionJobStatus.FAILED
      ) {
        const saved = await prisma.ingestionJob.findUnique({
          where: {
            id: job.id,
          },
          select: {
            id: true,
            year: true,
            streamCode: true,
            subjectCode: true,
            sessionType: true,
            draftJson: true,
          },
        });

        if (!saved) {
          continue;
        }

        const nextDraft = normalizeIngestionDraft(saved.draftJson);
        const validation = validateIngestionDraft(nextDraft);
        const pointCoverage = summarizePointCoverage(nextDraft);
        const topicCoverage = summarizeRootExerciseTopicCoverage(nextDraft);
        const blockingReasons = [...validation.errors];

        if (topicCoverage.withTopics < topicCoverage.totalExercises) {
          blockingReasons.push(
            `missing_root_topics:${topicCoverage.withTopics}/${topicCoverage.totalExercises}`,
          );
        }

        if (
          pointCoverage.totalQuestionNodes > 0 &&
          pointCoverage.withPoints === 0
        ) {
          blockingReasons.push(
            `no_question_points:${pointCoverage.withPoints}/${pointCoverage.totalQuestionNodes}`,
          );
        }

        if (blockingReasons.length > 0) {
          runSummary.blockedJobs.push({
            jobId: job.id,
            reason: blockingReasons.slice(0, 3).join(' | '),
          });
          continue;
        }

        await ingestionService.approveJob(job.id);

        runSummary.approvedJobs.push(
          `${job.year} ${job.subjectCode} ${job.id}`,
        );
      }
    }

    console.log(
      JSON.stringify(
        {
          ...runSummary,
          geminiKeys: geminiKeys.map((entry) => ({
            envName: entry.envName,
            exhausted: entry.exhausted,
          })),
          stoppedForGeminiExhaustion: stopForGeminiExhaustion,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

async function loadApiEnv() {
  const apiRoot = path.resolve(__dirname, '..');
  const envFiles = [
    path.join(apiRoot, '.env'),
    path.join(apiRoot, '.env.local'),
  ];
  const initialEnvKeys = new Set(Object.keys(process.env));

  for (const envPath of envFiles) {
    let raw: string;

    try {
      raw = await fs.readFile(envPath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }

      throw error;
    }

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const source = trimmed.startsWith('export ')
        ? trimmed.slice('export '.length).trimStart()
        : trimmed;
      const separatorIndex = source.indexOf('=');

      if (separatorIndex < 0) {
        continue;
      }

      const key = source.slice(0, separatorIndex).trim();

      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || initialEnvKeys.has(key)) {
        continue;
      }

      let value = source.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        const quote = value[0];
        value = value.slice(1, -1);

        if (quote === '"') {
          value = value
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t');
        }
      } else {
        const commentMatch = value.match(/^(.*?)\s+#.*$/);
        if (commentMatch) {
          value = commentMatch[1].trimEnd();
        }
      }

      process.env[key] = value;
    }
  }
}

function loadGeminiKeys() {
  const envNames = [
    'GEMINI_API_KEY',
    'another_gemini-key',
    'a_third_gemini_key',
    'a_fourth_gemini_key',
    'a_fifth_gemini_key',
    'a_sixth_gemini_key',
  ];

  return envNames
    .map((envName) => ({
      envName,
      value: normalizeOptionalString(process.env[envName]) ?? '',
      exhausted: false,
    }))
    .filter((entry) => entry.value.length > 0);
}

async function loadTopicOptionsBySubject() {
  const topics = await prisma.topic.findMany({
    where: {
      subject: {
        code: {
          in: [...TARGET_SUBJECT_CODES],
        },
      },
    },
    orderBy: [
      {
        subject: {
          code: 'asc',
        },
      },
      {
        displayOrder: 'asc',
      },
      {
        code: 'asc',
      },
    ],
    select: {
      id: true,
      code: true,
      name: true,
      subject: {
        select: {
          code: true,
        },
      },
    },
  });
  const map = new Map<string, TopicOption[]>();

  for (const topic of topics) {
    const bucket = map.get(topic.subject.code) ?? [];
    bucket.push({
      id: topic.id,
      code: topic.code,
      name: topic.name,
    });
    map.set(topic.subject.code, bucket);
  }

  return map;
}

async function loadCanonicalJobs(): Promise<CanonicalJob[]> {
  const jobs = await prisma.ingestionJob.findMany({
    where: {
      year: {
        gte: MIN_YEAR,
        lte: MAX_YEAR,
      },
      streamCode: TARGET_STREAM_CODE,
      subjectCode: {
        in: [...TARGET_SUBJECT_CODES],
      },
    },
    orderBy: [
      {
        year: 'desc',
      },
      {
        subjectCode: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
    select: {
      id: true,
      label: true,
      provider: true,
      year: true,
      streamCode: true,
      subjectCode: true,
      sessionType: true,
      status: true,
      reviewNotes: true,
      reviewedAt: true,
      publishedAt: true,
      publishedExamId: true,
      publishedPaperId: true,
      metadata: true,
      draftJson: true,
      sourceDocuments: {
        orderBy: {
          kind: 'asc',
        },
        select: {
          id: true,
          kind: true,
          storageKey: true,
          fileName: true,
          pageCount: true,
          sha256: true,
          sourceUrl: true,
          metadata: true,
          pages: {
            orderBy: {
              pageNumber: 'asc',
            },
            select: {
              id: true,
              pageNumber: true,
            },
          },
        },
      },
    },
  });

  const deduped = new Map<string, CanonicalJob>();

  for (const job of jobs) {
    const key = `${job.year}:${job.subjectCode}`;
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, job);
      continue;
    }

    const existingSlug = readJobSlug(existing);
    const nextSlug = readJobSlug(job);

    if (existing.provider === 'published_revision') {
      deduped.set(key, job);
      continue;
    }

    if (nextSlug && !nextSlug.endsWith('-2') && existingSlug?.endsWith('-2')) {
      deduped.set(key, job);
      continue;
    }

    if (
      job.status === IngestionJobStatus.PUBLISHED &&
      existing.status !== IngestionJobStatus.PUBLISHED
    ) {
      deduped.set(key, job);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => {
    const subjectPriorityDifference =
      getSubjectPriority(left.subjectCode) -
      getSubjectPriority(right.subjectCode);

    if (subjectPriorityDifference !== 0) {
      return subjectPriorityDifference;
    }

    if (left.year !== right.year) {
      return right.year - left.year;
    }

    return left.label.localeCompare(right.label);
  });
}

function getSubjectPriority(subjectCode: string | null) {
  if (
    subjectCode &&
    Object.prototype.hasOwnProperty.call(SUBJECT_PRIORITY, subjectCode)
  ) {
    return SUBJECT_PRIORITY[
      subjectCode as (typeof TARGET_SUBJECT_CODES)[number]
    ];
  }

  return Number.MAX_SAFE_INTEGER;
}

function isTargetJob(
  job: Pick<CanonicalJob, 'streamCode' | 'subjectCode' | 'year'>,
) {
  return (
    job.streamCode === TARGET_STREAM_CODE &&
    job.subjectCode !== null &&
    TARGET_SUBJECT_CODES.includes(
      job.subjectCode as (typeof TARGET_SUBJECT_CODES)[number],
    ) &&
    job.year >= MIN_YEAR &&
    job.year <= MAX_YEAR
  );
}

function readJobSlug(job: Pick<CanonicalJob, 'metadata' | 'draftJson'>) {
  const metadata = asRecord(job.metadata);
  if (typeof metadata?.slug === 'string' && metadata.slug.trim().length > 0) {
    return metadata.slug.trim();
  }

  const draft = asRecord(job.draftJson);
  const exam = asRecord(draft?.exam);
  const examMetadata = asRecord(exam?.metadata);

  return typeof examMetadata?.slug === 'string' &&
    examMetadata.slug.trim().length > 0
    ? examMetadata.slug.trim()
    : null;
}

function needsRasterization(job: CanonicalJob) {
  return job.sourceDocuments.some((document) => {
    if (document.pageCount === null) {
      return document.pages.length === 0;
    }

    return document.pages.length !== document.pageCount;
  });
}

async function ensureCorrectionDocument(
  job: CanonicalJob,
  storage: R2StorageClient,
) {
  const hasCorrection = job.sourceDocuments.some(
    (document) => document.kind === SourceDocumentKind.CORRECTION,
  );

  if (hasCorrection) {
    return false;
  }

  const subjectCode = job.subjectCode as (typeof TARGET_SUBJECT_CODES)[number];
  const dzDownload = await resolveDzExamsDownloadUrl(subjectCode, job.year);

  if (!dzDownload) {
    return false;
  }

  const examDocument = job.sourceDocuments.find(
    (document) => document.kind === SourceDocumentKind.EXAM,
  );

  if (!examDocument) {
    return false;
  }

  const examPageCount = await resolveExamPageCount(examDocument, storage);
  if (!examPageCount || examPageCount < 1) {
    return false;
  }

  const combinedBuffer = await fetchBuffer(dzDownload);
  const split = await splitCombinedPdf(combinedBuffer, examPageCount);
  const correctionBuffer = split.correctionBuffer;
  const correctionSha = hashBuffer(correctionBuffer);
  const slug = readJobSlug(job);
  const context: EddirasaStorageContext = {
    year: job.year,
    streamCode: job.streamCode,
    subjectCode: job.subjectCode,
    sessionType: job.sessionType ?? SessionType.NORMAL,
    slug,
  };
  const fileName = buildCanonicalEddirasaDocumentFileName(
    context,
    SourceDocumentKind.CORRECTION,
  );
  const storageKey = buildEddirasaDocumentStorageKey(context, fileName);

  await storage.putObject({
    key: storageKey,
    body: correctionBuffer,
    contentType: 'application/pdf',
    metadata: {
      sourcePageUrl: `dzexams:${subjectCode}:${job.year}`,
    },
  });

  const created = await prisma.sourceDocument.upsert({
    where: {
      jobId_kind: {
        jobId: job.id,
        kind: SourceDocumentKind.CORRECTION,
      },
    },
    update: {
      storageKey,
      fileName,
      mimeType: 'application/pdf',
      pageCount:
        split.correctionPageRange.end - split.correctionPageRange.start + 1,
      sha256: correctionSha,
      sourceUrl: dzDownload,
      language: 'ar',
      metadata: toJsonValue({
        alternateSourceProvider: 'dzexams',
        combinedSource: true,
        splitPageRange: split.correctionPageRange,
        addedByScript: 'se-stem-backfill',
      }),
    },
    create: {
      jobId: job.id,
      kind: SourceDocumentKind.CORRECTION,
      storageKey,
      fileName,
      mimeType: 'application/pdf',
      pageCount:
        split.correctionPageRange.end - split.correctionPageRange.start + 1,
      sha256: correctionSha,
      sourceUrl: dzDownload,
      language: 'ar',
      metadata: toJsonValue({
        alternateSourceProvider: 'dzexams',
        combinedSource: true,
        splitPageRange: split.correctionPageRange,
        addedByScript: 'se-stem-backfill',
      }),
    },
    select: {
      id: true,
      storageKey: true,
    },
  });

  const draft = normalizeIngestionDraft(job.draftJson);
  draft.exam.correctionDocumentId = created.id;
  draft.exam.correctionDocumentStorageKey = created.storageKey;
  draft.exam.metadata = {
    ...draft.exam.metadata,
    correctionPdfUrl: dzDownload,
    alternateCorrectionSourceProvider: 'dzexams',
  };

  const metadata = {
    ...(asRecord(job.metadata) ?? {}),
    correctionPdfUrl: dzDownload,
    alternateCorrectionSourceProvider: 'dzexams',
  };

  await ingestionOpsService.resetToDraft(job.id, {
    draft,
    metadata,
    preservePublishedStatus: true,
  });

  return true;
}

async function resolveDzExamsDownloadUrl(
  subjectCode: (typeof TARGET_SUBJECT_CODES)[number],
  year: number,
) {
  const pageUrl = SUBJECT_PAGE_URLS[subjectCode];
  const html = await fetchText(pageUrl);
  const $ = load(html);
  let matchedDataId: string | null = null;

  $('.item').each((_, element) => {
    if (matchedDataId) {
      return;
    }

    const entryYear = Number.parseInt($(element).attr('data-year') ?? '', 10);
    if (entryYear !== year) {
      return;
    }

    const dataId =
      $(element).find('.btn-item-annale').attr('data-id')?.trim() ?? null;

    if (dataId) {
      matchedDataId = dataId;
    }
  });

  if (!matchedDataId) {
    return null;
  }

  const annaleUrl = `https://www.dzexams.com/fr/annales/${decodeDzExamsDataId(matchedDataId)}`;
  const annaleHtml = await fetchText(annaleUrl);
  const annale = load(annaleHtml);
  const downloadUrl =
    annale('#actions-download').attr('href')?.trim() ??
    annale('a#actions-download').attr('href')?.trim() ??
    null;

  return downloadUrl;
}

function decodeDzExamsDataId(value: string) {
  const decoded = Buffer.from(value, 'base64').toString('utf8');
  let result = '';

  for (const char of decoded) {
    result += String.fromCharCode(char.charCodeAt(0) - 8);
  }

  return result;
}

async function resolveExamPageCount(
  document: CanonicalJob['sourceDocuments'][number],
  storage: R2StorageClient,
) {
  if (document.pageCount && document.pageCount > 0) {
    return document.pageCount;
  }

  if (document.pages.length > 0) {
    return document.pages.length;
  }

  const buffer = await readDocumentBuffer(document, storage);
  return getPdfPageCount(buffer);
}

async function readDocumentBuffer(
  document: CanonicalJob['sourceDocuments'][number],
  storage: R2StorageClient,
) {
  try {
    return await storage.getObjectBuffer(document.storageKey);
  } catch (error) {
    if (!document.sourceUrl) {
      throw error;
    }

    return fetchBuffer(document.sourceUrl);
  }
}

async function getPdfPageCount(buffer: Buffer) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bac-pdfinfo-'));
  const filePath = path.join(tempDir, 'document.pdf');

  try {
    await fs.writeFile(filePath, buffer);
    const { stdout } = await execFileAsync('pdfinfo', [filePath], {
      encoding: 'utf8',
    });
    const match = stdout.match(/^Pages:\s+(\d+)$/m);
    return match ? Number.parseInt(match[1], 10) : null;
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

async function runIngestionStage(
  stage: 'pages' | 'ocr',
  jobId: string,
  geminiApiKey?: string,
  replaceExisting = false,
) {
  const tsNodeBin = await resolveTsNodeBin();
  const args = [
    '--transpile-only',
    'scripts/ingest-eddirasa-bac.ts',
    '--stage',
    stage,
    '--job-id',
    jobId,
  ];

  if (replaceExisting) {
    args.push('--replace-existing');
  }

  if (stage === 'ocr') {
    args.push('--gemini-model', GEMINI_MODEL);
    args.push(
      '--gemini-max-output-tokens',
      `${GEMINI_MAX_OUTPUT_TOKENS}`,
      '--gemini-temperature',
      `${GEMINI_TEMPERATURE}`,
    );
  }

  const env = {
    ...process.env,
    ...(geminiApiKey
      ? {
          GEMINI_API_KEY: geminiApiKey,
        }
      : {}),
  };

  try {
    await execFileAsync(tsNodeBin, args, {
      cwd: path.resolve(__dirname, '..'),
      env,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf8',
      ...(stage === 'pages'
        ? {
            stdio: 'ignore',
          }
        : {}),
    });
  } catch (error) {
    const output = describeExecError(error);
    throw new Error(output);
  }
}

async function resolveTsNodeBin() {
  const candidates = [
    path.resolve(__dirname, '../node_modules/.bin/ts-node'),
    path.resolve(__dirname, '../../../node_modules/.bin/ts-node'),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error('Could not locate ts-node for ingestion stage subprocesses.');
}

async function reviewDraftMetadataWithGemini(input: {
  key: string;
  job: CanonicalJob;
  draft: IngestionDraft;
  topicOptions: TopicOption[];
  rootExercises: RootExerciseEntry[];
}): Promise<TagReviewResult> {
  const ai = new GoogleGenAI({
    apiKey: input.key,
  });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      createPartFromText(
        buildReviewPrompt(input.job, input.topicOptions, input.rootExercises),
      ),
    ],
    config: {
      systemInstruction: REVIEW_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseJsonSchema: REVIEW_RESPONSE_SCHEMA,
      temperature: 0,
      maxOutputTokens: 8192,
    },
  });

  const rawText = response.text?.trim();

  if (!rawText) {
    throw new Error(
      `Gemini returned an empty tagging response for ${input.job.id}.`,
    );
  }

  return normalizeTagReviewResult(JSON.parse(rawText), input.topicOptions);
}

function buildReviewPrompt(
  job: CanonicalJob,
  topicOptions: TopicOption[],
  rootExercises: RootExerciseEntry[],
) {
  return [
    `Review extracted BAC exam metadata only.`,
    `Year: ${job.year}`,
    `Stream: ${job.streamCode ?? 'unknown'}`,
    `Subject: ${job.subjectCode ?? 'unknown'}`,
    `Allowed topic codes:`,
    ...topicOptions.map((topic) => `- ${topic.code}: ${topic.name}`),
    `Assign topic codes to each root exercise node below.`,
    `Review maxPoints for every EXERCISE, QUESTION, and SUBQUESTION node shown below.`,
    `Use only the allowed topic codes.`,
    `Return one exerciseTopics entry per root exercise node.`,
    `Return one nodePoints entry per EXERCISE, QUESTION, or SUBQUESTION node shown below.`,
    `Keep current maxPoints when it already looks faithful.`,
    `If you infer missing points, stay conservative and prefer null over unsupported guesses.`,
    ...rootExercises.map((entry, index) =>
      [
        `Exercise ${index + 1}`,
        `nodeId: ${entry.node.id}`,
        `label: ${entry.node.label ?? ''}`,
        `currentMaxPoints: ${entry.node.maxPoints ?? 'null'}`,
        `text:`,
        truncate(entry.text, 7000),
      ].join('\n'),
    ),
  ].join('\n\n');
}

function normalizeTagReviewResult(
  value: unknown,
  topicOptions: TopicOption[],
): TagReviewResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Tag review response must be a JSON object.');
  }

  const raw = value as Record<string, unknown>;
  const allowedTopicCodes = new Set(topicOptions.map((topic) => topic.code));
  const exerciseTopics = Array.isArray(raw.exerciseTopics)
    ? raw.exerciseTopics
        .map((entry) => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return null;
          }

          const candidate = entry as Record<string, unknown>;
          const nodeId =
            typeof candidate.nodeId === 'string' &&
            candidate.nodeId.trim().length > 0
              ? candidate.nodeId.trim()
              : null;
          const topicCodes = Array.isArray(candidate.topicCodes)
            ? candidate.topicCodes
                .filter(
                  (code): code is string =>
                    typeof code === 'string' &&
                    allowedTopicCodes.has(code.trim()),
                )
                .map((code) => code.trim())
            : [];

          if (!nodeId) {
            return null;
          }

          return {
            nodeId,
            topicCodes: Array.from(new Set(topicCodes)),
          };
        })
        .filter(
          (
            entry,
          ): entry is {
            nodeId: string;
            topicCodes: string[];
          } => Boolean(entry),
        )
    : [];

  const notes = Array.isArray(raw.notes)
    ? raw.notes.filter(
        (note): note is string =>
          typeof note === 'string' && note.trim().length > 0,
      )
    : [];
  const nodePoints = Array.isArray(raw.nodePoints)
    ? raw.nodePoints
        .map((entry) => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return null;
          }

          const candidate = entry as Record<string, unknown>;
          const nodeId =
            typeof candidate.nodeId === 'string' &&
            candidate.nodeId.trim().length > 0
              ? candidate.nodeId.trim()
              : null;
          const maxPoints = normalizeReviewedPointValue(candidate.maxPoints);

          if (!nodeId) {
            return null;
          }

          return {
            nodeId,
            maxPoints,
          };
        })
        .filter(
          (
            entry,
          ): entry is {
            nodeId: string;
            maxPoints: number | null;
          } => Boolean(entry),
        )
    : [];

  return {
    exerciseTopics,
    nodePoints,
    notes,
  };
}

function collectRootExercises(draft: IngestionDraft) {
  const entries: RootExerciseEntry[] = [];

  for (const variant of draft.variants) {
    const nodesByParent = new Map<string | null, DraftNode[]>();

    for (const node of variant.nodes) {
      const bucket = nodesByParent.get(node.parentId) ?? [];
      bucket.push(node);
      nodesByParent.set(node.parentId, bucket);
    }

    for (const bucket of nodesByParent.values()) {
      bucket.sort((left, right) => left.orderIndex - right.orderIndex);
    }

    const rootExercises = (nodesByParent.get(null) ?? []).filter(
      (node) => node.nodeType === 'EXERCISE',
    );

    for (const root of rootExercises) {
      entries.push({
        node: root,
        text: buildExerciseReviewText(root, nodesByParent),
      });
    }
  }

  return entries;
}

function buildExerciseReviewText(
  root: DraftNode,
  nodesByParent: Map<string | null, DraftNode[]>,
) {
  const parts: string[] = [];
  const queue = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    parts.push(
      [
        `nodeId=${node.id}`,
        `nodeType=${node.nodeType}`,
        `orderIndex=${node.orderIndex}`,
        node.label ? `label=${node.label}` : null,
        node.parentId ? `parentId=${node.parentId}` : null,
        node.maxPoints !== null ? `maxPoints=${node.maxPoints}` : null,
      ]
        .filter(Boolean)
        .join(' | '),
    );

    for (const block of node.blocks) {
      if (!block.value.trim()) {
        continue;
      }

      parts.push(`${block.role}:${block.type}:${block.value.trim()}`);
    }

    const children = nodesByParent.get(node.id) ?? [];
    queue.push(...children);
  }

  return parts.join('\n');
}

function applyExerciseTopicCodes(
  draft: IngestionDraft,
  exerciseTopics: Array<{
    nodeId: string;
    topicCodes: string[];
  }>,
) {
  const topicCodesByNodeId = new Map(
    exerciseTopics.map((entry) => [entry.nodeId, entry.topicCodes]),
  );

  for (const variant of draft.variants) {
    for (const node of variant.nodes) {
      if (node.parentId !== null || node.nodeType !== 'EXERCISE') {
        continue;
      }

      const nextTopicCodes = topicCodesByNodeId.get(node.id);

      if (nextTopicCodes) {
        node.topicCodes = nextTopicCodes;
      }
    }
  }
}

function applyReviewedNodePoints(
  draft: IngestionDraft,
  nodePoints: Array<{
    nodeId: string;
    maxPoints: number | null;
  }>,
) {
  const maxPointsByNodeId = new Map(
    nodePoints.map((entry) => [entry.nodeId, entry.maxPoints]),
  );

  for (const variant of draft.variants) {
    for (const node of variant.nodes) {
      if (
        node.nodeType !== 'EXERCISE' &&
        node.nodeType !== 'QUESTION' &&
        node.nodeType !== 'SUBQUESTION'
      ) {
        continue;
      }

      if (!maxPointsByNodeId.has(node.id)) {
        continue;
      }

      node.maxPoints = maxPointsByNodeId.get(node.id) ?? null;
    }
  }
}

function summarizePointCoverage(draft: IngestionDraft) {
  let totalQuestionNodes = 0;
  let withPoints = 0;

  for (const variant of draft.variants) {
    for (const node of variant.nodes) {
      if (node.nodeType === 'QUESTION' || node.nodeType === 'SUBQUESTION') {
        totalQuestionNodes += 1;

        if (node.maxPoints !== null) {
          withPoints += 1;
        }
      }
    }
  }

  return {
    totalQuestionNodes,
    withPoints,
  };
}

function summarizeRootExerciseTopicCoverage(draft: IngestionDraft) {
  let totalExercises = 0;
  let withTopics = 0;

  for (const variant of draft.variants) {
    for (const node of variant.nodes) {
      if (node.parentId !== null || node.nodeType !== 'EXERCISE') {
        continue;
      }

      totalExercises += 1;

      if (node.topicCodes.length > 0) {
        withTopics += 1;
      }
    }
  }

  return {
    totalExercises,
    withTopics,
  };
}

function normalizeReviewedPointValue(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  if (value < 0 || value > 30) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

async function syncPublishedPaperTopics(
  paperId: string,
  subjectCode: string,
  draft: IngestionDraft,
) {
  const topicOptions = await prisma.topic.findMany({
    where: {
      subject: {
        code: subjectCode,
      },
    },
    select: {
      id: true,
      code: true,
    },
  });
  const topicIdByCode = new Map(
    topicOptions.map((topic) => [topic.code, topic.id]),
  );
  const rootExerciseTopics = new Map<string, string[]>();

  for (const variant of draft.variants) {
    for (const node of variant.nodes) {
      if (node.parentId === null && node.nodeType === 'EXERCISE') {
        rootExerciseTopics.set(node.id, node.topicCodes);
      }
    }
  }

  const publishedNodes = await prisma.examNode.findMany({
    where: {
      variant: {
        paperId,
      },
      parentId: null,
      nodeType: 'EXERCISE',
      status: 'PUBLISHED',
    },
    select: {
      id: true,
      metadata: true,
    },
  });

  for (const node of publishedNodes) {
    const metadata = asRecord(node.metadata);
    const importedFromDraftNodeId =
      typeof metadata?.importedFromDraftNodeId === 'string'
        ? metadata.importedFromDraftNodeId
        : null;
    const topicCodes =
      importedFromDraftNodeId !== null
        ? (rootExerciseTopics.get(importedFromDraftNodeId) ?? [])
        : [];

    await prisma.examNodeTopic.deleteMany({
      where: {
        nodeId: node.id,
      },
    });

    if (topicCodes.length === 0) {
      continue;
    }

    await prisma.examNodeTopic.createMany({
      data: topicCodes
        .map((code) => topicIdByCode.get(code) ?? null)
        .filter((topicId): topicId is string => Boolean(topicId))
        .map((topicId) => ({
          nodeId: node.id,
          topicId,
        })),
      skipDuplicates: true,
    });
  }
}

async function withGeminiKey<T>(
  keys: GeminiKeyState[],
  task: (key: GeminiKeyState) => Promise<T>,
  input: {
    taskLabel: string;
    maxAttemptsPerKey?: number;
    shouldRetry?: (message: string) => boolean;
  },
): Promise<T | 'exhausted'> {
  for (const key of keys) {
    if (key.exhausted) {
      continue;
    }

    const maxAttemptsPerKey = Math.max(1, input.maxAttemptsPerKey ?? 1);

    for (let attempt = 1; attempt <= maxAttemptsPerKey; attempt += 1) {
      try {
        return await task(key);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (isGeminiRateLimitError(message)) {
          key.exhausted = true;
          break;
        }

        if (input.shouldRetry?.(message) && attempt < maxAttemptsPerKey) {
          continue;
        }

        throw new Error(`${input.taskLabel}: ${message}`);
      }
    }
  }

  return 'exhausted';
}

function isGemini3Model(model: string | null) {
  return typeof model === 'string' && model.includes('gemini-3');
}

function readExtractionModel(value: Prisma.JsonValue) {
  const draft = asRecord(value);
  const exam = asRecord(draft?.exam);
  const metadata = asRecord(exam?.metadata);
  const extraction = asRecord(metadata?.extraction);

  return typeof extraction?.model === 'string' ? extraction.model : null;
}

function isGeminiRateLimitError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('resource_exhausted') ||
    normalized.includes('rate limit') ||
    normalized.includes('quota') ||
    normalized.includes('429') ||
    normalized.includes('high demand') ||
    normalized.includes('unavailable')
  );
}

function isRetryableGeminiStructuredOutputError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('invalid json') ||
    normalized.includes('json at position') ||
    normalized.includes('empty tagging response') ||
    normalized.includes('returned an empty')
  );
}

function isRetryableGeminiTransientError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('fetch failed') ||
    normalized.includes('timed out') ||
    normalized.includes('timeout') ||
    normalized.includes('socket hang up') ||
    normalized.includes('connection reset') ||
    normalized.includes('econnreset') ||
    normalized.includes('etimedout') ||
    normalized.includes('eai_again') ||
    normalized.includes('network error') ||
    normalized.includes('temporary') ||
    normalized.includes('temporarily unavailable')
  );
}

function isRetryableGeminiTaskError(message: string) {
  return (
    isRetryableGeminiStructuredOutputError(message) ||
    isRetryableGeminiTransientError(message)
  );
}

function describeExecError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return String(error);
  }

  const candidate = error as {
    stdout?: string | Buffer;
    stderr?: string | Buffer;
    message?: string;
  };

  const parts = [
    candidate.message ?? '',
    typeof candidate.stdout === 'string'
      ? candidate.stdout
      : (candidate.stdout?.toString('utf8') ?? ''),
    typeof candidate.stderr === 'string'
      ? candidate.stderr
      : (candidate.stderr?.toString('utf8') ?? ''),
  ]
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return parts.join('\n');
}

async function fetchText(url: string) {
  const { stdout } = await execFileAsync(
    'curl',
    [
      '-L',
      '--fail',
      '--silent',
      '--show-error',
      '--max-time',
      '30',
      '-A',
      'BAC Bank backfill bot/1.0',
      '-H',
      'Accept: text/html,application/xhtml+xml',
      url,
    ],
    {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  return stdout;
}

async function fetchBuffer(url: string) {
  const { stdout } = await execFileAsync(
    'curl',
    [
      '-L',
      '--fail',
      '--silent',
      '--show-error',
      '--max-time',
      '60',
      '-A',
      'BAC Bank backfill bot/1.0',
      '-H',
      'Accept: application/pdf,*/*',
      url,
    ],
    {
      encoding: 'buffer',
      maxBuffer: 50 * 1024 * 1024,
    },
  );

  return stdout as Buffer;
}

function hashBuffer(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function normalizeOptionalString(value: string | undefined | null) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
