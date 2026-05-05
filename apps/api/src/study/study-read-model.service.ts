import { Injectable } from '@nestjs/common';
import type { StudyReviewReasonType } from '@bac-bank/contracts/study';
import {
  Prisma,
  StudentMasteryBucket,
  StudyQuestionAnswerState,
  StudyQuestionReflection,
  StudyQuestionResultStatus,
  StudyReviewOutcome,
  StudyReviewQueueReasonType,
  StudyReviewQueueStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  collectQuestionReviewReasons,
  getReviewReasonPriority,
} from './study-review-signals';
import {
  selectSignalSkillMappings,
  selectSignalTopics,
} from './study-signal-mappings';

type ReadModelDbClient = PrismaService | Prisma.TransactionClient;

type TopicRollupAggregate = {
  topicId: string;
  attemptedQuestions: number;
  correctCount: number;
  incorrectCount: number;
  revealedCount: number;
  skippedCount: number;
  hardCount: number;
  missedCount: number;
  lastSeenAt: Date | null;
  weaknessScore: number;
};

type SkillRollupAggregate = {
  skillId: string;
  attemptedQuestions: number;
  correctCount: number;
  incorrectCount: number;
  revealedCount: number;
  skippedCount: number;
  hardCount: number;
  missedCount: number;
  lastSeenAt: Date | null;
  weaknessScore: number;
};

type ReviewQueueAggregate = {
  identityKey: string;
  questionNodeId: string | null;
  exerciseNodeId: string;
  reasonType: StudyReviewQueueReasonType;
  priorityScore: number;
  lastPromotedAt: Date;
};

type ExistingReviewQueueRow = {
  id: string;
  identityKey: string;
  questionNodeId: string | null;
  exerciseNodeId: string;
  reasonType: StudyReviewQueueReasonType;
  status: StudyReviewQueueStatus;
  dueAt: Date | null;
  successStreak: number;
  lastReviewedAt: Date | null;
  lastReviewOutcome: StudyReviewOutcome | null;
  priorityScore: Prisma.Decimal;
  lastPromotedAt: Date;
};

@Injectable()
export class StudyReadModelService {
  constructor(private readonly prisma: PrismaService) {}

  async refreshUserReadModels(
    userId: string,
    client?: ReadModelDbClient,
  ): Promise<void> {
    const db = client ?? this.prisma;
    const [questionSignals, flaggedExerciseStates, existingReviewQueueItems] =
      await Promise.all([
        db.studySessionQuestion.findMany({
          where: {
            sessionExercise: {
              session: {
                userId,
              },
            },
          },
          select: {
            questionNodeId: true,
            answerState: true,
            resultStatus: true,
            reflection: true,
            firstOpenedAt: true,
            lastInteractedAt: true,
            completedAt: true,
            skippedAt: true,
            solutionViewedAt: true,
            updatedAt: true,
            questionNode: {
              select: {
                skillMappings: {
                  select: {
                    weight: true,
                    isPrimary: true,
                    skill: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        subject: {
                          select: {
                            code: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
                topicMappings: {
                  select: {
                    topic: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        studentLabel: true,
                        subject: {
                          select: {
                            code: true,
                            name: true,
                          },
                        },
                        skillMappings: {
                          select: {
                            weight: true,
                            isPrimary: true,
                            skill: {
                              select: {
                                id: true,
                                code: true,
                                name: true,
                                subject: {
                                  select: {
                                    code: true,
                                    name: true,
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
            sessionExercise: {
              select: {
                exerciseNodeId: true,
                exerciseNode: {
                  select: {
                    skillMappings: {
                      select: {
                        weight: true,
                        isPrimary: true,
                        skill: {
                          select: {
                            id: true,
                            code: true,
                            name: true,
                            subject: {
                              select: {
                                code: true,
                                name: true,
                              },
                            },
                          },
                        },
                      },
                    },
                    topicMappings: {
                      select: {
                        topic: {
                          select: {
                            id: true,
                            code: true,
                            name: true,
                            studentLabel: true,
                            subject: {
                              select: {
                                code: true,
                                name: true,
                              },
                            },
                            skillMappings: {
                              select: {
                                weight: true,
                                isPrimary: true,
                                skill: {
                                  select: {
                                    id: true,
                                    code: true,
                                    name: true,
                                    subject: {
                                      select: {
                                        code: true,
                                        name: true,
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
            },
          },
        }),
        db.studentExerciseState.findMany({
          where: {
            userId,
            flaggedAt: {
              not: null,
            },
          },
          select: {
            exerciseNodeId: true,
            flaggedAt: true,
            updatedAt: true,
          },
        }),
        db.studentReviewQueueItem.findMany({
          where: {
            userId,
          },
          select: {
            id: true,
            identityKey: true,
            questionNodeId: true,
            exerciseNodeId: true,
            reasonType: true,
            status: true,
            dueAt: true,
            successStreak: true,
            lastReviewedAt: true,
            lastReviewOutcome: true,
            priorityScore: true,
            lastPromotedAt: true,
          },
        }),
      ]);

    const topicRollups = new Map<string, TopicRollupAggregate>();
    const skillRollups = new Map<string, SkillRollupAggregate>();
    const reviewQueueItems = new Map<string, ReviewQueueAggregate>();

    for (const signal of questionSignals) {
      const topics = selectSignalTopics({
        questionSkills: signal.questionNode.skillMappings,
        exerciseSkills: signal.sessionExercise.exerciseNode.skillMappings,
        questionTopics: signal.questionNode.topicMappings.map(
          (mapping) => mapping.topic,
        ),
        exerciseTopics: signal.sessionExercise.exerciseNode.topicMappings.map(
          (mapping) => mapping.topic,
        ),
        requestedSubjectCode: null,
      });
      const skillMappings = selectSignalSkillMappings({
        questionSkills: signal.questionNode.skillMappings,
        exerciseSkills: signal.sessionExercise.exerciseNode.skillMappings,
        topics,
        requestedSubjectCode: null,
      });
      const attempted = this.isQuestionAttempted(signal);
      const weaknessWeight = this.getQuestionWeaknessWeight(signal);
      const lastSeenAt = this.resolveLastSeenAt(signal);
      const topicContribution =
        topics.length > 0 ? weaknessWeight / topics.length : 0;

      for (const topic of topics) {
        const current = topicRollups.get(topic.id) ?? {
          topicId: topic.id,
          attemptedQuestions: 0,
          correctCount: 0,
          incorrectCount: 0,
          revealedCount: 0,
          skippedCount: 0,
          hardCount: 0,
          missedCount: 0,
          lastSeenAt: null,
          weaknessScore: 0,
        };

        if (attempted) {
          current.attemptedQuestions += 1;
        }

        if (signal.resultStatus === StudyQuestionResultStatus.CORRECT) {
          current.correctCount += 1;
        }

        if (
          signal.resultStatus === StudyQuestionResultStatus.INCORRECT ||
          signal.resultStatus === StudyQuestionResultStatus.PARTIAL
        ) {
          current.incorrectCount += 1;
        }

        if (signal.solutionViewedAt) {
          current.revealedCount += 1;
        }

        if (signal.skippedAt) {
          current.skippedCount += 1;
        }

        if (signal.reflection === StudyQuestionReflection.HARD) {
          current.hardCount += 1;
        }

        if (signal.reflection === StudyQuestionReflection.MISSED) {
          current.missedCount += 1;
        }

        current.lastSeenAt = this.maxDate(current.lastSeenAt, lastSeenAt);
        current.weaknessScore += topicContribution;
        topicRollups.set(topic.id, current);
      }

      for (const mapping of skillMappings) {
        const current = skillRollups.get(mapping.skill.id) ?? {
          skillId: mapping.skill.id,
          attemptedQuestions: 0,
          correctCount: 0,
          incorrectCount: 0,
          revealedCount: 0,
          skippedCount: 0,
          hardCount: 0,
          missedCount: 0,
          lastSeenAt: null,
          weaknessScore: 0,
        };

        if (attempted) {
          current.attemptedQuestions += 1;
        }

        if (signal.resultStatus === StudyQuestionResultStatus.CORRECT) {
          current.correctCount += 1;
        }

        if (
          signal.resultStatus === StudyQuestionResultStatus.INCORRECT ||
          signal.resultStatus === StudyQuestionResultStatus.PARTIAL
        ) {
          current.incorrectCount += 1;
        }

        if (signal.solutionViewedAt) {
          current.revealedCount += 1;
        }

        if (signal.skippedAt) {
          current.skippedCount += 1;
        }

        if (signal.reflection === StudyQuestionReflection.HARD) {
          current.hardCount += 1;
        }

        if (signal.reflection === StudyQuestionReflection.MISSED) {
          current.missedCount += 1;
        }

        current.lastSeenAt = this.maxDate(current.lastSeenAt, lastSeenAt);
        current.weaknessScore += weaknessWeight * mapping.weight;
        skillRollups.set(mapping.skill.id, current);
      }

      for (const reason of collectQuestionReviewReasons(signal)) {
        this.upsertReviewQueueItem(reviewQueueItems, {
          exerciseNodeId: signal.sessionExercise.exerciseNodeId,
          questionNodeId: signal.questionNodeId,
          reason,
          lastPromotedAt: lastSeenAt ?? signal.updatedAt,
        });
      }
    }

    for (const flaggedState of flaggedExerciseStates) {
      this.upsertReviewQueueItem(reviewQueueItems, {
        exerciseNodeId: flaggedState.exerciseNodeId,
        questionNodeId: null,
        reason: 'FLAGGED',
        lastPromotedAt: flaggedState.flaggedAt ?? flaggedState.updatedAt,
      });
    }

    await db.studentTopicRollup.deleteMany({
      where: {
        userId,
      },
    });
    await db.studentSkillRollup.deleteMany({
      where: {
        userId,
      },
    });

    if (topicRollups.size > 0) {
      await db.studentTopicRollup.createMany({
        data: Array.from(topicRollups.values()).map((rollup) => ({
          userId,
          topicId: rollup.topicId,
          attemptedQuestions: rollup.attemptedQuestions,
          correctCount: rollup.correctCount,
          incorrectCount: rollup.incorrectCount,
          revealedCount: rollup.revealedCount,
          skippedCount: rollup.skippedCount,
          hardCount: rollup.hardCount,
          missedCount: rollup.missedCount,
          lastSeenAt: rollup.lastSeenAt,
          weaknessScore: this.roundScore(rollup.weaknessScore),
          masteryBucket: this.deriveMasteryBucket(rollup),
        })),
      });
    }

    if (skillRollups.size > 0) {
      await db.studentSkillRollup.createMany({
        data: Array.from(skillRollups.values()).map((rollup) => ({
          userId,
          skillId: rollup.skillId,
          attemptedQuestions: rollup.attemptedQuestions,
          correctCount: rollup.correctCount,
          incorrectCount: rollup.incorrectCount,
          revealedCount: rollup.revealedCount,
          skippedCount: rollup.skippedCount,
          hardCount: rollup.hardCount,
          missedCount: rollup.missedCount,
          lastSeenAt: rollup.lastSeenAt,
          weaknessScore: this.roundScore(rollup.weaknessScore),
          masteryBucket: this.deriveMasteryBucket(rollup),
        })),
      });
    }

    await this.syncReviewQueueItems({
      db,
      userId,
      derivedItems: reviewQueueItems,
      existingItems: existingReviewQueueItems,
    });
  }

  private upsertReviewQueueItem(
    queueItems: Map<string, ReviewQueueAggregate>,
    input: {
      exerciseNodeId: string;
      questionNodeId: string | null;
      reason: StudyReviewReasonType;
      lastPromotedAt: Date;
    },
  ) {
    const identityKey = input.questionNodeId
      ? `question:${input.questionNodeId}:${input.reason}`
      : `exercise:${input.exerciseNodeId}:${input.reason}`;
    const reasonType = input.reason as StudyReviewQueueReasonType;
    const current = queueItems.get(identityKey);

    if (!current) {
      queueItems.set(identityKey, {
        identityKey,
        questionNodeId: input.questionNodeId,
        exerciseNodeId: input.exerciseNodeId,
        reasonType,
        priorityScore: getReviewReasonPriority(input.reason),
        lastPromotedAt: input.lastPromotedAt,
      });
      return;
    }

    current.priorityScore = Math.max(
      current.priorityScore,
      getReviewReasonPriority(input.reason),
    );
    current.lastPromotedAt = this.maxDate(
      current.lastPromotedAt,
      input.lastPromotedAt,
    )!;
    queueItems.set(identityKey, current);
  }

  private isQuestionAttempted(question: {
    answerState: StudyQuestionAnswerState;
    firstOpenedAt: Date | null;
    lastInteractedAt: Date | null;
    completedAt: Date | null;
    skippedAt: Date | null;
    solutionViewedAt: Date | null;
  }) {
    return (
      question.answerState !== StudyQuestionAnswerState.UNSEEN ||
      Boolean(
        question.firstOpenedAt ??
        question.lastInteractedAt ??
        question.completedAt ??
        question.skippedAt ??
        question.solutionViewedAt,
      )
    );
  }

  private getQuestionWeaknessWeight(question: {
    reflection: StudyQuestionReflection | null;
    skippedAt: Date | null;
    solutionViewedAt: Date | null;
  }) {
    let score = 0;

    if (question.reflection === StudyQuestionReflection.MISSED) {
      score += 5;
    }

    if (question.reflection === StudyQuestionReflection.HARD) {
      score += 3;
    }

    if (question.skippedAt) {
      score += 3;
    }

    if (question.solutionViewedAt) {
      score += 2;
    }

    return score;
  }

  private resolveLastSeenAt(question: {
    lastInteractedAt: Date | null;
    completedAt: Date | null;
    skippedAt: Date | null;
    solutionViewedAt: Date | null;
    firstOpenedAt: Date | null;
    updatedAt: Date;
  }) {
    return (
      question.lastInteractedAt ??
      question.completedAt ??
      question.skippedAt ??
      question.solutionViewedAt ??
      question.firstOpenedAt ??
      question.updatedAt
    );
  }

  private deriveMasteryBucket(input: {
    attemptedQuestions: number;
    correctCount: number;
    incorrectCount: number;
    weaknessScore: number;
    hardCount: number;
    missedCount: number;
    skippedCount: number;
    revealedCount: number;
  }): StudentMasteryBucket {
    if (input.attemptedQuestions === 0) {
      return StudentMasteryBucket.NEW;
    }

    if (
      input.missedCount > 0 ||
      input.weaknessScore >= Math.max(6, input.attemptedQuestions * 2)
    ) {
      return StudentMasteryBucket.WEAK;
    }

    if (
      input.hardCount > 0 ||
      input.skippedCount > 0 ||
      input.revealedCount > 0 ||
      input.weaknessScore >= Math.max(3, input.attemptedQuestions)
    ) {
      return StudentMasteryBucket.WATCH;
    }

    if (
      input.correctCount > input.incorrectCount &&
      input.weaknessScore <= Math.max(1, input.attemptedQuestions * 0.25)
    ) {
      return StudentMasteryBucket.SOLID;
    }

    return StudentMasteryBucket.RECOVERING;
  }

  private roundScore(value: number) {
    return Math.round(value * 100) / 100;
  }

  private async syncReviewQueueItems(input: {
    db: ReadModelDbClient;
    userId: string;
    derivedItems: Map<string, ReviewQueueAggregate>;
    existingItems: ExistingReviewQueueRow[];
  }) {
    const existingByIdentityKey = new Map(
      input.existingItems.map((item) => [item.identityKey, item]),
    );
    const now = new Date();

    const itemsToCreate = Array.from(input.derivedItems.values()).filter(
      (item) => !existingByIdentityKey.has(item.identityKey),
    );

    if (itemsToCreate.length > 0) {
      await input.db.studentReviewQueueItem.createMany({
        data: itemsToCreate.map((item) => ({
          userId: input.userId,
          identityKey: item.identityKey,
          questionNodeId: item.questionNodeId,
          exerciseNodeId: item.exerciseNodeId,
          reasonType: item.reasonType,
          status: StudyReviewQueueStatus.OPEN,
          dueAt: item.lastPromotedAt,
          successStreak: 0,
          lastReviewedAt: null,
          lastReviewOutcome: null,
          priorityScore: this.roundScore(item.priorityScore),
          lastPromotedAt: item.lastPromotedAt,
          statusUpdatedAt: item.lastPromotedAt,
        })),
      });
    }

    for (const derivedItem of input.derivedItems.values()) {
      const existingItem = existingByIdentityKey.get(derivedItem.identityKey);

      if (!existingItem) {
        continue;
      }

      const roundedPriorityScore = this.roundScore(derivedItem.priorityScore);
      const hasFreshSignal =
        derivedItem.lastPromotedAt.getTime() >
        existingItem.lastPromotedAt.getTime();
      const needsUpdate =
        existingItem.questionNodeId !== derivedItem.questionNodeId ||
        existingItem.exerciseNodeId !== derivedItem.exerciseNodeId ||
        existingItem.reasonType !== derivedItem.reasonType ||
        Number(existingItem.priorityScore) !== roundedPriorityScore ||
        existingItem.lastPromotedAt.getTime() !==
          derivedItem.lastPromotedAt.getTime() ||
        hasFreshSignal;

      if (!needsUpdate) {
        continue;
      }

      await input.db.studentReviewQueueItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          questionNodeId: derivedItem.questionNodeId,
          exerciseNodeId: derivedItem.exerciseNodeId,
          reasonType: derivedItem.reasonType,
          priorityScore: roundedPriorityScore,
          lastPromotedAt: derivedItem.lastPromotedAt,
          ...(hasFreshSignal
            ? {
                status: StudyReviewQueueStatus.OPEN,
                dueAt: derivedItem.lastPromotedAt,
                successStreak: 0,
                lastReviewedAt: null,
                lastReviewOutcome: null,
                statusUpdatedAt: derivedItem.lastPromotedAt,
              }
            : {}),
        },
      });
    }

    const staleFlaggedItems = input.existingItems.filter(
      (item) =>
        !input.derivedItems.has(item.identityKey) &&
        item.reasonType === StudyReviewQueueReasonType.FLAGGED &&
        item.status !== StudyReviewQueueStatus.REMOVED,
    );

    for (const staleItem of staleFlaggedItems) {
      await input.db.studentReviewQueueItem.update({
        where: {
          id: staleItem.id,
        },
        data: {
          status: StudyReviewQueueStatus.REMOVED,
          dueAt: null,
          statusUpdatedAt: now,
        },
      });
    }
  }

  private maxDate(current: Date | null, next: Date | null) {
    if (!next) {
      return current;
    }

    if (!current || next.getTime() > current.getTime()) {
      return next;
    }

    return current;
  }
}
