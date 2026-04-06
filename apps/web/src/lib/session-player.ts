import { formatSessionType, type PracticeSessionResponse } from "@/lib/qbank";
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
  isLastQuestion: boolean;
  progressPercent: number;
  activeExerciseTopics: Array<{ code: string; name: string }>;
  sessionMeta: Array<{ label: string; value: string }>;
  navigatorExercises: ReturnType<typeof buildSessionNavigatorExercises>;
  questionStatePresentation: ReturnType<typeof buildQuestionStatePresentation>;
  primaryActionLabel: string;
  questionMotionClass: string;
  questionMotionLocked: boolean;
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
    | PracticeSessionResponse["progress"]
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
  const activeQuestionId = activeExercise.questions.some(
    (question) => question.id === mergedProgress.activeQuestionId,
  )
    ? mergedProgress.activeQuestionId
    : (activeExercise.questions[0]?.id ?? firstQuestionId);

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
    questionStates: serialized.questionStates,
    totalQuestionCount: serialized.summary.totalQuestionCount,
    completedQuestionCount: serialized.summary.completedQuestionCount,
    skippedQuestionCount: serialized.summary.skippedQuestionCount,
    solutionViewedCount: serialized.summary.solutionViewedCount,
  };
}

export function buildSessionMeta(
  session: PracticeSessionResponse | null,
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

  return [
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
    { label: "الحفظ", value: "تلقائي" },
  ];
}

export function buildSessionGoalSummary(
  session: PracticeSessionResponse | null,
): string {
  if (!session?.filters) {
    return "جلسة تدريب مخصصة من مجموعة تمارين مطابقة لنفس الهدف.";
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

export function buildSessionPlayerViewModel(input: {
  session: PracticeSessionResponse | null;
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
  const solutionVisible =
    Boolean(activeQuestionState?.solutionViewed) ||
    input.progress.mode === "REVIEW";
  const canRevealSolution = canRevealStudyQuestionSolution(activeQuestion);
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
  });
  const primaryActionLabel = buildPrimaryActionLabel({
    solutionVisible,
    canRevealSolution,
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
    isLastQuestion,
    progressPercent,
    activeExerciseTopics,
    sessionMeta,
    navigatorExercises,
    questionStatePresentation,
    primaryActionLabel,
    questionMotionClass,
    questionMotionLocked: Boolean(input.questionMotion),
  };
}

export function buildQuestionStatePresentation(input: {
  state: StudyQuestionState | undefined;
  solutionVisible: boolean;
}) {
  return input.state?.skipped
    ? { label: "متروك", tone: "danger" as const }
    : input.state?.completed
      ? { label: "مكتمل", tone: "success" as const }
      : input.solutionVisible
        ? { label: "الحل ظاهر", tone: "accent" as const }
        : { label: "جاهز", tone: "brand" as const };
}

export function buildPrimaryActionLabel(input: {
  solutionVisible: boolean;
  canRevealSolution: boolean;
  isLastQuestion: boolean;
}) {
  return !input.solutionVisible && input.canRevealSolution
    ? "الحل"
    : input.isLastQuestion
      ? "إنهاء الجلسة"
      : !input.solutionVisible && !input.canRevealSolution
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
