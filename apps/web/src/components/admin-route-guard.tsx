import { RouteGuard } from "@/components/route-guard";
import type { UserRole } from "@/lib/client-auth";

const ADMIN_ALLOWED_ROLES: UserRole[] = ["ADMIN"];

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard
      allowedRoles={ADMIN_ALLOWED_ROLES}
      loadingMessage="Checking admin access…"
      unauthorizedRedirect="/app"
    >
      {children}
    </RouteGuard>
  );
}
