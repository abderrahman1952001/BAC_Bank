"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminIngestionAssetWorkspace } from "@/components/admin-ingestion-asset-workspace";
import {
  AdminIngestionReviewMetadataSection,
  AdminIngestionReviewOverviewSection,
  AdminIngestionReviewSourcesSection,
} from "@/components/admin-ingestion-review-sections";
import { AdminIngestionStructureEditor } from "@/components/admin-ingestion-structure-editor";
import type {
  AdminIngestionJobResponse,
  AdminIngestionValidationIssue,
} from "@/lib/admin";
import {
  buildDraftWithSelectedStreamCodes,
  buildExtractionSummary,
  buildFocusRequest,
  buildIssueCountBySection,
  buildProcessActionLabel,
  buildReviewActionState,
  canRunPrimaryReviewAction,
  formatAutosaveTimestamp,
  readDraftSelectedStreamCodes,
  resolveIssueSection,
  REVIEW_SECTION_LABELS,
  scrollToIssueTarget,
  type ReviewSection,
} from "@/lib/admin-ingestion-review";
import { useAdminIngestionReviewSession } from "@/lib/admin-ingestion-review-session";

export function AdminIngestionReviewPage({
  jobId,
  initialPayload,
}: {
  jobId: string;
  initialPayload?: AdminIngestionJobResponse;
}) {
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ReviewSection>("overview");
  const {
    data,
    draft,
    loading,
    saving,
    autosaving,
    processing,
    attachingCorrection,
    error,
    notice,
    autosaveError,
    hasUnsavedChanges,
    lastSavedAt,
    correctionFile,
    reviewNotes,
    setReviewNotes,
    setCorrectionFile,
    syncDraft,
    updateDraft,
    saveDraft,
    processJob,
    attachCorrection,
    approveJob,
    approveAndPublish,
  } = useAdminIngestionReviewSession({
    jobId,
    initialPayload,
  });

  const sourcePages = useMemo(
    () =>
      data?.documents.flatMap((document) =>
        document.pages.map((page) => ({
          ...page,
          documentId: document.id,
          documentKind: document.kind,
        })),
      ) ?? [],
    [data?.documents],
  );

  const extractionSummary = useMemo(() => {
    return buildExtractionSummary(draft);
  }, [draft]);

  const validationSummary = data?.validation ?? {
    errors: [],
    warnings: [],
    issues: [],
    can_approve: false,
    can_publish: false,
  };
  const workflow = data?.workflow ?? {
    has_exam_document: false,
    has_correction_document: false,
    awaiting_correction: false,
    can_process: false,
    review_started: false,
    active_operation: "idle",
  };
  const formattedLastSavedAt = useMemo(
    () => formatAutosaveTimestamp(lastSavedAt),
    [lastSavedAt],
  );
  const effectiveFocusedIssueId =
    focusedIssueId &&
    validationSummary.issues.some((issue) => issue.id === focusedIssueId)
      ? focusedIssueId
      : null;
  const focusedIssue = useMemo(
    () =>
      validationSummary.issues.find(
        (issue) => issue.id === effectiveFocusedIssueId,
      ) ?? null,
    [effectiveFocusedIssueId, validationSummary.issues],
  );
  const focusRequest = useMemo(
    () => buildFocusRequest(focusedIssue),
    [focusedIssue],
  );
  const selectedStreamCodes = useMemo(
    () => readDraftSelectedStreamCodes(draft?.exam),
    [draft?.exam],
  );
  const issueCountBySection = useMemo(
    () => buildIssueCountBySection(validationSummary.issues),
    [validationSummary.issues],
  );

  function handleIssueFocus(issue: AdminIngestionValidationIssue) {
    const nextSection = resolveIssueSection(issue);
    setActiveSection(nextSection);
    setFocusedIssueId(issue.id);

    window.setTimeout(() => {
      scrollToIssueTarget(issue);
    }, 80);
  }

  function updateSelectedStreams(nextCodes: string[]) {
    updateDraft((current) => {
      return buildDraftWithSelectedStreamCodes(current, nextCodes);
    });
  }
  if (loading) {
    return (
      <section className="panel">
        <p>Loading ingestion job…</p>
      </section>
    );
  }

  if (!data || !draft) {
    return (
      <section className="panel">
        <p className="error-text">{error ?? "Ingestion job not found."}</p>
      </section>
    );
  }

  const reviewActionState = buildReviewActionState({
    job: data.job,
    workflow,
    saving,
    autosaving,
    autosaveError,
    hasUnsavedChanges,
    formattedLastSavedAt,
    processing,
    attachingCorrection,
  });
  const primaryActionLabel = reviewActionState.primaryActionLabel;
  const isRevisionDraft = reviewActionState.isRevisionDraft;
  const saveActionLabel = reviewActionState.saveActionLabel;
  const approveActionLabel = reviewActionState.approveActionLabel;
  const publishedExams = data.job.published_exams;
  const autosaveStatusMessage = reviewActionState.autosaveStatusMessage;
  const autosaveStatusClassName = reviewActionState.autosaveStatusClassName;
  const processActionLabel = buildProcessActionLabel({
    workflow,
    jobStatus: data.job.status,
    processing,
  });
  const canRunPrimaryAction = canRunPrimaryReviewAction({
    job: data.job,
    validation: validationSummary,
  });
  const publishedJobFrozenMessage =
    data.job.status === "published"
      ? isRevisionDraft
        ? "This published revision is frozen."
        : "This ingestion job is published and frozen. Start a revision from the library to make further changes."
      : null;

  return (
    <section className="panel">
      <div className="admin-page-head">
        <div className="admin-page-intro">
          <h1>{data.job.label}</h1>
          <div className="admin-page-meta-row">
            <span className="admin-page-meta-pill">
              {isRevisionDraft ? "Revision draft" : "Ingestion draft"}
            </span>
            <span className={`status-chip ${data.job.status}`}>
              {data.job.status}
            </span>
            <span className="admin-page-meta-pill">
              <strong>{publishedExams.length}</strong> offering
              {publishedExams.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="table-actions ingestion-action-bar">
          {publishedExams.map((exam) => (
            <Link
              key={exam.id}
              href={`/admin/library?examId=${exam.id}`}
              className="btn-secondary"
            >
              {`Open ${exam.stream_code} Exam`}
            </Link>
          ))}
          {!isRevisionDraft ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void processJob(workflow);
              }}
              disabled={
                reviewActionState.actionBusy ||
                data.job.status === "published" ||
                !workflow.can_process
              }
            >
              {processActionLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              void saveDraft().catch(() => undefined);
            }}
            disabled={
              reviewActionState.actionBusy || data.job.status === "published"
            }
          >
            {saveActionLabel}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={approveJob}
            disabled={
              reviewActionState.actionBusy || !validationSummary.can_approve
            }
          >
            {approveActionLabel}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={approveAndPublish}
            disabled={
              reviewActionState.actionBusy ||
              !canRunPrimaryAction ||
              (!isRevisionDraft && !workflow.has_correction_document)
            }
          >
            {primaryActionLabel}
          </button>
        </div>
      </div>

      <p className={autosaveStatusClassName}>{autosaveStatusMessage}</p>
      {error ? <p className="error-text">{error}</p> : null}
      {notice ? <p className="success-text">{notice}</p> : null}
      {publishedJobFrozenMessage ? (
        <p className="muted-text">{publishedJobFrozenMessage}</p>
      ) : null}

      <div
        className="ingestion-review-section-nav"
        role="tablist"
        aria-label="Review sections"
      >
        {(Object.keys(REVIEW_SECTION_LABELS) as ReviewSection[]).map(
          (section) => (
            <button
              key={section}
              type="button"
              className={
                activeSection === section
                  ? "ingestion-section-chip active"
                  : "ingestion-section-chip"
              }
              onClick={() => {
                setActiveSection(section);
              }}
            >
              {REVIEW_SECTION_LABELS[section]}
              {issueCountBySection[section] > 0 ? (
                <span>{issueCountBySection[section]}</span>
              ) : null}
            </button>
          ),
        )}
      </div>

      {activeSection === "overview" ? (
        <section className="ingestion-section-panel">
          <AdminIngestionReviewOverviewSection
            data={data}
            draft={draft}
            sourcePageCount={sourcePages.length}
            extractionSummary={extractionSummary}
            isPublishedRevisionJob={isRevisionDraft}
            focusedIssueId={effectiveFocusedIssueId}
            correctionFile={correctionFile}
            actionBusy={reviewActionState.actionBusy}
            attachingCorrection={attachingCorrection}
            reviewNotes={reviewNotes}
            notesReadOnly={data.job.status === "published"}
            onIssueFocus={handleIssueFocus}
            onReviewNotesChange={setReviewNotes}
            onCorrectionFileChange={setCorrectionFile}
            onAttachCorrection={() => {
              void attachCorrection();
            }}
          />
        </section>
      ) : null}

      {activeSection === "metadata" ? (
        <section className="ingestion-section-panel">
          <AdminIngestionReviewMetadataSection
            draft={draft}
            selectedStreamCodes={selectedStreamCodes}
            onYearChange={(year) => {
              updateDraft((current) => ({
                ...current,
                exam: {
                  ...current.exam,
                  year,
                },
              }));
            }}
            onSubjectCodeChange={(subjectCode) => {
              updateDraft((current) => ({
                ...current,
                exam: {
                  ...current.exam,
                  subjectCode,
                },
              }));
            }}
            onSessionTypeChange={(sessionType) => {
              updateDraft((current) => ({
                ...current,
                exam: {
                  ...current.exam,
                  sessionType,
                },
              }));
            }}
            onSelectedStreamCodesChange={updateSelectedStreams}
          />
        </section>
      ) : null}

      {activeSection === "structure" ? (
        <section className="ingestion-section-panel">
          <AdminIngestionStructureEditor
            jobId={jobId}
            draft={draft}
            sourcePages={sourcePages}
            assetPreviewBaseUrl={data.asset_preview_base_url}
            issues={validationSummary.issues}
            focusRequest={activeSection === "structure" ? focusRequest : null}
            onChange={syncDraft}
          />
        </section>
      ) : null}

      {activeSection === "sources" ? (
        <section className="ingestion-section-panel">
          <AdminIngestionReviewSourcesSection
            data={data}
            isPublishedRevisionJob={isRevisionDraft}
          />
        </section>
      ) : null}

      {activeSection === "assets" ? (
        <section className="ingestion-section-panel">
          <AdminIngestionAssetWorkspace
            draft={draft}
            sourcePages={sourcePages}
            assetPreviewBaseUrl={data.asset_preview_base_url}
            focusedAssetId={
              activeSection === "assets"
                ? (focusedIssue?.assetId ?? null)
                : null
            }
            focusedSourcePageId={
              activeSection === "assets"
                ? (focusedIssue?.sourcePageId ?? null)
                : null
            }
            onChange={syncDraft}
          />
        </section>
      ) : null}
    </section>
  );
}
