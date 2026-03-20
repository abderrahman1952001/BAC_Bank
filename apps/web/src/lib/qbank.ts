export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
export const ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL;

export type SessionType = 'NORMAL' | 'MAKEUP';
export type PublicationStatus = 'DRAFT' | 'PUBLISHED';
export type ExamVariantCode = 'SUJET_1' | 'SUJET_2';
export type ExamNodeType =
  | 'EXERCISE'
  | 'PART'
  | 'QUESTION'
  | 'SUBQUESTION'
  | 'CONTEXT';
export type BlockRole =
  | 'STEM'
  | 'PROMPT'
  | 'SOLUTION'
  | 'HINT'
  | 'RUBRIC'
  | 'META';
export type BlockType =
  | 'PARAGRAPH'
  | 'LATEX'
  | 'IMAGE'
  | 'CODE'
  | 'HEADING'
  | 'LIST'
  | 'TABLE';
export type MediaType = 'IMAGE' | 'FILE';

export type FiltersResponse = {
  streams: Array<{
    code: string;
    name: string;
    subjectCodes: string[];
  }>;
  subjects: Array<{
    code: string;
    name: string;
    streams: Array<{
      code: string;
      name: string;
    }>;
    streamCodes: string[];
  }>;
  years: number[];
  topics: Array<{
    code: string;
    name: string;
    subject: {
      code: string;
      name: string;
    };
    streamCodes: string[];
  }>;
  sessionTypes: SessionType[];
};

export type CatalogResponse = {
  streams: Array<{
    code: string;
    name: string;
    subjects: Array<{
      code: string;
      name: string;
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
  };
  subject: {
    code: string;
    name: string;
  };
  renderMode: 'legacy' | 'hierarchy';
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
  } | null;
  exerciseCount: number;
  exercises: Array<{
    id: string;
    orderIndex: number;
    title: string | null;
    introText: string | null;
    totalPoints: number;
    sujetNumber: 1 | 2;
    sujetLabel: string;
    questionCount: number;
    questions: Array<{
      id: string;
      orderIndex: number;
      points: number;
      difficultyLevel: number | null;
      contentFormat: 'MARKDOWN' | 'HYBRID';
      contentVersion: number | null;
      contentMarkdown: string | null;
      assets: QuestionAsset[];
      topics: Array<{
        code: string;
        name: string;
        isPrimary: boolean;
        weight: number;
      }>;
      answer: {
        officialAnswerMarkdown: string;
        markingSchemeMarkdown: string | null;
        commonMistakesMarkdown: string | null;
        examinerCommentaryMarkdown: string | null;
        updatedAt: string;
      } | null;
    }>;
  }>;
};

export type ExamHierarchyNode = {
  id: string;
  nodeType: ExamNodeType;
  orderIndex: number;
  label: string | null;
  title: string | null;
  maxPoints: number | null;
  status: PublicationStatus;
  metadata: unknown;
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

export type QuestionAsset = {
  id?: string;
  fileUrl: string;
  assetType: 'IMAGE' | 'GRAPH' | 'TABLE' | 'FILE';
  orderIndex: number;
  caption: string | null;
};

export type SessionPreviewResponse = {
  subjectCode: string;
  streamCode: string | null;
  years: number[];
  topicCodes: string[];
  sessionTypes: SessionType[];
  matchingExerciseCount: number;
  matchingSujetCount: number;
  matchingSujets: Array<{
    examId: string;
    year: number;
    stream: {
      code: string;
      name: string;
    };
    subject: {
      code: string;
      name: string;
    };
    sessionType: SessionType;
    sujetNumber: 1 | 2;
    sujetLabel: string;
    matchingExerciseCount: number;
  }>;
  maxSelectableExercises: number;
};

export type CreateSessionResponse = {
  id: string;
};

export type RecentPracticeSessionsResponse = {
  data: Array<{
    id: string;
    title: string | null;
    status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED';
    requestedExerciseCount: number;
    exerciseCount: number;
    createdAt: string;
  }>;
};

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;

    const message = Array.isArray(payload?.message)
      ? payload.message.join(' · ')
      : payload?.message;

    throw new Error(message || 'Failed request.');
  }

  return (await response.json()) as T;
}

export function toAssetUrl(fileUrl: string): string | null {
  if (!fileUrl) {
    return null;
  }

  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  if (fileUrl.startsWith('/')) {
    return fileUrl;
  }

  if (!ASSET_BASE_URL) {
    return null;
  }

  return `${ASSET_BASE_URL.replace(/\/$/, '')}/${fileUrl.replace(/^\//, '')}`;
}

export function formatSessionType(type: SessionType): string {
  return type === 'MAKEUP' ? 'استدراكية' : 'عادية';
}
