import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import {
  IngestionJobStatus,
  SourceDocumentKind,
  type SourceDocument,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { IngestionOpsService } from '../src/ingestion/ingestion-ops.service';
import { IngestionReadService } from '../src/ingestion/ingestion-read.service';
import { IngestionReviewedExtractService } from '../src/ingestion/ingestion-reviewed-extract.service';
import {
  parseReviewedPaperExtract,
  type ReviewedPaperExtract,
} from '../src/ingestion/reviewed-paper-import';
import {
  readR2ConfigFromEnv,
  R2StorageClient,
} from '../src/ingestion/r2-storage';
import { validateIngestionDraft } from '../src/ingestion/ingestion-validation';
import { PrismaService } from '../src/prisma/prisma.service';

type CliOptions = {
  year: number;
  subjectCode: string;
  model: string;
  outputDir: string;
  apiKeyFile: string;
  slugs: string[];
  jobIds: string[];
  limit: number | null;
  maxOutputTokens: number;
  importDraft: boolean;
  dryRun: boolean;
};

type SourceTarget = {
  slug: string;
  familyCode: string;
  sessionType: string;
  year: number;
  subjectCode: string;
  streamCodes: string[];
  sourceListingUrl: string | null;
  sourceExamPageUrl: string | null;
  sourceCorrectionPageUrl: string | null;
  examDocument: Pick<
    SourceDocument,
    'id' | 'kind' | 'storageKey' | 'fileName' | 'pageCount'
  > & {
    pages: Array<{
      id: string;
      pageNumber: number;
      width: number;
      height: number;
    }>;
  };
  correctionDocument: Pick<
    SourceDocument,
    'id' | 'kind' | 'storageKey' | 'fileName' | 'pageCount'
  > & {
    pages: Array<{
      id: string;
      pageNumber: number;
      width: number;
      height: number;
    }>;
  };
  job: {
    id: string;
    label: string;
    status: IngestionJobStatus;
    draftJson: unknown;
    reviewNotes: string | null;
  };
};

const PROMPT_VERSION = 'gemini-reviewed-extract-math-v1';
const DEFAULT_MODEL = 'gemini-2.5-pro';
const DEFAULT_OUTPUT_DIR = 'tmp/gemini-reviewed-extracts';
const DEFAULT_API_KEY_FILE = 'paid_api_key.md';
const DEFAULT_MAX_OUTPUT_TOKENS = 65_536;

const TEXT_BLOCK_SCHEMA = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['paragraph', 'latex', 'heading'],
    },
    text: {
      type: 'string',
    },
  },
  required: ['type', 'text'],
  propertyOrdering: ['type', 'text'],
};

const NATIVE_SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['table', 'tree'],
    },
    value: {
      type: 'string',
    },
    data: {
      type: 'object',
      additionalProperties: true,
    },
    status: {
      type: 'string',
      enum: ['suggested', 'stale'],
    },
    source: {
      type: 'string',
      enum: ['reviewed_extract'],
    },
    notes: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['type', 'data'],
  propertyOrdering: ['type', 'value', 'data', 'status', 'source', 'notes'],
};

const REVIEWED_EXTRACT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    exam: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        durationMinutes: { type: 'number' },
        totalPoints: { type: 'number' },
        sourceLanguage: { type: 'string' },
        hasCorrection: { type: 'boolean' },
      },
      propertyOrdering: [
        'title',
        'durationMinutes',
        'totalPoints',
        'sourceLanguage',
        'hasCorrection',
      ],
    },
    variants: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            enum: ['SUJET_1', 'SUJET_2'],
          },
          title: {
            type: 'string',
          },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                orderIndex: { type: 'integer', minimum: 1 },
                title: { type: 'string' },
                maxPoints: { type: 'number' },
                contextBlocks: {
                  type: 'array',
                  items: TEXT_BLOCK_SCHEMA,
                },
                assetIds: {
                  type: 'array',
                  items: { type: 'string' },
                },
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      orderIndex: { type: 'integer', minimum: 1 },
                      label: { type: 'string' },
                      maxPoints: { type: 'number' },
                      promptBlocks: {
                        type: 'array',
                        items: TEXT_BLOCK_SCHEMA,
                      },
                      solutionBlocks: {
                        type: 'array',
                        items: TEXT_BLOCK_SCHEMA,
                      },
                      hintBlocks: {
                        type: 'array',
                        items: TEXT_BLOCK_SCHEMA,
                      },
                      rubricBlocks: {
                        type: 'array',
                        items: TEXT_BLOCK_SCHEMA,
                      },
                      assetIds: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                    required: [
                      'orderIndex',
                      'promptBlocks',
                      'solutionBlocks',
                      'hintBlocks',
                      'rubricBlocks',
                      'assetIds',
                    ],
                    propertyOrdering: [
                      'orderIndex',
                      'label',
                      'maxPoints',
                      'promptBlocks',
                      'solutionBlocks',
                      'hintBlocks',
                      'rubricBlocks',
                      'assetIds',
                    ],
                  },
                },
              },
              required: [
                'orderIndex',
                'title',
                'contextBlocks',
                'assetIds',
                'questions',
              ],
              propertyOrdering: [
                'orderIndex',
                'title',
                'maxPoints',
                'contextBlocks',
                'assetIds',
                'questions',
              ],
            },
          },
        },
        required: ['code', 'title', 'exercises'],
        propertyOrdering: ['code', 'title', 'exercises'],
      },
    },
    assets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          variantCode: {
            type: 'string',
            enum: ['SUJET_1', 'SUJET_2'],
          },
          exerciseOrderIndex: { type: 'integer', minimum: 1 },
          questionOrderIndex: { type: 'integer', minimum: 1 },
          documentKind: {
            type: 'string',
            enum: ['EXAM', 'CORRECTION'],
          },
          role: {
            type: 'string',
            enum: ['PROMPT', 'SOLUTION', 'HINT', 'RUBRIC'],
          },
          classification: {
            type: 'string',
            enum: ['image', 'table', 'tree', 'graph'],
          },
          pageNumber: { type: 'integer', minimum: 1 },
          label: { type: 'string' },
          caption: { type: 'string' },
          notes: { type: 'string' },
          nativeSuggestion: NATIVE_SUGGESTION_SCHEMA,
        },
        required: [
          'id',
          'exerciseOrderIndex',
          'documentKind',
          'role',
          'classification',
          'pageNumber',
        ],
        propertyOrdering: [
          'id',
          'variantCode',
          'exerciseOrderIndex',
          'questionOrderIndex',
          'documentKind',
          'role',
          'classification',
          'pageNumber',
          'label',
          'caption',
          'notes',
          'nativeSuggestion',
        ],
      },
    },
    uncertainties: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['variants', 'assets', 'uncertainties'],
  propertyOrdering: ['exam', 'variants', 'assets', 'uncertainties'],
};

const SYSTEM_INSTRUCTION = [
  'You extract structured Algerian BAC mathematics exam content from the attached official exam PDF and official correction PDF.',
  'Return strict JSON only. Do not wrap the response in Markdown or code fences.',
  'Stay maximally faithful to the scanned pages. Do not summarize, compress, simplify, or invent missing text.',
  'The exam PDF is the source of truth for prompt/context content. The correction PDF is the source of truth for solution and rubric content.',
  'Preserve every visible prompt, condition, formula, unit, table label, instruction, correction step, barème value, and point split in source order.',
  'Never drop a second variant/topic when it is present. Extract both SUJET_1 and SUJET_2 in the same JSON response.',
  'Use paragraph blocks for ordinary prose, latex blocks for standalone formula-heavy lines, and heading blocks only for short visible headings.',
  'Use inline $...$ for inline math when practical. Preserve Arabic/French notation and BAC wording faithfully.',
  'Do not invent crop boxes. The review UI will handle crops later.',
  'Graphs must stay as graph/image assets for now. Do not create nativeSuggestion for graphs, even if a function is visible.',
  'For sign tables, variation tables, simple numeric tables, and probability trees, add nativeSuggestion only when every cell/branch/label/value is visibly present and can be transcribed faithfully.',
  'Native table suggestions must use data.rows as an array of row arrays. Put KaTeX-compatible math inside cells using $...$ where useful.',
  'Native probability tree suggestions must use data.kind="probability_tree" and data.probabilityTree.root with children, labels, edgeLabel, and probability values exactly as visible.',
  'If any native rendering detail is uncertain, keep the source as an asset without nativeSuggestion and add an uncertainty.',
  'Before finalizing, compare your JSON back against both PDFs and fix omissions. If something remains unreadable or ambiguous, keep the closest faithful result and add an uncertainty.',
].join('\n');

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const apiKey = await readApiKey(options.apiKeyFile);
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService, { strict: false });
  const readService = app.get(IngestionReadService, { strict: false });
  const opsService = app.get(IngestionOpsService, { strict: false });
  const reviewedExtractService = app.get(IngestionReviewedExtractService, {
    strict: false,
  });
  const storageClient = new R2StorageClient(readR2ConfigFromEnv());
  const outputRoot = path.resolve(process.cwd(), options.outputDir);

  try {
    await fs.mkdir(outputRoot, { recursive: true });
    await fs.mkdir(path.join(outputRoot, 'inputs'), { recursive: true });
    await fs.mkdir(path.join(outputRoot, 'backups'), { recursive: true });

    const targets = await loadTargets(prisma, options);
    const results = [];

    console.log(
      `gemini extraction targets=${targets.length} year=${options.year} subject=${options.subjectCode} model=${options.model}`,
    );

    for (const target of targets) {
      const result = await processTarget({
        apiKey,
        target,
        options,
        outputRoot,
        storageClient,
        readService,
        opsService,
        reviewedExtractService,
      });
      results.push(result);
    }

    console.log(
      JSON.stringify(
        {
          promptVersion: PROMPT_VERSION,
          model: options.model,
          outputDir: toDisplayPath(outputRoot),
          results,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

async function processTarget(input: {
  apiKey: string;
  target: SourceTarget;
  options: CliOptions;
  outputRoot: string;
  storageClient: R2StorageClient;
  readService: IngestionReadService;
  opsService: IngestionOpsService;
  reviewedExtractService: IngestionReviewedExtractService;
}) {
  const {
    apiKey,
    target,
    options,
    outputRoot,
    storageClient,
    readService,
    opsService,
    reviewedExtractService,
  } = input;
  const safeSlug = target.slug.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const inputDir = path.join(outputRoot, 'inputs', safeSlug);
  await fs.mkdir(inputDir, { recursive: true });

  const backupPath = path.join(
    outputRoot,
    'backups',
    `${safeSlug}-${target.job.id}-before-gemini.json`,
  );
  await fs.writeFile(
    backupPath,
    `${JSON.stringify(target.job.draftJson, null, 2)}\n`,
    'utf8',
  );

  const examPath = path.join(inputDir, target.examDocument.fileName);
  const correctionPath = path.join(inputDir, target.correctionDocument.fileName);

  await fs.writeFile(
    examPath,
    await storageClient.getObjectBuffer(target.examDocument.storageKey),
  );
  await fs.writeFile(
    correctionPath,
    await storageClient.getObjectBuffer(target.correctionDocument.storageKey),
  );

  if (options.dryRun) {
    return {
      slug: target.slug,
      jobId: target.job.id,
      skipped: true,
      reason: 'dry-run',
      backupFile: toDisplayPath(backupPath),
    };
  }

  console.log(`extract ${target.slug} job=${target.job.id}`);

  const sourceFiles = {
    examPath,
    correctionPath,
  };

  {
    const rawJson = await generateReviewedExtract({
      apiKey,
      target,
      options,
      files: sourceFiles,
      outputRoot,
    });
    const rawPath = path.join(outputRoot, `${safeSlug}.raw.json`);
    await fs.writeFile(rawPath, `${rawJson}\n`, 'utf8');

    const normalized = normalizeGeminiReviewedExtract(JSON.parse(rawJson));
    const reviewedExtract = parseReviewedPaperExtract(
      normalized,
      toDisplayPath(rawPath),
    );
    const normalizedPath = path.join(outputRoot, `${safeSlug}.json`);
    await fs.writeFile(
      normalizedPath,
      `${JSON.stringify(reviewedExtract, null, 2)}\n`,
      'utf8',
    );

    if (!options.importDraft) {
      return {
        slug: target.slug,
        jobId: target.job.id,
        imported: false,
        artifact: toDisplayPath(normalizedPath),
        backupFile: toDisplayPath(backupPath),
        summary: summarizeReviewedExtract(reviewedExtract),
      };
    }

    const imported = await reviewedExtractService.importReviewedExtract({
      jobId: target.job.id,
      reviewedExtract,
      importFilePath: toDisplayPath(normalizedPath),
      jobTitle: target.job.label,
      moveToInReview: true,
    });
    const jobAfterImport = await readService.findJobOrThrow(target.job.id);
    const draft = readService.hydrateDraft(jobAfterImport);
    draft.exam.metadata = {
      ...draft.exam.metadata,
      extractionRoute: 'gemini_reviewed_extract_candidate',
      extractionModel: options.model,
      extractionPromptVersion: PROMPT_VERSION,
      extractionArtifactPath: toDisplayPath(normalizedPath),
      extractionBackupPath: toDisplayPath(backupPath),
      extractedAt: new Date().toISOString(),
      graphsKeptAsImageAssets: true,
      nativeRenderingPolicy:
        'Gemini may suggest native tables and probability trees only; graphs remain image assets pending future renderer support.',
      sourceExamDocumentId: target.examDocument.id,
      sourceCorrectionDocumentId: target.correctionDocument.id,
    };

    const validationAfterMetadata = validateIngestionDraft(draft);
    await opsService.saveDraft(target.job.id, {
      draft,
      reviewNotes: appendReviewNote(
        jobAfterImport.reviewNotes,
        `Gemini reviewed-extract candidate generated with ${options.model} (${PROMPT_VERSION}). Graphs were kept as image assets; native table/tree suggestions still require visual review against source pages before approval.`,
      ),
      clearErrorMessage: true,
    });

    return {
      slug: target.slug,
      jobId: target.job.id,
      imported: true,
      finalStatus: imported.finalStatus,
      artifact: toDisplayPath(normalizedPath),
      backupFile: toDisplayPath(backupPath),
      summary: imported.summary,
      validation: {
        errors: validationAfterMetadata.errors,
        warnings: validationAfterMetadata.warnings.length,
      },
    };
  }
}

async function generateReviewedExtract(input: {
  apiKey: string;
  target: SourceTarget;
  options: CliOptions;
  files: {
    examPath: string;
    correctionPath: string;
  };
  outputRoot: string;
}) {
  const payload = {
    systemInstruction: {
      parts: [
        {
          text: SYSTEM_INSTRUCTION,
        },
      ],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: buildUserPrompt(input.target),
          },
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: await fileToBase64(input.files.examPath),
            },
          },
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: await fileToBase64(input.files.correctionPath),
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: REVIEWED_EXTRACT_JSON_SCHEMA,
      temperature: 0,
      maxOutputTokens: input.options.maxOutputTokens,
    },
  };
  const safeSlug = input.target.slug.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const payloadPath = path.join(
    input.outputRoot,
    `${safeSlug}.gemini-request.json`,
  );
  const responsePath = path.join(
    input.outputRoot,
    `${safeSlug}.gemini-response.json`,
  );
  await fs.writeFile(payloadPath, JSON.stringify(payload), 'utf8');
  const response = await postGeminiGenerateContentWithCurl({
    apiKey: input.apiKey,
    model: input.options.model,
    payloadPath,
    responsePath,
  });
  const text = extractGeminiResponseText(response).trim();

  if (!text) {
    throw new Error(
      `Gemini returned an empty response for ${input.target.slug}.`,
    );
  }

  return stripJsonFences(text);
}

async function fileToBase64(filePath: string) {
  return (await fs.readFile(filePath)).toString('base64');
}

async function postGeminiGenerateContentWithCurl(input: {
  apiKey: string;
  model: string;
  payloadPath: string;
  responsePath: string;
}) {
  const maxAttempts = 4;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await runCurlGeminiRequest(input);
    const bodyText = await readFileIfExists(input.responsePath);
    const parsedBody = parseJsonObject(bodyText, input.responsePath);

    if (result.exitCode === 0 && result.httpStatus >= 200 && result.httpStatus < 300) {
      return parsedBody;
    }

    const retryDelaySeconds = readRetryDelaySeconds(parsedBody);
    const status = result.httpStatus || readErrorStatusCode(parsedBody);
    lastError = new Error(
      `Gemini REST request failed status=${status || 'unknown'} exit=${result.exitCode}: ${summarizeGeminiError(parsedBody)}`,
    );

    if (
      attempt < maxAttempts &&
      (status === 429 || status === 500 || status === 502 || status === 503 || status === 504)
    ) {
      const delayMs = Math.max(
        retryDelaySeconds !== null ? retryDelaySeconds * 1000 : 0,
        10_000 * attempt,
      );
      console.warn(
        `Gemini request retry ${attempt}/${maxAttempts} after ${Math.round(delayMs / 1000)}s: ${lastError.message}`,
      );
      await sleep(delayMs);
      continue;
    }

    throw lastError;
  }

  throw lastError ?? new Error('Gemini REST request failed.');
}

async function runCurlGeminiRequest(input: {
  apiKey: string;
  model: string;
  payloadPath: string;
  responsePath: string;
}) {
  await fs.rm(input.responsePath, { force: true });

  const curl = spawn(
    'curl',
    [
      '-sS',
      '--fail-with-body',
      '--connect-timeout',
      '30',
      '--max-time',
      '900',
      '--config',
      '-',
      '--data-binary',
      `@${input.payloadPath}`,
      '-o',
      input.responsePath,
      '-w',
      '%{http_code}',
    ],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  curl.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
  curl.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));
  curl.stdin.end(
    [
      `url = "https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent"`,
      'request = "POST"',
      'header = "Content-Type: application/json"',
      `header = "x-goog-api-key: ${input.apiKey}"`,
    ].join('\n'),
  );
  const exitCode = await new Promise<number>((resolve, reject) => {
    curl.on('error', reject);
    curl.on('close', (code) => resolve(code ?? 1));
  });
  const stdout = Buffer.concat(stdoutChunks).toString('utf8').trim();
  const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
  const httpStatus = Number.parseInt(stdout.match(/(\d{3})$/)?.[1] ?? '0', 10);

  if (stderr && exitCode !== 0) {
    console.warn(`curl reported: ${stderr.slice(0, 500)}`);
  }

  return {
    exitCode,
    httpStatus: Number.isFinite(httpStatus) ? httpStatus : 0,
  };
}

function extractGeminiResponseText(value: Record<string, unknown>) {
  const candidates = Array.isArray(value.candidates) ? value.candidates : [];
  const first = candidates[0];

  if (!first || typeof first !== 'object' || Array.isArray(first)) {
    return '';
  }

  const content = (first as Record<string, unknown>).content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return '';
  }

  const parts = Array.isArray((content as Record<string, unknown>).parts)
    ? ((content as Record<string, unknown>).parts as unknown[])
    : [];

  return parts
    .map((part) =>
      part && typeof part === 'object' && !Array.isArray(part)
        ? ((part as Record<string, unknown>).text ?? '')
        : '',
    )
    .join('');
}

function buildUserPrompt(target: SourceTarget) {
  return [
    `Current label: ${target.job.label}`,
    `Known year: ${target.year}`,
    `Current inferred stream code: ${target.streamCodes.join(', ') || 'unknown'}`,
    `Current inferred subject code: ${target.subjectCode}`,
    `Current session type: ${target.sessionType}`,
    `Current title: ${target.job.label}`,
    '',
    'Attached files:',
    '1. Exam subject PDF (statement)',
    '2. Official correction PDF',
    '',
    'Extract this paper into the reviewed extract JSON schema.',
    'Return exercises and questions exactly in order.',
    'Do not drop any visible content from the exam PDF.',
    'For solutionBlocks, stay especially faithful to the correction PDF.',
    'Put visible barème and point-allocation details into rubricBlocks for the matching question.',
    'Use assetIds to connect visual assets to the nearest exercise or question.',
    'Page numbers for assets must be 1-based within the referenced EXAM or CORRECTION document.',
    'Use empty arrays for required arrays when no content exists.',
    'Do not include cropBox fields.',
    'Graphs must remain graph assets without nativeSuggestion.',
    'For sign tables, variation tables, simple tables, and probability trees, include nativeSuggestion only when faithful and fully visible.',
    '',
    'Canonical source page inventory:',
    `EXAM document id ${target.examDocument.id}: ${formatPageInventory(target.examDocument.pages)}`,
    `CORRECTION document id ${target.correctionDocument.id}: ${formatPageInventory(target.correctionDocument.pages)}`,
  ].join('\n');
}

function formatPageInventory(
  pages: SourceTarget['examDocument']['pages'],
) {
  return pages
    .map((page) => `page ${page.pageNumber} ${page.width}x${page.height}`)
    .join('; ');
}

async function deleteUploadedFiles(
  ai: GoogleGenAI,
  uploadedFiles: Awaited<ReturnType<typeof uploadSourceFiles>>,
) {
  await Promise.allSettled(
    [uploadedFiles.exam, uploadedFiles.correction]
      .map((file) => file.name)
      .filter((name): name is string => Boolean(name))
      .map((name) => ai.files.delete({ name })),
  );
}

function normalizeGeminiReviewedExtract(value: unknown) {
  const root = asRecord(value, 'Gemini reviewed extract');
  const uncertainties = readStringArray(root.uncertainties);

  return {
    exam: normalizeExam(root.exam),
    variants: readArray(root.variants).map((variant, variantIndex) =>
      normalizeVariant(variant, variantIndex),
    ),
    assets: readArray(root.assets).map((asset, assetIndex) =>
      normalizeAsset(asset, assetIndex, uncertainties),
    ),
    uncertainties,
  };
}

function normalizeExam(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value;
}

function normalizeVariant(value: unknown, variantIndex: number) {
  const record = asRecord(value, `variants[${variantIndex}]`);
  const code = record.code === 'SUJET_2' ? 'SUJET_2' : 'SUJET_1';

  return {
    code,
    title:
      typeof record.title === 'string' && record.title.trim()
        ? record.title.trim()
        : code === 'SUJET_2'
          ? 'الموضوع الثاني'
          : 'الموضوع الأول',
    exercises: readArray(record.exercises).map((exercise, exerciseIndex) =>
      normalizeExercise(exercise, exerciseIndex),
    ),
  };
}

function normalizeExercise(value: unknown, exerciseIndex: number) {
  const record = asRecord(value, `exercises[${exerciseIndex}]`);

  return {
    orderIndex: readPositiveInteger(record.orderIndex, exerciseIndex + 1),
    title:
      normalizeOptionalString(record.title) ??
      `التمرين ${readPositiveInteger(record.orderIndex, exerciseIndex + 1)}`,
    ...(readOptionalNumber(record.maxPoints) !== null
      ? { maxPoints: readOptionalNumber(record.maxPoints) }
      : {}),
    contextBlocks: normalizeTextBlocks(record.contextBlocks),
    assetIds: readStringArray(record.assetIds),
    questions: readArray(record.questions).map((question, questionIndex) =>
      normalizeQuestion(question, questionIndex),
    ),
  };
}

function normalizeQuestion(value: unknown, questionIndex: number) {
  const record = asRecord(value, `questions[${questionIndex}]`);
  const label = normalizeOptionalString(record.label ?? record.title);

  return {
    orderIndex: readPositiveInteger(record.orderIndex, questionIndex + 1),
    ...(label ? { label } : {}),
    ...(readOptionalNumber(record.maxPoints) !== null
      ? { maxPoints: readOptionalNumber(record.maxPoints) }
      : {}),
    promptBlocks: normalizeTextBlocks(record.promptBlocks),
    solutionBlocks: normalizeTextBlocks(record.solutionBlocks),
    hintBlocks: normalizeTextBlocks(record.hintBlocks),
    rubricBlocks: normalizeTextBlocks(record.rubricBlocks),
    assetIds: readStringArray(record.assetIds),
  };
}

function normalizeTextBlocks(value: unknown) {
  return readArray(value).flatMap((entry) => {
    const record = asRecord(entry, 'text block');
    const text = normalizeOptionalString(record.text ?? record.value);

    if (!text) {
      return [];
    }

    return [
      {
        type:
          record.type === 'heading' || record.type === 'latex'
            ? record.type
            : 'paragraph',
        text,
      },
    ];
  });
}

function normalizeAsset(
  value: unknown,
  assetIndex: number,
  uncertainties: string[],
) {
  const record = asRecord(value, `assets[${assetIndex}]`);
  const classification = readAssetClassification(record.classification);
  const asset: Record<string, unknown> = {
    id:
      normalizeOptionalString(record.id) ??
      `gemini_asset_${String(assetIndex + 1).padStart(3, '0')}`,
    ...(readOptionalVariantCode(record.variantCode)
      ? { variantCode: readOptionalVariantCode(record.variantCode) }
      : {}),
    exerciseOrderIndex: readPositiveInteger(record.exerciseOrderIndex, 1),
    ...(readOptionalPositiveInteger(record.questionOrderIndex) !== null
      ? {
          questionOrderIndex: readOptionalPositiveInteger(
            record.questionOrderIndex,
          ),
        }
      : {}),
    documentKind:
      record.documentKind === 'CORRECTION' ? 'CORRECTION' : 'EXAM',
    role: readBlockRole(record.role),
    classification,
    pageNumber: readPositiveInteger(record.pageNumber, 1),
    ...(normalizeOptionalString(record.label)
      ? { label: normalizeOptionalString(record.label) }
      : {}),
    ...(normalizeOptionalString(record.caption)
      ? { caption: normalizeOptionalString(record.caption) }
      : {}),
    ...(normalizeOptionalString(record.notes)
      ? { notes: normalizeOptionalString(record.notes) }
      : {}),
  };

  const nativeSuggestion = normalizeNativeSuggestion(
    record.nativeSuggestion,
    classification,
  );

  if (classification === 'graph' && record.nativeSuggestion) {
    uncertainties.push(
      `Removed native suggestion from graph asset ${String(asset.id)} because graphs are intentionally kept as image assets in this run.`,
    );
  }

  if (nativeSuggestion) {
    asset.nativeSuggestion = nativeSuggestion;
  }

  return asset;
}

function normalizeNativeSuggestion(
  value: unknown,
  classification: ReturnType<typeof readAssetClassification>,
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  if (classification === 'graph' || classification === 'image') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const type = record.type === 'tree' ? 'tree' : 'table';

  if (type !== classification) {
    return null;
  }

  const data =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : {};

  return {
    type,
    value: normalizeOptionalString(record.value) ?? '',
    data:
      type === 'tree'
        ? normalizeProbabilityTreeData(data)
        : normalizeTableData(data),
    status: 'suggested',
    source: 'reviewed_extract',
    notes: readStringArray(record.notes),
  };
}

function normalizeTableData(data: Record<string, unknown>) {
  const rows = Array.isArray(data.rows) ? data.rows : [];

  return {
    ...data,
    rows: rows.map((row) =>
      Array.isArray(row)
        ? row.map((cell) =>
            cell === null || cell === undefined ? '' : String(cell),
          )
        : [String(row)],
    ),
  };
}

function normalizeProbabilityTreeData(data: Record<string, unknown>) {
  if (data.kind === 'probability_tree' && data.probabilityTree) {
    return data;
  }

  if (data.probabilityTree || data.tree) {
    return {
      kind: 'probability_tree',
      probabilityTree: data.probabilityTree ?? data.tree,
    };
  }

  return {
    kind: 'probability_tree',
    probabilityTree: data,
  };
}

function summarizeReviewedExtract(extract: ReviewedPaperExtract) {
  return {
    variantCount: extract.variants.length,
    exerciseCount: extract.variants.reduce(
      (sum, variant) => sum + variant.exercises.length,
      0,
    ),
    questionCount: extract.variants.reduce(
      (variantSum, variant) =>
        variantSum +
        variant.exercises.reduce(
          (exerciseSum, exercise) => exerciseSum + exercise.questions.length,
          0,
        ),
      0,
    ),
    assetCount: extract.assets.length,
    nativeSuggestionCount: extract.assets.filter(
      (asset) => asset.nativeSuggestion,
    ).length,
    uncertaintyCount: extract.uncertainties.length,
  };
}

async function readFileIfExists(filePath: string) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') {
      return '';
    }

    throw error;
  }
}

function parseJsonObject(value: string, sourceLabel: string) {
  if (!value.trim()) {
    return {};
  }

  const parsed = JSON.parse(value) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${sourceLabel} did not contain a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

function readErrorStatusCode(value: Record<string, unknown>) {
  const error = value.error;

  if (!error || typeof error !== 'object' || Array.isArray(error)) {
    return 0;
  }

  const code = (error as Record<string, unknown>).code;
  return typeof code === 'number' ? code : 0;
}

function summarizeGeminiError(value: Record<string, unknown>) {
  const error = value.error;

  if (!error || typeof error !== 'object' || Array.isArray(error)) {
    return JSON.stringify(value).slice(0, 500);
  }

  const record = error as Record<string, unknown>;
  const message =
    typeof record.message === 'string' ? record.message : JSON.stringify(error);
  return message.slice(0, 500);
}

function readRetryDelaySeconds(value: Record<string, unknown>) {
  const error = value.error;

  if (!error || typeof error !== 'object' || Array.isArray(error)) {
    return null;
  }

  const details = (error as Record<string, unknown>).details;

  if (!Array.isArray(details)) {
    return null;
  }

  for (const detail of details) {
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) {
      continue;
    }

    const retryDelay = (detail as Record<string, unknown>).retryDelay;

    if (typeof retryDelay === 'string') {
      const parsed = Number.parseInt(retryDelay.replace(/s$/, ''), 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }

  return null;
}

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function loadTargets(
  prisma: PrismaService,
  options: CliOptions,
): Promise<SourceTarget[]> {
  const sources = await prisma.paperSource.findMany({
    where: {
      year: options.year,
      subject: {
        code: options.subjectCode,
      },
      ...(options.slugs.length > 0
        ? {
            slug: {
              in: options.slugs,
            },
          }
        : {}),
      ...(options.jobIds.length > 0
        ? {
            ingestionJobs: {
              some: {
                id: {
                  in: options.jobIds,
                },
              },
            },
          }
        : {}),
    },
    include: {
      subject: {
        select: {
          code: true,
        },
      },
      streamMappings: {
        select: {
          stream: {
            select: {
              code: true,
            },
          },
        },
        orderBy: {
          stream: {
            code: 'asc',
          },
        },
      },
      sourceDocuments: {
        select: {
          id: true,
          kind: true,
          fileName: true,
          storageKey: true,
          pageCount: true,
          pages: {
            select: {
              id: true,
              pageNumber: true,
              width: true,
              height: true,
            },
            orderBy: {
              pageNumber: 'asc',
            },
          },
        },
      },
      ingestionJobs: {
        select: {
          id: true,
          label: true,
          status: true,
          draftJson: true,
          reviewNotes: true,
          updatedAt: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      },
    },
    orderBy: [{ sessionType: 'asc' }, { familyCode: 'asc' }],
    ...(options.limit !== null ? { take: options.limit } : {}),
  });

  return sources.map((source) => {
    const examDocument = source.sourceDocuments.find(
      (document) => document.kind === SourceDocumentKind.EXAM,
    );
    const correctionDocument = source.sourceDocuments.find(
      (document) => document.kind === SourceDocumentKind.CORRECTION,
    );
    const job =
      options.jobIds.length > 0
        ? source.ingestionJobs.find((entry) => options.jobIds.includes(entry.id))
        : source.ingestionJobs[0];

    if (!examDocument || !correctionDocument) {
      throw new Error(
        `Paper source ${source.slug} is missing an exam or correction document.`,
      );
    }

    if (!examDocument.pages.length || !correctionDocument.pages.length) {
      throw new Error(
        `Paper source ${source.slug} is missing canonical source pages.`,
      );
    }

    if (!job) {
      throw new Error(`Paper source ${source.slug} has no ingestion job.`);
    }

    if (job.status === IngestionJobStatus.PUBLISHED) {
      throw new Error(
        `Paper source ${source.slug} points to a published job; use a revision workflow instead.`,
      );
    }

    return {
      slug: source.slug,
      familyCode: source.familyCode,
      sessionType: source.sessionType,
      year: source.year,
      subjectCode: source.subject.code,
      streamCodes: source.streamMappings.map((mapping) => mapping.stream.code),
      sourceListingUrl: source.sourceListingUrl,
      sourceExamPageUrl: source.sourceExamPageUrl,
      sourceCorrectionPageUrl: source.sourceCorrectionPageUrl,
      examDocument,
      correctionDocument,
      job,
    };
  });
}

async function readApiKey(apiKeyFile: string) {
  const envKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (envKey?.trim()) {
    return envKey.trim();
  }

  const content = await fs.readFile(path.resolve(process.cwd(), apiKeyFile), {
    encoding: 'utf8',
  });
  const key = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('#'));

  if (!key) {
    throw new Error(`No Gemini API key found in ${apiKeyFile}.`);
  }

  return key;
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    year: 2025,
    subjectCode: 'MATHEMATICS',
    model: DEFAULT_MODEL,
    outputDir: DEFAULT_OUTPUT_DIR,
    apiKeyFile: DEFAULT_API_KEY_FILE,
    slugs: [],
    jobIds: [],
    limit: null,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    importDraft: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--year' && next) {
      options.year = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (arg === '--subject-code' && next) {
      options.subjectCode = next.trim().toUpperCase();
      index += 1;
      continue;
    }

    if (arg === '--model' && next) {
      options.model = next.trim();
      index += 1;
      continue;
    }

    if (arg === '--output-dir' && next) {
      options.outputDir = next;
      index += 1;
      continue;
    }

    if (arg === '--api-key-file' && next) {
      options.apiKeyFile = next;
      index += 1;
      continue;
    }

    if (arg === '--slug' && next) {
      options.slugs.push(...parseListArgument(next));
      index += 1;
      continue;
    }

    if (arg === '--job-id' && next) {
      options.jobIds.push(...parseListArgument(next));
      index += 1;
      continue;
    }

    if (arg === '--limit' && next) {
      options.limit = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (arg === '--max-output-tokens' && next) {
      options.maxOutputTokens = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (arg === '--import') {
      options.importDraft = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
  }

  if (!Number.isInteger(options.year) || options.year < 1900) {
    throw new Error('--year must be a valid year.');
  }

  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('--limit must be a positive integer.');
  }

  if (
    !Number.isInteger(options.maxOutputTokens) ||
    options.maxOutputTokens < 1024
  ) {
    throw new Error('--max-output-tokens must be an integer >= 1024.');
  }

  if (/^gemini-2\.5-flash/i.test(options.model)) {
    throw new Error(
      'gemini-2.5-flash models are disabled for this extraction command. Use gemini-2.5-pro unless the operator explicitly changes this policy.',
    );
  }

  return options;
}

function parseListArgument(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readStringArray(value: unknown) {
  return readArray(value)
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function asRecord(value: unknown, sourceLabel: string) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw new Error(`${sourceLabel} must be an object.`);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : fallback;

  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

function readOptionalPositiveInteger(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : null;

  return parsed !== null && Number.isInteger(parsed) && parsed >= 1
    ? parsed
    : null;
}

function readOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value.replace(',', '.'))
        : null;

  return parsed !== null && Number.isFinite(parsed) ? parsed : null;
}

function readOptionalVariantCode(value: unknown) {
  return value === 'SUJET_1' || value === 'SUJET_2' ? value : null;
}

function readBlockRole(value: unknown) {
  return value === 'SOLUTION' ||
    value === 'HINT' ||
    value === 'RUBRIC' ||
    value === 'META'
    ? value
    : 'PROMPT';
}

function readAssetClassification(value: unknown) {
  return value === 'table' ||
    value === 'tree' ||
    value === 'graph' ||
    value === 'image'
    ? value
    : 'image';
}

function appendReviewNote(existing: string | null, note: string) {
  return existing?.trim() ? `${existing.trim()} ${note}` : note;
}

function stripJsonFences(text: string) {
  const trimmed = text.trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function toDisplayPath(absolutePath: string) {
  const relative = path.relative(process.cwd(), absolutePath);
  return relative && !relative.startsWith('..') ? relative : absolutePath;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
