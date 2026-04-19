import { parseContract, z } from "./shared.js";

export type BillingProvider = "CHARGILY";
export type BillingCheckoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELED"
  | "EXPIRED";
export type BillingAccessStatus = "FREE" | "ACTIVE";
export type BillingPlanCode =
  | "PREMIUM_30_DAYS"
  | "PREMIUM_90_DAYS"
  | "PREMIUM_BAC_SEASON";
export type BillingPlanAccessType = "FIXED_DAYS" | "SEASON_END";
export type BillingLocale = "ar" | "fr" | "en";

export type BillingPlan = {
  code: BillingPlanCode;
  name: string;
  description: string;
  currency: "DZD";
  amount: number;
  accessType: BillingPlanAccessType;
  durationDays: number | null;
  seasonEndsAt: string | null;
  features: string[];
  recommended?: boolean;
};

export type BillingCheckout = {
  id: string;
  provider: BillingProvider;
  planCode: BillingPlanCode;
  currency: "DZD";
  amount: number;
  status: BillingCheckoutStatus;
  locale: BillingLocale;
  providerCheckoutId: string | null;
  paymentMethod: string | null;
  checkoutUrl: string | null;
  failureReason: string | null;
  accessStartsAt: string | null;
  accessEndsAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingCurrentAccess = {
  isPremium: boolean;
  subscriptionStatus: BillingAccessStatus;
  subscriptionEndsAt: string | null;
};

export type BillingOverviewResponse = {
  provider: BillingProvider;
  currentAccess: BillingCurrentAccess;
  availablePlans: BillingPlan[];
  recentCheckouts: BillingCheckout[];
};

export type BillingCheckoutResponse = {
  checkout: BillingCheckout;
};

export type BillingCreateCheckoutRequest = {
  planCode: BillingPlanCode;
  locale?: BillingLocale;
};

export type BillingCreateCheckoutResponse = {
  checkout: BillingCheckout;
  redirectUrl: string;
};

export const billingProviderSchema: z.ZodType<BillingProvider> = z.enum([
  "CHARGILY",
]);

export const billingCheckoutStatusSchema: z.ZodType<BillingCheckoutStatus> =
  z.enum([
    "PENDING",
    "PROCESSING",
    "PAID",
    "FAILED",
    "CANCELED",
    "EXPIRED",
  ]);

export const billingAccessStatusSchema: z.ZodType<BillingAccessStatus> = z.enum([
  "FREE",
  "ACTIVE",
]);

export const billingPlanCodeSchema: z.ZodType<BillingPlanCode> = z.enum([
  "PREMIUM_30_DAYS",
  "PREMIUM_90_DAYS",
  "PREMIUM_BAC_SEASON",
]);

export const billingPlanAccessTypeSchema: z.ZodType<BillingPlanAccessType> =
  z.enum(["FIXED_DAYS", "SEASON_END"]);

export const billingLocaleSchema: z.ZodType<BillingLocale> = z.enum([
  "ar",
  "fr",
  "en",
]);

export const billingPlanSchema: z.ZodType<BillingPlan> = z.object({
  code: billingPlanCodeSchema,
  name: z.string(),
  description: z.string(),
  currency: z.literal("DZD"),
  amount: z.number().int().nonnegative(),
  accessType: billingPlanAccessTypeSchema,
  durationDays: z.number().int().positive().nullable(),
  seasonEndsAt: z.string().nullable(),
  features: z.array(z.string()),
  recommended: z.boolean().optional(),
});

export const billingCheckoutSchema: z.ZodType<BillingCheckout> = z.object({
  id: z.string(),
  provider: billingProviderSchema,
  planCode: billingPlanCodeSchema,
  currency: z.literal("DZD"),
  amount: z.number().int().nonnegative(),
  status: billingCheckoutStatusSchema,
  locale: billingLocaleSchema,
  providerCheckoutId: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  checkoutUrl: z.string().nullable(),
  failureReason: z.string().nullable(),
  accessStartsAt: z.string().nullable(),
  accessEndsAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const billingCurrentAccessSchema: z.ZodType<BillingCurrentAccess> =
  z.object({
    isPremium: z.boolean(),
    subscriptionStatus: billingAccessStatusSchema,
    subscriptionEndsAt: z.string().nullable(),
  });

export const billingOverviewResponseSchema: z.ZodType<BillingOverviewResponse> =
  z.object({
    provider: billingProviderSchema,
    currentAccess: billingCurrentAccessSchema,
    availablePlans: z.array(billingPlanSchema),
    recentCheckouts: z.array(billingCheckoutSchema),
  });

export const billingCheckoutResponseSchema: z.ZodType<BillingCheckoutResponse> =
  z.object({
    checkout: billingCheckoutSchema,
  });

export const billingCreateCheckoutRequestSchema: z.ZodType<BillingCreateCheckoutRequest> =
  z.object({
    planCode: billingPlanCodeSchema,
    locale: billingLocaleSchema.optional(),
  });

export const billingCreateCheckoutResponseSchema: z.ZodType<BillingCreateCheckoutResponse> =
  z.object({
    checkout: billingCheckoutSchema,
    redirectUrl: z.string().url(),
  });

export function parseBillingOverviewResponse(value: unknown) {
  return parseContract(
    billingOverviewResponseSchema,
    value,
    "BillingOverviewResponse",
  );
}

export function parseBillingCheckoutResponse(value: unknown) {
  return parseContract(
    billingCheckoutResponseSchema,
    value,
    "BillingCheckoutResponse",
  );
}

export function parseBillingCreateCheckoutRequest(value: unknown) {
  return parseContract(
    billingCreateCheckoutRequestSchema,
    value,
    "BillingCreateCheckoutRequest",
  );
}

export function parseBillingCreateCheckoutResponse(value: unknown) {
  return parseContract(
    billingCreateCheckoutResponseSchema,
    value,
    "BillingCreateCheckoutResponse",
  );
}
