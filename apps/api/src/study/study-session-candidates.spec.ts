import {
  BlockRole,
  BlockType,
  ExamNodeType,
  ExamVariantCode,
  PublicationStatus,
  SessionType,
} from '@prisma/client';
import {
  buildStudySessionExerciseCandidates,
  type StudySessionCandidateExamRecord,
  type StudySessionCandidateFilters,
} from './study-session-candidates';

function makeFilters(
  overrides: Partial<StudySessionCandidateFilters> = {},
): StudySessionCandidateFilters {
  return {
    exerciseNodeIds: [],
    topicMatchCodes: [],
    search: undefined,
    ...overrides,
  };
}

function makeExamWithExercise(input: {
  examId: string;
  year?: number;
  sessionType?: SessionType;
  streamCode: string;
  streamName: string;
  variantId?: string;
  variantCode?: ExamVariantCode;
  variantTitle?: string;
  exerciseId: string;
  exerciseOrder?: number;
  questionId: string;
  questionPrompt?: string;
  topicCodes?: string[];
}): StudySessionCandidateExamRecord {
  return {
    id: input.examId,
    year: input.year ?? 2024,
    sessionType: input.sessionType ?? SessionType.NORMAL,
    stream: {
      code: input.streamCode,
      name: input.streamName,
    },
    subject: {
      code: 'MATH',
      name: 'Mathematics',
    },
    paper: {
      variants: [
        {
          id: input.variantId ?? `variant-${input.examId}`,
          code: input.variantCode ?? ExamVariantCode.SUJET_1,
          title: input.variantTitle ?? 'Sujet 1',
          status: PublicationStatus.PUBLISHED,
          nodes: [
            {
              id: input.exerciseId,
              parentId: null,
              nodeType: ExamNodeType.EXERCISE,
              orderIndex: input.exerciseOrder ?? 1,
              label: `Exercise ${input.exerciseId}`,
              maxPoints: null,
              status: PublicationStatus.PUBLISHED,
              metadata: null,
              topicMappings: (input.topicCodes ?? []).map((code, index) => ({
                topic: {
                  code,
                  name: code,
                  studentLabel: null,
                  displayOrder: index + 1,
                },
              })),
              blocks: [],
            },
            {
              id: input.questionId,
              parentId: input.exerciseId,
              nodeType: ExamNodeType.QUESTION,
              orderIndex: 1,
              label: `Question ${input.questionId}`,
              maxPoints: null,
              status: PublicationStatus.PUBLISHED,
              metadata: null,
              topicMappings: [],
              blocks: [
                {
                  id: `prompt-${input.questionId}`,
                  role: BlockRole.PROMPT,
                  orderIndex: 1,
                  blockType: BlockType.PARAGRAPH,
                  textValue: input.questionPrompt ?? 'Solve the equation.',
                  data: null,
                  media: null,
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

describe('study session exercise candidates', () => {
  it('merges shared exam offerings into one exercise candidate', () => {
    const candidates = buildStudySessionExerciseCandidates({
      exams: [
        makeExamWithExercise({
          examId: 'exam-se',
          streamCode: 'SE',
          streamName: 'Sciences experimentales',
          exerciseId: 'exercise-1',
          questionId: 'question-se',
        }),
        makeExamWithExercise({
          examId: 'exam-tm',
          streamCode: 'TM',
          streamName: 'Techniques mathematiques',
          exerciseId: 'exercise-1',
          questionId: 'question-tm',
        }),
      ],
      filters: makeFilters(),
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.exerciseNodeId).toBe('exercise-1');
    expect(candidates[0]?.questionCount).toBe(1);
    expect(candidates[0]?.sourceExam.id).toBe('exam-se');
    expect(candidates[0]?.examOfferings.map((exam) => exam.id)).toEqual([
      'exam-se',
      'exam-tm',
    ]);
  });

  it('filters candidates by exercise ids, topic matches, and search text', () => {
    const candidates = buildStudySessionExerciseCandidates({
      exams: [
        makeExamWithExercise({
          examId: 'exam-se',
          streamCode: 'SE',
          streamName: 'Sciences experimentales',
          exerciseId: 'exercise-alg',
          questionId: 'question-alg',
          questionPrompt: 'Success leaf equation',
          topicCodes: ['ALG'],
        }),
        makeExamWithExercise({
          examId: 'exam-se-2',
          streamCode: 'SE',
          streamName: 'Sciences experimentales',
          exerciseId: 'exercise-func',
          questionId: 'question-func',
          questionPrompt: 'Different prompt',
          topicCodes: ['FUNC'],
        }),
      ],
      filters: makeFilters({
        exerciseNodeIds: ['exercise-alg'],
        topicMatchCodes: ['ALG'],
        search: 'success leaf',
      }),
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        exerciseNodeId: 'exercise-alg',
      }),
    ]);
  });

  it('sorts candidates by year, sujet, session type, and order index', () => {
    const candidates = buildStudySessionExerciseCandidates({
      exams: [
        makeExamWithExercise({
          examId: 'exam-2024-makeup',
          streamCode: 'SE',
          streamName: 'Sciences experimentales',
          sessionType: SessionType.MAKEUP,
          exerciseId: 'exercise-makeup',
          questionId: 'question-makeup',
        }),
        makeExamWithExercise({
          examId: 'exam-2024-sujet-2',
          streamCode: 'SE',
          streamName: 'Sciences experimentales',
          variantCode: ExamVariantCode.SUJET_2,
          variantTitle: 'Sujet 2',
          exerciseId: 'exercise-sujet-2',
          questionId: 'question-sujet-2',
        }),
        makeExamWithExercise({
          examId: 'exam-2024-order-2',
          streamCode: 'SE',
          streamName: 'Sciences experimentales',
          exerciseId: 'exercise-order-2',
          exerciseOrder: 2,
          questionId: 'question-order-2',
        }),
        makeExamWithExercise({
          examId: 'exam-2024-order-1',
          streamCode: 'SE',
          streamName: 'Sciences experimentales',
          exerciseId: 'exercise-order-1',
          exerciseOrder: 1,
          questionId: 'question-order-1',
        }),
        makeExamWithExercise({
          examId: 'exam-2025',
          year: 2025,
          streamCode: 'SE',
          streamName: 'Sciences experimentales',
          exerciseId: 'exercise-2025',
          questionId: 'question-2025',
        }),
      ],
      filters: makeFilters(),
    });

    expect(candidates.map((candidate) => candidate.exerciseNodeId)).toEqual([
      'exercise-2025',
      'exercise-order-1',
      'exercise-order-2',
      'exercise-makeup',
      'exercise-sujet-2',
    ]);
  });
});
