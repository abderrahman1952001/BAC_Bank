import { StructuredLabWorkbench } from "@/components/structured-lab-workbench";
import { svtNervousImmuneResponseWorkbenchPresets } from "@/lib/lab-svt-nervous-immune-response-workbench";
import { fetchServerLabToolMissions } from "@/lib/server-lab-api";

function readMissionId(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const value = searchParams?.mission;

  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentSvtNervousImmuneResponseWorkbenchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const missionId = readMissionId(resolvedSearchParams);
  const missionItem = missionId
    ? await fetchServerLabToolMissions("svt-nervous-immune-response-workbench")
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
      toolId="svt-nervous-immune-response-workbench"
      missionItem={missionItem}
      fallbackPreset={svtNervousImmuneResponseWorkbenchPresets[0]}
    />
  );
}
