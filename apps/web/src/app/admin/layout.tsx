import { AdminNavbar } from '@/components/admin-navbar';
import { AdminRouteGuard } from '@/components/admin-route-guard';

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="app-shell admin-shell">
      <AdminRouteGuard>
        <AdminNavbar />
        {children}
      </AdminRouteGuard>
    </main>
  );
}
