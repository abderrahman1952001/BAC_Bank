import type { StudyCommandProposal } from '@bac-bank/contracts/study-command';
import {
  buildStudyCommandProposal,
  type StudyCommandContext,
} from './study-command-engine';
import type { StudyCommandEvalFixture } from './study-command-eval-fixtures';

export type StudyCommandEvalResult = {
  id: string;
  passed: boolean;
  failures: string[];
  proposal: StudyCommandProposal | null;
};

export function evaluateStudyCommandFixture(
  fixture: StudyCommandEvalFixture,
  context: StudyCommandContext,
): StudyCommandEvalResult {
  const proposal = buildStudyCommandProposal(fixture.command, context);
  const failures: string[] = [];

  if (proposal?.mode !== fixture.expectedMode) {
    failures.push(
      `expected mode ${fixture.expectedMode}, received ${proposal?.mode ?? 'null'}`,
    );
  }

  if (
    fixture.expectsClarification &&
    proposal?.clarification?.question !== 'أي مادة تقصد؟'
  ) {
    failures.push('expected one subject clarification');
  }

  if (
    fixture.expectedActionKind &&
    proposal?.primaryAction.kind !== fixture.expectedActionKind
  ) {
    failures.push(
      `expected action ${fixture.expectedActionKind}, received ${
        proposal?.primaryAction.kind ?? 'null'
      }`,
    );
  }

  if (
    fixture.expectedPrimaryHref &&
    proposal?.primaryHref !== fixture.expectedPrimaryHref
  ) {
    failures.push(
      `expected href ${fixture.expectedPrimaryHref}, received ${
        proposal?.primaryHref ?? 'null'
      }`,
    );
  }

  if (
    fixture.expectedSubjectCode &&
    proposal?.primaryAction.kind === 'CREATE_STUDY_SESSION'
  ) {
    const subjectCode = proposal.primaryAction.request.subjectCode;

    if (subjectCode !== fixture.expectedSubjectCode) {
      failures.push(
        `expected subject ${fixture.expectedSubjectCode}, received ${
          subjectCode ?? 'null'
        }`,
      );
    }
  }

  if (
    fixture.expectedTopicCodes &&
    proposal?.primaryAction.kind === 'CREATE_STUDY_SESSION'
  ) {
    const topicCodes = proposal.primaryAction.request.topicCodes ?? [];

    if (topicCodes.join(',') !== fixture.expectedTopicCodes.join(',')) {
      failures.push(
        `expected topics ${fixture.expectedTopicCodes.join(',')}, received ${topicCodes.join(',')}`,
      );
    }
  }

  return {
    id: fixture.id,
    passed: failures.length === 0,
    failures,
    proposal,
  };
}

export function evaluateStudyCommandFixtures(
  fixtures: StudyCommandEvalFixture[],
  resolveContext: (fixture: StudyCommandEvalFixture) => StudyCommandContext,
) {
  return fixtures.map((fixture) =>
    evaluateStudyCommandFixture(fixture, resolveContext(fixture)),
  );
}
