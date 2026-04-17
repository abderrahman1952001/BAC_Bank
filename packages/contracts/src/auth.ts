import { parseContract, z } from "./shared";

export type AuthUserRole = "STUDENT" | "ADMIN";
export type AuthStudyTier = "FREE" | "PREMIUM";
export type AuthSubscriptionStatus =
  | "FREE"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED";

export type AuthStreamOption = {
  code: string;
  name: string;
  isDefault?: boolean;
};

export type AuthStreamFamilyOption = {
  code: string;
  name: string;
  streams: AuthStreamOption[];
};

export type AuthStudyQuotaBucket = {
  monthlyLimit: number | null;
  used: number;
  remaining: number | null;
  exhausted: boolean;
  nearLimit: boolean;
  resetsAt: string;
};

export type AuthStudyEntitlements = {
  tier: AuthStudyTier;
  capabilities: {
    topicDrill: boolean;
    mixedDrill: boolean;
    weakPointDrill: boolean;
    paperSimulation: boolean;
    aiExplanation: boolean;
    weakPointInsight: boolean;
  };
  quotas: {
    drillStarts: AuthStudyQuotaBucket;
    simulationStarts: AuthStudyQuotaBucket;
  };
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: AuthUserRole;
  stream: AuthStreamOption | null;
  subscriptionStatus: AuthSubscriptionStatus;
  studyEntitlements: AuthStudyEntitlements;
};

export type AuthSessionResponse = {
  user: AuthUser;
};

export type AuthOptionsResponse = {
  streamFamilies: AuthStreamFamilyOption[];
};

export type AuthProfileUpdateRequest = {
  username: string;
  streamCode: string;
};

export const authUserRoleSchema: z.ZodType<AuthUserRole> = z.enum([
  "STUDENT",
  "ADMIN",
]);

export const authStudyTierSchema: z.ZodType<AuthStudyTier> = z.enum([
  "FREE",
  "PREMIUM",
]);

export const authSubscriptionStatusSchema: z.ZodType<AuthSubscriptionStatus> =
  z.enum(["FREE", "ACTIVE", "PAST_DUE", "CANCELED"]);

export const authStreamOptionSchema: z.ZodType<AuthStreamOption> = z.object({
  code: z.string(),
  name: z.string(),
  isDefault: z.boolean().optional(),
});

export const authStreamFamilyOptionSchema: z.ZodType<AuthStreamFamilyOption> =
  z.object({
    code: z.string(),
    name: z.string(),
    streams: z.array(authStreamOptionSchema),
});

export const authStudyQuotaBucketSchema: z.ZodType<AuthStudyQuotaBucket> =
  z.object({
    monthlyLimit: z.number().nullable(),
    used: z.number(),
    remaining: z.number().nullable(),
    exhausted: z.boolean(),
    nearLimit: z.boolean(),
    resetsAt: z.string(),
  });

export const authStudyEntitlementsSchema: z.ZodType<AuthStudyEntitlements> =
  z.object({
    tier: authStudyTierSchema,
    capabilities: z.object({
      topicDrill: z.boolean(),
      mixedDrill: z.boolean(),
      weakPointDrill: z.boolean(),
      paperSimulation: z.boolean(),
      aiExplanation: z.boolean(),
      weakPointInsight: z.boolean(),
    }),
    quotas: z.object({
      drillStarts: authStudyQuotaBucketSchema,
      simulationStarts: authStudyQuotaBucketSchema,
    }),
  });

export const authUserSchema: z.ZodType<AuthUser> = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  role: authUserRoleSchema,
  stream: authStreamOptionSchema.nullable(),
  subscriptionStatus: authSubscriptionStatusSchema,
  studyEntitlements: authStudyEntitlementsSchema,
});

export const authSessionResponseSchema: z.ZodType<AuthSessionResponse> = z.object(
  {
    user: authUserSchema,
  },
);

export const authOptionsResponseSchema: z.ZodType<AuthOptionsResponse> = z.object(
  {
    streamFamilies: z.array(authStreamFamilyOptionSchema),
  },
);

export const authProfileUpdateRequestSchema: z.ZodType<AuthProfileUpdateRequest> =
  z.object({
    username: z.string().trim().min(2).max(80),
    streamCode: z.string().trim().min(1),
  });

export function parseAuthSessionResponse(value: unknown) {
  return parseContract(
    authSessionResponseSchema,
    value,
    "AuthSessionResponse",
  );
}

export function parseAuthOptionsResponse(value: unknown) {
  return parseContract(
    authOptionsResponseSchema,
    value,
    "AuthOptionsResponse",
  );
}

export function parseAuthProfileUpdateRequest(value: unknown) {
  return parseContract(
    authProfileUpdateRequestSchema,
    value,
    "AuthProfileUpdateRequest",
  );
}
