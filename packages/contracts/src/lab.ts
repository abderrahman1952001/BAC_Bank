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

export type SvtDocumentWorkbenchDocumentKind =
  | "text"
  | "table"
  | "graph"
  | "diagram";

export type SvtDocumentWorkbenchTableColumn = {
  id: string;
  label: string;
};

export type SvtDocumentWorkbenchTableRow = {
  id: string;
  label?: string;
  cells: Record<string, string | number>;
};

export type SvtDocumentWorkbenchGraphPoint = {
  x: number;
  y: number;
  label?: string;
};

export type SvtDocumentWorkbenchGraphSeries = {
  id: string;
  title: string;
  kind: "line" | "scatter" | "bar";
  points: SvtDocumentWorkbenchGraphPoint[];
};

export type SvtDocumentWorkbenchDocumentBlock =
  | {
      type: "text";
      title?: string;
      body: string;
    }
  | {
      type: "table";
      title?: string;
      columns: SvtDocumentWorkbenchTableColumn[];
      rows: SvtDocumentWorkbenchTableRow[];
    }
  | {
      type: "graph";
      title?: string;
      xAxis: {
        label: string;
        unit?: string;
      };
      yAxis: {
        label: string;
        unit?: string;
      };
      series: SvtDocumentWorkbenchGraphSeries[];
    }
  | {
      type: "diagram";
      title?: string;
      description: string;
      labels?: string[];
    };

export type SvtDocumentWorkbenchSourceDocument = {
  id: string;
  title: string;
  kind: SvtDocumentWorkbenchDocumentKind;
  sourceLabel?: string;
  blocks: SvtDocumentWorkbenchDocumentBlock[];
};

export type SvtDocumentWorkbenchEvidenceItem = {
  id: string;
  documentId: string;
  label: string;
  detail?: string;
  keywords?: string[];
};

export type SvtDocumentWorkbenchPreset = {
  id: string;
  title: string;
  subtitle: string;
  bacContext: string;
  sourceDocuments: SvtDocumentWorkbenchSourceDocument[];
  evidenceItems: SvtDocumentWorkbenchEvidenceItem[];
  prompt: {
    title: string;
    task: string;
    requiredEvidenceIds: string[];
    requiredConclusionKeywords?: string[];
    scaffoldPhrases?: string[];
  };
};

export type SvtDocumentWorkbenchResult = {
  tool: "svt-document-workbench";
  missionId: string | null;
  presetId: string;
  selectedEvidenceIds: string[];
  conclusion: string;
  evaluation?: Record<string, unknown>;
};

export type SvtExperimentalGraphTableColumn = {
  id: string;
  label: string;
  unit?: string;
};

export type SvtExperimentalGraphTableRow = {
  id: string;
  label: string;
  cells: Record<string, string | number>;
};

export type SvtExperimentalGraphPoint = {
  x: number;
  y: number;
  label?: string;
};

export type SvtExperimentalGraphSeries = {
  id: string;
  title: string;
  kind: "line" | "scatter" | "bar";
  points: SvtExperimentalGraphPoint[];
};

export type SvtExperimentalExpectedReading = {
  id: string;
  label: string;
  source: "graph" | "table";
  seriesId?: string;
  rowId?: string;
  columnId?: string;
  x?: number;
  expectedValue?: number;
  tolerance?: number;
  unit?: string;
};

export type SvtExperimentalObservationItem = {
  id: string;
  label: string;
  detail?: string;
  kind?: "trend" | "comparison" | "mechanism" | "distractor";
};

export type SvtExperimentalGraphTablePreset = {
  id: string;
  title: string;
  subtitle: string;
  bacContext: string;
  sourceHint?: string;
  protocol: {
    title: string;
    steps: string[];
  };
  table: {
    title: string;
    columns: SvtExperimentalGraphTableColumn[];
    rows: SvtExperimentalGraphTableRow[];
  };
  graph: {
    title: string;
    xAxis: {
      label: string;
      unit?: string;
      min?: number;
      max?: number;
    };
    yAxis: {
      label: string;
      unit?: string;
      min?: number;
      max?: number;
    };
    series: SvtExperimentalGraphSeries[];
  };
  expectedReadings: SvtExperimentalExpectedReading[];
  observationItems: SvtExperimentalObservationItem[];
  prompt: {
    title: string;
    task: string;
    requiredObservationIds: string[];
    requiredConclusionKeywords?: string[];
    scaffoldPhrases?: string[];
  };
};

export type SvtExperimentalReadingAnswer = {
  id: string;
  value: number | null;
};

export type SvtExperimentalGraphTableResult = {
  tool: "svt-experimental-graph-table";
  missionId: string | null;
  presetId: string;
  readings: SvtExperimentalReadingAnswer[];
  selectedObservationIds: string[];
  conclusion: string;
  evaluation?: Record<string, unknown>;
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

const svtDocumentWorkbenchDocumentKindSchema: z.ZodType<SvtDocumentWorkbenchDocumentKind> =
  z.enum(["text", "table", "graph", "diagram"]);

const svtDocumentWorkbenchCellValueSchema = z.union([z.string(), z.number()]);

export const svtDocumentWorkbenchTableColumnSchema: z.ZodType<SvtDocumentWorkbenchTableColumn> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
  });

export const svtDocumentWorkbenchTableRowSchema: z.ZodType<SvtDocumentWorkbenchTableRow> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1).optional(),
    cells: z.record(z.string(), svtDocumentWorkbenchCellValueSchema),
  });

export const svtDocumentWorkbenchGraphPointSchema: z.ZodType<SvtDocumentWorkbenchGraphPoint> =
  z.object({
    x: z.number(),
    y: z.number(),
    label: z.string().min(1).optional(),
  });

export const svtDocumentWorkbenchGraphSeriesSchema: z.ZodType<SvtDocumentWorkbenchGraphSeries> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    kind: z.enum(["line", "scatter", "bar"]),
    points: z.array(svtDocumentWorkbenchGraphPointSchema),
  });

export const svtDocumentWorkbenchDocumentBlockSchema: z.ZodType<SvtDocumentWorkbenchDocumentBlock> =
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("text"),
      title: z.string().min(1).optional(),
      body: z.string().min(1),
    }),
    z.object({
      type: z.literal("table"),
      title: z.string().min(1).optional(),
      columns: z.array(svtDocumentWorkbenchTableColumnSchema),
      rows: z.array(svtDocumentWorkbenchTableRowSchema),
    }),
    z.object({
      type: z.literal("graph"),
      title: z.string().min(1).optional(),
      xAxis: z.object({
        label: z.string().min(1),
        unit: z.string().min(1).optional(),
      }),
      yAxis: z.object({
        label: z.string().min(1),
        unit: z.string().min(1).optional(),
      }),
      series: z.array(svtDocumentWorkbenchGraphSeriesSchema),
    }),
    z.object({
      type: z.literal("diagram"),
      title: z.string().min(1).optional(),
      description: z.string().min(1),
      labels: z.array(z.string().min(1)).optional(),
    }),
  ]);

export const svtDocumentWorkbenchSourceDocumentSchema: z.ZodType<SvtDocumentWorkbenchSourceDocument> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    kind: svtDocumentWorkbenchDocumentKindSchema,
    sourceLabel: z.string().min(1).optional(),
    blocks: z.array(svtDocumentWorkbenchDocumentBlockSchema),
  });

export const svtDocumentWorkbenchEvidenceItemSchema: z.ZodType<SvtDocumentWorkbenchEvidenceItem> =
  z.object({
    id: z.string().min(1),
    documentId: z.string().min(1),
    label: z.string().min(1),
    detail: z.string().min(1).optional(),
    keywords: z.array(z.string().min(1)).optional(),
  });

export const svtDocumentWorkbenchPresetSchema: z.ZodType<SvtDocumentWorkbenchPreset> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    bacContext: z.string().min(1),
    sourceDocuments: z.array(svtDocumentWorkbenchSourceDocumentSchema),
    evidenceItems: z.array(svtDocumentWorkbenchEvidenceItemSchema),
    prompt: z.object({
      title: z.string().min(1),
      task: z.string().min(1),
      requiredEvidenceIds: z.array(z.string().min(1)),
      requiredConclusionKeywords: z.array(z.string().min(1)).optional(),
      scaffoldPhrases: z.array(z.string().min(1)).optional(),
    }),
  });

export const svtDocumentWorkbenchResultSchema: z.ZodType<SvtDocumentWorkbenchResult> =
  z.object({
    tool: z.literal("svt-document-workbench"),
    missionId: z.string().min(1).nullable(),
    presetId: z.string().min(1),
    selectedEvidenceIds: z.array(z.string().min(1)),
    conclusion: z.string(),
    evaluation: jsonRecordSchema.optional(),
  });

const svtExperimentalCellValueSchema = z.union([z.string(), z.number()]);

export const svtExperimentalGraphTableColumnSchema: z.ZodType<SvtExperimentalGraphTableColumn> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    unit: z.string().min(1).optional(),
  });

export const svtExperimentalGraphTableRowSchema: z.ZodType<SvtExperimentalGraphTableRow> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    cells: z.record(z.string(), svtExperimentalCellValueSchema),
  });

export const svtExperimentalGraphPointSchema: z.ZodType<SvtExperimentalGraphPoint> =
  z.object({
    x: z.number(),
    y: z.number(),
    label: z.string().min(1).optional(),
  });

export const svtExperimentalGraphSeriesSchema: z.ZodType<SvtExperimentalGraphSeries> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    kind: z.enum(["line", "scatter", "bar"]),
    points: z.array(svtExperimentalGraphPointSchema),
  });

export const svtExperimentalExpectedReadingSchema: z.ZodType<SvtExperimentalExpectedReading> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    source: z.enum(["graph", "table"]),
    seriesId: z.string().min(1).optional(),
    rowId: z.string().min(1).optional(),
    columnId: z.string().min(1).optional(),
    x: z.number().optional(),
    expectedValue: z.number().optional(),
    tolerance: z.number().nonnegative().optional(),
    unit: z.string().min(1).optional(),
  });

export const svtExperimentalObservationItemSchema: z.ZodType<SvtExperimentalObservationItem> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    detail: z.string().min(1).optional(),
    kind: z.enum(["trend", "comparison", "mechanism", "distractor"]).optional(),
  });

export const svtExperimentalGraphTablePresetSchema: z.ZodType<SvtExperimentalGraphTablePreset> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    bacContext: z.string().min(1),
    sourceHint: z.string().min(1).optional(),
    protocol: z.object({
      title: z.string().min(1),
      steps: z.array(z.string().min(1)),
    }),
    table: z.object({
      title: z.string().min(1),
      columns: z.array(svtExperimentalGraphTableColumnSchema),
      rows: z.array(svtExperimentalGraphTableRowSchema),
    }),
    graph: z.object({
      title: z.string().min(1),
      xAxis: z.object({
        label: z.string().min(1),
        unit: z.string().min(1).optional(),
        min: z.number().optional(),
        max: z.number().optional(),
      }),
      yAxis: z.object({
        label: z.string().min(1),
        unit: z.string().min(1).optional(),
        min: z.number().optional(),
        max: z.number().optional(),
      }),
      series: z.array(svtExperimentalGraphSeriesSchema),
    }),
    expectedReadings: z.array(svtExperimentalExpectedReadingSchema),
    observationItems: z.array(svtExperimentalObservationItemSchema),
    prompt: z.object({
      title: z.string().min(1),
      task: z.string().min(1),
      requiredObservationIds: z.array(z.string().min(1)),
      requiredConclusionKeywords: z.array(z.string().min(1)).optional(),
      scaffoldPhrases: z.array(z.string().min(1)).optional(),
    }),
  });

export const svtExperimentalReadingAnswerSchema: z.ZodType<SvtExperimentalReadingAnswer> =
  z.object({
    id: z.string().min(1),
    value: z.number().nullable(),
  });

export const svtExperimentalGraphTableResultSchema: z.ZodType<SvtExperimentalGraphTableResult> =
  z.object({
    tool: z.literal("svt-experimental-graph-table"),
    missionId: z.string().min(1).nullable(),
    presetId: z.string().min(1),
    readings: z.array(svtExperimentalReadingAnswerSchema),
    selectedObservationIds: z.array(z.string().min(1)),
    conclusion: z.string(),
    evaluation: jsonRecordSchema.optional(),
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

export function parseSvtDocumentWorkbenchPreset(value: unknown) {
  return parseContract(
    svtDocumentWorkbenchPresetSchema,
    value,
    "SvtDocumentWorkbenchPreset",
  );
}

export function parseSvtDocumentWorkbenchResult(value: unknown) {
  return parseContract(
    svtDocumentWorkbenchResultSchema,
    value,
    "SvtDocumentWorkbenchResult",
  );
}

export function parseSvtExperimentalGraphTablePreset(value: unknown) {
  return parseContract(
    svtExperimentalGraphTablePresetSchema,
    value,
    "SvtExperimentalGraphTablePreset",
  );
}

export function parseSvtExperimentalGraphTableResult(value: unknown) {
  return parseContract(
    svtExperimentalGraphTableResultSchema,
    value,
    "SvtExperimentalGraphTableResult",
  );
}
