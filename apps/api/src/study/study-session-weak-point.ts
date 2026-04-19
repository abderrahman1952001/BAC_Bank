import type {
  StudyReviewReasonType,
  StudySessionResponse,
} from '@bac-bank/contracts/study';
import {
  buildCommonTrapMessage,
  extractPromptPreview,
  getFallbackPedagogyRules,
  toPedagogyRule,
} from './study-pedagogy';

export type WeakPointTopicRecord = {
  id: string;
  code: string;
  name: string;
  studentLabel: string | null;
  displayOrder: number;
  parent: {
    code: string;
    name: string;
    studentLabel: string | null;
  } | null;
  skillMappings: Array<{
    weight: number | string | { toString(): string };
    isPrimary: boolean;
    skill: {
      name: string;
      description: string | null;
      displayOrder: number;
    };
  }>;
};

export type WeakPointRollupRecord = {
  topicId: string;
  missedCount: number;
  hardCount: number;
  skippedCount: number;
  revealedCount: number;
};

export function buildWeakPointIntro(input: {
  requestedTopicCodes: string[];
  topics: WeakPointTopicRecord[];
  topicRollups: WeakPointRollupRecord[];
  exercises: StudySessionResponse['exercises'];
  supportStyle: StudySessionResponse['pedagogy']['supportStyle'];
}): StudySessionResponse['pedagogy']['weakPointIntro'] {
  if (!input.topics.length) {
    return null;
  }

  const topicOrder = new Map(
    input.requestedTopicCodes.map((topicCode, index) => [topicCode, index]),
  );
  const orderedTopics = [...input.topics].sort((left, right) => {
    const leftIndex = topicOrder.get(left.code) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = topicOrder.get(right.code) ?? Number.MAX_SAFE_INTEGER;

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.displayOrder - right.displayOrder;
  });
  const rollupsByTopicId = new Map(
    input.topicRollups.map((rollup) => [rollup.topicId, rollup]),
  );
  const dominantReason = resolveDominantWeakPointReason(
    orderedTopics,
    rollupsByTopicId,
  );
  const keyRules = buildWeakPointKeyRules(orderedTopics, input.supportStyle);
  const prerequisiteTopics = Array.from(
    new Map(
      orderedTopics
        .map((topic) => topic.parent)
        .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic))
        .map((topic) => [
          topic.code,
          {
            code: topic.code,
            name: topic.studentLabel ?? topic.name,
          },
        ]),
    ).values(),
  );
  const starterExercise = input.exercises[0];
  const starterQuestion = starterExercise?.hierarchy.questions[0] ?? null;

  return {
    title:
      orderedTopics.length === 1
        ? `بطاقة علاج سريعة: ${orderedTopics[0].studentLabel ?? orderedTopics[0].name}`
        : 'بطاقة علاج سريعة للمحاور الأضعف',
    topicCodes: orderedTopics.map((topic) => topic.code),
    topics: orderedTopics.map((topic) => ({
      code: topic.code,
      name: topic.studentLabel ?? topic.name,
    })),
    prerequisiteTopics,
    keyRules,
    commonTrap: buildCommonTrapMessage({
      supportStyle: input.supportStyle,
      dominantReason,
    }),
    dominantReason,
    starterExercise: starterExercise
      ? {
          exerciseNodeId: starterExercise.hierarchy.exerciseNodeId,
          exerciseTitle:
            starterExercise.hierarchy.exerciseLabel ?? starterExercise.title,
          questionId: starterQuestion?.id ?? null,
          questionLabel: starterQuestion?.label ?? null,
          promptPreview: starterQuestion
            ? extractPromptPreview(starterQuestion.promptBlocks)
            : null,
          source: {
            year: starterExercise.exam.year,
            sessionType: starterExercise.exam.sessionType,
            subject: starterExercise.exam.subject,
            stream: starterExercise.exam.stream,
          },
        }
      : null,
  };
}

function resolveDominantWeakPointReason(
  orderedTopics: WeakPointTopicRecord[],
  rollupsByTopicId: Map<string, WeakPointRollupRecord>,
): StudyReviewReasonType | null {
  const reasonTotals = [
    {
      reason: 'MISSED',
      count: orderedTopics.reduce(
        (sum, topic) =>
          sum + (rollupsByTopicId.get(topic.id)?.missedCount ?? 0),
        0,
      ),
    },
    {
      reason: 'HARD',
      count: orderedTopics.reduce(
        (sum, topic) => sum + (rollupsByTopicId.get(topic.id)?.hardCount ?? 0),
        0,
      ),
    },
    {
      reason: 'SKIPPED',
      count: orderedTopics.reduce(
        (sum, topic) =>
          sum + (rollupsByTopicId.get(topic.id)?.skippedCount ?? 0),
        0,
      ),
    },
    {
      reason: 'REVEALED',
      count: orderedTopics.reduce(
        (sum, topic) =>
          sum + (rollupsByTopicId.get(topic.id)?.revealedCount ?? 0),
        0,
      ),
    },
  ] satisfies Array<{ reason: StudyReviewReasonType; count: number }>;
  const dominantReason = [...reasonTotals].sort(
    (left, right) => right.count - left.count,
  )[0];

  return dominantReason && dominantReason.count > 0
    ? dominantReason.reason
    : null;
}

function buildWeakPointKeyRules(
  orderedTopics: WeakPointTopicRecord[],
  supportStyle: StudySessionResponse['pedagogy']['supportStyle'],
) {
  const keyRules = Array.from(
    new Set(
      orderedTopics.flatMap((topic) =>
        [...topic.skillMappings]
          .sort((left, right) => {
            if (left.isPrimary !== right.isPrimary) {
              return left.isPrimary ? -1 : 1;
            }

            const weightDelta = Number(right.weight) - Number(left.weight);

            if (weightDelta !== 0) {
              return weightDelta;
            }

            return left.skill.displayOrder - right.skill.displayOrder;
          })
          .map((mapping) =>
            toPedagogyRule({
              skillName: mapping.skill.name,
              description: mapping.skill.description,
            }),
          ),
      ),
    ),
  )
    .filter(Boolean)
    .slice(0, 3);
  const paddedRules = [...keyRules];

  for (const fallbackRule of getFallbackPedagogyRules(supportStyle)) {
    if (paddedRules.length >= 3) {
      break;
    }

    if (!paddedRules.includes(fallbackRule)) {
      paddedRules.push(fallbackRule);
    }
  }

  return paddedRules;
}
