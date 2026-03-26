'use client';

import Link from 'next/link';
import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
import { StudyQuestionPanel } from '@/components/study-question-panel';
import {
  StudyExerciseStageCard,
  StudyQuestionPromptContent,
  StudyQuestionSolutionStack,
} from '@/components/study-stage';
import {
  InlineEditTarget,
  SujetInlineEditor,
} from '@/components/sujet-inline-editor';
import {
  EmptyState,
  StudyHeader,
  StudyKeyHint,
  StudyNavigator,
  StudyProgressBar,
  StudyScreenSkeleton,
  StudyShell,
  StudySidebar,
  StudyStateLegend,
} from '@/components/study-shell';
import { getClientRole } from '@/lib/client-auth';
import {
  API_BASE_URL,
  ExamResponse,
  fetchJson,
  formatSessionType,
} from '@/lib/qbank';
import {
  buildEmptyStudyProgress,
  countStudyProgress,
  describeStudyQuestionState,
  getQuestionVisualState,
  readLocalStudyProgress,
  StudyProgressSnapshot,
  writeLocalStudyProgress,
} from '@/lib/study';
import {
  buildStudyExercisesFromExam,
  canRevealStudyQuestionSolution,
  getStudyQuestionTopics,
  StudyExerciseModel,
} from '@/lib/study-surface';

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
  const [inlineEditTarget, setInlineEditTarget] = useState<InlineEditTarget | null>(
    null,
  );
  const [role] = useState<'USER' | 'ADMIN'>(() => getClientRole());

  const decodedExamId = decodeURIComponent(examId);
  const parsedSujetNumber = Number(sujetNumber);
  const storageKey = `bac-bank:sujet:${decodedExamId}:${parsedSujetNumber}`;
  const isAdmin = role === 'ADMIN';

  const loadExam = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchJson<ExamResponse>(
        `${API_BASE_URL}/qbank/exams/${decodedExamId}?sujetNumber=${parsedSujetNumber}`,
      );

      setExam(payload);
    } catch {
      setError('تعذر تحميل هذا الموضوع.');
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

    const localProgress = readLocalStudyProgress(storageKey) ?? buildEmptyStudyProgress();

    const queryExercise =
      initialExercise && /^\d+$/.test(initialExercise)
        ? exercises.find((exercise) => exercise.orderIndex === Number(initialExercise))
        : exercises.find((exercise) => exercise.id === initialExercise);
    const fallbackExercise =
      queryExercise ??
      exercises.find((exercise) => exercise.id === localProgress.activeExerciseId) ??
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

    return allQuestionIds.findIndex((questionId) => questionId === activeQuestion.id) + 1;
  }, [activeQuestion, allQuestionIds]);
  const activeQuestionState = activeQuestion
    ? progress.questionStates[activeQuestion.id]
    : undefined;
  const activeQuestionStateDescriptor = describeStudyQuestionState(
    activeQuestionState,
    false,
  );
  const solutionVisible =
    Boolean(activeQuestionState?.solutionViewed) || progress.mode === 'REVIEW';
  const canRevealSolution = canRevealStudyQuestionSolution(activeQuestion);

  const navigatorExercises = useMemo(
    () =>
      exercises.map((exercise) => {
        const exerciseQuestionIds = exercise.questions.map((question) => question.id);
        const counts = countStudyProgress(exerciseQuestionIds, progress.questionStates);

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
            solutionViewed: progress.questionStates[question.id]?.solutionViewed,
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

  function activateQuestion(exerciseId: string, questionId: string) {
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
    patch: (current: StudyProgressSnapshot['questionStates'][string] | undefined) => {
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
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const backToBrowseHref = `/app/browse?stream=${encodeURIComponent(
    decodeURIComponent(streamCode),
  )}&subject=${encodeURIComponent(decodeURIComponent(subjectCode))}&year=${encodeURIComponent(year)}&examId=${encodeURIComponent(decodedExamId)}&sujet=${encodeURIComponent(
    sujetNumber,
  )}`;

  if (loading) {
    return (
      <StudyShell>
        <AppNavbar />
        <StudyScreenSkeleton />
      </StudyShell>
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
              { label: 'المادة', value: exam.subject.name },
              { label: 'الشعبة', value: exam.stream.name },
              { label: 'السنة', value: String(exam.year) },
              {
                label: 'الدورة',
                value: formatSessionType(exam.sessionType),
              },
            ]}
            actions={
              <div className="study-toggle-row">
                <Link href={backToBrowseHref} className="btn-secondary">
                  العودة للتصفح
                </Link>
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
              </div>
            }
            progress={
              <div className="study-progress-grid">
                <StudyProgressBar
                  label="تقدم الموضوع"
                  detail={`${progressCounts.completedCount} من ${progressCounts.totalCount} منجزة`}
                  value={
                    (progressCounts.completedCount /
                      Math.max(progressCounts.totalCount, 1)) *
                    100
                  }
                />
                <StudyProgressBar
                  label="الموضع الحالي"
                  detail={`السؤال ${currentQuestionPosition} من ${progressCounts.totalCount}`}
                  value={
                    (currentQuestionPosition / Math.max(progressCounts.totalCount, 1)) *
                    100
                  }
                />
              </div>
            }
          />

          <div className="study-layout">
            <StudySidebar
              title="التنقل داخل الموضوع"
              subtitle={`التمرين ${activeExerciseIndex + 1} من ${exercises.length}`}
              footer={
                <div className="study-sidebar-footer-stack">
                  <StudyStateLegend />
                  <StudyKeyHint
                    keys={['N', 'P']}
                    label="للتنقل السريع بين السؤال التالي والسابق"
                  />
                </div>
              }
            >
              <StudyNavigator
                exercises={navigatorExercises}
                activeExerciseId={activeExercise.id}
                activeQuestionId={activeQuestion.id}
                onSelectExercise={activateExercise}
                onSelectQuestion={activateQuestion}
              />
            </StudySidebar>

            <section className="study-stage">
              <StudyExerciseStageCard
                exercise={activeExercise}
                kicker={`${exam.subject.name} · ${exam.stream.name} · ${exam.year}`}
                heading={
                  <>
                    التمرين {activeExercise.displayOrder}
                    {activeExercise.title ? ` · ${activeExercise.title}` : ''}
                  </>
                }
                badgeLabel={`${activeExercise.questions.length} أسئلة`}
                actions={
                  isAdmin ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        setInlineEditTarget({
                          kind: 'exercise',
                          exerciseId: activeExercise.id,
                          title:
                            activeExercise.title ??
                            `التمرين ${activeExercise.displayOrder}`,
                        })
                      }
                    >
                      تحرير التمرين
                    </button>
                  ) : null
                }
              />

              <StudyQuestionPanel
                key={`${activeExercise.id}:${activeQuestion.id}`}
                title={activeQuestion.label}
                subtitle={`التمرين ${activeExercise.displayOrder} · السؤال ${activeQuestionIndex + 1} داخل هذا التمرين`}
                stateLabel={activeQuestionStateDescriptor.label}
                stateTone={activeQuestionStateDescriptor.tone}
                positionLabel={`السؤال ${activeQuestionIndex + 1} من ${activeExercise.questions.length}`}
                pointsLabel={`${activeQuestion.points} نقطة`}
                modeLabel={progress.mode === 'REVIEW' ? 'وضع المراجعة' : 'وضع الحل'}
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
                actions={
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
                      {activeQuestionState?.completed ? 'إلغاء الإنجاز' : 'تم'}
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
                            kind: 'question',
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
                }
              >
                <StudyQuestionPromptContent question={activeQuestion} />
              </StudyQuestionPanel>

              {solutionVisible ? (
                <StudyQuestionSolutionStack question={activeQuestion} />
              ) : null}
            </section>
          </div>
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
