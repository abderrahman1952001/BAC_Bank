'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type StreamOption = {
  code: string;
  name: string;
  subjectCodes: string[];
};

type SubjectOption = {
  code: string;
  name: string;
  streams: Array<{
    code: string;
    name: string;
  }>;
  streamCodes: string[];
};

type TopicOption = {
  code: string;
  name: string;
  subject: {
    code: string;
    name: string;
  };
  streamCodes: string[];
};

type FiltersResponse = {
  streams: StreamOption[];
  subjects: SubjectOption[];
  years: number[];
  topics: TopicOption[];
  sessionTypes: Array<'NORMAL' | 'MAKEUP'>;
};

type RecentPracticeSessionsResponse = {
  data: Array<{
    id: string;
    title: string | null;
    status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED';
    requestedExerciseCount: number;
    exerciseCount: number;
    createdAt: string;
  }>;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

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
    const abortController = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [filtersResponse, sessionsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/qbank/filters`, {
            signal: abortController.signal,
            cache: 'no-store',
          }),
          fetch(`${API_BASE_URL}/qbank/sessions?limit=8`, {
            signal: abortController.signal,
            cache: 'no-store',
          }),
        ]);

        if (!filtersResponse.ok || !sessionsResponse.ok) {
          throw new Error('Failed to load dashboard data.');
        }

        const filtersPayload = (await filtersResponse.json()) as FiltersResponse;
        const sessionsPayload =
          (await sessionsResponse.json()) as RecentPracticeSessionsResponse;

        setFilters(filtersPayload);
        setSessions(sessionsPayload.data);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('تعذر تحميل بيانات الصفحة الرئيسية.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      abortController.abort();
    };
  }, []);

  const highlights = useMemo(
    () => [
      {
        label: 'سنوات منشورة',
        value: String(filters?.years.length ?? 0),
      },
      {
        label: 'مواد فريدة',
        value: String(filters?.subjects.length ?? 0),
      },
      {
        label: 'محاور متاحة',
        value: String(filters?.topics.length ?? 0),
      },
      {
        label: 'شعب مدعومة',
        value: String(filters?.streams.length ?? 0),
      },
    ],
    [filters],
  );

  return (
    <main className="studio-shell">
      <header className="studio-nav">
        <div className="brand-block">
          <span className="brand-mark">BAC</span>
          <div>
            <p className="brand-name">BAC Bank</p>
            <p className="brand-tag">Practice Studio</p>
          </div>
        </div>

        <nav className="studio-links">
          <a href="#overview">لوحة التحكم</a>
          <a href="#subjects">المواد</a>
          <a href="#sessions">الجلسات</a>
        </nav>

        <div className="nav-actions">
          <Link href="/app/sessions/new" className="btn-primary">
            + جلسة جديدة
          </Link>
          <Link href="/" className="btn-secondary">
            خروج
          </Link>
        </div>
      </header>

      <section className="studio-hero" id="overview">
        <div className="hero-copy">
          <p className="hero-kicker">لوحة الطالب</p>
          <h1>ابن جلسات مراجعة مخصّصة من أرشيف البكالوريا في دقائق</h1>
          <p>
            اختر مادة واحدة بشكل واقعي، ثم صفِّ السنوات والشعبة والمحاور. المنصة
            تحسب لك عدد التمارين المطابقة مباشرة وتولّد جلسة تفاعلية تعرض التمارين
            واحداً بعد الآخر.
          </p>
          <div className="hero-cta-row">
            <Link href="/app/sessions/new" className="btn-primary">
              ابدأ جلسة الآن
            </Link>
            <Link href="#sessions" className="btn-ghost">
              استئناف آخر جلسة
            </Link>
          </div>
        </div>

        <div className="hero-stats-grid">
          {highlights.map((item) => (
            <article key={item.label} className="stat-tile">
              <span>{item.value}</span>
              <p>{item.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="studio-panel" id="subjects">
        <div className="panel-head">
          <h2>كتالوج المواد</h2>
          <p>قائمة موحدة بدون تكرار، مع ربط كل مادة بالشعب التي تدرسها.</p>
        </div>

        {loading ? <p>جاري تحميل المواد...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error ? (
          <div className="subject-cloud">
            {filters?.subjects.map((subject) => (
              <article key={subject.code} className="subject-pill">
                <h3>{subject.name}</h3>
                <p>{subject.streams.length} شعب</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="studio-panel" id="sessions">
        <div className="panel-head">
          <h2>آخر الجلسات</h2>
          <p>يمكنك الرجوع مباشرة لأي جلسة لمتابعة الحل من نفس النقطة.</p>
        </div>

        {loading ? <p>جاري تحميل الجلسات...</p> : null}

        {!loading && sessions.length === 0 ? (
          <div className="empty-state">
            <p>لا توجد جلسات بعد. أنشئ أول جلسة وابدأ التدريب.</p>
            <Link href="/app/sessions/new" className="btn-primary">
              إنشاء جلسة
            </Link>
          </div>
        ) : null}

        <div className="session-grid">
          {sessions.map((session) => (
            <article key={session.id} className="session-card">
              <header>
                <span className={`session-status status-${session.status.toLowerCase()}`}>
                  {statusLabels[session.status]}
                </span>
                <p>
                  {new Intl.DateTimeFormat('ar-DZ', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(session.createdAt))}
                </p>
              </header>

              <h3>{session.title ?? 'جلسة مراجعة بدون عنوان'}</h3>

              <div className="session-meta">
                <p>تمارين: {session.exerciseCount}</p>
                <p>المطلوب: {session.requestedExerciseCount}</p>
              </div>

              <Link href={`/app/sessions/${session.id}`} className="btn-secondary">
                دخول الجلسة
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
