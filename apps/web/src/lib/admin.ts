import { fetchApi, fetchApiJson, withJsonRequest } from "@/lib/api-client";
import type { TopicOption } from "@/lib/topic-taxonomy";

export type AdminStatus = "draft" | "published";
export type AdminSession = "normal" | "rattrapage";
export type BlockType =
  | "paragraph"
  | "latex"
  | "image"
  | "code"
  | "heading"
  | "table"
  | "list"
  | "graph"
  | "tree";
export type AdminIngestionStatus =
  | "draft"
  | "queued"
  | "processing"
  | "in_review"
  | "approved"
  | "published"
  | "failed";
export type DraftVariantCode = "SUJET_1" | "SUJET_2";
export type DraftBlockRole = "PROMPT" | "SOLUTION" | "HINT" | "META";
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
export type DraftAssetNativeSuggestionType = "table" | "tree" | "graph";
export type DraftAssetNativeSuggestionStatus =
  | "suggested"
  | "stale"
  | "recovered";
export type DraftAssetNativeSuggestionSource =
  | "gemini_initial"
  | "crop_recovery";

export type ContentBlock = {
  id: string;
  type: BlockType;
  value: string;
  data?: Record<string, unknown> | null;
  meta?: {
    level?: number;
    caption?: string;
    language?: string;
  };
};

export type AdminDashboardResponse = {
  totals: {
    exams: number;
    exercises: number;
    questions: number;
  };
  workflow: {
    exams: {
      draft: number;
      published: number;
    };
    exercises: {
      draft: number;
      published: number;
    };
    questions: {
      draft: number;
      published: number;
    };
  };
};

export type AdminFiltersResponse = {
  subjects: Array<{
    code: string;
    name: string;
  }>;
  streams: Array<{
    code: string;
    name: string;
  }>;
  years: number[];
  topics: TopicOption[];
};

export type AdminExam = {
  id: string;
  year: number;
  subject: string;
  stream: string;
  session: AdminSession;
  original_pdf_url: string | null;
  status: AdminStatus;
  exercise_count: number;
  question_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminExamListResponse = {
  data: AdminExam[];
};

export type AdminBootstrapResponse = {
  imported_exams: number;
  imported_exercises: number;
  imported_questions: number;
  skipped_existing_exams: number;
  total_qbank_exams: number;
};

export type AdminIngestionPublishedExam = {
  id: string;
  stream_code: string;
  stream_name: string;
  is_primary: boolean;
};

export type AdminIngestionJobSummary = {
  id: string;
  label: string;
  provider: string;
  year: number;
  stream_code: string | null;
  subject_code: string | null;
  session: AdminSession | null;
  min_year: number;
  status: AdminIngestionStatus;
  source_document_count: number;
  source_page_count: number;
  workflow: {
    has_exam_document: boolean;
    has_correction_document: boolean;
    awaiting_correction: boolean;
    can_process: boolean;
    review_started: boolean;
  };
  published_exam_id: string | null;
  published_paper_id: string | null;
  published_exams: AdminIngestionPublishedExam[];
  created_at: string;
  updated_at: string;
};

export type AdminIngestionJobListResponse = {
  data: AdminIngestionJobSummary[];
};

export type AdminIngestionDraft = {
  schema: string;
  exam: {
    year: number;
    streamCode: string | null;
    subjectCode: string | null;
    sessionType: "NORMAL" | "MAKEUP";
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
  sourcePages: Array<{
    id: string;
    documentId: string;
    documentKind: "EXAM" | "CORRECTION";
    pageNumber: number;
    width: number;
    height: number;
  }>;
  assets: Array<{
    id: string;
    sourcePageId: string;
    documentKind: "EXAM" | "CORRECTION";
    pageNumber: number;
    variantCode: DraftVariantCode | null;
    role: DraftBlockRole;
    classification: DraftAssetClassification;
    cropBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
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
  }>;
  variants: Array<{
    code: DraftVariantCode;
    title: string;
    nodes: Array<{
      id: string;
      nodeType: "EXERCISE" | "PART" | "QUESTION" | "SUBQUESTION" | "CONTEXT";
      parentId: string | null;
      orderIndex: number;
      label: string | null;
      maxPoints: number | null;
      topicCodes: string[];
      blocks: Array<{
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
      }>;
    }>;
  }>;
};

export type AdminIngestionJobResponse = {
  job: {
    id: string;
    label: string;
    provider: string;
    year: number;
    stream_code: string | null;
    subject_code: string | null;
    session: AdminSession | null;
    min_year: number;
    status: AdminIngestionStatus;
    review_notes: string | null;
    error_message: string | null;
    published_exam_id: string | null;
    published_paper_id: string | null;
    published_exams: AdminIngestionPublishedExam[];
    created_at: string;
    updated_at: string;
  };
  workflow: {
    has_exam_document: boolean;
    has_correction_document: boolean;
    awaiting_correction: boolean;
    can_process: boolean;
    review_started: boolean;
  };
  documents: Array<{
    id: string;
    kind: "exam" | "correction";
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
  }>;
  draft_json: AdminIngestionDraft;
  asset_preview_base_url: string;
  validation: {
    errors: string[];
    warnings: string[];
    issues: AdminIngestionValidationIssue[];
    can_approve: boolean;
    can_publish: boolean;
  };
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

export type AdminIngestionRecoveryMode =
  | "text"
  | "latex"
  | "table"
  | "tree"
  | "graph";

export type AdminIngestionRecoveryResponse = {
  asset: {
    id: string;
    classification: DraftAssetClassification;
    source_page_id: string;
    page_number: number;
  };
  recovery: {
    mode: AdminIngestionRecoveryMode;
    type: DraftBlockType;
    value: string;
    data: Record<string, unknown> | null;
    notes: string[];
  };
};

export type AdminIngestionSnippetRecoveryResponse = {
  source_page: {
    id: string;
    page_number: number;
    document_kind: "EXAM" | "CORRECTION";
  };
  recovery: {
    mode: AdminIngestionRecoveryMode;
    type: DraftBlockType;
    value: string;
    data: Record<string, unknown> | null;
    notes: string[];
  };
};

export type AdminExercise = {
  id: string;
  title: string | null;
  order_index: number;
  theme: string | null;
  difficulty: string | null;
  tags: string[];
  topics: Array<{
    code: string;
    name: string;
  }>;
  status: AdminStatus;
  question_count?: number;
  created_at: string;
  updated_at: string;
};

export type AdminExamExercisesResponse = {
  exam: AdminExam;
  exercises: AdminExercise[];
};

export type QuestionNode = {
  id: string;
  title: string;
  parent_id: string | null;
  order_index: number;
  status: AdminStatus;
  points: number | null;
  topics: Array<{
    code: string;
    name: string;
  }>;
  content_blocks: ContentBlock[];
  solution_blocks: ContentBlock[];
  hint_blocks: ContentBlock[] | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseEditorResponse = {
  exercise: {
    id: string;
    title: string | null;
    order_index: number;
    status: AdminStatus;
    theme: string | null;
    difficulty: string | null;
    tags: string[];
    topics: Array<{
      code: string;
      name: string;
    }>;
    metadata: {
      year: number;
      session: AdminSession;
      subject: string;
      branch: string;
      points: number | null;
      context_blocks: ContentBlock[];
    };
    exam: AdminExam;
  };
  questions: QuestionNode[];
  validation_errors: string[];
};

function withAdminInit(init?: RequestInit): RequestInit {
  return withJsonRequest(init);
}

export async function fetchAdmin(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetchApi(
    `/admin${path}`,
    withAdminInit(init),
    "Admin request failed.",
  );
}

export async function fetchAdminJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  return fetchApiJson<T>(
    `/admin${path}`,
    withAdminInit(init),
    "Admin request failed.",
  );
}

export function makeEmptyBlock(type: BlockType = "paragraph"): ContentBlock {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    value: "",
  };
}
