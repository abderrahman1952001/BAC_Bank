import {
  PracticeSessionProgress,
  PracticeStudyMode,
} from '@/lib/qbank';

export type StudyQuestionState = {
  opened?: boolean;
  completed?: boolean;
  skipped?: boolean;
  solutionViewed?: boolean;
};

export type StudyProgressSnapshot = {
  activeExerciseId: string | null;
  activeQuestionId: string | null;
  mode: PracticeStudyMode;
  questionStates: Record<string, StudyQuestionState>;
  updatedAt: string;
};

export type StudyQuestionVisualState =
  | 'idle'
  | 'opened'
  | 'active'
  | 'completed'
  | 'skipped';

export type StudyQuestionStateDescriptor = {
  label: string;
  tone: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'accent';
};

export function buildEmptyStudyProgress(
  mode: PracticeStudyMode = 'SOLVE',
): StudyProgressSnapshot {
  return {
    activeExerciseId: null,
    activeQuestionId: null,
    mode,
    questionStates: {},
    updatedAt: new Date(0).toISOString(),
  };
}

export function normalizeStudyProgress(
  value: PracticeSessionProgress | StudyProgressSnapshot | null | undefined,
): StudyProgressSnapshot | null {
  if (!value) {
    return null;
  }

  if (!Array.isArray(value.questionStates)) {
    return {
      activeExerciseId: value.activeExerciseId,
      activeQuestionId: value.activeQuestionId,
      mode: value.mode,
      questionStates: value.questionStates,
      updatedAt: value.updatedAt,
    };
  }

  const arrayQuestionStates = value.questionStates;

  const questionStates = Object.fromEntries(
    arrayQuestionStates.map((item) => [
      item.questionId,
      {
        opened: item.opened,
        completed: item.completed,
        skipped: item.skipped,
        solutionViewed: item.solutionViewed,
      },
    ]),
  );

  return {
    activeExerciseId: value.activeExerciseId,
    activeQuestionId: value.activeQuestionId,
    mode: value.mode,
    questionStates,
    updatedAt: value.updatedAt,
  };
}

export function serializeStudyProgress(
  snapshot: StudyProgressSnapshot,
  allQuestionIds: string[],
): PracticeSessionProgress {
  const questionStates = allQuestionIds.map((questionId) => ({
    questionId,
    opened: Boolean(snapshot.questionStates[questionId]?.opened),
    completed: Boolean(snapshot.questionStates[questionId]?.completed),
    skipped: Boolean(snapshot.questionStates[questionId]?.skipped),
    solutionViewed: Boolean(snapshot.questionStates[questionId]?.solutionViewed),
  }));

  const completedQuestionCount = questionStates.filter(
    (item) => item.completed,
  ).length;
  const skippedQuestionCount = questionStates.filter((item) => item.skipped).length;
  const solutionViewedCount = questionStates.filter(
    (item) => item.solutionViewed,
  ).length;

  return {
    activeExerciseId: snapshot.activeExerciseId,
    activeQuestionId: snapshot.activeQuestionId,
    mode: snapshot.mode,
    questionStates,
    summary: {
      totalQuestionCount: allQuestionIds.length,
      completedQuestionCount,
      skippedQuestionCount,
      unansweredQuestionCount: Math.max(
        allQuestionIds.length - completedQuestionCount - skippedQuestionCount,
        0,
      ),
      solutionViewedCount,
    },
    updatedAt: snapshot.updatedAt,
  };
}

export function getQuestionVisualState(
  state: StudyQuestionState | undefined,
  isActive: boolean,
): StudyQuestionVisualState {
  if (isActive) {
    return 'active';
  }

  if (state?.completed) {
    return 'completed';
  }

  if (state?.skipped) {
    return 'skipped';
  }

  if (state?.opened || state?.solutionViewed) {
    return 'opened';
  }

  return 'idle';
}

export function describeStudyQuestionState(
  state: StudyQuestionState | undefined,
  isActive: boolean,
): StudyQuestionStateDescriptor {
  if (isActive) {
    return {
      label: 'السؤال الحالي',
      tone: 'brand',
    };
  }

  if (state?.completed) {
    return {
      label: 'منجز',
      tone: 'success',
    };
  }

  if (state?.skipped) {
    return {
      label: 'متروك',
      tone: 'danger',
    };
  }

  if (state?.opened || state?.solutionViewed) {
    return {
      label: 'تم فتحه',
      tone: 'warning',
    };
  }

  return {
    label: 'غير مفتوح',
    tone: 'neutral',
  };
}

export function countStudyProgress(
  allQuestionIds: string[],
  questionStates: Record<string, StudyQuestionState>,
) {
  const completedCount = allQuestionIds.filter(
    (questionId) => questionStates[questionId]?.completed,
  ).length;
  const skippedCount = allQuestionIds.filter(
    (questionId) => questionStates[questionId]?.skipped,
  ).length;
  const solutionViewedCount = allQuestionIds.filter(
    (questionId) => questionStates[questionId]?.solutionViewed,
  ).length;
  const openedCount = allQuestionIds.filter(
    (questionId) => questionStates[questionId]?.opened,
  ).length;

  return {
    totalCount: allQuestionIds.length,
    completedCount,
    skippedCount,
    solutionViewedCount,
    openedCount,
    unansweredCount: Math.max(
      allQuestionIds.length - completedCount - skippedCount,
      0,
    ),
  };
}

export function getFirstUnansweredQuestionId(
  allQuestionIds: string[],
  questionStates: Record<string, StudyQuestionState>,
): string | null {
  return (
    allQuestionIds.find((questionId) => {
      const state = questionStates[questionId];
      return !state?.completed && !state?.skipped;
    }) ?? null
  );
}

export function chooseFreshestStudyProgress(
  localValue: StudyProgressSnapshot | null,
  remoteValue: StudyProgressSnapshot | null,
): StudyProgressSnapshot | null {
  if (!localValue) {
    return remoteValue;
  }

  if (!remoteValue) {
    return localValue;
  }

  return new Date(localValue.updatedAt) >= new Date(remoteValue.updatedAt)
    ? localValue
    : remoteValue;
}

export function readLocalStudyProgress(
  storageKey: string,
): StudyProgressSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return null;
    }

    return normalizeStudyProgress(
      JSON.parse(raw) as StudyProgressSnapshot | PracticeSessionProgress,
    );
  } catch {
    return null;
  }
}

export function writeLocalStudyProgress(
  storageKey: string,
  snapshot: StudyProgressSnapshot,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
}
