import { StructuredLabWorkbench } from "@/components/structured-lab-workbench";
import { svtDiagramLabelingWorkbenchPresets } from "@/lib/lab-svt-diagram-labeling-workbench";
import { fetchServerLabToolMissions } from "@/lib/server-lab-api";

function readMissionId(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const value = searchParams?.mission;

  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentSvtDiagramLabelingWorkbenchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const missionId = readMissionId(resolvedSearchParams);
  const missionItem = missionId
    ? await fetchServerLabToolMissions("svt-diagram-labeling-workbench")
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
      toolId="svt-diagram-labeling-workbench"
      missionItem={missionItem}
      fallbackPreset={svtDiagramLabelingWorkbenchPresets[0]}
    />
  );
}
