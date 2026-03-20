'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
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
        label: 'الشعب',
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

  return (
    <main className="app-shell">
      <AppNavbar />

      <section className="dashboard-hero">
        <div>
          <p className="page-kicker">Student Home</p>
          <h1>منصة مراجعة البكالوريا</h1>
          <p>
            واجهة بسيطة ومركزة: تصفح كل sujets أو أنشئ جلسة دراسة ذكية من التمارين
            التي تناسبك.
          </p>
        </div>
        <div className="metric-grid">
          {metrics.map((metric) => (
            <article key={metric.label} className="metric-card">
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>ابدأ بسرعة</h2>
        <div className="quick-actions-grid">
          <Link href="/app/browse" className="feature-action">
            <p className="feature-kicker">Browse</p>
            <h3>Browse all BAC sujets</h3>
            <span>
              مسار خطوة بخطوة: الشعبة → المادة → السنة → Sujet 1 / Sujet 2.
            </span>
          </Link>

          <Link href="/app/sessions/new" className="feature-action">
            <p className="feature-kicker">Study Session</p>
            <h3>Create a study session</h3>
            <span>اختر المادة والمحاور ثم ابن جلسة مراجعة مباشرة.</span>
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>آخر الجلسات</h2>

        {loading ? <p>جاري تحميل الجلسات...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error && sessions.length === 0 ? (
          <div className="empty-block">
            <p>لا توجد جلسات حالياً. أنشئ أول جلسة دراسة.</p>
            <Link href="/app/sessions/new" className="btn-primary">
              إنشاء جلسة
            </Link>
          </div>
        ) : null}

        {!loading && !error && sessions.length > 0 ? (
          <div className="session-cards">
            {sessions.map((session) => (
              <article key={session.id} className="session-mini-card">
                <header>
                  <span>{statusLabels[session.status]}</span>
                  <small>
                    {new Intl.DateTimeFormat('ar-DZ', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(session.createdAt))}
                  </small>
                </header>
                <h3>{session.title ?? 'جلسة مراجعة'}</h3>
                <p>
                  {session.exerciseCount} / {session.requestedExerciseCount} تمارين
                </p>
                <Link href={`/app/sessions/${session.id}`} className="btn-secondary">
                  متابعة
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
