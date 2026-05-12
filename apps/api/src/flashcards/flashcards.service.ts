import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateFlashcardDeckResponse,
  CreateFlashcardResponse,
  DueFlashcardsResponse,
  FlashcardCard,
  FlashcardDeckCardsResponse,
  FlashcardDeckSummary,
  FlashcardDecksResponse,
  ReviewFlashcardResponse,
  StudentFlashcardState,
} from '@bac-bank/contracts/flashcards';
import {
  FlashcardReviewRating,
  FlashcardSourceType,
  FlashcardType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlashcardDeckDto } from './dto/create-flashcard-deck.dto';
import { CreateFlashcardDto } from './dto/create-flashcard.dto';
import { ReviewFlashcardDto } from './dto/review-flashcard.dto';

const DEFAULT_DUE_LIMIT = 20;
const DEFAULT_DECK_CARD_LIMIT = 100;
const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

const flashcardCardSelect = Prisma.validator<Prisma.FlashcardSelect>()({
  id: true,
  type: true,
  sourceType: true,
  front: true,
  back: true,
  data: true,
  createdAt: true,
  updatedAt: true,
  subject: {
    select: {
      code: true,
      name: true,
    },
  },
  curriculumNode: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  learningTarget: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  courseLesson: {
    select: {
      id: true,
      slug: true,
      title: true,
    },
  },
  courseStep: {
    select: {
      id: true,
      title: true,
      orderIndex: true,
    },
  },
  examNode: {
    select: {
      id: true,
      label: true,
      orderIndex: true,
    },
  },
  deckCards: {
    select: {
      deckId: true,
    },
    orderBy: {
      orderIndex: 'asc',
    },
  },
});

type FlashcardCardRecord = Prisma.FlashcardGetPayload<{
  select: typeof flashcardCardSelect;
}>;

type FlashcardStateRecord = {
  dueAt: Date;
  intervalDays: number;
  easeFactor: Prisma.Decimal | number | string;
  reviewCount: number;
  lapseCount: number;
  lastReviewedAt: Date | null;
};

@Injectable()
export class FlashcardsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDecks(userId: string): Promise<FlashcardDecksResponse> {
    const now = new Date();
    const decks = await this.prisma.flashcardDeck.findMany({
      where: this.accessibleDeckWhere(userId),
      orderBy: [
        { isPlatformSeed: 'desc' },
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        sourceType: true,
        isPlatformSeed: true,
        createdAt: true,
        updatedAt: true,
        cards: {
          select: {
            card: {
              select: {
                reviewStates: {
                  where: {
                    userId,
                    dueAt: {
                      lte: now,
                    },
                  },
                  select: {
                    cardId: true,
                  },
                  take: 1,
                },
              },
            },
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
    });

    return {
      data: decks.map((deck) => ({
        id: deck.id,
        title: deck.title,
        description: deck.description,
        sourceType: deck.sourceType,
        isPlatformSeed: deck.isPlatformSeed,
        cardCount: deck._count.cards,
        dueCardCount: deck.cards.filter(
          (deckCard) => deckCard.card.reviewStates.length > 0,
        ).length,
        createdAt: deck.createdAt.toISOString(),
        updatedAt: deck.updatedAt.toISOString(),
      })),
    };
  }

  async createDeck(
    userId: string,
    payload: CreateFlashcardDeckDto,
  ): Promise<CreateFlashcardDeckResponse> {
    const deck = await this.prisma.$transaction(async (tx) => {
      const createdDeck = await tx.flashcardDeck.create({
        data: {
          ownerUserId: userId,
          title: payload.title,
          description: payload.description ?? null,
          sourceType: FlashcardSourceType.USER_CREATED,
          isPlatformSeed: false,
        },
        select: {
          id: true,
          title: true,
          description: true,
          sourceType: true,
          isPlatformSeed: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.studentLearningEvent.create({
        data: {
          userId,
          eventType: 'FLASHCARD_DECK_CREATED',
          sourceType: 'FLASHCARD_DECK',
          sourceId: createdDeck.id,
          value: this.toJsonValue({
            title: createdDeck.title,
          }),
        },
      });

      return createdDeck;
    });

    return {
      deck: {
        ...this.toDeckSummary(deck),
        cardCount: 0,
        dueCardCount: 0,
      },
    };
  }

  async listDeckCards(
    userId: string,
    deckId: string,
    input?: {
      limit?: number;
    },
  ): Promise<FlashcardDeckCardsResponse> {
    await this.assertDeckAccessible(userId, deckId);
    const take = this.capLimit(input?.limit, DEFAULT_DECK_CARD_LIMIT, 200);
    const deckCards = await this.prisma.flashcardDeckCard.findMany({
      where: {
        deckId,
      },
      orderBy: {
        orderIndex: 'asc',
      },
      take,
      select: {
        card: {
          select: {
            ...flashcardCardSelect,
            reviewStates: {
              where: {
                userId,
              },
              take: 1,
            },
          },
        },
      },
    });

    return {
      data: deckCards.map((deckCard) => ({
        card: this.toCard(deckCard.card),
        state: deckCard.card.reviewStates[0]
          ? this.toState(deckCard.card.reviewStates[0])
          : null,
      })),
    };
  }

  async listDueCards(
    userId: string,
    input?: {
      limit?: number;
      deckId?: string;
      subjectCode?: string;
    },
  ): Promise<DueFlashcardsResponse> {
    if (input?.deckId) {
      await this.assertDeckAccessible(userId, input.deckId);
    }

    const now = new Date();
    const take = this.capLimit(input?.limit, DEFAULT_DUE_LIMIT, 100);
    const subjectCode = input?.subjectCode?.trim().toUpperCase();
    const states = await this.prisma.studentFlashcardState.findMany({
      where: {
        userId,
        dueAt: {
          lte: now,
        },
        card: {
          ...this.accessibleCardWhere(userId),
          ...(input?.deckId
            ? {
                deckCards: {
                  some: {
                    deckId: input.deckId,
                  },
                },
              }
            : {}),
          ...(subjectCode
            ? {
                subject: {
                  code: subjectCode,
                },
              }
            : {}),
        },
      },
      orderBy: [{ dueAt: 'asc' }, { lastReviewedAt: 'asc' }],
      take,
      select: {
        dueAt: true,
        intervalDays: true,
        easeFactor: true,
        reviewCount: true,
        lapseCount: true,
        lastReviewedAt: true,
        card: {
          select: flashcardCardSelect,
        },
      },
    });

    return {
      data: states.map((state) => ({
        card: this.toCard(state.card),
        state: this.toState(state),
      })),
    };
  }

  async createCard(
    userId: string,
    payload: CreateFlashcardDto,
  ): Promise<CreateFlashcardResponse> {
    const sourceType = payload.sourceType ?? FlashcardSourceType.USER_CREATED;

    if (sourceType === FlashcardSourceType.PLATFORM) {
      throw new BadRequestException('Students cannot create platform cards.');
    }

    if (sourceType === FlashcardSourceType.AI_DRAFT) {
      throw new BadRequestException(
        'AI draft cards must be created by platform flows.',
      );
    }

    if (payload.deckId) {
      await this.assertDeckEditable(userId, payload.deckId);
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const card = await tx.flashcard.create({
        data: {
          createdByUserId: userId,
          subjectId: payload.subjectId ?? null,
          curriculumNodeId: payload.curriculumNodeId ?? null,
          learningTargetId: payload.learningTargetId ?? null,
          courseLessonId: payload.courseLessonId ?? null,
          courseStepId: payload.courseStepId ?? null,
          examNodeId: payload.examNodeId ?? null,
          type: payload.type ?? FlashcardType.FRONT_BACK,
          sourceType,
          front: payload.front,
          back: payload.back,
          data:
            payload.data === undefined || payload.data === null
              ? Prisma.JsonNull
              : this.toJsonValue(payload.data),
          deckCards: payload.deckId
            ? {
                create: {
                  deckId: payload.deckId,
                  orderIndex: await this.nextDeckOrderIndex(tx, payload.deckId),
                },
              }
            : undefined,
        },
        select: flashcardCardSelect,
      });
      const state = await tx.studentFlashcardState.create({
        data: {
          userId,
          cardId: card.id,
          dueAt: now,
          intervalDays: 0,
          easeFactor: DEFAULT_EASE_FACTOR,
        },
      });

      await tx.studentLearningEvent.create({
        data: {
          userId,
          eventType: 'FLASHCARD_CREATED',
          sourceType: 'FLASHCARD',
          sourceId: card.id,
          curriculumNodeId: payload.curriculumNodeId ?? null,
          learningTargetId: payload.learningTargetId ?? null,
          courseLessonId: payload.courseLessonId ?? null,
          examNodeId: payload.examNodeId ?? null,
          value: this.toJsonValue({
            cardSourceType: sourceType,
            deckId: payload.deckId ?? null,
          }),
        },
      });

      return {
        card: this.toCard(card),
        state: this.toState(state),
      };
    });
  }

  async reviewCard(
    userId: string,
    cardId: string,
    payload: ReviewFlashcardDto,
  ): Promise<ReviewFlashcardResponse> {
    const card = await this.readAccessibleCard(userId, cardId);

    return this.prisma.$transaction(async (tx) => {
      const currentState = await tx.studentFlashcardState.findUnique({
        where: {
          userId_cardId: {
            userId,
            cardId,
          },
        },
      });
      const nextReview = this.scheduleNextReview(
        currentState,
        payload.rating,
        new Date(),
      );
      const state = await tx.studentFlashcardState.upsert({
        where: {
          userId_cardId: {
            userId,
            cardId,
          },
        },
        update: nextReview,
        create: {
          userId,
          cardId,
          ...nextReview,
        },
      });

      await tx.flashcardReviewLog.create({
        data: {
          userId,
          cardId,
          rating: payload.rating,
          reviewedAt: nextReview.lastReviewedAt,
          metadata: this.toJsonValue({
            previousIntervalDays: currentState?.intervalDays ?? 0,
            nextIntervalDays: state.intervalDays,
            nextDueAt: state.dueAt.toISOString(),
          }),
        },
      });

      await tx.studentLearningEvent.create({
        data: {
          userId,
          eventType: 'FLASHCARD_REVIEWED',
          sourceType: 'FLASHCARD',
          sourceId: cardId,
          curriculumNodeId: card.curriculumNode?.id ?? null,
          learningTargetId: card.learningTarget?.id ?? null,
          courseLessonId: card.courseLesson?.id ?? null,
          examNodeId: card.examNode?.id ?? null,
          value: this.toJsonValue({
            rating: payload.rating,
            intervalDays: state.intervalDays,
            dueAt: state.dueAt.toISOString(),
          }),
        },
      });

      return {
        card: this.toCard(card),
        state: this.toState(state),
      };
    });
  }

  private async readAccessibleCard(userId: string, cardId: string) {
    const card = await this.prisma.flashcard.findFirst({
      where: {
        id: cardId,
        ...this.accessibleCardWhere(userId),
      },
      select: flashcardCardSelect,
    });

    if (!card) {
      throw new NotFoundException(`Flashcard ${cardId} was not found.`);
    }

    return card;
  }

  private async assertDeckAccessible(userId: string, deckId: string) {
    const deck = await this.prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        ...this.accessibleDeckWhere(userId),
      },
      select: {
        id: true,
      },
    });

    if (!deck) {
      throw new NotFoundException(`Flashcard deck ${deckId} was not found.`);
    }
  }

  private async assertDeckEditable(userId: string, deckId: string) {
    const deck = await this.prisma.flashcardDeck.findUnique({
      where: {
        id: deckId,
      },
      select: {
        ownerUserId: true,
        isPlatformSeed: true,
      },
    });

    if (!deck) {
      throw new NotFoundException(`Flashcard deck ${deckId} was not found.`);
    }

    if (deck.ownerUserId !== userId || deck.isPlatformSeed) {
      throw new ForbiddenException('This flashcard deck is not editable.');
    }
  }

  private async nextDeckOrderIndex(
    tx: Prisma.TransactionClient,
    deckId: string,
  ) {
    const lastCard = await tx.flashcardDeckCard.findFirst({
      where: {
        deckId,
      },
      orderBy: {
        orderIndex: 'desc',
      },
      select: {
        orderIndex: true,
      },
    });

    return (lastCard?.orderIndex ?? -1) + 1;
  }

  private scheduleNextReview(
    currentState: {
      intervalDays: number;
      easeFactor: Prisma.Decimal;
      reviewCount: number;
      lapseCount: number;
    } | null,
    rating: FlashcardReviewRating,
    reviewedAt: Date,
  ) {
    const currentIntervalDays = currentState?.intervalDays ?? 0;
    const currentEaseFactor = Number(
      currentState?.easeFactor ?? DEFAULT_EASE_FACTOR,
    );
    let intervalDays: number;
    let easeFactor = currentEaseFactor;
    let lapseCount = currentState?.lapseCount ?? 0;

    if (rating === FlashcardReviewRating.AGAIN) {
      intervalDays = 0;
      easeFactor = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.2);
      lapseCount += 1;
    } else if (rating === FlashcardReviewRating.HARD) {
      intervalDays = Math.max(1, Math.ceil(currentIntervalDays * 1.2));
      easeFactor = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.15);
    } else if (rating === FlashcardReviewRating.EASY) {
      intervalDays =
        currentIntervalDays === 0
          ? 4
          : Math.max(
              2,
              Math.ceil(currentIntervalDays * currentEaseFactor * 1.3),
            );
      easeFactor = currentEaseFactor + 0.15;
    } else {
      intervalDays =
        currentIntervalDays === 0
          ? 1
          : Math.max(1, Math.ceil(currentIntervalDays * currentEaseFactor));
    }

    return {
      dueAt:
        rating === FlashcardReviewRating.AGAIN
          ? this.addMinutes(reviewedAt, 10)
          : this.addDays(reviewedAt, intervalDays),
      intervalDays,
      easeFactor: Number(easeFactor.toFixed(2)),
      reviewCount: (currentState?.reviewCount ?? 0) + 1,
      lapseCount,
      lastReviewedAt: reviewedAt,
    };
  }

  private accessibleDeckWhere(userId: string) {
    return {
      OR: [
        {
          ownerUserId: userId,
        },
        {
          isPlatformSeed: true,
        },
      ],
    } satisfies Prisma.FlashcardDeckWhereInput;
  }

  private accessibleCardWhere(userId: string) {
    return {
      OR: [
        {
          createdByUserId: userId,
        },
        {
          deckCards: {
            some: {
              deck: this.accessibleDeckWhere(userId),
            },
          },
        },
      ],
    } satisfies Prisma.FlashcardWhereInput;
  }

  private toDeckSummary(
    deck: {
      id: string;
      title: string;
      description: string | null;
      sourceType: FlashcardSourceType;
      isPlatformSeed: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    counts?: {
      cardCount?: number;
      dueCardCount?: number;
    },
  ): FlashcardDeckSummary {
    return {
      id: deck.id,
      title: deck.title,
      description: deck.description,
      sourceType: deck.sourceType,
      isPlatformSeed: deck.isPlatformSeed,
      cardCount: counts?.cardCount ?? 0,
      dueCardCount: counts?.dueCardCount ?? 0,
      createdAt: deck.createdAt.toISOString(),
      updatedAt: deck.updatedAt.toISOString(),
    };
  }

  private toCard(card: FlashcardCardRecord): FlashcardCard {
    return {
      id: card.id,
      type: card.type,
      sourceType: card.sourceType,
      front: card.front,
      back: card.back,
      data: this.toJsonRecord(card.data),
      subject: card.subject,
      curriculumNode: card.curriculumNode,
      learningTarget: card.learningTarget,
      courseLesson: card.courseLesson,
      courseStep: card.courseStep,
      examNode: card.examNode,
      deckIds: card.deckCards.map((deckCard) => deckCard.deckId),
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  }

  private toState(state: FlashcardStateRecord): StudentFlashcardState {
    return {
      dueAt: state.dueAt.toISOString(),
      intervalDays: state.intervalDays,
      easeFactor: Number(state.easeFactor),
      reviewCount: state.reviewCount,
      lapseCount: state.lapseCount,
      lastReviewedAt: state.lastReviewedAt?.toISOString() ?? null,
    };
  }

  private toJsonRecord(
    value: Prisma.JsonValue,
  ): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private capLimit(
    requestedLimit: number | undefined,
    fallback: number,
    max: number,
  ) {
    return Math.min(Math.max(requestedLimit ?? fallback, 1), max);
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private addDays(date: Date, days: number) {
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + days);
    return nextDate;
  }
}
