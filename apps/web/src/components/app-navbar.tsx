'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { clearClientRole, getClientRole } from '@/lib/client-auth';

const baseNavItems = [
  {
    href: '/app',
    label: 'Accueil',
  },
  {
    href: '/app/browse',
    label: 'Browse BAC sujets',
  },
  {
    href: '/app/sessions/new',
    label: 'Create Study Session',
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
              label: 'Admin CMS',
            },
          ]
        : baseNavItems,
    [role],
  );

  return (
    <header className="app-navbar">
      <Link href="/app" className="app-brand">
        <span className="app-brand-badge">BAC</span>
        <span>BAC Bank</span>
      </Link>

      <nav className="app-nav-links" aria-label="Main navigation">
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
        <Link
          href="/"
          className="btn-secondary"
          onClick={() => {
            clearClientRole();
          }}
        >
          Log out
        </Link>
      </div>
    </header>
  );
}
