'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  AdminExam,
  AdminExamListResponse,
  AdminFiltersResponse,
  AdminSession,
  fetchAdminJson,
} from '@/lib/admin';

type ExamFormState = {
  year: number;
  subject: string;
  stream: string;
  session: AdminSession;
  original_pdf_url: string;
};

function defaultExamForm(): ExamFormState {
  return {
    year: new Date().getFullYear(),
    subject: '',
    stream: '',
    session: 'normal',
    original_pdf_url: '',
  };
}

export function AdminExamsPage() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<AdminFiltersResponse | null>(null);
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subjectFilter, setSubjectFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState<ExamFormState>(defaultExamForm());

  const formattedYears = useMemo(() => {
    const yearSet = new Set([...(filters?.years ?? []), ...exams.map((exam) => exam.year)]);
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [filters?.years, exams]);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowForm(true);
      setEditingExamId(null);
      setFormState(defaultExamForm());
    }
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFilters() {
      try {
        const payload = await fetchAdminJson<AdminFiltersResponse>('/filters', {
          signal: controller.signal,
        });

        setFilters(payload);
      } catch {
        setError('Failed to load filter options.');
      }
    }

    void loadFilters();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadExams() {
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams();

        if (subjectFilter) {
          query.set('subject', subjectFilter);
        }

        if (yearFilter) {
          query.set('year', yearFilter);
        }

        const queryString = query.toString();

        const payload = await fetchAdminJson<AdminExamListResponse>(
          `/exams${queryString ? `?${queryString}` : ''}`,
          {
            signal: controller.signal,
          },
        );

        setExams(payload.data);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== 'AbortError') {
          setError('Failed to load exams.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadExams();

    return () => {
      controller.abort();
    };
  }, [subjectFilter, yearFilter]);

  function applyExamToForm(exam: AdminExam) {
    setEditingExamId(exam.id);
    setShowForm(true);
    setFormError(null);
    setFormState({
      year: exam.year,
      subject: exam.subject,
      stream: exam.stream,
      session: exam.session,
      original_pdf_url: exam.original_pdf_url ?? '',
    });
  }

  function prepareCreate() {
    setEditingExamId(null);
    setFormState(defaultExamForm());
    setFormError(null);
    setShowForm(true);
  }

  async function refreshExams() {
    const query = new URLSearchParams();

    if (subjectFilter) {
      query.set('subject', subjectFilter);
    }

    if (yearFilter) {
      query.set('year', yearFilter);
    }

    const queryString = query.toString();
    const payload = await fetchAdminJson<AdminExamListResponse>(
      `/exams${queryString ? `?${queryString}` : ''}`,
    );

    setExams(payload.data);
  }

  async function submitForm() {
    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        ...formState,
        status: 'published',
        original_pdf_url: formState.original_pdf_url.trim() || null,
      };

      if (editingExamId) {
        await fetchAdminJson(`/exams/${editingExamId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchAdminJson('/exams', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      await refreshExams();
      setShowForm(false);
      setEditingExamId(null);
      setFormState(defaultExamForm());
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'Failed to save exam.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteExam(examId: string) {
    const confirmed = window.confirm('Delete this exam and all nested content?');

    if (!confirmed) {
      return;
    }

    try {
      await fetchAdminJson(`/exams/${examId}`, {
        method: 'DELETE',
      });
      await refreshExams();
    } catch {
      setError('Failed to delete exam.');
    }
  }

  return (
    <section className="panel">
      <div className="admin-page-head">
        <div>
          <p className="page-kicker">Admin CMS</p>
          <h1>Exam Management</h1>
          <p className="muted-text">Filter, create, edit, and delete BAC exams.</p>
        </div>
        <div className="table-actions">
          <button type="button" className="btn-primary" onClick={prepareCreate}>
            Create New Exam
          </button>
        </div>
      </div>

      <section className="admin-filter-row">
        <label className="field">
          <span>Filter by Subject</span>
          <select
            value={subjectFilter}
            onChange={(event) => {
              setSubjectFilter(event.target.value);
            }}
          >
            <option value="">All Subjects</option>
            {(filters?.subjects ?? []).map((subject) => (
              <option key={subject.code} value={subject.code}>
                {subject.code} · {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Filter by Year</span>
          <select
            value={yearFilter}
            onChange={(event) => {
              setYearFilter(event.target.value);
            }}
          >
            <option value="">All Years</option>
            {formattedYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </section>

      {showForm ? (
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm();
          }}
        >
          <h2>{editingExamId ? 'Edit Exam' : 'Create Exam'}</h2>

          <div className="admin-form-grid">
            <label className="field">
              <span>Year</span>
              <input
                type="number"
                value={formState.year}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    year: Number.parseInt(event.target.value, 10) || new Date().getFullYear(),
                  }));
                }}
              />
            </label>

            <label className="field">
              <span>Subject</span>
              <select
                value={formState.subject}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    subject: event.target.value,
                  }));
                }}
                required
              >
                <option value="" disabled>
                  Choose subject
                </option>
                {(filters?.subjects ?? []).map((subject) => (
                  <option key={subject.code} value={subject.code}>
                    {subject.code} · {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Stream</span>
              <select
                value={formState.stream}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    stream: event.target.value,
                  }));
                }}
                required
              >
                <option value="" disabled>
                  Choose stream
                </option>
                {(filters?.streams ?? []).map((stream) => (
                  <option key={stream.code} value={stream.code}>
                    {stream.code} · {stream.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Session</span>
              <select
                value={formState.session}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    session: event.target.value as AdminSession,
                  }));
                }}
              >
                <option value="normal">Normal</option>
                <option value="rattrapage">Rattrapage</option>
              </select>
            </label>

            <label className="field admin-form-wide">
              <span>Original PDF URL (optional)</span>
              <input
                type="text"
                value={formState.original_pdf_url}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    original_pdf_url: event.target.value,
                  }));
                }}
                placeholder="https://..."
              />
            </label>
          </div>

          {formError ? <p className="error-text">{formError}</p> : null}

          <div className="admin-form-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={submitting}
              onClick={() => {
                setShowForm(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={submitting}
              onClick={() => {
                void submitForm();
              }}
            >
              Save
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <p>Loading exams…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && exams.length === 0 ? (
        <article className="admin-context-card">
          <h3>No Exams Yet</h3>
          <p className="muted-text">Create your first exam to start building content.</p>
        </article>
      ) : null}

      {!loading && exams.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Subject</th>
                <th>Stream</th>
                <th>Session</th>
                <th>Status</th>
                <th>Exercises</th>
                <th>Questions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td>{exam.year}</td>
                  <td>{exam.subject}</td>
                  <td>{exam.stream}</td>
                  <td>{exam.session}</td>
                  <td>
                    <span className={`status-chip ${exam.status}`}>
                      {exam.status}
                    </span>
                  </td>
                  <td>{exam.exercise_count}</td>
                  <td>{exam.question_count}</td>
                  <td>
                    <div className="table-actions">
                      <Link href={`/admin/exams/${exam.id}`} className="btn-secondary">
                        Manage Exercises
                      </Link>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          applyExamToForm(exam);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          void deleteExam(exam.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
