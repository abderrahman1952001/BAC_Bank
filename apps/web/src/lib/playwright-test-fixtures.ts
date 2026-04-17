import type { AuthOptionsResponse, AuthUser } from "@bac-bank/contracts/auth";
import type {
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
} from "@bac-bank/contracts/ingestion";
import type {
  CatalogResponse,
  FiltersResponse,
  MyMistakesResponse,
  RecentExerciseStatesResponse,
  StudyRoadmapsResponse,
  StudySessionResponse,
  SessionPreviewResponse,
  WeakPointInsightsResponse,
} from "@bac-bank/contracts/study";

const playwrightFreeStudyEntitlements = {
  tier: "FREE",
  capabilities: {
    topicDrill: true,
    mixedDrill: true,
    weakPointDrill: false,
    paperSimulation: true,
    aiExplanation: false,
    weakPointInsight: false,
  },
  quotas: {
    drillStarts: {
      monthlyLimit: 5,
      used: 1,
      remaining: 4,
      exhausted: false,
      nearLimit: false,
      resetsAt: "2026-04-30T23:00:00.000Z",
    },
    simulationStarts: {
      monthlyLimit: 1,
      used: 0,
      remaining: 1,
      exhausted: false,
      nearLimit: false,
      resetsAt: "2026-04-30T23:00:00.000Z",
    },
  },
} satisfies AuthUser["studyEntitlements"];

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
  studyEntitlements: playwrightFreeStudyEntitlements,
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
  studyEntitlements: playwrightFreeStudyEntitlements,
} satisfies AuthUser;

export const playwrightTestAuthOptions = {
  streamFamilies: [
    {
      code: "SE",
      name: "Sciences experimentales",
      streams: [
        {
          code: "SE",
          name: "Sciences experimentales",
          isDefault: true,
        },
      ],
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

export const playwrightTestCatalog = {
  streams: [
    {
      code: "SE",
      name: "Sciences experimentales",
      subjects: [
        {
          code: "MATH",
          name: "Mathematics",
          years: [
            {
              year: 2025,
              sujets: [
                {
                  examId: "exam-1",
                  sujetNumber: 1,
                  label: "Sujet 1",
                  sessionType: "NORMAL",
                  exerciseCount: 4,
                },
              ],
            },
            {
              year: 2024,
              sujets: [
                {
                  examId: "exam-2",
                  sujetNumber: 2,
                  label: "Sujet 2",
                  sessionType: "MAKEUP",
                  exerciseCount: 3,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} satisfies CatalogResponse;

export const playwrightTestPreview = {
  sessionFamily: "DRILL",
  sessionKind: "TOPIC_DRILL",
  subjectCode: "MATH",
  streamCode: "SE",
  streamCodes: ["SE"],
  years: [2025, 2024],
  topicCodes: ["ALG"],
  sessionTypes: ["NORMAL"],
  sourceExamId: null,
  durationMinutes: null,
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

export const playwrightTestRecentExerciseStates = {
  data: [],
} satisfies RecentExerciseStatesResponse;

export const playwrightTestMyMistakes = {
  data: [],
} satisfies MyMistakesResponse;

export const playwrightTestWeakPointInsights = {
  enabled: false,
  data: [],
} satisfies WeakPointInsightsResponse;

export const playwrightTestStudyRoadmaps = {
  data: [
    {
      id: "roadmap-math",
      title: "Math roadmap",
      description: "A guided revision route for mathematics.",
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      curriculum: {
        code: "GENERAL",
        title: "Mathematics",
      },
      totalNodeCount: 3,
      solidNodeCount: 1,
      needsReviewNodeCount: 1,
      inProgressNodeCount: 0,
      notStartedNodeCount: 1,
      openReviewItemCount: 1,
      progressPercent: 42,
      updatedAt: "2026-04-09T10:00:00.000Z",
      nextAction: {
        type: "TOPIC_DRILL",
        label: "Review Algebra",
        topicCode: "ALG",
        topicName: "Algebra",
      },
      sections: [
        {
          id: "roadmap-section-1",
          code: "FOUNDATION",
          title: "Foundations",
          description: "Stabilize the highest-return chapters first.",
          orderIndex: 1,
          nodes: [
            {
              id: "roadmap-node-1",
              title: "Algebra",
              description: "Start with the chapter that most needs attention.",
              topicCode: "ALG",
              topicName: "Algebra",
              orderIndex: 1,
              estimatedSessions: 3,
              isOptional: false,
              sectionId: "roadmap-section-1",
              recommendedPreviousNodeId: null,
              recommendedPreviousNodeTitle: null,
              status: "NEEDS_REVIEW",
              progressPercent: 25,
              weaknessScore: 7,
              attemptedQuestions: 5,
              correctCount: 2,
              incorrectCount: 2,
              lastSeenAt: "2026-04-09T10:00:00.000Z",
            },
            {
              id: "roadmap-node-2",
              title: "Geometry",
              description: "Lock in your proofs and visual reasoning.",
              topicCode: "GEO",
              topicName: "Geometry",
              orderIndex: 2,
              estimatedSessions: 2,
              isOptional: false,
              sectionId: "roadmap-section-1",
              recommendedPreviousNodeId: "roadmap-node-1",
              recommendedPreviousNodeTitle: "Algebra",
              status: "SOLID",
              progressPercent: 100,
              weaknessScore: 1,
              attemptedQuestions: 9,
              correctCount: 8,
              incorrectCount: 1,
              lastSeenAt: "2026-04-01T10:00:00.000Z",
            },
          ],
        },
        {
          id: "roadmap-section-2",
          code: "CONSOLIDATION",
          title: "Consolidation",
          description: "Finish with the chapters you have not opened yet.",
          orderIndex: 2,
          nodes: [
            {
              id: "roadmap-node-3",
              title: "Analysis",
              description: "Build enough momentum here before a full mock.",
              topicCode: "ANL",
              topicName: "Analysis",
              orderIndex: 3,
              estimatedSessions: 2,
              isOptional: false,
              sectionId: "roadmap-section-2",
              recommendedPreviousNodeId: "roadmap-node-2",
              recommendedPreviousNodeTitle: "Geometry",
              status: "NOT_STARTED",
              progressPercent: 0,
              weaknessScore: 0,
              attemptedQuestions: 0,
              correctCount: 0,
              incorrectCount: 0,
              lastSeenAt: null,
            },
          ],
        },
      ],
      nodes: [
        {
          id: "roadmap-node-1",
          title: "Algebra",
          description: "Start with the chapter that most needs attention.",
          topicCode: "ALG",
          topicName: "Algebra",
          orderIndex: 1,
          estimatedSessions: 3,
          isOptional: false,
          sectionId: "roadmap-section-1",
          recommendedPreviousNodeId: null,
          recommendedPreviousNodeTitle: null,
          status: "NEEDS_REVIEW",
          progressPercent: 25,
          weaknessScore: 7,
          attemptedQuestions: 5,
          correctCount: 2,
          incorrectCount: 2,
          lastSeenAt: "2026-04-09T10:00:00.000Z",
        },
        {
          id: "roadmap-node-2",
          title: "Geometry",
          description: "Lock in your proofs and visual reasoning.",
          topicCode: "GEO",
          topicName: "Geometry",
          orderIndex: 2,
          estimatedSessions: 2,
          isOptional: false,
          sectionId: "roadmap-section-1",
          recommendedPreviousNodeId: "roadmap-node-1",
          recommendedPreviousNodeTitle: "Algebra",
          status: "SOLID",
          progressPercent: 100,
          weaknessScore: 1,
          attemptedQuestions: 9,
          correctCount: 8,
          incorrectCount: 1,
          lastSeenAt: "2026-04-01T10:00:00.000Z",
        },
        {
          id: "roadmap-node-3",
          title: "Analysis",
          description: "Build enough momentum here before a full mock.",
          topicCode: "ANL",
          topicName: "Analysis",
          orderIndex: 3,
          estimatedSessions: 2,
          isOptional: false,
          sectionId: "roadmap-section-2",
          recommendedPreviousNodeId: "roadmap-node-2",
          recommendedPreviousNodeTitle: "Geometry",
          status: "NOT_STARTED",
          progressPercent: 0,
          weaknessScore: 0,
          attemptedQuestions: 0,
          correctCount: 0,
          incorrectCount: 0,
          lastSeenAt: null,
        },
      ],
    },
  ],
} satisfies StudyRoadmapsResponse;

export const playwrightTestStudySession = {
  id: "session-123",
  title: "Focused training",
  family: "DRILL",
  kind: "TOPIC_DRILL",
  status: "IN_PROGRESS",
  sourceExamId: null,
  requestedExerciseCount: 3,
  exerciseCount: 1,
  durationMinutes: null,
  timingEnabled: false,
  filters: {
    years: [2025, 2024],
    streamCodes: ["SE"],
    subjectCode: "MATH",
    topicCodes: ["ALG"],
    sessionTypes: ["NORMAL"],
  },
  progress: null,
  pedagogy: {
    supportStyle: "LOGIC_HEAVY",
    weakPointIntro: null,
  },
  startedAt: "2026-03-28T12:00:00.000Z",
  deadlineAt: null,
  submittedAt: null,
  completedAt: null,
  lastInteractedAt: "2026-03-28T12:00:00.000Z",
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
} satisfies StudySessionResponse;

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
    active_operation: "idle",
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
