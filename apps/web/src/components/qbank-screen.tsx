'use client';

import { useEffect, useMemo, useState } from 'react';
import Image, { ImageLoaderProps } from 'next/image';

type Stream = {
  code: string;
  name: string;
};

type Subject = {
  code: string;
  name: string;
  stream: Stream;
};

type Topic = {
  code: string;
  name: string;
  subject: Subject;
};

type FiltersResponse = {
  streams: Stream[];
  subjects: Subject[];
  years: number[];
  topics: Topic[];
};

type QuestionAsset = {
  fileUrl: string;
  assetType: 'IMAGE' | 'GRAPH' | 'TABLE' | 'FILE';
  orderIndex: number;
  caption: string | null;
};

type QuestionItem = {
  id: string;
  orderIndex: number;
  points: number;
  difficultyLevel: number | null;
  contentFormat: 'MARKDOWN' | 'HYBRID';
  contentVersion: number | null;
  contentMarkdown: string | null;
  exerciseOrder: number;
  exam: {
    year: number;
    sessionType: 'NORMAL' | 'MAKEUP';
    subject: {
      code: string;
      name: string;
    };
    stream: Stream;
  };
  assets: QuestionAsset[];
  assetCount: number;
  hasOfficialAnswer: boolean;
  topics: Array<{
    code: string;
    name: string;
    isPrimary: boolean;
    weight: number;
  }>;
};

type QuestionsResponse = {
  data: QuestionItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
const ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL;

const sessionTypeLabels: Record<QuestionItem['exam']['sessionType'], string> = {
  NORMAL: 'عادية',
  MAKEUP: 'استدراكية',
};

const contentFormatLabels: Record<QuestionItem['contentFormat'], string> = {
  MARKDOWN: 'نصي',
  HYBRID: 'نصي + وسائط',
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

function markdownPreview(markdown: string | null, maxLength = 260): string {
  if (!markdown) {
    return '';
  }

  const plain = markdown
    .replace(/[`*_>#\-]/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return plain.length > maxLength ? `${plain.slice(0, maxLength)}...` : plain;
}

export function QbankScreen() {
  const [filters, setFilters] = useState<FiltersResponse | null>(null);
  const [questions, setQuestions] = useState<QuestionsResponse | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState<string>('');
  const [subjectCode, setSubjectCode] = useState<string>('');
  const [streamCode, setStreamCode] = useState<string>('');
  const [topicCode, setTopicCode] = useState<string>('');

  const availableSubjects = useMemo(() => {
    if (!filters) {
      return [];
    }

    if (!streamCode) {
      return filters.subjects;
    }

    return filters.subjects.filter((subject) => subject.stream.code === streamCode);
  }, [filters, streamCode]);

  const availableTopics = useMemo(() => {
    if (!filters) {
      return [];
    }

    return filters.topics.filter((topic) => {
      const subjectMatch = subjectCode ? topic.subject.code === subjectCode : true;
      const streamMatch = streamCode
        ? topic.subject.stream.code === streamCode
        : true;
      return subjectMatch && streamMatch;
    });
  }, [filters, subjectCode, streamCode]);

  useEffect(() => {
    if (!subjectCode) {
      return;
    }

    const stillValid = availableSubjects.some(
      (subject) => subject.code === subjectCode,
    );

    if (!stillValid) {
      setSubjectCode('');
    }
  }, [availableSubjects, subjectCode]);

  useEffect(() => {
    if (!topicCode) {
      return;
    }

    const stillValid = availableTopics.some((topic) => topic.code === topicCode);
    if (!stillValid) {
      setTopicCode('');
    }
  }, [availableTopics, topicCode]);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadFilters() {
      setLoadingFilters(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/qbank/filters`, {
          signal: abortController.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Could not load filter options.');
        }

        const payload = (await response.json()) as FiltersResponse;
        setFilters(payload);
      } catch (err) {
        if (!(err instanceof Error) || err.name !== 'AbortError') {
          setError('تعذر تحميل خيارات الفلترة.');
        }
      } finally {
        setLoadingFilters(false);
      }
    }

    loadFilters();

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    if (!filters) {
      return;
    }

    const abortController = new AbortController();

    async function loadQuestions() {
      setLoadingQuestions(true);
      setError(null);

      const params = new URLSearchParams({
        page: '1',
        pageSize: '30',
      });

      if (year) {
        params.set('year', year);
      }
      if (subjectCode) {
        params.set('subjectCode', subjectCode);
      }
      if (streamCode) {
        params.set('streamCode', streamCode);
      }
      if (topicCode) {
        params.set('topicCode', topicCode);
      }

      try {
        const response = await fetch(`${API_BASE_URL}/qbank/questions?${params}`, {
          signal: abortController.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Could not load questions.');
        }

        const payload = (await response.json()) as QuestionsResponse;
        setQuestions(payload);
      } catch (err) {
        if (!(err instanceof Error) || err.name !== 'AbortError') {
          setError('تعذر تحميل الأسئلة.');
        }
      } finally {
        setLoadingQuestions(false);
      }
    }

    loadQuestions();

    return () => {
      abortController.abort();
    };
  }, [filters, year, subjectCode, streamCode, topicCode]);

  return (
    <div className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">بنك الأسئلة</p>
          <h1>ابحث عن الأسئلة حسب السنة، الشعبة، المادة والمحور</h1>
          <p className="subtext">
            محتوى منظم مع معاينة النصوص والمرفقات حتى تتمكن من مراجعة أسرع قبل الحل
            الكامل.
          </p>
        </div>
        <div className="stats-grid">
          <article>
            <span>{filters?.years.length ?? 0}</span>
            <p>سنوات متاحة</p>
          </article>
          <article>
            <span>{filters?.subjects.length ?? 0}</span>
            <p>مواد</p>
          </article>
          <article>
            <span>{questions?.meta.total ?? 0}</span>
            <p>أسئلة مطابقة</p>
          </article>
        </div>
      </section>

      <section className="filters-card">
        <div className="filters-head">
          <h2>فلترة الأسئلة</h2>
          <button
            type="button"
            onClick={() => {
              setYear('');
              setSubjectCode('');
              setStreamCode('');
              setTopicCode('');
            }}
          >
            إعادة ضبط
          </button>
        </div>

        {loadingFilters ? <p>جاري تحميل خيارات الفلترة...</p> : null}

        <div className="filter-grid">
          <label>
            <span>السنة</span>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">كل السنوات</option>
              {filters?.years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>الشعبة</span>
            <select
              value={streamCode}
              onChange={(e) => setStreamCode(e.target.value)}
            >
              <option value="">كل الشعب</option>
              {filters?.streams.map((stream) => (
                <option key={stream.code} value={stream.code}>
                  {stream.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>المادة</span>
            <select
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
            >
              <option value="">كل المواد</option>
              {availableSubjects.map((subject) => (
                <option key={subject.code} value={subject.code}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>المحور</span>
            <select value={topicCode} onChange={(e) => setTopicCode(e.target.value)}>
              <option value="">كل المحاور</option>
              {availableTopics.map((topic) => (
                <option
                  key={`${topic.subject.code}:${topic.code}`}
                  value={topic.code}
                >
                  {topic.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="questions-list">
        {error ? <p className="error-text">{error}</p> : null}
        {loadingQuestions ? <p>جاري تحميل الأسئلة...</p> : null}

        {!loadingQuestions && !error && questions?.data.length === 0 ? (
          <p className="empty-text">لا توجد أسئلة مطابقة لهذه الفلاتر حالياً.</p>
        ) : null}

        {questions?.data.map((question) => {
          const firstAsset = question.assets[0];
          const firstAssetUrl = firstAsset ? toAssetUrl(firstAsset.fileUrl) : null;

          return (
            <article key={question.id} className="question-card">
              <header>
                <h3>
                  تمرين {question.exerciseOrder} · سؤال {question.orderIndex} -{' '}
                  {question.exam.subject.name} {question.exam.year}
                </h3>
                <p>
                  {question.exam.stream.name} |{' '}
                  {sessionTypeLabels[question.exam.sessionType]} |{' '}
                  {contentFormatLabels[question.contentFormat]}
                </p>
              </header>

              <div className="topic-chips">
                {question.topics.map((topic) => (
                  <span key={`${question.id}-${topic.code}-${topic.isPrimary}`}>
                    {topic.name}
                    {topic.isPrimary ? ' (رئيسي)' : ''}
                  </span>
                ))}
              </div>

              <div className="prompt-box">
                {question.contentMarkdown ? (
                  <p>{markdownPreview(question.contentMarkdown)}</p>
                ) : (
                  <p className="image-key">لا يوجد نص متاح لهذا السؤال حالياً.</p>
                )}

                {firstAssetUrl ? (
                  <Image
                    src={firstAssetUrl}
                    loader={passthroughLoader}
                    alt={firstAsset.caption ?? `مرفق السؤال ${question.orderIndex}`}
                    width={1280}
                    height={900}
                    unoptimized
                  />
                ) : null}

                {question.assetCount > 0 && !firstAssetUrl ? (
                  <p className="image-key">عدد المرفقات: {question.assetCount}</p>
                ) : null}
              </div>

              <footer>
                <p>النقاط: {question.points}</p>
                <p>
                  التصحيح الرسمي:{' '}
                  {question.hasOfficialAnswer ? 'متوفر' : 'غير متوفر'}
                </p>
              </footer>
            </article>
          );
        })}
      </section>
    </div>
  );
}
