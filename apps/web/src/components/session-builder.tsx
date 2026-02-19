'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type StreamOption = {
  code: string;
  name: string;
  subjectCodes: string[];
};

type SubjectOption = {
  code: string;
  name: string;
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

type CreateSessionResponse = {
  id: string;
};

type SessionPreviewResponse = {
  matchingExerciseCount: number;
  maxSelectableExercises: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

const sessionTypeLabels: Record<'NORMAL' | 'MAKEUP', string> = {
  NORMAL: 'دورة عادية',
  MAKEUP: 'دورة استدراكية',
};

function toggleInList<T>(items: T[], value: T): T[] {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

export function SessionBuilder() {
  const router = useRouter();

  const [filters, setFilters] = useState<FiltersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [streamCode, setStreamCode] = useState('');
  const [years, setYears] = useState<number[]>([]);
  const [topicCodes, setTopicCodes] = useState<string[]>([]);
  const [sessionTypes, setSessionTypes] = useState<Array<'NORMAL' | 'MAKEUP'>>([]);
  const [exerciseCount, setExerciseCount] = useState(6);
  const [matchingExerciseCount, setMatchingExerciseCount] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadFilters() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/qbank/filters`, {
          signal: abortController.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load filters.');
        }

        const payload = (await response.json()) as FiltersResponse;
        setFilters(payload);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('تعذر تحميل خيارات بناء الجلسة.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadFilters();

    return () => {
      abortController.abort();
    };
  }, []);

  const availableStreams = useMemo(() => {
    if (!filters || !subjectCode) {
      return [];
    }

    return filters.streams.filter((stream) =>
      stream.subjectCodes.includes(subjectCode),
    );
  }, [filters, subjectCode]);

  const availableTopics = useMemo(() => {
    if (!filters || !subjectCode) {
      return [];
    }

    return filters.topics.filter((topic) => {
      if (topic.subject.code !== subjectCode) {
        return false;
      }

      if (!streamCode) {
        return true;
      }

      return topic.streamCodes.includes(streamCode);
    });
  }, [filters, subjectCode, streamCode]);

  useEffect(() => {
    if (!subjectCode) {
      setStreamCode('');
      setYears([]);
      setTopicCodes([]);
      setMatchingExerciseCount(0);
      return;
    }

    const streamStillValid = availableStreams.some(
      (stream) => stream.code === streamCode,
    );

    if (!streamStillValid) {
      setStreamCode('');
    }
  }, [subjectCode, streamCode, availableStreams]);

  useEffect(() => {
    setTopicCodes((current) =>
      current.filter((code) => availableTopics.some((topic) => topic.code === code)),
    );
  }, [availableTopics]);

  useEffect(() => {
    if (!subjectCode) {
      return;
    }

    const abortController = new AbortController();
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/qbank/sessions/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
          body: JSON.stringify({
            subjectCode,
            streamCode: streamCode || undefined,
            years,
            topicCodes,
            sessionTypes,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { message?: string | string[] }
            | null;

          const message = Array.isArray(payload?.message)
            ? payload.message.join(' · ')
            : payload?.message;

          throw new Error(message || 'تعذر حساب عدد التمارين المطابقة.');
        }

        const payload = (await response.json()) as SessionPreviewResponse;
        setMatchingExerciseCount(payload.matchingExerciseCount);
      } catch (previewError) {
        if (!(previewError instanceof Error) || previewError.name !== 'AbortError') {
          setMatchingExerciseCount(0);
          setError(
            previewError instanceof Error
              ? previewError.message
              : 'تعذر حساب عدد التمارين المطابقة.',
          );
        }
      } finally {
        setPreviewLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [subjectCode, streamCode, years, topicCodes, sessionTypes]);

  const maxExerciseCount = useMemo(
    () => Math.max(1, Math.min(20, matchingExerciseCount || 20)),
    [matchingExerciseCount],
  );

  useEffect(() => {
    if (exerciseCount > maxExerciseCount) {
      setExerciseCount(maxExerciseCount);
    }
  }, [exerciseCount, maxExerciseCount]);

  async function handleCreateSession() {
    if (!filters || creating || !subjectCode) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/qbank/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || undefined,
          exerciseCount,
          subjectCode,
          streamCode: streamCode || undefined,
          years,
          topicCodes,
          sessionTypes,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string | string[] }
          | null;

        const message = Array.isArray(payload?.message)
          ? payload?.message.join(' · ')
          : payload?.message;

        throw new Error(message || 'تعذر إنشاء الجلسة.');
      }

      const payload = (await response.json()) as CreateSessionResponse;
      router.push(`/app/sessions/${payload.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'حدث خطأ أثناء إنشاء الجلسة.',
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="builder-shell">
      <header className="session-topbar">
        <div>
          <p className="hero-kicker">Session Builder</p>
          <h1>جلسة مادة واحدة</h1>
        </div>
        <div className="topbar-actions">
          <Link href="/app" className="btn-secondary">
            رجوع
          </Link>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreateSession}
            disabled={creating || loading || !subjectCode || !matchingExerciseCount}
          >
            {creating ? 'جاري الإنشاء...' : 'إنشاء الجلسة'}
          </button>
        </div>
      </header>

      <section className="builder-grid">
        <article className="builder-card wide">
          <h2>1) اختر المادة</h2>
          <div className="checkbox-grid">
            {(filters?.subjects ?? []).map((subject) => (
              <label key={subject.code} className="option-chip">
                <input
                  type="radio"
                  name="subject"
                  checked={subjectCode === subject.code}
                  onChange={() => setSubjectCode(subject.code)}
                />
                <span>{subject.name}</span>
              </label>
            ))}
          </div>
        </article>

        <article className="builder-card">
          <h2>2) الشعبة</h2>
          <div className="session-type-row">
            <button
              type="button"
              className={streamCode ? 'pill' : 'pill active'}
              disabled={!subjectCode}
              onClick={() => setStreamCode('')}
            >
              كل الشعب
            </button>
            {availableStreams.map((stream) => (
              <button
                key={stream.code}
                type="button"
                className={streamCode === stream.code ? 'pill active' : 'pill'}
                disabled={!subjectCode}
                onClick={() => setStreamCode(stream.code)}
              >
                {stream.name}
              </button>
            ))}
          </div>
        </article>

        <article className="builder-card">
          <h2>3) السنوات (2008-2025)</h2>
          <div className="checkbox-grid compact">
            {(filters?.years ?? []).map((year) => (
              <label key={year} className="option-chip">
                <input
                  type="checkbox"
                  disabled={!subjectCode}
                  checked={years.includes(year)}
                  onChange={() => setYears((current) => toggleInList(current, year))}
                />
                <span>{year}</span>
              </label>
            ))}
          </div>
        </article>

        <article className="builder-card wide">
          <h2>4) المحاور</h2>
          <div className="checkbox-grid">
            {availableTopics.map((topic) => (
              <label key={topic.code} className="option-chip">
                <input
                  type="checkbox"
                  disabled={!subjectCode}
                  checked={topicCodes.includes(topic.code)}
                  onChange={() =>
                    setTopicCodes((current) => toggleInList(current, topic.code))
                  }
                />
                <span>{topic.name}</span>
              </label>
            ))}
          </div>
        </article>

        <article className="builder-card">
          <h2>5) نوع الدورة (اختياري)</h2>
          <div className="session-type-row">
            {(filters?.sessionTypes ?? []).map((type) => (
              <button
                key={type}
                type="button"
                className={sessionTypes.includes(type) ? 'pill active' : 'pill'}
                disabled={!subjectCode}
                onClick={() =>
                  setSessionTypes((current) => toggleInList(current, type))
                }
              >
                {sessionTypeLabels[type]}
              </button>
            ))}
          </div>
        </article>

        <article className="builder-card">
          <h2>6) حجم الجلسة</h2>

          <label className="input-row">
            <span>عنوان الجلسة (اختياري)</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: مراجعة نهائية - رياضيات"
            />
          </label>

          <label className="input-row">
            <span>عدد التمارين</span>
            <input
              type="range"
              min={1}
              max={maxExerciseCount}
              value={exerciseCount}
              disabled={!subjectCode || !matchingExerciseCount}
              onChange={(event) => setExerciseCount(Number(event.target.value))}
            />
            <strong>{exerciseCount} تمارين</strong>
          </label>
        </article>
      </section>

      <footer className="builder-footer">
        <div className="selection-summary">
          <p>المادة: {subjectCode || 'غير محددة'}</p>
          <p>الشعبة: {streamCode || 'كل الشعب'}</p>
          <p>السنوات: {years.length || 'الكل'}</p>
          <p>المحاور: {topicCodes.length || 'الكل'}</p>
          <p>
            التمارين المطابقة: {previewLoading ? '...' : matchingExerciseCount}
          </p>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </footer>
    </main>
  );
}
