"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  API_BASE_URL,
  fetchJson,
  parseUpdateSessionProgressResponse,
  type StudyQuestionDiagnosis,
  type StudyQuestionReflection,
  type StudySessionResponse,
  type UpdateSessionProgressResponse,
} from "@/lib/study-api";
import {
  buildExerciseCheckpointSummary,
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
  buildCompletedQuestionState,
  buildDiagnosisQuestionState,
  buildHintViewedQuestionState,
  buildMethodViewedQuestionState,
  buildReflectionQuestionState,
  buildRevealSolutionQuestionState,
  buildSkippedQuestionState,
  isInteractiveElement,
  isQuestionTimingTrackingEnabled,
  resolveQuestionProgressPlan,
  resolveRemainingSessionTimeMs,
  resolveSimulationReviewAction,
  shouldAutoRevealReviewSolution,
  shouldStayOnCurrentQuestionAfterDiagnosis,
  shouldStayOnCurrentQuestionAfterReflection,
} from "@/lib/session-player-runtime";
import {
  buildEmptyStudyProgress,
  readLocalStudyProgress,
  type StudyProgressSnapshot,
  writeLocalStudyProgress,
} from "@/lib/study";
import { buildStudyExercisesFromSessionExercises } from "@/lib/study-surface";

export function useSessionPlayer(
  sessionId: string,
  initialSession?: StudySessionResponse,
) {
  const [session, setSession] = useState<StudySessionResponse | null>(
    initialSession ?? null,
  );
  const error = initialSession ? null : "تعذر تحميل الجلسة.";
  const [progress, setProgress] = useState<StudyProgressSnapshot>(
    buildEmptyStudyProgress(),
  );
  const [progressReady, setProgressReady] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [exerciseCheckpointExerciseId, setExerciseCheckpointExerciseId] =
    useState<string | null>(null);
  const [showNavigator, setShowNavigator] = useState(false);
  const [syncNonce, setSyncNonce] = useState(0);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const [questionMotion, setQuestionMotion] =
    useState<QuestionMotionState | null>(null);
  const questionMotionOutTimerRef = useRef<number | null>(null);
  const questionMotionInTimerRef = useRef<number | null>(null);
  const activeTimingQuestionIdRef = useRef<string | null>(null);
  const activeTimingStartedAtRef = useRef<number | null>(null);

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
  const timingTrackingEnabled = isQuestionTimingTrackingEnabled({
    timingEnabled: session?.timingEnabled,
    sessionFamily: session?.family,
    progressMode: progress.mode,
  });
  const exerciseCheckpointSummary = useMemo(() => {
    if (!exerciseCheckpointExerciseId) {
      return null;
    }

    const exercise = exercises.find((item) => item.id === exerciseCheckpointExerciseId);

    if (!exercise) {
      return null;
    }

    return buildExerciseCheckpointSummary({
      exercise,
      questionStates: progress.questionStates,
      timingEnabled: Boolean(session?.timingEnabled),
    });
  }, [
    exerciseCheckpointExerciseId,
    exercises,
    progress.questionStates,
    session?.timingEnabled,
  ]);
  const remainingTimeMs = resolveRemainingSessionTimeMs({
    sessionFamily: session?.family,
    deadlineAt: session?.deadlineAt,
    countdownNow,
  });
  const sessionFamily = session?.family;
  const sessionDeadlineAt = session?.deadlineAt;
  const sessionStatus = session?.status;

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
          `${API_BASE_URL}/study/sessions/${sessionId}/progress`,
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
    syncNonce,
    storageKey,
    viewModel.allQuestionIds,
  ]);

  useEffect(() => {
    function handleOnline() {
      setSyncNonce((current) => current + 1);
    }

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

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
    setExerciseCheckpointExerciseId(null);
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
      setExerciseCheckpointExerciseId(null);
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

  const flushActiveQuestionTime = useEffectEvent(
    (options?: { pause?: boolean }) => {
      if (!timingTrackingEnabled) {
        activeTimingStartedAtRef.current = null;
        return;
      }

      const questionId = activeTimingQuestionIdRef.current;
      const startedAt = activeTimingStartedAtRef.current;

      if (!questionId || startedAt === null) {
        return;
      }

      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);

      activeTimingStartedAtRef.current = options?.pause ? null : Date.now();

      if (elapsedSeconds <= 0) {
        return;
      }

      patchQuestionState(questionId, (current) => ({
        ...(current ?? {}),
        opened: true,
        timeSpentSeconds: (current?.timeSpentSeconds ?? 0) + elapsedSeconds,
      }));
    },
  );

  useEffect(() => {
    if (sessionFamily !== "SIMULATION" || !sessionDeadlineAt) {
      return;
    }

    const syncCountdownNow = () => {
      setCountdownNow(Date.now());
    };
    const timeoutId = window.setTimeout(syncCountdownNow, 0);
    const intervalId = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [sessionDeadlineAt, sessionFamily]);

  useEffect(() => {
    const simulationReviewAction = resolveSimulationReviewAction({
      sessionFamily,
      sessionStatus,
      deadlineAt: sessionDeadlineAt,
      progressMode: progress.mode,
      countdownNow,
    });

    if (simulationReviewAction === "none") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (simulationReviewAction === "enter_review") {
        updateProgress((current) => ({
          ...current,
          mode: "REVIEW",
        }));
        return;
      }

      if (simulationReviewAction === "expire_and_enter_review") {
        setSession((current) =>
          current
            ? {
                ...current,
                status: "EXPIRED",
              }
            : current,
        );
        updateProgress((current) => ({
          ...current,
          mode: "REVIEW",
        }));
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [countdownNow, progress.mode, sessionDeadlineAt, sessionFamily, sessionStatus]);

  useEffect(() => {
    if (!progressReady) {
      return;
    }

    activeTimingQuestionIdRef.current = viewModel.activeQuestion?.id ?? null;

    if (
      !timingTrackingEnabled ||
      !viewModel.activeQuestion?.id ||
      document.visibilityState !== "visible"
    ) {
      activeTimingStartedAtRef.current = null;
      return;
    }

    activeTimingStartedAtRef.current = Date.now();

    return () => {
      flushActiveQuestionTime({ pause: true });
    };
  }, [progressReady, timingTrackingEnabled, viewModel.activeQuestion?.id]);

  useEffect(() => {
    if (!timingTrackingEnabled) {
      return;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushActiveQuestionTime({ pause: true });
        return;
      }

      if (activeTimingQuestionIdRef.current) {
        activeTimingStartedAtRef.current = Date.now();
      }
    }

    function handleBeforeUnload() {
      flushActiveQuestionTime({ pause: true });
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      flushActiveQuestionTime();
    }, 15000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushActiveQuestionTime({ pause: true });
    };
  }, [timingTrackingEnabled]);

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

  function resolveCurrentQuestionAndProceed(input: {
    updateCurrentQuestion: (
      current: StudyProgressSnapshot["questionStates"][string] | undefined,
      snapshot: StudyProgressSnapshot,
    ) => StudyProgressSnapshot["questionStates"][string];
    switchToReviewOnEnd?: boolean;
  }) {
    if (
      !viewModel.activeQuestion ||
      !viewModel.activeExercise ||
      viewModel.questionMotionLocked
    ) {
      return;
    }

    const activeQuestionId = viewModel.activeQuestion.id;
    const activeExerciseId = viewModel.activeExercise.id;
    const nextRef = getAdjacentQuestionRef({
      direction: 1,
      activeQuestionId,
      allQuestionRefs: viewModel.allQuestionRefs,
    });
    const progressPlan = resolveQuestionProgressPlan({
      activeExerciseId,
      nextRef,
      firstRef: viewModel.allQuestionRefs[0] ?? null,
      sessionFamily: session?.family,
      progressMode: progress.mode,
      switchToReviewOnEnd: input.switchToReviewOnEnd,
    });

    setCompletionOpen(false);

    if (progressPlan.kind === "switch_to_review") {
      updateProgress((current) => {
        const nextState = input.updateCurrentQuestion(
          current.questionStates[activeQuestionId],
          current,
        );

        return {
          ...current,
          mode: "REVIEW",
          activeExerciseId: progressPlan.firstRef.exerciseId,
          activeQuestionId: progressPlan.firstRef.questionId,
          questionStates: {
            ...current.questionStates,
            [activeQuestionId]: nextState,
            [progressPlan.firstRef.questionId]: {
              ...current.questionStates[progressPlan.firstRef.questionId],
              opened: true,
            },
          },
        };
      });
      return;
    }

    if (progressPlan.kind === "completion") {
      updateProgress((current) => ({
        ...current,
        questionStates: {
          ...current.questionStates,
          [activeQuestionId]: input.updateCurrentQuestion(
            current.questionStates[activeQuestionId],
            current,
          ),
        },
      }));
      setCompletionOpen(true);
      return;
    }

    if (progressPlan.kind === "checkpoint") {
      updateProgress((current) => ({
        ...current,
        questionStates: {
          ...current.questionStates,
          [activeQuestionId]: input.updateCurrentQuestion(
            current.questionStates[activeQuestionId],
            current,
          ),
        },
      }));
      setExerciseCheckpointExerciseId(progressPlan.exerciseId);
      return;
    }

    void transitionToQuestion(progressPlan.nextRef, "forward", (current) => ({
      ...current,
      questionStates: {
        ...current.questionStates,
        [activeQuestionId]: input.updateCurrentQuestion(
          current.questionStates[activeQuestionId],
          current,
        ),
      },
    }));
  }

  function revealCurrentSolution() {
    if (!viewModel.activeQuestion) {
      return;
    }

    setCompletionOpen(false);
    patchQuestionState(
      viewModel.activeQuestion.id,
      buildRevealSolutionQuestionState,
    );
  }

  function showCurrentHint() {
    if (!viewModel.activeQuestion) {
      return;
    }

    setCompletionOpen(false);
    patchQuestionState(viewModel.activeQuestion.id, buildHintViewedQuestionState);
  }

  function showCurrentMethod() {
    if (!viewModel.activeQuestion) {
      return;
    }

    setCompletionOpen(false);
    patchQuestionState(viewModel.activeQuestion.id, buildMethodViewedQuestionState);
  }

  function setActiveQuestionReflection(
    reflection: StudyQuestionReflection,
  ) {
    if (!viewModel.activeQuestion) {
      return;
    }

    setCompletionOpen(false);
    const stayOnCurrentQuestion = shouldStayOnCurrentQuestionAfterReflection({
      reflection,
      progressMode: progress.mode,
      sessionFamily: session?.family,
    });

    if (stayOnCurrentQuestion) {
      patchQuestionState(viewModel.activeQuestion.id, (current) =>
        buildReflectionQuestionState({
          current,
          reflection,
          progressMode: progress.mode,
          complete: false,
        }),
      );
      return;
    }

    resolveCurrentQuestionAndProceed({
      updateCurrentQuestion: (current) =>
        buildReflectionQuestionState({
          current,
          reflection,
          progressMode: progress.mode,
          complete: true,
        }),
    });
  }

  function setActiveQuestionDiagnosis(diagnosis: StudyQuestionDiagnosis) {
    if (!viewModel.activeQuestion) {
      return;
    }

    setCompletionOpen(false);
    const stayOnCurrentQuestion = shouldStayOnCurrentQuestionAfterDiagnosis({
      progressMode: progress.mode,
      sessionFamily: session?.family,
    });

    if (stayOnCurrentQuestion) {
      patchQuestionState(viewModel.activeQuestion.id, (current) =>
        buildDiagnosisQuestionState({
          current,
          diagnosis,
          progressMode: progress.mode,
          complete: false,
        }),
      );
      return;
    }

    resolveCurrentQuestionAndProceed({
      updateCurrentQuestion: (current) =>
        buildDiagnosisQuestionState({
          current,
          diagnosis,
          progressMode: progress.mode,
          complete: true,
        }),
    });
  }

  function skipCurrentQuestion() {
    if (!viewModel.activeQuestion || viewModel.questionMotionLocked) {
      return;
    }

    resolveCurrentQuestionAndProceed({
      updateCurrentQuestion: buildSkippedQuestionState,
      switchToReviewOnEnd: viewModel.isActiveSimulation,
    });
  }

  function advanceFromCurrentQuestion() {
    if (!viewModel.activeQuestion || viewModel.questionMotionLocked) {
      return;
    }

    if (progress.mode === "REVIEW") {
      const nextRef = getAdjacentQuestionRef({
        direction: 1,
        activeQuestionId: viewModel.activeQuestion.id,
        allQuestionRefs: viewModel.allQuestionRefs,
      });

      setCompletionOpen(false);

      if (nextRef) {
        void transitionToQuestion(nextRef, "forward");
      } else {
        setCompletionOpen(true);
      }

      return;
    }

    resolveCurrentQuestionAndProceed({
      updateCurrentQuestion: (current) =>
        buildCompletedQuestionState({
          current,
          progressMode: progress.mode,
        }),
      switchToReviewOnEnd: viewModel.isActiveSimulation,
    });
  }

  function continueAfterExerciseCheckpoint() {
    if (!exerciseCheckpointExerciseId || !viewModel.activeQuestion) {
      return;
    }

    const nextRef = getAdjacentQuestionRef({
      direction: 1,
      activeQuestionId: viewModel.activeQuestion.id,
      allQuestionRefs: viewModel.allQuestionRefs,
    });

    setExerciseCheckpointExerciseId(null);

    if (!nextRef) {
      setCompletionOpen(true);
      return;
    }

    void transitionToQuestion(nextRef, "forward");
  }

  function handlePrimaryAction() {
    if (!viewModel.activeQuestion || viewModel.primaryActionDisabled) {
      return;
    }

    if (
      !viewModel.solutionVisible &&
      viewModel.canRevealSolution
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
    if (
      !shouldAutoRevealReviewSolution({
        progressMode: progress.mode,
        activeQuestionId: viewModel.activeQuestion?.id ?? null,
        questionStates: progress.questionStates,
      }) ||
      !viewModel.activeQuestion
    ) {
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
    exerciseCheckpointSummary,
    showNavigator,
    activeExercise: viewModel.activeExercise,
    activeQuestion: viewModel.activeQuestion,
    progressCounts: viewModel.progressCounts,
    currentQuestionPosition: viewModel.currentQuestionPosition,
    progressPercent: viewModel.progressPercent,
    remainingTimeMs,
    isActiveSimulation: viewModel.isActiveSimulation,
    canToggleMode: viewModel.canToggleMode,
    sessionMeta: viewModel.sessionMeta,
    activeExerciseTopics: viewModel.activeExerciseTopics,
    navigatorExercises: viewModel.navigatorExercises,
    questionMotionClass: viewModel.questionMotionClass,
    questionStatePresentation: viewModel.questionStatePresentation,
    activeQuestionState: viewModel.activeQuestionState,
    solutionVisible: viewModel.solutionVisible,
    canRevealSolution: viewModel.canRevealSolution,
    requiresReflection: viewModel.requiresReflection,
    questionMotionLocked: viewModel.questionMotionLocked,
    primaryActionLabel: viewModel.primaryActionLabel,
    primaryActionDisabled: viewModel.primaryActionDisabled,
    openNavigator: () => setShowNavigator(true),
    closeNavigator: () => setShowNavigator(false),
    selectExercise: activateExercise,
    selectQuestion: activateQuestion,
    setMode: (mode: "SOLVE" | "REVIEW") =>
      viewModel.canToggleMode
        ? updateProgress((current) => ({
            ...current,
            mode,
          }))
        : undefined,
    toggleMode: () =>
      viewModel.canToggleMode
        ? updateProgress((current) => ({
            ...current,
            mode: current.mode === "REVIEW" ? "SOLVE" : "REVIEW",
          }))
        : undefined,
    goToFirstUnanswered,
    goToFirstSkipped,
    handlePrimaryAction,
    continueAfterExerciseCheckpoint,
    closeExerciseCheckpoint: () => setExerciseCheckpointExerciseId(null),
    showQuestionHint: showCurrentHint,
    showQuestionMethod: showCurrentMethod,
    setQuestionReflection: setActiveQuestionReflection,
    setQuestionDiagnosis: setActiveQuestionDiagnosis,
    skipCurrentQuestion,
  };
}
