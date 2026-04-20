import { BlockType } from '@prisma/client';
import { resolveStudyQuestionInteraction } from './study-question-interaction';

describe('study question interaction helpers', () => {
  it('respects configured interaction metadata when it is valid', () => {
    expect(
      resolveStudyQuestionInteraction({
        subjectCode: 'MATHEMATICS',
        question: {
          metadata: {
            interaction: {
              format: 'short_recall',
              captureMode: 'typeless',
              responseMode: 'short_text',
              checkStrategy: 'model_comparison',
            },
          },
          promptBlocks: [],
          rubricBlocks: [],
        },
      }),
    ).toEqual({
      format: 'SHORT_RECALL',
      captureMode: 'TYPELESS',
      responseMode: 'SHORT_TEXT',
      checkStrategy: 'MODEL_COMPARISON',
    });
  });

  it('derives result-match problem solving for logic-heavy questions', () => {
    expect(
      resolveStudyQuestionInteraction({
        subjectCode: 'MATHEMATICS',
        question: {
          metadata: null,
          promptBlocks: [
            {
              id: 'block-1',
              role: 'PROMPT',
              orderIndex: 1,
              blockType: BlockType.LATEX,
              textValue: 'x^2 + 3x = 10',
              data: null,
              media: null,
            },
          ],
          rubricBlocks: [],
        },
      }),
    ).toEqual({
      format: 'PROBLEM_SOLVING',
      captureMode: 'TYPELESS',
      responseMode: 'NONE',
      checkStrategy: 'RESULT_MATCH',
    });
  });

  it('derives rubric review for essay-heavy subjects', () => {
    expect(
      resolveStudyQuestionInteraction({
        subjectCode: 'PHILOSOPHY',
        question: {
          metadata: null,
          promptBlocks: [],
          rubricBlocks: [],
        },
      }),
    ).toEqual({
      format: 'ESSAY_RESPONSE',
      captureMode: 'TYPELESS',
      responseMode: 'NONE',
      checkStrategy: 'RUBRIC_REVIEW',
    });
  });
});
