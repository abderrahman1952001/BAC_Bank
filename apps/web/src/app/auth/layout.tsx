import { redirectAuthenticatedUser } from "@/lib/server-auth";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await redirectAuthenticatedUser();
  return children;
}
