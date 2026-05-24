import { StructuredLabWorkbench } from "@/components/structured-lab-workbench";
import { processFlowInstrumentationWorkbenchPresets } from "@/lib/lab-process-flow-instrumentation-workbench";
import { fetchServerLabToolMissions } from "@/lib/server-lab-api";

function readMissionId(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const value = searchParams?.mission;

  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentProcessFlowInstrumentationPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const missionId = readMissionId(resolvedSearchParams);
  const missionItem = missionId
    ? await fetchServerLabToolMissions(
        "technology-process-flow-instrumentation",
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
      toolId="technology-process-flow-instrumentation"
      missionItem={missionItem}
      fallbackPreset={processFlowInstrumentationWorkbenchPresets[0]}
    />
  );
}
