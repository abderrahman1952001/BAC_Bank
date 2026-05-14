import type {
  CompleteLabMissionAttemptRequest,
  CompleteLabMissionAttemptResponse,
  LabToolMissionsResponse,
  LabToolsResponse,
  StartLabMissionAttemptResponse,
} from "@bac-bank/contracts/lab";
import {
  parseCompleteLabMissionAttemptResponse,
  parseLabToolMissionsResponse,
  parseLabToolsResponse,
  parseStartLabMissionAttemptResponse,
} from "@bac-bank/contracts/lab";
import { fetchApiJson, withJsonRequest } from "@/lib/api-client";

export type {
  CompleteLabMissionAttemptRequest,
  CompleteLabMissionAttemptResponse,
  LabMission,
  LabMissionAttempt,
  LabMissionAttemptStatus,
  LabMissionItem,
  LabToolMissionsResponse,
  LabToolsResponse,
  LabToolSummary,
} from "@bac-bank/contracts/lab";

export async function fetchLabTools() {
  return fetchApiJson<LabToolsResponse>(
    "/lab/tools",
    undefined,
    "Lab request failed.",
    parseLabToolsResponse,
  );
}

export async function fetchLabToolMissions(toolSlug: string) {
  return fetchApiJson<LabToolMissionsResponse>(
    `/lab/tools/${encodeURIComponent(toolSlug)}/missions`,
    undefined,
    "Lab missions request failed.",
    parseLabToolMissionsResponse,
  );
}

export async function startLabMissionAttempt(missionId: string) {
  return fetchApiJson<StartLabMissionAttemptResponse>(
    `/lab/missions/${encodeURIComponent(missionId)}/start`,
    withJsonRequest({
      method: "POST",
    }),
    "Could not start Lab mission.",
    parseStartLabMissionAttemptResponse,
  );
}

export async function completeLabMissionAttempt(
  attemptId: string,
  payload: CompleteLabMissionAttemptRequest,
) {
  return fetchApiJson<CompleteLabMissionAttemptResponse>(
    `/lab/attempts/${encodeURIComponent(attemptId)}/complete`,
    withJsonRequest({
      method: "POST",
      body: JSON.stringify(payload),
    }),
    "Could not complete Lab mission.",
    parseCompleteLabMissionAttemptResponse,
  );
}
