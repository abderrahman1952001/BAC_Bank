"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useAuthSession } from "@/components/auth-provider";
import { StudentNavbar } from "@/components/student-navbar";
import {
  EmptyState,
  StudyHeader,
  StudyShell,
} from "@/components/study-shell";
import {
  SujetViewerFocusContextPane,
  SujetViewerFocusHeader,
  SujetViewerFocusNavigatorModal,
  SujetViewerFocusQuestionPane,
  SujetViewerHeaderActions,
  SujetViewerHeaderProgress,
  SujetViewerStandardLayout,
} from "@/components/sujet-viewer-sections";
import {
  AdminIngestionJobResponse,
  fetchAdminJson,
  parseAdminIngestionJobResponse,
} from "@/lib/admin";
import {
  API_BASE_URL,
  ExamResponse,
  fetchJson,
  formatSessionType,
  parseUpsertExamActivityResponse,
  UpsertExamActivityRequest,
  UpsertExamActivityResponse,
} from "@/lib/qbank";
import {
  buildEmptyStudyProgress,
  countStudyProgress,
  describeStudyQuestionState,
  getQuestionVisualState,
  readLocalStudyProgress,
  StudyProgressSnapshot,
  writeLocalStudyProgress,
} from "@/lib/study";
import {
  buildStudyExercisesFromExam,
  canRevealStudyQuestionSolution,
  getStudyQuestionTopics,
  StudyExerciseModel,
} from "@/lib/study-surface";

type QuestionRef = {
  exerciseId: string;
  questionId: string;
};

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, button, [contenteditable="true"]'),
  );
}

export function SujetViewer({
  streamCode,
  subjectCode,
  year,
  examId,
  sujetNumber,
  initialExercise,
  initialQuestion,
  initialExam,
}: {
  streamCode: string;
  subjectCode: string;
  year: string;
  examId: string;
  sujetNumber: string;
  initialExercise?: string;
  initialQuestion?: string;
  initialExam?: ExamResponse;
}) {
  const router = useRouter();
  const [refreshingExam, startRefreshingExam] = useTransition();
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [startingRevision, setStartingRevision] = useState(false);
  const [progress, setProgress] = useState<StudyProgressSnapshot>(
    buildEmptyStudyProgress(),
  );
  const [progressReady, setProgressReady] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [collapsedQuestionSolutions, setCollapsedQuestionSolutions] = useState<
    Record<string, boolean>
  >({});
  const { user } = useAuthSession();
  const lastSyncedExamActivityPayload = useRef<string | null>(null);

  const decodedExamId = decodeURIComponent(examId);
  const parsedSujetNumber = Number(sujetNumber);
  const storageKey = `bac-bank:sujet:${decodedExamId}:${parsedSujetNumber}`;
  const isAdmin = user?.role === "ADMIN";
  const exam = initialExam ?? null;
  const hasValidSujetNumber = Number.isInteger(parsedSujetNumber);

  const exercises = useMemo<StudyExerciseModel[]>(
    () => buildStudyExercisesFromExam(exam),
    [exam],
  );

  const allQuestionRefs = useMemo<QuestionRef[]>(
    () =>
      exercises.flatMap((exercise) =>
        exercise.questions.map((question) => ({
          exerciseId: exercise.id,
          questionId: question.id,
        })),
      ),
    [exercises],
  );
  const allQuestionIds = useMemo(
    () => allQuestionRefs.map((item) => item.questionId),
    [allQuestionRefs],
  );
  const questionLookup = useMemo(
    () =>
      new Map(
        exercises.flatMap((exercise) =>
          exercise.questions.map(
            (question) =>
              [
                question.id,
                {
                  exerciseId: exercise.id,
                  question,
                },
              ] as const,
          ),
        ),
      ),
    [exercises],
  );

  useEffect(() => {
    if (!exercises.length) {
      return;
    }

    const localProgress =
      readLocalStudyProgress(storageKey) ?? buildEmptyStudyProgress();

    const queryExercise =
      initialExercise && /^\d+$/.test(initialExercise)
        ? exercises.find(
            (exercise) => exercise.orderIndex === Number(initialExercise),
          )
        : exercises.find((exercise) => exercise.id === initialExercise);
    const fallbackExercise =
      queryExercise ??
      exercises.find(
        (exercise) => exercise.id === localProgress.activeExerciseId,
      ) ??
      exercises[0];

    const queryQuestion =
      initialQuestion && /^\d+$/.test(initialQuestion)
        ? fallbackExercise.questions.find(
            (question) => question.orderIndex === Number(initialQuestion),
          )
        : fallbackExercise.questions.find(
            (question) => question.id === initialQuestion,
          );
    const fallbackQuestion =
      queryQuestion ??
      fallbackExercise.questions.find(
        (question) => question.id === localProgress.activeQuestionId,
      ) ??
      fallbackExercise.questions[0];

    const nextProgress: StudyProgressSnapshot = {
      ...localProgress,
      activeExerciseId: fallbackExercise.id,
      activeQuestionId: fallbackQuestion?.id ?? null,
      questionStates: {
        ...localProgress.questionStates,
        ...(fallbackQuestion
          ? {
              [fallbackQuestion.id]: {
                ...localProgress.questionStates[fallbackQuestion.id],
                opened: true,
              },
            }
          : {}),
      },
      updatedAt: localProgress.updatedAt || new Date().toISOString(),
    };

    setProgress(nextProgress);
    setProgressReady(true);
  }, [exercises, initialExercise, initialQuestion, storageKey]);

  useEffect(() => {
    if (!progressReady) {
      return;
    }

    writeLocalStudyProgress(storageKey, progress);
  }, [progress, progressReady, storageKey]);

  const activeExercise = useMemo(
    () =>
      exercises.find((exercise) => exercise.id === progress.activeExerciseId) ??
      exercises[0] ??
      null,
    [exercises, progress.activeExerciseId],
  );
  const activeQuestion = useMemo(
    () =>
      activeExercise?.questions.find(
        (question) => question.id === progress.activeQuestionId,
      ) ??
      activeExercise?.questions[0] ??
      null,
    [activeExercise, progress.activeQuestionId],
  );
  const activeQuestionId = activeQuestion?.id ?? null;

  const progressCounts = useMemo(
    () => countStudyProgress(allQuestionIds, progress.questionStates),
    [allQuestionIds, progress.questionStates],
  );
  const activitySujetNumber = parsedSujetNumber === 2 ? 2 : 1;
  const activeExerciseIndex = useMemo(
    () => exercises.findIndex((exercise) => exercise.id === activeExercise?.id),
    [activeExercise?.id, exercises],
  );
  const currentQuestionPosition = useMemo(() => {
    if (!activeQuestionId) {
      return 0;
    }

    return (
      allQuestionIds.findIndex((questionId) => questionId === activeQuestionId) + 1
    );
  }, [activeQuestionId, allQuestionIds]);
  const activeQuestionState = activeQuestionId
    ? progress.questionStates[activeQuestionId]
    : undefined;
  const activeQuestionStateDescriptor = describeStudyQuestionState(
    activeQuestionState,
    false,
  );
  const progressPercent =
    (currentQuestionPosition / Math.max(progressCounts.totalCount, 1)) * 100;
  const solutionVisible =
    Boolean(activeQuestionState?.solutionViewed) || progress.mode === "REVIEW";
  const canRevealSolution = canRevealStudyQuestionSolution(activeQuestion);
  const activeExerciseTopics = useMemo(() => {
    if (!activeExercise) {
      return [];
    }

    return Array.from(
      new Map(
        activeExercise.questions
          .flatMap((question) => getStudyQuestionTopics(question))
          .map((topic) => [topic.code, topic]),
      ).values(),
    );
  }, [activeExercise]);

  const navigatorExercises = useMemo(
    () =>
      exercises.map((exercise) => {
        const exerciseQuestionIds = exercise.questions.map(
          (question) => question.id,
        );
        const counts = countStudyProgress(
          exerciseQuestionIds,
          progress.questionStates,
        );

        return {
          id: exercise.id,
          title: `التمرين ${exercise.displayOrder}`,
          subtitle: exercise.title ?? undefined,
          badge: `${exercise.questions.length} س`,
          progressLabel: `${counts.completedCount}/${counts.totalCount} منجزة`,
          questions: exercise.questions.map((question) => ({
            id: question.id,
            label: question.label,
            shortLabel: question.label,
            status: getQuestionVisualState(
              progress.questionStates[question.id],
              question.id === activeQuestionId,
            ),
            solutionViewed:
              progress.questionStates[question.id]?.solutionViewed,
          })),
        };
      }),
    [activeQuestionId, exercises, progress.questionStates],
  );

  useEffect(() => {
    if (!user || !exam || !progressReady) {
      return;
    }

    const payload: UpsertExamActivityRequest = {
      sujetNumber: activitySujetNumber,
      totalQuestionCount: progressCounts.totalCount,
      completedQuestionCount: progressCounts.completedCount,
      openedQuestionCount: progressCounts.openedCount,
      solutionViewedCount: progressCounts.solutionViewedCount,
    };
    const payloadBody = JSON.stringify(payload);
    const payloadSignature = JSON.stringify({
      examId: decodedExamId,
      ...payload,
    });

    if (lastSyncedExamActivityPayload.current === payloadSignature) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void fetchJson<UpsertExamActivityResponse>(
        `${API_BASE_URL}/qbank/exams/${decodedExamId}/activity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: payloadBody,
          signal: controller.signal,
        },
        parseUpsertExamActivityResponse,
      )
        .then(() => {
          lastSyncedExamActivityPayload.current = payloadSignature;
        })
        .catch(() => {
          /* keep local study flow silent if activity sync fails */
        });
    }, 420);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    activitySujetNumber,
    decodedExamId,
    exam,
    progressCounts.completedCount,
    progressCounts.openedCount,
    progressCounts.solutionViewedCount,
    progressCounts.totalCount,
    progressReady,
    user,
  ]);

  function updateProgress(
    updater: (current: StudyProgressSnapshot) => StudyProgressSnapshot,
  ) {
    setProgress((current) => ({
      ...updater(current),
      updatedAt: new Date().toISOString(),
    }));
  }

  function setProgressMode(mode: StudyProgressSnapshot["mode"]) {
    updateProgress((current) => ({
      ...current,
      mode,
    }));
  }

  function exitFocusMode() {
    setFocusMode(false);
    setShowNavigator(false);
  }

  function activateQuestion(exerciseId: string, questionId: string) {
    setShowNavigator(false);
    updateProgress((current) => ({
      ...current,
      activeExerciseId: exerciseId,
      activeQuestionId: questionId,
      questionStates: {
        ...current.questionStates,
        [questionId]: {
          ...current.questionStates[questionId],
          opened: true,
        },
      },
    }));
  }

  function activateExercise(exerciseId: string) {
    const exercise = exercises.find((item) => item.id === exerciseId);
    const fallbackQuestion = exercise?.questions[0];

    if (!exercise || !fallbackQuestion) {
      return;
    }

    activateQuestion(exercise.id, fallbackQuestion.id);
  }

  function patchQuestionState(
    questionId: string,
    patch: (
      current: StudyProgressSnapshot["questionStates"][string] | undefined,
    ) => {
      opened?: boolean;
      completed?: boolean;
      solutionViewed?: boolean;
    },
  ) {
    updateProgress((current) => ({
      ...current,
      questionStates: {
        ...current.questionStates,
        [questionId]: {
          ...current.questionStates[questionId],
          ...patch(current.questionStates[questionId]),
        },
      },
    }));
  }

  function clearCollapsedQuestionSolution(questionId: string) {
    setCollapsedQuestionSolutions((current) => {
      if (!current[questionId]) {
        return current;
      }

      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }

  function toggleQuestionComplete(exerciseId: string, questionId: string) {
    activateQuestion(exerciseId, questionId);
    patchQuestionState(questionId, (current) => ({
      ...(current ?? {}),
      opened: true,
      completed: !current?.completed,
    }));
  }

  function toggleQuestionSolution(exerciseId: string, questionId: string) {
    const questionEntry = questionLookup.get(questionId);

    if (!questionEntry || !canRevealStudyQuestionSolution(questionEntry.question)) {
      return;
    }

    activateQuestion(exerciseId, questionId);

    if (!progress.questionStates[questionId]?.solutionViewed) {
      patchQuestionState(questionId, (current) => ({
        ...(current ?? {}),
        opened: true,
        solutionViewed: true,
      }));
      clearCollapsedQuestionSolution(questionId);
      return;
    }

    if (progress.mode === "REVIEW") {
      return;
    }

    setCollapsedQuestionSolutions((current) => {
      if (current[questionId]) {
        const next = { ...current };
        delete next[questionId];
        return next;
      }

      return {
        ...current,
        [questionId]: true,
      };
    });
  }

  const isQuestionSolutionVisible = useCallback(
    (questionId: string) => {
      if (progress.mode === "REVIEW") {
        return true;
      }

      if (!progress.questionStates[questionId]?.solutionViewed) {
        return false;
      }

      return !collapsedQuestionSolutions[questionId];
    },
    [collapsedQuestionSolutions, progress.mode, progress.questionStates],
  );

  function goToAdjacentQuestion(direction: -1 | 1) {
    if (!activeQuestion) {
      return;
    }

    const currentIndex = allQuestionRefs.findIndex(
      (item) => item.questionId === activeQuestion.id,
    );
    const nextRef = allQuestionRefs[currentIndex + direction];

    if (!nextRef) {
      return;
    }

    activateQuestion(nextRef.exerciseId, nextRef.questionId);
  }

  const handleAdjacentQuestion = useEffectEvent((direction: -1 | 1) => {
    goToAdjacentQuestion(direction);
  });
  const handleRevealSolution = useEffectEvent(() => {
    if (activeQuestion && canRevealSolution && !solutionVisible) {
      patchQuestionState(activeQuestion.id, (current) => ({
        ...(current ?? {}),
        opened: true,
        solutionViewed: true,
      }));
    }
  });

  useEffect(() => {
    if (focusMode || !activeExercise) {
      return;
    }

    const unopenedQuestions = activeExercise.questions.filter(
      (question) => !progress.questionStates[question.id]?.opened,
    );

    if (!unopenedQuestions.length) {
      return;
    }

    setProgress((current) => ({
      ...current,
      questionStates: {
        ...current.questionStates,
        ...Object.fromEntries(
          unopenedQuestions.map((question) => [
            question.id,
            {
              ...(current.questionStates[question.id] ?? {}),
              opened: true,
            },
          ]),
        ),
      },
      updatedAt: new Date().toISOString(),
    }));
  }, [activeExercise, focusMode, progress.questionStates]);

  useEffect(() => {
    if (progress.mode !== "REVIEW") {
      return;
    }

    const visibleQuestions = focusMode
      ? activeQuestion
        ? [activeQuestion]
        : []
      : activeExercise?.questions ?? [];
    const hiddenSolutions = visibleQuestions.filter(
      (question) => !progress.questionStates[question.id]?.solutionViewed,
    );

    if (!hiddenSolutions.length) {
      return;
    }

    setProgress((current) => ({
      ...current,
      questionStates: {
        ...current.questionStates,
        ...Object.fromEntries(
          hiddenSolutions.map((question) => [
            question.id,
            {
              ...(current.questionStates[question.id] ?? {}),
              opened: true,
              solutionViewed: true,
            },
          ]),
        ),
      },
      updatedAt: new Date().toISOString(),
    }));
  }, [activeExercise, activeQuestion, focusMode, progress.mode, progress.questionStates]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
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
  }, []);

  useEffect(() => {
    if (focusMode || !activeQuestionId) {
      return;
    }

    const element = document.getElementById(`study-question-${activeQuestionId}`);

    if (!element) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    const isInView =
      bounds.top >= 120 && bounds.bottom <= window.innerHeight - 96;

    if (isInView) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [activeQuestionId, focusMode]);

  async function startRevisionDraft() {
    const paperId = exam?.paperId ?? null;

    if (!paperId || startingRevision) {
      return;
    }

    setStartingRevision(true);
    setRevisionError(null);

    try {
      const payload = await fetchAdminJson<AdminIngestionJobResponse>(
        `/ingestion/papers/${paperId}/revision`,
        {
          method: "POST",
        },
        parseAdminIngestionJobResponse,
      );

      router.push(`/admin/drafts/${payload.job.id}`);
    } catch (startError) {
      setRevisionError(
        startError instanceof Error
          ? startError.message
          : "Failed to open a revision draft for this paper.",
      );
    } finally {
      setStartingRevision(false);
    }
  }

  const backToBrowseHref = `/student/browse?stream=${encodeURIComponent(
    decodeURIComponent(streamCode),
  )}&subject=${encodeURIComponent(decodeURIComponent(subjectCode))}&year=${encodeURIComponent(year)}&examId=${encodeURIComponent(decodedExamId)}&sujet=${encodeURIComponent(
    sujetNumber,
  )}`;
  const revisionDraftAction = isAdmin && exam?.paperId ? (
    <button
      type="button"
      className="btn-secondary"
      onClick={() => {
        void startRevisionDraft();
      }}
      disabled={startingRevision}
    >
      {startingRevision ? "Opening Revision Draft..." : "Open Revision Draft"}
    </button>
  ) : null;
  const standardExerciseHeaderActions = activeExercise ? (
    <button
      type="button"
      className="btn-secondary"
      onClick={() => setFocusMode(true)}
    >
      وضع التركيز
    </button>
  ) : null;
  const focusQuestionActionButtons =
    activeExercise && activeQuestion ? (
      <>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => goToAdjacentQuestion(-1)}
          disabled={currentQuestionPosition <= 1}
        >
          السابق
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => goToAdjacentQuestion(1)}
          disabled={currentQuestionPosition >= progressCounts.totalCount}
        >
          التالي
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => toggleQuestionComplete(activeExercise.id, activeQuestion.id)}
        >
          {activeQuestionState?.completed ? "إلغاء الإنجاز" : "تم"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            patchQuestionState(activeQuestion.id, (current) => ({
              ...(current ?? {}),
              opened: true,
              solutionViewed: true,
            }))
          }
          disabled={!canRevealSolution}
        >
          الحل
        </button>
      </>
    ) : null;

  if (focusMode && exam && activeExercise && activeQuestion) {
    return (
      <>
        <div className="theater-mode">
          <SujetViewerFocusHeader
            backToBrowseHref={backToBrowseHref}
            currentQuestionPosition={currentQuestionPosition}
            totalQuestionCount={progressCounts.totalCount}
            progressPercent={progressPercent}
            onExitFocusMode={exitFocusMode}
            onOpenNavigator={() => setShowNavigator(true)}
          />

          <div className="theater-body">
            <SujetViewerFocusContextPane
              exam={exam}
              sujetNumber={sujetNumber}
              progressMode={progress.mode}
              totalQuestionCount={progressCounts.totalCount}
              activeExerciseTopics={activeExerciseTopics}
              activeExercise={activeExercise}
              exerciseAction={revisionDraftAction}
              onSetMode={setProgressMode}
            />

            <SujetViewerFocusQuestionPane
              activeExercise={activeExercise}
              activeQuestion={activeQuestion}
              activeQuestionStateDescriptor={activeQuestionStateDescriptor}
              activeQuestionState={activeQuestionState}
              progressMode={progress.mode}
              currentQuestionPosition={currentQuestionPosition}
              totalQuestionCount={progressCounts.totalCount}
              solutionVisible={solutionVisible}
              questionActions={focusQuestionActionButtons}
            />
          </div>

          {showNavigator ? (
            <SujetViewerFocusNavigatorModal
              exam={exam}
              sujetNumber={sujetNumber}
              progressMode={progress.mode}
              navigatorExercises={navigatorExercises}
              activeExerciseId={activeExercise.id}
              activeQuestionId={activeQuestion.id}
              onClose={() => setShowNavigator(false)}
              onExitFocusMode={exitFocusMode}
              onSetMode={setProgressMode}
              onSelectExercise={activateExercise}
              onSelectQuestion={activateQuestion}
            />
          ) : null}

          {revisionError ? <p className="error-text">{revisionError}</p> : null}
        </div>
      </>
    );
  }

  return (
    <StudyShell>
      <StudentNavbar />

      {exam && activeExercise && activeQuestion ? (
        <section className="student-main-frame student-main-frame-sujet">
          <StudyHeader
            eyebrow={`بكالوريا ${exam.year} · ${exam.stream.name} · ${formatSessionType(
              exam.sessionType,
            )}`}
            title={`${exam.subject.name} - ${
              exam.selectedSujetLabel ?? `الموضوع ${sujetNumber}`
            }`}
            actions={
              <SujetViewerHeaderActions
                backToBrowseHref={backToBrowseHref}
                progressMode={progress.mode}
                onSetMode={setProgressMode}
                adminAction={revisionDraftAction}
              />
            }
            progress={
              <SujetViewerHeaderProgress
                progressCounts={progressCounts}
                currentQuestionPosition={currentQuestionPosition}
              />
            }
          />

          <SujetViewerStandardLayout
            exam={exam}
            exercises={exercises}
            activeExerciseIndex={activeExerciseIndex}
            activeExercise={activeExercise}
            activeQuestionId={activeQuestionId}
            progressMode={progress.mode}
            questionStates={progress.questionStates}
            navigatorExercises={navigatorExercises}
            exerciseHeaderActions={standardExerciseHeaderActions}
            onSelectExercise={activateExercise}
            onSelectQuestion={activateQuestion}
            onToggleQuestionComplete={toggleQuestionComplete}
            onToggleQuestionSolution={toggleQuestionSolution}
            isQuestionSolutionVisible={isQuestionSolutionVisible}
          />

          {revisionError ? <p className="error-text">{revisionError}</p> : null}
        </section>
      ) : hasValidSujetNumber ? (
        <EmptyState
          title="تعذر تحميل الموضوع"
          description={
            hasValidSujetNumber ? "أعد المحاولة." : "اختر موضوعاً آخر."
          }
          action={
            <div className="study-action-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  startRefreshingExam(() => {
                    router.refresh();
                  });
                }}
                disabled={refreshingExam}
              >
                {refreshingExam ? "جارٍ التحديث..." : "إعادة المحاولة"}
              </button>
              <Link href={backToBrowseHref} className="btn-secondary">
                العودة للتصفح
              </Link>
            </div>
          }
        />
      ) : (
        <EmptyState
          title="لا توجد بيانات لهذا الموضوع"
          description="اختر موضوعاً آخر."
        />
      )}
    </StudyShell>
  );
}
