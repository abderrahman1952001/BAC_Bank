import { parseContract, z } from "./shared.js";

export type CourseTopicStatus =
  | "READY"
  | "IN_PROGRESS"
  | "NEEDS_REVIEW"
  | "COMPLETED";

export type CourseConceptRole =
  | "FIELD_INTRO"
  | "UNIT_INTRO"
  | "LESSON"
  | "FIELD_SYNTHESIS";

export type CourseConceptStepType =
  | "HOOK"
  | "EXPLAIN"
  | "INSPECT"
  | "RULE"
  | "WORKED_EXAMPLE"
  | "COMMON_TRAP"
  | "QUICK_CHECK"
  | "EXAM_LENS"
  | "TAKEAWAY";

export type CourseConceptVisualKind =
  | "DIAGRAM"
  | "SEQUENCE"
  | "GRAPH"
  | "IMAGE"
  | "COMPARISON";

export type CourseConceptVisualAssetStatus =
  | "PENDING"
  | "GENERATED"
  | "APPROVED"
  | "NEEDS_REVISION";

export type CourseConceptVisualAssetReviewStatus =
  | "UNREVIEWED"
  | "APPROVED"
  | "NEEDS_REVISION";

export type CourseConceptInteractionKind =
  | "TAP_REVEAL"
  | "ORDERING"
  | "SIMPLE_CHOICE"
  | "HOTSPOT"
  | "DRAG_MATCH"
  | "FILL_BLANK";

export type CourseDepthPortalKind =
  | "EXPERIMENT"
  | "MECHANISM"
  | "ADVANCED_CONTEXT"
  | "HISTORICAL_NOTE"
  | "EXAM_EXTENSION";

export type CourseConceptVisual = {
  kind: CourseConceptVisualKind;
  title: string;
  description: string;
  prompt: string;
  altText: string;
  asset?: CourseConceptVisualAsset | null;
};

export type CourseConceptVisualAsset = {
  status: CourseConceptVisualAssetStatus;
  path: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  model: string;
  generatedAt: string | null;
  reviewStatus: CourseConceptVisualAssetReviewStatus;
};

export type CourseConceptInteraction = {
  kind: CourseConceptInteractionKind;
  prompt: string;
  items: string[];
  answer: string | null;
};

export type CourseExamLens = {
  bacSkill: string;
  prompt: string;
  trap: string;
};

export type CourseDepthPortal = {
  slug: string;
  kind: CourseDepthPortalKind;
  title: string;
  summary: string;
  body: string;
  estimatedMinutes: number;
};

export type CourseSubjectCard = {
  subject: {
    code: string;
    name: string;
  };
  title: string;
  description: string | null;
  progressPercent: number;
  unitCount: number;
  topicCount: number;
  completedTopicCount: number;
  continueTopicCode: string | null;
};

export type CourseSubjectCardsResponse = {
  data: CourseSubjectCard[];
};

export type CourseTopicSummary = {
  topicCode: string;
  slug: string;
  title: string;
  shortTitle: string;
  description: string | null;
  status: CourseTopicStatus;
  progressPercent: number;
  conceptCount: number;
};

export type CourseUnit = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  progressPercent: number;
  topics: CourseTopicSummary[];
};

export type CourseSubjectResponse = {
  subject: {
    code: string;
    name: string;
  };
  title: string;
  description: string | null;
  progressPercent: number;
  topicCount: number;
  completedTopicCount: number;
  continueTopicCode: string | null;
  units: CourseUnit[];
};

export type CourseConceptSummary = {
  conceptCode: string;
  slug: string;
  unitCode: string | null;
  role: CourseConceptRole;
  title: string;
  description: string | null;
};

export type CourseConceptStep = {
  id: string;
  type: CourseConceptStepType;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: CourseConceptVisual | null;
  interaction: CourseConceptInteraction | null;
  examLens: CourseExamLens | null;
};

export type CourseConceptQuiz = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type CourseTopicResponse = {
  subject: {
    code: string;
    name: string;
  };
  topic: {
    code: string;
    slug: string;
    title: string;
    shortTitle: string;
  };
  parentUnitTitle: string | null;
  description: string | null;
  progressPercent: number;
  status: CourseTopicStatus;
  concepts: CourseConceptSummary[];
};

export type CourseConceptResponse = {
  subject: {
    code: string;
    name: string;
  };
  topic: {
    code: string;
    slug: string;
    title: string;
    shortTitle: string;
  };
  concept: {
    conceptCode: string;
    slug: string;
    unitCode: string | null;
    role: CourseConceptRole;
    title: string;
    summary: string;
    estimatedMinutes: number;
  };
  navigation: {
    previousConceptSlug: string | null;
    nextConceptSlug: string | null;
  };
  steps: CourseConceptStep[];
  depthPortals: CourseDepthPortal[];
  quiz: CourseConceptQuiz;
};

export const courseTopicStatusSchema: z.ZodType<CourseTopicStatus> = z.enum([
  "READY",
  "IN_PROGRESS",
  "NEEDS_REVIEW",
  "COMPLETED",
]);

export const courseConceptRoleSchema: z.ZodType<CourseConceptRole> = z.enum([
  "FIELD_INTRO",
  "UNIT_INTRO",
  "LESSON",
  "FIELD_SYNTHESIS",
]);

export const courseConceptStepTypeSchema: z.ZodType<CourseConceptStepType> =
  z.enum([
    "HOOK",
    "EXPLAIN",
    "INSPECT",
    "RULE",
    "WORKED_EXAMPLE",
    "COMMON_TRAP",
    "QUICK_CHECK",
    "EXAM_LENS",
    "TAKEAWAY",
  ]);

export const courseConceptVisualSchema: z.ZodType<CourseConceptVisual> =
  z.object({
    kind: z.enum(["DIAGRAM", "SEQUENCE", "GRAPH", "IMAGE", "COMPARISON"]),
    title: z.string().min(1),
    description: z.string().min(1),
    prompt: z.string().min(1),
    altText: z.string().min(1),
    asset: z
      .object({
        status: z.enum(["PENDING", "GENERATED", "APPROVED", "NEEDS_REVISION"]),
        path: z.string().min(1),
        url: z.string().min(1),
        mimeType: z.string().min(1),
        width: z.number().int().min(1),
        height: z.number().int().min(1),
        model: z.string().min(1),
        generatedAt: z.string().min(1).nullable(),
        reviewStatus: z.enum(["UNREVIEWED", "APPROVED", "NEEDS_REVISION"]),
      })
      .nullable()
      .optional(),
  });

export const courseConceptInteractionSchema: z.ZodType<CourseConceptInteraction> =
  z.object({
    kind: z.enum([
      "TAP_REVEAL",
      "ORDERING",
      "SIMPLE_CHOICE",
      "HOTSPOT",
      "DRAG_MATCH",
      "FILL_BLANK",
    ]),
    prompt: z.string().min(1),
    items: z.array(z.string().min(1)),
    answer: z.string().min(1).nullable(),
  });

export const courseExamLensSchema: z.ZodType<CourseExamLens> = z.object({
  bacSkill: z.string().min(1),
  prompt: z.string().min(1),
  trap: z.string().min(1),
});

export const courseDepthPortalSchema: z.ZodType<CourseDepthPortal> = z.object({
  slug: z.string().min(1),
  kind: z.enum([
    "EXPERIMENT",
    "MECHANISM",
    "ADVANCED_CONTEXT",
    "HISTORICAL_NOTE",
    "EXAM_EXTENSION",
  ]),
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().min(1),
  estimatedMinutes: z.number().int().min(1),
});

const courseSubjectIdentitySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
});

const courseSubjectCardSchema: z.ZodType<CourseSubjectCard> = z.object({
  subject: courseSubjectIdentitySchema,
  title: z.string().min(1),
  description: z.string().nullable(),
  progressPercent: z.number().int().min(0).max(100),
  unitCount: z.number().int().min(0),
  topicCount: z.number().int().min(0),
  completedTopicCount: z.number().int().min(0),
  continueTopicCode: z.string().min(1).nullable(),
});

export const courseSubjectCardsResponseSchema: z.ZodType<CourseSubjectCardsResponse> =
  z.object({
    data: z.array(courseSubjectCardSchema),
  });

const courseTopicSummarySchema: z.ZodType<CourseTopicSummary> = z.object({
  topicCode: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  description: z.string().nullable(),
  status: courseTopicStatusSchema,
  progressPercent: z.number().int().min(0).max(100),
  conceptCount: z.number().int().min(0),
});

const courseUnitSchema: z.ZodType<CourseUnit> = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  progressPercent: z.number().int().min(0).max(100),
  topics: z.array(courseTopicSummarySchema),
});

export const courseSubjectResponseSchema: z.ZodType<CourseSubjectResponse> =
  z.object({
    subject: courseSubjectIdentitySchema,
    title: z.string().min(1),
    description: z.string().nullable(),
    progressPercent: z.number().int().min(0).max(100),
    topicCount: z.number().int().min(0),
    completedTopicCount: z.number().int().min(0),
    continueTopicCode: z.string().min(1).nullable(),
    units: z.array(courseUnitSchema),
  });

const courseConceptSummarySchema: z.ZodType<CourseConceptSummary> = z.object({
  conceptCode: z.string().min(1),
  slug: z.string().min(1),
  unitCode: z.string().min(1).nullable(),
  role: courseConceptRoleSchema,
  title: z.string().min(1),
  description: z.string().nullable(),
});

export const courseConceptStepSchema: z.ZodType<CourseConceptStep> = z.object({
  id: z.string().min(1),
  type: courseConceptStepTypeSchema,
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  bullets: z.array(z.string().min(1)),
  visual: courseConceptVisualSchema.nullable(),
  interaction: courseConceptInteractionSchema.nullable(),
  examLens: courseExamLensSchema.nullable(),
});

export const courseConceptQuizSchema: z.ZodType<CourseConceptQuiz> = z
  .object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correctIndex: z.number().int().min(0),
    explanation: z.string().min(1),
  })
  .refine((quiz) => quiz.correctIndex < quiz.options.length, {
    message: "correctIndex must point to an available option",
  });

export const courseTopicResponseSchema: z.ZodType<CourseTopicResponse> =
  z.object({
    subject: courseSubjectIdentitySchema,
    topic: z.object({
      code: z.string().min(1),
      slug: z.string().min(1),
      title: z.string().min(1),
      shortTitle: z.string().min(1),
    }),
    parentUnitTitle: z.string().nullable(),
    description: z.string().nullable(),
    progressPercent: z.number().int().min(0).max(100),
    status: courseTopicStatusSchema,
    concepts: z.array(courseConceptSummarySchema),
  });

export const courseConceptResponseSchema: z.ZodType<CourseConceptResponse> =
  z.object({
    subject: courseSubjectIdentitySchema,
    topic: z.object({
      code: z.string().min(1),
      slug: z.string().min(1),
      title: z.string().min(1),
      shortTitle: z.string().min(1),
    }),
    concept: z.object({
      conceptCode: z.string().min(1),
      slug: z.string().min(1),
      unitCode: z.string().min(1).nullable(),
      role: courseConceptRoleSchema,
      title: z.string().min(1),
      summary: z.string().min(1),
      estimatedMinutes: z.number().int().min(1),
    }),
    navigation: z.object({
      previousConceptSlug: z.string().min(1).nullable(),
      nextConceptSlug: z.string().min(1).nullable(),
    }),
    steps: z.array(courseConceptStepSchema).min(1),
    depthPortals: z.array(courseDepthPortalSchema),
    quiz: courseConceptQuizSchema,
  });

export function parseCourseSubjectCardsResponse(value: unknown) {
  return parseContract(
    courseSubjectCardsResponseSchema,
    value,
    "CourseSubjectCardsResponse",
  );
}

export function parseCourseSubjectResponse(value: unknown) {
  return parseContract(
    courseSubjectResponseSchema,
    value,
    "CourseSubjectResponse",
  );
}

export function parseCourseTopicResponse(value: unknown) {
  return parseContract(courseTopicResponseSchema, value, "CourseTopicResponse");
}

export function parseCourseConceptResponse(value: unknown) {
  return parseContract(
    courseConceptResponseSchema,
    value,
    "CourseConceptResponse",
  );
}
