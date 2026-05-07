import { promises as fs } from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { PrismaClient, SessionType, SourceDocumentKind } from '@prisma/client';
import {
  readR2ConfigFromEnv,
  R2StorageClient,
} from '../src/ingestion/r2-storage';

type Mode = 'prepare' | 'submit' | 'status' | 'collect';

type CliOptions = {
  mode: Mode;
  campaignId: string;
  year: number;
  subjectCode: string;
  sessionType: SessionType;
  model: string;
  outputDir: string;
  apiKeyFile: string;
  slugs: string[];
  excludeSlugs: string[];
  limit: number | null;
  maxOutputTokens: number;
};

type CampaignManifest = {
  schemaVersion: 'bac_gemini_batch_campaign/v1';
  campaignId: string;
  createdAt: string;
  updatedAt: string;
  status: 'PREPARED' | 'SUBMITTED' | 'SUCCEEDED' | 'FAILED' | 'COLLECTED';
  model: string;
  promptContract: {
    sourcePath: string;
    sourceSha256: string;
  };
  selection: {
    year: number;
    subjectCode: string;
    sessionType: SessionType;
    slugs: string[];
    excludeSlugs: string[];
    limit: number | null;
  };
  directories: {
    root: string;
    source: string;
    rawModelOutput: string;
  };
  batch: {
    displayName: string;
    name: string | null;
    state: string | null;
    submittedAt: string | null;
    lastCheckedAt: string | null;
    error: unknown | null;
  };
  items: CampaignItem[];
};

type CampaignItem = {
  key: string;
  paperSourceSlug: string;
  year: number;
  familyCode: string;
  sessionType: SessionType;
  subjectCode: string;
  streamCodes: string[];
  title: string;
  documents: {
    exam: CampaignDocument;
    correction: CampaignDocument;
  };
  uploadStatus: 'PENDING' | 'UPLOADED';
  resultStatus: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  result: {
    rawJsonPath: string | null;
    rawTextPath: string | null;
    responsePath: string | null;
    errorPath: string | null;
    usageMetadata: unknown | null;
  };
};

type CampaignDocument = {
  sourceDocumentId: string;
  storageKey: string;
  fileName: string;
  pageCount: number | null;
  mimeType: string;
  localPath: string;
  geminiFileName: string | null;
  geminiUri: string | null;
};

type PromptContract = {
  systemPrompt: string;
  perPaperPromptTemplate: string;
  responseJsonSchema: unknown;
  sourcePath: string;
  sourceSha256: string;
};

const DEFAULT_MODEL = 'gemini-3-pro-preview';
const DEFAULT_OUTPUT_DIR = 'output/ingestion/gemini-batches';
const DEFAULT_API_KEY_FILE = 'paid_api_key.md';
const DEFAULT_MAX_OUTPUT_TOKENS = 65_536;
const PROMPT_DOC_PATH = 'docs/ai-studio-bac-extraction-prompts.md';

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.mode === 'prepare') {
    await prepareCampaign(options);
    return;
  }

  if (options.mode === 'submit') {
    await submitCampaign(options);
    return;
  }

  if (options.mode === 'status') {
    await refreshCampaignStatus(options);
    return;
  }

  if (options.mode === 'collect') {
    await collectCampaign(options);
  }
}

async function prepareCampaign(options: CliOptions) {
  const repoRoot = await findRepoRoot();
  const campaignRoot = resolveCampaignRoot(repoRoot, options);
  const sourceDir = path.join(campaignRoot, 'source');
  const rawModelOutputDir = path.join(campaignRoot, 'raw-model-output');
  const promptContract = await readPromptContract(repoRoot);
  const prisma = new PrismaClient();
  const storageClient = new R2StorageClient(readR2ConfigFromEnv());

  try {
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(rawModelOutputDir, { recursive: true });

    const sources = await prisma.paperSource.findMany({
      where: {
        year: options.year,
        sessionType: options.sessionType,
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
        ...(options.excludeSlugs.length > 0
          ? {
              NOT: {
                slug: {
                  in: options.excludeSlugs,
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
            storageKey: true,
            fileName: true,
            mimeType: true,
            pageCount: true,
          },
        },
      },
      orderBy: [{ familyCode: 'asc' }, { slug: 'asc' }],
      ...(options.limit !== null ? { take: options.limit } : {}),
    });

    if (sources.length === 0) {
      throw new Error('No matching paper sources were found.');
    }

    const items: CampaignItem[] = [];

    for (const source of sources) {
      const examDocument = source.sourceDocuments.find(
        (document) => document.kind === SourceDocumentKind.EXAM,
      );
      const correctionDocument = source.sourceDocuments.find(
        (document) => document.kind === SourceDocumentKind.CORRECTION,
      );

      if (!examDocument || !correctionDocument) {
        throw new Error(
          `Paper source ${source.slug} is missing an exam or correction document.`,
        );
      }

      const itemSourceDir = path.join(sourceDir, source.slug);
      await fs.mkdir(itemSourceDir, { recursive: true });

      const examLocalPath = path.join(itemSourceDir, 'exam.pdf');
      const correctionLocalPath = path.join(itemSourceDir, 'correction.pdf');

      await downloadIfMissing(
        storageClient,
        examDocument.storageKey,
        examLocalPath,
      );
      await downloadIfMissing(
        storageClient,
        correctionDocument.storageKey,
        correctionLocalPath,
      );

      const streamCodes = source.streamMappings.map(
        (mapping) => mapping.stream.code,
      );

      items.push({
        key: `${source.slug}__paper`,
        paperSourceSlug: source.slug,
        year: source.year,
        familyCode: source.familyCode,
        sessionType: source.sessionType,
        subjectCode: source.subject.code,
        streamCodes,
        title: buildPaperTitle(source.year, source.subject.code, source.familyCode),
        documents: {
          exam: {
            sourceDocumentId: examDocument.id,
            storageKey: examDocument.storageKey,
            fileName: examDocument.fileName,
            pageCount: examDocument.pageCount,
            mimeType: examDocument.mimeType || 'application/pdf',
            localPath: examLocalPath,
            geminiFileName: null,
            geminiUri: null,
          },
          correction: {
            sourceDocumentId: correctionDocument.id,
            storageKey: correctionDocument.storageKey,
            fileName: correctionDocument.fileName,
            pageCount: correctionDocument.pageCount,
            mimeType: correctionDocument.mimeType || 'application/pdf',
            localPath: correctionLocalPath,
            geminiFileName: null,
            geminiUri: null,
          },
        },
        uploadStatus: 'PENDING',
        resultStatus: 'PENDING',
        result: {
          rawJsonPath: null,
          rawTextPath: null,
          responsePath: null,
          errorPath: null,
          usageMetadata: null,
        },
      });
    }

    const now = new Date().toISOString();
    const manifest: CampaignManifest = {
      schemaVersion: 'bac_gemini_batch_campaign/v1',
      campaignId: options.campaignId,
      createdAt: now,
      updatedAt: now,
      status: 'PREPARED',
      model: options.model,
      promptContract: {
        sourcePath: promptContract.sourcePath,
        sourceSha256: promptContract.sourceSha256,
      },
      selection: {
        year: options.year,
        subjectCode: options.subjectCode,
        sessionType: options.sessionType,
        slugs: options.slugs,
        excludeSlugs: options.excludeSlugs,
        limit: options.limit,
      },
      directories: {
        root: campaignRoot,
        source: sourceDir,
        rawModelOutput: rawModelOutputDir,
      },
      batch: {
        displayName: options.campaignId,
        name: null,
        state: null,
        submittedAt: null,
        lastCheckedAt: null,
        error: null,
      },
      items,
    };

    await writeManifest(campaignRoot, manifest);

    console.log(
      JSON.stringify(
        {
          mode: options.mode,
          campaignId: manifest.campaignId,
          manifestPath: manifestPath(campaignRoot),
          itemCount: manifest.items.length,
          slugs: manifest.items.map((item) => item.paperSourceSlug),
          excludedSlugs: manifest.selection.excludeSlugs,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function submitCampaign(options: CliOptions) {
  const repoRoot = await findRepoRoot();
  const campaignRoot = resolveCampaignRoot(repoRoot, options);
  const manifest = await readManifest(campaignRoot);
  const promptContract = await readPromptContract(repoRoot);

  if (manifest.batch.name) {
    throw new Error(
      `Campaign ${manifest.campaignId} is already submitted as ${manifest.batch.name}.`,
    );
  }

  const apiKey = await readApiKey(repoRoot, options.apiKeyFile);
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 900_000,
    },
  });

  for (const item of manifest.items) {
    await uploadItemDocuments(ai, item);
    item.uploadStatus = 'UPLOADED';
    manifest.updatedAt = new Date().toISOString();
    await writeManifest(campaignRoot, manifest);
  }

  const requests = manifest.items.map((item) => ({
    metadata: {
      key: item.key,
      paperSourceSlug: item.paperSourceSlug,
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: fillPerPaperPrompt(promptContract.perPaperPromptTemplate, item),
          },
          {
            text: 'Exam subject PDF:',
          },
          {
            fileData: {
              fileUri: item.documents.exam.geminiUri,
              mimeType: item.documents.exam.mimeType,
            },
          },
          {
            text: 'Official correction PDF:',
          },
          {
            fileData: {
              fileUri: item.documents.correction.geminiUri,
              mimeType: item.documents.correction.mimeType,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction: promptContract.systemPrompt,
      responseMimeType: 'application/json',
      responseJsonSchema: promptContract.responseJsonSchema,
      maxOutputTokens: options.maxOutputTokens,
    },
  }));

  const batchJob = await ai.batches.create({
    model: options.model,
    src: requests,
    config: {
      displayName: manifest.batch.displayName,
    },
  } as never);

  manifest.model = options.model;
  manifest.status = 'SUBMITTED';
  manifest.batch.name = batchJob.name ?? null;
  manifest.batch.state = batchJob.state ?? null;
  manifest.batch.submittedAt = new Date().toISOString();
  manifest.batch.lastCheckedAt = manifest.batch.submittedAt;
  manifest.batch.error = batchJob.error ?? null;
  manifest.updatedAt = manifest.batch.submittedAt;
  await writeManifest(campaignRoot, manifest);

  console.log(
    JSON.stringify(
      {
        mode: options.mode,
        campaignId: manifest.campaignId,
        manifestPath: manifestPath(campaignRoot),
        batchName: manifest.batch.name,
        state: manifest.batch.state,
        itemCount: manifest.items.length,
      },
      null,
      2,
    ),
  );
}

async function refreshCampaignStatus(options: CliOptions) {
  const repoRoot = await findRepoRoot();
  const campaignRoot = resolveCampaignRoot(repoRoot, options);
  const manifest = await readManifest(campaignRoot);
  const batchJob = await getBatchJob(repoRoot, options, manifest);

  updateManifestFromBatchJob(manifest, batchJob, false);
  await writeManifest(campaignRoot, manifest);
  await writeJson(path.join(campaignRoot, 'batch-status.json'), batchJob);

  console.log(
    JSON.stringify(
      {
        mode: options.mode,
        campaignId: manifest.campaignId,
        manifestPath: manifestPath(campaignRoot),
        batchName: manifest.batch.name,
        state: manifest.batch.state,
        error: manifest.batch.error,
      },
      null,
      2,
    ),
  );
}

async function collectCampaign(options: CliOptions) {
  const repoRoot = await findRepoRoot();
  const campaignRoot = resolveCampaignRoot(repoRoot, options);
  const manifest = await readManifest(campaignRoot);
  const batchJob = await getBatchJob(repoRoot, options, manifest);

  updateManifestFromBatchJob(manifest, batchJob, false);
  await writeJson(path.join(campaignRoot, 'batch-status.json'), batchJob);

  if (batchJob.state !== 'JOB_STATE_SUCCEEDED') {
    await writeManifest(campaignRoot, manifest);
    console.log(
      JSON.stringify(
        {
          mode: options.mode,
          campaignId: manifest.campaignId,
          state: batchJob.state,
          collected: false,
          reason: 'Batch job is not succeeded yet.',
        },
        null,
        2,
      ),
    );
    return;
  }

  const inlinedResponses = batchJob.dest?.inlinedResponses ?? [];
  if (inlinedResponses.length === 0) {
    throw new Error(
      `Batch ${manifest.batch.name} succeeded but did not include inlined responses.`,
    );
  }

  for (let index = 0; index < inlinedResponses.length; index += 1) {
    const inlinedResponse = inlinedResponses[index];
    const key = inlinedResponse.metadata?.key;
    const item =
      (key ? manifest.items.find((entry) => entry.key === key) : null) ??
      manifest.items[index];

    if (!item) {
      continue;
    }

    const itemOutputDir = path.join(
      manifest.directories.rawModelOutput,
      item.paperSourceSlug,
    );
    await fs.mkdir(itemOutputDir, { recursive: true });

    if (inlinedResponse.error) {
      item.resultStatus = 'FAILED';
      item.result.errorPath = path.join(itemOutputDir, 'error.json');
      await writeJson(item.result.errorPath, inlinedResponse.error);
      continue;
    }

    if (!inlinedResponse.response) {
      item.resultStatus = 'FAILED';
      item.result.errorPath = path.join(itemOutputDir, 'missing-response.json');
      await writeJson(item.result.errorPath, {
        error: 'Missing response in inlined batch result.',
      });
      continue;
    }

    const rawText = extractResponseText(inlinedResponse.response);
    const rawTextPath = path.join(itemOutputDir, 'source-extract.raw.txt');
    const responsePath = path.join(itemOutputDir, 'source-extract.response.json');
    const rawJsonPath = path.join(itemOutputDir, 'source-extract.json');

    await fs.writeFile(rawTextPath, rawText, 'utf8');
    await writeJson(responsePath, inlinedResponse.response);

    try {
      const parsed = JSON.parse(rawText);
      await writeJson(rawJsonPath, parsed);
      item.resultStatus = 'SUCCEEDED';
      item.result.rawJsonPath = rawJsonPath;
      item.result.rawTextPath = rawTextPath;
      item.result.responsePath = responsePath;
      item.result.errorPath = null;
      item.result.usageMetadata = inlinedResponse.response.usageMetadata ?? null;
    } catch (error) {
      item.resultStatus = 'FAILED';
      item.result.rawTextPath = rawTextPath;
      item.result.responsePath = responsePath;
      item.result.errorPath = path.join(itemOutputDir, 'parse-error.json');
      await writeJson(item.result.errorPath, {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  manifest.status = manifest.items.every(
    (item) => item.resultStatus === 'SUCCEEDED',
  )
    ? 'COLLECTED'
    : 'FAILED';
  manifest.updatedAt = new Date().toISOString();
  await writeManifest(campaignRoot, manifest);

  console.log(
    JSON.stringify(
      {
        mode: options.mode,
        campaignId: manifest.campaignId,
        state: batchJob.state,
        collected: true,
        succeeded: manifest.items.filter(
          (item) => item.resultStatus === 'SUCCEEDED',
        ).length,
        failed: manifest.items.filter((item) => item.resultStatus === 'FAILED')
          .length,
        rawModelOutputDir: manifest.directories.rawModelOutput,
      },
      null,
      2,
    ),
  );
}

async function uploadItemDocuments(ai: GoogleGenAI, item: CampaignItem) {
  item.documents.exam = await uploadDocumentIfNeeded(
    ai,
    item,
    item.documents.exam,
    'exam',
  );
  item.documents.correction = await uploadDocumentIfNeeded(
    ai,
    item,
    item.documents.correction,
    'correction',
  );
}

async function uploadDocumentIfNeeded(
  ai: GoogleGenAI,
  item: CampaignItem,
  document: CampaignDocument,
  kind: 'exam' | 'correction',
): Promise<CampaignDocument> {
  if (document.geminiFileName && document.geminiUri) {
    return document;
  }

  const uploadedFile = await ai.files.upload({
    file: document.localPath,
    config: {
      displayName: `${item.paperSourceSlug}-${kind}.pdf`,
      mimeType: document.mimeType,
    },
  });

  return {
    ...document,
    geminiFileName: uploadedFile.name ?? null,
    geminiUri: uploadedFile.uri ?? null,
    mimeType: uploadedFile.mimeType ?? document.mimeType,
  };
}

async function getBatchJob(
  repoRoot: string,
  options: CliOptions,
  manifest: CampaignManifest,
) {
  if (!manifest.batch.name) {
    throw new Error(`Campaign ${manifest.campaignId} has not been submitted.`);
  }

  const apiKey = await readApiKey(repoRoot, options.apiKeyFile);
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 900_000,
    },
  });

  return await ai.batches.get({ name: manifest.batch.name });
}

function updateManifestFromBatchJob(
  manifest: CampaignManifest,
  batchJob: Awaited<ReturnType<GoogleGenAI['batches']['get']>>,
  collected: boolean,
) {
  manifest.batch.state = batchJob.state ?? null;
  manifest.batch.error = batchJob.error ?? null;
  manifest.batch.lastCheckedAt = new Date().toISOString();
  manifest.updatedAt = manifest.batch.lastCheckedAt;

  if (batchJob.state === 'JOB_STATE_SUCCEEDED') {
    manifest.status = collected ? 'COLLECTED' : 'SUCCEEDED';
    return;
  }

  if (
    batchJob.state === 'JOB_STATE_FAILED' ||
    batchJob.state === 'JOB_STATE_CANCELLED' ||
    batchJob.state === 'JOB_STATE_EXPIRED'
  ) {
    manifest.status = 'FAILED';
  }
}

async function downloadIfMissing(
  storageClient: R2StorageClient,
  storageKey: string,
  localPath: string,
) {
  if (await fileExists(localPath)) {
    return;
  }

  const buffer = await storageClient.getObjectBuffer(storageKey);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);
}

async function readPromptContract(repoRoot: string): Promise<PromptContract> {
  const sourcePath = path.join(repoRoot, PROMPT_DOC_PATH);
  const content = await fs.readFile(sourcePath, 'utf8');
  const sourceSha256 = await sha256(content);

  return {
    sourcePath,
    sourceSha256,
    systemPrompt: extractFencedBlock(content, '## System Prompt', 'text'),
    perPaperPromptTemplate: extractFencedBlock(
      content,
      '## Per-Paper Prompt',
      'text',
    ),
    responseJsonSchema: JSON.parse(
      extractFencedBlock(content, '## Structured Output Schema', 'json'),
    ),
  };
}

function extractFencedBlock(content: string, heading: string, fence: string) {
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) {
    throw new Error(`Could not find ${heading} in prompt doc.`);
  }

  const afterHeading = content.slice(headingIndex);
  const fenceStart = afterHeading.indexOf(`\`\`\`${fence}`);
  if (fenceStart === -1) {
    throw new Error(`Could not find ${fence} fence after ${heading}.`);
  }

  const blockStart = fenceStart + `\`\`\`${fence}`.length;
  const blockEnd = afterHeading.indexOf('```', blockStart);
  if (blockEnd === -1) {
    throw new Error(`Could not find closing fence after ${heading}.`);
  }

  return afterHeading.slice(blockStart, blockEnd).trim();
}

function fillPerPaperPrompt(template: string, item: CampaignItem) {
  return template
    .replace('[PUT LABEL HERE]', item.title)
    .replace('[PUT YEAR HERE]', String(item.year))
    .replace(
      '[PUT STREAM CODE HERE OR unknown]',
      item.streamCodes.length > 0 ? item.streamCodes.join(',') : 'unknown',
    )
    .replace('[PUT SUBJECT CODE HERE OR unknown]', item.subjectCode)
    .replace(
      '[normal / makeup / unknown]',
      item.sessionType === SessionType.NORMAL
        ? 'normal'
        : item.sessionType === SessionType.MAKEUP
          ? 'makeup'
          : 'unknown',
    )
    .replace('[PUT TITLE HERE]', item.title);
}

function extractResponseText(response: { candidates?: unknown }) {
  const candidates = Array.isArray(response.candidates)
    ? (response.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }>)
    : [];
  const firstCandidate = candidates[0];
  const parts = firstCandidate?.content?.parts ?? [];
  return parts
    .map((part) => part.text)
    .filter((text): text is string => typeof text === 'string')
    .join('')
    .trim();
}

async function readApiKey(repoRoot: string, apiKeyFile: string) {
  const candidatePaths = [
    path.resolve(process.cwd(), apiKeyFile),
    path.resolve(repoRoot, apiKeyFile),
  ];

  for (const candidatePath of candidatePaths) {
    if (!(await fileExists(candidatePath))) {
      continue;
    }

    const content = await fs.readFile(candidatePath, 'utf8');
    const key = content.match(/AIza[0-9A-Za-z_-]{20,}/)?.[0];
    if (key) {
      return key;
    }
  }

  const envKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (envKey?.trim()) {
    return envKey.trim();
  }

  throw new Error(`No Gemini API key found in ${apiKeyFile} or env.`);
}

async function findRepoRoot() {
  let current = process.cwd();

  for (;;) {
    if (
      (await fileExists(path.join(current, 'AGENTS.md'))) &&
      (await fileExists(path.join(current, 'apps/api/package.json')))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('Could not find repo root.');
    }
    current = parent;
  }
}

function resolveCampaignRoot(repoRoot: string, options: CliOptions) {
  return path.resolve(repoRoot, options.outputDir, options.campaignId);
}

function manifestPath(campaignRoot: string) {
  return path.join(campaignRoot, 'manifest.json');
}

async function readManifest(campaignRoot: string): Promise<CampaignManifest> {
  return JSON.parse(await fs.readFile(manifestPath(campaignRoot), 'utf8'));
}

async function writeManifest(
  campaignRoot: string,
  manifest: CampaignManifest,
) {
  await fs.mkdir(campaignRoot, { recursive: true });
  await writeJson(manifestPath(campaignRoot), manifest);
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sha256(content: string) {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(content).digest('hex');
}

function buildPaperTitle(year: number, subjectCode: string, familyCode: string) {
  return `BAC ${year} ${subjectCode} ${familyCode.toUpperCase()}`;
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    mode: 'status',
    campaignId: 'math-2024-normal-batch-001',
    year: 2024,
    subjectCode: 'MATHEMATICS',
    sessionType: SessionType.NORMAL,
    model: DEFAULT_MODEL,
    outputDir: DEFAULT_OUTPUT_DIR,
    apiKeyFile: DEFAULT_API_KEY_FILE,
    slugs: [],
    excludeSlugs: [],
    limit: null,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === '--help' || arg === '-h') && !next) {
      printHelpAndExit();
    }

    if (arg === '--mode' && next) {
      options.mode = parseMode(next);
      index += 1;
      continue;
    }

    if (arg === '--campaign-id' && next) {
      options.campaignId = next.trim();
      index += 1;
      continue;
    }

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

    if (arg === '--session-type' && next) {
      options.sessionType = parseSessionType(next);
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

    if (arg === '--exclude-slug' && next) {
      options.excludeSlugs.push(...parseListArgument(next));
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

    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return options;
}

function parseMode(value: string): Mode {
  if (
    value === 'prepare' ||
    value === 'submit' ||
    value === 'status' ||
    value === 'collect'
  ) {
    return value;
  }

  throw new Error(`Unsupported mode: ${value}`);
}

function parseSessionType(value: string): SessionType {
  const normalized = value.trim().toUpperCase();
  if (normalized === SessionType.NORMAL || normalized === SessionType.MAKEUP) {
    return normalized;
  }

  throw new Error(`Unsupported session type: ${value}`);
}

function parseListArgument(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function printHelpAndExit(): never {
  console.log(`Usage:
  npm run gemini:batch-source-extract -w @bac-bank/api -- --mode prepare --year 2024 --subject-code MATHEMATICS
  npm run gemini:batch-source-extract -w @bac-bank/api -- --mode submit --campaign-id math-2024-normal-batch-001
  npm run gemini:batch-source-extract -w @bac-bank/api -- --mode status --campaign-id math-2024-normal-batch-001
  npm run gemini:batch-source-extract -w @bac-bank/api -- --mode collect --campaign-id math-2024-normal-batch-001

Options:
  --campaign-id <id>        Durable local campaign id.
  --year <year>             Paper source year, default 2024.
  --subject-code <code>     Subject code, default MATHEMATICS.
  --session-type <type>     NORMAL or MAKEUP, default NORMAL.
  --model <model>           Gemini model, default ${DEFAULT_MODEL}.
  --slug <slug[,slug]>      Include only these paper source slugs.
  --exclude-slug <slug[,slug]> Exclude paper source slugs.
  --limit <n>               Limit selected paper sources.
  --output-dir <dir>        Default ${DEFAULT_OUTPUT_DIR}.
  --api-key-file <path>     Default ${DEFAULT_API_KEY_FILE}; file is preferred over env.
`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
