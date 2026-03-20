'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearClientRole } from '@/lib/client-auth';

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
  },
  {
    href: '/admin/exams',
    label: 'Exams',
  },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') {
    return pathname === '/admin';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavbar() {
  const pathname = usePathname();

  return (
    <header className="admin-navbar">
      <Link href="/admin" className="app-brand">
        <span className="app-brand-badge">CMS</span>
        <span>BAC Admin</span>
      </Link>

      <nav className="admin-nav-links" aria-label="Admin navigation">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(pathname, item.href) ? 'active' : ''}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="admin-nav-actions">
        <Link href="/app" className="btn-secondary">
          Student App
        </Link>
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
