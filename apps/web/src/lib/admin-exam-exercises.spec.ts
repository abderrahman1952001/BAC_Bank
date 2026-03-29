import { describe, expect, it } from 'vitest';
import type {
  AdminExercise,
  AdminExam,
  AdminFiltersResponse,
} from '@/lib/admin';
import {
  buildExerciseFormState,
  buildExercisePayload,
  defaultExerciseForm,
  filterAvailableExerciseTopics,
  reorderExercisesById,
} from './admin-exam-exercises';

function createExercise(overrides: Partial<AdminExercise> = {}): AdminExercise {
  return {
    id: 'exercise-1',
    title: 'Exercise 1',
    order_index: 1,
    theme: 'Functions',
    difficulty: 'Medium',
    status: 'published',
    tags: ['analysis', 'bac'],
    question_count: 2,
    topics: [
      {
        code: 'FUNC',
        name: 'Functions',
      },
    ],
    ...overrides,
  };
}

const exam: AdminExam = {
  id: 'exam-1',
  year: 2025,
  stream: 'SE',
  subject: 'MATH',
  session: 'normal',
  status: 'published',
  exercise_count: 2,
  question_count: 3,
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
      code: 'FUNC',
      name: 'Functions',
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
      code: 'PHYS',
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

describe('admin exam exercises helpers', () => {
  it('builds and resets exercise form state', () => {
    expect(defaultExerciseForm()).toEqual({
      title: '',
      theme: '',
      difficulty: '',
      tags: '',
      topic_codes: [],
    });
    expect(buildExerciseFormState(createExercise())).toEqual({
      title: 'Exercise 1',
      theme: 'Functions',
      difficulty: 'Medium',
      tags: 'analysis, bac',
      topic_codes: ['FUNC'],
    });
  });

  it('builds exercise payloads with trimmed nullable fields', () => {
    expect(
      buildExercisePayload({
        title: '  Exercise 1  ',
        theme: ' ',
        difficulty: 'Medium',
        tags: ' analysis, bac ,, ',
        topic_codes: ['FUNC'],
      }),
    ).toEqual({
      title: 'Exercise 1',
      theme: null,
      difficulty: 'Medium',
      tags: ['analysis', 'bac'],
      topic_codes: ['FUNC'],
      status: 'published',
    });
  });

  it('reorders exercises by drag target and reindexes them', () => {
    const reordered = reorderExercisesById(
      [createExercise(), createExercise({ id: 'exercise-2', order_index: 2 })],
      'exercise-2',
      'exercise-1',
    );

    expect(reordered.map((exercise) => exercise.id)).toEqual([
      'exercise-2',
      'exercise-1',
    ]);
    expect(reordered.map((exercise) => exercise.order_index)).toEqual([1, 2]);
  });

  it('filters available topics by the current exam subject', () => {
    expect(
      filterAvailableExerciseTopics({
        filters,
        exam,
      }).map((topic) => topic.code),
    ).toEqual(['FUNC']);
  });
});
