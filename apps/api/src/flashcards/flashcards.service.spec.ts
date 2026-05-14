import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  FlashcardReviewRating,
  FlashcardSourceType,
  FlashcardType,
  Prisma,
} from '@prisma/client';
import { FlashcardsService } from './flashcards.service';

describe('FlashcardsService', () => {
  let prisma: {
    flashcardDeck: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    flashcardDeckCard: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    flashcard: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    studentFlashcardState: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      count: jest.Mock;
      upsert: jest.Mock;
    };
    flashcardReviewLog: {
      create: jest.Mock;
    };
    studentLearningEvent: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: FlashcardsService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-12T08:00:00.000Z'));
    prisma = {
      flashcardDeck: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      flashcardDeckCard: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      flashcard: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      studentFlashcardState: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
      },
      flashcardReviewLog: {
        create: jest.fn(),
      },
      studentLearningEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };
    service = new FlashcardsService(prisma as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists owned and platform decks with due-card counts', async () => {
    prisma.flashcardDeck.findMany.mockResolvedValue([
      {
        id: 'deck-1',
        title: 'My deck',
        description: null,
        sourceType: FlashcardSourceType.USER_CREATED,
        isPlatformSeed: false,
        createdAt: new Date('2026-05-10T08:00:00.000Z'),
        updatedAt: new Date('2026-05-11T08:00:00.000Z'),
        _count: {
          cards: 2,
        },
        cards: [
          {
            card: {
              reviewStates: [{ cardId: 'card-1' }],
            },
          },
          {
            card: {
              reviewStates: [],
            },
          },
        ],
      },
    ]);

    await expect(service.listDecks('user-1')).resolves.toEqual({
      data: [
        {
          id: 'deck-1',
          title: 'My deck',
          description: null,
          sourceType: 'USER_CREATED',
          isPlatformSeed: false,
          cardCount: 2,
          dueCardCount: 1,
          createdAt: '2026-05-10T08:00:00.000Z',
          updatedAt: '2026-05-11T08:00:00.000Z',
        },
      ],
    });
    expect(prisma.flashcardDeck.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ ownerUserId: 'user-1' }, { isPlatformSeed: true }],
        },
      }),
    );
  });

  it('creates an owned deck and records a learning event', async () => {
    prisma.flashcardDeck.create.mockResolvedValue({
      id: 'deck-1',
      title: 'Limits',
      description: 'Core cards',
      sourceType: FlashcardSourceType.USER_CREATED,
      isPlatformSeed: false,
      createdAt: new Date('2026-05-12T08:00:00.000Z'),
      updatedAt: new Date('2026-05-12T08:00:00.000Z'),
    });
    prisma.studentLearningEvent.create.mockResolvedValue({});

    const result = await service.createDeck('user-1', {
      title: 'Limits',
      description: 'Core cards',
    });

    expect(result.deck).toMatchObject({
      id: 'deck-1',
      title: 'Limits',
      cardCount: 0,
      dueCardCount: 0,
    });
    expect(prisma.flashcardDeck.create).toHaveBeenCalledWith({
      data: {
        ownerUserId: 'user-1',
        title: 'Limits',
        description: 'Core cards',
        sourceType: FlashcardSourceType.USER_CREATED,
        isPlatformSeed: false,
      },
      select: expect.any(Object),
    });
    expect(prisma.studentLearningEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        eventType: 'FLASHCARD_DECK_CREATED',
        sourceType: 'FLASHCARD_DECK',
        sourceId: 'deck-1',
      }),
    });
  });

  it('creates a user card in an editable deck and initializes review state', async () => {
    prisma.flashcardDeck.findUnique.mockResolvedValue({
      ownerUserId: 'user-1',
      isPlatformSeed: false,
    });
    prisma.flashcardDeckCard.findFirst.mockResolvedValue({
      orderIndex: 2,
    });
    prisma.flashcard.create.mockResolvedValue(
      makeCardRecord({
        id: 'card-1',
        deckIds: ['deck-1'],
      }),
    );
    prisma.studentFlashcardState.create.mockResolvedValue({
      dueAt: new Date('2026-05-12T08:00:00.000Z'),
      intervalDays: 0,
      easeFactor: new Prisma.Decimal(2.5),
      reviewCount: 0,
      lapseCount: 0,
      lastReviewedAt: null,
    });
    prisma.studentLearningEvent.create.mockResolvedValue({});

    const result = await service.createCard('user-1', {
      deckId: 'deck-1',
      front: 'What is a limit?',
      back: 'A value approached by a function.',
      learningTargetId: '11111111-1111-1111-1111-111111111111',
    });

    expect(result.card.deckIds).toEqual(['deck-1']);
    expect(result.state).toEqual({
      dueAt: '2026-05-12T08:00:00.000Z',
      intervalDays: 0,
      easeFactor: 2.5,
      reviewCount: 0,
      lapseCount: 0,
      lastReviewedAt: null,
    });
    expect(prisma.flashcard.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdByUserId: 'user-1',
          type: FlashcardType.FRONT_BACK,
          sourceType: FlashcardSourceType.USER_CREATED,
          deckCards: {
            create: {
              deckId: 'deck-1',
              orderIndex: 3,
            },
          },
        }),
      }),
    );
    expect(prisma.studentLearningEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'FLASHCARD_CREATED',
        sourceType: 'FLASHCARD',
        sourceId: 'card-1',
        learningTargetId: '11111111-1111-1111-1111-111111111111',
      }),
    });
  });

  it('creates a default inbox deck when saving a card without a deck', async () => {
    prisma.flashcardDeck.findFirst.mockResolvedValue(null);
    prisma.flashcardDeck.create.mockResolvedValue({
      id: 'inbox-deck',
    });
    prisma.flashcardDeckCard.findFirst.mockResolvedValue(null);
    prisma.flashcard.create.mockResolvedValue(
      makeCardRecord({
        id: 'card-1',
        deckIds: ['inbox-deck'],
      }),
    );
    prisma.studentFlashcardState.create.mockResolvedValue({
      dueAt: new Date('2026-05-12T08:00:00.000Z'),
      intervalDays: 0,
      easeFactor: new Prisma.Decimal(2.5),
      reviewCount: 0,
      lapseCount: 0,
      lastReviewedAt: null,
    });
    prisma.studentLearningEvent.create.mockResolvedValue({});

    const result = await service.createCard('user-1', {
      front: 'Front',
      back: 'Back',
      sourceType: FlashcardSourceType.COURSE_STEP,
    });

    expect(result.card.deckIds).toEqual(['inbox-deck']);
    expect(prisma.flashcardDeck.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerUserId: 'user-1',
        title: 'صندوق البطاقات',
        sourceType: FlashcardSourceType.USER_CREATED,
        isPlatformSeed: false,
      }),
      select: {
        id: true,
      },
    });
    expect(prisma.flashcard.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deckCards: {
            create: {
              deckId: 'inbox-deck',
              orderIndex: 0,
            },
          },
        }),
      }),
    );
  });

  it('enrolls due states for cards in an accessible deck', async () => {
    prisma.flashcardDeck.findFirst.mockResolvedValue({
      id: 'deck-1',
      title: 'Platform deck',
      description: null,
      sourceType: FlashcardSourceType.PLATFORM,
      isPlatformSeed: true,
      createdAt: new Date('2026-05-10T08:00:00.000Z'),
      updatedAt: new Date('2026-05-11T08:00:00.000Z'),
      cards: [{ cardId: 'card-1' }, { cardId: 'card-2' }],
      _count: {
        cards: 2,
      },
    });
    prisma.studentFlashcardState.createMany.mockResolvedValue({
      count: 2,
    });
    prisma.studentFlashcardState.count.mockResolvedValue(2);
    prisma.studentLearningEvent.create.mockResolvedValue({});

    const result = await service.enrollDeck('user-1', 'deck-1');

    expect(result).toMatchObject({
      enrolledCardCount: 2,
      dueCardCount: 2,
      deck: {
        id: 'deck-1',
        cardCount: 2,
        dueCardCount: 2,
      },
    });
    expect(prisma.studentFlashcardState.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          cardId: 'card-1',
          dueAt: new Date('2026-05-12T08:00:00.000Z'),
          intervalDays: 0,
          easeFactor: 2.5,
        },
        {
          userId: 'user-1',
          cardId: 'card-2',
          dueAt: new Date('2026-05-12T08:00:00.000Z'),
          intervalDays: 0,
          easeFactor: 2.5,
        },
      ],
      skipDuplicates: true,
    });
    expect(prisma.studentLearningEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'FLASHCARD_DECK_ENROLLED',
        sourceType: 'FLASHCARD_DECK',
        sourceId: 'deck-1',
      }),
    });
  });

  it('rejects platform card creation and non-editable decks', async () => {
    await expect(
      service.createCard('user-1', {
        front: 'Front',
        back: 'Back',
        sourceType: FlashcardSourceType.PLATFORM,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.flashcardDeck.findUnique.mockResolvedValue({
      ownerUserId: 'other-user',
      isPlatformSeed: false,
    });

    await expect(
      service.createCard('user-1', {
        deckId: 'deck-1',
        front: 'Front',
        back: 'Back',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists due cards with deck and subject filters', async () => {
    prisma.flashcardDeck.findFirst.mockResolvedValue({
      id: 'deck-1',
    });
    prisma.studentFlashcardState.findMany.mockResolvedValue([
      {
        dueAt: new Date('2026-05-12T07:00:00.000Z'),
        intervalDays: 1,
        easeFactor: new Prisma.Decimal(2.5),
        reviewCount: 2,
        lapseCount: 0,
        lastReviewedAt: new Date('2026-05-11T07:00:00.000Z'),
        card: makeCardRecord({
          id: 'card-1',
          deckIds: ['deck-1'],
        }),
      },
    ]);

    const result = await service.listDueCards('user-1', {
      deckId: 'deck-1',
      subjectCode: 'math',
      limit: 10,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].state.reviewCount).toBe(2);
    expect(prisma.studentFlashcardState.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          card: expect.objectContaining({
            deckCards: {
              some: {
                deckId: 'deck-1',
              },
            },
            subject: {
              code: 'MATH',
            },
          }),
        }),
        take: 10,
      }),
    );
  });

  it('reviews an accessible card and schedules the next due date', async () => {
    prisma.flashcard.findFirst.mockResolvedValue(
      makeCardRecord({
        id: 'card-1',
        deckIds: ['deck-1'],
      }),
    );
    prisma.studentFlashcardState.findUnique.mockResolvedValue({
      intervalDays: 2,
      easeFactor: new Prisma.Decimal(2.5),
      reviewCount: 3,
      lapseCount: 0,
    });
    prisma.studentFlashcardState.upsert.mockImplementation((input) =>
      Promise.resolve(input.update),
    );
    prisma.flashcardReviewLog.create.mockResolvedValue({});
    prisma.studentLearningEvent.create.mockResolvedValue({});

    const result = await service.reviewCard('user-1', 'card-1', {
      rating: FlashcardReviewRating.GOOD,
    });

    expect(result.state).toEqual({
      dueAt: '2026-05-17T08:00:00.000Z',
      intervalDays: 5,
      easeFactor: 2.5,
      reviewCount: 4,
      lapseCount: 0,
      lastReviewedAt: '2026-05-12T08:00:00.000Z',
    });
    expect(prisma.flashcardReviewLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        cardId: 'card-1',
        rating: FlashcardReviewRating.GOOD,
      }),
    });
    expect(prisma.studentLearningEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'FLASHCARD_REVIEWED',
        sourceType: 'FLASHCARD',
        sourceId: 'card-1',
      }),
    });
  });

  it('throws when reviewing an inaccessible card', async () => {
    prisma.flashcard.findFirst.mockResolvedValue(null);

    await expect(
      service.reviewCard('user-1', 'missing-card', {
        rating: FlashcardReviewRating.GOOD,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function makeCardRecord(input: { id: string; deckIds: string[] }) {
  return {
    id: input.id,
    type: FlashcardType.FRONT_BACK,
    sourceType: FlashcardSourceType.USER_CREATED,
    front: 'Front',
    back: 'Back',
    data: null,
    createdAt: new Date('2026-05-12T08:00:00.000Z'),
    updatedAt: new Date('2026-05-12T08:00:00.000Z'),
    subject: {
      code: 'MATH',
      name: 'Mathematics',
    },
    curriculumNode: null,
    learningTarget: {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'LIMITS',
      name: 'Limits',
    },
    courseLesson: null,
    courseStep: null,
    examNode: null,
    deckCards: input.deckIds.map((deckId) => ({ deckId })),
  };
}
