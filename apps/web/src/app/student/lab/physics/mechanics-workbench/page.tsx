import { StructuredLabWorkbench } from "@/components/structured-lab-workbench";
import { physicsMechanicsWorkbenchPresets } from "@/lib/lab-physics-mechanics-workbench";
import { fetchServerLabToolMissions } from "@/lib/server-lab-api";

function readMissionId(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const value = searchParams?.mission;

  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentPhysicsMechanicsWorkbenchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const missionId = readMissionId(resolvedSearchParams);
  const missionItem = missionId
    ? await fetchServerLabToolMissions("physics-mechanics-workbench")
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
      toolId="physics-mechanics-workbench"
      missionItem={missionItem}
      fallbackPreset={physicsMechanicsWorkbenchPresets[0]}
    />
  );
}
