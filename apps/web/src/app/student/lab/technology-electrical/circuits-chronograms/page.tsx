import { StructuredLabWorkbench } from "@/components/structured-lab-workbench";
import { electricalCircuitsChronogramsWorkbenchPresets } from "@/lib/lab-electrical-circuits-chronograms-workbench";
import { fetchServerLabToolMissions } from "@/lib/server-lab-api";

function readMissionId(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const value = searchParams?.mission;

  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentElectricalCircuitsChronogramsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const missionId = readMissionId(resolvedSearchParams);
  const missionItem = missionId
    ? await fetchServerLabToolMissions(
        "technology-electrical-circuits-chronograms",
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
      toolId="technology-electrical-circuits-chronograms"
      missionItem={missionItem}
      fallbackPreset={electricalCircuitsChronogramsWorkbenchPresets[0]}
    />
  );
}
