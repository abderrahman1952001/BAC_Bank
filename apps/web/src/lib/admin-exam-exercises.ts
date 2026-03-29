import type {
  AdminExercise,
  AdminExam,
  AdminFiltersResponse,
} from '@/lib/admin';

export type ExerciseFormState = {
  title: string;
  theme: string;
  difficulty: string;
  tags: string;
  topic_codes: string[];
};

export function defaultExerciseForm(): ExerciseFormState {
  return {
    title: '',
    theme: '',
    difficulty: '',
    tags: '',
    topic_codes: [],
  };
}

export function buildExerciseFormState(
  exercise: AdminExercise,
): ExerciseFormState {
  return {
    title: exercise.title ?? '',
    theme: exercise.theme ?? '',
    difficulty: exercise.difficulty ?? '',
    tags: exercise.tags.join(', '),
    topic_codes: exercise.topics.map((topic) => topic.code),
  };
}

export function buildExercisePayload(formState: ExerciseFormState) {
  return {
    title: formState.title.trim() || null,
    theme: formState.theme.trim() || null,
    difficulty: formState.difficulty.trim() || null,
    tags: formState.tags
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
    topic_codes: formState.topic_codes,
    status: 'published' as const,
  };
}

export function reorderExercisesById(
  items: AdminExercise[],
  draggedId: string,
  targetId: string,
) {
  const sourceIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return items;
  }

  const copy = [...items];
  const [moved] = copy.splice(sourceIndex, 1);
  copy.splice(targetIndex, 0, moved);

  return copy.map((item, index) => ({
    ...item,
    order_index: index + 1,
  }));
}

export function filterAvailableExerciseTopics(options: {
  filters: AdminFiltersResponse | null;
  exam: AdminExam | null;
}) {
  const { filters, exam } = options;

  if (!filters || !exam) {
    return [];
  }

  return filters.topics.filter((topic) => topic.subject.code === exam.subject);
}
