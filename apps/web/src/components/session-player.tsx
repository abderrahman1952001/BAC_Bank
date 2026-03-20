'use client';

import Image, { ImageLoaderProps } from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
import { API_BASE_URL, fetchJson, formatSessionType, toAssetUrl } from '@/lib/qbank';

type QuestionAsset = {
  id: string;
  fileUrl: string;
  assetType: 'IMAGE' | 'GRAPH' | 'TABLE' | 'FILE';
  orderIndex: number;
  caption: string | null;
};

type PracticeSessionResponse = {
  id: string;
  title: string | null;
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED';
  requestedExerciseCount: number;
  exerciseCount: number;
  exercises: Array<{
    sessionOrder: number;
    id: string;
    orderIndex: number;
    title: string | null;
    introText: string | null;
    totalPoints: number;
    questionCount: number;
    exam: {
      year: number;
      sessionType: 'NORMAL' | 'MAKEUP';
      subject: {
        code: string;
        name: string;
      };
      stream: {
        code: string;
        name: string;
      };
    };
    questions: Array<{
      id: string;
      orderIndex: number;
      points: number;
      difficultyLevel: number | null;
      contentFormat: 'MARKDOWN' | 'HYBRID';
      contentVersion: number | null;
      contentMarkdown: string | null;
      assets: QuestionAsset[];
      topics: Array<{
        code: string;
        name: string;
        isPrimary: boolean;
        weight: number;
      }>;
      answer: {
        officialAnswerMarkdown: string;
        markingSchemeMarkdown: string | null;
        commonMistakesMarkdown: string | null;
        examinerCommentaryMarkdown: string | null;
        updatedAt: string;
      } | null;
    }>;
  }>;
};

function passthroughLoader({ src }: ImageLoaderProps): string {
  return src;
}

export function SessionPlayer({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<PracticeSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);
  const [showAnswerByQuestion, setShowAnswerByQuestion] = useState<
    Record<string, boolean>
  >({});
  const [completed, setCompleted] = useState(false);

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

  const activeExercise = session?.exercises[exerciseIndex] ?? null;

  useEffect(() => {
    if (!activeExercise?.questions.length) {
      setOpenQuestionId(null);
      return;
    }

    setCompleted(false);
    setOpenQuestionId(activeExercise.questions[0].id);
  }, [activeExercise?.id, activeExercise?.questions]);

  const activeQuestionIndex = useMemo(() => {
    if (!activeExercise || !openQuestionId) {
      return 0;
    }

    const index = activeExercise.questions.findIndex(
      (question) => question.id === openQuestionId,
    );

    return index >= 0 ? index : 0;
  }, [activeExercise, openQuestionId]);

  function goToNextStep() {
    if (!session || !activeExercise) {
      return;
    }

    const hasNextQuestion = activeQuestionIndex < activeExercise.questions.length - 1;
    if (hasNextQuestion) {
      setOpenQuestionId(activeExercise.questions[activeQuestionIndex + 1].id);
      return;
    }

    const hasNextExercise = exerciseIndex < session.exercises.length - 1;
    if (hasNextExercise) {
      setExerciseIndex((current) => current + 1);
      return;
    }

    setCompleted(true);
  }

  const exerciseProgress = session
    ? ((exerciseIndex + 1) / Math.max(session.exercises.length, 1)) * 100
    : 0;

  const questionProgress = activeExercise
    ? ((activeQuestionIndex + 1) / Math.max(activeExercise.questions.length, 1)) * 100
    : 0;

  return (
    <main className="app-shell">
      <AppNavbar />

      <section className="page-hero">
        <p className="page-kicker">Session Player</p>
        <h1>{session?.title ?? 'جلسة مراجعة'}</h1>
        <p>
          {session?.exerciseCount ?? 0} تمارين في الجلسة
        </p>
      </section>

      <section className="panel">
        {loading ? <p>جاري تحميل الجلسة...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {session && activeExercise ? (
          <>
            <div className="progress-grid">
              <article>
                <p>
                  التمرين {exerciseIndex + 1} من {session.exercises.length}
                </p>
                <div className="progress-track">
                  <span style={{ width: `${exerciseProgress}%` }} />
                </div>
              </article>
              <article>
                <p>
                  السؤال {activeQuestionIndex + 1} من {activeExercise.questions.length}
                </p>
                <div className="progress-track">
                  <span style={{ width: `${questionProgress}%` }} />
                </div>
              </article>
            </div>

            <div className="viewer-layout">
              <aside className="viewer-exercises">
                <h2>تمارين الجلسة</h2>
                <div className="exercise-list">
                  {session.exercises.map((exercise, index) => (
                    <button
                      key={exercise.id}
                      type="button"
                      className={
                        index === exerciseIndex
                          ? 'exercise-widget active'
                          : 'exercise-widget'
                      }
                      onClick={() => setExerciseIndex(index)}
                    >
                      <strong>تمرين {exercise.sessionOrder}</strong>
                      <span>{exercise.exam.subject.name}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <article className="viewer-stage">
                <header className="exercise-headline">
                  <p>
                    {activeExercise.exam.subject.name} · {activeExercise.exam.stream.name}{' '}
                    · {activeExercise.exam.year} ·{' '}
                    {formatSessionType(activeExercise.exam.sessionType)}
                  </p>
                  <h2>
                    {activeExercise.title ?? `التمرين ${activeExercise.sessionOrder}`}
                  </h2>
                  {activeExercise.introText ? (
                    <pre className="exercise-intro">{activeExercise.introText}</pre>
                  ) : null}
                </header>

                <section className="question-stack">
                  {activeExercise.questions.map((question) => {
                    const isOpen = question.id === openQuestionId;
                    const showAnswer = Boolean(showAnswerByQuestion[question.id]);

                    return (
                      <article
                        key={question.id}
                        className={isOpen ? 'question-card open' : 'question-card'}
                      >
                        <button
                          type="button"
                          className="question-line"
                          onClick={() => setOpenQuestionId(question.id)}
                        >
                          <span>
                            سؤال {question.orderIndex} · {question.points} نقطة
                          </span>
                          <strong>{isOpen ? 'إغلاق' : 'فتح'}</strong>
                        </button>

                        {isOpen ? (
                          <div className="question-content">
                            <pre>{question.contentMarkdown ?? 'لا يوجد نص متاح.'}</pre>

                            {question.assets.length ? (
                              <div className="asset-grid">
                                {question.assets.map((asset) => {
                                  const assetUrl = toAssetUrl(asset.fileUrl);
                                  if (!assetUrl) {
                                    return null;
                                  }

                                  return (
                                    <figure key={asset.id}>
                                      <Image
                                        src={assetUrl}
                                        loader={passthroughLoader}
                                        alt={
                                          asset.caption ??
                                          `Asset for question ${question.orderIndex}`
                                        }
                                        width={1400}
                                        height={1000}
                                        unoptimized
                                      />
                                      {asset.caption ? <figcaption>{asset.caption}</figcaption> : null}
                                    </figure>
                                  );
                                })}
                              </div>
                            ) : null}

                            <div className="topic-chip-row">
                              {question.topics.map((topic) => (
                                <span key={`${question.id}-${topic.code}`}>
                                  {topic.name}
                                  {topic.isPrimary ? ' (رئيسي)' : ''}
                                </span>
                              ))}
                            </div>

                            <div className="session-question-actions">
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() =>
                                  setShowAnswerByQuestion((current) => ({
                                    ...current,
                                    [question.id]: !current[question.id],
                                  }))
                                }
                              >
                                {showAnswer ? 'إخفاء الحل' : 'عرض الحل'}
                              </button>
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={goToNextStep}
                              >
                                {exerciseIndex === session.exercises.length - 1 &&
                                activeQuestionIndex ===
                                  activeExercise.questions.length - 1
                                  ? 'إنهاء الجلسة'
                                  : activeQuestionIndex ===
                                      activeExercise.questions.length - 1
                                    ? 'التمرين التالي'
                                    : 'السؤال التالي'}
                              </button>
                            </div>

                            {showAnswer ? (
                              <section className="official-answer">
                                <h3>الحل الرسمي</h3>
                                <pre>
                                  {question.answer?.officialAnswerMarkdown ??
                                    'لا توجد إجابة رسمية منشورة.'}
                                </pre>
                              </section>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </section>

                {completed ? (
                  <section className="completion-card">
                    <h3>تم إنهاء الجلسة</h3>
                    <p>يمكنك إنشاء جلسة جديدة بمعايير أخرى أو العودة للرئيسية.</p>
                    <div className="completion-actions">
                      <Link href="/app/sessions/new" className="btn-primary">
                        جلسة جديدة
                      </Link>
                      <Link href="/app" className="btn-secondary">
                        العودة للرئيسية
                      </Link>
                    </div>
                  </section>
                ) : null}
              </article>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
