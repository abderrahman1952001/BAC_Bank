import type {
  LabToolMissionsResponse,
  LabToolsResponse,
} from "@bac-bank/contracts/lab";
import {
  parseLabToolMissionsResponse,
  parseLabToolsResponse,
} from "@bac-bank/contracts/lab";
import {
  clonePlaywrightFixture,
  playwrightTestLabToolMissionsBySlug,
  playwrightTestLabTools,
} from "@/lib/playwright-test-fixtures";
import { fetchServerApiJson } from "@/lib/server-api";

function shouldUsePlaywrightFixtures() {
  return process.env.PLAYWRIGHT_TEST_AUTH === "true";
}

export async function fetchServerLabTools() {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestLabTools);
  }

  return fetchServerApiJson<LabToolsResponse>(
    "/lab/tools",
    undefined,
    "Lab request failed.",
    parseLabToolsResponse,
  );
}

export async function fetchServerLabToolMissions(toolSlug: string) {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(
      playwrightTestLabToolMissionsBySlug[toolSlug] ?? {
        tool: playwrightTestLabTools.data[0],
        missions: [],
      },
    );
  }

  return fetchServerApiJson<LabToolMissionsResponse>(
    `/lab/tools/${encodeURIComponent(toolSlug)}/missions`,
    undefined,
    "Lab missions request failed.",
    parseLabToolMissionsResponse,
  );
}
