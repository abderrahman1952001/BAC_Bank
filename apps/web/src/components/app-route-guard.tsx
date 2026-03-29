import { RouteGuard } from "@/components/route-guard";

export function AppRouteGuard({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard loadingMessage="Checking your session…">
      {children}
    </RouteGuard>
  );
}
