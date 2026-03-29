'use client';

import { BlockEditor } from '@/components/block-editor';
import { TopicTagPicker } from '@/components/topic-tag-picker';
import type {
  AdminFiltersResponse,
  ExerciseEditorResponse,
  QuestionNode,
} from '@/lib/admin';
import type {
  ExerciseMetadataDraft,
  QuestionDraft,
} from '@/lib/admin-exercise-editor';

export function AdminExerciseQuestionTreeSection({
  childrenByParentId,
  collapsedNodes,
  draggingId,
  selectedQuestionId,
  onSelectQuestion,
  onSetDraggingId,
  onDropQuestion,
  onToggleCollapse,
}: {
  childrenByParentId: Map<string, QuestionNode[]>;
  collapsedNodes: Set<string>;
  draggingId: string | null;
  selectedQuestionId: string | null;
  onSelectQuestion: (questionId: string) => void;
  onSetDraggingId: (questionId: string | null) => void;
  onDropQuestion: (questionId: string) => void;
  onToggleCollapse: (questionId: string) => void;
}) {
  function renderTree(parentId: string | null, depth = 0): React.ReactNode {
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
            data-dragging={draggingId === question.id ? 'true' : 'false'}
            onClick={() => {
              onSelectQuestion(question.id);
            }}
            onDragStart={() => {
              onSetDraggingId(question.id);
            }}
            onDragEnd={() => {
              onSetDraggingId(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={() => {
              onDropQuestion(question.id);
            }}
          >
            <button
              type="button"
              className="tree-collapse-btn"
              onClick={(event) => {
                event.stopPropagation();
                onToggleCollapse(question.id);
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
    <aside className="admin-tree-panel">
      <h2>Question Tree</h2>
      <div className="tree-root">{renderTree(null)}</div>
    </aside>
  );
}

export function AdminExerciseMetadataSection({
  editor,
  exerciseMetadataDraft,
  availableTopics,
  saving,
  onExerciseMetadataDraftChange,
  onUploadImage,
  onSaveExerciseMetadata,
}: {
  editor: ExerciseEditorResponse;
  exerciseMetadataDraft: ExerciseMetadataDraft;
  availableTopics: AdminFiltersResponse['topics'];
  saving: boolean;
  onExerciseMetadataDraftChange: (nextDraft: ExerciseMetadataDraft) => void;
  onUploadImage: (file: File) => Promise<string>;
  onSaveExerciseMetadata: () => void;
}) {
  return (
    <section className="admin-form">
      <h2>Exercise Metadata</h2>
      <div className="admin-form-grid">
        <label className="field">
          <span>Year</span>
          <input
            type="number"
            value={exerciseMetadataDraft.year}
            onChange={(event) => {
              onExerciseMetadataDraftChange({
                ...exerciseMetadataDraft,
                year: Number.parseInt(event.target.value, 10) || exerciseMetadataDraft.year,
              });
            }}
          />
        </label>

        <label className="field">
          <span>Session</span>
          <select
            value={exerciseMetadataDraft.session}
            onChange={(event) => {
              onExerciseMetadataDraftChange({
                ...exerciseMetadataDraft,
                session: event.target.value as 'normal' | 'rattrapage',
              });
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
              onExerciseMetadataDraftChange({
                ...exerciseMetadataDraft,
                subject: event.target.value,
              });
            }}
          />
        </label>

        <label className="field">
          <span>Branch</span>
          <input
            type="text"
            value={exerciseMetadataDraft.branch}
            onChange={(event) => {
              onExerciseMetadataDraftChange({
                ...exerciseMetadataDraft,
                branch: event.target.value,
              });
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
              onExerciseMetadataDraftChange({
                ...exerciseMetadataDraft,
                points: Number.parseFloat(event.target.value) || 0,
              });
            }}
          />
        </label>
      </div>

      <div className="admin-form-fieldset">
        <h3>Topic Tags</h3>
        <TopicTagPicker
          topics={availableTopics}
          subjectCode={editor.exercise.exam.subject}
          streamCodes={[editor.exercise.exam.stream]}
          selectedCodes={exerciseMetadataDraft.topic_codes}
          onChange={(topic_codes) => {
            onExerciseMetadataDraftChange({
              ...exerciseMetadataDraft,
              topic_codes,
            });
          }}
        />
      </div>

      <BlockEditor
        title="Context / Stem"
        blocks={exerciseMetadataDraft.context_blocks}
        onChange={(context_blocks) => {
          onExerciseMetadataDraftChange({
            ...exerciseMetadataDraft,
            context_blocks,
          });
        }}
        onUploadImage={onUploadImage}
      />

      <div className="admin-form-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={onSaveExerciseMetadata}
        >
          Save Exercise Metadata
        </button>
      </div>
    </section>
  );
}

export function AdminExerciseQuestionSection({
  editor,
  selectedQuestion,
  questionDraft,
  selectableParents,
  availableTopics,
  saving,
  onQuestionDraftChange,
  onUploadImage,
  onSaveQuestion,
  onDeleteQuestion,
}: {
  editor: ExerciseEditorResponse;
  selectedQuestion: QuestionNode | null;
  questionDraft: QuestionDraft | null;
  selectableParents: QuestionNode[];
  availableTopics: AdminFiltersResponse['topics'];
  saving: boolean;
  onQuestionDraftChange: (nextDraft: QuestionDraft | null) => void;
  onUploadImage: (file: File) => Promise<string>;
  onSaveQuestion: () => void;
  onDeleteQuestion: () => void;
}) {
  if (!selectedQuestion || !questionDraft) {
    return (
      <section className="admin-form">
        <h2>Question Editor</h2>
        <p className="muted-text">Select a question from the tree to edit content.</p>
      </section>
    );
  }

  return (
    <section className="admin-form">
      <h2>Question Editor</h2>

      <div className="admin-form-grid">
        <label className="field admin-form-wide">
          <span>Title</span>
          <input
            type="text"
            value={questionDraft.title}
            onChange={(event) => {
              onQuestionDraftChange({
                ...questionDraft,
                title: event.target.value,
              });
            }}
          />
        </label>

        <label className="field">
          <span>Parent</span>
          <select
            value={questionDraft.parent_id ?? ''}
            onChange={(event) => {
              onQuestionDraftChange({
                ...questionDraft,
                parent_id: event.target.value || null,
              });
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
              onQuestionDraftChange({
                ...questionDraft,
                points: Number.parseFloat(event.target.value) || 0,
              });
            }}
          />
        </label>
      </div>

      <div className="admin-form-fieldset">
        <h3>Topic Tags</h3>
        <TopicTagPicker
          topics={availableTopics}
          subjectCode={editor.exercise.exam.subject}
          streamCodes={[editor.exercise.exam.stream]}
          selectedCodes={questionDraft.topic_codes}
          onChange={(topic_codes) => {
            onQuestionDraftChange({
              ...questionDraft,
              topic_codes,
            });
          }}
        />
      </div>

      <BlockEditor
        title="Question Content Blocks"
        blocks={questionDraft.content_blocks}
        onChange={(content_blocks) => {
          onQuestionDraftChange({
            ...questionDraft,
            content_blocks,
          });
        }}
        onUploadImage={onUploadImage}
      />

      <BlockEditor
        title="Solution Blocks"
        blocks={questionDraft.solution_blocks}
        onChange={(solution_blocks) => {
          onQuestionDraftChange({
            ...questionDraft,
            solution_blocks,
          });
        }}
        onUploadImage={onUploadImage}
      />

      <BlockEditor
        title="Hint Blocks"
        blocks={questionDraft.hint_blocks ?? []}
        onChange={(hint_blocks) => {
          onQuestionDraftChange({
            ...questionDraft,
            hint_blocks,
          });
        }}
        onUploadImage={onUploadImage}
      />

      <div className="admin-form-actions">
        <button type="button" className="btn-primary" disabled={saving} onClick={onSaveQuestion}>
          Save
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={saving}
          onClick={onDeleteQuestion}
        >
          Delete Question
        </button>
      </div>
    </section>
  );
}
