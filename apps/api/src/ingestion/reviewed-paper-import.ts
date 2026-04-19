import type {
  DraftAsset,
  DraftAssetClassification,
  DraftBlock,
  DraftBlockRole,
  DraftBlockType,
  DraftDocumentKind,
  DraftVariantCode,
  IngestionDraft,
} from './ingestion.contract';
import { normalizeIngestionDraft } from './ingestion.contract';

type ReviewedTextBlock = {
  type: 'paragraph' | 'heading' | 'latex';
  text: string;
};

type ReviewedQuestion = {
  orderIndex: number;
  promptBlocks: ReviewedTextBlock[];
  solutionBlocks: ReviewedTextBlock[];
  hintBlocks: ReviewedTextBlock[];
  rubricBlocks: ReviewedTextBlock[];
  assetIds: string[];
};

type ReviewedExercise = {
  orderIndex: number;
  title: string;
  contextBlocks: ReviewedTextBlock[];
  assetIds: string[];
  questions: ReviewedQuestion[];
};

type ReviewedVariant = {
  code: DraftVariantCode;
  title: string;
  exercises: ReviewedExercise[];
};

type ReviewedAsset = {
  id: string;
  exerciseOrderIndex: number;
  questionOrderIndex: number | null;
  documentKind: DraftDocumentKind;
  role: DraftBlockRole;
  classification: DraftAssetClassification;
  pageNumber: number;
  caption: string | null;
  variantCode: DraftVariantCode | null;
};

type ReviewedExamMetadata = {
  durationMinutes: number | null;
  hasCorrection: boolean | null;
  sourceLanguage: string | null;
  title: string | null;
  totalPoints: number | null;
};

export type ReviewedPaperExtract = {
  variants: ReviewedVariant[];
  assets: ReviewedAsset[];
  uncertainties: unknown[];
  exam: ReviewedExamMetadata;
};

export type ReviewedPaperImportSummary = {
  variantCount: number;
  exerciseCount: number;
  questionCount: number;
  assetCount: number;
  uncertaintyCount: number;
  placeholderAssetCount: number;
  missingVariantCodes: DraftVariantCode[];
};

const DEFAULT_VARIANT_TITLES: Record<DraftVariantCode, string> = {
  SUJET_1: 'الموضوع الأول',
  SUJET_2: 'الموضوع الثاني',
};

export function parseReviewedPaperExtract(
  value: unknown,
  sourceLabel = 'reviewed paper extract',
): ReviewedPaperExtract {
  const root = asRecord(value, sourceLabel);

  return {
    variants: readArray(root.variants, `${sourceLabel}.variants`).map(
      (entry, index) =>
        parseReviewedVariant(entry, `${sourceLabel}.variants[${index}]`),
    ),
    assets: readArray(root.assets, `${sourceLabel}.assets`).map(
      (entry, index) =>
        parseReviewedAsset(entry, `${sourceLabel}.assets[${index}]`),
    ),
    uncertainties: Array.isArray(root.uncertainties)
      ? [...root.uncertainties]
      : [],
    exam: parseReviewedExamMetadata(root.exam, `${sourceLabel}.exam`),
  };
}

export function importReviewedPaperExtract(input: {
  baseDraft: IngestionDraft;
  reviewedExtract: ReviewedPaperExtract;
  importFilePath: string;
  importedAt?: Date;
  jobTitle?: string | null;
}) {
  const importedAt = input.importedAt ?? new Date();
  const draft = normalizeIngestionDraft(
    JSON.parse(JSON.stringify(input.baseDraft)),
  );
  const sourcePagesByKey = new Map(
    draft.sourcePages.map((page) => [
      buildSourcePageKey(page.documentKind, page.pageNumber),
      page,
    ]),
  );

  draft.exam.title =
    normalizeOptionalString(input.jobTitle) ?? draft.exam.title.trim();
  draft.exam.metadata = {
    ...draft.exam.metadata,
    importedFromReviewedExtract: true,
    reviewedExtractFile: input.importFilePath,
    importedReviewedExtractAt: importedAt.toISOString(),
    reviewedExtractExamTitle: input.reviewedExtract.exam.title,
    reviewedExtractHasCorrection: input.reviewedExtract.exam.hasCorrection,
    reviewedExtractSourceLanguage: input.reviewedExtract.exam.sourceLanguage,
    reviewedExtractUncertaintyCount: input.reviewedExtract.uncertainties.length,
    ...(input.reviewedExtract.exam.durationMinutes !== null
      ? {
          durationMinutes: input.reviewedExtract.exam.durationMinutes,
        }
      : {}),
    ...(input.reviewedExtract.exam.totalPoints !== null
      ? {
          totalPoints: input.reviewedExtract.exam.totalPoints,
        }
      : {}),
  };

  const assets = input.reviewedExtract.assets.map((asset) => {
    const sourcePage = sourcePagesByKey.get(
      buildSourcePageKey(asset.documentKind, asset.pageNumber),
    );

    if (!sourcePage) {
      throw new Error(
        `Asset ${asset.id} references missing ${asset.documentKind} page ${asset.pageNumber}.`,
      );
    }

    const importedAsset: DraftAsset = {
      id: asset.id,
      sourcePageId: sourcePage.id,
      documentKind: asset.documentKind,
      pageNumber: asset.pageNumber,
      variantCode: asset.variantCode,
      role: asset.role,
      classification: asset.classification,
      cropBox: {
        x: 0,
        y: 0,
        width: sourcePage.width,
        height: sourcePage.height,
      },
      label: asset.caption,
      notes:
        'Imported without crop geometry; refine before approval or publish.',
      nativeSuggestion: null,
    };

    return importedAsset;
  });
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  draft.assets = assets;
  draft.variants = (['SUJET_1', 'SUJET_2'] as const).map((variantCode) => {
    const sourceVariant = input.reviewedExtract.variants.find(
      (entry) => entry.code === variantCode,
    );
    const existingVariant = draft.variants.find(
      (entry) => entry.code === variantCode,
    );

    return {
      code: variantCode,
      title:
        normalizeOptionalString(sourceVariant?.title) ??
        normalizeOptionalString(existingVariant?.title) ??
        DEFAULT_VARIANT_TITLES[variantCode],
      nodes: sourceVariant
        ? buildVariantNodes({
            variant: sourceVariant,
            assetsById,
          })
        : [],
    };
  });

  const summary = buildImportSummary(input.reviewedExtract, assets.length);

  return {
    draft: normalizeIngestionDraft(draft),
    summary,
  };
}

function buildImportSummary(
  reviewedExtract: ReviewedPaperExtract,
  placeholderAssetCount: number,
): ReviewedPaperImportSummary {
  const exerciseCount = reviewedExtract.variants.reduce(
    (sum, variant) => sum + variant.exercises.length,
    0,
  );
  const questionCount = reviewedExtract.variants.reduce(
    (sum, variant) =>
      sum +
      variant.exercises.reduce(
        (exerciseSum, exercise) => exerciseSum + exercise.questions.length,
        0,
      ),
    0,
  );

  return {
    variantCount: reviewedExtract.variants.length,
    exerciseCount,
    questionCount,
    assetCount: reviewedExtract.assets.length,
    uncertaintyCount: reviewedExtract.uncertainties.length,
    placeholderAssetCount,
    missingVariantCodes: (['SUJET_1', 'SUJET_2'] as const).filter(
      (variantCode) =>
        !reviewedExtract.variants.some(
          (variant) => variant.code === variantCode,
        ),
    ),
  };
}

function buildVariantNodes(input: {
  variant: ReviewedVariant;
  assetsById: Map<string, DraftAsset>;
}) {
  return input.variant.exercises.flatMap((exercise) => {
    const exerciseNodeId = buildExerciseNodeId(
      input.variant.code,
      exercise.orderIndex,
    );
    const exerciseNode = {
      id: exerciseNodeId,
      nodeType: 'EXERCISE' as const,
      parentId: null,
      orderIndex: exercise.orderIndex,
      label: normalizeOptionalString(exercise.title),
      maxPoints: parsePointsFromText(exercise.title),
      topicCodes: [],
      blocks: [
        ...buildTextBlocks({
          prefix: `${exerciseNodeId}_prompt`,
          role: 'PROMPT',
          blocks: exercise.contextBlocks,
        }),
        ...buildAssetBlocks({
          prefix: `${exerciseNodeId}_asset`,
          assetIds: exercise.assetIds,
          allowedRoles: ['PROMPT', 'SOLUTION', 'HINT', 'RUBRIC', 'META'],
          assetsById: input.assetsById,
        }),
      ],
    };
    const questionNodes = exercise.questions.map((question) => {
      const questionNodeId = buildQuestionNodeId(
        input.variant.code,
        exercise.orderIndex,
        question.orderIndex,
      );

      return {
        id: questionNodeId,
        nodeType: 'QUESTION' as const,
        parentId: exerciseNodeId,
        orderIndex: question.orderIndex,
        label: null,
        maxPoints: null,
        topicCodes: [],
        blocks: [
          ...buildTextBlocks({
            prefix: `${questionNodeId}_prompt`,
            role: 'PROMPT',
            blocks: question.promptBlocks,
          }),
          ...buildAssetBlocks({
            prefix: `${questionNodeId}_prompt_asset`,
            assetIds: question.assetIds,
            allowedRoles: ['PROMPT'],
            assetsById: input.assetsById,
          }),
          ...buildTextBlocks({
            prefix: `${questionNodeId}_solution`,
            role: 'SOLUTION',
            blocks: question.solutionBlocks,
          }),
          ...buildAssetBlocks({
            prefix: `${questionNodeId}_solution_asset`,
            assetIds: question.assetIds,
            allowedRoles: ['SOLUTION'],
            assetsById: input.assetsById,
          }),
          ...buildTextBlocks({
            prefix: `${questionNodeId}_hint`,
            role: 'HINT',
            blocks: question.hintBlocks,
          }),
          ...buildAssetBlocks({
            prefix: `${questionNodeId}_hint_asset`,
            assetIds: question.assetIds,
            allowedRoles: ['HINT'],
            assetsById: input.assetsById,
          }),
          ...buildTextBlocks({
            prefix: `${questionNodeId}_rubric`,
            role: 'RUBRIC',
            blocks: question.rubricBlocks,
          }),
          ...buildAssetBlocks({
            prefix: `${questionNodeId}_rubric_asset`,
            assetIds: question.assetIds,
            allowedRoles: ['RUBRIC', 'META'],
            assetsById: input.assetsById,
          }),
        ],
      };
    });

    return [exerciseNode, ...questionNodes];
  });
}

function buildTextBlocks(input: {
  prefix: string;
  role: DraftBlockRole;
  blocks: ReviewedTextBlock[];
}) {
  return input.blocks.flatMap((block, index) => {
    const value = block.text.trim();

    if (!value) {
      return [];
    }

    const draftBlock: DraftBlock = {
      id: `${input.prefix}_${index + 1}`,
      role: input.role,
      type: block.type,
      value,
    };

    return [draftBlock];
  });
}

function buildAssetBlocks(input: {
  prefix: string;
  assetIds: string[];
  allowedRoles: DraftBlockRole[];
  assetsById: Map<string, DraftAsset>;
}) {
  return input.assetIds.flatMap((assetId, index) => {
    const asset = input.assetsById.get(assetId);

    if (!asset || !input.allowedRoles.includes(asset.role)) {
      return [];
    }

    const draftBlock: DraftBlock = {
      id: `${input.prefix}_${index + 1}`,
      role: asset.role,
      type: mapAssetClassificationToBlockType(asset.classification),
      value: asset.label ?? '',
      assetId: asset.id,
    };

    return [draftBlock];
  });
}

function parseReviewedVariant(
  value: unknown,
  sourceLabel: string,
): ReviewedVariant {
  const record = asRecord(value, sourceLabel);
  const code = readVariantCode(record.code, `${sourceLabel}.code`);

  return {
    code,
    title:
      normalizeOptionalString(record.title) ?? DEFAULT_VARIANT_TITLES[code],
    exercises: readArray(record.exercises, `${sourceLabel}.exercises`).map(
      (entry, index) =>
        parseReviewedExercise(entry, `${sourceLabel}.exercises[${index}]`),
    ),
  };
}

function parseReviewedExercise(
  value: unknown,
  sourceLabel: string,
): ReviewedExercise {
  const record = asRecord(value, sourceLabel);

  return {
    orderIndex: readPositiveInteger(
      record.orderIndex,
      `${sourceLabel}.orderIndex`,
    ),
    title: readRequiredString(record.title, `${sourceLabel}.title`),
    contextBlocks: readReviewedBlocks(
      record.contextBlocks,
      `${sourceLabel}.contextBlocks`,
    ),
    assetIds: readStringArray(record.assetIds, `${sourceLabel}.assetIds`),
    questions: readArray(record.questions, `${sourceLabel}.questions`).map(
      (entry, index) =>
        parseReviewedQuestion(entry, `${sourceLabel}.questions[${index}]`),
    ),
  };
}

function parseReviewedQuestion(
  value: unknown,
  sourceLabel: string,
): ReviewedQuestion {
  const record = asRecord(value, sourceLabel);

  return {
    orderIndex: readPositiveInteger(
      record.orderIndex,
      `${sourceLabel}.orderIndex`,
    ),
    promptBlocks: readReviewedBlocks(
      record.promptBlocks,
      `${sourceLabel}.promptBlocks`,
    ),
    solutionBlocks: readReviewedBlocks(
      record.solutionBlocks,
      `${sourceLabel}.solutionBlocks`,
    ),
    hintBlocks: readReviewedBlocks(
      record.hintBlocks,
      `${sourceLabel}.hintBlocks`,
    ),
    rubricBlocks: readReviewedBlocks(
      record.rubricBlocks,
      `${sourceLabel}.rubricBlocks`,
    ),
    assetIds: readStringArray(record.assetIds, `${sourceLabel}.assetIds`),
  };
}

function parseReviewedAsset(
  value: unknown,
  sourceLabel: string,
): ReviewedAsset {
  const record = asRecord(value, sourceLabel);

  return {
    id: readRequiredString(record.id, `${sourceLabel}.id`),
    exerciseOrderIndex: readPositiveInteger(
      record.exerciseOrderIndex,
      `${sourceLabel}.exerciseOrderIndex`,
    ),
    questionOrderIndex: readOptionalPositiveInteger(
      record.questionOrderIndex,
      `${sourceLabel}.questionOrderIndex`,
    ),
    documentKind: readDocumentKind(
      record.documentKind,
      `${sourceLabel}.documentKind`,
    ),
    role: readBlockRole(record.role, `${sourceLabel}.role`),
    classification: readAssetClassification(
      record.classification,
      `${sourceLabel}.classification`,
    ),
    pageNumber: readPositiveInteger(
      record.pageNumber,
      `${sourceLabel}.pageNumber`,
    ),
    caption: normalizeOptionalString(record.caption),
    variantCode: readOptionalVariantCode(
      record.variantCode,
      `${sourceLabel}.variantCode`,
    ),
  };
}

function parseReviewedExamMetadata(
  value: unknown,
  sourceLabel: string,
): ReviewedExamMetadata {
  const record =
    value === undefined || value === null ? {} : asRecord(value, sourceLabel);

  return {
    durationMinutes: readOptionalInteger(
      record.durationMinutes,
      `${sourceLabel}.durationMinutes`,
    ),
    hasCorrection:
      typeof record.hasCorrection === 'boolean' ? record.hasCorrection : null,
    sourceLanguage: normalizeOptionalString(record.sourceLanguage),
    title: normalizeOptionalString(record.title),
    totalPoints: readOptionalInteger(
      record.totalPoints,
      `${sourceLabel}.totalPoints`,
    ),
  };
}

function readReviewedBlocks(value: unknown, sourceLabel: string) {
  return readArray(value, sourceLabel).map((entry, index) => {
    const record = asRecord(entry, `${sourceLabel}[${index}]`);
    const type = readTextBlockType(
      record.type,
      `${sourceLabel}[${index}].type`,
    );

    return {
      type,
      text: readRequiredString(record.text, `${sourceLabel}[${index}].text`),
    };
  });
}

function buildSourcePageKey(
  documentKind: DraftDocumentKind,
  pageNumber: number,
) {
  return `${documentKind}:${pageNumber}`;
}

function buildExerciseNodeId(
  variantCode: DraftVariantCode,
  exerciseOrderIndex: number,
) {
  return `${variantCode.toLowerCase()}_exercise_${exerciseOrderIndex}`;
}

function buildQuestionNodeId(
  variantCode: DraftVariantCode,
  exerciseOrderIndex: number,
  questionOrderIndex: number,
) {
  return `${variantCode.toLowerCase()}_exercise_${exerciseOrderIndex}_question_${questionOrderIndex}`;
}

function mapAssetClassificationToBlockType(
  classification: DraftAssetClassification,
): DraftBlockType {
  return classification;
}

function parsePointsFromText(value: string) {
  const matches = Array.from(
    value.matchAll(/\(([\d٠-٩]+(?:[.,][\d٠-٩]+)?)\s*نقاط?\)/g),
  );

  if (matches.length === 0) {
    return null;
  }

  const raw = matches[matches.length - 1]?.[1];
  if (!raw) {
    return null;
  }

  const normalized = normalizeNumericString(raw).replace(',', '.');
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function readArray(value: unknown, sourceLabel: string) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  throw new Error(`${sourceLabel} must be an array.`);
}

function asRecord(value: unknown, sourceLabel: string) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw new Error(`${sourceLabel} must be an object.`);
}

function readRequiredString(value: unknown, sourceLabel: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${sourceLabel} must be a non-empty string.`);
  }

  return value.trim();
}

function readPositiveInteger(value: unknown, sourceLabel: string) {
  const parsed = readOptionalInteger(value, sourceLabel);

  if (parsed === null || parsed < 1) {
    throw new Error(`${sourceLabel} must be a positive integer.`);
  }

  return parsed;
}

function readOptionalPositiveInteger(value: unknown, sourceLabel: string) {
  const parsed = readOptionalInteger(value, sourceLabel);

  if (parsed === null) {
    return null;
  }

  if (parsed < 1) {
    throw new Error(`${sourceLabel} must be a positive integer when present.`);
  }

  return parsed;
}

function readOptionalInteger(value: unknown, sourceLabel: string) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized =
    typeof value === 'string' ? normalizeNumericString(value.trim()) : value;
  const parsed =
    typeof normalized === 'number'
      ? normalized
      : Number.parseInt(String(normalized), 10);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${sourceLabel} must be an integer.`);
  }

  return parsed;
}

function readStringArray(value: unknown, sourceLabel: string) {
  return readArray(value, sourceLabel).map((entry, index) =>
    readRequiredString(entry, `${sourceLabel}[${index}]`),
  );
}

function readVariantCode(
  value: unknown,
  sourceLabel: string,
): DraftVariantCode {
  if (value === 'SUJET_1' || value === 'SUJET_2') {
    return value;
  }

  throw new Error(`${sourceLabel} must be SUJET_1 or SUJET_2.`);
}

function readOptionalVariantCode(
  value: unknown,
  sourceLabel: string,
): DraftVariantCode | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return readVariantCode(value, sourceLabel);
}

function readDocumentKind(
  value: unknown,
  sourceLabel: string,
): DraftDocumentKind {
  if (value === 'EXAM' || value === 'CORRECTION') {
    return value;
  }

  throw new Error(`${sourceLabel} must be EXAM or CORRECTION.`);
}

function readBlockRole(value: unknown, sourceLabel: string): DraftBlockRole {
  if (
    value === 'PROMPT' ||
    value === 'SOLUTION' ||
    value === 'HINT' ||
    value === 'RUBRIC' ||
    value === 'META'
  ) {
    return value;
  }

  throw new Error(
    `${sourceLabel} must be one of PROMPT, SOLUTION, HINT, RUBRIC, META.`,
  );
}

function readAssetClassification(
  value: unknown,
  sourceLabel: string,
): DraftAssetClassification {
  if (
    value === 'image' ||
    value === 'table' ||
    value === 'tree' ||
    value === 'graph'
  ) {
    return value;
  }

  throw new Error(`${sourceLabel} must be one of image, table, tree, graph.`);
}

function readTextBlockType(
  value: unknown,
  sourceLabel: string,
): ReviewedTextBlock['type'] {
  if (value === 'paragraph' || value === 'heading' || value === 'latex') {
    return value;
  }

  throw new Error(`${sourceLabel} must be paragraph, heading, or latex.`);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumericString(value: string) {
  return value.replace(/[٠-٩]/g, (digit) =>
    String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
  );
}
