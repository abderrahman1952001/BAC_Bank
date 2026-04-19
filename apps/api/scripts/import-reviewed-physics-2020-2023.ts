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
import { IngestionOpsService } from '../src/ingestion/ingestion-ops.service';
import { IngestionProcessingEngineService } from '../src/ingestion/ingestion-processing-engine.service';
import { IngestionReadService } from '../src/ingestion/ingestion-read.service';
import { IngestionSourceIntakeService } from '../src/ingestion/ingestion-source-intake.service';
import { validateIngestionDraft } from '../src/ingestion/ingestion-validation';
import {
  importReviewedPaperExtract,
  parseReviewedPaperExtract,
} from '../src/ingestion/reviewed-paper-import';
import {
  readR2ConfigFromEnv,
  R2StorageClient,
} from '../src/ingestion/r2-storage';
import { PrismaService } from '../src/prisma/prisma.service';

const EXTRACTS_DIR = path.resolve(process.cwd(), 'extracted papers', 'Physics');
const SUPPORTED_YEARS = new Set([2020, 2021, 2022, 2023]);
const SUBJECT_CODE = 'PHYSICS';
const SESSION_TYPE = SessionType.NORMAL;

type TargetFile = {
  absolutePath: string;
  relativePath: string;
  year: number;
  familyCode: string;
};

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService, { strict: false });
  const readService = app.get(IngestionReadService, { strict: false });
  const opsService = app.get(IngestionOpsService, { strict: false });
  const sourceIntakeService = app.get(IngestionSourceIntakeService, {
    strict: false,
  });
  const processingEngine = app.get(IngestionProcessingEngineService, {
    strict: false,
  });
  const storageClient = new R2StorageClient(readR2ConfigFromEnv());

  try {
    const targetFiles = await loadTargetFiles();
    const runSummary: Array<Record<string, unknown>> = [];

    for (const targetFile of targetFiles) {
      const summary = await importFile({
        prisma,
        readService,
        opsService,
        sourceIntakeService,
        processingEngine,
        storageClient,
        targetFile,
      });
      runSummary.push(summary);
    }

    console.log(JSON.stringify(runSummary, null, 2));
  } finally {
    await app.close();
  }
}

async function loadTargetFiles(): Promise<TargetFile[]> {
  const entries = await fs.readdir(EXTRACTS_DIR, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => parseTargetFile(entry.name))
    .filter(
      (entry): entry is Omit<TargetFile, 'absolutePath' | 'relativePath'> =>
        Boolean(entry),
    )
    .sort(
      (left, right) =>
        right.year - left.year ||
        left.familyCode.localeCompare(right.familyCode),
    )
    .map((entry) => ({
      ...entry,
      absolutePath: path.join(
        EXTRACTS_DIR,
        buildFileName(entry.familyCode, entry.year),
      ),
      relativePath: path.join(
        'extracted papers',
        'Physics',
        buildFileName(entry.familyCode, entry.year),
      ),
    }));
}

async function importFile(input: {
  prisma: PrismaService;
  readService: IngestionReadService;
  opsService: IngestionOpsService;
  sourceIntakeService: IngestionSourceIntakeService;
  processingEngine: IngestionProcessingEngineService;
  storageClient: R2StorageClient;
  targetFile: TargetFile;
}) {
  const raw = await fs.readFile(input.targetFile.absolutePath, 'utf8');
  const reviewedExtract = parseReviewedPaperExtract(
    JSON.parse(raw),
    input.targetFile.relativePath,
  );
  const paperSource = await input.prisma.paperSource.findFirst({
    where: {
      year: input.targetFile.year,
      familyCode: input.targetFile.familyCode,
      sessionType: SESSION_TYPE,
      subject: {
        code: SUBJECT_CODE,
      },
    },
    orderBy: {
      createdAt: 'asc',
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
          fileName: true,
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
    throw new Error(
      `Missing paper source for ${SUBJECT_CODE} ${input.targetFile.familyCode} ${input.targetFile.year}.`,
    );
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

  const jobTitle = buildJobTitle({
    year: paperSource.year,
    familyCode: paperSource.familyCode,
  });
  const streamCodes = paperSource.streamMappings.map(
    (mapping) => mapping.stream.code,
  );
  const workingJobId =
    selectWorkingJobId(paperSource.ingestionJobs) ??
    (
      await input.sourceIntakeService.upsertExternalSourceJob({
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
          sessionType: 'NORMAL',
          provider: paperSource.provider,
          title: jobTitle,
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
          label: jobTitle,
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
      })
    )?.jobId;

  if (!workingJobId) {
    throw new Error(
      `Unable to resolve a mutable ingestion job for ${paperSource.slug}.`,
    );
  }

  const jobBeforeImport = await input.readService.findJobOrThrow(workingJobId);

  if (jobBeforeImport.status === IngestionJobStatus.PUBLISHED) {
    throw new Error(`Published job ${workingJobId} cannot be overwritten.`);
  }

  const baseDraft = input.readService.hydrateDraft(jobBeforeImport);
  const imported = importReviewedPaperExtract({
    baseDraft,
    reviewedExtract,
    importFilePath: input.targetFile.relativePath,
    jobTitle,
  });
  const validation = validateIngestionDraft(imported.draft);
  const reviewNotes = buildReviewNotes({
    importFilePath: input.targetFile.relativePath,
    summary: imported.summary,
    validation,
  });

  await input.opsService.resetToDraft(workingJobId, {
    draft: imported.draft,
    reviewNotes,
    clearErrorMessage: true,
  });

  let finalStatus = 'DRAFT';

  if (validation.errors.length === 0) {
    await input.processingEngine.runStage({
      jobId: workingJobId,
      replaceExisting: false,
      skipExtraction: true,
      completionStatus: 'IN_REVIEW',
    });
    finalStatus = 'IN_REVIEW';
  }

  return {
    file: input.targetFile.relativePath,
    paperSourceSlug: paperSource.slug,
    jobId: workingJobId,
    finalStatus,
    errors: validation.errors,
    warningCount: validation.warnings.length,
    missingVariantCodes: imported.summary.missingVariantCodes,
    exerciseCount: imported.summary.exerciseCount,
    questionCount: imported.summary.questionCount,
    assetCount: imported.summary.assetCount,
    uncertaintyCount: imported.summary.uncertaintyCount,
  };
}

function parseTargetFile(fileName: string) {
  const seMatch = fileName.match(/^SE (20\d{2})\.txt$/);
  if (seMatch) {
    const year = Number.parseInt(seMatch[1] ?? '', 10);
    if (SUPPORTED_YEARS.has(year)) {
      return {
        year,
        familyCode: 'se',
      };
    }
  }

  const mathTechMatch = fileName.match(/^M MT (20\d{2})\.txt$/);
  if (mathTechMatch) {
    const year = Number.parseInt(mathTechMatch[1] ?? '', 10);
    if (SUPPORTED_YEARS.has(year)) {
      return {
        year,
        familyCode: 'm-tm',
      };
    }
  }

  return null;
}

function buildFileName(familyCode: string, year: number) {
  return familyCode === 'se' ? `SE ${year}.txt` : `M MT ${year}.txt`;
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

function buildJobTitle(input: { year: number; familyCode: string }) {
  return `BAC ${input.year} PHYSICS ${input.familyCode.toUpperCase()}`;
}

function buildReviewNotes(input: {
  importFilePath: string;
  summary: ReturnType<typeof importReviewedPaperExtract>['summary'];
  validation: ReturnType<typeof validateIngestionDraft>;
}) {
  const notes = [
    `Imported from ${input.importFilePath}.`,
    `Variants: ${input.summary.variantCount}.`,
    `Exercises: ${input.summary.exerciseCount}.`,
    `Questions: ${input.summary.questionCount}.`,
    `Assets: ${input.summary.assetCount}.`,
    `Uncertainties: ${input.summary.uncertaintyCount}.`,
    'Asset crops are full-page placeholders because the reviewed extract does not include crop geometry.',
  ];

  if (input.summary.missingVariantCodes.length > 0) {
    notes.push(
      `Missing variants in reviewed extract: ${input.summary.missingVariantCodes.join(', ')}.`,
    );
  }

  if (input.validation.errors.length > 0) {
    notes.push(
      `Validation errors: ${input.validation.errors.slice(0, 3).join(' | ')}.`,
    );
  } else {
    notes.push(`Validation warnings: ${input.validation.warnings.length}.`);
    notes.push(
      'Ready for manual crop cleanup and final human review before approval.',
    );
  }

  return notes.join(' ');
}

void main();
