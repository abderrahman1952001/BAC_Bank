'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
import {
  EmptyState,
  StudyBadge,
  StudyShell,
  StudentHubSkeleton,
} from '@/components/study-shell';
import {
  API_BASE_URL,
  fetchJson,
  RecentPracticeSessionsResponse,
} from '@/lib/qbank';

const statusLabels: Record<
  RecentPracticeSessionsResponse['data'][number]['status'],
  string
> = {
  CREATED: 'جديدة',
  IN_PROGRESS: 'نشطة',
  COMPLETED: 'مكتملة',
};

const statusTones: Record<
  RecentPracticeSessionsResponse['data'][number]['status'],
  'accent' | 'brand' | 'success'
> = {
  CREATED: 'accent',
  IN_PROGRESS: 'brand',
  COMPLETED: 'success',
};

function formatSessionTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat('ar-DZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

export function StudentHub() {
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
        const sessionsPayload = await fetchJson<RecentPracticeSessionsResponse>(
          `${API_BASE_URL}/qbank/sessions?limit=6`,
          {
            signal: controller.signal,
          },
        );

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

  const activeSession = useMemo(
    () => sessions.find((session) => session.status !== 'COMPLETED') ?? null,
    [sessions],
  );
  const latestSession = sessions[0] ?? null;
  const spotlightSession = activeSession ?? latestSession;

  const heroTitle = activeSession
    ? activeSession.title ?? 'تابع من حيث توقفت'
    : sessions.length > 0
      ? 'اختر خطوتك التالية'
      : 'ابدأ من خطوة واحدة';

  const heroDescription = activeSession
    ? 'من نفس الموضع.'
    : sessions.length > 0
      ? 'موضوع رسمي أو جلسة مخصصة.'
      : 'موضوع رسمي أو جلسة مخصصة.';

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

      {error ? (
        <EmptyState
          title="تعذر تحميل مساحة الطالب"
          description="حاول إعادة تحميل الصفحة حتى نعيد جلب آخر الجلسات والمسارات المتاحة لك."
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
        <div className="hub-page">
          <section className="hub-spotlight">
            <div className="hub-spotlight-copy">
              <p className="page-kicker">BAC Bank</p>
              <h1>{heroTitle}</h1>
              <p>{heroDescription}</p>
            </div>

            {spotlightSession ? (
              <div className="hub-spotlight-meta">
                <StudyBadge tone={statusTones[spotlightSession.status]}>
                  {statusLabels[spotlightSession.status]}
                </StudyBadge>
                <span>{formatSessionTimestamp(spotlightSession.createdAt)}</span>
              </div>
            ) : null}

            <div className="hub-spotlight-actions">
              <Link
                href={
                  activeSession
                    ? `/app/sessions/${activeSession.id}`
                    : '/app/sessions/new'
                }
                className="btn-primary"
              >
                {activeSession ? 'متابعة الجلسة' : 'ابدأ جلسة مخصصة'}
              </Link>
              <Link href="/app/browse" className="btn-secondary">
                تصفح المواضيع الرسمية
              </Link>
            </div>
          </section>

          <div className="hub-path-grid">
            <Link href="/app/browse" className="hub-path-card">
              <span className="hub-path-mark" aria-hidden="true" />
              <div>
                <p className="feature-kicker">تصفح</p>
                <h2>المواضيع الرسمية</h2>
                <p>شعبة · مادة · سنة</p>
              </div>
            </Link>

            <Link href="/app/sessions/new" className="hub-path-card secondary">
              <span className="hub-path-mark" aria-hidden="true" />
              <div>
                <p className="feature-kicker">جلسة</p>
                <h2>جلسة مخصصة</h2>
                <p>محاور · سنوات · حجم</p>
              </div>
            </Link>
          </div>

          <section className="hub-activity-section">
            <div className="hub-activity-head">
              <h2>آخر الجلسات</h2>
              <Link href="/app/sessions/new" className="btn-secondary">
                جلسة جديدة
              </Link>
            </div>

            {sessions.length === 0 ? (
              <EmptyState
                title="لا توجد جلسات بعد"
                description="ابدأ أول جلسة."
                action={
                  <Link href="/app/sessions/new" className="btn-primary">
                    إنشاء جلسة
                  </Link>
                }
              />
            ) : (
              <div className="hub-activity-list">
                {sessions.map((session) => (
                  <article key={session.id} className="hub-activity-card">
                    <div className="hub-activity-top">
                      <div className="hub-activity-copy">
                        <h3>{session.title ?? 'جلسة تدريب مخصصة'}</h3>
                        <small>{formatSessionTimestamp(session.createdAt)}</small>
                      </div>
                      <StudyBadge tone={statusTones[session.status]}>
                        {statusLabels[session.status]}
                      </StudyBadge>
                    </div>

                    <div className="hub-activity-foot">
                      <div className="hub-activity-meta">
                        <span>{session.exerciseCount} تمارين جاهزة داخل الجلسة</span>
                      </div>
                      <Link
                        href={`/app/sessions/${session.id}`}
                        className="btn-secondary"
                      >
                        فتح الجلسة
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </StudyShell>
  );
}
