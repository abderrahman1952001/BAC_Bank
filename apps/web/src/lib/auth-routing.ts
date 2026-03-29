import type { UserRole } from "@/lib/client-auth";

export function getDefaultRouteForRole(role: UserRole) {
  return role === "ADMIN" ? "/admin" : "/app";
}
