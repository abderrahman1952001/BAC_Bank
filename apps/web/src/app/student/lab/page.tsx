import { LabHomePage } from "@/components/lab-home-page";
import {
  fetchServerLabToolMissions,
  fetchServerLabTools,
} from "@/lib/server-lab-api";

function toUppercaseSearchParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim().toUpperCase() || null;
}

export default async function StudentLabPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedSubjectCode = toUppercaseSearchParam(
    resolvedSearchParams?.subject,
  );
  const initialTools = await fetchServerLabTools()
    .then((payload) => payload.data)
    .catch(() => undefined);
  const missionEntries = await Promise.all(
    (initialTools ?? [])
      .filter((tool) => tool.status === "READY")
      .map((tool) =>
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
      requestedSubjectCode={requestedSubjectCode}
    />
  );
}
