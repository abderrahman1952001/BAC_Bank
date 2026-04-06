import {
  parseCatalogResponse,
  parseExamResponse,
  parseFiltersResponse,
  parsePracticeSessionResponse,
  parseRecentExamActivitiesResponse,
  parseRecentPracticeSessionsResponse,
  type CatalogResponse,
  type ExamResponse,
  type FiltersResponse,
  type PracticeSessionResponse,
  type RecentExamActivitiesResponse,
  type RecentPracticeSessionsResponse,
} from "@/lib/qbank";
import {
  clonePlaywrightFixture,
  playwrightTestFilters,
  playwrightTestPracticeSession,
} from "@/lib/playwright-test-fixtures";
import { fetchServerApiJson } from "@/lib/server-api";

function shouldUsePlaywrightFixtures() {
  return process.env.PLAYWRIGHT_TEST_AUTH === "true";
}

export function buildServerExamUrl(examId: string, sujetNumber: number) {
  return `/qbank/exams/${encodeURIComponent(examId)}?sujetNumber=${encodeURIComponent(
    sujetNumber,
  )}`;
}

export async function fetchServerFilters(): Promise<FiltersResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestFilters);
  }

  return fetchServerApiJson<FiltersResponse>(
    "/qbank/filters",
    undefined,
    "QBank request failed.",
    parseFiltersResponse,
  );
}

export async function fetchServerCatalog(): Promise<CatalogResponse> {
  return fetchServerApiJson<CatalogResponse>(
    "/qbank/catalog",
    undefined,
    "QBank request failed.",
    parseCatalogResponse,
  );
}

export async function fetchServerExam(
  examId: string,
  sujetNumber: number,
): Promise<ExamResponse> {
  return fetchServerApiJson<ExamResponse>(
    buildServerExamUrl(examId, sujetNumber),
    undefined,
    "QBank request failed.",
    parseExamResponse,
  );
}

export async function fetchServerPracticeSession(
  sessionId: string,
): Promise<PracticeSessionResponse> {
  if (
    shouldUsePlaywrightFixtures() &&
    sessionId === playwrightTestPracticeSession.id
  ) {
    return clonePlaywrightFixture(playwrightTestPracticeSession);
  }

  return fetchServerApiJson<PracticeSessionResponse>(
    `/qbank/sessions/${encodeURIComponent(sessionId)}`,
    undefined,
    "QBank request failed.",
    parsePracticeSessionResponse,
  );
}

export async function fetchServerRecentPracticeSessions(
  limit = 6,
): Promise<RecentPracticeSessionsResponse> {
  return fetchServerApiJson<RecentPracticeSessionsResponse>(
    `/qbank/sessions?limit=${encodeURIComponent(limit)}`,
    undefined,
    "QBank request failed.",
    parseRecentPracticeSessionsResponse,
  );
}

export async function fetchServerRecentExamActivities(
  limit = 6,
): Promise<RecentExamActivitiesResponse> {
  return fetchServerApiJson<RecentExamActivitiesResponse>(
    `/qbank/exam-activities?limit=${encodeURIComponent(limit)}`,
    undefined,
    "QBank request failed.",
    parseRecentExamActivitiesResponse,
  );
}
