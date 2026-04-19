import {
  parseBillingCheckoutResponse,
  parseBillingCreateCheckoutRequest,
  parseBillingCreateCheckoutResponse,
  parseBillingOverviewResponse,
  type BillingCheckoutResponse,
  type BillingCreateCheckoutRequest,
  type BillingCreateCheckoutResponse,
  type BillingOverviewResponse,
} from "@bac-bank/contracts/billing";
import { fetchApiJson, withJsonRequest } from "@/lib/api-client";

export type {
  BillingCheckout,
  BillingCheckoutStatus,
  BillingCreateCheckoutRequest,
  BillingCreateCheckoutResponse,
  BillingOverviewResponse,
  BillingPlan,
  BillingPlanCode,
} from "@bac-bank/contracts/billing";

export function getBillingOverview() {
  return fetchApiJson<BillingOverviewResponse>(
    "/billing/overview",
    withJsonRequest(),
    "Billing request failed.",
    parseBillingOverviewResponse,
  );
}

export function createBillingCheckout(payload: BillingCreateCheckoutRequest) {
  const parsedPayload = parseBillingCreateCheckoutRequest(payload);

  return fetchApiJson<BillingCreateCheckoutResponse>(
    "/billing/checkouts",
    withJsonRequest({
      method: "POST",
      body: JSON.stringify(parsedPayload),
    }),
    "Could not create the payment session.",
    parseBillingCreateCheckoutResponse,
  );
}

export function getBillingCheckout(checkoutId: string) {
  return fetchApiJson<BillingCheckoutResponse>(
    `/billing/checkouts/${encodeURIComponent(checkoutId)}`,
    withJsonRequest(),
    "Billing request failed.",
    parseBillingCheckoutResponse,
  );
}

export function syncBillingCheckout(checkoutId: string) {
  return fetchApiJson<BillingCheckoutResponse>(
    `/billing/checkouts/${encodeURIComponent(checkoutId)}/sync`,
    withJsonRequest({
      method: "POST",
    }),
    "Could not refresh the payment session.",
    parseBillingCheckoutResponse,
  );
}
