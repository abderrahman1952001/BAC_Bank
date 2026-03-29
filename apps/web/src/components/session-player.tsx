"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  EmptyState,
} from "@/components/study-shell";
import {
  SessionPlayerContextPane,
  SessionPlayerHeader,
  SessionPlayerNavigatorModal,
  SessionPlayerQuestionPane,
} from "@/components/session-player-sections";
import {
  API_BASE_URL,
  fetchJson,
  PracticeSessionResponse,
  UpdateSessionProgressResponse,
} from "@/lib/qbank";
import {
  buildActiveExerciseTopics,
  buildPrimaryActionLabel,
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
  type QuestionMotionDirection,
  resolveSessionPlayerProgress,
  type SessionQuestionRef,
} from "@/lib/session-player";
import {
  buildEmptyStudyProgress,
  countStudyProgress,
  readLocalStudyProgress,
  StudyProgressSnapshot,
  writeLocalStudyProgress,
} from "@/lib/study";
import {
  buildStudyExercisesFromSessionExercises,
  canRevealStudyQuestionSolution,
  StudyExerciseModel,
} from "@/lib/study-surface";
type QuestionMotionState = {
  phase: "out" | "in";
  direction: QuestionMotionDirection;
};

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, button, [contenteditable="true"]'),
  );
}

function TheaterModeSkeleton() {
  return (
    <div className="theater-mode theater-mode-loading" aria-hidden="true">
      <header className="theater-header">
        <div className="theater-header-left">
          <div
            className="study-skeleton"
            style={{ minHeight: 40, width: 110 }}
          />
        </div>
        <div className="theater-header-center">
          <div
            className="study-skeleton"
            style={{ minHeight: 40, width: 220 }}
          />
        </div>
        <div className="theater-header-right">
          <div
            className="study-skeleton"
            style={{ minHeight: 40, width: 100 }}
          />
        </div>
      </header>

      <div className="theater-body">
        <aside className="theater-context-pane">
          <div className="theater-skeleton-stack">
            <div className="study-skeleton block" />
            <div className="study-skeleton block tall" />
          </div>
        </aside>

        <main className="theater-question-pane">
          <div className="theater-skeleton-stack">
            <div className="study-skeleton block tall" />
            <div className="study-skeleton block" />
            <div
              className="study-skeleton"
              style={{ minHeight: 52, width: 180 }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export function SessionPlayer({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<PracticeSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const exercises = useMemo<StudyExerciseModel[]>(
    () => buildStudyExercisesFromSessionExercises(session?.exercises ?? []),
    [session?.exercises],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<PracticeSessionResponse>(
          `${API_BASE_URL}/qbank/sessions/${sessionId}`,
          {
            signal: controller.signal,
          },
        );

        setSession(payload);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== "AbortError") {
          setError("تعذر تحميل الجلسة.");
        }
      } finally {
        setLoading(false);
      }
    }

    void loadSession();

    return () => {
      controller.abort();
    };
  }, [sessionId]);

  const allQuestionRefs = useMemo<SessionQuestionRef[]>(
    () => buildSessionQuestionRefs(exercises),
    [exercises],
  );
  const allQuestionIds = useMemo(
    () => allQuestionRefs.map((item) => item.questionId),
    [allQuestionRefs],
  );

  useEffect(() => {
    if (!session || !exercises.length) {
      return;
    }

    setProgress(
      resolveSessionPlayerProgress({
        exercises,
        remoteProgress: session.progress,
        localProgress: readLocalStudyProgress(storageKey),
      }),
    );
    setProgressReady(true);
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
              buildSessionProgressUpdateRequest(progress, allQuestionIds),
            ),
          },
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
  }, [allQuestionIds, progress, progressReady, session, sessionId, storageKey]);

  const activeExercise = useMemo(() => {
    return (
      exercises.find((exercise) => exercise.id === progress.activeExerciseId) ??
      exercises[0] ??
      null
    );
  }, [exercises, progress.activeExerciseId]);

  const activeQuestion = useMemo(() => {
    if (!activeExercise) {
      return null;
    }

    return (
      activeExercise.questions.find(
        (question) => question.id === progress.activeQuestionId,
      ) ??
      activeExercise.questions[0] ??
      null
    );
  }, [activeExercise, progress.activeQuestionId]);

  const progressCounts = useMemo(
    () => countStudyProgress(allQuestionIds, progress.questionStates),
    [allQuestionIds, progress.questionStates],
  );
  const currentQuestionPosition = useMemo(() => {
    if (!activeQuestion) {
      return 0;
    }

    return (
      allQuestionIds.findIndex(
        (questionId) => questionId === activeQuestion.id,
      ) + 1
    );
  }, [activeQuestion, allQuestionIds]);
  const activeQuestionState = activeQuestion
    ? progress.questionStates[activeQuestion.id]
    : undefined;
  const solutionVisible =
    Boolean(activeQuestionState?.solutionViewed) || progress.mode === "REVIEW";
  const canRevealSolution = canRevealStudyQuestionSolution(activeQuestion);
  const isLastQuestion =
    progressCounts.totalCount > 0 &&
    currentQuestionPosition === progressCounts.totalCount;
  const progressPercent =
    (currentQuestionPosition / Math.max(progressCounts.totalCount, 1)) * 100;

  const activeExerciseTopics = useMemo(
    () => buildActiveExerciseTopics(activeExercise),
    [activeExercise],
  );

  const sessionMeta = useMemo(() => buildSessionMeta(session), [session]);

  const sessionGoalSummary = useMemo(
    () => buildSessionGoalSummary(session),
    [session],
  );

  const navigatorExercises = useMemo(
    () =>
      buildSessionNavigatorExercises({
        exercises,
        questionStates: progress.questionStates,
        activeQuestionId: activeQuestion?.id ?? null,
      }),
    [activeQuestion?.id, exercises, progress.questionStates],
  );

  const questionStatePresentation = buildQuestionStatePresentation({
    state: activeQuestionState,
    solutionVisible,
  });
  const primaryActionLabel = buildPrimaryActionLabel({
    solutionVisible,
    canRevealSolution,
    isLastQuestion,
  });
  const questionMotionClass = questionMotion
    ? questionMotion.phase === "out"
      ? questionMotion.direction === "forward"
        ? "is-leaving-forward"
        : "is-leaving-backward"
      : questionMotion.direction === "forward"
        ? "is-entering-forward"
        : "is-entering-backward"
    : "";
  const questionMotionLocked = Boolean(questionMotion);

  function updateProgress(
    updater: (current: StudyProgressSnapshot) => StudyProgressSnapshot,
  ) {
    setProgress((current) => {
      const next = updater(current);
      return {
        ...next,
        updatedAt: new Date().toISOString(),
      };
    });
  }

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

  function transitionToQuestion(
    nextRef: SessionQuestionRef,
    direction: QuestionMotionDirection,
    updater?: (current: StudyProgressSnapshot) => StudyProgressSnapshot,
  ) {
    if (questionMotionLocked) {
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
    if (questionMotionLocked) {
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
        allQuestionRefs,
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
      activeQuestionId: activeQuestion?.id ?? null,
      allQuestionRefs,
    });

    if (!nextRef) {
      return false;
    }

    activateQuestion(nextRef.exerciseId, nextRef.questionId);
    return true;
  }

  function goToFirstUnanswered() {
    const questionRef = findFirstUnansweredQuestionRef({
      allQuestionIds,
      questionStates: progress.questionStates,
      allQuestionRefs,
    });

    if (!questionRef) {
      return;
    }

    activateQuestion(questionRef.exerciseId, questionRef.questionId);
  }

  function goToFirstSkipped() {
    const questionRef = findFirstSkippedQuestionRef({
      allQuestionIds,
      questionStates: progress.questionStates,
      allQuestionRefs,
    });

    if (!questionRef) {
      return;
    }

    activateQuestion(questionRef.exerciseId, questionRef.questionId);
  }

  function revealCurrentSolution() {
    if (!activeQuestion) {
      return;
    }

    setCompletionOpen(false);
    patchQuestionState(activeQuestion.id, (current) => ({
      ...(current ?? {}),
      opened: true,
      skipped: false,
      solutionViewed: true,
    }));
  }

  function skipCurrentQuestion() {
    if (!activeQuestion || questionMotionLocked) {
      return;
    }

    const nextRef = getAdjacentQuestionRef({
      direction: 1,
      activeQuestionId: activeQuestion.id,
      allQuestionRefs,
    });

    setCompletionOpen(false);

    if (!nextRef) {
      updateProgress((current) => ({
        ...current,
        questionStates: {
          ...current.questionStates,
          [activeQuestion.id]: {
            ...(current.questionStates[activeQuestion.id] ?? {}),
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
        [activeQuestion.id]: {
          ...(current.questionStates[activeQuestion.id] ?? {}),
          opened: true,
          completed: false,
          skipped: true,
        },
      },
    }));
  }

  function advanceFromCurrentQuestion() {
    if (!activeQuestion || questionMotionLocked) {
      return;
    }

    const nextRef = getAdjacentQuestionRef({
      direction: 1,
      activeQuestionId: activeQuestion.id,
      allQuestionRefs,
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
          [activeQuestion.id]: {
            ...(current.questionStates[activeQuestion.id] ?? {}),
            opened: true,
            completed: true,
            skipped: false,
            solutionViewed:
              Boolean(
                current.questionStates[activeQuestion.id]?.solutionViewed,
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
        [activeQuestion.id]: {
          ...(current.questionStates[activeQuestion.id] ?? {}),
          opened: true,
          completed: true,
          skipped: false,
          solutionViewed:
            Boolean(
              current.questionStates[activeQuestion.id]?.solutionViewed,
            ) || current.mode === "REVIEW",
        },
      },
    }));
  }

  function handlePrimaryAction() {
    if (!activeQuestion) {
      return;
    }

    if (!solutionVisible && canRevealSolution) {
      revealCurrentSolution();
      return;
    }

    advanceFromCurrentQuestion();
  }

  const handleAdjacentQuestion = useEffectEvent((direction: -1 | 1) => {
    goToAdjacentQuestion(direction);
  });

  useEffect(() => {
    if (progress.mode !== "REVIEW" || !activeQuestion) {
      return;
    }

    if (progress.questionStates[activeQuestion.id]?.solutionViewed) {
      return;
    }

    setProgress((current) => ({
      ...current,
      questionStates: {
        ...current.questionStates,
        [activeQuestion.id]: {
          ...(current.questionStates[activeQuestion.id] ?? {}),
          opened: true,
          solutionViewed: true,
        },
      },
      updatedAt: new Date().toISOString(),
    }));
  }, [activeQuestion, progress.mode, progress.questionStates]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (questionMotionLocked) {
        return;
      }

      if (isInteractiveElement(event.target)) {
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        handleAdjacentQuestion(1);
      }

      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        handleAdjacentQuestion(-1);
      }

      if (event.key === "Escape") {
        setShowNavigator(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [questionMotionLocked]);

  useEffect(() => {
    return () => {
      clearQuestionMotionTimers();
    };
  }, []);

  if (loading) {
    return <TheaterModeSkeleton />;
  }

  if (!session || !activeExercise || !activeQuestion) {
    return (
      <div className="theater-mode theater-mode-empty">
        <header className="theater-header">
          <div className="theater-header-left">
            <Link href="/app" className="btn-ghost">
              إغلاق
            </Link>
          </div>
          <div className="theater-header-center" />
          <div className="theater-header-right" />
        </header>

        <div className="theater-empty-shell">
          <EmptyState
            title="تعذر تحميل الجلسة"
            description={error || "لا توجد بيانات لهذه الجلسة"}
            action={
              <Link href="/app" className="btn-primary">
                العودة للرئيسية
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="theater-mode">
      <SessionPlayerHeader
        currentQuestionPosition={currentQuestionPosition}
        totalQuestionCount={progressCounts.totalCount}
        progressPercent={progressPercent}
        onOpenNavigator={() => setShowNavigator(true)}
      />

      <div className="theater-body">
        <SessionPlayerContextPane
          session={session}
          sessionMeta={sessionMeta}
          sessionGoalSummary={sessionGoalSummary}
          activeExerciseTopics={activeExerciseTopics}
          activeExercise={activeExercise}
        />

        <SessionPlayerQuestionPane
          activeQuestion={activeQuestion}
          activeExercise={activeExercise}
          questionMotionClass={questionMotionClass}
          questionStatePresentation={questionStatePresentation}
          currentQuestionPosition={currentQuestionPosition}
          progressCounts={progressCounts}
          progressMode={progress.mode}
          activeQuestionState={activeQuestionState}
          solutionVisible={solutionVisible}
          questionMotionLocked={questionMotionLocked}
          primaryActionLabel={primaryActionLabel}
          completionOpen={completionOpen}
          onPrimaryAction={handlePrimaryAction}
          onSkipQuestion={skipCurrentQuestion}
          onGoToFirstUnanswered={goToFirstUnanswered}
          onGoToFirstSkipped={goToFirstSkipped}
          onToggleMode={() =>
            updateProgress((current) => ({
              ...current,
              mode: current.mode === "REVIEW" ? "SOLVE" : "REVIEW",
            }))
          }
        />
      </div>

      {showNavigator ? (
        <SessionPlayerNavigatorModal
          sessionTitle={session.title}
          progressMode={progress.mode}
          progressCounts={progressCounts}
          navigatorExercises={navigatorExercises}
          activeExerciseId={activeExercise.id}
          activeQuestionId={activeQuestion.id}
          onClose={() => setShowNavigator(false)}
          onSetMode={(mode) =>
            updateProgress((current) => ({
              ...current,
              mode,
            }))
          }
          onGoToFirstUnanswered={goToFirstUnanswered}
          onGoToFirstSkipped={goToFirstSkipped}
          onSelectExercise={activateExercise}
          onSelectQuestion={activateQuestion}
        />
      ) : null}
    </div>
  );
}
