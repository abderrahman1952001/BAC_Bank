import { NotFoundException } from '@nestjs/common';
import {
  BlockRole,
  BlockType,
  ExamNodeType,
  ExamVariantCode,
  PublicationStatus,
  SessionType,
} from '@prisma/client';
import { buildStudySessionResponseExercises } from './study-session-details';

function makeVariantWithContextAndOfferings() {
  return {
    id: 'variant-1',
    code: ExamVariantCode.SUJET_1,
    title: 'Sujet 1',
    status: PublicationStatus.PUBLISHED,
    paper: {
      offerings: [
        {
          id: 'exam-se',
          year: 2024,
          sessionType: SessionType.NORMAL,
          subject: {
            code: 'MATH',
            name: 'Mathematics',
          },
          stream: {
            code: 'SE',
            name: 'Sciences experimentales',
          },
        },
      ],
    },
    nodes: [
      {
        id: 'exercise-1',
        parentId: null,
        nodeType: ExamNodeType.EXERCISE,
        orderIndex: 1,
        label: 'Exercise 1',
        maxPoints: null,
        status: PublicationStatus.PUBLISHED,
        metadata: null,
        topicMappings: [
          {
            topic: {
              code: 'ALG',
              name: 'Algebra',
              studentLabel: null,
              displayOrder: 1,
            },
          },
        ],
        blocks: [
          {
            id: 'exercise-context',
            role: BlockRole.STEM,
            orderIndex: 1,
            blockType: BlockType.PARAGRAPH,
            textValue: 'Read carefully.',
            data: null,
            media: null,
          },
        ],
      },
      {
        id: 'question-1',
        parentId: 'exercise-1',
        nodeType: ExamNodeType.QUESTION,
        orderIndex: 1,
        label: 'Q1',
        maxPoints: 5,
        status: PublicationStatus.PUBLISHED,
        metadata: null,
        topicMappings: [],
        blocks: [
          {
            id: 'prompt-1',
            role: BlockRole.PROMPT,
            orderIndex: 1,
            blockType: BlockType.PARAGRAPH,
            textValue: 'Solve the equation.',
            data: null,
            media: null,
          },
        ],
      },
      {
        id: 'context-1',
        parentId: 'exercise-1',
        nodeType: ExamNodeType.CONTEXT,
        orderIndex: 2,
        label: 'Context',
        maxPoints: null,
        status: PublicationStatus.PUBLISHED,
        metadata: null,
        topicMappings: [],
        blocks: [
          {
            id: 'nested-context',
            role: BlockRole.STEM,
            orderIndex: 1,
            blockType: BlockType.PARAGRAPH,
            textValue: 'Remember the identity.',
            data: null,
            media: null,
          },
        ],
      },
    ],
  };
}

describe('study session details helpers', () => {
  it('builds response exercises from linked hierarchy and fallback exam context', () => {
    const responseExercises = buildStudySessionResponseExercises({
      sessionId: 'session-1',
      entries: [
        {
          orderIndex: 1,
          exam: null,
          exerciseNode: {
            id: 'exercise-1',
          },
        },
      ],
      variants: [makeVariantWithContextAndOfferings()],
    });

    expect(responseExercises).toHaveLength(1);
    expect(responseExercises[0]).toMatchObject({
      sessionOrder: 1,
      id: 'exercise-1',
      title: 'Exercise 1',
      totalPoints: 5,
      questionCount: 1,
      exam: {
        id: 'exam-se',
        stream: {
          code: 'SE',
        },
      },
      hierarchy: {
        contextBlocks: [{ id: 'exercise-context' }, { id: 'nested-context' }],
        questions: [
          {
            id: 'question-1',
            interaction: {
              responseMode: 'NONE',
            },
            topics: [{ code: 'ALG', name: 'Algebra' }],
          },
        ],
      },
    });
  });

  it('throws when the session references a hierarchy exercise that is missing', () => {
    expect(() =>
      buildStudySessionResponseExercises({
        sessionId: 'session-2',
        entries: [
          {
            orderIndex: 1,
            exam: null,
            exerciseNode: {
              id: 'missing-exercise',
            },
          },
        ],
        variants: [makeVariantWithContextAndOfferings()],
      }),
    ).toThrow(
      new NotFoundException(
        'Study session session-2 references missing hierarchy exercise missing-exercise.',
      ),
    );
  });

  it('throws when neither direct nor fallback exam context is available', () => {
    const variantWithoutOfferings = {
      ...makeVariantWithContextAndOfferings(),
      paper: {
        offerings: [],
      },
    };

    expect(() =>
      buildStudySessionResponseExercises({
        sessionId: 'session-3',
        entries: [
          {
            orderIndex: 1,
            exam: null,
            exerciseNode: {
              id: 'exercise-1',
            },
          },
        ],
        variants: [variantWithoutOfferings],
      }),
    ).toThrow(
      new NotFoundException(
        'Study session session-3 references missing exam context for exercise exercise-1.',
      ),
    );
  });
});
