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
import {
  detectPartMarkerFromLabel,
  inferPointsFromTextBlocks,
  normalizeExerciseLabel,
  questionLabelForIndex,
  splitLeadingQuestionMarker,
  splitLeadingSubquestionMarker,
  splitLeadingPartContextBlocks,
  splitTextAtSubquestionMarkerLine,
  splitTextAtPartMarkerLine,
  subquestionLabelForLetter,
  type DetectedPartMarker,
  type DetectedSubquestionMarker,
} from './ingestion-part-normalization';

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
  rubricBlocks: GeminiStructuredBlock[];
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
  correctionDocument: {
    fileName: string;
    buffer: Buffer;
  };
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
Stay maximally faithful to the scanned pages. Do not summarize, compress, simplify, or invent missing text.

Extraction rules:
- Organize content by variant (SUJET_1 / SUJET_2), then by exercise, then by exercise part when present, then by numbered question, then by lettered subquestion when present.
- When the exam explicitly contains two variants/topics (for example "الموضوع الأول" and "الموضوع الثاني"), extract both variants in the same JSON response.
- Do not omit a second variant because of length, convenience, or a desire to simplify the response.
- Treat leading Roman section labels inside an exercise, such as I, II, III, and so on, as named part boundaries equivalent to "الجزء الأول", "الجزء الثاني", "الجزء الثالث", and so on.
- Preserve those Roman part markers at the start of the nearest contextBlocks or promptBlocks text so draft normalization can create PART nodes instead of flattening the exercise.
- Preserve visible numbered question markers such as 1), 2-, and 3. at the start of the nearest promptBlocks text so draft normalization can create QUESTION nodes.
- Preserve visible Arabic-letter subquestion markers such as أ), ب), جـ), and د) at the start of the nearest promptBlocks text so draft normalization can create SUBQUESTION nodes under the active numbered question.
- The attached exam PDF and correction PDF are both authoritative source documents for this response.
- Never drop visible content from the exam PDF.
- Never drop visible content from the correction PDF.
- If text, formulas, numbered items, answer conditions, notes, tables, diagrams, graphs, or correction steps are visibly present in the PDFs, they must appear somewhere in the JSON in the correct nearby exercise/question and in the same relative order.
- Do not silently merge separate visible items into a shorter paraphrase.
- Put statement text in contextBlocks or promptBlocks.
- Put correction text in solutionBlocks.
- Put visible grading rules, scoring notes, barème details, and point distributions from the correction PDF in rubricBlocks for the matching question.
- Map rubric details to the most specific matching question whenever possible.
- Preserve exact point values and score splits from the correction PDF, including values such as 0.25, 0.5, 0.75, 1, and any visible breakdown across sub-steps or sub-parts.
- Do not round, simplify, merge, or reinterpret rubric allocations.
- Treat the exam PDF as the source of truth for contextBlocks and promptBlocks.
- Treat the correction PDF as the primary source of truth for solutionBlocks and rubricBlocks.
- Preserve exam content and ordering as closely as possible to the PDF. Do not rewrite away, compress, or omit exam text that is visibly present.
- Preserve correction content and ordering as closely as possible to the PDF. Do not rewrite away, compress, or omit correction text that is visibly present.
- Never drop visible exam or correction content just because it feels repetitive, obvious, implied, or low-value.
- Do not add new content to the exam statement beyond minimal connective wording required to fit the JSON structure.
- For corrections, additions are allowed only as short clarifying bridges when the PDF gives a bare final result or an extremely compressed step, and those additions must remain clearly additive.
- Additive clarification in corrections must never replace, paraphrase away, or contradict visible PDF content.
- Any clarifying addition in corrections must be shorter than the preserved source content around it and must not remove any visible correction step.
- Keep order exactly as it appears in the PDFs.
- Use paragraph blocks for normal text and for mixed prose plus inline notation.
- Use latex blocks for standalone formulas, equations, reactions, or other formula-heavy lines.
- Use heading blocks for short visible headings or labels when the PDF clearly separates them, such as ملاحظة, تعليل, استنتاج, or similar short cues.
- Preserve Arabic text and scientific/math notation as faithfully as possible.
- When prose contains meaningful notation, keep it inline inside paragraph blocks using $...$ when practical.
- Prefer valid LaTeX for notation whose meaning depends on formatting, including subscripts, superscripts, charges, exponents, scientific notation, indexed variables, pH expressions, chemical formulas, and units with powers such as $mm^3$, $Ca^{2+}$, $Cl^-$, $CO_2$, or $10^{-3}$.
- Clean obvious OCR whitespace and punctuation issues when that improves readability without changing meaning.
- Do not force every plain number, ordinary unit, or plain scientific name into LaTeX when normal paragraph text is clearer.
- When useful, you may add short student-facing hintBlocks for a question before the official answer. These hints must be brief, non-spoiling, and derived from the visible question and correction. Hints are optional additive guidance and must never replace, remove, or weaken any official solution content.
- Prefer rubricBlocks for point allocation text instead of mixing that content into hintBlocks.
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
                      'rubricBlocks',
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
                      rubricBlocks: {
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

  if (!input.correctionDocument) {
    throw new Error('Gemini extraction requires a correction PDF.');
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
    const exerciseContextBlocks: GeminiStructuredBlock[] = [];
    const partsByIndex = new Map<number, PendingGeminiPart>();
    const questionNodes: DraftNode[] = [];
    let activePart: PendingGeminiPart | null = null;
    const childQuestionCounters = new Map<string, number>();
    const activeQuestionsByParentId = new Map<string, PendingGeminiQuestion>();
    const pendingQuestionsById = new Map<string, PendingGeminiQuestion>();

    const ensurePart = (marker: DetectedPartMarker) => {
      const existing = partsByIndex.get(marker.partIndex);

      if (existing) {
        return existing;
      }

      const part: PendingGeminiPart = {
        id: randomUUID(),
        orderIndex: marker.partIndex,
        label: marker.label,
        contextBlocks: [],
      };

      partsByIndex.set(marker.partIndex, part);
      return part;
    };

    const appendQuestion = (input: {
      parentId: string;
      requestedQuestionIndex: number | null;
      promptBlocks: GeminiStructuredBlock[];
      sourceQuestion: GeminiStructuredQuestion;
      includeSourceContent: boolean;
      includePromptAssets: boolean;
      maxPoints: number | null;
    }) => {
      const questionOrderIndex = nextChildQuestionOrder(
        childQuestionCounters,
        input.parentId,
        input.requestedQuestionIndex,
      );
      const questionNode: DraftNode = {
        id: randomUUID(),
        nodeType: 'QUESTION',
        parentId: input.parentId,
        orderIndex: questionOrderIndex,
        label: questionLabelForIndex(questionOrderIndex),
        maxPoints: input.maxPoints,
        topicCodes: [],
        blocks: buildGeminiQuestionLikeBlocks({
          promptBlocks: input.promptBlocks,
          sourceQuestion: input.sourceQuestion,
          assetMap,
          uncertainties,
          includePromptAssets: input.includePromptAssets,
          includeSolution: input.includeSourceContent,
          includeHint: input.includeSourceContent,
          includeRubric: input.includeSourceContent,
        }),
      };
      const pendingQuestion: PendingGeminiQuestion = {
        node: questionNode,
        subquestionPoints: [],
      };

      questionNodes.push(questionNode);
      activeQuestionsByParentId.set(input.parentId, pendingQuestion);
      pendingQuestionsById.set(questionNode.id, pendingQuestion);

      return pendingQuestion;
    };

    const appendSubquestion = (input: {
      parentQuestion: PendingGeminiQuestion;
      marker: DetectedSubquestionMarker;
      promptBlocks: GeminiStructuredBlock[];
      sourceQuestion: GeminiStructuredQuestion;
      includePromptAssets: boolean;
      maxPoints: number | null;
    }) => {
      const subquestionNode: DraftNode = {
        id: randomUUID(),
        nodeType: 'SUBQUESTION',
        parentId: input.parentQuestion.node.id,
        orderIndex: input.parentQuestion.subquestionPoints.length + 1,
        label: subquestionLabelForLetter(input.marker.letter),
        maxPoints: input.maxPoints,
        topicCodes: [],
        blocks: buildGeminiQuestionLikeBlocks({
          promptBlocks: input.promptBlocks,
          sourceQuestion: input.sourceQuestion,
          assetMap,
          uncertainties,
          includePromptAssets: input.includePromptAssets,
          includeSolution: true,
          includeHint: true,
          includeRubric: true,
        }),
      };

      questionNodes.push(subquestionNode);
      input.parentQuestion.subquestionPoints.push(input.maxPoints);

      return subquestionNode;
    };

    for (const block of exercise.contextBlocks) {
      const split = splitTextAtPartMarkerLine(block.text);

      if (!split) {
        const targetBlocks = activePart
          ? activePart.contextBlocks
          : exerciseContextBlocks;
        targetBlocks.push(block);
        continue;
      }

      if (split.beforeText) {
        const targetBlocks = activePart
          ? activePart.contextBlocks
          : exerciseContextBlocks;
        targetBlocks.push({
          ...block,
          text: split.beforeText,
        });
      }

      const part = ensurePart(split.marker);
      activePart = part;

      if (split.marker.restText) {
        part.contextBlocks.push({
          ...block,
          text: split.marker.restText,
        });
      }
    }

    nodes.push({
      id: exerciseId,
      nodeType: 'EXERCISE',
      parentId: null,
      orderIndex: exercise.orderIndex,
      label: normalizeExerciseLabel(exercise.title),
      maxPoints: exercise.maxPoints,
      topicCodes: [],
      blocks: [
        ...toDraftTextBlocks(exerciseContextBlocks, 'PROMPT'),
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
      const normalizedQuestion = normalizeGeminiQuestionForParts(question);
      const labelPartMarker = detectPartMarkerFromLabel(question.label);
      const partMarker =
        normalizedQuestion.partMarker ??
        (labelPartMarker
          ? {
              partIndex: labelPartMarker.partIndex,
              label: labelPartMarker.label,
              restText: '',
            }
          : null);

      if (partMarker) {
        const part = ensurePart(partMarker);
        activePart = part;
        part.contextBlocks.push(...normalizedQuestion.partContextBlocks);
      }

      const parentId = activePart?.id ?? exerciseId;
      const structuredQuestion = splitGeminiQuestionMarkers(
        normalizedQuestion.promptBlocks,
      );
      const inferredPoints =
        question.maxPoints ?? inferPointsFromTextBlocks(question.rubricBlocks);

      if (structuredQuestion.questionMarker) {
        const questionNode = appendQuestion({
          parentId,
          requestedQuestionIndex:
            structuredQuestion.questionMarker.questionIndex,
          promptBlocks: structuredQuestion.questionPromptBlocks,
          sourceQuestion: question,
          includeSourceContent: !structuredQuestion.subquestionMarker,
          includePromptAssets: true,
          maxPoints: structuredQuestion.subquestionMarker
            ? null
            : inferredPoints,
        });

        if (structuredQuestion.subquestionMarker) {
          appendSubquestion({
            parentQuestion: questionNode,
            marker: structuredQuestion.subquestionMarker,
            promptBlocks: structuredQuestion.subquestionPromptBlocks,
            sourceQuestion: question,
            includePromptAssets: false,
            maxPoints: inferredPoints,
          });
        }

        continue;
      }

      if (structuredQuestion.subquestionMarker) {
        const activeQuestion = activeQuestionsByParentId.get(parentId);

        if (activeQuestion) {
          appendSubquestion({
            parentQuestion: activeQuestion,
            marker: structuredQuestion.subquestionMarker,
            promptBlocks: structuredQuestion.subquestionPromptBlocks,
            sourceQuestion: question,
            includePromptAssets: true,
            maxPoints: inferredPoints,
          });
          continue;
        }
      }

      appendQuestion({
        parentId,
        requestedQuestionIndex: null,
        promptBlocks: normalizedQuestion.promptBlocks,
        sourceQuestion: question,
        includeSourceContent: true,
        includePromptAssets: true,
        maxPoints: inferredPoints,
      });
    }

    for (const pendingQuestion of pendingQuestionsById.values()) {
      const hasSubquestions = pendingQuestion.subquestionPoints.length > 0;
      const subquestionPoints = pendingQuestion.subquestionPoints.filter(
        (points): points is number => points !== null,
      );

      if (
        hasSubquestions &&
        subquestionPoints.length === pendingQuestion.subquestionPoints.length
      ) {
        pendingQuestion.node.maxPoints = roundPoints(
          subquestionPoints.reduce((sum, points) => sum + points, 0),
        );
      }
    }

    for (const part of [...partsByIndex.values()].sort(
      (left, right) => left.orderIndex - right.orderIndex,
    )) {
      nodes.push({
        id: part.id,
        nodeType: 'PART',
        parentId: exerciseId,
        orderIndex: part.orderIndex,
        label: part.label,
        maxPoints: inferGeminiPartPoints(part.id, questionNodes),
        topicCodes: [],
        blocks: toDraftTextBlocks(part.contextBlocks, 'PROMPT'),
      });
    }

    nodes.push(...questionNodes);
  }

  return {
    code: variant.code,
    title: variant.title,
    nodes,
  };
}

type PendingGeminiPart = {
  id: string;
  orderIndex: number;
  label: string;
  contextBlocks: GeminiStructuredBlock[];
};

type PendingGeminiQuestion = {
  node: DraftNode;
  subquestionPoints: Array<number | null>;
};

function normalizeGeminiQuestionForParts(question: GeminiStructuredQuestion) {
  const promptBlocks = [...question.promptBlocks];

  for (const [index, block] of promptBlocks.entries()) {
    const split = splitTextAtPartMarkerLine(block.text);

    if (!split) {
      continue;
    }

    const nextPromptBlocks: GeminiStructuredBlock[] = [
      ...promptBlocks.slice(0, index),
    ];

    if (split.beforeText) {
      nextPromptBlocks.push({
        ...block,
        text: split.beforeText,
      });
    }

    const remainingPromptBlocks = [
      ...(split.marker.restText
        ? [
            {
              ...block,
              text: split.marker.restText,
            },
          ]
        : []),
      ...promptBlocks.slice(index + 1),
    ];
    const splitRemaining = splitLeadingPartContextBlocks(remainingPromptBlocks);

    nextPromptBlocks.push(...splitRemaining.promptBlocks);

    return {
      partMarker: split.marker,
      partContextBlocks: splitRemaining.partContextBlocks,
      promptBlocks: nextPromptBlocks,
    };
  }

  return {
    partMarker: null,
    partContextBlocks: [],
    promptBlocks,
  };
}

function splitGeminiQuestionMarkers(promptBlocks: GeminiStructuredBlock[]) {
  const firstPromptBlock = promptBlocks[0];

  if (!firstPromptBlock) {
    return {
      questionMarker: null,
      subquestionMarker: null,
      questionPromptBlocks: [],
      subquestionPromptBlocks: [],
    };
  }

  const questionMarker = splitLeadingQuestionMarker(firstPromptBlock.text);

  if (questionMarker) {
    const promptWithoutQuestionMarker = [
      {
        ...firstPromptBlock,
        text: questionMarker.restText,
      },
      ...promptBlocks.slice(1),
    ].filter(hasGeminiBlockText);
    const subquestionSplit = splitFirstGeminiSubquestionFromBlocks(
      promptWithoutQuestionMarker,
    );

    if (subquestionSplit) {
      return {
        questionMarker,
        subquestionMarker: subquestionSplit.marker,
        questionPromptBlocks: subquestionSplit.beforeBlocks,
        subquestionPromptBlocks: subquestionSplit.afterBlocks,
      };
    }

    return {
      questionMarker,
      subquestionMarker: null,
      questionPromptBlocks: promptWithoutQuestionMarker,
      subquestionPromptBlocks: [],
    };
  }

  const subquestionSplit = splitFirstGeminiSubquestionFromBlocks(promptBlocks);

  if (subquestionSplit && subquestionSplit.beforeBlocks.length === 0) {
    return {
      questionMarker: null,
      subquestionMarker: subquestionSplit.marker,
      questionPromptBlocks: [],
      subquestionPromptBlocks: subquestionSplit.afterBlocks,
    };
  }

  return {
    questionMarker: null,
    subquestionMarker: null,
    questionPromptBlocks: promptBlocks,
    subquestionPromptBlocks: [],
  };
}

function splitFirstGeminiSubquestionFromBlocks(
  blocks: GeminiStructuredBlock[],
) {
  for (const [index, block] of blocks.entries()) {
    const leadingMarker = splitLeadingSubquestionMarker(block.text);

    if (leadingMarker) {
      return {
        marker: leadingMarker,
        beforeBlocks: blocks.slice(0, index),
        afterBlocks: [
          {
            ...block,
            text: leadingMarker.restText,
          },
          ...blocks.slice(index + 1),
        ].filter(hasGeminiBlockText),
      };
    }

    const split = splitTextAtSubquestionMarkerLine(block.text);

    if (!split) {
      continue;
    }

    return {
      marker: split.marker,
      beforeBlocks: [
        ...blocks.slice(0, index),
        ...(split.beforeText
          ? [
              {
                ...block,
                text: split.beforeText,
              },
            ]
          : []),
      ].filter(hasGeminiBlockText),
      afterBlocks: [
        {
          ...block,
          text: split.marker.restText,
        },
        ...blocks.slice(index + 1),
      ].filter(hasGeminiBlockText),
    };
  }

  return null;
}

function hasGeminiBlockText(block: GeminiStructuredBlock) {
  return block.text.trim().length > 0;
}

function buildGeminiQuestionLikeBlocks(input: {
  promptBlocks: GeminiStructuredBlock[];
  sourceQuestion: GeminiStructuredQuestion;
  assetMap: Map<string, DraftAsset>;
  uncertainties: string[];
  includePromptAssets: boolean;
  includeSolution: boolean;
  includeHint: boolean;
  includeRubric: boolean;
}) {
  return [
    ...toDraftTextBlocks(input.promptBlocks, 'PROMPT'),
    ...(input.includePromptAssets
      ? toDraftAssetBlocks(
          input.sourceQuestion.assetIds,
          input.assetMap,
          'PROMPT',
          input.uncertainties,
        )
      : []),
    ...(input.includeSolution
      ? [
          ...toDraftTextBlocks(input.sourceQuestion.solutionBlocks, 'SOLUTION'),
          ...toDraftAssetBlocks(
            input.sourceQuestion.assetIds,
            input.assetMap,
            'SOLUTION',
            input.uncertainties,
          ),
        ]
      : []),
    ...(input.includeHint
      ? [
          ...toDraftTextBlocks(input.sourceQuestion.hintBlocks, 'HINT'),
          ...toDraftAssetBlocks(
            input.sourceQuestion.assetIds,
            input.assetMap,
            'HINT',
            input.uncertainties,
          ),
        ]
      : []),
    ...(input.includeRubric
      ? [
          ...toDraftTextBlocks(input.sourceQuestion.rubricBlocks, 'RUBRIC'),
          ...toDraftAssetBlocks(
            input.sourceQuestion.assetIds,
            input.assetMap,
            'RUBRIC',
            input.uncertainties,
          ),
        ]
      : []),
  ];
}

function inferGeminiPartPoints(parentId: string, nodes: DraftNode[]) {
  const childQuestions = nodes.filter(
    (node) => node.parentId === parentId && node.nodeType === 'QUESTION',
  );

  if (!childQuestions.length) {
    return null;
  }

  if (childQuestions.some((node) => node.maxPoints === null)) {
    return null;
  }

  return roundPoints(
    childQuestions.reduce((sum, node) => sum + (node.maxPoints ?? 0), 0),
  );
}

function nextChildQuestionOrder(
  counters: Map<string, number>,
  parentId: string,
  requestedOrderIndex: number | null = null,
) {
  const currentOrder = counters.get(parentId) ?? 0;
  const nextOrder =
    requestedOrderIndex !== null && requestedOrderIndex > currentOrder
      ? requestedOrderIndex
      : currentOrder + 1;
  counters.set(parentId, nextOrder);
  return nextOrder;
}

function roundPoints(value: number) {
  return Number.parseFloat(value.toFixed(3));
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
      'Recover the visible snippet as faithful readable text. Preserve formulas and scientific notation accurately. Use type "paragraph" for prose, short labels, and mixed text, and use type "latex" when the crop is best represented as a standalone formula, equation, reaction, or formula-heavy line. Keep inline math inside $...$ when practical, prefer valid LaTeX for subscripts, superscripts, charges, exponents, scientific notation, indexed variables, pH expressions, chemical formulas, and units with powers, and clean obvious OCR spacing or punctuation issues without changing meaning. Do not force plain numbers or plain scientific names into LaTeX when ordinary text is clearer.',
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
    rubricBlocks: normalizeGeminiBlocks(raw.rubricBlocks),
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
  if (
    value === 'PROMPT' ||
    value === 'SOLUTION' ||
    value === 'HINT' ||
    value === 'RUBRIC'
  ) {
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
    `Both the exam PDF and the official correction PDF are attached in every request.`,
    `Return exercises and questions exactly in order.`,
    `Do not drop any visible content from the exam PDF.`,
    `For solutionBlocks, stay especially faithful to the correction PDF.`,
    `Do not drop, compress, or silently rewrite visible correction content.`,
    `Do not paraphrase away visible exam or correction text just to make it shorter.`,
    `You may add only minimal clarifying context to corrections when the PDF gives a bare result or a very compressed step, and that clarification must remain additive.`,
    `When useful, you may add short hintBlocks that help a student start before viewing the official answer, but those hints must stay brief, non-spoiling, and must never replace solutionBlocks.`,
    `Put visible barème and point-allocation details from the correction into rubricBlocks for the matching question, preserving exact values and splits with precision.`,
    `Use paragraph blocks for prose and mixed prose plus inline notation, latex blocks for standalone formulas or formula-heavy lines, and heading blocks for short visible headings or labels when the PDF clearly separates them.`,
    `Preserve scientific and mathematical notation faithfully. Use inline $...$ when practical for notation inside prose, and prefer valid LaTeX for subscripts, superscripts, charges, exponents, scientific notation, indexed variables, pH expressions, chemical formulas, and units with powers.`,
    `Do not force every plain number, ordinary unit, or plain scientific name into LaTeX when normal paragraph text is clearer.`,
    `Clean obvious OCR spacing and punctuation issues when that improves readability without changing meaning.`,
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
