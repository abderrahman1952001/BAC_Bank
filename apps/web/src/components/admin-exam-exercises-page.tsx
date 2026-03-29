'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminExamExercisesFormSection,
  AdminExamExercisesListSection,
} from '@/components/admin-exam-exercises-sections';
import {
  AdminExercise,
  AdminExam,
  AdminExamExercisesResponse,
  AdminFiltersResponse,
  fetchAdminJson,
} from '@/lib/admin';
import {
  buildExerciseFormState,
  buildExercisePayload,
  defaultExerciseForm,
  filterAvailableExerciseTopics,
  reorderExercisesById,
  type ExerciseFormState,
} from '@/lib/admin-exam-exercises';

export function AdminExamExercisesPage({ examId }: { examId: string }) {
  const [exam, setExam] = useState<AdminExam | null>(null);
  const [filters, setFilters] = useState<AdminFiltersResponse | null>(null);
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
      const [payload, filtersPayload] = await Promise.all([
        fetchAdminJson<AdminExamExercisesResponse>(`/exams/${examId}/exercises`),
        fetchAdminJson<AdminFiltersResponse>('/filters'),
      ]);

      setFilters(filtersPayload);
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
    setFormState(buildExerciseFormState(exercise));
  }

  async function submitForm() {
    setSubmitting(true);
    setFormError(null);

    try {
      const payload = buildExercisePayload(formState);

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

    const next = reorderExercisesById(exercises, draggingId, targetId);
    setDraggingId(null);
    setExercises(next);
    await persistOrder(next);
  }

  const availableTopics = useMemo(
    () =>
      filterAvailableExerciseTopics({
        filters,
        exam,
      }),
    [exam, filters],
  );

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
        <AdminExamExercisesFormSection
          editingExerciseId={editingExerciseId}
          exam={exam}
          availableTopics={availableTopics}
          formState={formState}
          formError={formError}
          submitting={submitting}
          onFormStateChange={setFormState}
          onSubmit={() => {
            void submitForm();
          }}
          onCancel={() => {
            setShowForm(false);
          }}
        />
      ) : null}

      {loading ? <p>Loading exercises…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && exercises.length === 0 ? (
        <p className="muted-text">No exercises found. Create one to start.</p>
      ) : null}

      {!loading && exercises.length > 0 ? (
        <AdminExamExercisesListSection
          exercises={exercises}
          draggingId={draggingId}
          reordering={reordering}
          onDragStart={setDraggingId}
          onDragEnd={() => {
            setDraggingId(null);
          }}
          onDropOverExercise={(exerciseId) => {
            void onDropOverExercise(exerciseId);
          }}
          onEditExercise={openEditForm}
          onDeleteExercise={(exerciseId) => {
            void deleteExercise(exerciseId);
          }}
        />
      ) : null}
    </section>
  );
}
