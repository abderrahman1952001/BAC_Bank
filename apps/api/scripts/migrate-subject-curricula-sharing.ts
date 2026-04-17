import { Prisma, PrismaClient, StudentMasteryBucket } from '@prisma/client';

process.env.BAC_BANK_IMPORT_CATALOG_SEED = '1';

type TargetCurriculum = {
  id: string;
  subjectId: string;
  familyCode: string;
  validFromYear: number;
  validToYear: number | null;
  streamIds: Set<string>;
  streamCodes: Set<string>;
  topicIdByCode: Map<string, string>;
  skillIdByCode: Map<string, string>;
};

type TopicMove = {
  nodeId: string;
  oldTopicId: string;
  newTopicId: string;
};

type SkillMove = {
  nodeId: string;
  oldSkillId: string;
  newSkillId: string;
  weight: Prisma.Decimal;
  isPrimary: boolean;
  source: 'TOPIC_DERIVED' | 'MANUAL_REVIEW';
  confidence: Prisma.Decimal | null;
  reviewedAt: Date | null;
};

const prisma = new PrismaClient();

async function main() {
  const { runCatalogSeed } =
    require('../prisma/seed') as typeof import('../prisma/seed');

  await runCatalogSeed();

  const targetCurriculaBySubjectId = await loadTargetCurricula();
  const legacyCurriculumIds = await listLegacyCurriculumIds();

  if (legacyCurriculumIds.length === 0) {
    console.log(
      'No legacy curricula found. Shared-stream migration is already clean.',
    );
    return;
  }

  const currentYear = new Date().getUTCFullYear();
  const topicMoves = await buildTopicMoves(targetCurriculaBySubjectId);
  const skillMoves = await buildSkillMoves(targetCurriculaBySubjectId);
  const legacyUserTopicStats = await prisma.userTopicStats.findMany({
    where: {
      topic: {
        curriculum: {
          familyCode: 'legacy',
        },
      },
    },
    select: {
      userId: true,
      topicId: true,
      accuracyPercentage: true,
      totalAttempts: true,
      user: {
        select: {
          streamId: true,
        },
      },
      topic: {
        select: {
          code: true,
          subjectId: true,
        },
      },
    },
  });
  const legacyStudentTopicRollups = await prisma.studentTopicRollup.findMany({
    where: {
      topic: {
        curriculum: {
          familyCode: 'legacy',
        },
      },
    },
    select: {
      userId: true,
      topicId: true,
      attemptedQuestions: true,
      correctCount: true,
      incorrectCount: true,
      revealedCount: true,
      skippedCount: true,
      hardCount: true,
      missedCount: true,
      lastSeenAt: true,
      weaknessScore: true,
      masteryBucket: true,
      user: {
        select: {
          streamId: true,
        },
      },
      topic: {
        select: {
          code: true,
          subjectId: true,
        },
      },
    },
  });
  const legacyStudentSkillRollups = await prisma.studentSkillRollup.findMany({
    where: {
      skill: {
        curriculum: {
          familyCode: 'legacy',
        },
      },
    },
    select: {
      userId: true,
      skillId: true,
      attemptedQuestions: true,
      correctCount: true,
      incorrectCount: true,
      revealedCount: true,
      skippedCount: true,
      hardCount: true,
      missedCount: true,
      lastSeenAt: true,
      weaknessScore: true,
      masteryBucket: true,
      user: {
        select: {
          streamId: true,
        },
      },
      skill: {
        select: {
          code: true,
          subjectId: true,
        },
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    await moveExamNodeTopics(tx, topicMoves);
    await moveExamNodeSkills(tx, skillMoves);

    for (const row of legacyUserTopicStats) {
      const targetTopicId = resolveTopicTargetId({
        targetCurriculaBySubjectId,
        subjectId: row.topic.subjectId,
        topicCode: row.topic.code,
        year: currentYear,
        streamId: row.user.streamId,
      });

      await mergeUserTopicStat(tx, {
        userId: row.userId,
        oldTopicId: row.topicId,
        newTopicId: targetTopicId,
        accuracyPercentage: Number(row.accuracyPercentage),
        totalAttempts: row.totalAttempts,
      });
    }

    for (const row of legacyStudentTopicRollups) {
      const targetTopicId = resolveTopicTargetId({
        targetCurriculaBySubjectId,
        subjectId: row.topic.subjectId,
        topicCode: row.topic.code,
        year: currentYear,
        streamId: row.user.streamId,
      });

      await mergeStudentTopicRollup(tx, {
        userId: row.userId,
        oldTopicId: row.topicId,
        newTopicId: targetTopicId,
        attemptedQuestions: row.attemptedQuestions,
        correctCount: row.correctCount,
        incorrectCount: row.incorrectCount,
        revealedCount: row.revealedCount,
        skippedCount: row.skippedCount,
        hardCount: row.hardCount,
        missedCount: row.missedCount,
        lastSeenAt: row.lastSeenAt,
        weaknessScore: Number(row.weaknessScore),
        masteryBucket: row.masteryBucket,
      });
    }

    for (const row of legacyStudentSkillRollups) {
      const targetSkillId = resolveSkillTargetId({
        targetCurriculaBySubjectId,
        subjectId: row.skill.subjectId,
        skillCode: row.skill.code,
        year: currentYear,
        streamId: row.user.streamId,
      });

      await mergeStudentSkillRollup(tx, {
        userId: row.userId,
        oldSkillId: row.skillId,
        newSkillId: targetSkillId,
        attemptedQuestions: row.attemptedQuestions,
        correctCount: row.correctCount,
        incorrectCount: row.incorrectCount,
        revealedCount: row.revealedCount,
        skippedCount: row.skippedCount,
        hardCount: row.hardCount,
        missedCount: row.missedCount,
        lastSeenAt: row.lastSeenAt,
        weaknessScore: Number(row.weaknessScore),
        masteryBucket: row.masteryBucket,
      });
    }

    const remainingLegacyDependencies = await Promise.all([
      tx.examNodeTopic.count({
        where: {
          topic: {
            curriculumId: {
              in: legacyCurriculumIds,
            },
          },
        },
      }),
      tx.examNodeSkill.count({
        where: {
          skill: {
            curriculumId: {
              in: legacyCurriculumIds,
            },
          },
        },
      }),
      tx.userTopicStats.count({
        where: {
          topic: {
            curriculumId: {
              in: legacyCurriculumIds,
            },
          },
        },
      }),
      tx.studentTopicRollup.count({
        where: {
          topic: {
            curriculumId: {
              in: legacyCurriculumIds,
            },
          },
        },
      }),
      tx.studentSkillRollup.count({
        where: {
          skill: {
            curriculumId: {
              in: legacyCurriculumIds,
            },
          },
        },
      }),
    ]);

    if (remainingLegacyDependencies.some((count) => count > 0)) {
      throw new Error(
        `Legacy curriculum references remain after migration: ${remainingLegacyDependencies.join(', ')}.`,
      );
    }

    await tx.subjectCurriculum.deleteMany({
      where: {
        id: {
          in: legacyCurriculumIds,
        },
      },
    });
  });

  console.log(
    `Shared-stream curricula migration complete. Moved ${topicMoves.length} topic links and ${skillMoves.length} skill links, then removed ${legacyCurriculumIds.length} legacy curricula.`,
  );
}

async function loadTargetCurricula() {
  const curricula = await prisma.subjectCurriculum.findMany({
    where: {
      NOT: {
        familyCode: 'legacy',
      },
    },
    select: {
      id: true,
      subjectId: true,
      familyCode: true,
      validFromYear: true,
      validToYear: true,
      streamMappings: {
        select: {
          streamId: true,
          stream: {
            select: {
              code: true,
            },
          },
        },
      },
      topics: {
        select: {
          id: true,
          code: true,
        },
      },
      skills: {
        select: {
          id: true,
          code: true,
        },
      },
    },
  });
  const result = new Map<string, TargetCurriculum[]>();

  for (const curriculum of curricula) {
    const current = result.get(curriculum.subjectId) ?? [];

    current.push({
      id: curriculum.id,
      subjectId: curriculum.subjectId,
      familyCode: curriculum.familyCode,
      validFromYear: curriculum.validFromYear,
      validToYear: curriculum.validToYear,
      streamIds: new Set(
        curriculum.streamMappings.map((mapping) => mapping.streamId),
      ),
      streamCodes: new Set(
        curriculum.streamMappings.map((mapping) => mapping.stream.code),
      ),
      topicIdByCode: new Map(
        curriculum.topics.map((topic) => [topic.code, topic.id]),
      ),
      skillIdByCode: new Map(
        curriculum.skills.map((skill) => [skill.code, skill.id]),
      ),
    });
    result.set(curriculum.subjectId, current);
  }

  return result;
}

async function listLegacyCurriculumIds() {
  const legacyCurricula = await prisma.subjectCurriculum.findMany({
    where: {
      familyCode: 'legacy',
    },
    select: {
      id: true,
    },
  });

  return legacyCurricula.map((curriculum) => curriculum.id);
}

async function buildTopicMoves(
  targetCurriculaBySubjectId: Map<string, TargetCurriculum[]>,
) {
  const rows = await prisma.examNodeTopic.findMany({
    where: {
      topic: {
        curriculum: {
          familyCode: 'legacy',
        },
      },
    },
    select: {
      nodeId: true,
      topicId: true,
      topic: {
        select: {
          code: true,
          subjectId: true,
        },
      },
      node: {
        select: {
          variant: {
            select: {
              paper: {
                select: {
                  year: true,
                  familyCode: true,
                  paperSource: {
                    select: {
                      streamMappings: {
                        select: {
                          stream: {
                            select: {
                              code: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    nodeId: row.nodeId,
    oldTopicId: row.topicId,
    newTopicId: resolveTopicTargetId({
      targetCurriculaBySubjectId,
      subjectId: row.topic.subjectId,
      topicCode: row.topic.code,
      year: row.node.variant.paper.year,
      familyCode: row.node.variant.paper.familyCode,
      streamCodes: row.node.variant.paper.paperSource.streamMappings.map(
        (mapping) => mapping.stream.code,
      ),
    }),
  }));
}

async function buildSkillMoves(
  targetCurriculaBySubjectId: Map<string, TargetCurriculum[]>,
) {
  const rows = await prisma.examNodeSkill.findMany({
    where: {
      skill: {
        curriculum: {
          familyCode: 'legacy',
        },
      },
    },
    select: {
      nodeId: true,
      skillId: true,
      weight: true,
      isPrimary: true,
      source: true,
      confidence: true,
      reviewedAt: true,
      skill: {
        select: {
          code: true,
          subjectId: true,
        },
      },
      node: {
        select: {
          variant: {
            select: {
              paper: {
                select: {
                  year: true,
                  familyCode: true,
                  paperSource: {
                    select: {
                      streamMappings: {
                        select: {
                          stream: {
                            select: {
                              code: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    nodeId: row.nodeId,
    oldSkillId: row.skillId,
    newSkillId: resolveSkillTargetId({
      targetCurriculaBySubjectId,
      subjectId: row.skill.subjectId,
      skillCode: row.skill.code,
      year: row.node.variant.paper.year,
      familyCode: row.node.variant.paper.familyCode,
      streamCodes: row.node.variant.paper.paperSource.streamMappings.map(
        (mapping) => mapping.stream.code,
      ),
    }),
    weight: row.weight,
    isPrimary: row.isPrimary,
    source: row.source,
    confidence: row.confidence,
    reviewedAt: row.reviewedAt,
  }));
}

function resolveTopicTargetId(input: {
  targetCurriculaBySubjectId: Map<string, TargetCurriculum[]>;
  subjectId: string;
  topicCode: string;
  year: number;
  familyCode?: string | null;
  streamCodes?: string[];
  streamId?: string | null;
}) {
  const curriculum = chooseTargetCurriculum({
    targetCurriculaBySubjectId: input.targetCurriculaBySubjectId,
    subjectId: input.subjectId,
    year: input.year,
    familyCode: input.familyCode ?? null,
    streamCodes: input.streamCodes ?? [],
    streamId: input.streamId ?? null,
  });
  const topicId = curriculum.topicIdByCode.get(input.topicCode);

  if (!topicId) {
    throw new Error(
      `Could not resolve topic ${input.topicCode} inside target curriculum ${curriculum.id}.`,
    );
  }

  return topicId;
}

function resolveSkillTargetId(input: {
  targetCurriculaBySubjectId: Map<string, TargetCurriculum[]>;
  subjectId: string;
  skillCode: string;
  year: number;
  familyCode?: string | null;
  streamCodes?: string[];
  streamId?: string | null;
}) {
  const curriculum = chooseTargetCurriculum({
    targetCurriculaBySubjectId: input.targetCurriculaBySubjectId,
    subjectId: input.subjectId,
    year: input.year,
    familyCode: input.familyCode ?? null,
    streamCodes: input.streamCodes ?? [],
    streamId: input.streamId ?? null,
  });
  const skillId = curriculum.skillIdByCode.get(input.skillCode);

  if (!skillId) {
    throw new Error(
      `Could not resolve skill ${input.skillCode} inside target curriculum ${curriculum.id}.`,
    );
  }

  return skillId;
}

function chooseTargetCurriculum(input: {
  targetCurriculaBySubjectId: Map<string, TargetCurriculum[]>;
  subjectId: string;
  year: number;
  familyCode: string | null;
  streamCodes: string[];
  streamId: string | null;
}) {
  const curricula = input.targetCurriculaBySubjectId.get(input.subjectId) ?? [];

  if (curricula.length === 0) {
    throw new Error(
      `No target curricula found for subject ${input.subjectId}.`,
    );
  }

  const yearMatchedCurricula = curricula.filter((curriculum) =>
    matchesYearWindow(curriculum, input.year),
  );
  const relevantCurricula =
    yearMatchedCurricula.length > 0 ? yearMatchedCurricula : curricula;
  const normalizedStreamCodes = Array.from(
    new Set(input.streamCodes.map((code) => code.trim().toUpperCase())),
  ).filter(Boolean);
  const rankedCurricula = relevantCurricula
    .map((curriculum) => {
      const overlapCount = normalizedStreamCodes.filter((streamCode) =>
        curriculum.streamCodes.has(streamCode),
      ).length;

      return {
        curriculum,
        streamRank:
          input.streamId && curriculum.streamIds.has(input.streamId) ? 0 : 1,
        familyRank:
          input.familyCode && curriculum.familyCode === input.familyCode
            ? 0
            : 1,
        coverageRank:
          normalizedStreamCodes.length > 0 &&
          normalizedStreamCodes.every((streamCode) =>
            curriculum.streamCodes.has(streamCode),
          )
            ? 0
            : 1,
        overlapCount,
        specificity: curriculum.streamCodes.size,
        validToYear: curriculum.validToYear ?? Number.MAX_SAFE_INTEGER,
        validFromYear: curriculum.validFromYear,
      };
    })
    .sort((left, right) => {
      if (left.streamRank !== right.streamRank) {
        return left.streamRank - right.streamRank;
      }

      if (left.familyRank !== right.familyRank) {
        return left.familyRank - right.familyRank;
      }

      if (left.coverageRank !== right.coverageRank) {
        return left.coverageRank - right.coverageRank;
      }

      if (left.overlapCount !== right.overlapCount) {
        return right.overlapCount - left.overlapCount;
      }

      if (left.specificity !== right.specificity) {
        return left.specificity - right.specificity;
      }

      if (left.validToYear !== right.validToYear) {
        return right.validToYear - left.validToYear;
      }

      return right.validFromYear - left.validFromYear;
    });
  const matchedCurriculum = rankedCurricula[0]?.curriculum;

  if (!matchedCurriculum) {
    throw new Error(
      `Could not choose a target curriculum for subject ${input.subjectId}.`,
    );
  }

  return matchedCurriculum;
}

function matchesYearWindow(
  curriculum: {
    validFromYear: number;
    validToYear: number | null;
  },
  year: number,
) {
  return (
    year >= curriculum.validFromYear &&
    (curriculum.validToYear === null || year <= curriculum.validToYear)
  );
}

async function moveExamNodeTopics(
  tx: Prisma.TransactionClient,
  moves: TopicMove[],
) {
  for (const chunk of chunkArray(moves, 500)) {
    await tx.examNodeTopic.createMany({
      data: chunk.map((move) => ({
        nodeId: move.nodeId,
        topicId: move.newTopicId,
      })),
      skipDuplicates: true,
    });

    await tx.examNodeTopic.deleteMany({
      where: {
        OR: chunk.map((move) => ({
          nodeId: move.nodeId,
          topicId: move.oldTopicId,
        })),
      },
    });
  }
}

async function moveExamNodeSkills(
  tx: Prisma.TransactionClient,
  moves: SkillMove[],
) {
  for (const chunk of chunkArray(moves, 500)) {
    await tx.examNodeSkill.createMany({
      data: chunk.map((move) => ({
        nodeId: move.nodeId,
        skillId: move.newSkillId,
        weight: move.weight,
        isPrimary: move.isPrimary,
        source: move.source,
        confidence: move.confidence,
        reviewedAt: move.reviewedAt,
      })),
      skipDuplicates: true,
    });

    await tx.examNodeSkill.deleteMany({
      where: {
        OR: chunk.map((move) => ({
          nodeId: move.nodeId,
          skillId: move.oldSkillId,
        })),
      },
    });
  }
}

async function mergeUserTopicStat(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    oldTopicId: string;
    newTopicId: string;
    accuracyPercentage: number;
    totalAttempts: number;
  },
) {
  const current = await tx.userTopicStats.findUnique({
    where: {
      userId_topicId: {
        userId: input.userId,
        topicId: input.newTopicId,
      },
    },
  });
  const mergedAttempts = (current?.totalAttempts ?? 0) + input.totalAttempts;
  const mergedAccuracy =
    mergedAttempts > 0
      ? (
          ((current?.accuracyPercentage
            ? Number(current.accuracyPercentage)
            : 0) *
            (current?.totalAttempts ?? 0) +
            input.accuracyPercentage * input.totalAttempts) /
          mergedAttempts
        ).toFixed(2)
      : '0.00';

  await tx.userTopicStats.upsert({
    where: {
      userId_topicId: {
        userId: input.userId,
        topicId: input.newTopicId,
      },
    },
    update: {
      accuracyPercentage: new Prisma.Decimal(mergedAccuracy),
      totalAttempts: mergedAttempts,
    },
    create: {
      userId: input.userId,
      topicId: input.newTopicId,
      accuracyPercentage: new Prisma.Decimal(mergedAccuracy),
      totalAttempts: mergedAttempts,
    },
  });

  await tx.userTopicStats.delete({
    where: {
      userId_topicId: {
        userId: input.userId,
        topicId: input.oldTopicId,
      },
    },
  });
}

async function mergeStudentTopicRollup(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    oldTopicId: string;
    newTopicId: string;
    attemptedQuestions: number;
    correctCount: number;
    incorrectCount: number;
    revealedCount: number;
    skippedCount: number;
    hardCount: number;
    missedCount: number;
    lastSeenAt: Date | null;
    weaknessScore: number;
    masteryBucket: StudentMasteryBucket;
  },
) {
  const current = await tx.studentTopicRollup.findUnique({
    where: {
      userId_topicId: {
        userId: input.userId,
        topicId: input.newTopicId,
      },
    },
  });

  await tx.studentTopicRollup.upsert({
    where: {
      userId_topicId: {
        userId: input.userId,
        topicId: input.newTopicId,
      },
    },
    update: {
      attemptedQuestions:
        (current?.attemptedQuestions ?? 0) + input.attemptedQuestions,
      correctCount: (current?.correctCount ?? 0) + input.correctCount,
      incorrectCount: (current?.incorrectCount ?? 0) + input.incorrectCount,
      revealedCount: (current?.revealedCount ?? 0) + input.revealedCount,
      skippedCount: (current?.skippedCount ?? 0) + input.skippedCount,
      hardCount: (current?.hardCount ?? 0) + input.hardCount,
      missedCount: (current?.missedCount ?? 0) + input.missedCount,
      lastSeenAt: latestDate(current?.lastSeenAt ?? null, input.lastSeenAt),
      weaknessScore: new Prisma.Decimal(
        Math.max(
          current?.weaknessScore ? Number(current.weaknessScore) : 0,
          input.weaknessScore,
        ).toFixed(2),
      ),
      masteryBucket: worseMasteryBucket(
        current?.masteryBucket ?? null,
        input.masteryBucket,
      ),
    },
    create: {
      userId: input.userId,
      topicId: input.newTopicId,
      attemptedQuestions: input.attemptedQuestions,
      correctCount: input.correctCount,
      incorrectCount: input.incorrectCount,
      revealedCount: input.revealedCount,
      skippedCount: input.skippedCount,
      hardCount: input.hardCount,
      missedCount: input.missedCount,
      lastSeenAt: input.lastSeenAt,
      weaknessScore: new Prisma.Decimal(input.weaknessScore.toFixed(2)),
      masteryBucket: input.masteryBucket,
    },
  });

  await tx.studentTopicRollup.delete({
    where: {
      userId_topicId: {
        userId: input.userId,
        topicId: input.oldTopicId,
      },
    },
  });
}

async function mergeStudentSkillRollup(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    oldSkillId: string;
    newSkillId: string;
    attemptedQuestions: number;
    correctCount: number;
    incorrectCount: number;
    revealedCount: number;
    skippedCount: number;
    hardCount: number;
    missedCount: number;
    lastSeenAt: Date | null;
    weaknessScore: number;
    masteryBucket: StudentMasteryBucket;
  },
) {
  const current = await tx.studentSkillRollup.findUnique({
    where: {
      userId_skillId: {
        userId: input.userId,
        skillId: input.newSkillId,
      },
    },
  });

  await tx.studentSkillRollup.upsert({
    where: {
      userId_skillId: {
        userId: input.userId,
        skillId: input.newSkillId,
      },
    },
    update: {
      attemptedQuestions:
        (current?.attemptedQuestions ?? 0) + input.attemptedQuestions,
      correctCount: (current?.correctCount ?? 0) + input.correctCount,
      incorrectCount: (current?.incorrectCount ?? 0) + input.incorrectCount,
      revealedCount: (current?.revealedCount ?? 0) + input.revealedCount,
      skippedCount: (current?.skippedCount ?? 0) + input.skippedCount,
      hardCount: (current?.hardCount ?? 0) + input.hardCount,
      missedCount: (current?.missedCount ?? 0) + input.missedCount,
      lastSeenAt: latestDate(current?.lastSeenAt ?? null, input.lastSeenAt),
      weaknessScore: new Prisma.Decimal(
        Math.max(
          current?.weaknessScore ? Number(current.weaknessScore) : 0,
          input.weaknessScore,
        ).toFixed(2),
      ),
      masteryBucket: worseMasteryBucket(
        current?.masteryBucket ?? null,
        input.masteryBucket,
      ),
    },
    create: {
      userId: input.userId,
      skillId: input.newSkillId,
      attemptedQuestions: input.attemptedQuestions,
      correctCount: input.correctCount,
      incorrectCount: input.incorrectCount,
      revealedCount: input.revealedCount,
      skippedCount: input.skippedCount,
      hardCount: input.hardCount,
      missedCount: input.missedCount,
      lastSeenAt: input.lastSeenAt,
      weaknessScore: new Prisma.Decimal(input.weaknessScore.toFixed(2)),
      masteryBucket: input.masteryBucket,
    },
  });

  await tx.studentSkillRollup.delete({
    where: {
      userId_skillId: {
        userId: input.userId,
        skillId: input.oldSkillId,
      },
    },
  });
}

function worseMasteryBucket(
  left: StudentMasteryBucket | null,
  right: StudentMasteryBucket,
) {
  const rank: Record<StudentMasteryBucket, number> = {
    NEW: 0,
    WATCH: 1,
    WEAK: 2,
    RECOVERING: 3,
    SOLID: 4,
  };

  if (!left) {
    return right;
  }

  return rank[left] <= rank[right] ? left : right;
}

function latestDate(left: Date | null, right: Date | null) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left.getTime() >= right.getTime() ? left : right;
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
