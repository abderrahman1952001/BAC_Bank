import type { AdminIngestionDraft } from "@/lib/admin";

export type DraftVariant = AdminIngestionDraft["variants"][number];
export type DraftNode = AdminIngestionDraft["variants"][number]["nodes"][number];
export type DraftBlock = DraftNode["blocks"][number];
export type DraftAsset = AdminIngestionDraft["assets"][number];
export type DraftBlockPreset =
  | "table"
  | "formula_graph"
  | "probability_tree";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
