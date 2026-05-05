import {
  dateLikeSchema,
  jsonRecordSchema,
  parseContract,
  z,
} from "./shared.js";
import type { SessionType as StudySessionType } from "./study.js";

export const INGESTION_DRAFT_SCHEMA = "bac_ingestion_draft/v1";

export type AdminIngestionStatus =
  | "draft"
  | "queued"
  | "processing"
  | "in_review"
  | "approved"
  | "published"
  | "failed";
export type AdminIngestionDraftKind = "ingestion" | "revision";
export type DraftVariantCode = "SUJET_1" | "SUJET_2";
export type DraftBlockRole = "PROMPT" | "SOLUTION" | "HINT" | "RUBRIC" | "META";
export type DraftBlockType =
  | "paragraph"
  | "latex"
  | "image"
  | "code"
  | "heading"
  | "table"
  | "list"
  | "graph"
  | "tree";
export type DraftAssetClassification = "image" | "table" | "tree" | "graph";
export type DraftAssetKind = DraftAssetClassification;
export type DraftAssetNativeSuggestionType = "table" | "tree" | "graph";
export type DraftAssetNativeSuggestionStatus = "suggested" | "stale";
export type DraftAssetNativeSuggestionSource =
  | "codex_app_extraction"
  | "reviewed_extract"
  | "manual_review";
export type DraftSessionType = StudySessionType;
export type DraftDocumentKind = "EXAM" | "CORRECTION";
export type AdminIngestionSession = "normal" | "rattrapage";
export type AdminIngestionDocumentKind = "exam" | "correction";

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
  classification: DraftAssetClassification;
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
  nodeType: "EXERCISE" | "PART" | "QUESTION" | "SUBQUESTION" | "CONTEXT";
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

export type AdminIngestionDraft = IngestionDraft;

export type AdminIngestionPublishedExam = {
  id: string;
  stream_code: string;
  stream_name: string;
};

export type AdminIngestionActiveOperation =
  | "idle"
  | "processing"
  | "publishing";

export type AdminIngestionWorkflow = {
  has_exam_document: boolean;
  has_correction_document: boolean;
  awaiting_correction: boolean;
  can_process: boolean;
  review_started: boolean;
  active_operation: AdminIngestionActiveOperation;
};

export type AdminIngestionJobSummary = {
  id: string;
  label: string;
  draft_kind: AdminIngestionDraftKind;
  provider: string;
  year: number;
  stream_codes: string[];
  subject_code: string | null;
  session: AdminIngestionSession | null;
  min_year: number;
  status: AdminIngestionStatus;
  source_document_count: number;
  source_page_count: number;
  workflow: AdminIngestionWorkflow;
  published_paper_id: string | null;
  published_exams: AdminIngestionPublishedExam[];
  created_at: string | Date;
  updated_at: string | Date;
};

export type AdminIngestionJobListResponse = {
  data: AdminIngestionJobSummary[];
};

export type AdminIngestionValidationIssue = {
  id: string;
  severity: "error" | "warning";
  code: string;
  target: "exam" | "variant" | "node" | "block" | "asset" | "source_page";
  message: string;
  variantCode: DraftVariantCode | null;
  nodeId: string | null;
  blockId: string | null;
  assetId: string | null;
  sourcePageId: string | null;
  pageNumber: number | null;
  field: string | null;
};

export type AdminIngestionValidation = {
  errors: string[];
  warnings: string[];
  issues: AdminIngestionValidationIssue[];
  can_approve: boolean;
  can_publish: boolean;
};

export type AdminIngestionDocument = {
  id: string;
  kind: AdminIngestionDocumentKind;
  file_name: string;
  mime_type: string;
  page_count: number | null;
  sha256: string | null;
  source_url: string | null;
  storage_key: string;
  download_url: string;
  pages: Array<{
    id: string;
    page_number: number;
    width: number;
    height: number;
    image_url: string;
  }>;
};

export type AdminIngestionJobResponse = {
  job: {
    id: string;
    label: string;
    draft_kind: AdminIngestionDraftKind;
    provider: string;
    year: number;
    stream_codes: string[];
    subject_code: string | null;
    session: AdminIngestionSession | null;
    min_year: number;
    status: AdminIngestionStatus;
    review_notes: string | null;
    error_message: string | null;
    published_paper_id: string | null;
    published_exams: AdminIngestionPublishedExam[];
    created_at: string | Date;
    updated_at: string | Date;
  };
  workflow: AdminIngestionWorkflow;
  documents: AdminIngestionDocument[];
  draft_json: AdminIngestionDraft;
  asset_preview_base_url: string;
  validation: AdminIngestionValidation;
};

export type UpdateIngestionJobPayload = {
  draft_json?: IngestionDraft;
  review_notes?: string | null;
};

export type PublishIngestionJobResponse = {
  job_id: string;
  published_paper_id: string;
  published_exam_ids: string[];
};

export const adminIngestionActiveOperationSchema: z.ZodType<AdminIngestionActiveOperation> =
  z.enum(["idle", "processing", "publishing"]);

export const adminIngestionStatusSchema: z.ZodType<AdminIngestionStatus> =
  z.enum([
    "draft",
    "queued",
    "processing",
    "in_review",
    "approved",
    "published",
    "failed",
  ]);

export const adminIngestionDraftKindSchema: z.ZodType<AdminIngestionDraftKind> =
  z.enum(["ingestion", "revision"]);

export const draftVariantCodeSchema: z.ZodType<DraftVariantCode> = z.enum([
  "SUJET_1",
  "SUJET_2",
]);

export const draftBlockRoleSchema: z.ZodType<DraftBlockRole> = z.enum([
  "PROMPT",
  "SOLUTION",
  "HINT",
  "RUBRIC",
  "META",
]);

export const draftBlockTypeSchema: z.ZodType<DraftBlockType> = z.enum([
  "paragraph",
  "latex",
  "image",
  "code",
  "heading",
  "table",
  "list",
  "graph",
  "tree",
]);

export const draftAssetClassificationSchema: z.ZodType<DraftAssetClassification> =
  z.enum(["image", "table", "tree", "graph"]);

export const draftAssetNativeSuggestionTypeSchema: z.ZodType<DraftAssetNativeSuggestionType> =
  z.enum(["table", "tree", "graph"]);

export const draftAssetNativeSuggestionStatusSchema: z.ZodType<DraftAssetNativeSuggestionStatus> =
  z.enum(["suggested", "stale"]);

export const draftAssetNativeSuggestionSourceSchema: z.ZodType<DraftAssetNativeSuggestionSource> =
  z.enum(["codex_app_extraction", "reviewed_extract", "manual_review"]);

export const draftDocumentKindSchema: z.ZodType<DraftDocumentKind> = z.enum([
  "EXAM",
  "CORRECTION",
]);

export const adminIngestionSessionSchema: z.ZodType<AdminIngestionSession> =
  z.enum(["normal", "rattrapage"]);

export const adminIngestionDocumentKindSchema: z.ZodType<AdminIngestionDocumentKind> =
  z.enum(["exam", "correction"]);

export const draftCropBoxSchema: z.ZodType<DraftCropBox> = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const draftAssetNativeSuggestionSchema = z.object({
  type: draftAssetNativeSuggestionTypeSchema,
  value: z.string(),
  data: jsonRecordSchema.nullable(),
  status: draftAssetNativeSuggestionStatusSchema,
  source: draftAssetNativeSuggestionSourceSchema,
  notes: z.array(z.string()),
});

export const draftAssetSchema: z.ZodType<DraftAsset> = z.object({
  id: z.string(),
  sourcePageId: z.string(),
  documentKind: draftDocumentKindSchema,
  pageNumber: z.number(),
  variantCode: draftVariantCodeSchema.nullable(),
  role: draftBlockRoleSchema,
  classification: draftAssetClassificationSchema,
  cropBox: draftCropBoxSchema,
  label: z.string().nullable(),
  notes: z.string().nullable(),
  nativeSuggestion: draftAssetNativeSuggestionSchema.nullable().optional(),
});

export const draftBlockSchema: z.ZodType<DraftBlock> = z.object({
  id: z.string(),
  role: draftBlockRoleSchema,
  type: draftBlockTypeSchema,
  value: z.string(),
  assetId: z.string().nullable().optional(),
  data: jsonRecordSchema.nullable().optional(),
  meta: z
    .object({
      level: z.number().optional(),
      language: z.string().optional(),
    })
    .optional(),
});

export const draftNodeSchema: z.ZodType<DraftNode> = z.object({
  id: z.string(),
  nodeType: z.enum(["EXERCISE", "PART", "QUESTION", "SUBQUESTION", "CONTEXT"]),
  parentId: z.string().nullable(),
  orderIndex: z.number(),
  label: z.string().nullable(),
  maxPoints: z.number().nullable(),
  topicCodes: z.array(z.string()),
  blocks: z.array(draftBlockSchema),
});

export const draftVariantSchema: z.ZodType<DraftVariant> = z.object({
  code: draftVariantCodeSchema,
  title: z.string(),
  nodes: z.array(draftNodeSchema),
});

export const draftSourcePageSchema: z.ZodType<DraftSourcePage> = z.object({
  id: z.string(),
  documentId: z.string(),
  documentKind: draftDocumentKindSchema,
  pageNumber: z.number(),
  width: z.number(),
  height: z.number(),
});

export const ingestionDraftSchema: z.ZodType<IngestionDraft> = z.object({
  schema: z.literal(INGESTION_DRAFT_SCHEMA),
  exam: z.object({
    year: z.number(),
    streamCode: z.string().nullable(),
    subjectCode: z.string().nullable(),
    sessionType: z.enum(["NORMAL", "MAKEUP"]),
    provider: z.string(),
    title: z.string(),
    minYear: z.number(),
    sourceListingUrl: z.string().nullable(),
    sourceExamPageUrl: z.string().nullable(),
    sourceCorrectionPageUrl: z.string().nullable(),
    examDocumentId: z.string().nullable(),
    correctionDocumentId: z.string().nullable(),
    examDocumentStorageKey: z.string().nullable(),
    correctionDocumentStorageKey: z.string().nullable(),
    metadata: jsonRecordSchema,
  }),
  sourcePages: z.array(draftSourcePageSchema),
  assets: z.array(draftAssetSchema),
  variants: z.array(draftVariantSchema),
});

type JsonRecord = Record<string, unknown>;

const DEFAULT_DRAFT_VARIANTS: DraftVariant[] = [
  {
    code: "SUJET_1",
    title: "الموضوع الأول",
    nodes: [],
  },
  {
    code: "SUJET_2",
    title: "الموضوع الثاني",
    nodes: [],
  },
];

export function normalizeIngestionDraft(value: unknown): IngestionDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("draft_json must be a JSON object.");
  }

  const raw = value as JsonRecord;
  const examRaw =
    raw.exam && typeof raw.exam === "object" && !Array.isArray(raw.exam)
      ? (raw.exam as JsonRecord)
      : {};

  const normalized: IngestionDraft = {
    schema: INGESTION_DRAFT_SCHEMA,
    exam: {
      year: readInteger(examRaw.year, "draft_json.exam.year"),
      streamCode: normalizeOptionalString(examRaw.streamCode),
      subjectCode: normalizeOptionalString(examRaw.subjectCode),
      sessionType:
        examRaw.sessionType === "MAKEUP"
          ? "MAKEUP"
          : ("NORMAL" as DraftSessionType),
      provider: readNonEmptyString(
        examRaw.provider,
        "draft_json.exam.provider",
      ),
      title: readNonEmptyString(examRaw.title, "draft_json.exam.title"),
      minYear: readInteger(examRaw.minYear, "draft_json.exam.minYear"),
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
        typeof examRaw.metadata === "object" &&
        !Array.isArray(examRaw.metadata)
          ? (examRaw.metadata as Record<string, unknown>)
          : {},
    },
    sourcePages: normalizeSourcePages(raw.sourcePages),
    assets: normalizeAssets(raw.assets),
    variants: normalizeVariants(raw.variants),
  };

  return parseContract(ingestionDraftSchema, normalized, "IngestionDraft");
}

function defaultDraftVariants(): DraftVariant[] {
  return DEFAULT_DRAFT_VARIANTS.map((variant) => ({
    ...variant,
    nodes: [],
  }));
}

function normalizeVariants(value: unknown): DraftVariant[] {
  if (!Array.isArray(value) || value.length === 0) {
    return defaultDraftVariants();
  }

  const variants = value
    .map((entry) => normalizeVariant(entry))
    .filter((entry): entry is DraftVariant => Boolean(entry));

  if (!variants.length) {
    return defaultDraftVariants();
  }

  const seenCodes = new Set<DraftVariantCode>();

  for (const variant of variants) {
    seenCodes.add(variant.code);
  }

  if (!seenCodes.has("SUJET_1")) {
    variants.push({
      code: "SUJET_1",
      title: "الموضوع الأول",
      nodes: [],
    });
  }

  if (!seenCodes.has("SUJET_2")) {
    variants.push({
      code: "SUJET_2",
      title: "الموضوع الثاني",
      nodes: [],
    });
  }

  return variants.sort((left, right) => left.code.localeCompare(right.code));
}

function normalizeVariant(value: unknown): DraftVariant | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
  const code =
    raw.code === "SUJET_2"
      ? "SUJET_2"
      : raw.code === "SUJET_1"
        ? "SUJET_1"
        : null;

  if (!code) {
    return null;
  }

  return {
    code,
    title:
      normalizeOptionalString(raw.title) ??
      (code === "SUJET_2" ? "الموضوع الثاني" : "الموضوع الأول"),
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
  const nodeType =
    raw.nodeType === "PART" ||
    raw.nodeType === "QUESTION" ||
    raw.nodeType === "SUBQUESTION" ||
    raw.nodeType === "CONTEXT" ||
    raw.nodeType === "EXERCISE"
      ? raw.nodeType
      : null;

  if (!nodeType) {
    return null;
  }

  return {
    id: normalizeOptionalString(raw.id) ?? createDraftIdentifier("draft-node"),
    nodeType,
    parentId: normalizeOptionalString(raw.parentId),
    orderIndex:
      typeof raw.orderIndex === "number" &&
      Number.isInteger(raw.orderIndex) &&
      raw.orderIndex > 0
        ? raw.orderIndex
        : fallbackIndex + 1,
    label:
      normalizeOptionalString(raw.label) ?? normalizeOptionalString(raw.title),
    maxPoints:
      typeof raw.maxPoints === "number" && Number.isFinite(raw.maxPoints)
        ? raw.maxPoints
        : null,
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
  const role = normalizeBlockRole(raw.role);
  const type = normalizeBlockType(raw.type);

  if (!role || !type) {
    return null;
  }

  const metaRaw =
    raw.meta && typeof raw.meta === "object" && !Array.isArray(raw.meta)
      ? (raw.meta as JsonRecord)
      : null;

  return {
    id: normalizeOptionalString(raw.id) ?? `draft-block-${index + 1}`,
    role,
    type,
    value: typeof raw.value === "string" ? raw.value : "",
    assetId: normalizeOptionalString(raw.assetId),
    data:
      raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
        ? (raw.data as Record<string, unknown>)
        : null,
    ...(metaRaw
      ? {
          meta: {
            ...(typeof metaRaw.level === "number" &&
            Number.isInteger(metaRaw.level)
              ? {
                  level: metaRaw.level,
                }
              : {}),
            ...(typeof metaRaw.language === "string" && metaRaw.language.trim()
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
  const sourcePageId = normalizeOptionalString(raw.sourcePageId);
  const pageNumber =
    typeof raw.pageNumber === "number" &&
    Number.isInteger(raw.pageNumber) &&
    raw.pageNumber > 0
      ? raw.pageNumber
      : null;

  if (!sourcePageId || pageNumber === null) {
    return null;
  }

  return {
    id: normalizeOptionalString(raw.id) ?? createDraftIdentifier("draft-asset"),
    sourcePageId,
    documentKind: raw.documentKind === "CORRECTION" ? "CORRECTION" : "EXAM",
    pageNumber,
    variantCode:
      raw.variantCode === "SUJET_1" || raw.variantCode === "SUJET_2"
        ? raw.variantCode
        : null,
    role: normalizeBlockRole(raw.role) ?? "PROMPT",
    classification: normalizeAssetKind(raw.classification) ?? "image",
    cropBox: normalizeCropBox(raw.cropBox),
    label: normalizeOptionalString(raw.label),
    notes: normalizeOptionalString(raw.notes),
    nativeSuggestion: normalizeAssetNativeSuggestion(raw.nativeSuggestion),
  };
}

function normalizeCropBox(value: unknown): DraftCropBox {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as JsonRecord)
      : {};

  return {
    x: readNonNegativeNumber(raw.x),
    y: readNonNegativeNumber(raw.y),
    width: readPositiveNumber(raw.width),
    height: readPositiveNumber(raw.height),
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
  const id = normalizeOptionalString(raw.id);
  const documentId = normalizeOptionalString(raw.documentId);
  const pageNumber =
    typeof raw.pageNumber === "number" &&
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
    documentKind: raw.documentKind === "CORRECTION" ? "CORRECTION" : "EXAM",
    pageNumber,
    width: readPositiveNumber(raw.width),
    height: readPositiveNumber(raw.height),
  };
}

function normalizeBlockRole(value: unknown): DraftBlockRole | null {
  if (
    value === "PROMPT" ||
    value === "SOLUTION" ||
    value === "HINT" ||
    value === "RUBRIC" ||
    value === "META"
  ) {
    return value;
  }

  return null;
}

function normalizeBlockType(value: unknown): DraftBlockType | null {
  if (
    value === "paragraph" ||
    value === "latex" ||
    value === "image" ||
    value === "code" ||
    value === "heading" ||
    value === "table" ||
    value === "list" ||
    value === "graph" ||
    value === "tree"
  ) {
    return value;
  }

  return null;
}

function normalizeAssetKind(value: unknown): DraftAssetClassification | null {
  if (
    value === "image" ||
    value === "table" ||
    value === "tree" ||
    value === "graph"
  ) {
    return value;
  }

  return null;
}

function normalizeAssetNativeSuggestion(
  value: unknown,
): DraftAsset["nativeSuggestion"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as JsonRecord;
  const type = normalizeAssetNativeSuggestionType(raw.type);

  if (!type) {
    return null;
  }

  return {
    type,
    value: typeof raw.value === "string" ? raw.value : "",
    data:
      raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
        ? (raw.data as Record<string, unknown>)
        : null,
    status: normalizeAssetNativeSuggestionStatus(raw.status) ?? "suggested",
    source:
      normalizeAssetNativeSuggestionSource(raw.source) ?? "reviewed_extract",
    notes: Array.isArray(raw.notes)
      ? raw.notes
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      : [],
  };
}

function normalizeAssetNativeSuggestionType(
  value: unknown,
): DraftAssetNativeSuggestionType | null {
  if (value === "table" || value === "tree" || value === "graph") {
    return value;
  }

  return null;
}

function normalizeAssetNativeSuggestionStatus(
  value: unknown,
): DraftAssetNativeSuggestionStatus | null {
  if (value === "suggested" || value === "stale") {
    return value;
  }

  if (value === "recovered") {
    return "suggested";
  }

  return null;
}

function normalizeAssetNativeSuggestionSource(
  value: unknown,
): DraftAssetNativeSuggestionSource | null {
  if (
    value === "codex_app_extraction" ||
    value === "reviewed_extract" ||
    value === "manual_review"
  ) {
    return value;
  }

  if (value === "gemini_initial" || value === "crop_recovery") {
    return "reviewed_extract";
  }

  return null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
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
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => entry.length > 0),
    ),
  );
}

function readNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function readInteger(value: unknown, fieldName: string): number {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^-?\d+$/u.test(trimmed)) {
      value = Number.parseInt(trimmed, 10);
    }
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }

  return value;
}

function readNonNegativeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

function readPositiveNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return value;
}

function createDraftIdentifier(prefix: string) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const adminIngestionPublishedExamSchema: z.ZodType<AdminIngestionPublishedExam> =
  z.object({
    id: z.string(),
    stream_code: z.string(),
    stream_name: z.string(),
  });

const adminIngestionWorkflowSchema: z.ZodType<AdminIngestionWorkflow> =
  z.object({
    has_exam_document: z.boolean(),
    has_correction_document: z.boolean(),
    awaiting_correction: z.boolean(),
    can_process: z.boolean(),
    review_started: z.boolean(),
    active_operation: adminIngestionActiveOperationSchema,
  });

const adminIngestionValidationIssueSchema: z.ZodType<AdminIngestionValidationIssue> =
  z.object({
    id: z.string(),
    severity: z.enum(["error", "warning"]),
    code: z.string(),
    target: z.enum([
      "exam",
      "variant",
      "node",
      "block",
      "asset",
      "source_page",
    ]),
    message: z.string(),
    variantCode: draftVariantCodeSchema.nullable(),
    nodeId: z.string().nullable(),
    blockId: z.string().nullable(),
    assetId: z.string().nullable(),
    sourcePageId: z.string().nullable(),
    pageNumber: z.number().nullable(),
    field: z.string().nullable(),
  });

const adminIngestionValidationSchema: z.ZodType<AdminIngestionValidation> =
  z.object({
    errors: z.array(z.string()),
    warnings: z.array(z.string()),
    issues: z.array(adminIngestionValidationIssueSchema),
    can_approve: z.boolean(),
    can_publish: z.boolean(),
  });

const adminIngestionDocumentSchema: z.ZodType<AdminIngestionDocument> =
  z.object({
    id: z.string(),
    kind: adminIngestionDocumentKindSchema,
    file_name: z.string(),
    mime_type: z.string(),
    page_count: z.number().nullable(),
    sha256: z.string().nullable(),
    source_url: z.string().nullable(),
    storage_key: z.string(),
    download_url: z.string(),
    pages: z.array(
      z.object({
        id: z.string(),
        page_number: z.number(),
        width: z.number(),
        height: z.number(),
        image_url: z.string(),
      }),
    ),
  });

const adminIngestionJobSchema = z.object({
  id: z.string(),
  label: z.string(),
  draft_kind: adminIngestionDraftKindSchema,
  provider: z.string(),
  year: z.number(),
  stream_codes: z.array(z.string()),
  subject_code: z.string().nullable(),
  session: adminIngestionSessionSchema.nullable(),
  min_year: z.number(),
  status: adminIngestionStatusSchema,
  review_notes: z.string().nullable(),
  error_message: z.string().nullable(),
  published_paper_id: z.string().nullable(),
  published_exams: z.array(adminIngestionPublishedExamSchema),
  created_at: dateLikeSchema,
  updated_at: dateLikeSchema,
});

const adminIngestionJobSummarySchema: z.ZodType<AdminIngestionJobSummary> =
  z.object({
    id: z.string(),
    label: z.string(),
    draft_kind: adminIngestionDraftKindSchema,
    provider: z.string(),
    year: z.number(),
    stream_codes: z.array(z.string()),
    subject_code: z.string().nullable(),
    session: adminIngestionSessionSchema.nullable(),
    min_year: z.number(),
    status: adminIngestionStatusSchema,
    source_document_count: z.number(),
    source_page_count: z.number(),
    workflow: adminIngestionWorkflowSchema,
    published_paper_id: z.string().nullable(),
    published_exams: z.array(adminIngestionPublishedExamSchema),
    created_at: dateLikeSchema,
    updated_at: dateLikeSchema,
  });

export const adminIngestionJobListResponseSchema: z.ZodType<AdminIngestionJobListResponse> =
  z.object({
    data: z.array(adminIngestionJobSummarySchema),
  });

export const adminIngestionJobResponseSchema: z.ZodType<AdminIngestionJobResponse> =
  z.object({
    job: adminIngestionJobSchema,
    workflow: adminIngestionWorkflowSchema,
    documents: z.array(adminIngestionDocumentSchema),
    draft_json: ingestionDraftSchema,
    asset_preview_base_url: z.string(),
    validation: adminIngestionValidationSchema,
  });

export const updateIngestionJobPayloadSchema: z.ZodType<UpdateIngestionJobPayload> =
  z.object({
    draft_json: ingestionDraftSchema.optional(),
    review_notes: z.string().nullable().optional(),
  });

export function parseAdminIngestionJobListResponse(value: unknown) {
  return parseContract(
    adminIngestionJobListResponseSchema,
    value,
    "AdminIngestionJobListResponse",
  );
}

export function parseAdminIngestionJobResponse(value: unknown) {
  return parseContract(
    adminIngestionJobResponseSchema,
    value,
    "AdminIngestionJobResponse",
  );
}

export function parseUpdateIngestionJobPayload(value: unknown) {
  return parseContract(
    updateIngestionJobPayloadSchema,
    value,
    "UpdateIngestionJobPayload",
  );
}
