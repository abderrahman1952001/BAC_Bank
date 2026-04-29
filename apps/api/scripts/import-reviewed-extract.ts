import { promises as fs } from 'fs';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import {
  IngestionJobStatus,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { createEmptyDraft } from '../src/ingestion/ingestion.contract';
import { IngestionReadService } from '../src/ingestion/ingestion-read.service';
import { IngestionReviewedExtractService } from '../src/ingestion/ingestion-reviewed-extract.service';
import { parseReviewedPaperExtract } from '../src/ingestion/reviewed-paper-import';
import { IngestionSourceIntakeService } from '../src/ingestion/ingestion-source-intake.service';
import {
  readR2ConfigFromEnv,
  R2StorageClient,
} from '../src/ingestion/r2-storage';
import { PrismaService } from '../src/prisma/prisma.service';

type CliOptions = {
  filePath: string;
  jobId: string | null;
  paperSourceSlug: string | null;
  status: 'draft' | 'in-review';
  title: string | null;
};

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService, { strict: false });
  const readService = app.get(IngestionReadService, { strict: false });
  const reviewedExtractService = app.get(IngestionReviewedExtractService, {
    strict: false,
  });
  const sourceIntakeService = app.get(IngestionSourceIntakeService, {
    strict: false,
  });
  const storageClient = new R2StorageClient(readR2ConfigFromEnv());

  try {
    const absoluteFilePath = path.resolve(process.cwd(), options.filePath);
    const importFilePath = toDisplayPath(absoluteFilePath);
    const reviewedExtract = parseReviewedPaperExtract(
      JSON.parse(await fs.readFile(absoluteFilePath, 'utf8')),
      importFilePath,
    );
    const resolvedTarget = options.jobId
      ? {
          jobId: options.jobId,
          paperSourceSlug: null,
          defaultTitle: null,
        }
      : await resolveJobForPaperSource({
          prisma,
          sourceIntakeService,
          storageClient,
          paperSourceSlug: options.paperSourceSlug!,
          title: options.title,
        });

    const result = await reviewedExtractService.importReviewedExtract({
      jobId: resolvedTarget.jobId,
      reviewedExtract,
      importFilePath,
      jobTitle: options.title ?? resolvedTarget.defaultTitle,
      moveToInReview: options.status === 'in-review',
    });
    const job = await readService.findJobOrThrow(resolvedTarget.jobId);

    console.log(
      JSON.stringify(
        {
          file: importFilePath,
          jobId: resolvedTarget.jobId,
          paperSourceSlug:
            resolvedTarget.paperSourceSlug ?? job.paperSource?.slug ?? null,
          finalStatus: result.finalStatus,
          validation: {
            errors: result.validation.errors,
            warnings: result.validation.warnings.length,
          },
          summary: {
            variantCount: result.summary.variantCount,
            exerciseCount: result.summary.exerciseCount,
            questionCount: result.summary.questionCount,
            assetCount: result.summary.assetCount,
            uncertaintyCount: result.summary.uncertaintyCount,
            missingVariantCodes: result.summary.missingVariantCodes,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

async function resolveJobForPaperSource(input: {
  prisma: PrismaService;
  sourceIntakeService: IngestionSourceIntakeService;
  storageClient: R2StorageClient;
  paperSourceSlug: string;
  title: string | null;
}) {
  const paperSource = await input.prisma.paperSource.findUnique({
    where: {
      slug: input.paperSourceSlug,
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
          id: true,
          kind: true,
          sourceUrl: true,
          storageKey: true,
        },
      },
      ingestionJobs: {
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!paperSource) {
    throw new Error(`Paper source ${input.paperSourceSlug} was not found.`);
  }

  const examDocument = paperSource.sourceDocuments.find(
    (document) => document.kind === SourceDocumentKind.EXAM,
  );
  const correctionDocument = paperSource.sourceDocuments.find(
    (document) => document.kind === SourceDocumentKind.CORRECTION,
  );

  if (!examDocument || !correctionDocument) {
    throw new Error(
      `Paper source ${paperSource.slug} is missing an exam or correction document.`,
    );
  }

  const streamCodes = paperSource.streamMappings.map(
    (mapping) => mapping.stream.code,
  );
  const defaultTitle =
    input.title ??
    buildDefaultJobTitle(
      paperSource.year,
      paperSource.subject.code,
      paperSource.familyCode,
    );
  const existingJobId = selectWorkingJobId(paperSource.ingestionJobs);

  if (existingJobId) {
    return {
      jobId: existingJobId,
      paperSourceSlug: paperSource.slug,
      defaultTitle,
    };
  }

  const createdJob = await input.sourceIntakeService.upsertExternalSourceJob({
    externalExamUrl:
      examDocument.sourceUrl ??
      paperSource.sourceExamPageUrl ??
      paperSource.slug,
    replaceExisting: false,
    storageClient: input.storageClient,
    draft: createEmptyDraft({
      year: paperSource.year,
      streamCode: streamCodes[0] ?? null,
      subjectCode: paperSource.subject.code,
      sessionType: draftSessionType(paperSource.sessionType),
      provider: paperSource.provider,
      title: defaultTitle,
      minYear: paperSource.year,
      sourceListingUrl: paperSource.sourceListingUrl,
      sourceExamPageUrl: paperSource.sourceExamPageUrl,
      sourceCorrectionPageUrl: paperSource.sourceCorrectionPageUrl,
      metadata: {
        slug: paperSource.slug,
        paperFamilyCode: paperSource.familyCode,
        paperStreamCodes: streamCodes,
        examPdfUrl: examDocument.sourceUrl,
        correctionPdfUrl: correctionDocument.sourceUrl,
      },
    }),
    metadata: {
      slug: paperSource.slug,
      paperFamilyCode: paperSource.familyCode,
      paperStreamCodes: streamCodes,
      examPdfUrl: examDocument.sourceUrl,
      correctionPdfUrl: correctionDocument.sourceUrl,
      ensuredFromReviewedExtractImport: true,
    },
    job: {
      label: defaultTitle,
      provider: paperSource.provider,
      sourceListingUrl: paperSource.sourceListingUrl,
      sourceExamPageUrl: paperSource.sourceExamPageUrl,
      sourceCorrectionPageUrl: paperSource.sourceCorrectionPageUrl,
      year: paperSource.year,
      streamCode: streamCodes[0] ?? null,
      subjectCode: paperSource.subject.code,
      sessionType: paperSource.sessionType,
      minYear: paperSource.year,
    },
    documents: [],
  });

  if (!createdJob?.jobId) {
    throw new Error(
      `Unable to resolve a mutable ingestion job for paper source ${paperSource.slug}.`,
    );
  }

  return {
    jobId: createdJob.jobId,
    paperSourceSlug: paperSource.slug,
    defaultTitle,
  };
}

function buildDefaultJobTitle(
  year: number,
  subjectCode: string,
  familyCode: string,
) {
  return `BAC ${year} ${subjectCode} ${familyCode.toUpperCase()}`;
}

function draftSessionType(sessionType: SessionType) {
  return sessionType === SessionType.MAKEUP ? 'MAKEUP' : 'NORMAL';
}

function selectWorkingJobId(
  jobs: Array<{
    id: string;
    status: IngestionJobStatus;
  }>,
) {
  const mutableJob = jobs.find(
    (job) =>
      job.status !== IngestionJobStatus.QUEUED &&
      job.status !== IngestionJobStatus.PROCESSING &&
      job.status !== IngestionJobStatus.PUBLISHED,
  );

  return mutableJob?.id ?? null;
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    filePath: '',
    jobId: null,
    paperSourceSlug: null,
    status: 'in-review',
    title: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--file' && argv[index + 1]) {
      options.filePath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--job-id' && argv[index + 1]) {
      options.jobId = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--paper-source-slug' && argv[index + 1]) {
      options.paperSourceSlug = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--status' && argv[index + 1]) {
      const nextStatus = argv[index + 1];
      if (nextStatus !== 'draft' && nextStatus !== 'in-review') {
        throw new Error('--status must be either "draft" or "in-review".');
      }
      options.status = nextStatus;
      index += 1;
      continue;
    }

    if (arg === '--title' && argv[index + 1]) {
      options.title = argv[index + 1];
      index += 1;
    }
  }

  if (!options.filePath.trim()) {
    throw new Error('--file is required.');
  }

  if (!!options.jobId === !!options.paperSourceSlug) {
    throw new Error('Provide exactly one of --job-id or --paper-source-slug.');
  }

  return options;
}

function toDisplayPath(absolutePath: string) {
  const relativePath = path.relative(process.cwd(), absolutePath);
  return relativePath.startsWith('..') ? absolutePath : relativePath;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
