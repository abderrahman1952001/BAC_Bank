import { randomUUID } from 'crypto';

export const INGESTION_DRAFT_SCHEMA = 'bac_ingestion_draft/v1';

export type DraftVariantCode = 'SUJET_1' | 'SUJET_2';
export type DraftBlockRole = 'PROMPT' | 'SOLUTION' | 'HINT' | 'META';
export type DraftBlockType =
  | 'paragraph'
  | 'latex'
  | 'image'
  | 'code'
  | 'heading'
  | 'table'
  | 'list'
  | 'graph'
  | 'tree';
export type DraftAssetKind = 'image' | 'table' | 'tree' | 'graph';
export type DraftAssetNativeSuggestionType = 'table' | 'tree' | 'graph';
export type DraftAssetNativeSuggestionStatus =
  | 'suggested'
  | 'stale'
  | 'recovered';
export type DraftAssetNativeSuggestionSource =
  | 'gemini_initial'
  | 'crop_recovery';
export type DraftSessionType = 'NORMAL' | 'MAKEUP';
export type DraftDocumentKind = 'EXAM' | 'CORRECTION';

export type DraftCropBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DraftAsset = {
  id: string;
  sourcePageId: string;
  documentKind: DraftDocumentKind;
  pageNumber: number;
  variantCode: DraftVariantCode | null;
  role: DraftBlockRole;
  classification: DraftAssetKind;
  cropBox: DraftCropBox;
  label: string | null;
  notes: string | null;
  nativeSuggestion?: {
    type: DraftAssetNativeSuggestionType;
    value: string;
    data: Record<string, unknown> | null;
    status: DraftAssetNativeSuggestionStatus;
    source: DraftAssetNativeSuggestionSource;
    notes: string[];
  } | null;
};

export type DraftBlock = {
  id: string;
  role: DraftBlockRole;
  type: DraftBlockType;
  value: string;
  assetId?: string | null;
  data?: Record<string, unknown> | null;
  meta?: {
    level?: number;
    language?: string;
  };
};

export type DraftNode = {
  id: string;
  nodeType: 'EXERCISE' | 'PART' | 'QUESTION' | 'SUBQUESTION' | 'CONTEXT';
  parentId: string | null;
  orderIndex: number;
  label: string | null;
  maxPoints: number | null;
  topicCodes: string[];
  blocks: DraftBlock[];
};

export type DraftVariant = {
  code: DraftVariantCode;
  title: string;
  nodes: DraftNode[];
};

export type DraftSourcePage = {
  id: string;
  documentId: string;
  documentKind: DraftDocumentKind;
  pageNumber: number;
  width: number;
  height: number;
};

export type IngestionDraft = {
  schema: typeof INGESTION_DRAFT_SCHEMA;
  exam: {
    year: number;
    streamCode: string | null;
    subjectCode: string | null;
    sessionType: DraftSessionType;
    provider: string;
    title: string;
    minYear: number;
    sourceListingUrl: string | null;
    sourceExamPageUrl: string | null;
    sourceCorrectionPageUrl: string | null;
    examDocumentId: string | null;
    correctionDocumentId: string | null;
    examDocumentStorageKey: string | null;
    correctionDocumentStorageKey: string | null;
    metadata: Record<string, unknown>;
  };
  sourcePages: DraftSourcePage[];
  assets: DraftAsset[];
  variants: DraftVariant[];
};

type JsonRecord = Record<string, unknown>;

export function createEmptyDraft(input: {
  year: number;
  streamCode?: string | null;
  subjectCode?: string | null;
  sessionType?: DraftSessionType;
  provider: string;
  title: string;
  minYear: number;
  sourceListingUrl?: string | null;
  sourceExamPageUrl?: string | null;
  sourceCorrectionPageUrl?: string | null;
  metadata?: Record<string, unknown>;
}): IngestionDraft {
  return {
    schema: INGESTION_DRAFT_SCHEMA,
    exam: {
      year: input.year,
      streamCode: normalizeOptionalString(input.streamCode),
      subjectCode: normalizeOptionalString(input.subjectCode),
      sessionType: input.sessionType ?? 'NORMAL',
      provider: input.provider,
      title: input.title.trim(),
      minYear: input.minYear,
      sourceListingUrl: normalizeOptionalString(input.sourceListingUrl),
      sourceExamPageUrl: normalizeOptionalString(input.sourceExamPageUrl),
      sourceCorrectionPageUrl: normalizeOptionalString(
        input.sourceCorrectionPageUrl,
      ),
      examDocumentId: null,
      correctionDocumentId: null,
      examDocumentStorageKey: null,
      correctionDocumentStorageKey: null,
      metadata: input.metadata ?? {},
    },
    sourcePages: [],
    assets: [],
    variants: defaultVariants(),
  };
}

export function normalizeIngestionDraft(value: unknown): IngestionDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('draft_json must be a JSON object.');
  }

  const raw = value as JsonRecord;
  const examRaw =
    raw.exam && typeof raw.exam === 'object' && !Array.isArray(raw.exam)
      ? (raw.exam as JsonRecord)
      : {};

  const year = readInteger(examRaw.year, 'draft_json.exam.year');
  const title = readNonEmptyString(examRaw.title, 'draft_json.exam.title');
  const provider = readNonEmptyString(
    examRaw.provider,
    'draft_json.exam.provider',
  );
  const minYear = readInteger(examRaw.minYear, 'draft_json.exam.minYear');

  return {
    schema: INGESTION_DRAFT_SCHEMA,
    exam: {
      year,
      streamCode: normalizeOptionalString(examRaw.streamCode),
      subjectCode: normalizeOptionalString(examRaw.subjectCode),
      sessionType:
        examRaw.sessionType === 'MAKEUP'
          ? 'MAKEUP'
          : ('NORMAL' as DraftSessionType),
      provider,
      title,
      minYear,
      sourceListingUrl: normalizeOptionalString(examRaw.sourceListingUrl),
      sourceExamPageUrl: normalizeOptionalString(examRaw.sourceExamPageUrl),
      sourceCorrectionPageUrl: normalizeOptionalString(
        examRaw.sourceCorrectionPageUrl,
      ),
      examDocumentId: normalizeOptionalString(examRaw.examDocumentId),
      correctionDocumentId: normalizeOptionalString(
        examRaw.correctionDocumentId,
      ),
      examDocumentStorageKey: normalizeOptionalString(
        examRaw.examDocumentStorageKey,
      ),
      correctionDocumentStorageKey: normalizeOptionalString(
        examRaw.correctionDocumentStorageKey,
      ),
      metadata:
        examRaw.metadata &&
        typeof examRaw.metadata === 'object' &&
        !Array.isArray(examRaw.metadata)
          ? (examRaw.metadata as Record<string, unknown>)
          : {},
    },
    sourcePages: normalizeSourcePages(raw.sourcePages),
    assets: normalizeAssets(raw.assets),
    variants: normalizeVariants(raw.variants),
  };
}

function defaultVariants(): DraftVariant[] {
  return [
    {
      code: 'SUJET_1',
      title: 'الموضوع الأول',
      nodes: [],
    },
    {
      code: 'SUJET_2',
      title: 'الموضوع الثاني',
      nodes: [],
    },
  ];
}

function normalizeVariants(value: unknown): DraftVariant[] {
  if (!Array.isArray(value) || value.length === 0) {
    return defaultVariants();
  }

  const variants = value
    .map((entry) => normalizeVariant(entry))
    .filter((entry): entry is DraftVariant => Boolean(entry));

  if (!variants.length) {
    return defaultVariants();
  }

  const seenCodes = new Set<DraftVariantCode>();

  for (const variant of variants) {
    seenCodes.add(variant.code);
  }

  if (!seenCodes.has('SUJET_1')) {
    variants.push({
      code: 'SUJET_1',
      title: 'الموضوع الأول',
      nodes: [],
    });
  }

  if (!seenCodes.has('SUJET_2')) {
    variants.push({
      code: 'SUJET_2',
      title: 'الموضوع الثاني',
      nodes: [],
    });
  }

  return variants.sort((left, right) => left.code.localeCompare(right.code));
}

function normalizeVariant(value: unknown): DraftVariant | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
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
      (code === 'SUJET_2' ? 'الموضوع الثاني' : 'الموضوع الأول'),
    nodes: normalizeNodes(raw.nodes),
  };
}

function normalizeNodes(value: unknown): DraftNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeNode(entry, index))
    .filter((entry): entry is DraftNode => Boolean(entry));
}

function normalizeNode(
  value: unknown,
  fallbackIndex: number,
): DraftNode | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
  const nodeType =
    raw.nodeType === 'PART' ||
    raw.nodeType === 'QUESTION' ||
    raw.nodeType === 'SUBQUESTION' ||
    raw.nodeType === 'CONTEXT' ||
    raw.nodeType === 'EXERCISE'
      ? raw.nodeType
      : null;

  if (!nodeType) {
    return null;
  }

  const maxPoints =
    typeof raw.maxPoints === 'number' && Number.isFinite(raw.maxPoints)
      ? raw.maxPoints
      : null;
  const normalizedLabel = normalizeOptionalString(raw.label);
  const normalizedTitle = normalizeOptionalString(raw.title);

  return {
    id: normalizeOptionalString(raw.id) ?? randomUUID(),
    nodeType,
    parentId: normalizeOptionalString(raw.parentId),
    orderIndex:
      typeof raw.orderIndex === 'number' &&
      Number.isInteger(raw.orderIndex) &&
      raw.orderIndex > 0
        ? raw.orderIndex
        : fallbackIndex + 1,
    label: normalizedLabel ?? normalizedTitle,
    maxPoints,
    topicCodes: normalizeTopicCodes(raw.topicCodes),
    blocks: normalizeBlocks(raw.blocks),
  };
}

function normalizeBlocks(value: unknown): DraftBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeBlock(entry, index))
    .filter((entry): entry is DraftBlock => Boolean(entry));
}

function normalizeBlock(value: unknown, index: number): DraftBlock | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
  const role = normalizeBlockRole(raw.role);
  const type = normalizeBlockType(raw.type);

  if (!role || !type) {
    return null;
  }

  const metaRaw =
    raw.meta && typeof raw.meta === 'object' && !Array.isArray(raw.meta)
      ? (raw.meta as JsonRecord)
      : null;

  return {
    id: normalizeOptionalString(raw.id) ?? `draft-block-${index + 1}`,
    role,
    type,
    value: typeof raw.value === 'string' ? raw.value : '',
    assetId: normalizeOptionalString(raw.assetId),
    data:
      raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
        ? (raw.data as Record<string, unknown>)
        : null,
    ...(metaRaw
      ? {
          meta: {
            ...(typeof metaRaw.level === 'number' &&
            Number.isInteger(metaRaw.level)
              ? {
                  level: metaRaw.level,
                }
              : {}),
            ...(typeof metaRaw.language === 'string' && metaRaw.language.trim()
              ? {
                  language: metaRaw.language.trim(),
                }
              : {}),
          },
        }
      : {}),
  };
}

function normalizeAssets(value: unknown): DraftAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeAsset(entry))
    .filter((entry): entry is DraftAsset => Boolean(entry));
}

function normalizeAsset(value: unknown): DraftAsset | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
  const sourcePageId = normalizeOptionalString(raw.sourcePageId);
  const pageNumber =
    typeof raw.pageNumber === 'number' &&
    Number.isInteger(raw.pageNumber) &&
    raw.pageNumber > 0
      ? raw.pageNumber
      : null;

  if (!sourcePageId || pageNumber === null) {
    return null;
  }

  const role = normalizeBlockRole(raw.role) ?? 'PROMPT';
  const classification = normalizeAssetKind(raw.classification) ?? 'image';
  const documentKind =
    raw.documentKind === 'CORRECTION' ? 'CORRECTION' : 'EXAM';
  const variantCode =
    raw.variantCode === 'SUJET_1' || raw.variantCode === 'SUJET_2'
      ? raw.variantCode
      : null;

  const cropBoxRaw =
    raw.cropBox &&
    typeof raw.cropBox === 'object' &&
    !Array.isArray(raw.cropBox)
      ? (raw.cropBox as JsonRecord)
      : {};

  return {
    id: normalizeOptionalString(raw.id) ?? randomUUID(),
    sourcePageId,
    documentKind,
    pageNumber,
    variantCode,
    role,
    classification,
    cropBox: {
      x: readNonNegativeNumber(cropBoxRaw.x),
      y: readNonNegativeNumber(cropBoxRaw.y),
      width: readPositiveNumber(cropBoxRaw.width),
      height: readPositiveNumber(cropBoxRaw.height),
    },
    label: normalizeOptionalString(raw.label),
    notes: normalizeOptionalString(raw.notes),
    nativeSuggestion: normalizeAssetNativeSuggestion(raw.nativeSuggestion),
  };
}

function normalizeSourcePages(value: unknown): DraftSourcePage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeSourcePage(entry))
    .filter((entry): entry is DraftSourcePage => Boolean(entry))
    .sort((left, right) => left.pageNumber - right.pageNumber);
}

function normalizeSourcePage(value: unknown): DraftSourcePage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
  const id = normalizeOptionalString(raw.id);
  const documentId = normalizeOptionalString(raw.documentId);
  const pageNumber =
    typeof raw.pageNumber === 'number' &&
    Number.isInteger(raw.pageNumber) &&
    raw.pageNumber > 0
      ? raw.pageNumber
      : null;

  if (!id || !documentId || pageNumber === null) {
    return null;
  }

  return {
    id,
    documentId,
    documentKind: raw.documentKind === 'CORRECTION' ? 'CORRECTION' : 'EXAM',
    pageNumber,
    width: readPositiveNumber(raw.width),
    height: readPositiveNumber(raw.height),
  };
}

function normalizeBlockRole(value: unknown): DraftBlockRole | null {
  if (
    value === 'PROMPT' ||
    value === 'SOLUTION' ||
    value === 'HINT' ||
    value === 'META'
  ) {
    return value;
  }

  return null;
}

function normalizeBlockType(value: unknown): DraftBlockType | null {
  if (
    value === 'paragraph' ||
    value === 'latex' ||
    value === 'image' ||
    value === 'code' ||
    value === 'heading' ||
    value === 'table' ||
    value === 'list' ||
    value === 'graph' ||
    value === 'tree'
  ) {
    return value;
  }

  return null;
}

function normalizeAssetKind(value: unknown): DraftAssetKind | null {
  if (
    value === 'image' ||
    value === 'table' ||
    value === 'tree' ||
    value === 'graph'
  ) {
    return value;
  }

  return null;
}

function normalizeAssetNativeSuggestion(
  value: unknown,
): DraftAsset['nativeSuggestion'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
  const type = normalizeAssetNativeSuggestionType(raw.type);

  if (!type) {
    return null;
  }

  return {
    type,
    value: typeof raw.value === 'string' ? raw.value : '',
    data:
      raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
        ? (raw.data as Record<string, unknown>)
        : null,
    status: normalizeAssetNativeSuggestionStatus(raw.status) ?? 'suggested',
    source:
      normalizeAssetNativeSuggestionSource(raw.source) ?? 'gemini_initial',
    notes: Array.isArray(raw.notes)
      ? raw.notes
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      : [],
  };
}

function normalizeAssetNativeSuggestionType(
  value: unknown,
): DraftAssetNativeSuggestionType | null {
  if (value === 'table' || value === 'tree' || value === 'graph') {
    return value;
  }

  return null;
}

function normalizeAssetNativeSuggestionStatus(
  value: unknown,
): DraftAssetNativeSuggestionStatus | null {
  if (value === 'suggested' || value === 'stale' || value === 'recovered') {
    return value;
  }

  return null;
}

function normalizeAssetNativeSuggestionSource(
  value: unknown,
): DraftAssetNativeSuggestionSource | null {
  if (value === 'gemini_initial' || value === 'crop_recovery') {
    return value;
  }

  return null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeTopicCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => entry.length > 0),
    ),
  );
}

function readNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function readInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }

  return value;
}

function readNonNegativeNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

function readPositiveNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return value;
}
