import { parseContract, z, jsonRecordSchema } from "./shared.js";

export type FlashcardSourceType =
  | "PLATFORM"
  | "USER_CREATED"
  | "COURSE_STEP"
  | "COURSE_LESSON"
  | "OFFICIAL_CORRECTION"
  | "STUDENT_MISTAKE"
  | "AI_DRAFT";

export type FlashcardType =
  | "FRONT_BACK"
  | "CLOZE"
  | "IMAGE_LABEL"
  | "ORDERED_STEPS";

export type FlashcardReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export type FlashcardDeckSummary = {
  id: string;
  title: string;
  description: string | null;
  sourceType: FlashcardSourceType;
  isPlatformSeed: boolean;
  cardCount: number;
  dueCardCount: number;
  createdAt: string;
  updatedAt: string;
};

export type FlashcardCard = {
  id: string;
  type: FlashcardType;
  sourceType: FlashcardSourceType;
  front: string;
  back: string;
  data: Record<string, unknown> | null;
  subject: {
    code: string;
    name: string;
  } | null;
  curriculumNode: {
    id: string;
    code: string;
    name: string;
  } | null;
  learningTarget: {
    id: string;
    code: string;
    name: string;
  } | null;
  courseLesson: {
    id: string;
    slug: string;
    title: string;
  } | null;
  courseStep: {
    id: string;
    title: string | null;
    orderIndex: number;
  } | null;
  examNode: {
    id: string;
    label: string | null;
    orderIndex: number;
  } | null;
  deckIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type StudentFlashcardState = {
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  reviewCount: number;
  lapseCount: number;
  lastReviewedAt: string | null;
};

export type FlashcardDecksResponse = {
  data: FlashcardDeckSummary[];
};

export type FlashcardDeckCardsResponse = {
  data: Array<{
    card: FlashcardCard;
    state: StudentFlashcardState | null;
  }>;
};

export type DueFlashcardsResponse = {
  data: Array<{
    card: FlashcardCard;
    state: StudentFlashcardState;
  }>;
};

export type CreateFlashcardDeckRequest = {
  title: string;
  description?: string | null;
};

export type CreateFlashcardDeckResponse = {
  deck: FlashcardDeckSummary;
};

export type EnrollFlashcardDeckResponse = {
  deck: FlashcardDeckSummary;
  enrolledCardCount: number;
  dueCardCount: number;
};

export type CreateFlashcardRequest = {
  deckId?: string | null;
  type?: FlashcardType;
  sourceType?: FlashcardSourceType;
  front: string;
  back: string;
  data?: Record<string, unknown> | null;
  subjectId?: string | null;
  curriculumNodeId?: string | null;
  learningTargetId?: string | null;
  courseLessonId?: string | null;
  courseStepId?: string | null;
  examNodeId?: string | null;
};

export type CreateFlashcardResponse = {
  card: FlashcardCard;
  state: StudentFlashcardState;
};

export type ReviewFlashcardRequest = {
  rating: FlashcardReviewRating;
};

export type ReviewFlashcardResponse = {
  card: FlashcardCard;
  state: StudentFlashcardState;
};

export const flashcardSourceTypeSchema: z.ZodType<FlashcardSourceType> = z.enum(
  [
    "PLATFORM",
    "USER_CREATED",
    "COURSE_STEP",
    "COURSE_LESSON",
    "OFFICIAL_CORRECTION",
    "STUDENT_MISTAKE",
    "AI_DRAFT",
  ],
);

export const flashcardTypeSchema: z.ZodType<FlashcardType> = z.enum([
  "FRONT_BACK",
  "CLOZE",
  "IMAGE_LABEL",
  "ORDERED_STEPS",
]);

export const flashcardReviewRatingSchema: z.ZodType<FlashcardReviewRating> =
  z.enum(["AGAIN", "HARD", "GOOD", "EASY"]);

const codeNameSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export const flashcardDeckSummarySchema: z.ZodType<FlashcardDeckSummary> =
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    sourceType: flashcardSourceTypeSchema,
    isPlatformSeed: z.boolean(),
    cardCount: z.number(),
    dueCardCount: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  });

export const flashcardCardSchema: z.ZodType<FlashcardCard> = z.object({
  id: z.string(),
  type: flashcardTypeSchema,
  sourceType: flashcardSourceTypeSchema,
  front: z.string(),
  back: z.string(),
  data: jsonRecordSchema.nullable(),
  subject: codeNameSchema.nullable(),
  curriculumNode: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
    })
    .nullable(),
  learningTarget: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
    })
    .nullable(),
  courseLesson: z
    .object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
    })
    .nullable(),
  courseStep: z
    .object({
      id: z.string(),
      title: z.string().nullable(),
      orderIndex: z.number(),
    })
    .nullable(),
  examNode: z
    .object({
      id: z.string(),
      label: z.string().nullable(),
      orderIndex: z.number(),
    })
    .nullable(),
  deckIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const studentFlashcardStateSchema: z.ZodType<StudentFlashcardState> =
  z.object({
    dueAt: z.string(),
    intervalDays: z.number(),
    easeFactor: z.number(),
    reviewCount: z.number(),
    lapseCount: z.number(),
    lastReviewedAt: z.string().nullable(),
  });

export const flashcardDecksResponseSchema: z.ZodType<FlashcardDecksResponse> =
  z.object({
    data: z.array(flashcardDeckSummarySchema),
  });

export const flashcardDeckCardsResponseSchema: z.ZodType<FlashcardDeckCardsResponse> =
  z.object({
    data: z.array(
      z.object({
        card: flashcardCardSchema,
        state: studentFlashcardStateSchema.nullable(),
      }),
    ),
  });

export const dueFlashcardsResponseSchema: z.ZodType<DueFlashcardsResponse> =
  z.object({
    data: z.array(
      z.object({
        card: flashcardCardSchema,
        state: studentFlashcardStateSchema,
      }),
    ),
  });

export const createFlashcardDeckRequestSchema: z.ZodType<CreateFlashcardDeckRequest> =
  z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).nullable().optional(),
  });

export const createFlashcardDeckResponseSchema: z.ZodType<CreateFlashcardDeckResponse> =
  z.object({
    deck: flashcardDeckSummarySchema,
  });

export const enrollFlashcardDeckResponseSchema: z.ZodType<EnrollFlashcardDeckResponse> =
  z.object({
    deck: flashcardDeckSummarySchema,
    enrolledCardCount: z.number().int().min(0),
    dueCardCount: z.number().int().min(0),
  });

export const createFlashcardRequestSchema: z.ZodType<CreateFlashcardRequest> =
  z.object({
    deckId: z.string().uuid().nullable().optional(),
    type: flashcardTypeSchema.optional(),
    sourceType: flashcardSourceTypeSchema.optional(),
    front: z.string().trim().min(1).max(5000),
    back: z.string().trim().min(1).max(5000),
    data: jsonRecordSchema.nullable().optional(),
    subjectId: z.string().uuid().nullable().optional(),
    curriculumNodeId: z.string().uuid().nullable().optional(),
    learningTargetId: z.string().uuid().nullable().optional(),
    courseLessonId: z.string().uuid().nullable().optional(),
    courseStepId: z.string().uuid().nullable().optional(),
    examNodeId: z.string().uuid().nullable().optional(),
  });

export const createFlashcardResponseSchema: z.ZodType<CreateFlashcardResponse> =
  z.object({
    card: flashcardCardSchema,
    state: studentFlashcardStateSchema,
  });

export const reviewFlashcardRequestSchema: z.ZodType<ReviewFlashcardRequest> =
  z.object({
    rating: flashcardReviewRatingSchema,
  });

export const reviewFlashcardResponseSchema: z.ZodType<ReviewFlashcardResponse> =
  z.object({
    card: flashcardCardSchema,
    state: studentFlashcardStateSchema,
  });

export function parseFlashcardDecksResponse(value: unknown) {
  return parseContract(
    flashcardDecksResponseSchema,
    value,
    "FlashcardDecksResponse",
  );
}

export function parseFlashcardDeckCardsResponse(value: unknown) {
  return parseContract(
    flashcardDeckCardsResponseSchema,
    value,
    "FlashcardDeckCardsResponse",
  );
}

export function parseDueFlashcardsResponse(value: unknown) {
  return parseContract(
    dueFlashcardsResponseSchema,
    value,
    "DueFlashcardsResponse",
  );
}

export function parseCreateFlashcardDeckRequest(value: unknown) {
  return parseContract(
    createFlashcardDeckRequestSchema,
    value,
    "CreateFlashcardDeckRequest",
  );
}

export function parseCreateFlashcardDeckResponse(value: unknown) {
  return parseContract(
    createFlashcardDeckResponseSchema,
    value,
    "CreateFlashcardDeckResponse",
  );
}

export function parseEnrollFlashcardDeckResponse(value: unknown) {
  return parseContract(
    enrollFlashcardDeckResponseSchema,
    value,
    "EnrollFlashcardDeckResponse",
  );
}

export function parseCreateFlashcardRequest(value: unknown) {
  return parseContract(
    createFlashcardRequestSchema,
    value,
    "CreateFlashcardRequest",
  );
}

export function parseCreateFlashcardResponse(value: unknown) {
  return parseContract(
    createFlashcardResponseSchema,
    value,
    "CreateFlashcardResponse",
  );
}

export function parseReviewFlashcardRequest(value: unknown) {
  return parseContract(
    reviewFlashcardRequestSchema,
    value,
    "ReviewFlashcardRequest",
  );
}

export function parseReviewFlashcardResponse(value: unknown) {
  return parseContract(
    reviewFlashcardResponseSchema,
    value,
    "ReviewFlashcardResponse",
  );
}
