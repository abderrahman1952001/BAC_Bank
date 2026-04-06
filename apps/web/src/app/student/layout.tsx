import { AuthProvider } from "@/components/auth-provider";
import { requireServerSessionUser } from "@/lib/server-auth";

export default async function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireServerSessionUser();

  return <AuthProvider initialUser={user}>{children}</AuthProvider>;
}
