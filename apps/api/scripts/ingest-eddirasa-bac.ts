import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { CheerioAPI, load } from 'cheerio';
import {
  IngestionJobStatus,
  Prisma,
  PrismaClient,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import sharp from 'sharp';
import {
  createEmptyDraft,
  normalizeIngestionDraft,
  type DraftSourcePage,
} from '../src/ingestion/ingestion.contract';
import {
  fetchBufferWithRetry,
  fetchTextWithRetry,
  mapWithConcurrency,
  retryWithBackoff,
} from '../src/ingestion/intake-runtime';
import {
  buildCanonicalEddirasaDocumentFileName,
  buildEddirasaDocumentStorageKey,
  buildEddirasaPageStorageKey,
  deriveEddirasaMetadata,
  fileNameFromUrl,
  normalizeLookup,
  slugifySegment,
  stripPdfExtension,
  type EddirasaStorageContext,
} from '../src/ingestion/eddirasa-normalization';
import { resolveAlternatePdfSource } from '../src/ingestion/alternate-pdf-sources';
import {
  extractDraftWithGemini,
  hasGeminiApiKeyConfigured,
  hasGeminiExtraction,
  readDefaultGeminiMaxOutputTokens,
  readDefaultGeminiModel,
  readDefaultGeminiTemperature,
} from '../src/ingestion/gemini-extractor';
import { splitCombinedPdf } from '../src/ingestion/pdf-split';
import {
  R2StorageClient,
  readR2ConfigFromEnv,
} from '../src/ingestion/r2-storage';

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();
let r2Client: R2StorageClient | null = null;

const DEFAULT_LISTING_URL = 'https://eddirasa.com/bac-solutions/';
const DEFAULT_MIN_YEAR = 2008;
const DEFAULT_RASTER_DPI = readPositiveIntegerEnv('INGESTION_RASTER_DPI', 220);
const DEFAULT_JOB_CONCURRENCY = readPositiveIntegerEnv(
  'INGESTION_JOB_CONCURRENCY',
  2,
);
const DEFAULT_PAGE_CONCURRENCY = readPositiveIntegerEnv(
  'INGESTION_PAGE_CONCURRENCY',
  4,
);
const DEFAULT_DETAIL_PAGE_CONCURRENCY = readPositiveIntegerEnv(
  'INGESTION_DETAIL_PAGE_CONCURRENCY',
  8,
);

type CliOptions = {
  listingUrl: string;
  minYear: number;
  maxYear: number | null;
  limit: number | null;
  dryRun: boolean;
  replaceExisting: boolean;
  stage: 'full' | 'originals' | 'pages' | 'ocr' | 'process';
  jobIds: string[];
  slugs: string[];
  geminiModel: string;
  geminiMaxOutputTokens: number;
  geminiTemperature: number;
  rasterDpi: number;
  jobConcurrency: number;
  pageConcurrency: number;
};

type ExamCandidate = {
  pageUrl: string;
  correctionPageUrl: string | null;
  title: string;
  year: number;
  streamCode: string | null;
  subjectCode: string | null;
  sessionType: SessionType;
  examPdfUrl: string;
  correctionPdfUrl: string | null;
  slug: string;
};

type PreparedCandidate = {
  jobId: string;
  candidate: ExamCandidate;
};

type StoredPageRecord = {
  id: string;
  documentId: string;
  pageNumber: number;
  storageKey: string;
  width: number;
  height: number;
  sha256: string | null;
  metadata: Prisma.JsonValue | null;
};

type StoredDocumentRecord = {
  id: string;
  kind: SourceDocumentKind;
  storageKey: string;
  fileName: string;
  pageCount: number | null;
  sha256: string | null;
  sourceUrl: string | null;
  metadata: Prisma.JsonValue | null;
  pages: StoredPageRecord[];
};

type StoragePathContext = EddirasaStorageContext;

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  if (isPendingProcessingStage(options.stage)) {
    const summary = await processPendingJobs(
      options,
      resolveProcessingStages(options.stage),
    );
    console.log(
      `done stage=${options.stage} jobs=${summary.jobs} documents=${summary.documents} pages=${summary.pages} skipped=${summary.skipped} minYear=${options.minYear}`,
    );
    return;
  }

  const examPageUrls = await crawlExamPageUrls(options.listingUrl);
  const sortedUrls = examPageUrls.sort(compareYearPageUrls);
  const candidatesToPrepare: ExamCandidate[] = [];
  const preparedCandidates: PreparedCandidate[] = [];

  let discovered = 0;
  let uploaded = 0;
  let skipped = 0;

  outer: for (const pageUrl of sortedUrls) {
    const pageYear = inferYear([getPathSlug(pageUrl), pageUrl]);

    if (pageYear !== null && pageYear < options.minYear) {
      console.log(`skip page ${pageUrl} year ${pageYear} < ${options.minYear}`);
      continue;
    }

    if (pageYear !== null && options.maxYear !== null && pageYear > options.maxYear) {
      console.log(`skip page ${pageUrl} year ${pageYear} > ${options.maxYear}`);
      continue;
    }

    let candidates: ExamCandidate[];

    try {
      candidates = await extractCandidates(pageUrl);
    } catch (error) {
      skipped += 1;
      console.error(`failed ${pageUrl}: ${describeError(error)}`);
      continue;
    }

    for (const candidate of candidates) {
      if (options.limit !== null && discovered >= options.limit) {
        break outer;
      }

      if (!matchesCandidateFilters(candidate, options)) {
        continue;
      }

      discovered += 1;

      if (candidate.year < options.minYear) {
        console.log(
          `skip ${candidate.examPdfUrl} year ${candidate.year} < ${options.minYear}`,
        );
        skipped += 1;
        continue;
      }

      if (options.maxYear !== null && candidate.year > options.maxYear) {
        console.log(
          `skip ${candidate.examPdfUrl} year ${candidate.year} > ${options.maxYear}`,
        );
        skipped += 1;
        continue;
      }

      candidatesToPrepare.push(candidate);
    }
  }

  if (options.dryRun) {
    for (const candidate of candidatesToPrepare) {
      console.log(
        `dry-run stage=${options.stage} ${candidate.year} ${candidate.subjectCode ?? 'UNKNOWN'} ${candidate.streamCode ?? 'UNKNOWN'} ${candidate.examPdfUrl}`,
      );
      uploaded += 1;
    }
  } else {
    const results = await mapWithConcurrency(
      candidatesToPrepare,
      options.jobConcurrency,
      async (candidate) => {
        try {
          const prepared = await ensureOriginalsForCandidate(candidate, options);

          return {
            candidate,
            prepared,
            error: null,
          };
        } catch (error) {
          return {
            candidate,
            prepared: null,
            error,
          };
        }
      },
    );

    for (const result of results) {
      if (result.error) {
        skipped += 1;
        console.error(
          `failed ${result.candidate.examPdfUrl}: ${
            result.error instanceof Error
              ? result.error.message
              : String(result.error)
          }`,
        );
        continue;
      }

      if (!result.prepared) {
        skipped += 1;
        continue;
      }

      preparedCandidates.push(result.prepared);
      uploaded += 1;
    }
  }

  console.log(
    `originals done discovered=${discovered} uploaded=${uploaded} skipped=${skipped} minYear=${options.minYear}`,
  );

  if (options.stage === 'originals' || options.dryRun) {
    return;
  }

  const summary = await processPreparedCandidates(
    preparedCandidates,
    options,
    resolveProcessingStages(options.stage),
  );

  console.log(
    `done stage=${options.stage} discovered=${discovered} uploaded=${uploaded} jobs=${summary.jobs} documents=${summary.documents} pages=${summary.pages} skipped=${skipped + summary.skipped} minYear=${options.minYear}`,
  );
}

function isPendingProcessingStage(stage: CliOptions['stage']) {
  return stage === 'pages' || stage === 'ocr' || stage === 'process';
}

function resolveProcessingStages(stage: CliOptions['stage']) {
  if (stage === 'pages') {
    return ['pages'] as const;
  }

  if (stage === 'ocr') {
    return ['ocr'] as const;
  }

  return ['pages', 'ocr'] as const;
}

function matchesCandidateFilters(
  candidate: ExamCandidate,
  options: CliOptions,
) {
  if (options.slugs.length > 0 && !options.slugs.includes(candidate.slug)) {
    return false;
  }

  return true;
}

function buildJobSelectionWhere(
  options: CliOptions,
): Prisma.IngestionJobWhereInput | null {
  const filters: Prisma.IngestionJobWhereInput[] = [];

  if (options.jobIds.length > 0) {
    filters.push({
      id: {
        in: options.jobIds,
      },
    });
  }

  if (options.slugs.length > 0) {
    filters.push({
      OR: options.slugs.map((slug) => ({
        metadata: {
          path: ['slug'],
          equals: slug,
        },
      })),
    });
  }

  if (filters.length === 0) {
    return null;
  }

  return {
    AND: filters,
  };
}

function compareYearPageUrls(left: string, right: string) {
  const leftYear = inferYear([getPathSlug(left), left]) ?? 0;
  const rightYear = inferYear([getPathSlug(right), right]) ?? 0;

  if (leftYear !== rightYear) {
    return rightYear - leftYear;
  }

  return right.localeCompare(left);
}

async function ensureOriginalsForCandidate(
  candidate: ExamCandidate,
  options: CliOptions,
): Promise<PreparedCandidate | null> {
  const existing = await prisma.ingestionJob.findFirst({
    where: {
      sourceExamPageUrl: candidate.pageUrl,
      metadata: {
        path: ['examPdfUrl'],
        equals: candidate.examPdfUrl,
      },
    },
    select: {
      id: true,
      status: true,
      draftJson: true,
    },
  });

  if (
    existing &&
    !options.replaceExisting &&
    existing.status !== IngestionJobStatus.DRAFT &&
    existing.status !== IngestionJobStatus.FAILED
  ) {
    console.log(
      `skip locked existing ${candidate.examPdfUrl} status ${existing.status}`,
    );
    return null;
  }

  let jobId = existing?.id ?? null;
  let draft =
    existing && !options.replaceExisting
      ? normalizeIngestionDraft(existing.draftJson)
      : createDraftForCandidate(candidate, options);

  syncDraftWithCandidate(draft, candidate, options);

  if (existing && options.replaceExisting) {
    await prisma.ingestionJob.delete({
      where: {
        id: existing.id,
      },
    });

    jobId = null;
    draft = createDraftForCandidate(candidate, options);
  }

  if (!jobId) {
    const job = await prisma.ingestionJob.create({
      data: {
        label: candidate.title,
        provider: 'eddirasa',
        sourceListingUrl: options.listingUrl,
        sourceExamPageUrl: candidate.pageUrl,
        sourceCorrectionPageUrl: candidate.correctionPageUrl,
        year: candidate.year,
        streamCode: candidate.streamCode,
        subjectCode: candidate.subjectCode,
        sessionType: candidate.sessionType,
        minYear: options.minYear,
        status: IngestionJobStatus.DRAFT,
        draftJson: toJsonValue(draft),
        metadata: buildJobMetadata(candidate),
      },
      select: {
        id: true,
      },
    });

    jobId = job.id;
  } else {
    await persistDraft(jobId, draft, {
      status: IngestionJobStatus.DRAFT,
      errorMessage: null,
    });
  }

  try {
    await ensureOriginalDocument({
      jobId,
      documentKind: SourceDocumentKind.EXAM,
      documentUrl: candidate.examPdfUrl,
      pageUrl: candidate.pageUrl,
      context: candidate,
      draft,
      replaceExisting: options.replaceExisting,
    });

    if (candidate.correctionPdfUrl) {
      await ensureOriginalDocument({
        jobId,
        documentKind: SourceDocumentKind.CORRECTION,
        documentUrl: candidate.correctionPdfUrl,
        pageUrl: candidate.correctionPageUrl ?? candidate.pageUrl,
        context: candidate,
        draft,
        replaceExisting: options.replaceExisting,
      });
    }

    await persistDraft(jobId, draft, {
      status: IngestionJobStatus.DRAFT,
      errorMessage: null,
    });

    console.log(
      `originals ${candidate.year} ${candidate.subjectCode ?? 'UNKNOWN'} ${candidate.streamCode ?? 'UNKNOWN'} ${candidate.pageUrl}`,
    );

    return {
      jobId,
      candidate,
    };
  } catch (error) {
    await persistDraft(jobId, draft, {
      status: IngestionJobStatus.FAILED,
      errorMessage: describeError(error),
    });

    throw error;
  }
}

async function processPreparedCandidates(
  candidates: PreparedCandidate[],
  options: CliOptions,
  stages: ReadonlyArray<'pages' | 'ocr'>,
) {
  let jobs = 0;
  let documents = 0;
  let pages = 0;
  let skipped = 0;

  const summaries = await mapWithConcurrency(
    candidates,
    options.jobConcurrency,
    async (prepared) => {
      try {
        return await processJobById(prepared.jobId, options, stages);
      } catch (error) {
        console.error(
          `failed process ${prepared.candidate.examPdfUrl}: ${describeError(error)}`,
        );
        return null;
      }
    },
  );

  for (const summary of summaries) {
    if (!summary) {
      skipped += 1;
      continue;
    }

    jobs += 1;
    documents += summary.documents;
    pages += summary.pages;
  }

  return {
    jobs,
    documents,
    pages,
    skipped,
  };
}

async function processPendingJobs(
  options: CliOptions,
  stages: ReadonlyArray<'pages' | 'ocr'>,
) {
  const selectionWhere = buildJobSelectionWhere(options);
  const jobs = await prisma.ingestionJob.findMany({
    where: {
      year: {
        gte: options.minYear,
      },
      status: {
        in: [IngestionJobStatus.DRAFT, IngestionJobStatus.FAILED],
      },
      ...(selectionWhere ?? {}),
    },
    orderBy: [{ year: 'desc' }, { createdAt: 'asc' }],
    ...(options.limit !== null
      ? {
          take: options.limit,
        }
      : {}),
    select: {
      id: true,
      label: true,
    },
  });

  let processedJobs = 0;
  let processedDocuments = 0;
  let processedPages = 0;
  let skipped = 0;

  const summaries = await mapWithConcurrency(
    jobs,
    options.jobConcurrency,
    async (job) => {
      try {
        return await processJobById(job.id, options, stages);
      } catch (error) {
        console.error(`failed process ${job.label}: ${describeError(error)}`);
        return null;
      }
    },
  );

  for (const summary of summaries) {
    if (!summary) {
      skipped += 1;
      continue;
    }

    processedJobs += 1;
    processedDocuments += summary.documents;
    processedPages += summary.pages;
  }

  return {
    jobs: processedJobs,
    documents: processedDocuments,
    pages: processedPages,
    skipped,
  };
}

async function processJobById(
  jobId: string,
  options: CliOptions,
  stages: ReadonlyArray<'pages' | 'ocr'>,
) {
  const job = await prisma.ingestionJob.findUnique({
    where: {
      id: jobId,
    },
    select: {
      id: true,
      label: true,
      status: true,
      year: true,
      streamCode: true,
      subjectCode: true,
      sessionType: true,
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
              documentId: true,
              pageNumber: true,
              storageKey: true,
              width: true,
              height: true,
              sha256: true,
              metadata: true,
            },
          },
        },
      },
    },
  });

  if (!job) {
    return null;
  }

  const draft = normalizeIngestionDraft(job.draftJson);
  const preferSourceRead = job.status === IngestionJobStatus.FAILED;
  const context: StoragePathContext = {
    year: job.year,
    streamCode: job.streamCode,
    subjectCode: job.subjectCode,
    sessionType: job.sessionType ?? SessionType.NORMAL,
    slug:
      typeof draft.exam.metadata.slug === 'string'
        ? draft.exam.metadata.slug
        : null,
  };

  if (options.replaceExisting && stages.includes('pages')) {
    await prisma.sourcePage.deleteMany({
      where: {
        documentId: {
          in: job.sourceDocuments.map((document) => document.id),
        },
      },
    });
    draft.sourcePages = [];
    draft.assets = [];
  }

  try {
    const runsPages = stages.includes('pages');
    const runsOcr = stages.includes('ocr');
    const examDocument = job.sourceDocuments.find(
      (document) => document.kind === SourceDocumentKind.EXAM,
    );

    if (!examDocument) {
      throw new Error(`Missing EXAM source document for ${job.label}`);
    }

    const correctionDocument = job.sourceDocuments.find(
      (document) => document.kind === SourceDocumentKind.CORRECTION,
    );

    let pageCount = 0;
    const processedDocuments = correctionDocument ? 2 : 1;

    if (runsPages) {
      const rasterizedExam = await ensureStoredPagesForDocument({
        sourceDocument: examDocument,
        context,
        replaceExisting: options.replaceExisting,
        preferSourceRead,
        rasterDpi: options.rasterDpi,
        pageConcurrency: options.pageConcurrency,
      });
      pageCount += rasterizedExam.pageCount;

      if (correctionDocument) {
        const rasterizedCorrection = await ensureStoredPagesForDocument({
          sourceDocument: correctionDocument,
          context,
          replaceExisting: options.replaceExisting,
          preferSourceRead,
          rasterDpi: options.rasterDpi,
          pageConcurrency: options.pageConcurrency,
        });
        pageCount += rasterizedCorrection.pageCount;
      }
      // Exam and correction remain sequential per job; the large gain comes
      // from bounded concurrency across jobs and pages.

      draft.sourcePages = await loadDraftSourcePages(job.id);

      if (!runsOcr) {
        await persistDraft(job.id, draft, {
          status: IngestionJobStatus.DRAFT,
          errorMessage: null,
        });

        console.log(`pages ${job.label}`);

        return {
          documents: processedDocuments,
          pages: pageCount,
        };
      }
    }

    const documentsForOcr = runsPages
      ? await loadSourceDocumentsForJob(job.id)
      : job.sourceDocuments;
    draft.sourcePages = await loadDraftSourcePages(job.id);
    const examDocumentForOcr = documentsForOcr.find(
      (document) => document.kind === SourceDocumentKind.EXAM,
    );

    if (!examDocumentForOcr) {
      throw new Error(`Missing EXAM source document for ${job.label}`);
    }

    const correctionDocumentForOcr = documentsForOcr.find(
      (document) => document.kind === SourceDocumentKind.CORRECTION,
    );

    if (!options.replaceExisting && hasGeminiExtraction(draft)) {
      console.log(`skip gemini ${job.label}`);
      return {
        documents: 0,
        pages: 0,
      };
    }

    const r2 = getR2Client();
    const examBuffer = await readSourceDocumentBuffer(examDocumentForOcr, r2, {
      preferSourceRead,
    });
    const correctionBuffer =
      correctionDocumentForOcr !== undefined
        ? await readSourceDocumentBuffer(correctionDocumentForOcr, r2, {
            preferSourceRead,
          })
        : null;

    await extractDraftWithGemini({
      draft,
      label: job.label,
      model: options.geminiModel,
      maxOutputTokens: options.geminiMaxOutputTokens,
      temperature: options.geminiTemperature,
      examDocument: {
        fileName: examDocumentForOcr.fileName,
        buffer: examBuffer,
      },
      correctionDocument:
        correctionDocumentForOcr && correctionBuffer
          ? {
              fileName: correctionDocumentForOcr.fileName,
              buffer: correctionBuffer,
            }
          : null,
    });

    await persistDraft(job.id, draft, {
      status: IngestionJobStatus.DRAFT,
      errorMessage: null,
    });

    console.log(`ocr ${job.label} backend=gemini`);

    return {
      documents: processedDocuments,
      pages: draft.sourcePages.length,
    };
  } catch (error) {
    await persistDraft(job.id, draft, {
      status: IngestionJobStatus.FAILED,
      errorMessage: describeError(error),
    });

    throw error;
  }
}

async function ensureOriginalDocument(input: {
  jobId: string;
  documentKind: SourceDocumentKind;
  documentUrl: string;
  pageUrl: string;
  context: StoragePathContext;
  draft: ReturnType<typeof createEmptyDraft>;
  replaceExisting: boolean;
}) {
  const existing = await prisma.sourceDocument.findFirst({
    where: {
      jobId: input.jobId,
      kind: input.documentKind,
    },
    select: {
      id: true,
      storageKey: true,
    },
  });

  if (existing && !input.replaceExisting) {
    applyDocumentToDraft(
      input.draft,
      input.documentKind,
      existing.id,
      existing.storageKey,
    );
    return existing;
  }

  const r2 = getR2Client();
  const source = await resolveOriginalPdfSource({
    context: input.context,
    requestedUrl: input.documentUrl,
    documentKind: input.documentKind,
  });
  const fileBuffer = source.buffer;
  const sha256 = hashBuffer(fileBuffer);
  const fileName = buildCanonicalEddirasaDocumentFileName(
    input.context,
    input.documentKind,
  );
  const sourceFileName =
    fileNameFromUrl(input.documentUrl) ??
    fileNameFromUrl(source.sourceUrl) ??
    'document.pdf';
  const storageKey = buildDocumentStorageKey(input.context, fileName);

  await r2.putObject({
    key: storageKey,
    body: fileBuffer,
    contentType: 'application/pdf',
    metadata: {
      sourcePageUrl: input.pageUrl,
    },
  });

  const sourceDocument = existing
    ? await prisma.sourceDocument.update({
        where: {
          id: existing.id,
        },
        data: {
          storageKey,
          fileName,
          mimeType: 'application/pdf',
          pageCount: source.pageCount,
          sha256,
          sourceUrl: source.sourceUrl,
          language: 'ar',
          metadata: {
            sourcePageUrl: input.pageUrl,
            originalSourceUrl: input.documentUrl,
            originalSourceFileName: sourceFileName,
            alternateSourceProvider: source.provider,
            splitPageRangeStart: source.splitPageRange?.start ?? null,
            splitPageRangeEnd: source.splitPageRange?.end ?? null,
            alternateCombinedPdfUrl: source.splitSourceUrl,
            uploadedAt: new Date().toISOString(),
          },
        },
        select: {
          id: true,
          storageKey: true,
        },
      })
    : await prisma.sourceDocument.create({
        data: {
          jobId: input.jobId,
          kind: input.documentKind,
          storageKey,
          fileName,
          mimeType: 'application/pdf',
          pageCount: source.pageCount,
          sha256,
          sourceUrl: source.sourceUrl,
          language: 'ar',
          metadata: {
            sourcePageUrl: input.pageUrl,
            originalSourceUrl: input.documentUrl,
            originalSourceFileName: sourceFileName,
            alternateSourceProvider: source.provider,
            splitPageRangeStart: source.splitPageRange?.start ?? null,
            splitPageRangeEnd: source.splitPageRange?.end ?? null,
            alternateCombinedPdfUrl: source.splitSourceUrl,
            uploadedAt: new Date().toISOString(),
          },
        },
        select: {
          id: true,
          storageKey: true,
        },
      });

  applyDocumentToDraft(
    input.draft,
    input.documentKind,
    sourceDocument.id,
    sourceDocument.storageKey,
  );

  return sourceDocument;
}

async function ensureStoredPagesForDocument(input: {
  sourceDocument: StoredDocumentRecord;
  context: StoragePathContext;
  replaceExisting: boolean;
  preferSourceRead: boolean;
  rasterDpi: number;
  pageConcurrency: number;
}): Promise<{ pageCount: number }> {
  if (
    !input.replaceExisting &&
    input.sourceDocument.pageCount !== null &&
    input.sourceDocument.pages.length === input.sourceDocument.pageCount
  ) {
    return {
      pageCount: input.sourceDocument.pageCount,
    };
  }

  const r2 = getR2Client();
  const pdfBuffer = await readSourceDocumentBuffer(input.sourceDocument, r2, {
    preferSourceRead: input.preferSourceRead,
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bac-ingest-'));
  const pdfPath = path.join(tempDir, input.sourceDocument.fileName);

  try {
    await fs.writeFile(pdfPath, pdfBuffer);
    const rasterizedPages = await rasterizePdf(
      pdfPath,
      tempDir,
      input.rasterDpi,
    );

    if (input.sourceDocument.pageCount !== rasterizedPages.length) {
      const documentMetadata = asRecord(input.sourceDocument.metadata);

      await prisma.sourceDocument.update({
        where: {
          id: input.sourceDocument.id,
        },
        data: {
          pageCount: rasterizedPages.length,
          metadata: {
            ...(documentMetadata ?? {}),
            rasterDpi: input.rasterDpi,
            processedAt: new Date().toISOString(),
          },
        },
      });
    }

    const existingPageMap = input.replaceExisting
      ? new Map<number, StoredPageRecord>()
      : new Map(
          input.sourceDocument.pages.map((page) => [page.pageNumber, page]),
        );

    await mapWithConcurrency(
      rasterizedPages,
      input.pageConcurrency,
      async (page) => {
        const pageStorageKey = buildPageStorageKey(
          input.context,
          input.sourceDocument.fileName,
          page.pageNumber,
        );
        const existingPage = existingPageMap.get(page.pageNumber) ?? null;
        const pageBuffer = await fs.readFile(page.filePath);
        const pageSha256 = hashBuffer(pageBuffer);

        if (
          !existingPage ||
          input.replaceExisting ||
          existingPage.storageKey !== pageStorageKey
        ) {
          await r2.putObject({
            key: pageStorageKey,
            body: pageBuffer,
            contentType: 'image/png',
          });
        }

        const pageMetadata = existingPage
          ? asRecord(existingPage.metadata)
          : null;
        if (existingPage) {
          await prisma.sourcePage.update({
            where: {
              id: existingPage.id,
            },
            data: {
              storageKey: pageStorageKey,
              width: page.width,
              height: page.height,
              sha256: pageSha256,
              metadata: {
                ...(pageMetadata ?? {}),
                rasterDpi: input.rasterDpi,
              },
            },
            select: {
              id: true,
              documentId: true,
              pageNumber: true,
              width: true,
              height: true,
            },
          });
          return;
        }

        await prisma.sourcePage.create({
          data: {
            documentId: input.sourceDocument.id,
            pageNumber: page.pageNumber,
            storageKey: pageStorageKey,
            width: page.width,
            height: page.height,
            sha256: pageSha256,
            metadata: {
              rasterDpi: input.rasterDpi,
            },
          },
          select: {
            id: true,
            documentId: true,
            pageNumber: true,
            width: true,
            height: true,
          },
        });
      },
    );

    return {
      pageCount: rasterizedPages.length,
    };
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

function createDraftForCandidate(
  candidate: ExamCandidate,
  options: CliOptions,
) {
  return createEmptyDraft({
    year: candidate.year,
    streamCode: candidate.streamCode,
    subjectCode: candidate.subjectCode,
    sessionType:
      candidate.sessionType === SessionType.MAKEUP ? 'MAKEUP' : 'NORMAL',
    provider: 'eddirasa',
    title: candidate.title,
    minYear: options.minYear,
    sourceListingUrl: options.listingUrl,
    sourceExamPageUrl: candidate.pageUrl,
    sourceCorrectionPageUrl: candidate.correctionPageUrl,
    metadata: {
      slug: candidate.slug,
      rawExamPdfUrl: candidate.examPdfUrl,
      rawCorrectionPdfUrl: candidate.correctionPdfUrl,
      variantHints: ['SUJET_1', 'SUJET_2'],
    },
  });
}

function syncDraftWithCandidate(
  draft: ReturnType<typeof createEmptyDraft>,
  candidate: ExamCandidate,
  options: CliOptions,
) {
  draft.exam.year = candidate.year;
  draft.exam.streamCode = candidate.streamCode;
  draft.exam.subjectCode = candidate.subjectCode;
  draft.exam.sessionType =
    candidate.sessionType === SessionType.MAKEUP ? 'MAKEUP' : 'NORMAL';
  draft.exam.provider = 'eddirasa';
  draft.exam.title = candidate.title;
  draft.exam.minYear = options.minYear;
  draft.exam.sourceListingUrl = options.listingUrl;
  draft.exam.sourceExamPageUrl = candidate.pageUrl;
  draft.exam.sourceCorrectionPageUrl = candidate.correctionPageUrl;
  draft.exam.metadata = {
    ...draft.exam.metadata,
    slug: candidate.slug,
    rawExamPdfUrl: candidate.examPdfUrl,
    rawCorrectionPdfUrl: candidate.correctionPdfUrl,
    variantHints: ['SUJET_1', 'SUJET_2'],
  };
}

function buildJobMetadata(candidate: ExamCandidate) {
  return {
    slug: candidate.slug,
    examPdfUrl: candidate.examPdfUrl,
    correctionPdfUrl: candidate.correctionPdfUrl,
  };
}

async function persistDraft(
  jobId: string,
  draft: ReturnType<typeof createEmptyDraft>,
  input: {
    status: IngestionJobStatus;
    errorMessage: string | null;
  },
) {
  await prisma.ingestionJob.update({
    where: {
      id: jobId,
    },
    data: {
      label: draft.exam.title,
      provider: draft.exam.provider,
      sourceListingUrl: draft.exam.sourceListingUrl,
      sourceExamPageUrl: draft.exam.sourceExamPageUrl,
      sourceCorrectionPageUrl: draft.exam.sourceCorrectionPageUrl,
      minYear: draft.exam.minYear,
      status: input.status,
      errorMessage: input.errorMessage,
      draftJson: toJsonValue(draft),
      year: draft.exam.year,
      streamCode: draft.exam.streamCode,
      subjectCode: draft.exam.subjectCode,
      sessionType:
        draft.exam.sessionType === 'MAKEUP'
          ? SessionType.MAKEUP
          : SessionType.NORMAL,
    },
  });
}

function applyDocumentToDraft(
  draft: ReturnType<typeof createEmptyDraft>,
  kind: SourceDocumentKind,
  documentId: string,
  storageKey: string,
) {
  if (kind === SourceDocumentKind.EXAM) {
    draft.exam.examDocumentId = documentId;
    draft.exam.examDocumentStorageKey = storageKey;
    return;
  }

  draft.exam.correctionDocumentId = documentId;
  draft.exam.correctionDocumentStorageKey = storageKey;
}

async function loadSourceDocumentsForJob(
  jobId: string,
): Promise<StoredDocumentRecord[]> {
  return prisma.sourceDocument.findMany({
    where: {
      jobId,
    },
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
          documentId: true,
          pageNumber: true,
          storageKey: true,
          width: true,
          height: true,
          sha256: true,
          metadata: true,
        },
      },
    },
  });
}

async function loadDraftSourcePages(jobId: string): Promise<DraftSourcePage[]> {
  const documents = await prisma.sourceDocument.findMany({
    where: {
      jobId,
    },
    orderBy: {
      kind: 'asc',
    },
    select: {
      id: true,
      kind: true,
      pages: {
        orderBy: {
          pageNumber: 'asc',
        },
        select: {
          id: true,
          documentId: true,
          pageNumber: true,
          width: true,
          height: true,
        },
      },
    },
  });

  return documents.flatMap((document) =>
    document.pages.map((page) => ({
      id: page.id,
      documentId: page.documentId,
      documentKind:
        document.kind === SourceDocumentKind.CORRECTION ? 'CORRECTION' : 'EXAM',
      pageNumber: page.pageNumber,
      width: page.width,
      height: page.height,
    })),
  );
}

function asRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

async function resolveOriginalPdfSource(input: {
  context: StoragePathContext;
  requestedUrl: string;
  documentKind: SourceDocumentKind;
}): Promise<{
  sourceUrl: string;
  buffer: Buffer;
  provider: string;
  pageCount: number | null;
  splitPageRange: { start: number; end: number } | null;
  splitSourceUrl: string | null;
}> {
  try {
    return {
      sourceUrl: input.requestedUrl,
      buffer: await fetchBuffer(input.requestedUrl),
      provider: 'eddirasa',
      pageCount: null,
      splitPageRange: null,
      splitSourceUrl: null,
    };
  } catch (error) {
    const fallback = resolveAlternatePdfSource(input.context.slug ?? null);

    if (!fallback) {
      throw error;
    }

    console.warn(
      `fall back to alternate source for ${input.context.slug ?? input.requestedUrl}: ${fallback.url}`,
    );

    const fallbackBuffer = await fetchBuffer(fallback.url);

    if (fallback.split) {
      const split = await splitCombinedPdf(
        fallbackBuffer,
        fallback.split.subjectPageCount,
      );

      return input.documentKind === SourceDocumentKind.CORRECTION
        ? {
            sourceUrl: fallback.url,
            buffer: split.correctionBuffer,
            provider: fallback.provider,
            pageCount:
              split.correctionPageRange.end -
              split.correctionPageRange.start +
              1,
            splitPageRange: split.correctionPageRange,
            splitSourceUrl: fallback.url,
          }
        : {
            sourceUrl: fallback.url,
            buffer: split.examBuffer,
            provider: fallback.provider,
            pageCount: split.examPageRange.end - split.examPageRange.start + 1,
            splitPageRange: split.examPageRange,
            splitSourceUrl: fallback.url,
          };
    }

    return {
      sourceUrl: fallback.url,
      buffer: fallbackBuffer,
      provider: fallback.provider,
      pageCount: null,
      splitPageRange: null,
      splitSourceUrl: null,
    };
  }
}

async function readSourceDocumentBuffer(
  sourceDocument: StoredDocumentRecord,
  r2: R2StorageClient,
  input?: {
    preferSourceRead?: boolean;
  },
) {
  if (input?.preferSourceRead && sourceDocument.sourceUrl) {
    return readSourceDocumentBufferFromSource(sourceDocument, r2);
  }

  try {
    return await retryWithBackoff(
      () => r2.getObjectBuffer(sourceDocument.storageKey),
      3,
      `R2 get ${sourceDocument.storageKey}`,
    );
  } catch (error) {
    if (!sourceDocument.sourceUrl) {
      throw error;
    }

    console.warn(
      `fall back to source download for ${sourceDocument.fileName}: ${describeError(error)}`,
    );

    return readSourceDocumentBufferFromSource(sourceDocument, r2);
  }
}

async function readSourceDocumentBufferFromSource(
  sourceDocument: StoredDocumentRecord,
  r2: R2StorageClient,
) {
  if (!sourceDocument.sourceUrl) {
    throw new Error(`Missing sourceUrl for ${sourceDocument.fileName}`);
  }

  const buffer = await fetchBuffer(sourceDocument.sourceUrl);

  try {
    await r2.putObject({
      key: sourceDocument.storageKey,
      body: buffer,
      contentType: 'application/pdf',
    });
  } catch (refreshError) {
    console.warn(
      `failed to refresh R2 object ${sourceDocument.storageKey}: ${describeError(refreshError)}`,
    );
  }

  return buffer;
}

function getR2Client() {
  if (!r2Client) {
    r2Client = new R2StorageClient(readR2ConfigFromEnv());
  }

  return r2Client;
}

async function rasterizePdf(
  pdfPath: string,
  outputDir: string,
  rasterDpi: number,
) {
  const prefix = path.join(outputDir, 'page');

  await execFileAsync('pdftoppm', [
    '-r',
    `${rasterDpi}`,
    '-png',
    pdfPath,
    prefix,
  ]);

  const files = (await fs.readdir(outputDir))
    .filter((fileName) => /^page-\d+\.png$/.test(fileName))
    .sort(
      (left, right) =>
        pageNumberFromFileName(left) - pageNumberFromFileName(right),
    );

  const pages = [];

  for (const fileName of files) {
    const filePath = path.join(outputDir, fileName);
    const metadata = await sharp(filePath).metadata();

    pages.push({
      filePath,
      pageNumber: pageNumberFromFileName(fileName),
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
    });
  }

  return pages;
}

type PdfEntry = {
  url: string;
  linkText: string;
  rowText: string | null;
  sectionText: string | null;
  isCorrection: boolean;
  pairingKey: string;
  lookupKey: string;
  slug: string;
};

type DetailPageEntry = {
  url: string;
  linkText: string;
  rowText: string | null;
  sectionText: string | null;
  isCorrection: boolean;
  pairingKey: string;
  lookupKey: string;
  slug: string;
};

async function extractCandidates(pageUrl: string): Promise<ExamCandidate[]> {
  const html = await fetchText(pageUrl);
  const $ = load(html);
  const title =
    normalizeText(
      $('meta[property="og:title"]').attr('content') ??
        $('h1').first().text() ??
        $('title').text(),
    ) || pageUrl;
  const slug = getPathSlug(pageUrl);
  const year = inferYear([slug, title]);

  if (!year) {
    return [];
  }

  const directPdfEntries = collectPdfEntries($, pageUrl);
  const detailPageEntries = collectDetailPageEntries($, pageUrl);
  const resolvedPdfEntries =
    detailPageEntries.length > 0
      ? await resolveDetailPageEntries(detailPageEntries)
      : [];
  const pdfEntries = mergePdfEntries(directPdfEntries, resolvedPdfEntries);

  if (!pdfEntries.length) {
    return [];
  }

  const correctionByPairingKey = new Map<string, string>();

  for (const entry of pdfEntries) {
    if (entry.isCorrection && !correctionByPairingKey.has(entry.pairingKey)) {
      correctionByPairingKey.set(entry.pairingKey, entry.url);
    }
  }

  const candidates: ExamCandidate[] = [];
  const seenExamUrls = new Set<string>();

  for (const entry of pdfEntries) {
    if (entry.isCorrection || seenExamUrls.has(entry.url)) {
      continue;
    }

    seenExamUrls.add(entry.url);

    const inferred = inferCandidateMetadata([
      entry.lookupKey,
      entry.sectionText,
      entry.rowText,
      entry.linkText,
      title,
      slug,
    ]);
    const labelText = normalizeText(
      entry.rowText ??
        entry.linkText ??
        path.basename(new URL(entry.url).pathname),
    );

    candidates.push({
      pageUrl,
      correctionPageUrl: correctionByPairingKey.has(entry.pairingKey)
        ? pageUrl
        : null,
      title: buildCandidateTitle(
        year,
        inferred.subjectCode,
        inferred.streamCode,
        labelText,
      ),
      year,
      streamCode: inferred.streamCode,
      subjectCode: inferred.subjectCode,
      sessionType: inferred.sessionType,
      examPdfUrl: entry.url,
      correctionPdfUrl: correctionByPairingKey.get(entry.pairingKey) ?? null,
      slug: entry.slug,
    });
  }

  return candidates;
}

function mergePdfEntries(
  directEntries: PdfEntry[],
  resolvedEntries: PdfEntry[],
) {
  const merged = new Map<string, PdfEntry>();

  for (const entry of [...directEntries, ...resolvedEntries]) {
    if (!merged.has(entry.url)) {
      merged.set(entry.url, entry);
      continue;
    }

    const current = merged.get(entry.url);

    if (
      current &&
      ((!current.rowText && entry.rowText) ||
        (!current.sectionText && entry.sectionText) ||
        (!current.linkText && entry.linkText))
    ) {
      merged.set(entry.url, {
        ...current,
        rowText: current.rowText ?? entry.rowText,
        sectionText: current.sectionText ?? entry.sectionText,
        linkText: current.linkText || entry.linkText,
      });
    }
  }

  return Array.from(merged.values());
}

function collectPdfEntries($: CheerioAPI, pageUrl: string) {
  const entriesByUrl = new Map<string, PdfEntry>();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');

    if (!href) {
      return;
    }

    const absolute = toAbsoluteUrl(href, pageUrl);

    if (!absolute || !absolute.toLowerCase().includes('.pdf')) {
      return;
    }

    const linkText = normalizeText($(element).text());
    const rowText = normalizeText($(element).closest('tr').text()) || null;
    const sectionText = null;
    const isCorrection = looksLikeCorrection([absolute, linkText]);
    const pairingKey = buildPdfPairingKey(absolute);
    const lookupKey = buildPdfLookupKey(absolute);
    const slug = slugifySegment(
      stripPdfExtension(path.basename(new URL(absolute).pathname)),
    );

    if (!entriesByUrl.has(absolute)) {
      entriesByUrl.set(absolute, {
        url: absolute,
        linkText,
        rowText,
        sectionText,
        isCorrection,
        pairingKey,
        lookupKey,
        slug,
      });
    }
  });

  return Array.from(entriesByUrl.values());
}

function collectDetailPageEntries($: CheerioAPI, pageUrl: string) {
  const entriesByUrl = new Map<string, DetailPageEntry>();
  const currentPage = stripTrailingSlash(pageUrl);

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');

    if (!href) {
      return;
    }

    const absolute = toAbsoluteUrl(href, pageUrl);

    if (!absolute) {
      return;
    }

    const normalized = stripTrailingSlash(absolute);

    if (normalized === currentPage) {
      return;
    }

    const pathname = new URL(normalized).pathname;

    if (!isExamDetailPagePath(pathname)) {
      return;
    }

    const linkText = normalizeText($(element).text());
    const rowText = normalizeText($(element).closest('tr').text()) || null;
    const sectionText =
      normalizeText(
        $(element)
          .closest('table')
          .prevAll('h2,h3,h4')
          .first()
          .text(),
      ) || null;
    const slug = getPathSlug(normalized);

    if (!entriesByUrl.has(normalized)) {
      entriesByUrl.set(normalized, {
        url: normalized,
        linkText,
        rowText,
        sectionText,
        isCorrection: looksLikeCorrection([normalized, linkText]),
        pairingKey: buildPagePairingKey(normalized),
        lookupKey: buildPageLookupKey(normalized),
        slug,
      });
    }
  });

  return Array.from(entriesByUrl.values());
}

async function resolveDetailPageEntries(entries: DetailPageEntry[]) {
  const resolved = await mapWithConcurrency(
    entries,
    DEFAULT_DETAIL_PAGE_CONCURRENCY,
    async (entry) => {
      let pdfUrl: string | null;

      try {
        pdfUrl = await resolveDetailPagePdfUrl(entry.url);
      } catch (error) {
        console.error(`skip detail page ${entry.url}: ${describeError(error)}`);
        return null;
      }

      if (!pdfUrl) {
        return null;
      }

      return {
        url: pdfUrl,
        linkText: entry.linkText,
        rowText: entry.rowText,
        sectionText: entry.sectionText,
        isCorrection: entry.isCorrection,
        pairingKey: entry.pairingKey,
        lookupKey: entry.lookupKey,
        slug: entry.slug,
      } satisfies PdfEntry;
    },
  );

  return resolved.filter((entry): entry is PdfEntry => entry !== null);
}

async function resolveDetailPagePdfUrl(pageUrl: string) {
  const html = await fetchText(pageUrl);
  const $ = load(html);
  const downloadPdfUrls: string[] = [];
  const embeddedPdfUrls: string[] = [];

  $('a[href], iframe[src], embed[src], object[data]').each((_, element) => {
    const tagName = element.tagName.toLowerCase();
    const attribute =
      tagName === 'a'
        ? 'href'
        : tagName === 'object'
          ? 'data'
          : 'src';
    const value = $(element).attr(attribute);

    if (!value) {
      return;
    }

    const absolute = toAbsoluteUrl(value, pageUrl);

    if (!absolute || !absolute.toLowerCase().includes('.pdf')) {
      return;
    }

    if (tagName === 'a') {
      downloadPdfUrls.push(absolute);
      return;
    }

    embeddedPdfUrls.push(absolute);
  });

  const candidates = [...downloadPdfUrls, ...embeddedPdfUrls];

  if (candidates.length === 0) {
    return null;
  }

  return candidates[0];
}

function inferCandidateMetadata(values: Array<string | null | undefined>) {
  return deriveEddirasaMetadata(values);
}

function looksLikeCorrection(values: Array<string | null | undefined>) {
  const joined = values
    .filter((value): value is string => Boolean(value))
    .join(' ');
  return /correction|corrige|corrig[eé]|solution|تصحيح/i.test(joined);
}

function buildPdfPairingKey(url: string) {
  return normalizeLookup(
    stripPdfExtension(path.basename(new URL(url).pathname))
      .replace(/^eddirasa-/, '')
      .replace(/^correction-/, '')
      .replace(/^corrige-/, '')
      .replace(/^corr-/, '')
      .replace(/correction-/, '')
      .replace(/corrige-/, '')
      .replace(/corr-/, ''),
  );
}

function buildPdfLookupKey(url: string) {
  return buildPdfPairingKey(url);
}

function buildPagePairingKey(url: string) {
  return normalizeLookup(getPathSlug(url).replace(/^correction-/, ''));
}

function buildPageLookupKey(url: string) {
  return buildPagePairingKey(url);
}

function buildCandidateTitle(
  year: number,
  subjectCode: string | null,
  streamCode: string | null,
  labelText: string,
) {
  const parts = [`BAC ${year}`];

  if (subjectCode) {
    parts.push(subjectCode);
  }

  if (streamCode) {
    parts.push(streamCode);
  }

  if (labelText) {
    parts.push(labelText);
  }

  return parts.join(' · ');
}

async function crawlExamPageUrls(listingUrl: string) {
  const initialUrl = stripTrailingSlash(listingUrl);

  if (isExamPagePath(new URL(initialUrl).pathname)) {
    return [initialUrl];
  }

  const queue = [initialUrl];
  const visited = new Set<string>();
  const examPages = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    const currentPathname = new URL(current).pathname;

    if (isExamPagePath(currentPathname)) {
      examPages.add(current);
    }

    const html = await fetchText(current);
    const $ = load(html);

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');

      if (!href) {
        return;
      }

      const absolute = toAbsoluteUrl(href, current);

      if (!absolute) {
        return;
      }

      const pathname = new URL(absolute).pathname;

      if (isListingPagePath(pathname)) {
        const normalized = stripTrailingSlash(absolute);

        if (!visited.has(normalized)) {
          queue.push(normalized);
        }

        return;
      }

      if (isExamPagePath(pathname)) {
        examPages.add(absolute);
      }
    });
  }

  return Array.from(examPages);
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    listingUrl: DEFAULT_LISTING_URL,
    minYear: Number.parseInt(
      process.env.MIN_YEAR ??
        process.env.INGESTION_MIN_YEAR ??
        `${DEFAULT_MIN_YEAR}`,
      10,
    ),
    maxYear: null,
    limit: null,
    dryRun: false,
    replaceExisting: false,
    stage: 'full',
    jobIds: [],
    slugs: [],
    geminiModel: readDefaultGeminiModel(),
    geminiMaxOutputTokens: readDefaultGeminiMaxOutputTokens(),
    geminiTemperature: readDefaultGeminiTemperature(),
    rasterDpi: DEFAULT_RASTER_DPI,
    jobConcurrency: DEFAULT_JOB_CONCURRENCY,
    pageConcurrency: DEFAULT_PAGE_CONCURRENCY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--listing-url' && argv[index + 1]) {
      options.listingUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--min-year' && argv[index + 1]) {
      options.minYear = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--max-year' && argv[index + 1]) {
      options.maxYear = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--limit' && argv[index + 1]) {
      options.limit = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--raster-dpi' && argv[index + 1]) {
      options.rasterDpi = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--job-concurrency' && argv[index + 1]) {
      options.jobConcurrency = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--page-concurrency' && argv[index + 1]) {
      options.pageConcurrency = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--stage' && argv[index + 1]) {
      const stage = argv[index + 1];

      if (
        stage === 'full' ||
        stage === 'originals' ||
        stage === 'pages' ||
        stage === 'ocr' ||
        stage === 'process'
      ) {
        options.stage = stage;
        index += 1;
        continue;
      }

      throw new Error(
        '--stage must be one of: full, originals, pages, ocr, process.',
      );
    }

    if (arg === '--job-id' && argv[index + 1]) {
      options.jobIds.push(...parseListArgument(argv[index + 1]));
      index += 1;
      continue;
    }

    if (arg === '--slug' && argv[index + 1]) {
      options.slugs.push(...parseListArgument(argv[index + 1]));
      index += 1;
      continue;
    }

    if (arg === '--gemini-model' && argv[index + 1]) {
      options.geminiModel = argv[index + 1].trim();
      index += 1;
      continue;
    }

    if (arg === '--gemini-max-output-tokens' && argv[index + 1]) {
      options.geminiMaxOutputTokens = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--gemini-temperature' && argv[index + 1]) {
      options.geminiTemperature = Number.parseFloat(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--replace-existing') {
      options.replaceExisting = true;
      continue;
    }
  }

  if (!Number.isInteger(options.minYear) || options.minYear < 0) {
    throw new Error('MIN_YEAR must be a non-negative integer.');
  }

  if (
    options.maxYear !== null &&
    (!Number.isInteger(options.maxYear) || options.maxYear < 0)
  ) {
    throw new Error('--max-year must be a non-negative integer.');
  }

  if (options.maxYear !== null && options.maxYear < options.minYear) {
    throw new Error('--max-year must be greater than or equal to --min-year.');
  }

  if (
    options.limit !== null &&
    (!Number.isInteger(options.limit) || options.limit < 1)
  ) {
    throw new Error('--limit must be a positive integer.');
  }

  if (!Number.isInteger(options.rasterDpi) || options.rasterDpi < 72) {
    throw new Error('--raster-dpi must be an integer >= 72.');
  }

  if (!Number.isInteger(options.jobConcurrency) || options.jobConcurrency < 1) {
    throw new Error('--job-concurrency must be a positive integer.');
  }

  if (
    !Number.isInteger(options.pageConcurrency) ||
    options.pageConcurrency < 1
  ) {
    throw new Error('--page-concurrency must be a positive integer.');
  }

  if (!options.geminiModel) {
    throw new Error('Gemini model name cannot be empty.');
  }

  if (
    !Number.isInteger(options.geminiMaxOutputTokens) ||
    options.geminiMaxOutputTokens < 1
  ) {
    throw new Error('--gemini-max-output-tokens must be a positive integer.');
  }

  if (
    !Number.isFinite(options.geminiTemperature) ||
    options.geminiTemperature < 0
  ) {
    throw new Error('--gemini-temperature must be a non-negative number.');
  }

  if (
    (options.stage === 'full' ||
      options.stage === 'ocr' ||
      options.stage === 'process') &&
    !hasGeminiApiKeyConfigured()
  ) {
    throw new Error(
      'Gemini extraction requires GEMINI_API_KEY or GOOGLE_API_KEY.',
    );
  }

  return options;
}

function parseListArgument(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function inferYear(values: string[]) {
  for (const value of values) {
    const match = value.match(/\b(20\d{2}|19\d{2})\b/);

    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }

  return null;
}

function buildCorrectionPageUrl(pageUrl: string) {
  const url = new URL(pageUrl);
  const slug = getPathSlug(pageUrl);

  if (!slug.startsWith('bac-') || slug.startsWith('correction-')) {
    return null;
  }

  url.pathname = `/${`correction-${slug}`}/`;
  return url.toString();
}

function buildDocumentStorageKey(
  context: StoragePathContext,
  fileName: string,
) {
  return buildEddirasaDocumentStorageKey(context, fileName);
}

function buildPageStorageKey(
  context: StoragePathContext,
  documentFileName: string,
  pageNumber: number,
) {
  return buildEddirasaPageStorageKey(context, documentFileName, pageNumber);
}

function pageNumberFromFileName(fileName: string) {
  const match = fileName.match(/-(\d+)\.png$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

async function fetchText(url: string) {
  return fetchTextWithRetry(url, {
    userAgent: 'BAC Bank ingestion bot/1.0',
    accept: 'text/html,application/xhtml+xml',
  });
}

async function fetchBuffer(url: string) {
  return fetchBufferWithRetry(url, {
    userAgent: 'BAC Bank ingestion bot/1.0',
  });
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message?.trim();

    if (message) {
      return message;
    }

    if (error.name?.trim()) {
      return error.name.trim();
    }
  }

  const fallback = String(error).trim();
  return fallback || 'Unknown error';
}

function hashBuffer(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function toAbsoluteUrl(href: string, baseUrl: string) {
  try {
    const url = new URL(href, baseUrl);

    if (url.hostname !== 'eddirasa.com') {
      return url.toString();
    }

    return url.toString();
  } catch {
    return null;
  }
}

function isListingPagePath(pathname: string) {
  return /^\/bac-solutions(?:\/page\/\d+)?\/?$/.test(pathname);
}

function isExamPagePath(pathname: string) {
  return /^\/bac-(?!solutions)(?!.*correction)[^/]+\/?$/.test(pathname);
}

function isExamDetailPagePath(pathname: string) {
  return /^\/(?:correction-)?bac-(?!solutions)(?!\d{4}\/?$)[^/]+\/?$/.test(
    pathname,
  );
}

function getPathSlug(url: string) {
  return stripTrailingSlash(new URL(url).pathname).replace(/^\//, '');
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
