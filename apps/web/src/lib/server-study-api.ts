import {
  parseCatalogResponse,
  parseExamResponse,
  parseFiltersResponse,
  parseMyMistakesResponse,
  parseRecentExerciseStatesResponse,
  parseRecentExamActivitiesResponse,
  parseRecentStudySessionsResponse,
  parseStudyRoadmapsResponse,
  parseStudySessionResponse,
  parseStudentExerciseStatesLookupResponse,
  parseWeakPointInsightsResponse,
  type CatalogResponse,
  type ExamResponse,
  type FiltersResponse,
  type MyMistakesResponse,
  type RecentExerciseStatesResponse,
  type RecentExamActivitiesResponse,
  type RecentStudySessionsResponse,
  type StudyRoadmapsResponse,
  type StudySessionResponse,
  type StudentExerciseStatesLookupResponse,
  type WeakPointInsightsResponse,
} from "@/lib/study-api";
import {
  clonePlaywrightFixture,
  playwrightTestCatalog,
  playwrightTestFilters,
  playwrightTestMyMistakes,
  playwrightTestRecentExerciseStates,
  playwrightTestStudyRoadmaps,
  playwrightTestStudySession,
  playwrightTestWeakPointInsights,
} from "@/lib/playwright-test-fixtures";
import { fetchServerApiJson } from "@/lib/server-api";

function shouldUsePlaywrightFixtures() {
  return process.env.PLAYWRIGHT_TEST_AUTH === "true";
}

export function buildServerExamUrl(examId: string, sujetNumber: number) {
  return `/study/exams/${encodeURIComponent(examId)}?sujetNumber=${encodeURIComponent(
    sujetNumber,
  )}`;
}

export async function fetchServerFilters(): Promise<FiltersResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestFilters);
  }

  return fetchServerApiJson<FiltersResponse>(
    "/study/filters",
    undefined,
    "Study request failed.",
    parseFiltersResponse,
  );
}

export async function fetchServerCatalog(): Promise<CatalogResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestCatalog);
  }

  return fetchServerApiJson<CatalogResponse>(
    "/study/catalog",
    undefined,
    "Study request failed.",
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
    "Study request failed.",
    parseExamResponse,
  );
}

export async function fetchServerStudySession(
  sessionId: string,
): Promise<StudySessionResponse> {
  if (
    shouldUsePlaywrightFixtures() &&
    sessionId === playwrightTestStudySession.id
  ) {
    return clonePlaywrightFixture(playwrightTestStudySession);
  }

  return fetchServerApiJson<StudySessionResponse>(
    `/study/sessions/${encodeURIComponent(sessionId)}`,
    undefined,
    "Study request failed.",
    parseStudySessionResponse,
  );
}

export async function fetchServerRecentStudySessions(
  limit = 6,
): Promise<RecentStudySessionsResponse> {
  return fetchServerApiJson<RecentStudySessionsResponse>(
    `/study/sessions?limit=${encodeURIComponent(limit)}`,
    undefined,
    "Study request failed.",
    parseRecentStudySessionsResponse,
  );
}

export async function fetchServerRecentExamActivities(
  limit = 6,
): Promise<RecentExamActivitiesResponse> {
  return fetchServerApiJson<RecentExamActivitiesResponse>(
    `/study/exam-activities?limit=${encodeURIComponent(limit)}`,
    undefined,
    "Study request failed.",
    parseRecentExamActivitiesResponse,
  );
}

export async function fetchServerRecentExerciseStates(
  limit = 6,
): Promise<RecentExerciseStatesResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestRecentExerciseStates);
  }

  return fetchServerApiJson<RecentExerciseStatesResponse>(
    `/study/exercise-states?limit=${encodeURIComponent(limit)}`,
    undefined,
    "Study request failed.",
    parseRecentExerciseStatesResponse,
  );
}

export async function fetchServerMyMistakes(
  input?: {
    limit?: number;
    subjectCode?: string | null;
    status?: import("@/lib/study-api").StudyReviewQueueStatus | null;
  },
): Promise<MyMistakesResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestMyMistakes);
  }

  const params = new URLSearchParams();

  if (typeof input?.limit === "number") {
    params.set("limit", String(input.limit));
  }

  if (input?.subjectCode) {
    params.set("subjectCode", input.subjectCode);
  }

  if (input?.status) {
    params.set("status", input.status);
  }

  const query = params.toString();

  return fetchServerApiJson<MyMistakesResponse>(
    `/study/my-mistakes${query ? `?${query}` : ""}`,
    undefined,
    "Study request failed.",
    parseMyMistakesResponse,
  );
}

export async function fetchServerWeakPointInsights(input?: {
  limit?: number;
  subjectCode?: string | null;
}): Promise<WeakPointInsightsResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestWeakPointInsights);
  }

  const params = new URLSearchParams();

  if (typeof input?.limit === "number") {
    params.set("limit", String(input.limit));
  }

  if (input?.subjectCode) {
    params.set("subjectCode", input.subjectCode);
  }

  const query = params.toString();

  return fetchServerApiJson<WeakPointInsightsResponse>(
    `/study/weak-points${query ? `?${query}` : ""}`,
    undefined,
    "Study request failed.",
    parseWeakPointInsightsResponse,
  );
}

export async function fetchServerStudyRoadmaps(input?: {
  limit?: number;
  subjectCode?: string | null;
}): Promise<StudyRoadmapsResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestStudyRoadmaps);
  }

  const params = new URLSearchParams();

  if (typeof input?.limit === "number") {
    params.set("limit", String(input.limit));
  }

  if (input?.subjectCode) {
    params.set("subjectCode", input.subjectCode);
  }

  const query = params.toString();

  return fetchServerApiJson<StudyRoadmapsResponse>(
    `/study/roadmaps${query ? `?${query}` : ""}`,
    undefined,
    "Study request failed.",
    parseStudyRoadmapsResponse,
  );
}

export async function fetchServerExerciseStatesLookup(
  exerciseNodeIds: string[],
): Promise<StudentExerciseStatesLookupResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return { data: [] };
  }

  const params = new URLSearchParams();

  for (const exerciseNodeId of exerciseNodeIds) {
    params.append("exerciseNodeIds", exerciseNodeId);
  }

  return fetchServerApiJson<StudentExerciseStatesLookupResponse>(
    `/study/exercise-states/lookup?${params.toString()}`,
    undefined,
    "Study request failed.",
    parseStudentExerciseStatesLookupResponse,
  );
}
