import { Prisma } from '@prisma/client';

export type SignalLearningTargetMapping = {
  weight: Prisma.Decimal;
  isPrimary: boolean;
  learningTarget: {
    id: string;
    code: string;
    name: string;
    subject: {
      code: string;
      name: string;
    };
  };
};

export type SignalTopic = {
  id: string;
  code: string;
  name: string;
  studentLabel: string | null;
  subject: {
    code: string;
    name: string;
  };
  learningTargetMappings: SignalLearningTargetMapping[];
};

export type EffectiveSignalLearningTargetMapping = {
  weight: number;
  isPrimary: boolean;
  learningTarget: {
    id: string;
    code: string;
    name: string;
  };
};

export function selectSignalTopics(input: {
  questionLearningTargets: SignalLearningTargetMapping[];
  exerciseLearningTargets: SignalLearningTargetMapping[];
  questionTopics: SignalTopic[];
  exerciseTopics: SignalTopic[];
  requestedSubjectCode: string | null;
}) {
  const allowUnmappedTopics =
    input.questionLearningTargets.length > 0 ||
    input.exerciseLearningTargets.length > 0;

  const filterBySubject = (topics: SignalTopic[]) =>
    topics.filter(
      (topic) =>
        (!input.requestedSubjectCode ||
          topic.subject.code === input.requestedSubjectCode) &&
        (allowUnmappedTopics || topic.learningTargetMappings.length > 0),
    );

  const directQuestionTopics = filterBySubject(
    uniqueSignalTopics(input.questionTopics),
  );

  if (directQuestionTopics.length) {
    return directQuestionTopics;
  }

  return filterBySubject(uniqueSignalTopics(input.exerciseTopics));
}

export function selectSignalLearningTargetMappings(input: {
  questionLearningTargets: SignalLearningTargetMapping[];
  exerciseLearningTargets: SignalLearningTargetMapping[];
  topics: SignalTopic[];
  requestedSubjectCode: string | null;
}) {
  const filterBySubject = (mappings: SignalLearningTargetMapping[]) =>
    mappings.filter(
      (mapping) =>
        !input.requestedSubjectCode ||
        mapping.learningTarget.subject.code === input.requestedSubjectCode,
    );

  const directQuestionTargets = normalizeSignalLearningTargetMappings(
    filterBySubject(input.questionLearningTargets),
  );

  if (directQuestionTargets.length) {
    return directQuestionTargets;
  }

  const directExerciseTargets = normalizeSignalLearningTargetMappings(
    filterBySubject(input.exerciseLearningTargets),
  );

  if (directExerciseTargets.length) {
    return directExerciseTargets;
  }

  return normalizeSignalLearningTargetMappings(
    input.topics.flatMap((topic) => topic.learningTargetMappings),
  );
}

function normalizeSignalLearningTargetMappings(
  mappings: SignalLearningTargetMapping[],
) {
  const byLearningTargetId = new Map<string, EffectiveSignalLearningTargetMapping>();

  for (const mapping of mappings) {
    const existing = byLearningTargetId.get(mapping.learningTarget.id);

    if (existing) {
      existing.weight += Number(mapping.weight);
      existing.isPrimary ||= mapping.isPrimary;
      continue;
    }

    byLearningTargetId.set(mapping.learningTarget.id, {
      weight: Number(mapping.weight),
      isPrimary: mapping.isPrimary,
      learningTarget: {
        id: mapping.learningTarget.id,
        code: mapping.learningTarget.code,
        name: mapping.learningTarget.name,
      },
    });
  }

  return Array.from(byLearningTargetId.values());
}

function uniqueSignalTopics(topics: SignalTopic[]) {
  return Array.from(new Map(topics.map((topic) => [topic.id, topic])).values());
}
