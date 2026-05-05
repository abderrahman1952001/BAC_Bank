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
  selectSignalSkillMappings,
  selectSignalTopics,
  type EffectiveSignalSkillMapping,
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
  skills: Map<string, SkillAggregate>;
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
  skillMappings: EffectiveSignalSkillMapping[];
};

type SkillAggregate = {
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
      skillCodes: subjectInsight.topSkills
        .slice(0, 4)
        .map((skill) => skill.code),
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
    const [topicRollups, skillRollups, reviewQueueItems] = await Promise.all([
      this.prisma.studentTopicRollup.findMany({
        where: {
          userId,
          ...(requestedSubjectCode
            ? {
                topic: {
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
          topic: {
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
      }),
      this.prisma.studentSkillRollup.findMany({
        where: {
          userId,
          ...(requestedSubjectCode
            ? {
                skill: {
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
          skill: {
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
      }),
    ]);

    const subjects = new Map<string, SubjectAggregate>();

    for (const rollup of topicRollups) {
      const subject = this.getOrCreateSubjectAggregate(
        subjects,
        rollup.topic.subject,
      );
      const topicAggregate = this.getOrCreateTopicAggregate(subject, {
        code: rollup.topic.code,
        name: rollup.topic.name,
        studentLabel: rollup.topic.studentLabel,
        subject: rollup.topic.subject,
        skillMappings: rollup.topic.skillMappings,
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

    for (const rollup of skillRollups) {
      const subject = this.getOrCreateSubjectAggregate(
        subjects,
        rollup.skill.subject,
      );
      const skill = this.getOrCreateSkillAggregate(subject, rollup.skill);

      skill.weaknessScore += Number(rollup.weaknessScore);
      skill.lastSeenAt = this.maxDate(skill.lastSeenAt, rollup.lastSeenAt);
      subject.totalWeaknessScore += Number(rollup.weaknessScore);
      subject.lastSeenAt = this.maxDate(subject.lastSeenAt, rollup.lastSeenAt);
    }

    for (const queueItem of reviewQueueItems) {
      const reason = queueItem.reasonType as StudyReviewReasonType;
      const topics = selectSignalTopics({
        questionSkills: queueItem.questionNode?.skillMappings ?? [],
        exerciseSkills: queueItem.exerciseNode.skillMappings,
        questionTopics:
          queueItem.questionNode?.topicMappings.map(
            (mapping) => mapping.topic,
          ) ?? [],
        exerciseTopics: queueItem.exerciseNode.topicMappings.map(
          (mapping) => mapping.topic,
        ),
        requestedSubjectCode,
      });

      if (!topics.length) {
        continue;
      }

      const skillMappings = selectSignalSkillMappings({
        questionSkills: queueItem.questionNode?.skillMappings ?? [],
        exerciseSkills: queueItem.exerciseNode.skillMappings,
        topics,
        requestedSubjectCode,
      });

      this.applyQueueSignal({
        subjects,
        topics,
        skillMappings,
        reason,
        updatedAt: queueItem.lastPromotedAt,
      });
    }

    return Array.from(subjects.values())
      .filter((subject) => subject.topics.size > 0 && subject.skills.size > 0)
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
            const preferredTopicSkills = topic.skillMappings.filter((mapping) =>
              subject.skills.has(mapping.skill.code),
            );
            const topicSkillMappings = preferredTopicSkills.length
              ? preferredTopicSkills
              : topic.skillMappings;

            return {
              code: topic.code,
              name: topic.name,
              weaknessScore: this.roundWeaknessScore(topic.weaknessScore),
              weakSignalCount: topic.weakSignalCount,
              lastSeenAt: topic.lastSeenAt?.toISOString() ?? null,
              signalCounts: topic.signalCounts,
              topSkills: topicSkillMappings
                .map((mapping) => {
                  const subjectSkill = subject.skills.get(mapping.skill.code);
                  const weaknessScore =
                    (subjectSkill?.weaknessScore ?? topic.weaknessScore) *
                    mapping.weight;

                  return {
                    code: mapping.skill.code,
                    name: mapping.skill.name,
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
          topSkills: Array.from(subject.skills.values())
            .sort((left, right) => right.weaknessScore - left.weaknessScore)
            .slice(0, 4)
            .map((skill) => ({
              code: skill.code,
              name: skill.name,
              weaknessScore: this.roundWeaknessScore(skill.weaknessScore),
            })),
          topTopics,
        };
      });
  }

  private applyQueueSignal(input: {
    subjects: Map<string, SubjectAggregate>;
    topics: SignalTopic[];
    skillMappings: EffectiveSignalSkillMapping[];
    reason: StudyReviewReasonType;
    updatedAt: Date;
  }) {
    const subjectsTouched = new Set<string>();

    for (const topic of input.topics) {
      const subject = this.getOrCreateSubjectAggregate(
        input.subjects,
        topic.subject,
      );
      const topicAggregate = this.getOrCreateTopicAggregate(subject, topic);

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
        this.applySubjectSkillMappings(
          subject,
          input.skillMappings,
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
      const topicSkillMappings = this.selectTopicSkillMappings(
        topicAggregate,
        input.skillMappings,
      );

      for (const mapping of topicSkillMappings) {
        topicAggregate.weaknessScore += distributedWeight * mapping.weight;
      }
    }
  }

  private applySubjectSkillMappings(
    subject: SubjectAggregate,
    skillMappings: EffectiveSignalSkillMapping[],
    signalWeight: number,
    updatedAt: Date,
  ) {
    for (const mapping of skillMappings) {
      const contribution = signalWeight * mapping.weight;
      const skill = this.getOrCreateSkillAggregate(subject, mapping.skill);

      subject.totalWeaknessScore += contribution;
      skill.weaknessScore += contribution;
      skill.lastSeenAt = this.maxDate(skill.lastSeenAt, updatedAt);
    }
  }

  private selectTopicSkillMappings(
    topic: TopicAggregate,
    preferredMappings: EffectiveSignalSkillMapping[],
  ) {
    if (!preferredMappings.length) {
      return topic.skillMappings;
    }

    const preferredBySkillCode = new Map(
      preferredMappings.map((mapping) => [mapping.skill.code, mapping]),
    );
    const overlappingMappings = topic.skillMappings
      .map((mapping) => preferredBySkillCode.get(mapping.skill.code))
      .filter((mapping): mapping is EffectiveSignalSkillMapping =>
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
      skills: new Map(),
    };

    subjects.set(subject.code, created);
    return created;
  }

  private getOrCreateTopicAggregate(
    subject: SubjectAggregate,
    topic: {
      code: string;
      name: string;
      studentLabel: string | null;
      subject: {
        code: string;
        name: string;
      };
      skillMappings: Array<{
        weight: Prisma.Decimal | number;
        isPrimary: boolean;
        skill: {
          id: string;
          code: string;
          name: string;
        };
      }>;
    },
  ) {
    const existing = subject.topics.get(topic.code);

    if (existing) {
      return existing;
    }

    const created: TopicAggregate = {
      code: topic.code,
      name: topic.studentLabel ?? topic.name,
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
      skillMappings: topic.skillMappings.map((mapping) => ({
        weight: Number(mapping.weight),
        isPrimary: mapping.isPrimary,
        skill: {
          id: mapping.skill.id,
          code: mapping.skill.code,
          name: mapping.skill.name,
        },
      })),
    };

    subject.topics.set(topic.code, created);
    return created;
  }

  private getOrCreateSkillAggregate(
    subject: SubjectAggregate,
    skill: {
      code: string;
      name: string;
    },
  ) {
    const existing = subject.skills.get(skill.code);

    if (existing) {
      return existing;
    }

    const created: SkillAggregate = {
      code: skill.code,
      name: skill.name,
      weaknessScore: 0,
      lastSeenAt: null,
    };

    subject.skills.set(skill.code, created);
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
