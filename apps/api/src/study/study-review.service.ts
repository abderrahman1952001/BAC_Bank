import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  CreateSessionResponse,
  MyMistakesResponse,
  RecordReviewQueueOutcomeResponse,
  StudyReviewOutcome,
  StudyReviewReasonType,
  UpdateReviewQueueItemStatusResponse,
} from '@bac-bank/contracts/study';
import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  Prisma,
  StudyReviewQueueStatus,
} from '@prisma/client';
import {
  orderStudyReviewReasons,
  REVIEW_REASON_ORDER,
} from './study-review-signals';
import {
  getSujetLabel,
  pickRepresentativeExamOffering,
  toSujetNumberFromVariantCode,
} from './study-session-helpers';
import { StudySessionService } from './study-session.service';

const REVIEW_CLEAR_STREAK_TARGET = 3;
const REVIEW_VAULT_BATCH_LIMIT = 10;
const REVIEW_SNOOZE_DAYS = 2;

@Injectable()
export class StudyReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studySessionService: StudySessionService,
  ) {}

  async listMyMistakes(
    userId: string,
    input?: {
      limit?: number;
      subjectCode?: string;
      status?: StudyReviewQueueStatus;
    },
  ): Promise<MyMistakesResponse> {
    const cappedLimit = Math.min(Math.max(input?.limit ?? 8, 1), 20);
    const searchLimit = Math.max(cappedLimit * 16, 40);
    const requestedSubjectCode = input?.subjectCode?.trim().toUpperCase() ?? null;
    const requestedStatus = input?.status ?? StudyReviewQueueStatus.OPEN;
    const now = new Date();
    const preferredStreamCode = await this.getPreferredStreamCode(userId);
    const queueItems = await this.prisma.studentReviewQueueItem.findMany({
      where: {
        userId,
        status: requestedStatus,
        ...(requestedSubjectCode
          ? {
              exerciseNode: {
                variant: {
                  paper: {
                    subject: {
                      code: requestedSubjectCode,
                    },
                  },
                },
              },
            }
          : {}),
      },
      take: searchLimit,
      orderBy: [
        { dueAt: 'asc' },
        { priorityScore: 'desc' },
        { lastPromotedAt: 'desc' },
        { updatedAt: 'desc' },
      ],
      select: {
        questionNodeId: true,
        reasonType: true,
        priorityScore: true,
        lastPromotedAt: true,
        dueAt: true,
        successStreak: true,
        lastReviewedAt: true,
        lastReviewOutcome: true,
        questionNode: {
          select: {
            label: true,
          },
        },
        exerciseNode: {
          select: {
            id: true,
            orderIndex: true,
            label: true,
            variant: {
              select: {
                code: true,
                paper: {
                  select: {
                    offerings: {
                      select: {
                        id: true,
                        year: true,
                        sessionType: true,
                        stream: {
                          select: {
                            code: true,
                            name: true,
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
                  },
                },
              },
            },
          },
        },
      },
    });
    const itemsByExerciseNodeId = new Map<
      string,
      {
        exerciseNodeId: string;
        updatedAt: Date;
        dueAt: Date | null;
        successStreak: number;
        lastReviewedAt: Date | null;
        lastReviewOutcome: StudyReviewOutcome | null;
        reasons: Set<StudyReviewReasonType>;
        flagged: boolean;
        exercise: {
          id: string;
          orderIndex: number;
          title: string | null;
        };
        exam: {
          id: string;
          year: number;
          sessionType: 'NORMAL' | 'MAKEUP';
          stream: {
            code: string;
            name: string;
          };
          subject: {
            code: string;
            name: string;
          };
          sujetNumber: 1 | 2;
          sujetLabel: string;
        };
        questionSignals: Map<
          string,
          {
            id: string;
            label: string | null;
            reasons: Set<StudyReviewReasonType>;
            updatedAt: Date;
            priorityScore: number;
          }
        >;
      }
    >();

    for (const queueItem of queueItems) {
      const sujetNumber = toSujetNumberFromVariantCode(
        queueItem.exerciseNode.variant.code,
      );
      const representativeExam = this.pickQueueItemExamOffering(
        queueItem.exerciseNode.variant.paper.offerings,
        preferredStreamCode,
      );

      if (!sujetNumber || !representativeExam) {
        continue;
      }

      const key = queueItem.exerciseNode.id;
      const currentItem = itemsByExerciseNodeId.get(key);
      const nextItem =
        currentItem ??
        {
          exerciseNodeId: key,
          updatedAt: queueItem.lastPromotedAt,
          dueAt: queueItem.dueAt,
          successStreak: queueItem.successStreak,
          lastReviewedAt: queueItem.lastReviewedAt,
          lastReviewOutcome:
            (queueItem.lastReviewOutcome as StudyReviewOutcome | null) ?? null,
          reasons: new Set<StudyReviewReasonType>(),
          flagged: false,
          exercise: {
            id: key,
            orderIndex: queueItem.exerciseNode.orderIndex,
            title: queueItem.exerciseNode.label,
          },
          exam: {
            id: representativeExam.id,
            year: representativeExam.year,
            sessionType: representativeExam.sessionType,
            stream: representativeExam.stream,
            subject: representativeExam.subject,
            sujetNumber,
            sujetLabel: getSujetLabel(sujetNumber),
          },
          questionSignals: new Map(),
        };

      if (queueItem.lastPromotedAt.getTime() > nextItem.updatedAt.getTime()) {
        nextItem.updatedAt = queueItem.lastPromotedAt;
      }

      nextItem.dueAt = this.minDate(nextItem.dueAt, queueItem.dueAt);
      nextItem.successStreak = Math.min(
        nextItem.successStreak,
        queueItem.successStreak,
      );

      if (
        queueItem.lastReviewedAt &&
        (!nextItem.lastReviewedAt ||
          queueItem.lastReviewedAt.getTime() >= nextItem.lastReviewedAt.getTime())
      ) {
        nextItem.lastReviewedAt = queueItem.lastReviewedAt;
        nextItem.lastReviewOutcome =
          (queueItem.lastReviewOutcome as StudyReviewOutcome | null) ?? null;
      }

      nextItem.reasons.add(queueItem.reasonType);

      if (!queueItem.questionNodeId) {
        if (queueItem.reasonType === 'FLAGGED') {
          nextItem.flagged = true;
        }

        itemsByExerciseNodeId.set(key, nextItem);
        continue;
      }

      const questionEntry =
        nextItem.questionSignals.get(queueItem.questionNodeId) ??
        {
          id: queueItem.questionNodeId,
          label: queueItem.questionNode?.label ?? null,
          reasons: new Set<StudyReviewReasonType>(),
          updatedAt: queueItem.lastPromotedAt,
          priorityScore: Number(queueItem.priorityScore),
        };

      questionEntry.reasons.add(queueItem.reasonType);
      questionEntry.priorityScore = Math.max(
        questionEntry.priorityScore,
        Number(queueItem.priorityScore),
      );

      if (queueItem.lastPromotedAt.getTime() > questionEntry.updatedAt.getTime()) {
        questionEntry.updatedAt = queueItem.lastPromotedAt;
      }

      nextItem.questionSignals.set(queueItem.questionNodeId, questionEntry);
      itemsByExerciseNodeId.set(key, nextItem);
    }

    return {
      data: Array.from(itemsByExerciseNodeId.values())
        .sort((left, right) => {
          const dueComparison = this.compareReviewDueOrder(left.dueAt, right.dueAt, now);

          if (dueComparison !== 0) {
            return dueComparison;
          }

          const priorityDelta =
            this.getItemPriorityScore(right) - this.getItemPriorityScore(left);

          if (priorityDelta !== 0) {
            return priorityDelta;
          }

          return right.updatedAt.getTime() - left.updatedAt.getTime();
        })
        .slice(0, cappedLimit)
        .map((item) => {
          const focusQuestion = [...item.questionSignals.values()].sort(
            (left, right) => {
              const priorityDelta =
                right.priorityScore - left.priorityScore ||
                this.getQuestionPriorityScore(right) -
                  this.getQuestionPriorityScore(left);

              if (priorityDelta !== 0) {
                return priorityDelta;
              }

              return right.updatedAt.getTime() - left.updatedAt.getTime();
            },
          )[0];

          return {
            exerciseNodeId: item.exerciseNodeId,
            focusQuestionId: focusQuestion?.id ?? null,
            focusQuestionLabel: focusQuestion?.label ?? null,
            reasons: orderStudyReviewReasons(item.reasons),
            questionSignalCount: item.questionSignals.size,
            flagged: item.flagged,
            dueAt: item.dueAt?.toISOString() ?? null,
            successStreak: item.successStreak,
            lastReviewedAt: item.lastReviewedAt?.toISOString() ?? null,
            lastReviewOutcome: item.lastReviewOutcome,
            isDue: this.isDueNow(item.dueAt, now),
            updatedAt: item.updatedAt.toISOString(),
            exercise: item.exercise,
            exam: item.exam,
          };
        }),
    };
  }

  async updateReviewQueueStatus(
    userId: string,
    input: {
      exerciseNodeId: string;
      questionNodeId?: string | null;
      status: StudyReviewQueueStatus;
    },
  ): Promise<UpdateReviewQueueItemStatusResponse> {
    const updatedAt = new Date();
    const updateResult = await this.prisma.studentReviewQueueItem.updateMany({
      where: {
        userId,
        exerciseNodeId: input.exerciseNodeId,
        ...(input.questionNodeId
          ? {
              questionNodeId: input.questionNodeId,
            }
          : {}),
      },
      data: {
        status: input.status,
        dueAt: this.resolveDueAtForStatus(input.status, updatedAt),
        statusUpdatedAt: updatedAt,
      },
    });

    return {
      exerciseNodeId: input.exerciseNodeId,
      questionNodeId: input.questionNodeId ?? null,
      status: input.status,
      matchedItemCount: updateResult.count,
      updatedAt: updatedAt.toISOString(),
    };
  }

  async recordReviewQueueOutcome(
    userId: string,
    input: {
      exerciseNodeId: string;
      questionNodeId?: string | null;
      outcome: StudyReviewOutcome;
    },
  ): Promise<RecordReviewQueueOutcomeResponse> {
    const updatedAt = new Date();
    const queueItems = await this.prisma.studentReviewQueueItem.findMany({
      where: {
        userId,
        exerciseNodeId: input.exerciseNodeId,
        ...(input.questionNodeId
          ? {
              questionNodeId: input.questionNodeId,
            }
          : {}),
        status: {
          not: StudyReviewQueueStatus.REMOVED,
        },
      },
      select: {
        id: true,
        status: true,
        successStreak: true,
        lastReviewedAt: true,
        lastReviewOutcome: true,
      },
    });

    for (const queueItem of queueItems) {
      await this.prisma.studentReviewQueueItem.update({
        where: {
          id: queueItem.id,
        },
        data: this.buildReviewOutcomeUpdate({
          item: queueItem,
          outcome: input.outcome,
          now: updatedAt,
        }),
      });
    }

    return {
      exerciseNodeId: input.exerciseNodeId,
      questionNodeId: input.questionNodeId ?? null,
      outcome: input.outcome,
      matchedItemCount: queueItems.length,
      updatedAt: updatedAt.toISOString(),
    };
  }

  async clearMistakeVault(
    userId: string,
    input?: {
      subjectCode?: string;
      limit?: number;
    },
  ): Promise<CreateSessionResponse> {
    const cappedLimit = Math.min(
      Math.max(input?.limit ?? REVIEW_VAULT_BATCH_LIMIT, 1),
      REVIEW_VAULT_BATCH_LIMIT,
    );
    const requestedSubjectCode = input?.subjectCode?.trim().toUpperCase() ?? null;
    const now = new Date();
    const selectedCandidates =
      (await this.listClearVaultCandidates({
        userId,
        status: StudyReviewQueueStatus.OPEN,
        subjectCode: requestedSubjectCode,
        onlyDue: true,
        now,
        limit: cappedLimit,
      })) ??
      (await this.listClearVaultCandidates({
        userId,
        status: StudyReviewQueueStatus.OPEN,
        subjectCode: requestedSubjectCode,
        onlyDue: false,
        now,
        limit: cappedLimit,
      }));

    if (!selectedCandidates || selectedCandidates.exerciseNodeIds.length === 0) {
      throw new BadRequestException(
        'No corrective review items are available to clear right now.',
      );
    }

    return this.studySessionService.createStudySession(userId, {
      kind: 'MIXED_DRILL',
      title: `تنظيف الخزانة · ${selectedCandidates.subject.name}`,
      subjectCode: selectedCandidates.subject.code,
      exerciseCount: selectedCandidates.exerciseNodeIds.length,
      exerciseNodeIds: selectedCandidates.exerciseNodeIds,
    });
  }

  private async getPreferredStreamCode(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        stream: {
          select: {
            code: true,
          },
        },
      },
    });

    return user?.stream?.code ?? null;
  }

  private pickQueueItemExamOffering(
    offerings: Array<{
      id: string;
      year: number;
      sessionType: 'NORMAL' | 'MAKEUP';
      stream: {
        code: string;
        name: string;
      };
      subject: {
        code: string;
        name: string;
      };
    }>,
    preferredStreamCode: string | null,
  ) {
    if (preferredStreamCode) {
      const preferredOfferings = offerings.filter(
        (offering) => offering.stream.code === preferredStreamCode,
      );
      const preferredExam = pickRepresentativeExamOffering(preferredOfferings);

      if (preferredExam) {
        return preferredExam;
      }
    }

    return pickRepresentativeExamOffering(offerings);
  }

  private getItemPriorityScore(item: {
    reasons: Set<StudyReviewReasonType>;
    flagged: boolean;
    questionSignals: Map<string, { reasons: Set<StudyReviewReasonType> }>;
  }) {
    const baseScore = REVIEW_REASON_ORDER.reduce((score, reason, index) => {
      return item.reasons.has(reason)
        ? score + (REVIEW_REASON_ORDER.length - index) * 10
        : score;
    }, 0);

    return baseScore + item.questionSignals.size * 3 + (item.flagged ? 8 : 0);
  }

  private getQuestionPriorityScore(question: {
    reasons: Set<StudyReviewReasonType>;
  }) {
    return REVIEW_REASON_ORDER.reduce((score, reason, index) => {
      return question.reasons.has(reason)
        ? score + (REVIEW_REASON_ORDER.length - index) * 10
        : score;
    }, 0);
  }

  private async listClearVaultCandidates(input: {
    userId: string;
    status: StudyReviewQueueStatus;
    subjectCode: string | null;
    onlyDue: boolean;
    now: Date;
    limit: number;
  }) {
    const searchLimit = Math.max(input.limit * 8, 24);
    const queueItems = await this.prisma.studentReviewQueueItem.findMany({
      where: {
        userId: input.userId,
        status: input.status,
        ...(input.onlyDue
          ? {
              dueAt: {
                lte: input.now,
              },
            }
          : {}),
        ...(input.subjectCode
          ? {
              exerciseNode: {
                variant: {
                  paper: {
                    subject: {
                      code: input.subjectCode,
                    },
                  },
                },
              },
            }
          : {}),
      },
      take: searchLimit,
      orderBy: [
        { dueAt: 'asc' },
        { priorityScore: 'desc' },
        { lastPromotedAt: 'desc' },
      ],
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
    });

    if (queueItems.length === 0) {
      return null;
    }

    const resolvedSubjectCode =
      input.subjectCode ?? queueItems[0]?.exerciseNode.variant.paper.subject.code ?? null;

    if (!resolvedSubjectCode) {
      return null;
    }

    const exerciseNodeIds: string[] = [];
    const seenExerciseNodeIds = new Set<string>();
    let subjectName = queueItems[0].exerciseNode.variant.paper.subject.name;

    for (const queueItem of queueItems) {
      const subject = queueItem.exerciseNode.variant.paper.subject;

      if (subject.code !== resolvedSubjectCode) {
        continue;
      }

      subjectName = subject.name;

      if (seenExerciseNodeIds.has(queueItem.exerciseNodeId)) {
        continue;
      }

      seenExerciseNodeIds.add(queueItem.exerciseNodeId);
      exerciseNodeIds.push(queueItem.exerciseNodeId);

      if (exerciseNodeIds.length >= input.limit) {
        break;
      }
    }

    if (exerciseNodeIds.length === 0) {
      return null;
    }

    return {
      subject: {
        code: resolvedSubjectCode,
        name: subjectName,
      },
      exerciseNodeIds,
    };
  }

  private resolveDueAtForStatus(
    status: StudyReviewQueueStatus,
    referenceTime: Date,
  ): Date | null {
    switch (status) {
      case StudyReviewQueueStatus.OPEN:
        return referenceTime;
      case StudyReviewQueueStatus.SNOOZED:
        return this.addDays(referenceTime, REVIEW_SNOOZE_DAYS);
      case StudyReviewQueueStatus.DONE:
      case StudyReviewQueueStatus.REMOVED:
        return null;
      default:
        return referenceTime;
    }
  }

  private buildReviewOutcomeUpdate(input: {
    item: {
      successStreak: number;
      lastReviewedAt: Date | null;
      lastReviewOutcome: StudyReviewOutcome | null;
    };
    outcome: StudyReviewOutcome;
    now: Date;
  }): Prisma.StudentReviewQueueItemUpdateInput {
    if (input.outcome === 'INCORRECT') {
      return {
        status: StudyReviewQueueStatus.OPEN,
        dueAt: this.addDays(input.now, 1),
        successStreak: 0,
        lastReviewedAt: input.now,
        lastReviewOutcome: input.outcome,
        statusUpdatedAt: input.now,
      };
    }

    const alreadyCountedToday =
      input.item.lastReviewedAt !== null &&
      input.item.lastReviewOutcome === 'CORRECT' &&
      this.isSameCalendarDay(input.item.lastReviewedAt, input.now);
    const nextSuccessStreak = alreadyCountedToday
      ? input.item.successStreak
      : Math.min(input.item.successStreak + 1, REVIEW_CLEAR_STREAK_TARGET);
    const cleared = nextSuccessStreak >= REVIEW_CLEAR_STREAK_TARGET;

    return {
      status: cleared ? StudyReviewQueueStatus.DONE : StudyReviewQueueStatus.OPEN,
      dueAt: cleared
        ? null
        : this.addDays(input.now, nextSuccessStreak >= 2 ? 3 : 1),
      successStreak: nextSuccessStreak,
      lastReviewedAt: input.now,
      lastReviewOutcome: input.outcome,
      statusUpdatedAt: input.now,
    };
  }

  private isDueNow(dueAt: Date | null, now: Date) {
    return Boolean(dueAt && dueAt.getTime() <= now.getTime());
  }

  private compareReviewDueOrder(
    leftDueAt: Date | null,
    rightDueAt: Date | null,
    now: Date,
  ) {
    const leftIsDue = this.isDueNow(leftDueAt, now);
    const rightIsDue = this.isDueNow(rightDueAt, now);

    if (leftIsDue !== rightIsDue) {
      return leftIsDue ? -1 : 1;
    }

    if (!leftDueAt && !rightDueAt) {
      return 0;
    }

    if (!leftDueAt) {
      return 1;
    }

    if (!rightDueAt) {
      return -1;
    }

    return leftDueAt.getTime() - rightDueAt.getTime();
  }

  private isSameCalendarDay(left: Date, right: Date) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  private addDays(referenceTime: Date, days: number) {
    const next = new Date(referenceTime.getTime());
    next.setDate(next.getDate() + days);
    return next;
  }

  private minDate(current: Date | null, next: Date | null) {
    if (!next) {
      return current;
    }

    if (!current || next.getTime() < current.getTime()) {
      return next;
    }

    return current;
  }
}
