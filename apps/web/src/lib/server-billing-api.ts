import {
  parseBillingCheckoutResponse,
  parseBillingOverviewResponse,
  type BillingCheckoutResponse,
  type BillingOverviewResponse,
} from "@bac-bank/contracts/billing";
import {
  clonePlaywrightFixture,
  playwrightTestBillingCheckout,
  playwrightTestBillingOverview,
} from "@/lib/playwright-test-fixtures";
import { fetchServerApiJson } from "@/lib/server-api";

function shouldUsePlaywrightFixtures() {
  return process.env.PLAYWRIGHT_TEST_AUTH === "true";
}

export async function fetchServerBillingOverview(): Promise<BillingOverviewResponse> {
  if (shouldUsePlaywrightFixtures()) {
    return clonePlaywrightFixture(playwrightTestBillingOverview);
  }

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
  if (
    shouldUsePlaywrightFixtures() &&
    checkoutId === playwrightTestBillingCheckout.checkout.id
  ) {
    return clonePlaywrightFixture(playwrightTestBillingCheckout);
  }

  return fetchServerApiJson<BillingCheckoutResponse>(
    `/billing/checkouts/${encodeURIComponent(checkoutId)}`,
    undefined,
    "Billing request failed.",
    parseBillingCheckoutResponse,
  );
}
