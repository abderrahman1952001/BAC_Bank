import { parseContract, z } from "./shared.js";

export type CourseTopicStatus =
  | "READY"
  | "IN_PROGRESS"
  | "NEEDS_REVIEW"
  | "COMPLETED";

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
  title: string;
  description: string | null;
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

export const courseTopicStatusSchema: z.ZodType<CourseTopicStatus> = z.enum([
  "READY",
  "IN_PROGRESS",
  "NEEDS_REVIEW",
  "COMPLETED",
]);

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
  title: z.string().min(1),
  description: z.string().nullable(),
});

export const courseTopicResponseSchema: z.ZodType<CourseTopicResponse> = z.object({
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
  return parseContract(
    courseTopicResponseSchema,
    value,
    "CourseTopicResponse",
  );
}
