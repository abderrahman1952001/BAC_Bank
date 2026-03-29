"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthSession } from "@/components/auth-provider";
import { getDefaultRouteForRole } from "@/lib/auth-routing";
import type { UserRole } from "@/lib/client-auth";

type RouteGuardProps = {
  children: React.ReactNode;
  loadingMessage: string;
  allowedRoles?: readonly UserRole[];
  unauthenticatedRedirect?: string;
  unauthorizedRedirect?: string;
};

export function RouteGuard({
  children,
  loadingMessage,
  allowedRoles,
  unauthenticatedRedirect = "/auth",
  unauthorizedRedirect,
}: RouteGuardProps) {
  const router = useRouter();
  const { status, user } = useAuthSession();
  const isAuthorized =
    status === "authenticated" &&
    user !== null &&
    (!allowedRoles?.length ||
      allowedRoles.includes(user.role));

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(unauthenticatedRedirect);
      return;
    }

    if (
      status === "authenticated" &&
      user &&
      allowedRoles?.length &&
      !allowedRoles.includes(user.role)
    ) {
      router.replace(
        unauthorizedRedirect ?? getDefaultRouteForRole(user.role),
      );
    }
  }, [
    allowedRoles,
    router,
    status,
    unauthenticatedRedirect,
    unauthorizedRedirect,
    user,
  ]);

  if (status === "loading") {
    return (
      <section className="panel">
        <p>{loadingMessage}</p>
      </section>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
