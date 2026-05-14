import { FunctionExplorerLab } from "@/components/function-explorer-lab";
import { fetchServerLabToolMissions } from "@/lib/server-lab-api";

function readMissionId(
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  const value = searchParams?.mission;

  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentFunctionExplorerLabPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const missionId = readMissionId(resolvedSearchParams);
  const missionItem = missionId
    ? await fetchServerLabToolMissions("function-explorer")
        .then(
          (payload) =>
            payload.missions.find((item) => item.mission.id === missionId) ??
            null,
        )
        .catch(() => null)
    : null;

  return (
    <FunctionExplorerLab
      key={missionItem?.mission.id ?? "free-play"}
      missionItem={missionItem}
    />
  );
}
