import type { AuthUser, AuthUserRole } from "@bac-bank/contracts/auth";

export function getDefaultRouteForRole(role: AuthUserRole) {
  return role === "ADMIN" ? "/admin" : "/student";
}

export function getPostAuthRoute(user: AuthUser) {
  if (user.role !== "ADMIN" && !user.stream) {
    return "/onboarding";
  }

  return getDefaultRouteForRole(user.role);
}
