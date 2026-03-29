'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminExerciseMetadataSection,
  AdminExerciseQuestionSection,
  AdminExerciseQuestionTreeSection,
} from '@/components/admin-exercise-editor-sections';
import {
  AdminFiltersResponse,
  ExerciseEditorResponse,
  QuestionNode,
  fetchAdminJson,
} from '@/lib/admin';
import {
  buildHierarchyErrors,
  buildQuestionChildrenByParentId,
  buildSelectableQuestionParents,
  filterAvailableQuestionTopics,
  mapQuestionToDraft,
  readFileAsDataUrl,
  reorderQuestions,
  type ExerciseMetadataDraft,
  type QuestionDraft,
} from '@/lib/admin-exercise-editor';

export function AdminExerciseEditorPage({ exerciseId }: { exerciseId: string }) {
  const [editor, setEditor] = useState<ExerciseEditorResponse | null>(null);
  const [filters, setFilters] = useState<AdminFiltersResponse | null>(null);
  const [questions, setQuestions] = useState<QuestionNode[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft | null>(null);
  const [exerciseMetadataDraft, setExerciseMetadataDraft] =
    useState<ExerciseMetadataDraft | null>(null);

  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedQuestionId) ?? null,
    [questions, selectedQuestionId],
  );

  const childrenByParentId = useMemo(
    () => buildQuestionChildrenByParentId(questions),
    [questions],
  );

  const selectableParents = useMemo(
    () =>
      buildSelectableQuestionParents({
        questions,
        selectedQuestion,
      }),
    [questions, selectedQuestion],
  );

  const loadEditor = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [payload, filtersPayload] = await Promise.all([
        fetchAdminJson<ExerciseEditorResponse>(`/exercises/${exerciseId}/editor`),
        fetchAdminJson<AdminFiltersResponse>('/filters'),
      ]);

      setEditor(payload);
      setFilters(filtersPayload);
      setQuestions(payload.questions);
      setValidationErrors(payload.validation_errors);

      if (payload.questions.length > 0) {
        setSelectedQuestionId(payload.questions[0].id);
        setQuestionDraft(mapQuestionToDraft(payload.questions[0]));
      } else {
        setSelectedQuestionId(null);
        setQuestionDraft(null);
      }

      setExerciseMetadataDraft({
        year: payload.exercise.metadata.year,
        session: payload.exercise.metadata.session,
        subject: payload.exercise.metadata.subject,
        branch: payload.exercise.metadata.branch,
        points: payload.exercise.metadata.points ?? 0,
        topic_codes: payload.exercise.topics.map((topic) => topic.code),
        context_blocks: payload.exercise.metadata.context_blocks,
      });
    } catch {
      setError('Failed to load exercise editor.');
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    void loadEditor();
  }, [loadEditor]);

  useEffect(() => {
    if (!selectedQuestion) {
      setQuestionDraft(null);
      return;
    }

    setQuestionDraft(mapQuestionToDraft(selectedQuestion));
  }, [selectedQuestion]);

  async function uploadImage(file: File): Promise<string> {
    const contentBase64 = await readFileAsDataUrl(file);
    const payload = await fetchAdminJson<{ file_name: string; url: string }>(
      '/uploads/images',
      {
        method: 'POST',
        body: JSON.stringify({
          file_name: file.name,
          content_base64: contentBase64,
        }),
      },
    );

    return payload.url;
  }

  async function persistTree(nextQuestions: QuestionNode[]) {
    const localErrors = buildHierarchyErrors(nextQuestions);
    setValidationErrors(localErrors);

    if (localErrors.length) {
      return;
    }

    setSaving(true);

    try {
      const payload = await fetchAdminJson<ExerciseEditorResponse>(
        `/exercises/${exerciseId}/questions/reorder`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            items: nextQuestions
              .sort((a, b) => a.order_index - b.order_index)
              .map((question) => ({
                id: question.id,
                parent_id: question.parent_id,
              })),
          }),
        },
      );

      setQuestions(payload.questions);
      setValidationErrors(payload.validation_errors);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed to reorder nodes.',
      );
      await loadEditor();
    } finally {
      setSaving(false);
    }
  }

  async function addQuestion(parentId: string | null) {
    setSaving(true);

    try {
      const payload = await fetchAdminJson<ExerciseEditorResponse>(
        `/exercises/${exerciseId}/questions`,
        {
          method: 'POST',
              body: JSON.stringify({
                parent_id: parentId,
                title: parentId ? 'New sub-question' : 'New question',
                status: 'published',
                points: 0,
                topic_codes: [],
                content_blocks: [],
                solution_blocks: [],
                hint_blocks: null,
          }),
        },
      );

      setQuestions(payload.questions);
      setValidationErrors(payload.validation_errors);

      const latest = payload.questions[payload.questions.length - 1];
      if (latest) {
        setSelectedQuestionId(latest.id);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed to add question.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveQuestion() {
    if (!selectedQuestion || !questionDraft) {
      return;
    }

    const nextQuestions = questions.map((question) =>
      question.id === selectedQuestion.id
        ? {
            ...question,
            title: questionDraft.title,
            parent_id: questionDraft.parent_id,
            points: questionDraft.points,
            content_blocks: questionDraft.content_blocks,
            solution_blocks: questionDraft.solution_blocks,
            hint_blocks: questionDraft.hint_blocks,
            status: 'published' as const,
          }
        : question,
    );

    const localErrors = buildHierarchyErrors(nextQuestions);
    setValidationErrors(localErrors);

    if (localErrors.length) {
      return;
    }

    setSaving(true);

    try {
      const payload = await fetchAdminJson<ExerciseEditorResponse>(
        `/questions/${selectedQuestion.id}`,
        {
          method: 'PATCH',
              body: JSON.stringify({
                title: questionDraft.title,
                parent_id: questionDraft.parent_id,
                points: questionDraft.points,
                topic_codes: questionDraft.topic_codes,
                content_blocks: questionDraft.content_blocks,
                solution_blocks: questionDraft.solution_blocks,
                hint_blocks: questionDraft.hint_blocks,
            status: 'published',
          }),
        },
      );

      setQuestions(payload.questions);
      setValidationErrors(payload.validation_errors);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed to save question.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(questionId: string) {
    const confirmed = window.confirm('Delete this question?');

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const payload = await fetchAdminJson<ExerciseEditorResponse>(
        `/questions/${questionId}`,
        {
          method: 'DELETE',
        },
      );

      setQuestions(payload.questions);
      setValidationErrors(payload.validation_errors);

      if (payload.questions.length) {
        setSelectedQuestionId(payload.questions[0].id);
      } else {
        setSelectedQuestionId(null);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed to delete question.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveExerciseMetadata() {
    if (!exerciseMetadataDraft) {
      return;
    }

    setSaving(true);

    try {
      await fetchAdminJson(`/exercises/${exerciseId}/metadata`, {
        method: 'PATCH',
        body: JSON.stringify(exerciseMetadataDraft),
      });

      await loadEditor();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to save exercise metadata.',
      );
    } finally {
      setSaving(false);
    }
  }

  function onTreeDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      return;
    }

    const nextQuestions = reorderQuestions(questions, draggingId, targetId);
    setQuestions(nextQuestions);
    setDraggingId(null);
    void persistTree(nextQuestions);
  }

  const availableTopics = useMemo(
    () =>
      filterAvailableQuestionTopics({
        filters,
        exam: editor?.exercise.exam ?? null,
      }),
    [editor, filters],
  );

  return (
    <section className="panel">
      <div className="breadcrumb">
        <Link href="/admin">Admin</Link>
        <span>/</span>
        <Link href="/admin/exams">Exams</Link>
        <span>/</span>
        {editor ? (
          <Link href={`/admin/exams/${editor.exercise.exam.id}`}>Exercise List</Link>
        ) : null}
        <span>/</span>
        <span>Question Editor</span>
      </div>

      <div className="admin-page-head">
        <div>
          <p className="page-kicker">Hierarchy Editor</p>
          <h1>{editor?.exercise.title ?? 'Exercise Editor'}</h1>
          <p className="muted-text">
            Build question/sub-question trees with structured block content.
          </p>
        </div>
        <div className="table-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              void addQuestion(null);
            }}
          >
            Add Question
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!selectedQuestion}
            onClick={() => {
              void addQuestion(selectedQuestion?.id ?? null);
            }}
          >
            Add Sub-question
          </button>
        </div>
      </div>

      {loading ? <p>Loading editor…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {validationErrors.length ? (
        <article className="admin-validation-box">
          <h3>Validation Errors</h3>
          {validationErrors.map((validationError) => (
            <p key={validationError} className="error-text">
              {validationError}
            </p>
          ))}
        </article>
      ) : null}

      {editor && exerciseMetadataDraft ? (
        <section className="admin-editor-layout">
          <AdminExerciseQuestionTreeSection
            childrenByParentId={childrenByParentId}
            collapsedNodes={collapsedNodes}
            draggingId={draggingId}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={setSelectedQuestionId}
            onSetDraggingId={setDraggingId}
            onDropQuestion={onTreeDrop}
            onToggleCollapse={(questionId) => {
              setCollapsedNodes((current) => {
                const next = new Set(current);

                if (next.has(questionId)) {
                  next.delete(questionId);
                } else {
                  next.add(questionId);
                }

                return next;
              });
            }}
          />

          <article className="admin-editor-panel">
            <AdminExerciseMetadataSection
              editor={editor}
              exerciseMetadataDraft={exerciseMetadataDraft}
              availableTopics={availableTopics}
              saving={saving}
              onExerciseMetadataDraftChange={(nextDraft) => {
                setExerciseMetadataDraft(nextDraft);
              }}
              onUploadImage={uploadImage}
              onSaveExerciseMetadata={() => {
                void saveExerciseMetadata();
              }}
            />

            <AdminExerciseQuestionSection
              editor={editor}
              selectedQuestion={selectedQuestion}
              questionDraft={questionDraft}
              selectableParents={selectableParents}
              availableTopics={availableTopics}
              saving={saving}
              onQuestionDraftChange={setQuestionDraft}
              onUploadImage={uploadImage}
              onSaveQuestion={() => {
                void saveQuestion();
              }}
              onDeleteQuestion={() => {
                if (selectedQuestion) {
                  void deleteQuestion(selectedQuestion.id);
                }
              }}
            />
          </article>
        </section>
      ) : null}
    </section>
  );
}
