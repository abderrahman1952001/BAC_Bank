import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  StudyRoadmapsResponse,
  StudyRoadmapNodeStatus,
} from '@bac-bank/contracts/study';
import { StudyReviewQueueStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const NODE_STATUS_PROGRESS: Record<StudyRoadmapNodeStatus, number> = {
  NOT_STARTED: 0,
  IN_PROGRESS: 65,
  NEEDS_REVIEW: 35,
  SOLID: 100,
};

@Injectable()
export class StudyRoadmapService {
  constructor(private readonly prisma: PrismaService) {}

  async listStudyRoadmaps(
    userId: string,
    input?: {
      subjectCode?: string;
      limit?: number;
    },
  ): Promise<StudyRoadmapsResponse> {
    const cappedLimit = Math.min(Math.max(input?.limit ?? 4, 1), 8);
    const requestedSubjectCode =
      input?.subjectCode?.trim().toUpperCase() ?? null;
    const currentYear = new Date().getUTCFullYear();
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        streamId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Student account not found.');
    }

    const roadmapRows = await this.prisma.subjectRoadmap.findMany({
      where: {
        isActive: true,
        curriculum: {
          isActive: true,
          validFromYear: {
            lte: currentYear,
          },
          OR: [{ validToYear: null }, { validToYear: { gte: currentYear } }],
          ...(requestedSubjectCode
            ? {
                subject: {
                  code: requestedSubjectCode,
                },
              }
            : {}),
          ...(user.streamId
            ? {
                subject: {
                  ...(requestedSubjectCode
                    ? {
                        code: requestedSubjectCode,
                      }
                    : {}),
                  streamMappings: {
                    some: {
                      streamId: user.streamId,
                    },
                  },
                },
              }
            : {}),
        },
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        version: true,
        curriculum: {
          select: {
            id: true,
            code: true,
            validFromYear: true,
            validToYear: true,
            title: true,
            streamMappings: {
              select: {
                streamId: true,
              },
            },
            subject: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        sections: {
          orderBy: [{ orderIndex: 'asc' }],
          select: {
            id: true,
            code: true,
            title: true,
            description: true,
            orderIndex: true,
          },
        },
        nodes: {
          orderBy: [{ orderIndex: 'asc' }],
          select: {
            id: true,
            title: true,
            description: true,
            orderIndex: true,
            estimatedSessions: true,
            isOptional: true,
            sectionId: true,
            recommendedPreviousRoadmapNodeId: true,
            topicId: true,
            topic: {
              select: {
                code: true,
                name: true,
                studentLabel: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          curriculum: {
            subject: {
              name: 'asc',
            },
          },
        },
        { version: 'desc' },
      ],
    });

    const preferredRoadmaps = this.selectPreferredRoadmaps(
      roadmapRows,
      user.streamId,
    ).slice(0, cappedLimit);
    const subjectCodes = Array.from(
      new Set(
        preferredRoadmaps.map((roadmap) => roadmap.curriculum.subject.code),
      ),
    );
    const topicIds = Array.from(
      new Set(
        preferredRoadmaps.flatMap((roadmap) =>
          roadmap.nodes.map((node) => node.topicId),
        ),
      ),
    );
    const [topicRollups, openReviewQueueItems] = await Promise.all([
      topicIds.length
        ? this.prisma.studentTopicRollup.findMany({
            where: {
              userId,
              topicId: {
                in: topicIds,
              },
            },
            select: {
              topicId: true,
              attemptedQuestions: true,
              correctCount: true,
              incorrectCount: true,
              masteryBucket: true,
              weaknessScore: true,
              lastSeenAt: true,
            },
          })
        : Promise.resolve([]),
      subjectCodes.length
        ? this.prisma.studentReviewQueueItem.findMany({
            where: {
              userId,
              status: StudyReviewQueueStatus.OPEN,
              exerciseNode: {
                variant: {
                  paper: {
                    subject: {
                      code: {
                        in: subjectCodes,
                      },
                    },
                  },
                },
              },
            },
            select: {
              exerciseNodeId: true,
              exerciseNode: {
                select: {
                  variant: {
                    select: {
                      paper: {
                        select: {
                          subject: {
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
          })
        : Promise.resolve([]),
    ]);
    const topicRollupsByTopicId = new Map(
      topicRollups.map((rollup) => [rollup.topicId, rollup]),
    );
    const openReviewExerciseIdsBySubjectCode = new Map<string, Set<string>>();

    for (const queueItem of openReviewQueueItems) {
      const subjectCode = queueItem.exerciseNode.variant.paper.subject.code;
      const current =
        openReviewExerciseIdsBySubjectCode.get(subjectCode) ?? new Set();
      current.add(queueItem.exerciseNodeId);
      openReviewExerciseIdsBySubjectCode.set(subjectCode, current);
    }

    return {
      data: preferredRoadmaps.map((roadmap) => {
        const baseNodes = roadmap.nodes.map((node) => {
          const rollup = topicRollupsByTopicId.get(node.topicId);
          const status = this.deriveNodeStatus(rollup);
          const progressPercent = rollup
            ? this.deriveNodeProgressPercent(
                status,
                Number(rollup.weaknessScore),
              )
            : NODE_STATUS_PROGRESS.NOT_STARTED;

          return {
            id: node.id,
            title: node.title,
            description: node.description,
            topicCode: node.topic.code,
            topicName: node.topic.studentLabel ?? node.topic.name,
            orderIndex: node.orderIndex,
            estimatedSessions: node.estimatedSessions,
            isOptional: node.isOptional,
            sectionId: node.sectionId,
            recommendedPreviousNodeId: node.recommendedPreviousRoadmapNodeId,
            status,
            progressPercent,
            weaknessScore: rollup ? Number(rollup.weaknessScore) : 0,
            attemptedQuestions: rollup?.attemptedQuestions ?? 0,
            correctCount: rollup?.correctCount ?? 0,
            incorrectCount: rollup?.incorrectCount ?? 0,
            lastSeenAt: rollup?.lastSeenAt?.toISOString() ?? null,
          };
        });
        const nodeTitleById = new Map(
          baseNodes.map((node) => [node.id, node.title]),
        );
        const nodes = baseNodes.map((node) => ({
          ...node,
          recommendedPreviousNodeTitle: node.recommendedPreviousNodeId
            ? (nodeTitleById.get(node.recommendedPreviousNodeId) ?? null)
            : null,
        }));
        const sections =
          roadmap.sections.length > 0
            ? [
                ...roadmap.sections
                  .map((section) => ({
                    id: section.id,
                    code: section.code,
                    title: section.title,
                    description: section.description,
                    orderIndex: section.orderIndex,
                    nodes: nodes.filter(
                      (node) => node.sectionId === section.id,
                    ),
                  }))
                  .filter((section) => section.nodes.length > 0),
                ...(() => {
                  const unsectionedNodes = nodes.filter((node) => {
                    if (!node.sectionId) {
                      return true;
                    }

                    return !roadmap.sections.some(
                      (section) => section.id === node.sectionId,
                    );
                  });

                  if (!unsectionedNodes.length) {
                    return [];
                  }

                  return [
                    {
                      id: `overflow:${roadmap.id}`,
                      code: 'MORE',
                      title: 'محاور إضافية',
                      description: null,
                      orderIndex: roadmap.sections.length + 1,
                      nodes: unsectionedNodes,
                    },
                  ];
                })(),
              ]
            : [
                {
                  id: `fallback:${roadmap.id}`,
                  code: 'CORE',
                  title: 'المسار',
                  description: roadmap.description,
                  orderIndex: 1,
                  nodes,
                },
              ];
        const solidNodeCount = nodes.filter(
          (node) => node.status === 'SOLID',
        ).length;
        const needsReviewNodeCount = nodes.filter(
          (node) => node.status === 'NEEDS_REVIEW',
        ).length;
        const inProgressNodeCount = nodes.filter(
          (node) => node.status === 'IN_PROGRESS',
        ).length;
        const notStartedNodeCount = nodes.filter(
          (node) => node.status === 'NOT_STARTED',
        ).length;
        const openReviewItemCount =
          openReviewExerciseIdsBySubjectCode.get(
            roadmap.curriculum.subject.code,
          )?.size ?? 0;
        const updatedAt = nodes.reduce<Date | null>((latest, node) => {
          if (!node.lastSeenAt) {
            return latest;
          }

          const value = new Date(node.lastSeenAt);

          if (!latest || value.getTime() > latest.getTime()) {
            return value;
          }

          return latest;
        }, null);
        const nextAction = this.buildNextAction(nodes, openReviewItemCount);

        return {
          id: roadmap.id,
          title: roadmap.title,
          description: roadmap.description,
          subject: roadmap.curriculum.subject,
          curriculum: {
            code: roadmap.curriculum.code,
            title: roadmap.curriculum.title,
          },
          totalNodeCount: nodes.length,
          solidNodeCount,
          needsReviewNodeCount,
          inProgressNodeCount,
          notStartedNodeCount,
          openReviewItemCount,
          progressPercent: nodes.length
            ? Math.round(
                nodes.reduce((sum, node) => sum + node.progressPercent, 0) /
                  nodes.length,
              )
            : 0,
          updatedAt: updatedAt?.toISOString() ?? null,
          nextAction,
          sections,
          nodes,
        };
      }),
    };
  }

  private selectPreferredRoadmaps(
    roadmaps: Array<{
      id: string;
      code: string;
      title: string;
      description: string | null;
      version: number;
      curriculum: {
        id: string;
        code: string;
        title: string;
        validFromYear: number;
        validToYear: number | null;
        streamMappings: Array<{
          streamId: string;
        }>;
        subject: {
          code: string;
          name: string;
        };
      };
      sections: Array<{
        id: string;
        code: string;
        title: string;
        description: string | null;
        orderIndex: number;
      }>;
      nodes: Array<{
        id: string;
        title: string;
        description: string | null;
        orderIndex: number;
        estimatedSessions: number | null;
        isOptional: boolean;
        sectionId: string | null;
        recommendedPreviousRoadmapNodeId: string | null;
        topicId: string;
        topic: {
          code: string;
          name: string;
          studentLabel: string | null;
        };
      }>;
    }>,
    streamId: string | null,
  ) {
    const grouped = new Map<string, (typeof roadmaps)[number][]>();

    for (const roadmap of roadmaps) {
      const key = `${roadmap.curriculum.subject.code}:${roadmap.code}`;
      const current = grouped.get(key) ?? [];
      current.push(roadmap);
      grouped.set(key, current);
    }

    return Array.from(grouped.values())
      .map(
        (group) =>
          group.sort((left, right) => {
            const leftStreamRank =
              streamId &&
              left.curriculum.streamMappings.some(
                (mapping) => mapping.streamId === streamId,
              )
                ? 0
                : 1;
            const rightStreamRank =
              streamId &&
              right.curriculum.streamMappings.some(
                (mapping) => mapping.streamId === streamId,
              )
                ? 0
                : 1;

            if (leftStreamRank !== rightStreamRank) {
              return leftStreamRank - rightStreamRank;
            }

            const leftRecency =
              left.curriculum.validToYear ?? Number.MAX_SAFE_INTEGER;
            const rightRecency =
              right.curriculum.validToYear ?? Number.MAX_SAFE_INTEGER;

            if (leftRecency !== rightRecency) {
              return rightRecency - leftRecency;
            }

            if (
              left.curriculum.validFromYear !== right.curriculum.validFromYear
            ) {
              return (
                right.curriculum.validFromYear - left.curriculum.validFromYear
              );
            }

            return right.version - left.version;
          })[0],
      )
      .sort((left, right) =>
        left.curriculum.subject.name.localeCompare(
          right.curriculum.subject.name,
        ),
      );
  }

  private deriveNodeStatus(rollup?: {
    attemptedQuestions: number;
    masteryBucket: 'NEW' | 'WATCH' | 'WEAK' | 'RECOVERING' | 'SOLID';
  }): StudyRoadmapNodeStatus {
    if (!rollup || rollup.attemptedQuestions <= 0) {
      return 'NOT_STARTED';
    }

    if (rollup.masteryBucket === 'SOLID') {
      return 'SOLID';
    }

    if (rollup.masteryBucket === 'WEAK' || rollup.masteryBucket === 'WATCH') {
      return 'NEEDS_REVIEW';
    }

    return 'IN_PROGRESS';
  }

  private deriveNodeProgressPercent(
    status: StudyRoadmapNodeStatus,
    weaknessScore: number,
  ) {
    if (status === 'NEEDS_REVIEW' && weaknessScore >= 6) {
      return 25;
    }

    return NODE_STATUS_PROGRESS[status];
  }

  private buildNextAction(
    nodes: Array<{
      title: string;
      topicCode: string;
      topicName: string;
      status: StudyRoadmapNodeStatus;
      weaknessScore: number;
      orderIndex: number;
    }>,
    openReviewItemCount: number,
  ) {
    const weakestNode = [...nodes]
      .filter((node) => node.status === 'NEEDS_REVIEW')
      .sort((left, right) => {
        if (right.weaknessScore !== left.weaknessScore) {
          return right.weaknessScore - left.weaknessScore;
        }

        return left.orderIndex - right.orderIndex;
      })[0];

    if (weakestNode) {
      return {
        type: 'TOPIC_DRILL' as const,
        label: `راجع ${weakestNode.title}`,
        topicCode: weakestNode.topicCode,
        topicName: weakestNode.topicName,
      };
    }

    if (openReviewItemCount > 0) {
      return {
        type: 'REVIEW_MISTAKES' as const,
        label: 'راجع أخطاءك المفتوحة',
        topicCode: null,
        topicName: null,
      };
    }

    const activeNode = nodes.find((node) => node.status === 'IN_PROGRESS');

    if (activeNode) {
      return {
        type: 'TOPIC_DRILL' as const,
        label: `واصل ${activeNode.title}`,
        topicCode: activeNode.topicCode,
        topicName: activeNode.topicName,
      };
    }

    const nextNode = nodes.find((node) => node.status === 'NOT_STARTED');

    if (nextNode) {
      return {
        type: 'TOPIC_DRILL' as const,
        label: `ابدأ ${nextNode.title}`,
        topicCode: nextNode.topicCode,
        topicName: nextNode.topicName,
      };
    }

    if (!nodes.length) {
      return null;
    }

    return {
      type: 'PAPER_SIMULATION' as const,
      label: 'اختبر نفسك بمحاكاة كاملة',
      topicCode: null,
      topicName: null,
    };
  }
}
