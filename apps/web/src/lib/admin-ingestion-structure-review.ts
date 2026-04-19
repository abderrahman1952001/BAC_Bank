import type { AdminIngestionDraft } from "@/lib/admin";
import {
  isRecord,
  type DraftAsset,
  type DraftBlock,
  type DraftNode,
} from "@/lib/admin-ingestion-structure-shared";

type LegacyDraftBlock = DraftBlock & {
  meta?: DraftBlock["meta"] & {
    caption?: string;
  };
};

type LegacyDraftNode = DraftNode & {
  title?: string | null;
  blocks: LegacyDraftBlock[];
};

type LegacyDraftAsset = DraftAsset & {
  caption?: string | null;
};

export function readDraftSelectedStreamCodes(
  exam: AdminIngestionDraft["exam"] | null | undefined,
) {
  if (!exam) {
    return [];
  }

  const metadata = isRecord(exam.metadata) ? exam.metadata : {};
  const fromPaperStreamMetadata = Array.isArray(metadata.paperStreamCodes)
    ? metadata.paperStreamCodes
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0)
    : [];

  if (fromPaperStreamMetadata.length > 0) {
    return Array.from(new Set(fromPaperStreamMetadata));
  }

  const fromSharedMetadata = Array.isArray(metadata.sharedStreamCodes)
    ? metadata.sharedStreamCodes
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0)
    : [];

  return Array.from(
    new Set(
      [exam.streamCode, ...fromSharedMetadata]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0),
    ),
  );
}

export function formatRows(data: Record<string, unknown> | null | undefined) {
  if (!Array.isArray(data?.rows)) {
    return "";
  }

  return data.rows
    .map((row) =>
      Array.isArray(row)
        ? row.map((cell) => String(cell ?? "")).join(" | ")
        : "",
    )
    .filter((row) => row.trim().length > 0)
    .join("\n");
}

export function parseRows(value: string) {
  return value
    .split("\n")
    .map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0),
    )
    .filter((row) => row.length > 0);
}

export function withRowsData(
  data: Record<string, unknown> | null | undefined,
  rows: string[][],
) {
  const nextData = isRecord(data) ? { ...data } : {};

  if (rows.length > 0) {
    nextData.rows = rows;
  } else {
    delete nextData.rows;
  }

  return Object.keys(nextData).length ? nextData : null;
}

function stripLegacyBlockMetaCaption(
  meta: LegacyDraftBlock["meta"] | undefined,
): DraftBlock["meta"] | undefined {
  if (!meta?.caption) {
    return meta;
  }

  const nextMeta = {
    ...meta,
  };

  delete nextMeta.caption;

  if (nextMeta.level === undefined && !nextMeta.language) {
    return undefined;
  }

  return nextMeta;
}

export function sanitizeLegacyReviewDraft(
  draft: AdminIngestionDraft,
): AdminIngestionDraft {
  let changed = false;

  const assets = draft.assets.map((asset) => {
    const legacyAsset = asset as LegacyDraftAsset;

    if (!Object.prototype.hasOwnProperty.call(legacyAsset, "caption")) {
      return asset;
    }

    changed = true;

    const rest = { ...legacyAsset };
    delete rest.caption;
    return rest;
  });

  const variants = draft.variants.map((variant) => {
    let variantChanged = false;

    const nodes = variant.nodes.map((node) => {
      const legacyNode = node as LegacyDraftNode;
      let nodeChanged = false;
      const label = legacyNode.label ?? legacyNode.title ?? null;

      const blocks = legacyNode.blocks.map((block) => {
        const meta = stripLegacyBlockMetaCaption(block.meta);

        if (meta === block.meta) {
          return block;
        }

        nodeChanged = true;

        if (meta) {
          return {
            ...block,
            meta,
          };
        }

        const rest = { ...block };
        delete rest.meta;
        return rest;
      });

      if (
        label !== legacyNode.label ||
        Object.prototype.hasOwnProperty.call(legacyNode, "title") ||
        nodeChanged
      ) {
        changed = true;
        variantChanged = true;

        const rest = { ...legacyNode };
        delete rest.title;

        return {
          ...rest,
          label,
          blocks,
        };
      }

      return node;
    });

    if (!variantChanged) {
      return variant;
    }

    return {
      ...variant,
      nodes,
    };
  });

  if (!changed) {
    return draft;
  }

  return {
    ...draft,
    assets,
    variants,
  };
}
