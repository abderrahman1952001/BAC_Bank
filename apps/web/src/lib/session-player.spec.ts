import { describe, expect, it } from "vitest";
import type { StudySessionResponse } from "@/lib/study-api";
import type { StudyExerciseModel } from "@/lib/study-surface";
import {
  buildActiveExerciseTopics,
  buildPrimaryActionLabel,
  buildSessionPlayerViewModel,
  buildQuestionStatePresentation,
  buildSessionGoalSummary,
  buildSessionMeta,
  buildSessionNavigatorExercises,
  buildSessionProgressUpdateRequest,
  buildSessionQuestionRefs,
  findFirstSkippedQuestionRef,
  findFirstUnansweredQuestionRef,
  getAdjacentQuestionRef,
  getQuestionDirection,
  resolveSessionPlayerProgress,
} from "./session-player";

const exercises: StudyExerciseModel[] = [
  {
    id: "exercise-1",
    exerciseNodeId: "exercise-1",
    orderIndex: 1,
    displayOrder: 1,
    title: "Exercise 1",
    totalPoints: 8,
    contextBlocks: [],
    sourceExam: {
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
    questions: [
      {
        id: "q1",
        orderIndex: 1,
        label: "Q1",
        points: 4,
        depth: 0,
        interaction: {
          format: "GENERAL",
          captureMode: "TYPELESS",
          responseMode: "NONE",
          checkStrategy: "MODEL_COMPARISON",
        },
        topics: [{ code: "ALG", name: "Algebra" }],
        promptBlocks: [],
        solutionBlocks: [],
        hintBlocks: [],
        rubricBlocks: [],
      },
      {
        id: "q2",
        orderIndex: 2,
        label: "Q2",
        points: 4,
        depth: 0,
        interaction: {
          format: "PROBLEM_SOLVING",
          captureMode: "TYPELESS",
          responseMode: "NONE",
          checkStrategy: "RESULT_MATCH",
        },
        topics: [{ code: "FUNC", name: "Functions" }],
        promptBlocks: [],
        solutionBlocks: [
          {
            id: "s1",
            role: "SOLUTION",
            orderIndex: 1,
            blockType: "PARAGRAPH",
            textValue: "Solution",
            data: null,
            media: null,
          },
        ],
        hintBlocks: [],
        rubricBlocks: [],
      },
    ],
  },
  {
    id: "exercise-2",
    exerciseNodeId: "exercise-2",
    orderIndex: 2,
    displayOrder: 2,
    title: "Exercise 2",
    totalPoints: 5,
    contextBlocks: [],
    sourceExam: {
      year: 2024,
      sessionType: "MAKEUP",
      subject: {
        code: "MATH",
        name: "Mathematics",
      },
      stream: {
        code: "TM",
        name: "Techniques mathematiques",
      },
    },
    questions: [
      {
        id: "q3",
        orderIndex: 1,
        label: "Q3",
        points: 5,
        depth: 0,
        interaction: {
          format: "GENERAL",
          captureMode: "TYPELESS",
          responseMode: "NONE",
          checkStrategy: "MODEL_COMPARISON",
        },
        topics: [{ code: "ALG", name: "Algebra" }],
        promptBlocks: [],
        solutionBlocks: [],
        hintBlocks: [],
        rubricBlocks: [],
      },
    ],
  },
];

const session = {
  id: "session-1",
  title: "Focused training",
  family: "DRILL",
  kind: "TOPIC_DRILL",
  status: "IN_PROGRESS",
  sourceExamId: null,
  requestedExerciseCount: 3,
  exerciseCount: 2,
  durationMinutes: null,
  timingEnabled: false,
  progress: null,
  startedAt: "2026-03-27T00:00:00.000Z",
  deadlineAt: null,
  submittedAt: null,
  completedAt: null,
  lastInteractedAt: "2026-03-28T00:00:00.000Z",
  createdAt: "2026-03-27T00:00:00.000Z",
  updatedAt: "2026-03-28T00:00:00.000Z",
  filters: {
    years: [2025, 2024],
    streamCodes: ["SE", "TM"],
    subjectCode: "MATH",
    topicCodes: ["ALG", "FUNC"],
    sessionTypes: ["MAKEUP"],
  },
  exercises: exercises.map((exercise) => ({
    sessionOrder: exercise.displayOrder,
    id: exercise.id,
    orderIndex: exercise.orderIndex,
    title: exercise.title,
    totalPoints: exercise.totalPoints,
    questionCount: exercise.questions.length,
    hierarchy: {
      exerciseNodeId: exercise.id,
      exerciseLabel: exercise.title,
      contextBlocks: [],
      questions: exercise.questions.map((question) => ({
        id: question.id,
        orderIndex: question.orderIndex,
        label: question.label,
        points: question.points,
        depth: question.depth,
        interaction: question.interaction,
        topics: question.topics,
        promptBlocks: question.promptBlocks,
        solutionBlocks: question.solutionBlocks,
        hintBlocks: question.hintBlocks,
        rubricBlocks: question.rubricBlocks,
      })),
    },
    exam: {
      year: exercise.sourceExam!.year,
      sessionType: exercise.sourceExam!.sessionType,
      subject: exercise.sourceExam!.subject,
      stream: exercise.sourceExam!.stream,
    },
  })),
  pedagogy: {
    supportStyle: "LOGIC_HEAVY",
    weakPointIntro: null,
  },
} satisfies StudySessionResponse;

describe("session player helpers", () => {
  it("builds question refs and repairs progress using the freshest snapshot", () => {
    const progress = resolveSessionPlayerProgress({
      exercises,
      remoteProgress: {
        activeExerciseId: "exercise-1",
        activeQuestionId: "q1",
        mode: "SOLVE",
        questionStates: [
          {
            questionId: "q1",
            opened: true,
            completed: false,
            skipped: false,
            solutionViewed: false,
            timeSpentSeconds: 0,
            resultStatus: "UNKNOWN",
            evaluationMode: "UNGRADED",
            reflection: null,
            diagnosis: null,
          },
        ],
        summary: {
          totalQuestionCount: 3,
          completedQuestionCount: 0,
          skippedQuestionCount: 0,
          unansweredQuestionCount: 3,
          solutionViewedCount: 0,
          trackedTimeSeconds: 0,
        },
        updatedAt: "2026-03-27T00:00:00.000Z",
      },
      localProgress: {
        activeExerciseId: "exercise-1",
        activeQuestionId: "q2",
        mode: "SOLVE",
        questionStates: {
          q2: {
            opened: false,
            completed: true,
            timeSpentSeconds: 0,
          },
        },
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
      nowIso: "2026-03-28T01:00:00.000Z",
    });

    expect(buildSessionQuestionRefs(exercises)).toEqual([
      { exerciseId: "exercise-1", questionId: "q1" },
      { exerciseId: "exercise-1", questionId: "q2" },
      { exerciseId: "exercise-2", questionId: "q3" },
    ]);
    expect(progress.activeExerciseId).toBe("exercise-1");
    expect(progress.activeQuestionId).toBe("q1");
    expect(progress.questionStates.q2?.opened).toBe(false);
    expect(progress.questionStates.q2?.completed).toBe(true);
  });

  it("falls back to the first available question when stored targets are invalid", () => {
    const progress = resolveSessionPlayerProgress({
      exercises,
      remoteProgress: null,
      localProgress: {
        activeExerciseId: "missing-exercise",
        activeQuestionId: "missing-question",
        mode: "SOLVE",
        questionStates: {},
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
      nowIso: "2026-03-28T01:00:00.000Z",
    });

    expect(progress.activeExerciseId).toBe("exercise-1");
    expect(progress.activeQuestionId).toBe("q1");
    expect(progress.questionStates.q1?.opened).toBe(true);
  });

  it("builds progress payloads with derived counts", () => {
    const request = buildSessionProgressUpdateRequest(
      {
        activeExerciseId: "exercise-1",
        activeQuestionId: "q2",
        mode: "REVIEW",
        questionStates: {
          q1: { opened: true, completed: true },
          q2: {
            opened: true,
            skipped: true,
            solutionViewed: true,
            timeSpentSeconds: 0,
            reflection: "HARD",
            diagnosis: "METHOD",
          },
        },
        updatedAt: "2026-03-28T01:00:00.000Z",
      },
      ["q1", "q2", "q3"],
    );

    expect(request).toMatchObject({
      activeExerciseId: "exercise-1",
      activeQuestionId: "q2",
      mode: "REVIEW",
      totalQuestionCount: 3,
      completedQuestionCount: 1,
      skippedQuestionCount: 1,
      solutionViewedCount: 1,
    });
    expect(request.questionStates).toContainEqual(
      expect.objectContaining({
        questionId: "q2",
        reflection: "HARD",
        diagnosis: "METHOD",
      }),
    );
  });

  it("builds session meta and goal summaries from saved filters", () => {
    expect(buildSessionMeta(session)).toEqual([
      { label: "النمط", value: "تدريب بالمحاور" },
      { label: "المادة", value: "Mathematics" },
      { label: "الشعب", value: "عدة شعب" },
      { label: "السنوات", value: "2024 - 2025" },
      { label: "الحفظ", value: "تلقائي" },
    ]);
    expect(buildSessionGoalSummary(session)).toBe(
      "2 محاور محددة · 2 شعب محددة · بين 2024 و 2025 · استدراكية",
    );
  });

  it("builds active exercise topics and navigator rows", () => {
    expect(buildActiveExerciseTopics(exercises[0])).toEqual([
      { code: "ALG", name: "Algebra" },
      { code: "FUNC", name: "Functions" },
    ]);

    expect(
      buildSessionNavigatorExercises({
        exercises,
        activeQuestionId: "q2",
        questionStates: {
          q1: { completed: true, timeSpentSeconds: 0 },
          q2: { opened: true, solutionViewed: true, timeSpentSeconds: 0 },
          q3: { skipped: true, timeSpentSeconds: 0 },
        },
      }),
    ).toEqual([
      expect.objectContaining({
        id: "exercise-1",
        progressLabel: "1/2 منجزة",
        questions: [
          expect.objectContaining({ id: "q1", status: "completed" }),
          expect.objectContaining({
            id: "q2",
            status: "active",
            solutionViewed: true,
          }),
        ],
      }),
      expect.objectContaining({
        id: "exercise-2",
        progressLabel: "0/1 منجزة",
        questions: [expect.objectContaining({ id: "q3", status: "skipped" })],
      }),
    ]);
  });

  it("builds a player view model from progress and motion state", () => {
    const viewModel = buildSessionPlayerViewModel({
      session,
      exercises,
      progress: {
        activeExerciseId: "exercise-1",
        activeQuestionId: "q2",
        mode: "SOLVE",
        questionStates: {
          q1: { completed: true, timeSpentSeconds: 0 },
          q2: { opened: true, solutionViewed: true, timeSpentSeconds: 0 },
          q3: { skipped: true, timeSpentSeconds: 0 },
        },
        updatedAt: "2026-03-28T01:00:00.000Z",
      },
      questionMotion: {
        phase: "out",
        direction: "backward",
      },
    });

    expect(viewModel.activeExercise?.id).toBe("exercise-1");
    expect(viewModel.activeQuestion?.id).toBe("q2");
    expect(viewModel.progressCounts.completedCount).toBe(1);
    expect(viewModel.progressCounts.skippedCount).toBe(1);
    expect(viewModel.currentQuestionPosition).toBe(2);
    expect(viewModel.solutionVisible).toBe(true);
    expect(viewModel.questionMotionClass).toBe("is-leaving-backward");
    expect(viewModel.primaryActionLabel).toBe("اختر تقييمك");
  });

  it("surfaces auto-check follow-up for objectively correct answers", () => {
    const autoExercises: StudyExerciseModel[] = [
      {
        ...exercises[0],
        questions: [
          {
            ...exercises[0].questions[0],
            interaction: {
              ...exercises[0].questions[0].interaction,
              responseMode: "NUMERIC",
            },
          },
        ],
      },
    ];

    const viewModel = buildSessionPlayerViewModel({
      session,
      exercises: autoExercises,
      progress: {
        activeExerciseId: "exercise-1",
        activeQuestionId: "q1",
        mode: "SOLVE",
        questionStates: {
          q1: {
            opened: true,
            resultStatus: "CORRECT",
            evaluationMode: "AUTO",
          },
        },
        updatedAt: "2026-03-28T01:00:00.000Z",
      },
      questionMotion: null,
    });

    expect(viewModel.canSubmitAutoAnswer).toBe(false);
    expect(viewModel.requiresAutoCorrectReflection).toBe(true);
    expect(viewModel.primaryActionLabel).toBe("قيّم سهولة المحاولة");
  });

  it("resolves adjacent, skipped, and unanswered question refs", () => {
    const allQuestionRefs = buildSessionQuestionRefs(exercises);

    expect(
      getAdjacentQuestionRef({
        direction: 1,
        activeQuestionId: "q1",
        allQuestionRefs,
      }),
    ).toEqual({ exerciseId: "exercise-1", questionId: "q2" });
    expect(
      getQuestionDirection({
        targetQuestionId: "q1",
        activeQuestionId: "q3",
        allQuestionRefs,
      }),
    ).toBe("backward");
    expect(
      findFirstUnansweredQuestionRef({
        allQuestionIds: ["q1", "q2", "q3"],
        questionStates: {
          q1: { completed: true, timeSpentSeconds: 0 },
          q2: { skipped: true, timeSpentSeconds: 0 },
        },
        allQuestionRefs,
      }),
    ).toEqual({ exerciseId: "exercise-2", questionId: "q3" });
    expect(
      findFirstSkippedQuestionRef({
        allQuestionIds: ["q1", "q2", "q3"],
        questionStates: {
          q2: { skipped: true, timeSpentSeconds: 0 },
        },
        allQuestionRefs,
      }),
    ).toEqual({ exerciseId: "exercise-1", questionId: "q2" });
  });

  it("describes question state and primary action labels", () => {
    expect(
      buildQuestionStatePresentation({
        state: { skipped: true },
        solutionVisible: false,
        requiresResultEvaluation: false,
      }),
    ).toEqual({
      label: "متروك",
      tone: "danger",
    });
    expect(
      buildQuestionStatePresentation({
        state: { attempted: true },
        solutionVisible: true,
        requiresResultEvaluation: true,
      }),
    ).toEqual({
      label: "صحّح نتيجتك",
      tone: "accent",
    });
    expect(
      buildPrimaryActionLabel({
        isActiveSimulation: false,
        solutionVisible: false,
        canRevealSolution: false,
        canSubmitAutoAnswer: false,
        requiresResultEvaluation: false,
        requiresAutoCorrectReflection: false,
        requiresAutoDiagnosis: false,
        requiresReflection: false,
        isLastQuestion: false,
      }),
    ).toBe("متابعة إلى السؤال التالي");
  });
});
