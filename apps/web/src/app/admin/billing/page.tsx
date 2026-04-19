import { AdminBillingPage } from "@/components/admin-billing-page";
import { fetchServerAdminBillingSettings } from "@/lib/server-admin";

export default async function AdminBillingRoute() {
  const initialSettings = await fetchServerAdminBillingSettings().catch(
    () => undefined,
  );

  return <AdminBillingPage initialSettings={initialSettings} />;
}
