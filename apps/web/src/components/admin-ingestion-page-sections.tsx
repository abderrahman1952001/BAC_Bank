"use client";

import Link from "next/link";
import type {
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
} from "@/lib/admin";
import {
  BROWSABLE_DRAFT_STATUS_ORDER,
  buildProcessJobActionState,
  formatPaperStreamCodes,
  formatDraftKind,
  formatSession,
  type AdminIngestionStatusGroup,
  type DraftKindFilter,
  type JobStatusFilter,
  type StatusScopedFilter,
} from "@/lib/admin-ingestion-page";
import {
  findSubjectLabel,
  INGESTION_STATUS_LABELS,
  INGESTION_STREAM_OPTIONS,
  INGESTION_SUBJECT_OPTIONS,
} from "@/lib/ingestion-options";

function AdminIngestionStatusGroupSection({
  statusGroup,
  processingJobId,
  onUpdateStatusScopedFilter,
  onProcessJob,
}: {
  statusGroup: AdminIngestionStatusGroup;
  processingJobId: string | null;
  onUpdateStatusScopedFilter: (
    status: AdminIngestionJobSummary["status"],
    patch: Partial<StatusScopedFilter>,
  ) => void;
  onProcessJob: (job: AdminIngestionJobSummary) => void;
}) {
  return (
    <section className="ingestion-job-status-group">
      <div className="admin-page-head ingestion-section-head">
        <h3>{statusGroup.label}</h3>
        <span className="admin-page-meta-pill">
          <strong>{statusGroup.count}</strong> draft
          {statusGroup.count === 1 ? "" : "s"}
        </span>
      </div>

      <div className="ingestion-subfilter-stack">
        <div className="ingestion-subfilter-row">
          <span className="ingestion-subfilter-label">Paper Streams</span>
          <div className="ingestion-subfilter-nav">
            <button
              type="button"
              className={
                statusGroup.activeStreamKey === "all"
                  ? "ingestion-subfilter-chip active"
                  : "ingestion-subfilter-chip"
              }
              onClick={() => {
                onUpdateStatusScopedFilter(statusGroup.status, {
                  streamKey: "all",
                  year: "all",
                });
              }}
            >
              All streams
              <span>{statusGroup.count}</span>
            </button>
            {statusGroup.availableStreamGroups.map((streamGroup) => (
              <button
                key={`${statusGroup.status}-${streamGroup.streamKey}`}
                type="button"
                className={
                  statusGroup.activeStreamKey === streamGroup.streamKey
                    ? "ingestion-subfilter-chip active"
                    : "ingestion-subfilter-chip"
                }
                onClick={() => {
                  onUpdateStatusScopedFilter(statusGroup.status, {
                    streamKey: streamGroup.streamKey,
                    year: "all",
                  });
                }}
              >
                {streamGroup.label}
                <span>{streamGroup.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ingestion-subfilter-row">
          <span className="ingestion-subfilter-label">Year</span>
          <div className="ingestion-subfilter-nav">
            <button
              type="button"
              className={
                statusGroup.activeYear === "all"
                  ? "ingestion-subfilter-chip active"
                  : "ingestion-subfilter-chip"
              }
              onClick={() => {
                onUpdateStatusScopedFilter(statusGroup.status, {
                  year: "all",
                });
              }}
            >
              All years
            </button>
            {statusGroup.availableYears.map((yearGroup) => (
              <button
                key={`${statusGroup.status}-${yearGroup.year}`}
                type="button"
                className={
                  statusGroup.activeYear === yearGroup.year
                    ? "ingestion-subfilter-chip active"
                    : "ingestion-subfilter-chip"
                }
                onClick={() => {
                  onUpdateStatusScopedFilter(statusGroup.status, {
                    year: yearGroup.year,
                  });
                }}
              >
                {yearGroup.year}
                <span>{yearGroup.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ingestion-job-stream-groups">
        {statusGroup.streamGroups.map((streamGroup) => (
          <article
            key={`${statusGroup.status}-${streamGroup.streamKey}`}
            className="ingestion-job-stream-group"
          >
            <header className="ingestion-job-stream-head">
              <h4>{streamGroup.streamLabel}</h4>
              <span className="admin-page-meta-pill">
                <strong>
                  {streamGroup.yearGroups.reduce(
                    (sum, group) => sum + group.jobs.length,
                    0,
                  )}
                </strong>{" "}
                drafts
              </span>
            </header>

            {streamGroup.yearGroups.map((yearGroup) => (
              <section
                key={`${streamGroup.streamKey}-${yearGroup.year}`}
                className="ingestion-job-year-group"
              >
                <div className="ingestion-job-year-head">
                  <strong>{yearGroup.year}</strong>
                  <span>{yearGroup.jobs.length} drafts</span>
                </div>

                <div className="ingestion-job-card-list">
                  {yearGroup.jobs.map((job) => {
                    const processActionState = buildProcessJobActionState({
                      job,
                      processingJobId,
                    });

                    return (
                      <article key={job.id} className="ingestion-job-card">
                        <div className="admin-page-head ingestion-section-head">
                          <div>
                            <p className="page-kicker">
                              {formatDraftKind(job.draft_kind)} Draft
                            </p>
                            <h4>{job.label}</h4>
                            <p className="muted-text">
                              {findSubjectLabel(job.subject_code)} ·{" "}
                              {formatPaperStreamCodes(job.stream_codes)} ·{" "}
                              {formatSession(job.session)}
                            </p>
                          </div>
                          <div className="ingestion-job-card-status">
                            <span className={`status-chip ${job.status}`}>
                              {INGESTION_STATUS_LABELS[job.status]}
                            </span>
                            <span className="ingestion-inline-note">
                              {formatDraftKind(job.draft_kind)}
                            </span>
                            {job.workflow.awaiting_correction ? (
                              <span className="ingestion-inline-note">
                                Waiting for correction
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="ingestion-job-card-meta">
                          <span>{job.source_document_count} docs</span>
                          <span>{job.source_page_count} pages</span>
                          <span>
                            Updated {new Date(job.updated_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="block-item-actions">
                          {job.draft_kind === "ingestion" ? (
                            <button
                              type="button"
                              data-testid={`admin-process-job-${job.id}`}
                              className="btn-secondary"
                              onClick={() => {
                                onProcessJob(job);
                              }}
                              disabled={processActionState.disabled}
                            >
                              {processActionState.label}
                            </button>
                          ) : null}
                          <Link
                            href={`/admin/drafts/${job.id}`}
                            className="btn-primary"
                          >
                            Open Draft
                          </Link>
                          {job.published_exams.map((exam) => (
                            <Link
                              key={exam.id}
                              href={`/admin/library?examId=${exam.id}`}
                              className="btn-secondary"
                            >
                              {`Published ${exam.stream_code}`}
                            </Link>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

export function AdminIngestionManualUploadSection({
  year,
  paperStreamCodes,
  subjectCode,
  session,
  title,
  qualifierKey,
  sourceReference,
  uploading,
  uploadError,
  createdJob,
  onSubmit,
  onYearChange,
  onTogglePaperStream,
  onSubjectCodeChange,
  onSessionChange,
  onTitleChange,
  onQualifierKeyChange,
  onSourceReferenceChange,
  onExamPdfChange,
  onCorrectionPdfChange,
}: {
  year: string;
  paperStreamCodes: string[];
  subjectCode: string;
  session: "NORMAL" | "MAKEUP";
  title: string;
  qualifierKey: string;
  sourceReference: string;
  uploading: boolean;
  uploadError: string | null;
  createdJob: AdminIngestionJobResponse | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onYearChange: (value: string) => void;
  onTogglePaperStream: (code: string, checked: boolean) => void;
  onSubjectCodeChange: (value: string) => void;
  onSessionChange: (value: "NORMAL" | "MAKEUP") => void;
  onTitleChange: (value: string) => void;
  onQualifierKeyChange: (value: string) => void;
  onSourceReferenceChange: (value: string) => void;
  onExamPdfChange: (file: File | null) => void;
  onCorrectionPdfChange: (file: File | null) => void;
}) {
  return (
    <article className="admin-context-card ingestion-entry-card">
      <div className="admin-page-head ingestion-section-head">
        <h2>Manual Upload</h2>
        <span className="admin-page-meta-pill">
          <strong>{paperStreamCodes.length}</strong> stream
          {paperStreamCodes.length === 1 ? "" : "s"}
        </span>
      </div>

      <form className="ingestion-upload-form" onSubmit={onSubmit}>
        <label>
          <span>Year</span>
          <input
            type="number"
            min={2008}
            max={2100}
            value={year}
            onChange={(event) => onYearChange(event.target.value)}
            required
          />
        </label>

        <label className="field admin-form-wide ingestion-upload-span-2">
          <span>Paper Streams</span>
          <div className="ingestion-stream-checkbox-grid">
            {INGESTION_STREAM_OPTIONS.map(([value, label]) => {
              const checked = paperStreamCodes.includes(value);

              return (
                <label
                  key={value}
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
                      onTogglePaperStream(value, event.target.checked);
                    }}
                  />
                  <span>
                    <strong>{value}</strong> {label}
                  </span>
                </label>
              );
            })}
          </div>
        </label>

        <label>
          <span>Subject</span>
          <select
            value={subjectCode}
            onChange={(event) => onSubjectCodeChange(event.target.value)}
          >
            {INGESTION_SUBJECT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {value} · {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Session</span>
          <select
            value={session}
            onChange={(event) =>
              onSessionChange(
                event.target.value === "MAKEUP" ? "MAKEUP" : "NORMAL",
              )
            }
          >
            <option value="NORMAL">NORMAL</option>
            <option value="MAKEUP">MAKEUP</option>
          </select>
        </label>

        <label className="ingestion-upload-span-2">
          <span>Title</span>
          <input
            type="text"
            placeholder="BAC 2025 · MATHEMATICS · SE"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </label>

        <label>
          <span>Qualifier Key</span>
          <input
            type="text"
            placeholder="german / spanish / italian"
            value={qualifierKey}
            onChange={(event) => onQualifierKeyChange(event.target.value)}
          />
        </label>

        <label>
          <span>Source Reference</span>
          <input
            type="text"
            placeholder="Official ministry PDF / local archive"
            value={sourceReference}
            onChange={(event) => onSourceReferenceChange(event.target.value)}
          />
        </label>

        <label>
          <span>Exam PDF</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) =>
              onExamPdfChange(event.target.files?.[0] ?? null)
            }
            required
          />
        </label>

        <label>
          <span>Correction PDF</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) =>
              onCorrectionPdfChange(event.target.files?.[0] ?? null)
            }
          />
        </label>

        <button
          type="submit"
          data-testid="admin-ingestion-submit"
          className="btn-primary"
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Create Ingestion Draft"}
        </button>
      </form>

      {uploadError ? <p className="error-text">{uploadError}</p> : null}
      {createdJob ? (
        <p className="success-text">
          Ingestion draft created.
          {createdJob.workflow.awaiting_correction
            ? " Add the correction PDF before processing."
            : " Ready for processing."}{" "}
          <Link href={`/admin/drafts/${createdJob.job.id}`}>Open draft</Link>
        </p>
      ) : null}
    </article>
  );
}

export function AdminIngestionJobBrowserSection({
  loading,
  jobQuery,
  draftKindFilter,
  draftKindCounts,
  statusFilter,
  statusCounts,
  filteredJobs,
  groupedStatuses,
  processingJobId,
  onJobQueryChange,
  onDraftKindFilterChange,
  onStatusFilterChange,
  onUpdateStatusScopedFilter,
  onProcessJob,
}: {
  loading: boolean;
  jobQuery: string;
  draftKindFilter: DraftKindFilter;
  draftKindCounts: Record<DraftKindFilter, number>;
  statusFilter: JobStatusFilter;
  statusCounts: Record<JobStatusFilter, number>;
  filteredJobs: AdminIngestionJobSummary[];
  groupedStatuses: AdminIngestionStatusGroup[];
  processingJobId: string | null;
  onJobQueryChange: (value: string) => void;
  onDraftKindFilterChange: (value: DraftKindFilter) => void;
  onStatusFilterChange: (value: JobStatusFilter) => void;
  onUpdateStatusScopedFilter: (
    status: AdminIngestionJobSummary["status"],
    patch: Partial<StatusScopedFilter>,
  ) => void;
  onProcessJob: (job: AdminIngestionJobSummary) => void;
}) {
  return (
    <section className="admin-context-card">
      <div className="admin-page-head ingestion-section-head">
        <h2>Draft Queue</h2>
        <label className="field ingestion-job-search">
          <span>Search</span>
          <input
            type="search"
            placeholder="Search title, draft type, stream, subject, year…"
            value={jobQuery}
            onChange={(event) => onJobQueryChange(event.target.value)}
          />
        </label>
      </div>

      <div
        className="ingestion-status-nav"
        role="tablist"
        aria-label="Draft types"
      >
        <button
          type="button"
          className={
            draftKindFilter === "all"
              ? "ingestion-status-chip active"
              : "ingestion-status-chip"
          }
          onClick={() => onDraftKindFilterChange("all")}
        >
          All drafts
          <span>{draftKindCounts.all}</span>
        </button>
        {(["ingestion", "revision"] as const).map((draftKind) => (
          <button
            key={draftKind}
            type="button"
            className={
              draftKindFilter === draftKind
                ? "ingestion-status-chip active"
                : "ingestion-status-chip"
            }
            onClick={() => onDraftKindFilterChange(draftKind)}
          >
            {formatDraftKind(draftKind)}
            <span>{draftKindCounts[draftKind]}</span>
          </button>
        ))}
      </div>

      <div
        className="ingestion-status-nav"
        role="tablist"
        aria-label="Draft statuses"
      >
        <button
          type="button"
          className={
            statusFilter === "all"
              ? "ingestion-status-chip active"
              : "ingestion-status-chip"
          }
          onClick={() => onStatusFilterChange("all")}
        >
          All
          <span>{statusCounts.all}</span>
        </button>
        {BROWSABLE_DRAFT_STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            className={
              statusFilter === status
                ? "ingestion-status-chip active"
                : "ingestion-status-chip"
            }
            onClick={() => onStatusFilterChange(status)}
          >
            {INGESTION_STATUS_LABELS[status]}
            <span>{statusCounts[status]}</span>
          </button>
        ))}
      </div>

      {!loading && !filteredJobs.length ? (
        <article className="ingestion-empty-state">
          <h3>No matching drafts</h3>
          <p className="muted-text">Adjust the filters or create a new draft.</p>
        </article>
      ) : null}

      <div className="ingestion-job-browser">
        {groupedStatuses.map((statusGroup) => (
          <AdminIngestionStatusGroupSection
            key={statusGroup.status}
            statusGroup={statusGroup}
            processingJobId={processingJobId}
            onUpdateStatusScopedFilter={onUpdateStatusScopedFilter}
            onProcessJob={onProcessJob}
          />
        ))}
      </div>
    </section>
  );
}
