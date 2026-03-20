'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
import {
  API_BASE_URL,
  CreateSessionResponse,
  fetchJson,
  FiltersResponse,
  formatSessionType,
  SessionPreviewResponse,
  SessionType,
} from '@/lib/qbank';

function toggleInList<T>(items: T[], value: T): T[] {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

export function SessionBuilder() {
  const router = useRouter();

  const [filters, setFilters] = useState<FiltersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [topicCodes, setTopicCodes] = useState<string[]>([]);
  const [streamCode, setStreamCode] = useState('');
  const [years, setYears] = useState<number[]>([]);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [exerciseCount, setExerciseCount] = useState(6);

  const [preview, setPreview] = useState<SessionPreviewResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFilters() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<FiltersResponse>(
          `${API_BASE_URL}/qbank/filters`,
          {
            signal: controller.signal,
          },
        );
        setFilters(payload);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('تعذر تحميل خيارات الدراسة.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadFilters();

    return () => {
      controller.abort();
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
      setTopicCodes([]);
      setYears([]);
      setSessionTypes([]);
      setPreview(null);
      return;
    }

    setStreamCode((current) =>
      current && availableStreams.some((item) => item.code === current)
        ? current
        : '',
    );
  }, [subjectCode, availableStreams]);

  useEffect(() => {
    setTopicCodes((current) =>
      current.filter((topicCode) =>
        availableTopics.some((topic) => topic.code === topicCode),
      ),
    );
  }, [availableTopics]);

  useEffect(() => {
    if (!subjectCode) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<SessionPreviewResponse>(
          `${API_BASE_URL}/qbank/sessions/preview`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              subjectCode,
              topicCodes,
              streamCode: streamCode || undefined,
              years,
              sessionTypes,
            }),
          },
        );

        setPreview(payload);
      } catch (previewError) {
        if (!(previewError instanceof Error) || previewError.name !== 'AbortError') {
          setPreview(null);
          setError(
            previewError instanceof Error
              ? previewError.message
              : 'تعذر جلب sujets المطابقة.',
          );
        }
      } finally {
        setPreviewLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [subjectCode, topicCodes, streamCode, years, sessionTypes]);

  const maxExerciseCount = useMemo(
    () => Math.max(1, Math.min(20, preview?.maxSelectableExercises ?? 20)),
    [preview],
  );

  useEffect(() => {
    if (exerciseCount > maxExerciseCount) {
      setExerciseCount(maxExerciseCount);
    }
  }, [exerciseCount, maxExerciseCount]);

  async function handleCreateSession() {
    if (creating || !subjectCode || !preview?.matchingExerciseCount) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const payload = await fetchJson<CreateSessionResponse>(
        `${API_BASE_URL}/qbank/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title.trim() || undefined,
            subjectCode,
            topicCodes,
            streamCode: streamCode || undefined,
            years,
            sessionTypes,
            exerciseCount,
          }),
        },
      );

      router.push(`/app/sessions/${payload.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'تعذر إنشاء الجلسة.',
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="app-shell">
      <AppNavbar />

      <section className="page-hero">
        <p className="page-kicker">Create Study Session</p>
        <h1>جلسة مراجعة مخصصة</h1>
        <p>
          اختر المادة ثم المحاور، وشاهد جميع sujets المطابقة. بعدها ضيّق النتائج
          بالشعبة والسنوات.
        </p>
      </section>

      <section className="panel">
        <div className="builder-head">
          <div>
            <h2>Session Builder</h2>
            <p className="muted-text">
              الخطوات: مادة → محاور → sujets المطابقة → تضييق النتائج → إنشاء
              الجلسة.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreateSession}
            disabled={!subjectCode || creating || !preview?.matchingExerciseCount}
          >
            {creating ? 'جاري الإنشاء...' : 'إنشاء الجلسة'}
          </button>
        </div>

        {loading ? <p>جاري تحميل خيارات الدراسة...</p> : null}

        <div className="builder-layout">
          <article className="builder-block">
            <h3>1) المادة</h3>
            <div className="chip-grid">
              {(filters?.subjects ?? []).map((subject) => (
                <button
                  key={subject.code}
                  type="button"
                  className={
                    subjectCode === subject.code ? 'choice-chip active' : 'choice-chip'
                  }
                  onClick={() => setSubjectCode(subject.code)}
                >
                  {subject.name}
                </button>
              ))}
            </div>
          </article>

          <article className="builder-block">
            <h3>2) المحاور</h3>
            {!subjectCode ? (
              <p className="muted-text">اختر المادة أولاً لعرض المحاور.</p>
            ) : (
              <div className="chip-grid">
                {availableTopics.map((topic) => (
                  <button
                    key={topic.code}
                    type="button"
                    className={
                      topicCodes.includes(topic.code)
                        ? 'choice-chip active'
                        : 'choice-chip'
                    }
                    onClick={() =>
                      setTopicCodes((current) => toggleInList(current, topic.code))
                    }
                  >
                    {topic.name}
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="builder-block wide">
            <h3>3) sujets المطابقة</h3>
            {!subjectCode ? (
              <p className="muted-text">
                بعد اختيار المادة والمحاور ستظهر كل sujets المتاحة.
              </p>
            ) : (
              <>
                <div className="preview-stats">
                  <p>
                    sujets: <strong>{previewLoading ? '...' : preview?.matchingSujetCount ?? 0}</strong>
                  </p>
                  <p>
                    تمارين مطابقة:{' '}
                    <strong>{previewLoading ? '...' : preview?.matchingExerciseCount ?? 0}</strong>
                  </p>
                </div>

                <div className="sujet-preview-grid">
                  {(preview?.matchingSujets ?? []).map((sujet) => (
                    <article
                      key={`${sujet.examId}:${sujet.sujetNumber}:${sujet.stream.code}`}
                      className="sujet-preview-card"
                    >
                      <h4>
                        {sujet.year} · {sujet.sujetLabel}
                      </h4>
                      <p>{sujet.stream.name}</p>
                      <p>{formatSessionType(sujet.sessionType)}</p>
                      <span>{sujet.matchingExerciseCount} تمرين مطابق</span>
                    </article>
                  ))}
                </div>
              </>
            )}
          </article>

          <article className="builder-block">
            <h3>4) تضييق النتائج</h3>
            <div className="filter-row">
              <p>الشعبة</p>
              <div className="chip-grid">
                <button
                  type="button"
                  className={!streamCode ? 'choice-chip active' : 'choice-chip'}
                  onClick={() => setStreamCode('')}
                  disabled={!subjectCode}
                >
                  كل الشعب
                </button>
                {availableStreams.map((stream) => (
                  <button
                    key={stream.code}
                    type="button"
                    className={
                      streamCode === stream.code ? 'choice-chip active' : 'choice-chip'
                    }
                    onClick={() => setStreamCode(stream.code)}
                    disabled={!subjectCode}
                  >
                    {stream.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-row">
              <p>السنوات</p>
              <div className="chip-grid">
                {(filters?.years ?? []).map((year) => (
                  <button
                    key={year}
                    type="button"
                    className={
                      years.includes(year) ? 'choice-chip active' : 'choice-chip'
                    }
                    onClick={() => setYears((current) => toggleInList(current, year))}
                    disabled={!subjectCode}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-row">
              <p>نوع الدورة</p>
              <div className="chip-grid">
                {(filters?.sessionTypes ?? []).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={
                      sessionTypes.includes(type)
                        ? 'choice-chip active'
                        : 'choice-chip'
                    }
                    onClick={() =>
                      setSessionTypes((current) => toggleInList(current, type))
                    }
                    disabled={!subjectCode}
                  >
                    {formatSessionType(type)}
                  </button>
                ))}
              </div>
            </div>
          </article>

          <article className="builder-block">
            <h3>5) إعدادات الجلسة</h3>
            <label className="field">
              <span>عنوان الجلسة (اختياري)</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="مثال: مراجعة نهاية الأسبوع"
              />
            </label>

            <label className="field">
              <span>عدد التمارين</span>
              <input
                type="range"
                min={1}
                max={maxExerciseCount}
                value={exerciseCount}
                disabled={!subjectCode || !preview?.matchingExerciseCount}
                onChange={(event) => setExerciseCount(Number(event.target.value))}
              />
              <strong>{exerciseCount} تمارين</strong>
            </label>
          </article>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
