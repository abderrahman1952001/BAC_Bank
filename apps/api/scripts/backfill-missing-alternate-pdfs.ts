import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  IngestionJobStatus,
  Prisma,
  PrismaClient,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import {
  normalizeIngestionDraft,
} from '../src/ingestion/ingestion.contract';
import {
  buildCanonicalEddirasaDocumentFileName,
  buildEddirasaDocumentStorageKey,
  type EddirasaStorageContext,
} from '../src/ingestion/eddirasa-normalization';
import { R2StorageClient, readR2ConfigFromEnv } from '../src/ingestion/r2-storage';

const prisma = new PrismaClient();
const storageClient = new R2StorageClient(readR2ConfigFromEnv());
const execFileAsync = promisify(execFile);

const ALTERNATE_PDF_SOURCES: Record<
  string,
  {
    provider: string;
    combinedSource: boolean;
    url: string;
  }
> = {
  'eddirasa-bac-li-his-geo-2008': {
    provider: 'dzexams',
    combinedSource: true,
    url: 'https://www.dzexams.com/uploads/sujets/officiels/bac/2008/dzexams-bac-histoire-geographie-765828.pdf',
  },
  'eddirasa-bac-ge-his-geo-2008': {
    provider: 'dzexams',
    combinedSource: true,
    url: 'https://www.dzexams.com/uploads/sujets/officiels/bac/2008/dzexams-bac-histoire-geographie-816449.pdf',
  },
  'eddirasa-bac-ge-his-geo-2009': {
    provider: 'dzexams',
    combinedSource: true,
    url: 'https://www.dzexams.com/uploads/sujets/officiels/bac/2009/dzexams-bac-histoire-geographie-2309637.pdf',
  },
  'eddirasa-com-bac-tech-genie-civil-2011': {
    provider: 'dzexams',
    combinedSource: true,
    url: 'https://www.dzexams.com/uploads/sujets/officiels/bac/2011/dzexams-bac-genie-civil-2354913.pdf',
  },
};

async function main() {
  const failedJobs = await prisma.ingestionJob.findMany({
    where: {
      status: IngestionJobStatus.FAILED,
    },
    select: {
      id: true,
      label: true,
      year: true,
      streamCode: true,
      subjectCode: true,
      sessionType: true,
      sourceExamPageUrl: true,
      sourceCorrectionPageUrl: true,
      draftJson: true,
      metadata: true,
      sourceDocuments: {
        select: {
          id: true,
          kind: true,
        },
      },
    },
  });

  let backfilled = 0;
  let skipped = 0;

  for (const job of failedJobs) {
    const metadata = asRecord(job.metadata);
    const slug = typeof metadata?.slug === 'string' ? metadata.slug : null;
    const alternate = slug ? ALTERNATE_PDF_SOURCES[slug] : null;

    if (!alternate) {
      skipped += 1;
      console.log(`skip ${job.id} no alternate source`);
      continue;
    }

    const fileBuffer = await downloadBuffer(alternate.url);
    const sha256 = createHash('sha256').update(fileBuffer).digest('hex');
    const existingByKind = new Map(
      job.sourceDocuments.map((document) => [document.kind, document]),
    );
    const context: EddirasaStorageContext = {
      year: job.year,
      streamCode: job.streamCode,
      subjectCode: job.subjectCode,
      sessionType: job.sessionType ?? SessionType.NORMAL,
      slug,
    };

    for (const kind of [
      SourceDocumentKind.EXAM,
      SourceDocumentKind.CORRECTION,
    ] as const) {
      const fileName = buildCanonicalEddirasaDocumentFileName(context, kind);
      const storageKey = buildEddirasaDocumentStorageKey(context, fileName);

      await storageClient.putObject({
        key: storageKey,
        body: fileBuffer,
        contentType: 'application/pdf',
        metadata: {
          sourcePageUrl:
            (kind === SourceDocumentKind.CORRECTION
              ? job.sourceCorrectionPageUrl
              : job.sourceExamPageUrl) ??
            job.sourceExamPageUrl ??
            '',
        },
      });

      const documentData = {
        jobId: job.id,
        kind,
        storageKey,
        fileName,
        mimeType: 'application/pdf',
        pageCount: null,
        sha256,
        sourceUrl: alternate.url,
        language: 'ar',
        metadata: {
          sourcePageUrl:
            (kind === SourceDocumentKind.CORRECTION
              ? job.sourceCorrectionPageUrl
              : job.sourceExamPageUrl) ?? job.sourceExamPageUrl,
          originalSourceUrl:
            kind === SourceDocumentKind.CORRECTION
              ? metadata?.correctionPdfUrl ?? null
              : metadata?.examPdfUrl ?? null,
          alternateSourceProvider: alternate.provider,
          combinedSource: alternate.combinedSource,
          uploadedAt: new Date().toISOString(),
        },
      } satisfies Prisma.SourceDocumentUncheckedCreateInput;

      const existing = existingByKind.get(kind);

      if (existing) {
        await prisma.sourceDocument.update({
          where: {
            id: existing.id,
          },
          data: documentData,
        });
      } else {
        const created = await prisma.sourceDocument.create({
          data: documentData,
          select: {
            id: true,
            kind: true,
          },
        });
        existingByKind.set(created.kind, created);
      }
    }

    const documents = await prisma.sourceDocument.findMany({
      where: {
        jobId: job.id,
      },
      select: {
        id: true,
        kind: true,
        storageKey: true,
      },
    });

    const draft = normalizeIngestionDraft(job.draftJson);
    const examDocument = documents.find(
      (document) => document.kind === SourceDocumentKind.EXAM,
    );
    const correctionDocument = documents.find(
      (document) => document.kind === SourceDocumentKind.CORRECTION,
    );

    draft.exam.examDocumentId = examDocument?.id ?? null;
    draft.exam.examDocumentStorageKey = examDocument?.storageKey ?? null;
    draft.exam.correctionDocumentId = correctionDocument?.id ?? null;
    draft.exam.correctionDocumentStorageKey = correctionDocument?.storageKey ?? null;
    draft.exam.metadata = {
      ...draft.exam.metadata,
      alternateCombinedPdfUrl: alternate.url,
      alternateCombinedPdfProvider: alternate.provider,
      alternateCombinedPdfBackfill: true,
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

    backfilled += 1;
    console.log(`backfilled ${job.id} ${slug ?? 'unknown-slug'}`);
  }

  console.log(`done backfilled=${backfilled} skipped=${skipped}`);
}

function asRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, string | null>;
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function downloadBuffer(url: string) {
  const { stdout } = await execFileAsync(
    'curl',
    ['-L', '--fail', '--silent', '--show-error', url],
    {
      encoding: 'buffer',
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  return stdout as Buffer;
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
