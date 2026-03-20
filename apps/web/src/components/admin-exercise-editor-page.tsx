'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BlockEditor } from '@/components/block-editor';
import {
  ContentBlock,
  ExerciseEditorResponse,
  QuestionNode,
  fetchAdminJson,
} from '@/lib/admin';

type ExerciseMetadataDraft = {
  year: number;
  session: 'normal' | 'rattrapage';
  subject: string;
  branch: string;
  points: number;
  context_blocks: ContentBlock[];
};

type QuestionDraft = {
  title: string;
  parent_id: string | null;
  points: number;
  content_blocks: ContentBlock[];
  solution_blocks: ContentBlock[];
  hint_blocks: ContentBlock[] | null;
};

function buildHierarchyErrors(questions: QuestionNode[]) {
  const errors: string[] = [];
  const idSet = new Set(questions.map((question) => question.id));

  for (const question of questions) {
    if (question.parent_id && !idSet.has(question.parent_id)) {
      errors.push(
        `Question ${question.title} references missing parent ${question.parent_id}.`,
      );
    }

    if (question.parent_id && question.parent_id === question.id) {
      errors.push(`Question ${question.title} cannot reference itself as parent.`);
    }

    if (!Number.isInteger(question.order_index) || question.order_index < 1) {
      errors.push(`Question ${question.title} has invalid order_index.`);
    }
  }

  const sortedIndexes = questions
    .map((question) => question.order_index)
    .sort((a, b) => a - b);

  if (new Set(sortedIndexes).size !== sortedIndexes.length) {
    errors.push('Duplicate order_index values were detected.');
  }

  for (let index = 0; index < sortedIndexes.length; index += 1) {
    if (sortedIndexes[index] !== index + 1) {
      errors.push('order_index values must be sequential starting at 1.');
      break;
    }
  }

  const nodeById = new Map(questions.map((question) => [question.id, question]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function walk(nodeId: string) {
    if (visited.has(nodeId)) {
      return;
    }

    if (visiting.has(nodeId)) {
      errors.push(`Circular hierarchy detected at node ${nodeId}.`);
      return;
    }

    visiting.add(nodeId);
    const node = nodeById.get(nodeId);

    if (node?.parent_id) {
      walk(node.parent_id);
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  for (const question of questions) {
    walk(question.id);
  }

  return Array.from(new Set(errors));
}

function mapQuestionToDraft(question: QuestionNode): QuestionDraft {
  return {
    title: question.title,
    parent_id: question.parent_id,
    points: question.points ?? 0,
    content_blocks: question.content_blocks,
    solution_blocks: question.solution_blocks,
    hint_blocks: question.hint_blocks,
  };
}

function reorderQuestions(
  questions: QuestionNode[],
  draggedId: string,
  targetId: string,
): QuestionNode[] {
  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index);
  const sourceIndex = sorted.findIndex((question) => question.id === draggedId);
  const targetIndex = sorted.findIndex((question) => question.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return questions;
  }

  const target = sorted[targetIndex];
  const [dragged] = sorted.splice(sourceIndex, 1);

  sorted.splice(targetIndex, 0, {
    ...dragged,
    parent_id: target.parent_id,
  });

  return sorted.map((question, index) => ({
    ...question,
    order_index: index + 1,
  }));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read image file.'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.readAsDataURL(file);
  });
}

export function AdminExerciseEditorPage({ exerciseId }: { exerciseId: string }) {
  const [editor, setEditor] = useState<ExerciseEditorResponse | null>(null);
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

  const childrenByParentId = useMemo(() => {
    const map = new Map<string, QuestionNode[]>();

    for (const question of questions) {
      const parentId = question.parent_id ?? 'ROOT';
      const bucket = map.get(parentId) ?? [];
      bucket.push(question);
      map.set(parentId, bucket);
    }

    for (const [key, bucket] of map) {
      map.set(
        key,
        bucket.sort((left, right) => left.order_index - right.order_index),
      );
    }

    return map;
  }, [questions]);

  const selectableParents = useMemo(() => {
    if (!selectedQuestion) {
      return questions;
    }

    const blocked = new Set<string>([selectedQuestion.id]);

    function collectChildren(parentId: string) {
      const children = questions.filter((question) => question.parent_id === parentId);

      for (const child of children) {
        blocked.add(child.id);
        collectChildren(child.id);
      }
    }

    collectChildren(selectedQuestion.id);

    return questions.filter((question) => !blocked.has(question.id));
  }, [questions, selectedQuestion]);

  const loadEditor = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchAdminJson<ExerciseEditorResponse>(
        `/exercises/${exerciseId}/editor`,
      );

      setEditor(payload);
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

  function renderTree(parentId: string | null, depth = 0) {
    const entries = childrenByParentId.get(parentId ?? 'ROOT') ?? [];

    return entries.map((question) => {
      const children = childrenByParentId.get(question.id) ?? [];
      const isCollapsed = collapsedNodes.has(question.id);
      const isSelected = selectedQuestionId === question.id;

      return (
        <div key={question.id} className="tree-node" style={{ paddingInlineStart: depth * 16 }}>
          <div
            className={`tree-row ${isSelected ? 'selected' : ''}`}
            draggable
            onClick={() => {
              setSelectedQuestionId(question.id);
            }}
            onDragStart={() => {
              setDraggingId(question.id);
            }}
            onDragEnd={() => {
              setDraggingId(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={() => {
              onTreeDrop(question.id);
            }}
          >
            <button
              type="button"
              className="tree-collapse-btn"
              onClick={(event) => {
                event.stopPropagation();

                setCollapsedNodes((current) => {
                  const next = new Set(current);

                  if (next.has(question.id)) {
                    next.delete(question.id);
                  } else {
                    next.add(question.id);
                  }

                  return next;
                });
              }}
            >
              {children.length ? (isCollapsed ? '+' : '−') : '·'}
            </button>
            <span>
              #{question.order_index} {question.title}
            </span>
            <span className={`status-chip ${question.status}`}>{question.status}</span>
          </div>

          {!isCollapsed && children.length ? renderTree(question.id, depth + 1) : null}
        </div>
      );
    });
  }

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
          <aside className="admin-tree-panel">
            <h2>Question Tree</h2>
            <div className="tree-root">{renderTree(null)}</div>
          </aside>

          <article className="admin-editor-panel">
            <section className="admin-form">
              <h2>Exercise Metadata</h2>
              <div className="admin-form-grid">
                <label className="field">
                  <span>Year</span>
                  <input
                    type="number"
                    value={exerciseMetadataDraft.year}
                    onChange={(event) => {
                      setExerciseMetadataDraft((current) =>
                        current
                          ? {
                              ...current,
                              year:
                                Number.parseInt(event.target.value, 10) ||
                                current.year,
                            }
                          : current,
                      );
                    }}
                  />
                </label>

                <label className="field">
                  <span>Session</span>
                  <select
                    value={exerciseMetadataDraft.session}
                    onChange={(event) => {
                      setExerciseMetadataDraft((current) =>
                        current
                          ? {
                              ...current,
                              session: event.target.value as 'normal' | 'rattrapage',
                            }
                          : current,
                      );
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="rattrapage">Rattrapage</option>
                  </select>
                </label>

                <label className="field">
                  <span>Subject</span>
                  <input
                    type="text"
                    value={exerciseMetadataDraft.subject}
                    onChange={(event) => {
                      setExerciseMetadataDraft((current) =>
                        current
                          ? {
                              ...current,
                              subject: event.target.value,
                            }
                          : current,
                      );
                    }}
                  />
                </label>

                <label className="field">
                  <span>Branch</span>
                  <input
                    type="text"
                    value={exerciseMetadataDraft.branch}
                    onChange={(event) => {
                      setExerciseMetadataDraft((current) =>
                        current
                          ? {
                              ...current,
                              branch: event.target.value,
                            }
                          : current,
                      );
                    }}
                  />
                </label>

                <label className="field">
                  <span>Points</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={exerciseMetadataDraft.points}
                    onChange={(event) => {
                      setExerciseMetadataDraft((current) =>
                        current
                          ? {
                              ...current,
                              points: Number.parseFloat(event.target.value) || 0,
                            }
                          : current,
                      );
                    }}
                  />
                </label>
              </div>

              <BlockEditor
                title="Context / Stem"
                blocks={exerciseMetadataDraft.context_blocks}
                onChange={(blocks) => {
                  setExerciseMetadataDraft((current) =>
                    current
                      ? {
                          ...current,
                          context_blocks: blocks,
                        }
                      : current,
                  );
                }}
                onUploadImage={uploadImage}
              />

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving}
                  onClick={() => {
                    void saveExerciseMetadata();
                  }}
                >
                  Save Exercise Metadata
                </button>
              </div>
            </section>

            {selectedQuestion && questionDraft ? (
              <section className="admin-form">
                <h2>Question Editor</h2>

                <div className="admin-form-grid">
                  <label className="field admin-form-wide">
                    <span>Title</span>
                    <input
                      type="text"
                      value={questionDraft.title}
                      onChange={(event) => {
                        setQuestionDraft((current) =>
                          current
                            ? {
                                ...current,
                                title: event.target.value,
                              }
                            : current,
                        );
                      }}
                    />
                  </label>

                  <label className="field">
                    <span>Parent</span>
                    <select
                      value={questionDraft.parent_id ?? ''}
                      onChange={(event) => {
                        setQuestionDraft((current) =>
                          current
                            ? {
                                ...current,
                                parent_id: event.target.value || null,
                              }
                            : current,
                        );
                      }}
                    >
                      <option value="">No parent (root question)</option>
                      {selectableParents.map((question) => (
                        <option key={question.id} value={question.id}>
                          #{question.order_index} {question.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Points</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={questionDraft.points}
                      onChange={(event) => {
                        setQuestionDraft((current) =>
                          current
                            ? {
                                ...current,
                                points: Number.parseFloat(event.target.value) || 0,
                              }
                            : current,
                        );
                      }}
                    />
                  </label>
                </div>

                <BlockEditor
                  title="Question Content Blocks"
                  blocks={questionDraft.content_blocks}
                  onChange={(blocks) => {
                    setQuestionDraft((current) =>
                      current
                        ? {
                            ...current,
                            content_blocks: blocks,
                          }
                        : current,
                    );
                  }}
                  onUploadImage={uploadImage}
                />

                <BlockEditor
                  title="Solution Blocks"
                  blocks={questionDraft.solution_blocks}
                  onChange={(blocks) => {
                    setQuestionDraft((current) =>
                      current
                        ? {
                            ...current,
                            solution_blocks: blocks,
                          }
                        : current,
                    );
                  }}
                  onUploadImage={uploadImage}
                />

                <BlockEditor
                  title="Hint Blocks"
                  blocks={questionDraft.hint_blocks ?? []}
                  onChange={(blocks) => {
                    setQuestionDraft((current) =>
                      current
                        ? {
                            ...current,
                            hint_blocks: blocks,
                          }
                        : current,
                    );
                  }}
                  onUploadImage={uploadImage}
                />

                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={saving}
                    onClick={() => {
                      void saveQuestion();
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={saving}
                    onClick={() => {
                      void deleteQuestion(selectedQuestion.id);
                    }}
                  >
                    Delete Question
                  </button>
                </div>
              </section>
            ) : (
              <section className="admin-form">
                <h2>Question Editor</h2>
                <p className="muted-text">Select a question from the tree to edit content.</p>
              </section>
            )}
          </article>
        </section>
      ) : null}
    </section>
  );
}
