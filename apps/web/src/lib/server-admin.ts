import type { ApiJsonParser } from "@/lib/api-client";
import {
  parseAdminIngestionJobResponse,
  parseAdminIngestionJobListResponse,
  type AdminIngestionJobResponse,
  type AdminIngestionJobListResponse,
} from "@/lib/admin";
import {
  clonePlaywrightFixture,
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
