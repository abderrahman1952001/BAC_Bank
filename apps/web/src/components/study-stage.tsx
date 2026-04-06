'use client';

import { ReactNode } from 'react';
import {
  StudyHierarchyBlocks,
  StudySectionCard,
} from '@/components/study-content';
import {
  StudyExerciseModel,
  StudyQuestionModel,
} from '@/lib/study-surface';

const DEFAULT_EMPTY_PROMPT = 'لا يوجد نص مباشر لهذا السؤال حالياً.';

function StudyDisclosureSection({
  title,
  tone,
  defaultOpen = false,
  children,
}: {
  title: string;
  tone: 'solution' | 'hint' | 'commentary';
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className={`study-disclosure tone-${tone}`}
      open={defaultOpen}
    >
      <summary>{title}</summary>
      <div className="study-disclosure-body">{children}</div>
    </details>
  );
}

export function StudyExerciseStageCard({
  exercise,
  kicker,
  heading,
  badgeLabel,
  headerActions,
  actions,
}: {
  exercise: StudyExerciseModel;
  kicker: ReactNode;
  heading: ReactNode;
  badgeLabel?: string;
  headerActions?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <StudySectionCard tone="neutral">
      <div className="study-stage-head">
        <div>
          <p className="study-stage-kicker">{kicker}</p>
          <h2>{heading}</h2>
        </div>
        {badgeLabel || headerActions ? (
          <div className="study-stage-head-side">
            {badgeLabel ? (
              <span className="study-stage-badge">{badgeLabel}</span>
            ) : null}
            {headerActions ? (
              <div className="study-stage-head-actions">{headerActions}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      {exercise.contextBlocks.length ? (
        <div className="study-context-block">
          <StudyHierarchyBlocks blocks={exercise.contextBlocks} />
        </div>
      ) : null}

      {actions ? <div className="study-action-row">{actions}</div> : null}
    </StudySectionCard>
  );
}

export function StudyQuestionPromptContent({
  question,
  emptyText = DEFAULT_EMPTY_PROMPT,
}: {
  question: StudyQuestionModel;
  emptyText?: string;
}) {
  return question.promptBlocks.length ? (
    <StudyHierarchyBlocks blocks={question.promptBlocks} />
  ) : (
    <p className="muted-text">{emptyText}</p>
  );
}

export function StudyQuestionSolutionStack({
  question,
}: {
  question: StudyQuestionModel;
}) {
  if (
    !question.solutionBlocks.length &&
    !question.hintBlocks.length &&
    !question.rubricBlocks.length
  ) {
    return null;
  }

  return (
    <div className="study-answer-stack">
      {question.solutionBlocks.length ? (
        <StudyDisclosureSection title="الحل" tone="solution" defaultOpen>
          <StudyHierarchyBlocks blocks={question.solutionBlocks} />
        </StudyDisclosureSection>
      ) : null}

      {question.hintBlocks.length ? (
        <StudyDisclosureSection
          title="تلميحات"
          tone="hint"
          defaultOpen={!question.solutionBlocks.length}
        >
          <StudyHierarchyBlocks blocks={question.hintBlocks} />
        </StudyDisclosureSection>
      ) : null}

      {question.rubricBlocks.length ? (
        <StudyDisclosureSection title="التنقيط" tone="commentary">
          <StudyHierarchyBlocks blocks={question.rubricBlocks} />
        </StudyDisclosureSection>
      ) : null}
    </div>
  );
}
