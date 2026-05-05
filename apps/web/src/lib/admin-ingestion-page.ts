import type {
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
} from "@/lib/admin";
import {
  findStreamLabel,
  findSubjectLabel,
  INGESTION_STATUS_LABELS,
  INGESTION_STATUS_ORDER,
} from "@/lib/ingestion-options";

export const BROWSABLE_DRAFT_STATUS_ORDER = INGESTION_STATUS_ORDER;
export const DRAFT_KIND_LABELS = {
  ingestion: "Ingestion",
  revision: "Revision",
} as const;

export type JobStatusFilter = "all" | AdminIngestionJobSummary["status"];
export type DraftKindFilter = "all" | AdminIngestionJobSummary["draft_kind"];

type DraftKindLabels = typeof DRAFT_KIND_LABELS;
type DraftKindKey = keyof DraftKindLabels;

function isDraftKindKey(value: string): value is DraftKindKey {
  return value === "ingestion" || value === "revision";
}

export function formatDraftKind(kind: AdminIngestionJobSummary["draft_kind"]) {
  return DRAFT_KIND_LABELS[kind];
}

export function buildManualUploadTitle({
  year,
  subjectCode,
  paperStreamCodes,
}: {
  year: number | string;
  subjectCode: string;
  paperStreamCodes: string[];
}) {
  const parts = [
    typeof year === "number" ? String(year) : year.trim(),
    subjectCode.trim().toUpperCase(),
    ...normalizePaperStreamCodes(paperStreamCodes),
  ].filter((value) => value.length > 0);

  return parts.length ? `BAC ${parts.join(" · ")}` : "BAC";
}

export function buildDraftKindCounts(jobs: AdminIngestionJobSummary[]) {
  const counts: Record<DraftKindFilter, number> = {
    all: jobs.length,
    ingestion: 0,
    revision: 0,
  };

  for (const job of jobs) {
    counts[job.draft_kind] += 1;
  }

  return counts;
}

export function filterJobs({
  jobs,
  jobQuery,
  statusFilter,
  draftKindFilter,
}: {
  jobs: AdminIngestionJobSummary[];
  jobQuery: string;
  statusFilter: JobStatusFilter;
  draftKindFilter: DraftKindFilter;
}) {
  const query = jobQuery.trim().toLowerCase();

  return jobs.filter((job) => {
    if (statusFilter !== "all" && job.status !== statusFilter) {
      return false;
    }

    if (draftKindFilter !== "all" && job.draft_kind !== draftKindFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    const draftKindWords = isDraftKindKey(job.draft_kind)
      ? `${DRAFT_KIND_LABELS[job.draft_kind]} draft`
      : "";

    const searchText = [
      job.label,
      job.year,
      ...job.stream_codes,
      ...job.stream_codes.map((streamCode) => findStreamLabel(streamCode)),
      job.subject_code,
      findSubjectLabel(job.subject_code),
      job.status,
      draftKindWords,
      job.workflow.awaiting_correction ? "waiting correction" : "",
    ]
      .join(" ")
      .toLowerCase();

    return searchText.includes(query);
  });
}

const UNMAPPED_STREAM_GROUP_KEY = "UNMAPPED";

export type StatusScopedFilter = {
  streamKey: string | "all";
  year: number | "all";
};

export type AdminIngestionStatusGroup = {
  status: AdminIngestionJobSummary["status"];
  label: string;
  count: number;
  activeStreamKey: string | "all";
  activeYear: number | "all";
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

export function formatSession(session: AdminIngestionJobSummary["session"]) {
  if (session === "rattrapage") {
    return "Rattrapage";
  }

  return "Normal";
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

export function buildGroupedStatuses({
  filteredJobs,
  statusFilter,
  statusScopedFilters,
}: {
  filteredJobs: AdminIngestionJobSummary[];
  statusFilter: JobStatusFilter;
  statusScopedFilters: Partial<
    Record<AdminIngestionJobSummary["status"], StatusScopedFilter>
  >;
}): AdminIngestionStatusGroup[] {
  const visibleStatuses =
    statusFilter === "all"
      ? INGESTION_STATUS_ORDER.filter((status) =>
          filteredJobs.some((job) => job.status === status),
        )
      : ([statusFilter] as const);

  return visibleStatuses.map((status) => {
    const jobsForStatus = filteredJobs
      .filter((job) => job.status === status)
      .sort(compareJobs);
    const availableStreamKeys = Array.from(
      new Set(
        jobsForStatus.map((job) => resolveStreamGroupKey(job.stream_codes)),
      ),
    ).sort((left, right) =>
      resolveStreamGroupLabel(left).localeCompare(
        resolveStreamGroupLabel(right),
      ),
    );
    const scopedFilter = statusScopedFilters[status];
    const activeStreamKey =
      scopedFilter?.streamKey &&
      scopedFilter.streamKey !== "all" &&
      availableStreamKeys.includes(scopedFilter.streamKey)
        ? scopedFilter.streamKey
        : "all";
    const streamFilteredJobs =
      activeStreamKey === "all"
        ? jobsForStatus
        : jobsForStatus.filter(
            (job) =>
              resolveStreamGroupKey(job.stream_codes) === activeStreamKey,
          );
    const availableYears = Array.from(
      new Set(streamFilteredJobs.map((job) => job.year)),
    ).sort((left, right) => right - left);
    const activeYear =
      typeof scopedFilter?.year === "number" &&
      availableYears.includes(scopedFilter.year)
        ? scopedFilter.year
        : "all";
    const scopedJobs =
      activeYear === "all"
        ? streamFilteredJobs
        : streamFilteredJobs.filter((job) => job.year === activeYear);
    const streams = new Map<string, AdminIngestionJobSummary[]>();

    for (const job of scopedJobs) {
      const streamKey = resolveStreamGroupKey(job.stream_codes);
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
        label: resolveStreamGroupLabel(streamKey),
        count: jobsForStatus.filter(
          (job) => resolveStreamGroupKey(job.stream_codes) === streamKey,
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
            streamLabel: resolveStreamGroupLabel(streamKey),
            yearGroups: [...years.entries()]
              .sort((left, right) => right[0] - left[0])
              .map(([year, yearJobs]) => ({
                year,
                jobs: [...yearJobs].sort(compareJobs),
              })),
          };
        })
        .sort((left, right) =>
          left.streamLabel.localeCompare(right.streamLabel),
        ),
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
    job.status === "published" ||
    job.status === "queued" ||
    job.status === "processing";
  const label = job.workflow.awaiting_correction
    ? "Waiting"
    : processingJobId === job.id
      ? "Processing…"
      : job.status === "queued"
        ? job.workflow.active_operation === "publishing"
          ? "Publish queued"
          : "Queued"
        : job.status === "processing"
          ? job.workflow.active_operation === "publishing"
            ? "Publishing…"
            : "Worker running…"
          : job.workflow.review_started || job.status === "failed"
            ? "Refresh pages"
            : "Prepare pages";

  return {
    disabled,
    label,
  };
}

export function formatPaperStreamCodes(streamCodes: string[]) {
  const normalizedCodes = normalizePaperStreamCodes(streamCodes);

  if (normalizedCodes.length === 0) {
    return "Unmapped streams";
  }

  return normalizedCodes.join(" + ");
}

function resolveStreamGroupKey(streamCodes: string[]) {
  const normalizedCodes = normalizePaperStreamCodes(streamCodes);

  return normalizedCodes.length
    ? normalizedCodes.join("|")
    : UNMAPPED_STREAM_GROUP_KEY;
}

function resolveStreamGroupLabel(streamKey: string) {
  if (streamKey === UNMAPPED_STREAM_GROUP_KEY) {
    return "Unmapped streams";
  }

  return formatPaperStreamCodes(streamKey.split("|"));
}

function normalizePaperStreamCodes(streamCodes: string[]) {
  return Array.from(
    new Set(
      streamCodes
        .map((streamCode) => streamCode.trim().toUpperCase())
        .filter((streamCode) => streamCode.length > 0),
    ),
  );
}
