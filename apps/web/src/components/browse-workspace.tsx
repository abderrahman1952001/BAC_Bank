'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
import {
  BrowseWorkspaceSkeleton,
  EmptyState,
  StudyHeader,
  StudyShell,
  StudySidebar,
} from '@/components/study-shell';
import {
  API_BASE_URL,
  CatalogResponse,
  ExamResponse,
  fetchJson,
  formatSessionType,
} from '@/lib/qbank';
import {
  buildBrowseContext,
  buildBrowseQuery,
  buildInitialBrowseSelection,
  findBrowseStream,
  findBrowseSubject,
  findBrowseYearEntry,
  findSelectedBrowseSujet,
  reconcileBrowseSubjectCode,
  reconcileBrowseSujetSelection,
  reconcileBrowseYear,
} from '@/lib/browse-workspace';

export function BrowseWorkspace({
  initialSearch,
}: {
  initialSearch?: {
    stream?: string;
    subject?: string;
    year?: string;
    examId?: string;
    sujet?: string;
  };
}) {
  const router = useRouter();

  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStreamCode, setSelectedStreamCode] = useState('');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedSujetNumber, setSelectedSujetNumber] = useState<number | null>(null);

  const [selectedExam, setSelectedExam] = useState<ExamResponse | null>(null);
  const [loadingExam, setLoadingExam] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  useEffect(() => {
    const nextSelection = buildInitialBrowseSelection(initialSearch);

    setSelectedStreamCode(nextSelection.selectedStreamCode);
    setSelectedSubjectCode(nextSelection.selectedSubjectCode);
    setSelectedYear(nextSelection.selectedYear);
    setSelectedExamId(nextSelection.selectedExamId);
    setSelectedSujetNumber(nextSelection.selectedSujetNumber);
  }, [initialSearch]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<CatalogResponse>(
          `${API_BASE_URL}/qbank/catalog`,
          {
            signal: controller.signal,
          },
        );

        setCatalog(payload);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('تعذر تحميل فهرس المواضيع.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadCatalog();

    return () => {
      controller.abort();
    };
  }, []);

  const stream = useMemo(
    () => findBrowseStream(catalog, selectedStreamCode),
    [catalog, selectedStreamCode],
  );
  const subject = useMemo(
    () => findBrowseSubject(stream, selectedSubjectCode),
    [selectedSubjectCode, stream],
  );
  const yearEntry = useMemo(
    () => findBrowseYearEntry(subject, selectedYear),
    [selectedYear, subject],
  );

  useEffect(() => {
    if (!catalog) {
      return;
    }

    if (selectedStreamCode) {
      return;
    }

    setSelectedSubjectCode('');
    setSelectedYear(null);
    setSelectedExamId(null);
    setSelectedSujetNumber(null);
  }, [catalog, selectedStreamCode]);

  useEffect(() => {
    if (!stream) {
      setSelectedSubjectCode('');
      setSelectedYear(null);
      setSelectedExamId(null);
      setSelectedSujetNumber(null);
      return;
    }

    setSelectedSubjectCode((current) =>
      reconcileBrowseSubjectCode(stream, current),
    );
  }, [stream]);

  useEffect(() => {
    if (!subject) {
      setSelectedYear(null);
      setSelectedExamId(null);
      setSelectedSujetNumber(null);
      return;
    }

    setSelectedYear((current) => reconcileBrowseYear(subject, current));
  }, [subject]);

  useEffect(() => {
    const nextSelection = reconcileBrowseSujetSelection(
      yearEntry,
      selectedExamId,
      selectedSujetNumber,
    );

    setSelectedExamId(nextSelection.selectedExamId);
    setSelectedSujetNumber(nextSelection.selectedSujetNumber);
  }, [selectedExamId, selectedSujetNumber, yearEntry]);

  const selectedSujet = useMemo(() => {
    return findSelectedBrowseSujet(
      yearEntry,
      selectedExamId,
      selectedSujetNumber,
    );
  }, [selectedExamId, selectedSujetNumber, yearEntry]);

  useEffect(() => {
    const nextQuery = buildBrowseQuery({
      selectedStreamCode,
      selectedSubjectCode,
      selectedYear,
      selectedExamId,
      selectedSujetNumber,
    });
    const currentQuery =
      typeof window === 'undefined'
        ? ''
        : window.location.search.replace(/^\?/, '');

    if (nextQuery === currentQuery) {
      return;
    }

    router.replace(nextQuery ? `/app/browse?${nextQuery}` : '/app/browse', {
      scroll: false,
    });
  }, [
    router,
    selectedExamId,
    selectedStreamCode,
    selectedSubjectCode,
    selectedSujetNumber,
    selectedYear,
  ]);

  useEffect(() => {
    if (!selectedSujet) {
      setSelectedExam(null);
      setExamError(null);
      return;
    }

    const currentSujet = selectedSujet;

    const controller = new AbortController();

    async function loadSelectedExam() {
      setLoadingExam(true);
      setExamError(null);

      try {
        const payload = await fetchJson<ExamResponse>(
          `${API_BASE_URL}/qbank/exams/${currentSujet.examId}?sujetNumber=${currentSujet.sujetNumber}`,
          {
            signal: controller.signal,
          },
        );

        setSelectedExam(payload);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setSelectedExam(null);
          setExamError('تعذر تحميل معاينة الموضوع المختار.');
        }
      } finally {
        setLoadingExam(false);
      }
    }

    void loadSelectedExam();

    return () => {
      controller.abort();
    };
  }, [selectedSujet]);

  const { selectedMeta, browseContextTitle, sujetsCount, selectionPrompt } =
    buildBrowseContext({
      stream,
      subject,
      selectedYear,
      yearEntry,
      selectedSujet,
    });

  if (loading) {
    return (
      <StudyShell>
        <AppNavbar />
        <BrowseWorkspaceSkeleton />
      </StudyShell>
    );
  }

  if (!error && catalog && catalog.streams.length === 0) {
    return (
      <StudyShell>
        <AppNavbar />
        <StudyHeader
          eyebrow="تصفح"
          title="المواضيع"
          meta={[]}
        />
        <EmptyState
          title="لا توجد بيانات منشورة في هذه البيئة بعد"
          description="بيئة staging تعمل، لكن فهرس الشعب والمواضيع ما زال فارغاً. شغّل البذور أولاً أو انشر بيانات تجريبية."
        />
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      <AppNavbar />

      <StudyHeader
        eyebrow="تصفح"
        title="المواضيع"
        meta={selectedMeta}
      />

      {!error ? (
        <div className="browse-workspace">
          <div className="browse-workspace-body">
            <StudySidebar
              title="الفلاتر"
            >
              <div className="browse-filter-group">
                <div className="browse-filter-head">
                  <h3>الشعبة</h3>
                  {selectedStreamCode ? (
                    <button
                      type="button"
                      className="browse-clear-button"
                      onClick={() => setSelectedStreamCode('')}
                    >
                      مسح
                    </button>
                  ) : null}
                </div>
                <div className="chip-grid">
                  {(catalog?.streams ?? []).map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className={
                        item.code === selectedStreamCode
                          ? 'choice-chip active'
                          : 'choice-chip'
                      }
                      onClick={() => setSelectedStreamCode(item.code)}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="browse-filter-group">
                <div className="browse-filter-head">
                  <h3>المادة</h3>
                  {selectedSubjectCode ? (
                    <button
                      type="button"
                      className="browse-clear-button"
                      onClick={() => setSelectedSubjectCode('')}
                    >
                      مسح
                    </button>
                  ) : null}
                </div>
                {!stream ? (
                  <p className="muted-text">اختر الشعبة.</p>
                ) : (
                  <div className="chip-grid">
                    {stream.subjects.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        className={
                          item.code === selectedSubjectCode
                            ? 'choice-chip active'
                            : 'choice-chip'
                        }
                        onClick={() => setSelectedSubjectCode(item.code)}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="browse-filter-group">
                <div className="browse-filter-head">
                  <h3>السنة</h3>
                  {selectedYear ? (
                    <button
                      type="button"
                      className="browse-clear-button"
                      onClick={() => setSelectedYear(null)}
                    >
                      مسح
                    </button>
                  ) : null}
                </div>
                {!subject ? (
                  <p className="muted-text">اختر المادة.</p>
                ) : (
                  <div className="browse-year-list">
                    {subject.years.map((item) => (
                      <button
                        key={item.year}
                        type="button"
                        className={
                          item.year === selectedYear
                            ? 'browse-year-button active'
                            : 'browse-year-button'
                        }
                        onClick={() => setSelectedYear(item.year)}
                      >
                        <strong>{item.year}</strong>
                        <span>{item.sujets.length} موضوع</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </StudySidebar>

            <div className="browse-main-column">
              <section className="browse-context-strip">
                <div>
                  <h2>{browseContextTitle}</h2>
                  <p>{selectionPrompt}</p>
                </div>
                <div className="browse-context-pills">
                  {stream ? <span>{stream.name}</span> : null}
                  {subject ? <span>{subject.name}</span> : null}
                  {selectedYear ? <span>{selectedYear}</span> : null}
                  {selectedSujet ? <span>{selectedSujet.label}</span> : null}
                </div>
              </section>

              <section className="browse-panel">
                <div className="browse-panel-head">
                  <div>
                    <h2>النتائج</h2>
                    <p>
                      {subject && selectedYear
                        ? `${sujetsCount} موضوع`
                        : selectionPrompt}
                    </p>
                  </div>
                </div>

                {!stream || !subject || !selectedYear ? (
                  <EmptyState
                    title="النتائج غير جاهزة"
                    description={selectionPrompt}
                  />
                ) : yearEntry && yearEntry.sujets.length ? (
                  <div className="browse-sujet-grid">
                    {yearEntry.sujets.map((item) => {
                      const isActive =
                        item.examId === selectedExamId &&
                        item.sujetNumber === selectedSujetNumber;

                      return (
                        <button
                          key={`${item.examId}:${item.sujetNumber}`}
                          type="button"
                          className={
                            isActive
                              ? 'browse-sujet-card active'
                              : 'browse-sujet-card'
                          }
                          onClick={() => {
                            setSelectedExamId(item.examId);
                            setSelectedSujetNumber(item.sujetNumber);
                          }}
                        >
                          <div className="browse-sujet-card-top">
                            <strong>{item.label}</strong>
                            <span>{item.exerciseCount} تمارين</span>
                          </div>
                          <p>{formatSessionType(item.sessionType)}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="لا توجد مواضيع مطابقة"
                    description="جرّب سنة أو مادة أخرى."
                  />
                )}
              </section>

              <section className="browse-panel browse-preview-panel">
                <div className="browse-panel-head">
                  <div>
                    <h2>المعاينة</h2>
                    <p>{selectedSujet ? selectedSujet.label : 'اختر موضوعاً.'}</p>
                  </div>
                  {selectedSujet && stream && subject && selectedYear ? (
                    <Link
                      href={`/app/browse/${stream.code}/${subject.code}/${selectedYear}/${selectedSujet.examId}/${selectedSujet.sujetNumber}`}
                      className="btn-primary"
                    >
                      افتح وضع الدراسة
                    </Link>
                  ) : null}
                </div>

                {loadingExam ? (
                  <div className="browse-preview-layout">
                    <div className="study-skeleton block" />
                    <div className="study-skeleton block tall" />
                  </div>
                ) : examError ? (
                  <EmptyState
                    title="تعذر تحميل معاينة الموضوع"
                    description={examError}
                    action={
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => window.location.reload()}
                      >
                        حاول مجدداً
                      </button>
                    }
                  />
                ) : selectedExam ? (
                  <div className="browse-preview-layout">
                    <article className="browse-preview-summary">
                      <div className="study-meta-row">
                        <span className="study-meta-pill">
                          <strong>النوع</strong>
                          <span>{formatSessionType(selectedExam.sessionType)}</span>
                        </span>
                        <span className="study-meta-pill">
                          <strong>المدة</strong>
                          <span>{selectedExam.durationMinutes} دقيقة</span>
                        </span>
                        <span className="study-meta-pill">
                          <strong>النقاط</strong>
                          <span>{selectedExam.totalPoints}</span>
                        </span>
                      </div>

                      <div className="browse-preview-copy">
                        <h3>
                          {selectedExam.selectedSujetLabel ?? selectedSujet?.label}
                        </h3>
                        <p>
                          {selectedExam.subject.name} · {selectedExam.stream.name} ·{' '}
                          {selectedExam.year}
                        </p>
                      </div>
                    </article>

                    <div className="browse-exercise-list">
                      {selectedExam.exercises.map((exercise) => (
                        <Link
                          key={exercise.id}
                          href={`/app/browse/${selectedExam.stream.code}/${selectedExam.subject.code}/${selectedExam.year}/${selectedExam.id}/${selectedExam.selectedSujetNumber ?? selectedSujet?.sujetNumber ?? 1}?exercise=${exercise.orderIndex}`}
                          className="browse-exercise-card"
                        >
                          <div>
                            <strong>التمرين {exercise.orderIndex}</strong>
                            <span>{exercise.questionCount} أسئلة</span>
                          </div>
                          <p>{exercise.title ?? 'بدون عنوان إضافي'}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="اختر موضوعاً"
                    description="ستظهر المعاينة هنا."
                  />
                )}
              </section>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="تعذر تحميل مساحة التصفح"
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
      )}
    </StudyShell>
  );
}
