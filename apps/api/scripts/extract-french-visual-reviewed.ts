import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

type CliOptions = {
  slugs: string[];
  limit: number | null;
  model: string;
  outputDir: string;
  rawDir: string;
  maxOutputTokens: number;
  imageWidth: number;
  retries: number;
};

type SourceTarget = {
  slug: string;
  year: number;
  sessionType: string;
  familyCode: string;
  streamCodes: string[];
  examPages: SourcePageInput[];
  correctionPages: SourcePageInput[];
};

type SourcePageInput = {
  pageNumber: number;
  storageKey: string;
  width: number;
  height: number;
};

type VariantCode = 'SUJET_1' | 'SUJET_2';

const repoRoot = path.resolve(__dirname, '../../..');
const DEFAULT_MODEL = 'gemini-2.5-pro';
const DEFAULT_OUTPUT_DIR = 'extracted papers/french/reviewed';
const DEFAULT_RAW_DIR = 'tmp/french-visual-extraction';
const DEFAULT_MAX_OUTPUT_TOKENS = 65_536;
const DEFAULT_IMAGE_WIDTH = 1400;
const DEFAULT_RETRIES = 3;

const blockSchema = {
  type: 'object',
    properties: {
    id: { type: 'string' },
    role: {
      type: 'string',
      enum: ['PROMPT', 'SOLUTION', 'HINT', 'RUBRIC', 'META'],
    },
    type: {
      type: 'string',
      enum: ['paragraph', 'heading', 'latex', 'table', 'asset'],
    },
    value: { type: 'string' },
    data: {
      type: 'object',
      additionalProperties: true,
    },
    meta: {
      type: 'object',
      additionalProperties: true,
    },
  },
  required: ['id', 'role', 'type', 'value'],
  propertyOrdering: ['id', 'role', 'type', 'value', 'data', 'meta'],
};

const nodeSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    nodeType: {
      type: 'string',
      enum: ['CONTEXT', 'PART', 'QUESTION', 'SUBQUESTION', 'EXERCISE'],
    },
    parentId: {
      type: 'string',
    },
    orderIndex: {
      type: 'integer',
      minimum: 1,
    },
    label: {
      type: 'string',
    },
    maxPoints: {
      type: 'number',
    },
    topicCodes: {
      type: 'array',
      items: { type: 'string' },
    },
    blocks: {
      type: 'array',
      items: blockSchema,
    },
  },
  required: [
    'id',
    'nodeType',
    'orderIndex',
    'topicCodes',
    'blocks',
  ],
  propertyOrdering: [
    'id',
    'nodeType',
    'parentId',
    'orderIndex',
    'label',
    'maxPoints',
    'topicCodes',
    'blocks',
  ],
};

const reviewedExtractSchema = {
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
      required: [
        'title',
        'durationMinutes',
        'totalPoints',
        'sourceLanguage',
        'hasCorrection',
      ],
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
          title: { type: 'string' },
          nodes: {
            type: 'array',
            items: nodeSchema,
          },
        },
        required: ['code', 'title', 'nodes'],
        propertyOrdering: ['code', 'title', 'nodes'],
      },
    },
    assets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
      },
    },
    uncertainties: {
      type: 'array',
      items: { type: 'string' },
    },
    metadata: {
      type: 'object',
      additionalProperties: true,
    },
  },
  required: ['exam', 'variants', 'assets', 'uncertainties'],
  propertyOrdering: ['exam', 'variants', 'assets', 'uncertainties', 'metadata'],
};

const systemInstruction = [
  'You are extracting Algerian BAC French papers from official rendered page images.',
  'Use only the attached page images as visual evidence. Do not rely on OCR text layers or PDF text layers.',
  'Return strict JSON only. Do not wrap the response in Markdown or code fences.',
  'Stay source-faithful. Do not summarize, modernize, simplify, compress, or invent text.',
  'The EXAM images are the source of truth for passages, prompts, source lines, author attribution, footnotes, quotes, and section headings.',
  'The CORRECTION images are the source of truth for solutions, barème, point splits, and section totals.',
  'Extract both selectable variants: SUJET_1 and SUJET_2. Never drop a sujet.',
  'For each sujet, model the visible reading passage as one root CONTEXT node labelled "Texte". Preserve paragraph breaks, title, source line, author attribution, footnotes, quoted expressions, and unusual punctuation.',
  'Model comprehension as a root PART node. Preserve the visible French label such as "I. COMPREHENSION" or "I. Compréhension de l’écrit"; put the section total in maxPoints when visible.',
  'Model production écrite as a root PART node. Preserve the visible French label and put its section total in maxPoints when visible.',
  'Under production écrite, create exactly one QUESTION labelled "un sujet au choix" with maxPoints equal to the full production-writing score. Put both writing options inside that one question.',
  'Use QUESTION nodes for comprehension prompts and SUBQUESTION nodes only when the source clearly nests a subitem under a numbered question.',
  'Attach solution and rubric blocks to the most specific matching question. Keep official correction wording and point values faithful.',
  'Use paragraph blocks for ordinary prose, heading blocks only for visible short headings, latex blocks only for standalone formula-like lines, and table blocks for simple visible tables.',
  'For a table block, put a Markdown table in value and data.rows as an array of row arrays. French papers should usually have no assets.',
  'Use assets only for a real non-text visual. Do not create assets for ordinary passages, instructions, correction rubrics, or simple tables.',
  'All node ids and block ids must be stable ASCII ids. Use s1_ and s2_ prefixes.',
  'Before finalizing, compare the JSON back against every attached EXAM and CORRECTION page. Add a concrete uncertainty only for text that remains visually ambiguous after inspection.',
].join('\n');

async function main() {
  await loadEnvFile(path.join(repoRoot, 'apps/api/.env'));
  const options = parseCliOptions(process.argv.slice(2));
  const apiKey = readRequiredEnv('GEMINI_API_KEY');
  const prisma = new PrismaClient();
  const outputDir = path.resolve(repoRoot, options.outputDir);
  const rawDir = path.resolve(repoRoot, options.rawDir);

  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(rawDir, { recursive: true });

    const targets = await loadTargets(prisma, options);
    const results = [];

    for (const target of targets) {
      console.log(`extract ${target.slug}`);
      const reviewed = await extractTarget({
        apiKey,
    model: options.model,
    maxOutputTokens: options.maxOutputTokens,
    imageWidth: options.imageWidth,
    retries: options.retries,
    target,
    rawDir,
  });
      const normalized = normalizeReviewedExtract(reviewed, target, options.model);
      const outPath = path.join(outputDir, `${target.slug}.reviewed.json`);

      await fs.writeFile(
        `${outPath}.tmp`,
        `${JSON.stringify(normalized, null, 2)}\n`,
        'utf8',
      );
      await fs.rename(`${outPath}.tmp`, outPath);

      results.push({
        slug: target.slug,
        reviewedFile: path.relative(repoRoot, outPath),
        variants: normalized.variants.length,
        nodes: normalized.variants.reduce(
          (sum, variant) => sum + variant.nodes.length,
          0,
        ),
        uncertainties: normalized.uncertainties.length,
      });
    }

    console.log(JSON.stringify({ model: options.model, results }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

async function loadTargets(prisma: PrismaClient, options: CliOptions) {
  const sources = await prisma.paperSource.findMany({
    where: {
      subject: {
        code: 'FRENCH',
      },
      ...(options.slugs.length
        ? {
            slug: {
              in: options.slugs,
            },
          }
        : {
            ingestionJobs: {
              none: {
                status: 'PUBLISHED',
              },
            },
          }),
    },
    include: {
      streamMappings: {
        include: {
          stream: true,
        },
        orderBy: {
          stream: {
            code: 'asc',
          },
        },
      },
      sourceDocuments: {
        include: {
          pages: {
            orderBy: {
              pageNumber: 'asc',
            },
          },
        },
        orderBy: {
          kind: 'asc',
        },
      },
      ingestionJobs: {
        select: {
          status: true,
        },
      },
    },
    orderBy: [{ year: 'desc' }, { sessionType: 'asc' }, { familyCode: 'asc' }],
    ...(options.limit !== null ? { take: options.limit } : {}),
  });

  return sources
    .filter((source) =>
      options.slugs.length
        ? true
        : source.ingestionJobs.every((job) => job.status !== 'PUBLISHED'),
    )
    .map((source): SourceTarget => {
      const examDocument = source.sourceDocuments.find(
        (document) => document.kind === 'EXAM',
      );
      const correctionDocument = source.sourceDocuments.find(
        (document) => document.kind === 'CORRECTION',
      );

      if (!examDocument || !correctionDocument) {
        throw new Error(`${source.slug} is missing EXAM or CORRECTION document`);
      }

      if (!examDocument.pages.length || !correctionDocument.pages.length) {
        throw new Error(`${source.slug} is missing rendered source pages`);
      }

      return {
        slug: source.slug,
        year: source.year,
        sessionType: source.sessionType,
        familyCode: source.familyCode,
        streamCodes: source.streamMappings.map((mapping) => mapping.stream.code),
        examPages: examDocument.pages.map((page) => ({
          pageNumber: page.pageNumber,
          storageKey: page.storageKey,
          width: page.width,
          height: page.height,
        })),
        correctionPages: correctionDocument.pages.map((page) => ({
          pageNumber: page.pageNumber,
          storageKey: page.storageKey,
          width: page.width,
          height: page.height,
        })),
      };
    });
}

async function extractTarget(input: {
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  imageWidth: number;
  retries: number;
  target: SourceTarget;
  rawDir: string;
}) {
  const variantOutputs = [];
  const uncertainties: string[] = [];
  let exam: unknown = null;

  for (const variantCode of ['SUJET_1', 'SUJET_2'] as const) {
    const partial = await extractVariant({
      ...input,
      variantCode,
      examPages: selectExamPagesForVariant(input.target.examPages, variantCode),
      correctionPages: input.target.correctionPages,
    });
    exam ??= partial.exam;
    variantOutputs.push(
      ...readArray(partial.variants).filter((variant) => {
        const record = asRecord(variant);
        return record.code === variantCode;
      }),
    );
    uncertainties.push(
      ...readArray(partial.uncertainties)
        .map((entry) => readString(entry))
        .filter((entry): entry is string => Boolean(entry)),
    );
  }

  return {
    exam: asRecord(exam),
    variants: variantOutputs,
    assets: [],
    uncertainties,
  };
}

async function extractVariant(input: {
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  imageWidth: number;
  retries: number;
  target: SourceTarget;
  rawDir: string;
  variantCode: VariantCode;
  examPages: SourcePageInput[];
  correctionPages: SourcePageInput[];
}) {
  const variantLabel = input.variantCode.toLowerCase();
  const rawTextPath = path.join(
    input.rawDir,
    `${input.target.slug}.${variantLabel}.raw.json`,
  );
  const cachedRawText = await readFileIfExists(rawTextPath);
  if (cachedRawText.trim()) {
    return JSON.parse(stripJsonFences(cachedRawText)) as Record<string, unknown>;
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          { text: buildUserPrompt(input.target, input.variantCode) },
          ...(await buildImageParts(input.examPages, 'EXAM', input.imageWidth)),
          ...(await buildImageParts(
            input.correctionPages,
            'CORRECTION',
            input.imageWidth,
          )),
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: reviewedExtractSchema,
      temperature: 0,
      maxOutputTokens: input.maxOutputTokens,
    },
  };
  const requestPath = path.join(
    input.rawDir,
    `${input.target.slug}.${variantLabel}.request.json`,
  );
  const responsePath = path.join(
    input.rawDir,
    `${input.target.slug}.${variantLabel}.response.json`,
  );
  await fs.writeFile(requestPath, JSON.stringify(payload), 'utf8');

  const responseText = await postGeminiWithCurl({
    apiKey: input.apiKey,
    model: input.model,
    requestPath,
    responsePath,
    retries: input.retries,
    slug: input.target.slug,
  });

  const body = JSON.parse(responseText) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };
  const text =
    body.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim() ?? '';

  if (!text) {
    throw new Error(`${input.target.slug} produced an empty model response`);
  }

  await fs.writeFile(rawTextPath, `${text}\n`, 'utf8');

  return JSON.parse(stripJsonFences(text)) as Record<string, unknown>;
}

async function postGeminiWithCurl(input: {
  apiKey: string;
  model: string;
  requestPath: string;
  responsePath: string;
  retries: number;
  slug: string;
}) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= input.retries + 1; attempt += 1) {
    try {
      return await postGeminiWithCurlOnce(input);
    } catch (error) {
      lastError = error as Error;

      if (attempt > input.retries || !isRetryableGeminiFailure(lastError)) {
        throw lastError;
      }

      const delayMs = Math.min(90_000, 10_000 * attempt);
      console.error(
        `${input.slug} request failed transiently (${lastError.message.slice(0, 180)}); retrying in ${Math.round(delayMs / 1000)}s (${attempt}/${input.retries})`,
      );
      await delay(delayMs);
    }
  }

  throw lastError ?? new Error(`${input.slug} Gemini request failed`);
}

async function postGeminiWithCurlOnce(input: {
  apiKey: string;
  model: string;
  requestPath: string;
  responsePath: string;
  slug: string;
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
      `@${input.requestPath}`,
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
  const responseText = await readFileIfExists(input.responsePath);

  if (exitCode !== 0 || httpStatus < 200 || httpStatus >= 300) {
    throw new Error(
      `${input.slug} Gemini request failed status=${httpStatus || 'unknown'} exit=${exitCode}: ${(stderr || responseText).slice(0, 800)}`,
    );
  }

  return responseText;
}

function isRetryableGeminiFailure(error: Error) {
  return (
    /status=(429|500|502|503|504|unknown)/.test(error.message) ||
    /Connection reset|Recv failure|timed out|timeout/i.test(error.message)
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildImageParts(pages: SourcePageInput[], documentKind: string, width = DEFAULT_IMAGE_WIDTH) {
  const parts = [];

  for (const page of pages) {
    const filePath = path.join(repoRoot, 'output/r2-bac-assets', page.storageKey);
    const imageBuffer = await sharp(await fs.readFile(filePath))
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer();
    parts.push({
      text: `${documentKind} page ${page.pageNumber} (${page.width}x${page.height})`,
    });
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBuffer.toString('base64'),
      },
    });
  }

  return parts;
}

function selectExamPagesForVariant(pages: SourcePageInput[], code: VariantCode) {
  const midpoint = Math.ceil(pages.length / 2);
  return code === 'SUJET_1' ? pages.slice(0, midpoint) : pages.slice(midpoint);
}

function buildUserPrompt(target: SourceTarget, variantCode: VariantCode) {
  return [
    `Paper source slug: ${target.slug}`,
    `Year: ${target.year}`,
    `Session type: ${target.sessionType}`,
    `Family code: ${target.familyCode}`,
    `Stream codes: ${target.streamCodes.join(', ')}`,
    `Target variant code: ${variantCode}`,
    '',
    `Produce the reviewed extract JSON for ${variantCode} only.`,
    'Use direct draft graph variants[].nodes, not legacy exercises[].',
    'The variants array must contain exactly one variant and its code must match the target variant code.',
    'Required high-level shape:',
    '1. CONTEXT node for the passage.',
    '2. PART node for comprehension, with its comprehension questions underneath.',
    '3. PART node for production écrite, with exactly one child QUESTION labelled "un sujet au choix".',
    '',
    'Preserve all visible exam text and all correction/barème information. If a correction page contains a compact answer grid, convert it into source-faithful solution and rubric blocks on the matching questions.',
  ].join('\n');
}

function normalizeReviewedExtract(
  value: Record<string, unknown>,
  target: SourceTarget,
  model: string,
) {
  const variants = readArray(value.variants).map((variant, variantIndex) =>
    normalizeVariant(variant, variantIndex),
  );

  return {
    exam: {
      title: readString((value.exam as Record<string, unknown>)?.title)
        || `اختبار في مادة اللغة الفرنسية - بكالوريا ${target.year}`,
      durationMinutes:
        readNumber((value.exam as Record<string, unknown>)?.durationMinutes)
        ?? (target.familyCode === 'le' ? 210 : 150),
      totalPoints:
        readNumber((value.exam as Record<string, unknown>)?.totalPoints) ?? 20,
      sourceLanguage:
        readString((value.exam as Record<string, unknown>)?.sourceLanguage)
        || 'fr',
      hasCorrection:
        typeof (value.exam as Record<string, unknown>)?.hasCorrection ===
        'boolean'
          ? ((value.exam as Record<string, unknown>).hasCorrection as boolean)
          : true,
    },
    variants,
    assets: readArray(value.assets),
    uncertainties: readArray(value.uncertainties)
      .map((entry) => readString(entry))
      .filter((entry): entry is string => Boolean(entry)),
    metadata: {
      route: 'codex_direct_visual_page_extraction',
      model,
      sourcePages: {
        exam: target.examPages.map((page) => page.storageKey),
        correction: target.correctionPages.map((page) => page.storageKey),
      },
      notes:
        'Generated from canonical rendered source page images; French native text/table extraction; no OCR or PDF text-layer extraction.',
    },
  };
}

function normalizeVariant(value: unknown, variantIndex: number) {
  const record = asRecord(value);
  const code = record.code === 'SUJET_2' ? 'SUJET_2' : 'SUJET_1';
  const prefix = code === 'SUJET_2' ? 's2' : 's1';
  const nodes = readArray(record.nodes).map((node, nodeIndex) =>
    normalizeNode(node, `${prefix}_node_${nodeIndex + 1}`, nodeIndex + 1),
  );
  const nodeIds = new Set(nodes.map((node) => node.id));

  for (const node of nodes) {
    if (node.parentId && !nodeIds.has(node.parentId)) {
      node.parentId = null;
    }
  }
  repairCollapsedFrenchParts(nodes, prefix);
  repairQuestionPromptsStoredInLabels(nodes);
  repairOverpackedComprehensionQuestions(nodes, prefix);
  repairPartPromptsStoredAwayFromQuestions(nodes);
  renumberSiblingOrder(nodes);

  return {
    code,
    title:
      readString(record.title)
      || (code === 'SUJET_2' ? 'الموضوع الثاني' : 'الموضوع الأول'),
    nodes,
  };
}

function repairOverpackedComprehensionQuestions(
  nodes: Array<ReturnType<typeof normalizeNode>>,
  prefix: string,
) {
  const childrenByParent = new Map<string, Array<ReturnType<typeof normalizeNode>>>();

  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }

    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node);
    childrenByParent.set(node.parentId, children);
  }

  for (const part of nodes.filter((node) => node.nodeType === 'PART')) {
    if (!/compr/i.test(part.label ?? '')) {
      continue;
    }

    const children = childrenByParent.get(part.id) ?? [];
    const questions = children.filter((node) => node.nodeType === 'QUESTION');

    if (questions.length !== 1) {
      continue;
    }

    const [question] = questions;
    const promptBlock = question.blocks.find(
      (block) => block.role === 'PROMPT' && block.type === 'paragraph',
    );
    const promptChunks = splitNumberedLines(String(promptBlock?.value ?? ''));

    if (promptChunks.length < 2) {
      continue;
    }

    const solutionBlock = question.blocks.find(
      (block) => block.role === 'SOLUTION' && block.type === 'paragraph',
    );
    const solutionChunks = splitNumberedInline(String(solutionBlock?.value ?? ''));
    const carryBlocks = question.blocks.filter(
      (block) =>
        block.id !== promptBlock?.id &&
        block.id !== solutionBlock?.id,
    );
    const questionIndex = nodes.indexOf(question);

    if (questionIndex !== -1) {
      nodes.splice(questionIndex, 1);
    }

    for (const block of carryBlocks) {
      part.blocks.push(block);
    }

    promptChunks.forEach((prompt, index) => {
      const blocks: Array<ReturnType<typeof normalizeBlock>> = [
        {
          id: `${prefix}_split_q${index + 1}_prompt`,
          role: 'PROMPT',
          type: 'paragraph',
          value: prompt,
        },
      ];
      const solution = solutionChunks[index];

      if (solution) {
        blocks.push({
          id: `${prefix}_split_q${index + 1}_solution`,
          role: 'SOLUTION',
          type: 'paragraph',
          value: solution,
        });
      }

      nodes.push({
        id: `${prefix}_split_q${index + 1}`,
        nodeType: 'QUESTION',
        parentId: part.id,
        orderIndex: index + 1,
        label: `Question ${index + 1}`,
        maxPoints: null,
        topicCodes: [],
        blocks,
      });
    });
  }
}

function splitNumberedLines(value: string) {
  return splitAtNumberedMatches(value, /^\s*\d+\s*[\).:-]/gm);
}

function splitNumberedInline(value: string) {
  return splitAtNumberedMatches(value, /(?:^|\s)\d+\s*[\).:-]\s/gm);
}

function splitAtNumberedMatches(value: string, pattern: RegExp) {
  const matches = [...value.matchAll(pattern)];

  if (matches.length < 2) {
    return value.trim() ? [value.trim()] : [];
  }

  return matches
    .map((match, index) => {
      const start = match.index ?? 0;
      const end =
        index + 1 < matches.length
          ? matches[index + 1].index ?? value.length
          : value.length;
      return value.slice(start, end).trim();
    })
    .filter(Boolean);
}

function repairPartPromptsStoredAwayFromQuestions(
  nodes: Array<ReturnType<typeof normalizeNode>>,
) {
  const childrenByParent = new Map<string, Array<ReturnType<typeof normalizeNode>>>();

  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }

    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node);
    childrenByParent.set(node.parentId, children);
  }

  for (const part of nodes.filter((node) => node.nodeType === 'PART')) {
    const questions = (childrenByParent.get(part.id) ?? [])
      .filter((node) => node.nodeType === 'QUESTION')
      .sort((left, right) => left.orderIndex - right.orderIndex);

    if (!questions.length || !part.blocks.some((block) => block.role === 'PROMPT')) {
      continue;
    }

    if (/production/i.test(part.label ?? '')) {
      const choiceQuestion = questions.find((question) =>
        /un sujet au choix/i.test(question.label ?? ''),
      );

      if (choiceQuestion && !choiceQuestion.blocks.some((block) => block.role === 'PROMPT')) {
        choiceQuestion.blocks.unshift(...part.blocks.filter((block) => block.role === 'PROMPT'));
        part.blocks = part.blocks.filter((block) => block.role !== 'PROMPT');
      }

      continue;
    }

    if (!/compr/i.test(part.label ?? '')) {
      continue;
    }

    const promptBlock = part.blocks.find(
      (block) => block.role === 'PROMPT' && block.type === 'paragraph',
    );
    const promptChunks = splitNumberedLines(String(promptBlock?.value ?? ''));

    if (promptChunks.length < 2) {
      continue;
    }

    questions.forEach((question, index) => {
      if (question.blocks.some((block) => block.role === 'PROMPT')) {
        return;
      }

      const prompt = promptChunks[index];

      if (!prompt) {
        return;
      }

      question.blocks.unshift({
        id: `${question.id}_prompt_from_part`,
        role: 'PROMPT',
        type: 'paragraph',
        value: prompt,
      });
    });

    if (questions.every((question) => question.blocks.some((block) => block.role === 'PROMPT'))) {
      part.blocks = part.blocks.filter((block) => block.id !== promptBlock?.id);
    }
  }
}

function repairQuestionPromptsStoredInLabels(
  nodes: Array<ReturnType<typeof normalizeNode>>,
) {
  for (const node of nodes) {
    if (node.nodeType !== 'QUESTION') {
      continue;
    }

    if (node.blocks.some((block) => block.role === 'PROMPT')) {
      continue;
    }

    const questionNumber = readQuestionNumberFromLabel(node.label);

    if (questionNumber === null) {
      continue;
    }

    node.blocks.unshift({
      id: `${node.id}_prompt_from_label`,
      role: 'PROMPT',
      type: 'paragraph',
      value: node.label ?? `Question ${questionNumber}`,
    });
    node.label = `Question ${questionNumber}`;
  }
}

function readQuestionNumberFromLabel(label: string | null) {
  const match = label?.match(/^\s*(\d+)\s*[\).:-]/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function repairCollapsedFrenchParts(
  nodes: Array<ReturnType<typeof normalizeNode>>,
  prefix: string,
) {
  const childrenByParent = new Map<string, Array<ReturnType<typeof normalizeNode>>>();

  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }

    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node);
    childrenByParent.set(node.parentId, children);
  }

  for (const part of [...nodes]) {
    if (part.nodeType !== 'PART') {
      continue;
    }

    const childQuestions = (childrenByParent.get(part.id) ?? []).filter(
      (child) => child.nodeType === 'QUESTION',
    );

    if (childQuestions.length > 0 || part.blocks.length === 0) {
      continue;
    }

    if (/production/i.test(part.label ?? '')) {
      nodes.push({
        id: `${part.id}_choice`,
        nodeType: 'QUESTION',
        parentId: part.id,
        orderIndex: 1,
        label: 'un sujet au choix',
        maxPoints: part.maxPoints,
        topicCodes: [],
        blocks: part.blocks,
      });
      part.blocks = [];
      continue;
    }

    if (!/compr/i.test(part.label ?? '')) {
      continue;
    }

    const questions = splitCollapsedQuestionBlocks(part.blocks);

    if (questions.length < 2) {
      continue;
    }

    part.blocks = questions.leadingBlocks;
    questions.groups.forEach((blocks, index) => {
      nodes.push({
        id: `${prefix}_q${index + 1}`,
        nodeType: 'QUESTION',
        parentId: part.id,
        orderIndex: index + 1,
        label: `Question ${index + 1}`,
        maxPoints: null,
        topicCodes: [],
        blocks,
      });
    });
  }
}

function splitCollapsedQuestionBlocks(
  blocks: Array<ReturnType<typeof normalizeBlock>>,
) {
  const leadingBlocks: Array<ReturnType<typeof normalizeBlock>> = [];
  const groups: Array<Array<ReturnType<typeof normalizeBlock>>> = [];
  let currentGroup: Array<ReturnType<typeof normalizeBlock>> | null = null;

  for (const block of blocks) {
    if (isNumberedQuestionPrompt(block)) {
      currentGroup = [block];
      groups.push(currentGroup);
      continue;
    }

    if (currentGroup) {
      currentGroup.push(block);
    } else {
      leadingBlocks.push(block);
    }
  }

  return {
    leadingBlocks,
    groups,
  };
}

function isNumberedQuestionPrompt(
  block: ReturnType<typeof normalizeBlock>,
) {
  return (
    block.role === 'PROMPT' &&
    block.type === 'paragraph' &&
    /^\s*\d+\s*[\).:-]/.test(String(block.value ?? ''))
  );
}

function renumberSiblingOrder(
  nodes: Array<ReturnType<typeof normalizeNode>>,
) {
  const groups = new Map<string, Array<ReturnType<typeof normalizeNode>>>();

  for (const node of nodes) {
    const parentKey = node.parentId ?? 'ROOT';
    const siblings = groups.get(parentKey) ?? [];
    siblings.push(node);
    groups.set(parentKey, siblings);
  }

  for (const siblings of groups.values()) {
    siblings
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .forEach((node, index) => {
        node.orderIndex = index + 1;
      });
  }
}

function normalizeNode(value: unknown, fallbackId: string, fallbackOrder: number) {
  const record = asRecord(value);
  const id = normalizeId(readString(record.id) || fallbackId);

  return {
    id,
    nodeType: readNodeType(record.nodeType),
    parentId:
      typeof record.parentId === 'string' && record.parentId.trim()
        ? normalizeId(record.parentId)
        : null,
    orderIndex: readPositiveInteger(record.orderIndex, fallbackOrder),
    label: readString(record.label),
    maxPoints: readNumber(record.maxPoints),
    topicCodes: [],
    blocks: readArray(record.blocks).map((block, blockIndex) =>
      normalizeBlock(block, `${id}_block_${blockIndex + 1}`),
    ),
  };
}

function normalizeBlock(value: unknown, fallbackId: string) {
  const record = asRecord(value);
  const type = readBlockType(record.type);
  const block: Record<string, unknown> = {
    id: normalizeId(readString(record.id) || fallbackId),
    role: readBlockRole(record.role),
    type,
    value: readString(record.value) || '',
  };

  if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    block.data = record.data;
  }

  if (record.meta && typeof record.meta === 'object' && !Array.isArray(record.meta)) {
    block.meta = record.meta;
  }

  return block;
}

function readNodeType(value: unknown) {
  return value === 'PART' ||
    value === 'QUESTION' ||
    value === 'SUBQUESTION' ||
    value === 'EXERCISE'
    ? value
    : 'CONTEXT';
}

function readBlockRole(value: unknown) {
  return value === 'SOLUTION' ||
    value === 'HINT' ||
    value === 'RUBRIC' ||
    value === 'META'
    ? value
    : 'PROMPT';
}

function readBlockType(value: unknown) {
  return value === 'heading' ||
    value === 'latex' ||
    value === 'table' ||
    value === 'asset'
    ? value
    : 'paragraph';
}

function normalizeId(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readPositiveInteger(value: unknown, fallback: number) {
  const numberValue = readNumber(value);
  return numberValue !== null && Number.isInteger(numberValue) && numberValue >= 1
    ? numberValue
    : fallback;
}

function stripJsonFences(value: string) {
  return value
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
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

function parseCliOptions(argv: string[]) {
  const options: CliOptions = {
    slugs: [],
    limit: null,
    model: DEFAULT_MODEL,
    outputDir: DEFAULT_OUTPUT_DIR,
    rawDir: DEFAULT_RAW_DIR,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    imageWidth: DEFAULT_IMAGE_WIDTH,
    retries: DEFAULT_RETRIES,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--slug' && next) {
      options.slugs.push(...next.split(',').map((entry) => entry.trim()).filter(Boolean));
      index += 1;
      continue;
    }

    if (arg === '--limit' && next) {
      options.limit = Number.parseInt(next, 10);
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

    if (arg === '--raw-dir' && next) {
      options.rawDir = next;
      index += 1;
      continue;
    }

    if (arg === '--max-output-tokens' && next) {
      options.maxOutputTokens = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (arg === '--image-width' && next) {
      options.imageWidth = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (arg === '--retries' && next) {
      options.retries = Number.parseInt(next, 10);
      index += 1;
    }
  }

  return options;
}

function loadEnvFile(filePath: string) {
  return fs
    .readFile(filePath, 'utf8')
    .then((content) => {
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const separatorIndex = trimmed.indexOf('=');

        if (separatorIndex === -1) {
          continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, '');

        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    })
    .catch(() => undefined);
}

function readRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value?.trim()) {
    throw new Error(`${name} is required`);
  }

  return value.trim();
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
