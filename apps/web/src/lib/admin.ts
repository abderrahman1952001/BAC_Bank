import { API_BASE_URL, fetchJson } from '@/lib/qbank';
import { getClientRole } from '@/lib/client-auth';

export type AdminStatus = 'draft' | 'published';
export type AdminSession = 'normal' | 'rattrapage';
export type BlockType = 'paragraph' | 'latex' | 'image' | 'code' | 'heading';

export type ContentBlock = {
  id: string;
  type: BlockType;
  value: string;
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

export type AdminExercise = {
  id: string;
  title: string | null;
  order_index: number;
  theme: string | null;
  difficulty: string | null;
  tags: string[];
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
  const role = getClientRole();

  return {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': role,
      ...(init?.headers ?? {}),
    },
  };
}

export async function fetchAdminJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  return fetchJson<T>(`${API_BASE_URL}/admin${path}`, withAdminInit(init));
}

export function makeEmptyBlock(type: BlockType = 'paragraph'): ContentBlock {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    value: '',
  };
}
