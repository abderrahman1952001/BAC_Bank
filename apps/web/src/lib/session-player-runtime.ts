import type {
  StudyQuestionDiagnosis,
  StudyQuestionReflection,
  StudySessionFamily,
  StudySessionStatus,
} from "@/lib/study-api";
import type { StudyProgressSnapshot, StudyQuestionState } from "@/lib/study";
import type { SessionQuestionRef } from "@/lib/session-player";

export type SessionPlayerProgressPlan =
  | {
      kind: "switch_to_review";
      firstRef: SessionQuestionRef;
    }
  | {
      kind: "completion";
    }
  | {
      kind: "checkpoint";
      exerciseId: string;
    }
  | {
      kind: "transition";
      nextRef: SessionQuestionRef;
    };

export function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, button, [contenteditable="true"]'),
  );
}

export function isQuestionTimingTrackingEnabled(options: {
  timingEnabled: boolean | null | undefined;
  sessionFamily: StudySessionFamily | null | undefined;
  progressMode: StudyProgressSnapshot["mode"];
}) {
  const { timingEnabled, sessionFamily, progressMode } = options;

  return (
    Boolean(timingEnabled) &&
    sessionFamily === "DRILL" &&
    progressMode === "SOLVE"
  );
}

export function resolveRemainingSessionTimeMs(options: {
  sessionFamily: StudySessionFamily | null | undefined;
  deadlineAt: string | null | undefined;
  countdownNow: number;
}) {
  const { sessionFamily, deadlineAt, countdownNow } = options;

  return sessionFamily === "SIMULATION" && deadlineAt
    ? Math.max(new Date(deadlineAt).getTime() - countdownNow, 0)
    : null;
}

export function resolveSimulationReviewAction(options: {
  sessionFamily: StudySessionFamily | null | undefined;
  sessionStatus: StudySessionStatus | null | undefined;
  deadlineAt: string | null | undefined;
  progressMode: StudyProgressSnapshot["mode"];
  countdownNow: number;
}) {
  const {
    sessionFamily,
    sessionStatus,
    deadlineAt,
    progressMode,
    countdownNow,
  } = options;

  if (sessionFamily !== "SIMULATION" || progressMode === "REVIEW") {
    return "none" as const;
  }

  if (sessionStatus === "COMPLETED" || sessionStatus === "EXPIRED") {
    return "enter_review" as const;
  }

  if (deadlineAt && new Date(deadlineAt).getTime() <= countdownNow) {
    return "expire_and_enter_review" as const;
  }

  return "none" as const;
}

export function shouldAutoRevealReviewSolution(options: {
  progressMode: StudyProgressSnapshot["mode"];
  activeQuestionId: string | null;
  questionStates: StudyProgressSnapshot["questionStates"];
}) {
  const { progressMode, activeQuestionId, questionStates } = options;

  return Boolean(
    progressMode === "REVIEW" &&
      activeQuestionId &&
      !questionStates[activeQuestionId]?.solutionViewed,
  );
}

export function shouldStayOnCurrentQuestionAfterReflection(options: {
  reflection: StudyQuestionReflection;
  progressMode: StudyProgressSnapshot["mode"];
  sessionFamily: StudySessionFamily | null | undefined;
}) {
  const { reflection, progressMode, sessionFamily } = options;

  return (
    reflection === "MISSED" ||
    sessionFamily === "SIMULATION" ||
    progressMode === "REVIEW"
  );
}

export function shouldStayOnCurrentQuestionAfterDiagnosis(options: {
  progressMode: StudyProgressSnapshot["mode"];
  sessionFamily: StudySessionFamily | null | undefined;
}) {
  const { progressMode, sessionFamily } = options;

  return progressMode === "REVIEW" || sessionFamily === "SIMULATION";
}

export function buildRevealSolutionQuestionState(
  current: StudyQuestionState | undefined,
): StudyQuestionState {
  return {
    ...(current ?? {}),
    opened: true,
    skipped: false,
    solutionViewed: true,
  };
}

export function buildHintViewedQuestionState(
  current: StudyQuestionState | undefined,
): StudyQuestionState {
  return {
    ...(current ?? {}),
    opened: true,
    hintViewed: true,
  };
}

export function buildMethodViewedQuestionState(
  current: StudyQuestionState | undefined,
): StudyQuestionState {
  return {
    ...(current ?? {}),
    opened: true,
    methodViewed: true,
  };
}

export function buildReflectionQuestionState(options: {
  current: StudyQuestionState | undefined;
  reflection: StudyQuestionReflection;
  progressMode: StudyProgressSnapshot["mode"];
  complete: boolean;
}) {
  const { current, reflection, progressMode, complete } = options;

  return {
    ...(current ?? {}),
    ...(complete
      ? {
          completed: true,
          skipped: false,
        }
      : {}),
    opened: true,
    reflection,
    diagnosis: reflection === "MISSED" ? current?.diagnosis ?? null : null,
    solutionViewed:
      Boolean(current?.solutionViewed) || progressMode === "REVIEW",
  } satisfies StudyQuestionState;
}

export function buildDiagnosisQuestionState(options: {
  current: StudyQuestionState | undefined;
  diagnosis: StudyQuestionDiagnosis;
  progressMode: StudyProgressSnapshot["mode"];
  complete: boolean;
}) {
  const { current, diagnosis, progressMode, complete } = options;

  return {
    ...(current ?? {}),
    ...(complete
      ? {
          completed: true,
          skipped: false,
        }
      : {}),
    opened: true,
    diagnosis,
    solutionViewed:
      Boolean(current?.solutionViewed) || progressMode === "REVIEW",
  } satisfies StudyQuestionState;
}

export function buildSkippedQuestionState(
  current: StudyQuestionState | undefined,
): StudyQuestionState {
  return {
    ...(current ?? {}),
    opened: true,
    completed: false,
    skipped: true,
  };
}

export function buildCompletedQuestionState(options: {
  current: StudyQuestionState | undefined;
  progressMode: StudyProgressSnapshot["mode"];
}) {
  const { current, progressMode } = options;

  return {
    ...(current ?? {}),
    opened: true,
    completed: true,
    skipped: false,
    solutionViewed:
      Boolean(current?.solutionViewed) || progressMode === "REVIEW",
  } satisfies StudyQuestionState;
}

export function resolveQuestionProgressPlan(options: {
  activeExerciseId: string;
  nextRef: SessionQuestionRef | null;
  firstRef: SessionQuestionRef | null;
  sessionFamily: StudySessionFamily | null | undefined;
  progressMode: StudyProgressSnapshot["mode"];
  switchToReviewOnEnd?: boolean;
}): SessionPlayerProgressPlan {
  const {
    activeExerciseId,
    nextRef,
    firstRef,
    sessionFamily,
    progressMode,
    switchToReviewOnEnd,
  } = options;

  if (!nextRef) {
    if (switchToReviewOnEnd && firstRef) {
      return {
        kind: "switch_to_review",
        firstRef,
      };
    }

    return {
      kind: "completion",
    };
  }

  if (
    sessionFamily === "DRILL" &&
    progressMode === "SOLVE" &&
    nextRef.exerciseId !== activeExerciseId
  ) {
    return {
      kind: "checkpoint",
      exerciseId: activeExerciseId,
    };
  }

  return {
    kind: "transition",
    nextRef,
  };
}
