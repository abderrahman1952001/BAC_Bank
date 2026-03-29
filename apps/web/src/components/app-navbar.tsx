"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSignOut } from "@/components/use-sign-out";

const baseNavItems = [
  {
    href: "/app",
    label: "الرئيسية",
  },
  {
    href: "/app/browse",
    label: "المواضيع",
  },
  {
    href: "/app/sessions/new",
    label: "جلسة",
  },
];

function isLinkActive(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavbar() {
  const pathname = usePathname();
  const { user } = useAuthSession();
  const { isSigningOut, signOut } = useSignOut();

  const navItems =
    user?.role === "ADMIN"
      ? [
          ...baseNavItems,
          {
            href: "/admin",
            label: "الإدارة",
          },
        ]
      : baseNavItems;

  return (
    <header className="app-navbar">
      <Link href="/app" className="app-brand">
        <span className="app-brand-badge">BB</span>
        <span className="app-brand-text">BAC Bank</span>
      </Link>

      <nav className="app-nav-links" aria-label="التنقل الرئيسي">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isLinkActive(pathname, item.href) ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="app-nav-actions">
        <ThemeToggle />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            void signOut();
          }}
          disabled={isSigningOut}
        >
          {isSigningOut ? "جارٍ تسجيل الخروج..." : "خروج"}
        </button>
      </div>
    </header>
  );
}
