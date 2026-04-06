const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { load } = require('cheerio');
const { chromium } = require('playwright');
const { NestFactory } = require('@nestjs/core');
const {
  PrismaClient,
  SessionType,
  SourceDocumentKind,
} = require('@prisma/client');
const { AppModule } = require('../src/app.module');
const { PrismaService } = require('../src/prisma/prisma.service');
const {
  IngestionPaperSourceService,
} = require('../src/ingestion/ingestion-paper-source.service');
const {
  IngestionSourceIntakeService,
} = require('../src/ingestion/ingestion-source-intake.service');
const {
  IngestionSourceDocumentService,
} = require('../src/ingestion/ingestion-source-document.service');
const {
  IngestionProcessingEngineService,
} = require('../src/ingestion/ingestion-processing-engine.service');
const {
  R2StorageClient,
  readR2ConfigFromEnv,
} = require('../src/ingestion/r2-storage');
const {
  buildCanonicalDocumentFileName,
  buildCanonicalDocumentStorageKey,
  buildCanonicalPageStorageKey,
} = require('../src/ingestion/storage-naming');
const { createEmptyDraft } = require('../src/ingestion/ingestion.contract');
const {
  deriveEddirasaMetadata,
} = require('../src/ingestion/eddirasa-normalization');
const {
  deleteStorageKeysBestEffort,
} = require('../src/ingestion/storage-cleanup');

const execFileAsync = promisify(execFile);
const prismaClient = new PrismaClient();

const SESSION_TYPE = SessionType.NORMAL;
const PROVIDER = 'eddirasa';
const MIN_YEAR = 2008;
const TECHNICAL_STREAM_CODES = [
  'MT_CIVIL',
  'MT_ELEC',
  'MT_MECH',
  'MT_PROC',
];
const SECTION_STREAMS = [
  [/علوم تجريبية/, ['SE']],
  [/شعبة رياضيات/, ['M']],
  [/آداب.?وفلسفة/, ['LP']],
  [/تقني رياضي/, TECHNICAL_STREAM_CODES],
  [/تسيير.?واقتصاد/, ['GE']],
  [/لغات أجنبية/, ['LE']],
];
const TECH_SUBJECTS = new Set([
  'TECHNOLOGY_CIVIL',
  'TECHNOLOGY_ELECTRICAL',
  'TECHNOLOGY_MECHANICAL',
  'TECHNOLOGY_PROCESS',
]);
const STREAM_CODE_TO_FAMILY = {
  SE: 'se',
  M: 'm',
  GE: 'ge',
  LP: 'lp',
  LE: 'le',
  MT_CIVIL: 'mt-civil',
  MT_ELEC: 'mt-elec',
  MT_MECH: 'mt-mech',
  MT_PROC: 'mt-proc',
};
const STREAM_ORDER = new Map(
  ['SE', 'M', 'MT_CIVIL', 'MT_ELEC', 'MT_MECH', 'MT_PROC', 'GE', 'LP', 'LE']
    .map((code, index) => [code, index]),
);

let app;
let prisma;
let paperSourceService;
let sourceIntakeService;
let sourceDocumentService;
let processingEngine;
let storageClient;
const resolvedPageCache = new Map();
const downloadBufferCache = new Map();
let browserPromise = null;

async function main() {
  const options = parseArgs(process.argv.slice(2));

  app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  prisma = app.get(PrismaService, { strict: false });
  paperSourceService = app.get(IngestionPaperSourceService, { strict: false });
  sourceIntakeService = app.get(IngestionSourceIntakeService, {
    strict: false,
  });
  sourceDocumentService = app.get(IngestionSourceDocumentService, {
    strict: false,
  });
  processingEngine = app.get(IngestionProcessingEngineService, {
    strict: false,
  });
  storageClient = new R2StorageClient(readR2ConfigFromEnv());

  try {
    const expectedSources = await discoverExpectedSources(options);
    console.log(`expected sources: ${expectedSources.length}`);

    const existingSources = await prisma.paperSource.findMany({
      where: {
        year: options.year,
        sessionType: SESSION_TYPE,
      },
      include: {
        subject: {
          select: {
            code: true,
          },
        },
        streamMappings: {
          include: {
            stream: {
              select: {
                code: true,
              },
            },
          },
        },
        ingestionJobs: {
          select: {
            id: true,
            status: true,
          },
        },
        sourceDocuments: {
          orderBy: {
            kind: 'asc',
          },
          include: {
            pages: {
              orderBy: {
                pageNumber: 'asc',
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    const existingByPdfUrl = new Map();
    const existingByIdentity = new Map();

    for (const source of existingSources) {
      existingByIdentity.set(
        buildIdentityKey(source.subject.code, source.familyCode),
        source,
      );

      for (const document of source.sourceDocuments) {
        if (document.sourceUrl) {
          existingByPdfUrl.set(normalizeUrl(document.sourceUrl), source);
        }
      }
    }

    const matchedExistingIds = new Set();
    let reusedSources = 0;
    let importedSources = 0;
    let importedJobs = 0;

    for (const expected of expectedSources) {
      const identityKey = buildIdentityKey(
        expected.subjectCode,
        expected.familyCode,
      );
      const identityMatch = existingByIdentity.get(identityKey) ?? null;
      const examPdfMatch =
        existingByPdfUrl.get(normalizeUrl(expected.examPdfUrl)) ?? null;
      const correctionPdfMatch =
        existingByPdfUrl.get(normalizeUrl(expected.correctionPdfUrl)) ?? null;
      let existing = identityMatch ?? examPdfMatch ?? correctionPdfMatch ?? null;

      if (existing && matchedExistingIds.has(existing.id)) {
        if (identityMatch?.id === existing.id) {
          throw new Error(
            `Multiple expected sources matched the same existing source ${existing.subject.code}/${existing.familyCode}.`,
          );
        }

        existing = null;
      }

      if (existing && !matchedExistingIds.has(existing.id)) {
        matchedExistingIds.add(existing.id);
        await normalizeExistingSource(existing, expected, options);
        await refreshFailedSourceDocuments(existing, expected, options);
        await ensureExistingSourceJob(existing, expected, options);
        reusedSources += 1;
        console.log(
          `reused ${expected.subjectCode} ${expected.familyCode} (${expected.streamCodes.join(',')})`,
        );
        continue;
      }

      const jobId = await importMissingSource(expected, options);
      importedSources += 1;
      importedJobs += 1;
      console.log(
        `imported ${expected.subjectCode} ${expected.familyCode} (${expected.streamCodes.join(',')}) job=${jobId}`,
      );
    }

    const unmatchedExisting = existingSources.filter(
      (source) => !matchedExistingIds.has(source.id),
    );

    if (unmatchedExisting.length > 0) {
      throw new Error(
        `Unmatched existing ${options.year} sources remain: ${unmatchedExisting
          .map((source) => `${source.subject.code}/${source.familyCode}`)
          .join(', ')}`,
      );
    }

    const processingSummary = await processYearJobs(options);
    const finalSummary = await auditYear(options.year);
    console.log(
      JSON.stringify(
        {
          reusedSources,
          importedSources,
          importedJobs,
          processingSummary,
          finalSummary,
        },
        null,
        2,
      ),
    );
  } finally {
    if (browserPromise) {
      const browser = await browserPromise.catch(() => null);

      if (browser) {
        await browser.close().catch(() => null);
      }
    }
    await app.close();
    await prismaClient.$disconnect();
  }
}

async function discoverExpectedSources(options) {
  const cachedExpectedSources = await readExpectedSourcesCache(options);

  if (cachedExpectedSources) {
    return cachedExpectedSources;
  }

  const archiveHtml = await readArchiveHtml(options);
  const $ = load(archiveHtml);
  const grouped = new Map();

  $('table.wp-table-reloaded').each((_, table) => {
    const heading = normalizeText(
      $(table).prevAll('strong').first().text() ||
        $(table).prevAll('span').first().text(),
    );

    if (!heading) {
      return;
    }

    const sectionStreamCodes = readSectionStreamCodes(heading);

    if (!sectionStreamCodes) {
      return;
    }

    $(table)
      .find('tbody tr')
      .each((__, row) => {
        const cells = $(row).find('td');

        if (cells.length < 3) {
          return;
        }

        const subjectText = normalizeText($(cells[0]).text());
        const examAnchors = $(cells[1]).find('a').toArray();
        const correctionAnchors = $(cells[2]).find('a').toArray();
        const preferredExamLinks = examAnchors.filter((link) =>
          normalizeText($(link).text()).includes('الدورة الأولى'),
        );
        const preferredCorrectionLinks = correctionAnchors.filter((link) =>
          normalizeText($(link).text()).includes('الدورة الأولى'),
        );
        const examLinks =
          preferredExamLinks.length > 0 ? preferredExamLinks : examAnchors;
        const correctionLinks =
          preferredCorrectionLinks.length > 0
            ? preferredCorrectionLinks
            : correctionAnchors;
        const linkPairs = selectPreferredProgramLinkPairs(
          examLinks.map((examLink, index) => ({
            examLink,
            correctionLink: correctionLinks[index] ?? null,
          })),
          $,
        );

        linkPairs.forEach(({ examLink: link, correctionLink }) => {
          const examPageUrl = toAbsoluteUrl(
            $(link).attr('href'),
            options.listingUrl,
          );
          const correctionPageUrl = toAbsoluteUrl(
            $(correctionLink).attr('href'),
            options.listingUrl,
          );

          if (!examPageUrl || !correctionPageUrl) {
            throw new Error(
              `Missing exam/correction link in ${heading} row ${subjectText}`,
            );
          }

          const metadata = deriveEddirasaMetadata([
            examPageUrl,
            correctionPageUrl,
            subjectText,
            heading,
            normalizeText($(link).text()),
            normalizeText($(correctionLink).text()),
          ]);
          const subjectCode = metadata.subjectCode;

          if (!subjectCode) {
            throw new Error(
              `Unable to infer subject for ${heading} row ${subjectText} (${examPageUrl})`,
            );
          }

          const groupStreamCodes = TECH_SUBJECTS.has(subjectCode)
            ? [metadata.streamCode]
            : sectionStreamCodes;

          if (groupStreamCodes.some((code) => !code)) {
            throw new Error(
              `Unable to infer stream set for ${subjectCode} (${examPageUrl})`,
            );
          }

          const key = `${subjectCode}|${normalizeUrl(correctionPageUrl)}`;
          const current =
            grouped.get(key) ??
            {
              subjectCode,
              examPageUrls: new Set(),
              correctionPageUrls: new Set(),
              streamCodes: new Set(),
            };

          current.examPageUrls.add(examPageUrl);
          current.correctionPageUrls.add(correctionPageUrl);

          for (const streamCode of groupStreamCodes) {
            current.streamCodes.add(streamCode);
          }

          grouped.set(key, current);
        });
      });
  });

  const expectedSources = [];

  const groupedSources = Array.from(grouped.values());

  for (const [index, current] of groupedSources.entries()) {
    const streamCodes = normalizeStreamCodes(Array.from(current.streamCodes));
    const familyCode = buildFamilyCode(streamCodes);
    console.log(
      `resolving ${index + 1}/${groupedSources.length} ${current.subjectCode} ${familyCode}`,
    );
    console.log('  exam pages...');
    const resolvedExam = await resolveFirstPdfUrl(
      Array.from(current.examPageUrls),
    );
    console.log('  correction pages...');
    const resolvedCorrection = await resolveFirstPdfUrl(
      Array.from(current.correctionPageUrls),
    );
    console.log('  resolved');

    if (!resolvedExam || !resolvedCorrection) {
      throw new Error(
        `Missing PDF resolution for ${current.subjectCode} ${Array.from(
          current.examPageUrls,
        ).join(', ')}`,
      );
    }

    expectedSources.push({
      year: options.year,
      sessionType: SESSION_TYPE,
      subjectCode: current.subjectCode,
      streamCodes,
      familyCode,
      examPageUrl: resolvedExam.pageUrl,
      correctionPageUrl: resolvedCorrection.pageUrl,
      examPdfUrl: resolvedExam.pdfUrl,
      correctionPdfUrl: resolvedCorrection.pdfUrl,
    });
  }

  const sorted = expectedSources.sort(compareExpectedSources);
  await fs.writeFile(
    options.expectedSourcesCachePath,
    JSON.stringify(sorted, null, 2),
    'utf8',
  );
  return sorted;
}

function readSectionStreamCodes(heading) {
  for (const [pattern, streamCodes] of SECTION_STREAMS) {
    if (pattern.test(heading)) {
      return streamCodes;
    }
  }

  return null;
}

async function normalizeExistingSource(existingSource, expected, options) {
  const nextSlug = paperSourceService.buildSlug({
    subjectCode: expected.subjectCode,
    familyCode: expected.familyCode,
    year: options.year,
    sessionType: SESSION_TYPE,
  });
  const nextMetadata = {
    ...(asRecord(existingSource.metadata) ?? {}),
    normalizedFromArchiveAt: new Date().toISOString(),
    normalizedFromArchiveListingUrl: options.listingUrl,
    paperFamilyCode: expected.familyCode,
    sharedStreamCodes: expected.streamCodes.slice(1),
  };
  const obsoleteStorageKeys = [];

  for (const document of existingSource.sourceDocuments) {
    const nextFileName = buildCanonicalDocumentFileName(
      {
        year: options.year,
        streamCode: null,
        familyCode: expected.familyCode,
        subjectCode: expected.subjectCode,
        sessionType: SESSION_TYPE,
      },
      document.kind,
    );
    const nextStorageKey = buildCanonicalDocumentStorageKey(
      {
        year: options.year,
      },
      nextFileName,
    );

    if (document.storageKey !== nextStorageKey) {
      await storageClient.copyObject({
        sourceKey: document.storageKey,
        destinationKey: nextStorageKey,
      });
      obsoleteStorageKeys.push(document.storageKey);
    }

    for (const page of document.pages) {
      const nextPageKey = buildCanonicalPageStorageKey(
        {
          year: options.year,
        },
        nextFileName,
        page.pageNumber,
      );

      if (page.storageKey !== nextPageKey) {
        await storageClient.copyObject({
          sourceKey: page.storageKey,
          destinationKey: nextPageKey,
        });
        obsoleteStorageKeys.push(page.storageKey);
      }
    }

    const sourcePageUrl =
      document.kind === SourceDocumentKind.CORRECTION
        ? expected.correctionPageUrl
        : expected.examPageUrl;
    const sourceUrl =
      document.kind === SourceDocumentKind.CORRECTION
        ? expected.correctionPdfUrl
        : expected.examPdfUrl;
    const nextDocumentMetadata = {
      ...(asRecord(document.metadata) ?? {}),
      sourcePageUrl,
      originalSourceUrl: sourceUrl,
      standardizedFileName: nextFileName,
      normalizedFromArchiveAt: new Date().toISOString(),
    };

    await prisma.sourceDocument.update({
      where: {
        id: document.id,
      },
      data: {
        fileName: nextFileName,
        storageKey: nextStorageKey,
        sourceUrl,
        metadata: nextDocumentMetadata,
      },
    });

    for (const page of document.pages) {
      const nextPageKey = buildCanonicalPageStorageKey(
        {
          year: options.year,
        },
        nextFileName,
        page.pageNumber,
      );

      await prisma.sourcePage.update({
        where: {
          id: page.id,
        },
        data: {
          storageKey: nextPageKey,
        },
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.paperSource.update({
      where: {
        id: existingSource.id,
      },
      data: {
        slug: nextSlug,
        provider: PROVIDER,
        familyCode: expected.familyCode,
        sourceListingUrl: options.listingUrl,
        sourceExamPageUrl: expected.examPageUrl,
        sourceCorrectionPageUrl: expected.correctionPageUrl,
        metadata: nextMetadata,
      },
    });

    await tx.paperSourceStream.deleteMany({
      where: {
        paperSourceId: existingSource.id,
      },
    });

    const streamRecords = await tx.stream.findMany({
      where: {
        code: {
          in: expected.streamCodes,
        },
      },
      select: {
        id: true,
      },
    });

    await tx.paperSourceStream.createMany({
      data: streamRecords.map((stream) => ({
        paperSourceId: existingSource.id,
        streamId: stream.id,
      })),
    });
  });

  const { failedKeys } = await deleteStorageKeysBestEffort(
    storageClient,
    obsoleteStorageKeys,
  );

  if (failedKeys.length > 0) {
    throw new Error(
      `Failed to delete obsolete storage keys for ${expected.subjectCode}/${expected.familyCode}: ${failedKeys.join(', ')}`,
    );
  }
}

async function importMissingSource(expected, options) {
  const primaryStreamCode = expected.streamCodes[0] ?? null;
  const draft = createEmptyDraft({
    year: options.year,
    streamCode: primaryStreamCode,
    subjectCode: expected.subjectCode,
    sessionType: 'NORMAL',
    provider: PROVIDER,
    title: buildJobLabel(expected),
    minYear: MIN_YEAR,
    sourceListingUrl: options.listingUrl,
    sourceExamPageUrl: expected.examPageUrl,
    sourceCorrectionPageUrl: expected.correctionPageUrl,
    metadata: {
      slug: paperSourceService.buildSlug({
        subjectCode: expected.subjectCode,
        familyCode: expected.familyCode,
        year: options.year,
        sessionType: SESSION_TYPE,
      }),
      paperFamilyCode: expected.familyCode,
      sharedStreamCodes: expected.streamCodes.slice(1),
      examPdfUrl: expected.examPdfUrl,
      correctionPdfUrl: expected.correctionPdfUrl,
    },
  });
  const prepared = await sourceIntakeService.upsertExternalSourceJob({
    externalExamUrl: expected.examPdfUrl,
    replaceExisting: false,
    storageClient,
    draft,
    metadata: {
      slug: draft.exam.metadata.slug,
      examPdfUrl: expected.examPdfUrl,
      correctionPdfUrl: expected.correctionPdfUrl,
      paperFamilyCode: expected.familyCode,
      sharedStreamCodes: expected.streamCodes.slice(1),
    },
    job: {
      label: buildJobLabel(expected),
      provider: PROVIDER,
      sourceListingUrl: options.listingUrl,
      sourceExamPageUrl: expected.examPageUrl,
      sourceCorrectionPageUrl: expected.correctionPageUrl,
      year: options.year,
      streamCode: primaryStreamCode,
      subjectCode: expected.subjectCode,
      sessionType: SESSION_TYPE,
      minYear: MIN_YEAR,
    },
    documents: [
      await buildSourceDocumentInput(expected, SourceDocumentKind.EXAM, options),
      await buildSourceDocumentInput(
        expected,
        SourceDocumentKind.CORRECTION,
        options,
      ),
    ],
  });

  if (!prepared?.jobId) {
    throw new Error(
      `Source intake returned no job for ${expected.subjectCode}/${expected.familyCode}`,
    );
  }

  return prepared.jobId;
}

async function ensureExistingSourceJob(existingSource, expected, options) {
  if ((existingSource.ingestionJobs?.length ?? 0) > 0) {
    return null;
  }

  const documentKinds = new Set(
    (existingSource.sourceDocuments ?? []).map((document) => document.kind),
  );

  if (
    !documentKinds.has(SourceDocumentKind.EXAM) ||
    !documentKinds.has(SourceDocumentKind.CORRECTION)
  ) {
    return null;
  }

  const primaryStreamCode = expected.streamCodes[0] ?? null;
  const draft = createEmptyDraft({
    year: options.year,
    streamCode: primaryStreamCode,
    subjectCode: expected.subjectCode,
    sessionType: 'NORMAL',
    provider: PROVIDER,
    title: buildJobLabel(expected),
    minYear: MIN_YEAR,
    sourceListingUrl: options.listingUrl,
    sourceExamPageUrl: expected.examPageUrl,
    sourceCorrectionPageUrl: expected.correctionPageUrl,
    metadata: {
      slug: paperSourceService.buildSlug({
        subjectCode: expected.subjectCode,
        familyCode: expected.familyCode,
        year: options.year,
        sessionType: SESSION_TYPE,
      }),
      paperFamilyCode: expected.familyCode,
      sharedStreamCodes: expected.streamCodes.slice(1),
      examPdfUrl: expected.examPdfUrl,
      correctionPdfUrl: expected.correctionPdfUrl,
    },
  });

  const prepared = await sourceIntakeService.upsertExternalSourceJob({
    externalExamUrl: expected.examPdfUrl,
    replaceExisting: false,
    storageClient,
    draft,
    metadata: {
      slug: draft.exam.metadata.slug,
      examPdfUrl: expected.examPdfUrl,
      correctionPdfUrl: expected.correctionPdfUrl,
      paperFamilyCode: expected.familyCode,
      sharedStreamCodes: expected.streamCodes.slice(1),
      ensuredFromExistingSource: true,
    },
    job: {
      label: buildJobLabel(expected),
      provider: PROVIDER,
      sourceListingUrl: options.listingUrl,
      sourceExamPageUrl: expected.examPageUrl,
      sourceCorrectionPageUrl: expected.correctionPageUrl,
      year: options.year,
      streamCode: primaryStreamCode,
      subjectCode: expected.subjectCode,
      sessionType: SESSION_TYPE,
      minYear: MIN_YEAR,
    },
    documents: [],
  });

  return prepared?.jobId ?? null;
}

async function refreshFailedSourceDocuments(existingSource, expected, options) {
  const hasFailedJob = (existingSource.ingestionJobs ?? []).some(
    (job) => job.status === 'FAILED',
  );

  if (!hasFailedJob) {
    return;
  }

  const documentsByKind = new Map(
    (existingSource.sourceDocuments ?? []).map((document) => [
      document.kind,
      document,
    ]),
  );

  for (const kind of [
    SourceDocumentKind.EXAM,
    SourceDocumentKind.CORRECTION,
  ]) {
    const existingDocument = documentsByKind.get(kind) ?? null;
    const shouldRefresh =
      !existingDocument || (existingDocument.pages?.length ?? 0) === 0;

    if (!shouldRefresh) {
      continue;
    }

    const prepared = await buildSourceDocumentInput(expected, kind, options);

    if (existingDocument) {
      await sourceDocumentService.replaceSourceDocument({
        sourceDocument: existingDocument,
        document: prepared.document,
        storageClient,
      });
      continue;
    }

    await sourceDocumentService.storeSourceDocument({
      paperSourceId: existingSource.id,
      kind,
      document: prepared.document,
      storageClient,
    });
  }
}

async function processYearJobs(options) {
  const jobs = await prisma.ingestionJob.findMany({
    where: {
      paperSource: {
        year: options.year,
        sessionType: SESSION_TYPE,
        sourceDocuments: {
          some: {
            kind: SourceDocumentKind.EXAM,
          },
        },
        AND: [
          {
            sourceDocuments: {
              some: {
                kind: SourceDocumentKind.CORRECTION,
              },
            },
          },
        ],
      },
      OR: [
        {
          status: 'FAILED',
        },
        {
          status: 'DRAFT',
          paperSource: {
            year: options.year,
            sessionType: SESSION_TYPE,
            sourceDocuments: {
              some: {
                pages: {
                  none: {},
                },
              },
            },
          },
        },
      ],
    },
    orderBy: [{ createdAt: 'asc' }],
    select: {
      id: true,
      label: true,
    },
  });

  let processedJobs = 0;
  let failedJobs = 0;

  await mapWithConcurrency(jobs, options.jobConcurrency, async (job) => {
    try {
      await processingEngine.runStage({
        jobId: job.id,
        replaceExisting: true,
        skipExtraction: true,
        completionStatus: 'DRAFT',
      });
      processedJobs += 1;
      console.log(`processed ${job.label} job=${job.id}`);
    } catch (error) {
      failedJobs += 1;
      const message =
        error instanceof Error ? error.message : `${error ?? 'Unknown error'}`;
      console.error(`failed ${job.label} job=${job.id}: ${message}`);
    }
  });

  return {
    attemptedJobs: jobs.length,
    processedJobs,
    failedJobs,
  };
}

async function buildSourceDocumentInput(expected, kind, options) {
  const sourceUrl =
    kind === SourceDocumentKind.CORRECTION
      ? expected.correctionPdfUrl
      : expected.examPdfUrl;
  const sourcePageUrl =
    kind === SourceDocumentKind.CORRECTION
      ? expected.correctionPageUrl
      : expected.examPageUrl;
  const buffer = await downloadBuffer(sourceUrl, sourcePageUrl);
  const fileName = buildCanonicalDocumentFileName(
    {
      year: options.year,
      streamCode: null,
      familyCode: expected.familyCode,
      subjectCode: expected.subjectCode,
      sessionType: SESSION_TYPE,
    },
    kind,
  );
  const storageKey = buildCanonicalDocumentStorageKey(
    {
      year: options.year,
    },
    fileName,
  );

  return {
    kind,
    document: {
      buffer,
      fileName,
      storageKey,
      sourceUrl,
      mimeType: 'application/pdf',
      language: 'ar',
      metadata: {
        sourcePageUrl,
        originalSourceUrl: sourceUrl,
        uploadedAt: new Date().toISOString(),
        importedFromArchiveAt: new Date().toISOString(),
      },
      storageMetadata: {
        sourcePageUrl,
      },
    },
  };
}

async function resolvePdfUrlFromPage(pageUrl) {
  const candidatePageUrls = buildPageUrlCandidates(pageUrl);

  for (const candidatePageUrl of candidatePageUrls) {
    if (looksLikePdfUrl(candidatePageUrl)) {
      return normalizeUrl(candidatePageUrl);
    }
  }

  for (const candidatePageUrl of candidatePageUrls) {
    if (resolvedPageCache.has(candidatePageUrl)) {
      return resolvedPageCache.get(candidatePageUrl);
    }
  }

  let lastError = null;

  for (const candidatePageUrl of candidatePageUrls) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      let html = null;

      try {
        html = await curlText(candidatePageUrl);
      } catch {
        html = null;
      }

      try {
        if (html) {
          const unique = Array.from(
            new Set(
              collectPdfUrlsFromHtml(html, candidatePageUrl).map(normalizeUrl),
            ),
          );
          const direct =
            unique.find((url) => !/viewer\.html/i.test(url)) ?? null;

          if (direct) {
            for (const cacheKey of candidatePageUrls) {
              resolvedPageCache.set(cacheKey, direct);
            }
            return direct;
          }
        }

        const fallbackPdfUrl =
          (html
            ? await resolvePdfUrlFromWordPressApi(candidatePageUrl, html)
            : null) ??
          (await resolvePdfUrlFromWordPressApiBySlug(candidatePageUrl)) ??
          (await guessPdfUrlFromPageSlug(candidatePageUrl));

        if (fallbackPdfUrl) {
          for (const cacheKey of candidatePageUrls) {
            resolvedPageCache.set(cacheKey, fallbackPdfUrl);
          }
          return fallbackPdfUrl;
        }
      } catch (error) {
        lastError = error;
      }

      await sleep(attempt * 400);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`No PDF found on ${candidatePageUrls[0]}`);
}

function buildPageUrlCandidates(pageUrl) {
  const normalizedPageUrl = normalizeUrl(pageUrl);
  const variants = [];

  if (normalizedPageUrl.includes('phylosofi')) {
    variants.push(normalizedPageUrl.replace(/phylosofi/g, 'phylosofie'));
  }

  variants.push(normalizedPageUrl);

  return Array.from(new Set(variants));
}

function looksLikePdfUrl(value) {
  return /\.pdf(?:$|\?)/i.test(value);
}

async function resolveFirstPdfUrl(pageUrls) {
  let lastError = null;

  for (const pageUrl of pageUrls) {
    try {
      const pdfUrl = await resolvePdfUrlFromPage(pageUrl);
      return {
        pageUrl,
        pdfUrl,
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

async function readArchiveHtml(options) {
  try {
    return await fs.readFile(options.archiveHtmlCachePath, 'utf8');
  } catch {
    const archiveHtml = await curlText(options.listingUrl);
    await fs.writeFile(options.archiveHtmlCachePath, archiveHtml, 'utf8');
    return archiveHtml;
  }
}

async function readExpectedSourcesCache(options) {
  try {
    const raw = await fs.readFile(options.expectedSourcesCachePath, 'utf8');
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function decodeEmbeddedPdfUrl(url) {
  try {
    const parsed = new URL(url);
    const file = parsed.searchParams.get('file');

    if (!file) {
      return null;
    }

    return normalizeUrl(decodeURIComponent(file));
  } catch {
    return null;
  }
}

function collectPdfUrlsFromHtml(html, baseUrl) {
  const $ = load(html);
  const urls = [];
  const shortcodeMatches = html.matchAll(
    /\[gview\s+file=["']([^"']+\.pdf(?:\?[^"']*)?)["']\]/gi,
  );

  for (const match of shortcodeMatches) {
    const absolute = toAbsoluteUrl(match[1], baseUrl);

    if (absolute) {
      urls.push(normalizeUrl(absolute));
    }
  }

  $('a[href], iframe[src], embed[src], object[data]').each((_, element) => {
    const tagName = element.tagName.toLowerCase();
    const attribute =
      tagName === 'a' ? 'href' : tagName === 'object' ? 'data' : 'src';
    const rawValue = $(element).attr(attribute);

    if (!rawValue) {
      return;
    }

    const absolute = toAbsoluteUrl(rawValue, baseUrl);

    if (!absolute) {
      return;
    }

    const decoded = decodeEmbeddedPdfUrl(absolute);
    if (decoded) {
      urls.push(decoded);
    }

    const decodedAbsolute = decodeUrlBestEffort(absolute);

    if (
      /\.pdf($|\?)/i.test(decodedAbsolute) &&
      !/viewer\.html/i.test(decodedAbsolute)
    ) {
      urls.push(normalizeUrl(decodedAbsolute));
    }
  });

  return urls;
}

function decodeUrlBestEffort(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function resolvePdfUrlFromWordPressApi(pageUrl, html) {
  const apiMatch = html.match(/https:\/\/eddirasa\.com\/wp-json\/wp\/v2\/posts\/\d+/);

  if (!apiMatch) {
    return resolvePdfUrlFromWordPressApiBySlug(pageUrl);
  }

  const apiText = await curlText(apiMatch[0]).catch(() => null);

  if (!apiText) {
    return resolvePdfUrlFromWordPressApiBySlug(pageUrl);
  }

  let post;

  try {
    post = JSON.parse(apiText);
  } catch {
    return resolvePdfUrlFromWordPressApiBySlug(pageUrl);
  }

  const renderedHtml =
    typeof post?.content?.rendered === 'string' ? post.content.rendered : null;

  if (!renderedHtml) {
    return null;
  }

  const urls = collectPdfUrlsFromHtml(renderedHtml, pageUrl);
  return urls[0] ? normalizeUrl(urls[0]) : null;
}

async function resolvePdfUrlFromWordPressApiBySlug(pageUrl) {
  const slug = normalizeUrl(pageUrl)
    .replace(/\/+$/, '')
    .split('/')
    .pop();

  if (!slug) {
    return null;
  }

  const apiText = await curlText(
    `https://eddirasa.com/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}`,
  ).catch(() => null);

  if (!apiText) {
    return null;
  }

  let posts;

  try {
    posts = JSON.parse(apiText);
  } catch {
    return null;
  }

  if (!Array.isArray(posts) || posts.length === 0) {
    return null;
  }

  const renderedHtml =
    typeof posts[0]?.content?.rendered === 'string'
      ? posts[0].content.rendered
      : null;

  if (!renderedHtml) {
    return null;
  }

  const urls = collectPdfUrlsFromHtml(renderedHtml, pageUrl);
  return urls[0] ? normalizeUrl(urls[0]) : null;
}

async function guessPdfUrlFromPageSlug(pageUrl) {
  const slug = normalizeUrl(pageUrl)
    .replace(/\/+$/, '')
    .split('/')
    .pop();

  if (!slug) {
    return null;
  }

  const isCorrection = slug.startsWith('correction-');
  const months = isCorrection ? ['06', '05', '01', '07'] : ['01', '06', '05', '07'];
  const year = readYearFromSlug(pageUrl);

  for (const month of months) {
    const candidate = `https://eddirasa.com/wp-content/uploads/${year}/${month}/${slug}.pdf`;

    if (await urlExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function downloadBuffer(url, sourcePageUrl = null) {
  const normalizedUrl = normalizeUrl(url);
  const normalizedPageUrl = sourcePageUrl ? normalizeUrl(sourcePageUrl) : null;
  const cacheKey = `${normalizedUrl}|${normalizedPageUrl ?? ''}`;

  if (downloadBufferCache.has(cacheKey)) {
    return downloadBufferCache.get(cacheKey);
  }

  const promise = (async () => {
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const buffer = await curlBuffer(normalizedUrl);

        if (looksLikePdfBuffer(buffer)) {
          return buffer;
        }

        if (normalizedPageUrl) {
          const browserBuffer = await downloadBufferViaBrowser(
            normalizedPageUrl,
            normalizedUrl,
          );

          if (looksLikePdfBuffer(browserBuffer)) {
            return browserBuffer;
          }
        }

        throw new Error(`Downloaded non-PDF payload from ${normalizedUrl}`);
      } catch (error) {
        if (normalizedPageUrl) {
          try {
            const browserBuffer = await downloadBufferViaBrowser(
              normalizedPageUrl,
              normalizedUrl,
            );

            if (looksLikePdfBuffer(browserBuffer)) {
              return browserBuffer;
            }
          } catch (browserError) {
            lastError = browserError;
          }
        } else {
          lastError = error;
        }

        if (!lastError) {
          lastError = error;
        }
        await sleep(attempt * 500);
      }
    }

    throw lastError;
  })();

  downloadBufferCache.set(cacheKey, promise);

  try {
    return await promise;
  } catch (error) {
    downloadBufferCache.delete(cacheKey);
    throw error;
  }
}

async function downloadBufferViaBrowser(pageUrl, sourceUrl) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(pageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await page.waitForTimeout(1500);

    const payload = await page.evaluate(async ({ targetUrl }) => {
      const response = await fetch(targetUrl, {
        credentials: 'include',
      });
      const contentType = response.headers.get('content-type') ?? '';
      const arrayBuffer = await response.arrayBuffer();

      return {
        ok: response.ok,
        status: response.status,
        contentType,
        bytes: Array.from(new Uint8Array(arrayBuffer)),
      };
    }, {
      targetUrl: sourceUrl,
    });

    if (!payload?.ok) {
      throw new Error(
        `Browser fetch failed for ${sourceUrl} with status ${payload?.status ?? 'unknown'}`,
      );
    }

    return Buffer.from(payload.bytes ?? []);
  } finally {
    await page.close().catch(() => null);
  }
}

function looksLikePdfBuffer(buffer) {
  return buffer.subarray(0, 4).toString('utf8') === '%PDF';
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
    });
  }

  return browserPromise;
}

async function auditYear(year) {
  const [paperSources, documents, pages, jobs, incomplete, badDocumentKeys, badPageKeys] =
    await Promise.all([
      prisma.paperSource.count({
        where: {
          year,
          sessionType: SESSION_TYPE,
        },
      }),
      prisma.sourceDocument.count({
        where: {
          paperSource: {
            year,
            sessionType: SESSION_TYPE,
          },
        },
      }),
      prisma.sourcePage.count({
        where: {
          document: {
            paperSource: {
              year,
              sessionType: SESSION_TYPE,
            },
          },
        },
      }),
      prisma.ingestionJob.count({
        where: {
          paperSource: {
            year,
            sessionType: SESSION_TYPE,
          },
        },
      }),
      prisma.paperSource.count({
        where: {
          year,
          sessionType: SESSION_TYPE,
          OR: [
            {
              sourceDocuments: {
                none: {
                  kind: SourceDocumentKind.EXAM,
                },
              },
            },
            {
              sourceDocuments: {
                none: {
                  kind: SourceDocumentKind.CORRECTION,
                },
              },
            },
          ],
        },
      }),
      prisma.sourceDocument.count({
        where: {
          paperSource: {
            year,
            sessionType: SESSION_TYPE,
          },
          OR: [
            {
              fileName: {
                not: {
                  startsWith: 'bac-exam-',
                },
              },
              kind: SourceDocumentKind.EXAM,
            },
            {
              fileName: {
                not: {
                  startsWith: 'bac-correction-',
                },
              },
              kind: SourceDocumentKind.CORRECTION,
            },
          ],
        },
      }),
      prisma.sourcePage.count({
        where: {
          document: {
            paperSource: {
              year,
              sessionType: SESSION_TYPE,
            },
          },
          storageKey: {
            not: {
              startsWith: `bac/${year}/pages/`,
            },
          },
        },
      }),
    ]);

  return {
    paperSources,
    documents,
    pages,
    jobs,
    incomplete,
    badDocumentKeys,
    badPageKeys,
  };
}

function buildFamilyCode(streamCodes) {
  const sorted = normalizeStreamCodes(streamCodes);
  const key = sorted.join(',');
  const all = normalizeStreamCodes([
    'SE',
    'M',
    ...TECHNICAL_STREAM_CODES,
    'GE',
    'LP',
    'LE',
  ]).join(',');
  const seMTmGe = normalizeStreamCodes([
    'SE',
    'M',
    ...TECHNICAL_STREAM_CODES,
    'GE',
  ]).join(',');
  const seMTm = normalizeStreamCodes(['SE', 'M', ...TECHNICAL_STREAM_CODES]).join(',');
  const seM = normalizeStreamCodes(['SE', 'M']).join(',');
  const tmGe = normalizeStreamCodes([...TECHNICAL_STREAM_CODES, 'GE']).join(',');
  const tm = normalizeStreamCodes(TECHNICAL_STREAM_CODES).join(',');
  const mTm = normalizeStreamCodes(['M', ...TECHNICAL_STREAM_CODES]).join(',');
  const lpLe = normalizeStreamCodes(['LP', 'LE']).join(',');

  if (key === all) {
    return 'all';
  }

  if (key === seMTmGe) {
    return 'se-m-tm-ge';
  }

  if (key === seMTm) {
    return 'se-m-tm';
  }

  if (key === seM) {
    return 'se-m';
  }

  if (key === tmGe) {
    return 'tm-ge';
  }

  if (key === tm) {
    return 'tm';
  }

  if (key === mTm) {
    return 'm-tm';
  }

  if (key === lpLe) {
    return 'lp-le';
  }

  if (sorted.length === 1 && STREAM_CODE_TO_FAMILY[sorted[0]]) {
    return STREAM_CODE_TO_FAMILY[sorted[0]];
  }

  return sorted
    .map((streamCode) => STREAM_CODE_TO_FAMILY[streamCode] ?? streamCode.toLowerCase())
    .join('-');
}

function normalizeStreamCodes(streamCodes) {
  return Array.from(
    new Set(
      streamCodes
        .map((streamCode) => `${streamCode ?? ''}`.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).sort(
    (left, right) =>
      (STREAM_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (STREAM_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

function compareExpectedSources(left, right) {
  return (
    left.subjectCode.localeCompare(right.subjectCode) ||
    left.familyCode.localeCompare(right.familyCode)
  );
}

function buildJobLabel(expected) {
  return `BAC ${expected.year} ${expected.subjectCode} ${expected.familyCode}`;
}

function buildIdentityKey(subjectCode, familyCode) {
  return `${subjectCode}|${familyCode}`;
}

function readYearFromSlug(value) {
  const match = `${value}`.match(/20\d{2}/);
  return match ? match[0] : '2008';
}

function normalizeText(value) {
  return `${value ?? ''}`
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function selectPreferredProgramLinkPairs(linkPairs, $) {
  const explicitNewPairs = linkPairs.filter((pair) =>
    isExplicitNewProgramPair(pair, $),
  );

  if (explicitNewPairs.length > 0) {
    return explicitNewPairs;
  }

  const nonLegacyPairs = linkPairs.filter((pair) => !isLegacyProgramPair(pair, $));

  return nonLegacyPairs.length > 0 ? nonLegacyPairs : linkPairs;
}

function isExplicitNewProgramPair(pair, $) {
  return readProgramPairLabel(pair, $).includes('البرنامج الجديد');
}

function isLegacyProgramPair(pair, $) {
  const label = readProgramPairLabel(pair, $);

  return (
    label.includes('البرنامج القديم') ||
    /(^|[-_])anc(?:[-_]|$)/i.test(label) ||
    /(^|[-_])ancien(?:[-_]|$)/i.test(label)
  );
}

function readProgramPairLabel(pair, $) {
  return normalizeText(
    [
      $(pair.examLink).text(),
      $(pair.correctionLink).text(),
      $(pair.examLink).attr('href'),
      $(pair.correctionLink).attr('href'),
    ]
      .filter(Boolean)
      .join(' '),
  ).toLowerCase();
}

function normalizeUrl(value) {
  const trimmed = sanitizeUrlText(`${value ?? ''}`.trim());

  try {
    const parsed = new URL(trimmed);

    if (/(^|\.)eddirasa\.com$/i.test(parsed.hostname)) {
      parsed.protocol = 'https:';
      parsed.hostname = 'eddirasa.com';
    }

    parsed.hash = '';
    return parsed.toString();
  } catch {
    return trimmed.replace(/#.*$/, '');
  }
}

function sanitizeUrlText(value) {
  return value
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(
      /%(?:E2%80%(?:8E|8F|AA|AB|AC|AD|AE)|E2%81%(?:A6|A7|A8|A9))/gi,
      '',
    );
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function toAbsoluteUrl(value, baseUrl) {
  if (!value) {
    return null;
  }

  try {
    return normalizeUrl(new URL(value, baseUrl).toString());
  } catch {
    return null;
  }
}

async function curlText(url) {
  const { stdout } = await runCurlWithCookies(
    ['-L', '--max-time', '60', '-A', 'Mozilla/5.0', '-sS', normalizeUrl(url)],
    {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  return `${stdout}`;
}

async function curlBuffer(url) {
  const { stdout } = await runCurlWithCookies(
    ['-L', '--max-time', '120', '-A', 'Mozilla/5.0', '-sS', normalizeUrl(url)],
    {
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
}

async function urlExists(url) {
  const { stdout } = await runCurlWithCookies(
    [
      '-IL',
      '--max-redirs',
      '8',
      '--max-time',
      '20',
      '-A',
      'Mozilla/5.0',
      '-sS',
      '-o',
      '/dev/null',
      '-w',
      '%{http_code}',
      normalizeUrl(url),
    ],
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    },
  ).catch(() => ({ stdout: '' }));

  return `${stdout}`.trim() === '200';
}

async function runCurlWithCookies(args, options) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bac-curl-'));
  const cookieFile = path.join(tempDir, 'cookies.txt');
  const targetUrl = extractCurlTargetUrl(args);

  try {
    if (shouldPrimeEddirasaCookie(targetUrl)) {
      await primeEddirasaCookie(cookieFile, targetUrl);
    }

    return await execFileAsync(
      'curl',
      ['-c', cookieFile, '-b', cookieFile, ...args],
      options,
    );
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

async function primeEddirasaCookie(cookieFile, targetUrl) {
  await execFileAsync(
    'curl',
    [
      '-c',
      cookieFile,
      '-L',
      '--max-redirs',
      '8',
      '--max-time',
      '20',
      '-A',
      'Mozilla/5.0',
      '-sS',
      '-o',
      '/dev/null',
      normalizeUrl(targetUrl),
    ],
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    },
  ).catch(() => null);
}

function extractCurlTargetUrl(args) {
  for (let index = args.length - 1; index >= 0; index -= 1) {
    const value = `${args[index] ?? ''}`.trim();

    if (/^https?:\/\//i.test(value)) {
      return value;
    }
  }

  return null;
}

function shouldPrimeEddirasaCookie(targetUrl) {
  if (!targetUrl) {
    return false;
  }

  try {
    const parsed = new URL(targetUrl);

    return /(^|\.)eddirasa\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  if (items.length === 0) {
    return [];
  }

  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        if (currentIndex >= items.length) {
          return;
        }

        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseArgs(argv) {
  let year = null;
  let listingUrl = null;
  let jobConcurrency = 3;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--year' && argv[index + 1]) {
      year = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--listing-url' && argv[index + 1]) {
      listingUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--job-concurrency' && argv[index + 1]) {
      jobConcurrency = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }
  }

  if (!Number.isInteger(year) || year < 2008 || year > 2100) {
    throw new Error('--year must be an integer between 2008 and 2100.');
  }

  if (!Number.isInteger(jobConcurrency) || jobConcurrency < 1) {
    throw new Error('--job-concurrency must be a positive integer.');
  }

  const resolvedListingUrl =
    listingUrl ?? `https://eddirasa.com/bac-${year}/`;

  return {
    year,
    jobConcurrency,
    listingUrl: normalizeUrl(resolvedListingUrl),
    archiveHtmlCachePath: `/tmp/bac-${year}.html`,
    expectedSourcesCachePath: `/tmp/bac-${year}-expected-sources.json`,
  };
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
