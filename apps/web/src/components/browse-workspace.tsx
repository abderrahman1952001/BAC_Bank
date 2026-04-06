'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { StudentNavbar } from '@/components/student-navbar';
import {
  EmptyState,
  StudyHeader,
  StudyShell,
  StudySidebar,
} from '@/components/study-shell';
import {
  CatalogResponse,
  ExamResponse,
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
  initialCatalog,
  initialExam,
}: {
  initialSearch?: {
    stream?: string;
    subject?: string;
    year?: string;
    examId?: string;
    sujet?: string;
  };
  initialCatalog?: CatalogResponse;
  initialExam?: ExamResponse;
}) {
  const router = useRouter();
  const serverSelection = useMemo(
    () => buildInitialBrowseSelection(initialSearch),
    [initialSearch],
  );
  const catalog = initialCatalog ?? null;

  const [selectedStreamCode, setSelectedStreamCode] = useState(
    serverSelection.selectedStreamCode,
  );
  const [selectedSubjectCode, setSelectedSubjectCode] = useState(
    serverSelection.selectedSubjectCode,
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(
    serverSelection.selectedYear,
  );
  const [selectedExamId, setSelectedExamId] = useState<string | null>(
    serverSelection.selectedExamId,
  );
  const [selectedSujetNumber, setSelectedSujetNumber] = useState<number | null>(
    serverSelection.selectedSujetNumber,
  );

  useEffect(() => {
    setSelectedStreamCode(serverSelection.selectedStreamCode);
    setSelectedSubjectCode(serverSelection.selectedSubjectCode);
    setSelectedYear(serverSelection.selectedYear);
    setSelectedExamId(serverSelection.selectedExamId);
    setSelectedSujetNumber(serverSelection.selectedSujetNumber);
  }, [serverSelection]);

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
  const serverPreviewKey =
    serverSelection.selectedExamId && serverSelection.selectedSujetNumber
      ? `${serverSelection.selectedExamId}:${serverSelection.selectedSujetNumber}`
      : null;
  const selectedPreviewKey = selectedSujet
    ? `${selectedSujet.examId}:${selectedSujet.sujetNumber}`
    : null;
  const selectedExam =
    selectedSujet &&
    initialExam?.id === selectedSujet.examId &&
    initialExam.selectedSujetNumber === selectedSujet.sujetNumber
      ? initialExam
      : null;
  const loadingExam = Boolean(
    selectedPreviewKey && selectedPreviewKey !== serverPreviewKey,
  );
  const examError =
    selectedPreviewKey &&
    selectedPreviewKey === serverPreviewKey &&
    !selectedExam
      ? 'تعذر تحميل معاينة الموضوع المختار.'
      : null;

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

    router.replace(nextQuery ? `/student/browse?${nextQuery}` : '/student/browse', {
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

  const { selectedMeta, browseContextTitle, sujetsCount } =
    buildBrowseContext({
      stream,
      subject,
      selectedYear,
      yearEntry,
      selectedSujet,
    });

  if (!catalog) {
    return (
      <StudyShell>
        <StudentNavbar />
        <section className="student-main-frame student-main-frame-browse">
          <EmptyState
            title="تعذر تحميل مساحة التصفح"
            description="أعد المحاولة."
            action={
              <button
                type="button"
                className="btn-secondary"
                onClick={() => router.refresh()}
              >
                إعادة المحاولة
              </button>
            }
          />
        </section>
      </StudyShell>
    );
  }

  if (catalog.streams.length === 0) {
    return (
      <StudyShell>
        <StudentNavbar />
        <section className="student-main-frame student-main-frame-browse">
          <StudyHeader
            title="المكتبة"
          />
          <EmptyState
            title="لا توجد بيانات منشورة"
            description="انشر بيانات أولاً."
          />
        </section>
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame student-main-frame-browse">
        <StudyHeader
          title="المكتبة"
          meta={selectedMeta}
        />

        <div className="browse-workspace">
          <div className="browse-workspace-body">
            <StudySidebar
              className="browse-filter-sidebar"
              title="التصفية"
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
                  {catalog.streams.map((item) => (
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
                <motion.section
                  className="browse-context-strip"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div>
                    <h2>{browseContextTitle}</h2>
                  </div>
                  <div className="browse-context-pills">
                    {stream ? <span>{stream.name}</span> : null}
                    {subject ? <span>{subject.name}</span> : null}
                    {selectedYear ? <span>{selectedYear}</span> : null}
                    {selectedSujet ? <span>{selectedSujet.label}</span> : null}
                  </div>
                </motion.section>

                <motion.section
                  className="browse-panel"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.34, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="browse-panel-head">
                    <div>
                      <h2>النتائج</h2>
                      {subject && selectedYear ? <p>{sujetsCount} موضوع</p> : null}
                    </div>
                  </div>

                  {!stream || !subject || !selectedYear ? (
                    <EmptyState title="حدّد الشعبة والمادة والسنة" />
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
                      description="غيّر النطاق."
                    />
                  )}
                </motion.section>

                <motion.section
                  className="browse-panel browse-preview-panel"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.36, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="browse-panel-head">
                    <div>
                      <h2>المعاينة</h2>
                      {selectedSujet ? <p>{selectedSujet.label}</p> : null}
                    </div>
                    {selectedSujet && stream && subject && selectedYear ? (
                      <Link
                        href={`/student/browse/${stream.code}/${subject.code}/${selectedYear}/${selectedSujet.examId}/${selectedSujet.sujetNumber}`}
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
                          onClick={() => router.refresh()}
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
                            href={`/student/browse/${selectedExam.stream.code}/${selectedExam.subject.code}/${selectedExam.year}/${selectedExam.id}/${selectedExam.selectedSujetNumber ?? selectedSujet?.sujetNumber ?? 1}?exercise=${exercise.orderIndex}`}
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
                    <EmptyState title="اختر موضوعاً" />
                  )}
                </motion.section>
              </div>
            </div>
          </div>
      </section>
    </StudyShell>
  );
}
