import { BadRequestException } from '@nestjs/common';
import { SessionType, StudySessionKind } from '@prisma/client';
import {
  applyWeakPointTopicCodes,
  assertValidStudySessionStreamCodes,
  buildResolvedStudySessionFilters,
  expandTopicCodesToDescendants,
  inferStudySessionKindFromTopicCodes,
  normalizeRequestedStudySessionFilters,
  resolveStudySessionTopicMatchCodes,
} from './study-session-filters';

describe('study session filter helpers', () => {
  it('normalizes requested filters and derives exact drill counts from exercise ids', () => {
    const normalized = normalizeRequestedStudySessionFilters(
      {
        subjectCode: ' math ',
        years: [2024, 2024, 2020.5, 2023],
        streamCode: ' se ',
        streamCodes: ['tm', 'SE'],
        topicCodes: ['alg', ' func '],
        sessionTypes: [SessionType.NORMAL, SessionType.NORMAL],
        search: '  sequences  ',
        exerciseCount: 8,
        exerciseNodeIds: ['exercise-2', 'exercise-2', 'exercise-7'],
      },
      {
        min: 2008,
        max: 2025,
      },
    );

    expect(normalized).toEqual({
      years: [2024, 2023],
      subjectCode: 'MATH',
      streamCodes: ['TM', 'SE'],
      topicCodes: ['ALG', 'FUNC'],
      topicMatchCodes: ['ALG', 'FUNC'],
      sessionTypes: [SessionType.NORMAL],
      search: 'sequences',
      exerciseCount: 2,
      exerciseNodeIds: ['exercise-2', 'exercise-7'],
    });
  });

  it('applies weak-point topic codes and preserves the rest of the normalized request', () => {
    expect(
      applyWeakPointTopicCodes(
        {
          years: [2024],
          subjectCode: 'MATH',
          streamCodes: ['SE'],
          topicCodes: ['ALG'],
          topicMatchCodes: ['ALG'],
          sessionTypes: [],
          search: undefined,
          exerciseCount: 6,
          exerciseNodeIds: [],
        },
        ['FUNC', 'EXP'],
      ),
    ).toEqual({
      years: [2024],
      subjectCode: 'MATH',
      streamCodes: ['SE'],
      topicCodes: ['FUNC', 'EXP'],
      topicMatchCodes: ['FUNC', 'EXP'],
      sessionTypes: [],
      search: undefined,
      exerciseCount: 6,
      exerciseNodeIds: [],
    });
  });

  it('validates stream selections and expands topic matches through descendants', () => {
    expect(() => assertValidStudySessionStreamCodes(['TM'], ['SE'])).toThrow(
      new BadRequestException(
        'The selected stream is not available for this subject.',
      ),
    );

    expect(
      resolveStudySessionTopicMatchCodes({
        topicCodes: ['ALG'],
        subjectTopicCodes: ['ALG', 'ALG_CHILD', 'FUNC'],
        topicTree: [
          { code: 'ALG', parentCode: null },
          { code: 'ALG_CHILD', parentCode: 'ALG' },
          { code: 'FUNC', parentCode: null },
        ],
      }),
    ).toEqual(['ALG', 'ALG_CHILD']);

    expect(expandTopicCodesToDescendants([], [])).toEqual([]);
  });

  it('builds final resolved filters and infers drill kind from topic presence', () => {
    expect(
      buildResolvedStudySessionFilters({
        normalizedRequest: {
          years: [2024],
          subjectCode: 'MATH',
          streamCodes: ['SE'],
          topicCodes: ['ALG'],
          topicMatchCodes: ['ALG'],
          sessionTypes: [SessionType.NORMAL],
          search: 'limits',
          exerciseCount: 6,
          exerciseNodeIds: ['exercise-1'],
        },
        subjectScope: {
          subjectId: 'subject-1',
          subjectCode: 'MATH',
          allowedStreamCodes: ['SE'],
          curriculumIds: ['curriculum-1'],
        },
        topicCodes: ['ALG'],
        topicMatchCodes: ['ALG', 'ALG_CHILD'],
      }),
    ).toEqual({
      years: [2024],
      streamCodes: ['SE'],
      subjectCode: 'MATH',
      topicCodes: ['ALG'],
      topicMatchCodes: ['ALG', 'ALG_CHILD'],
      sessionTypes: [SessionType.NORMAL],
      search: 'limits',
      exerciseCount: 6,
      exerciseNodeIds: ['exercise-1'],
    });

    expect(inferStudySessionKindFromTopicCodes(['ALG'])).toBe(
      StudySessionKind.TOPIC_DRILL,
    );
    expect(inferStudySessionKindFromTopicCodes([])).toBe(
      StudySessionKind.MIXED_DRILL,
    );
  });
});
