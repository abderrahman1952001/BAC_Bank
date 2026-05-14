import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  PrismaClient,
  SessionType,
  SourceDocumentKind,
} from '@prisma/client';
import { mapWithConcurrency } from '../src/ingestion/intake-runtime';
import {
  R2StorageClient,
  readR2ConfigFromEnv,
} from '../src/ingestion/r2-storage';

const prisma = new PrismaClient();
const storageClient = new R2StorageClient(readR2ConfigFromEnv());
const DEFAULT_MIN_YEAR = 2008;
const DEFAULT_MAX_YEAR = new Date().getFullYear();
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 90_000;

const SUBJECT_CODES = [
  'ARABIC',
  'ISLAMIC_STUDIES',
  'MATHEMATICS',
  'ENGLISH',
  'NATURAL_SCIENCES',
  'PHYSICS',
  'FRENCH',
  'HISTORY_GEOGRAPHY',
  'AMAZIGH',
  'PHILOSOPHY',
  'TECHNOLOGY_MECHANICAL',
  'TECHNOLOGY_ELECTRICAL',
  'TECHNOLOGY_CIVIL',
  'TECHNOLOGY_PROCESS',
  'LAW',
  'ACCOUNTING_FINANCE',
  'ECONOMICS_MANAGEMENT',
  'GERMAN',
  'SPANISH',
  'ITALIAN',
  'ARTS',
] as const;

const STREAM_CODES = [
  'SE',
  'M',
  'MT_CIVIL',
  'MT_ELEC',
  'MT_MECH',
  'MT_PROC',
  'GE',
  'LP',
  'LE',
  'LE_GERMAN',
  'LE_SPANISH',
  'LE_ITALIAN',
  'ARTS',
] as const;

type SubjectCode = (typeof SUBJECT_CODES)[number];
type StreamCode = (typeof STREAM_CODES)[number];

type CliOptions = {
  minYear: number;
  maxYear: number;
  concurrency: number;
  limit: number | null;
  model: string;
  outputDir: string;
  force: boolean;
  subjects: string[];
  slugs: string[];
  kinds: SourceDocumentKind[];
};

type VisualClassification = {
  subjectCode: string | null;
  streamCodes: string[];
  year: number | null;
  documentKind: string | null;
  scanQuality: 'GOOD' | 'FAIR' | 'BAD' | null;
  confidence: number;
  evidence: string;
  concerns: string[];
};

type SourceDocumentAuditInput = {
  sourceId: string;
  slug: string;
  year: number;
  sessionType: SessionType;
  familyCode: string;
  expectedSubjectCode: string;
  expectedStreamCodes: string[];
  documentId: string;
  documentKind: SourceDocumentKind;
  fileName: string;
  storageKey: string;
  sourceUrl: string | null;
  pageStorageKey: string;
  pageSha256: string | null;
};

type SourceDocumentAuditResult = SourceDocumentAuditInput & {
  cacheKey: string;
  classification: VisualClassification | null;
  normalized: {
    subjectCode: SubjectCode | null;
    streamCodes: StreamCode[];
    year: number | null;
    documentKind: SourceDocumentKind | null;
  };
  mismatchReasons: string[];
  error: string | null;
};

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  await fs.mkdir(options.outputDir, { recursive: true });

  const cachePath = path.join(options.outputDir, 'visual-identity-cache.json');
  const cache = await readJsonFile<Record<string, SourceDocumentAuditResult>>(
    cachePath,
    {},
  );
  const apiKey = readApiKey();
  const inputs = await loadAuditInputs(options);
  let completed = 0;

  console.log(
    JSON.stringify(
      {
        minYear: options.minYear,
        maxYear: options.maxYear,
        documents: inputs.length,
        concurrency: options.concurrency,
        model: options.model,
        outputDir: options.outputDir,
        cached: Object.keys(cache).length,
      },
      null,
      2,
    ),
  );

  const results = await mapWithConcurrency(
    inputs,
    options.concurrency,
    async (input) => {
      const cacheKey = buildCacheKey(input);

      if (!options.force && cache[cacheKey]) {
        completed += 1;
        logProgress(completed, inputs.length, input, 'cached');
        return cache[cacheKey];
      }

      let result: SourceDocumentAuditResult;

      try {
        const pageBuffer = await storageClient.getObjectBuffer(
          input.pageStorageKey,
        );
        const auditImage = await buildAuditImage(pageBuffer);
        const classification = await classifyPage({
          apiKey,
          model: options.model,
          image: auditImage,
        });
        result = buildAuditResult(input, cacheKey, classification, null);
      } catch (error) {
        result = buildAuditResult(
          input,
          cacheKey,
          null,
          error instanceof Error ? error.message : String(error),
        );
      }

      cache[cacheKey] = result;
      completed += 1;

      if (completed % 20 === 0 || completed === inputs.length) {
        await writeJsonFile(cachePath, cache);
      }

      logProgress(
        completed,
        inputs.length,
        input,
        result.error
          ? 'error'
          : result.mismatchReasons.length > 0
            ? 'mismatch'
            : 'ok',
      );
      return result;
    },
  );

  await writeJsonFile(cachePath, cache);

  const report = buildReport(results, options);
  const reportPath = path.join(options.outputDir, 'visual-identity-report.json');
  await writeJsonFile(reportPath, report);

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`report ${reportPath}`);

  if (report.summary.errors > 0 || report.summary.mismatches > 0) {
    process.exitCode = 1;
  }
}

async function loadAuditInputs(options: CliOptions) {
  const sources = await prisma.paperSource.findMany({
    where: {
      year: {
        gte: options.minYear,
        lte: options.maxYear,
      },
      ...(options.subjects.length > 0
        ? {
            subject: {
              code: {
                in: options.subjects,
              },
            },
          }
        : {}),
      ...(options.slugs.length > 0
        ? {
            slug: {
              in: options.slugs,
            },
          }
        : {}),
    },
    orderBy: [{ year: 'asc' }, { subject: { code: 'asc' } }, { familyCode: 'asc' }],
    select: {
      id: true,
      slug: true,
      year: true,
      sessionType: true,
      familyCode: true,
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
          fileName: true,
          storageKey: true,
          sourceUrl: true,
          pages: {
            orderBy: {
              pageNumber: 'asc',
            },
            take: 1,
            select: {
              storageKey: true,
              sha256: true,
            },
          },
        },
      },
    },
  });

  const inputs: SourceDocumentAuditInput[] = [];

  for (const source of sources) {
    for (const document of source.sourceDocuments) {
      if (
        options.kinds.length > 0 &&
        !options.kinds.includes(document.kind)
      ) {
        continue;
      }

      const firstPage = document.pages[0] ?? null;

      if (!firstPage) {
        continue;
      }

      inputs.push({
        sourceId: source.id,
        slug: source.slug,
        year: source.year,
        sessionType: source.sessionType,
        familyCode: source.familyCode,
        expectedSubjectCode: source.subject.code,
        expectedStreamCodes: source.streamMappings.map(
          (mapping) => mapping.stream.code,
        ),
        documentId: document.id,
        documentKind: document.kind,
        fileName: document.fileName,
        storageKey: document.storageKey,
        sourceUrl: document.sourceUrl,
        pageStorageKey: firstPage.storageKey,
        pageSha256: firstPage.sha256,
      });
    }
  }

  return options.limit === null ? inputs : inputs.slice(0, options.limit);
}

async function buildAuditImage(pageBuffer: Buffer) {
  return sharp(pageBuffer)
    .resize({
      width: 1200,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 82,
    })
    .toBuffer();
}

async function classifyPage(input: {
  apiKey: string;
  model: string;
  image: Buffer;
}): Promise<VisualClassification> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await classifyPageOnce(input);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === 3 || !isRetryableGeminiError(lastError)) {
        break;
      }

      await sleep(1_500 * attempt);
    }
  }

  throw lastError ?? new Error('Gemini classification failed.');
}

async function classifyPageOnce(input: {
  apiKey: string;
  model: string;
  image: Buffer;
}): Promise<VisualClassification> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.apiKey}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: buildVisualPrompt(),
                },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: input.image.toString('base64'),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 512,
          },
        }),
        signal: controller.signal,
      },
    );
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${body.slice(0, 500)}`);
    }

    const parsed = JSON.parse(body) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      throw new Error('Gemini returned no text.');
    }

    return parseLineClassification(text);
  } finally {
    clearTimeout(timeout);
  }
}

function buildVisualPrompt() {
  return [
    'Classify this stored Algerian BAC source page visually. Do not trust filenames or external metadata.',
    'Use only what is visible in the image: official header, subject line, stream line, year/session text, correction grid labels, and page content.',
    'Return exactly these 7 lines. No markdown, no bullets, no extra text:',
    'SUBJECT_CODE=<code or UNKNOWN>',
    'STREAM_CODES=<comma-separated codes or UNKNOWN>',
    'YEAR=<four-digit year or UNKNOWN>',
    'DOCUMENT_KIND=<EXAM or CORRECTION or UNKNOWN>',
    'SCAN_QUALITY=<GOOD or FAIR or BAD>',
    'CONFIDENCE=<0.00 to 1.00>',
    'EVIDENCE=<under 30 words>',
    `subjectCode must be one of: ${SUBJECT_CODES.join(', ')}.`,
    `STREAM_CODES may contain any visible/inferred codes from: ${STREAM_CODES.join(', ')}. Use UNKNOWN when the stream is not visible or the paper is clearly common/shared but the exact stream list is not visible.`,
    'Use CORRECTION only when the page is visibly an answer key/marking scheme/correction, not merely because the image has tables.',
    'For scanQuality, use BAD only for clearly unreadable, cropped, cut off, blank, or wrong-orientation scans.',
    'Keep evidence under 30 words.',
  ].join('\n');
}

function buildAuditResult(
  input: SourceDocumentAuditInput,
  cacheKey: string,
  classification: VisualClassification | null,
  error: string | null,
): SourceDocumentAuditResult {
  const normalized = {
    subjectCode: normalizeSubjectCode(classification?.subjectCode ?? null),
    streamCodes: normalizeStreamCodes(classification?.streamCodes ?? []),
    year: normalizeYear(classification?.year ?? null),
    documentKind: normalizeDocumentKind(classification?.documentKind ?? null),
  };
  const mismatchReasons = error
    ? []
    : findMismatchReasons(input, classification, normalized);

  return {
    ...input,
    cacheKey,
    classification,
    normalized,
    mismatchReasons,
    error,
  };
}

function findMismatchReasons(
  input: SourceDocumentAuditInput,
  classification: VisualClassification | null,
  normalized: SourceDocumentAuditResult['normalized'],
) {
  const reasons: string[] = [];

  if (!classification) {
    reasons.push('missing_classification');
    return reasons;
  }

  if (classification.confidence < 0.55) {
    reasons.push(`low_confidence:${classification.confidence}`);
  }

  if (
    normalized.subjectCode &&
    normalized.subjectCode !== input.expectedSubjectCode
  ) {
    reasons.push(
      `subject:${input.expectedSubjectCode}->${normalized.subjectCode}`,
    );
  }

  if (normalized.year !== null && normalized.year !== input.year) {
    reasons.push(`year:${input.year}->${normalized.year}`);
  }

  if (
    normalized.documentKind &&
    normalized.documentKind !== input.documentKind
  ) {
    reasons.push(
      `kind:${input.documentKind}->${normalized.documentKind}`,
    );
  }

  if (
    normalized.streamCodes.length > 0 &&
    input.expectedStreamCodes.length > 0 &&
    !normalized.streamCodes.some((streamCode) =>
      expectedStreamsInclude(input.expectedStreamCodes, streamCode),
    )
  ) {
    reasons.push(
      `stream:${input.expectedStreamCodes.join('+')}->${normalized.streamCodes.join('+')}`,
    );
  }

  if (classification.scanQuality === 'BAD') {
    reasons.push('scan_quality_bad');
  }

  return reasons;
}

function expectedStreamsInclude(expectedStreamCodes: string[], actual: StreamCode) {
  if (expectedStreamCodes.includes(actual)) {
    return true;
  }

  if (
    actual === 'LE' &&
    expectedStreamCodes.some((code) => code.startsWith('LE_'))
  ) {
    return true;
  }

  if (
    actual.startsWith('LE_') &&
    expectedStreamCodes.includes('LE')
  ) {
    return true;
  }

  return false;
}

function parseLineClassification(text: string): VisualClassification {
  const fields = new Map<string, string>();

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)\s*[:=]\s*(.*)$/);

    if (!match) {
      continue;
    }

    fields.set(match[1], match[2].trim());
  }

  if (!fields.has('SUBJECT_CODE') || !fields.has('DOCUMENT_KIND')) {
    throw new Error(`Failed to parse Gemini line response: ${text.slice(0, 500)}`);
  }

  const confidence = Number.parseFloat(fields.get('CONFIDENCE') ?? '');
  const year = Number.parseInt(fields.get('YEAR') ?? '', 10);
  const streamValue = fields.get('STREAM_CODES') ?? '';

  return {
    subjectCode: normalizeUnknown(fields.get('SUBJECT_CODE') ?? null),
    streamCodes: normalizeUnknown(streamValue)
      ? streamValue
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [],
    year: Number.isInteger(year) ? year : null,
    documentKind: normalizeUnknown(fields.get('DOCUMENT_KIND') ?? null),
    scanQuality:
      normalizeScanQuality(fields.get('SCAN_QUALITY')) ?? 'FAIR',
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(1, confidence))
      : 0,
    evidence: fields.get('EVIDENCE') ?? '',
    concerns: [],
  };
}

function normalizeUnknown(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || /^unknown|null|n\/a|\[\]$/i.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeClassification(value: unknown): VisualClassification {
  const record = asRecord(value);
  const scanQuality = normalizeScanQuality(record.scanQuality);
  const confidence =
    typeof record.confidence === 'number' && Number.isFinite(record.confidence)
      ? Math.max(0, Math.min(1, record.confidence))
      : 0;

  return {
    subjectCode: readOptionalString(record.subjectCode),
    streamCodes: Array.isArray(record.streamCodes)
      ? record.streamCodes
          .map((entry) => readOptionalString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : [],
    year:
      typeof record.year === 'number' && Number.isInteger(record.year)
        ? record.year
        : null,
    documentKind: readOptionalString(record.documentKind),
    scanQuality,
    confidence,
    evidence: readOptionalString(record.evidence) ?? '',
    concerns: Array.isArray(record.concerns)
      ? record.concerns
          .map((entry) => readOptionalString(entry))
          .filter((entry): entry is string => Boolean(entry))
      : [],
  };
}

function normalizeSubjectCode(value: string | null): SubjectCode | null {
  const normalized = normalizeLookup(value);
  const aliases: Record<string, SubjectCode> = {
    arabic: 'ARABIC',
    arabe: 'ARABIC',
    'arabic-language': 'ARABIC',
    'langue-arabe': 'ARABIC',
    english: 'ENGLISH',
    'english-language': 'ENGLISH',
    anglais: 'ENGLISH',
    french: 'FRENCH',
    francais: 'FRENCH',
    mathematics: 'MATHEMATICS',
    math: 'MATHEMATICS',
    maths: 'MATHEMATICS',
    physics: 'PHYSICS',
    physique: 'PHYSICS',
    'natural-sciences': 'NATURAL_SCIENCES',
    sciences: 'NATURAL_SCIENCES',
    svt: 'NATURAL_SCIENCES',
    'history-geography': 'HISTORY_GEOGRAPHY',
    'history-and-geography': 'HISTORY_GEOGRAPHY',
    'histoire-geographie': 'HISTORY_GEOGRAPHY',
    philosophy: 'PHILOSOPHY',
    philo: 'PHILOSOPHY',
    'islamic-studies': 'ISLAMIC_STUDIES',
    islamic: 'ISLAMIC_STUDIES',
    amazigh: 'AMAZIGH',
    tamazight: 'AMAZIGH',
    law: 'LAW',
    droit: 'LAW',
    'accounting-finance': 'ACCOUNTING_FINANCE',
    accounting: 'ACCOUNTING_FINANCE',
    'economics-management': 'ECONOMICS_MANAGEMENT',
    economics: 'ECONOMICS_MANAGEMENT',
    management: 'ECONOMICS_MANAGEMENT',
    german: 'GERMAN',
    spanish: 'SPANISH',
    italian: 'ITALIAN',
    arts: 'ARTS',
    'technology-mechanical': 'TECHNOLOGY_MECHANICAL',
    'technology-electrical': 'TECHNOLOGY_ELECTRICAL',
    'technology-civil': 'TECHNOLOGY_CIVIL',
    'technology-process': 'TECHNOLOGY_PROCESS',
  };

  return SUBJECT_CODES.find((code) => code === value) ?? aliases[normalized] ?? null;
}

function normalizeStreamCodes(values: string[]): StreamCode[] {
  return Array.from(
    new Set(
      values
        .map(normalizeStreamCode)
        .filter((value): value is StreamCode => value !== null),
    ),
  );
}

function normalizeStreamCode(value: string | null): StreamCode | null {
  const normalized = normalizeLookup(value);
  const aliases: Record<string, StreamCode> = {
    se: 'SE',
    'experimental-sciences': 'SE',
    'science-experimentale': 'SE',
    m: 'M',
    math: 'M',
    mathematics: 'M',
    ge: 'GE',
    'gestion-economie': 'GE',
    lp: 'LP',
    'arts-and-philosophy': 'LP',
    'letters-and-philosophy': 'LP',
    le: 'LE',
    'foreign-languages': 'LE',
    'langues-etrangeres': 'LE',
    'le-german': 'LE_GERMAN',
    'le-spanish': 'LE_SPANISH',
    'le-italian': 'LE_ITALIAN',
    'mt-civil': 'MT_CIVIL',
    'civil-engineering': 'MT_CIVIL',
    'mt-elec': 'MT_ELEC',
    'electrical-engineering': 'MT_ELEC',
    'mt-mech': 'MT_MECH',
    'mechanical-engineering': 'MT_MECH',
    'mt-proc': 'MT_PROC',
    'process-engineering': 'MT_PROC',
    arts: 'ARTS',
  };

  return STREAM_CODES.find((code) => code === value) ?? aliases[normalized] ?? null;
}

function normalizeYear(value: number | null) {
  if (!Number.isInteger(value) || value === null) {
    return null;
  }

  return value >= 1900 && value <= 2100 ? value : null;
}

function normalizeDocumentKind(value: string | null): SourceDocumentKind | null {
  const normalized = normalizeLookup(value);

  if (normalized === 'exam' || normalized === 'subject' || normalized === 'sujet') {
    return SourceDocumentKind.EXAM;
  }

  if (
    normalized === 'correction' ||
    normalized === 'answer-key' ||
    normalized === 'marking-scheme' ||
    normalized === 'corrige'
  ) {
    return SourceDocumentKind.CORRECTION;
  }

  return null;
}

function normalizeScanQuality(value: unknown) {
  if (value === 'GOOD' || value === 'FAIR' || value === 'BAD') {
    return value;
  }

  return null;
}

function buildReport(results: SourceDocumentAuditResult[], options: CliOptions) {
  const mismatches = results.filter((result) => result.mismatchReasons.length > 0);
  const errors = results.filter((result) => result.error);

  return {
    summary: {
      auditedAt: new Date().toISOString(),
      range: {
        minYear: options.minYear,
        maxYear: options.maxYear,
      },
      documents: results.length,
      mismatches: mismatches.length,
      errors: errors.length,
      badScans: results.filter((result) =>
        result.mismatchReasons.includes('scan_quality_bad'),
      ).length,
    },
    mismatches: mismatches.map((result) => ({
      slug: result.slug,
      documentId: result.documentId,
      documentKind: result.documentKind,
      fileName: result.fileName,
      storageKey: result.storageKey,
      pageStorageKey: result.pageStorageKey,
      expected: {
        subjectCode: result.expectedSubjectCode,
        streamCodes: result.expectedStreamCodes,
        year: result.year,
        kind: result.documentKind,
      },
      actual: result.normalized,
      confidence: result.classification?.confidence ?? null,
      evidence: result.classification?.evidence ?? null,
      concerns: result.classification?.concerns ?? [],
      reasons: result.mismatchReasons,
      sourceUrl: result.sourceUrl,
    })),
    errors: errors.map((result) => ({
      slug: result.slug,
      documentId: result.documentId,
      storageKey: result.storageKey,
      pageStorageKey: result.pageStorageKey,
      error: result.error,
    })),
    results,
  };
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    minYear: DEFAULT_MIN_YEAR,
    maxYear: DEFAULT_MAX_YEAR,
    concurrency: DEFAULT_CONCURRENCY,
    limit: null,
    model: DEFAULT_MODEL,
    outputDir: path.resolve(
      __dirname,
      '../../..',
      'output',
      'ingestion',
      `source-visual-audit-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    ),
    force: false,
    subjects: [],
    slugs: [],
    kinds: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--min-year' && next) {
      options.minYear = parseYear(next, '--min-year');
      index += 1;
      continue;
    }

    if (arg === '--max-year' && next) {
      options.maxYear = parseYear(next, '--max-year');
      index += 1;
      continue;
    }

    if (arg === '--concurrency' && next) {
      options.concurrency = parsePositiveInteger(next, '--concurrency');
      index += 1;
      continue;
    }

    if (arg === '--limit' && next) {
      options.limit = parsePositiveInteger(next, '--limit');
      index += 1;
      continue;
    }

    if (arg === '--model' && next) {
      options.model = next.trim();
      index += 1;
      continue;
    }

    if (arg === '--output-dir' && next) {
      options.outputDir = path.resolve(next);
      index += 1;
      continue;
    }

    if (arg === '--subject' && next) {
      options.subjects.push(next.trim().toUpperCase());
      index += 1;
      continue;
    }

    if (arg === '--slug' && next) {
      options.slugs.push(next.trim());
      index += 1;
      continue;
    }

    if (arg === '--kind' && next) {
      const kind = next.trim().toUpperCase();

      if (kind !== SourceDocumentKind.EXAM && kind !== SourceDocumentKind.CORRECTION) {
        throw new Error('--kind must be EXAM or CORRECTION.');
      }

      options.kinds.push(kind);
      index += 1;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
    }
  }

  if (options.maxYear < options.minYear) {
    throw new Error('--max-year must be greater than or equal to --min-year.');
  }

  return options;
}

function parseYear(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return parsed;
}

function parsePositiveInteger(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function readApiKey() {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!key?.trim()) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is required.');
  }

  return key.trim();
}

function buildCacheKey(input: SourceDocumentAuditInput) {
  return [
    input.documentId,
    input.pageStorageKey,
    input.pageSha256 ?? 'no-sha',
  ].join('|');
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

function stripJsonFence(text: string) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function isRetryableGeminiError(error: Error) {
  return (
    error.message.includes('Gemini 429') ||
    error.message.includes('Gemini 500') ||
    error.message.includes('Gemini 502') ||
    error.message.includes('Gemini 503') ||
    error.message.includes('Gemini 504') ||
    error.message.includes('aborted') ||
    error.message.includes('fetch failed')
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeLookup(value: string | null) {
  if (!value) {
    return '';
  }

  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function logProgress(
  completed: number,
  total: number,
  input: SourceDocumentAuditInput,
  status: string,
) {
  console.log(
    `${status} ${completed}/${total} ${input.slug} ${input.documentKind} ${input.fileName}`,
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
