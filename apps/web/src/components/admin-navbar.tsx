"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSignOut } from "@/components/use-sign-out";

const navItems = [
  {
    href: "/admin/ingestion",
    label: "Ingestion",
  },
  {
    href: "/admin/library",
    label: "Library",
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavbar() {
  const pathname = usePathname();
  const { isSigningOut, signOut } = useSignOut();

  return (
    <header className="admin-navbar">
      <Link href="/admin/ingestion" className="app-brand">
        <span className="app-brand-badge">CMS</span>
        <span>BAC Admin</span>
      </Link>

      <nav className="admin-nav-links" aria-label="Admin navigation">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(pathname, item.href) ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="admin-nav-actions">
        <ThemeToggle />
        <Link href="/app" className="btn-secondary">
          Student App
        </Link>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            void signOut();
          }}
          disabled={isSigningOut}
        >
          {isSigningOut ? "Signing out…" : "Log out"}
        </button>
      </div>
    </header>
  );
}
