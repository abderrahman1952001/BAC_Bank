import type {
  AdminIngestionDraft,
  AdminIngestionJobResponse,
  DraftVariantCode,
} from "@/lib/admin";
import {
  buildChildrenMap,
  buildPreviewBlocks,
} from "@/lib/admin-ingestion-structure-tree";
import type {
  ExamHierarchyNode,
  ExamResponse,
  ExamVariantCode,
} from "@/lib/study-api";
import type {
  DraftAsset,
  DraftNode,
  DraftVariant,
} from "@/lib/admin-ingestion-structure-shared";

const STREAM_DISPLAY_NAMES: Record<string, string> = {
  SE: "علوم تجريبية",
  M: "رياضيات",
  GE: "تسيير واقتصاد",
  LP: "آداب وفلسفة",
  LE: "لغات أجنبية",
  LE_GERMAN: "لغات أجنبية - ألمانية",
  LE_SPANISH: "لغات أجنبية - إسبانية",
  LE_ITALIAN: "لغات أجنبية - إيطالية",
  ARTS: "فنون",
  MT_CIVIL: "تقني رياضي - هندسة مدنية",
  MT_ELEC: "تقني رياضي - هندسة كهربائية",
  MT_MECH: "تقني رياضي - هندسة ميكانيكية",
  MT_PROC: "تقني رياضي - هندسة الطرائق",
};

const SUBJECT_DISPLAY_NAMES: Record<string, string> = {
  ARABIC: "اللغة العربية",
  MATHEMATICS: "الرياضيات",
  PHYSICS: "العلوم الفيزيائية",
  NATURAL_SCIENCES: "علوم الطبيعة والحياة",
  HISTORY_GEOGRAPHY: "التاريخ والجغرافيا",
  ISLAMIC_STUDIES: "العلوم الإسلامية",
  PHILOSOPHY: "الفلسفة",
  FRENCH: "اللغة الفرنسية",
  ENGLISH: "اللغة الإنجليزية",
  AMAZIGH: "اللغة الأمازيغية",
  LAW: "القانون",
  ECONOMICS_MANAGEMENT: "الاقتصاد والمناجمنت",
  ACCOUNTING_FINANCE: "المحاسبة والمالية",
  GERMAN: "اللغة الألمانية",
  SPANISH: "اللغة الإسبانية",
  ITALIAN: "اللغة الإيطالية",
  TECHNOLOGY_CIVIL: "الهندسة المدنية",
  TECHNOLOGY_ELECTRICAL: "الهندسة الكهربائية",
  TECHNOLOGY_MECHANICAL: "الهندسة الميكانيكية",
  TECHNOLOGY_PROCESS: "هندسة الطرائق",
  ARTS: "الفنون",
};

export type AdminIngestionStudentPreviewOptions = {
  sujetNumber?: string | number | null;
  streamCode?: string | null;
};

function variantCodeToSujetNumber(code: DraftVariantCode): 1 | 2 {
  return code === "SUJET_2" ? 2 : 1;
}

function sujetNumberToVariantCode(
  sujetNumber: string | number | null | undefined,
): DraftVariantCode | null {
  const parsed =
    typeof sujetNumber === "number"
      ? sujetNumber
      : typeof sujetNumber === "string"
        ? Number(sujetNumber)
        : Number.NaN;

  if (parsed === 1) {
    return "SUJET_1";
  }

  if (parsed === 2) {
    return "SUJET_2";
  }

  return null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length
    ? value.trim()
    : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveDraftStreamCodes(
  payload: AdminIngestionJobResponse,
  draft: AdminIngestionDraft,
) {
  const metadataStreamCodes = readStringArray(draft.exam.metadata.paperStreamCodes);
  const candidates = [
    ...metadataStreamCodes,
    ...payload.job.stream_codes,
    draft.exam.streamCode,
  ];

  return Array.from(
    new Set(
      candidates
        .filter((code): code is string => typeof code === "string")
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  );
}

function resolveSelectedStreamCode(
  payload: AdminIngestionJobResponse,
  options: AdminIngestionStudentPreviewOptions,
) {
  const streamCodes = resolveDraftStreamCodes(payload, payload.draft_json);
  const requested = options.streamCode?.trim();

  if (requested && streamCodes.includes(requested)) {
    return requested;
  }

  return streamCodes[0] ?? "UNMAPPED";
}

function resolveStreamName(
  payload: AdminIngestionJobResponse,
  streamCode: string,
) {
  return (
    payload.job.published_exams.find((exam) => exam.stream_code === streamCode)
      ?.stream_name ??
    STREAM_DISPLAY_NAMES[streamCode] ??
    streamCode
  );
}

function resolveSubjectCode(payload: AdminIngestionJobResponse) {
  return (
    payload.draft_json.exam.subjectCode?.trim() ??
    payload.job.subject_code?.trim() ??
    "UNMAPPED"
  );
}

function resolveSubjectName(subjectCode: string) {
  return SUBJECT_DISPLAY_NAMES[subjectCode] ?? subjectCode;
}

function resolveDurationMinutes(draft: AdminIngestionDraft) {
  return readNumber(draft.exam.metadata.durationMinutes) ?? 210;
}

function resolveSourceReference(draft: AdminIngestionDraft) {
  return (
    readString(draft.exam.metadata.sourceReference) ??
    readString(draft.exam.sourceExamPageUrl) ??
    readString(draft.exam.sourceListingUrl)
  );
}

function countQuestions(node: ExamHierarchyNode): number {
  const ownCount =
    node.nodeType === "QUESTION" || node.nodeType === "SUBQUESTION" ? 1 : 0;

  return (
    ownCount +
    node.children.reduce((sum, child) => sum + countQuestions(child), 0)
  );
}

function sumQuestionPoints(node: ExamHierarchyNode): number {
  const ownPoints =
    node.nodeType === "QUESTION" || node.nodeType === "SUBQUESTION"
      ? (node.maxPoints ?? 0)
      : 0;

  return (
    ownPoints +
    node.children.reduce((sum, child) => sum + sumQuestionPoints(child), 0)
  );
}

function buildHierarchyNode(input: {
  node: DraftNode;
  childrenByParent: Map<string | null, DraftNode[]>;
  assetById: Map<string, DraftAsset>;
  assetPreviewBaseUrl: string;
}): ExamHierarchyNode {
  const { node, childrenByParent, assetById, assetPreviewBaseUrl } = input;

  return {
    id: node.id,
    nodeType: node.nodeType,
    orderIndex: node.orderIndex,
    label: node.label,
    maxPoints: node.maxPoints,
    status: "DRAFT",
    metadata: null,
    topics: node.topicCodes.map((code) => ({
      code,
      name: code,
    })),
    blocks: buildPreviewBlocks(node.blocks, assetById, assetPreviewBaseUrl),
    children: (childrenByParent.get(node.id) ?? []).map((child) =>
      buildHierarchyNode({
        node: child,
        childrenByParent,
        assetById,
        assetPreviewBaseUrl,
      }),
    ),
  };
}

function buildVariantExercises(
  variant: DraftVariant,
  assets: DraftAsset[],
  assetPreviewBaseUrl: string,
) {
  const childrenByParent = buildChildrenMap(variant.nodes);
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));

  return (childrenByParent.get(null) ?? [])
    .filter((node) => node.nodeType === "EXERCISE")
    .map((node) =>
      buildHierarchyNode({
        node,
        childrenByParent,
        assetById,
        assetPreviewBaseUrl,
      }),
    );
}

function resolveSelectedVariant(
  variants: DraftVariant[],
  options: AdminIngestionStudentPreviewOptions,
) {
  const requestedVariantCode = sujetNumberToVariantCode(options.sujetNumber);

  if (requestedVariantCode) {
    const requestedVariant = variants.find(
      (variant) => variant.code === requestedVariantCode,
    );

    if (requestedVariant) {
      return requestedVariant;
    }
  }

  return variants[0] ?? null;
}

export function buildAdminIngestionStudentPreviewExam(
  payload: AdminIngestionJobResponse,
  options: AdminIngestionStudentPreviewOptions = {},
): ExamResponse | null {
  const draft = payload.draft_json;
  const variants = draft.variants.filter((variant) => variant.nodes.length > 0);
  const selectedVariant = resolveSelectedVariant(variants, options);

  if (!selectedVariant) {
    return null;
  }

  const streamCode = resolveSelectedStreamCode(payload, options);
  const subjectCode = resolveSubjectCode(payload);
  const exercises = buildVariantExercises(
    selectedVariant,
    draft.assets,
    payload.asset_preview_base_url,
  );
  const availableSujets = variants.map((variant) => ({
    sujetNumber: variantCodeToSujetNumber(variant.code),
    label: variant.title,
  }));
  const selectedSujetNumber = variantCodeToSujetNumber(selectedVariant.code);
  const exerciseSummaries = exercises.map((exercise) => ({
    id: exercise.id,
    orderIndex: exercise.orderIndex,
    title: exercise.label,
    totalPoints: exercise.maxPoints ?? sumQuestionPoints(exercise),
    questionCount: countQuestions(exercise),
  }));

  return {
    id: `draft-preview:${payload.job.id}:${selectedVariant.code}`,
    paperId: payload.job.published_paper_id ?? `draft:${payload.job.id}`,
    year: draft.exam.year,
    sessionType: draft.exam.sessionType,
    durationMinutes: resolveDurationMinutes(draft),
    officialSourceReference: resolveSourceReference(draft),
    stream: {
      code: streamCode,
      name: resolveStreamName(payload, streamCode),
    },
    subject: {
      code: subjectCode,
      name: resolveSubjectName(subjectCode),
    },
    selectedSujetNumber,
    selectedSujetLabel: selectedVariant.title,
    availableSujets,
    selectedVariantCode: selectedVariant.code as ExamVariantCode,
    hierarchy: {
      variantId: `${payload.job.id}:${selectedVariant.code}`,
      variantCode: selectedVariant.code as ExamVariantCode,
      title: selectedVariant.title,
      status: "DRAFT",
      nodeCount: selectedVariant.nodes.length,
      exercises,
    },
    exerciseCount: exercises.length,
    exercises: exerciseSummaries,
  };
}
