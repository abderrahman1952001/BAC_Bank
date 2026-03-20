'use client';

import Link from 'next/link';
import { useMemo, useEffect, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
import { API_BASE_URL, CatalogResponse, fetchJson } from '@/lib/qbank';

export function BrowseSubjects({ streamCode }: { streamCode: string }) {
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
          setError('تعذر تحميل المواد لهذه الشعبة.');
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

  const stream = useMemo(
    () =>
      catalog?.streams.find(
        (item) => item.code === decodeURIComponent(streamCode).toUpperCase(),
      ),
    [catalog, streamCode],
  );

  return (
    <main className="app-shell">
      <AppNavbar />

      <section className="page-hero">
        <p className="page-kicker">Step 2</p>
        <h1>اختَر المادة</h1>
        <p>{stream ? `الشعبة: ${stream.name}` : 'جارٍ تحديد الشعبة...'}</p>
      </section>

      <section className="panel">
        <div className="breadcrumb">
          <Link href="/app/browse">الشعب</Link>
          <span>/</span>
          <span>{stream?.name ?? '...'}</span>
        </div>

        {loading ? <p>جاري تحميل المواد...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error && !stream ? (
          <p className="error-text">لم يتم العثور على هذه الشعبة.</p>
        ) : null}

        {!loading && !error && stream ? (
          <div className="widget-grid">
            {stream.subjects.map((subject) => (
              <Link
                key={subject.code}
                href={`/app/browse/${stream.code}/${subject.code}`}
                className="select-widget"
              >
                <h2>{subject.name}</h2>
                <p>{subject.years.length} سنوات</p>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
