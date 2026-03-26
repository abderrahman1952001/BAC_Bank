'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BrowseWorkspaceSkeleton,
  EmptyState,
} from '@/components/study-shell';
import {
  AdminIngestionJobResponse,
  fetchAdminJson,
} from '@/lib/admin';
import {
  API_BASE_URL,
  CatalogResponse,
  ExamResponse,
  fetchJson,
} from '@/lib/qbank';

function normalizeCode(value: string | null) {
  return value?.trim().toUpperCase() ?? '';
}

function parseYear(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseSujetNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return parsed === 1 || parsed === 2 ? parsed : null;
}

function formatSessionLabel(sessionType: 'NORMAL' | 'MAKEUP') {
  return sessionType === 'MAKEUP' ? 'Makeup' : 'Normal';
}

function resolveSelectionFromExamId(
  catalog: CatalogResponse,
  examId: string,
  preferredSujetNumber: number | null,
) {
  for (const stream of catalog.streams) {
    for (const subject of stream.subjects) {
      for (const year of subject.years) {
        const matchingSujet =
          year.sujets.find(
            (item) =>
              item.examId === examId &&
              item.sujetNumber === preferredSujetNumber,
          ) ??
          year.sujets.find((item) => item.examId === examId) ??
          null;

        if (!matchingSujet) {
          continue;
        }

        return {
          streamCode: stream.code,
          subjectCode: subject.code,
          year: year.year,
          sujetNumber: matchingSujet.sujetNumber,
        };
      }
    }
  }

  return null;
}

export function AdminLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const streamParam = searchParams.get('stream');
  const subjectParam = searchParams.get('subject');
  const yearParam = searchParams.get('year');
  const examParam = searchParams.get('examId');
  const sujetParam = searchParams.get('sujet');

  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [selectedStreamCode, setSelectedStreamCode] = useState('');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedSujetNumber, setSelectedSujetNumber] = useState<number | null>(
    null,
  );

  const [selectedExam, setSelectedExam] = useState<ExamResponse | null>(null);
  const [loadingExam, setLoadingExam] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  const [startingRevision, setStartingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStreamCode(normalizeCode(streamParam));
    setSelectedSubjectCode(normalizeCode(subjectParam));
    setSelectedYear(parseYear(yearParam));
    setSelectedExamId(examParam?.trim() || null);
    setSelectedSujetNumber(parseSujetNumber(sujetParam));
  }, [examParam, streamParam, subjectParam, sujetParam, yearParam]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      setLoadingCatalog(true);
      setCatalogError(null);

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
          setCatalogError('Failed to load the published library.');
        }
      } finally {
        setLoadingCatalog(false);
      }
    }

    void loadCatalog();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!catalog || !selectedExamId) {
      return;
    }

    if (
      selectedStreamCode &&
      selectedSubjectCode &&
      selectedYear !== null &&
      selectedSujetNumber !== null
    ) {
      return;
    }

    const resolvedSelection = resolveSelectionFromExamId(
      catalog,
      selectedExamId,
      selectedSujetNumber,
    );

    if (!resolvedSelection) {
      setSelectedExamId(null);
      setSelectedSujetNumber(null);
      return;
    }

    setSelectedStreamCode(resolvedSelection.streamCode);
    setSelectedSubjectCode(resolvedSelection.subjectCode);
    setSelectedYear(resolvedSelection.year);
    setSelectedSujetNumber(resolvedSelection.sujetNumber);
  }, [
    catalog,
    selectedExamId,
    selectedStreamCode,
    selectedSubjectCode,
    selectedSujetNumber,
    selectedYear,
  ]);

  const stream = useMemo(
    () => catalog?.streams.find((item) => item.code === selectedStreamCode) ?? null,
    [catalog, selectedStreamCode],
  );
  const subject = useMemo(
    () =>
      stream?.subjects.find((item) => item.code === selectedSubjectCode) ?? null,
    [selectedSubjectCode, stream],
  );
  const yearEntry = useMemo(
    () => subject?.years.find((item) => item.year === selectedYear) ?? null,
    [selectedYear, subject],
  );

  useEffect(() => {
    if (!catalog) {
      return;
    }

    if (!selectedStreamCode) {
      if (selectedExamId) {
        return;
      }

      setSelectedSubjectCode('');
      setSelectedYear(null);
      setSelectedExamId(null);
      setSelectedSujetNumber(null);
      return;
    }

    setSelectedSubjectCode((current) =>
      current && stream?.subjects.some((item) => item.code === current) ? current : '',
    );
  }, [catalog, selectedExamId, selectedStreamCode, stream]);

  useEffect(() => {
    if (!subject) {
      setSelectedYear(null);
      setSelectedExamId(null);
      setSelectedSujetNumber(null);
      return;
    }

    setSelectedYear((current) =>
      current && subject.years.some((item) => item.year === current) ? current : null,
    );
  }, [subject]);

  useEffect(() => {
    if (!yearEntry) {
      setSelectedExamId(null);
      setSelectedSujetNumber(null);
      return;
    }

    const nextExamId =
      selectedExamId &&
      yearEntry.sujets.some((item) => item.examId === selectedExamId)
        ? selectedExamId
        : null;

    setSelectedExamId(nextExamId);
    setSelectedSujetNumber((current) => {
      const currentIsValid =
        current !== null &&
        yearEntry.sujets.some(
          (item) =>
            item.examId === nextExamId && item.sujetNumber === current,
        );

      if (currentIsValid) {
        return current;
      }

      return null;
    });
  }, [selectedExamId, yearEntry]);

  const selectedSujet = useMemo(() => {
    if (!yearEntry || !selectedExamId || !selectedSujetNumber) {
      return null;
    }

    return (
      yearEntry.sujets.find(
        (item) =>
          item.examId === selectedExamId &&
          item.sujetNumber === selectedSujetNumber,
      ) ?? null
    );
  }, [selectedExamId, selectedSujetNumber, yearEntry]);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (selectedStreamCode) {
      nextParams.set('stream', selectedStreamCode);
    }

    if (selectedSubjectCode) {
      nextParams.set('subject', selectedSubjectCode);
    }

    if (selectedYear) {
      nextParams.set('year', String(selectedYear));
    }

    if (selectedExamId) {
      nextParams.set('examId', selectedExamId);
    }

    if (selectedSujetNumber) {
      nextParams.set('sujet', String(selectedSujetNumber));
    }

    const nextQuery = nextParams.toString();
    const currentQuery =
      typeof window === 'undefined'
        ? ''
        : window.location.search.replace(/^\?/, '');

    if (nextQuery === currentQuery) {
      return;
    }

    router.replace(nextQuery ? `/admin/library?${nextQuery}` : '/admin/library', {
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
          setExamError('Failed to load the selected paper preview.');
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

  async function startRevision() {
    if (!selectedExamId) {
      return;
    }

    setStartingRevision(true);
    setRevisionError(null);

    try {
      const payload = await fetchAdminJson<AdminIngestionJobResponse>(
        `/ingestion/exams/${selectedExamId}/revision`,
        {
          method: 'POST',
        },
      );

      router.push(`/admin/ingestion/${payload.job.id}`);
    } catch (startError) {
      setRevisionError(
        startError instanceof Error
          ? startError.message
          : 'Failed to open a published revision draft.',
      );
    } finally {
      setStartingRevision(false);
    }
  }

  const browseContextTitle = subject
    ? `${subject.name}${selectedYear ? ` · ${selectedYear}` : ''}`
    : stream
      ? `Stream: ${stream.name}`
      : 'Choose a stream, subject, and year';
  const sujetsCount = yearEntry?.sujets.length ?? 0;
  const selectionPrompt = !stream
    ? 'Start from a stream, then narrow the library to the exact published offering you want to revise.'
    : !subject
      ? 'Pick a subject to load the published years for this stream.'
      : !selectedYear
        ? 'Choose a year to reveal the matching published sujets.'
        : !selectedSujet
          ? 'Select the published sujet you want to inspect before starting a revision.'
          : 'This published offering is ready. Open the revision workflow to edit the canonical paper in the ingestion review editor.';
  const studentPreviewHref =
    selectedExam && selectedSujet
      ? `/app/browse/${selectedExam.stream.code}/${selectedExam.subject.code}/${selectedExam.year}/${selectedExam.id}/${selectedExam.selectedSujetNumber ?? selectedSujet.sujetNumber}`
      : null;

  if (loadingCatalog) {
    return (
      <section className="panel">
        <BrowseWorkspaceSkeleton />
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="admin-page-head">
        <div>
          <p className="page-kicker">Admin CMS</p>
          <h1>Published Library</h1>
          <p className="muted-text">
            Browse live BAC offerings the same way students do, then open a
            revision draft for the canonical paper behind them.
          </p>
        </div>
        <div className="table-actions">
          <Link href="/admin/ingestion" className="btn-secondary">
            Open Ingestion
          </Link>
        </div>
      </div>

      {catalogError ? (
        <EmptyState
          title="Published library unavailable"
          description={catalogError}
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          }
        />
      ) : (
        <div className="browse-workspace">
          <div className="browse-workspace-body">
            <aside className="study-sidebar">
              <div className="study-sidebar-header">
                <p className="page-kicker">Library Filters</p>
                <h2>Published Catalog</h2>
                <p>{selectionPrompt}</p>
              </div>

              <div className="browse-filter-group">
                <div className="browse-filter-head">
                  <h3>Stream</h3>
                  {selectedStreamCode ? (
                    <button
                      type="button"
                      className="browse-clear-button"
                      onClick={() => setSelectedStreamCode('')}
                    >
                      Clear
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
                  <h3>Subject</h3>
                  {selectedSubjectCode ? (
                    <button
                      type="button"
                      className="browse-clear-button"
                      onClick={() => setSelectedSubjectCode('')}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                {!stream ? (
                  <p className="muted-text">Choose a stream first.</p>
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
                  <h3>Year</h3>
                  {selectedYear ? (
                    <button
                      type="button"
                      className="browse-clear-button"
                      onClick={() => setSelectedYear(null)}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                {!subject ? (
                  <p className="muted-text">Published years appear after you choose a subject.</p>
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
                        <span>{item.sujets.length} sujets</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <div className="browse-main-column">
              <section className="browse-context-strip">
                <div>
                  <p className="page-kicker">Current Focus</p>
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
                    <h2>Published Sujets</h2>
                    <p>
                      {subject && selectedYear
                        ? `${subject.name} · ${selectedYear} · ${sujetsCount} published sujet(s)`
                        : 'Complete the selection in the left rail.'}
                    </p>
                  </div>
                </div>

                {!stream || !subject || !selectedYear ? (
                  <EmptyState
                    title="Finish the catalog path"
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
                            setRevisionError(null);
                          }}
                        >
                          <div className="browse-sujet-card-top">
                            <strong>{item.label}</strong>
                            <span>{item.exerciseCount} exercises</span>
                          </div>
                          <p>{formatSessionLabel(item.sessionType)}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No published sujets here yet"
                    description="Try another year or subject to find a live paper to revise."
                  />
                )}
              </section>

              <section className="browse-panel browse-preview-panel">
                <div className="browse-panel-head">
                  <div>
                    <h2>Published Paper Preview</h2>
                    <p>
                      Review the live paper before you branch into a revision draft.
                    </p>
                  </div>
                  <div className="table-actions">
                    {studentPreviewHref ? (
                      <Link href={studentPreviewHref} className="btn-secondary">
                        Student Preview
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        void startRevision();
                      }}
                      disabled={startingRevision || !selectedExamId}
                    >
                      {startingRevision ? 'Opening…' : 'Open Revision Workflow'}
                    </button>
                  </div>
                </div>

                {revisionError ? <p className="error-text">{revisionError}</p> : null}

                {loadingExam ? (
                  <div className="browse-preview-layout">
                    <div className="study-skeleton block" />
                    <div className="study-skeleton block tall" />
                  </div>
                ) : examError ? (
                  <EmptyState
                    title="Preview unavailable"
                    description={examError}
                    action={
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => window.location.reload()}
                      >
                        Retry
                      </button>
                    }
                  />
                ) : selectedExam ? (
                  <div className="browse-preview-layout">
                    <article className="browse-preview-summary">
                      <div className="study-meta-row">
                        <span className="study-meta-pill">
                          <strong>Session</strong>
                          <span>{formatSessionLabel(selectedExam.sessionType)}</span>
                        </span>
                        <span className="study-meta-pill">
                          <strong>Duration</strong>
                          <span>{selectedExam.durationMinutes} min</span>
                        </span>
                        <span className="study-meta-pill">
                          <strong>Total points</strong>
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
                        <p className="muted-text">
                          Opening a revision creates or resumes a draft for the
                          shared canonical paper, then sends you to the ingestion
                          review editor for validation and republishing.
                        </p>
                        {selectedExam.officialSourceReference ? (
                          <p className="muted-text">
                            Source reference: {selectedExam.officialSourceReference}
                          </p>
                        ) : null}
                      </div>
                    </article>

                    <div className="browse-exercise-list">
                      {selectedExam.exercises.map((exercise) => (
                        <article key={exercise.id} className="browse-exercise-card">
                          <div>
                            <strong>Exercise {exercise.orderIndex}</strong>
                            <span>{exercise.questionCount} questions</span>
                          </div>
                          <p>{exercise.title ?? 'Untitled exercise'}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="Choose a published sujet"
                    description="Its live structure and exercises will appear here before you open the revision flow."
                  />
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
