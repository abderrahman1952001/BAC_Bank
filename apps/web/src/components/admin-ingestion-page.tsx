'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AdminIngestionJobBrowserSection,
  AdminIngestionManualUploadSection,
} from '@/components/admin-ingestion-page-sections';
import {
  AdminIngestionJobListResponse,
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
  fetchAdmin,
  fetchAdminJson,
} from '@/lib/admin';
import {
  buildGroupedStatuses,
  buildStatusCounts,
  filterJobs,
  JobStatusFilter,
  StatusScopedFilter,
  toJobSummary,
} from '@/lib/admin-ingestion-page';
import {
  INGESTION_STREAM_OPTIONS,
} from '@/lib/ingestion-options';

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

  const hasActiveProcessingJobs = useMemo(
    () =>
      jobs.some(
        (job) => job.status === 'queued' || job.status === 'processing',
      ),
    [jobs],
  );

  useEffect(() => {
    if (!hasActiveProcessingJobs) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchAdminJson<AdminIngestionJobListResponse>('/ingestion/jobs')
        .then((payload) => {
          setJobs(payload.data);
        })
        .catch(() => undefined);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasActiveProcessingJobs]);

  useEffect(() => {
    setPaperStreamCodes((current) => {
      if (current.includes(streamCode)) {
        return current;
      }

      return [streamCode, ...current];
    });
  }, [streamCode]);

  const statusCounts = useMemo(() => buildStatusCounts(jobs), [jobs]);

  const filteredJobs = useMemo(
    () =>
      filterJobs({
        jobs,
        jobQuery,
        statusFilter,
      }),
    [jobQuery, jobs, statusFilter],
  );

  const groupedStatuses = useMemo(
    () =>
      buildGroupedStatuses({
        filteredJobs,
        statusFilter,
        statusScopedFilters,
      }),
    [filteredJobs, statusFilter, statusScopedFilters],
  );

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
      setProcessNotice(
        `Queued ${payload.job.label} for background processing. The list will refresh while the worker runs.`,
      );
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
        <AdminIngestionManualUploadSection
          year={year}
          streamCode={streamCode}
          paperStreamCodes={paperStreamCodes}
          subjectCode={subjectCode}
          session={session}
          title={title}
          qualifierKey={qualifierKey}
          sourceReference={sourceReference}
          uploading={uploading}
          uploadError={uploadError}
          createdJob={createdJob}
          onSubmit={handleManualUpload}
          onYearChange={setYear}
          onStreamCodeChange={setStreamCode}
          onTogglePaperStream={togglePaperStream}
          onSubjectCodeChange={setSubjectCode}
          onSessionChange={setSession}
          onTitleChange={setTitle}
          onQualifierKeyChange={setQualifierKey}
          onSourceReferenceChange={setSourceReference}
          onExamPdfChange={setExamPdf}
          onCorrectionPdfChange={setCorrectionPdf}
        />

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

      <AdminIngestionJobBrowserSection
        loading={loading}
        jobQuery={jobQuery}
        statusFilter={statusFilter}
        statusCounts={statusCounts}
        filteredJobs={filteredJobs}
        groupedStatuses={groupedStatuses}
        processingJobId={processingJobId}
        onJobQueryChange={setJobQuery}
        onStatusFilterChange={setStatusFilter}
        onUpdateStatusScopedFilter={updateStatusScopedFilter}
        onProcessJob={(job) => {
          void handleProcessJob(job);
        }}
      />
    </section>
  );
}
