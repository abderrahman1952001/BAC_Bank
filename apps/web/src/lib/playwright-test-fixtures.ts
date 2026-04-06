import type {
  AuthOptionsResponse,
  AuthUser,
} from "@bac-bank/contracts/auth";
import type {
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
} from "@bac-bank/contracts/ingestion";
import type {
  FiltersResponse,
  PracticeSessionResponse,
  SessionPreviewResponse,
} from "@bac-bank/contracts/qbank";

export const playwrightTestStudentUser = {
  id: "student-test-user",
  username: "Sara",
  email: "sara@example.com",
  role: "STUDENT",
  stream: {
    code: "SE",
    name: "Sciences experimentales",
  },
  subscriptionStatus: "FREE",
} satisfies AuthUser;

export const playwrightTestAdminUser = {
  id: "admin-test-user",
  username: "BAC Admin",
  email: "admin@example.com",
  role: "ADMIN",
  stream: {
    code: "SE",
    name: "Sciences experimentales",
  },
  subscriptionStatus: "FREE",
} satisfies AuthUser;

export const playwrightTestAuthOptions = {
  streams: [
    {
      code: "SE",
      name: "Sciences experimentales",
    },
  ],
} satisfies AuthOptionsResponse;

export const playwrightTestFilters = {
  streams: [
    {
      code: "SE",
      name: "Sciences experimentales",
      isDefault: true,
      subjectCodes: ["MATH"],
    },
  ],
  subjects: [
    {
      code: "MATH",
      name: "Mathematics",
      isDefault: true,
      streams: [
        {
          code: "SE",
          name: "Sciences experimentales",
        },
      ],
      streamCodes: ["SE"],
    },
  ],
  years: [2025, 2024, 2023],
  topics: [
    {
      code: "ALG",
      name: "Algebra",
      slug: "algebra",
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      streamCodes: ["SE"],
    },
  ],
  sessionTypes: ["NORMAL", "MAKEUP"],
} satisfies FiltersResponse;

export const playwrightTestPreview = {
  subjectCode: "MATH",
  streamCode: "SE",
  streamCodes: ["SE"],
  years: [2025, 2024],
  topicCodes: ["ALG"],
  sessionTypes: ["NORMAL"],
  matchingExerciseCount: 3,
  matchingSujetCount: 2,
  sampleExercises: [
    {
      examId: "exam-1",
      exerciseNodeId: "exercise-1",
      orderIndex: 1,
      questionCount: 1,
      title: "Exercise 1",
      year: 2025,
      sujetLabel: "Sujet 1",
      sessionType: "NORMAL",
      sujetNumber: 1,
      stream: {
        code: "SE",
        name: "Sciences experimentales",
      },
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
    },
  ],
  matchingSujets: [
    {
      examId: "exam-1",
      year: 2025,
      stream: {
        code: "SE",
        name: "Sciences experimentales",
      },
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      sessionType: "NORMAL",
      sujetNumber: 1,
      sujetLabel: "Sujet 1",
      matchingExerciseCount: 2,
    },
    {
      examId: "exam-2",
      year: 2024,
      stream: {
        code: "SE",
        name: "Sciences experimentales",
      },
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      sessionType: "MAKEUP",
      sujetNumber: 2,
      sujetLabel: "Sujet 2",
      matchingExerciseCount: 1,
    },
  ],
  yearsDistribution: [
    {
      year: 2025,
      matchingExerciseCount: 2,
    },
    {
      year: 2024,
      matchingExerciseCount: 1,
    },
  ],
  streamsDistribution: [
    {
      stream: {
        code: "SE",
        name: "Sciences experimentales",
      },
      matchingExerciseCount: 3,
    },
  ],
  maxSelectableExercises: 12,
} satisfies SessionPreviewResponse;

export const playwrightTestPracticeSession = {
  id: "session-123",
  title: "Focused training",
  status: "IN_PROGRESS",
  requestedExerciseCount: 3,
  exerciseCount: 1,
  filters: {
    years: [2025, 2024],
    streamCodes: ["SE"],
    subjectCode: "MATH",
    topicCodes: ["ALG"],
    sessionTypes: ["NORMAL"],
  },
  progress: null,
  createdAt: "2026-03-28T12:00:00.000Z",
  updatedAt: "2026-03-28T12:00:00.000Z",
  exercises: [
    {
      sessionOrder: 1,
      id: "exercise-1",
      orderIndex: 1,
      title: "Exercise 1",
      totalPoints: 8,
      questionCount: 1,
      hierarchy: {
        exerciseNodeId: "exercise-1",
        exerciseLabel: "Exercise 1",
        contextBlocks: [],
        questions: [
          {
            id: "q1",
            orderIndex: 1,
            label: "Q1",
            points: 8,
            depth: 0,
            topics: [{ code: "ALG", name: "Algebra" }],
            promptBlocks: [
              {
                id: "prompt-1",
                role: "PROMPT",
                orderIndex: 1,
                blockType: "PARAGRAPH",
                textValue: "Solve x + 1 = 2",
                data: null,
                media: null,
              },
            ],
            solutionBlocks: [
              {
                id: "solution-1",
                role: "SOLUTION",
                orderIndex: 1,
                blockType: "PARAGRAPH",
                textValue: "x = 1",
                data: null,
                media: null,
              },
            ],
            hintBlocks: [],
            rubricBlocks: [],
          },
        ],
      },
      exam: {
        year: 2025,
        sessionType: "NORMAL",
        subject: {
          code: "MATH",
          name: "Mathematics",
        },
        stream: {
          code: "SE",
          name: "Sciences experimentales",
        },
      },
    },
  ],
} satisfies PracticeSessionResponse;

export const playwrightTestAdminJobSummary = {
  id: "job-1",
  label: "BAC 2025 · MATHEMATICS · SE",
  draft_kind: "ingestion",
  provider: "manual_upload",
  year: 2025,
  stream_codes: ["SE"],
  subject_code: "MATHEMATICS",
  session: "normal",
  min_year: 2025,
  status: "draft",
  source_document_count: 2,
  source_page_count: 6,
  workflow: {
    has_exam_document: true,
    has_correction_document: true,
    awaiting_correction: false,
    can_process: true,
    review_started: false,
  },
  published_paper_id: null,
  published_exams: [],
  created_at: "2026-03-28T12:00:00.000Z",
  updated_at: "2026-03-28T12:00:00.000Z",
} satisfies AdminIngestionJobSummary;

export const playwrightTestAdminJobResponse = {
  job: {
    id: "job-1",
    label: "BAC 2025 · MATHEMATICS · SE",
    draft_kind: "ingestion",
    provider: "manual_upload",
    year: 2025,
    stream_codes: ["SE"],
    subject_code: "MATHEMATICS",
    session: "normal",
    min_year: 2025,
    status: "draft",
    review_notes: null,
    error_message: null,
    published_paper_id: null,
    published_exams: [],
    created_at: "2026-03-28T12:00:00.000Z",
    updated_at: "2026-03-28T12:00:00.000Z",
  },
  workflow: playwrightTestAdminJobSummary.workflow,
  documents: [
    {
      id: "doc-exam",
      kind: "exam",
      file_name: "exam.pdf",
      mime_type: "application/pdf",
      page_count: 3,
      sha256: null,
      source_url: null,
      storage_key: "exam.pdf",
      download_url: "/api/v1/ingestion/documents/doc-exam/file",
      pages: [
        {
          id: "page-1",
          page_number: 1,
          width: 1200,
          height: 1600,
          image_url: "/api/v1/ingestion/pages/page-1/image",
        },
      ],
    },
    {
      id: "doc-correction",
      kind: "correction",
      file_name: "correction.pdf",
      mime_type: "application/pdf",
      page_count: 3,
      sha256: null,
      source_url: null,
      storage_key: "correction.pdf",
      download_url: "/api/v1/ingestion/documents/doc-correction/file",
      pages: [],
    },
  ],
  draft_json: {
    schema: "bac_ingestion_draft/v1",
    exam: {
      year: 2025,
      streamCode: "SE",
      subjectCode: "MATHEMATICS",
      sessionType: "NORMAL",
      provider: "manual_upload",
      title: "BAC 2025 · MATHEMATICS · SE",
      minYear: 2025,
      sourceListingUrl: null,
      sourceExamPageUrl: null,
      sourceCorrectionPageUrl: null,
      examDocumentId: "doc-exam",
      correctionDocumentId: "doc-correction",
      examDocumentStorageKey: "exam.pdf",
      correctionDocumentStorageKey: "correction.pdf",
      metadata: {},
    },
    sourcePages: [],
    assets: [],
    variants: [],
  },
  asset_preview_base_url: "/api/v1/ingestion/jobs/job-1/assets",
  validation: {
    errors: [],
    warnings: [],
    issues: [],
    can_approve: false,
    can_publish: false,
  },
} satisfies AdminIngestionJobResponse;

export function clonePlaywrightFixture<T>(value: T): T {
  return structuredClone(value);
}
