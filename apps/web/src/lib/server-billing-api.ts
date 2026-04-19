import {
  parseBillingCheckoutResponse,
  parseBillingOverviewResponse,
  type BillingCheckoutResponse,
  type BillingOverviewResponse,
} from "@bac-bank/contracts/billing";
import { fetchServerApiJson } from "@/lib/server-api";

export async function fetchServerBillingOverview(): Promise<BillingOverviewResponse> {
  return fetchServerApiJson<BillingOverviewResponse>(
    "/billing/overview",
    undefined,
    "Billing request failed.",
    parseBillingOverviewResponse,
  );
}

export async function fetchServerBillingCheckout(
  checkoutId: string,
): Promise<BillingCheckoutResponse> {
  return fetchServerApiJson<BillingCheckoutResponse>(
    `/billing/checkouts/${encodeURIComponent(checkoutId)}`,
    undefined,
    "Billing request failed.",
    parseBillingCheckoutResponse,
  );
}
