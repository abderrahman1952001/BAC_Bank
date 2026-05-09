import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CurriculumJourneysResponse,
  StudyRoadmapsResponse,
  StudyRoadmapNodeStatus,
} from '@bac-bank/contracts/study';
import { StudyReviewQueueStatus } from '@prisma/client';
import { resolveSubjectCurriculumJourneyDefinition } from '../catalog/curriculum-journey-definitions';
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
    return this.listCurriculumJourneys(userId, input);
  }

  async listCurriculumJourneys(
    userId: string,
    input?: {
      subjectCode?: string;
      limit?: number;
    },
  ): Promise<CurriculumJourneysResponse> {
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

    const curricula = await this.prisma.curriculum.findMany({
      where: {
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
              subjectOfferings: {
                some: {
                  streamId: user.streamId,
                  validFromYear: {
                    lte: currentYear,
                  },
                  OR: [
                    { validToYear: null },
                    { validToYear: { gte: currentYear } },
                  ],
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        title: true,
        validFromYear: true,
        validToYear: true,
        subject: {
          select: {
            code: true,
            name: true,
          },
        },
        subjectOfferings: {
          select: {
            streamId: true,
          },
        },
        curriculumNodes: {
          where: {
            parentId: null,
          },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            code: true,
            name: true,
            studentLabel: true,
            displayOrder: true,
            _count: {
              select: {
                children: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          subject: {
            name: 'asc',
          },
        },
        { validFromYear: 'desc' },
      ],
    });

    const preferredCurricula = this.selectPreferredCurricula(
      curricula,
      user.streamId,
    ).slice(0, cappedLimit);
    const subjectCodes = Array.from(
      new Set(preferredCurricula.map((curriculum) => curriculum.subject.code)),
    );
    const curriculumNodeIds = Array.from(
      new Set(
        preferredCurricula.flatMap((curriculum) =>
          curriculum.curriculumNodes.map((node) => node.id),
        ),
      ),
    );
    const [nodeRollups, openReviewQueueItems] = await Promise.all([
      curriculumNodeIds.length
        ? this.prisma.studentCurriculumNodeRollup.findMany({
            where: {
              userId,
              curriculumNodeId: {
                in: curriculumNodeIds,
              },
            },
            select: {
              curriculumNodeId: true,
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
    const rollupsByNodeId = new Map(
      nodeRollups.map((rollup) => [rollup.curriculumNodeId, rollup]),
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
      data: preferredCurricula.map((curriculum) => {
        const nodeByCode = new Map(
          curriculum.curriculumNodes.map((node) => [node.code, node]),
        );
        const journeyDefinition = resolveSubjectCurriculumJourneyDefinition({
          subjectCode: curriculum.subject.code,
          subjectName: curriculum.subject.name,
          topics: curriculum.curriculumNodes.map((node) => ({
            code: node.code,
            name: node.name,
            studentLabel: node.studentLabel,
            childrenCount: node._count.children,
            displayOrder: node.displayOrder,
          })),
        });
        const baseNodes = journeyDefinition.sections.flatMap((section) =>
          section.nodes.flatMap((definitionNode, nodeIndex) => {
            const curriculumNode = nodeByCode.get(definitionNode.topicCode);

            if (!curriculumNode) {
              return [];
            }

            const rollup = rollupsByNodeId.get(curriculumNode.id);
            const status = this.deriveNodeStatus(rollup);
            const progressPercent = rollup
              ? this.deriveNodeProgressPercent(
                  status,
                  Number(rollup.weaknessScore),
                )
              : NODE_STATUS_PROGRESS.NOT_STARTED;

            return [
              {
                id: curriculumNode.id,
                title: definitionNode.title,
                description: definitionNode.description,
                topicCode: curriculumNode.code,
                topicName: curriculumNode.studentLabel ?? curriculumNode.name,
                orderIndex: nodeIndex + 1,
                estimatedSessions: definitionNode.estimatedSessions,
                isOptional: definitionNode.isOptional,
                sectionId: `${curriculum.id}:${section.code}`,
                recommendedPreviousNodeId: definitionNode.recommendedPreviousTopicCode
                  ? (nodeByCode.get(definitionNode.recommendedPreviousTopicCode)
                      ?.id ?? null)
                  : null,
                status,
                progressPercent,
                weaknessScore: rollup ? Number(rollup.weaknessScore) : 0,
                attemptedQuestions: rollup?.attemptedQuestions ?? 0,
                correctCount: rollup?.correctCount ?? 0,
                incorrectCount: rollup?.incorrectCount ?? 0,
                lastSeenAt: rollup?.lastSeenAt?.toISOString() ?? null,
              },
            ];
          }),
        );
        const nodeTitleById = new Map(
          baseNodes.map((node) => [node.id, node.title]),
        );
        const nodes = baseNodes.map((node) => ({
          ...node,
          recommendedPreviousNodeTitle: node.recommendedPreviousNodeId
            ? (nodeTitleById.get(node.recommendedPreviousNodeId) ?? null)
            : null,
        }));
        const sections = journeyDefinition.sections
          .map((section, index) => ({
            id: `${curriculum.id}:${section.code}`,
            code: section.code,
            title: section.title,
            description: section.description,
            orderIndex: index + 1,
            nodes: nodes.filter(
              (node) => node.sectionId === `${curriculum.id}:${section.code}`,
            ),
          }))
          .filter((section) => section.nodes.length > 0);
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
          openReviewExerciseIdsBySubjectCode.get(curriculum.subject.code)
            ?.size ?? 0;
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
          id: curriculum.id,
          title: journeyDefinition.title,
          description: journeyDefinition.description,
          subject: curriculum.subject,
          curriculum: {
            code: curriculum.code,
            title: curriculum.title,
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

  private selectPreferredCurricula(
    curricula: Array<{
      id: string;
      code: string;
      title: string;
      validFromYear: number;
      validToYear: number | null;
      subject: {
        code: string;
        name: string;
      };
      subjectOfferings: Array<{
        streamId: string;
      }>;
      curriculumNodes: Array<{
        id: string;
        code: string;
        name: string;
        studentLabel: string | null;
        displayOrder: number;
        _count: {
          children: number;
        };
      }>;
    }>,
    streamId: string | null,
  ) {
    const grouped = new Map<string, (typeof curricula)[number][]>();

    for (const curriculum of curricula) {
      const current = grouped.get(curriculum.subject.code) ?? [];
      current.push(curriculum);
      grouped.set(curriculum.subject.code, current);
    }

    return Array.from(grouped.values())
      .map(
        (group) =>
          group.sort((left, right) => {
            const leftStreamRank =
              streamId &&
              left.subjectOfferings.some(
                (offering) => offering.streamId === streamId,
              )
                ? 0
                : 1;
            const rightStreamRank =
              streamId &&
              right.subjectOfferings.some(
                (offering) => offering.streamId === streamId,
              )
                ? 0
                : 1;

            if (leftStreamRank !== rightStreamRank) {
              return leftStreamRank - rightStreamRank;
            }

            const leftRecency =
              left.validToYear ?? Number.MAX_SAFE_INTEGER;
            const rightRecency =
              right.validToYear ?? Number.MAX_SAFE_INTEGER;

            if (leftRecency !== rightRecency) {
              return rightRecency - leftRecency;
            }

            return right.validFromYear - left.validFromYear;
          })[0],
      )
      .sort((left, right) =>
        left.subject.name.localeCompare(right.subject.name),
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
