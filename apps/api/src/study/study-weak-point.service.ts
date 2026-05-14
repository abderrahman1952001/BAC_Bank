import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  StudyReviewReasonType,
  WeakPointInsightsResponse,
} from '@bac-bank/contracts/study';
import {
  Prisma,
  StudyReviewQueueStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getReviewReasonWeaknessWeight } from './study-review-signals';
import {
  selectSignalLearningTargetMappings,
  selectSignalTopics,
  type EffectiveSignalLearningTargetMapping,
  type SignalTopic,
} from './study-signal-mappings';

type SubjectAggregate = {
  subject: {
    code: string;
    name: string;
  };
  totalWeaknessScore: number;
  weakSignalCount: number;
  flaggedExerciseCount: number;
  lastSeenAt: Date | null;
  topics: Map<string, TopicAggregate>;
  learningTargets: Map<string, LearningTargetAggregate>;
};

type TopicAggregate = {
  code: string;
  name: string;
  weaknessScore: number;
  weakSignalCount: number;
  lastSeenAt: Date | null;
  signalCounts: {
    missed: number;
    hard: number;
    skipped: number;
    revealed: number;
    flagged: number;
  };
  learningTargetMappings: EffectiveSignalLearningTargetMapping[];
};

type LearningTargetAggregate = {
  code: string;
  name: string;
  weaknessScore: number;
  lastSeenAt: Date | null;
};

@Injectable()
export class StudyWeakPointService {
  constructor(private readonly prisma: PrismaService) {}

  async listWeakPointInsights(
    userId: string,
    input?: {
      subjectCode?: string;
      limit?: number;
    },
  ): Promise<WeakPointInsightsResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        subscriptionStatus: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Student account not found.');
    }

    if (user.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
      return {
        enabled: false,
        data: [],
      };
    }

    return {
      enabled: true,
      data: await this.buildWeakPointInsights(userId, input),
    };
  }

  async resolveWeakPointTarget(
    userId: string,
    input: {
      subjectCode: string;
      limitTopics?: number;
    },
  ) {
    const payload = await this.listWeakPointInsights(userId, {
      subjectCode: input.subjectCode,
      limit: 1,
    });

    if (!payload.enabled) {
      return null;
    }

    const subjectInsight = payload.data[0];

    if (!subjectInsight) {
      return null;
    }

    return {
      subjectCode: subjectInsight.subject.code,
      topicCodes: subjectInsight.recommendedTopicCodes.slice(
        0,
        input.limitTopics ?? 3,
      ),
      learningTargetCodes: subjectInsight.topLearningTargets
        .slice(0, 4)
        .map((learningTarget) => learningTarget.code),
    };
  }

  private async buildWeakPointInsights(
    userId: string,
    input?: {
      subjectCode?: string;
      limit?: number;
    },
  ): Promise<WeakPointInsightsResponse['data']> {
    const cappedLimit = Math.min(Math.max(input?.limit ?? 4, 1), 12);
    const requestedSubjectCode =
      input?.subjectCode?.trim().toUpperCase() ?? null;

    const [topicRollups, learningTargetRollups, reviewQueueItems] =
      await Promise.all([
        this.prisma.studentCurriculumNodeRollup.findMany({
          where: {
            userId,
            ...(requestedSubjectCode
              ? {
                  curriculumNode: {
                    subject: {
                      code: requestedSubjectCode,
                    },
                  },
                }
              : {}),
          },
          select: {
            weaknessScore: true,
            revealedCount: true,
            skippedCount: true,
            hardCount: true,
            missedCount: true,
            lastSeenAt: true,
            curriculumNode: {
              select: {
                code: true,
                name: true,
                studentLabel: true,
                subject: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                learningTargetMappings: {
                  select: {
                    weight: true,
                    isPrimary: true,
                    learningTarget: {
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
        }),
        this.prisma.studentLearningTargetRollup.findMany({
          where: {
            userId,
            ...(requestedSubjectCode
              ? {
                  learningTarget: {
                    subject: {
                      code: requestedSubjectCode,
                    },
                  },
                }
              : {}),
          },
          select: {
            weaknessScore: true,
            lastSeenAt: true,
            learningTarget: {
              select: {
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
        }),
        this.prisma.studentReviewQueueItem.findMany({
          where: {
            userId,
            status: StudyReviewQueueStatus.OPEN,
          },
          select: {
            reasonType: true,
            lastPromotedAt: true,
            questionNode: {
              select: {
                learningTargetMappings: {
                  select: {
                    weight: true,
                    isPrimary: true,
                    learningTarget: {
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
                curriculumNodeMappings: {
                  select: {
                    curriculumNode: {
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
                        learningTargetMappings: {
                          select: {
                            weight: true,
                            isPrimary: true,
                            learningTarget: {
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
            exerciseNode: {
              select: {
                learningTargetMappings: {
                  select: {
                    weight: true,
                    isPrimary: true,
                    learningTarget: {
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
                curriculumNodeMappings: {
                  select: {
                    curriculumNode: {
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
                        learningTargetMappings: {
                          select: {
                            weight: true,
                            isPrimary: true,
                            learningTarget: {
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
        }),
      ]);

    const subjects = new Map<string, SubjectAggregate>();

    for (const rollup of topicRollups) {
      const subject = this.getOrCreateSubjectAggregate(
        subjects,
        rollup.curriculumNode.subject,
      );
      const topicAggregate = this.getOrCreateTopicAggregate(subject, {
        code: rollup.curriculumNode.code,
        name: rollup.curriculumNode.name,
        studentLabel: rollup.curriculumNode.studentLabel,
        subject: rollup.curriculumNode.subject,
        learningTargetMappings: rollup.curriculumNode.learningTargetMappings,
      });

      topicAggregate.weaknessScore += Number(rollup.weaknessScore);
      topicAggregate.weakSignalCount +=
        rollup.missedCount +
        rollup.hardCount +
        rollup.skippedCount +
        rollup.revealedCount;
      topicAggregate.lastSeenAt = this.maxDate(
        topicAggregate.lastSeenAt,
        rollup.lastSeenAt,
      );
      topicAggregate.signalCounts.missed += rollup.missedCount;
      topicAggregate.signalCounts.hard += rollup.hardCount;
      topicAggregate.signalCounts.skipped += rollup.skippedCount;
      topicAggregate.signalCounts.revealed += rollup.revealedCount;
      subject.lastSeenAt = this.maxDate(subject.lastSeenAt, rollup.lastSeenAt);
    }

    for (const rollup of learningTargetRollups) {
      const subject = this.getOrCreateSubjectAggregate(
        subjects,
        rollup.learningTarget.subject,
      );
      const learningTarget = this.getOrCreateLearningTargetAggregate(
        subject,
        rollup.learningTarget,
      );

      learningTarget.weaknessScore += Number(rollup.weaknessScore);
      learningTarget.lastSeenAt = this.maxDate(
        learningTarget.lastSeenAt,
        rollup.lastSeenAt,
      );
      subject.totalWeaknessScore += Number(rollup.weaknessScore);
      subject.lastSeenAt = this.maxDate(subject.lastSeenAt, rollup.lastSeenAt);
    }

    for (const queueItem of reviewQueueItems) {
      const reason = queueItem.reasonType as StudyReviewReasonType;
      const topics = selectSignalTopics({
        questionLearningTargets:
          queueItem.questionNode?.learningTargetMappings ?? [],
        exerciseLearningTargets: queueItem.exerciseNode.learningTargetMappings,
        questionTopics:
          queueItem.questionNode?.curriculumNodeMappings.map(
            (mapping) => mapping.curriculumNode,
          ) ?? [],
        exerciseTopics: queueItem.exerciseNode.curriculumNodeMappings.map(
          (mapping) => mapping.curriculumNode,
        ),
        requestedSubjectCode,
      });

      if (!topics.length) {
        continue;
      }

      const learningTargetMappings = selectSignalLearningTargetMappings({
        questionLearningTargets:
          queueItem.questionNode?.learningTargetMappings ?? [],
        exerciseLearningTargets: queueItem.exerciseNode.learningTargetMappings,
        topics,
        requestedSubjectCode,
      });

      this.applyQueueSignal({
        subjects,
        topics,
        learningTargetMappings,
        reason,
        updatedAt: queueItem.lastPromotedAt,
      });
    }

    return Array.from(subjects.values())
      .filter(
        (subject) =>
          subject.topics.size > 0 && subject.learningTargets.size > 0,
      )
      .sort((left, right) => {
        if (right.totalWeaknessScore !== left.totalWeaknessScore) {
          return right.totalWeaknessScore - left.totalWeaknessScore;
        }

        if (right.weakSignalCount !== left.weakSignalCount) {
          return right.weakSignalCount - left.weakSignalCount;
        }

        return (
          this.toTimestamp(right.lastSeenAt) - this.toTimestamp(left.lastSeenAt)
        );
      })
      .slice(0, cappedLimit)
      .map((subject) => {
        const topTopics = Array.from(subject.topics.values())
          .sort((left, right) => {
            if (right.weaknessScore !== left.weaknessScore) {
              return right.weaknessScore - left.weaknessScore;
            }

            if (right.weakSignalCount !== left.weakSignalCount) {
              return right.weakSignalCount - left.weakSignalCount;
            }

            return (
              this.toTimestamp(right.lastSeenAt) -
              this.toTimestamp(left.lastSeenAt)
            );
          })
          .slice(0, 4)
          .map((topic) => {
            const preferredMappings = topic.learningTargetMappings.filter(
              (mapping) =>
                subject.learningTargets.has(mapping.learningTarget.code),
            );
            const topicLearningTargetMappings = preferredMappings.length
              ? preferredMappings
              : topic.learningTargetMappings;

            return {
              code: topic.code,
              name: topic.name,
              weaknessScore: this.roundWeaknessScore(topic.weaknessScore),
              weakSignalCount: topic.weakSignalCount,
              lastSeenAt: topic.lastSeenAt?.toISOString() ?? null,
              signalCounts: topic.signalCounts,
              topLearningTargets: topicLearningTargetMappings
                .map((mapping) => {
                  const subjectLearningTarget = subject.learningTargets.get(
                    mapping.learningTarget.code,
                  );
                  const weaknessScore =
                    (subjectLearningTarget?.weaknessScore ??
                      topic.weaknessScore) * mapping.weight;

                  return {
                    code: mapping.learningTarget.code,
                    name: mapping.learningTarget.name,
                    weaknessScore: this.roundWeaknessScore(weaknessScore),
                  };
                })
                .sort((left, right) => right.weaknessScore - left.weaknessScore)
                .slice(0, 3),
            };
          });

        return {
          subject: subject.subject,
          recommendedTopicCodes: topTopics
            .slice(0, 3)
            .map((topic) => topic.code),
          totalWeaknessScore: this.roundWeaknessScore(
            subject.totalWeaknessScore,
          ),
          weakSignalCount: subject.weakSignalCount,
          flaggedExerciseCount: subject.flaggedExerciseCount,
          lastSeenAt: subject.lastSeenAt?.toISOString() ?? null,
          topLearningTargets: Array.from(subject.learningTargets.values())
            .sort((left, right) => right.weaknessScore - left.weaknessScore)
            .slice(0, 4)
            .map((learningTarget) => ({
              code: learningTarget.code,
              name: learningTarget.name,
              weaknessScore: this.roundWeaknessScore(
                learningTarget.weaknessScore,
              ),
            })),
          topTopics,
        };
      });
  }

  private applyQueueSignal(input: {
    subjects: Map<string, SubjectAggregate>;
    topics: SignalTopic[];
    learningTargetMappings: EffectiveSignalLearningTargetMapping[];
    reason: StudyReviewReasonType;
    updatedAt: Date;
  }) {
    const subjectsTouched = new Set<string>();

    for (const topic of input.topics) {
      const subject = this.getOrCreateSubjectAggregate(
        input.subjects,
        topic.subject,
      );
      const topicAggregate = this.getOrCreateTopicAggregate(subject, {
        code: topic.code,
        name: topic.name,
        studentLabel: topic.name,
        subject: topic.subject,
        learningTargetMappings: topic.learningTargetMappings,
      });

      if (!subjectsTouched.has(subject.subject.code)) {
        subject.weakSignalCount += 1;
        subject.lastSeenAt = this.maxDate(subject.lastSeenAt, input.updatedAt);
        subjectsTouched.add(subject.subject.code);
      }

      if (input.reason !== 'FLAGGED') {
        continue;
      }

      if (!subjectsTouched.has(`${subject.subject.code}:flagged`)) {
        subject.flaggedExerciseCount += 1;
        this.applySubjectLearningTargetMappings(
          subject,
          input.learningTargetMappings,
          getReviewReasonWeaknessWeight('FLAGGED'),
          input.updatedAt,
        );
        subjectsTouched.add(`${subject.subject.code}:flagged`);
      }

      topicAggregate.weakSignalCount += 1;
      topicAggregate.signalCounts.flagged += 1;
      topicAggregate.lastSeenAt = this.maxDate(
        topicAggregate.lastSeenAt,
        input.updatedAt,
      );

      const distributedWeight =
        getReviewReasonWeaknessWeight('FLAGGED') / input.topics.length;
      const topicLearningTargetMappings =
        this.selectTopicLearningTargetMappings(
          topicAggregate,
          input.learningTargetMappings,
        );

      for (const mapping of topicLearningTargetMappings) {
        topicAggregate.weaknessScore += distributedWeight * mapping.weight;
      }
    }
  }

  private applySubjectLearningTargetMappings(
    subject: SubjectAggregate,
    learningTargetMappings: EffectiveSignalLearningTargetMapping[],
    signalWeight: number,
    updatedAt: Date,
  ) {
    for (const mapping of learningTargetMappings) {
      const contribution = signalWeight * mapping.weight;
      const learningTarget = this.getOrCreateLearningTargetAggregate(
        subject,
        mapping.learningTarget,
      );

      subject.totalWeaknessScore += contribution;
      learningTarget.weaknessScore += contribution;
      learningTarget.lastSeenAt = this.maxDate(
        learningTarget.lastSeenAt,
        updatedAt,
      );
    }
  }

  private selectTopicLearningTargetMappings(
    topic: TopicAggregate,
    preferredMappings: EffectiveSignalLearningTargetMapping[],
  ) {
    if (!preferredMappings.length) {
      return topic.learningTargetMappings;
    }

    const preferredByLearningTargetCode = new Map(
      preferredMappings.map((mapping) => [
        mapping.learningTarget.code,
        mapping,
      ]),
    );
    const overlappingMappings = topic.learningTargetMappings
      .map((mapping) =>
        preferredByLearningTargetCode.get(mapping.learningTarget.code),
      )
      .filter((mapping): mapping is EffectiveSignalLearningTargetMapping =>
        Boolean(mapping),
      );

    if (overlappingMappings.length) {
      return overlappingMappings;
    }

    return preferredMappings;
  }

  private getOrCreateSubjectAggregate(
    subjects: Map<string, SubjectAggregate>,
    subject: {
      code: string;
      name: string;
    },
  ) {
    const existing = subjects.get(subject.code);

    if (existing) {
      return existing;
    }

    const created: SubjectAggregate = {
      subject,
      totalWeaknessScore: 0,
      weakSignalCount: 0,
      flaggedExerciseCount: 0,
      lastSeenAt: null,
      topics: new Map(),
      learningTargets: new Map(),
    };

    subjects.set(subject.code, created);
    return created;
  }

  private getOrCreateTopicAggregate(
    subject: SubjectAggregate,
    curriculumNode: {
      code: string;
      name: string;
      studentLabel: string | null;
      subject: {
        code: string;
        name: string;
      };
      learningTargetMappings: Array<{
        weight: Prisma.Decimal | number;
        isPrimary: boolean;
        learningTarget: {
          id: string;
          code: string;
          name: string;
        };
      }>;
    },
  ) {
    const existing = subject.topics.get(curriculumNode.code);

    if (existing) {
      return existing;
    }

    const created: TopicAggregate = {
      code: curriculumNode.code,
      name: curriculumNode.studentLabel ?? curriculumNode.name,
      weaknessScore: 0,
      weakSignalCount: 0,
      lastSeenAt: null,
      signalCounts: {
        missed: 0,
        hard: 0,
        skipped: 0,
        revealed: 0,
        flagged: 0,
      },
      learningTargetMappings: curriculumNode.learningTargetMappings.map(
        (mapping) => ({
          weight: Number(mapping.weight),
          isPrimary: mapping.isPrimary,
          learningTarget: {
            id: mapping.learningTarget.id,
            code: mapping.learningTarget.code,
            name: mapping.learningTarget.name,
          },
        }),
      ),
    };

    subject.topics.set(curriculumNode.code, created);
    return created;
  }

  private getOrCreateLearningTargetAggregate(
    subject: SubjectAggregate,
    learningTarget: {
      code: string;
      name: string;
    },
  ) {
    const existing = subject.learningTargets.get(learningTarget.code);

    if (existing) {
      return existing;
    }

    const created: LearningTargetAggregate = {
      code: learningTarget.code,
      name: learningTarget.name,
      weaknessScore: 0,
      lastSeenAt: null,
    };

    subject.learningTargets.set(learningTarget.code, created);
    return created;
  }

  private roundWeaknessScore(value: number) {
    return Math.round(value * 100) / 100;
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

  private toTimestamp(value: Date | null) {
    return value?.getTime() ?? 0;
  }
}
