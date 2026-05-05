import type {
  AdminSourceCropBox,
  AdminSourceCropStatus,
} from '@bac-bank/contracts/admin';

export type SourceCropManifest = {
  source?: string;
  assetStrategy?: string;
  crops: SourceCropRecord[];
  [key: string]: unknown;
};

export type SourceCropRecord = {
  id?: string;
  source: string;
  asset: string;
  box?: AdminSourceCropBox;
  caption?: string | null;
  status?: AdminSourceCropStatus;
  notes?: string | null;
  [key: string]: unknown;
};

export type SourceFrontmatter = {
  subject: string | null;
  subjectCode: string | null;
  streams: string[];
  unit: string | null;
  topicCode: string | null;
  source: string | null;
  sourceSection: string | null;
};
