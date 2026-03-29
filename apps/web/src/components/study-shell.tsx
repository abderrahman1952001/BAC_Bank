'use client';

import { ReactNode } from 'react';

export type StudyMetaItem = {
  label: string;
  value: string;
};

export type StudyNavigatorExercise = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  progressLabel?: string;
  questions: Array<{
    id: string;
    label: string;
    shortLabel?: string;
    status: 'idle' | 'opened' | 'active' | 'completed' | 'skipped';
    solutionViewed?: boolean;
  }>;
};

export function StudyShell({ children }: { children: ReactNode }) {
  return <main className="app-shell app-shell-study">{children}</main>;
}

export function StudyHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  progress,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: StudyMetaItem[];
  actions?: ReactNode;
  progress?: ReactNode;
}) {
  return (
    <section className="study-header">
      <div className="study-header-main">
        {eyebrow ? <p className="page-kicker">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="study-header-subtitle">{subtitle}</p> : null}
        {meta?.length ? (
          <div className="study-meta-row">
            {meta.map((item) => (
              <span key={`${item.label}:${item.value}`} className="study-meta-pill">
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {actions ? <div className="study-header-actions">{actions}</div> : null}
      {progress ? <div className="study-header-progress">{progress}</div> : null}
    </section>
  );
}

export function StudySidebar({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <aside className="study-sidebar">
      <div className="study-sidebar-head">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="study-sidebar-body">{children}</div>
      {footer ? <div className="study-sidebar-footer">{footer}</div> : null}
    </aside>
  );
}

export function StudyProgressBar({
  label,
  detail,
  value,
}: {
  label: string;
  detail?: string;
  value: number;
}) {
  return (
    <article className="study-progress-card">
      <div className="study-progress-copy">
        <strong>{label}</strong>
        {detail ? <span>{detail}</span> : null}
      </div>
      <div className="study-progress-track" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
      </div>
    </article>
  );
}

function getNavigatorQuestionStateLabel(
  status: 'idle' | 'opened' | 'active' | 'completed' | 'skipped',
  solutionViewed?: boolean,
) {
  const stateLabel =
    status === 'active'
      ? 'السؤال الحالي'
      : status === 'completed'
        ? 'منجز'
        : status === 'skipped'
          ? 'متروك'
          : status === 'opened'
            ? 'تم فتحه'
            : 'غير مفتوح';

  return solutionViewed ? `${stateLabel} · تم كشف الحل` : stateLabel;
}

export function StudyBadge({
  tone = 'neutral',
  size = 'md',
  children,
}: {
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'accent';
  size?: 'md' | 'sm';
  children: ReactNode;
}) {
  return (
    <span className={`study-badge tone-${tone}${size === 'sm' ? ' size-sm' : ''}`}>
      {children}
    </span>
  );
}

export function StudyKeyHint({
  keys,
  label,
}: {
  keys: string[];
  label: string;
}) {
  return (
    <span className="study-key-hint">
      <span className="study-key-group" aria-hidden="true">
        {keys.map((key) => (
          <kbd key={key}>{key}</kbd>
        ))}
      </span>
      <span>{label}</span>
    </span>
  );
}

export function StudyStateLegend({
  includeSkipped = false,
  includeSolution = true,
}: {
  includeSkipped?: boolean;
  includeSolution?: boolean;
}) {
  return (
    <div className="study-state-legend" aria-label="دليل الحالات">
      <StudyBadge tone="brand" size="sm">
        الحالي
      </StudyBadge>
      <StudyBadge tone="success" size="sm">
        منجز
      </StudyBadge>
      {includeSkipped ? (
        <StudyBadge tone="danger" size="sm">
          متروك
        </StudyBadge>
      ) : null}
      <StudyBadge tone="warning" size="sm">
        مفتوح
      </StudyBadge>
      {includeSolution ? (
        <StudyBadge tone="accent" size="sm">
          تم كشف الحل
        </StudyBadge>
      ) : null}
    </div>
  );
}

export function StudyNavigator({
  exercises,
  activeExerciseId,
  activeQuestionId,
  onSelectExercise,
  onSelectQuestion,
}: {
  exercises: StudyNavigatorExercise[];
  activeExerciseId: string | null;
  activeQuestionId: string | null;
  onSelectExercise: (exerciseId: string) => void;
  onSelectQuestion: (exerciseId: string, questionId: string) => void;
}) {
  return (
    <div className="study-navigator">
      {exercises.map((exercise) => {
        const isActiveExercise = exercise.id === activeExerciseId;

        return (
          <section
            key={exercise.id}
            className={
              isActiveExercise
                ? 'study-nav-exercise active'
                : 'study-nav-exercise'
            }
          >
            <button
              type="button"
              className="study-nav-exercise-button"
              onClick={() => onSelectExercise(exercise.id)}
            >
              <div>
                <strong>{exercise.title}</strong>
                {exercise.subtitle ? <span>{exercise.subtitle}</span> : null}
              </div>
              {exercise.badge ? (
                <span className="study-nav-badge">{exercise.badge}</span>
              ) : null}
            </button>

            {exercise.progressLabel ? (
              <p className="study-nav-progress">{exercise.progressLabel}</p>
            ) : null}

            <div className="study-nav-question-grid">
              {exercise.questions.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  className={`study-nav-question state-${question.status}${question.solutionViewed ? ' has-solution-viewed' : ''}${
                    question.id === activeQuestionId ? ' current' : ''
                  }`}
                  onClick={() => onSelectQuestion(exercise.id, question.id)}
                  title={`${question.label} · ${getNavigatorQuestionStateLabel(
                    question.status,
                    question.solutionViewed,
                  )}`}
                  aria-label={`${question.label} · ${getNavigatorQuestionStateLabel(
                    question.status,
                    question.solutionViewed,
                  )}`}
                >
                  {question.shortLabel ?? question.label}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="study-empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="study-empty-action">{action}</div> : null}
    </div>
  );
}

export function BrowseWorkspaceSkeleton() {
  return (
    <div className="browse-workspace browse-workspace-loading">
      <div className="study-skeleton block" />
      <div className="browse-workspace-body">
        <div className="study-skeleton sidebar" />
        <div className="browse-main-column">
          <div className="study-skeleton block" />
          <div className="browse-skeleton-grid">
            <div className="study-skeleton panel tall" />
            <div className="study-skeleton panel tall" />
            <div className="study-skeleton panel tall" />
          </div>
          <div className="study-skeleton panel tall" />
        </div>
      </div>
    </div>
  );
}

export function SessionPreviewSkeleton() {
  return (
    <div className="builder-preview-stack" aria-hidden="true">
      <div className="builder-stat-grid">
        <article className="study-skeleton panel" />
        <article className="study-skeleton panel" />
        <article className="study-skeleton panel" />
      </div>
      <div className="study-skeleton block" />
      <div className="study-skeleton block tall" />
    </div>
  );
}

export function SessionBuilderSkeleton() {
  return (
    <div className="builder-workspace" aria-hidden="true">
      <div className="study-skeleton panel tall" />
      <div className="study-skeleton panel tall" />
    </div>
  );
}

export function StudentHubSkeleton() {
  return (
    <div className="hub-page" aria-hidden="true">
      <div className="study-skeleton block tall" />
      <div className="hub-path-grid">
        <div className="study-skeleton panel" />
        <div className="study-skeleton panel" />
      </div>
      <div className="study-skeleton panel tall" />
    </div>
  );
}

export function StudyScreenSkeleton() {
  return (
    <div className="study-layout">
      <div className="study-skeleton sidebar" />
      <div className="study-stage">
        <div className="study-skeleton block" />
        <div className="study-skeleton block tall" />
        <div className="study-skeleton block tall" />
      </div>
    </div>
  );
}
