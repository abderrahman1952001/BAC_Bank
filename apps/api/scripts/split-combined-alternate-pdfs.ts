import { createHash } from 'crypto';
import {
  Prisma,
  PrismaClient,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import { normalizeIngestionDraft } from '../src/ingestion/ingestion.contract';
import {
  buildCanonicalEddirasaDocumentFileName,
  buildEddirasaDocumentStorageKey,
  fileNameFromUrl,
  type EddirasaStorageContext,
} from '../src/ingestion/eddirasa-normalization';
import { resolveAlternatePdfSource } from '../src/ingestion/alternate-pdf-sources';
import { splitCombinedPdf } from '../src/ingestion/pdf-split';
import { R2StorageClient, readR2ConfigFromEnv } from '../src/ingestion/r2-storage';

const prisma = new PrismaClient();
const storageClient = new R2StorageClient(readR2ConfigFromEnv());

async function main() {
  const jobs = await prisma.ingestionJob.findMany({
    select: {
      id: true,
      year: true,
      streamCode: true,
      subjectCode: true,
      sessionType: true,
      sourceExamPageUrl: true,
      sourceCorrectionPageUrl: true,
      metadata: true,
      draftJson: true,
      sourceDocuments: {
        select: {
          id: true,
          kind: true,
          pageCount: true,
          storageKey: true,
          sourceUrl: true,
          metadata: true,
        },
      },
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const job of jobs) {
    const jobMetadata = asRecord(job.metadata);
    const slug = typeof jobMetadata?.slug === 'string' ? jobMetadata.slug : null;
    const alternate = resolveAlternatePdfSource(slug);

    if (!alternate?.split) {
      skipped += 1;
      continue;
    }

    const examDocument = job.sourceDocuments.find(
      (document) => document.kind === SourceDocumentKind.EXAM,
    );
    const correctionDocument = job.sourceDocuments.find(
      (document) => document.kind === SourceDocumentKind.CORRECTION,
    );

    if (!examDocument || !correctionDocument) {
      skipped += 1;
      continue;
    }

    await prisma.sourcePage.deleteMany({
      where: {
        documentId: {
          in: [examDocument.id, correctionDocument.id],
        },
      },
    });

    const split = await splitCombinedPdf(
      await storageClient.getObjectBuffer(examDocument.storageKey),
      alternate.split.subjectPageCount,
    );
    const context: EddirasaStorageContext = {
      year: job.year,
      streamCode: job.streamCode,
      subjectCode: job.subjectCode,
      sessionType: job.sessionType ?? SessionType.NORMAL,
      slug,
    };

    const nextExam = await updateDocument({
      document: examDocument,
      documentKind: SourceDocumentKind.EXAM,
      buffer: split.examBuffer,
      pageCount: split.examPageRange.end - split.examPageRange.start + 1,
      pageRange: split.examPageRange,
      context,
      sourcePageUrl: job.sourceExamPageUrl ?? job.sourceCorrectionPageUrl,
      fallbackSourceUrl: alternate.url,
    });
    const nextCorrection = await updateDocument({
      document: correctionDocument,
      documentKind: SourceDocumentKind.CORRECTION,
      buffer: split.correctionBuffer,
      pageCount:
        split.correctionPageRange.end - split.correctionPageRange.start + 1,
      pageRange: split.correctionPageRange,
      context,
      sourcePageUrl: job.sourceCorrectionPageUrl ?? job.sourceExamPageUrl,
      fallbackSourceUrl: alternate.url,
    });

    const draft = normalizeIngestionDraft(job.draftJson);
    draft.exam.metadata = sanitizeDraftMetadata(draft.exam.metadata);
    draft.exam.examDocumentStorageKey = nextExam.storageKey;
    draft.exam.correctionDocumentStorageKey = nextCorrection.storageKey;

    await prisma.ingestionJob.update({
      where: {
        id: job.id,
      },
      data: {
        draftJson: toJsonValue(draft),
      },
    });

    updated += 1;
    console.log(`split ${job.id} ${slug}`);
  }

  console.log(`done updated=${updated} skipped=${skipped}`);
}

async function updateDocument(input: {
  document: {
    id: string;
    storageKey: string;
    sourceUrl: string | null;
    metadata: Prisma.JsonValue | null;
  };
  documentKind: SourceDocumentKind;
  buffer: Buffer;
  pageCount: number;
  pageRange: {
    start: number;
    end: number;
  };
  context: EddirasaStorageContext;
  sourcePageUrl: string | null;
  fallbackSourceUrl: string;
}) {
  const existingMetadata = asRecord(input.document.metadata);
  const originalSourceUrl =
    typeof existingMetadata?.originalSourceUrl === 'string'
      ? existingMetadata.originalSourceUrl
      : input.document.sourceUrl;
  const sourceFileName =
    fileNameFromUrl(originalSourceUrl) ??
    fileNameFromUrl(input.fallbackSourceUrl) ??
    `${input.document.id}.pdf`;
  const fileName = buildCanonicalEddirasaDocumentFileName(
    input.context,
    input.documentKind,
  );
  const storageKey = buildEddirasaDocumentStorageKey(input.context, fileName);

  await storageClient.putObject({
    key: storageKey,
    body: input.buffer,
    contentType: 'application/pdf',
    metadata: {
      sourcePageUrl: input.sourcePageUrl ?? '',
    },
  });

  await prisma.sourceDocument.update({
    where: {
      id: input.document.id,
    },
    data: {
      storageKey,
      fileName,
      mimeType: 'application/pdf',
      pageCount: input.pageCount,
      sha256: hashBuffer(input.buffer),
      sourceUrl: input.fallbackSourceUrl,
      language: 'ar',
      metadata: {
        sourcePageUrl: input.sourcePageUrl,
        originalSourceUrl,
        originalSourceFileName: sourceFileName,
        alternateSourceProvider: 'dzexams',
        splitPageRangeStart: input.pageRange.start,
        splitPageRangeEnd: input.pageRange.end,
        alternateCombinedPdfUrl: input.fallbackSourceUrl,
        uploadedAt: new Date().toISOString(),
      },
    },
  });

  return {
    fileName,
    storageKey,
  };
}

function asRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function sanitizeDraftMetadata(value: Record<string, unknown>) {
  const next = {
    ...value,
  };

  delete next.alternateCombinedPdfUrl;
  delete next.alternateCombinedPdfProvider;
  delete next.alternateCombinedPdfBackfill;

  return next;
}

function hashBuffer(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
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
