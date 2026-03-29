import { AppRouteGuard } from "@/components/app-route-guard";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppRouteGuard>{children}</AppRouteGuard>;
}
