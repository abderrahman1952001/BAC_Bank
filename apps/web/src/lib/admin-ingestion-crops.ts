import type {
  AdminIngestionCropQueueItem,
  DraftAssetClassification,
  DraftDocumentKind,
} from "@/lib/admin";

export type CropDocumentKindFilter = DraftDocumentKind | "all";
export type CropClassificationFilter = DraftAssetClassification | "all";
export type CropSubjectFilter = string | "all";

export type CropSubjectOption = {
  value: CropSubjectFilter;
  label: string;
  count: number;
};

export function buildCropQueueStats(items: AdminIngestionCropQueueItem[]) {
  return {
    total: items.length,
    placeholders: items.filter((item) => item.placeholder).length,
    jobs: new Set(
      items.filter((item) => item.placeholder).map((item) => item.job_id),
    ).size,
    exam: items.filter((item) => item.source_document_kind === "EXAM").length,
    correction: items.filter(
      (item) => item.source_document_kind === "CORRECTION",
    ).length,
    needsCleanup: items.filter((item) => item.needs_cleanup).length,
  };
}

export function filterCropQueueItems(input: {
  items: AdminIngestionCropQueueItem[];
  query: string;
  subjectCode: CropSubjectFilter;
  documentKind: CropDocumentKindFilter;
  classification: CropClassificationFilter;
}) {
  const normalizedQuery = input.query.trim().toLowerCase();

  return input.items.filter((item) => {
    if (
      input.subjectCode !== "all" &&
      normalizeCropSubjectCode(item) !== input.subjectCode
    ) {
      return false;
    }

    if (
      input.documentKind !== "all" &&
      item.source_document_kind !== input.documentKind
    ) {
      return false;
    }

    if (
      input.classification !== "all" &&
      item.classification !== input.classification
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      item.job_label,
      item.subject_code,
      item.stream_codes.join(" "),
      item.asset_label,
      item.classification,
      item.role,
      item.variant_code,
      item.source_document_kind,
      item.source_page_number,
      item.linked_node_path.join(" "),
      item.notes,
      item.needs_cleanup ? "needs cleanup" : null,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function buildCropSubjectOptions(
  items: AdminIngestionCropQueueItem[],
): CropSubjectOption[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const subjectCode = normalizeCropSubjectCode(item);
    counts.set(subjectCode, (counts.get(subjectCode) ?? 0) + 1);
  }

  const subjectOptions = [...counts.entries()]
    .map(([value, count]) => ({
      value,
      label: formatCropSubjectLabel(value),
      count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label);
    });

  return [
    {
      value: "all",
      label: "All subjects",
      count: items.length,
    },
    ...subjectOptions,
  ];
}

export function selectInitialCropItem(
  items: AdminIngestionCropQueueItem[],
  selectedAssetId: string | null,
) {
  if (selectedAssetId) {
    const selected = items.find((item) => item.asset_id === selectedAssetId);

    if (selected) {
      return selected;
    }
  }

  return items[0] ?? null;
}

export function formatCropDocumentKind(kind: DraftDocumentKind) {
  return kind === "CORRECTION" ? "Correction" : "Exam";
}

export function formatCropVariant(
  code: AdminIngestionCropQueueItem["variant_code"],
) {
  if (code === "SUJET_1") {
    return "Sujet 1";
  }

  if (code === "SUJET_2") {
    return "Sujet 2";
  }

  return "Unassigned";
}

function normalizeCropSubjectCode(item: AdminIngestionCropQueueItem) {
  const code = item.subject_code?.trim().toUpperCase();

  return code || "UNASSIGNED";
}

function formatCropSubjectLabel(subjectCode: string) {
  return subjectCode === "UNASSIGNED" ? "Unassigned" : subjectCode;
}
