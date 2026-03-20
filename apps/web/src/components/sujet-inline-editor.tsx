'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useState } from 'react';
import { BlockEditor } from '@/components/block-editor';
import {
  ContentBlock,
  ExerciseEditorResponse,
  QuestionNode,
  fetchAdminJson,
} from '@/lib/admin';

export type InlineEditTarget =
  | {
      kind: 'exercise';
      exerciseId: string;
      title: string;
    }
  | {
      kind: 'question';
      exerciseId: string;
      questionId: string;
      title: string;
    };

type ExerciseDraft = {
  title: string;
  points: number;
  contextBlocks: ContentBlock[];
};

type QuestionDraft = {
  title: string;
  points: number;
  contentBlocks: ContentBlock[];
  solutionBlocks: ContentBlock[];
  hintBlocks: ContentBlock[] | null;
};

type SujetInlineEditorProps = {
  target: InlineEditTarget | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

function makeExerciseDraft(payload: ExerciseEditorResponse): ExerciseDraft {
  return {
    title: payload.exercise.title ?? '',
    points: payload.exercise.metadata.points ?? 0,
    contextBlocks: payload.exercise.metadata.context_blocks,
  };
}

function makeQuestionDraft(question: QuestionNode): QuestionDraft {
  return {
    title: question.title,
    points: question.points ?? 0,
    contentBlocks: question.content_blocks,
    solutionBlocks: question.solution_blocks,
    hintBlocks: question.hint_blocks,
  };
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

export function SujetInlineEditor({
  target,
  onClose,
  onSaved,
}: SujetInlineEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorPayload, setEditorPayload] = useState<ExerciseEditorResponse | null>(null);
  const [exerciseDraft, setExerciseDraft] = useState<ExerciseDraft | null>(null);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft | null>(null);

  useEffect(() => {
    if (!target) {
      setEditorPayload(null);
      setExerciseDraft(null);
      setQuestionDraft(null);
      setError(null);
      setLoading(false);
      return;
    }

    const currentTarget = target;
    let active = true;

    async function loadEditor() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchAdminJson<ExerciseEditorResponse>(
          `/exercises/${currentTarget.exerciseId}/editor`,
        );

        if (!active) {
          return;
        }

        setEditorPayload(payload);
        setExerciseDraft(makeExerciseDraft(payload));

        if (currentTarget.kind === 'question') {
          const question = payload.questions.find(
            (entry) => entry.id === currentTarget.questionId,
          );

          if (!question) {
            throw new Error('Question not found in editor payload.');
          }

          setQuestionDraft(makeQuestionDraft(question));
        } else {
          setQuestionDraft(null);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        setEditorPayload(null);
        setExerciseDraft(null);
        setQuestionDraft(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load inline editor.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadEditor();

    return () => {
      active = false;
    };
  }, [target]);

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

  async function handleSave() {
    if (!target || !editorPayload) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (target.kind === 'exercise') {
        if (!exerciseDraft) {
          throw new Error('Exercise draft is missing.');
        }

        await fetchAdminJson(`/exercises/${target.exerciseId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: exerciseDraft.title,
            points: exerciseDraft.points,
            status: 'published',
          }),
        });

        await fetchAdminJson(`/exercises/${target.exerciseId}/metadata`, {
          method: 'PATCH',
          body: JSON.stringify({
            year: editorPayload.exercise.metadata.year,
            session: editorPayload.exercise.metadata.session,
            subject: editorPayload.exercise.metadata.subject,
            branch: editorPayload.exercise.metadata.branch,
            points: exerciseDraft.points,
            context_blocks: exerciseDraft.contextBlocks,
          }),
        });
      }

      if (target.kind === 'question') {
        const sourceQuestion = editorPayload.questions.find(
          (entry) => entry.id === target.questionId,
        );

        if (!sourceQuestion || !questionDraft) {
          throw new Error('Question draft is missing.');
        }

        await fetchAdminJson(`/questions/${target.questionId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: questionDraft.title,
            parent_id: sourceQuestion.parent_id,
            points: questionDraft.points,
            content_blocks: questionDraft.contentBlocks,
            solution_blocks: questionDraft.solutionBlocks,
            hint_blocks: questionDraft.hintBlocks,
            status: 'published',
          }),
        });
      }

      await onSaved();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed to save changes.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!target) {
    return null;
  }

  return (
    <div
      className="inline-editor-backdrop"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <aside
        className="inline-editor-sheet"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="inline-editor-head">
          <div>
            <p className="page-kicker">Inline Editor</p>
            <h2>
              {target.kind === 'exercise' ? 'Edit Exercise' : 'Edit Question'}
            </h2>
            <p>{target.title}</p>
          </div>

          <div className="table-actions">
            <Link
              href={`/admin/exercises/${target.exerciseId}`}
              className="btn-secondary"
              target="_blank"
            >
              Open Full CMS
            </Link>
            <button
              type="button"
              className="btn-secondary"
              disabled={saving}
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={loading || saving || !editorPayload}
              onClick={() => {
                void handleSave();
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </header>

        {loading ? <p>Loading editor…</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {target.kind === 'exercise' && exerciseDraft ? (
          <section className="admin-form">
            <div className="admin-form-grid">
              <label className="field admin-form-wide">
                <span>Exercise title</span>
                <input
                  type="text"
                  value={exerciseDraft.title}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setExerciseDraft((current) =>
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
                <span>Points</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={exerciseDraft.points}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setExerciseDraft((current) =>
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
              title="Exercise Context"
              blocks={exerciseDraft.contextBlocks}
              onChange={(blocks) => {
                setExerciseDraft((current) =>
                  current
                    ? {
                        ...current,
                        contextBlocks: blocks,
                      }
                    : current,
                );
              }}
              onUploadImage={uploadImage}
            />
          </section>
        ) : null}

        {target.kind === 'question' && questionDraft ? (
          <section className="admin-form">
            <div className="admin-form-grid">
              <label className="field admin-form-wide">
                <span>Question title</span>
                <input
                  type="text"
                  value={questionDraft.title}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
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
                <span>Points</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={questionDraft.points}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
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
              title="Question Content"
              blocks={questionDraft.contentBlocks}
              onChange={(blocks) => {
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        contentBlocks: blocks,
                      }
                    : current,
                );
              }}
              onUploadImage={uploadImage}
            />

            <BlockEditor
              title="Solution Blocks"
              blocks={questionDraft.solutionBlocks}
              onChange={(blocks) => {
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        solutionBlocks: blocks,
                      }
                    : current,
                );
              }}
              onUploadImage={uploadImage}
            />

            <BlockEditor
              title="Hint Blocks"
              blocks={questionDraft.hintBlocks ?? []}
              onChange={(blocks) => {
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        hintBlocks: blocks,
                      }
                    : current,
                );
              }}
              onUploadImage={uploadImage}
            />
          </section>
        ) : null}
      </aside>
    </div>
  );
}
