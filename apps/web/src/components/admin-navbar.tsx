"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookCopy,
  CreditCard,
  Crop,
  GraduationCap,
  Inbox,
  LibraryBig,
  LogOut,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuthSession } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { STUDENT_MY_SPACE_ROUTE } from "@/lib/student-routes";
import { useSignOut } from "@/components/use-sign-out";

const navItems = [
  {
    href: "/admin/intake",
    label: "Intake",
    icon: Inbox,
  },
  {
    href: "/admin/drafts",
    label: "Drafts",
    icon: BookCopy,
  },
  {
    href: "/admin/library",
    label: "Library",
    icon: LibraryBig,
  },
  {
    href: "/admin/sources",
    label: "Sources",
    icon: Crop,
  },
  {
    href: "/admin/billing",
    label: "Billing",
    icon: CreditCard,
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavbar() {
  const pathname = usePathname();
  const { user } = useAuthSession();
  const { isSigningOut, signOut } = useSignOut();
  const userInitial =
    user?.username.trim().charAt(0).toUpperCase() ||
    user?.email.trim().charAt(0).toUpperCase() ||
    "A";

  return (
    <header className="admin-navbar" aria-label="Admin navigation">
      <div className="admin-navbar-top">
        <Link href="/admin/drafts" className="admin-brand">
          <div className="admin-brand-copy">
            <span className="admin-role-badge">Admin</span>
            <strong className="admin-brand-title">استوديو مِراس</strong>
            <span className="admin-brand-subtitle">
              Intake, review, and publishing
            </span>
          </div>
          <span className="admin-brand-badge" aria-hidden="true">
            {userInitial}
          </span>
        </Link>
      </div>

      <nav className="admin-nav-links" aria-label="Admin navigation">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "admin-nav-link active" : "admin-nav-link"}
            >
              {active ? (
                <motion.span
                  layoutId="admin-nav-active"
                  className="admin-nav-link-active-bg"
                  transition={{
                    type: "spring",
                    stiffness: 340,
                    damping: 30,
                  }}
                />
              ) : null}
              <span className="admin-nav-link-icon" aria-hidden="true">
                <Icon size={19} strokeWidth={2.05} />
              </span>
              <span className="admin-nav-link-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="admin-nav-footer">
        <div className="admin-nav-context">
          <span className="admin-nav-context-kicker">Workspace</span>
          <strong>{user?.username ?? "مشرف مِراس"}</strong>
          <span>{user?.email ?? "مِراس CMS"}</span>
        </div>

        <div className="admin-nav-actions">
          <ThemeToggle />
          <Button
            asChild
            variant="outline"
            size="icon-lg"
            className="size-12 rounded-2xl"
          >
            <Link
              href={STUDENT_MY_SPACE_ROUTE}
              aria-label="Open student app"
              title="Student app"
            >
              <GraduationCap data-icon="solo" strokeWidth={2} />
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-12 rounded-2xl"
            onClick={() => {
              void signOut();
            }}
            disabled={isSigningOut}
            aria-label={isSigningOut ? "Signing out" : "Log out"}
            title={isSigningOut ? "Signing out" : "Log out"}
          >
            <LogOut data-icon="solo" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </header>
  );
}
