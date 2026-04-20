import {
  formatStudySessionKind,
  formatSessionType,
  type StudySessionResponse,
} from "@/lib/study-api";
import {
  buildEmptyStudyProgress,
  chooseFreshestStudyProgress,
  countStudyProgress,
  getFirstUnansweredQuestionId,
  getQuestionVisualState,
  normalizeStudyProgress,
  serializeStudyProgress,
  type StudyProgressSnapshot,
  type StudyQuestionState,
} from "@/lib/study";
import {
  canRevealStudyQuestionSolution,
  getStudyQuestionTopics,
  type StudyExerciseModel,
  type StudyQuestionModel,
} from "@/lib/study-surface";
import { formatStudyDuration } from "@/lib/study-time";

export type SessionQuestionRef = {
  exerciseId: string;
  questionId: string;
};

export type QuestionMotionDirection = "forward" | "backward";

export type QuestionMotionState = {
  phase: "out" | "in";
  direction: QuestionMotionDirection;
};

export type SessionPlayerViewModel = {
  allQuestionRefs: SessionQuestionRef[];
  allQuestionIds: string[];
  activeExercise: StudyExerciseModel | null;
  activeQuestion: StudyQuestionModel | null;
  progressCounts: ReturnType<typeof countStudyProgress>;
  currentQuestionPosition: number;
  activeQuestionState: StudyQuestionState | undefined;
  solutionVisible: boolean;
  canRevealSolution: boolean;
  autoAnswerResponseMode: StudyQuestionModel["interaction"]["responseMode"];
  canSubmitAutoAnswer: boolean;
  requiresResultEvaluation: boolean;
  requiresAutoCorrectReflection: boolean;
  requiresAutoDiagnosis: boolean;
  requiresReflection: boolean;
  isActiveSimulation: boolean;
  canToggleMode: boolean;
  isLastQuestion: boolean;
  progressPercent: number;
  activeExerciseTopics: Array<{ code: string; name: string }>;
  sessionMeta: Array<{ label: string; value: string }>;
  navigatorExercises: ReturnType<typeof buildSessionNavigatorExercises>;
  questionStatePresentation: ReturnType<typeof buildQuestionStatePresentation>;
  primaryActionLabel: string;
  primaryActionDisabled: boolean;
  questionMotionClass: string;
  questionMotionLocked: boolean;
};

export type ExerciseCheckpointSummary = {
  exerciseId: string;
  title: string;
  totalTimeSeconds: number;
  counts: {
    totalCount: number;
    completedCount: number;
    skippedCount: number;
    solutionViewedCount: number;
    missedCount: number;
    hardCount: number;
  };
  insights: string[];
};

export function buildSessionQuestionRefs(
  exercises: StudyExerciseModel[],
): SessionQuestionRef[] {
  return exercises.flatMap((exercise) =>
    exercise.questions.map((question) => ({
      exerciseId: exercise.id,
      questionId: question.id,
    })),
  );
}

export function resolveSessionPlayerProgress(input: {
  exercises: StudyExerciseModel[];
  localProgress: StudyProgressSnapshot | null | undefined;
  remoteProgress:
    | StudySessionResponse["progress"]
    | StudyProgressSnapshot
    | null
    | undefined;
  nowIso?: string;
}): StudyProgressSnapshot {
  const mergedProgress =
    chooseFreshestStudyProgress(
      normalizeStudyProgress(input.localProgress),
      normalizeStudyProgress(input.remoteProgress),
    ) ?? buildEmptyStudyProgress();
  const firstExercise = input.exercises[0];
  const firstQuestionId = firstExercise?.questions[0]?.id ?? null;

  if (!firstExercise || !firstQuestionId) {
    return buildEmptyStudyProgress();
  }

  const activeExerciseId = input.exercises.some(
    (exercise) => exercise.id === mergedProgress.activeExerciseId,
  )
    ? mergedProgress.activeExerciseId
    : firstExercise.id;
  const activeExercise =
    input.exercises.find((exercise) => exercise.id === activeExerciseId) ??
    firstExercise;
  const requestedActiveQuestionId = activeExercise.questions.some(
    (question) => question.id === mergedProgress.activeQuestionId,
  )
    ? mergedProgress.activeQuestionId
    : (activeExercise.questions[0]?.id ?? firstQuestionId);
  const allQuestionIds = buildSessionQuestionRefs(input.exercises).map(
    (item) => item.questionId,
  );
  const firstUnansweredQuestionId =
    mergedProgress.mode === "SOLVE"
      ? getFirstUnansweredQuestionId(allQuestionIds, mergedProgress.questionStates)
      : null;
  const requestedActiveQuestionState = requestedActiveQuestionId
    ? mergedProgress.questionStates[requestedActiveQuestionId]
    : undefined;
  const activeQuestionId =
    requestedActiveQuestionId &&
    requestedActiveQuestionState &&
    (requestedActiveQuestionState.completed ||
      requestedActiveQuestionState.skipped) &&
    firstUnansweredQuestionId
      ? firstUnansweredQuestionId
      : requestedActiveQuestionId;

  return {
    ...mergedProgress,
    activeExerciseId,
    activeQuestionId,
    questionStates: {
      ...mergedProgress.questionStates,
      ...(activeQuestionId
        ? {
            [activeQuestionId]: {
              ...mergedProgress.questionStates[activeQuestionId],
              opened: true,
            },
          }
        : {}),
    },
    updatedAt:
      mergedProgress.updatedAt || input.nowIso || new Date().toISOString(),
  };
}

export function buildSessionProgressUpdateRequest(
  progress: StudyProgressSnapshot,
  allQuestionIds: string[],
) {
  const serialized = serializeStudyProgress(progress, allQuestionIds);

  return {
    activeExerciseId: serialized.activeExerciseId,
    activeQuestionId: serialized.activeQuestionId,
    mode: serialized.mode,
    questionStates: serialized.questionStates.map((question) => ({
      questionId: question.questionId,
      opened: question.opened,
      completed: question.completed,
      skipped: question.skipped,
      solutionViewed: question.solutionViewed,
      timeSpentSeconds: question.timeSpentSeconds,
      reflection: question.reflection,
      diagnosis: question.diagnosis,
    })),
    totalQuestionCount: serialized.summary.totalQuestionCount,
    completedQuestionCount: serialized.summary.completedQuestionCount,
    skippedQuestionCount: serialized.summary.skippedQuestionCount,
    solutionViewedCount: serialized.summary.solutionViewedCount,
  };
}

export function buildSessionMeta(
  session: StudySessionResponse | null,
): Array<{ label: string; value: string }> {
  if (!session?.exercises.length) {
    return [];
  }

  const firstExercise = session.exercises[0];
  const streamNames = Array.from(
    new Set(session.exercises.map((exercise) => exercise.exam.stream.name)),
  );
  const yearValues = Array.from(
    new Set(session.exercises.map((exercise) => exercise.exam.year)),
  ).sort((a, b) => b - a);
  const meta = [
    { label: "النمط", value: formatStudySessionKind(session.kind) },
    { label: "المادة", value: firstExercise.exam.subject.name },
    {
      label: "الشعب",
      value: streamNames.length === 1 ? streamNames[0] : "عدة شعب",
    },
    {
      label: "السنوات",
      value:
        yearValues.length > 1
          ? `${yearValues[yearValues.length - 1]} - ${yearValues[0]}`
          : String(yearValues[0]),
    },
  ];

  if (session.durationMinutes) {
    meta.push({ label: "المدة", value: `${session.durationMinutes} دقيقة` });
  }

  if (session.timingEnabled) {
    meta.push({ label: "الوقت النشط", value: "مفعل" });
  }

  meta.push({ label: "الحفظ", value: "تلقائي" });

  return meta;
}

export function buildSessionGoalSummary(
  session: StudySessionResponse | null,
): string {
  if (session?.family === "SIMULATION") {
    return session.durationMinutes
      ? `محاكاة رسمية كاملة بزمن محدد قدره ${session.durationMinutes} دقيقة.`
      : "محاكاة رسمية كاملة بزمن محدد.";
  }

  if (!session?.filters) {
    return "جلسة تدريب مبنية من تمارين مطابقة لنفس الهدف.";
  }

  const parts: string[] = [];
  const selectedStreamCodes = session.filters.streamCodes?.length
    ? session.filters.streamCodes
    : session.filters.streamCode
      ? [session.filters.streamCode]
      : [];

  if (session.filters.topicCodes?.length) {
    parts.push(
      session.filters.topicCodes.length === 1
        ? "محور واحد محدد"
        : `${session.filters.topicCodes.length} محاور محددة`,
    );
  } else {
    parts.push("كل المحاور المطابقة");
  }

  if (selectedStreamCodes.length) {
    const matchingStreams = Array.from(
      new Set(
        session.exercises
          .map((exercise) => exercise.exam.stream)
          .filter((stream) => selectedStreamCodes.includes(stream.code))
          .map((stream) => stream.name),
      ),
    );

    if (matchingStreams.length === 1) {
      parts.push(`شعبة ${matchingStreams[0]}`);
    } else {
      parts.push(`${selectedStreamCodes.length} شعب محددة`);
    }
  } else {
    parts.push("كل الشعب المطابقة");
  }

  if (session.filters.years?.length) {
    const sortedYears = [...session.filters.years].sort((a, b) => b - a);
    parts.push(
      sortedYears.length === 1
        ? `سنة ${sortedYears[0]}`
        : `بين ${sortedYears[sortedYears.length - 1]} و ${sortedYears[0]}`,
    );
  }

  if (session.filters.sessionTypes?.length === 1) {
    parts.push(
      formatSessionType(session.filters.sessionTypes[0] as "NORMAL" | "MAKEUP"),
    );
  }

  return parts.join(" · ");
}

export function buildActiveExerciseTopics(exercise: StudyExerciseModel | null) {
  if (!exercise) {
    return [];
  }

  return Array.from(
    new Map(
      exercise.questions
        .flatMap((question) => getStudyQuestionTopics(question))
        .map((topic) => [topic.code, topic]),
    ).values(),
  );
}

export function buildSessionNavigatorExercises(input: {
  exercises: StudyExerciseModel[];
  questionStates: Record<string, StudyQuestionState>;
  activeQuestionId: string | null;
}) {
  return input.exercises.map((exercise) => {
    const exerciseQuestionIds = exercise.questions.map(
      (question) => question.id,
    );
    const counts = countStudyProgress(
      exerciseQuestionIds,
      input.questionStates,
    );

    return {
      id: exercise.id,
      title: `التمرين ${exercise.displayOrder}`,
      subtitle: exercise.sourceExam
        ? `${exercise.sourceExam.subject.name} · ${exercise.sourceExam.year}`
        : undefined,
      badge: `${exercise.questions.length} س`,
      progressLabel: `${counts.completedCount}/${counts.totalCount} منجزة`,
      questions: exercise.questions.map((question) => ({
        id: question.id,
        label: question.label,
        shortLabel: question.label,
        status: getQuestionVisualState(
          input.questionStates[question.id],
          question.id === input.activeQuestionId,
        ),
        solutionViewed: input.questionStates[question.id]?.solutionViewed,
      })),
    };
  });
}

export function buildExerciseCheckpointSummary(input: {
  exercise: StudyExerciseModel;
  questionStates: Record<string, StudyQuestionState>;
  timingEnabled: boolean;
}) : ExerciseCheckpointSummary {
  const questionIds = input.exercise.questions.map((question) => question.id);
  const counts = countStudyProgress(questionIds, input.questionStates);
  const totalTimeSeconds = questionIds.reduce(
    (total, questionId) => total + (input.questionStates[questionId]?.timeSpentSeconds ?? 0),
    0,
  );
  const longestQuestion = input.exercise.questions.reduce<StudyQuestionModel | null>(
    (current, question) => {
      if (!current) {
        return question;
      }

      const currentDuration =
        input.questionStates[current.id]?.timeSpentSeconds ?? 0;
      const nextDuration = input.questionStates[question.id]?.timeSpentSeconds ?? 0;

      return nextDuration > currentDuration ? question : current;
    },
    null,
  );
  const missedCount = questionIds.filter(
    (questionId) => input.questionStates[questionId]?.reflection === "MISSED",
  ).length;
  const hardCount = questionIds.filter(
    (questionId) => input.questionStates[questionId]?.reflection === "HARD",
  ).length;
  const insights: string[] = [];

  if (missedCount > 0) {
    insights.push(`ما زال ${missedCount} سؤال يحتاج علاجاً مباشراً داخل هذا التمرين.`);
  } else if (hardCount > 0) {
    insights.push(`أنهيت التمرين لكن ${hardCount} سؤال بقي في خانة الصعب.`);
  } else if (counts.solutionViewedCount > 0) {
    insights.push(
      `اعتمدت على الحل الرسمي في ${counts.solutionViewedCount} سؤال من هذا التمرين.`,
    );
  } else {
    insights.push("أنهيت هذا التمرين بسلاسة جيدة.");
  }

  if (
    input.timingEnabled &&
    totalTimeSeconds > 0 &&
    longestQuestion &&
    (input.questionStates[longestQuestion.id]?.timeSpentSeconds ?? 0) > 0
  ) {
    insights.push(
      `أطول توقف كان عند ${longestQuestion.label} (${formatStudyDuration(
        input.questionStates[longestQuestion.id]?.timeSpentSeconds ?? 0,
      )}).`,
    );
  }

  return {
    exerciseId: input.exercise.id,
    title: `التمرين ${input.exercise.displayOrder}`,
    totalTimeSeconds,
    counts: {
      totalCount: counts.totalCount,
      completedCount: counts.completedCount,
      skippedCount: counts.skippedCount,
      solutionViewedCount: counts.solutionViewedCount,
      missedCount,
      hardCount,
    },
    insights,
  };
}

export function buildSessionPlayerViewModel(input: {
  session: StudySessionResponse | null;
  exercises: StudyExerciseModel[];
  progress: StudyProgressSnapshot;
  questionMotion: QuestionMotionState | null;
}): SessionPlayerViewModel {
  const allQuestionRefs = buildSessionQuestionRefs(input.exercises);
  const allQuestionIds = allQuestionRefs.map((item) => item.questionId);
  const activeExercise =
    input.exercises.find(
      (exercise) => exercise.id === input.progress.activeExerciseId,
    ) ??
    input.exercises[0] ??
    null;
  const activeQuestion =
    activeExercise?.questions.find(
      (question) => question.id === input.progress.activeQuestionId,
    ) ??
    activeExercise?.questions[0] ??
    null;
  const progressCounts = countStudyProgress(
    allQuestionIds,
    input.progress.questionStates,
  );
  const currentQuestionPosition = activeQuestion
    ? allQuestionIds.findIndex((questionId) => questionId === activeQuestion.id) +
      1
    : 0;
  const activeQuestionState = activeQuestion
    ? input.progress.questionStates[activeQuestion.id]
    : undefined;
  const isActiveSimulation =
    input.session?.family === "SIMULATION" &&
    input.session.status !== "COMPLETED" &&
    input.session.status !== "EXPIRED" &&
    input.progress.mode !== "REVIEW";
  const solutionVisible =
    Boolean(activeQuestionState?.solutionViewed) ||
    input.progress.mode === "REVIEW";
  const canRevealSolution =
    !isActiveSimulation && canRevealStudyQuestionSolution(activeQuestion);
  const autoAnswerResponseMode = activeQuestion?.interaction.responseMode ?? "NONE";
  const hasObjectiveResult =
    activeQuestionState?.resultStatus != null &&
    activeQuestionState.resultStatus !== "UNKNOWN";
  const canSubmitAutoAnswer =
    input.progress.mode === "SOLVE" &&
    !isActiveSimulation &&
    !solutionVisible &&
    autoAnswerResponseMode !== "NONE" &&
    activeQuestionState?.resultStatus !== "CORRECT";
  const requiresResultEvaluation =
    solutionVisible &&
    Boolean(activeQuestionState?.attempted) &&
    !hasObjectiveResult;
  const requiresAutoCorrectReflection =
    input.progress.mode === "SOLVE" &&
    activeQuestionState?.evaluationMode === "AUTO" &&
    activeQuestionState?.resultStatus === "CORRECT" &&
    activeQuestionState?.reflection == null;
  const requiresAutoDiagnosis =
    input.progress.mode === "SOLVE" &&
    solutionVisible &&
    activeQuestionState?.evaluationMode === "AUTO" &&
    (activeQuestionState?.resultStatus === "PARTIAL" ||
      activeQuestionState?.resultStatus === "INCORRECT") &&
    activeQuestionState?.diagnosis == null;
  const requiresReflection =
    !requiresResultEvaluation &&
    !requiresAutoCorrectReflection &&
    !requiresAutoDiagnosis &&
    !activeQuestionState?.attempted &&
    activeQuestionState?.evaluationMode !== "AUTO" &&
    input.session?.family === "DRILL" &&
    input.progress.mode !== "REVIEW" &&
    solutionVisible &&
    activeQuestionState?.reflection == null;
  const isLastQuestion =
    progressCounts.totalCount > 0 &&
    currentQuestionPosition === progressCounts.totalCount;
  const progressPercent =
    (currentQuestionPosition / Math.max(progressCounts.totalCount, 1)) * 100;
  const activeExerciseTopics = buildActiveExerciseTopics(activeExercise);
  const sessionMeta = buildSessionMeta(input.session);
  const navigatorExercises = buildSessionNavigatorExercises({
    exercises: input.exercises,
    questionStates: input.progress.questionStates,
    activeQuestionId: activeQuestion?.id ?? null,
  });
  const questionStatePresentation = buildQuestionStatePresentation({
    state: activeQuestionState,
    solutionVisible,
    requiresResultEvaluation,
  });
  const primaryActionLabel = buildPrimaryActionLabel({
    isActiveSimulation,
    solutionVisible,
    canRevealSolution,
    canSubmitAutoAnswer,
    requiresResultEvaluation,
    requiresAutoCorrectReflection,
    requiresAutoDiagnosis,
    requiresReflection,
    isLastQuestion,
  });
  const questionMotionClass = input.questionMotion
    ? input.questionMotion.phase === "out"
      ? input.questionMotion.direction === "forward"
        ? "is-leaving-forward"
        : "is-leaving-backward"
      : input.questionMotion.direction === "forward"
        ? "is-entering-forward"
        : "is-entering-backward"
    : "";

  return {
    allQuestionRefs,
    allQuestionIds,
    activeExercise,
    activeQuestion,
    progressCounts,
    currentQuestionPosition,
    activeQuestionState,
    solutionVisible,
    canRevealSolution,
    autoAnswerResponseMode,
    canSubmitAutoAnswer,
    requiresResultEvaluation,
    requiresAutoCorrectReflection,
    requiresAutoDiagnosis,
    requiresReflection,
    isActiveSimulation,
    canToggleMode: input.session?.family !== "SIMULATION",
    isLastQuestion,
    progressPercent,
    activeExerciseTopics,
    sessionMeta,
    navigatorExercises,
    questionStatePresentation,
    primaryActionLabel,
    primaryActionDisabled:
      requiresResultEvaluation ||
      requiresAutoCorrectReflection ||
      requiresAutoDiagnosis ||
      requiresReflection,
    questionMotionClass,
    questionMotionLocked: Boolean(input.questionMotion),
  };
}

export function buildQuestionStatePresentation(input: {
  state: StudyQuestionState | undefined;
  solutionVisible: boolean;
  requiresResultEvaluation: boolean;
}) {
  if (input.state?.skipped) {
    return { label: "متروك", tone: "danger" as const };
  }

  if (input.state?.resultStatus === "CORRECT") {
    return { label: "مطابق", tone: "success" as const };
  }

  if (input.state?.resultStatus === "PARTIAL") {
    return { label: "جزئي", tone: "warning" as const };
  }

  if (input.state?.resultStatus === "INCORRECT") {
    return { label: "غير مطابق", tone: "danger" as const };
  }

  if (input.requiresResultEvaluation) {
    return { label: "صحّح نتيجتك", tone: "accent" as const };
  }

  if (input.state?.attempted) {
    return { label: "محاولة جاهزة", tone: "accent" as const };
  }

  if (input.state?.completed) {
    return { label: "مكتمل", tone: "success" as const };
  }

  if (input.solutionVisible) {
    return { label: "الحل ظاهر", tone: "accent" as const };
  }

  return { label: "جاهز", tone: "brand" as const };
}

export function buildPrimaryActionLabel(input: {
  isActiveSimulation: boolean;
  solutionVisible: boolean;
  canRevealSolution: boolean;
  canSubmitAutoAnswer: boolean;
  requiresResultEvaluation: boolean;
  requiresAutoCorrectReflection: boolean;
  requiresAutoDiagnosis: boolean;
  requiresReflection: boolean;
  isLastQuestion: boolean;
}) {
  if (input.requiresResultEvaluation) {
    return "ثبّت النتيجة";
  }

  if (input.requiresAutoCorrectReflection) {
    return "قيّم سهولة المحاولة";
  }

  if (input.requiresAutoDiagnosis) {
    return "اختر سبب التعثر";
  }

  if (input.requiresReflection) {
    return "اختر تقييمك";
  }

  if (input.isActiveSimulation) {
    return input.isLastQuestion ? "سلّم المحاكاة" : "السؤال التالي";
  }

  return !input.solutionVisible && input.canRevealSolution
    ? "الحل الرسمي"
    : input.isLastQuestion
      ? "إنهاء الجلسة"
      : !input.solutionVisible &&
          !input.canRevealSolution &&
          !input.canSubmitAutoAnswer
        ? "متابعة إلى السؤال التالي"
        : "السؤال التالي";
}

export function getQuestionRefIndex(
  questionId: string | null,
  allQuestionRefs: SessionQuestionRef[],
) {
  if (!questionId) {
    return -1;
  }

  return allQuestionRefs.findIndex((item) => item.questionId === questionId);
}

export function findQuestionRef(
  questionId: string | null,
  allQuestionRefs: SessionQuestionRef[],
) {
  if (!questionId) {
    return null;
  }

  return allQuestionRefs.find((item) => item.questionId === questionId) ?? null;
}

export function getAdjacentQuestionRef(input: {
  direction: -1 | 1;
  activeQuestionId: string | null;
  allQuestionRefs: SessionQuestionRef[];
}) {
  const currentIndex = getQuestionRefIndex(
    input.activeQuestionId,
    input.allQuestionRefs,
  );

  if (currentIndex === -1) {
    return null;
  }

  return input.allQuestionRefs[currentIndex + input.direction] ?? null;
}

export function getQuestionDirection(input: {
  targetQuestionId: string;
  activeQuestionId: string | null;
  allQuestionRefs: SessionQuestionRef[];
}): QuestionMotionDirection {
  const currentIndex = getQuestionRefIndex(
    input.activeQuestionId,
    input.allQuestionRefs,
  );
  const nextIndex = getQuestionRefIndex(
    input.targetQuestionId,
    input.allQuestionRefs,
  );

  if (currentIndex === -1 || nextIndex === -1) {
    return "forward";
  }

  return nextIndex >= currentIndex ? "forward" : "backward";
}

export function findFirstUnansweredQuestionRef(input: {
  allQuestionIds: string[];
  questionStates: Record<string, StudyQuestionState>;
  allQuestionRefs: SessionQuestionRef[];
}) {
  const questionId = getFirstUnansweredQuestionId(
    input.allQuestionIds,
    input.questionStates,
  );

  return findQuestionRef(questionId, input.allQuestionRefs);
}

export function findFirstSkippedQuestionRef(input: {
  allQuestionIds: string[];
  questionStates: Record<string, StudyQuestionState>;
  allQuestionRefs: SessionQuestionRef[];
}) {
  const questionId =
    input.allQuestionIds.find((item) => input.questionStates[item]?.skipped) ??
    null;

  return findQuestionRef(questionId, input.allQuestionRefs);
}
