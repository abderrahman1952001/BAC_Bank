import type {
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
} from '@/lib/admin';
import {
  findStreamLabel,
  findSubjectLabel,
  INGESTION_STATUS_LABELS,
  INGESTION_STATUS_ORDER,
} from '@/lib/ingestion-options';

const UNMAPPED_STREAM_KEY = 'UNMAPPED';

export type JobStatusFilter = 'all' | AdminIngestionJobSummary['status'];

export type StatusScopedFilter = {
  streamKey: string | 'all';
  year: number | 'all';
};

export type AdminIngestionStatusGroup = {
  status: AdminIngestionJobSummary['status'];
  label: string;
  count: number;
  activeStreamKey: string | 'all';
  activeYear: number | 'all';
  availableStreamGroups: Array<{
    streamKey: string;
    label: string;
    count: number;
  }>;
  availableYears: Array<{
    year: number;
    count: number;
  }>;
  streamGroups: Array<{
    streamKey: string;
    streamLabel: string;
    yearGroups: Array<{
      year: number;
      jobs: AdminIngestionJobSummary[];
    }>;
  }>;
};

export function formatSession(session: AdminIngestionJobSummary['session']) {
  if (session === 'rattrapage') {
    return 'Rattrapage';
  }

  return 'Normal';
}

export function compareJobs(
  left: AdminIngestionJobSummary,
  right: AdminIngestionJobSummary,
) {
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

export function toJobSummary(
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

export function buildStatusCounts(jobs: AdminIngestionJobSummary[]) {
  const counts: Record<JobStatusFilter, number> = {
    all: jobs.length,
    draft: 0,
    queued: 0,
    processing: 0,
    in_review: 0,
    approved: 0,
    published: 0,
    failed: 0,
  };

  for (const job of jobs) {
    counts[job.status] += 1;
  }

  return counts;
}

export function filterJobs({
  jobs,
  jobQuery,
  statusFilter,
}: {
  jobs: AdminIngestionJobSummary[];
  jobQuery: string;
  statusFilter: JobStatusFilter;
}) {
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
}

export function buildGroupedStatuses({
  filteredJobs,
  statusFilter,
  statusScopedFilters,
}: {
  filteredJobs: AdminIngestionJobSummary[];
  statusFilter: JobStatusFilter;
  statusScopedFilters: Partial<
    Record<AdminIngestionJobSummary['status'], StatusScopedFilter>
  >;
}): AdminIngestionStatusGroup[] {
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
      new Set(jobsForStatus.map((job) => resolveStreamKey(job.stream_code))),
    ).sort((left, right) =>
      resolveStreamLabel(left).localeCompare(resolveStreamLabel(right)),
    );
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
            (job) => resolveStreamKey(job.stream_code) === activeStreamKey,
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
      const streamKey = resolveStreamKey(job.stream_code);
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
        label: resolveStreamLabel(streamKey),
        count: jobsForStatus.filter(
          (job) => resolveStreamKey(job.stream_code) === streamKey,
        ).length,
      })),
      availableYears: availableYears.map((year) => ({
        year,
        count: streamFilteredJobs.filter((job) => job.year === year).length,
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
            streamLabel: resolveStreamLabel(streamKey),
            yearGroups: [...years.entries()]
              .sort((left, right) => right[0] - left[0])
              .map(([year, yearJobs]) => ({
                year,
                jobs: [...yearJobs].sort(compareJobs),
              })),
          };
        })
        .sort((left, right) => left.streamLabel.localeCompare(right.streamLabel)),
    };
  });
}

export function buildProcessJobActionState({
  job,
  processingJobId,
}: {
  job: AdminIngestionJobSummary;
  processingJobId: string | null;
}) {
  const disabled =
    processingJobId === job.id ||
    !job.workflow.can_process ||
    job.status === 'published' ||
    job.status === 'queued' ||
    job.status === 'processing';
  const label = job.workflow.awaiting_correction
    ? 'Waiting'
    : processingJobId === job.id
      ? 'Processing…'
      : job.status === 'queued'
        ? 'Queued'
        : job.status === 'processing'
          ? 'Worker running…'
          : job.workflow.review_started
            ? 'Queue reprocess'
            : 'Queue processing';

  return {
    disabled,
    label,
  };
}

function resolveStreamKey(streamCode: string | null) {
  return streamCode ?? UNMAPPED_STREAM_KEY;
}

function resolveStreamLabel(streamKey: string) {
  if (streamKey === UNMAPPED_STREAM_KEY) {
    return 'Unmapped stream';
  }

  return findStreamLabel(streamKey);
}
