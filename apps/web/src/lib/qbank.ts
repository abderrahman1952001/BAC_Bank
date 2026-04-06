import type { SessionType } from "@bac-bank/contracts/qbank";
import { fetchApiJson, type ApiJsonParser } from "@/lib/api-client";

export { API_BASE_URL } from "@/lib/api-client";
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
  PracticeSessionProgress,
  PracticeSessionResponse,
  PracticeSessionStatus,
  PracticeProgressSummary,
  PracticeStudyMode,
  PublicationStatus,
  RecentExamActivitiesResponse,
  RecentPracticeSessionsResponse,
  SessionPreviewResponse,
  SessionType,
  UpsertExamActivityRequest,
  UpsertExamActivityResponse,
  UpdateSessionProgressResponse,
} from "@bac-bank/contracts/qbank";
export {
  parseCatalogResponse,
  parseCreateSessionResponse,
  parseExamResponse,
  parseFiltersResponse,
  parsePracticeSessionResponse,
  parseRecentExamActivitiesResponse,
  parseRecentPracticeSessionsResponse,
  parseSessionPreviewResponse,
  parseUpdateSessionProgressResponse,
  parseUpsertExamActivityResponse,
} from "@bac-bank/contracts/qbank";

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
