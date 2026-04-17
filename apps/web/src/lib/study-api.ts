import type {
  SessionType,
  StudyQuestionAiExplanationResponse,
} from "@bac-bank/contracts/study";
import {
  parseCreateSessionResponse,
  parseExamResponse,
  parseMyMistakesResponse,
  parseRecordReviewQueueOutcomeResponse,
  parseStudyQuestionAiExplanationResponse,
  parseStudyRoadmapsResponse,
  parseStudentExerciseStatesLookupResponse,
  parseUpdateReviewQueueItemStatusResponse,
  parseUpsertExerciseStateResponse,
  parseWeakPointInsightsResponse,
} from "@bac-bank/contracts/study";
import {
  API_BASE_URL,
  fetchApiJson,
  type ApiJsonParser,
} from "@/lib/api-client";

export { API_BASE_URL };
export const ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
export type {
  BlockRole,
  BlockType,
  CatalogResponse,
  CreateSessionResponse,
  ExamHierarchyBlock,
  ExamHierarchyNode,
  ExamNodeType,
  ExamResponse,
  ExamVariantCode,
  FiltersResponse,
  MediaType,
  MyMistakesResponse,
  RecordReviewQueueOutcomeRequest,
  RecordReviewQueueOutcomeResponse,
  RecentExerciseStatesResponse,
  StudyQuestionAiExplanationResponse,
  StudyReviewOutcome,
  StudyReviewQueueStatus,
  StudyQuestionDiagnosis,
  StudyQuestionReflection,
  StudyRoadmapActionType,
  StudyRoadmapNodeStatus,
  StudyRoadmapsResponse,
  StudyReviewReasonType,
  StudySessionPedagogy,
  WeakPointInsightsResponse,
  StudySessionFamily,
  StudySessionKind,
  StudySessionProgress,
  StudySessionResponse,
  StudySessionStatus,
  StudySessionProgressSummary,
  StudySessionMode,
  StudySupportStyle,
  PublicationStatus,
  RecentExamActivitiesResponse,
  RecentStudySessionsResponse,
  SessionPreviewResponse,
  SessionType,
  StudentExerciseStateResponse,
  StudentExerciseStatesLookupResponse,
    UpdateReviewQueueItemStatusRequest,
    UpdateReviewQueueItemStatusResponse,
  UpsertExamActivityRequest,
  UpsertExamActivityResponse,
  UpsertExerciseStateRequest,
  UpsertExerciseStateResponse,
  UpdateSessionProgressResponse,
} from "@bac-bank/contracts/study";
export {
  parseCatalogResponse,
  parseFiltersResponse,
  parseMyMistakesResponse,
  parseRecordReviewQueueOutcomeResponse,
  parseRecentExerciseStatesResponse,
  parseStudyQuestionAiExplanationResponse,
  parseStudyRoadmapsResponse,
  parseStudySessionResponse,
  parseWeakPointInsightsResponse,
  parseRecentExamActivitiesResponse,
  parseRecentStudySessionsResponse,
  parseSessionPreviewResponse,
  parseStudentExerciseStateResponse,
  parseStudentExerciseStatesLookupResponse,
  parseUpdateReviewQueueItemStatusResponse,
  parseUpdateSessionProgressResponse,
  parseUpsertExamActivityResponse,
  parseUpsertExerciseStateRequest,
  parseUpsertExerciseStateResponse,
} from "@bac-bank/contracts/study";
export { parseCreateSessionResponse, parseExamResponse };

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  parser?: ApiJsonParser<T>,
): Promise<T> {
  return fetchApiJson<T>(url, init, undefined, parser);
}

export function toAssetUrl(fileUrl: string): string | null {
  if (!fileUrl) {
    return null;
  }

  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  if (fileUrl.startsWith("/")) {
    return fileUrl;
  }

  if (!ASSET_BASE_URL) {
    return null;
  }

  return `${ASSET_BASE_URL.replace(/\/$/, "")}/${fileUrl.replace(/^\//, "")}`;
}

export function formatSessionType(type: SessionType): string {
  return type === "MAKEUP" ? "استدراكية" : "عادية";
}

export function formatStudySessionKind(
  kind: import("@bac-bank/contracts/study").StudySessionKind,
): string {
  switch (kind) {
    case "TOPIC_DRILL":
      return "تدريب بالمحاور";
    case "MIXED_DRILL":
      return "تدريب مختلط";
    case "WEAK_POINT_DRILL":
      return "تدريب نقاط الضعف";
    case "PAPER_SIMULATION":
      return "محاكاة كاملة";
  }
}

export function formatStudyQuestionReflection(
  reflection: import("@bac-bank/contracts/study").StudyQuestionReflection,
): string {
  switch (reflection) {
    case "MISSED":
      return "فاتني";
    case "HARD":
      return "صعب";
    case "MEDIUM":
      return "متحكم فيه";
    case "EASY":
      return "سهل";
  }
}

export function formatStudyQuestionDiagnosis(
  diagnosis: import("@bac-bank/contracts/study").StudyQuestionDiagnosis,
): string {
  switch (diagnosis) {
    case "CONCEPT":
      return "الفكرة";
    case "METHOD":
      return "الطريقة";
    case "CALCULATION":
      return "التنفيذ";
    case "TIME_PRESSURE":
      return "ضيق الوقت";
  }
}

export async function fetchStudyQuestionAiExplanation(
  sessionId: string,
  questionId: string,
) {
  return fetchJson<StudyQuestionAiExplanationResponse>(
    `${API_BASE_URL}/study/sessions/${encodeURIComponent(
      sessionId,
    )}/questions/${encodeURIComponent(questionId)}/ai-explanation`,
    {
      method: "POST",
    },
    parseStudyQuestionAiExplanationResponse,
  );
}

export function formatStudyReviewReason(
  reason: import("@bac-bank/contracts/study").StudyReviewReasonType,
): string {
  switch (reason) {
    case "MISSED":
      return "فاتني";
    case "HARD":
      return "صعب";
    case "SKIPPED":
      return "متروك";
    case "REVEALED":
      return "كشف الحل";
    case "FLAGGED":
      return "معلّم للمراجعة";
  }
}

export async function fetchStudyExamBySujet(
  examId: string,
  sujetNumber: 1 | 2,
) {
  return fetchJson<import("@bac-bank/contracts/study").ExamResponse>(
    `${API_BASE_URL}/study/exams/${encodeURIComponent(
      examId,
    )}?sujetNumber=${encodeURIComponent(String(sujetNumber))}`,
    undefined,
    parseExamResponse,
  );
}

export async function createOfficialPaperSimulationSession(input: {
  examId: string;
  sujetNumber: 1 | 2;
  subjectCode: string;
  streamCode: string;
  year: number;
  sessionType: SessionType;
  title?: string;
}) {
  return fetchJson<import("@bac-bank/contracts/study").CreateSessionResponse>(
    `${API_BASE_URL}/study/sessions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        family: "SIMULATION",
        kind: "PAPER_SIMULATION",
        title: input.title?.trim() || undefined,
        subjectCode: input.subjectCode,
        streamCodes: [input.streamCode],
        years: [input.year],
        sessionTypes: [input.sessionType],
        sourceExamId: input.examId,
        sourceSujetNumber: input.sujetNumber,
      }),
    },
    parseCreateSessionResponse,
  );
}

export async function createExerciseDrillSession(input: {
  exerciseNodeIds: string[];
  subjectCode: string;
  streamCode?: string | null;
  year?: number | null;
  sessionType?: SessionType | null;
  title?: string;
}) {
  return fetchJson<import("@bac-bank/contracts/study").CreateSessionResponse>(
    `${API_BASE_URL}/study/sessions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: "MIXED_DRILL",
        title: input.title?.trim() || undefined,
        subjectCode: input.subjectCode,
        streamCodes: input.streamCode ? [input.streamCode] : undefined,
        years:
          typeof input.year === "number" && Number.isInteger(input.year)
            ? [input.year]
            : undefined,
        sessionTypes: input.sessionType ? [input.sessionType] : undefined,
        exerciseCount: input.exerciseNodeIds.length,
        exerciseNodeIds: input.exerciseNodeIds,
      }),
    },
    parseCreateSessionResponse,
  );
}

export async function fetchStudentExerciseStatesLookup(
  exerciseNodeIds: string[],
) {
  const params = new URLSearchParams();

  for (const exerciseNodeId of exerciseNodeIds) {
    params.append("exerciseNodeIds", exerciseNodeId);
  }

  return fetchJson<
    import("@bac-bank/contracts/study").StudentExerciseStatesLookupResponse
  >(
    `${API_BASE_URL}/study/exercise-states/lookup?${params.toString()}`,
    undefined,
    parseStudentExerciseStatesLookupResponse,
  );
}

export async function upsertStudentExerciseState(
  exerciseNodeId: string,
  input: import("@bac-bank/contracts/study").UpsertExerciseStateRequest,
) {
  return fetchJson<import("@bac-bank/contracts/study").UpsertExerciseStateResponse>(
    `${API_BASE_URL}/study/exercises/${encodeURIComponent(exerciseNodeId)}/state`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    parseUpsertExerciseStateResponse,
  );
}

export async function fetchMyMistakes(input?: {
  limit?: number;
  subjectCode?: string | null;
  status?: import("@bac-bank/contracts/study").StudyReviewQueueStatus | null;
}) {
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

  return fetchJson<import("@bac-bank/contracts/study").MyMistakesResponse>(
    `${API_BASE_URL}/study/my-mistakes${query ? `?${query}` : ""}`,
    undefined,
    parseMyMistakesResponse,
  );
}

export async function updateStudyReviewQueueStatus(
  input: import("@bac-bank/contracts/study").UpdateReviewQueueItemStatusRequest,
) {
  return fetchJson<
    import("@bac-bank/contracts/study").UpdateReviewQueueItemStatusResponse
  >(
    `${API_BASE_URL}/study/review-queue/status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    parseUpdateReviewQueueItemStatusResponse,
  );
}

export async function recordStudyReviewQueueOutcome(
  input: import("@bac-bank/contracts/study").RecordReviewQueueOutcomeRequest,
) {
  return fetchJson<
    import("@bac-bank/contracts/study").RecordReviewQueueOutcomeResponse
  >(
    `${API_BASE_URL}/study/review-queue/review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    parseRecordReviewQueueOutcomeResponse,
  );
}

export async function clearStudyReviewVault(input?: {
  subjectCode?: string | null;
  limit?: number;
}) {
  return fetchJson<import("@bac-bank/contracts/study").CreateSessionResponse>(
    `${API_BASE_URL}/study/review-queue/clear-vault`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subjectCode: input?.subjectCode ?? undefined,
        limit: input?.limit,
      }),
    },
    parseCreateSessionResponse,
  );
}

export async function fetchWeakPointInsights(
  input?: {
    limit?: number;
    subjectCode?: string | null;
  },
) {
  const params = new URLSearchParams();

  if (typeof input?.limit === "number") {
    params.set("limit", String(input.limit));
  }

  if (input?.subjectCode) {
    params.set("subjectCode", input.subjectCode);
  }

  const query = params.toString();

  return fetchJson<import("@bac-bank/contracts/study").WeakPointInsightsResponse>(
    `${API_BASE_URL}/study/weak-points${query ? `?${query}` : ""}`,
    undefined,
    parseWeakPointInsightsResponse,
  );
}

export async function fetchStudyRoadmaps(
  input?: {
    limit?: number;
    subjectCode?: string | null;
  },
) {
  const params = new URLSearchParams();

  if (typeof input?.limit === "number") {
    params.set("limit", String(input.limit));
  }

  if (input?.subjectCode) {
    params.set("subjectCode", input.subjectCode);
  }

  const query = params.toString();

  return fetchJson<import("@bac-bank/contracts/study").StudyRoadmapsResponse>(
    `${API_BASE_URL}/study/roadmaps${query ? `?${query}` : ""}`,
    undefined,
    parseStudyRoadmapsResponse,
  );
}
