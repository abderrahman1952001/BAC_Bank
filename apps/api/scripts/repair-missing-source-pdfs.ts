import { createHash } from 'crypto';
import {
  IngestionJobStatus,
  Prisma,
  PrismaClient,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import {
  createEmptyDraft,
  normalizeIngestionDraft,
} from '../src/ingestion/ingestion.contract';
import {
  buildCanonicalEddirasaDocumentFileName,
  buildEddirasaDocumentStorageKey,
  fileNameFromUrl,
  type EddirasaStorageContext,
} from '../src/ingestion/eddirasa-normalization';
import {
  resolveAlternatePdfSource,
} from '../src/ingestion/alternate-pdf-sources';
import {
  fetchBufferWithRetry,
  mapWithConcurrency,
} from '../src/ingestion/intake-runtime';
import { splitCombinedPdf } from '../src/ingestion/pdf-split';
import {
  R2StorageClient,
  readR2ConfigFromEnv,
} from '../src/ingestion/r2-storage';

const prisma = new PrismaClient();
const storageClient = new R2StorageClient(readR2ConfigFromEnv());
const DEFAULT_MIN_YEAR = 2012;
const DEFAULT_MAX_YEAR = 2025;
const DEFAULT_CONCURRENCY = 2;

type CliOptions = {
  minYear: number;
  maxYear: number;
  concurrency: number;
  limit: number | null;
};

type JobRecord = {
  id: string;
  label: string;
  year: number;
  provider: string;
  streamCode: string | null;
  subjectCode: string | null;
  sessionType: SessionType | null;
  status: IngestionJobStatus;
  minYear: number | null;
  sourceListingUrl: string | null;
  sourceExamPageUrl: string | null;
  sourceCorrectionPageUrl: string | null;
  draftJson: Prisma.JsonValue;
  metadata: Prisma.JsonValue | null;
  sourceDocuments: Array<{
    id: string;
    kind: SourceDocumentKind;
  }>;
};

type ResolvedSource = {
  sourceUrl: string;
  provider: string;
  buffer: Buffer;
  pageCount: number | null;
  splitPageRange: {
    start: number;
    end: number;
  } | null;
  splitSourceUrl: string | null;
};

const directBufferCache = new Map<string, Promise<Buffer>>();
const splitCache = new Map<
  string,
  Promise<{
    examBuffer: Buffer;
    correctionBuffer: Buffer;
    examPageRange: { start: number; end: number };
    correctionPageRange: { start: number; end: number };
  }>
>();

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const jobs = await prisma.ingestionJob.findMany({
    where: {
      provider: 'eddirasa',
      year: {
        gte: options.minYear,
        lte: options.maxYear,
      },
    },
    orderBy: [{ year: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      label: true,
      year: true,
      provider: true,
      streamCode: true,
      subjectCode: true,
      sessionType: true,
      status: true,
      minYear: true,
      sourceListingUrl: true,
      sourceExamPageUrl: true,
      sourceCorrectionPageUrl: true,
      draftJson: true,
      metadata: true,
      sourceDocuments: {
        orderBy: {
          kind: 'asc',
        },
        select: {
          id: true,
          kind: true,
        },
      },
    },
  });

  const candidates = jobs.filter(needsRepair).slice(
    0,
    options.limit ?? jobs.length,
  );

  let repairedJobs = 0;
  let repairedDocuments = 0;
  let skippedJobs = 0;
  let failedJobs = 0;

  await mapWithConcurrency(candidates, options.concurrency, async (job) => {
    try {
      const repaired = await repairJob(job);
      if (repaired.documents === 0) {
        skippedJobs += 1;
        return;
      }

      repairedJobs += 1;
      repairedDocuments += repaired.documents;
      console.log(
        `repaired ${job.year} job=${job.id} documents=${repaired.documents}`,
      );
    } catch (error) {
      failedJobs += 1;
      console.error(
        `failed ${job.year} ${job.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });

  console.log(
    `done repairedJobs=${repairedJobs} repairedDocuments=${repairedDocuments} skippedJobs=${skippedJobs} failedJobs=${failedJobs} minYear=${options.minYear} maxYear=${options.maxYear}`,
  );
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    minYear: DEFAULT_MIN_YEAR,
    maxYear: DEFAULT_MAX_YEAR,
    concurrency: DEFAULT_CONCURRENCY,
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--min-year' && argv[index + 1]) {
      options.minYear = parsePositiveInteger(argv[index + 1], '--min-year');
      index += 1;
      continue;
    }

    if (arg === '--max-year' && argv[index + 1]) {
      options.maxYear = parsePositiveInteger(argv[index + 1], '--max-year');
      index += 1;
      continue;
    }

    if (arg === '--concurrency' && argv[index + 1]) {
      options.concurrency = parsePositiveInteger(argv[index + 1], '--concurrency');
      index += 1;
      continue;
    }

    if (arg === '--limit' && argv[index + 1]) {
      options.limit = parsePositiveInteger(argv[index + 1], '--limit');
      index += 1;
      continue;
    }
  }

  if (options.maxYear < options.minYear) {
    throw new Error('--max-year must be greater than or equal to --min-year.');
  }

  return options;
}

function parsePositiveInteger(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function needsRepair(job: JobRecord) {
  const metadata = asRecord(job.metadata);
  const examPdfUrl = readOptionalString(metadata?.examPdfUrl);
  const correctionPdfUrl = readOptionalString(metadata?.correctionPdfUrl);
  const kinds = new Set(job.sourceDocuments.map((document) => document.kind));

  if (examPdfUrl && !kinds.has(SourceDocumentKind.EXAM)) {
    return true;
  }

  if (correctionPdfUrl && !kinds.has(SourceDocumentKind.CORRECTION)) {
    return true;
  }

  return false;
}

async function repairJob(job: JobRecord) {
  const metadata = asRecord(job.metadata);
  const slug = readOptionalString(metadata?.slug);
  const examPdfUrl = normalizeSourceUrl(readOptionalString(metadata?.examPdfUrl));
  const correctionPdfUrl = normalizeSourceUrl(
    readOptionalString(metadata?.correctionPdfUrl),
  );
  const draft = normalizeDraft(job);
  const context: EddirasaStorageContext = {
    year: job.year,
    streamCode: job.streamCode,
    subjectCode: job.subjectCode,
    sessionType: job.sessionType ?? SessionType.NORMAL,
    slug,
  };
  const existingByKind = new Map(
    job.sourceDocuments.map((document) => [document.kind, document]),
  );
  let repairedDocuments = 0;

  if (examPdfUrl && !existingByKind.has(SourceDocumentKind.EXAM)) {
    await upsertDocument({
      job,
      draft,
      context,
      slug,
      documentKind: SourceDocumentKind.EXAM,
      requestedUrl: examPdfUrl,
      sourcePageUrl: job.sourceExamPageUrl,
    });
    repairedDocuments += 1;
  }

  if (correctionPdfUrl && !existingByKind.has(SourceDocumentKind.CORRECTION)) {
    await upsertDocument({
      job,
      draft,
      context,
      slug,
      documentKind: SourceDocumentKind.CORRECTION,
      requestedUrl: correctionPdfUrl,
      sourcePageUrl: job.sourceCorrectionPageUrl ?? job.sourceExamPageUrl,
    });
    repairedDocuments += 1;
  }

  if (repairedDocuments === 0) {
    return {
      documents: 0,
    };
  }

  draft.exam.metadata = {
    ...draft.exam.metadata,
    sourcePdfRepairAt: new Date().toISOString(),
  };

  await prisma.ingestionJob.update({
    where: {
      id: job.id,
    },
    data: {
      status: IngestionJobStatus.DRAFT,
      errorMessage: null,
      draftJson: toJsonValue(draft),
    },
  });

  return {
    documents: repairedDocuments,
  };
}

async function upsertDocument(input: {
  job: JobRecord;
  draft: ReturnType<typeof createEmptyDraft>;
  context: EddirasaStorageContext;
  slug: string | null;
  documentKind: SourceDocumentKind;
  requestedUrl: string;
  sourcePageUrl: string | null;
}) {
  const source = await resolveDocumentSource({
    slug: input.slug,
    requestedUrl: input.requestedUrl,
    documentKind: input.documentKind,
  });
  const fileName = buildCanonicalEddirasaDocumentFileName(
    input.context,
    input.documentKind,
  );
  const storageKey = buildEddirasaDocumentStorageKey(input.context, fileName);
  const sourceFileName =
    fileNameFromUrl(input.requestedUrl) ??
    fileNameFromUrl(source.sourceUrl) ??
    'document.pdf';
  const sha256 = createHash('sha256').update(source.buffer).digest('hex');

  await storageClient.putObject({
    key: storageKey,
    body: source.buffer,
    contentType: 'application/pdf',
    metadata: {
      sourcePageUrl: input.sourcePageUrl ?? '',
    },
  });

  const existing = await prisma.sourceDocument.findFirst({
    where: {
      jobId: input.job.id,
      kind: input.documentKind,
    },
    select: {
      id: true,
    },
  });

  const data = {
    jobId: input.job.id,
    kind: input.documentKind,
    storageKey,
    fileName,
    mimeType: 'application/pdf',
    pageCount: source.pageCount,
    sha256,
    sourceUrl: source.sourceUrl,
    language: 'ar',
    metadata: {
      sourcePageUrl: input.sourcePageUrl,
      originalSourceUrl: input.requestedUrl,
      originalSourceFileName: sourceFileName,
      alternateSourceProvider: source.provider,
      splitPageRangeStart: source.splitPageRange?.start ?? null,
      splitPageRangeEnd: source.splitPageRange?.end ?? null,
      alternateCombinedPdfUrl: source.splitSourceUrl,
      uploadedAt: new Date().toISOString(),
      repairSourcePdf: true,
    },
  } satisfies Prisma.SourceDocumentUncheckedCreateInput;

  const document = existing
    ? await prisma.sourceDocument.update({
        where: {
          id: existing.id,
        },
        data,
        select: {
          id: true,
          storageKey: true,
        },
      })
    : await prisma.sourceDocument.create({
        data,
        select: {
          id: true,
          storageKey: true,
        },
      });

  applyDocumentToDraft(
    input.draft,
    input.documentKind,
    document.id,
    document.storageKey,
  );
}

async function resolveDocumentSource(input: {
  slug: string | null;
  requestedUrl: string;
  documentKind: SourceDocumentKind;
}): Promise<ResolvedSource> {
  try {
    return {
      sourceUrl: input.requestedUrl,
      provider: 'eddirasa',
      buffer: await fetchBuffer(input.requestedUrl),
      pageCount: null,
      splitPageRange: null,
      splitSourceUrl: null,
    };
  } catch (error) {
    const fallback = resolveAlternatePdfSource(input.slug);

    if (!fallback) {
      throw error;
    }

    if (fallback.split) {
      const split = await getSplitPdf(fallback.url, fallback.split.subjectPageCount);

      return input.documentKind === SourceDocumentKind.CORRECTION
        ? {
            sourceUrl: fallback.url,
            provider: fallback.provider,
            buffer: split.correctionBuffer,
            pageCount:
              split.correctionPageRange.end - split.correctionPageRange.start + 1,
            splitPageRange: split.correctionPageRange,
            splitSourceUrl: fallback.url,
          }
        : {
            sourceUrl: fallback.url,
            provider: fallback.provider,
            buffer: split.examBuffer,
            pageCount: split.examPageRange.end - split.examPageRange.start + 1,
            splitPageRange: split.examPageRange,
            splitSourceUrl: fallback.url,
          };
    }

    return {
      sourceUrl: fallback.url,
      provider: fallback.provider,
      buffer: await fetchBuffer(fallback.url),
      pageCount: null,
      splitPageRange: null,
      splitSourceUrl: null,
    };
  }
}

function normalizeDraft(job: JobRecord) {
  try {
    return normalizeIngestionDraft(job.draftJson);
  } catch {
    return createEmptyDraft({
      year: job.year,
      streamCode: job.streamCode,
      subjectCode: job.subjectCode,
      sessionType: job.sessionType === SessionType.MAKEUP ? 'MAKEUP' : 'NORMAL',
      provider: job.provider,
      title: job.label,
      minYear: job.minYear ?? job.year,
      sourceListingUrl: job.sourceListingUrl,
      sourceExamPageUrl: job.sourceExamPageUrl,
      sourceCorrectionPageUrl: job.sourceCorrectionPageUrl,
      metadata: asRecord(job.metadata) ?? {},
    });
  }
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

async function fetchBuffer(url: string) {
  if (!directBufferCache.has(url)) {
    directBufferCache.set(
      url,
      fetchBufferWithRetry(url, {
        userAgent: 'BAC Bank repair bot/1.0',
      }).catch((error) => {
        directBufferCache.delete(url);
        throw error;
      }),
    );
  }

  return directBufferCache.get(url)!;
}

async function getSplitPdf(url: string, subjectPageCount: number) {
  const cacheKey = `${url}::${subjectPageCount}`;

  if (!splitCache.has(cacheKey)) {
    splitCache.set(
      cacheKey,
      (async () => {
        const buffer = await fetchBuffer(url);
        return splitCombinedPdf(buffer, subjectPageCount);
      })().catch((error) => {
        splitCache.delete(cacheKey);
        throw error;
      }),
    );
  }

  return splitCache.get(cacheKey)!;
}

function asRecord(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeSourceUrl(value: string | null) {
  if (!value) {
    return null;
  }

  if (/^hhttps?:\/\//i.test(value)) {
    return value.replace(/^h(http|https):\/\//i, '$1://');
  }

  return value;
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
