"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { useAuthSession } from "@/components/auth-provider";
import { AppNavbar } from "@/components/app-navbar";
import {
  InlineEditTarget,
  SujetInlineEditor,
} from "@/components/sujet-inline-editor";
import {
  EmptyState,
  StudyHeader,
  StudyScreenSkeleton,
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
  API_BASE_URL,
  ExamResponse,
  fetchJson,
  formatSessionType,
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
}: {
  streamCode: string;
  subjectCode: string;
  year: string;
  examId: string;
  sujetNumber: string;
  initialExercise?: string;
  initialQuestion?: string;
}) {
  const [exam, setExam] = useState<ExamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<StudyProgressSnapshot>(
    buildEmptyStudyProgress(),
  );
  const [progressReady, setProgressReady] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [inlineEditTarget, setInlineEditTarget] =
    useState<InlineEditTarget | null>(null);
  const { user } = useAuthSession();

  const decodedExamId = decodeURIComponent(examId);
  const parsedSujetNumber = Number(sujetNumber);
  const storageKey = `bac-bank:sujet:${decodedExamId}:${parsedSujetNumber}`;
  const isAdmin = user?.role === "ADMIN";

  const loadExam = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchJson<ExamResponse>(
        `${API_BASE_URL}/qbank/exams/${decodedExamId}?sujetNumber=${parsedSujetNumber}`,
      );

      setExam(payload);
    } catch {
      setError("تعذر تحميل هذا الموضوع.");
    } finally {
      setLoading(false);
    }
  }, [decodedExamId, parsedSujetNumber]);

  useEffect(() => {
    void loadExam();
  }, [loadExam]);

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

  const progressCounts = useMemo(
    () => countStudyProgress(allQuestionIds, progress.questionStates),
    [allQuestionIds, progress.questionStates],
  );
  const activeExerciseIndex = useMemo(
    () => exercises.findIndex((exercise) => exercise.id === activeExercise?.id),
    [activeExercise?.id, exercises],
  );
  const activeQuestionIndex = useMemo(
    () =>
      activeExercise?.questions.findIndex(
        (question) => question.id === activeQuestion?.id,
      ) ?? -1,
    [activeExercise, activeQuestion?.id],
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
              question.id === activeQuestion?.id,
            ),
            solutionViewed:
              progress.questionStates[question.id]?.solutionViewed,
          })),
        };
      }),
    [activeQuestion?.id, exercises, progress.questionStates],
  );

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
  }, []);

  const backToBrowseHref = `/app/browse?stream=${encodeURIComponent(
    decodeURIComponent(streamCode),
  )}&subject=${encodeURIComponent(decodeURIComponent(subjectCode))}&year=${encodeURIComponent(year)}&examId=${encodeURIComponent(decodedExamId)}&sujet=${encodeURIComponent(
    sujetNumber,
  )}`;
  const exerciseEditAction = isAdmin ? (
    <button
      type="button"
      className="btn-secondary"
      onClick={() =>
        setInlineEditTarget({
          kind: "exercise",
          exerciseId: activeExercise?.id ?? "",
          title:
            activeExercise?.title ??
            `التمرين ${activeExercise?.displayOrder ?? ""}`,
        })
      }
      disabled={!activeExercise}
    >
      تحرير التمرين
    </button>
  ) : null;
  const questionActionButtons =
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
          onClick={() =>
            patchQuestionState(activeQuestion.id, (current) => ({
              ...(current ?? {}),
              opened: true,
              completed: !current?.completed,
            }))
          }
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
          إظهار الحل
        </button>
        {isAdmin ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setInlineEditTarget({
                kind: "question",
                exerciseId: activeExercise.id,
                questionId: activeQuestion.id,
                title: activeQuestion.label,
              })
            }
          >
            تحرير السؤال
          </button>
        ) : null}
      </>
    ) : null;

  if (loading) {
    return (
      <StudyShell>
        <AppNavbar />
        <StudyScreenSkeleton />
      </StudyShell>
    );
  }

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
              exerciseAction={exerciseEditAction}
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
              questionActions={questionActionButtons}
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
        </div>

        {isAdmin ? (
          <SujetInlineEditor
            target={inlineEditTarget}
            onClose={() => setInlineEditTarget(null)}
            onSaved={loadExam}
          />
        ) : null}
      </>
    );
  }

  return (
    <StudyShell>
      <AppNavbar />

      {exam && activeExercise && activeQuestion ? (
        <>
          <StudyHeader
            eyebrow="وضع الدراسة"
            title={exam.selectedSujetLabel ?? `الموضوع ${sujetNumber}`}
            subtitle="واجهة مركزة للتمرين الحالي مع خريطة ثابتة للتنقل بين التمارين والأسئلة."
            meta={[
              { label: "المادة", value: exam.subject.name },
              { label: "الشعبة", value: exam.stream.name },
              { label: "السنة", value: String(exam.year) },
              {
                label: "الدورة",
                value: formatSessionType(exam.sessionType),
              },
            ]}
            actions={
              <SujetViewerHeaderActions
                backToBrowseHref={backToBrowseHref}
                progressMode={progress.mode}
                onEnterFocusMode={() => setFocusMode(true)}
                onSetMode={setProgressMode}
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
            activeQuestion={activeQuestion}
            activeQuestionIndex={activeQuestionIndex}
            activeQuestionStateDescriptor={activeQuestionStateDescriptor}
            activeQuestionState={activeQuestionState}
            solutionVisible={solutionVisible}
            progressMode={progress.mode}
            navigatorExercises={navigatorExercises}
            exerciseAction={exerciseEditAction}
            questionActions={questionActionButtons}
            onSelectExercise={activateExercise}
            onSelectQuestion={activateQuestion}
          />
        </>
      ) : !error ? (
        <EmptyState
          title="لا توجد بيانات لهذا الموضوع"
          description="جرّب العودة إلى التصفح ثم اختر موضوعاً آخر."
        />
      ) : (
        <EmptyState
          title="تعذر تحميل الموضوع"
          description={error}
          action={
            <div className="study-action-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void loadExam()}
              >
                إعادة المحاولة
              </button>
              <Link href={backToBrowseHref} className="btn-secondary">
                العودة للتصفح
              </Link>
            </div>
          }
        />
      )}

      {isAdmin ? (
        <SujetInlineEditor
          target={inlineEditTarget}
          onClose={() => setInlineEditTarget(null)}
          onSaved={loadExam}
        />
      ) : null}
    </StudyShell>
  );
}
