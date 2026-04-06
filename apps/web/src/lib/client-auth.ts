import {
  parseAuthOptionsResponse,
  parseAuthProfileUpdateRequest,
  parseAuthSessionResponse,
  type AuthOptionsResponse,
  type AuthProfileUpdateRequest,
  type AuthSubscriptionStatus,
  type AuthSessionResponse,
  type AuthUser,
  type AuthUserRole,
} from "@bac-bank/contracts/auth";
import { fetchApiJson, withJsonRequest } from "@/lib/api-client";

export type UserRole = AuthUserRole;
export type SubscriptionStatus = AuthSubscriptionStatus;
export type {
  AuthOptionsResponse,
  AuthProfileUpdateRequest,
  AuthSessionResponse,
  AuthUser,
};

export function getAuthOptions() {
  return fetchApiJson<AuthOptionsResponse>(
    "/auth/options",
    withJsonRequest(),
    "Authentication request failed.",
    parseAuthOptionsResponse,
  );
}

export function getCurrentUser() {
  return fetchApiJson<AuthSessionResponse>(
    "/auth/me",
    withJsonRequest(),
    "Authentication request failed.",
    parseAuthSessionResponse,
  );
}

export function updateCurrentUserProfile(payload: AuthProfileUpdateRequest) {
  const parsedPayload = parseAuthProfileUpdateRequest(payload);

  return fetchApiJson<AuthSessionResponse>(
    "/auth/profile",
    withJsonRequest({
      method: "POST",
      body: JSON.stringify(parsedPayload),
    }),
    "Authentication request failed.",
    parseAuthSessionResponse,
  );
}
