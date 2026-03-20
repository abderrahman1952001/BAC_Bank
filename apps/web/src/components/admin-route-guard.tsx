'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchAdminJson } from '@/lib/admin';
import { getClientRole } from '@/lib/client-auth';

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifyAccess() {
      if (getClientRole() !== 'ADMIN') {
        router.replace('/app');
        return;
      }

      try {
        await fetchAdminJson('/me');

        if (isMounted) {
          setAllowed(true);
        }
      } catch {
        router.replace('/app');
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    }

    void verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <section className="panel">
        <p>Checking admin access…</p>
      </section>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
