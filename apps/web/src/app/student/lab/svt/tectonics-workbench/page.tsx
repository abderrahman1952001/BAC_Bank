import { StructuredLabWorkbench } from "@/components/structured-lab-workbench";
import { svtTectonicsWorkbenchPresets } from "@/lib/lab-svt-tectonics-workbench";
import { fetchServerLabToolMissions } from "@/lib/server-lab-api";

function readMissionId(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const value = searchParams?.mission;

  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentSvtTectonicsWorkbenchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const missionId = readMissionId(resolvedSearchParams);
  const missionItem = missionId
    ? await fetchServerLabToolMissions("svt-tectonics-workbench")
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
      toolId="svt-tectonics-workbench"
      missionItem={missionItem}
      fallbackPreset={svtTectonicsWorkbenchPresets[0]}
    />
  );
}
