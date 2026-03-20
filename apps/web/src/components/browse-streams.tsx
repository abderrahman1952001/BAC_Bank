'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
import { API_BASE_URL, CatalogResponse, fetchJson } from '@/lib/qbank';

export function BrowseStreams() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<CatalogResponse>(
          `${API_BASE_URL}/qbank/catalog`,
          {
            signal: controller.signal,
          },
        );

        setCatalog(payload);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('تعذر تحميل الشعب المتاحة.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadCatalog();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="app-shell">
      <AppNavbar />

      <section className="page-hero">
        <p className="page-kicker">Browse BAC Sujets</p>
        <h1>اختَر الشعبة</h1>
        <p>
          البداية تكون من الشعبة، ثم المادة، ثم السنة، ثم اختيار Sujet 1 أو Sujet
          2.
        </p>
      </section>

      <section className="panel">
        {loading ? <p>جاري تحميل الشعب...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error ? (
          <div className="widget-grid large">
            {catalog?.streams.map((stream) => (
              <Link
                key={stream.code}
                href={`/app/browse/${stream.code}`}
                className="select-widget stream-widget"
              >
                <h2>{stream.name}</h2>
                <p>{stream.subjects.length} مواد</p>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
