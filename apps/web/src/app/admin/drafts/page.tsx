import { AdminDraftsPage } from "@/components/admin-drafts-page";
import { fetchServerAdminIngestionJobs } from "@/lib/server-admin";

export default async function AdminDraftsRoute() {
  const initialJobs = await fetchServerAdminIngestionJobs()
    .then((payload) => payload.data)
    .catch(() => undefined);

  return <AdminDraftsPage initialJobs={initialJobs} />;
}
