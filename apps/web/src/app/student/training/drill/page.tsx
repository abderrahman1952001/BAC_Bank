import { SessionBuilder } from "@/components/session-builder";
import { fetchServerFilters } from "@/lib/server-study-api";

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

function toUppercaseSearchParamList(
  value: string | string[] | undefined,
): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim().toUpperCase();
    return trimmed.length ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

export default async function StudentTrainingDrillPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialFilters = await fetchServerFilters().catch(() => undefined);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const subjectCode = toUppercaseSearchParam(resolvedSearchParams?.subject);
  const topicCodes = toUppercaseSearchParamList(resolvedSearchParams?.topic);

  return (
    <SessionBuilder
      initialFilters={initialFilters}
      initialSelection={{
        subjectCode,
        topicCodes,
      }}
    />
  );
}
