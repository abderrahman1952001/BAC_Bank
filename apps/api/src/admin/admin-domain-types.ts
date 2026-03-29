import {
  BlockRole,
  BlockType as PrismaBlockType,
  ExamNodeType,
  ExamVariantCode,
  Prisma,
  PublicationStatus,
  SessionType,
} from '@prisma/client';

export type AdminStatus = 'draft' | 'published';
export type AdminSessionType = 'normal' | 'rattrapage';
export type BlockType =
  | 'paragraph'
  | 'latex'
  | 'image'
  | 'code'
  | 'heading'
  | 'table'
  | 'list'
  | 'graph'
  | 'tree';

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

export type ExerciseHierarchyMeta = {
  year?: number;
  session?: string;
  subject?: string;
  branch?: string;
  points?: number;
  contextBlocks?: ContentBlock[];
};

export type ExerciseMetadata = {
  theme?: string;
  difficulty?: string;
  tags?: string[];
  adminOrder?: number;
  hierarchyMeta?: ExerciseHierarchyMeta;
};

export type QuestionMetadata = {
  title?: string;
  adminOrder?: number;
  contentBlocks?: ContentBlock[];
  solutionBlocks?: ContentBlock[];
  hintBlocks?: ContentBlock[] | null;
};

export type QuestionNode = {
  id: string;
  orderIndex: number;
  parentId: string | null;
};

export type TopicMappingRow = {
  topic: {
    code: string;
    name: string;
    studentLabel: string | null;
  };
};

export type ExamNodeBlockRow = {
  id: string;
  role: BlockRole;
  orderIndex: number;
  blockType: PrismaBlockType;
  textValue: string | null;
  data: Prisma.JsonValue | null;
  media: {
    url: string;
    metadata: Prisma.JsonValue | null;
  } | null;
};

export type ExamNodeRow = {
  id: string;
  variantId: string;
  parentId: string | null;
  nodeType: ExamNodeType;
  orderIndex: number;
  label: string | null;
  maxPoints: Prisma.Decimal | null;
  status: PublicationStatus;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  topicMappings: TopicMappingRow[];
  blocks: ExamNodeBlockRow[];
};

export type AdminExamNodeSummary = Pick<ExamNodeRow, 'nodeType' | 'parentId'>;

export type AdminExamSummary = {
  id: string;
  year: number;
  sessionType: SessionType;
  isPublished: boolean;
  officialSourceReference: string | null;
  createdAt: Date;
  updatedAt: Date;
  stream: {
    code: string;
  };
  subject: {
    code: string;
  };
  variants: Array<{
    nodes: AdminExamNodeSummary[];
  }>;
};

export type AdminExamRecordNode = Omit<ExamNodeRow, 'blocks'>;

export type AdminExamRecord = Omit<AdminExamSummary, 'variants'> & {
  paperId: string;
  paperFamilyCode: string;
  offeringCount: number;
  variants: Array<{
    id: string;
    code: ExamVariantCode;
    title: string | null;
    status: PublicationStatus;
    nodes: AdminExamRecordNode[];
  }>;
};

export type ExerciseContext = {
  exercise: ExamNodeRow;
  variantNodes: ExamNodeRow[];
  questionNodes: ExamNodeRow[];
  exam: AdminExamSummary;
};

export type AdminExerciseEditorQuestion = {
  id: string;
  title: string;
  parent_id: string | null;
  order_index: number;
  status: AdminStatus;
  points: number | null;
  topics: Array<{
    code: string;
    name: string;
  }>;
  content_blocks: ContentBlock[];
  solution_blocks: ContentBlock[];
  hint_blocks: ContentBlock[] | null;
  created_at: Date;
  updated_at: Date;
};
