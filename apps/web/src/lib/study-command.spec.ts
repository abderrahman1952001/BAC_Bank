import { describe, expect, it } from "vitest";
import type { DueFlashcardsResponse } from "@/lib/flashcards-api";
import type { LabToolsResponse } from "@/lib/lab-api";
import type {
  CatalogResponse,
  CurriculumJourneysResponse,
  FiltersResponse,
  MyMistakesResponse,
  RecentExamActivitiesResponse,
  RecentStudySessionsResponse,
  WeakPointInsightsResponse,
} from "@/lib/study-api";
import {
  buildStudyCommandProposal,
  buildStudyCommandStarters,
  buildStudyCommandMixedDrillFallbackRequest,
  inferStudyCommandMode,
  type StudyCommandContext,
} from "./study-command";

const sessions = [
  {
    id: "session-1",
    title: "دوال قصيرة",
    family: "DRILL",
    kind: "TOPIC_DRILL",
    status: "IN_PROGRESS",
    sourceExamId: null,
    requestedExerciseCount: 8,
    exerciseCount: 6,
    durationMinutes: null,
    startedAt: "2026-05-01T08:00:00.000Z",
    deadlineAt: null,
    completedAt: null,
    lastInteractedAt: "2026-05-01T08:20:00.000Z",
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-01T08:20:00.000Z",
    progressSummary: null,
  },
] satisfies RecentStudySessionsResponse["data"];

const myMistakes = [
  {
    exerciseNodeId: "exercise-1",
    focusQuestionId: null,
    focusQuestionLabel: null,
    reasons: ["MISSED"],
    questionSignalCount: 1,
    flagged: false,
    dueAt: "2026-05-01T09:00:00.000Z",
    successStreak: 0,
    lastReviewedAt: null,
    lastReviewOutcome: null,
    isDue: true,
    updatedAt: "2026-05-01T09:00:00.000Z",
    exercise: {
      id: "exercise-row-1",
      orderIndex: 1,
      title: null,
    },
    exam: {
      id: "exam-1",
      year: 2025,
      sessionType: "NORMAL",
      stream: {
        code: "SE",
        name: "علوم تجريبية",
      },
      subject: {
        code: "PHYS",
        name: "فيزياء",
      },
      sujetNumber: 1,
      sujetLabel: "الموضوع الأول",
    },
  },
] satisfies MyMistakesResponse["data"];

const dueFlashcards = [
  {
    card: {
      id: "card-1",
      type: "FRONT_BACK",
      sourceType: "PLATFORM",
      front: "تعريف البروتين",
      back: "جزيء حيوي...",
      data: null,
      subject: {
        code: "SVT",
        name: "علوم الطبيعة والحياة",
      },
      curriculumNode: null,
      learningTarget: null,
      courseLesson: null,
      courseStep: null,
      examNode: null,
      deckIds: ["deck-1"],
      createdAt: "2026-05-01T08:00:00.000Z",
      updatedAt: "2026-05-01T08:00:00.000Z",
    },
    state: {
      dueAt: "2026-05-01T08:00:00.000Z",
      intervalDays: 1,
      easeFactor: 2.5,
      reviewCount: 0,
      lapseCount: 0,
      lastReviewedAt: null,
    },
  },
] satisfies DueFlashcardsResponse["data"];

const weakPointInsights = [
  {
    subject: {
      code: "MATH",
      name: "رياضيات",
    },
    recommendedTopicCodes: ["FUNC"],
    totalWeaknessScore: 9,
    weakSignalCount: 3,
    flaggedExerciseCount: 0,
    lastSeenAt: "2026-05-01T08:00:00.000Z",
    topLearningTargets: [],
    topTopics: [
      {
        code: "FUNC",
        name: "الدوال",
        weaknessScore: 9,
        weakSignalCount: 3,
        lastSeenAt: "2026-05-01T08:00:00.000Z",
        signalCounts: {
          missed: 2,
          hard: 1,
          skipped: 0,
          revealed: 0,
          flagged: 0,
        },
        topLearningTargets: [],
      },
    ],
  },
] satisfies WeakPointInsightsResponse["data"];

const filters = {
  streams: [
    {
      code: "SE",
      name: "علوم تجريبية",
      isDefault: true,
      subjectCodes: ["MATHEMATICS", "PHYSICS", "NATURAL_SCIENCES"],
    },
  ],
  subjects: [
    {
      code: "MATHEMATICS",
      name: "الرياضيات",
      isDefault: true,
      streams: [
        {
          code: "SE",
          name: "علوم تجريبية",
        },
      ],
      streamCodes: ["SE"],
    },
    {
      code: "PHYSICS",
      name: "العلوم الفيزيائية",
      streams: [
        {
          code: "SE",
          name: "علوم تجريبية",
        },
      ],
      streamCodes: ["SE"],
    },
    {
      code: "NATURAL_SCIENCES",
      name: "علوم الطبيعة والحياة",
      streams: [
        {
          code: "SE",
          name: "علوم تجريبية",
        },
      ],
      streamCodes: ["SE"],
    },
  ],
  years: [2025, 2024, 2023],
  topics: [
    {
      code: "FUNCTIONS",
      name: "الدوال",
      slug: "functions",
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: "MATHEMATICS",
        name: "الرياضيات",
      },
      streamCodes: ["SE"],
    },
    {
      code: "ELECTRICITY",
      name: "الكهرباء",
      slug: "electricity",
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: "PHYSICS",
        name: "العلوم الفيزيائية",
      },
      streamCodes: ["SE"],
    },
  ],
  sessionTypes: ["NORMAL", "MAKEUP"],
} satisfies FiltersResponse;

const catalog = {
  streams: [
    {
      code: "SE",
      name: "علوم تجريبية",
      subjects: [
        {
          code: "MATHEMATICS",
          name: "الرياضيات",
          years: [
            {
              year: 2025,
              sujets: [],
            },
          ],
        },
        {
          code: "PHYSICS",
          name: "العلوم الفيزيائية",
          years: [
            {
              year: 2025,
              sujets: [],
            },
          ],
        },
      ],
    },
  ],
} satisfies CatalogResponse;

const svtOnlyCatalog = {
  streams: [
    {
      code: "SE",
      name: "علوم تجريبية",
      subjects: [
        {
          code: "NATURAL_SCIENCES",
          name: "علوم الطبيعة والحياة",
          years: [
            {
              year: 2025,
              sujets: [],
            },
          ],
        },
      ],
    },
  ],
} satisfies CatalogResponse;

const context: StudyCommandContext = {
  sessions,
  recentExamActivities: [] satisfies RecentExamActivitiesResponse["data"],
  myMistakes,
  curriculumJourneys: [] satisfies CurriculumJourneysResponse["data"],
  weakPointInsights,
  dueFlashcards,
  labTools: [] satisfies LabToolsResponse["data"],
  filters,
  catalog,
  userStreamCode: "SE",
};

describe("study command", () => {
  it("builds smart starters from real context", () => {
    const starters = buildStudyCommandStarters(context);

    expect(starters[0]).toMatchObject({
      title: "واصل دوال قصيرة",
      mode: "CONTINUE_SESSION",
    });
    expect(starters.some((starter) => starter.id === "due-flashcards")).toBe(
      true,
    );
    expect(starters.some((starter) => starter.id.startsWith("mistake:"))).toBe(
      true,
    );
  });

  it("routes messy school-test language to school test prep", () => {
    expect(
      inferStudyCommandMode(
        "عندي فرض في الفيزياء غدوة على الكهرباء",
        context,
      ),
    ).toBe("SCHOOL_TEST_PREP");
  });

  it("creates a proposal for a school test command", () => {
    const proposal = buildStudyCommandProposal(
      "عندي فرض في الفيزياء غدوة على الكهرباء",
      context,
    );

    expect(proposal).toMatchObject({
      mode: "SCHOOL_TEST_PREP",
      estimatedMinutes: 35,
      primaryLabel: "بدء الجلسة",
    });
    expect(proposal?.title).toContain("العلوم الفيزيائية");
    expect(proposal?.title).toContain("غداً");
    expect(proposal?.primaryHref).toContain("/student/training/drill");
    expect(proposal?.primaryAction).toMatchObject({
      kind: "CREATE_STUDY_SESSION",
      request: {
        subjectCode: "PHYSICS",
        kind: "TOPIC_DRILL",
        topicCodes: ["ELECTRICITY"],
        streamCodes: ["SE"],
        years: [2025, 2024, 2023],
        sessionTypes: ["NORMAL", "MAKEUP"],
        exerciseCount: 3,
        timingEnabled: false,
      },
    });
  });

  it("applies supported fine-tuning to the create-session payload", () => {
    const proposal = buildStudyCommandProposal(
      "أريد تدريب BAC في الرياضيات، آخر 3 سنوات فقط، زد تمريناً واحداً",
      context,
    );

    expect(proposal?.primaryAction).toMatchObject({
      kind: "CREATE_STUDY_SESSION",
      request: {
        subjectCode: "MATHEMATICS",
        exerciseCount: 5,
        years: [2025, 2024, 2023],
      },
    });
    expect(proposal?.estimatedMinutes).toBe(45);
  });

  it("does not auto-create a drill for subjects absent from the real catalog", () => {
    const proposal = buildStudyCommandProposal(
      "عندي فرض في الفيزياء غدوة على الكهرباء",
      {
        ...context,
        catalog: svtOnlyCatalog,
      },
    );

    expect(proposal?.primaryAction).toMatchObject({
      kind: "OPEN_ROUTE",
    });
    expect(proposal?.primaryLabel).toBe("ضبط الجلسة");
  });

  it("builds a mixed-drill fallback when topic mappings are unavailable", () => {
    const proposal = buildStudyCommandProposal(
      "أريد تدريب BAC في الفيزياء على الكهرباء",
      context,
    );

    if (proposal?.primaryAction.kind !== "CREATE_STUDY_SESSION") {
      throw new Error("Expected a create-session proposal.");
    }

    expect(
      buildStudyCommandMixedDrillFallbackRequest(proposal.primaryAction.request),
    ).toMatchObject({
      subjectCode: "PHYSICS",
      kind: "MIXED_DRILL",
    });
    expect(
      buildStudyCommandMixedDrillFallbackRequest(proposal.primaryAction.request),
    ).not.toHaveProperty("topicCodes");
  });

  it("creates a proposal for BAC-native memorization", () => {
    const proposal = buildStudyCommandProposal(
      "راجعلي تعريفات وحدة البروتينات",
      context,
    );

    expect(proposal?.mode).toBe("MEMORIZATION_REVIEW");
    expect(proposal?.primaryHref).toBe("/student/flashcards");
  });

  it("returns null for empty commands", () => {
    expect(buildStudyCommandProposal("   ", context)).toBeNull();
  });
});
