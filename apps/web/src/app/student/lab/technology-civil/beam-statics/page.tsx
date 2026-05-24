import { StructuredLabWorkbench } from "@/components/structured-lab-workbench";
import { civilBeamStaticsWorkbenchPresets } from "@/lib/lab-civil-beam-statics-workbench";
import { fetchServerLabToolMissions } from "@/lib/server-lab-api";

function readMissionId(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const value = searchParams?.mission;

  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentCivilBeamStaticsWorkbenchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const missionId = readMissionId(resolvedSearchParams);
  const missionItem = missionId
    ? await fetchServerLabToolMissions("technology-civil-beam-statics")
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
      toolId="technology-civil-beam-statics"
      missionItem={missionItem}
      fallbackPreset={civilBeamStaticsWorkbenchPresets[0]}
    />
  );
}
