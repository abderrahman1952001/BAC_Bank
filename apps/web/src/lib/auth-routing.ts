import type { AuthUser, AuthUserRole } from "@bac-bank/contracts/auth";
import { STUDENT_MY_SPACE_ROUTE } from "@/lib/student-routes";

export function getDefaultRouteForRole(role: AuthUserRole) {
  return role === "ADMIN" ? "/admin" : STUDENT_MY_SPACE_ROUTE;
}

export function getPostAuthRoute(user: AuthUser) {
  if (user.role !== "ADMIN" && !user.stream) {
    return "/onboarding";
  }

  return getDefaultRouteForRole(user.role);
}
