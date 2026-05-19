import { TrainingSimulationBuilder } from "@/components/training-simulation-builder";
import { fetchServerCatalog } from "@/lib/server-study-api";

function toUppercaseSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim().toUpperCase();
    return trimmed.length ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    const first = value[0]?.trim().toUpperCase();
    return first?.length ? first : undefined;
  }

  return undefined;
}

export default async function StudentTrainingSimulationPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialCatalog = await fetchServerCatalog().catch(() => undefined);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const subjectCode = toUppercaseSearchParam(resolvedSearchParams?.subject);

  return (
    <TrainingSimulationBuilder
      initialCatalog={initialCatalog}
      initialSubjectCode={subjectCode}
    />
  );
}
