'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
import {
  API_BASE_URL,
  CatalogResponse,
  fetchJson,
  formatSessionType,
} from '@/lib/qbank';

export function BrowseYears({
  streamCode,
  subjectCode,
}: {
  streamCode: string;
  subjectCode: string;
}) {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

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
          setError('تعذر تحميل السنوات.');
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

  const subject = useMemo(
    () =>
      stream?.subjects.find(
        (item) => item.code === decodeURIComponent(subjectCode).toUpperCase(),
      ),
    [stream, subjectCode],
  );

  const yearToShow = useMemo(
    () =>
      selectedYear
        ? subject?.years.find((yearEntry) => yearEntry.year === selectedYear)
        : subject?.years[0],
    [subject, selectedYear],
  );

  return (
    <main className="app-shell">
      <AppNavbar />

      <section className="page-hero">
        <p className="page-kicker">Step 3</p>
        <h1>اختَر السنة ثم sujet</h1>
        <p>
          {stream?.name ?? '...'} · {subject?.name ?? '...'}
        </p>
      </section>

      <section className="panel">
        <div className="breadcrumb">
          <Link href="/app/browse">الشعب</Link>
          <span>/</span>
          <Link href={`/app/browse/${stream?.code ?? streamCode}`}>
            {stream?.name ?? '...'}
          </Link>
          <span>/</span>
          <span>{subject?.name ?? '...'}</span>
        </div>

        {loading ? <p>جاري تحميل السنوات...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error && !subject ? (
          <p className="error-text">لا توجد مادة مطابقة لهذا المسار.</p>
        ) : null}

        {!loading && !error && subject ? (
          <>
            <div className="widget-grid">
              {subject.years.map((yearEntry) => (
                <button
                  key={yearEntry.year}
                  type="button"
                  onClick={() => setSelectedYear(yearEntry.year)}
                  className={
                    yearToShow?.year === yearEntry.year
                      ? 'select-widget active'
                      : 'select-widget'
                  }
                >
                  <h2>{yearEntry.year}</h2>
                  <p>{yearEntry.sujets.length} sujets</p>
                </button>
              ))}
            </div>

            {yearToShow ? (
              <div className="year-detail">
                <h3>
                  سنة {yearToShow.year} - اختَر sujet
                </h3>
                <div className="sujet-grid">
                  {yearToShow.sujets.map((sujet) => (
                    <Link
                      key={`${sujet.examId}:${sujet.sujetNumber}`}
                      href={`/app/browse/${stream?.code}/${subject.code}/${yearToShow.year}/${sujet.examId}/${sujet.sujetNumber}`}
                      className="sujet-widget"
                    >
                      <p className="sujet-title">{sujet.label}</p>
                      <p>{formatSessionType(sujet.sessionType)}</p>
                      <p>{sujet.exerciseCount} تمارين</p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
