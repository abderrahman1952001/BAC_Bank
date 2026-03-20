'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminDashboardResponse, fetchAdminJson } from '@/lib/admin';

export function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchAdminJson<AdminDashboardResponse>('/dashboard', {
          signal: controller.signal,
        });

        setData(payload);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('Failed to load admin dashboard.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <section className="panel">
      <div className="admin-page-head">
        <div>
          <p className="page-kicker">Admin CMS</p>
          <h1>Dashboard</h1>
          <p className="muted-text">Monitor direct database edits and publication workflow.</p>
        </div>
        <Link href="/admin/exams?create=1" className="btn-primary">
          Create New Exam
        </Link>
      </div>

      {loading ? <p>Loading dashboard metrics…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {data ? (
        <>
          <div className="admin-metric-grid">
            <article className="metric-card">
              <strong>{data.totals.exams}</strong>
              <span>Total Exams</span>
            </article>
            <article className="metric-card">
              <strong>{data.totals.exercises}</strong>
              <span>Total Exercises</span>
            </article>
            <article className="metric-card">
              <strong>{data.totals.questions}</strong>
              <span>Total Questions</span>
            </article>
            <article className="metric-card">
              <strong>{data.workflow.exams.published}</strong>
              <span>Published Exams</span>
            </article>
          </div>

          <div className="admin-workflow-grid">
            <article className="admin-workflow-card">
              <h3>Exam Workflow</h3>
              <p>
                Draft: <strong>{data.workflow.exams.draft}</strong>
              </p>
              <p>
                Published: <strong>{data.workflow.exams.published}</strong>
              </p>
            </article>
            <article className="admin-workflow-card">
              <h3>Exercise Workflow</h3>
              <p>
                Draft: <strong>{data.workflow.exercises.draft}</strong>
              </p>
              <p>
                Published: <strong>{data.workflow.exercises.published}</strong>
              </p>
            </article>
            <article className="admin-workflow-card">
              <h3>Question Workflow</h3>
              <p>
                Draft: <strong>{data.workflow.questions.draft}</strong>
              </p>
              <p>
                Published: <strong>{data.workflow.questions.published}</strong>
              </p>
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
