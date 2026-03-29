'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  AdminLibraryContextStrip,
  AdminLibraryFiltersRail,
  AdminLibraryPreviewPanel,
  AdminLibrarySujetsPanel,
} from '@/components/admin-library-sections';
import {
  BrowseWorkspaceSkeleton,
  EmptyState,
} from '@/components/study-shell';
import {
  buildAdminLibraryContextTitle,
  buildAdminLibraryQuery,
  buildAdminLibrarySelectionPrompt,
  buildStudentPreviewHref,
  normalizeCode,
  parseSujetNumber,
  parseYear,
  resolveSelectionFromExamId,
} from '@/lib/admin-library';
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
    const nextQuery = buildAdminLibraryQuery({
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

  const browseContextTitle = buildAdminLibraryContextTitle({
    streamName: stream?.name ?? null,
    subjectName: subject?.name ?? null,
    selectedYear,
  });
  const sujetsCount = yearEntry?.sujets.length ?? 0;
  const selectionPrompt = buildAdminLibrarySelectionPrompt({
    hasStream: Boolean(stream),
    hasSubject: Boolean(subject),
    hasSelectedYear: selectedYear !== null,
    hasSelectedSujet: Boolean(selectedSujet),
  });
  const studentPreviewHref = buildStudentPreviewHref(
    selectedExam,
    selectedSujet?.sujetNumber ?? null,
  );

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
            <AdminLibraryFiltersRail
              catalog={catalog}
              stream={stream}
              subject={subject}
              selectedStreamCode={selectedStreamCode}
              selectedSubjectCode={selectedSubjectCode}
              selectedYear={selectedYear}
              selectionPrompt={selectionPrompt}
              onClearStream={() => setSelectedStreamCode('')}
              onClearSubject={() => setSelectedSubjectCode('')}
              onClearYear={() => setSelectedYear(null)}
              onSelectStream={setSelectedStreamCode}
              onSelectSubject={setSelectedSubjectCode}
              onSelectYear={setSelectedYear}
            />

            <div className="browse-main-column">
              <AdminLibraryContextStrip
                browseContextTitle={browseContextTitle}
                selectionPrompt={selectionPrompt}
                streamName={stream?.name ?? null}
                subjectName={subject?.name ?? null}
                selectedYear={selectedYear}
                selectedSujetLabel={selectedSujet?.label ?? null}
              />

              <AdminLibrarySujetsPanel
                stream={stream}
                subject={subject}
                selectedYear={selectedYear}
                yearEntry={yearEntry}
                sujetsCount={sujetsCount}
                selectionPrompt={selectionPrompt}
                selectedExamId={selectedExamId}
                selectedSujetNumber={selectedSujetNumber}
                onSelectSujet={(examId, sujetNumber) => {
                  setSelectedExamId(examId);
                  setSelectedSujetNumber(sujetNumber);
                  setRevisionError(null);
                }}
              />

              <AdminLibraryPreviewPanel
                studentPreviewHref={studentPreviewHref}
                startingRevision={startingRevision}
                selectedExamId={selectedExamId}
                onStartRevision={() => {
                  void startRevision();
                }}
                revisionError={revisionError}
                loadingExam={loadingExam}
                examError={examError}
                selectedExam={selectedExam}
                selectedSujetLabel={selectedSujet?.label ?? null}
                onRetryPreview={() => window.location.reload()}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
