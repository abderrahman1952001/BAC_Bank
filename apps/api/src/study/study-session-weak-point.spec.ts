import { buildWeakPointIntro } from './study-session-weak-point';

describe('study session weak-point helpers', () => {
  it('builds the weak-point intro with ordered topics, rollups, fallback rules, and starter exercise', () => {
    const intro = buildWeakPointIntro({
      requestedTopicCodes: ['FUNC', 'ALG'],
      topics: [
        {
          id: 'topic-2',
          code: 'ALG',
          name: 'Algebra',
          studentLabel: null,
          displayOrder: 1,
          parent: null,
          skillMappings: [
            {
              weight: 1,
              isPrimary: true,
              skill: {
                name: 'algebra-skill',
                description: 'Use algebra carefully',
                displayOrder: 2,
              },
            },
          ],
        },
        {
          id: 'topic-1',
          code: 'FUNC',
          name: 'Functions',
          studentLabel: 'Functions',
          displayOrder: 2,
          parent: {
            code: 'ALG',
            name: 'Algebra',
            studentLabel: null,
          },
          skillMappings: [
            {
              weight: 3,
              isPrimary: true,
              skill: {
                name: 'identify-rule',
                description: 'Identify the rule before solving',
                displayOrder: 1,
              },
            },
          ],
        },
      ],
      topicRollups: [
        {
          topicId: 'topic-1',
          missedCount: 4,
          hardCount: 1,
          skippedCount: 0,
          revealedCount: 2,
        },
      ],
      exercises: [
        {
          exerciseNodeId: 'exercise-1',
          title: 'Exercise 1',
          orderIndex: 1,
          hierarchy: {
            exerciseNodeId: 'exercise-1',
            exerciseLabel: 'Exercise 1',
            contextBlocks: [],
            questions: [
              {
                id: 'question-1',
                label: 'Q1',
                orderIndex: 1,
                depth: 0,
                points: 5,
                topics: [],
                promptBlocks: [
                  {
                    id: 'prompt-1',
                    role: 'PROMPT',
                    orderIndex: 1,
                    blockType: 'PARAGRAPH',
                    textValue: 'Solve the equation.',
                    data: null,
                    media: null,
                  },
                ],
                solutionBlocks: [],
                hintBlocks: [],
                rubricBlocks: [],
              },
            ],
          },
          exam: {
            id: 'exam-1',
            year: 2024,
            sessionType: 'NORMAL',
            subject: {
              code: 'MATH',
              name: 'Mathematics',
            },
            stream: {
              code: 'SE',
              name: 'Sciences experimentales',
            },
          },
        },
      ] as never,
      supportStyle: 'LOGIC_HEAVY',
    });

    expect(intro).toEqual(
      expect.objectContaining({
        title: 'بطاقة علاج سريعة للمحاور الأضعف',
        topicCodes: ['FUNC', 'ALG'],
        topics: [
          { code: 'FUNC', name: 'Functions' },
          { code: 'ALG', name: 'Algebra' },
        ],
        prerequisiteTopics: [{ code: 'ALG', name: 'Algebra' }],
        dominantReason: 'MISSED',
      }),
    );
    expect(intro?.starterExercise?.questionLabel).toBe('Q1');
    expect(intro?.starterExercise?.promptPreview).toBe('Solve the equation.');
    expect(intro?.keyRules).toHaveLength(3);
    expect(intro?.keyRules[0]).toContain('Identify the rule');
  });

  it('returns null when there are no topics to shape', () => {
    expect(
      buildWeakPointIntro({
        requestedTopicCodes: ['FUNC'],
        topics: [],
        topicRollups: [],
        exercises: [],
        supportStyle: 'GENERAL',
      }),
    ).toBeNull();
  });
});
