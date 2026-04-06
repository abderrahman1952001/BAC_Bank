import {
  fetchApi,
  fetchApiJson,
  type ApiJsonParser,
  withJsonRequest,
} from "@/lib/api-client";
import type { BlockType, ContentBlock } from "@bac-bank/contracts/admin";
export type {
  AdminBootstrapResponse,
  AdminExam,
  AdminExamExercisesResponse,
  AdminExamListResponse,
  AdminExercise,
  AdminFiltersResponse,
  AdminSession,
  AdminStatus,
  BlockType,
  ContentBlock,
  ExerciseEditorResponse,
  QuestionNode,
  TopicOption,
} from "@bac-bank/contracts/admin";
export { parseAdminFiltersResponse } from "@bac-bank/contracts/admin";
export type {
  AdminIngestionDraft,
  AdminIngestionDraftKind,
  AdminIngestionJobListResponse,
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
  AdminIngestionPublishedExam,
  AdminIngestionRecoveryMode,
  AdminIngestionRecoveryResponse,
  AdminIngestionSnippetRecoveryResponse,
  AdminIngestionStatus,
  AdminIngestionValidationIssue,
  DraftAssetClassification,
  DraftAssetNativeSuggestionSource,
  DraftAssetNativeSuggestionStatus,
  DraftAssetNativeSuggestionType,
  DraftBlockRole,
  DraftBlockType,
  DraftVariantCode,
} from "@bac-bank/contracts/ingestion";
export {
  parseAdminIngestionJobListResponse,
  parseAdminIngestionJobResponse,
  parseUpdateIngestionJobPayload,
} from "@bac-bank/contracts/ingestion";

function withAdminInit(init?: RequestInit): RequestInit {
  return withJsonRequest(init);
}

export async function fetchAdmin(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetchApi(
    `/admin${path}`,
    withAdminInit(init),
    "Admin request failed.",
  );
}

export async function fetchAdminJson<T>(
  path: string,
  init?: RequestInit,
  parser?: ApiJsonParser<T>,
): Promise<T> {
  return fetchApiJson<T>(
    `/admin${path}`,
    withAdminInit(init),
    "Admin request failed.",
    parser,
  );
}

export function makeEmptyBlock(type: BlockType = "paragraph"): ContentBlock {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    value: "",
  };
}
