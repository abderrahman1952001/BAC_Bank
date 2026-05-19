import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudyCommandProposal } from "@bac-bank/contracts/study-command";
import type {
  MyMistakesResponse,
  RecentExamActivitiesResponse,
  RecentExerciseStatesResponse,
  RecentStudySessionsResponse,
  CurriculumJourneysResponse,
  WeakPointInsightsResponse,
} from "@/lib/study-api";
import {
  buildHubActivityItems,
  buildCurriculumJourneyItems,
  buildMyMistakeItems,
  buildSavedExerciseItems,
  buildWeakPointItems,
  describeMistakeReviewCadence,
  findActiveHubSession,
  resolveStudyCommandProposalStartState,
} from "./student-hub";

const recentStudySessions = [
  {
    id: "session-drill",
    title: "تفاضل سريع",
    family: "DRILL",
    kind: "TOPIC_DRILL",
    status: "IN_PROGRESS",
    sourceExamId: null,
    requestedExerciseCount: 8,
    exerciseCount: 6,
    durationMinutes: null,
    startedAt: "2026-04-18T08:00:00.000Z",
    deadlineAt: null,
    completedAt: null,
    lastInteractedAt: "2026-04-18T09:30:00.000Z",
    createdAt: "2026-04-18T08:00:00.000Z",
    updatedAt: "2026-04-18T09:30:00.000Z",
    progressSummary: {
      totalQuestionCount: 10,
      completedQuestionCount: 4,
      skippedQuestionCount: 1,
      unansweredQuestionCount: 5,
      solutionViewedCount: 2,
      trackedTimeSeconds: 1200,
    },
  },
  {
    id: "session-sim",
    title: null,
    family: "SIMULATION",
    kind: "PAPER_SIMULATION",
    status: "CREATED",
    sourceExamId: "exam-older",
    requestedExerciseCount: 4,
    exerciseCount: 4,
    durationMinutes: 180,
    startedAt: null,
    deadlineAt: null,
    completedAt: null,
    lastInteractedAt: null,
    createdAt: "2026-04-18T06:00:00.000Z",
    updatedAt: "2026-04-18T06:00:00.000Z",
    progressSummary: null,
  },
] satisfies RecentStudySessionsResponse["data"];

const recentExamActivities = [
  {
    id: "activity-recent",
    examId: "exam-recent",
    year: 2025,
    sessionType: "NORMAL",
    stream: {
      code: "SE",
      name: "علوم تجريبية",
    },
    subject: {
      code: "MATH",
      name: "رياضيات",
    },
    sujetNumber: 1,
    sujetLabel: "الموضوع الأول",
    totalQuestionCount: 5,
    completedQuestionCount: 5,
    openedQuestionCount: 5,
    solutionViewedCount: 2,
    createdAt: "2026-04-18T10:00:00.000Z",
    lastOpenedAt: "2026-04-18T11:00:00.000Z",
  },
] satisfies RecentExamActivitiesResponse["data"];

const recentExerciseStates = [
  {
    exerciseNodeId: "exercise-1",
    bookmarkedAt: "2026-04-16T10:00:00.000Z",
    flaggedAt: "2026-04-16T10:00:00.000Z",
    updatedAt: "2026-04-16T10:00:00.000Z",
    exercise: {
      id: "exercise-row-1",
      orderIndex: 3,
      title: null,
    },
    exam: {
      id: "exam-recent",
      year: 2025,
      sessionType: "NORMAL",
      stream: {
        code: "SE",
        name: "علوم تجريبية",
      },
      subject: {
        code: "MATH",
        name: "رياضيات",
      },
      sujetNumber: 1,
      sujetLabel: "الموضوع الأول",
    },
  },
] satisfies RecentExerciseStatesResponse["data"];

const myMistakes = [
  {
    exerciseNodeId: "exercise-2",
    focusQuestionId: "question-7",
    focusQuestionLabel: "7",
    reasons: ["MISSED", "HARD"],
    questionSignalCount: 2,
    flagged: true,
    dueAt: "2026-04-17T10:00:00.000Z",
    successStreak: 2,
    lastReviewedAt: "2026-04-17T08:00:00.000Z",
    lastReviewOutcome: "CORRECT",
    isDue: false,
    updatedAt: "2026-04-17T09:00:00.000Z",
    exercise: {
      id: "exercise-row-2",
      orderIndex: 2,
      title: "التمرين الثاني",
    },
    exam: {
      id: "exam-mistake",
      year: 2024,
      sessionType: "MAKEUP",
      stream: {
        code: "SE",
        name: "علوم تجريبية",
      },
      subject: {
        code: "PHYS",
        name: "فيزياء",
      },
      sujetNumber: 2,
      sujetLabel: "الموضوع الثاني",
    },
  },
] satisfies MyMistakesResponse["data"];

const weakPointInsights = {
  enabled: true,
  data: [
    {
      subject: {
        code: "MATH",
        name: "رياضيات",
      },
      recommendedTopicCodes: ["FUNC"],
      totalWeaknessScore: 14,
      weakSignalCount: 4,
      flaggedExerciseCount: 1,
      lastSeenAt: "2026-04-17T12:00:00.000Z",
      topLearningTargets: [
        {
          code: "SK1",
          name: "المشتقات",
          weaknessScore: 8,
        },
        {
          code: "SK2",
          name: "النهايات",
          weaknessScore: 6,
        },
      ],
      topTopics: [
        {
          code: "FUNC",
          name: "الدوال",
          weaknessScore: 8,
          weakSignalCount: 3,
          lastSeenAt: "2026-04-17T12:00:00.000Z",
          signalCounts: {
            missed: 2,
            hard: 1,
            skipped: 0,
            revealed: 0,
            flagged: 0,
          },
          topLearningTargets: [
            {
              code: "SK1",
              name: "المشتقات",
              weaknessScore: 8,
            },
          ],
        },
      ],
    },
  ],
} satisfies WeakPointInsightsResponse;

const curriculumJourneys = [
  {
    id: "curriculum-journey-1",
    title: "رياضيات",
    description: null,
    subject: {
      code: "MATH",
      name: "رياضيات",
    },
    curriculum: {
      code: "BAC-MATH",
      title: "منهج الرياضيات",
    },
    totalNodeCount: 10,
    solidNodeCount: 4,
    needsReviewNodeCount: 2,
    inProgressNodeCount: 2,
    notStartedNodeCount: 4,
    openReviewItemCount: 1,
    progressPercent: 40,
    updatedAt: "2026-04-18T07:00:00.000Z",
    nextAction: {
      type: "TOPIC_DRILL",
      label: "ابدأ الدريل",
      curriculumNodeCode: "FUNC",
      curriculumNodeName: "الدوال",
      topicCode: "FUNC",
      topicName: "الدوال",
    },
    sections: [],
    nodes: [
      {
        id: "node-1",
        title: "الدوال",
        description: null,
        curriculumNodeCode: "FUNC",
        curriculumNodeName: "الدوال",
        topicCode: "FUNC",
        topicName: "الدوال",
        orderIndex: 1,
        estimatedSessions: 2,
        isOptional: false,
        sectionId: null,
        recommendedPreviousNodeId: null,
        recommendedPreviousNodeTitle: null,
        status: "IN_PROGRESS",
        progressPercent: 50,
        weaknessScore: 5,
        attemptedQuestions: 4,
        correctCount: 2,
        incorrectCount: 2,
        lastSeenAt: "2026-04-18T07:00:00.000Z",
      },
      {
        id: "node-2",
        title: "التكامل",
        description: null,
        curriculumNodeCode: "INT",
        curriculumNodeName: "التكامل",
        topicCode: "INT",
        topicName: "التكامل",
        orderIndex: 2,
        estimatedSessions: 2,
        isOptional: false,
        sectionId: null,
        recommendedPreviousNodeId: "node-1",
        recommendedPreviousNodeTitle: "الدوال",
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
  {
    id: "curriculum-journey-2",
    title: "فيزياء",
    description: null,
    subject: {
      code: "PHYS",
      name: "فيزياء",
    },
    curriculum: {
      code: "BAC-PHYS",
      title: "منهج الفيزياء",
    },
    totalNodeCount: 5,
    solidNodeCount: 5,
    needsReviewNodeCount: 0,
    inProgressNodeCount: 0,
    notStartedNodeCount: 0,
    openReviewItemCount: 0,
    progressPercent: 100,
    updatedAt: null,
    nextAction: {
      type: "PAPER_SIMULATION",
      label: "ابدأ المحاكاة",
      curriculumNodeCode: null,
      curriculumNodeName: null,
      topicCode: null,
      topicName: null,
    },
    sections: [],
    nodes: [
      {
        id: "node-3",
        title: "الميكانيك",
        description: null,
        curriculumNodeCode: "MECH",
        curriculumNodeName: "الميكانيك",
        topicCode: "MECH",
        topicName: "الميكانيك",
        orderIndex: 1,
        estimatedSessions: 1,
        isOptional: false,
        sectionId: null,
        recommendedPreviousNodeId: null,
        recommendedPreviousNodeTitle: null,
        status: "SOLID",
        progressPercent: 100,
        weaknessScore: 0,
        attemptedQuestions: 6,
        correctCount: 6,
        incorrectCount: 0,
        lastSeenAt: "2026-04-10T07:00:00.000Z",
      },
    ],
  },
] satisfies CurriculumJourneysResponse["data"];

function buildCommandProposal(
  availability?: StudyCommandProposal["availability"],
): StudyCommandProposal {
  return {
    mode: "BAC_TRAINING",
    title: "تدريب BAC",
    subtitle: "رياضيات",
    estimatedMinutes: 30,
    rationale: "تدريب مرتبط بما طلبه الطالب.",
    availability,
    primaryHref: "/student/training/drill?subject=MATH",
    primaryLabel: "بدء الجلسة",
    primaryAction: {
      kind: "CREATE_STUDY_SESSION",
      request: {
        title: "تدريب BAC",
        subjectCode: "MATH",
        kind: "MIXED_DRILL",
        exerciseCount: 4,
      },
    },
    steps: [],
    fineTuneOptions: [],
  };
}

describe("student hub helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prioritizes the active drill session and sorts activity by latest timestamp", () => {
    expect(findActiveHubSession(recentStudySessions)?.id).toBe("session-drill");

    expect(
      buildHubActivityItems({
        sessions: recentStudySessions,
        examActivities: recentExamActivities,
      }),
    ).toEqual([
      expect.objectContaining({
        key: "exam:exam-recent:1",
        actionLabel: "مكتمل",
        tone: "success",
        progressPercent: 100,
      }),
      expect.objectContaining({
        key: "session:session-drill",
        actionLabel: "متابعة",
        tone: "brand",
        progressPercent: 40,
      }),
      expect.objectContaining({
        key: "session:session-sim",
        actionLabel: "ابدأ",
        tone: "neutral",
        subtitle: "4 تمارين · 180 دقيقة",
      }),
    ]);
  });

  it("builds saved and mistake items with targeted library routes", () => {
    expect(buildSavedExerciseItems(recentExerciseStates)).toEqual([
      expect.objectContaining({
        href: "/student/library/SE/MATH/2025/exam-recent/1?exercise=exercise-1",
        title: "التمرين 3",
        stateLabel: "محفوظ للمراجعة",
        tone: "brand",
        flagged: true,
      }),
    ]);

    expect(buildMyMistakeItems(myMistakes)).toEqual([
      expect.objectContaining({
        href: "/student/library/SE/PHYS/2024/exam-mistake/2?exercise=exercise-2&question=question-7",
        reasonsLabel: "فاتني · صعب",
        cadenceLabel: "ثبات 2/3 · أمس",
        cadenceTone: "neutral",
      }),
    ]);
  });

  it("builds weak-point and curriculum journey actions from the current guidance", () => {
    expect(buildWeakPointItems(weakPointInsights.data)).toEqual([
      expect.objectContaining({
        href: "/student/training/weak-points?subject=MATH",
        title: "رياضيات",
        subtitle: "المشتقات · النهايات",
        topicsLabel: "الدوال",
      }),
    ]);

    expect(buildCurriculumJourneyItems(curriculumJourneys)).toEqual([
      expect.objectContaining({
        actionHref: "/student/training/drill?subject=MATH&topic=FUNC",
        detailsHref: "/student/my-space/curriculum/MATH",
        summaryLabel: "2 محاور تحتاج مراجعة",
        tone: "warning",
      }),
      expect.objectContaining({
        actionHref: "/student/training/simulation?subject=PHYS",
        detailsHref: "/student/my-space/curriculum/PHYS",
        summaryLabel: "جاهز للمحاكاة",
        tone: "success",
        relativeTimestamp: "جديد",
      }),
    ]);
  });

  it("starts create-session proposals only after server availability is ready", () => {
    expect(
      resolveStudyCommandProposalStartState(
        buildCommandProposal({
          status: "READY",
          matchingExerciseCount: 4,
        }),
      ),
    ).toEqual({
      canStart: true,
      reason: null,
    });

    expect(
      resolveStudyCommandProposalStartState(
        buildCommandProposal({
          status: "NEEDS_CONTENT",
          matchingExerciseCount: 0,
          message: "لا توجد تمارين مطابقة.",
        }),
      ),
    ).toEqual({
      canStart: false,
      reason: "لا توجد تمارين مطابقة.",
    });

    expect(
      resolveStudyCommandProposalStartState({
        ...buildCommandProposal(),
        primaryAction: {
          kind: "OPEN_ROUTE",
          href: "/student/training/drill?subject=MATH",
        },
      }),
    ).toEqual({
      canStart: true,
      reason: null,
    });
  });

  it("describes mistake cadence across due, scheduled, and stabilized items", () => {
    expect(
      describeMistakeReviewCadence({
        ...myMistakes[0],
        isDue: true,
        successStreak: 3,
      }),
    ).toEqual({
      label: "ثبات 3/3 · مستحق الآن",
      tone: "brand",
    });

    expect(describeMistakeReviewCadence(myMistakes[0])).toEqual({
      label: "ثبات 2/3 · أمس",
      tone: "neutral",
    });

    expect(
      describeMistakeReviewCadence({
        ...myMistakes[0],
        dueAt: null,
        successStreak: 0,
        isDue: false,
      }),
    ).toEqual({
      label: "أول تثبيت",
      tone: "success",
    });
  });
});
