'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
import {
  EmptyState,
  SessionBuilderSkeleton,
  SessionPreviewSkeleton,
  StudyHeader,
  StudyShell,
} from '@/components/study-shell';
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

function buildYearsFromRange(
  allYears: number[],
  mode: '3' | '5' | '8' | 'all' | 'custom',
  startYear: number | null,
  endYear: number | null,
) {
  if (!allYears.length) {
    return [];
  }

  if (mode === 'all') {
    return allYears;
  }

  if (mode === 'custom') {
    if (!startYear || !endYear) {
      return [];
    }

    const minYear = Math.min(startYear, endYear);
    const maxYear = Math.max(startYear, endYear);

    return allYears.filter((year) => year >= minYear && year <= maxYear);
  }

  const take = Number(mode);
  return allYears.slice(0, take);
}

const SESSION_BUILDER_STORAGE_KEY = 'bac-bank:session-builder:v2';

type StoredSessionBuilderPreferences = {
  subjectCode?: string;
  topicCodes?: string[];
  streamCode?: string;
  yearMode?: '3' | '5' | '8' | 'all' | 'custom';
  yearStart?: number | null;
  yearEnd?: number | null;
  sessionTypes?: SessionType[];
  exerciseCount?: number;
};

export function SessionBuilder() {
  const router = useRouter();

  const [filters, setFilters] = useState<FiltersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [topicCodes, setTopicCodes] = useState<string[]>([]);
  const [streamCode, setStreamCode] = useState('');
  const [yearMode, setYearMode] = useState<'3' | '5' | '8' | 'all' | 'custom'>(
    '5',
  );
  const [yearStart, setYearStart] = useState<number | null>(null);
  const [yearEnd, setYearEnd] = useState<number | null>(null);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [exerciseCount, setExerciseCount] = useState(6);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [preview, setPreview] = useState<SessionPreviewResponse | null>(null);
  const [preferencesReady, setPreferencesReady] = useState(false);

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
        setYearStart(payload.years[payload.years.length - 1] ?? null);
        setYearEnd(payload.years[0] ?? null);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('تعذر تحميل خيارات الجلسة.');
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

  useEffect(() => {
    if (loading || !filters || preferencesReady || typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(SESSION_BUILDER_STORAGE_KEY);

      if (!raw) {
        return;
      }

      const saved = JSON.parse(raw) as StoredSessionBuilderPreferences;

      if (
        saved.subjectCode &&
        filters.subjects.some((subject) => subject.code === saved.subjectCode)
      ) {
        setSubjectCode(saved.subjectCode);
      }

      if (Array.isArray(saved.topicCodes)) {
        setTopicCodes(saved.topicCodes);
      }

      if (typeof saved.streamCode === 'string') {
        setStreamCode(saved.streamCode);
      }

      if (
        saved.yearMode &&
        ['3', '5', '8', 'all', 'custom'].includes(saved.yearMode)
      ) {
        setYearMode(saved.yearMode);
      }

      if (typeof saved.yearStart === 'number') {
        setYearStart(saved.yearStart);
      }

      if (typeof saved.yearEnd === 'number') {
        setYearEnd(saved.yearEnd);
      }

      if (Array.isArray(saved.sessionTypes)) {
        setSessionTypes(
          saved.sessionTypes.filter((type) => filters.sessionTypes.includes(type)),
        );
      }

      if (typeof saved.exerciseCount === 'number') {
        setExerciseCount(saved.exerciseCount);
      }
    } catch {
      return;
    } finally {
      setPreferencesReady(true);
    }
  }, [filters, loading, preferencesReady]);

  const selectedSubject = useMemo(
    () => filters?.subjects.find((subject) => subject.code === subjectCode) ?? null,
    [filters, subjectCode],
  );

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
      setPreview(null);
      return;
    }

    setStreamCode((current) =>
      current && availableStreams.some((stream) => stream.code === current)
        ? current
        : '',
    );
  }, [availableStreams, subjectCode]);

  useEffect(() => {
    setTopicCodes((current) =>
      current.filter((topicCode) =>
        availableTopics.some((topic) => topic.code === topicCode),
      ),
    );
  }, [availableTopics]);

  const selectedYears = useMemo(
    () =>
      buildYearsFromRange(
        filters?.years ?? [],
        yearMode,
        yearStart,
        yearEnd,
      ),
    [filters?.years, yearEnd, yearMode, yearStart],
  );

  useEffect(() => {
    if (!subjectCode) {
      setPreview(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
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
              years: selectedYears,
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
              : 'تعذر بناء معاينة الجلسة.',
          );
        }
      } finally {
        setPreviewLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selectedYears, sessionTypes, streamCode, subjectCode, topicCodes]);

  const maxExerciseCount = useMemo(
    () => Math.max(1, Math.min(20, preview?.maxSelectableExercises ?? 20)),
    [preview],
  );

  useEffect(() => {
    if (exerciseCount > maxExerciseCount) {
      setExerciseCount(maxExerciseCount);
    }
  }, [exerciseCount, maxExerciseCount]);

  useEffect(() => {
    if (!preferencesReady || loading || typeof window === 'undefined') {
      return;
    }

    const snapshot: StoredSessionBuilderPreferences = {
      subjectCode: subjectCode || undefined,
      topicCodes,
      streamCode: streamCode || undefined,
      yearMode,
      yearStart,
      yearEnd,
      sessionTypes,
      exerciseCount,
    };

    window.localStorage.setItem(
      SESSION_BUILDER_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
  }, [
    exerciseCount,
    loading,
    preferencesReady,
    sessionTypes,
    streamCode,
    subjectCode,
    topicCodes,
    yearEnd,
    yearMode,
    yearStart,
  ]);

  const summaryText = useMemo(() => {
    if (!selectedSubject) {
      return 'ابدأ بالمادة، ثم حدد المحور الذي تريد تدريبه.';
    }

    const parts = [`تدريب موجّه في ${selectedSubject.name}`];

    if (topicCodes.length) {
      if (topicCodes.length === 1) {
        const topic = availableTopics.find((item) => item.code === topicCodes[0]);
        parts.push(topic?.name ?? 'محور واحد');
      } else {
        parts.push(`${topicCodes.length} محاور`);
      }
    } else {
      parts.push('كل محاور المادة');
    }

    if (streamCode) {
      const stream = availableStreams.find((item) => item.code === streamCode);
      if (stream) {
        parts.push(`شعبة ${stream.name}`);
      }
    } else {
      parts.push('كل الشعب المتاحة');
    }

    if (selectedYears.length) {
      parts.push(
        selectedYears.length === 1
          ? `سنة ${selectedYears[0]}`
          : `بين ${selectedYears[selectedYears.length - 1]} و ${selectedYears[0]}`,
      );
    }

    return parts.join(' · ');
  }, [
    availableStreams,
    availableTopics,
    selectedSubject,
    selectedYears,
    streamCode,
    topicCodes,
  ]);
  const planText = useMemo(() => {
    if (!selectedSubject) {
      return 'الجلسة ستتكوّن هنا بصياغة واضحة بعد اختيار المادة والمحاور.';
    }

    const topicLabel =
      topicCodes.length === 0
        ? 'كل محاور المادة'
        : topicCodes.length === 1
          ? availableTopics.find((item) => item.code === topicCodes[0])?.name ??
            'محور واحد'
          : `${topicCodes.length} محاور`;
    const streamLabel = streamCode
      ? availableStreams.find((item) => item.code === streamCode)?.name ??
        'الشعبة المحددة'
      : 'كل الشعب المتاحة';
    const yearsLabel = selectedYears.length
      ? selectedYears.length === 1
        ? `سنة ${selectedYears[0]}`
        : `بين ${selectedYears[selectedYears.length - 1]} و ${selectedYears[0]}`
      : 'آخر السنوات المتاحة';
    const plannedExerciseCount = Math.min(
      exerciseCount,
      preview?.matchingExerciseCount ?? exerciseCount,
    );

    return `هذه الجلسة ستسحب ${plannedExerciseCount} تمارين من ${topicLabel} في ${selectedSubject.name} ضمن ${streamLabel} ${yearsLabel}.`;
  }, [
    availableStreams,
    availableTopics,
    exerciseCount,
    preview?.matchingExerciseCount,
    selectedSubject,
    selectedYears,
    streamCode,
    topicCodes,
  ]);
  const zeroResultsGuidance = useMemo(() => {
    if (!subjectCode || previewLoading || preview?.matchingExerciseCount) {
      return null;
    }

    if (topicCodes.length) {
      return {
        title: 'لا توجد تمارين بهذه المحاور',
        description:
          'المحاور المختارة ضيقة أكثر من اللازم. افتح كل المحاور أو اترك محوراً واحداً فقط.',
        actionLabel: 'فتح كل المحاور',
        action: () => setTopicCodes([]),
      };
    }

    if (streamCode) {
      return {
        title: 'لا توجد نتائج لهذه الشعبة',
        description:
          'جرّب فتح التمرين على كل الشعب أولاً، ثم أعد تضييق النطاق إذا لزم الأمر.',
        actionLabel: 'كل الشعب',
        action: () => setStreamCode(''),
      };
    }

    if (sessionTypes.length) {
      return {
        title: 'نوع الدورة ضيق النتائج',
        description:
          'ألغِ تقييد الدورة الحالية إذا كنت تريد عدداً أكبر من التمارين المطابقة.',
        actionLabel: 'كل الدورات',
        action: () => setSessionTypes([]),
      };
    }

    if (
      filters?.years.length &&
      (yearMode !== 'all' || selectedYears.length < filters.years.length)
    ) {
      return {
        title: 'الفترة الزمنية ضيقة',
        description:
          'وسّع مجال السنوات حتى تظهر تمارين أكثر مطابقة لنفس الهدف.',
        actionLabel: 'كل السنوات',
        action: () => setYearMode('all'),
      };
    }

    return {
      title: 'لا توجد نتائج حالياً',
      description:
        'غيّر المادة أو ابدأ بمعاينة أوسع ثم ضيّق التمرين تدريجياً حتى تصل إلى النطاق المناسب.',
      actionLabel: null,
      action: null,
    };
  }, [
    filters?.years.length,
    preview?.matchingExerciseCount,
    previewLoading,
    sessionTypes.length,
    selectedYears.length,
    streamCode,
    subjectCode,
    topicCodes.length,
    yearMode,
  ]);

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
            years: selectedYears,
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
    <StudyShell>
      <AppNavbar />

      <StudyHeader
        eyebrow="جلسة مخصصة"
        title="ابن جلسة تدريب مركزة حول محور واضح"
        subtitle="هذه الأداة مخصصة لتدريب موجّه على موضوع أو عدة محاور داخل مادة واحدة. ابدأ ببساطة، ثم ضيّق النطاق فقط عند الحاجة."
        meta={[
          { label: 'الخطة', value: summaryText },
          {
            label: 'الحجم',
            value: `${exerciseCount} تمارين`,
          },
        ]}
      />

      {error && !filters ? (
        <EmptyState
          title="تعذر تحميل منشئ الجلسات"
          description={error}
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
      ) : null}

      {error && filters ? <p className="error-text">{error}</p> : null}

      {loading && !filters ? <SessionBuilderSkeleton /> : null}

      {filters ? (
        <div className="builder-workspace">
        <section className="builder-form-panel">
          <div className="builder-section">
            <div className="builder-section-head">
              <h2>1. المادة</h2>
              <p>حدد المادة التي تريد التدريب عليها الآن.</p>
            </div>
            <div className="chip-grid">
              {(filters?.subjects ?? []).map((subject) => (
                <button
                  key={subject.code}
                  type="button"
                  className={
                    subjectCode === subject.code ? 'choice-chip active' : 'choice-chip'
                  }
                  onClick={() => setSubjectCode(subject.code)}
                  disabled={loading}
                >
                  {subject.name}
                </button>
              ))}
            </div>
          </div>

          <div className="builder-section">
            <div className="builder-section-head">
              <h2>2. المحاور</h2>
              <p>اختر محوراً واحداً أو عدة محاور. ويمكنك تركها مفتوحة إذا أردت تدريباً أوسع داخل المادة.</p>
            </div>

            {!subjectCode ? (
              <EmptyState
                title="لا توجد محاور بعد"
                description="اختر المادة أولاً حتى نعرض لك المحاور المطابقة."
              />
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
          </div>

          <div className="builder-grid-two">
            <div className="builder-section">
              <div className="builder-section-head">
                <h2>3. الشعبة</h2>
                <p>اختيار اختياري. اتركها مفتوحة إذا كان هدفك تدريباً أوسع.</p>
              </div>
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
                  >
                    {stream.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="builder-section">
              <div className="builder-section-head">
                <h2>4. الفترة الزمنية</h2>
                <p>اختر آخر السنوات أو وسّع المجال يدوياً إذا لزم الأمر.</p>
              </div>

              <div className="chip-grid">
                {[
                  { value: '3', label: 'آخر 3 سنوات' },
                  { value: '5', label: 'آخر 5 سنوات' },
                  { value: '8', label: 'آخر 8 سنوات' },
                  { value: 'all', label: 'كل السنوات' },
                  { value: 'custom', label: 'مجال مخصص' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      yearMode === option.value ? 'choice-chip active' : 'choice-chip'
                    }
                    onClick={() =>
                      setYearMode(
                        option.value as '3' | '5' | '8' | 'all' | 'custom',
                      )
                    }
                    disabled={!subjectCode}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {yearMode === 'custom' && filters?.years.length ? (
                <div className="builder-year-range">
                  <label className="field">
                    <span>من</span>
                    <select
                      value={yearStart ?? ''}
                      onChange={(event) =>
                        setYearStart(Number(event.target.value) || null)
                      }
                    >
                      {filters.years
                        .slice()
                        .sort((a, b) => a - b)
                        .map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>إلى</span>
                    <select
                      value={yearEnd ?? ''}
                      onChange={(event) =>
                        setYearEnd(Number(event.target.value) || null)
                      }
                    >
                      {filters.years
                        .slice()
                        .sort((a, b) => b - a)
                        .map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          <div className="builder-section">
            <div className="builder-section-head">
              <h2>5. عدد التمارين</h2>
              <p>اختر عدد التمارين التي تريدها داخل الجلسة.</p>
            </div>
            <div className="chip-grid">
              {[4, 6, 8, 10, 12].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={
                    exerciseCount === count ? 'choice-chip active' : 'choice-chip'
                  }
                  onClick={() => setExerciseCount(Math.min(count, maxExerciseCount))}
                  disabled={count > maxExerciseCount}
                >
                  {count} تمارين
                </button>
              ))}
            </div>
          </div>

          <div className="builder-section">
            <button
              type="button"
              className="builder-advanced-toggle"
              onClick={() => setAdvancedOpen((current) => !current)}
            >
              <span>خيارات ثانوية</span>
              <strong>{advancedOpen ? 'إخفاء' : 'إظهار'}</strong>
            </button>

            {advancedOpen ? (
              <div className="builder-advanced-grid">
                <div className="builder-subsection">
                  <h3>نوع الدورة</h3>
                  <div className="chip-grid">
                    {filters?.sessionTypes.map((type) => (
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
                      >
                        {formatSessionType(type)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="builder-subsection">
                  <h3>اسم الجلسة</h3>
                  <label className="field">
                    <span>اختياري</span>
                    <input
                      type="text"
                      placeholder="مثال: تدريب الدوال قبل الفرض"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="builder-preview-panel">
          <div className="builder-preview-sticky">
            <div className="builder-preview-head">
              <div>
                <h2>المعاينة</h2>
                <p>اعرف بالضبط ما الذي ستنشئه قبل الضغط على زر البداية.</p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateSession}
                disabled={!subjectCode || creating || !preview?.matchingExerciseCount}
              >
                {creating ? 'جاري الإنشاء...' : 'ابدأ الجلسة'}
              </button>
            </div>

            {loading ? <SessionPreviewSkeleton /> : null}

            {!loading && !subjectCode ? (
              <EmptyState
                title="المعاينة بانتظارك"
                description="ابدأ بالمادة حتى نبني لك معاينة فعلية لعدد التمارين والمواضيع المطابقة."
              />
            ) : null}

            {!loading && subjectCode ? (
              <div className="builder-preview-stack">
                <section className="builder-preview-card builder-preview-summary-card">
                  <h3>ملخص سريع</h3>
                  <p>{planText}</p>
                </section>

                <div className="builder-stat-grid">
                  <article>
                    <strong>
                      {previewLoading ? '...' : preview?.matchingExerciseCount ?? 0}
                    </strong>
                    <span>تمارين مطابقة</span>
                  </article>
                  <article>
                    <strong>
                      {previewLoading ? '...' : preview?.matchingSujetCount ?? 0}
                    </strong>
                    <span>مواضيع متاحة</span>
                  </article>
                  <article>
                    <strong>{selectedYears.length || '...'}</strong>
                    <span>سنوات في النطاق</span>
                  </article>
                </div>

                {previewLoading && !preview ? <SessionPreviewSkeleton /> : null}

                {zeroResultsGuidance ? (
                  <EmptyState
                    title={zeroResultsGuidance.title}
                    description={zeroResultsGuidance.description}
                    action={
                      zeroResultsGuidance.actionLabel && zeroResultsGuidance.action ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={zeroResultsGuidance.action}
                        >
                          {zeroResultsGuidance.actionLabel}
                        </button>
                      ) : undefined
                    }
                  />
                ) : null}

                {preview && preview.matchingExerciseCount > 0 ? (
                  <>
                    <section className="builder-preview-card">
                      <h3>عينة من التمارين المطابقة</h3>
                      <div className="builder-preview-exercises">
                        {preview.sampleExercises.map((exercise) => (
                          <article
                            key={`${exercise.exerciseNodeId}:${exercise.examId}`}
                            className="builder-preview-exercise"
                          >
                            <div>
                              <strong>
                                {exercise.year} · {exercise.sujetLabel} · التمرين{' '}
                                {exercise.orderIndex}
                              </strong>
                              <p>
                                {exercise.stream.name} ·{' '}
                                {formatSessionType(exercise.sessionType)}
                              </p>
                            </div>
                            <span>
                              {exercise.questionCount} أسئلة
                              {exercise.title ? ` · ${exercise.title}` : ''}
                            </span>
                          </article>
                        ))}
                      </div>
                    </section>

                    <section className="builder-preview-card">
                      <h3>توزيع السنوات</h3>
                      <div className="preview-distribution-list">
                        {preview.yearsDistribution.map((item) => (
                          <div key={item.year} className="preview-distribution-row">
                            <div>
                              <strong>{item.year}</strong>
                              <span>{item.matchingExerciseCount} تمرين</span>
                            </div>
                            <div className="preview-bar">
                              <span
                                style={{
                                  width: `${Math.max(
                                    10,
                                    (item.matchingExerciseCount /
                                      Math.max(preview.matchingExerciseCount, 1)) *
                                      100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {preview.streamsDistribution.length > 1 ? (
                      <section className="builder-preview-card">
                        <h3>توزيع الشعب</h3>
                        <div className="preview-distribution-list">
                          {preview.streamsDistribution.map((item) => (
                            <div
                              key={item.stream.code}
                              className="preview-distribution-row"
                            >
                              <div>
                                <strong>{item.stream.name}</strong>
                                <span>{item.matchingExerciseCount} تمرين</span>
                              </div>
                              <div className="preview-bar">
                                <span
                                  style={{
                                    width: `${Math.max(
                                      10,
                                      (item.matchingExerciseCount /
                                        Math.max(preview.matchingExerciseCount, 1)) *
                                        100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <section className="builder-preview-card">
                      <h3>عينة من المواضيع المطابقة</h3>
                      <div className="builder-preview-sujets">
                        {preview.matchingSujets.slice(0, 8).map((sujet) => (
                          <article
                            key={`${sujet.examId}:${sujet.sujetNumber}:${sujet.stream.code}`}
                            className="builder-preview-sujet"
                          >
                            <strong>
                              {sujet.year} · {sujet.sujetLabel}
                            </strong>
                            <p>
                              {sujet.stream.name} · {formatSessionType(sujet.sessionType)}
                            </p>
                            <span>{sujet.matchingExerciseCount} تمرين مطابق</span>
                          </article>
                        ))}
                      </div>
                    </section>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
      ) : null}
    </StudyShell>
  );
}
