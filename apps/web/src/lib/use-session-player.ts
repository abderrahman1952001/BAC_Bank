"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  API_BASE_URL,
  fetchJson,
  parseUpdateSessionProgressResponse,
  type PracticeSessionResponse,
  type UpdateSessionProgressResponse,
} from "@/lib/qbank";
import {
  buildSessionPlayerViewModel,
  buildSessionProgressUpdateRequest,
  findFirstSkippedQuestionRef,
  findFirstUnansweredQuestionRef,
  getAdjacentQuestionRef,
  getQuestionDirection,
  resolveSessionPlayerProgress,
  type QuestionMotionDirection,
  type QuestionMotionState,
  type SessionQuestionRef,
} from "@/lib/session-player";
import {
  buildEmptyStudyProgress,
  readLocalStudyProgress,
  type StudyProgressSnapshot,
  writeLocalStudyProgress,
} from "@/lib/study";
import {
  buildStudyExercisesFromSessionExercises,
  canRevealStudyQuestionSolution,
} from "@/lib/study-surface";

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, button, [contenteditable="true"]'),
  );
}

export function useSessionPlayer(
  sessionId: string,
  initialSession?: PracticeSessionResponse,
) {
  const [session, setSession] = useState<PracticeSessionResponse | null>(
    initialSession ?? null,
  );
  const error = initialSession ? null : "تعذر تحميل الجلسة.";
  const [progress, setProgress] = useState<StudyProgressSnapshot>(
    buildEmptyStudyProgress(),
  );
  const [progressReady, setProgressReady] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [questionMotion, setQuestionMotion] =
    useState<QuestionMotionState | null>(null);
  const questionMotionOutTimerRef = useRef<number | null>(null);
  const questionMotionInTimerRef = useRef<number | null>(null);

  const storageKey = `bac-bank:session:${sessionId}:progress`;
  const exercises = useMemo(
    () => buildStudyExercisesFromSessionExercises(session?.exercises ?? []),
    [session?.exercises],
  );
  const viewModel = useMemo(
    () =>
      buildSessionPlayerViewModel({
        session,
        exercises,
        progress,
        questionMotion,
      }),
    [exercises, progress, questionMotion, session],
  );

  function clearQuestionMotionTimers() {
    if (questionMotionOutTimerRef.current) {
      window.clearTimeout(questionMotionOutTimerRef.current);
      questionMotionOutTimerRef.current = null;
    }

    if (questionMotionInTimerRef.current) {
      window.clearTimeout(questionMotionInTimerRef.current);
      questionMotionInTimerRef.current = null;
    }
  }

  useEffect(() => {
    if (!session || !exercises.length) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setProgress(
        resolveSessionPlayerProgress({
          exercises,
          remoteProgress: session.progress,
          localProgress: readLocalStudyProgress(storageKey),
        }),
      );
      setProgressReady(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [exercises, session, storageKey]);

  useEffect(() => {
    if (!progressReady || !session) {
      return;
    }

    writeLocalStudyProgress(storageKey, progress);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const payload = await fetchJson<UpdateSessionProgressResponse>(
          `${API_BASE_URL}/qbank/sessions/${sessionId}/progress`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify(
              buildSessionProgressUpdateRequest(
                progress,
                viewModel.allQuestionIds,
              ),
            ),
          },
          parseUpdateSessionProgressResponse,
        );

        setSession((current) =>
          current
            ? {
                ...current,
                status: payload.status,
                progress: payload.progress,
              }
            : current,
        );
      } catch {
        return;
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    progress,
    progressReady,
    session,
    sessionId,
    storageKey,
    viewModel.allQuestionIds,
  ]);

  function updateProgress(
    updater: (current: StudyProgressSnapshot) => StudyProgressSnapshot,
  ) {
    setProgress((current) => ({
      ...updater(current),
      updatedAt: new Date().toISOString(),
    }));
  }

  function transitionToQuestion(
    nextRef: SessionQuestionRef,
    direction: QuestionMotionDirection,
    updater?: (current: StudyProgressSnapshot) => StudyProgressSnapshot,
  ) {
    if (viewModel.questionMotionLocked) {
      return false;
    }

    clearQuestionMotionTimers();
    setCompletionOpen(false);
    setShowNavigator(false);
    setQuestionMotion({
      phase: "out",
      direction,
    });

    questionMotionOutTimerRef.current = window.setTimeout(() => {
      updateProgress((current) => {
        const base = updater ? updater(current) : current;

        return {
          ...base,
          activeExerciseId: nextRef.exerciseId,
          activeQuestionId: nextRef.questionId,
          questionStates: {
            ...base.questionStates,
            [nextRef.questionId]: {
              ...base.questionStates[nextRef.questionId],
              opened: true,
            },
          },
        };
      });

      setQuestionMotion({
        phase: "in",
        direction,
      });

      questionMotionInTimerRef.current = window.setTimeout(() => {
        setQuestionMotion(null);
        questionMotionInTimerRef.current = null;
      }, 220);

      questionMotionOutTimerRef.current = null;
    }, 150);

    return true;
  }

  function activateQuestion(exerciseId: string, questionId: string) {
    if (viewModel.questionMotionLocked) {
      return;
    }

    if (
      exerciseId === progress.activeExerciseId &&
      questionId === progress.activeQuestionId
    ) {
      setShowNavigator(false);
      return;
    }

    void transitionToQuestion(
      {
        exerciseId,
        questionId,
      },
      getQuestionDirection({
        targetQuestionId: questionId,
        activeQuestionId: progress.activeQuestionId,
        allQuestionRefs: viewModel.allQuestionRefs,
      }),
    );
  }

  function activateExercise(exerciseId: string) {
    const exercise = exercises.find((item) => item.id === exerciseId);
    const fallbackQuestionId = exercise?.questions[0]?.id ?? null;

    if (!exercise || !fallbackQuestionId) {
      return;
    }

    activateQuestion(exercise.id, fallbackQuestionId);
  }

  function patchQuestionState(
    questionId: string,
    updater: (
      current: StudyProgressSnapshot["questionStates"][string] | undefined,
    ) => StudyProgressSnapshot["questionStates"][string],
  ) {
    updateProgress((current) => ({
      ...current,
      questionStates: {
        ...current.questionStates,
        [questionId]: updater(current.questionStates[questionId]),
      },
    }));
  }

  function goToAdjacentQuestion(direction: -1 | 1) {
    const nextRef = getAdjacentQuestionRef({
      direction,
      activeQuestionId: viewModel.activeQuestion?.id ?? null,
      allQuestionRefs: viewModel.allQuestionRefs,
    });

    if (!nextRef) {
      return false;
    }

    activateQuestion(nextRef.exerciseId, nextRef.questionId);
    return true;
  }

  function goToFirstUnanswered() {
    const questionRef = findFirstUnansweredQuestionRef({
      allQuestionIds: viewModel.allQuestionIds,
      questionStates: progress.questionStates,
      allQuestionRefs: viewModel.allQuestionRefs,
    });

    if (!questionRef) {
      return;
    }

    activateQuestion(questionRef.exerciseId, questionRef.questionId);
  }

  function goToFirstSkipped() {
    const questionRef = findFirstSkippedQuestionRef({
      allQuestionIds: viewModel.allQuestionIds,
      questionStates: progress.questionStates,
      allQuestionRefs: viewModel.allQuestionRefs,
    });

    if (!questionRef) {
      return;
    }

    activateQuestion(questionRef.exerciseId, questionRef.questionId);
  }

  function revealCurrentSolution() {
    if (!viewModel.activeQuestion) {
      return;
    }

    setCompletionOpen(false);
    patchQuestionState(viewModel.activeQuestion.id, (current) => ({
      ...(current ?? {}),
      opened: true,
      skipped: false,
      solutionViewed: true,
    }));
  }

  function skipCurrentQuestion() {
    if (!viewModel.activeQuestion || viewModel.questionMotionLocked) {
      return;
    }

    const nextRef = getAdjacentQuestionRef({
      direction: 1,
      activeQuestionId: viewModel.activeQuestion.id,
      allQuestionRefs: viewModel.allQuestionRefs,
    });

    setCompletionOpen(false);

    if (!nextRef) {
      updateProgress((current) => ({
        ...current,
        questionStates: {
          ...current.questionStates,
          [viewModel.activeQuestion!.id]: {
            ...(current.questionStates[viewModel.activeQuestion!.id] ?? {}),
            opened: true,
            completed: false,
            skipped: true,
          },
        },
      }));
      setCompletionOpen(true);
      return;
    }

    void transitionToQuestion(nextRef, "forward", (current) => ({
      ...current,
      questionStates: {
        ...current.questionStates,
        [viewModel.activeQuestion!.id]: {
          ...(current.questionStates[viewModel.activeQuestion!.id] ?? {}),
          opened: true,
          completed: false,
          skipped: true,
        },
      },
    }));
  }

  function advanceFromCurrentQuestion() {
    if (!viewModel.activeQuestion || viewModel.questionMotionLocked) {
      return;
    }

    const nextRef = getAdjacentQuestionRef({
      direction: 1,
      activeQuestionId: viewModel.activeQuestion.id,
      allQuestionRefs: viewModel.allQuestionRefs,
    });

    setCompletionOpen(false);

    if (progress.mode === "REVIEW") {
      if (nextRef) {
        void transitionToQuestion(nextRef, "forward");
      } else {
        setCompletionOpen(true);
      }

      return;
    }

    if (!nextRef) {
      updateProgress((current) => ({
        ...current,
        questionStates: {
          ...current.questionStates,
          [viewModel.activeQuestion!.id]: {
            ...(current.questionStates[viewModel.activeQuestion!.id] ?? {}),
            opened: true,
            completed: true,
            skipped: false,
            solutionViewed:
              Boolean(
                current.questionStates[viewModel.activeQuestion!.id]
                  ?.solutionViewed,
              ) || current.mode === "REVIEW",
          },
        },
      }));
      setCompletionOpen(true);
      return;
    }

    void transitionToQuestion(nextRef, "forward", (current) => ({
      ...current,
      questionStates: {
        ...current.questionStates,
        [viewModel.activeQuestion!.id]: {
          ...(current.questionStates[viewModel.activeQuestion!.id] ?? {}),
          opened: true,
          completed: true,
          skipped: false,
          solutionViewed:
            Boolean(
              current.questionStates[viewModel.activeQuestion!.id]
                ?.solutionViewed,
            ) || current.mode === "REVIEW",
        },
      },
    }));
  }

  function handlePrimaryAction() {
    if (!viewModel.activeQuestion) {
      return;
    }

    if (
      !viewModel.solutionVisible &&
      canRevealStudyQuestionSolution(viewModel.activeQuestion)
    ) {
      revealCurrentSolution();
      return;
    }

    advanceFromCurrentQuestion();
  }

  const handleAdjacentQuestion = useEffectEvent((direction: -1 | 1) => {
    goToAdjacentQuestion(direction);
  });
  const handleRevealSolution = useEffectEvent(() => {
    if (!viewModel.solutionVisible && viewModel.canRevealSolution) {
      revealCurrentSolution();
    }
  });

  useEffect(() => {
    if (progress.mode !== "REVIEW" || !viewModel.activeQuestion) {
      return;
    }

    if (progress.questionStates[viewModel.activeQuestion.id]?.solutionViewed) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setProgress((current) => ({
        ...current,
        questionStates: {
          ...current.questionStates,
          [viewModel.activeQuestion!.id]: {
            ...(current.questionStates[viewModel.activeQuestion!.id] ?? {}),
            opened: true,
            solutionViewed: true,
          },
        },
        updatedAt: new Date().toISOString(),
      }));
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [progress.mode, progress.questionStates, viewModel.activeQuestion]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (viewModel.questionMotionLocked) {
        return;
      }

      if (isInteractiveElement(event.target)) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleAdjacentQuestion(1);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleAdjacentQuestion(-1);
      }

      if (event.key.toLowerCase() === "s" || event.code === "Space") {
        event.preventDefault();
        handleRevealSolution();
      }

      if (event.key === "Escape") {
        setShowNavigator(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [viewModel.questionMotionLocked]);

  useEffect(() => {
    return () => {
      clearQuestionMotionTimers();
    };
  }, []);

  return {
    session,
    loading: false,
    error,
    progress,
    completionOpen,
    showNavigator,
    activeExercise: viewModel.activeExercise,
    activeQuestion: viewModel.activeQuestion,
    progressCounts: viewModel.progressCounts,
    currentQuestionPosition: viewModel.currentQuestionPosition,
    progressPercent: viewModel.progressPercent,
    sessionMeta: viewModel.sessionMeta,
    activeExerciseTopics: viewModel.activeExerciseTopics,
    navigatorExercises: viewModel.navigatorExercises,
    questionMotionClass: viewModel.questionMotionClass,
    questionStatePresentation: viewModel.questionStatePresentation,
    activeQuestionState: viewModel.activeQuestionState,
    solutionVisible: viewModel.solutionVisible,
    questionMotionLocked: viewModel.questionMotionLocked,
    primaryActionLabel: viewModel.primaryActionLabel,
    openNavigator: () => setShowNavigator(true),
    closeNavigator: () => setShowNavigator(false),
    selectExercise: activateExercise,
    selectQuestion: activateQuestion,
    setMode: (mode: "SOLVE" | "REVIEW") =>
      updateProgress((current) => ({
        ...current,
        mode,
      })),
    toggleMode: () =>
      updateProgress((current) => ({
        ...current,
        mode: current.mode === "REVIEW" ? "SOLVE" : "REVIEW",
      })),
    goToFirstUnanswered,
    goToFirstSkipped,
    handlePrimaryAction,
    skipCurrentQuestion,
  };
}
