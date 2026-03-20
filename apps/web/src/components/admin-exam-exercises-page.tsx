'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminExercise,
  AdminExam,
  AdminExamExercisesResponse,
  fetchAdminJson,
} from '@/lib/admin';

type ExerciseFormState = {
  title: string;
  theme: string;
  difficulty: string;
  tags: string;
};

function defaultExerciseForm(): ExerciseFormState {
  return {
    title: '',
    theme: '',
    difficulty: '',
    tags: '',
  };
}

function reorderById(items: AdminExercise[], draggedId: string, targetId: string) {
  const sourceIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return items;
  }

  const copy = [...items];
  const [moved] = copy.splice(sourceIndex, 1);
  copy.splice(targetIndex, 0, moved);

  return copy.map((item, index) => ({
    ...item,
    order_index: index + 1,
  }));
}

export function AdminExamExercisesPage({ examId }: { examId: string }) {
  const [exam, setExam] = useState<AdminExam | null>(null);
  const [exercises, setExercises] = useState<AdminExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ExerciseFormState>(
    defaultExerciseForm(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const orderedExerciseIds = useMemo(
    () => exercises.map((exercise) => exercise.id),
    [exercises],
  );

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchAdminJson<AdminExamExercisesResponse>(
        `/exams/${examId}/exercises`,
      );

      setExam(payload.exam);
      setExercises(payload.exercises);
    } catch {
      setError('Failed to load exercises for this exam.');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  function openCreateForm() {
    setEditingExerciseId(null);
    setShowForm(true);
    setFormError(null);
    setFormState(defaultExerciseForm());
  }

  function openEditForm(exercise: AdminExercise) {
    setEditingExerciseId(exercise.id);
    setShowForm(true);
    setFormError(null);
    setFormState({
      title: exercise.title ?? '',
      theme: exercise.theme ?? '',
      difficulty: exercise.difficulty ?? '',
      tags: exercise.tags.join(', '),
    });
  }

  async function submitForm() {
    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        title: formState.title.trim() || null,
        theme: formState.theme.trim() || null,
        difficulty: formState.difficulty.trim() || null,
        tags: formState.tags
          .split(',')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
        status: 'published',
      };

      if (editingExerciseId) {
        await fetchAdminJson(`/exercises/${editingExerciseId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchAdminJson(`/exams/${examId}/exercises`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowForm(false);
      setEditingExerciseId(null);
      setFormState(defaultExerciseForm());
      await loadExercises();
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to save exercise.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteExercise(exerciseId: string) {
    const confirmed = window.confirm('Delete this exercise and all nested questions?');

    if (!confirmed) {
      return;
    }

    try {
      await fetchAdminJson(`/exercises/${exerciseId}`, {
        method: 'DELETE',
      });

      await loadExercises();
    } catch {
      setError('Failed to delete exercise.');
    }
  }

  async function persistOrder(nextExercises: AdminExercise[]) {
    setReordering(true);

    try {
      await fetchAdminJson(`/exams/${examId}/exercises/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({
          ordered_ids: nextExercises.map((exercise) => exercise.id),
        }),
      });

      setExercises(nextExercises);
    } catch {
      setError('Failed to reorder exercises.');
      await loadExercises();
    } finally {
      setReordering(false);
    }
  }

  async function onDropOverExercise(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      return;
    }

    const next = reorderById(exercises, draggingId, targetId);
    setDraggingId(null);
    setExercises(next);
    await persistOrder(next);
  }

  return (
    <section className="panel">
      <div className="breadcrumb">
        <Link href="/admin">Admin</Link>
        <span>/</span>
        <Link href="/admin/exams">Exams</Link>
        <span>/</span>
        <span>Exam {exam?.year ?? ''}</span>
      </div>

      <div className="admin-page-head">
        <div>
          <p className="page-kicker">Exam Editor</p>
          <h1>Exercise Management</h1>
          <p className="muted-text">
            Reorder by drag and drop, then edit question hierarchy per exercise.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          Create Exercise
        </button>
      </div>

      {exam ? (
        <article className="admin-context-card">
          <h3>
            {exam.year} · {exam.subject} · {exam.stream} · {exam.session}
          </h3>
          <p>
            Status: <strong>{exam.status}</strong> · Exercises: {orderedExerciseIds.length}
          </p>
        </article>
      ) : null}

      {showForm ? (
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm();
          }}
        >
          <h2>{editingExerciseId ? 'Edit Exercise' : 'Create Exercise'}</h2>

          <div className="admin-form-grid">
            <label className="field">
              <span>Title</span>
              <input
                type="text"
                value={formState.title}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    title: event.target.value,
                  }));
                }}
              />
            </label>

            <label className="field">
              <span>Theme</span>
              <input
                type="text"
                value={formState.theme}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    theme: event.target.value,
                  }));
                }}
              />
            </label>

            <label className="field">
              <span>Difficulty</span>
              <input
                type="text"
                value={formState.difficulty}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    difficulty: event.target.value,
                  }));
                }}
              />
            </label>

            <label className="field admin-form-wide">
              <span>Tags (comma separated)</span>
              <input
                type="text"
                value={formState.tags}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    tags: event.target.value,
                  }));
                }}
              />
            </label>
          </div>

          {formError ? <p className="error-text">{formError}</p> : null}

          <div className="admin-form-actions">
            <button
              type="button"
              className="btn-secondary"
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

      {loading ? <p>Loading exercises…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && exercises.length === 0 ? (
        <p className="muted-text">No exercises found. Create one to start.</p>
      ) : null}

      {!loading && exercises.length > 0 ? (
        <div className="admin-exercise-list">
          {exercises.map((exercise) => (
            <article
              key={exercise.id}
              className="admin-exercise-card"
              draggable
              onDragStart={() => {
                setDraggingId(exercise.id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={() => {
                void onDropOverExercise(exercise.id);
              }}
            >
              <header>
                <strong>
                  #{exercise.order_index} {exercise.title ?? 'Untitled Exercise'}
                </strong>
                <span className={`status-chip ${exercise.status}`}>{exercise.status}</span>
              </header>
              <p>
                Theme: {exercise.theme ?? '—'} · Difficulty: {exercise.difficulty ?? '—'}
              </p>
              <p>Tags: {exercise.tags.join(', ') || '—'}</p>
              <p>
                Questions: <strong>{exercise.question_count ?? 0}</strong>
              </p>
              <div className="table-actions">
                <Link href={`/admin/exercises/${exercise.id}`} className="btn-secondary">
                  Edit Questions
                </Link>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    openEditForm(exercise);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    void deleteExercise(exercise.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {reordering ? <p className="muted-text">Saving new order…</p> : null}
    </section>
  );
}
