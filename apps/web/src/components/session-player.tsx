'use client';

import Link from 'next/link';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { StudySectionCard } from '@/components/study-content';
import { StudyQuestionPanel } from '@/components/study-question-panel';
import {
  StudyExerciseStageCard,
  StudyQuestionPromptContent,
  StudyQuestionSolutionStack,
} from '@/components/study-stage';
import {
  EmptyState,
  StudyKeyHint,
  StudyNavigator,
  StudyStateLegend,
} from '@/components/study-shell';
import {
  API_BASE_URL,
  fetchJson,
  formatSessionType,
  PracticeSessionResponse,
  UpdateSessionProgressResponse,
} from '@/lib/qbank';
import {
  buildEmptyStudyProgress,
  chooseFreshestStudyProgress,
  countStudyProgress,
  getFirstUnansweredQuestionId,
  getQuestionVisualState,
  normalizeStudyProgress,
  readLocalStudyProgress,
  serializeStudyProgress,
  StudyProgressSnapshot,
  writeLocalStudyProgress,
} from '@/lib/study';
import {
  buildStudyExercisesFromSessionExercises,
  canRevealStudyQuestionSolution,
  getStudyQuestionTopics,
  StudyExerciseModel,
} from '@/lib/study-surface';

type SessionQuestionRef = {
  exerciseId: string;
  questionId: string;
};

type QuestionMotionDirection = 'forward' | 'backward';

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
          <div className="study-skeleton" style={{ minHeight: 40, width: 110 }} />
        </div>
        <div className="theater-header-center">
          <div className="study-skeleton" style={{ minHeight: 40, width: 220 }} />
        </div>
        <div className="theater-header-right">
          <div className="study-skeleton" style={{ minHeight: 40, width: 100 }} />
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
            <div className="study-skeleton" style={{ minHeight: 52, width: 180 }} />
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
  const [questionMotionDirection, setQuestionMotionDirection] =
    useState<QuestionMotionDirection>('forward');

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
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('تعذر تحميل الجلسة.');
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
    if (!session || !exercises.length) {
      return;
    }

    const remoteProgress = normalizeStudyProgress(session.progress);
    const localProgress = readLocalStudyProgress(storageKey);
    const mergedProgress =
      chooseFreshestStudyProgress(localProgress, remoteProgress) ??
      buildEmptyStudyProgress();
    const firstExercise = exercises[0];
    const firstQuestionId = firstExercise.questions[0]?.id ?? null;

    const activeExerciseId = exercises.some(
      (exercise) => exercise.id === mergedProgress.activeExerciseId,
    )
      ? mergedProgress.activeExerciseId
      : firstExercise.id;
    const activeExercise =
      exercises.find((exercise) => exercise.id === activeExerciseId) ??
      firstExercise;
    const activeQuestionId = activeExercise.questions.some(
      (question) => question.id === mergedProgress.activeQuestionId,
    )
      ? mergedProgress.activeQuestionId
      : activeExercise.questions[0]?.id ?? firstQuestionId;

    const nextProgress: StudyProgressSnapshot = {
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
      updatedAt: mergedProgress.updatedAt || new Date().toISOString(),
    };

    setProgress(nextProgress);
    setProgressReady(true);
  }, [exercises, session, storageKey]);

  useEffect(() => {
    if (!progressReady || !session) {
      return;
    }

    writeLocalStudyProgress(storageKey, progress);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const serialized = serializeStudyProgress(progress, allQuestionIds);

      try {
        const payload = await fetchJson<UpdateSessionProgressResponse>(
          `${API_BASE_URL}/qbank/sessions/${sessionId}/progress`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              activeExerciseId: serialized.activeExerciseId,
              activeQuestionId: serialized.activeQuestionId,
              mode: serialized.mode,
              questionStates: serialized.questionStates,
              totalQuestionCount: serialized.summary.totalQuestionCount,
              completedQuestionCount: serialized.summary.completedQuestionCount,
              skippedQuestionCount: serialized.summary.skippedQuestionCount,
              solutionViewedCount: serialized.summary.solutionViewedCount,
            }),
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
  const activeQuestionIndex = useMemo(() => {
    if (!activeExercise || !activeQuestion) {
      return -1;
    }

    return activeExercise.questions.findIndex(
      (question) => question.id === activeQuestion.id,
    );
  }, [activeExercise, activeQuestion]);
  const currentQuestionPosition = useMemo(() => {
    if (!activeQuestion) {
      return 0;
    }

    return allQuestionIds.findIndex((questionId) => questionId === activeQuestion.id) + 1;
  }, [activeQuestion, allQuestionIds]);
  const activeQuestionState = activeQuestion
    ? progress.questionStates[activeQuestion.id]
    : undefined;
  const solutionVisible =
    Boolean(activeQuestionState?.solutionViewed) || progress.mode === 'REVIEW';
  const canRevealSolution = canRevealStudyQuestionSolution(activeQuestion);
  const isLastQuestion =
    progressCounts.totalCount > 0 &&
    currentQuestionPosition === progressCounts.totalCount;
  const progressPercent =
    (currentQuestionPosition / Math.max(progressCounts.totalCount, 1)) * 100;

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

  const sessionMeta = useMemo(() => {
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
      { label: 'المادة', value: firstExercise.exam.subject.name },
      {
        label: 'الشعب',
        value: streamNames.length === 1 ? streamNames[0] : 'عدة شعب',
      },
      {
        label: 'السنوات',
        value:
          yearValues.length > 1
            ? `${yearValues[yearValues.length - 1]} - ${yearValues[0]}`
            : String(yearValues[0]),
      },
      { label: 'الحفظ', value: 'تلقائي' },
    ];
  }, [session?.exercises]);

  const sessionGoalSummary = useMemo(() => {
    if (!session?.filters) {
      return 'جلسة تدريب مخصصة من مجموعة تمارين مطابقة لنفس الهدف.';
    }

    const parts: string[] = [];

    if (session.filters.topicCodes?.length) {
      parts.push(
        session.filters.topicCodes.length === 1
          ? 'محور واحد محدد'
          : `${session.filters.topicCodes.length} محاور محددة`,
      );
    } else {
      parts.push('كل المحاور المطابقة');
    }

    if (session.filters.streamCode) {
      parts.push(`شعبة ${activeExercise?.sourceExam?.stream.name ?? 'محددة'}`);
    } else {
      parts.push('كل الشعب المطابقة');
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
        formatSessionType(session.filters.sessionTypes[0] as 'NORMAL' | 'MAKEUP'),
      );
    }

    return parts.join(' · ');
  }, [activeExercise?.sourceExam?.stream.name, session?.filters]);

  const navigatorExercises = useMemo(
    () =>
      exercises.map((exercise) => {
        const exerciseQuestionIds = exercise.questions.map((question) => question.id);
        const counts = countStudyProgress(exerciseQuestionIds, progress.questionStates);

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
              progress.questionStates[question.id],
              question.id === activeQuestion?.id,
            ),
            solutionViewed: progress.questionStates[question.id]?.solutionViewed,
          })),
        };
      }),
    [activeQuestion?.id, exercises, progress.questionStates],
  );

  const questionStateLabel = activeQuestionState?.skipped
    ? 'متروك'
    : activeQuestionState?.completed
      ? 'تمت المراجعة'
      : solutionVisible
        ? 'تم كشف الحل'
        : 'جاهز للحل';
  const questionStateTone = activeQuestionState?.skipped
    ? 'danger'
    : activeQuestionState?.completed
      ? 'success'
      : solutionVisible
        ? 'accent'
        : 'brand';
  const primaryActionLabel =
    !solutionVisible && canRevealSolution
      ? 'إظهار الحل'
      : isLastQuestion
        ? 'إنهاء الجلسة'
        : !solutionVisible && !canRevealSolution
          ? 'متابعة إلى السؤال التالي'
          : 'السؤال التالي';

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

  function getQuestionRefIndex(questionId: string | null) {
    if (!questionId) {
      return -1;
    }

    return allQuestionRefs.findIndex((item) => item.questionId === questionId);
  }

  function getAdjacentQuestionRef(direction: -1 | 1): SessionQuestionRef | null {
    if (!activeQuestion) {
      return null;
    }

    const currentIndex = getQuestionRefIndex(activeQuestion.id);

    if (currentIndex === -1) {
      return null;
    }

    return allQuestionRefs[currentIndex + direction] ?? null;
  }

  function setQuestionDirection(targetQuestionId: string) {
    const currentIndex = getQuestionRefIndex(progress.activeQuestionId);
    const nextIndex = getQuestionRefIndex(targetQuestionId);

    if (currentIndex === -1 || nextIndex === -1) {
      return;
    }

    setQuestionMotionDirection(nextIndex >= currentIndex ? 'forward' : 'backward');
  }

  function activateQuestion(exerciseId: string, questionId: string) {
    if (
      exerciseId === progress.activeExerciseId &&
      questionId === progress.activeQuestionId
    ) {
      setShowNavigator(false);
      return;
    }

    setQuestionDirection(questionId);
    setCompletionOpen(false);
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
    const fallbackQuestionId = exercise?.questions[0]?.id ?? null;

    if (!exercise || !fallbackQuestionId) {
      return;
    }

    activateQuestion(exercise.id, fallbackQuestionId);
  }

  function patchQuestionState(
    questionId: string,
    updater: (
      current: StudyProgressSnapshot['questionStates'][string] | undefined,
    ) => StudyProgressSnapshot['questionStates'][string],
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
    const nextRef = getAdjacentQuestionRef(direction);

    if (!nextRef) {
      return false;
    }

    activateQuestion(nextRef.exerciseId, nextRef.questionId);
    return true;
  }

  function goToFirstUnanswered() {
    const questionId = getFirstUnansweredQuestionId(
      allQuestionIds,
      progress.questionStates,
    );

    if (!questionId) {
      return;
    }

    const questionRef = allQuestionRefs.find((item) => item.questionId === questionId);

    if (!questionRef) {
      return;
    }

    activateQuestion(questionRef.exerciseId, questionRef.questionId);
  }

  function goToFirstSkipped() {
    const questionId =
      allQuestionIds.find((item) => progress.questionStates[item]?.skipped) ?? null;

    if (!questionId) {
      return;
    }

    const questionRef = allQuestionRefs.find((item) => item.questionId === questionId);

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
    if (!activeQuestion) {
      return;
    }

    const nextRef = getAdjacentQuestionRef(1);

    setCompletionOpen(false);

    if (nextRef) {
      setQuestionMotionDirection('forward');
    }

    updateProgress((current) => ({
      ...current,
      activeExerciseId: nextRef?.exerciseId ?? current.activeExerciseId,
      activeQuestionId: nextRef?.questionId ?? current.activeQuestionId,
      questionStates: {
        ...current.questionStates,
        [activeQuestion.id]: {
          ...(current.questionStates[activeQuestion.id] ?? {}),
          opened: true,
          completed: false,
          skipped: true,
        },
        ...(nextRef
          ? {
              [nextRef.questionId]: {
                ...current.questionStates[nextRef.questionId],
                opened: true,
              },
            }
          : {}),
      },
    }));

    if (!nextRef) {
      setCompletionOpen(true);
    }
  }

  function advanceFromCurrentQuestion() {
    if (!activeQuestion) {
      return;
    }

    const nextRef = getAdjacentQuestionRef(1);

    setCompletionOpen(false);

    if (progress.mode === 'REVIEW') {
      if (nextRef) {
        setQuestionMotionDirection('forward');
        activateQuestion(nextRef.exerciseId, nextRef.questionId);
      } else {
        setCompletionOpen(true);
      }

      return;
    }

    if (nextRef) {
      setQuestionMotionDirection('forward');
    }

    updateProgress((current) => ({
      ...current,
      activeExerciseId: nextRef?.exerciseId ?? current.activeExerciseId,
      activeQuestionId: nextRef?.questionId ?? current.activeQuestionId,
      questionStates: {
        ...current.questionStates,
        [activeQuestion.id]: {
          ...(current.questionStates[activeQuestion.id] ?? {}),
          opened: true,
          completed: true,
          skipped: false,
          solutionViewed:
            Boolean(current.questionStates[activeQuestion.id]?.solutionViewed) ||
            current.mode === 'REVIEW',
        },
        ...(nextRef
          ? {
              [nextRef.questionId]: {
                ...current.questionStates[nextRef.questionId],
                opened: true,
              },
            }
          : {}),
      },
    }));

    if (!nextRef) {
      setCompletionOpen(true);
    }
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
    if (progress.mode !== 'REVIEW' || !activeQuestion) {
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

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handleAdjacentQuestion(1);
      }

      if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        handleAdjacentQuestion(-1);
      }

      if (event.key === 'Escape') {
        setShowNavigator(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
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
            description={error || 'لا توجد بيانات لهذه الجلسة'}
            action={<Link href="/app" className="btn-primary">العودة للرئيسية</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="theater-mode">
      <header className="theater-header">
        <div className="theater-header-left">
          <Link href="/app" className="btn-ghost">
            إغلاق
          </Link>
        </div>

        <div className="theater-header-center">
          <div className="theater-progress-container">
            <span className="theater-progress-text">
              السؤال {currentQuestionPosition} من {progressCounts.totalCount}
            </span>
            <div className="theater-progress-track" aria-hidden="true">
              <div
                className="theater-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="theater-header-right">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowNavigator(true)}
          >
            الخريطة
          </button>
        </div>
      </header>

      <div className="theater-body">
        <aside className="theater-context-pane">
          <div className="theater-pane-shell">
            <section className="theater-session-intro">
              <p className="page-kicker">جلسة دراسة</p>
              <h1>{session.title ?? 'جلسة تدريب مخصصة'}</h1>
              <p className="theater-session-copy">
                {session.exerciseCount} تمارين مختارة داخل نفس سطح الدراسة، مع
                حفظ تلقائي للموضع والتقدم.
              </p>
              <div className="study-meta-row">
                {sessionMeta.map((item) => (
                  <span key={`${item.label}:${item.value}`} className="study-meta-pill">
                    <strong>{item.label}</strong>
                    <span>{item.value}</span>
                  </span>
                ))}
              </div>
            </section>

            <StudySectionCard tone="commentary" title="سياق الجلسة">
              <p className="muted-text">{sessionGoalSummary}</p>
              {activeExerciseTopics.length ? (
                <div className="topic-chip-row theater-context-topics">
                  {activeExerciseTopics.slice(0, 8).map((topic) => (
                    <span key={`${activeExercise.id}:${topic.code}`}>
                      {topic.name}
                      {topic.isPrimary ? ' · رئيسي' : ''}
                    </span>
                  ))}
                </div>
              ) : null}
            </StudySectionCard>

            <StudyExerciseStageCard
              exercise={activeExercise}
              kicker={
                activeExercise.sourceExam
                  ? `${activeExercise.sourceExam.subject.name} · ${activeExercise.sourceExam.stream.name} · ${activeExercise.sourceExam.year} · ${formatSessionType(activeExercise.sourceExam.sessionType)}`
                  : 'جلسة تدريب مخصصة'
              }
              heading={
                <>
                  التمرين {activeExercise.displayOrder}
                  {activeExercise.title ? ` · ${activeExercise.title}` : ''}
                </>
              }
              badgeLabel={`${activeExercise.questions.length} أسئلة`}
            />
          </div>
        </aside>

        <main className="theater-question-pane">
          <div className="theater-pane-shell theater-question-shell">
            <div className="theater-question-deck">
              <div
                key={activeQuestion.id}
                className={`theater-question-card is-${questionMotionDirection}`}
              >
                <StudyQuestionPanel
                  title={activeQuestion.label}
                  subtitle={`التمرين ${activeExercise.displayOrder} · السؤال ${activeQuestionIndex + 1} داخل هذا التمرين`}
                  isActive={false}
                  stateLabel={questionStateLabel}
                  stateTone={questionStateTone}
                  positionLabel={`السؤال ${currentQuestionPosition} من ${progressCounts.totalCount}`}
                  pointsLabel={`${activeQuestion.points} نقطة`}
                  modeLabel={progress.mode === 'REVIEW' ? 'وضع المراجعة' : undefined}
                  solutionViewed={Boolean(activeQuestionState?.solutionViewed)}
                  topics={getStudyQuestionTopics(activeQuestion).map((topic) => ({
                    key: `${activeQuestion.id}-${topic.code}`,
                    label: topic.name,
                    isPrimary: topic.isPrimary,
                  }))}
                  keyboardHint={{
                    keys: ['N', 'P'],
                    label: 'التالي / السابق',
                  }}
                >
                  <StudyQuestionPromptContent question={activeQuestion} />
                </StudyQuestionPanel>

                <div
                  className={`solution-reveal-wrapper${solutionVisible ? ' is-open' : ''}`}
                >
                  <div className="solution-reveal-inner">
                    <StudyQuestionSolutionStack question={activeQuestion} />
                  </div>
                </div>
              </div>
            </div>

            <div className="theater-actions-bar">
              <button
                type="button"
                className="btn-primary"
                onClick={handlePrimaryAction}
              >
                {primaryActionLabel}
              </button>

              {!solutionVisible && progress.mode !== 'REVIEW' ? (
                <button
                  type="button"
                  className="theater-subtle-action"
                  onClick={skipCurrentQuestion}
                >
                  تخطي
                </button>
              ) : null}
            </div>

            <p className="theater-footer-note">
              التنقل اليدوي متاح من الخريطة أو عبر N / P.
            </p>

            {completionOpen ? (
              <StudySectionCard tone="commentary" title="ملخص الجلسة">
                <p className="completion-summary-copy">
                  {progressCounts.unansweredCount || progressCounts.skippedCount
                    ? 'أنهيت المرور الحالي على الجلسة، وما زالت هناك أسئلة تحتاج رجوعاً سريعاً قبل الإغلاق.'
                    : 'أنهيت المرور الأول على الجلسة. يمكنك الآن مراجعة الحلول والتنقل بحرية بين الأسئلة.'}
                </p>

                <div className="completion-summary-grid">
                  <article>
                    <strong>{progressCounts.completedCount}</strong>
                    <span>منجزة</span>
                  </article>
                  <article>
                    <strong>{progressCounts.skippedCount}</strong>
                    <span>متروكة</span>
                  </article>
                  <article>
                    <strong>{progressCounts.solutionViewedCount}</strong>
                    <span>حلول مكشوفة</span>
                  </article>
                </div>

                <div className="theater-summary-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={goToFirstUnanswered}
                    disabled={progressCounts.unansweredCount === 0}
                  >
                    اذهب إلى غير المنجز
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={goToFirstSkipped}
                    disabled={progressCounts.skippedCount === 0}
                  >
                    راجع المتروك
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      updateProgress((current) => ({
                        ...current,
                        mode: current.mode === 'REVIEW' ? 'SOLVE' : 'REVIEW',
                      }))
                    }
                  >
                    {progress.mode === 'REVIEW' ? 'العودة لوضع الحل' : 'فتح وضع المراجعة'}
                  </button>
                  <Link href="/app" className="btn-primary">
                    العودة للرئيسية
                  </Link>
                </div>
              </StudySectionCard>
            ) : null}
          </div>
        </main>
      </div>

      {showNavigator ? (
        <div
          className="navigator-modal-backdrop"
          onClick={() => setShowNavigator(false)}
        >
          <aside
            className="navigator-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="theater-modal-stack">
              <div className="study-stage-head">
                <div>
                  <p className="page-kicker">خريطة الجلسة</p>
                  <h2>{session.title ?? 'جلسة تدريب مخصصة'}</h2>
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowNavigator(false)}
                >
                  إغلاق
                </button>
              </div>

              <div className="theater-modal-section">
                <StudyStateLegend includeSkipped />
                <StudyKeyHint
                  keys={['N', 'P']}
                  label="للتنقل السريع بين السؤال التالي والسابق"
                />
              </div>

              <div className="theater-modal-actions">
                <button
                  type="button"
                  className={
                    progress.mode === 'SOLVE'
                      ? 'study-toggle-button active'
                      : 'study-toggle-button'
                  }
                  onClick={() =>
                    updateProgress((current) => ({
                      ...current,
                      mode: 'SOLVE',
                    }))
                  }
                >
                  وضع الحل
                </button>
                <button
                  type="button"
                  className={
                    progress.mode === 'REVIEW'
                      ? 'study-toggle-button active'
                      : 'study-toggle-button'
                  }
                  onClick={() =>
                    updateProgress((current) => ({
                      ...current,
                      mode: 'REVIEW',
                    }))
                  }
                >
                  وضع المراجعة
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={goToFirstUnanswered}
                  disabled={progressCounts.unansweredCount === 0}
                >
                  أول غير منجز
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={goToFirstSkipped}
                  disabled={progressCounts.skippedCount === 0}
                >
                  راجع المتروك
                </button>
              </div>

              <StudyNavigator
                exercises={navigatorExercises}
                activeExerciseId={activeExercise.id}
                activeQuestionId={activeQuestion.id}
                onSelectExercise={activateExercise}
                onSelectQuestion={activateQuestion}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
