'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import type {
  AdminIngestionDraft,
  AdminIngestionJobResponse,
  AdminIngestionValidationIssue,
} from '@/lib/admin';
import { formatIssueLocation } from '@/lib/admin-ingestion-review';
import {
  INGESTION_STREAM_OPTIONS,
  INGESTION_SUBJECT_OPTIONS,
} from '@/lib/ingestion-options';

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
              ? 'validation-issue-button active'
              : 'validation-issue-button'
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
  onIssueFocus,
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
  onIssueFocus: (issue: AdminIngestionValidationIssue) => void;
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
          <h3>Status</h3>
          <p>
            <span className={`status-chip ${data.job.status}`}>{data.job.status}</span>
          </p>
          {workflow.awaiting_correction ? (
            <p className="muted-text">Waiting for correction before processing.</p>
          ) : null}
          <p className="muted-text">Provider: {data.job.provider}</p>
        </article>
        <article className="admin-workflow-card">
          <h3>{isPublishedRevisionJob ? 'Revision Source' : 'Source Files'}</h3>
          {isPublishedRevisionJob ? (
            <>
              <p>Published canonical paper</p>
              <p>{publishedExams.length || 1} live offering(s)</p>
              <p className="muted-text">
                This revision draft starts from live content, so PDF processing and
                crop recovery are intentionally unavailable.
              </p>
            </>
          ) : (
            <>
              <p>{data.documents.length} documents</p>
              <p>{sourcePageCount} rasterized pages</p>
              <p className="muted-text">
                Correction: {workflow.has_correction_document ? 'attached' : 'missing'}
              </p>
            </>
          )}
        </article>
        <article className="admin-workflow-card">
          <h3>Draft Assets</h3>
          <p>{draft.assets.length} reviewed asset regions</p>
          <p className="muted-text">Publish only reads reviewed data from this draft.</p>
        </article>
        <article className="admin-workflow-card">
          <h3>{isPublishedRevisionJob ? 'Imported Draft' : 'Extraction'}</h3>
          {isPublishedRevisionJob ? (
            <>
              <p>Loaded from the published paper hierarchy</p>
              <p>
                Exercises: <strong>{extractionSummary?.exerciseCount ?? 0}</strong> ·
                Questions: <strong>{extractionSummary?.questionCount ?? 0}</strong>
              </p>
              <p className="muted-text">
                The revision editor starts from the current live structure instead of
                OCR output.
              </p>
            </>
          ) : (
            <>
              <p>
                {extractionSummary?.engine ?? 'Unknown engine'}
                {extractionSummary?.model ? ` · ${extractionSummary.model}` : ''}
              </p>
              <p>
                Exercises: <strong>{extractionSummary?.exerciseCount ?? 0}</strong> ·
                Questions: <strong>{extractionSummary?.questionCount ?? 0}</strong>
              </p>
              <p className="muted-text">
                Assets: <strong>{extractionSummary?.assetCount ?? 0}</strong> ·
                Uncertainties: <strong>{extractionSummary?.uncertaintyCount ?? 0}</strong>
              </p>
            </>
          )}
        </article>
        <article className="admin-workflow-card">
          <h3>Validation</h3>
          <p>
            Errors: <strong>{validationSummary.errors.length}</strong> · Warnings:{' '}
            <strong>{validationSummary.warnings.length}</strong>
          </p>
          <p className="muted-text">
            Approval and publish are blocked until errors reach zero.
          </p>
        </article>
        <article className="admin-workflow-card">
          <h3>Published Offerings</h3>
          {publishedExams.length ? (
            <>
              <p>{publishedExams.length} stream offering(s)</p>
              <div className="block-item-actions">
                {publishedExams.map((exam) => (
                  <Link
                    key={exam.id}
                    href={`/admin/library?examId=${exam.id}`}
                    className="btn-secondary"
                  >
                    {exam.is_primary ? `${exam.stream_code} · Primary` : exam.stream_code}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="muted-text">
              Publish creates one exam offering per selected paper stream.
            </p>
          )}
        </article>
      </div>

      {validationSummary.issues.length ? (
        <section className="admin-validation-issue-grid">
          <ValidationIssueList
            title="Blocking Validation Errors"
            issues={validationSummary.issues.filter((issue) => issue.severity === 'error')}
            focusedIssueId={focusedIssueId}
            onIssueFocus={onIssueFocus}
            className="admin-validation-box"
          />
          <ValidationIssueList
            title="Validation Warnings"
            issues={validationSummary.issues.filter((issue) => issue.severity === 'warning')}
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
            <div>
              <h2>Waiting for Correction</h2>
              <p className="muted-text">
                Upload the correction PDF here, then process exam and correction
                together in one pass.
              </p>
            </div>
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
              {attachingCorrection ? 'Uploading…' : 'Attach Correction PDF'}
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
  onPrimaryStreamCodeChange,
  onSelectedStreamCodesChange,
}: {
  draft: AdminIngestionDraft;
  selectedStreamCodes: string[];
  onYearChange: (year: number) => void;
  onSubjectCodeChange: (subjectCode: string | null) => void;
  onSessionTypeChange: (sessionType: 'NORMAL' | 'MAKEUP') => void;
  onPrimaryStreamCodeChange: (streamCode: string | null) => void;
  onSelectedStreamCodesChange: (nextCodes: string[]) => void;
}) {
  return (
    <section className="admin-form">
      <div className="admin-page-head ingestion-section-head">
        <div>
          <h2>Metadata Review</h2>
          <p className="muted-text">
            Keep paper metadata explicit before approval. Subject is controlled, and
            shared-paper streams are tracked together here.
          </p>
        </div>
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
            value={draft.exam.subjectCode ?? ''}
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
              onSessionTypeChange(event.target.value as 'NORMAL' | 'MAKEUP');
            }}
          >
            <option value="NORMAL">Normal</option>
            <option value="MAKEUP">Rattrapage</option>
          </select>
        </label>

        {selectedStreamCodes.length > 1 ? (
          <label className="field">
            <span>Primary Exam Offering Stream</span>
            <select
              value={draft.exam.streamCode ?? selectedStreamCodes[0]}
              onChange={(event) => {
                onPrimaryStreamCodeChange(event.target.value || null);
              }}
            >
              {selectedStreamCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            <span>Primary Exam Offering Stream</span>
            <input value={draft.exam.streamCode ?? ''} readOnly />
          </label>
        )}

        <label className="field admin-form-wide">
          <span>Paper Streams</span>
          <div className="ingestion-stream-checkbox-grid">
            {INGESTION_STREAM_OPTIONS.map(([code, label]) => {
              const checked = selectedStreamCodes.includes(code);

              return (
                <label
                  key={code}
                  className={
                    checked
                      ? 'ingestion-stream-option active'
                      : 'ingestion-stream-option'
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
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
            These PDFs are the provenance of the shared paper. Publish creates one
            exam offering per selected stream, and the primary stream keeps the
            default job-level exam link stable.
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
              <h3>{document.kind === 'correction' ? 'Correction PDF' : 'Exam PDF'}</h3>
              <p>{document.file_name}</p>
              <p className="muted-text">
                {document.page_count ?? 0} pages
                {document.source_url ? ` · ${document.source_url}` : ''}
              </p>
              <p>
                <a href={document.download_url} target="_blank" rel="noreferrer">
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
                ? 'This draft was created from the live published paper. Start a new ingestion job if you need source-page processing or crop-based asset recovery.'
                : 'Attach and process the exam source files before reviewing this section.'}
            </p>
          </article>
        )}
      </div>

      <section className="admin-context-card">
        <div className="admin-page-head ingestion-section-head">
          <div>
            <h2>Source Pages</h2>
            <p className="muted-text">
              Browse the rasterized pages separately from structure editing.
            </p>
          </div>
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
                        {document.kind === 'correction' ? 'Correction' : 'Exam'} page{' '}
                        {page.page_number}
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
                ? 'Published revisions do not include rasterized source pages.'
                : 'No rasterized pages are available for this job yet.'}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
