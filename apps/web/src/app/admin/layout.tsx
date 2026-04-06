import { redirect } from "next/navigation";
import { AdminNavbar } from "@/components/admin-navbar";
import { AuthProvider } from "@/components/auth-provider";
import { getPostAuthRoute } from "@/lib/auth-routing";
import { requireServerSessionUser } from "@/lib/server-auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireServerSessionUser({ allowIncompleteProfile: true });

  if (user.role !== "ADMIN") {
    redirect(getPostAuthRoute(user));
  }

  return (
    <AuthProvider initialUser={user}>
      <main className="admin-shell">
        <AdminNavbar />
        <div className="admin-main-frame">{children}</div>
      </main>
    </AuthProvider>
  );
}
