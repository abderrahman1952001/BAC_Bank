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

export function StudyExerciseStageCard({
  exercise,
  kicker,
  heading,
  badgeLabel,
  actions,
}: {
  exercise: StudyExerciseModel;
  kicker: ReactNode;
  heading: ReactNode;
  badgeLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <StudySectionCard tone="neutral">
      <div className="study-stage-head">
        <div>
          <p className="study-stage-kicker">{kicker}</p>
          <h2>{heading}</h2>
        </div>
        {badgeLabel ? <span className="study-stage-badge">{badgeLabel}</span> : null}
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
        <StudySectionCard tone="solution" title="الحل الرسمي">
          <StudyHierarchyBlocks blocks={question.solutionBlocks} />
        </StudySectionCard>
      ) : null}

      {question.hintBlocks.length ? (
        <StudySectionCard tone="hint" title="تلميحات">
          <StudyHierarchyBlocks blocks={question.hintBlocks} />
        </StudySectionCard>
      ) : null}

      {question.rubricBlocks.length ? (
        <StudySectionCard tone="commentary" title="سلم التنقيط">
          <StudyHierarchyBlocks blocks={question.rubricBlocks} />
        </StudySectionCard>
      ) : null}
    </div>
  );
}
