import { jsonRecordSchema, parseContract, z } from "./shared.js";

export type LabToolStatus = "READY" | "DRAFT" | "HIDDEN";
export type LabMissionAttemptStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";

export type LabCodeName = {
  id: string;
  code: string;
  name: string;
  slug?: string | null;
};

export type LabToolSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: LabToolStatus;
  metadata: Record<string, unknown> | null;
  subject: {
    code: string;
    name: string;
  } | null;
  missionCount: number;
  completedMissionCount: number;
  inProgressMissionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type LabMissionAttempt = {
  id: string;
  missionId: string;
  status: LabMissionAttemptStatus;
  resultJson: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
};

export type LabMission = {
  id: string;
  toolId: string;
  title: string;
  goal: string;
  preset: Record<string, unknown> | null;
  exitCheck: Record<string, unknown> | null;
  orderIndex: number;
  curriculumNode: LabCodeName | null;
  learningTarget: LabCodeName | null;
  courseLesson: {
    id: string;
    title: string;
    slug: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type LabMissionItem = {
  mission: LabMission;
  latestAttempt: LabMissionAttempt | null;
  completedAttemptCount: number;
};

export type LabToolsResponse = {
  data: LabToolSummary[];
};

export type LabToolMissionsResponse = {
  tool: LabToolSummary;
  missions: LabMissionItem[];
};

export type StartLabMissionAttemptResponse = {
  attempt: LabMissionAttempt;
};

export type CompleteLabMissionAttemptRequest = {
  status: Exclude<LabMissionAttemptStatus, "IN_PROGRESS">;
  resultJson?: Record<string, unknown> | null;
};

export type CompleteLabMissionAttemptResponse = {
  attempt: LabMissionAttempt;
};

export const labToolStatusSchema: z.ZodType<LabToolStatus> = z.enum([
  "READY",
  "DRAFT",
  "HIDDEN",
]);

export const labMissionAttemptStatusSchema: z.ZodType<LabMissionAttemptStatus> =
  z.enum(["IN_PROGRESS", "COMPLETED", "FAILED"]);

export const labCodeNameSchema: z.ZodType<LabCodeName> = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1).nullable().optional(),
});

export const labToolSummarySchema: z.ZodType<LabToolSummary> = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  status: labToolStatusSchema,
  metadata: jsonRecordSchema.nullable(),
  subject: z
    .object({
      code: z.string().min(1),
      name: z.string().min(1),
    })
    .nullable(),
  missionCount: z.number().int().nonnegative(),
  completedMissionCount: z.number().int().nonnegative(),
  inProgressMissionCount: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const labMissionAttemptSchema: z.ZodType<LabMissionAttempt> = z.object({
  id: z.string().uuid(),
  missionId: z.string().uuid(),
  status: labMissionAttemptStatusSchema,
  resultJson: jsonRecordSchema.nullable(),
  startedAt: z.string().min(1),
  completedAt: z.string().min(1).nullable(),
});

export const labMissionSchema: z.ZodType<LabMission> = z.object({
  id: z.string().uuid(),
  toolId: z.string().uuid(),
  title: z.string().min(1),
  goal: z.string().min(1),
  preset: jsonRecordSchema.nullable(),
  exitCheck: jsonRecordSchema.nullable(),
  orderIndex: z.number().int().nonnegative(),
  curriculumNode: labCodeNameSchema.nullable(),
  learningTarget: labCodeNameSchema.nullable(),
  courseLesson: z
    .object({
      id: z.string().uuid(),
      title: z.string().min(1),
      slug: z.string().min(1),
    })
    .nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const labMissionItemSchema: z.ZodType<LabMissionItem> = z.object({
  mission: labMissionSchema,
  latestAttempt: labMissionAttemptSchema.nullable(),
  completedAttemptCount: z.number().int().nonnegative(),
});

export const labToolsResponseSchema: z.ZodType<LabToolsResponse> = z.object({
  data: z.array(labToolSummarySchema),
});

export const labToolMissionsResponseSchema: z.ZodType<LabToolMissionsResponse> =
  z.object({
    tool: labToolSummarySchema,
    missions: z.array(labMissionItemSchema),
  });

export const startLabMissionAttemptResponseSchema: z.ZodType<StartLabMissionAttemptResponse> =
  z.object({
    attempt: labMissionAttemptSchema,
  });

export const completeLabMissionAttemptRequestSchema: z.ZodType<CompleteLabMissionAttemptRequest> =
  z.object({
    status: z.enum(["COMPLETED", "FAILED"]),
    resultJson: jsonRecordSchema.nullable().optional(),
  });

export const completeLabMissionAttemptResponseSchema: z.ZodType<CompleteLabMissionAttemptResponse> =
  z.object({
    attempt: labMissionAttemptSchema,
  });

export function parseLabToolsResponse(value: unknown) {
  return parseContract(labToolsResponseSchema, value, "LabToolsResponse");
}

export function parseLabToolMissionsResponse(value: unknown) {
  return parseContract(
    labToolMissionsResponseSchema,
    value,
    "LabToolMissionsResponse",
  );
}

export function parseStartLabMissionAttemptResponse(value: unknown) {
  return parseContract(
    startLabMissionAttemptResponseSchema,
    value,
    "StartLabMissionAttemptResponse",
  );
}

export function parseCompleteLabMissionAttemptRequest(value: unknown) {
  return parseContract(
    completeLabMissionAttemptRequestSchema,
    value,
    "CompleteLabMissionAttemptRequest",
  );
}

export function parseCompleteLabMissionAttemptResponse(value: unknown) {
  return parseContract(
    completeLabMissionAttemptResponseSchema,
    value,
    "CompleteLabMissionAttemptResponse",
  );
}
