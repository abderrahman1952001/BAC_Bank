'use client';

import Link from 'next/link';
import type {
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
} from '@/lib/admin';
import {
  buildProcessJobActionState,
  formatSession,
  type AdminIngestionStatusGroup,
  type JobStatusFilter,
  type StatusScopedFilter,
} from '@/lib/admin-ingestion-page';
import {
  findStreamLabel,
  findSubjectLabel,
  INGESTION_STATUS_LABELS,
  INGESTION_STATUS_ORDER,
  INGESTION_STREAM_OPTIONS,
  INGESTION_SUBJECT_OPTIONS,
} from '@/lib/ingestion-options';

function AdminIngestionStatusGroupSection({
  statusGroup,
  processingJobId,
  onUpdateStatusScopedFilter,
  onProcessJob,
}: {
  statusGroup: AdminIngestionStatusGroup;
  processingJobId: string | null;
  onUpdateStatusScopedFilter: (
    status: AdminIngestionJobSummary['status'],
    patch: Partial<StatusScopedFilter>,
  ) => void;
  onProcessJob: (job: AdminIngestionJobSummary) => void;
}) {
  return (
    <section className="ingestion-job-status-group">
      <div className="admin-page-head ingestion-section-head">
        <div>
          <h3>{statusGroup.label}</h3>
          <p className="muted-text">
            {statusGroup.count} job{statusGroup.count === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="ingestion-subfilter-stack">
        <div className="ingestion-subfilter-row">
          <span className="ingestion-subfilter-label">Stream</span>
          <div className="ingestion-subfilter-nav">
            <button
              type="button"
              className={
                statusGroup.activeStreamKey === 'all'
                  ? 'ingestion-subfilter-chip active'
                  : 'ingestion-subfilter-chip'
              }
              onClick={() => {
                onUpdateStatusScopedFilter(statusGroup.status, {
                  streamKey: 'all',
                  year: 'all',
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
                    ? 'ingestion-subfilter-chip active'
                    : 'ingestion-subfilter-chip'
                }
                onClick={() => {
                  onUpdateStatusScopedFilter(statusGroup.status, {
                    streamKey: streamGroup.streamKey,
                    year: 'all',
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
                statusGroup.activeYear === 'all'
                  ? 'ingestion-subfilter-chip active'
                  : 'ingestion-subfilter-chip'
              }
              onClick={() => {
                onUpdateStatusScopedFilter(statusGroup.status, {
                  year: 'all',
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
                    ? 'ingestion-subfilter-chip active'
                    : 'ingestion-subfilter-chip'
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
              <div>
                <h4>{streamGroup.streamLabel}</h4>
                <p className="muted-text">
                  {streamGroup.yearGroups.reduce(
                    (sum, group) => sum + group.jobs.length,
                    0,
                  )}{' '}
                  job
                  {streamGroup.yearGroups.reduce(
                    (sum, group) => sum + group.jobs.length,
                    0,
                  ) === 1
                    ? ''
                    : 's'}
                </p>
              </div>
            </header>

            {streamGroup.yearGroups.map((yearGroup) => (
              <section
                key={`${streamGroup.streamKey}-${yearGroup.year}`}
                className="ingestion-job-year-group"
              >
                <div className="ingestion-job-year-head">
                  <strong>{yearGroup.year}</strong>
                  <span>{yearGroup.jobs.length} jobs</span>
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
                              {findSubjectLabel(job.subject_code)}
                            </p>
                            <h4>{job.label}</h4>
                            <p className="muted-text">
                              {findStreamLabel(job.stream_code)} ·{' '}
                              {formatSession(job.session)}
                            </p>
                          </div>
                          <div className="ingestion-job-card-status">
                            <span className={`status-chip ${job.status}`}>
                              {INGESTION_STATUS_LABELS[job.status]}
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
                          <Link
                            href={`/admin/ingestion/${job.id}`}
                            className="btn-primary"
                          >
                            Open Review
                          </Link>
                          {job.published_exams.map((exam) => (
                            <Link
                              key={exam.id}
                              href={`/admin/library?examId=${exam.id}`}
                              className="btn-secondary"
                            >
                              {exam.is_primary
                                ? `Published ${exam.stream_code}`
                                : exam.stream_code}
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
  streamCode,
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
  onStreamCodeChange,
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
  streamCode: string;
  paperStreamCodes: string[];
  subjectCode: string;
  session: 'NORMAL' | 'MAKEUP';
  title: string;
  qualifierKey: string;
  sourceReference: string;
  uploading: boolean;
  uploadError: string | null;
  createdJob: AdminIngestionJobResponse | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onYearChange: (value: string) => void;
  onStreamCodeChange: (value: string) => void;
  onTogglePaperStream: (code: string, checked: boolean) => void;
  onSubjectCodeChange: (value: string) => void;
  onSessionChange: (value: 'NORMAL' | 'MAKEUP') => void;
  onTitleChange: (value: string) => void;
  onQualifierKeyChange: (value: string) => void;
  onSourceReferenceChange: (value: string) => void;
  onExamPdfChange: (file: File | null) => void;
  onCorrectionPdfChange: (file: File | null) => void;
}) {
  return (
    <article className="admin-context-card ingestion-entry-card">
      <p className="page-kicker">Primary Workflow</p>
      <h2>Manual Upload</h2>
      <p className="muted-text">
        Upload official PDFs directly when you already have them or when a source
        adapter is flaky.
      </p>
      <p className="muted-text">
        Upload both PDFs together when you have them. If the correction is
        missing, create the job now and attach the correction later from the review
        screen.
      </p>

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

        <label>
          <span>Primary Exam Offering Stream</span>
          <select
            value={streamCode}
            onChange={(event) => onStreamCodeChange(event.target.value)}
          >
            {paperStreamCodes.map((code) => (
              <option key={code} value={code}>
                {code} · {findStreamLabel(code)}
              </option>
            ))}
          </select>
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
                      ? 'ingestion-stream-option active'
                      : 'ingestion-stream-option'
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
          <small className="muted-text">
            One shared paper can publish to several streams. The primary exam
            offering stream stays inside the selected set.
          </small>
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
              onSessionChange(event.target.value === 'MAKEUP' ? 'MAKEUP' : 'NORMAL')
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
            required
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
            onChange={(event) => onExamPdfChange(event.target.files?.[0] ?? null)}
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
          {uploading ? 'Uploading…' : 'Create Intake Job'}
        </button>
      </form>

      {uploadError ? <p className="error-text">{uploadError}</p> : null}
      {createdJob ? (
        <p className="success-text">
          Manual intake created.
          {createdJob.workflow.awaiting_correction
            ? ' Add the correction PDF before processing.'
            : ' Ready for processing.'}{' '}
          <Link href={`/admin/ingestion/${createdJob.job.id}`}>Open review job</Link>
        </p>
      ) : null}
    </article>
  );
}

export function AdminIngestionJobBrowserSection({
  loading,
  jobQuery,
  statusFilter,
  statusCounts,
  filteredJobs,
  groupedStatuses,
  processingJobId,
  onJobQueryChange,
  onStatusFilterChange,
  onUpdateStatusScopedFilter,
  onProcessJob,
}: {
  loading: boolean;
  jobQuery: string;
  statusFilter: JobStatusFilter;
  statusCounts: Record<JobStatusFilter, number>;
  filteredJobs: AdminIngestionJobSummary[];
  groupedStatuses: AdminIngestionStatusGroup[];
  processingJobId: string | null;
  onJobQueryChange: (value: string) => void;
  onStatusFilterChange: (value: JobStatusFilter) => void;
  onUpdateStatusScopedFilter: (
    status: AdminIngestionJobSummary['status'],
    patch: Partial<StatusScopedFilter>,
  ) => void;
  onProcessJob: (job: AdminIngestionJobSummary) => void;
}) {
  return (
    <section className="admin-context-card">
      <div className="admin-page-head ingestion-section-head">
        <div>
          <h2>Job Browser</h2>
          <p className="muted-text">
            Browse by workflow status first, then drill into stream and year to
            find the exact ingestion job quickly.
          </p>
        </div>
        <label className="field ingestion-job-search">
          <span>Find a job</span>
          <input
            type="search"
            placeholder="Search title, stream, subject, year…"
            value={jobQuery}
            onChange={(event) => onJobQueryChange(event.target.value)}
          />
        </label>
      </div>

      <div className="ingestion-status-nav" role="tablist" aria-label="Job statuses">
        <button
          type="button"
          className={
            statusFilter === 'all'
              ? 'ingestion-status-chip active'
              : 'ingestion-status-chip'
          }
          onClick={() => onStatusFilterChange('all')}
        >
          All
          <span>{statusCounts.all}</span>
        </button>
        {INGESTION_STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            className={
              statusFilter === status
                ? 'ingestion-status-chip active'
                : 'ingestion-status-chip'
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
          <h3>No matching jobs</h3>
          <p className="muted-text">
            Adjust the status filter or search query, or create a new intake job
            above.
          </p>
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
