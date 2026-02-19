'use client';

import Image, { ImageLoaderProps } from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';
const ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL;

const sessionTypeLabels: Record<'NORMAL' | 'MAKEUP', string> = {
  NORMAL: 'عادية',
  MAKEUP: 'استدراكية',
};

function passthroughLoader({ src }: ImageLoaderProps): string {
  return src;
}

function toAssetUrl(fileUrl: string): string | null {
  if (!fileUrl) {
    return null;
  }

  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  if (fileUrl.startsWith('/')) {
    return fileUrl;
  }

  if (!ASSET_BASE_URL) {
    return null;
  }

  return `${ASSET_BASE_URL.replace(/\/$/, '')}/${fileUrl.replace(/^\//, '')}`;
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
  const [showExplanationByQuestion, setShowExplanationByQuestion] = useState<
    Record<string, boolean>
  >({});
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadSession() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/qbank/sessions/${sessionId}`, {
          signal: abortController.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Could not load session details.');
        }

        const payload = (await response.json()) as PracticeSessionResponse;
        setSession(payload);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('تعذر تحميل الجلسة. تأكد أن الرابط صحيح.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    return () => {
      abortController.abort();
    };
  }, [sessionId]);

  const activeExercise = session?.exercises[exerciseIndex] ?? null;
  const activeExerciseId = activeExercise?.id ?? null;
  const firstQuestionId = activeExercise?.questions[0]?.id ?? null;

  useEffect(() => {
    if (!activeExerciseId) {
      return;
    }

    setCompleted(false);
    setOpenQuestionId(firstQuestionId);
  }, [activeExerciseId, firstQuestionId]);

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
    if (!activeExercise || !session) {
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
    <main className="player-shell">
      <header className="session-topbar">
        <div>
          <p className="hero-kicker">Session Player</p>
          <h1>{session?.title ?? 'جلسة مراجعة'}</h1>
        </div>
        <div className="topbar-actions">
          <Link href="/app/sessions/new" className="btn-secondary">
            جلسة جديدة
          </Link>
          <Link href="/app" className="btn-secondary">
            العودة للوحة
          </Link>
        </div>
      </header>

      {loading ? <p>جاري تحميل تفاصيل الجلسة...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {session && activeExercise ? (
        <>
          <section className="progress-panel">
            <div>
              <p>تقدّم الجلسة</p>
              <strong>
                تمرين {exerciseIndex + 1} من {session.exercises.length}
              </strong>
              <div className="progress-track">
                <span style={{ width: `${exerciseProgress}%` }} />
              </div>
            </div>
            <div>
              <p>تقدّم التمرين</p>
              <strong>
                سؤال {activeQuestionIndex + 1} من {activeExercise.questions.length}
              </strong>
              <div className="progress-track">
                <span style={{ width: `${questionProgress}%` }} />
              </div>
            </div>
          </section>

          <section className="player-layout">
            <aside className="exercise-rail">
              <h2>تمارين الجلسة</h2>
              <div className="rail-list">
                {session.exercises.map((exercise, index) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => setExerciseIndex(index)}
                    className={index === exerciseIndex ? 'rail-item active' : 'rail-item'}
                  >
                    <span>تمرين {exercise.sessionOrder}</span>
                    <small>{exercise.exam.subject.name}</small>
                  </button>
                ))}
              </div>
            </aside>

            <article className="exercise-stage">
              <header className="exercise-head">
                <p>
                  {activeExercise.exam.subject.name} · {activeExercise.exam.stream.name} ·{' '}
                  {activeExercise.exam.year} ·{' '}
                  {sessionTypeLabels[activeExercise.exam.sessionType]}
                </p>
                <h2>{activeExercise.title ?? `التمرين ${activeExercise.sessionOrder}`}</h2>
                <span>{activeExercise.totalPoints} نقطة</span>
              </header>

              {activeExercise.introText ? (
                <section className="exercise-intro">
                  <h3>المقدمة</h3>
                  <pre>{activeExercise.introText}</pre>
                </section>
              ) : null}

              <section className="questions-accordion">
                {activeExercise.questions.map((question) => {
                  const isOpen = question.id === openQuestionId;
                  const showAnswer = Boolean(showAnswerByQuestion[question.id]);
                  const showExplanation = Boolean(
                    showExplanationByQuestion[question.id],
                  );

                  return (
                    <article
                      key={question.id}
                      className={isOpen ? 'question-item open' : 'question-item'}
                    >
                      <button
                        type="button"
                        className="question-toggle"
                        onClick={() => setOpenQuestionId(question.id)}
                      >
                        <span>
                          السؤال {question.orderIndex} · {question.points} نقطة
                        </span>
                        <strong>{isOpen ? 'إخفاء' : 'عرض'}</strong>
                      </button>

                      {isOpen ? (
                        <div className="question-body">
                          <pre className="question-markdown">
                            {question.contentMarkdown ?? 'لا يوجد نص متاح لهذا السؤال.'}
                          </pre>

                          {question.assets.length ? (
                            <div className="asset-stack">
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
                                      alt={asset.caption ?? `مرفق السؤال ${question.orderIndex}`}
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

                          <div className="topic-tags">
                            {question.topics.map((topic) => (
                              <span key={`${question.id}-${topic.code}`}>
                                {topic.name}
                                {topic.isPrimary ? ' (رئيسي)' : ''}
                              </span>
                            ))}
                          </div>

                          <div className="question-actions">
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
                              {showAnswer ? 'إخفاء الحل الرسمي' : 'عرض الحل الرسمي'}
                            </button>

                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() =>
                                setShowExplanationByQuestion((current) => ({
                                  ...current,
                                  [question.id]: !current[question.id],
                                }))
                              }
                            >
                              {showExplanation ? 'إخفاء الشرح' : 'عرض الشرح'}
                            </button>

                            <button
                              type="button"
                              className="btn-primary"
                              onClick={goToNextStep}
                            >
                              {exerciseIndex === session.exercises.length - 1 &&
                              activeQuestionIndex === activeExercise.questions.length - 1
                                ? 'إنهاء الجلسة'
                                : activeQuestionIndex ===
                                    activeExercise.questions.length - 1
                                  ? 'التمرين التالي'
                                  : 'السؤال التالي'}
                            </button>
                          </div>

                          {showAnswer ? (
                            <section className="answer-panel">
                              <h4>الإجابة الرسمية</h4>
                              <pre>
                                {question.answer?.officialAnswerMarkdown ??
                                  'لا توجد إجابة رسمية منشورة لهذا السؤال حالياً.'}
                              </pre>
                            </section>
                          ) : null}

                          {showExplanation ? (
                            <section className="answer-panel alt">
                              <h4>شرح إضافي</h4>
                              <pre>
                                {question.answer?.markingSchemeMarkdown ??
                                  'لا يوجد سلم تنقيط متاح.'}
                              </pre>
                              <pre>
                                {question.answer?.commonMistakesMarkdown ??
                                  'لا توجد أخطاء شائعة مسجلة.'}
                              </pre>
                              <pre>
                                {question.answer?.examinerCommentaryMarkdown ??
                                  'لا توجد ملاحظات مصحح إضافية.'}
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
                <section className="completion-panel">
                  <h3>أحسنت! انتهيت من الجلسة.</h3>
                  <p>
                    يمكنك إنشاء جلسة جديدة بمعايير مختلفة أو الرجوع للجلسات السابقة
                    لمراجعة الحلول.
                  </p>
                  <div className="hero-cta-row">
                    <Link href="/app/sessions/new" className="btn-primary">
                      بناء جلسة جديدة
                    </Link>
                    <Link href="/app" className="btn-secondary">
                      العودة للوحة
                    </Link>
                  </div>
                </section>
              ) : null}
            </article>
          </section>
        </>
      ) : null}
    </main>
  );
}
