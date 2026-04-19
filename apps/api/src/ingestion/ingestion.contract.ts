import {
  INGESTION_DRAFT_SCHEMA,
  normalizeIngestionDraft,
  type DraftAsset,
  type DraftAssetClassification,
  type DraftAssetNativeSuggestionSource,
  type DraftAssetNativeSuggestionStatus,
  type DraftAssetNativeSuggestionType,
  type DraftBlock,
  type DraftBlockRole,
  type DraftBlockType,
  type DraftCropBox,
  type DraftDocumentKind,
  type DraftNode,
  type DraftSessionType,
  type DraftSourcePage,
  type DraftVariant,
  type DraftVariantCode,
  type IngestionDraft,
} from '@bac-bank/contracts/ingestion';

export { INGESTION_DRAFT_SCHEMA, normalizeIngestionDraft };
export type {
  DraftAsset,
  DraftAssetClassification,
  DraftAssetNativeSuggestionSource,
  DraftAssetNativeSuggestionStatus,
  DraftAssetNativeSuggestionType,
  DraftBlock,
  DraftBlockRole,
  DraftBlockType,
  DraftCropBox,
  DraftDocumentKind,
  DraftNode,
  DraftSessionType,
  DraftSourcePage,
  DraftVariant,
  DraftVariantCode,
  IngestionDraft,
};
export type DraftAssetKind = DraftAssetClassification;

const DEFAULT_DRAFT_VARIANTS: DraftVariant[] = [
  {
    code: 'SUJET_1',
    title: 'الموضوع الأول',
    nodes: [],
  },
  {
    code: 'SUJET_2',
    title: 'الموضوع الثاني',
    nodes: [],
  },
];

export function createEmptyDraft(input: {
  year: number;
  streamCode?: string | null;
  subjectCode?: string | null;
  sessionType?: DraftSessionType;
  provider: string;
  title: string;
  minYear: number;
  sourceListingUrl?: string | null;
  sourceExamPageUrl?: string | null;
  sourceCorrectionPageUrl?: string | null;
  metadata?: Record<string, unknown>;
}): IngestionDraft {
  return {
    schema: INGESTION_DRAFT_SCHEMA,
    exam: {
      year: input.year,
      streamCode: normalizeOptionalString(input.streamCode),
      subjectCode: normalizeOptionalString(input.subjectCode),
      sessionType: input.sessionType ?? 'NORMAL',
      provider: input.provider,
      title: input.title.trim(),
      minYear: input.minYear,
      sourceListingUrl: normalizeOptionalString(input.sourceListingUrl),
      sourceExamPageUrl: normalizeOptionalString(input.sourceExamPageUrl),
      sourceCorrectionPageUrl: normalizeOptionalString(
        input.sourceCorrectionPageUrl,
      ),
      examDocumentId: null,
      correctionDocumentId: null,
      examDocumentStorageKey: null,
      correctionDocumentStorageKey: null,
      metadata: input.metadata ?? {},
    },
    sourcePages: [],
    assets: [],
    variants: DEFAULT_DRAFT_VARIANTS.map((variant) => ({
      ...variant,
      nodes: [],
    })),
  };
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
