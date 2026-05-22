import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { IngestionJobStatus, PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import {
  IngestionDraft,
  normalizeIngestionDraft,
} from '../src/ingestion/ingestion.contract';
import { IngestionProcessingEngineService } from '../src/ingestion/ingestion-processing-engine.service';
import { IngestionService } from '../src/ingestion/ingestion.service';
import { IngestionSourceIntakeService } from '../src/ingestion/ingestion-source-intake.service';
import {
  readR2ConfigFromEnv,
  R2StorageClient,
} from '../src/ingestion/r2-storage';
import { PrismaService } from '../src/prisma/prisma.service';
import { loadApiScriptEnv } from './postgres-backup-r2-utils';

const DEFAULT_LOCAL_DATABASE_URL =
  'postgresql://bac_user:bac_password@localhost:5433/bac_bank?schema=public';

type Options = {
  slugFile: string;
  localDatabaseUrl: string;
  outFile: string | null;
  yes: boolean;
};

type BackfillResult = {
  slug: string;
  localJobId: string;
  targetJobId: string | null;
  initialTargetStatus: string | null;
  finalTargetStatus: string | null;
  action: 'dry_run' | 'skipped_already_published' | 'published';
  publishedPaperId: string | null;
  processedJobIds: string[];
};

async function main() {
  loadApiScriptEnv();
  const options = parseOptions(process.argv.slice(2));
  const slugs = readSlugs(options.slugFile);
  const localPrisma = new PrismaClient({
    datasourceUrl: options.localDatabaseUrl,
  });
  const app = await createApplicationContextWithRetry();

  try {
    const targetPrisma = app.get(PrismaService, { strict: false });
    const ingestion = app.get(IngestionService, { strict: false });
    const processingEngine = app.get(IngestionProcessingEngineService, {
      strict: false,
    });
    const sourceIntakeService = app.get(IngestionSourceIntakeService, {
      strict: false,
    });
    const storageClient = new R2StorageClient(readR2ConfigFromEnv());
    const results: BackfillResult[] = [];

    for (const slug of slugs) {
      results.push(
        await backfillSlug({
          slug,
          localPrisma,
          targetPrisma,
          ingestion,
          processingEngine,
          sourceIntakeService,
          storageClient,
          dryRun: !options.yes,
        }),
      );
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      dryRun: !options.yes,
      results,
    };

    if (options.outFile) {
      writeFileSync(options.outFile, JSON.stringify(payload, null, 2));
    }

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await localPrisma.$disconnect();
    await app.close();
  }
}

async function backfillSlug(input: {
  slug: string;
  localPrisma: PrismaClient;
  targetPrisma: PrismaService;
  ingestion: IngestionService;
  processingEngine: IngestionProcessingEngineService;
  sourceIntakeService: IngestionSourceIntakeService;
  storageClient: R2StorageClient;
  dryRun: boolean;
}): Promise<BackfillResult> {
  const localJob = await input.localPrisma.ingestionJob.findFirst({
    where: {
      status: IngestionJobStatus.PUBLISHED,
      publishedPaperId: {
        not: null,
      },
      paperSource: {
        slug: input.slug,
      },
    },
    include: {
      paperSource: {
        include: {
          subject: {
            select: {
              code: true,
            },
          },
          streamMappings: {
            orderBy: {
              stream: {
                code: 'asc',
              },
            },
            select: {
              stream: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
  });

  if (!localJob) {
    throw new Error(`No local published ingestion job found for ${input.slug}.`);
  }

  const targetPaperSource = await input.targetPrisma.paperSource.findUnique({
    where: {
      slug: input.slug,
    },
    include: {
      subject: {
        select: {
          code: true,
        },
      },
      streamMappings: {
        orderBy: {
          stream: {
            code: 'asc',
          },
        },
        select: {
          stream: {
            select: {
              code: true,
            },
          },
        },
      },
      sourceDocuments: {
        orderBy: {
          kind: 'asc',
        },
        select: {
          kind: true,
          sourceUrl: true,
        },
      },
      ingestionJobs: {
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      },
      papers: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!targetPaperSource) {
    throw new Error(`Target paper source ${input.slug} was not found.`);
  }

  if (targetPaperSource.papers.length > 0) {
    return {
      slug: input.slug,
      localJobId: localJob.id,
      targetJobId: null,
      initialTargetStatus: null,
      finalTargetStatus: 'published',
      action: 'skipped_already_published',
      publishedPaperId: targetPaperSource.papers[0].id,
      processedJobIds: [],
    };
  }

  const initialJob = selectMutableJob(targetPaperSource.ingestionJobs);
  const initialTargetStatus = initialJob?.status ?? null;

  if (input.dryRun) {
    return {
      slug: input.slug,
      localJobId: localJob.id,
      targetJobId: initialJob?.id ?? null,
      initialTargetStatus,
      finalTargetStatus: initialTargetStatus,
      action: 'dry_run',
      publishedPaperId: null,
      processedJobIds: [],
    };
  }

  const localDraft = normalizeIngestionDraft(localJob.draftJson);
  const targetJobId =
    initialJob?.id ??
    (await createTargetJob({
      slug: input.slug,
      localDraft,
      targetPaperSource,
      sourceIntakeService: input.sourceIntakeService,
      storageClient: input.storageClient,
    }));

  await withTransientRetry(input.slug, 'ensure target source pages', () =>
    input.processingEngine.runStage({
      jobId: targetJobId,
      replaceExisting: false,
      completionStatus: 'DRAFT',
    }),
  );

  const hydratedTarget = await withTransientRetry(input.slug, 'read target', () =>
    input.ingestion.getJob(targetJobId),
  );
  const remappedDraft = remapDraftToTarget(
    localDraft,
    normalizeIngestionDraft(hydratedTarget.draft_json),
  );

  await withTransientRetry(input.slug, 'update target draft', () =>
    input.ingestion.updateJob(targetJobId, {
      draft_json: remappedDraft,
      review_notes: buildReviewNotes(localJob.reviewNotes),
    }),
  );

  await withTransientRetry(input.slug, 'move to review', () =>
    input.processingEngine.runStage({
      jobId: targetJobId,
      replaceExisting: false,
      completionStatus: 'IN_REVIEW',
    }),
  );

  const publishResult = await approveAndPublish({
    slug: input.slug,
    jobId: targetJobId,
    ingestion: input.ingestion,
  });

  return {
    slug: input.slug,
    localJobId: localJob.id,
    targetJobId,
    initialTargetStatus,
    finalTargetStatus: publishResult.finalStatus,
    action: 'published',
    publishedPaperId: publishResult.publishedPaperId,
    processedJobIds: publishResult.processedJobIds,
  };
}

async function createTargetJob(input: {
  slug: string;
  localDraft: IngestionDraft;
  targetPaperSource: {
    provider: string;
    year: number;
    sessionType: 'NORMAL' | 'MAKEUP';
    familyCode: string;
    sourceListingUrl: string | null;
    sourceExamPageUrl: string | null;
    sourceCorrectionPageUrl: string | null;
    subject: {
      code: string;
    };
    streamMappings: Array<{
      stream: {
        code: string;
      };
    }>;
    sourceDocuments: Array<{
      kind: 'EXAM' | 'CORRECTION';
      sourceUrl: string | null;
    }>;
  };
  sourceIntakeService: IngestionSourceIntakeService;
  storageClient: R2StorageClient;
}) {
  const streamCodes = input.targetPaperSource.streamMappings.map(
    (mapping) => mapping.stream.code,
  );
  const examDocument = input.targetPaperSource.sourceDocuments.find(
    (document) => document.kind === 'EXAM',
  );
  const correctionDocument = input.targetPaperSource.sourceDocuments.find(
    (document) => document.kind === 'CORRECTION',
  );
  const externalExamUrl =
    readString(input.localDraft.exam.metadata.examPdfUrl) ??
    examDocument?.sourceUrl ??
    input.targetPaperSource.sourceExamPageUrl ??
    input.slug;
  const metadata = {
    ...input.localDraft.exam.metadata,
    slug: input.slug,
    paperFamilyCode: input.targetPaperSource.familyCode,
    paperStreamCodes: streamCodes,
    examPdfUrl:
      readString(input.localDraft.exam.metadata.examPdfUrl) ??
      examDocument?.sourceUrl ??
      null,
    correctionPdfUrl:
      readString(input.localDraft.exam.metadata.correctionPdfUrl) ??
      correctionDocument?.sourceUrl ??
      null,
    ensuredFromLocalPublishedBackfill: true,
  };
  const createdJob = await input.sourceIntakeService.upsertExternalSourceJob({
    externalExamUrl,
    replaceExisting: false,
    storageClient: input.storageClient,
    draft: {
      ...input.localDraft,
      exam: {
        ...input.localDraft.exam,
        provider: input.targetPaperSource.provider,
        year: input.targetPaperSource.year,
        subjectCode: input.targetPaperSource.subject.code,
        streamCode: streamCodes[0] ?? input.localDraft.exam.streamCode,
        sessionType: input.targetPaperSource.sessionType,
        sourceListingUrl: input.targetPaperSource.sourceListingUrl,
        sourceExamPageUrl: input.targetPaperSource.sourceExamPageUrl,
        sourceCorrectionPageUrl:
          input.targetPaperSource.sourceCorrectionPageUrl,
        metadata,
      },
    },
    metadata,
    reviewNotes: buildReviewNotes(null),
    job: {
      label: input.localDraft.exam.title,
      provider: input.targetPaperSource.provider,
      sourceListingUrl: input.targetPaperSource.sourceListingUrl,
      sourceExamPageUrl: input.targetPaperSource.sourceExamPageUrl,
      sourceCorrectionPageUrl:
        input.targetPaperSource.sourceCorrectionPageUrl,
      year: input.targetPaperSource.year,
      streamCode: streamCodes[0] ?? input.localDraft.exam.streamCode,
      subjectCode: input.targetPaperSource.subject.code,
      sessionType: input.targetPaperSource.sessionType,
      minYear: input.localDraft.exam.minYear,
    },
    documents: [],
  });

  if (!createdJob?.jobId) {
    throw new Error(`Unable to create target ingestion job for ${input.slug}.`);
  }

  return createdJob.jobId;
}

async function approveAndPublish(input: {
  slug: string;
  jobId: string;
  ingestion: IngestionService;
}) {
  const processedJobIds: string[] = [];
  let currentJob = await withTransientRetry(input.slug, 'read for publish', () =>
    input.ingestion.getJob(input.jobId),
  );
  const deadline = Date.now() + 20 * 60 * 1000;

  while (currentJob.job.status !== 'published') {
    if (currentJob.job.status === 'failed') {
      throw new Error(`Publishing failed for ${input.slug}.`);
    }

    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${input.slug} to publish.`);
    }

    if (currentJob.job.status !== 'approved') {
      currentJob = await withTransientRetry(input.slug, 'approve', () =>
        input.ingestion.approveJob(input.jobId),
      );
      continue;
    }

    currentJob = await withTransientRetry(input.slug, 'queue publish', () =>
      input.ingestion.publishJob(input.jobId),
    );

    while (
      currentJob.job.status === 'queued' ||
      currentJob.job.status === 'processing'
    ) {
      const processedJobId = await withTransientRetry(input.slug, 'worker', () =>
        input.ingestion.runNextQueuedJob(`codex-local-backfill-${process.pid}`),
      );

      if (processedJobId) {
        processedJobIds.push(processedJobId);
      } else {
        await delay(1000);
      }

      currentJob = await withTransientRetry(input.slug, 'refresh publish', () =>
        input.ingestion.getJob(input.jobId),
      );
    }
  }

  return {
    finalStatus: currentJob.job.status,
    publishedPaperId: currentJob.job.published_paper_id,
    processedJobIds,
  };
}

function remapDraftToTarget(
  localDraft: IngestionDraft,
  targetDraft: IngestionDraft,
): IngestionDraft {
  const targetPagesByKey = new Map(
    targetDraft.sourcePages.map((page) => [sourcePageKey(page), page]),
  );
  const localPagesById = new Map(
    localDraft.sourcePages.map((page) => [page.id, page]),
  );
  const assets = localDraft.assets.map((asset) => {
    const localPage = localPagesById.get(asset.sourcePageId);

    if (!localPage) {
      throw new Error(
        `Asset ${asset.id} references missing local source page ${asset.sourcePageId}.`,
      );
    }

    const targetPage = targetPagesByKey.get(sourcePageKey(localPage));

    if (!targetPage) {
      throw new Error(
        `No target source page for ${localPage.documentKind} page ${localPage.pageNumber}.`,
      );
    }

    return {
      ...asset,
      sourcePageId: targetPage.id,
      documentKind: targetPage.documentKind,
      pageNumber: targetPage.pageNumber,
    };
  });

  return normalizeIngestionDraft({
    ...localDraft,
    exam: {
      ...localDraft.exam,
      examDocumentId: targetDraft.exam.examDocumentId,
      correctionDocumentId: targetDraft.exam.correctionDocumentId,
      examDocumentStorageKey: targetDraft.exam.examDocumentStorageKey,
      correctionDocumentStorageKey:
        targetDraft.exam.correctionDocumentStorageKey,
    },
    sourcePages: targetDraft.sourcePages,
    assets,
  });
}

function sourcePageKey(page: {
  documentKind: string;
  pageNumber: number;
}) {
  return `${page.documentKind}:${page.pageNumber}`;
}

function selectMutableJob(
  jobs: Array<{
    id: string;
    status: IngestionJobStatus;
    updatedAt: Date;
  }>,
) {
  const mutableJobs = jobs.filter(
    (job) =>
      job.status !== IngestionJobStatus.PUBLISHED &&
      job.status !== IngestionJobStatus.QUEUED &&
      job.status !== IngestionJobStatus.PROCESSING,
  );
  const priority = new Map<IngestionJobStatus, number>([
    [IngestionJobStatus.IN_REVIEW, 1],
    [IngestionJobStatus.APPROVED, 2],
    [IngestionJobStatus.DRAFT, 3],
    [IngestionJobStatus.FAILED, 4],
  ]);

  return mutableJobs.sort((left, right) => {
    const leftPriority = priority.get(left.status) ?? 99;
    const rightPriority = priority.get(right.status) ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.updatedAt.getTime() - left.updatedAt.getTime();
  })[0];
}

function buildReviewNotes(existing: string | null) {
  return [
    existing?.trim() || null,
    `Codex DB handoff repair ${new Date().toISOString()}: backfilled from this device's latest local published draft so the hosted checkpoint contains local-only published work.`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function createApplicationContextWithRetry() {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      return await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
      });
    } catch (error) {
      lastError = error;

      if (!isTransientDatabaseError(error) || attempt === 20) {
        break;
      }

      console.error(`[startup] transient database failure; retrying ${attempt}`);
      await delay(Math.min(attempt * 1500, 15_000));
    }
  }

  throw lastError;
}

async function withTransientRetry<T>(
  slug: string,
  action: string,
  callback: () => Promise<T>,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      return await callback();
    } catch (error) {
      lastError = error;

      if (!isTransientDatabaseError(error) || attempt === 20) {
        break;
      }

      console.error(
        `[${slug}] transient ${action} failure; retrying ${attempt}: ${summarizeError(error)}`,
      );
      await delay(Math.min(attempt * 1500, 15_000));
    }
  }

  throw lastError;
}

function isTransientDatabaseError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const record = error as { code?: unknown; message?: unknown };
  const message = typeof record.message === 'string' ? record.message : '';

  return (
    record.code === 'P1001' ||
    record.code === 'P2028' ||
    message.includes("Can't reach database server") ||
    message.includes('Connection terminated unexpectedly') ||
    message.includes('Transaction not found') ||
    message.includes('Timed out fetching a new connection')
  );
}

function summarizeError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return String(error);
  }

  const record = error as { code?: unknown; message?: unknown };
  const code = typeof record.code === 'string' ? `${record.code}: ` : '';
  const message =
    typeof record.message === 'string' ? record.message : String(error);

  return `${code}${message.replace(/\s+/g, ' ').slice(0, 500)}`;
}

function readSlugs(slugFile: string) {
  const absolutePath = path.resolve(process.cwd(), slugFile);
  const raw = readFileSync(absolutePath, 'utf8').trim();

  if (!raw) {
    return [];
  }

  if (raw.startsWith('[')) {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('Slug JSON must be an array.');
    }

    return parsed.map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (entry && typeof entry.slug === 'string') {
        return entry.slug;
      }

      throw new Error('Slug JSON entries must be strings or objects with slug.');
    });
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseOptions(argv: string[]): Options {
  const options: Options = {
    slugFile: '',
    localDatabaseUrl:
      process.env.LOCAL_DATABASE_URL ?? DEFAULT_LOCAL_DATABASE_URL,
    outFile: null,
    yes: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--slug-file' && value) {
      options.slugFile = value;
      index += 1;
      continue;
    }

    if (arg === '--local-database-url' && value) {
      options.localDatabaseUrl = value;
      index += 1;
      continue;
    }

    if (arg === '--out' && value) {
      options.outFile = value;
      index += 1;
      continue;
    }

    if (arg === '--yes') {
      options.yes = true;
      continue;
    }

    if (arg === '--help') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.slugFile) {
    throw new Error('--slug-file is required.');
  }

  return options;
}

function printUsage() {
  console.log(`Usage: ts-node scripts/backfill-target-from-local-published.ts --slug-file <path> [--out <path>] [--yes]`);
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
