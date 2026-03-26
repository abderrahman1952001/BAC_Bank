import {
  IngestionJobStatus,
  PrismaClient,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import {
  deriveEddirasaMetadata,
  parseEddirasaSlug,
} from '../src/ingestion/eddirasa-normalization';

const prisma = new PrismaClient();
const DEFAULT_MIN_YEAR = 2008;
const DEFAULT_MAX_YEAR = new Date().getFullYear();
const SAMPLE_SIZE = 25;
const TECHNICAL_STREAM_CODES = new Set([
  'MT_MECH',
  'MT_ELEC',
  'MT_CIVIL',
  'MT_PROC',
]);

type CliOptions = {
  minYear: number;
  maxYear: number;
};

type NormalizedJobCoverage = {
  id: string;
  year: number;
  label: string;
  sessionType: SessionType;
  status: IngestionJobStatus;
  storedStreamCode: string | null;
  storedSubjectCode: string | null;
  derivedStreamCode: string | null;
  derivedSubjectCode: string | null;
  normalizedStreamCode: string | null;
  normalizedSubjectCode: string | null;
  resolution:
    | 'exact_stored'
    | 'exact_derived_technical'
    | 'subject_pool'
    | 'ambiguous';
  exactKey: string | null;
  subjectPoolKey: string | null;
  hasExamDocument: boolean;
  notes: string[];
};

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const [subjectCodes, streamCodes, streamSubjects, jobs, canonicalCounts] =
    await Promise.all([
      prisma.subject.findMany({
        select: {
          code: true,
        },
      }),
      prisma.stream.findMany({
        select: {
          code: true,
        },
      }),
      prisma.streamSubject.findMany({
        select: {
          validFromYear: true,
          validToYear: true,
          isOptional: true,
          stream: {
            select: {
              code: true,
            },
          },
          subject: {
            select: {
              code: true,
            },
          },
        },
      }),
      prisma.ingestionJob.findMany({
        where: {
          year: {
            gte: options.minYear,
            lte: options.maxYear,
          },
        },
        select: {
          id: true,
          year: true,
          label: true,
          status: true,
          streamCode: true,
          subjectCode: true,
          sessionType: true,
          metadata: true,
          sourceDocuments: {
            select: {
              kind: true,
            },
          },
        },
        orderBy: [{ year: 'asc' }, { createdAt: 'asc' }],
      }),
      loadCanonicalCounts(),
    ]);

  const subjectCodeSet = new Set(subjectCodes.map((subject) => subject.code));
  const streamCodeSet = new Set(streamCodes.map((stream) => stream.code));
  const normalizedJobs = jobs.map((job) =>
    normalizeJobCoverage(job, subjectCodeSet, streamCodeSet),
  );

  const expectedOfferings = buildExpectedOfferings(
    streamSubjects,
    options.minYear,
    options.maxYear,
  );
  const exactOfferingKeys = new Set<string>();
  const subjectPoolKeys = new Set<string>();
  const resolutionCounts = {
    exact_stored: 0,
    exact_derived_technical: 0,
    subject_pool: 0,
    ambiguous: 0,
  };
  const sourceCounts = {
    totalJobs: normalizedJobs.length,
    failedJobs: 0,
    jobsMissingExamDocument: 0,
  };

  for (const job of normalizedJobs) {
    resolutionCounts[job.resolution] += 1;

    if (job.status === IngestionJobStatus.FAILED) {
      sourceCounts.failedJobs += 1;
    }

    if (!job.hasExamDocument) {
      sourceCounts.jobsMissingExamDocument += 1;
    }

    if (job.exactKey) {
      exactOfferingKeys.add(job.exactKey);
    }

    if (job.subjectPoolKey) {
      subjectPoolKeys.add(job.subjectPoolKey);
    }
  }

  const offeringAudit = evaluateExpectedOfferings(
    expectedOfferings,
    exactOfferingKeys,
    subjectPoolKeys,
  );
  const yearSummaries = summarizeByYear(
    options.minYear,
    options.maxYear,
    expectedOfferings,
    offeringAudit,
    normalizedJobs,
  );

  const report = {
    auditedAt: new Date().toISOString(),
    range: {
      minYear: options.minYear,
      maxYear: options.maxYear,
    },
    proofStatus: {
      downloadCompleteness:
        sourceCounts.failedJobs === 0 && sourceCounts.jobsMissingExamDocument === 0
          ? 'proven_for_discovered_jobs'
          : 'not_proven',
      canonicalCompleteness:
        canonicalCounts.streamSubjectYearRules.nonDefaultWindows === 0
          ? 'not_provable_from_current_schema'
          : 'needs_manual_review',
      historicalUniverseCompleteness: 'not_proven',
    },
    canonicalReadiness: canonicalCounts,
    sourceCoverage: {
      ...sourceCounts,
      resolutionCounts,
      ambiguousJobs: normalizedJobs.filter((job) => job.resolution === 'ambiguous')
        .length,
      subjectPoolJobs: normalizedJobs.filter((job) => job.resolution === 'subject_pool')
        .length,
    },
    offeringAudit: {
      expectedOfferings: expectedOfferings.length,
      exactMatches: offeringAudit.exactMatches.length,
      subjectPoolOnlyMatches: offeringAudit.subjectPoolOnlyMatches.length,
      missingOfferings: offeringAudit.missingOfferings.length,
    },
    samples: {
      ambiguousJobs: takeSample(
        normalizedJobs
          .filter((job) => job.resolution === 'ambiguous')
          .map(sampleJob),
      ),
      subjectPoolJobs: takeSample(
        normalizedJobs
          .filter((job) => job.resolution === 'subject_pool')
          .map(sampleJob),
      ),
      missingOfferings: takeSample(offeringAudit.missingOfferings),
      subjectPoolOnlyOfferings: takeSample(offeringAudit.subjectPoolOnlyMatches),
    },
    years: yearSummaries,
    notes: [
      'Expected offerings are derived from the current stream_subjects table.',
      'The current DB has no historical validity windows in stream_subjects, so this is a curriculum upper bound, not a final official historical matrix.',
      'Subject-pool matches mean the source universe includes a paper for that year and subject, but stream-family assignment is still unresolved.',
      'Shared/common papers still need explicit family rules or review metadata before they can be proven as canonical coverage.',
    ],
  };

  console.log(JSON.stringify(report, null, 2));
}

async function loadCanonicalCounts() {
  const [
    papers,
    exams,
    variants,
    linkedPapers,
    linkedExams,
    streamSubjects,
    nonDefaultWindows,
  ] = await Promise.all([
    prisma.paper.count(),
    prisma.exam.count(),
    prisma.examVariant.count(),
    prisma.ingestionJob.count({
      where: {
        publishedPaperId: {
          not: null,
        },
      },
    }),
    prisma.ingestionJob.count({
      where: {
        publishedExamId: {
          not: null,
        },
      },
    }),
    prisma.streamSubject.count(),
    prisma.streamSubject.count({
      where: {
        OR: [
          {
            validFromYear: {
              not: 0,
            },
          },
          {
            validToYear: {
              not: null,
            },
          },
        ],
      },
    }),
  ]);

  return {
    papers,
    exams,
    variants,
    linkedPapers,
    linkedExams,
    streamSubjectYearRules: {
      total: streamSubjects,
      nonDefaultWindows,
    },
  };
}

function buildExpectedOfferings(
  mappings: Array<{
    validFromYear: number;
    validToYear: number | null;
    isOptional: boolean;
    stream: {
      code: string;
    };
    subject: {
      code: string;
    };
  }>,
  minYear: number,
  maxYear: number,
) {
  const offerings: Array<{
    year: number;
    streamCode: string;
    subjectCode: string;
    sessionType: SessionType;
    isOptional: boolean;
    key: string;
    subjectPoolKey: string;
  }> = [];

  for (let year = minYear; year <= maxYear; year += 1) {
    for (const mapping of mappings) {
      if (mapping.validFromYear > year) {
        continue;
      }

      if (mapping.validToYear !== null && mapping.validToYear < year) {
        continue;
      }

      const sessionType = SessionType.NORMAL;
      const key = buildOfferingKey(
        year,
        mapping.stream.code,
        mapping.subject.code,
        sessionType,
      );

      offerings.push({
        year,
        streamCode: mapping.stream.code,
        subjectCode: mapping.subject.code,
        sessionType,
        isOptional: mapping.isOptional,
        key,
        subjectPoolKey: buildSubjectPoolKey(year, mapping.subject.code, sessionType),
      });
    }
  }

  return offerings;
}

function normalizeJobCoverage(
  job: {
    id: string;
    year: number;
    label: string;
    status: IngestionJobStatus;
    streamCode: string | null;
    subjectCode: string | null;
    sessionType: SessionType | null;
    metadata: unknown;
    sourceDocuments: Array<{
      kind: SourceDocumentKind;
    }>;
  },
  subjectCodeSet: Set<string>,
  streamCodeSet: Set<string>,
): NormalizedJobCoverage {
  const sessionType = job.sessionType ?? SessionType.NORMAL;
  const metadata =
    job.metadata && typeof job.metadata === 'object' && !Array.isArray(job.metadata)
      ? (job.metadata as Record<string, unknown>)
      : {};
  const slugCandidate =
    typeof metadata.slug === 'string'
      ? metadata.slug
      : typeof metadata.examPdfUrl === 'string'
        ? metadata.examPdfUrl
        : null;
  const derived = deriveEddirasaMetadata([
    slugCandidate,
    job.label,
    typeof metadata.examPdfUrl === 'string' ? metadata.examPdfUrl : null,
  ]);
  const parsedSlug = parseEddirasaSlug(slugCandidate);
  const notes: string[] = [];

  const derivedSubjectCode = normalizeSubjectCode(
    derived.subjectCode,
    subjectCodeSet,
  );
  const normalizedSubjectCode = resolveNormalizedSubjectCode(
    job.subjectCode,
    derivedSubjectCode,
    subjectCodeSet,
    notes,
  );
  const storedSubjectCode = normalizeSubjectCode(job.subjectCode, subjectCodeSet);

  const derivedStreamCode = normalizeStreamCode(derived.streamCode, streamCodeSet);
  const normalizedStreamCode = normalizeStoredStreamCode(
    job.streamCode,
    derivedStreamCode,
    parsedSlug,
    streamCodeSet,
    notes,
  );

  if (
    job.streamCode &&
    derivedStreamCode &&
    job.streamCode !== derivedStreamCode &&
    !isKnownSharedScientificSignal(job, slugCandidate)
  ) {
    notes.push(`stored_stream_conflicts_with_derived:${derivedStreamCode}`);
  }

  let resolution: NormalizedJobCoverage['resolution'] = 'ambiguous';
  let exactKey: string | null = null;
  let subjectPoolKey: string | null = null;

  if (normalizedSubjectCode) {
    subjectPoolKey = buildSubjectPoolKey(job.year, normalizedSubjectCode, sessionType);
  }

  if (normalizedStreamCode && normalizedSubjectCode) {
    exactKey = buildOfferingKey(
      job.year,
      normalizedStreamCode,
      normalizedSubjectCode,
      sessionType,
    );
    resolution =
      !job.streamCode && TECHNICAL_STREAM_CODES.has(normalizedStreamCode)
        ? 'exact_derived_technical'
        : 'exact_stored';
  } else if (normalizedSubjectCode) {
    resolution = 'subject_pool';
  }

  return {
    id: job.id,
    year: job.year,
    label: job.label,
    sessionType,
    status: job.status,
    storedStreamCode: job.streamCode,
    storedSubjectCode: job.subjectCode,
    derivedStreamCode,
    derivedSubjectCode,
    normalizedStreamCode,
    normalizedSubjectCode,
    resolution,
    exactKey,
    subjectPoolKey,
    hasExamDocument: job.sourceDocuments.some(
      (document) => document.kind === SourceDocumentKind.EXAM,
    ),
    notes,
  };
}

function resolveNormalizedSubjectCode(
  storedSubjectCode: string | null,
  derivedSubjectCode: string | null,
  subjectCodeSet: Set<string>,
  notes: string[],
) {
  if (storedSubjectCode && subjectCodeSet.has(storedSubjectCode)) {
    if (derivedSubjectCode && storedSubjectCode !== derivedSubjectCode) {
      notes.push(`stored_subject_conflicts_with_derived:${derivedSubjectCode}`);
      return null;
    }

    return storedSubjectCode;
  }

  if (storedSubjectCode === 'THIRD_FOREIGN_LANGUAGE' && derivedSubjectCode) {
    notes.push(`generic_subject_resolved:${derivedSubjectCode}`);
    return derivedSubjectCode;
  }

  if (storedSubjectCode && !subjectCodeSet.has(storedSubjectCode)) {
    notes.push(`unmapped_subject:${storedSubjectCode}`);
  }

  return derivedSubjectCode;
}

function normalizeSubjectCode(
  subjectCode: string | null,
  subjectCodeSet: Set<string>,
) {
  if (!subjectCode) {
    return null;
  }

  return subjectCodeSet.has(subjectCode) ? subjectCode : null;
}

function normalizeStoredStreamCode(
  storedStreamCode: string | null,
  derivedStreamCode: string | null,
  parsedSlug: ReturnType<typeof parseEddirasaSlug>,
  streamCodeSet: Set<string>,
  notes: string[],
) {
  if (storedStreamCode && streamCodeSet.has(storedStreamCode)) {
    return storedStreamCode;
  }

  if (
    derivedStreamCode &&
    parsedSlug &&
    TECHNICAL_STREAM_CODES.has(derivedStreamCode)
  ) {
    notes.push(`derived_technical_stream:${derivedStreamCode}`);
    return derivedStreamCode;
  }

  return null;
}

function normalizeStreamCode(
  streamCode: string | null,
  streamCodeSet: Set<string>,
) {
  if (!streamCode) {
    return null;
  }

  return streamCodeSet.has(streamCode) ? streamCode : null;
}

function evaluateExpectedOfferings(
  expectedOfferings: Array<{
    year: number;
    streamCode: string;
    subjectCode: string;
    sessionType: SessionType;
    isOptional: boolean;
    key: string;
    subjectPoolKey: string;
  }>,
  exactOfferingKeys: Set<string>,
  subjectPoolKeys: Set<string>,
) {
  const exactMatches: typeof expectedOfferings = [];
  const subjectPoolOnlyMatches: typeof expectedOfferings = [];
  const missingOfferings: typeof expectedOfferings = [];

  for (const offering of expectedOfferings) {
    if (exactOfferingKeys.has(offering.key)) {
      exactMatches.push(offering);
      continue;
    }

    if (subjectPoolKeys.has(offering.subjectPoolKey)) {
      subjectPoolOnlyMatches.push(offering);
      continue;
    }

    missingOfferings.push(offering);
  }

  return {
    exactMatches,
    subjectPoolOnlyMatches,
    missingOfferings,
  };
}

function summarizeByYear(
  minYear: number,
  maxYear: number,
  expectedOfferings: Array<{
    year: number;
    key: string;
    subjectPoolKey: string;
  }>,
  offeringAudit: {
    exactMatches: Array<{
      year: number;
    }>;
    subjectPoolOnlyMatches: Array<{
      year: number;
    }>;
    missingOfferings: Array<{
      year: number;
    }>;
  },
  normalizedJobs: NormalizedJobCoverage[],
) {
  const summaries: Array<{
    year: number;
    jobs: number;
    expectedOfferings: number;
    exactMatches: number;
    subjectPoolOnlyMatches: number;
    missingOfferings: number;
    ambiguousJobs: number;
  }> = [];

  for (let year = minYear; year <= maxYear; year += 1) {
    summaries.push({
      year,
      jobs: normalizedJobs.filter((job) => job.year === year).length,
      expectedOfferings: expectedOfferings.filter((offering) => offering.year === year)
        .length,
      exactMatches: offeringAudit.exactMatches.filter((offering) => offering.year === year)
        .length,
      subjectPoolOnlyMatches: offeringAudit.subjectPoolOnlyMatches.filter(
        (offering) => offering.year === year,
      ).length,
      missingOfferings: offeringAudit.missingOfferings.filter(
        (offering) => offering.year === year,
      ).length,
      ambiguousJobs: normalizedJobs.filter(
        (job) => job.year === year && job.resolution === 'ambiguous',
      ).length,
    });
  }

  return summaries;
}

function sampleJob(job: NormalizedJobCoverage) {
  return {
    id: job.id,
    year: job.year,
    label: job.label,
    storedStreamCode: job.storedStreamCode,
    storedSubjectCode: job.storedSubjectCode,
    derivedStreamCode: job.derivedStreamCode,
    derivedSubjectCode: job.derivedSubjectCode,
    normalizedStreamCode: job.normalizedStreamCode,
    normalizedSubjectCode: job.normalizedSubjectCode,
    resolution: job.resolution,
    notes: job.notes,
  };
}

function buildOfferingKey(
  year: number,
  streamCode: string,
  subjectCode: string,
  sessionType: SessionType,
) {
  return [year, sessionType, streamCode, subjectCode].join('|');
}

function buildSubjectPoolKey(
  year: number,
  subjectCode: string,
  sessionType: SessionType,
) {
  return [year, sessionType, subjectCode].join('|');
}

function takeSample<T>(items: T[]) {
  return items.slice(0, SAMPLE_SIZE);
}

function isKnownSharedScientificSignal(
  job: {
    label: string;
  },
  slugCandidate: string | null,
) {
  const normalizedSource = `${slugCandidate ?? ''} ${job.label}`.toLowerCase();

  return (
    normalizedSource.includes('bac-sc-') ||
    normalizedSource.includes('shoub ilmia') ||
    normalizedSource.includes('شعب علمية')
  );
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    minYear: DEFAULT_MIN_YEAR,
    maxYear: DEFAULT_MAX_YEAR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--min-year' && argv[index + 1]) {
      options.minYear = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--max-year' && argv[index + 1]) {
      options.maxYear = Number.parseInt(argv[index + 1], 10);
      index += 1;
    }
  }

  if (!Number.isInteger(options.minYear) || options.minYear < 0) {
    throw new Error('--min-year must be a non-negative integer.');
  }

  if (!Number.isInteger(options.maxYear) || options.maxYear < options.minYear) {
    throw new Error('--max-year must be an integer greater than or equal to --min-year.');
  }

  return options;
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
