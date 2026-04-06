import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {
  FileState,
  GoogleGenAI,
  createPartFromText,
  createPartFromUri,
} from '@google/genai';
import type {
  DraftAsset,
  DraftAssetNativeSuggestionType,
  DraftBlock,
  DraftBlockRole,
  DraftBlockType,
  DraftCropBox,
  DraftDocumentKind,
  DraftNode,
  DraftSourcePage,
  DraftVariant,
  IngestionDraft,
} from './ingestion.contract';

type GeminiStructuredBlock = {
  type: DraftBlockType | null;
  text: string;
  caption: string | null;
};

type GeminiStructuredQuestion = {
  orderIndex: number;
  label: string | null;
  title: string | null;
  maxPoints: number | null;
  promptBlocks: GeminiStructuredBlock[];
  solutionBlocks: GeminiStructuredBlock[];
  hintBlocks: GeminiStructuredBlock[];
  assetIds: string[];
};

type GeminiStructuredExercise = {
  orderIndex: number;
  title: string;
  maxPoints: number | null;
  contextBlocks: GeminiStructuredBlock[];
  assetIds: string[];
  questions: GeminiStructuredQuestion[];
};

type GeminiStructuredVariant = {
  code: 'SUJET_1' | 'SUJET_2';
  title: string;
  exercises: GeminiStructuredExercise[];
};

type GeminiStructuredAsset = {
  id: string;
  variantCode: 'SUJET_1' | 'SUJET_2' | null;
  exerciseOrderIndex: number;
  questionOrderIndex: number | null;
  documentKind: DraftDocumentKind;
  role: DraftBlockRole;
  classification: 'image' | 'table' | 'tree' | 'graph';
  pageNumber: number;
  label: string | null;
  caption: string | null;
  notes: string | null;
  native: {
    type: DraftAssetNativeSuggestionType;
    value: string;
    data: Record<string, unknown> | null;
    notes: string[];
  } | null;
};

type GeminiStructuredExam = {
  exam: {
    title: string | null;
    durationMinutes: number | null;
    totalPoints: number | null;
    sourceLanguage: string | null;
    hasCorrection: boolean | null;
  };
  variants: GeminiStructuredVariant[];
  assets: GeminiStructuredAsset[];
  uncertainties: string[];
};

type GeminiExtractionInput = {
  draft: IngestionDraft;
  label: string;
  model: string;
  maxOutputTokens: number;
  temperature: number;
  examDocument: {
    fileName: string;
    buffer: Buffer;
  };
  correctionDocument?: {
    fileName: string;
    buffer: Buffer;
  } | null;
};

type GeminiCropRecoveryMode = 'text' | 'table' | 'tree' | 'graph';

type GeminiCropRecoveryInput = {
  label: string;
  mode: GeminiCropRecoveryMode;
  model: string;
  maxOutputTokens: number;
  temperature: number;
  imageBuffer: Buffer;
  fileName: string;
  caption?: string | null;
  notes?: string | null;
};

export type GeminiCropRecoveryResult = {
  type: DraftBlockType;
  value: string;
  data: Record<string, unknown> | null;
  notes: string[];
};

type GeminiUsageSummary = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
  toolUsePromptTokenCount?: number;
};

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const DEFAULT_GEMINI_MAX_OUTPUT_TOKENS = 65535;
const DEFAULT_GEMINI_TEMPERATURE = 1.0;
const FILE_READY_TIMEOUT_MS = 120_000;
const FILE_READY_POLL_MS = 2_000;

const GEMINI_SYSTEM_INSTRUCTION = `
You extract structured Algerian BAC exam content from scanned exam and correction PDFs.

Return strict JSON only. Do not wrap the response in Markdown or code fences.
Stay faithful to the scanned pages. Do not summarize and do not invent missing text.

Extraction rules:
- Organize content by variant (SUJET_1 / SUJET_2), then by exercise, then by question.
- When the exam explicitly contains two variants/topics (for example "الموضوع الأول" and "الموضوع الثاني"), extract both variants in the same JSON response.
- Do not omit a second variant because of length, convenience, or a desire to simplify the response.
- Put statement text in contextBlocks or promptBlocks.
- Put correction text in solutionBlocks.
- Treat the correction PDF as the primary source of truth for solutionBlocks.
- Preserve correction content and ordering as closely as possible to the PDF. Do not rewrite away, compress, or omit correction text that is visibly present.
- Never drop visible exam or correction content just because it feels repetitive, obvious, or implied.
- Additions are allowed only as short clarifying bridges when the PDF gives a bare final result or an extremely compressed step, and those additions must remain clearly additive.
- Additive clarification must never replace, paraphrase away, or contradict visible PDF content.
- You may add short clarifying context only when it is necessary to make the extracted structure readable, but any additions must stay additive and must not replace or remove existing correction content.
- Keep order exactly as it appears in the PDFs.
- Use paragraph blocks for normal text.
- Use latex blocks only for standalone formulas or formula-heavy lines.
- Use heading blocks only for short headings.
- Preserve Arabic text and math notation as faithfully as possible. Inline math should stay inside $...$ when practical.
- Detect meaningful visual assets that matter for solving or understanding the exam: graphs, tables, trees, diagrams, and other images.
- For every asset, include the document kind (EXAM or CORRECTION) and the 1-based page number inside that document.
- Attach asset IDs to the nearest exercise or question using assetIds.
- When an asset is clearly a simple table or probability tree, include a native JSON draft for it in the asset.native field. Use asset.native.type = "table" with data.rows for tables, or asset.native.type = "tree" with data.kind = "probability_tree" and data.probabilityTree for trees.
- Return only SUJET_1 only when the PDF genuinely contains a single variant or when a second variant is truly absent or unreadable.
- If you are uncertain about wording, structure, or an asset mapping, keep the closest faithful result and explain the issue in uncertainties.
`.trim();

const GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['variants', 'assets', 'uncertainties'],
  properties: {
    exam: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        durationMinutes: { type: 'number' },
        totalPoints: { type: 'number' },
        sourceLanguage: { type: 'string' },
        hasCorrection: { type: 'boolean' },
      },
    },
    variants: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'title', 'exercises'],
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
              additionalProperties: false,
              required: [
                'orderIndex',
                'title',
                'contextBlocks',
                'assetIds',
                'questions',
              ],
              properties: {
                orderIndex: { type: 'integer', minimum: 1 },
                title: { type: 'string' },
                maxPoints: { type: 'number' },
                contextBlocks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['type', 'text'],
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['paragraph', 'latex', 'heading'],
                      },
                      text: { type: 'string' },
                      caption: { type: 'string' },
                    },
                  },
                },
                assetIds: {
                  type: 'array',
                  items: { type: 'string' },
                },
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: [
                      'orderIndex',
                      'promptBlocks',
                      'solutionBlocks',
                      'hintBlocks',
                      'assetIds',
                    ],
                    properties: {
                      orderIndex: { type: 'integer', minimum: 1 },
                      label: { type: 'string' },
                      title: { type: 'string' },
                      maxPoints: { type: 'number' },
                      promptBlocks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          required: ['type', 'text'],
                          properties: {
                            type: {
                              type: 'string',
                              enum: ['paragraph', 'latex', 'heading'],
                            },
                            text: { type: 'string' },
                            caption: { type: 'string' },
                          },
                        },
                      },
                      solutionBlocks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          required: ['type', 'text'],
                          properties: {
                            type: {
                              type: 'string',
                              enum: ['paragraph', 'latex', 'heading'],
                            },
                            text: { type: 'string' },
                            caption: { type: 'string' },
                          },
                        },
                      },
                      hintBlocks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          required: ['type', 'text'],
                          properties: {
                            type: {
                              type: 'string',
                              enum: ['paragraph', 'latex', 'heading'],
                            },
                            text: { type: 'string' },
                            caption: { type: 'string' },
                          },
                        },
                      },
                      assetIds: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    assets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'exerciseOrderIndex',
          'documentKind',
          'role',
          'classification',
          'pageNumber',
        ],
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
            enum: ['PROMPT', 'SOLUTION', 'HINT'],
          },
          classification: {
            type: 'string',
            enum: ['image', 'table', 'tree', 'graph'],
          },
          pageNumber: { type: 'integer', minimum: 1 },
          label: { type: 'string' },
          caption: { type: 'string' },
          notes: { type: 'string' },
          native: {
            type: 'object',
            additionalProperties: false,
            required: ['type'],
            properties: {
              type: {
                type: 'string',
                enum: ['table', 'tree'],
              },
              value: { type: 'string' },
              data: {
                type: 'object',
                additionalProperties: true,
              },
              notes: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    uncertainties: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

const GEMINI_CROP_RECOVERY_SYSTEM_INSTRUCTION = `
You recover faithful content from a cropped Algerian BAC exam image.

Return strict JSON only. Do not wrap the response in Markdown or code fences.
Stay as close as possible to the visible crop. Do not invent missing text.
If something is partially hidden or ambiguous, keep the closest faithful result and explain it in notes.
`.trim();

const GEMINI_CROP_RECOVERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'value', 'notes'],
  properties: {
    type: {
      type: 'string',
      enum: ['paragraph', 'latex', 'table', 'tree', 'graph'],
    },
    value: { type: 'string' },
    data: {
      type: 'object',
      additionalProperties: true,
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

export function hasGeminiApiKeyConfigured() {
  return Boolean(readGeminiApiKey());
}

export function readDefaultGeminiModel() {
  return (
    normalizeOptionalString(process.env.INGESTION_GEMINI_MODEL) ??
    normalizeOptionalString(process.env.GEMINI_MODEL) ??
    DEFAULT_GEMINI_MODEL
  );
}

export function readDefaultGeminiMaxOutputTokens() {
  const value =
    normalizeOptionalString(process.env.INGESTION_GEMINI_MAX_OUTPUT_TOKENS) ??
    normalizeOptionalString(process.env.GEMINI_MAX_OUTPUT_TOKENS);
  const parsed = value ? Number.parseInt(value, 10) : NaN;

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_GEMINI_MAX_OUTPUT_TOKENS;
}

export function readDefaultGeminiTemperature() {
  const value =
    normalizeOptionalString(process.env.INGESTION_GEMINI_TEMPERATURE) ??
    normalizeOptionalString(process.env.GEMINI_TEMPERATURE);
  const parsed = value ? Number.parseFloat(value) : NaN;

  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_GEMINI_TEMPERATURE;
}

export function hasGeminiExtraction(draft: IngestionDraft) {
  const metadata = asRecord(draft.exam.metadata);
  const extraction = asRecord(metadata?.extraction);

  return (
    extraction?.engine === 'gemini' &&
    draft.variants.some((variant) => variant.nodes.length > 0)
  );
}

export async function recoverBlockSuggestionFromGemini(
  input: GeminiCropRecoveryInput,
): Promise<GeminiCropRecoveryResult> {
  const apiKey = readGeminiApiKey();

  if (!apiKey) {
    throw new Error(
      'Gemini recovery requires GEMINI_API_KEY or GOOGLE_API_KEY.',
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bac-gemini-crop-'));
  const uploadedFiles: Array<{ name?: string | null }> = [];

  try {
    const imagePath = path.join(tempDir, sanitizeFileName(input.fileName));
    await fs.writeFile(imagePath, input.imageBuffer);

    const uploadedImage = await ai.files.upload({
      file: imagePath,
      config: {
        mimeType: 'image/png',
      },
    });
    uploadedFiles.push(uploadedImage);

    const readyImage = await waitForFileReady(ai, uploadedImage);
    const response = await ai.models.generateContent({
      model: input.model,
      contents: [
        createPartFromText(buildGeminiCropRecoveryPrompt(input)),
        createPartFromText('Cropped exam snippet image:'),
        createPartFromUri(
          readyImage.uri ?? '',
          readyImage.mimeType ?? 'image/png',
        ),
      ],
      config: {
        systemInstruction: GEMINI_CROP_RECOVERY_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseJsonSchema: GEMINI_CROP_RECOVERY_SCHEMA,
        temperature: input.temperature,
        maxOutputTokens: input.maxOutputTokens,
      },
    });

    const rawText = response.text?.trim();

    if (!rawText) {
      throw new Error(
        `Gemini returned an empty recovery response for ${input.label}.`,
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Gemini recovery returned invalid JSON for ${input.label}: ${error.message}`
          : `Gemini recovery returned invalid JSON for ${input.label}.`,
      );
    }

    return normalizeGeminiCropRecoveryResult(parsed, input.mode);
  } finally {
    await Promise.allSettled(
      uploadedFiles
        .map((file) => file.name)
        .filter((name): name is string => Boolean(name))
        .map((name) => ai.files.delete({ name })),
    );
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

export async function extractDraftWithGemini(
  input: GeminiExtractionInput,
): Promise<IngestionDraft> {
  const apiKey = readGeminiApiKey();

  if (!apiKey) {
    throw new Error(
      'Gemini extraction requires GEMINI_API_KEY or GOOGLE_API_KEY.',
    );
  }

  if (!input.draft.sourcePages.length) {
    throw new Error('Gemini extraction requires populated draft.sourcePages.');
  }

  const ai = new GoogleGenAI({
    apiKey,
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bac-gemini-'));
  const uploadedFiles: Array<{ name?: string | null }> = [];

  try {
    const examPath = path.join(
      tempDir,
      sanitizeFileName(input.examDocument.fileName),
    );
    await fs.writeFile(examPath, input.examDocument.buffer);

    const uploadedExam = await ai.files.upload({
      file: examPath,
      config: {
        mimeType: 'application/pdf',
      },
    });
    uploadedFiles.push(uploadedExam);

    const readyExam = await waitForFileReady(ai, uploadedExam);
    const promptParts = [
      createPartFromText(buildGeminiPrompt(input.draft, input.label)),
      createPartFromText('Exam subject PDF (statement):'),
      createPartFromUri(
        readyExam.uri ?? '',
        readyExam.mimeType ?? 'application/pdf',
      ),
    ];

    if (input.correctionDocument) {
      const correctionPath = path.join(
        tempDir,
        sanitizeFileName(input.correctionDocument.fileName),
      );
      await fs.writeFile(correctionPath, input.correctionDocument.buffer);

      const uploadedCorrection = await ai.files.upload({
        file: correctionPath,
        config: {
          mimeType: 'application/pdf',
        },
      });
      uploadedFiles.push(uploadedCorrection);

      const readyCorrection = await waitForFileReady(ai, uploadedCorrection);
      promptParts.push(
        createPartFromText('Official correction PDF:'),
        createPartFromUri(
          readyCorrection.uri ?? '',
          readyCorrection.mimeType ?? 'application/pdf',
        ),
      );
    } else {
      promptParts.push(
        createPartFromText(
          'No correction PDF was provided. Keep solutionBlocks empty unless the exam PDF itself contains corrections.',
        ),
      );
    }

    const response = await ai.models.generateContent({
      model: input.model,
      contents: promptParts,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseJsonSchema: GEMINI_RESPONSE_SCHEMA,
        temperature: input.temperature,
        maxOutputTokens: input.maxOutputTokens,
      },
    });

    const rawText = response.text?.trim();

    if (!rawText) {
      throw new Error(
        `Gemini returned an empty structured response for ${input.label}.`,
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      throw new Error(
        `Gemini returned invalid JSON for ${input.label}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const structured = normalizeGeminiStructuredExam(parsed);

    if (!structured.variants.length) {
      throw new Error(`Gemini did not return any variants for ${input.label}.`);
    }

    return mergeGeminiExtractionIntoDraft(input.draft, structured, {
      model: input.model,
      modelVersion: response.modelVersion ?? null,
      responseId: response.responseId ?? null,
      usage: summarizeUsageMetadata(response.usageMetadata),
    });
  } finally {
    await Promise.allSettled(
      uploadedFiles
        .map((file) => file.name)
        .filter((name): name is string => Boolean(name))
        .map((name) => ai.files.delete({ name })),
    );
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

function mergeGeminiExtractionIntoDraft(
  draft: IngestionDraft,
  structured: GeminiStructuredExam,
  metadata: {
    model: string;
    modelVersion: string | null;
    responseId: string | null;
    usage: GeminiUsageSummary | null;
  },
) {
  if (structured.exam.title) {
    draft.exam.title = structured.exam.title;
  }

  const uncertainties = [...structured.uncertainties];
  const assetMap = new Map<string, DraftAsset>();
  const sourcePageMap = new Map<string, DraftSourcePage>(
    draft.sourcePages.map((page) => [
      toSourcePageKey(page.documentKind, page.pageNumber),
      page,
    ]),
  );

  draft.assets = [];

  for (const asset of structured.assets) {
    const sourcePage = sourcePageMap.get(
      toSourcePageKey(asset.documentKind, asset.pageNumber),
    );

    if (!sourcePage) {
      uncertainties.push(
        `Asset ${asset.id} references missing ${asset.documentKind} page ${asset.pageNumber}.`,
      );
      continue;
    }

    const draftAsset: DraftAsset = {
      id: asset.id,
      sourcePageId: sourcePage.id,
      documentKind: asset.documentKind,
      pageNumber: asset.pageNumber,
      variantCode: asset.variantCode,
      role: asset.role,
      classification: asset.classification,
      cropBox: fullPageCrop(sourcePage),
      label: asset.label,
      notes: joinNotes(
        asset.notes,
        'Auto-generated full-page crop. Review and tighten this crop before publication.',
      ),
      nativeSuggestion: asset.native
        ? {
            type: asset.native.type,
            value: asset.native.value,
            data: asset.native.data,
            status: 'suggested',
            source: 'gemini_initial',
            notes: asset.native.notes,
          }
        : null,
    };

    assetMap.set(draftAsset.id, draftAsset);
    draft.assets.push(draftAsset);
  }

  draft.variants = structured.variants.map((variant) =>
    buildDraftVariantFromGemini(variant, assetMap, uncertainties),
  );

  const exerciseCount = draft.variants.reduce(
    (sum, variant) =>
      sum +
      variant.nodes.filter(
        (node) => node.nodeType === 'EXERCISE' && node.parentId === null,
      ).length,
    0,
  );
  const questionCount = draft.variants.reduce(
    (sum, variant) =>
      sum +
      variant.nodes.filter(
        (node) =>
          node.nodeType === 'QUESTION' || node.nodeType === 'SUBQUESTION',
      ).length,
    0,
  );

  draft.exam.metadata = {
    ...draft.exam.metadata,
    ...(structured.exam.durationMinutes !== null
      ? { durationMinutes: structured.exam.durationMinutes }
      : {}),
    ...(structured.exam.totalPoints !== null
      ? { totalPoints: structured.exam.totalPoints }
      : {}),
    ...(structured.exam.sourceLanguage
      ? { sourceLanguage: structured.exam.sourceLanguage }
      : {}),
    ...(structured.exam.hasCorrection !== null
      ? { hasCorrection: structured.exam.hasCorrection }
      : {}),
    extraction: {
      engine: 'gemini',
      backend: 'gemini',
      model: metadata.model,
      modelVersion: metadata.modelVersion,
      responseId: metadata.responseId,
      variantCount: draft.variants.filter((variant) => variant.nodes.length > 0)
        .length,
      exerciseCount,
      questionCount,
      assetCount: draft.assets.length,
      sourcePageCount: draft.sourcePages.length,
      uncertainties,
      needsHumanReview: [
        'metadata',
        'exercise-boundaries',
        'question-boundaries',
        'math-normalization',
        'asset-page-mapping',
        'crop-boxes',
      ],
      ...(metadata.usage ? { usage: metadata.usage } : {}),
    },
  };

  return draft;
}

function buildDraftVariantFromGemini(
  variant: GeminiStructuredVariant,
  assetMap: Map<string, DraftAsset>,
  uncertainties: string[],
): DraftVariant {
  const nodes: DraftNode[] = [];

  for (const exercise of [...variant.exercises].sort(
    (left, right) => left.orderIndex - right.orderIndex,
  )) {
    const exerciseId = randomUUID();
    nodes.push({
      id: exerciseId,
      nodeType: 'EXERCISE',
      parentId: null,
      orderIndex: exercise.orderIndex,
      label: exercise.title,
      maxPoints: exercise.maxPoints,
      topicCodes: [],
      blocks: [
        ...toDraftTextBlocks(exercise.contextBlocks, 'PROMPT'),
        ...toDraftAssetBlocks(
          exercise.assetIds,
          assetMap,
          'PROMPT',
          uncertainties,
        ),
      ],
    });

    for (const question of [...exercise.questions].sort(
      (left, right) => left.orderIndex - right.orderIndex,
    )) {
      nodes.push({
        id: randomUUID(),
        nodeType: 'QUESTION',
        parentId: exerciseId,
        orderIndex: question.orderIndex,
        label: question.label ?? question.title,
        maxPoints: question.maxPoints,
        topicCodes: [],
        blocks: [
          ...toDraftTextBlocks(question.promptBlocks, 'PROMPT'),
          ...toDraftAssetBlocks(
            question.assetIds,
            assetMap,
            'PROMPT',
            uncertainties,
          ),
          ...toDraftTextBlocks(question.solutionBlocks, 'SOLUTION'),
          ...toDraftAssetBlocks(
            question.assetIds,
            assetMap,
            'SOLUTION',
            uncertainties,
          ),
          ...toDraftTextBlocks(question.hintBlocks, 'HINT'),
          ...toDraftAssetBlocks(
            question.assetIds,
            assetMap,
            'HINT',
            uncertainties,
          ),
        ],
      });
    }
  }

  return {
    code: variant.code,
    title: variant.title,
    nodes,
  };
}

function toDraftTextBlocks(
  blocks: GeminiStructuredBlock[],
  role: DraftBlockRole,
): DraftBlock[] {
  return blocks
    .filter((block) => block.text.trim().length > 0)
    .map((block) => ({
      id: randomUUID(),
      role,
      type: block.type ?? 'paragraph',
      value: block.text.trim(),
    }));
}

function toDraftAssetBlocks(
  assetIds: string[],
  assetMap: Map<string, DraftAsset>,
  role: DraftBlockRole,
  uncertainties: string[],
): DraftBlock[] {
  const blocks: DraftBlock[] = [];

  for (const assetId of assetIds) {
    const asset = assetMap.get(assetId);

    if (!asset) {
      uncertainties.push(`Asset reference ${assetId} could not be resolved.`);
      continue;
    }

    if (asset.role !== role) {
      continue;
    }

    const nativeSuggestion =
      asset.nativeSuggestion && asset.nativeSuggestion.status !== 'stale'
        ? asset.nativeSuggestion
        : null;
    const blockType =
      nativeSuggestion?.type ??
      (asset.classification === 'table' ? 'table' : 'image');

    blocks.push({
      id: randomUUID(),
      role,
      type: blockType,
      value: nativeSuggestion?.value ?? '',
      assetId: asset.id,
      ...(nativeSuggestion
        ? {
            data: nativeSuggestion.data,
          }
        : {}),
    });
  }

  return blocks;
}

function buildGeminiCropRecoveryPrompt(input: GeminiCropRecoveryInput) {
  const parts = [`Label: ${input.label}`, `Recovery mode: ${input.mode}`];

  if (input.mode === 'text') {
    parts.push(
      'Recover the visible snippet as faithful readable text. Preserve formulas accurately. Use type "paragraph" for prose, labels, and mixed text, and use type "latex" when the crop is best represented as a standalone formula or a formula-heavy line. Keep inline math inside $...$ when practical, and prefer valid LaTeX whenever math notation needs it.',
    );
  } else if (input.mode === 'table') {
    parts.push(
      'Recover the crop as a native table. Return type "table" and put structured rows in data.rows as a 2D array of strings. Use value for any short fallback text or title.',
    );
  } else if (input.mode === 'tree') {
    parts.push(
      'Recover the crop as a native probability tree. Return type "tree" and put data.kind = "probability_tree" plus data.probabilityTree with direction and a recursive root/children structure.',
    );
  } else if (input.mode === 'graph') {
    parts.push(
      'Recover the crop as a native formula graph when possible. Return type "graph" and put data.kind = "formula_graph" plus data.formulaGraph with any identifiable title, domains, and curves.',
    );
  }

  if (input.caption) {
    parts.push(`Existing caption hint: ${input.caption}`);
  }

  if (input.notes) {
    parts.push(`Reviewer notes: ${input.notes}`);
  }

  parts.push(
    'Only describe what is visible in the crop. If the crop is incomplete, keep the best faithful result and mention the uncertainty in notes.',
  );

  return parts.join('\n');
}

function normalizeGeminiCropRecoveryResult(
  value: unknown,
  mode: GeminiCropRecoveryMode,
): GeminiCropRecoveryResult {
  const raw = asRecord(value);

  if (!raw) {
    throw new Error('Gemini crop recovery response must be a JSON object.');
  }

  const suggestedType = normalizeRecoveredBlockType(raw.type, mode);
  const notes = Array.isArray(raw.notes)
    ? raw.notes
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    : [];

  return {
    type: suggestedType,
    value: normalizeOptionalString(raw.value) ?? '',
    data: asRecord(raw.data),
    notes,
  };
}

function normalizeRecoveredBlockType(
  value: unknown,
  mode: GeminiCropRecoveryMode,
): DraftBlockType {
  if (mode === 'table') {
    return 'table';
  }

  if (mode === 'tree') {
    return 'tree';
  }

  if (mode === 'graph') {
    return 'graph';
  }

  return value === 'latex' ? 'latex' : 'paragraph';
}

function normalizeGeminiStructuredExam(value: unknown): GeminiStructuredExam {
  const raw = asRecord(value) ?? {};
  const examRaw = asRecord(raw.exam) ?? {};

  return {
    exam: {
      title: normalizeOptionalString(examRaw.title),
      durationMinutes: readFiniteNumber(examRaw.durationMinutes),
      totalPoints: readFiniteNumber(examRaw.totalPoints),
      sourceLanguage: normalizeOptionalString(examRaw.sourceLanguage),
      hasCorrection:
        typeof examRaw.hasCorrection === 'boolean'
          ? examRaw.hasCorrection
          : null,
    },
    variants: normalizeGeminiVariants(raw.variants),
    assets: normalizeGeminiAssets(raw.assets),
    uncertainties: normalizeStringArray(raw.uncertainties),
  };
}

function normalizeGeminiVariants(value: unknown): GeminiStructuredVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeGeminiVariant(entry, index))
    .filter((entry): entry is GeminiStructuredVariant => Boolean(entry))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function normalizeGeminiVariant(
  value: unknown,
  fallbackIndex: number,
): GeminiStructuredVariant | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  const code =
    raw.code === 'SUJET_2'
      ? 'SUJET_2'
      : raw.code === 'SUJET_1'
        ? 'SUJET_1'
        : null;

  if (!code) {
    return null;
  }

  return {
    code,
    title:
      normalizeOptionalString(raw.title) ??
      (fallbackIndex === 1 ? 'الموضوع الثاني' : 'الموضوع الأول'),
    exercises: normalizeGeminiExercises(raw.exercises),
  };
}

function normalizeGeminiExercises(value: unknown): GeminiStructuredExercise[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeGeminiExercise(entry, index))
    .filter((entry): entry is GeminiStructuredExercise => Boolean(entry))
    .sort((left, right) => left.orderIndex - right.orderIndex);
}

function normalizeGeminiExercise(
  value: unknown,
  fallbackIndex: number,
): GeminiStructuredExercise | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  return {
    orderIndex: readPositiveInteger(raw.orderIndex) ?? fallbackIndex + 1,
    title: normalizeOptionalString(raw.title) ?? `التمرين ${fallbackIndex + 1}`,
    maxPoints: readFiniteNumber(raw.maxPoints),
    contextBlocks: normalizeGeminiBlocks(raw.contextBlocks),
    assetIds: normalizeStringArray(raw.assetIds),
    questions: normalizeGeminiQuestions(raw.questions),
  };
}

function normalizeGeminiQuestions(value: unknown): GeminiStructuredQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeGeminiQuestion(entry, index))
    .filter((entry): entry is GeminiStructuredQuestion => Boolean(entry))
    .sort((left, right) => left.orderIndex - right.orderIndex);
}

function normalizeGeminiQuestion(
  value: unknown,
  fallbackIndex: number,
): GeminiStructuredQuestion | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  return {
    orderIndex: readPositiveInteger(raw.orderIndex) ?? fallbackIndex + 1,
    label: normalizeOptionalString(raw.label),
    title: normalizeOptionalString(raw.title),
    maxPoints: readFiniteNumber(raw.maxPoints),
    promptBlocks: normalizeGeminiBlocks(raw.promptBlocks),
    solutionBlocks: normalizeGeminiBlocks(raw.solutionBlocks),
    hintBlocks: normalizeGeminiBlocks(raw.hintBlocks),
    assetIds: normalizeStringArray(raw.assetIds),
  };
}

function normalizeGeminiBlocks(value: unknown): GeminiStructuredBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeGeminiBlock(entry))
    .filter((entry): entry is GeminiStructuredBlock => Boolean(entry));
}

function normalizeGeminiBlock(value: unknown): GeminiStructuredBlock | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  const type = normalizeBlockType(raw.type);
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';

  if (!type || !text) {
    return null;
  }

  return {
    type,
    text,
    caption: normalizeOptionalString(raw.caption),
  };
}

function normalizeGeminiAssets(value: unknown): GeminiStructuredAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeGeminiAsset(entry))
    .filter((entry): entry is GeminiStructuredAsset => Boolean(entry));
}

function normalizeGeminiAsset(value: unknown): GeminiStructuredAsset | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  const id = normalizeOptionalString(raw.id);
  const documentKind =
    raw.documentKind === 'CORRECTION'
      ? 'CORRECTION'
      : raw.documentKind === 'EXAM'
        ? 'EXAM'
        : null;
  const role = normalizeBlockRole(raw.role);
  const classification = normalizeAssetClassification(raw.classification);
  const pageNumber = readPositiveInteger(raw.pageNumber);

  if (!id || !documentKind || !role || !classification || pageNumber === null) {
    return null;
  }

  return {
    id,
    variantCode:
      raw.variantCode === 'SUJET_1' || raw.variantCode === 'SUJET_2'
        ? raw.variantCode
        : null,
    exerciseOrderIndex: readPositiveInteger(raw.exerciseOrderIndex) ?? 1,
    questionOrderIndex: readPositiveInteger(raw.questionOrderIndex),
    documentKind,
    role,
    classification,
    pageNumber,
    label: normalizeOptionalString(raw.label),
    caption: normalizeOptionalString(raw.caption),
    notes: normalizeOptionalString(raw.notes),
    native: normalizeGeminiNativeAssetPayload(raw.native, classification),
  };
}

function normalizeGeminiNativeAssetPayload(
  value: unknown,
  classification: GeminiStructuredAsset['classification'],
): GeminiStructuredAsset['native'] {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  const type = raw.type === 'table' || raw.type === 'tree' ? raw.type : null;

  if (!type) {
    return null;
  }

  if (
    (type === 'table' && classification !== 'table') ||
    (type === 'tree' && classification !== 'tree')
  ) {
    return null;
  }

  return {
    type: type as DraftAssetNativeSuggestionType,
    value: normalizeOptionalString(raw.value) ?? '',
    data: asRecord(raw.data),
    notes: normalizeStringArray(raw.notes),
  };
}

function normalizeAssetClassification(
  value: unknown,
): GeminiStructuredAsset['classification'] | null {
  if (
    value === 'image' ||
    value === 'table' ||
    value === 'tree' ||
    value === 'graph'
  ) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.includes('table')) {
    return 'table';
  }

  if (normalized.includes('tree')) {
    return 'tree';
  }

  if (normalized.includes('graph')) {
    return 'graph';
  }

  return normalized.length > 0 ? 'image' : null;
}

function normalizeBlockType(value: unknown): DraftBlockType | null {
  if (value === 'latex' || value === 'heading' || value === 'paragraph') {
    return value;
  }

  return null;
}

function normalizeBlockRole(value: unknown): DraftBlockRole | null {
  if (value === 'PROMPT' || value === 'SOLUTION' || value === 'HINT') {
    return value;
  }

  return null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function readFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPositiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function summarizeUsageMetadata(value: unknown): GeminiUsageSummary | null {
  const raw = asRecord(value);

  if (!raw) {
    return null;
  }

  const summary: GeminiUsageSummary = {};

  for (const key of [
    'promptTokenCount',
    'candidatesTokenCount',
    'totalTokenCount',
    'thoughtsTokenCount',
    'cachedContentTokenCount',
    'toolUsePromptTokenCount',
  ] as const) {
    const candidate = raw[key];

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      summary[key] = candidate;
    }
  }

  return Object.keys(summary).length > 0 ? summary : null;
}

function buildGeminiPrompt(draft: IngestionDraft, label: string) {
  return [
    `Extract the attached BAC exam and correction into structured JSON for ingestion.`,
    `Current label: ${label}`,
    `Known year: ${draft.exam.year}`,
    `Current inferred stream code: ${draft.exam.streamCode ?? 'unknown'}`,
    `Current inferred subject code: ${draft.exam.subjectCode ?? 'unknown'}`,
    `Current session type: ${draft.exam.sessionType}`,
    `Current title: ${draft.exam.title}`,
    `Return exercises and questions exactly in order.`,
    `For solutionBlocks, stay especially faithful to the correction PDF.`,
    `Do not drop, compress, or silently rewrite visible correction content.`,
    `You may add only minimal clarifying context when the PDF gives a bare result or a very compressed step, and that clarification must remain additive.`,
    `Use assetIds to connect assets to the nearest exercise or question.`,
    `Page numbers for assets must be 1-based within the referenced EXAM or CORRECTION document.`,
    `Do not invent crop boxes. The review UI will handle crops later.`,
    `If a field is unknown, omit it instead of guessing.`,
  ].join('\n');
}

async function waitForFileReady(
  ai: GoogleGenAI,
  uploadedFile: {
    name?: string | null;
    state?: FileState | null;
    uri?: string | null;
    mimeType?: string | null;
  },
) {
  if (!uploadedFile.name) {
    throw new Error('Uploaded Gemini file is missing a file name.');
  }

  const startedAt = Date.now();
  let current = uploadedFile;

  while (
    !current.state ||
    current.state === FileState.PROCESSING ||
    current.state === FileState.STATE_UNSPECIFIED
  ) {
    if (Date.now() - startedAt > FILE_READY_TIMEOUT_MS) {
      throw new Error(
        `Timed out waiting for Gemini file ${uploadedFile.name} to become ACTIVE.`,
      );
    }

    await sleep(FILE_READY_POLL_MS);
    current = await ai.files.get({
      name: uploadedFile.name,
    });
  }

  if (current.state === FileState.FAILED) {
    throw new Error(`Gemini file ${uploadedFile.name} failed to process.`);
  }

  if (!current.uri) {
    throw new Error(
      `Gemini file ${uploadedFile.name} became active without a URI.`,
    );
  }

  return current;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^A-Za-z0-9._-]+/g, '-');
}

function fullPageCrop(page: DraftSourcePage): DraftCropBox {
  return {
    x: 0,
    y: 0,
    width: page.width,
    height: page.height,
  };
}

function toSourcePageKey(documentKind: DraftDocumentKind, pageNumber: number) {
  return `${documentKind}:${pageNumber}`;
}

function joinNotes(...values: Array<string | null | undefined>) {
  const notes = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  return notes.length > 0 ? notes.join(' ') : null;
}

function readGeminiApiKey() {
  return (
    normalizeOptionalString(process.env.GEMINI_API_KEY) ??
    normalizeOptionalString(process.env.GOOGLE_API_KEY)
  );
}
