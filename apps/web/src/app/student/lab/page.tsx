import { LabHomePage } from "@/components/lab-home-page";
import {
  fetchServerLabToolMissions,
  fetchServerLabTools,
} from "@/lib/server-lab-api";

export default async function StudentLabPage() {
  const initialTools = await fetchServerLabTools()
    .then((payload) => payload.data)
    .catch(() => undefined);
  const missionEntries = await Promise.all(
    (initialTools ?? []).map((tool) =>
      fetchServerLabToolMissions(tool.slug)
        .then((payload) => [tool.slug, payload] as const)
        .catch(() => null),
    ),
  );
  const initialToolMissions = Object.fromEntries(
    missionEntries.filter((entry) => entry !== null),
  );

  return (
    <LabHomePage
      initialTools={initialTools}
      initialToolMissions={initialToolMissions}
    />
  );
}
