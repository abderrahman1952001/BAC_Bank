import {
  dateLikeSchema,
  jsonRecordSchema,
  parseContract,
  z,
} from "./shared.js";
import { billingPlanSchema, type BillingPlan } from "./billing.js";

export type AdminStatus = "draft" | "published";
export type AdminSession = "normal" | "rattrapage";
export type BlockType =
  | "paragraph"
  | "latex"
  | "image"
  | "code"
  | "heading"
  | "table"
  | "list"
  | "graph"
  | "tree";

export type ContentBlock = {
  id: string;
  type: BlockType;
  value: string;
  data?: Record<string, unknown> | null;
  meta?: {
    level?: number;
    caption?: string;
    language?: string;
  };
};

export type TopicOption = {
  code: string;
  name: string;
  parentCode: string | null;
  displayOrder: number;
  isSelectable: boolean;
  subject: {
    code: string;
    name: string;
  };
  streamCodes: string[];
};

export type AdminDashboardResponse = {
  totals: {
    exams: number;
    exercises: number;
    questions: number;
  };
  workflow: {
    exams: {
      draft: number;
      published: number;
    };
    exercises: {
      draft: number;
      published: number;
    };
    questions: {
      draft: number;
      published: number;
    };
  };
};

export type AdminCodeNameOption = {
  code: string;
  name: string;
};

export type AdminFiltersResponse = {
  subjects: AdminCodeNameOption[];
  streams: AdminCodeNameOption[];
  subjectFamilies: AdminCodeNameOption[];
  streamFamilies: AdminCodeNameOption[];
  years: number[];
  topics: TopicOption[];
};

export type AdminBillingFeeResponsibility = "MERCHANT";

export type AdminBillingSettings = {
  premium30DaysAmountDzd: number;
  premium30DaysDurationDays: number;
  premium90DaysAmountDzd: number;
  premium90DaysDurationDays: number;
  premiumBacSeasonAmountDzd: number;
  configuredBacSeasonEndsAt: string | null;
  effectiveBacSeasonEndsAt: string;
  checkoutFeeResponsibility: AdminBillingFeeResponsibility;
  persisted: boolean;
  updatedAt: string | null;
  updatedByUserId: string | null;
  updatedByEmail: string | null;
};

export type AdminBillingSettingsResponse = {
  settings: AdminBillingSettings;
  plans: BillingPlan[];
};

export type UpdateAdminBillingSettingsRequest = {
  premium30DaysAmountDzd: number;
  premium30DaysDurationDays: number;
  premium90DaysAmountDzd: number;
  premium90DaysDurationDays: number;
  premiumBacSeasonAmountDzd: number;
  configuredBacSeasonEndsAt: string | null;
};

export type AdminExam = {
  id: string;
  year: number;
  subject: string;
  stream: string;
  session: AdminSession;
  original_pdf_url: string | null;
  status: AdminStatus;
  exercise_count: number;
  question_count: number;
  created_at: string | Date;
  updated_at: string | Date;
};

export type AdminExamListResponse = {
  data: AdminExam[];
};

export type AdminBootstrapResponse = {
  imported_exams: number;
  imported_exercises: number;
  imported_questions: number;
  skipped_existing_exams: number;
  total_published_exams: number;
};

export type AdminExercise = {
  id: string;
  title: string | null;
  order_index: number;
  theme: string | null;
  difficulty: string | null;
  tags: string[];
  topics: AdminCodeNameOption[];
  status: AdminStatus;
  question_count?: number;
  created_at: string | Date;
  updated_at: string | Date;
};

export type AdminExamExercisesResponse = {
  exam: AdminExam;
  exercises: AdminExercise[];
};

export type QuestionNode = {
  id: string;
  title: string;
  parent_id: string | null;
  order_index: number;
  status: AdminStatus;
  points: number | null;
  topics: AdminCodeNameOption[];
  content_blocks: ContentBlock[];
  solution_blocks: ContentBlock[];
  hint_blocks: ContentBlock[] | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export type ExerciseEditorResponse = {
  exercise: {
    id: string;
    title: string | null;
    order_index: number;
    status: AdminStatus;
    theme: string | null;
    difficulty: string | null;
    tags: string[];
    topics: AdminCodeNameOption[];
    metadata: {
      year: number;
      session: AdminSession;
      subject: string;
      branch: string;
      points: number | null;
      context_blocks: ContentBlock[];
    };
    exam: AdminExam;
  };
  questions: QuestionNode[];
  validation_errors: string[];
};

const adminCodeNameOptionSchema = z.object({
  code: z.string(),
  name: z.string(),
});

export const adminStatusSchema: z.ZodType<AdminStatus> = z.enum([
  "draft",
  "published",
]);

export const adminSessionSchema: z.ZodType<AdminSession> = z.enum([
  "normal",
  "rattrapage",
]);

export const adminBlockTypeSchema: z.ZodType<BlockType> = z.enum([
  "paragraph",
  "latex",
  "image",
  "code",
  "heading",
  "table",
  "list",
  "graph",
  "tree",
]);

export const contentBlockSchema: z.ZodType<ContentBlock> = z.object({
  id: z.string(),
  type: adminBlockTypeSchema,
  value: z.string(),
  data: jsonRecordSchema.nullable().optional(),
  meta: z
    .object({
      level: z.number().optional(),
      caption: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
});

export const topicOptionSchema: z.ZodType<TopicOption> = z.object({
  code: z.string(),
  name: z.string(),
  parentCode: z.string().nullable(),
  displayOrder: z.number(),
  isSelectable: z.boolean(),
  subject: z.object({
    code: z.string(),
    name: z.string(),
  }),
  streamCodes: z.array(z.string()),
});

export const adminFiltersResponseSchema: z.ZodType<AdminFiltersResponse> =
  z.object({
    subjects: z.array(adminCodeNameOptionSchema),
    streams: z.array(adminCodeNameOptionSchema),
    subjectFamilies: z.array(adminCodeNameOptionSchema),
    streamFamilies: z.array(adminCodeNameOptionSchema),
    years: z.array(z.number()),
    topics: z.array(topicOptionSchema),
  });

export const adminBillingFeeResponsibilitySchema: z.ZodType<AdminBillingFeeResponsibility> =
  z.enum(["MERCHANT"]);

export const adminBillingSettingsSchema: z.ZodType<AdminBillingSettings> =
  z.object({
    premium30DaysAmountDzd: z.number().int().positive(),
    premium30DaysDurationDays: z.number().int().positive(),
    premium90DaysAmountDzd: z.number().int().positive(),
    premium90DaysDurationDays: z.number().int().positive(),
    premiumBacSeasonAmountDzd: z.number().int().positive(),
    configuredBacSeasonEndsAt: z.string().datetime().nullable(),
    effectiveBacSeasonEndsAt: z.string().datetime(),
    checkoutFeeResponsibility: adminBillingFeeResponsibilitySchema,
    persisted: z.boolean(),
    updatedAt: z.string().datetime().nullable(),
    updatedByUserId: z.string().nullable(),
    updatedByEmail: z.string().nullable(),
  });

export const adminBillingSettingsResponseSchema: z.ZodType<AdminBillingSettingsResponse> =
  z.object({
    settings: adminBillingSettingsSchema,
    plans: z.array(billingPlanSchema),
  });

export const updateAdminBillingSettingsRequestSchema: z.ZodType<UpdateAdminBillingSettingsRequest> =
  z.object({
    premium30DaysAmountDzd: z.number().int().positive(),
    premium30DaysDurationDays: z.number().int().positive(),
    premium90DaysAmountDzd: z.number().int().positive(),
    premium90DaysDurationDays: z.number().int().positive(),
    premiumBacSeasonAmountDzd: z.number().int().positive(),
    configuredBacSeasonEndsAt: z.string().datetime().nullable(),
  });

export const adminExamSchema: z.ZodType<AdminExam> = z.object({
  id: z.string(),
  year: z.number(),
  subject: z.string(),
  stream: z.string(),
  session: adminSessionSchema,
  original_pdf_url: z.string().nullable(),
  status: adminStatusSchema,
  exercise_count: z.number(),
  question_count: z.number(),
  created_at: dateLikeSchema,
  updated_at: dateLikeSchema,
});

export const adminExerciseSchema: z.ZodType<AdminExercise> = z.object({
  id: z.string(),
  title: z.string().nullable(),
  order_index: z.number(),
  theme: z.string().nullable(),
  difficulty: z.string().nullable(),
  tags: z.array(z.string()),
  topics: z.array(adminCodeNameOptionSchema),
  status: adminStatusSchema,
  question_count: z.number().optional(),
  created_at: dateLikeSchema,
  updated_at: dateLikeSchema,
});

export const questionNodeSchema: z.ZodType<QuestionNode> = z.object({
  id: z.string(),
  title: z.string(),
  parent_id: z.string().nullable(),
  order_index: z.number(),
  status: adminStatusSchema,
  points: z.number().nullable(),
  topics: z.array(adminCodeNameOptionSchema),
  content_blocks: z.array(contentBlockSchema),
  solution_blocks: z.array(contentBlockSchema),
  hint_blocks: z.array(contentBlockSchema).nullable(),
  created_at: dateLikeSchema,
  updated_at: dateLikeSchema,
});

export function parseAdminFiltersResponse(value: unknown) {
  return parseContract(
    adminFiltersResponseSchema,
    value,
    "AdminFiltersResponse",
  );
}

export function parseAdminBillingSettingsResponse(value: unknown) {
  return parseContract(
    adminBillingSettingsResponseSchema,
    value,
    "AdminBillingSettingsResponse",
  );
}

export function parseUpdateAdminBillingSettingsRequest(value: unknown) {
  return parseContract(
    updateAdminBillingSettingsRequestSchema,
    value,
    "UpdateAdminBillingSettingsRequest",
  );
}
