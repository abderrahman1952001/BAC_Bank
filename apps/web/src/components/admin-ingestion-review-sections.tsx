"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type {
  AdminIngestionDraft,
  AdminIngestionJobResponse,
  AdminIngestionValidationIssue,
} from "@/lib/admin";
import { formatIssueLocation } from "@/lib/admin-ingestion-review";
import {
  INGESTION_STREAM_OPTIONS,
  INGESTION_SUBJECT_OPTIONS,
} from "@/lib/ingestion-options";

type ExtractionSummary = {
  engine: string | null;
  model: string | null;
  exerciseCount: number | null;
  questionCount: number | null;
  assetCount: number | null;
  uncertaintyCount: number | null;
} | null;

function ValidationIssueList({
  title,
  issues,
  focusedIssueId,
  onIssueFocus,
  className,
}: {
  title: string;
  issues: AdminIngestionValidationIssue[];
  focusedIssueId: string | null;
  onIssueFocus: (issue: AdminIngestionValidationIssue) => void;
  className: string;
}) {
  return (
    <article className={className}>
      <strong>{title}</strong>
      {issues.map((issue) => (
        <button
          key={issue.id}
          type="button"
          className={
            issue.id === focusedIssueId
              ? "validation-issue-button active"
              : "validation-issue-button"
          }
          onClick={() => {
            onIssueFocus(issue);
          }}
        >
          <strong>{issue.message}</strong>
          <span>{formatIssueLocation(issue)}</span>
        </button>
      ))}
    </article>
  );
}

export function AdminIngestionReviewOverviewSection({
  data,
  draft,
  sourcePageCount,
  extractionSummary,
  isPublishedRevisionJob,
  focusedIssueId,
  correctionFile,
  actionBusy,
  attachingCorrection,
  reviewNotes,
  notesReadOnly,
  onIssueFocus,
  onReviewNotesChange,
  onCorrectionFileChange,
  onAttachCorrection,
}: {
  data: AdminIngestionJobResponse;
  draft: AdminIngestionDraft;
  sourcePageCount: number;
  extractionSummary: ExtractionSummary;
  isPublishedRevisionJob: boolean;
  focusedIssueId: string | null;
  correctionFile: File | null;
  actionBusy: boolean;
  attachingCorrection: boolean;
  reviewNotes: string;
  notesReadOnly: boolean;
  onIssueFocus: (issue: AdminIngestionValidationIssue) => void;
  onReviewNotesChange: (value: string) => void;
  onCorrectionFileChange: (file: File | null) => void;
  onAttachCorrection: () => void;
}) {
  const workflow = data.workflow;
  const publishedExams = data.job.published_exams;
  const validationSummary = data.validation;

  return (
    <>
      <div className="admin-workflow-grid">
        <article className="admin-workflow-card">
          <span className="admin-stat-label">Status</span>
          <div className="admin-summary-stack">
            <span className={`status-chip ${data.job.status}`}>
              {data.job.status}
            </span>
            <strong>
              {data.job.draft_kind === "revision" ? "Revision draft" : "Ingestion draft"}
            </strong>
            {workflow.awaiting_correction ? (
              <span className="muted-text">Waiting for correction</span>
            ) : null}
          </div>
        </article>
        <article className="admin-workflow-card">
          <span className="admin-stat-label">
            {isPublishedRevisionJob ? "Revision Source" : "Source Files"}
          </span>
          {isPublishedRevisionJob ? (
            <div className="admin-summary-stack">
              <strong>Published canonical paper</strong>
              <span>{publishedExams.length || 1} live offering(s)</span>
            </div>
          ) : (
            <div className="admin-summary-stack">
              <strong>{data.documents.length} documents</strong>
              <span>{sourcePageCount} rasterized pages</span>
              <span className="muted-text">
                Correction {workflow.has_correction_document ? "attached" : "missing"}
              </span>
            </div>
          )}
        </article>
        <article className="admin-workflow-card">
          <span className="admin-stat-label">Draft Assets</span>
          <div className="admin-summary-stack">
            <strong>{draft.assets.length} reviewed regions</strong>
            <span className="muted-text">Draft-backed only</span>
          </div>
        </article>
        <article className="admin-workflow-card">
          <span className="admin-stat-label">
            {isPublishedRevisionJob ? "Imported Draft" : "Extraction"}
          </span>
          {isPublishedRevisionJob ? (
            <div className="admin-summary-stack">
              <strong>Loaded from live structure</strong>
              <span>
                {extractionSummary?.exerciseCount ?? 0} exercises ·{" "}
                {extractionSummary?.questionCount ?? 0} questions
              </span>
            </div>
          ) : (
            <div className="admin-summary-stack">
              <strong>
                {extractionSummary?.engine ?? "Unknown engine"}
                {extractionSummary?.model
                  ? ` · ${extractionSummary.model}`
                  : ""}
              </strong>
              <span>
                {extractionSummary?.exerciseCount ?? 0} exercises ·{" "}
                {extractionSummary?.questionCount ?? 0} questions
              </span>
              <span className="muted-text">
                {extractionSummary?.assetCount ?? 0} assets ·{" "}
                {extractionSummary?.uncertaintyCount ?? 0} uncertainties
              </span>
            </div>
          )}
        </article>
        <article className="admin-workflow-card">
          <span className="admin-stat-label">Validation</span>
          <div className="admin-summary-stack">
            <strong>
              {validationSummary.errors.length} errors ·{" "}
              {validationSummary.warnings.length} warnings
            </strong>
            <span className="muted-text">Errors must be zero to publish</span>
          </div>
        </article>
        <article className="admin-workflow-card">
          <span className="admin-stat-label">Published Offerings</span>
          {publishedExams.length ? (
            <div className="admin-summary-stack">
              <strong>{publishedExams.length} stream offering(s)</strong>
              <div className="block-item-actions">
                {publishedExams.map((exam) => (
                  <Link
                    key={exam.id}
                    href={`/admin/library?examId=${exam.id}`}
                    className="btn-secondary"
                  >
                    {exam.stream_code}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <span className="muted-text">No live offerings yet</span>
          )}
        </article>
      </div>

      <section className="admin-context-card">
        <div className="admin-page-head ingestion-section-head">
          <h2>Review Notes</h2>
        </div>

        <label className="field admin-form-wide">
          <span>Reviewer Handoff</span>
          <textarea
            rows={6}
            value={reviewNotes}
            onChange={(event) => {
              onReviewNotesChange(event.target.value);
            }}
            placeholder="Summarize reviewer context, known risks, or publication notes for the next admin."
            disabled={notesReadOnly}
          />
        </label>
      </section>

      {validationSummary.issues.length ? (
        <section className="admin-validation-issue-grid">
          <ValidationIssueList
            title="Blocking Validation Errors"
            issues={validationSummary.issues.filter(
              (issue) => issue.severity === "error",
            )}
            focusedIssueId={focusedIssueId}
            onIssueFocus={onIssueFocus}
            className="admin-validation-box"
          />
          <ValidationIssueList
            title="Validation Warnings"
            issues={validationSummary.issues.filter(
              (issue) => issue.severity === "warning",
            )}
            focusedIssueId={focusedIssueId}
            onIssueFocus={onIssueFocus}
            className="admin-context-card"
          />
        </section>
      ) : null}

      {data.job.error_message ? (
        <article className="admin-validation-box">
          <strong>Importer error</strong>
          <p>{data.job.error_message}</p>
        </article>
      ) : null}

      {workflow.awaiting_correction ? (
        <section className="admin-context-card">
          <div className="admin-page-head ingestion-section-head">
            <h2>Attach Correction</h2>
          </div>

          <div className="admin-form-grid">
            <label className="field admin-form-wide">
              <span>Correction PDF</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  onCorrectionFileChange(event.target.files?.[0] ?? null);
                }}
              />
            </label>
          </div>

          <div className="block-item-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={onAttachCorrection}
              disabled={actionBusy || !correctionFile}
            >
              {attachingCorrection ? "Uploading…" : "Attach Correction PDF"}
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}

export function AdminIngestionReviewMetadataSection({
  draft,
  selectedStreamCodes,
  onYearChange,
  onSubjectCodeChange,
  onSessionTypeChange,
  onSelectedStreamCodesChange,
}: {
  draft: AdminIngestionDraft;
  selectedStreamCodes: string[];
  onYearChange: (year: number) => void;
  onSubjectCodeChange: (subjectCode: string | null) => void;
  onSessionTypeChange: (sessionType: "NORMAL" | "MAKEUP") => void;
  onSelectedStreamCodesChange: (nextCodes: string[]) => void;
}) {
  return (
    <section className="admin-form">
      <div className="admin-page-head ingestion-section-head">
        <h2>Metadata</h2>
      </div>

      <div className="admin-form-grid">
        <label className="field">
          <span>Year</span>
          <input
            type="number"
            value={draft.exam.year}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);

              if (Number.isInteger(value)) {
                onYearChange(value);
              }
            }}
          />
        </label>

        <label className="field">
          <span>Subject Code</span>
          <select
            value={draft.exam.subjectCode ?? ""}
            onChange={(event) => {
              onSubjectCodeChange(event.target.value || null);
            }}
          >
            <option value="">Select subject</option>
            {INGESTION_SUBJECT_OPTIONS.map(([code, label]) => (
              <option key={code} value={code}>
                {code} · {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Session</span>
          <select
            value={draft.exam.sessionType}
            onChange={(event) => {
              onSessionTypeChange(event.target.value as "NORMAL" | "MAKEUP");
            }}
          >
            <option value="NORMAL">Normal</option>
            <option value="MAKEUP">Rattrapage</option>
          </select>
        </label>

        <label className="field admin-form-wide">
          <span>Paper Streams</span>
          <div className="ingestion-stream-checkbox-grid">
            {INGESTION_STREAM_OPTIONS.map(([code, label]) => {
              const checked = selectedStreamCodes.includes(code);
              const wouldClearLastSelected =
                checked && selectedStreamCodes.length === 1;

              return (
                <label
                  key={code}
                  className={
                    checked
                      ? "ingestion-stream-option active"
                      : "ingestion-stream-option"
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      if (
                        !event.target.checked &&
                        wouldClearLastSelected
                      ) {
                        return;
                      }

                      onSelectedStreamCodesChange(
                        event.target.checked
                          ? [...selectedStreamCodes, code]
                          : selectedStreamCodes.filter(
                              (streamCode) => streamCode !== code,
                            ),
                      );
                    }}
                  />
                  <span>{code}</span>
                  <small>{label}</small>
                </label>
              );
            })}
          </div>
          <small className="muted-text">
            At least one paper stream must remain selected.
          </small>
        </label>
      </div>
    </section>
  );
}

export function AdminIngestionReviewSourcesSection({
  data,
  isPublishedRevisionJob,
}: {
  data: AdminIngestionJobResponse;
  isPublishedRevisionJob: boolean;
}) {
  return (
    <>
      <div className="admin-workflow-grid">
        {data.documents.length ? (
          data.documents.map((document) => (
            <article key={document.id} className="admin-context-card">
              <h3>
                {document.kind === "correction" ? "Correction PDF" : "Exam PDF"}
              </h3>
              <p>{document.file_name}</p>
              <p className="muted-text">
                {document.page_count ?? 0} pages
                {document.source_url ? ` · ${document.source_url}` : ""}
              </p>
              <p>
                <a
                  href={document.download_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source PDF
                </a>
              </p>
            </article>
          ))
        ) : (
          <article className="admin-context-card">
            <h3>No source PDFs attached</h3>
            <p className="muted-text">
              {isPublishedRevisionJob
                ? "This draft was created from the live published paper. Start a new ingestion job if you need source-page processing or crop-based asset recovery."
                : "Attach and process the exam source files before reviewing this section."}
            </p>
          </article>
        )}
      </div>

      <section className="admin-context-card">
        <div className="admin-page-head ingestion-section-head">
          <h2>Source Pages</h2>
        </div>

        <div className="ingestion-page-list">
          {data.documents.some((document) => document.pages.length > 0) ? (
            data.documents.map((document) =>
              document.pages.map((page) => (
                <article
                  key={page.id}
                  className="ingestion-page-card"
                  id={`source-page-${page.id}`}
                >
                  <div className="ingestion-section-head">
                    <div>
                      <strong>
                        {document.kind === "correction" ? "Correction" : "Exam"}{" "}
                        page {page.page_number}
                      </strong>
                      <p className="muted-text">
                        {page.width} × {page.height}
                      </p>
                    </div>
                  </div>

                  <figure className="ingestion-preview-card">
                    <img
                      src={page.image_url}
                      alt={`${document.kind} page ${page.page_number}`}
                    />
                    <figcaption>Stored source page</figcaption>
                  </figure>
                </article>
              )),
            )
          ) : (
            <p className="muted-text">
              {isPublishedRevisionJob
                ? "No source pages for published revisions."
                : "No rasterized pages yet."}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
