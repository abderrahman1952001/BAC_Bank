import { StudentBillingPage } from "@/components/student-billing-page";
import { fetchServerBillingOverview } from "@/lib/server-billing-api";

export default async function StudentBillingRoutePage() {
  const initialOverview = await fetchServerBillingOverview().catch(
    () => undefined,
  );

  return <StudentBillingPage initialOverview={initialOverview} />;
}
