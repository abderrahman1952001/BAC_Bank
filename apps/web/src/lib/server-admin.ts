import type { ApiJsonParser } from "@/lib/api-client";
import {
  parseAdminBillingSettingsResponse,
  parseAdminIngestionCropQueueResponse,
  parseAdminIngestionJobResponse,
  parseAdminIngestionJobListResponse,
  parseAdminSourceWorkbenchSourceListResponse,
  parseAdminSourceWorkbenchSourceResponse,
  type AdminBillingSettingsResponse,
  type AdminIngestionCropQueueResponse,
  type AdminIngestionJobResponse,
  type AdminIngestionJobListResponse,
  type AdminSourceWorkbenchSourceListResponse,
  type AdminSourceWorkbenchSourceResponse,
} from "@/lib/admin";
import {
  parseStudyCommandDiagnosticsResponse,
  type StudyCommandDiagnosticsResponse,
} from "@bac-bank/contracts/study-command";
import {
  clonePlaywrightFixture,
  playwrightTestAdminBillingSettings,
  playwrightTestAdminCropQueueResponse,
  playwrightTestAdminJobResponse,
  playwrightTestAdminJobSummary,
} from "@/lib/playwright-test-fixtures";
import { fetchServerApiJson } from "@/lib/server-api";

function shouldUsePlaywrightFixtures() {
  return (
    process.env.PLAYWRIGHT_TEST_AUTH === "true" &&
    process.env.PLAYWRIGHT_FIXTURE_DATA !== "false"
  );
}

export async function fetchServerAdminJson<T>(
  path: string,
  init?: RequestInit,
  parser?: ApiJsonParser<T>,
): Promise<T> {
  return fetchServerApiJson<T>(
    `/admin${path}`,
    init,
    "Admin request failed.",
    parser,
  );
}

export async function fetchServerAdminIngestionJobs(): Promise<AdminIngestionJobListResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return {
      data: [clonePlaywrightFixture(playwrightTestAdminJobSummary)],
    };
  }

  return fetchServerAdminJson<AdminIngestionJobListResponse>(
    "/ingestion/jobs",
    undefined,
    parseAdminIngestionJobListResponse,
  );
}

export async function fetchServerAdminIngestionJob(
  jobId: string,
): Promise<AdminIngestionJobResponse> {
  if (
    shouldUsePlaywrightFixtures() &&
    jobId === playwrightTestAdminJobResponse.job.id
  ) {
    return clonePlaywrightFixture(playwrightTestAdminJobResponse);
  }

  return fetchServerAdminJson<AdminIngestionJobResponse>(
    `/ingestion/jobs/${encodeURIComponent(jobId)}`,
    undefined,
    parseAdminIngestionJobResponse,
  );
}

export async function fetchServerAdminIngestionCropQueue(): Promise<AdminIngestionCropQueueResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestAdminCropQueueResponse);
  }

  return fetchServerAdminJson<AdminIngestionCropQueueResponse>(
    "/ingestion/crops",
    undefined,
    parseAdminIngestionCropQueueResponse,
  );
}

export async function fetchServerAdminBillingSettings(): Promise<AdminBillingSettingsResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestAdminBillingSettings);
  }

  return fetchServerAdminJson<AdminBillingSettingsResponse>(
    "/billing/settings",
    undefined,
    parseAdminBillingSettingsResponse,
  );
}

export async function fetchServerAdminStudyCommandDiagnostics(): Promise<StudyCommandDiagnosticsResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return {
      generatedAt: "2026-04-18T12:00:00.000Z",
      windowDays: 30,
      sampledEventCount: 4,
      summary: {
        proposals: 2,
        accepted: 2,
        createdStudySessions: 1,
        openedRoutes: 1,
        noProposal: 0,
        clarifications: 1,
      },
      modes: [
        {
          key: "BAC_TRAINING",
          count: 2,
        },
        {
          key: "LESSON_UNDERSTANDING",
          count: 1,
        },
      ],
      availability: [
        {
          key: "READY",
          count: 2,
        },
        {
          key: "NEEDS_CONTENT",
          count: 1,
        },
      ],
      actions: [
        {
          key: "CREATE_STUDY_SESSION",
          count: 2,
        },
        {
          key: "OPEN_ROUTE",
          count: 1,
        },
      ],
      aiRouting: [
        {
          key: "SKIPPED:DISABLED",
          count: 3,
        },
        {
          key: "SUCCESS",
          count: 1,
        },
      ],
      topSubjects: [
        {
          key: "NATURAL_SCIENCES",
          count: 3,
        },
      ],
      topTopics: [
        {
          key: "PROTEINS",
          count: 2,
        },
      ],
      missingContentSignals: [
        {
          key: "LESSON_UNDERSTANDING|NATURAL_SCIENCES|PROTEINS",
          mode: "LESSON_UNDERSTANDING",
          subjectCode: "NATURAL_SCIENCES",
          topicCodes: ["PROTEINS"],
          count: 1,
          lastSeenAt: "2026-04-18T09:10:00.000Z",
        },
      ],
    };
  }

  return fetchServerAdminJson<StudyCommandDiagnosticsResponse>(
    "/study-command/diagnostics",
    undefined,
    parseStudyCommandDiagnosticsResponse,
  );
}

export async function fetchServerAdminSourceWorkbenchSources(): Promise<AdminSourceWorkbenchSourceListResponse> {
  return fetchServerAdminJson<AdminSourceWorkbenchSourceListResponse>(
    "/source-workbench/sources",
    undefined,
    parseAdminSourceWorkbenchSourceListResponse,
  );
}

export async function fetchServerAdminSourceWorkbenchSource(
  sourceId: string,
): Promise<AdminSourceWorkbenchSourceResponse> {
  const params = new URLSearchParams({
    sourceId,
  });

  return fetchServerAdminJson<AdminSourceWorkbenchSourceResponse>(
    `/source-workbench/source?${params.toString()}`,
    undefined,
    parseAdminSourceWorkbenchSourceResponse,
  );
}
