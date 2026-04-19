import { StudentBillingStatusPage } from "@/components/student-billing-page";
import {
  fetchServerBillingCheckout,
  fetchServerBillingOverview,
} from "@/lib/server-billing-api";

type BillingFailurePageProps = {
  searchParams?: Promise<{
    checkout?: string;
  }>;
};

export default async function StudentBillingFailurePage({
  searchParams,
}: BillingFailurePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const checkoutId = resolvedSearchParams?.checkout ?? null;
  const [initialOverview, initialCheckout] = await Promise.all([
    fetchServerBillingOverview().catch(() => undefined),
    checkoutId
      ? fetchServerBillingCheckout(checkoutId)
          .then((payload) => payload.checkout)
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  return (
    <StudentBillingStatusPage
      mode="failure"
      initialOverview={initialOverview}
      initialCheckout={initialCheckout}
      checkoutId={checkoutId}
    />
  );
}
