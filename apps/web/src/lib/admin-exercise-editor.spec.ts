import { describe, expect, it } from 'vitest';
import type { AdminExam, AdminFiltersResponse, QuestionNode } from '@/lib/admin';
import {
  buildHierarchyErrors,
  buildQuestionChildrenByParentId,
  buildSelectableQuestionParents,
  filterAvailableQuestionTopics,
  mapQuestionToDraft,
  reorderQuestions,
} from './admin-exercise-editor';

function createQuestion(overrides: Partial<QuestionNode> & { id: string }): QuestionNode {
  return {
    id: overrides.id,
    title: overrides.title ?? `Question ${overrides.id}`,
    parent_id: overrides.parent_id ?? null,
    order_index: overrides.order_index ?? 1,
    status: overrides.status ?? 'published',
    points: overrides.points === undefined ? 1 : overrides.points,
    topics: overrides.topics ?? [],
    content_blocks: overrides.content_blocks ?? [],
    solution_blocks: overrides.solution_blocks ?? [],
    hint_blocks: overrides.hint_blocks ?? null,
    created_at: overrides.created_at ?? '2026-03-29T09:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-03-29T10:00:00.000Z',
  };
}

const exam: AdminExam = {
  id: 'exam-1',
  year: 2025,
  stream: 'SE',
  subject: 'MATH',
  session: 'normal',
  status: 'published',
  exercise_count: 1,
  question_count: 2,
};

const filters: AdminFiltersResponse = {
  subjects: [
    {
      code: 'MATH',
      name: 'Mathematics',
    },
  ],
  streams: [
    {
      code: 'SE',
      name: 'Sciences experimentales',
    },
  ],
  years: [2025],
  topics: [
    {
      code: 'ALG',
      name: 'Algebra',
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: 'MATH',
        name: 'Mathematics',
      },
      streamCodes: ['SE'],
    },
    {
      code: 'MECH',
      name: 'Mechanics',
      parentCode: null,
      displayOrder: 2,
      isSelectable: true,
      subject: {
        code: 'PHYSICS',
        name: 'Physics',
      },
      streamCodes: ['SE'],
    },
  ],
};

describe('admin exercise editor helpers', () => {
  it('maps questions into editable drafts', () => {
    expect(
      mapQuestionToDraft(
        createQuestion({
          id: 'question-1',
          points: null,
          topics: [
            {
              code: 'ALG',
              name: 'Algebra',
            },
          ],
          content_blocks: [{ id: 'block-1', type: 'paragraph', value: 'Prompt', data: null }],
          solution_blocks: [],
        }),
      ),
    ).toEqual({
      title: 'Question question-1',
      parent_id: null,
      points: 0,
      topic_codes: ['ALG'],
      content_blocks: [{ id: 'block-1', type: 'paragraph', value: 'Prompt', data: null }],
      solution_blocks: [],
      hint_blocks: null,
    });
  });

  it('detects hierarchy issues and reorders questions', () => {
    const invalid = [
      createQuestion({ id: 'question-1', order_index: 1, parent_id: 'missing' }),
      createQuestion({ id: 'question-2', order_index: 1 }),
    ];

    expect(buildHierarchyErrors(invalid)).toEqual(
      expect.arrayContaining([
        'Question Question question-1 references missing parent missing.',
        'Duplicate order_index values were detected.',
      ]),
    );

    const reordered = reorderQuestions(
      [
        createQuestion({ id: 'question-1', order_index: 1 }),
        createQuestion({ id: 'question-2', order_index: 2 }),
      ],
      'question-2',
      'question-1',
    );

    expect(reordered.map((question) => question.id)).toEqual([
      'question-2',
      'question-1',
    ]);
    expect(reordered.map((question) => question.order_index)).toEqual([1, 2]);
  });

  it('builds tree buckets and filters selectable parents', () => {
    const questions = [
      createQuestion({ id: 'question-1', order_index: 1 }),
      createQuestion({ id: 'question-2', order_index: 2, parent_id: 'question-1' }),
      createQuestion({ id: 'question-3', order_index: 3 }),
    ];

    expect(buildQuestionChildrenByParentId(questions).get('ROOT')?.map((item) => item.id)).toEqual([
      'question-1',
      'question-3',
    ]);
    expect(
      buildSelectableQuestionParents({
        questions,
        selectedQuestion: questions[0] ?? null,
      }).map((question) => question.id),
    ).toEqual(['question-3']);
  });

  it('filters available topics by the exam subject', () => {
    expect(
      filterAvailableQuestionTopics({
        filters,
        exam,
      }).map((topic) => topic.code),
    ).toEqual(['ALG']);
  });
});
