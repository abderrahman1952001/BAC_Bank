import { StructuredLabWorkbench } from "@/components/structured-lab-workbench";
import { processMaterialBalanceAdvancementWorkbenchPresets } from "@/lib/lab-process-material-balance-advancement-workbench";
import { fetchServerLabToolMissions } from "@/lib/server-lab-api";

function readMissionId(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const value = searchParams?.mission;

  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentProcessMaterialBalanceAdvancementPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const missionId = readMissionId(resolvedSearchParams);
  const missionItem = missionId
    ? await fetchServerLabToolMissions(
        "technology-process-material-balance-advancement",
      )
        .then(
          (payload) =>
            payload.missions.find((item) => item.mission.id === missionId) ??
            null,
        )
        .catch(() => null)
    : null;

  return (
    <StructuredLabWorkbench
      key={missionItem?.mission.id ?? "free-play"}
      toolId="technology-process-material-balance-advancement"
      missionItem={missionItem}
      fallbackPreset={processMaterialBalanceAdvancementWorkbenchPresets[0]}
    />
  );
}
