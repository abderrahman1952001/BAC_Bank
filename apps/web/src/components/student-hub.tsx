'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
import {
  EmptyState,
  StudyBadge,
  StudyHeader,
  StudyShell,
  StudentHubSkeleton,
} from '@/components/study-shell';
import {
  API_BASE_URL,
  fetchJson,
  FiltersResponse,
  RecentPracticeSessionsResponse,
} from '@/lib/qbank';

const statusLabels: Record<
  RecentPracticeSessionsResponse['data'][number]['status'],
  string
> = {
  CREATED: 'جديدة',
  IN_PROGRESS: 'قيد الإنجاز',
  COMPLETED: 'مكتملة',
};

const statusTones: Record<
  RecentPracticeSessionsResponse['data'][number]['status'],
  'neutral' | 'brand' | 'success'
> = {
  CREATED: 'neutral',
  IN_PROGRESS: 'brand',
  COMPLETED: 'success',
};

export function StudentHub() {
  const [filters, setFilters] = useState<FiltersResponse | null>(null);
  const [sessions, setSessions] = useState<
    RecentPracticeSessionsResponse['data']
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHub() {
      setLoading(true);
      setError(null);

      try {
        const [filtersPayload, sessionsPayload] = await Promise.all([
          fetchJson<FiltersResponse>(`${API_BASE_URL}/qbank/filters`, {
            signal: controller.signal,
          }),
          fetchJson<RecentPracticeSessionsResponse>(
            `${API_BASE_URL}/qbank/sessions?limit=6`,
            {
              signal: controller.signal,
            },
          ),
        ]);

        setFilters(filtersPayload);
        setSessions(sessionsPayload.data);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('تعذر تحميل الصفحة الرئيسية.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadHub();

    return () => {
      controller.abort();
    };
  }, []);

  const metrics = useMemo(
    () => [
      {
        label: 'الشعب المتاحة',
        value: filters?.streams.length ?? 0,
      },
      {
        label: 'المواد',
        value: filters?.subjects.length ?? 0,
      },
      {
        label: 'المحاور',
        value: filters?.topics.length ?? 0,
      },
      {
        label: 'السنوات',
        value: filters?.years.length ?? 0,
      },
    ],
    [filters],
  );
  const latestSession = sessions[0] ?? null;

  if (loading) {
    return (
      <StudyShell>
        <AppNavbar />
        <StudentHubSkeleton />
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      <AppNavbar />

      <StudyHeader
        eyebrow="مساحة الطالب"
        title="ابدأ من الهدف الذي يناسب جلسة اليوم"
        subtitle="التصفح السريع للمواضيع الرسمية وجلسات التدريب المخصصة أصبحا داخل نفس نظام الدراسة، مع دخول مباشر إلى ما تريد متابعته الآن."
        meta={[
          { label: 'المحتوى', value: `${metrics[0].value} شعب · ${metrics[1].value} مواد` },
          { label: 'المحاور', value: String(metrics[2].value) },
          { label: 'السنوات', value: String(metrics[3].value) },
        ]}
      />

      {error && !filters ? (
        <EmptyState
          title="تعذر تحميل مساحة الطالب"
          description="حاول إعادة تحميل الصفحة حتى نعيد جلب نطاق المحتوى وآخر الجلسات."
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              إعادة المحاولة
            </button>
          }
        />
      ) : (
        <div className="hub-layout">
          <div className="hub-main-column">
            <section className="hub-panel hub-focus-panel">
              <div className="hub-focus-copy">
                <p className="page-kicker">ابدأ الآن</p>
                <h2>
                  {latestSession
                    ? latestSession.title ?? 'استأنف آخر جلسة دراسة'
                    : 'اختر بين التصفح الرسمي أو تدريب موجّه'}
                </h2>
                <p>
                  {latestSession
                    ? 'إذا كنت بدأت جلسة من قبل، فالأفضل أن تتابعها أولاً ثم تعود إلى التصفح أو تبني جلسة جديدة.'
                    : 'اختر موضوعاً رسمياً للتدرج داخل الموضوع، أو ابن جلسة تدريب مركزة حول محور واضح.'}
                </p>
              </div>

              <div className="hub-focus-actions">
                {latestSession ? (
                  <Link href={`/app/sessions/${latestSession.id}`} className="btn-primary">
                    متابعة آخر جلسة
                  </Link>
                ) : (
                  <Link href="/app/sessions/new" className="btn-primary">
                    ابدأ جلسة تدريب
                  </Link>
                )}
                <Link href="/app/browse" className="btn-secondary">
                  تصفح المواضيع الرسمية
                </Link>
              </div>
            </section>

            <div className="hub-action-grid">
              <Link href="/app/browse" className="hub-action-card">
                <p className="feature-kicker">تصفح موجّه</p>
                <h3>ادخل مباشرة إلى موضوع رسمي</h3>
                <span>
                  اختر الشعبة والمادة والسنة ثم افتح الموضوع أو التمرين الذي تريد بدون مسار صفحات طويل.
                </span>
              </Link>

              <Link href="/app/sessions/new" className="hub-action-card secondary">
                <p className="feature-kicker">تدريب حسب محور</p>
                <h3>ابن جلسة تدريب مخصصة</h3>
                <span>
                  حدّد المادة والمحاور والفترة الزمنية، ثم ابدأ جلسة واضحة المعالم مع معاينة قبل الإنشاء.
                </span>
              </Link>
            </div>

            <section className="hub-panel">
              <div className="hub-section-head">
                <div>
                  <h2>آخر الجلسات</h2>
                  <p>ارجع بسرعة إلى آخر ما أنشأته أو ابدأ جلسة جديدة عندما لا توجد جلسات بعد.</p>
                </div>
                <Link href="/app/sessions/new" className="btn-secondary">
                  جلسة جديدة
                </Link>
              </div>

              {sessions.length === 0 ? (
                <EmptyState
                  title="لا توجد جلسات بعد"
                  description="ابدأ بأول جلسة تدريب مركزة، وستظهر هنا لتتمكن من متابعتها لاحقاً."
                  action={
                    <Link href="/app/sessions/new" className="btn-primary">
                      إنشاء أول جلسة
                    </Link>
                  }
                />
              ) : (
                <div className="hub-session-list">
                  {sessions.map((session) => (
                    <article key={session.id} className="hub-session-card">
                      <div className="hub-session-head">
                        <StudyBadge tone={statusTones[session.status]}>
                          {statusLabels[session.status]}
                        </StudyBadge>
                        <small>
                          {new Intl.DateTimeFormat('ar-DZ', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(session.createdAt))}
                        </small>
                      </div>
                      <div className="hub-session-copy">
                        <h3>{session.title ?? 'جلسة تدريب مخصصة'}</h3>
                        <p>
                          {session.exerciseCount} من أصل {session.requestedExerciseCount}{' '}
                          تمارين داخل الجلسة
                        </p>
                      </div>
                      <Link href={`/app/sessions/${session.id}`} className="btn-secondary">
                        متابعة الجلسة
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="hub-side-column">
            <section className="hub-panel">
              <div className="hub-section-head compact">
                <div>
                  <h2>نطاق المحتوى</h2>
                  <p>لمحة سريعة عن ما هو متاح الآن داخل النظام.</p>
                </div>
              </div>
              <div className="hub-kpi-grid">
                {metrics.map((metric) => (
                  <article key={metric.label} className="hub-kpi-card">
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="hub-panel">
              <div className="hub-section-head compact">
                <div>
                  <h2>كيف تبدأ؟</h2>
                  <p>اختر المسار الأنسب لطريقة دراستك الحالية.</p>
                </div>
              </div>
              <div className="hub-guide-list">
                <article>
                  <strong>عندما تريد موضوعاً رسمياً كاملاً</strong>
                  <p>ادخل إلى التصفح ثم اختر الشعبة والمادة والسنة وافتح الموضوع مباشرة.</p>
                </article>
                <article>
                  <strong>عندما تريد تدريباً على محور محدد</strong>
                  <p>ابن جلسة مخصصة، ثم راجع الأسئلة من نفس سطح الدراسة مع حفظ التقدم.</p>
                </article>
              </div>
            </section>
          </aside>
        </div>
      )}
    </StudyShell>
  );
}
