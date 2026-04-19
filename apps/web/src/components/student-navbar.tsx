"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  House,
  LogOut,
  PenTool,
  Shield,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuthSession } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  STUDENT_BILLING_ROUTE,
  STUDENT_LIBRARY_ROUTE,
  STUDENT_MY_SPACE_ROUTE,
  STUDENT_TRAINING_ROUTE,
  isStudentSurfaceActive,
} from "@/lib/student-routes";
import { useSignOut } from "@/components/use-sign-out";

const baseNavItems = [
  {
    href: STUDENT_MY_SPACE_ROUTE,
    label: "مساحتي",
    shortLabel: "مساحتي",
    icon: House,
    surface: "mySpace" as const,
  },
  {
    href: STUDENT_LIBRARY_ROUTE,
    label: "المكتبة",
    shortLabel: "المكتبة",
    icon: BookOpen,
    surface: "library" as const,
  },
  {
    href: STUDENT_TRAINING_ROUTE,
    label: "التدريب",
    shortLabel: "تدريب",
    icon: PenTool,
    surface: "training" as const,
  },
  {
    href: STUDENT_BILLING_ROUTE,
    label: "الاشتراك",
    shortLabel: "اشتراك",
    icon: CreditCard,
    surface: "billing" as const,
  },
];

export function StudentNavbar() {
  const pathname = usePathname();
  const { user } = useAuthSession();
  const { isSigningOut, signOut } = useSignOut();
  const userInitial =
    user?.username.trim().charAt(0).toUpperCase() ||
    user?.email.trim().charAt(0).toUpperCase() ||
    "B";

  const navItems =
    user?.role === "ADMIN"
      ? [
          ...baseNavItems,
          {
            href: "/admin",
            label: "الإدارة",
            shortLabel: "إدارة",
            icon: Shield,
          },
        ]
      : baseNavItems;

  return (
    <>
      <aside className="student-navbar" aria-label="التنقل الرئيسي">
        <div className="student-navbar-top">
          <Link href={STUDENT_MY_SPACE_ROUTE} className="student-brand">
            <span className="student-brand-text">BAC Bank</span>
            <span className="student-brand-badge" aria-hidden="true">
              {userInitial}
            </span>
          </Link>
        </div>

        <nav className="student-nav-links">
          {navItems.map((item) => {
            const isActive =
              "surface" in item
                ? isStudentSurfaceActive(pathname, item.surface)
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive ? "student-nav-link active" : "student-nav-link"
                }
              >
                {isActive ? (
                  <motion.span
                    layoutId="desktop-student-nav-active"
                    className="student-nav-link-active-bg"
                    transition={{
                      type: "spring",
                      stiffness: 340,
                      damping: 30,
                    }}
                  />
                ) : null}
                <span className="student-nav-link-label">{item.label}</span>
                <span className="student-nav-link-icon" aria-hidden="true">
                  <Icon size={19} strokeWidth={2.1} />
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="student-nav-footer">
          {user?.stream ? (
            <div className="student-nav-stream">{user.stream.name}</div>
          ) : null}
          <div className="student-nav-actions">
            <ThemeToggle />
            <button
              type="button"
              className="student-icon-button"
              onClick={() => {
                void signOut();
              }}
              disabled={isSigningOut}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
            >
              <LogOut size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>

      <nav className="student-bottom-nav" aria-label="التنقل السفلي">
        {navItems.map((item) => {
          const isActive =
            "surface" in item
              ? isStudentSurfaceActive(pathname, item.surface)
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "student-bottom-link active"
                  : "student-bottom-link"
              }
            >
              {isActive ? (
                <motion.span
                  layoutId="mobile-student-nav-active"
                  className="student-bottom-link-active-bg"
                  transition={{
                    type: "spring",
                    stiffness: 340,
                    damping: 30,
                  }}
                />
              ) : null}
              <span className="student-bottom-link-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2.1} />
              </span>
              <span className="student-bottom-link-label">
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
