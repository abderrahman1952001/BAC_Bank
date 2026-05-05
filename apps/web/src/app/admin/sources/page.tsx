import { AdminSourceWorkbenchPage } from "@/components/admin-source-workbench-page";
import {
  fetchServerAdminSourceWorkbenchSource,
  fetchServerAdminSourceWorkbenchSources,
} from "@/lib/server-admin";

type AdminSourcesRouteProps = {
  searchParams: Promise<{
    source?: string;
  }>;
};

export default async function AdminSourcesRoute({
  searchParams,
}: AdminSourcesRouteProps) {
  const resolvedSearchParams = await searchParams;
  const listResponse = await fetchServerAdminSourceWorkbenchSources().catch(
    () => ({
      data: [],
    }),
  );
  const selectedSourceId =
    resolvedSearchParams.source && listResponse.data.length > 0
      ? resolvedSearchParams.source
      : listResponse.data[0]?.id;
  const selectedSource = selectedSourceId
    ? await fetchServerAdminSourceWorkbenchSource(selectedSourceId).catch(
        () => null,
      )
    : null;

  return (
    <AdminSourceWorkbenchPage
      key={selectedSourceId ?? "no-source"}
      initialSources={listResponse.data}
      initialDetail={selectedSource?.data ?? null}
      initialSelectedSourceId={selectedSourceId ?? null}
    />
  );
}
