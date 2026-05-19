import {
  parseStudyCommandStartersResponse,
  type StudyCommandCreateSessionRequest,
  type StudyCommandStartersResponse,
} from "@bac-bank/contracts/study-command";
import {
  parseCatalogResponse,
  parseCurriculumJourneysResponse,
  parseExamResponse,
  parseFiltersResponse,
  parseMyMistakesResponse,
  parseRecentExerciseStatesResponse,
  parseRecentExamActivitiesResponse,
  parseRecentStudySessionsResponse,
  parseSessionPreviewResponse,
  parseStudySessionResponse,
  parseStudentExerciseStatesLookupResponse,
  parseWeakPointInsightsResponse,
  type CatalogResponse,
  type CurriculumJourneysResponse,
  type ExamResponse,
  type FiltersResponse,
  type MyMistakesResponse,
  type RecentExerciseStatesResponse,
  type RecentExamActivitiesResponse,
  type RecentStudySessionsResponse,
  type SessionPreviewResponse,
  type StudySessionResponse,
  type StudentExerciseStatesLookupResponse,
  type WeakPointInsightsResponse,
} from "@/lib/study-api";
import {
  clonePlaywrightFixture,
  playwrightTestCatalog,
  playwrightTestExam,
  playwrightTestFilters,
  playwrightTestMyMistakes,
  playwrightTestRecentExerciseStates,
  playwrightTestCurriculumJourneys,
  playwrightTestStudySession,
  playwrightTestWeakPointInsights,
} from "@/lib/playwright-test-fixtures";
import { fetchServerApiJson } from "@/lib/server-api";

function shouldUsePlaywrightFixtures() {
  return (
    process.env.PLAYWRIGHT_TEST_AUTH === "true" &&
    process.env.PLAYWRIGHT_FIXTURE_DATA !== "false"
  );
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
  if (
    shouldUsePlaywrightFixtures() &&
    examId === playwrightTestExam.id &&
    sujetNumber === playwrightTestExam.selectedSujetNumber
  ) {
    return clonePlaywrightFixture(playwrightTestExam);
  }

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

export async function fetchServerStudySessionPreview(
  request: StudyCommandCreateSessionRequest,
): Promise<SessionPreviewResponse> {
  return fetchServerApiJson<SessionPreviewResponse>(
    "/study/sessions/preview",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
    "Study session preview failed.",
    parseSessionPreviewResponse,
  );
}

export async function fetchServerStudyCommandStarters(): Promise<StudyCommandStartersResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return {
      data: [
        {
          id: "fixture-active-session",
          title: "واصل Focused training",
          prompt: "أريد مواصلة جلسة Focused training الآن",
          reason: "جلسة مفتوحة من آخر دراسة",
          tone: "primary",
          mode: "CONTINUE_SESSION",
          href: "/student/training/session-123",
        },
        {
          id: "fixture-due-flashcards",
          title: "1 بطاقة مستحقة",
          prompt: "أريد مراجعة بطاقات علوم الطبيعة والحياة المستحقة بسرعة",
          reason: "مراجعة حفظ في علوم الطبيعة والحياة",
          tone: "cool",
          mode: "MEMORIZATION_REVIEW",
          href: "/student/flashcards",
        },
        {
          id: "fixture-bac-training",
          title: "BAC علوم الطبيعة والحياة",
          prompt:
            "أريد تدريب BAC في علوم الطبيعة والحياة على البروتينات آخر 3 سنوات فقط",
          reason: "متوفر لشعبة Sciences experimentales",
          tone: "neutral",
          mode: "BAC_TRAINING",
          href: "/student/training/drill?subject=NATURAL_SCIENCES&topic=PROTEINS",
        },
      ],
    };
  }

  return fetchServerApiJson<StudyCommandStartersResponse>(
    "/study/command/starters",
    undefined,
    "Study command starters failed.",
    parseStudyCommandStartersResponse,
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

export async function fetchServerMyMistakes(input?: {
  limit?: number;
  subjectCode?: string | null;
  status?: import("@/lib/study-api").StudyReviewQueueStatus | null;
}): Promise<MyMistakesResponse> {
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

export async function fetchServerStudyCurriculumJourneys(input?: {
  limit?: number;
  subjectCode?: string | null;
}): Promise<CurriculumJourneysResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestCurriculumJourneys);
  }

  const params = new URLSearchParams();

  if (typeof input?.limit === "number") {
    params.set("limit", String(input.limit));
  }

  if (input?.subjectCode) {
    params.set("subjectCode", input.subjectCode);
  }

  const query = params.toString();

  return fetchServerApiJson<CurriculumJourneysResponse>(
    `/study/curriculum-journeys${query ? `?${query}` : ""}`,
    undefined,
    "Study request failed.",
    parseCurriculumJourneysResponse,
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
