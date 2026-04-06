import { parseContract, z } from "./shared.js";

export type SessionType = "NORMAL" | "MAKEUP";
export type PracticeStudyMode = "SOLVE" | "REVIEW";
export type PracticeSessionStatus = "CREATED" | "IN_PROGRESS" | "COMPLETED";
export type PublicationStatus = "DRAFT" | "PUBLISHED";
export type ExamVariantCode = "SUJET_1" | "SUJET_2";
export type ExamNodeType =
  | "EXERCISE"
  | "PART"
  | "QUESTION"
  | "SUBQUESTION"
  | "CONTEXT";
export type BlockRole =
  | "STEM"
  | "PROMPT"
  | "SOLUTION"
  | "HINT"
  | "RUBRIC"
  | "META";
export type BlockType =
  | "PARAGRAPH"
  | "LATEX"
  | "IMAGE"
  | "CODE"
  | "HEADING"
  | "LIST"
  | "TABLE"
  | "GRAPH"
  | "TREE";
export type MediaType = "IMAGE" | "FILE";

export type FiltersResponse = {
  streams: Array<{
    code: string;
    name: string;
    isDefault?: boolean;
    family?: {
      code: string;
      name: string;
    };
    subjectCodes: string[];
  }>;
  subjects: Array<{
    code: string;
    name: string;
    isDefault?: boolean;
    family?: {
      code: string;
      name: string;
    };
    streams: Array<{
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    }>;
    streamCodes: string[];
  }>;
  streamFamilies?: Array<{
    code: string;
    name: string;
    streams: Array<{
      code: string;
      name: string;
      isDefault: boolean;
    }>;
  }>;
  subjectFamilies?: Array<{
    code: string;
    name: string;
    subjects: Array<{
      code: string;
      name: string;
      isDefault: boolean;
    }>;
  }>;
  years: number[];
  topics: Array<{
    code: string;
    name: string;
    slug: string;
    parentCode: string | null;
    displayOrder: number;
    isSelectable: boolean;
    subject: {
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    };
    streamCodes: string[];
  }>;
  sessionTypes: SessionType[];
};

export type CatalogResponse = {
  streams: Array<{
    code: string;
    name: string;
    family?: {
      code: string;
      name: string;
    };
    subjects: Array<{
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
      years: Array<{
        year: number;
        sujets: Array<{
          examId: string;
          sujetNumber: 1 | 2;
          label: string;
          sessionType: SessionType;
          exerciseCount: number;
        }>;
      }>;
    }>;
  }>;
};

export type ExamHierarchyBlock = {
  id: string;
  role: BlockRole;
  orderIndex: number;
  blockType: BlockType;
  textValue: string | null;
  data: unknown;
  media: {
    id: string;
    url: string;
    type: MediaType;
    metadata: unknown;
  } | null;
};

export type ExamHierarchyNode = {
  id: string;
  nodeType: ExamNodeType;
  orderIndex: number;
  label: string | null;
  maxPoints: number | null;
  status: PublicationStatus;
  metadata: unknown;
  topics: Array<{
    code: string;
    name: string;
  }>;
  blocks: ExamHierarchyBlock[];
  children: ExamHierarchyNode[];
};

export type ExamResponse = {
  id: string;
  paperId: string;
  year: number;
  sessionType: SessionType;
  durationMinutes: number;
  officialSourceReference: string | null;
  stream: {
    code: string;
    name: string;
    family?: {
      code: string;
      name: string;
    };
  };
  subject: {
    code: string;
    name: string;
    family?: {
      code: string;
      name: string;
    };
  };
  selectedSujetNumber: 1 | 2 | null;
  selectedSujetLabel: string | null;
  availableSujets: Array<{
    sujetNumber: 1 | 2;
    label: string;
  }>;
  selectedVariantCode?: ExamVariantCode | null;
  hierarchy?: {
    variantId: string;
    variantCode: ExamVariantCode;
    title: string;
    status: PublicationStatus;
    nodeCount: number;
    exercises: ExamHierarchyNode[];
  };
  exerciseCount: number;
  exercises: Array<{
    id: string;
    orderIndex: number;
    title: string | null;
    totalPoints: number;
    questionCount: number;
  }>;
};

export type PracticeSessionProgress = {
  activeExerciseId: string | null;
  activeQuestionId: string | null;
  mode: PracticeStudyMode;
  questionStates: Array<{
    questionId: string;
    opened: boolean;
    completed: boolean;
    skipped: boolean;
    solutionViewed: boolean;
  }>;
  summary: {
    totalQuestionCount: number;
    completedQuestionCount: number;
    skippedQuestionCount: number;
    unansweredQuestionCount: number;
    solutionViewedCount: number;
  };
  updatedAt: string;
};

export type PracticeProgressSummary = PracticeSessionProgress["summary"];

export type PracticeSessionResponse = {
  id: string;
  title: string | null;
  status: PracticeSessionStatus;
  requestedExerciseCount: number;
  exerciseCount: number;
  filters: {
    years?: number[];
    streamCode?: string | null;
    streamCodes?: string[];
    subjectCode?: string | null;
    topicCodes?: string[];
    sessionTypes?: string[];
  } | null;
  progress: PracticeSessionProgress | null;
  createdAt: string;
  updatedAt: string;
  exercises: Array<{
    sessionOrder: number;
    id: string;
    orderIndex: number;
    title: string | null;
    totalPoints: number;
    questionCount: number;
    hierarchy: {
      exerciseNodeId: string;
      exerciseLabel: string | null;
      contextBlocks: ExamHierarchyBlock[];
      questions: Array<{
        id: string;
        orderIndex: number;
        label: string;
        points: number;
        depth: number;
        topics: Array<{
          code: string;
          name: string;
        }>;
        promptBlocks: ExamHierarchyBlock[];
        solutionBlocks: ExamHierarchyBlock[];
        hintBlocks: ExamHierarchyBlock[];
        rubricBlocks: ExamHierarchyBlock[];
      }>;
    };
    exam: {
      year: number;
      sessionType: SessionType;
      subject: {
        code: string;
        name: string;
        family?: {
          code: string;
          name: string;
        };
      };
      stream: {
        code: string;
        name: string;
        family?: {
          code: string;
          name: string;
        };
      };
    };
  }>;
};

export type SessionPreviewResponse = {
  subjectCode: string;
  streamCode: string | null;
  streamCodes: string[];
  years: number[];
  topicCodes: string[];
  sessionTypes: SessionType[];
  matchingExerciseCount: number;
  matchingSujetCount: number;
  sampleExercises: Array<{
    exerciseNodeId: string;
    orderIndex: number;
    title: string | null;
    questionCount: number;
    examId: string;
    year: number;
    stream: {
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    };
    subject: {
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    };
    sessionType: SessionType;
    sujetNumber: 1 | 2;
    sujetLabel: string;
  }>;
  matchingSujets: Array<{
    examId: string;
    year: number;
    stream: {
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    };
    subject: {
      code: string;
      name: string;
      family?: {
        code: string;
        name: string;
      };
    };
    sessionType: SessionType;
    sujetNumber: 1 | 2;
    sujetLabel: string;
    matchingExerciseCount: number;
  }>;
  yearsDistribution: Array<{
    year: number;
    matchingExerciseCount: number;
  }>;
  streamsDistribution: Array<{
    stream: {
      code: string;
      name: string;
    };
    matchingExerciseCount: number;
  }>;
  maxSelectableExercises: number;
};

export type CreateSessionResponse = {
  id: string;
};

export type UpdateSessionProgressResponse = {
  id: string;
  status: PracticeSessionStatus;
  progress: PracticeSessionProgress | null;
  updatedAt: string;
};

export type RecentPracticeSessionsResponse = {
  data: Array<{
    id: string;
    title: string | null;
    status: PracticeSessionStatus;
    requestedExerciseCount: number;
    exerciseCount: number;
    createdAt: string;
    updatedAt: string;
    progressSummary: PracticeProgressSummary | null;
  }>;
};

export type RecentExamActivitiesResponse = {
  data: Array<{
    id: string;
    examId: string;
    year: number;
    sessionType: SessionType;
    stream: {
      code: string;
      name: string;
    };
    subject: {
      code: string;
      name: string;
    };
    sujetNumber: 1 | 2;
    sujetLabel: string;
    totalQuestionCount: number;
    completedQuestionCount: number;
    openedQuestionCount: number;
    solutionViewedCount: number;
    createdAt: string;
    lastOpenedAt: string;
  }>;
};

export type UpsertExamActivityResponse = {
  id: string;
  lastOpenedAt: string;
};

export type UpsertExamActivityRequest = {
  sujetNumber: 1 | 2;
  totalQuestionCount?: number;
  completedQuestionCount?: number;
  openedQuestionCount?: number;
  solutionViewedCount?: number;
};

const familySchema = z.object({
  code: z.string(),
  name: z.string(),
});

const codeNameSchema = z.object({
  code: z.string(),
  name: z.string(),
});

const streamFamilyOptionSchema = z.object({
  code: z.string(),
  name: z.string(),
  isDefault: z.boolean().optional(),
});

const requiredDefaultOptionSchema = z.object({
  code: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
});

const streamOptionSchema = z.object({
  code: z.string(),
  name: z.string(),
  isDefault: z.boolean().optional(),
  family: familySchema.optional(),
  subjectCodes: z.array(z.string()),
});

const subjectOptionSchema = z.object({
  code: z.string(),
  name: z.string(),
  isDefault: z.boolean().optional(),
  family: familySchema.optional(),
  streams: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      family: familySchema.optional(),
    }),
  ),
  streamCodes: z.array(z.string()),
});

const topicOptionSchema = z.object({
  code: z.string(),
  name: z.string(),
  slug: z.string(),
  parentCode: z.string().nullable(),
  displayOrder: z.number(),
  isSelectable: z.boolean(),
  subject: z.object({
    code: z.string(),
    name: z.string(),
    family: familySchema.optional(),
  }),
  streamCodes: z.array(z.string()),
});

export const sessionTypeSchema: z.ZodType<SessionType> = z.enum([
  "NORMAL",
  "MAKEUP",
]);

export const practiceStudyModeSchema: z.ZodType<PracticeStudyMode> = z.enum([
  "SOLVE",
  "REVIEW",
]);

export const practiceSessionStatusSchema: z.ZodType<PracticeSessionStatus> =
  z.enum(["CREATED", "IN_PROGRESS", "COMPLETED"]);

export const publicationStatusSchema: z.ZodType<PublicationStatus> = z.enum([
  "DRAFT",
  "PUBLISHED",
]);

export const examVariantCodeSchema: z.ZodType<ExamVariantCode> = z.enum([
  "SUJET_1",
  "SUJET_2",
]);

export const examNodeTypeSchema: z.ZodType<ExamNodeType> = z.enum([
  "EXERCISE",
  "PART",
  "QUESTION",
  "SUBQUESTION",
  "CONTEXT",
]);

export const blockRoleSchema: z.ZodType<BlockRole> = z.enum([
  "STEM",
  "PROMPT",
  "SOLUTION",
  "HINT",
  "RUBRIC",
  "META",
]);

export const blockTypeSchema: z.ZodType<BlockType> = z.enum([
  "PARAGRAPH",
  "LATEX",
  "IMAGE",
  "CODE",
  "HEADING",
  "LIST",
  "TABLE",
  "GRAPH",
  "TREE",
]);

export const mediaTypeSchema: z.ZodType<MediaType> = z.enum([
  "IMAGE",
  "FILE",
]);

export const filtersResponseSchema: z.ZodType<FiltersResponse> = z.object({
  streams: z.array(streamOptionSchema),
  subjects: z.array(subjectOptionSchema),
  streamFamilies: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        streams: z.array(requiredDefaultOptionSchema),
      }),
    )
    .optional(),
  subjectFamilies: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        subjects: z.array(requiredDefaultOptionSchema),
      }),
    )
    .optional(),
  years: z.array(z.number()),
  topics: z.array(topicOptionSchema),
  sessionTypes: z.array(sessionTypeSchema),
});

export const catalogResponseSchema: z.ZodType<CatalogResponse> = z.object({
  streams: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      family: familySchema.optional(),
      subjects: z.array(
        z.object({
          code: z.string(),
          name: z.string(),
          family: familySchema.optional(),
          years: z.array(
            z.object({
              year: z.number(),
              sujets: z.array(
                z.object({
                  examId: z.string(),
                  sujetNumber: z.union([z.literal(1), z.literal(2)]),
                  label: z.string(),
                  sessionType: sessionTypeSchema,
                  exerciseCount: z.number(),
                }),
              ),
            }),
          ),
        }),
      ),
    }),
  ),
});

export const examHierarchyBlockSchema: z.ZodType<ExamHierarchyBlock> = z.object(
  {
    id: z.string(),
    role: blockRoleSchema,
    orderIndex: z.number(),
    blockType: blockTypeSchema,
    textValue: z.string().nullable(),
    data: z.unknown(),
    media: z
      .object({
        id: z.string(),
        url: z.string(),
        type: mediaTypeSchema,
        metadata: z.unknown(),
      })
      .nullable(),
  },
);

export const examHierarchyNodeSchema: z.ZodType<ExamHierarchyNode> = z.lazy(
  () =>
    z.object({
      id: z.string(),
      nodeType: examNodeTypeSchema,
      orderIndex: z.number(),
      label: z.string().nullable(),
      maxPoints: z.number().nullable(),
      status: publicationStatusSchema,
      metadata: z.unknown(),
      topics: z.array(codeNameSchema),
      blocks: z.array(examHierarchyBlockSchema),
      children: z.array(examHierarchyNodeSchema),
    }),
);

export const examResponseSchema: z.ZodType<ExamResponse> = z.object({
  id: z.string(),
  paperId: z.string(),
  year: z.number(),
  sessionType: sessionTypeSchema,
  durationMinutes: z.number(),
  officialSourceReference: z.string().nullable(),
  stream: z.object({
    code: z.string(),
    name: z.string(),
    family: familySchema.optional(),
  }),
  subject: z.object({
    code: z.string(),
    name: z.string(),
    family: familySchema.optional(),
  }),
  selectedSujetNumber: z.union([z.literal(1), z.literal(2)]).nullable(),
  selectedSujetLabel: z.string().nullable(),
  availableSujets: z.array(
    z.object({
      sujetNumber: z.union([z.literal(1), z.literal(2)]),
      label: z.string(),
    }),
  ),
  selectedVariantCode: examVariantCodeSchema.nullable().optional(),
  hierarchy: z
    .object({
      variantId: z.string(),
      variantCode: examVariantCodeSchema,
      title: z.string(),
      status: publicationStatusSchema,
      nodeCount: z.number(),
      exercises: z.array(examHierarchyNodeSchema),
    })
    .optional(),
  exerciseCount: z.number(),
  exercises: z.array(
    z.object({
      id: z.string(),
      orderIndex: z.number(),
      title: z.string().nullable(),
      totalPoints: z.number(),
      questionCount: z.number(),
    }),
  ),
});

const practiceProgressSummarySchema: z.ZodType<PracticeProgressSummary> =
  z.object({
    totalQuestionCount: z.number(),
    completedQuestionCount: z.number(),
    skippedQuestionCount: z.number(),
    unansweredQuestionCount: z.number(),
    solutionViewedCount: z.number(),
  });

export const practiceSessionProgressSchema: z.ZodType<PracticeSessionProgress> =
  z.object({
    activeExerciseId: z.string().nullable(),
    activeQuestionId: z.string().nullable(),
    mode: practiceStudyModeSchema,
    questionStates: z.array(
      z.object({
        questionId: z.string(),
        opened: z.boolean(),
        completed: z.boolean(),
        skipped: z.boolean(),
        solutionViewed: z.boolean(),
      }),
    ),
    summary: practiceProgressSummarySchema,
    updatedAt: z.string(),
  });

export const sessionPreviewResponseSchema: z.ZodType<SessionPreviewResponse> =
  z.object({
    subjectCode: z.string(),
    streamCode: z.string().nullable(),
    streamCodes: z.array(z.string()),
    years: z.array(z.number()),
    topicCodes: z.array(z.string()),
    sessionTypes: z.array(sessionTypeSchema),
    matchingExerciseCount: z.number(),
    matchingSujetCount: z.number(),
    sampleExercises: z.array(
      z.object({
        exerciseNodeId: z.string(),
        orderIndex: z.number(),
        title: z.string().nullable(),
        questionCount: z.number(),
        examId: z.string(),
        year: z.number(),
        stream: z.object({
          code: z.string(),
          name: z.string(),
          family: familySchema.optional(),
        }),
        subject: z.object({
          code: z.string(),
          name: z.string(),
          family: familySchema.optional(),
        }),
        sessionType: sessionTypeSchema,
        sujetNumber: z.union([z.literal(1), z.literal(2)]),
        sujetLabel: z.string(),
      }),
    ),
    matchingSujets: z.array(
      z.object({
        examId: z.string(),
        year: z.number(),
        stream: z.object({
          code: z.string(),
          name: z.string(),
          family: familySchema.optional(),
        }),
        subject: z.object({
          code: z.string(),
          name: z.string(),
          family: familySchema.optional(),
        }),
        sessionType: sessionTypeSchema,
        sujetNumber: z.union([z.literal(1), z.literal(2)]),
        sujetLabel: z.string(),
        matchingExerciseCount: z.number(),
      }),
    ),
    yearsDistribution: z.array(
      z.object({
        year: z.number(),
        matchingExerciseCount: z.number(),
      }),
    ),
    streamsDistribution: z.array(
      z.object({
        stream: z.object({
          code: z.string(),
          name: z.string(),
        }),
        matchingExerciseCount: z.number(),
      }),
    ),
    maxSelectableExercises: z.number(),
  });

export const createSessionResponseSchema: z.ZodType<CreateSessionResponse> =
  z.object({
    id: z.string(),
  });

export const updateSessionProgressResponseSchema: z.ZodType<UpdateSessionProgressResponse> =
  z.object({
    id: z.string(),
    status: practiceSessionStatusSchema,
    progress: practiceSessionProgressSchema.nullable(),
    updatedAt: z.string(),
  });

export const practiceSessionResponseSchema: z.ZodType<PracticeSessionResponse> =
  z.object({
    id: z.string(),
    title: z.string().nullable(),
    status: practiceSessionStatusSchema,
    requestedExerciseCount: z.number(),
    exerciseCount: z.number(),
    filters: z
      .object({
        years: z.array(z.number()).optional(),
        streamCode: z.string().nullable().optional(),
        streamCodes: z.array(z.string()).optional(),
        subjectCode: z.string().nullable().optional(),
        topicCodes: z.array(z.string()).optional(),
        sessionTypes: z.array(sessionTypeSchema).optional(),
      })
      .nullable(),
    progress: practiceSessionProgressSchema.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    exercises: z.array(
      z.object({
        sessionOrder: z.number(),
        id: z.string(),
        orderIndex: z.number(),
        title: z.string().nullable(),
        totalPoints: z.number(),
        questionCount: z.number(),
        hierarchy: z.object({
          exerciseNodeId: z.string(),
          exerciseLabel: z.string().nullable(),
          contextBlocks: z.array(examHierarchyBlockSchema),
          questions: z.array(
            z.object({
              id: z.string(),
              orderIndex: z.number(),
              label: z.string(),
              points: z.number(),
              depth: z.number(),
              topics: z.array(codeNameSchema),
              promptBlocks: z.array(examHierarchyBlockSchema),
              solutionBlocks: z.array(examHierarchyBlockSchema),
              hintBlocks: z.array(examHierarchyBlockSchema),
              rubricBlocks: z.array(examHierarchyBlockSchema),
            }),
          ),
        }),
        exam: z.object({
          year: z.number(),
          sessionType: sessionTypeSchema,
          subject: z.object({
            code: z.string(),
            name: z.string(),
            family: familySchema.optional(),
          }),
          stream: z.object({
            code: z.string(),
            name: z.string(),
            family: familySchema.optional(),
          }),
        }),
      }),
    ),
  });

export const recentPracticeSessionsResponseSchema: z.ZodType<RecentPracticeSessionsResponse> =
  z.object({
    data: z.array(
      z.object({
        id: z.string(),
        title: z.string().nullable(),
        status: practiceSessionStatusSchema,
        requestedExerciseCount: z.number(),
        exerciseCount: z.number(),
        createdAt: z.string(),
        updatedAt: z.string(),
        progressSummary: practiceProgressSummarySchema.nullable(),
      }),
    ),
  });

export const recentExamActivitiesResponseSchema: z.ZodType<RecentExamActivitiesResponse> =
  z.object({
    data: z.array(
      z.object({
        id: z.string(),
        examId: z.string(),
        year: z.number(),
        sessionType: sessionTypeSchema,
        stream: codeNameSchema,
        subject: codeNameSchema,
        sujetNumber: z.union([z.literal(1), z.literal(2)]),
        sujetLabel: z.string(),
        totalQuestionCount: z.number(),
        completedQuestionCount: z.number(),
        openedQuestionCount: z.number(),
        solutionViewedCount: z.number(),
        createdAt: z.string(),
        lastOpenedAt: z.string(),
      }),
    ),
  });

export const upsertExamActivityResponseSchema: z.ZodType<UpsertExamActivityResponse> =
  z.object({
    id: z.string(),
    lastOpenedAt: z.string(),
  });

export const upsertExamActivityRequestSchema: z.ZodType<UpsertExamActivityRequest> =
  z.object({
    sujetNumber: z.union([z.literal(1), z.literal(2)]),
    totalQuestionCount: z.number().optional(),
    completedQuestionCount: z.number().optional(),
    openedQuestionCount: z.number().optional(),
    solutionViewedCount: z.number().optional(),
  });

export function parseFiltersResponse(value: unknown) {
  return parseContract(filtersResponseSchema, value, "FiltersResponse");
}

export function parseCatalogResponse(value: unknown) {
  return parseContract(catalogResponseSchema, value, "CatalogResponse");
}

export function parseExamResponse(value: unknown) {
  return parseContract(examResponseSchema, value, "ExamResponse");
}

export function parsePracticeSessionResponse(value: unknown) {
  return parseContract(
    practiceSessionResponseSchema,
    value,
    "PracticeSessionResponse",
  );
}

export function parseSessionPreviewResponse(value: unknown) {
  return parseContract(
    sessionPreviewResponseSchema,
    value,
    "SessionPreviewResponse",
  );
}

export function parseCreateSessionResponse(value: unknown) {
  return parseContract(
    createSessionResponseSchema,
    value,
    "CreateSessionResponse",
  );
}

export function parseUpdateSessionProgressResponse(value: unknown) {
  return parseContract(
    updateSessionProgressResponseSchema,
    value,
    "UpdateSessionProgressResponse",
  );
}

export function parseRecentPracticeSessionsResponse(value: unknown) {
  return parseContract(
    recentPracticeSessionsResponseSchema,
    value,
    "RecentPracticeSessionsResponse",
  );
}

export function parseRecentExamActivitiesResponse(value: unknown) {
  return parseContract(
    recentExamActivitiesResponseSchema,
    value,
    "RecentExamActivitiesResponse",
  );
}

export function parseUpsertExamActivityResponse(value: unknown) {
  return parseContract(
    upsertExamActivityResponseSchema,
    value,
    "UpsertExamActivityResponse",
  );
}

export function parseUpsertExamActivityRequest(value: unknown) {
  return parseContract(
    upsertExamActivityRequestSchema,
    value,
    "UpsertExamActivityRequest",
  );
}
