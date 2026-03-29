'use client';

import Link from 'next/link';
import { TopicTagPicker } from '@/components/topic-tag-picker';
import type {
  AdminExercise,
  AdminExam,
  AdminFiltersResponse,
} from '@/lib/admin';
import type { ExerciseFormState } from '@/lib/admin-exam-exercises';

export function AdminExamExercisesFormSection({
  editingExerciseId,
  exam,
  availableTopics,
  formState,
  formError,
  submitting,
  onFormStateChange,
  onSubmit,
  onCancel,
}: {
  editingExerciseId: string | null;
  exam: AdminExam | null;
  availableTopics: AdminFiltersResponse['topics'];
  formState: ExerciseFormState;
  formError: string | null;
  submitting: boolean;
  onFormStateChange: (nextState: ExerciseFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="admin-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
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
              onFormStateChange({
                ...formState,
                title: event.target.value,
              });
            }}
          />
        </label>

        <label className="field">
          <span>Theme</span>
          <input
            type="text"
            value={formState.theme}
            onChange={(event) => {
              onFormStateChange({
                ...formState,
                theme: event.target.value,
              });
            }}
          />
        </label>

        <label className="field">
          <span>Difficulty</span>
          <input
            type="text"
            value={formState.difficulty}
            onChange={(event) => {
              onFormStateChange({
                ...formState,
                difficulty: event.target.value,
              });
            }}
          />
        </label>

        <label className="field admin-form-wide">
          <span>Tags (comma separated)</span>
          <input
            type="text"
            value={formState.tags}
            onChange={(event) => {
              onFormStateChange({
                ...formState,
                tags: event.target.value,
              });
            }}
          />
        </label>
      </div>

      {exam ? (
        <div className="admin-form-fieldset">
          <h3>Topic Tags</h3>
          <TopicTagPicker
            topics={availableTopics}
            subjectCode={exam.subject}
            streamCodes={[exam.stream]}
            selectedCodes={formState.topic_codes}
            onChange={(topic_codes) => {
              onFormStateChange({
                ...formState,
                topic_codes,
              });
            }}
          />
        </div>
      ) : null}

      {formError ? <p className="error-text">{formError}</p> : null}

      <div className="admin-form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" disabled={submitting} onClick={onSubmit}>
          Save
        </button>
      </div>
    </form>
  );
}

export function AdminExamExercisesListSection({
  exercises,
  draggingId,
  reordering,
  onDragStart,
  onDragEnd,
  onDropOverExercise,
  onEditExercise,
  onDeleteExercise,
}: {
  exercises: AdminExercise[];
  draggingId: string | null;
  reordering: boolean;
  onDragStart: (exerciseId: string) => void;
  onDragEnd: () => void;
  onDropOverExercise: (exerciseId: string) => void;
  onEditExercise: (exercise: AdminExercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
}) {
  return (
    <>
      <div className="admin-exercise-list">
        {exercises.map((exercise) => (
          <article
            key={exercise.id}
            className="admin-exercise-card"
            draggable
            data-dragging={draggingId === exercise.id ? 'true' : 'false'}
            onDragStart={() => {
              onDragStart(exercise.id);
            }}
            onDragEnd={onDragEnd}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={() => {
              onDropOverExercise(exercise.id);
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
            {exercise.topics.length ? (
              <div className="topic-chip-row">
                {exercise.topics.map((topic) => (
                  <span key={`${exercise.id}-${topic.code}`}>{topic.name}</span>
                ))}
              </div>
            ) : null}
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
                  onEditExercise(exercise);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  onDeleteExercise(exercise.id);
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {reordering ? <p className="muted-text">Saving new order…</p> : null}
    </>
  );
}
