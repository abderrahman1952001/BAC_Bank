import { fetchApiJson } from "@/lib/api-client";

export { API_BASE_URL } from "@/lib/api-client";
export const ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL;

export type SessionType = "NORMAL" | "MAKEUP";
export type PracticeStudyMode = "SOLVE" | "REVIEW";
export type PublicationStatus = "DRAFT" | "PUBLISHED";
export type ExamVariantCode = "SUJET_1" | "SUJET_2";
export type ExamNodeType =
  | "EXERCISE"
  | "PART"
  | "QUESTION"
  | "SUBQUESTION"
  | "CONTEXT";
export type BlockRole =
  | "STEM"
  | "PROMPT"
  | "SOLUTION"
  | "HINT"
  | "RUBRIC"
  | "META";
export type BlockType =
  | "PARAGRAPH"
  | "LATEX"
  | "IMAGE"
  | "CODE"
  | "HEADING"
  | "LIST"
  | "TABLE"
  | "GRAPH"
  | "TREE";
export type MediaType = "IMAGE" | "FILE";

export type FiltersResponse = {
  streams: Array<{
    code: string;
    name: string;
    isDefault?: boolean;
    family?: {
      code: string;
      name: string;
    };
    subjectCodes: string[];
  }>;
  subjects: Array<{
    code: string;
    name: string;
    isDefault?: boolean;
    family?: {
      code: string;
      name: string;
    };
    streams: Array<{
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    }>;
    streamCodes: string[];
  }>;
  streamFamilies?: Array<{
    code: string;
    name: string;
    streams: Array<{
      code: string;
      name: string;
      isDefault: boolean;
    }>;
  }>;
  subjectFamilies?: Array<{
    code: string;
    name: string;
    subjects: Array<{
      code: string;
      name: string;
      isDefault: boolean;
    }>;
  }>;
  years: number[];
  topics: Array<{
    code: string;
    name: string;
    slug: string;
    parentCode: string | null;
    displayOrder: number;
    isSelectable: boolean;
    subject: {
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    };
    streamCodes: string[];
  }>;
  sessionTypes: SessionType[];
};

export type CatalogResponse = {
  streams: Array<{
    code: string;
    name: string;
    family?: {
      code: string;
      name: string;
    };
    subjects: Array<{
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
      years: Array<{
        year: number;
        sujets: Array<{
          examId: string;
          sujetNumber: 1 | 2;
          label: string;
          sessionType: SessionType;
          exerciseCount: number;
        }>;
      }>;
    }>;
  }>;
};

export type ExamResponse = {
  id: string;
  year: number;
  sessionType: SessionType;
  durationMinutes: number;
  totalPoints: number;
  officialSourceReference: string | null;
  stream: {
    code: string;
    name: string;
    family?: {
      code: string;
      name: string;
    };
  };
  subject: {
    code: string;
    name: string;
    family?: {
      code: string;
      name: string;
    };
  };
  selectedSujetNumber: 1 | 2 | null;
  selectedSujetLabel: string | null;
  availableSujets: Array<{
    sujetNumber: 1 | 2;
    label: string;
  }>;
  selectedVariantCode?: ExamVariantCode | null;
  hierarchy?: {
    variantId: string;
    variantCode: ExamVariantCode;
    title: string;
    status: PublicationStatus;
    nodeCount: number;
    exercises: ExamHierarchyNode[];
  };
  exerciseCount: number;
  exercises: Array<{
    id: string;
    orderIndex: number;
    title: string | null;
    totalPoints: number;
    questionCount: number;
  }>;
};

export type PracticeSessionResponse = {
  id: string;
  title: string | null;
  status: "CREATED" | "IN_PROGRESS" | "COMPLETED";
  requestedExerciseCount: number;
  exerciseCount: number;
  progress: PracticeSessionProgress | null;
  filters: {
    years?: number[];
    streamCode?: string | null;
    streamCodes?: string[];
    subjectCode?: string | null;
    topicCodes?: string[];
    sessionTypes?: string[];
  } | null;
  exercises: Array<{
    sessionOrder: number;
    id: string;
    orderIndex: number;
    title: string | null;
    totalPoints: number;
    questionCount: number;
    hierarchy: {
      exerciseNodeId: string;
      exerciseLabel: string | null;
      contextBlocks: ExamHierarchyBlock[];
      questions: Array<{
        id: string;
        orderIndex: number;
        label: string;
        points: number;
        depth: number;
        topics: Array<{
          code: string;
          name: string;
        }>;
        promptBlocks: ExamHierarchyBlock[];
        solutionBlocks: ExamHierarchyBlock[];
        hintBlocks: ExamHierarchyBlock[];
        rubricBlocks: ExamHierarchyBlock[];
      }>;
    };
    exam: {
      year: number;
      sessionType: "NORMAL" | "MAKEUP";
      subject: {
        code: string;
        name: string;
        family?: {
          code: string;
          name: string;
        };
      };
      stream: {
        code: string;
        name: string;
        family?: {
          code: string;
          name: string;
        };
      };
    };
  }>;
};

export type ExamHierarchyNode = {
  id: string;
  nodeType: ExamNodeType;
  orderIndex: number;
  label: string | null;
  maxPoints: number | null;
  status: PublicationStatus;
  metadata: unknown;
  topics: Array<{
    code: string;
    name: string;
  }>;
  blocks: ExamHierarchyBlock[];
  children: ExamHierarchyNode[];
};

export type ExamHierarchyBlock = {
  id: string;
  role: BlockRole;
  orderIndex: number;
  blockType: BlockType;
  textValue: string | null;
  data: unknown;
  media: {
    id: string;
    url: string;
    type: MediaType;
    metadata: unknown;
  } | null;
};

export type SessionPreviewResponse = {
  subjectCode: string;
  streamCode: string | null;
  streamCodes: string[];
  years: number[];
  topicCodes: string[];
  sessionTypes: SessionType[];
  matchingExerciseCount: number;
  matchingSujetCount: number;
  sampleExercises: Array<{
    exerciseNodeId: string;
    orderIndex: number;
    title: string | null;
    questionCount: number;
    examId: string;
    year: number;
    stream: {
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    };
    subject: {
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    };
    sessionType: SessionType;
    sujetNumber: 1 | 2;
    sujetLabel: string;
  }>;
  matchingSujets: Array<{
    examId: string;
    year: number;
    stream: {
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    };
    subject: {
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    };
    sessionType: SessionType;
    sujetNumber: 1 | 2;
    sujetLabel: string;
    matchingExerciseCount: number;
  }>;
  yearsDistribution: Array<{
    year: number;
    matchingExerciseCount: number;
  }>;
  streamsDistribution: Array<{
    stream: {
      code: string;
      name: string;
    };
    matchingExerciseCount: number;
  }>;
  maxSelectableExercises: number;
};

export type CreateSessionResponse = {
  id: string;
};

export type PracticeSessionProgress = {
  activeExerciseId: string | null;
  activeQuestionId: string | null;
  mode: PracticeStudyMode;
  questionStates: Array<{
    questionId: string;
    opened: boolean;
    completed: boolean;
    skipped: boolean;
    solutionViewed: boolean;
  }>;
  summary: {
    totalQuestionCount: number;
    completedQuestionCount: number;
    skippedQuestionCount: number;
    unansweredQuestionCount: number;
    solutionViewedCount: number;
  };
  updatedAt: string;
};

export type UpdateSessionProgressResponse = {
  id: string;
  status: "CREATED" | "IN_PROGRESS" | "COMPLETED";
  progress: PracticeSessionProgress | null;
  updatedAt: string;
};

export type RecentPracticeSessionsResponse = {
  data: Array<{
    id: string;
    title: string | null;
    status: "CREATED" | "IN_PROGRESS" | "COMPLETED";
    requestedExerciseCount: number;
    exerciseCount: number;
    createdAt: string;
  }>;
};

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  return fetchApiJson<T>(url, init);
}

export function toAssetUrl(fileUrl: string): string | null {
  if (!fileUrl) {
    return null;
  }

  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  if (fileUrl.startsWith("/")) {
    return fileUrl;
  }

  if (!ASSET_BASE_URL) {
    return null;
  }

  return `${ASSET_BASE_URL.replace(/\/$/, "")}/${fileUrl.replace(/^\//, "")}`;
}

export function formatSessionType(type: SessionType): string {
  return type === "MAKEUP" ? "استدراكية" : "عادية";
}
