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

export type MathProbabilityCellValue = string | number;

export type MathProbabilityTreeNode = {
  id: string;
  label: string;
  edgeLabel?: string;
  probability?: MathProbabilityCellValue | null;
  answerCell?: {
    rowId: string;
    columnId: string;
  };
  children?: MathProbabilityTreeNode[];
};

export type MathProbabilityTableColumn = {
  id: string;
  label: string;
  unit?: string;
};

export type MathProbabilityTableRow = {
  id: string;
  label: string;
  cells: Record<string, MathProbabilityCellValue | null>;
};

export type MathProbabilityExpectedCell = {
  rowId: string;
  columnId: string;
  expectedValue: MathProbabilityCellValue;
  tolerance?: number;
  acceptedText?: string[];
};

export type MathProbabilityAnswerCell = {
  rowId: string;
  columnId: string;
  value: MathProbabilityCellValue | null;
};

export type MathProbabilityPreset = {
  id: string;
  title: string;
  subtitle: string;
  bacContext: string;
  sourceHint?: string;
  tree?: {
    title: string;
    direction?: "ltr" | "rtl";
    root: MathProbabilityTreeNode;
  };
  table: {
    title: string;
    columns: MathProbabilityTableColumn[];
    rows: MathProbabilityTableRow[];
  };
  expectedCells: MathProbabilityExpectedCell[];
  prompt: {
    title: string;
    task: string;
    requiredConclusionKeywords?: string[];
    scaffoldPhrases?: string[];
  };
};

export type MathProbabilityWorkbenchResult = {
  tool: "math-probability-workbench";
  missionId: string | null;
  presetId: string;
  answerCells: MathProbabilityAnswerCell[];
  conclusion: string;
  evaluation?: Record<string, unknown>;
};

export type MathSequenceCellValue = string | number;

export type MathSequenceTableColumn = {
  id: string;
  label: string;
  unit?: string;
};

export type MathSequenceTableRow = {
  id: string;
  label: string;
  cells: Record<string, MathSequenceCellValue | null>;
};

export type MathSequenceExpectedCell = {
  rowId: string;
  columnId: string;
  expectedValue: MathSequenceCellValue;
  tolerance?: number;
  acceptedText?: string[];
};

export type MathSequenceAnswerCell = {
  rowId: string;
  columnId: string;
  value: MathSequenceCellValue | null;
};

export type MathSequenceObservationItem = {
  id: string;
  label: string;
  detail?: string;
  kind?: "term" | "variation" | "bound" | "transform" | "limit" | "distractor";
};

export type MathSequencesPreset = {
  id: string;
  title: string;
  subtitle: string;
  bacContext: string;
  sourceHint?: string;
  definition: {
    sequenceName: string;
    formulaLabel: string;
    description: string;
    fixedPoint?: number;
  };
  table: {
    title: string;
    columns: MathSequenceTableColumn[];
    rows: MathSequenceTableRow[];
  };
  expectedCells: MathSequenceExpectedCell[];
  observationItems: MathSequenceObservationItem[];
  prompt: {
    title: string;
    task: string;
    requiredObservationIds: string[];
    requiredConclusionKeywords?: string[];
    scaffoldPhrases?: string[];
  };
};

export type MathSequencesWorkbenchResult = {
  tool: "math-sequences-workbench";
  missionId: string | null;
  presetId: string;
  answerCells: MathSequenceAnswerCell[];
  selectedObservationIds: string[];
  conclusion: string;
  evaluation?: Record<string, unknown>;
};

export type MathGeometryComplexCellValue = string | number;

export type MathGeometryComplexPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  affixLabel: string;
};

export type MathGeometryComplexTableColumn = {
  id: string;
  label: string;
};

export type MathGeometryComplexTableRow = {
  id: string;
  label: string;
  cells: Record<string, MathGeometryComplexCellValue | null>;
};

export type MathGeometryComplexExpectedCell = {
  rowId: string;
  columnId: string;
  expectedValue: MathGeometryComplexCellValue;
  tolerance?: number;
  acceptedText?: string[];
};

export type MathGeometryComplexAnswerCell = {
  rowId: string;
  columnId: string;
  value: MathGeometryComplexCellValue | null;
};

export type MathGeometryComplexObservationItem = {
  id: string;
  label: string;
  detail?: string;
  kind?: "modulus" | "argument" | "distance" | "vector" | "shape" | "distractor";
};

export type MathGeometryComplexPreset = {
  id: string;
  title: string;
  subtitle: string;
  bacContext: string;
  sourceHint?: string;
  plane: {
    title: string;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    points: MathGeometryComplexPoint[];
  };
  table: {
    title: string;
    columns: MathGeometryComplexTableColumn[];
    rows: MathGeometryComplexTableRow[];
  };
  expectedCells: MathGeometryComplexExpectedCell[];
  observationItems: MathGeometryComplexObservationItem[];
  prompt: {
    title: string;
    task: string;
    requiredObservationIds: string[];
    requiredConclusionKeywords?: string[];
    scaffoldPhrases?: string[];
  };
};

export type MathGeometryComplexWorkbenchResult = {
  tool: "math-geometry-complex-plane";
  missionId: string | null;
  presetId: string;
  answerCells: MathGeometryComplexAnswerCell[];
  selectedObservationIds: string[];
  conclusion: string;
  evaluation?: Record<string, unknown>;
};

export type StructuredLabCellValue = string | number;

export type StructuredLabTableColumn = {
  id: string;
  label: string;
  unit?: string;
};

export type StructuredLabTableRow = {
  id: string;
  label: string;
  cells: Record<string, StructuredLabCellValue | null>;
};

export type StructuredLabExpectedCell = {
  rowId: string;
  columnId: string;
  expectedValue: StructuredLabCellValue;
  tolerance?: number;
  acceptedText?: string[];
};

export type StructuredLabAnswerCell = {
  rowId: string;
  columnId: string;
  value: StructuredLabCellValue | null;
};

export type StructuredLabGraphPoint = {
  x: number;
  y: number;
  label?: string;
};

export type StructuredLabGraphSeries = {
  id: string;
  title: string;
  kind: "line" | "scatter" | "bar";
  points: StructuredLabGraphPoint[];
};

export type StructuredLabDiagramTarget = {
  id: string;
  label: string;
  x: number;
  y: number;
  expectedLabel: string;
  acceptedLabels?: string[];
};

export type StructuredLabMeasurementPrompt = {
  id: string;
  label: string;
  unitHint?: string;
};

export type StructuredLabExpectedMeasurement = {
  id: string;
  expected: {
    value: number;
    unit: string;
  };
  tolerance?: number;
  acceptedUnits?: string[];
};

export type StructuredLabMeasurementAnswer = {
  id: string;
  value: number | null;
  unit: string;
};

export type StructuredLabLabelAnswer = {
  targetId: string;
  label: string;
};

export type StructuredLabObservationItem = {
  id: string;
  label: string;
  detail?: string;
  kind?: string;
};

export type StructuredLabSourceDocument = {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
};

export type StructuredLabWorkbenchPreset = {
  id: string;
  title: string;
  subtitle: string;
  bacContext: string;
  sourceHint?: string;
  instrument: {
    subjectLabel: string;
    title: string;
    iconKind?: "graph" | "circuit" | "mechanics" | "chemistry" | "technical";
  };
  sourceDocuments?: StructuredLabSourceDocument[];
  table?: {
    title: string;
    columns: StructuredLabTableColumn[];
    rows: StructuredLabTableRow[];
  };
  graph?: {
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
    series: StructuredLabGraphSeries[];
  };
  diagram?: {
    title: string;
    description: string;
    targets: StructuredLabDiagramTarget[];
  };
  measurements?: StructuredLabMeasurementPrompt[];
  expectedCells?: StructuredLabExpectedCell[];
  expectedMeasurements?: StructuredLabExpectedMeasurement[];
  observationItems: StructuredLabObservationItem[];
  prompt: {
    title: string;
    task: string;
    requiredObservationIds: string[];
    requiredConclusionKeywords?: string[];
    scaffoldPhrases?: string[];
  };
};

export type StructuredLabWorkbenchResult = {
  tool: string;
  missionId: string | null;
  presetId: string;
  answerCells: StructuredLabAnswerCell[];
  measurements: StructuredLabMeasurementAnswer[];
  labels: StructuredLabLabelAnswer[];
  graphPoints: StructuredLabGraphPoint[];
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

const mathProbabilityCellValueSchema = z.union([z.string(), z.number()]);

export const mathProbabilityTreeNodeSchema: z.ZodType<MathProbabilityTreeNode> =
  z.lazy(() =>
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      edgeLabel: z.string().min(1).optional(),
      probability: mathProbabilityCellValueSchema.nullable().optional(),
      answerCell: z
        .object({
          rowId: z.string().min(1),
          columnId: z.string().min(1),
        })
        .optional(),
      children: z.array(mathProbabilityTreeNodeSchema).optional(),
    }),
  );

export const mathProbabilityTableColumnSchema: z.ZodType<MathProbabilityTableColumn> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    unit: z.string().min(1).optional(),
  });

export const mathProbabilityTableRowSchema: z.ZodType<MathProbabilityTableRow> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    cells: z.record(z.string(), mathProbabilityCellValueSchema.nullable()),
  });

export const mathProbabilityExpectedCellSchema: z.ZodType<MathProbabilityExpectedCell> =
  z.object({
    rowId: z.string().min(1),
    columnId: z.string().min(1),
    expectedValue: mathProbabilityCellValueSchema,
    tolerance: z.number().nonnegative().optional(),
    acceptedText: z.array(z.string().min(1)).optional(),
  });

export const mathProbabilityAnswerCellSchema: z.ZodType<MathProbabilityAnswerCell> =
  z.object({
    rowId: z.string().min(1),
    columnId: z.string().min(1),
    value: mathProbabilityCellValueSchema.nullable(),
  });

export const mathProbabilityPresetSchema: z.ZodType<MathProbabilityPreset> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    bacContext: z.string().min(1),
    sourceHint: z.string().min(1).optional(),
    tree: z
      .object({
        title: z.string().min(1),
        direction: z.enum(["ltr", "rtl"]).optional(),
        root: mathProbabilityTreeNodeSchema,
      })
      .optional(),
    table: z.object({
      title: z.string().min(1),
      columns: z.array(mathProbabilityTableColumnSchema),
      rows: z.array(mathProbabilityTableRowSchema),
    }),
    expectedCells: z.array(mathProbabilityExpectedCellSchema),
    prompt: z.object({
      title: z.string().min(1),
      task: z.string().min(1),
      requiredConclusionKeywords: z.array(z.string().min(1)).optional(),
      scaffoldPhrases: z.array(z.string().min(1)).optional(),
    }),
  });

export const mathProbabilityWorkbenchResultSchema: z.ZodType<MathProbabilityWorkbenchResult> =
  z.object({
    tool: z.literal("math-probability-workbench"),
    missionId: z.string().min(1).nullable(),
    presetId: z.string().min(1),
    answerCells: z.array(mathProbabilityAnswerCellSchema),
    conclusion: z.string(),
    evaluation: jsonRecordSchema.optional(),
  });

const mathSequenceCellValueSchema = z.union([z.string(), z.number()]);

export const mathSequenceTableColumnSchema: z.ZodType<MathSequenceTableColumn> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    unit: z.string().min(1).optional(),
  });

export const mathSequenceTableRowSchema: z.ZodType<MathSequenceTableRow> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    cells: z.record(z.string(), mathSequenceCellValueSchema.nullable()),
  });

export const mathSequenceExpectedCellSchema: z.ZodType<MathSequenceExpectedCell> =
  z.object({
    rowId: z.string().min(1),
    columnId: z.string().min(1),
    expectedValue: mathSequenceCellValueSchema,
    tolerance: z.number().nonnegative().optional(),
    acceptedText: z.array(z.string().min(1)).optional(),
  });

export const mathSequenceAnswerCellSchema: z.ZodType<MathSequenceAnswerCell> =
  z.object({
    rowId: z.string().min(1),
    columnId: z.string().min(1),
    value: mathSequenceCellValueSchema.nullable(),
  });

export const mathSequenceObservationItemSchema: z.ZodType<MathSequenceObservationItem> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    detail: z.string().min(1).optional(),
    kind: z
      .enum(["term", "variation", "bound", "transform", "limit", "distractor"])
      .optional(),
  });

export const mathSequencesPresetSchema: z.ZodType<MathSequencesPreset> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    bacContext: z.string().min(1),
    sourceHint: z.string().min(1).optional(),
    definition: z.object({
      sequenceName: z.string().min(1),
      formulaLabel: z.string().min(1),
      description: z.string().min(1),
      fixedPoint: z.number().optional(),
    }),
    table: z.object({
      title: z.string().min(1),
      columns: z.array(mathSequenceTableColumnSchema),
      rows: z.array(mathSequenceTableRowSchema),
    }),
    expectedCells: z.array(mathSequenceExpectedCellSchema),
    observationItems: z.array(mathSequenceObservationItemSchema),
    prompt: z.object({
      title: z.string().min(1),
      task: z.string().min(1),
      requiredObservationIds: z.array(z.string().min(1)),
      requiredConclusionKeywords: z.array(z.string().min(1)).optional(),
      scaffoldPhrases: z.array(z.string().min(1)).optional(),
    }),
  });

export const mathSequencesWorkbenchResultSchema: z.ZodType<MathSequencesWorkbenchResult> =
  z.object({
    tool: z.literal("math-sequences-workbench"),
    missionId: z.string().min(1).nullable(),
    presetId: z.string().min(1),
    answerCells: z.array(mathSequenceAnswerCellSchema),
    selectedObservationIds: z.array(z.string().min(1)),
    conclusion: z.string(),
    evaluation: jsonRecordSchema.optional(),
  });

const mathGeometryComplexCellValueSchema = z.union([z.string(), z.number()]);

export const mathGeometryComplexPointSchema: z.ZodType<MathGeometryComplexPoint> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    x: z.number(),
    y: z.number(),
    affixLabel: z.string().min(1),
  });

export const mathGeometryComplexTableColumnSchema: z.ZodType<MathGeometryComplexTableColumn> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
  });

export const mathGeometryComplexTableRowSchema: z.ZodType<MathGeometryComplexTableRow> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    cells: z.record(z.string(), mathGeometryComplexCellValueSchema.nullable()),
  });

export const mathGeometryComplexExpectedCellSchema: z.ZodType<MathGeometryComplexExpectedCell> =
  z.object({
    rowId: z.string().min(1),
    columnId: z.string().min(1),
    expectedValue: mathGeometryComplexCellValueSchema,
    tolerance: z.number().nonnegative().optional(),
    acceptedText: z.array(z.string().min(1)).optional(),
  });

export const mathGeometryComplexAnswerCellSchema: z.ZodType<MathGeometryComplexAnswerCell> =
  z.object({
    rowId: z.string().min(1),
    columnId: z.string().min(1),
    value: mathGeometryComplexCellValueSchema.nullable(),
  });

export const mathGeometryComplexObservationItemSchema: z.ZodType<MathGeometryComplexObservationItem> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    detail: z.string().min(1).optional(),
    kind: z
      .enum(["modulus", "argument", "distance", "vector", "shape", "distractor"])
      .optional(),
  });

export const mathGeometryComplexPresetSchema: z.ZodType<MathGeometryComplexPreset> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    bacContext: z.string().min(1),
    sourceHint: z.string().min(1).optional(),
    plane: z.object({
      title: z.string().min(1),
      xMin: z.number(),
      xMax: z.number(),
      yMin: z.number(),
      yMax: z.number(),
      points: z.array(mathGeometryComplexPointSchema),
    }),
    table: z.object({
      title: z.string().min(1),
      columns: z.array(mathGeometryComplexTableColumnSchema),
      rows: z.array(mathGeometryComplexTableRowSchema),
    }),
    expectedCells: z.array(mathGeometryComplexExpectedCellSchema),
    observationItems: z.array(mathGeometryComplexObservationItemSchema),
    prompt: z.object({
      title: z.string().min(1),
      task: z.string().min(1),
      requiredObservationIds: z.array(z.string().min(1)),
      requiredConclusionKeywords: z.array(z.string().min(1)).optional(),
      scaffoldPhrases: z.array(z.string().min(1)).optional(),
    }),
  });

export const mathGeometryComplexWorkbenchResultSchema: z.ZodType<MathGeometryComplexWorkbenchResult> =
  z.object({
    tool: z.literal("math-geometry-complex-plane"),
    missionId: z.string().min(1).nullable(),
    presetId: z.string().min(1),
    answerCells: z.array(mathGeometryComplexAnswerCellSchema),
    selectedObservationIds: z.array(z.string().min(1)),
    conclusion: z.string(),
    evaluation: jsonRecordSchema.optional(),
  });

const structuredLabCellValueSchema = z.union([z.string(), z.number()]);

export const structuredLabTableColumnSchema: z.ZodType<StructuredLabTableColumn> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    unit: z.string().min(1).optional(),
  });

export const structuredLabTableRowSchema: z.ZodType<StructuredLabTableRow> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    cells: z.record(z.string(), structuredLabCellValueSchema.nullable()),
  });

export const structuredLabExpectedCellSchema: z.ZodType<StructuredLabExpectedCell> =
  z.object({
    rowId: z.string().min(1),
    columnId: z.string().min(1),
    expectedValue: structuredLabCellValueSchema,
    tolerance: z.number().nonnegative().optional(),
    acceptedText: z.array(z.string().min(1)).optional(),
  });

export const structuredLabAnswerCellSchema: z.ZodType<StructuredLabAnswerCell> =
  z.object({
    rowId: z.string().min(1),
    columnId: z.string().min(1),
    value: structuredLabCellValueSchema.nullable(),
  });

export const structuredLabGraphPointSchema: z.ZodType<StructuredLabGraphPoint> =
  z.object({
    x: z.number(),
    y: z.number(),
    label: z.string().min(1).optional(),
  });

export const structuredLabGraphSeriesSchema: z.ZodType<StructuredLabGraphSeries> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    kind: z.enum(["line", "scatter", "bar"]),
    points: z.array(structuredLabGraphPointSchema),
  });

export const structuredLabDiagramTargetSchema: z.ZodType<StructuredLabDiagramTarget> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    x: z.number(),
    y: z.number(),
    expectedLabel: z.string().min(1),
    acceptedLabels: z.array(z.string().min(1)).optional(),
  });

export const structuredLabMeasurementPromptSchema: z.ZodType<StructuredLabMeasurementPrompt> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    unitHint: z.string().min(1).optional(),
  });

export const structuredLabExpectedMeasurementSchema: z.ZodType<StructuredLabExpectedMeasurement> =
  z.object({
    id: z.string().min(1),
    expected: z.object({
      value: z.number(),
      unit: z.string().min(1),
    }),
    tolerance: z.number().nonnegative().optional(),
    acceptedUnits: z.array(z.string().min(1)).optional(),
  });

export const structuredLabMeasurementAnswerSchema: z.ZodType<StructuredLabMeasurementAnswer> =
  z.object({
    id: z.string().min(1),
    value: z.number().nullable(),
    unit: z.string(),
  });

export const structuredLabLabelAnswerSchema: z.ZodType<StructuredLabLabelAnswer> =
  z.object({
    targetId: z.string().min(1),
    label: z.string(),
  });

export const structuredLabObservationItemSchema: z.ZodType<StructuredLabObservationItem> =
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    detail: z.string().min(1).optional(),
    kind: z.string().min(1).optional(),
  });

export const structuredLabSourceDocumentSchema: z.ZodType<StructuredLabSourceDocument> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1).optional(),
    bullets: z.array(z.string().min(1)).optional(),
  });

export const structuredLabWorkbenchPresetSchema: z.ZodType<StructuredLabWorkbenchPreset> =
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    bacContext: z.string().min(1),
    sourceHint: z.string().min(1).optional(),
    instrument: z.object({
      subjectLabel: z.string().min(1),
      title: z.string().min(1),
      iconKind: z
        .enum(["graph", "circuit", "mechanics", "chemistry", "technical"])
        .optional(),
    }),
    sourceDocuments: z.array(structuredLabSourceDocumentSchema).optional(),
    table: z
      .object({
        title: z.string().min(1),
        columns: z.array(structuredLabTableColumnSchema),
        rows: z.array(structuredLabTableRowSchema),
      })
      .optional(),
    graph: z
      .object({
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
        series: z.array(structuredLabGraphSeriesSchema),
      })
      .optional(),
    diagram: z
      .object({
        title: z.string().min(1),
        description: z.string().min(1),
        targets: z.array(structuredLabDiagramTargetSchema),
      })
      .optional(),
    measurements: z.array(structuredLabMeasurementPromptSchema).optional(),
    expectedCells: z.array(structuredLabExpectedCellSchema).optional(),
    expectedMeasurements: z
      .array(structuredLabExpectedMeasurementSchema)
      .optional(),
    observationItems: z.array(structuredLabObservationItemSchema),
    prompt: z.object({
      title: z.string().min(1),
      task: z.string().min(1),
      requiredObservationIds: z.array(z.string().min(1)),
      requiredConclusionKeywords: z.array(z.string().min(1)).optional(),
      scaffoldPhrases: z.array(z.string().min(1)).optional(),
    }),
  });

export const structuredLabWorkbenchResultSchema: z.ZodType<StructuredLabWorkbenchResult> =
  z.object({
    tool: z.string().min(1),
    missionId: z.string().min(1).nullable(),
    presetId: z.string().min(1),
    answerCells: z.array(structuredLabAnswerCellSchema),
    measurements: z.array(structuredLabMeasurementAnswerSchema),
    labels: z.array(structuredLabLabelAnswerSchema),
    graphPoints: z.array(structuredLabGraphPointSchema),
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

export function parseMathProbabilityPreset(value: unknown) {
  return parseContract(
    mathProbabilityPresetSchema,
    value,
    "MathProbabilityPreset",
  );
}

export function parseMathProbabilityWorkbenchResult(value: unknown) {
  return parseContract(
    mathProbabilityWorkbenchResultSchema,
    value,
    "MathProbabilityWorkbenchResult",
  );
}

export function parseMathSequencesPreset(value: unknown) {
  return parseContract(
    mathSequencesPresetSchema,
    value,
    "MathSequencesPreset",
  );
}

export function parseMathSequencesWorkbenchResult(value: unknown) {
  return parseContract(
    mathSequencesWorkbenchResultSchema,
    value,
    "MathSequencesWorkbenchResult",
  );
}

export function parseMathGeometryComplexPreset(value: unknown) {
  return parseContract(
    mathGeometryComplexPresetSchema,
    value,
    "MathGeometryComplexPreset",
  );
}

export function parseMathGeometryComplexWorkbenchResult(value: unknown) {
  return parseContract(
    mathGeometryComplexWorkbenchResultSchema,
    value,
    "MathGeometryComplexWorkbenchResult",
  );
}

export function parseStructuredLabWorkbenchPreset(value: unknown) {
  return parseContract(
    structuredLabWorkbenchPresetSchema,
    value,
    "StructuredLabWorkbenchPreset",
  );
}

export function parseStructuredLabWorkbenchResult(value: unknown) {
  return parseContract(
    structuredLabWorkbenchResultSchema,
    value,
    "StructuredLabWorkbenchResult",
  );
}
