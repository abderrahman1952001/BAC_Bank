import { AdminIngestionCropsPage } from "@/components/admin-ingestion-crops-page";
import { fetchServerAdminIngestionCropQueue } from "@/lib/server-admin";

export default async function AdminCropsRoute() {
  const initialQueue = await fetchServerAdminIngestionCropQueue().catch(
    () => undefined,
  );

  return <AdminIngestionCropsPage initialQueue={initialQueue} />;
}
