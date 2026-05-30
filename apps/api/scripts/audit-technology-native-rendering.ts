import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { loadApiScriptEnv } from './postgres-backup-r2-utils';

const API_ROOT = path.resolve(__dirname, '..');
const TECHNOLOGY_SUBJECTS = [
  'TECHNOLOGY_CIVIL',
  'TECHNOLOGY_PROCESS',
  'TECHNOLOGY_ELECTRICAL',
  'TECHNOLOGY_MECHANICAL',
] as const;

type TechnologySubject = (typeof TECHNOLOGY_SUBJECTS)[number];

type CliOptions = {
  outFile: string | null;
  compact: boolean;
  full: boolean;
};

type JsonRecord = Record<string, unknown>;

type NativeRendererKind =
  | 'technical_flow'
  | 'technical_grid'
  | 'technical_waveform'
  | 'civil_diagram'
  | 'chemistry_structure';

type NativeRendererHit = {
  subjectCode: TechnologySubject;
  paperSourceSlug: string;
  year: number;
  sessionType: string;
  jobId: string;
  jobStatus: string;
  variantCode: string | null;
  nodePath: string;
  blockId: string;
  blockType: string | null;
  assetId: string | null;
  rendererKind: NativeRendererKind;
  reviewStatus: string | null;
  title: string | null;
};

type CandidateAsset = {
  subjectCode: TechnologySubject;
  paperSourceSlug: string;
  year: number;
  sessionType: string;
  jobId: string;
  jobStatus: string;
  variantCode: string | null;
  nodePath: string;
  blockId: string;
  blockType: string | null;
  assetId: string | null;
  assetClassification: string | null;
  pageNumber: number | null;
  reason: string;
};

type IntentionalImageBackedAsset = CandidateAsset;

type CropDebtAsset = {
  subjectCode: TechnologySubject;
  paperSourceSlug: string;
  year: number;
  sessionType: string;
  jobId: string;
  jobStatus: string;
  assetId: string;
  assetClassification: string | null;
  documentKind: string | null;
  pageNumber: number | null;
  cropBox: JsonRecord | null;
  reason: string;
};

type TableBlockDebt = {
  subjectCode: TechnologySubject;
  paperSourceSlug: string;
  year: number;
  sessionType: string;
  jobId: string;
  jobStatus: string;
  variantCode: string | null;
  nodePath: string;
  blockId: string;
  blockType: string | null;
  assetId: string | null;
  value: string | null;
  reason: string;
};

type NativeRendererDebt = NativeRendererHit & {
  reason: string;
};

type SourceSummary = {
  sources: number;
  sourcesWithoutJobs: number;
  sourceDocuments: number;
  sourcePages: number;
  sessions: Record<string, number>;
};

type SourcePageRef = {
  id: string;
  width: number;
  height: number;
};

type SubjectSummary = {
  jobs: number;
  statuses: Record<string, number>;
  assets: number;
  placeholderAssets: number;
  imageBlocks: number;
  tableBlocks: number;
  nativeTables: number;
  tableBlocksMissingRows: number;
  nativeRenderers: Record<string, number>;
  untrustedNativeRenderers: number;
  candidateAssets: number;
  intentionalImageBackedAssets: number;
};

type AuditReport = {
  generatedAt: string;
  subjects: readonly TechnologySubject[];
  sources: Record<TechnologySubject, SourceSummary>;
  summaries: Record<TechnologySubject, SubjectSummary>;
  effectiveSummaries: Record<TechnologySubject, SubjectSummary>;
  jobs: JobAudit[];
  activeRevisionJobs: RevisionJobAudit[];
  nativeRendererHits: NativeRendererHit[];
  candidateAssets: CandidateAsset[];
  intentionalImageBackedAssets: IntentionalImageBackedAsset[];
  cropDebtAssets: CropDebtAsset[];
  tableBlockDebts: TableBlockDebt[];
  nativeRendererDebts: NativeRendererDebt[];
  effectiveCandidateAssets: CandidateAsset[];
  effectiveIntentionalImageBackedAssets: IntentionalImageBackedAsset[];
  effectiveCropDebtAssets: CropDebtAsset[];
  effectiveTableBlockDebts: TableBlockDebt[];
  effectiveNativeRendererDebts: NativeRendererDebt[];
};

type JobAudit = {
  subjectCode: TechnologySubject;
  paperSourceSlug: string;
  year: number;
  sessionType: string;
  jobId: string;
  jobStatus: string;
  publishedPaperId: string | null;
  isPublishedRevision: boolean;
  supersededByActiveRevision: boolean;
  supersededByRevision: boolean;
  assets: number;
  placeholderAssets: number;
  imageBlocks: number;
  tableBlocks: number;
  nativeTables: number;
  tableBlocksMissingRows: number;
  nativeRenderers: Record<string, number>;
  untrustedNativeRenderers: number;
  candidateAssets: number;
  intentionalImageBackedAssets: number;
};

type RevisionJobAudit = {
  subjectCode: TechnologySubject;
  paperSourceSlug: string;
  year: number;
  sessionType: string;
  jobId: string;
  jobStatus: string;
  publishedPaperId: string;
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Technology native-render audit failed: ${message}`);
  process.exitCode = 1;
});

async function main() {
  loadApiScriptEnv(API_ROOT);
  loadApiScriptEnv(process.cwd());

  const options = parseCliOptions(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const report = await buildAuditReport(prisma);
    const output = JSON.stringify(report, null, options.compact ? 0 : 2);

    if (options.outFile) {
      mkdirSync(path.dirname(options.outFile), { recursive: true });
      writeFileSync(options.outFile, `${output}\n`);
    }

    const consolePayload =
      options.outFile && !options.full
        ? buildConsoleSummary(report, options.outFile)
        : report;

    console.log(JSON.stringify(consolePayload, null, options.compact ? 0 : 2));
  } finally {
    await prisma.$disconnect();
  }
}

function buildConsoleSummary(report: AuditReport, outFile: string) {
  return {
    generatedAt: report.generatedAt,
    outFile,
    subjects: report.subjects,
    sources: report.sources,
    summaries: report.summaries,
    effectiveSummaries: report.effectiveSummaries,
    jobCount: report.jobs.length,
    activeRevisionJobCount: report.activeRevisionJobs.length,
    nativeRendererHitCount: report.nativeRendererHits.length,
    candidateAssetCount: report.candidateAssets.length,
    intentionalImageBackedAssetCount:
      report.intentionalImageBackedAssets.length,
    cropDebtAssetCount: report.cropDebtAssets.length,
    tableBlockDebtCount: report.tableBlockDebts.length,
    nativeRendererDebtCount: report.nativeRendererDebts.length,
    effectiveCandidateAssetCount: report.effectiveCandidateAssets.length,
    effectiveIntentionalImageBackedAssetCount:
      report.effectiveIntentionalImageBackedAssets.length,
    effectiveCropDebtAssetCount: report.effectiveCropDebtAssets.length,
    effectiveTableBlockDebtCount: report.effectiveTableBlockDebts.length,
    effectiveNativeRendererDebtCount:
      report.effectiveNativeRendererDebts.length,
  };
}

async function buildAuditReport(prisma: PrismaClient): Promise<AuditReport> {
  const paperSources = await prisma.paperSource.findMany({
    where: {
      subject: {
        code: {
          in: [...TECHNOLOGY_SUBJECTS],
        },
      },
    },
    include: {
      subject: {
        select: {
          code: true,
        },
      },
      sourceDocuments: {
        include: {
          pages: {
            select: {
              id: true,
            },
          },
        },
      },
      ingestionJobs: {
        select: {
          id: true,
        },
      },
    },
  });
  const jobs = await prisma.ingestionJob.findMany({
    where: {
      paperSource: {
        subject: {
          code: {
            in: [...TECHNOLOGY_SUBJECTS],
          },
        },
      },
    },
    include: {
      paperSource: {
        include: {
          subject: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });
  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    subjects: TECHNOLOGY_SUBJECTS,
    sources: createSourceSummaryMap(),
    summaries: createSubjectSummaryMap(),
    effectiveSummaries: createSubjectSummaryMap(),
    jobs: [],
    activeRevisionJobs: [],
    nativeRendererHits: [],
    candidateAssets: [],
    intentionalImageBackedAssets: [],
    cropDebtAssets: [],
    tableBlockDebts: [],
    nativeRendererDebts: [],
    effectiveCandidateAssets: [],
    effectiveIntentionalImageBackedAssets: [],
    effectiveCropDebtAssets: [],
    effectiveTableBlockDebts: [],
    effectiveNativeRendererDebts: [],
  };

  for (const paperSource of paperSources) {
    const subjectCode = asTechnologySubject(paperSource.subject.code);

    if (!subjectCode) {
      continue;
    }

    const summary = report.sources[subjectCode];

    summary.sources += 1;
    summary.sourceDocuments += paperSource.sourceDocuments.length;
    summary.sourcePages += paperSource.sourceDocuments.reduce(
      (count, document) => count + document.pages.length,
      0,
    );
    summary.sessions[paperSource.sessionType] =
      (summary.sessions[paperSource.sessionType] ?? 0) + 1;

    if (!paperSource.ingestionJobs.length) {
      summary.sourcesWithoutJobs += 1;
    }
  }

  const activeRevisionPublishedPaperIds = new Set(
    jobs
      .filter(isActivePublishedRevisionJob)
      .map((job) => job.publishedPaperId)
      .filter((paperId): paperId is string => Boolean(paperId)),
  );
  const effectiveJobIds = resolveEffectiveJobIds(jobs);

  for (const job of jobs.sort(compareJobs)) {
    const subjectCode = asTechnologySubject(job.paperSource.subject.code);

    if (!subjectCode) {
      continue;
    }

    const jobAudit = auditJob({
      subjectCode,
      paperSourceSlug: job.paperSource.slug,
      year: job.paperSource.year,
      sessionType: job.paperSource.sessionType,
      jobId: job.id,
      jobStatus: job.status,
      publishedPaperId: job.publishedPaperId,
      isPublishedRevision: isPublishedRevisionJob(job),
      supersededByActiveRevision:
        Boolean(job.publishedPaperId) &&
        !isPublishedRevisionJob(job) &&
        activeRevisionPublishedPaperIds.has(job.publishedPaperId ?? ''),
      supersededByRevision:
        Boolean(job.publishedPaperId) && !effectiveJobIds.has(job.id),
      draft: job.draftJson,
    });

    report.jobs.push(jobAudit.job);
    if (
      jobAudit.job.isPublishedRevision &&
      jobAudit.job.publishedPaperId !== null &&
      isActiveIngestionStatus(jobAudit.job.jobStatus)
    ) {
      report.activeRevisionJobs.push({
        subjectCode,
        paperSourceSlug: job.paperSource.slug,
        year: job.paperSource.year,
        sessionType: job.paperSource.sessionType,
        jobId: job.id,
        jobStatus: job.status,
        publishedPaperId: jobAudit.job.publishedPaperId,
      });
    }
    report.nativeRendererHits.push(...jobAudit.nativeRendererHits);
    report.candidateAssets.push(...jobAudit.candidateAssets);
    report.intentionalImageBackedAssets.push(
      ...jobAudit.intentionalImageBackedAssets,
    );
    report.cropDebtAssets.push(...jobAudit.cropDebtAssets);
    report.tableBlockDebts.push(...jobAudit.tableBlockDebts);
    report.nativeRendererDebts.push(...jobAudit.nativeRendererDebts);
    addJobToSubjectSummary(report.summaries[subjectCode], jobAudit.job);
    if (!jobAudit.job.supersededByRevision) {
      addJobToSubjectSummary(
        report.effectiveSummaries[subjectCode],
        jobAudit.job,
      );
      report.effectiveCandidateAssets.push(...jobAudit.candidateAssets);
      report.effectiveIntentionalImageBackedAssets.push(
        ...jobAudit.intentionalImageBackedAssets,
      );
      report.effectiveCropDebtAssets.push(...jobAudit.cropDebtAssets);
      report.effectiveTableBlockDebts.push(...jobAudit.tableBlockDebts);
      report.effectiveNativeRendererDebts.push(...jobAudit.nativeRendererDebts);
    }
  }

  return report;
}

function auditJob(input: {
  subjectCode: TechnologySubject;
  paperSourceSlug: string;
  year: number;
  sessionType: string;
  jobId: string;
  jobStatus: string;
  publishedPaperId: string | null;
  isPublishedRevision: boolean;
  supersededByActiveRevision: boolean;
  supersededByRevision: boolean;
  draft: unknown;
}) {
  const draft = asRecord(input.draft) ?? {};
  const assets = asArray(draft.assets).filter(isRecord);
  const sourcePageById = new Map(
    asArray(draft.sourcePages)
      .filter(isRecord)
      .map((page) => {
        const id = readString(page.id);
        const width = readNumber(page.width);
        const height = readNumber(page.height);

        if (!id || width === null || height === null) {
          return null;
        }

        return [id, { id, width, height }] as const;
      })
      .filter(
        (entry): entry is readonly [string, SourcePageRef] => entry !== null,
      ),
  );
  const assetById = new Map(
    assets
      .map((asset) => [readString(asset.id), asset] as const)
      .filter((entry): entry is readonly [string, JsonRecord] =>
        Boolean(entry[0]),
      ),
  );
  const job: JobAudit = {
    subjectCode: input.subjectCode,
    paperSourceSlug: input.paperSourceSlug,
    year: input.year,
    sessionType: input.sessionType,
    jobId: input.jobId,
    jobStatus: input.jobStatus,
    publishedPaperId: input.publishedPaperId,
    isPublishedRevision: input.isPublishedRevision,
    supersededByActiveRevision: input.supersededByActiveRevision,
    supersededByRevision: input.supersededByRevision,
    assets: assets.length,
    placeholderAssets: assets.filter((asset) =>
      isPlaceholderAsset(
        asset,
        sourcePageById.get(readString(asset.sourcePageId) ?? '') ?? null,
      ),
    ).length,
    imageBlocks: 0,
    tableBlocks: 0,
    nativeTables: 0,
    tableBlocksMissingRows: 0,
    nativeRenderers: {},
    untrustedNativeRenderers: 0,
    candidateAssets: 0,
    intentionalImageBackedAssets: 0,
  };
  const nativeRendererHits: NativeRendererHit[] = [];
  const candidateAssets: CandidateAsset[] = [];
  const intentionalImageBackedAssets: IntentionalImageBackedAsset[] = [];
  const cropDebtAssets = assets
    .filter((asset) =>
      isPlaceholderAsset(
        asset,
        sourcePageById.get(readString(asset.sourcePageId) ?? '') ?? null,
      ),
    )
    .map((asset) =>
      buildCropDebtAsset({
        ...input,
        asset,
        reason: 'placeholder_or_full_page_crop',
      }),
    )
    .filter((asset): asset is CropDebtAsset => asset !== null);
  const tableBlockDebts: TableBlockDebt[] = [];
  const nativeRendererDebts: NativeRendererDebt[] = [];

  walkDraftBlocks(draft, (block, nodePath, variantCode) => {
    const blockType = readString(block.type);
    const blockId = readString(block.id) ?? '(missing-block-id)';
    const assetId = readString(block.assetId);
    const asset = assetId ? (assetById.get(assetId) ?? null) : null;

    if (blockType === 'image') {
      job.imageBlocks += 1;
    }

    if (blockType === 'table') {
      job.tableBlocks += 1;

      if (hasNativeTableRows(block)) {
        job.nativeTables += 1;
      } else {
        job.tableBlocksMissingRows += 1;
        tableBlockDebts.push(
          buildTableBlockDebt({
            ...input,
            variantCode,
            nodePath,
            block,
            asset,
            reason: 'table_block_missing_native_rows',
          }),
        );
        candidateAssets.push(
          buildCandidateAsset({
            ...input,
            variantCode,
            nodePath,
            block,
            asset,
            reason: 'table_block_missing_native_rows',
          }),
        );
      }
    }

    const nativeRenderers = readNativeRendererData(block);

    for (const renderer of nativeRenderers) {
      job.nativeRenderers[renderer.kind] =
        (job.nativeRenderers[renderer.kind] ?? 0) + 1;

      if (renderer.reviewStatus !== 'visual_checked') {
        job.untrustedNativeRenderers += 1;
      }

      nativeRendererHits.push({
        subjectCode: input.subjectCode,
        paperSourceSlug: input.paperSourceSlug,
        year: input.year,
        sessionType: input.sessionType,
        jobId: input.jobId,
        jobStatus: input.jobStatus,
        variantCode,
        nodePath,
        blockId,
        blockType,
        assetId,
        rendererKind: renderer.kind,
        reviewStatus: renderer.reviewStatus,
        title: renderer.title,
      });

      if (renderer.reviewStatus !== 'visual_checked') {
        nativeRendererDebts.push({
          subjectCode: input.subjectCode,
          paperSourceSlug: input.paperSourceSlug,
          year: input.year,
          sessionType: input.sessionType,
          jobId: input.jobId,
          jobStatus: input.jobStatus,
          variantCode,
          nodePath,
          blockId,
          blockType,
          assetId,
          rendererKind: renderer.kind,
          reviewStatus: renderer.reviewStatus,
          title: renderer.title,
          reason: 'native_renderer_not_visual_checked',
        });
      }
    }

    if (nativeRenderers.length) {
      return;
    }

    const intentionalImageBackedReason = classifyIntentionalImageBacked({
      block,
      asset,
      nodePath,
    });

    if (intentionalImageBackedReason) {
      intentionalImageBackedAssets.push(
        buildCandidateAsset({
          ...input,
          variantCode,
          nodePath,
          block,
          asset,
          reason: intentionalImageBackedReason,
        }),
      );
      return;
    }

    const candidateReason = classifyNativeCandidate({
      subjectCode: input.subjectCode,
      block,
      asset,
      nodePath,
    });

    if (candidateReason) {
      candidateAssets.push(
        buildCandidateAsset({
          ...input,
          variantCode,
          nodePath,
          block,
          asset,
          reason: candidateReason,
        }),
      );
    }
  });

  job.candidateAssets = candidateAssets.length;
  job.intentionalImageBackedAssets = intentionalImageBackedAssets.length;

  return {
    job,
    nativeRendererHits,
    candidateAssets,
    intentionalImageBackedAssets,
    cropDebtAssets,
    tableBlockDebts,
    nativeRendererDebts,
  };
}

function buildCandidateAsset(input: {
  subjectCode: TechnologySubject;
  paperSourceSlug: string;
  year: number;
  sessionType: string;
  jobId: string;
  jobStatus: string;
  variantCode: string | null;
  nodePath: string;
  block: JsonRecord;
  asset: JsonRecord | null;
  reason: string;
}): CandidateAsset {
  return {
    subjectCode: input.subjectCode,
    paperSourceSlug: input.paperSourceSlug,
    year: input.year,
    sessionType: input.sessionType,
    jobId: input.jobId,
    jobStatus: input.jobStatus,
    variantCode: input.variantCode,
    nodePath: input.nodePath,
    blockId: readString(input.block.id) ?? '(missing-block-id)',
    blockType: readString(input.block.type),
    assetId: readString(input.block.assetId) ?? readString(input.asset?.id),
    assetClassification: readString(input.asset?.classification),
    pageNumber: readNumber(input.asset?.pageNumber),
    reason: input.reason,
  };
}

function buildCropDebtAsset(input: {
  subjectCode: TechnologySubject;
  paperSourceSlug: string;
  year: number;
  sessionType: string;
  jobId: string;
  jobStatus: string;
  asset: JsonRecord;
  reason: string;
}): CropDebtAsset | null {
  const assetId = readString(input.asset.id);

  if (!assetId) {
    return null;
  }

  return {
    subjectCode: input.subjectCode,
    paperSourceSlug: input.paperSourceSlug,
    year: input.year,
    sessionType: input.sessionType,
    jobId: input.jobId,
    jobStatus: input.jobStatus,
    assetId,
    assetClassification: readString(input.asset.classification),
    documentKind: readString(input.asset.documentKind),
    pageNumber: readNumber(input.asset.pageNumber),
    cropBox: asRecord(input.asset.cropBox),
    reason: input.reason,
  };
}

function buildTableBlockDebt(input: {
  subjectCode: TechnologySubject;
  paperSourceSlug: string;
  year: number;
  sessionType: string;
  jobId: string;
  jobStatus: string;
  variantCode: string | null;
  nodePath: string;
  block: JsonRecord;
  asset: JsonRecord | null;
  reason: string;
}): TableBlockDebt {
  return {
    subjectCode: input.subjectCode,
    paperSourceSlug: input.paperSourceSlug,
    year: input.year,
    sessionType: input.sessionType,
    jobId: input.jobId,
    jobStatus: input.jobStatus,
    variantCode: input.variantCode,
    nodePath: input.nodePath,
    blockId: readString(input.block.id) ?? '(missing-block-id)',
    blockType: readString(input.block.type),
    assetId: readString(input.block.assetId) ?? readString(input.asset?.id),
    value: readString(input.block.value),
    reason: input.reason,
  };
}

function classifyIntentionalImageBacked(input: {
  block: JsonRecord;
  asset: JsonRecord | null;
  nodePath: string;
}) {
  const blockType = readString(input.block.type);

  if (blockType !== 'image') {
    return null;
  }

  const data = asRecord(input.block.data);
  const nativeReview =
    asRecord(data?.nativeReview) ??
    asRecord(data?.nativeDecision) ??
    asRecord(data?.nativeRendering);
  const nativeReviewStatus = readString(nativeReview?.status);

  if (
    nativeReviewStatus === 'intentionally_image_backed' ||
    nativeReviewStatus === 'image_backed'
  ) {
    return (
      readString(nativeReview?.reason) ??
      'intentionally_image_backed_after_visual_review'
    );
  }

  const dataNotes = asArray(data?.notes)
    .map((entry) => readString(entry))
    .filter((entry): entry is string => Boolean(entry));
  const assetNativeSuggestion = asRecord(input.asset?.nativeSuggestion);
  const haystack = normalizeSearchText([
    input.nodePath,
    readString(input.block.value),
    readString(data?.nativeReviewStatus),
    readString(data?.nativeReviewReason),
    ...dataNotes,
    readString(input.asset?.id),
    readString(input.asset?.label),
    readString(input.asset?.notes),
    readString(assetNativeSuggestion?.status),
    readString(assetNativeSuggestion?.notes),
  ]);

  if (
    matchesAny(haystack, [
      'kept image-backed',
      'kept image backed',
      'intentionally image-backed',
      'intentionally image backed',
      'not a reliable native-render target',
      'not a reliable native render target',
      'rather than a reliable native-render target',
      'rather than a reliable native render target',
    ])
  ) {
    return 'intentionally_image_backed_after_visual_review';
  }

  return null;
}

function classifyNativeCandidate(input: {
  subjectCode: TechnologySubject;
  block: JsonRecord;
  asset: JsonRecord | null;
  nodePath: string;
}) {
  const blockType = readString(input.block.type);
  const assetClassification = readString(input.asset?.classification);
  const haystack = normalizeSearchText([
    input.nodePath,
    readString(input.block.id),
    readString(input.block.value),
    readString(input.asset?.id),
    readString(input.asset?.label),
    readString(input.asset?.notes),
  ]);

  if (blockType === 'table') {
    return null;
  }

  if (blockType !== 'image') {
    return null;
  }

  if (assetClassification === 'table') {
    return 'table_asset_needs_visual_native_table_triage';
  }

  if (input.subjectCode === 'TECHNOLOGY_CIVIL') {
    if (matchesAny(haystack, ['رافدة', 'مقطع', 'مثلثي', 'قضيب', 'beam'])) {
      return 'civil_simple_geometry_candidate';
    }
  }

  if (input.subjectCode === 'TECHNOLOGY_PROCESS') {
    if (
      matchesAny(haystack, [
        'amino',
        'peptide',
        'structure',
        'molecule',
        'حمض أميني',
        'حمض اميني',
      ])
    ) {
      return 'process_chemistry_structure_candidate';
    }
  }

  if (input.subjectCode === 'TECHNOLOGY_ELECTRICAL') {
    if (
      matchesAny(haystack, [
        'a-0',
        'sadt',
        'fast',
        'grafcet',
        'chronogram',
        'waveform',
        'karnaugh',
        'tris',
        'trisa',
        'trisb',
        '7490',
        '7474',
      ])
    ) {
      return 'electrical_technical_diagram_candidate';
    }
  }

  if (input.subjectCode === 'TECHNOLOGY_MECHANICAL') {
    if (matchesAny(haystack, ['fast', 'grafcet', 'a-0', 'sadt'])) {
      return 'mechanical_flow_diagram_candidate';
    }
  }

  return null;
}

function walkDraftBlocks(
  draft: JsonRecord,
  visitor: (
    block: JsonRecord,
    nodePath: string,
    variantCode: string | null,
  ) => void,
) {
  for (const variant of asArray(draft.variants).filter(isRecord)) {
    const variantCode = readString(variant.code);
    walkNodes(
      asArray(variant.nodes).filter(isRecord),
      [],
      variantCode,
      visitor,
    );
  }
}

function walkNodes(
  nodes: JsonRecord[],
  parentLabels: string[],
  variantCode: string | null,
  visitor: (
    block: JsonRecord,
    nodePath: string,
    variantCode: string | null,
  ) => void,
) {
  for (const node of nodes) {
    const label =
      readString(node.label) ?? readString(node.id) ?? '(unlabeled)';
    const pathParts = [...parentLabels, label];
    const nodePath = pathParts.join(' > ');

    for (const block of asArray(node.blocks).filter(isRecord)) {
      visitor(block, nodePath, variantCode);
    }

    walkNodes(
      asArray(node.children).filter(isRecord),
      pathParts,
      variantCode,
      visitor,
    );
  }
}

function readNativeRendererData(block: JsonRecord) {
  const renderers: {
    kind: NativeRendererKind;
    reviewStatus: string | null;
    title: string | null;
  }[] = [];
  const technicalDiagram = readTechnicalDiagramData(block);
  const civilDiagram = readCivilDiagramData(block);
  const chemistryStructure = readChemistryStructureData(block);

  if (technicalDiagram) {
    renderers.push(technicalDiagram);
  }

  if (civilDiagram) {
    renderers.push(civilDiagram);
  }

  if (chemistryStructure) {
    renderers.push(chemistryStructure);
  }

  return renderers;
}

function readTechnicalDiagramData(block: JsonRecord) {
  const data = asRecord(block.data);

  if (!data) {
    return null;
  }

  for (const candidate of [
    data,
    asRecord(data.technicalDiagram),
    asRecord(data.technicalFlow),
    asRecord(data.technicalGrid),
    asRecord(data.technicalWaveform),
    asRecord(data.payload),
  ]) {
    if (!candidate) {
      continue;
    }

    const kind = resolveTechnicalKind(candidate, data);

    if (!kind || !hasRenderableTechnicalPayload(kind, candidate)) {
      continue;
    }

    return {
      kind,
      reviewStatus:
        readString(candidate.reviewStatus) ?? readString(data.reviewStatus),
      title: readString(candidate.title) ?? readString(data.title),
    };
  }

  return null;
}

function resolveTechnicalKind(
  candidate: JsonRecord,
  fallback: JsonRecord,
): NativeRendererKind | null {
  const kind = readString(candidate.kind) ?? readString(fallback.kind);

  if (
    kind === 'technical_flow' ||
    kind === 'technical_grid' ||
    kind === 'technical_waveform'
  ) {
    return kind;
  }

  if (kind !== 'technical_diagram') {
    return null;
  }

  const family =
    readString(candidate.family) ??
    readString(candidate.type) ??
    readString(fallback.family) ??
    readString(fallback.type);

  if (family === 'flow' || family === 'grafcet' || family === 'fast') {
    return 'technical_flow';
  }

  if (family === 'grid' || family === 'karnaugh' || family === 'form') {
    return 'technical_grid';
  }

  if (family === 'waveform' || family === 'timing') {
    return 'technical_waveform';
  }

  return null;
}

function hasRenderableTechnicalPayload(
  kind: NativeRendererKind,
  candidate: JsonRecord,
) {
  if (kind === 'technical_flow') {
    return asArray(candidate.nodes).length > 0;
  }

  if (kind === 'technical_grid') {
    return (
      asArray(candidate.rows).length > 0 || asArray(candidate.cells).length > 0
    );
  }

  if (kind === 'technical_waveform') {
    return asArray(candidate.signals).length > 0;
  }

  return false;
}

function readCivilDiagramData(block: JsonRecord) {
  const data = asRecord(block.data);

  if (!data) {
    return null;
  }

  for (const candidate of [
    data,
    asRecord(data.civilDiagram),
    asRecord(data.diagram),
    asRecord(data.payload),
  ]) {
    if (!candidate) {
      continue;
    }

    const explicitCivilKind =
      readString(candidate.kind) === 'civil_diagram' ||
      readString(data.kind) === 'civil_diagram';

    if (!explicitCivilKind || !asArray(candidate.elements).length) {
      continue;
    }

    return {
      kind: 'civil_diagram' as const,
      reviewStatus:
        readString(candidate.reviewStatus) ?? readString(data.reviewStatus),
      title: readString(candidate.title) ?? readString(data.title),
    };
  }

  return null;
}

function readChemistryStructureData(block: JsonRecord) {
  const data = asRecord(block.data);

  if (!data) {
    return null;
  }

  for (const candidate of [
    data,
    asRecord(data.chemistryStructure),
    asRecord(data.molecule),
    asRecord(data.payload),
  ]) {
    if (!candidate) {
      continue;
    }

    const explicitChemistryKind =
      readString(candidate.kind) === 'chemistry_structure' ||
      readString(data.kind) === 'chemistry_structure';
    const hasSource = Boolean(
      readString(candidate.source) ??
      readString(candidate.smiles) ??
      readString(candidate.molblock),
    );
    const hasItems = asArray(candidate.items).some((item) => {
      const record = asRecord(item);

      return Boolean(
        record &&
        (readString(record.source) ??
          readString(record.smiles) ??
          readString(record.molblock)),
      );
    });

    if (!explicitChemistryKind || (!hasSource && !hasItems)) {
      continue;
    }

    return {
      kind: 'chemistry_structure' as const,
      reviewStatus:
        readString(candidate.reviewStatus) ?? readString(data.reviewStatus),
      title: readString(candidate.title) ?? readString(data.title),
    };
  }

  return null;
}

function hasNativeTableRows(block: JsonRecord) {
  const data = asRecord(block.data);
  const nestedTable = asRecord(data?.table);

  return (
    asArray(data?.rows).some((row) => asArray(row).length > 0) ||
    asArray(nestedTable?.rows).some((row) => asArray(row).length > 0)
  );
}

function isPlaceholderAsset(
  asset: JsonRecord,
  sourcePage: SourcePageRef | null,
) {
  const cropBox = asRecord(asset.cropBox);

  if (!cropBox) {
    return true;
  }

  const x = readNumber(cropBox.x);
  const y = readNumber(cropBox.y);
  const width = readNumber(cropBox.width);
  const height = readNumber(cropBox.height);

  if (x === null || y === null || width === null || height === null) {
    return true;
  }

  const normalizedFullPage =
    width <= 1.01 &&
    height <= 1.01 &&
    x <= 0.01 &&
    y <= 0.01 &&
    width >= 0.98 &&
    height >= 0.98;

  if (normalizedFullPage) {
    return true;
  }

  if (!sourcePage) {
    return false;
  }

  return (
    x <= 2 &&
    y <= 2 &&
    width >= sourcePage.width - 2 &&
    height >= sourcePage.height - 2
  );
}

function addJobToSubjectSummary(summary: SubjectSummary, job: JobAudit) {
  summary.jobs += 1;
  summary.statuses[job.jobStatus] = (summary.statuses[job.jobStatus] ?? 0) + 1;
  summary.assets += job.assets;
  summary.placeholderAssets += job.placeholderAssets;
  summary.imageBlocks += job.imageBlocks;
  summary.tableBlocks += job.tableBlocks;
  summary.nativeTables += job.nativeTables;
  summary.tableBlocksMissingRows += job.tableBlocksMissingRows;
  summary.untrustedNativeRenderers += job.untrustedNativeRenderers;
  summary.candidateAssets += job.candidateAssets;
  summary.intentionalImageBackedAssets += job.intentionalImageBackedAssets;

  for (const [kind, count] of Object.entries(job.nativeRenderers)) {
    summary.nativeRenderers[kind] =
      (summary.nativeRenderers[kind] ?? 0) + count;
  }
}

function createSourceSummaryMap() {
  return Object.fromEntries(
    TECHNOLOGY_SUBJECTS.map((subjectCode) => [
      subjectCode,
      {
        sources: 0,
        sourcesWithoutJobs: 0,
        sourceDocuments: 0,
        sourcePages: 0,
        sessions: {},
      },
    ]),
  ) as Record<TechnologySubject, SourceSummary>;
}

function createSubjectSummaryMap() {
  return Object.fromEntries(
    TECHNOLOGY_SUBJECTS.map((subjectCode) => [
      subjectCode,
      {
        jobs: 0,
        statuses: {},
        assets: 0,
        placeholderAssets: 0,
        imageBlocks: 0,
        tableBlocks: 0,
        nativeTables: 0,
        tableBlocksMissingRows: 0,
        nativeRenderers: {},
        untrustedNativeRenderers: 0,
        candidateAssets: 0,
        intentionalImageBackedAssets: 0,
      },
    ]),
  ) as Record<TechnologySubject, SubjectSummary>;
}

function resolveEffectiveJobIds<
  TJob extends {
    id: string;
    status: string;
    metadata: unknown;
    publishedPaperId: string | null;
    publishedAt?: Date | string | null;
    updatedAt?: Date | string | null;
    createdAt?: Date | string | null;
  },
>(jobs: TJob[]) {
  const effectiveJobIds = new Set(jobs.map((job) => job.id));
  const jobsByPublishedPaperId = new Map<string, TJob[]>();

  for (const job of jobs) {
    if (!job.publishedPaperId) {
      continue;
    }

    const existing = jobsByPublishedPaperId.get(job.publishedPaperId) ?? [];
    existing.push(job);
    jobsByPublishedPaperId.set(job.publishedPaperId, existing);
  }

  for (const group of jobsByPublishedPaperId.values()) {
    const activeRevisionJobs = group.filter(isActivePublishedRevisionJob);

    if (activeRevisionJobs.length > 0) {
      for (const job of group) {
        effectiveJobIds.delete(job.id);
      }

      for (const job of activeRevisionJobs) {
        effectiveJobIds.add(job.id);
      }

      continue;
    }

    const publishedRevisionJobs = group
      .filter(isPublishedRevisionJob)
      .filter((job) => job.status === 'PUBLISHED')
      .sort(comparePublishedRevisionFreshness);

    if (publishedRevisionJobs.length === 0) {
      continue;
    }

    for (const job of group) {
      effectiveJobIds.delete(job.id);
    }

    effectiveJobIds.add(publishedRevisionJobs[0].id);
  }

  return effectiveJobIds;
}

function comparePublishedRevisionFreshness(
  left: {
    id: string;
    publishedAt?: Date | string | null;
    updatedAt?: Date | string | null;
    createdAt?: Date | string | null;
  },
  right: {
    id: string;
    publishedAt?: Date | string | null;
    updatedAt?: Date | string | null;
    createdAt?: Date | string | null;
  },
) {
  return (
    readJobTimestamp(right) - readJobTimestamp(left) ||
    left.id.localeCompare(right.id)
  );
}

function readJobTimestamp(job: {
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
}) {
  return (
    readDateTime(job.publishedAt) ??
    readDateTime(job.updatedAt) ??
    readDateTime(job.createdAt) ??
    0
  );
}

function readDateTime(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function compareJobs(
  left: {
    status?: string;
    metadata?: unknown;
    publishedPaperId?: string | null;
    paperSource: {
      subject: { code: string };
      year: number;
      sessionType: string;
      slug: string;
    };
  },
  right: {
    status?: string;
    metadata?: unknown;
    publishedPaperId?: string | null;
    paperSource: {
      subject: { code: string };
      year: number;
      sessionType: string;
      slug: string;
    };
  },
) {
  return (
    left.paperSource.subject.code.localeCompare(
      right.paperSource.subject.code,
    ) ||
    right.paperSource.year - left.paperSource.year ||
    left.paperSource.sessionType.localeCompare(right.paperSource.sessionType) ||
    left.paperSource.slug.localeCompare(right.paperSource.slug)
  );
}

function isActivePublishedRevisionJob(job: {
  status: string;
  metadata: unknown;
  publishedPaperId: string | null;
}) {
  return (
    isPublishedRevisionJob(job) &&
    Boolean(job.publishedPaperId) &&
    isActiveIngestionStatus(job.status)
  );
}

function isPublishedRevisionJob(job: {
  metadata: unknown;
  publishedPaperId: string | null;
}) {
  return (
    Boolean(job.publishedPaperId) &&
    readString(asRecord(job.metadata)?.editingMode) === 'published_revision'
  );
}

function isActiveIngestionStatus(status: string) {
  return (
    status === 'DRAFT' ||
    status === 'IN_REVIEW' ||
    status === 'APPROVED' ||
    status === 'QUEUED' ||
    status === 'PROCESSING'
  );
}

function asTechnologySubject(value: string): TechnologySubject | null {
  return TECHNOLOGY_SUBJECTS.includes(value as TechnologySubject)
    ? (value as TechnologySubject)
    : null;
}

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(asRecord(value));
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeSearchText(values: (string | null)[]) {
  return values.filter(Boolean).join(' ').toLowerCase();
}

function matchesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle.toLowerCase()));
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    outFile: null,
    compact: false,
    full: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--out') {
      options.outFile = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === '--compact') {
      options.compact = true;
      continue;
    }

    if (arg === '--full') {
      options.full = true;
      continue;
    }

    if (arg === '--help') {
      printUsageAndExit();
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsageAndExit(): never {
  console.log(`Usage: npm run audit:technology-native-rendering -- [--out path] [--compact] [--full]

Runs a read-only audit for technology subject native-rendering coverage,
candidate assets, and crop/native debt. With --out, stdout prints a compact
summary unless --full is passed.`);
  process.exit(0);
}
