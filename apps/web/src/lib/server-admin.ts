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
  clonePlaywrightFixture,
  playwrightTestAdminBillingSettings,
  playwrightTestAdminCropQueueResponse,
  playwrightTestAdminJobResponse,
  playwrightTestAdminJobSummary,
} from "@/lib/playwright-test-fixtures";
import { fetchServerApiJson } from "@/lib/server-api";

function shouldUsePlaywrightFixtures() {
  return process.env.PLAYWRIGHT_TEST_AUTH === "true";
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
