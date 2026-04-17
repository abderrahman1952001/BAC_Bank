"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminIngestionJobBrowserSection } from "@/components/admin-ingestion-page-sections";
import {
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
  fetchAdminJson,
  parseAdminIngestionJobListResponse,
  parseAdminIngestionJobResponse,
} from "@/lib/admin";
import {
  buildDraftKindCounts,
  buildGroupedStatuses,
  buildStatusCounts,
  filterJobs,
  type DraftKindFilter,
  type JobStatusFilter,
  type StatusScopedFilter,
  toJobSummary,
} from "@/lib/admin-ingestion-page";
import {
  buildProcessConfirmationMessage,
  buildProcessRequestPayload,
} from "@/lib/admin-ingestion-review";

type AdminDraftsPageProps = {
  initialJobs?: AdminIngestionJobSummary[];
};

export function AdminDraftsPage({ initialJobs }: AdminDraftsPageProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<AdminIngestionJobSummary[]>(initialJobs ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialJobs ? null : "Failed to load drafts.",
  );
  const [processNotice, setProcessNotice] = useState<string | null>(null);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>("all");
  const [draftKindFilter, setDraftKindFilter] =
    useState<DraftKindFilter>("all");
  const [statusScopedFilters, setStatusScopedFilters] = useState<
    Partial<Record<AdminIngestionJobSummary["status"], StatusScopedFilter>>
  >({});
  const [jobQuery, setJobQuery] = useState("");

  useEffect(() => {
    setJobs(initialJobs ?? []);
    setLoading(false);
    setError(initialJobs ? null : "Failed to load drafts.");
  }, [initialJobs]);

  useEffect(() => {
    if (initialJobs) {
      return;
    }

    void refreshJobs(true);
  }, [initialJobs]);

  const hasActiveProcessingJobs = useMemo(
    () =>
      jobs.some(
        (job) => job.status === "queued" || job.status === "processing",
      ),
    [jobs],
  );
  const processingCount = useMemo(
    () =>
      jobs.filter(
        (job) => job.status === "queued" || job.status === "processing",
      ).length,
    [jobs],
  );

  useEffect(() => {
    if (!hasActiveProcessingJobs) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshJobs();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasActiveProcessingJobs]);

  useEffect(() => {
    function handleWindowFocus() {
      void refreshJobs();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshJobs();
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const draftKindCounts = useMemo(
    () => buildDraftKindCounts(jobs),
    [jobs],
  );
  const statusCounts = useMemo(
    () => buildStatusCounts(jobs),
    [jobs],
  );

  const filteredJobs = useMemo(
    () =>
      filterJobs({
        jobs,
        jobQuery,
        statusFilter,
        draftKindFilter,
      }),
    [draftKindFilter, jobQuery, jobs, statusFilter],
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
    status: AdminIngestionJobSummary["status"],
    patch: Partial<StatusScopedFilter>,
  ) {
    setStatusScopedFilters((current) => {
      const existing = current[status] ?? {
        streamKey: "all",
        year: "all",
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

  async function refreshJobs(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const payload = await fetchAdminJson(
        "/ingestion/jobs",
        undefined,
        parseAdminIngestionJobListResponse,
      );

      setJobs(payload.data);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load drafts.",
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function handleProcessJob(job: AdminIngestionJobSummary) {
    if (!job.workflow.can_process) {
      setError("Add the correction PDF before processing this draft.");
      return;
    }

    const confirmationMessage = buildProcessConfirmationMessage({
      workflow: job.workflow,
      jobStatus: job.status,
    });

    if (confirmationMessage && !window.confirm(confirmationMessage)) {
      return;
    }

    setProcessingJobId(job.id);
    setError(null);
    setProcessNotice(null);

    try {
      const payload = await fetchAdminJson<AdminIngestionJobResponse>(
        `/ingestion/jobs/${job.id}/process`,
        {
          method: "POST",
          body: JSON.stringify(
            buildProcessRequestPayload({
              workflow: job.workflow,
              jobStatus: job.status,
            }),
          ),
        },
        parseAdminIngestionJobResponse,
      );
      const updatedSummary = toJobSummary(payload);

      setJobs((current) =>
        current.map((entry) => (entry.id === job.id ? updatedSummary : entry)),
      );
      setProcessNotice(
        `Queued ${payload.job.label} for background processing. The draft list will refresh while the worker runs.`,
      );
    } catch (processError) {
      setError(
        processError instanceof Error
          ? processError.message
          : "Failed to process draft source PDFs.",
      );
    } finally {
      setProcessingJobId(null);
    }
  }

  return (
    <section className="panel">
      <div className="admin-page-head">
        <div className="admin-page-intro">
          <h1>Drafts</h1>
          <div className="admin-page-meta-row">
            <span className="admin-page-meta-pill">
              <strong>{jobs.length}</strong> total
            </span>
            <span className="admin-page-meta-pill">
              <strong>{statusCounts.published}</strong> published
            </span>
            <span className="admin-page-meta-pill">
              <strong>{draftKindCounts.ingestion}</strong> ingestion
            </span>
            <span className="admin-page-meta-pill">
              <strong>{draftKindCounts.revision}</strong> revision
            </span>
            <span className="admin-page-meta-pill">
              <strong>{processingCount}</strong> running
            </span>
          </div>
        </div>
        <div className="table-actions">
          <Link href="/admin/intake" className="btn-secondary">
            Open Intake
          </Link>
          <Link href="/admin/library" className="btn-secondary">
            Open Library
          </Link>
        </div>
      </div>

      {loading ? <p className="muted-text">Loading drafts…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {error && jobs.length === 0 ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.refresh()}
        >
          Retry
        </button>
      ) : null}
      {processNotice ? <p className="success-text">{processNotice}</p> : null}

      <AdminIngestionJobBrowserSection
        loading={loading}
        jobQuery={jobQuery}
        draftKindFilter={draftKindFilter}
        draftKindCounts={draftKindCounts}
        statusFilter={statusFilter}
        statusCounts={statusCounts}
        filteredJobs={filteredJobs}
        groupedStatuses={groupedStatuses}
        processingJobId={processingJobId}
        onJobQueryChange={setJobQuery}
        onDraftKindFilterChange={setDraftKindFilter}
        onStatusFilterChange={setStatusFilter}
        onUpdateStatusScopedFilter={updateStatusScopedFilter}
        onProcessJob={(job) => {
          void handleProcessJob(job);
        }}
      />
    </section>
  );
}
