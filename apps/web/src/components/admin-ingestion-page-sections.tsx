"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
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
            <FilterChip
              type="button"
              active={statusGroup.activeStreamKey === "all"}
              onClick={() => {
                onUpdateStatusScopedFilter(statusGroup.status, {
                  streamKey: "all",
                  year: "all",
                });
              }}
            >
              All streams
              <span>{statusGroup.count}</span>
            </FilterChip>
            {statusGroup.availableStreamGroups.map((streamGroup) => (
              <FilterChip
                key={`${statusGroup.status}-${streamGroup.streamKey}`}
                type="button"
                active={statusGroup.activeStreamKey === streamGroup.streamKey}
                onClick={() => {
                  onUpdateStatusScopedFilter(statusGroup.status, {
                    streamKey: streamGroup.streamKey,
                    year: "all",
                  });
                }}
              >
                {streamGroup.label}
                <span>{streamGroup.count}</span>
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="ingestion-subfilter-row">
          <span className="ingestion-subfilter-label">Year</span>
          <div className="ingestion-subfilter-nav">
            <FilterChip
              type="button"
              active={statusGroup.activeYear === "all"}
              onClick={() => {
                onUpdateStatusScopedFilter(statusGroup.status, {
                  year: "all",
                });
              }}
            >
              All years
            </FilterChip>
            {statusGroup.availableYears.map((yearGroup) => (
              <FilterChip
                key={`${statusGroup.status}-${yearGroup.year}`}
                type="button"
                active={statusGroup.activeYear === yearGroup.year}
                onClick={() => {
                  onUpdateStatusScopedFilter(statusGroup.status, {
                    year: yearGroup.year,
                  });
                }}
              >
                {yearGroup.year}
                <span>{yearGroup.count}</span>
              </FilterChip>
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
                            <Button
                              type="button"
                              data-testid={`admin-process-job-${job.id}`}
                              variant="outline"
                              className="h-9 rounded-full px-3"
                              onClick={() => {
                                onProcessJob(job);
                              }}
                              disabled={processActionState.disabled}
                            >
                              {processActionState.label}
                            </Button>
                          ) : null}
                          <Button asChild className="h-9 rounded-full px-3">
                            <Link href={`/admin/drafts/${job.id}`}>Open Draft</Link>
                          </Button>
                          {job.published_exams.map((exam) => (
                            <Button
                              key={exam.id}
                              asChild
                              variant="outline"
                              className="h-9 rounded-full px-3"
                            >
                              <Link href={`/admin/library?examId=${exam.id}`}>
                                {`Published ${exam.stream_code}`}
                              </Link>
                            </Button>
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
          <Input
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
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      onTogglePaperStream(value, nextChecked === true);
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
          <NativeSelect
            value={subjectCode}
            onChange={(event) => onSubjectCodeChange(event.target.value)}
          >
            {INGESTION_SUBJECT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {value} · {label}
              </option>
            ))}
          </NativeSelect>
        </label>

        <label>
          <span>Session</span>
          <NativeSelect
            value={session}
            onChange={(event) =>
              onSessionChange(
                event.target.value === "MAKEUP" ? "MAKEUP" : "NORMAL",
              )
            }
          >
            <option value="NORMAL">NORMAL</option>
            <option value="MAKEUP">MAKEUP</option>
          </NativeSelect>
        </label>

        <label className="ingestion-upload-span-2">
          <span>Title</span>
          <Input
            type="text"
            placeholder="BAC 2025 · MATHEMATICS · SE"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </label>

        <label>
          <span>Qualifier Key</span>
          <Input
            type="text"
            placeholder="german / spanish / italian"
            value={qualifierKey}
            onChange={(event) => onQualifierKeyChange(event.target.value)}
          />
        </label>

        <label>
          <span>Source Reference</span>
          <Input
            type="text"
            placeholder="Official ministry PDF / local archive"
            value={sourceReference}
            onChange={(event) => onSourceReferenceChange(event.target.value)}
          />
        </label>

        <label>
          <span>Exam PDF</span>
          <Input
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
          <Input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) =>
              onCorrectionPdfChange(event.target.files?.[0] ?? null)
            }
          />
        </label>

        <Button
          type="submit"
          data-testid="admin-ingestion-submit"
          className="h-10 rounded-full px-5"
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Create Ingestion Draft"}
        </Button>
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
          <Input
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
        <FilterChip
          type="button"
          active={draftKindFilter === "all"}
          onClick={() => onDraftKindFilterChange("all")}
        >
          All drafts
          <span>{draftKindCounts.all}</span>
        </FilterChip>
        {(["ingestion", "revision"] as const).map((draftKind) => (
          <FilterChip
            key={draftKind}
            type="button"
            active={draftKindFilter === draftKind}
            onClick={() => onDraftKindFilterChange(draftKind)}
          >
            {formatDraftKind(draftKind)}
            <span>{draftKindCounts[draftKind]}</span>
          </FilterChip>
        ))}
      </div>

      <div
        className="ingestion-status-nav"
        role="tablist"
        aria-label="Draft statuses"
      >
        <FilterChip
          type="button"
          active={statusFilter === "all"}
          onClick={() => onStatusFilterChange("all")}
        >
          All
          <span>{statusCounts.all}</span>
        </FilterChip>
        {BROWSABLE_DRAFT_STATUS_ORDER.map((status) => (
          <FilterChip
            key={status}
            type="button"
            active={statusFilter === status}
            onClick={() => onStatusFilterChange(status)}
          >
            {INGESTION_STATUS_LABELS[status]}
            <span>{statusCounts[status]}</span>
          </FilterChip>
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
