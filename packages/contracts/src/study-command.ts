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

export type StudyCommandClarification = {
  question: string;
  options: string[];
};

export type StudyCommandCreateSessionRequest = {
  title?: string;
  subjectCode: string;
  kind: Extract<StudySessionKind, "TOPIC_DRILL" | "MIXED_DRILL">;
  topicCodes?: string[];
  streamCodes?: string[];
  years?: number[];
  sessionTypes?: SessionType[];
  search?: string;
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
  availability?: {
    status: "READY" | "NEEDS_CONTENT" | "UNAVAILABLE";
    matchingExerciseCount?: number;
    message?: string;
  };
  clarification?: StudyCommandClarification;
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

export type StudyCommandAcceptRequest = {
  command: string;
};

export type StudyCommandAcceptResponse =
  | {
      kind: "CREATED_STUDY_SESSION";
      sessionId: string;
      href: string;
      proposal: StudyCommandProposal;
    }
  | {
      kind: "OPEN_ROUTE";
      href: string;
      proposal: StudyCommandProposal;
      message?: string;
    }
  | {
      kind: "NO_PROPOSAL";
      message: string;
    };

export type StudyCommandStartersResponse = {
  data: StudyCommandStarter[];
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

const studyCommandStarterToneSchema: z.ZodType<StudyCommandStarterTone> =
  z.enum(["primary", "cool", "warning", "danger", "neutral"]);

const studyCommandStarterSchema: z.ZodType<StudyCommandStarter> = z.object({
  id: z.string(),
  title: z.string(),
  prompt: z.string(),
  reason: z.string(),
  tone: studyCommandStarterToneSchema,
  mode: studyCommandStarterModeSchema,
  href: z.string().optional(),
});

const studyCommandCreateSessionRequestSchema: z.ZodType<StudyCommandCreateSessionRequest> =
  z.object({
    title: z.string().optional(),
    subjectCode: z.string(),
    kind: z.enum(["TOPIC_DRILL", "MIXED_DRILL"]),
    topicCodes: z.array(z.string()).optional(),
    streamCodes: z.array(z.string()).optional(),
    years: z.array(z.number().int()).optional(),
    sessionTypes: z.array(sessionTypeSchema).optional(),
    search: z.string().optional(),
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

const studyCommandClarificationSchema: z.ZodType<StudyCommandClarification> =
  z.object({
    question: z.string(),
    options: z.array(z.string()),
  });

export const studyCommandProposalSchema: z.ZodType<StudyCommandProposal> =
  z.object({
    mode: studyCommandStarterModeSchema,
    title: z.string(),
    subtitle: z.string(),
    estimatedMinutes: z.number().int().min(1),
    rationale: z.string(),
    availability: z
      .object({
        status: z.enum(["READY", "NEEDS_CONTENT", "UNAVAILABLE"]),
        matchingExerciseCount: z.number().int().nonnegative().optional(),
        message: z.string().optional(),
      })
      .optional(),
    clarification: studyCommandClarificationSchema.optional(),
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

export const studyCommandAcceptRequestSchema: z.ZodType<StudyCommandAcceptRequest> =
  z.object({
    command: z.string(),
  });

export const studyCommandAcceptResponseSchema: z.ZodType<StudyCommandAcceptResponse> =
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("CREATED_STUDY_SESSION"),
      sessionId: z.string(),
      href: z.string(),
      proposal: studyCommandProposalSchema,
    }),
    z.object({
      kind: z.literal("OPEN_ROUTE"),
      href: z.string(),
      proposal: studyCommandProposalSchema,
      message: z.string().optional(),
    }),
    z.object({
      kind: z.literal("NO_PROPOSAL"),
      message: z.string(),
    }),
  ]);

export const studyCommandStartersResponseSchema: z.ZodType<StudyCommandStartersResponse> =
  z.object({
    data: z.array(studyCommandStarterSchema),
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

export function parseStudyCommandAcceptRequest(value: unknown) {
  return parseContract(
    studyCommandAcceptRequestSchema,
    value,
    "StudyCommandAcceptRequest",
  );
}

export function parseStudyCommandAcceptResponse(value: unknown) {
  return parseContract(
    studyCommandAcceptResponseSchema,
    value,
    "StudyCommandAcceptResponse",
  );
}

export function parseStudyCommandStartersResponse(value: unknown) {
  return parseContract(
    studyCommandStartersResponseSchema,
    value,
    "StudyCommandStartersResponse",
  );
}
