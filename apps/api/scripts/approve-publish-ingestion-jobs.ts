import { NestFactory } from '@nestjs/core';
import { IngestionJobStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { IngestionProcessingEngineService } from '../src/ingestion/ingestion-processing-engine.service';
import { IngestionService } from '../src/ingestion/ingestion.service';
import { PrismaService } from '../src/prisma/prisma.service';

type Target =
  | {
      kind: 'jobId';
      value: string;
    }
  | {
      kind: 'paperSourceSlug';
      value: string;
    };

type PublishResult = {
  target: string;
  jobId: string;
  initialStatus: string;
  finalStatus: string;
  processedJobIds: string[];
  publishedPaperId: string | null;
  publishedExams: Array<{
    id: string;
    stream_code: string;
  }>;
};

async function main() {
  const targets = parseTargets(process.argv.slice(2));
  const app = await createApplicationContextWithRetry();

  try {
    const prisma = app.get(PrismaService, { strict: false });
    const ingestion = app.get(IngestionService, { strict: false });
    const processingEngine = app.get(IngestionProcessingEngineService, {
      strict: false,
    });
    const results: PublishResult[] = [];

    for (const target of targets) {
      const jobId =
        target.kind === 'jobId'
          ? target.value
          : await resolveMutableJobIdForPaperSource(prisma, target.value);
      results.push(
        await approveAndPublish(
          ingestion,
          processingEngine,
          target.value,
          jobId,
        ),
      );
    }

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await app.close();
  }
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

      console.error(
        `[startup] transient database failure; retrying (${attempt}/20)`,
      );
      await delay(Math.min(attempt * 1500, 15_000));
    }
  }

  throw lastError;
}

async function approveAndPublish(
  ingestion: IngestionService,
  processingEngine: IngestionProcessingEngineService,
  target: string,
  jobId: string,
): Promise<PublishResult> {
  const initialJob = await ingestion.getJob(jobId);
  const initialStatus = initialJob.job.status;
  const processedJobIds: string[] = [];

  let currentJob = initialJob;
  console.error(`[${target}] initial status: ${currentJob.job.status}`);

  const deadline = Date.now() + 20 * 60 * 1000;
  while (currentJob.job.status !== 'published') {
    if (currentJob.job.status === 'failed') {
      throw new Error(`Publishing failed for ${target}.`);
    }

    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${target} to publish.`);
    }

    if (currentJob.job.status === 'draft') {
      await withTransientRetry(target, 'review-stage', () =>
        processingEngine.runStage({
          jobId,
          replaceExisting: false,
          completionStatus: 'IN_REVIEW',
        }),
      );
      currentJob = await withTransientRetry(target, 'refresh', () =>
        ingestion.getJob(jobId),
      );
      console.error(`[${target}] review stage: ${currentJob.job.status}`);
      continue;
    }

    if (currentJob.job.status === 'approved') {
      currentJob = await withTransientRetry(target, 'publish', () =>
        ingestion.publishJob(jobId),
      );
      console.error(`[${target}] queued publish: ${currentJob.job.status}`);
      continue;
    }

    if (
      currentJob.job.status !== 'queued' &&
      currentJob.job.status !== 'processing'
    ) {
      currentJob = await withTransientRetry(target, 'approve', () =>
        ingestion.approveJob(jobId),
      );
      console.error(`[${target}] approved: ${currentJob.job.status}`);
      continue;
    }

    const processedJobId = await withTransientRetry(target, 'worker', () =>
      ingestion.runNextQueuedJob(`codex-publish-${process.pid}`),
    );
    console.error(`[${target}] worker processed: ${processedJobId ?? 'none'}`);

    if (processedJobId) {
      processedJobIds.push(processedJobId);
    } else {
      await delay(1000);
    }

    currentJob = await withTransientRetry(target, 'refresh', () =>
      ingestion.getJob(jobId),
    );
  }

  return {
    target,
    jobId,
    initialStatus,
    finalStatus: currentJob.job.status,
    processedJobIds,
    publishedPaperId: currentJob.job.published_paper_id,
    publishedExams: currentJob.job.published_exams.map((exam) => ({
      id: exam.id,
      stream_code: exam.stream_code,
    })),
  };
}

async function resolveMutableJobIdForPaperSource(
  prisma: PrismaService,
  paperSourceSlug: string,
) {
  const paperSource = await prisma.paperSource.findUnique({
    where: {
      slug: paperSourceSlug,
    },
    select: {
      slug: true,
      ingestionJobs: {
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!paperSource) {
    throw new Error(`Paper source ${paperSourceSlug} was not found.`);
  }

  const mutableJob = paperSource.ingestionJobs.find(
    (job) => job.status !== IngestionJobStatus.PUBLISHED,
  );

  if (!mutableJob) {
    throw new Error(`No mutable ingestion job found for ${paperSourceSlug}.`);
  }

  return mutableJob.id;
}

function parseTargets(argv: string[]): Target[] {
  const targets: Target[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--job-id' && value) {
      targets.push({ kind: 'jobId', value });
      index += 1;
      continue;
    }

    if (arg === '--paper-source-slug' && value) {
      targets.push({ kind: 'paperSourceSlug', value });
      index += 1;
      continue;
    }
  }

  if (targets.length === 0) {
    throw new Error('Provide at least one --job-id or --paper-source-slug.');
  }

  return targets;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTransientRetry<T>(
  target: string,
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
        `[${target}] transient ${action} failure; retrying (${attempt}/20): ${summarizeError(error)}`,
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

void main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
