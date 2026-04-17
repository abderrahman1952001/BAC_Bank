import type { StudyReviewReasonType } from '@bac-bank/contracts/study';
import { StudyQuestionReflection } from '@prisma/client';

export const REVIEW_REASON_ORDER: StudyReviewReasonType[] = [
  'MISSED',
  'HARD',
  'FLAGGED',
  'SKIPPED',
  'REVEALED',
];

export function collectQuestionReviewReasons(question: {
  reflection: StudyQuestionReflection | null;
  skippedAt: Date | null;
  solutionViewedAt: Date | null;
}): StudyReviewReasonType[] {
  const reasons = new Set<StudyReviewReasonType>();

  if (question.reflection === StudyQuestionReflection.MISSED) {
    reasons.add('MISSED');
  }

  if (question.reflection === StudyQuestionReflection.HARD) {
    reasons.add('HARD');
  }

  if (question.skippedAt) {
    reasons.add('SKIPPED');
  }

  if (question.solutionViewedAt) {
    reasons.add('REVEALED');
  }

  return orderStudyReviewReasons(reasons);
}

export function getReviewReasonPriority(reason: StudyReviewReasonType) {
  switch (reason) {
    case 'MISSED':
      return 50;
    case 'HARD':
      return 40;
    case 'FLAGGED':
      return 35;
    case 'SKIPPED':
      return 25;
    case 'REVEALED':
      return 15;
  }
}

export function getReviewReasonWeaknessWeight(reason: StudyReviewReasonType) {
  switch (reason) {
    case 'MISSED':
      return 5;
    case 'HARD':
      return 3;
    case 'FLAGGED':
      return 2;
    case 'SKIPPED':
      return 3;
    case 'REVEALED':
      return 2;
  }
}

export function orderStudyReviewReasons(
  reasons: Iterable<StudyReviewReasonType>,
) {
  const reasonSet = new Set(reasons);
  return REVIEW_REASON_ORDER.filter((reason) => reasonSet.has(reason));
}
