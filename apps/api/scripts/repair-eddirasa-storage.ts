import { Prisma, SessionType, SourceDocumentKind } from '@prisma/client';
import type { IngestionOpsService } from '../src/ingestion/ingestion-ops.service';
import { normalizeIngestionDraft } from '../src/ingestion/ingestion.contract';
import {
  buildCanonicalEddirasaDocumentFileName,
  buildEddirasaDocumentStorageKey,
  deriveEddirasaMetadata,
  type EddirasaStorageContext,
} from '../src/ingestion/eddirasa-normalization';
import {
  R2StorageClient,
  readR2ConfigFromEnv,
} from '../src/ingestion/r2-storage';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createIngestionScriptContext } from './ingestion-script-context';

let prisma: PrismaService;
let ingestionOpsService: IngestionOpsService;
const storageClient = new R2StorageClient(readR2ConfigFromEnv());
const DEFAULT_MIN_YEAR = 2008;

async function main() {
  const {
    app,
    prisma: prismaService,
    ingestionOpsService: opsService,
  } = await createIngestionScriptContext();
  prisma = prismaService;
  ingestionOpsService = opsService;

  try {
    const options = parseCliOptions(process.argv.slice(2));
    const jobs = await prisma.ingestionJob.findMany({
      where: {
        provider: 'eddirasa',
        year: {
          gte: options.minYear,
        },
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        label: true,
        year: true,
        streamCode: true,
        subjectCode: true,
        sessionType: true,
        draftJson: true,
        metadata: true,
        sourceDocuments: {
          orderBy: {
            kind: 'asc',
          },
          select: {
            id: true,
            kind: true,
            storageKey: true,
            fileName: true,
            sourceUrl: true,
            metadata: true,
            pages: {
              select: {
                id: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    let updatedJobs = 0;
    let movedDocuments = 0;
    let failedJobs = 0;

    for (const job of jobs) {
      try {
        const summary = await repairJob(job, options);
        updatedJobs += 1;
        movedDocuments += summary.movedDocuments;
      } catch (error) {
        failedJobs += 1;
        console.error(
          `failed ${job.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    console.log(
      `done jobs=${updatedJobs} documents=${movedDocuments} failed=${failedJobs} minYear=${options.minYear} onlyUnrasterized=${options.onlyUnrasterized}`,
    );
  } finally {
    await app.close();
  }
}

async function repairJob(
  job: {
    id: string;
    label: string;
    year: number;
    streamCode: string | null;
    subjectCode: string | null;
    sessionType: SessionType | null;
    draftJson: Prisma.JsonValue;
    metadata: Prisma.JsonValue | null;
    sourceDocuments: Array<{
      id: string;
      kind: SourceDocumentKind;
      storageKey: string;
      fileName: string;
      sourceUrl: string | null;
      metadata: Prisma.JsonValue | null;
      pages: Array<{
        id: string;
      }>;
    }>;
  },
  options: { onlyUnrasterized: boolean },
) {
  if (
    options.onlyUnrasterized &&
    job.sourceDocuments.some((document) => document.pages.length > 0)
  ) {
    return {
      movedDocuments: 0,
    };
  }

  const draft = normalizeIngestionDraft(job.draftJson);
  const metadata = asRecord(job.metadata);
  const rawSlug =
    readString(metadata?.slug) ?? readString(draft.exam.metadata.slug) ?? null;
  const derived = deriveEddirasaMetadata([rawSlug, job.label]);
  const context: EddirasaStorageContext = {
    year: job.year,
    streamCode: derived.streamCode,
    subjectCode: derived.subjectCode,
    sessionType: job.sessionType ?? SessionType.NORMAL,
    slug: derived.sourceSlug ?? rawSlug,
  };
  const nextLabel = buildLabel(
    job.year,
    derived.subjectCode,
    derived.streamCode,
    job.label,
  );
  let movedDocuments = 0;

  const documentIdsByKind = new Map<SourceDocumentKind, string>();
  const storageKeyByKind = new Map<SourceDocumentKind, string>();

  for (const document of job.sourceDocuments) {
    const nextFileName = buildCanonicalEddirasaDocumentFileName(
      context,
      document.kind,
    );
    const nextStorageKey = buildEddirasaDocumentStorageKey(
      context,
      nextFileName,
    );

    documentIdsByKind.set(document.kind, document.id);
    storageKeyByKind.set(document.kind, nextStorageKey);

    if (
      document.fileName === nextFileName &&
      document.storageKey === nextStorageKey
    ) {
      continue;
    }

    if (document.storageKey !== nextStorageKey) {
      try {
        await storageClient.copyObject({
          sourceKey: document.storageKey,
          destinationKey: nextStorageKey,
        });
      } catch {
        const buffer = await readDocumentBuffer(
          document.storageKey,
          document.sourceUrl,
        );
        await storageClient.putObject({
          key: nextStorageKey,
          body: buffer,
          contentType: 'application/pdf',
        });
      }
    }

    const documentMetadata = asRecord(document.metadata);
    await prisma.sourceDocument.update({
      where: {
        id: document.id,
      },
      data: {
        fileName: nextFileName,
        storageKey: nextStorageKey,
        metadata: {
          ...(documentMetadata ?? {}),
          storageRepairAt: new Date().toISOString(),
          standardizedFileName: nextFileName,
        },
      },
    });

    movedDocuments += 1;
    console.log(`document ${job.id} ${document.kind} -> ${nextFileName}`);
  }

  draft.exam.streamCode = derived.streamCode;
  draft.exam.subjectCode = derived.subjectCode;
  draft.exam.title = nextLabel;
  draft.exam.examDocumentId =
    documentIdsByKind.get(SourceDocumentKind.EXAM) ?? draft.exam.examDocumentId;
  draft.exam.correctionDocumentId =
    documentIdsByKind.get(SourceDocumentKind.CORRECTION) ??
    draft.exam.correctionDocumentId;
  draft.exam.examDocumentStorageKey =
    storageKeyByKind.get(SourceDocumentKind.EXAM) ??
    draft.exam.examDocumentStorageKey;
  draft.exam.correctionDocumentStorageKey =
    storageKeyByKind.get(SourceDocumentKind.CORRECTION) ??
    draft.exam.correctionDocumentStorageKey;
  draft.exam.metadata = {
    ...draft.exam.metadata,
    slug: derived.sourceSlug ?? rawSlug,
    namingRepairAt: new Date().toISOString(),
  };

  await ingestionOpsService.saveDraft(job.id, {
    draft,
    metadata: {
      ...(metadata ?? {}),
      slug: derived.sourceSlug ?? rawSlug,
    },
  });

  return {
    movedDocuments,
  };
}

function parseCliOptions(argv: string[]) {
  const options = {
    minYear: DEFAULT_MIN_YEAR,
    onlyUnrasterized: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--min-year' && argv[index + 1]) {
      options.minYear = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--only-unrasterized') {
      options.onlyUnrasterized = true;
    }
  }

  if (!Number.isInteger(options.minYear) || options.minYear < 0) {
    throw new Error('--min-year must be a non-negative integer.');
  }

  return options;
}

async function readDocumentBuffer(
  storageKey: string,
  sourceUrl: string | null,
) {
  try {
    return await storageClient.getObjectBuffer(storageKey);
  } catch (error) {
    if (!sourceUrl) {
      throw error;
    }

    const response = await fetch(sourceUrl, {
      headers: {
        'user-agent': 'BAC Bank repair bot/1.0',
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} when downloading ${sourceUrl}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

function buildLabel(
  year: number,
  subjectCode: string | null,
  streamCode: string | null,
  existingLabel: string,
) {
  const parts = [`BAC ${year}`];

  if (subjectCode) {
    parts.push(subjectCode);
  }

  if (streamCode) {
    parts.push(streamCode);
  }

  const tail = existingLabel.split(' · ').slice(3).join(' · ').trim();

  if (tail) {
    parts.push(tail);
  }

  return parts.join(' · ');
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
