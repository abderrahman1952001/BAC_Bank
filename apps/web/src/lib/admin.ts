import {
  fetchApi,
  fetchApiJson,
  type ApiJsonParser,
  withJsonRequest,
} from "@/lib/api-client";
import {
  parseAdminBillingSettingsResponse,
  parseAdminFiltersResponse,
  parseAdminSourceWorkbenchSourceListResponse,
  parseAdminSourceWorkbenchSourceResponse,
  parseUpdateAdminSourceCropResponse,
  parseUpdateAdminBillingSettingsRequest,
} from "@bac-bank/contracts/admin";
import type {
  AdminSourceWorkbenchSourceListResponse,
  AdminSourceWorkbenchSourceResponse,
  BlockType,
  ContentBlock,
  UpdateAdminSourceCropRequest,
  UpdateAdminSourceCropResponse,
} from "@bac-bank/contracts/admin";
import {
  parseAdminIngestionCropQueueResponse,
  parseUpdateIngestionAssetCropPayload,
  parseUpdateIngestionAssetCropResponse,
} from "@bac-bank/contracts/ingestion";
export type {
  AdminBillingFeeResponsibility,
  AdminBillingSettings,
  AdminBillingSettingsResponse,
  AdminBootstrapResponse,
  AdminExam,
  AdminExamExercisesResponse,
  AdminExamListResponse,
  AdminExercise,
  AdminFiltersResponse,
  AdminSourceCropBox,
  AdminSourceCropStatus,
  AdminSourceWorkbenchCrop,
  AdminSourceWorkbenchSourceDetail,
  AdminSourceWorkbenchSourceListResponse,
  AdminSourceWorkbenchSourceResponse,
  AdminSourceWorkbenchSourceSummary,
  AdminSession,
  AdminStatus,
  BlockType,
  ContentBlock,
  ExerciseEditorResponse,
  QuestionNode,
  TopicOption,
  UpdateAdminBillingSettingsRequest,
  UpdateAdminSourceCropRequest,
  UpdateAdminSourceCropResponse,
} from "@bac-bank/contracts/admin";
export {
  parseAdminBillingSettingsResponse,
  parseAdminFiltersResponse,
  parseAdminSourceWorkbenchSourceListResponse,
  parseAdminSourceWorkbenchSourceResponse,
  parseUpdateAdminSourceCropResponse,
  parseUpdateAdminBillingSettingsRequest,
};
export type {
  AdminIngestionCropQueueItem,
  AdminIngestionCropQueueResponse,
  AdminIngestionDraft,
  AdminIngestionDraftKind,
  AdminIngestionJobListResponse,
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
  AdminIngestionPublishedExam,
  AdminIngestionStatus,
  AdminIngestionValidationIssue,
  DraftAssetCleanupMask,
  DraftAssetClassification,
  DraftAssetNativeSuggestionSource,
  DraftAssetNativeSuggestionStatus,
  DraftAssetNativeSuggestionType,
  DraftBlockRole,
  DraftBlockType,
  DraftCropBox,
  DraftDocumentKind,
  DraftVariantCode,
  UpdateIngestionAssetCropPayload,
  UpdateIngestionAssetCropResponse,
} from "@bac-bank/contracts/ingestion";
export {
  parseAdminIngestionCropQueueResponse,
  parseAdminIngestionJobListResponse,
  parseAdminIngestionJobResponse,
  parseUpdateIngestionAssetCropPayload,
  parseUpdateIngestionAssetCropResponse,
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

export async function updateAdminBillingSettings(
  payload: import("@bac-bank/contracts/admin").UpdateAdminBillingSettingsRequest,
) {
  return fetchAdminJson<
    import("@bac-bank/contracts/admin").AdminBillingSettingsResponse
  >(
    "/billing/settings",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    parseAdminBillingSettingsResponse,
  );
}

export async function fetchAdminSourceWorkbenchSources() {
  return fetchAdminJson<AdminSourceWorkbenchSourceListResponse>(
    "/source-workbench/sources",
    undefined,
    parseAdminSourceWorkbenchSourceListResponse,
  );
}

export async function fetchAdminSourceWorkbenchSource(sourceId: string) {
  const params = new URLSearchParams({
    sourceId,
  });

  return fetchAdminJson<AdminSourceWorkbenchSourceResponse>(
    `/source-workbench/source?${params.toString()}`,
    undefined,
    parseAdminSourceWorkbenchSourceResponse,
  );
}

export async function updateAdminSourceWorkbenchCrop(
  sourceId: string,
  cropId: string,
  payload: UpdateAdminSourceCropRequest,
) {
  const params = new URLSearchParams({
    sourceId,
  });

  return fetchAdminJson<UpdateAdminSourceCropResponse>(
    `/source-workbench/crops/${encodeURIComponent(cropId)}?${params.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    parseUpdateAdminSourceCropResponse,
  );
}

export async function fetchAdminIngestionCropQueue() {
  return fetchAdminJson<
    import("@bac-bank/contracts/ingestion").AdminIngestionCropQueueResponse
  >("/ingestion/crops", undefined, parseAdminIngestionCropQueueResponse);
}

export async function updateAdminIngestionAssetCrop(
  jobId: string,
  assetId: string,
  payload: import("@bac-bank/contracts/ingestion").UpdateIngestionAssetCropPayload,
) {
  return fetchAdminJson<
    import("@bac-bank/contracts/ingestion").UpdateIngestionAssetCropResponse
  >(
    `/ingestion/jobs/${encodeURIComponent(jobId)}/assets/${encodeURIComponent(
      assetId,
    )}/crop`,
    {
      method: "PATCH",
      body: JSON.stringify(parseUpdateIngestionAssetCropPayload(payload)),
    },
    parseUpdateIngestionAssetCropResponse,
  );
}

export function buildSourceWorkbenchAssetUrl(input: {
  sourceId: string;
  path: string;
  version?: string | null;
}) {
  const params = new URLSearchParams({
    sourceId: input.sourceId,
    path: input.path,
  });

  if (input.version) {
    params.set("v", input.version);
  }

  return `/api/v1/admin/source-workbench/assets?${params.toString()}`;
}

export function makeEmptyBlock(type: BlockType = "paragraph"): ContentBlock {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    value: "",
  };
}
