import { parseContract, z } from "./shared.js";
import type { SessionType, StudySessionKind } from "./study.js";

export type StudyCommandMode =
  | "SCHOOL_TEST_PREP"
  | "TUTOR_REPLAY"
  | "BAC_TRAINING"
  | "LESSON_UNDERSTANDING"
  | "MEMORIZATION_REVIEW"
  | "SIMULATION"
  | "MISTAKE_REPAIR"
  | "LAB_EXPLORATION"
  | "LIBRARY_SEARCH";

export type StudyCommandSystemAction = "CONTINUE_SESSION";
export type StudyCommandStarterMode =
  | StudyCommandMode
  | StudyCommandSystemAction;
export type StudyCommandStarterTone =
  | "primary"
  | "cool"
  | "warning"
  | "danger"
  | "neutral";

export type StudyCommandStarter = {
  id: string;
  title: string;
  prompt: string;
  reason: string;
  tone: StudyCommandStarterTone;
  mode: StudyCommandStarterMode;
  href?: string;
};

export type StudyCommandProposalStep = {
  title: string;
  detail: string;
};

export type StudyCommandCreateSessionRequest = {
  title?: string;
  subjectCode: string;
  kind: Extract<StudySessionKind, "TOPIC_DRILL" | "MIXED_DRILL">;
  topicCodes?: string[];
  streamCodes?: string[];
  years?: number[];
  sessionTypes?: SessionType[];
  exerciseCount?: number;
  timingEnabled?: boolean;
};

export type StudyCommandProposalAction =
  | {
      kind: "CREATE_STUDY_SESSION";
      request: StudyCommandCreateSessionRequest;
    }
  | {
      kind: "OPEN_ROUTE";
      href: string;
    };

export type StudyCommandProposal = {
  mode: StudyCommandStarterMode;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  rationale: string;
  primaryHref: string;
  primaryLabel: string;
  primaryAction: StudyCommandProposalAction;
  steps: StudyCommandProposalStep[];
  fineTuneOptions: string[];
};

export type StudyCommandProposalRequest = {
  command: string;
};

export type StudyCommandProposalResponse = {
  proposal: StudyCommandProposal | null;
};

const studyCommandModeSchema: z.ZodType<StudyCommandMode> = z.enum([
  "SCHOOL_TEST_PREP",
  "TUTOR_REPLAY",
  "BAC_TRAINING",
  "LESSON_UNDERSTANDING",
  "MEMORIZATION_REVIEW",
  "SIMULATION",
  "MISTAKE_REPAIR",
  "LAB_EXPLORATION",
  "LIBRARY_SEARCH",
]);

const studyCommandStarterModeSchema: z.ZodType<StudyCommandStarterMode> =
  z.union([studyCommandModeSchema, z.literal("CONTINUE_SESSION")]);

const sessionTypeSchema: z.ZodType<SessionType> = z.enum(["NORMAL", "MAKEUP"]);

const studyCommandCreateSessionRequestSchema: z.ZodType<StudyCommandCreateSessionRequest> =
  z.object({
    title: z.string().optional(),
    subjectCode: z.string(),
    kind: z.enum(["TOPIC_DRILL", "MIXED_DRILL"]),
    topicCodes: z.array(z.string()).optional(),
    streamCodes: z.array(z.string()).optional(),
    years: z.array(z.number().int()).optional(),
    sessionTypes: z.array(sessionTypeSchema).optional(),
    exerciseCount: z.number().int().min(1).max(20).optional(),
    timingEnabled: z.boolean().optional(),
  });

const studyCommandProposalActionSchema: z.ZodType<StudyCommandProposalAction> =
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("CREATE_STUDY_SESSION"),
      request: studyCommandCreateSessionRequestSchema,
    }),
    z.object({
      kind: z.literal("OPEN_ROUTE"),
      href: z.string(),
    }),
  ]);

const studyCommandProposalStepSchema: z.ZodType<StudyCommandProposalStep> =
  z.object({
    title: z.string(),
    detail: z.string(),
  });

export const studyCommandProposalSchema: z.ZodType<StudyCommandProposal> =
  z.object({
    mode: studyCommandStarterModeSchema,
    title: z.string(),
    subtitle: z.string(),
    estimatedMinutes: z.number().int().min(1),
    rationale: z.string(),
    primaryHref: z.string(),
    primaryLabel: z.string(),
    primaryAction: studyCommandProposalActionSchema,
    steps: z.array(studyCommandProposalStepSchema),
    fineTuneOptions: z.array(z.string()),
  });

export const studyCommandProposalRequestSchema: z.ZodType<StudyCommandProposalRequest> =
  z.object({
    command: z.string(),
  });

export const studyCommandProposalResponseSchema: z.ZodType<StudyCommandProposalResponse> =
  z.object({
    proposal: studyCommandProposalSchema.nullable(),
  });

export function parseStudyCommandProposalRequest(value: unknown) {
  return parseContract(
    studyCommandProposalRequestSchema,
    value,
    "StudyCommandProposalRequest",
  );
}

export function parseStudyCommandProposalResponse(value: unknown) {
  return parseContract(
    studyCommandProposalResponseSchema,
    value,
    "StudyCommandProposalResponse",
  );
}
