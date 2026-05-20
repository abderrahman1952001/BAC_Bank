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
export type StudyCommandAiLanguage =
  | "ARABIC"
  | "DARIJA"
  | "FRENCH"
  | "ARABIZI"
  | "MIXED"
  | "UNKNOWN";
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

export type StudyCommandHistoryEventKind = "PROPOSED" | "ACCEPTED";

export type StudyCommandAiRouteTelemetry = {
  status: "SKIPPED" | "SUCCESS" | "FAILED" | "SERVICE_ERROR" | "NOT_ATTEMPTED";
  provider: string | null;
  model: string | null;
  skippedReason: string | null;
  failureCode: string | null;
  confidence: number | null;
};

export type StudyCommandAiInterpretation = {
  mode: StudyCommandMode;
  confidence: number;
  subjectHint: string | null;
  topicHint: string | null;
  deadline: string | null;
  durationMinutes: number | null;
  language: StudyCommandAiLanguage;
  missingFields: string[];
  studentFacingSummary: string;
};

export type StudyCommandHistoryEvent = {
  id: string;
  kind: StudyCommandHistoryEventKind;
  occurredAt: string;
  mode: StudyCommandStarterMode | null;
  title: string | null;
  subjectCode: string | null;
  topicCodes: string[];
  availabilityStatus:
    | NonNullable<StudyCommandProposal["availability"]>["status"]
    | null;
  actionKind: StudyCommandProposalAction["kind"] | null;
  resultKind: StudyCommandAcceptResponse["kind"] | null;
  clarificationRequired: boolean;
  aiRoute: StudyCommandAiRouteTelemetry;
};

export type StudyCommandHistoryResponse = {
  data: StudyCommandHistoryEvent[];
};

export type StudyCommandDiagnosticsBucket = {
  key: string;
  count: number;
};

export type StudyCommandMissingContentSignal = {
  key: string;
  mode: StudyCommandStarterMode | null;
  subjectCode: string | null;
  topicCodes: string[];
  count: number;
  lastSeenAt: string;
};

export type StudyCommandDiagnosticsResponse = {
  generatedAt: string;
  windowDays: number;
  sampledEventCount: number;
  summary: {
    proposals: number;
    accepted: number;
    createdStudySessions: number;
    openedRoutes: number;
    noProposal: number;
    clarifications: number;
  };
  modes: StudyCommandDiagnosticsBucket[];
  availability: StudyCommandDiagnosticsBucket[];
  actions: StudyCommandDiagnosticsBucket[];
  aiRouting: StudyCommandDiagnosticsBucket[];
  topSubjects: StudyCommandDiagnosticsBucket[];
  topTopics: StudyCommandDiagnosticsBucket[];
  missingContentSignals: StudyCommandMissingContentSignal[];
};

export const studyCommandModeSchema: z.ZodType<StudyCommandMode> = z.enum([
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

const studyCommandAiLanguageSchema: z.ZodType<StudyCommandAiLanguage> = z.enum([
  "ARABIC",
  "DARIJA",
  "FRENCH",
  "ARABIZI",
  "MIXED",
  "UNKNOWN",
]);

const studyCommandHistoryEventKindSchema: z.ZodType<StudyCommandHistoryEventKind> =
  z.enum(["PROPOSED", "ACCEPTED"]);

const studyCommandAiRouteTelemetrySchema: z.ZodType<StudyCommandAiRouteTelemetry> =
  z.object({
    status: z.enum([
      "SKIPPED",
      "SUCCESS",
      "FAILED",
      "SERVICE_ERROR",
      "NOT_ATTEMPTED",
    ]),
    provider: z.string().nullable(),
    model: z.string().nullable(),
    skippedReason: z.string().nullable(),
    failureCode: z.string().nullable(),
    confidence: z.number().min(0).max(1).nullable(),
  });

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

export const studyCommandAiInterpretationSchema: z.ZodType<StudyCommandAiInterpretation> =
  z.object({
    mode: studyCommandModeSchema,
    confidence: z.number().min(0).max(1),
    subjectHint: z.string().trim().min(1).max(120).nullable(),
    topicHint: z.string().trim().min(1).max(160).nullable(),
    deadline: z.string().trim().min(1).max(80).nullable(),
    durationMinutes: z.number().int().min(5).max(180).nullable(),
    language: studyCommandAiLanguageSchema,
    missingFields: z.array(z.string().trim().min(1).max(80)).max(3),
    studentFacingSummary: z.string().trim().min(1).max(240),
  });

const studyCommandHistoryEventSchema: z.ZodType<StudyCommandHistoryEvent> =
  z.object({
    id: z.string(),
    kind: studyCommandHistoryEventKindSchema,
    occurredAt: z.string(),
    mode: studyCommandStarterModeSchema.nullable(),
    title: z.string().nullable(),
    subjectCode: z.string().nullable(),
    topicCodes: z.array(z.string()),
    availabilityStatus: z
      .enum(["READY", "NEEDS_CONTENT", "UNAVAILABLE"])
      .nullable(),
    actionKind: z.enum(["CREATE_STUDY_SESSION", "OPEN_ROUTE"]).nullable(),
    resultKind: z
      .enum(["CREATED_STUDY_SESSION", "OPEN_ROUTE", "NO_PROPOSAL"])
      .nullable(),
    clarificationRequired: z.boolean(),
    aiRoute: studyCommandAiRouteTelemetrySchema,
  });

export const studyCommandHistoryResponseSchema: z.ZodType<StudyCommandHistoryResponse> =
  z.object({
    data: z.array(studyCommandHistoryEventSchema),
  });

const studyCommandDiagnosticsBucketSchema: z.ZodType<StudyCommandDiagnosticsBucket> =
  z.object({
    key: z.string(),
    count: z.number().int().min(0),
  });

const studyCommandMissingContentSignalSchema: z.ZodType<StudyCommandMissingContentSignal> =
  z.object({
    key: z.string(),
    mode: studyCommandStarterModeSchema.nullable(),
    subjectCode: z.string().nullable(),
    topicCodes: z.array(z.string()),
    count: z.number().int().min(0),
    lastSeenAt: z.string(),
  });

export const studyCommandDiagnosticsResponseSchema: z.ZodType<StudyCommandDiagnosticsResponse> =
  z.object({
    generatedAt: z.string(),
    windowDays: z.number().int().min(1),
    sampledEventCount: z.number().int().min(0),
    summary: z.object({
      proposals: z.number().int().min(0),
      accepted: z.number().int().min(0),
      createdStudySessions: z.number().int().min(0),
      openedRoutes: z.number().int().min(0),
      noProposal: z.number().int().min(0),
      clarifications: z.number().int().min(0),
    }),
    modes: z.array(studyCommandDiagnosticsBucketSchema),
    availability: z.array(studyCommandDiagnosticsBucketSchema),
    actions: z.array(studyCommandDiagnosticsBucketSchema),
    aiRouting: z.array(studyCommandDiagnosticsBucketSchema),
    topSubjects: z.array(studyCommandDiagnosticsBucketSchema),
    topTopics: z.array(studyCommandDiagnosticsBucketSchema),
    missingContentSignals: z.array(studyCommandMissingContentSignalSchema),
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

export function parseStudyCommandAiInterpretation(value: unknown) {
  return parseContract(
    studyCommandAiInterpretationSchema,
    value,
    "StudyCommandAiInterpretation",
  );
}

export function parseStudyCommandHistoryResponse(value: unknown) {
  return parseContract(
    studyCommandHistoryResponseSchema,
    value,
    "StudyCommandHistoryResponse",
  );
}

export function parseStudyCommandDiagnosticsResponse(value: unknown) {
  return parseContract(
    studyCommandDiagnosticsResponseSchema,
    value,
    "StudyCommandDiagnosticsResponse",
  );
}
