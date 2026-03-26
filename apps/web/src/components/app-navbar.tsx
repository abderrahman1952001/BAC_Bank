'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { clearClientRole, getClientRole } from '@/lib/client-auth';
import { ThemeToggle } from '@/components/theme-toggle';

const baseNavItems = [
  {
    href: '/app',
    label: 'الرئيسية',
  },
  {
    href: '/app/browse',
    label: 'تصفح المواضيع',
  },
  {
    href: '/app/sessions/new',
    label: 'جلسة مخصصة',
  },
];

function isLinkActive(pathname: string, href: string): boolean {
  if (href === '/app') {
    return pathname === '/app';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavbar() {
  const pathname = usePathname();
  const [role] = useState<'USER' | 'ADMIN'>(() => getClientRole());

  const navItems = useMemo(
    () =>
      role === 'ADMIN'
        ? [
            ...baseNavItems,
            {
              href: '/admin',
              label: 'الإدارة',
            },
          ]
        : baseNavItems,
    [role],
  );

  return (
    <header className="app-navbar">
      <Link href="/app" className="app-brand">
        <span className="app-brand-badge">BAC</span>
        <span>بنك البكالوريا</span>
      </Link>

      <nav className="app-nav-links" aria-label="التنقل الرئيسي">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isLinkActive(pathname, item.href) ? 'active' : ''}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="app-nav-actions">
        <ThemeToggle />
        <Link
          href="/"
          className="btn-secondary"
          onClick={() => {
            clearClientRole();
          }}
        >
          خروج
        </Link>
      </div>
    </header>
  );
}
