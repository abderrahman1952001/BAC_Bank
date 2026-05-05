"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AdminLibraryFiltersRail,
  AdminLibraryPreviewPanel,
  AdminLibrarySujetsPanel,
} from "@/components/admin-library-sections";
import { EmptyState } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import {
  buildAdminLibraryQuery,
  buildAdminLibrarySelectionPrompt,
  buildStudentPreviewHref,
  findAdminLibraryStream,
  findAdminLibrarySubject,
  findAdminLibraryYearEntry,
  findSelectedAdminLibrarySujet,
  reconcileAdminLibrarySubjectCode,
  reconcileAdminLibrarySujetSelection,
  reconcileAdminLibraryYear,
  type AdminLibrarySelectionState,
} from "@/lib/admin-library";
import {
  AdminIngestionJobResponse,
  fetchAdminJson,
  parseAdminIngestionJobResponse,
} from "@/lib/admin";
import { type CatalogResponse, type ExamResponse } from "@/lib/study-api";

type AdminLibraryPageProps = {
  initialSelection: AdminLibrarySelectionState;
  initialCatalog?: CatalogResponse;
  initialExam?: ExamResponse;
  initialActiveRevisionJobIdsByPaperId?: Record<string, string>;
};

export function AdminLibraryPage({
  initialSelection,
  initialCatalog,
  initialExam,
  initialActiveRevisionJobIdsByPaperId,
}: AdminLibraryPageProps) {
  const router = useRouter();
  const catalog = initialCatalog ?? null;

  const [selectedStreamCode, setSelectedStreamCode] = useState(
    initialSelection.selectedStreamCode,
  );
  const [selectedSubjectCode, setSelectedSubjectCode] = useState(
    initialSelection.selectedSubjectCode,
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(
    initialSelection.selectedYear,
  );
  const [selectedExamId, setSelectedExamId] = useState<string | null>(
    initialSelection.selectedExamId,
  );
  const [selectedSujetNumber, setSelectedSujetNumber] = useState<number | null>(
    initialSelection.selectedSujetNumber,
  );
  const [startingRevision, setStartingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [activeRevisionJobIdsByPaperId, setActiveRevisionJobIdsByPaperId] =
    useState<Record<string, string>>(
      initialActiveRevisionJobIdsByPaperId ?? {},
    );

  useEffect(() => {
    setSelectedStreamCode(initialSelection.selectedStreamCode);
    setSelectedSubjectCode(initialSelection.selectedSubjectCode);
    setSelectedYear(initialSelection.selectedYear);
    setSelectedExamId(initialSelection.selectedExamId);
    setSelectedSujetNumber(initialSelection.selectedSujetNumber);
  }, [initialSelection]);

  useEffect(() => {
    setActiveRevisionJobIdsByPaperId(
      initialActiveRevisionJobIdsByPaperId ?? {},
    );
  }, [initialActiveRevisionJobIdsByPaperId]);

  const stream = useMemo(
    () => findAdminLibraryStream(catalog, selectedStreamCode),
    [catalog, selectedStreamCode],
  );
  const subject = useMemo(
    () => findAdminLibrarySubject(stream, selectedSubjectCode),
    [selectedSubjectCode, stream],
  );
  const yearEntry = useMemo(
    () => findAdminLibraryYearEntry(subject, selectedYear),
    [selectedYear, subject],
  );

  useEffect(() => {
    if (!catalog) {
      return;
    }

    if (selectedStreamCode) {
      return;
    }

    setSelectedSubjectCode("");
    setSelectedYear(null);
    setSelectedExamId(null);
    setSelectedSujetNumber(null);
  }, [catalog, selectedStreamCode]);

  useEffect(() => {
    if (!stream) {
      setSelectedSubjectCode("");
      setSelectedYear(null);
      setSelectedExamId(null);
      setSelectedSujetNumber(null);
      return;
    }

    setSelectedSubjectCode((current) =>
      reconcileAdminLibrarySubjectCode(stream, current),
    );
  }, [stream]);

  useEffect(() => {
    if (!subject) {
      setSelectedYear(null);
      setSelectedExamId(null);
      setSelectedSujetNumber(null);
      return;
    }

    setSelectedYear((current) => reconcileAdminLibraryYear(subject, current));
  }, [subject]);

  useEffect(() => {
    const nextSelection = reconcileAdminLibrarySujetSelection(
      yearEntry,
      selectedExamId,
      selectedSujetNumber,
    );

    setSelectedExamId(nextSelection.selectedExamId);
    setSelectedSujetNumber(nextSelection.selectedSujetNumber);
  }, [selectedExamId, selectedSujetNumber, yearEntry]);

  const selectedSujet = useMemo(
    () =>
      findSelectedAdminLibrarySujet(
        yearEntry,
        selectedExamId,
        selectedSujetNumber,
      ),
    [selectedExamId, selectedSujetNumber, yearEntry],
  );
  const serverPreviewKey =
    initialSelection.selectedExamId && initialSelection.selectedSujetNumber
      ? `${initialSelection.selectedExamId}:${initialSelection.selectedSujetNumber}`
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
      ? "Failed to load the selected paper preview."
      : null;

  useEffect(() => {
    const nextQuery = buildAdminLibraryQuery({
      selectedStreamCode,
      selectedSubjectCode,
      selectedYear,
      selectedExamId,
      selectedSujetNumber,
    });
    const currentQuery =
      typeof window === "undefined"
        ? ""
        : window.location.search.replace(/^\?/, "");

    if (nextQuery === currentQuery) {
      return;
    }

    router.replace(
      nextQuery ? `/admin/library?${nextQuery}` : "/admin/library",
      {
        scroll: false,
      },
    );
  }, [
    router,
    selectedExamId,
    selectedStreamCode,
    selectedSubjectCode,
    selectedSujetNumber,
    selectedYear,
  ]);

  async function startRevision() {
    const selectedPaperId = selectedExam?.paperId ?? null;
    const existingRevisionJobId = selectedPaperId
      ? activeRevisionJobIdsByPaperId[selectedPaperId] ?? null
      : null;

    if (existingRevisionJobId) {
      router.push(`/admin/drafts/${existingRevisionJobId}`);
      return;
    }

    if (!selectedPaperId) {
      return;
    }

    setStartingRevision(true);
    setRevisionError(null);

    try {
      const payload = await fetchAdminJson<AdminIngestionJobResponse>(
        `/ingestion/papers/${selectedPaperId}/revision`,
        {
          method: "POST",
        },
        parseAdminIngestionJobResponse,
      );

      const publishedPaperId = payload.job.published_paper_id;

      if (publishedPaperId) {
        setActiveRevisionJobIdsByPaperId((current) => ({
          ...current,
          [publishedPaperId]: payload.job.id,
        }));
      }

      router.push(`/admin/drafts/${payload.job.id}`);
    } catch (startError) {
      setRevisionError(
        startError instanceof Error
          ? startError.message
          : "Failed to open a published revision draft.",
      );
    } finally {
      setStartingRevision(false);
    }
  }

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
  const selectedPaperId = selectedExam?.paperId ?? null;
  const activeRevisionJobId = selectedPaperId
    ? activeRevisionJobIdsByPaperId[selectedPaperId] ?? null
    : null;

  if (!catalog) {
    return (
      <section className="panel">
        <EmptyState
          title="Published library unavailable"
          description="Retry the page to load the published catalog."
          action={
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-5"
              onClick={() => router.refresh()}
            >
              Retry
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="admin-page-head">
        <div className="admin-page-intro">
          <h1>Library</h1>
          <div className="admin-page-meta-row">
            {stream?.name ? (
              <span className="admin-page-meta-pill">{stream.name}</span>
            ) : null}
            {subject?.name ? (
              <span className="admin-page-meta-pill">{subject.name}</span>
            ) : null}
            {selectedYear ? (
              <span className="admin-page-meta-pill">{selectedYear}</span>
            ) : null}
            {selectedSujet?.label ? (
              <span className="admin-page-meta-pill">{selectedSujet.label}</span>
            ) : null}
            {!stream && !subject && !selectedYear && !selectedSujet ? (
              <span className="admin-page-meta-pill">
                <strong>{catalog.streams.length}</strong> streams
              </span>
            ) : null}
          </div>
        </div>
        <div className="table-actions">
          <Button asChild variant="outline" className="h-10 rounded-full px-5">
            <Link href="/admin/drafts">Open Drafts</Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-full px-5">
            <Link href="/admin/intake">Open Intake</Link>
          </Button>
        </div>
      </div>

      <div className="library-workspace">
        <div className="library-workspace-body">
          <AdminLibraryFiltersRail
            catalog={catalog}
            stream={stream}
            subject={subject}
            selectedStreamCode={selectedStreamCode}
            selectedSubjectCode={selectedSubjectCode}
            selectedYear={selectedYear}
            onClearStream={() => setSelectedStreamCode("")}
            onClearSubject={() => setSelectedSubjectCode("")}
            onClearYear={() => setSelectedYear(null)}
            onSelectStream={setSelectedStreamCode}
            onSelectSubject={setSelectedSubjectCode}
            onSelectYear={setSelectedYear}
          />

          <div className="library-main-column">
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
              canStartRevision={Boolean(selectedExam?.paperId)}
              onStartRevision={() => {
                void startRevision();
              }}
              hasActiveRevisionDraft={Boolean(activeRevisionJobId)}
              revisionError={revisionError}
              loadingExam={loadingExam}
              examError={examError}
              selectedExam={selectedExam}
              selectedSujetLabel={selectedSujet?.label ?? null}
              onRetryPreview={() => router.refresh()}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
