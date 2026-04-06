import { parseContract, z } from "./shared";

export type AuthUserRole = "STUDENT" | "ADMIN";
export type AuthSubscriptionStatus =
  | "FREE"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED";

export type AuthStreamOption = {
  code: string;
  name: string;
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: AuthUserRole;
  stream: AuthStreamOption | null;
  subscriptionStatus: AuthSubscriptionStatus;
};

export type AuthSessionResponse = {
  user: AuthUser;
};

export type AuthOptionsResponse = {
  streams: AuthStreamOption[];
};

export type AuthProfileUpdateRequest = {
  username: string;
  streamCode: string;
};

export const authUserRoleSchema: z.ZodType<AuthUserRole> = z.enum([
  "STUDENT",
  "ADMIN",
]);

export const authSubscriptionStatusSchema: z.ZodType<AuthSubscriptionStatus> =
  z.enum(["FREE", "ACTIVE", "PAST_DUE", "CANCELED"]);

export const authStreamOptionSchema: z.ZodType<AuthStreamOption> = z.object({
  code: z.string(),
  name: z.string(),
});

export const authUserSchema: z.ZodType<AuthUser> = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  role: authUserRoleSchema,
  stream: authStreamOptionSchema.nullable(),
  subscriptionStatus: authSubscriptionStatusSchema,
});

export const authSessionResponseSchema: z.ZodType<AuthSessionResponse> = z.object(
  {
    user: authUserSchema,
  },
);

export const authOptionsResponseSchema: z.ZodType<AuthOptionsResponse> = z.object(
  {
    streams: z.array(authStreamOptionSchema),
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
