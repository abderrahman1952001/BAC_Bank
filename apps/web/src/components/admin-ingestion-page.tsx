'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AdminIngestionJobListResponse,
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
  fetchAdmin,
  fetchAdminJson,
} from '@/lib/admin';
import {
  findStreamLabel,
  findSubjectLabel,
  INGESTION_STATUS_LABELS,
  INGESTION_STATUS_ORDER,
  INGESTION_STREAM_OPTIONS,
  INGESTION_SUBJECT_OPTIONS,
} from '@/lib/ingestion-options';

type JobStatusFilter = 'all' | AdminIngestionJobSummary['status'];
type StatusScopedFilter = {
  streamKey: string | 'all';
  year: number | 'all';
};

function formatSession(session: AdminIngestionJobSummary['session']) {
  if (session === 'rattrapage') {
    return 'Rattrapage';
  }

  return 'Normal';
}

function compareJobs(left: AdminIngestionJobSummary, right: AdminIngestionJobSummary) {
  if (left.year !== right.year) {
    return right.year - left.year;
  }

  const updatedAtDelta =
    new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();

  if (updatedAtDelta !== 0) {
    return updatedAtDelta;
  }

  return left.label.localeCompare(right.label);
}

export function AdminIngestionPage() {
  const [jobs, setJobs] = useState<AdminIngestionJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processNotice, setProcessNotice] = useState<string | null>(null);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<AdminIngestionJobResponse | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>('all');
  const [statusScopedFilters, setStatusScopedFilters] = useState<
    Partial<Record<AdminIngestionJobSummary['status'], StatusScopedFilter>>
  >({});
  const [jobQuery, setJobQuery] = useState('');
  const [year, setYear] = useState(`${new Date().getFullYear()}`);
  const [streamCode, setStreamCode] = useState('SE');
  const [paperStreamCodes, setPaperStreamCodes] = useState<string[]>(['SE']);
  const [subjectCode, setSubjectCode] = useState('MATHEMATICS');
  const [session, setSession] = useState<'NORMAL' | 'MAKEUP'>('NORMAL');
  const [title, setTitle] = useState('');
  const [qualifierKey, setQualifierKey] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [examPdf, setExamPdf] = useState<File | null>(null);
  const [correctionPdf, setCorrectionPdf] = useState<File | null>(null);

  function toJobSummary(
    payload: AdminIngestionJobResponse,
  ): AdminIngestionJobSummary {
    return {
      ...payload.job,
      workflow: payload.workflow,
      source_document_count: payload.documents.length,
      source_page_count: payload.documents.reduce(
        (sum, document) => sum + document.pages.length,
        0,
      ),
    };
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadJobs() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchAdminJson<AdminIngestionJobListResponse>(
          '/ingestion/jobs',
          {
            signal: controller.signal,
          },
        );

        setJobs(payload.data);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('Failed to load ingestion jobs.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadJobs();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    setPaperStreamCodes((current) => {
      if (current.includes(streamCode)) {
        return current;
      }

      return [streamCode, ...current];
    });
  }, [streamCode]);

  const statusCounts = useMemo(() => {
    const counts: Record<JobStatusFilter, number> = {
      all: jobs.length,
      draft: 0,
      in_review: 0,
      approved: 0,
      published: 0,
      failed: 0,
    };

    for (const job of jobs) {
      counts[job.status] += 1;
    }

    return counts;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const query = jobQuery.trim().toLowerCase();

    return jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchText = [
        job.label,
        job.year,
        job.stream_code,
        findStreamLabel(job.stream_code),
        job.subject_code,
        findSubjectLabel(job.subject_code),
        job.status,
        job.workflow.awaiting_correction ? 'waiting correction' : '',
      ]
        .join(' ')
        .toLowerCase();

      return searchText.includes(query);
    });
  }, [jobQuery, jobs, statusFilter]);

  const groupedStatuses = useMemo(() => {
    const visibleStatuses =
      statusFilter === 'all'
        ? INGESTION_STATUS_ORDER.filter((status) =>
            filteredJobs.some((job) => job.status === status),
          )
        : ([statusFilter] as const);

    return visibleStatuses.map((status) => {
      const jobsForStatus = filteredJobs
        .filter((job) => job.status === status)
        .sort(compareJobs);
      const availableStreamKeys = Array.from(
        new Set(jobsForStatus.map((job) => job.stream_code ?? 'UNMAPPED')),
      ).sort((left, right) => {
        const leftLabel =
          left === 'UNMAPPED' ? 'Unmapped stream' : findStreamLabel(left);
        const rightLabel =
          right === 'UNMAPPED' ? 'Unmapped stream' : findStreamLabel(right);

        return leftLabel.localeCompare(rightLabel);
      });
      const scopedFilter = statusScopedFilters[status];
      const activeStreamKey =
        scopedFilter?.streamKey &&
        scopedFilter.streamKey !== 'all' &&
        availableStreamKeys.includes(scopedFilter.streamKey)
          ? scopedFilter.streamKey
          : 'all';
      const streamFilteredJobs =
        activeStreamKey === 'all'
          ? jobsForStatus
          : jobsForStatus.filter(
              (job) => (job.stream_code ?? 'UNMAPPED') === activeStreamKey,
            );
      const availableYears = Array.from(
        new Set(streamFilteredJobs.map((job) => job.year)),
      ).sort((left, right) => right - left);
      const activeYear =
        typeof scopedFilter?.year === 'number' &&
        availableYears.includes(scopedFilter.year)
          ? scopedFilter.year
          : 'all';
      const scopedJobs =
        activeYear === 'all'
          ? streamFilteredJobs
          : streamFilteredJobs.filter((job) => job.year === activeYear);
      const streams = new Map<string, AdminIngestionJobSummary[]>();

      for (const job of scopedJobs) {
        const streamKey = job.stream_code ?? 'UNMAPPED';
        const bucket = streams.get(streamKey) ?? [];
        bucket.push(job);
        streams.set(streamKey, bucket);
      }

      return {
        status,
        label: INGESTION_STATUS_LABELS[status],
        count: jobsForStatus.length,
        activeStreamKey,
        activeYear,
        availableStreamGroups: availableStreamKeys.map((streamKey) => ({
          streamKey,
          label:
            streamKey === 'UNMAPPED'
              ? 'Unmapped stream'
              : findStreamLabel(streamKey),
          count: jobsForStatus.filter(
            (job) => (job.stream_code ?? 'UNMAPPED') === streamKey,
          ).length,
        })),
        availableYears: availableYears.map((yearValue) => ({
          year: yearValue,
          count: streamFilteredJobs.filter((job) => job.year === yearValue).length,
        })),
        streamGroups: [...streams.entries()]
          .map(([streamKey, streamJobs]) => {
            const years = new Map<number, AdminIngestionJobSummary[]>();

            for (const job of streamJobs) {
              const bucket = years.get(job.year) ?? [];
              bucket.push(job);
              years.set(job.year, bucket);
            }

            return {
              streamKey,
              streamLabel:
                streamKey === 'UNMAPPED'
                  ? 'Unmapped stream'
                  : findStreamLabel(streamKey),
              yearGroups: [...years.entries()]
                .sort((left, right) => right[0] - left[0])
                .map(([groupYear, yearJobs]) => ({
                  year: groupYear,
                  jobs: [...yearJobs].sort(compareJobs),
                })),
            };
          })
          .sort((left, right) => left.streamLabel.localeCompare(right.streamLabel)),
      };
    });
  }, [filteredJobs, statusFilter, statusScopedFilters]);

  function updateStatusScopedFilter(
    status: AdminIngestionJobSummary['status'],
    patch: Partial<StatusScopedFilter>,
  ) {
    setStatusScopedFilters((current) => {
      const existing = current[status] ?? {
        streamKey: 'all',
        year: 'all',
      };

      return {
        ...current,
        [status]: {
          ...existing,
          ...patch,
        },
      };
    });
  }

  function togglePaperStream(code: string, checked: boolean) {
    setPaperStreamCodes((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(code);
      } else {
        next.delete(code);
      }

      if (next.size === 0) {
        next.add(code);
      }

      const ordered: string[] = INGESTION_STREAM_OPTIONS.map(([value]) => value).filter(
        (value) => next.has(value),
      );

      if (!ordered.includes(streamCode)) {
        setStreamCode(ordered[0] ?? code);
      }

      return ordered;
    });
  }

  async function handleManualUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setUploadError(null);
    setProcessNotice(null);
    setCreatedJob(null);

    if (!examPdf) {
      setUploadError('Attach the exam PDF before submitting.');
      setUploading(false);
      return;
    }

    const selectedPaperStreams = Array.from(
      new Set([streamCode, ...paperStreamCodes]),
    );
    const payload = new FormData();
    payload.set('year', year);
    payload.set('stream_code', streamCode);
    selectedPaperStreams.forEach((code) => {
      payload.append('paper_stream_codes', code);
    });
    payload.set('subject_code', subjectCode);
    payload.set('session', session);
    payload.set('title', title.trim() || `${year} ${subjectCode} ${streamCode}`);
    if (qualifierKey.trim()) {
      payload.set('qualifier_key', qualifierKey.trim());
    }
    if (sourceReference.trim()) {
      payload.set('source_reference', sourceReference.trim());
    }
    payload.set('exam_pdf', examPdf);

    if (correctionPdf) {
      payload.set('correction_pdf', correctionPdf);
    }

    try {
      const created = await fetchAdmin('/ingestion/intake/manual', {
        method: 'POST',
        body: payload,
      });
      const createdPayload =
        (await created.json()) as AdminIngestionJobResponse;
      setCreatedJob(createdPayload);
      const createdSummary = toJobSummary(createdPayload);
      setJobs((current) => [
        createdSummary,
        ...current.filter((entry) => entry.id !== createdSummary.id),
      ]);
      setTitle('');
      setQualifierKey('');
      setSourceReference('');
      setExamPdf(null);
      setCorrectionPdf(null);
      event.currentTarget.reset();
    } catch (submitError) {
      setUploadError(
        submitError instanceof Error
          ? submitError.message
          : 'Manual intake failed.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleProcessJob(job: AdminIngestionJobSummary) {
    if (!job.workflow.can_process) {
      setError('Add the correction PDF before processing this job.');
      return;
    }

    const forceReprocess =
      job.workflow.review_started &&
      !window.confirm(
        'Reprocessing will rerun extraction and can replace reviewed draft edits. Continue?',
      )
        ? null
        : job.workflow.review_started;

    if (forceReprocess === null) {
      return;
    }

    setProcessingJobId(job.id);
    setError(null);
    setProcessNotice(null);

    try {
      const payload = await fetchAdminJson<AdminIngestionJobResponse>(
        `/ingestion/jobs/${job.id}/process`,
        {
          method: 'POST',
          body: JSON.stringify({
            force_reprocess: forceReprocess,
          }),
        },
      );
      const updatedSummary = toJobSummary(payload);

      setJobs((current) =>
        current.map((entry) => (entry.id === job.id ? updatedSummary : entry)),
      );
      setCreatedJob((current) => (current?.job.id === job.id ? payload : current));
      setProcessNotice(`Processed ${payload.job.label}.`);
    } catch (processError) {
      setError(
        processError instanceof Error
          ? processError.message
          : 'Failed to process source PDFs.',
      );
    } finally {
      setProcessingJobId(null);
    }
  }

  return (
    <section className="panel">
      <div className="admin-page-head">
        <div>
          <p className="page-kicker">Admin CMS</p>
          <h1>Ingestion Intake & Review</h1>
          <p className="muted-text">
            Run the full browser-first intake loop here: upload PDFs, process them,
            review the extracted structure, then publish into the live exam
            tables.
          </p>
        </div>
      </div>

      <div className="admin-workflow-grid">
        <article className="admin-workflow-card">
          <h3>1. Upload PDFs</h3>
          <p>
            Create a manual intake job. Uploading exam and correction together is
            the default path.
          </p>
        </article>
        <article className="admin-workflow-card">
          <h3>2. Process Job</h3>
          <p>
            Processing stays locked until the correction PDF exists, then exam and
            correction are extracted together.
          </p>
        </article>
        <article className="admin-workflow-card">
          <h3>3. Review & Publish</h3>
          <p>
            Review over one or more sessions, then approve and publish from the
            same draft.
          </p>
        </article>
      </div>

      <div className="ingestion-entry-grid">
        <article className="admin-context-card ingestion-entry-card">
          <p className="page-kicker">Primary Workflow</p>
          <h2>Manual Upload</h2>
          <p className="muted-text">
            Upload official PDFs directly when you already have them or when a
            source adapter is flaky.
          </p>
          <p className="muted-text">
            Upload both PDFs together when you have them. If the correction is
            missing, create the job now and attach the correction later from the
            review screen.
          </p>

          <form className="ingestion-upload-form" onSubmit={handleManualUpload}>
            <label>
              <span>Year</span>
              <input
                type="number"
                min={2008}
                max={2100}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                required
              />
            </label>

            <label>
              <span>Primary Exam Offering Stream</span>
              <select
                value={streamCode}
                onChange={(event) => setStreamCode(event.target.value)}
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
                          togglePaperStream(value, event.target.checked);
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
                onChange={(event) => setSubjectCode(event.target.value)}
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
                  setSession(event.target.value === 'MAKEUP' ? 'MAKEUP' : 'NORMAL')
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
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>

            <label>
              <span>Qualifier Key</span>
              <input
                type="text"
                placeholder="german / spanish / italian"
                value={qualifierKey}
                onChange={(event) => setQualifierKey(event.target.value)}
              />
            </label>

            <label>
              <span>Source Reference</span>
              <input
                type="text"
                placeholder="Official ministry PDF / local archive"
                value={sourceReference}
                onChange={(event) => setSourceReference(event.target.value)}
              />
            </label>

            <label>
              <span>Exam PDF</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setExamPdf(event.target.files?.[0] ?? null)}
                required
              />
            </label>

            <label>
              <span>Correction PDF</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) =>
                  setCorrectionPdf(event.target.files?.[0] ?? null)
                }
              />
            </label>

            <button type="submit" className="btn-primary" disabled={uploading}>
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
              <Link href={`/admin/ingestion/${createdJob.job.id}`}>
                Open review job
              </Link>
            </p>
          ) : null}
        </article>

        <details className="admin-context-card ingestion-entry-card">
          <summary className="ingestion-advanced-summary">Bulk Intake Tools</summary>
          <p className="muted-text">
            Source adapters and repair scripts still exist for batch imports,
            backfills, and maintenance. They are no longer the primary admin
            workflow.
          </p>
          <div className="ingestion-command-list">
            <code>
              npm run intake:source:eddirasa -w @bac-bank/api -- --stage originals
              --min-year 2008
            </code>
            <code>
              npm run intake:source:eddirasa -w @bac-bank/api -- --stage pages
              --min-year 2008
            </code>
            <code>
              npm run intake:source:eddirasa -w @bac-bank/api -- --stage ocr
              --ocr-backend gemini --job-id &lt;job-id&gt;
            </code>
          </div>
        </details>
      </div>

      {loading ? <p>Loading ingestion jobs…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {processNotice ? <p className="success-text">{processNotice}</p> : null}

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
              onChange={(event) => setJobQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="ingestion-status-nav" role="tablist" aria-label="Job statuses">
          <button
            type="button"
            className={
              statusFilter === 'all' ? 'ingestion-status-chip active' : 'ingestion-status-chip'
            }
            onClick={() => setStatusFilter('all')}
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
              onClick={() => setStatusFilter(status)}
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
            <section key={statusGroup.status} className="ingestion-job-status-group">
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
                        updateStatusScopedFilter(statusGroup.status, {
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
                          updateStatusScopedFilter(statusGroup.status, {
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
                        updateStatusScopedFilter(statusGroup.status, {
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
                          updateStatusScopedFilter(statusGroup.status, {
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
                          {yearGroup.jobs.map((job) => (
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
                                  className="btn-secondary"
                                  onClick={() => {
                                    void handleProcessJob(job);
                                  }}
                                  disabled={
                                    processingJobId === job.id ||
                                    !job.workflow.can_process ||
                                    job.status === 'published'
                                  }
                                >
                                  {job.workflow.awaiting_correction
                                    ? 'Waiting'
                                    : processingJobId === job.id
                                      ? 'Processing…'
                                      : job.workflow.review_started
                                        ? 'Reprocess'
                                        : 'Process'}
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
                          ))}
                        </div>
                      </section>
                    ))}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </section>
  );
}
