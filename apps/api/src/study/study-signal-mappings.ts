import { Prisma } from '@prisma/client';

export type SignalSkillMapping = {
  weight: Prisma.Decimal;
  isPrimary: boolean;
  skill: {
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
  skillMappings: SignalSkillMapping[];
};

export type EffectiveSignalSkillMapping = {
  weight: number;
  isPrimary: boolean;
  skill: {
    id: string;
    code: string;
    name: string;
  };
};

export function selectSignalTopics(input: {
  questionSkills: SignalSkillMapping[];
  exerciseSkills: SignalSkillMapping[];
  questionTopics: SignalTopic[];
  exerciseTopics: SignalTopic[];
  requestedSubjectCode: string | null;
}) {
  const allowUnmappedTopics =
    input.questionSkills.length > 0 || input.exerciseSkills.length > 0;

  const filterBySubject = (topics: SignalTopic[]) =>
    topics.filter(
      (topic) =>
        (!input.requestedSubjectCode ||
          topic.subject.code === input.requestedSubjectCode) &&
        (allowUnmappedTopics || topic.skillMappings.length > 0),
    );

  const directQuestionTopics = filterBySubject(
    uniqueSignalTopics(input.questionTopics),
  );

  if (directQuestionTopics.length) {
    return directQuestionTopics;
  }

  return filterBySubject(uniqueSignalTopics(input.exerciseTopics));
}

export function selectSignalSkillMappings(input: {
  questionSkills: SignalSkillMapping[];
  exerciseSkills: SignalSkillMapping[];
  topics: SignalTopic[];
  requestedSubjectCode: string | null;
}) {
  const filterBySubject = (mappings: SignalSkillMapping[]) =>
    mappings.filter(
      (mapping) =>
        !input.requestedSubjectCode ||
        mapping.skill.subject.code === input.requestedSubjectCode,
    );

  const directQuestionSkills = normalizeSignalSkillMappings(
    filterBySubject(input.questionSkills),
  );

  if (directQuestionSkills.length) {
    return directQuestionSkills;
  }

  const directExerciseSkills = normalizeSignalSkillMappings(
    filterBySubject(input.exerciseSkills),
  );

  if (directExerciseSkills.length) {
    return directExerciseSkills;
  }

  return normalizeSignalSkillMappings(
    input.topics.flatMap((topic) => topic.skillMappings),
  );
}

export function normalizeSignalSkillMappings(mappings: SignalSkillMapping[]) {
  const bySkillId = new Map<string, EffectiveSignalSkillMapping>();

  for (const mapping of mappings) {
    const existing = bySkillId.get(mapping.skill.id);

    if (existing) {
      existing.weight += Number(mapping.weight);
      existing.isPrimary ||= mapping.isPrimary;
      continue;
    }

    bySkillId.set(mapping.skill.id, {
      weight: Number(mapping.weight),
      isPrimary: mapping.isPrimary,
      skill: {
        id: mapping.skill.id,
        code: mapping.skill.code,
        name: mapping.skill.name,
      },
    });
  }

  return Array.from(bySkillId.values());
}

function uniqueSignalTopics(topics: SignalTopic[]) {
  return Array.from(new Map(topics.map((topic) => [topic.id, topic])).values());
}
