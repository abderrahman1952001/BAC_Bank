import fs from 'node:fs/promises';
import path from 'node:path';
import {
  BlockRole,
  ExamNodeCurriculumNodeSource,
  ExamNodeLearningTargetSource,
  ExamNodeType,
  ExamVariantCode,
  Prisma,
  PrismaClient,
  PublicationStatus,
} from '@prisma/client';
import { loadApiScriptEnv } from './postgres-backup-r2-utils';
import {
  inferSvtMCurriculumNodeCodesFromText,
  inferSvtSeCurriculumNodeCodesFromText,
  type SvtCurriculumNodeCode,
} from '../src/study/svt-se-curriculum-mapping';

const SUBJECT_CODE = 'NATURAL_SCIENCES';
const SUPPORTED_STREAM_CODES = ['SE', 'M'] as const;
const CURRICULUM_CODE_BY_STREAM: Record<SupportedStreamCode, string> = {
  SE: 'SE__2008__OPEN',
  M: 'M__2008__OPEN',
};
const CURRICULUM_CONFIDENCE = 0.88;
const LEARNING_TARGET_CONFIDENCE = 0.84;
const API_ROOT = path.resolve(__dirname, '..');

const LEARNING_TARGET_ORDER = [
  'GENETIC_INFORMATION_REASONING',
  'PROTEIN_FUNCTION_REASONING',
  'ENZYME_ACTIVITY_REASONING',
  'IMMUNITY_REASONING',
  'NERVOUS_COMMUNICATION_REASONING',
  'ENERGY_PATHWAY_INTEGRATION',
  'GEOLOGICAL_INTERPRETATION',
  'ENVIRONMENTAL_DOCUMENT_ANALYSIS',
  'MECHANISM_EXPLANATION',
  'EXPERIMENTAL_REASONING',
  'DIAGRAM_SCHEMA_LABELING',
  'BIOLOGICAL_DATA_INTERPRETATION',
  'DOCUMENT_ANALYSIS',
  'SCIENTIFIC_ARGUMENTATION',
  'CALCULATION_QUANTIFICATION',
] as const;

type SupportedStreamCode = (typeof SUPPORTED_STREAM_CODES)[number];
type CliStream = SupportedStreamCode | 'ALL';

type CliOptions = {
  streamCode: CliStream;
  apply: boolean;
  replace: boolean;
  markReviewed: boolean;
  outputPath: string | null;
};

type SvtLearningTargetCode = (typeof LEARNING_TARGET_ORDER)[number];

const CONTENT_LEARNING_TARGETS = new Set<SvtLearningTargetCode>([
  'GENETIC_INFORMATION_REASONING',
  'PROTEIN_FUNCTION_REASONING',
  'ENZYME_ACTIVITY_REASONING',
  'IMMUNITY_REASONING',
  'NERVOUS_COMMUNICATION_REASONING',
  'ENERGY_PATHWAY_INTEGRATION',
  'GEOLOGICAL_INTERPRETATION',
  'ENVIRONMENTAL_DOCUMENT_ANALYSIS',
]);

const PROCEDURAL_LEARNING_TARGET_PRIORITY: SvtLearningTargetCode[] = [
  'DIAGRAM_SCHEMA_LABELING',
  'CALCULATION_QUANTIFICATION',
  'EXPERIMENTAL_REASONING',
  'BIOLOGICAL_DATA_INTERPRETATION',
  'MECHANISM_EXPLANATION',
  'SCIENTIFIC_ARGUMENTATION',
  'DOCUMENT_ANALYSIS',
];

type BlockRecord = {
  role: BlockRole;
  blockType: string;
  textValue: string | null;
};

type NodeRecord = {
  id: string;
  parentId: string | null;
  nodeType: ExamNodeType;
  orderIndex: number;
  label: string | null;
  blocks: BlockRecord[];
};

type NodeContext = NodeRecord & {
  streamCode: SupportedStreamCode;
  curriculumCode: string;
  year: number;
  sessionType: string;
  variantCode: ExamVariantCode;
  children: NodeContext[];
  parent: NodeContext | null;
};

type NodeCandidate = {
  streamCode: SupportedStreamCode;
  curriculumCode: string;
  year: number;
  sessionType: string;
  variantCode: ExamVariantCode;
  nodeId: string;
  parentId: string | null;
  nodeType: ExamNodeType;
  orderIndex: number;
  label: string | null;
  curriculumCodes: SvtCurriculumNodeCode[];
  outOfScopeCurriculumCodes: SvtCurriculumNodeCode[];
  learningTargetCodes: SvtLearningTargetCode[];
  flags: string[];
  promptPreview: string;
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`SVT exam tagging failed: ${message}`);
  process.exitCode = 1;
});

async function main() {
  loadApiScriptEnv(API_ROOT);
  loadApiScriptEnv(process.cwd());

  const options = parseCliOptions(process.argv.slice(2));
  const streamCodes =
    options.streamCode === 'ALL'
      ? SUPPORTED_STREAM_CODES
      : ([options.streamCode] as const);
  const prisma = new PrismaClient();

  try {
    const candidates = await buildCandidates(prisma, streamCodes);
    const curriculumRows = await buildCurriculumRows(prisma, candidates);
    const learningTargetRows = await buildLearningTargetRows(prisma, candidates);

    if (options.outputPath) {
      await writeCandidateArtifact(options.outputPath, {
        options,
        candidates,
        summary: summarizeCandidates(candidates),
      });
    }

    const applyResult = options.apply
      ? await applyMappings(prisma, {
          candidates,
          curriculumRows,
          learningTargetRows,
          replace: options.replace,
          markReviewed: options.markReviewed,
        })
      : {
          insertedCurriculumRows: 0,
          insertedLearningTargetRows: 0,
        };

    console.log(
      JSON.stringify(
        {
          mode: options.apply ? 'apply' : 'dry-run',
          replace: options.replace,
          markReviewed: options.markReviewed,
          ...summarizeCandidates(candidates),
          ...applyResult,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

function parseCliOptions(argv: string[]): CliOptions {
  let streamCode: CliStream = 'ALL';
  let apply = false;
  let replace = false;
  let markReviewed = false;
  let outputPath: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--stream') {
      const value = argv[index + 1]?.trim().toUpperCase();

      if (value !== 'ALL' && !isSupportedStreamCode(value)) {
        throw new Error(
          `Unsupported stream ${value ?? ''}. Use SE, M, or ALL.`,
        );
      }

      streamCode = value;
      index += 1;
      continue;
    }

    if (arg === '--apply') {
      apply = true;
      continue;
    }

    if (arg === '--replace') {
      replace = true;
      continue;
    }

    if (arg === '--mark-reviewed') {
      markReviewed = true;
      continue;
    }

    if (arg === '--output') {
      outputPath = argv[index + 1] ?? null;

      if (!outputPath) {
        throw new Error('--output requires a file path.');
      }

      index += 1;
      continue;
    }

    if (arg === '--help') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { streamCode, apply, replace, markReviewed, outputPath };
}

function isSupportedStreamCode(
  value: string | undefined,
): value is SupportedStreamCode {
  return SUPPORTED_STREAM_CODES.includes(value as SupportedStreamCode);
}

async function buildCandidates(
  prisma: PrismaClient,
  streamCodes: readonly SupportedStreamCode[],
): Promise<NodeCandidate[]> {
  const exams = await prisma.exam.findMany({
    where: {
      isPublished: true,
      subject: { code: SUBJECT_CODE },
      stream: { code: { in: [...streamCodes] } },
    },
    orderBy: [{ year: 'asc' }, { sessionType: 'asc' }],
    select: {
      year: true,
      sessionType: true,
      stream: { select: { code: true } },
      paper: {
        select: {
          variants: {
            where: { status: PublicationStatus.PUBLISHED },
            orderBy: { code: 'asc' },
            select: {
              code: true,
              nodes: {
                orderBy: [{ parentId: 'asc' }, { orderIndex: 'asc' }],
                select: {
                  id: true,
                  parentId: true,
                  nodeType: true,
                  orderIndex: true,
                  label: true,
                  blocks: {
                    orderBy: [{ role: 'asc' }, { orderIndex: 'asc' }],
                    select: {
                      role: true,
                      blockType: true,
                      textValue: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const candidates: NodeCandidate[] = [];

  for (const exam of exams) {
    const streamCode = exam.stream.code as SupportedStreamCode;
    const curriculumCode = CURRICULUM_CODE_BY_STREAM[streamCode];

    for (const variant of exam.paper.variants) {
      const nodeContexts = buildNodeTree({
        streamCode,
        curriculumCode,
        year: exam.year,
        sessionType: exam.sessionType,
        variantCode: variant.code,
        nodes: variant.nodes,
      });
      const initialCandidates = new Map<string, NodeCandidate>();

      for (const node of nodeContexts) {
        if (!isTaggableNode(node)) {
          continue;
        }

        initialCandidates.set(node.id, inferNodeCandidate(node));
      }

      for (const node of [...nodeContexts].sort(
        (left, right) => depthOf(right) - depthOf(left),
      )) {
        const candidate = initialCandidates.get(node.id);

        if (!candidate) {
          continue;
        }

        const childCandidates = node.children
          .map((child) => initialCandidates.get(child.id))
          .filter((child): child is NodeCandidate => Boolean(child));

        if (childCandidates.length > 0) {
          candidate.curriculumCodes = orderedUnique([
            ...candidate.curriculumCodes,
            ...childCandidates.flatMap((child) => child.curriculumCodes),
          ]);
          candidate.outOfScopeCurriculumCodes = orderedUnique([
            ...candidate.outOfScopeCurriculumCodes,
            ...childCandidates.flatMap((child) => child.outOfScopeCurriculumCodes),
          ]);
          candidate.learningTargetCodes = orderLearningTargets([
            ...candidate.learningTargetCodes,
            ...childCandidates.flatMap((child) => child.learningTargetCodes),
          ]);
          candidate.learningTargetCodes = compactLearningTargets({
            nodeType: candidate.nodeType,
            codes: candidate.learningTargetCodes,
          });
        }

        if (
          candidate.nodeType !== ExamNodeType.EXERCISE &&
          candidate.curriculumCodes.length === 0
        ) {
          const parentCandidate = findNearestParentCandidate(
            node,
            initialCandidates,
          );

          if (parentCandidate) {
            candidate.curriculumCodes = narrowInheritedCurriculumCodes({
              parentCurriculumCodes: parentCandidate.curriculumCodes,
              promptText: candidate.promptPreview,
            });
            candidate.learningTargetCodes = compactLearningTargets({
              nodeType: candidate.nodeType,
              codes: [
                ...candidate.learningTargetCodes,
                ...candidate.curriculumCodes.flatMap((code) =>
                  contentTargetsForCurriculumCode(code),
                ),
              ],
            });
            candidate.flags.push('inherited-parent-topic');
          }
        }
      }

      for (const candidate of initialCandidates.values()) {
        refreshCandidateFlags(candidate);
      }

      candidates.push(...initialCandidates.values());
    }
  }

  return candidates;
}

function buildNodeTree(input: {
  streamCode: SupportedStreamCode;
  curriculumCode: string;
  year: number;
  sessionType: string;
  variantCode: ExamVariantCode;
  nodes: NodeRecord[];
}): NodeContext[] {
  const byId = new Map<string, NodeContext>();

  for (const node of input.nodes) {
    byId.set(node.id, {
      ...node,
      streamCode: input.streamCode,
      curriculumCode: input.curriculumCode,
      year: input.year,
      sessionType: input.sessionType,
      variantCode: input.variantCode,
      children: [],
      parent: null,
    });
  }

  for (const node of byId.values()) {
    if (!node.parentId) {
      continue;
    }

    const parent = byId.get(node.parentId);

    if (parent) {
      node.parent = parent;
      parent.children.push(node);
    }
  }

  for (const node of byId.values()) {
    node.children.sort((left, right) => left.orderIndex - right.orderIndex);
  }

  return [...byId.values()].sort((left, right) => left.orderIndex - right.orderIndex);
}

function isTaggableNode(node: NodeContext): boolean {
  if (node.nodeType === ExamNodeType.CONTEXT) {
    return false;
  }

  return Boolean(collectOwnText(node).trim() || node.children.length > 0);
}

function inferNodeCandidate(node: NodeContext): NodeCandidate {
  const promptText = collectPromptText(node);
  const ownText = collectOwnText(node);
  const descendantText = collectDescendantText(node);
  const ancestorText = collectAncestorPromptText(node);
  const evidenceText = compactText(
    [ancestorText, ownText, descendantText].filter(Boolean).join(' '),
  );
  const promptEvidenceText = compactText(
    [ancestorText, promptText].filter(Boolean).join(' '),
  );
  const seCodes = inferSvtSeCurriculumNodeCodesFromText(evidenceText);
  const mCodes = inferSvtMCurriculumNodeCodesFromText(evidenceText);
  const curriculumCodes =
    node.streamCode === 'M' ? mCodes : (seCodes as SvtCurriculumNodeCode[]);
  const codeSet = new Set(curriculumCodes);
  const outOfScopeCurriculumCodes =
    node.streamCode === 'M'
      ? seCodes.filter((code) => !codeSet.has(code))
      : [];
  const learningTargetCodes = inferLearningTargetCodes({
    nodeType: node.nodeType,
    curriculumCodes,
    text: evidenceText,
    promptText,
    contextPromptText: promptEvidenceText,
    blocks: collectBlocks(node),
  });
  const flags = inferFlags({
    node,
    curriculumCodes,
    outOfScopeCurriculumCodes,
    learningTargetCodes,
    evidenceText,
  });

  return {
    streamCode: node.streamCode,
    curriculumCode: node.curriculumCode,
    year: node.year,
    sessionType: node.sessionType,
    variantCode: node.variantCode,
    nodeId: node.id,
    parentId: node.parentId,
    nodeType: node.nodeType,
    orderIndex: node.orderIndex,
    label: node.label,
    curriculumCodes,
    outOfScopeCurriculumCodes,
    learningTargetCodes,
    flags,
    promptPreview: compactText(promptText || ownText).slice(0, 220),
  };
}

function inferLearningTargetCodes(input: {
  nodeType: ExamNodeType;
  curriculumCodes: SvtCurriculumNodeCode[];
  text: string;
  promptText: string;
  contextPromptText: string;
  blocks: BlockRecord[];
}): SvtLearningTargetCode[] {
  const selected = new Set<SvtLearningTargetCode>();
  const normalizedText = normalizeArabicSearchText(input.text);
  const normalizedPrompt = normalizeArabicSearchText(input.promptText);
  const normalizedContextPrompt = normalizeArabicSearchText(input.contextPromptText);
  const hasImageOrTable = input.blocks.some((block) =>
    ['IMAGE', 'TABLE', 'TREE'].includes(block.blockType),
  );

  for (const code of input.curriculumCodes) {
    for (const target of contentTargetsForCurriculumCode(code)) {
      selected.add(target);
    }
  }

  if (
    hasAny(normalizedContextPrompt, [
      'الوثيقه',
      'اعتمادا علي الوثيقه',
      'استغلال الوثيقه',
      'استغلالا للوثيقه',
      'معطيات الوثيقه',
      'الدراسه',
      'الموضوع',
    ])
  ) {
    selected.add('DOCUMENT_ANALYSIS');
  }

  if (
    hasImageOrTable ||
    hasAny(normalizedContextPrompt, [
      'الشكل',
      'الجدول',
      'المنحني',
      'التسجيل',
      'الصوره',
      'معطيات',
      'النتائج',
      'نتائج',
    ])
  ) {
    selected.add('DOCUMENT_ANALYSIS');
  }

  if (
    hasImageOrTable ||
    hasAny(normalizedContextPrompt, [
      'الجدول',
      'المنحني',
      'التسجيل',
      'منحني',
      'قياس',
      'معايره',
      'تغيرات',
      'نسبه',
      'كميه',
      'قيم',
      'مجهر',
      'صوره',
    ])
  ) {
    selected.add('BIOLOGICAL_DATA_INTERPRETATION');
  }

  if (
    hasAny(normalizedContextPrompt, [
      'تجربه',
      'التجربه',
      'التجارب',
      'بروتوكول',
      'وسط الزرع',
      'حضن',
      'حقن',
      'زرع',
      'الغرض من اجراء التجربه',
      'اقترح تجربه',
      'فرضيه',
      'exao',
    ])
  ) {
    selected.add('EXPERIMENTAL_REASONING');
  }

  if (
    hasAny(normalizedPrompt, [
      'اكتب البيانات',
      'اكتب بيانات',
      'سم البيانات',
      'تسميه البيانات',
      'تعرف علي البيانات',
      'تعرف علي',
      'رسم تخطيطي',
      'مخطط',
      'مثل بمخطط',
      'انجز رسم',
      'انجز حصيله تخطيطيه',
      'اكمل الرسم',
      'ضع البيانات',
    ])
  ) {
    selected.add('DIAGRAM_SCHEMA_LABELING');
  }

  if (
    hasAny(normalizedPrompt, [
      'فسر',
      'اشرح',
      'وضح',
      'بين',
      'كيف',
      'اليه',
      'مراحل',
      'دور',
      'نص علمي',
      'وضح كيف',
      'بين كيف',
    ])
  ) {
    selected.add('MECHANISM_EXPLANATION');
  }

  if (
    hasAny(normalizedPrompt, [
      'علل',
      'برر',
      'استنتج',
      'ماذا تستنتج',
      'قدم استدلال',
      'استدلالا علميا',
      'حكم',
      'ناقش',
      'فرضيه',
      'نص علمي',
      'اعتمادا علي ما سبق',
    ])
  ) {
    selected.add('SCIENTIFIC_ARGUMENTATION');
  }

  if (
    hasAny(normalizedPrompt, [
      'احسب',
      'حساب',
      'قدر',
      'استخرج قيمه',
      'احسب عدد',
      'عدد السلاسل',
      'عدد الاحماض',
      'عدد القواعد',
      'عدد النكليوتيدات',
      'عدد الجسيمات',
      'نسبه مئويه',
      'النسبه المئويه',
      'نسبه ال',
    ])
  ) {
    selected.add('CALCULATION_QUANTIFICATION');
  }

  return compactLearningTargets({
    nodeType: input.nodeType,
    codes: [...selected],
  });
}

function contentTargetsForCurriculumCode(
  code: SvtCurriculumNodeCode,
): SvtLearningTargetCode[] {
  switch (code) {
    case 'PROTEIN_SYNTHESIS':
      return ['GENETIC_INFORMATION_REASONING', 'PROTEIN_FUNCTION_REASONING'];
    case 'STRUCTURE_FUNCTION':
      return ['PROTEIN_FUNCTION_REASONING'];
    case 'ENZYMES':
      return ['ENZYME_ACTIVITY_REASONING', 'PROTEIN_FUNCTION_REASONING'];
    case 'IMMUNITY':
      return ['IMMUNITY_REASONING'];
    case 'NERVOUS_COMMUNICATION':
      return ['NERVOUS_COMMUNICATION_REASONING'];
    case 'PHOTOSYNTHESIS':
    case 'RESPIRATION_FERMENTATION':
    case 'ENERGY_BALANCE':
      return ['ENERGY_PATHWAY_INTEGRATION'];
    case 'EARTH_STRUCTURE':
    case 'PLATE_ACTIVITY':
    case 'TECTONIC_INTERPRETATION':
      return ['GEOLOGICAL_INTERPRETATION'];
    case 'AIR_POLLUTION':
    case 'WATER_POLLUTION':
      return ['ENVIRONMENTAL_DOCUMENT_ANALYSIS'];
  }
}

function inferFlags(input: {
  node: NodeContext;
  curriculumCodes: SvtCurriculumNodeCode[];
  outOfScopeCurriculumCodes: SvtCurriculumNodeCode[];
  learningTargetCodes: SvtLearningTargetCode[];
  evidenceText: string;
}): string[] {
  const flags: string[] = [];

  if (input.curriculumCodes.length === 0) {
    flags.push('missing-curriculum');
  }

  if (input.learningTargetCodes.length === 0) {
    flags.push('missing-learning-target');
  }

  if (input.curriculumCodes.length > 1) {
    flags.push('multi-curriculum');
  }

  if (input.learningTargetCodes.length > 3) {
    flags.push('multi-learning-target');
  }

  if (input.outOfScopeCurriculumCodes.length > 0) {
    flags.push('stream-out-of-scope-secondary');
  }

  if (input.node.blocks.some((block) => block.blockType === 'IMAGE')) {
    flags.push('image-evidence');
  }

  if (input.evidenceText.length < 32 && input.node.children.length === 0) {
    flags.push('thin-text');
  }

  return flags;
}

function refreshCandidateFlags(candidate: NodeCandidate): void {
  const preserved = candidate.flags.filter((flag) =>
    ['image-evidence', 'thin-text', 'inherited-parent-topic'].includes(flag),
  );
  const flags = new Set(preserved);

  if (candidate.curriculumCodes.length === 0) {
    flags.add('missing-curriculum');
  }

  if (candidate.learningTargetCodes.length === 0) {
    flags.add('missing-learning-target');
  }

  if (candidate.curriculumCodes.length > 1) {
    flags.add('multi-curriculum');
  }

  if (candidate.learningTargetCodes.length > 4) {
    flags.add('multi-learning-target');
  }

  if (candidate.outOfScopeCurriculumCodes.length > 0) {
    flags.add('stream-out-of-scope-secondary');
  }

  candidate.flags = [...flags];
}

function narrowInheritedCurriculumCodes(input: {
  parentCurriculumCodes: SvtCurriculumNodeCode[];
  promptText: string;
}): SvtCurriculumNodeCode[] {
  const parentCodes = input.parentCurriculumCodes;
  const normalizedPrompt = normalizeArabicSearchText(input.promptText);
  const topicGroups: Array<{
    codes: SvtCurriculumNodeCode[];
    patterns: string[];
  }> = [
    {
      codes: ['PROTEIN_SYNTHESIS'],
      patterns: [
        'تركيب البروتين',
        'ترجمه',
        'استنساخ',
        'رامزه',
        'مورثه',
        'arn',
        'adn',
        'ريبوزوم',
        'اشاره بدايه',
        'اشارات بدايه',
        'اشاره نهايه',
        'اشارات نهايه',
      ],
    },
    {
      codes: ['STRUCTURE_FUNCTION', 'ENZYMES'],
      patterns: [
        'بنيه',
        'البنيه الفراغيه',
        'وظيفه البروتين',
        'الموقع الفعال',
        'انزيم',
        'حمض اميني',
        'احماض امينيه',
        'الوحدات البنائيه',
        'صيغه كيميائيه',
        'الصيغه الكيميائيه',
        'ببتيد',
        'ثلاثي البيبتيد',
        'ph',
        'phi',
      ],
    },
    {
      codes: ['IMMUNITY'],
      patterns: [
        'مناعه',
        'مناعيه',
        'لمفاويه',
        'اجسام مضاده',
        'مستضد',
        'لاذات',
      ],
    },
    {
      codes: ['NERVOUS_COMMUNICATION'],
      patterns: [
        'عصبي',
        'عصبون',
        'مشبك',
        'كمون',
        'مبلغ',
        'استقطاب',
      ],
    },
    {
      codes: ['PHOTOSYNTHESIS', 'RESPIRATION_FERMENTATION', 'ENERGY_BALANCE'],
      patterns: [
        'طاقه',
        'atp',
        'عضيه',
        'عضيتين',
        'تغذيه',
        'نمط التغذيه',
        'تركيب ضوي',
        'تنفس',
        'تخمر',
        'اكسجين',
        'co2',
      ],
    },
    {
      codes: ['EARTH_STRUCTURE', 'PLATE_ACTIVITY', 'TECTONIC_INTERPRETATION'],
      patterns: [
        'زلزالي',
        'زلازل',
        'صفائح',
        'تكتوني',
        'جيولوجي',
        'قشره ارضيه',
        'غلاف صخري',
      ],
    },
    {
      codes: ['AIR_POLLUTION', 'WATER_POLLUTION'],
      patterns: [
        'تلوث',
        'اوزون',
        'غلاف جوي',
        'مياه',
        'هواء',
        'اشعه فوق بنفسجيه',
      ],
    },
  ];

  for (const group of topicGroups) {
    if (!hasAny(normalizedPrompt, group.patterns)) {
      continue;
    }

    const narrowed = parentCodes.filter((code) => group.codes.includes(code));

    if (narrowed.length > 0) {
      return narrowed;
    }
  }

  return parentCodes;
}

function compactLearningTargets(input: {
  nodeType: ExamNodeType;
  codes: SvtLearningTargetCode[];
}): SvtLearningTargetCode[] {
  const selected = new Set(input.codes);
  const contentTargets = LEARNING_TARGET_ORDER.filter(
    (code) => selected.has(code) && CONTENT_LEARNING_TARGETS.has(code),
  );
  const specificProcedures = PROCEDURAL_LEARNING_TARGET_PRIORITY.filter(
    (code) => selected.has(code) && code !== 'DOCUMENT_ANALYSIS',
  );
  const proceduralLimit =
    input.nodeType === ExamNodeType.EXERCISE || input.nodeType === ExamNodeType.PART
      ? 3
      : 2;
  const proceduralTargets = specificProcedures.length
    ? specificProcedures.slice(0, proceduralLimit)
    : PROCEDURAL_LEARNING_TARGET_PRIORITY.filter((code) =>
        selected.has(code),
      ).slice(0, 1);

  return orderLearningTargets([...contentTargets, ...proceduralTargets]);
}

async function buildCurriculumRows(
  prisma: PrismaClient,
  candidates: NodeCandidate[],
) {
  const curriculumCodes = unique(candidates.map((candidate) => candidate.curriculumCode));
  const nodes = await prisma.curriculumNode.findMany({
    where: {
      curriculum: { code: { in: curriculumCodes } },
      code: {
        in: unique(candidates.flatMap((candidate) => candidate.curriculumCodes)),
      },
    },
    select: { id: true, code: true, curriculum: { select: { code: true } } },
  });
  const idsByCurriculumAndCode = new Map(
    nodes.map((node) => [`${node.curriculum.code}:${node.code}`, node.id]),
  );

  return candidates.flatMap((candidate) =>
    candidate.curriculumCodes.map((code) => {
      const curriculumNodeId = idsByCurriculumAndCode.get(
        `${candidate.curriculumCode}:${code}`,
      );

      if (!curriculumNodeId) {
        throw new Error(
          `Missing curriculum node ${candidate.curriculumCode}/${code}.`,
        );
      }

      return {
        nodeId: candidate.nodeId,
        curriculumNodeId,
        source: ExamNodeCurriculumNodeSource.AUTO_RULE,
        confidence: new Prisma.Decimal(CURRICULUM_CONFIDENCE),
        isPrimary: candidate.curriculumCodes[0] === code,
      };
    }),
  );
}

async function buildLearningTargetRows(
  prisma: PrismaClient,
  candidates: NodeCandidate[],
) {
  const curriculumCodes = unique(candidates.map((candidate) => candidate.curriculumCode));
  const targets = await prisma.learningTarget.findMany({
    where: {
      curriculum: { code: { in: curriculumCodes } },
      code: {
        in: unique(candidates.flatMap((candidate) => candidate.learningTargetCodes)),
      },
    },
    select: { id: true, code: true, curriculum: { select: { code: true } } },
  });
  const idsByCurriculumAndCode = new Map(
    targets.map((target) => [
      `${target.curriculum.code}:${target.code}`,
      target.id,
    ]),
  );

  return candidates.flatMap((candidate) =>
    candidate.learningTargetCodes.flatMap((code) => {
      const learningTargetId = idsByCurriculumAndCode.get(
        `${candidate.curriculumCode}:${code}`,
      );

      if (!learningTargetId) {
        candidate.flags.push(`missing-target:${code}`);
        return [];
      }

      return [
        {
          nodeId: candidate.nodeId,
          learningTargetId,
          source: ExamNodeLearningTargetSource.TOPIC_DERIVED,
          confidence: new Prisma.Decimal(LEARNING_TARGET_CONFIDENCE),
          isPrimary: candidate.learningTargetCodes[0] === code,
        },
      ];
    }),
  );
}

async function applyMappings(
  prisma: PrismaClient,
  input: {
    candidates: NodeCandidate[];
    curriculumRows: Array<{
      nodeId: string;
      curriculumNodeId: string;
      source: ExamNodeCurriculumNodeSource;
      confidence: Prisma.Decimal;
      isPrimary: boolean;
    }>;
    learningTargetRows: Array<{
      nodeId: string;
      learningTargetId: string;
      source: ExamNodeLearningTargetSource;
      confidence: Prisma.Decimal;
      isPrimary: boolean;
    }>;
    replace: boolean;
    markReviewed: boolean;
  },
) {
  const candidateNodeIds = unique(input.candidates.map((candidate) => candidate.nodeId));
  const curriculumCodes = unique(
    input.candidates.map((candidate) => candidate.curriculumCode),
  );
  const reviewedAt = input.markReviewed ? new Date() : null;
  const curriculumRows = input.curriculumRows.map((row) => ({
    ...row,
    source: input.markReviewed
      ? ExamNodeCurriculumNodeSource.MANUAL_REVIEW
      : row.source,
    reviewedAt,
  }));
  const learningTargetRows = input.learningTargetRows.map((row) => ({
    ...row,
    source: input.markReviewed
      ? ExamNodeLearningTargetSource.MANUAL_REVIEW
      : row.source,
    reviewedAt,
  }));

  return prisma.$transaction(async (tx) => {
    if (input.replace) {
      await tx.examNodeCurriculumNode.deleteMany({
        where: {
          nodeId: { in: candidateNodeIds },
          curriculumNode: { curriculum: { code: { in: curriculumCodes } } },
          source: ExamNodeCurriculumNodeSource.AUTO_RULE,
          reviewedAt: null,
        },
      });
      await tx.examNodeLearningTarget.deleteMany({
        where: {
          nodeId: { in: candidateNodeIds },
          learningTarget: { curriculum: { code: { in: curriculumCodes } } },
          source: ExamNodeLearningTargetSource.TOPIC_DERIVED,
          reviewedAt: null,
        },
      });
    }

    const curriculumResult = curriculumRows.length
      ? await tx.examNodeCurriculumNode.createMany({
          data: curriculumRows,
          skipDuplicates: true,
        })
      : { count: 0 };
    const learningTargetResult = learningTargetRows.length
      ? await tx.examNodeLearningTarget.createMany({
          data: learningTargetRows,
          skipDuplicates: true,
        })
      : { count: 0 };

    return {
      insertedCurriculumRows: curriculumResult.count,
      insertedLearningTargetRows: learningTargetResult.count,
    };
  });
}

async function writeCandidateArtifact(
  outputPath: string,
  data: {
    options: CliOptions;
    candidates: NodeCandidate[];
    summary: ReturnType<typeof summarizeCandidates>;
  },
) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(`${outputPath}.json`, `${JSON.stringify(data, null, 2)}\n`);
  await fs.writeFile(`${outputPath}.md`, renderMarkdownArtifact(data));
}

function renderMarkdownArtifact(data: {
  options: CliOptions;
  candidates: NodeCandidate[];
  summary: ReturnType<typeof summarizeCandidates>;
}) {
  const flagged = data.candidates.filter((candidate) => candidate.flags.length > 0);

  return [
    '# SVT Exam Tagging Candidates',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    '```json',
    JSON.stringify(data.summary, null, 2),
    '```',
    '',
    '## Flagged Candidates',
    '',
    ...flagged.slice(0, 500).flatMap((candidate) => [
      `### ${candidate.streamCode} ${candidate.year} ${candidate.sessionType} ${candidate.variantCode} ${candidate.nodeType} ${candidate.label ?? candidate.orderIndex}`,
      '',
      `- node: \`${candidate.nodeId}\``,
      `- curriculum: ${candidate.curriculumCodes.map((code) => `\`${code}\``).join(', ') || '(none)'}`,
      `- learning targets: ${candidate.learningTargetCodes.map((code) => `\`${code}\``).join(', ') || '(none)'}`,
      `- flags: ${candidate.flags.map((flag) => `\`${flag}\``).join(', ')}`,
      `- preview: ${candidate.promptPreview || '(no prompt text)'}`,
      '',
    ]),
  ].join('\n');
}

function summarizeCandidates(candidates: NodeCandidate[]) {
  const byStream: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const curriculumRowsByCode: Record<string, number> = {};
  const targetRowsByCode: Record<string, number> = {};
  const flagsByCode: Record<string, number> = {};

  for (const candidate of candidates) {
    byStream[candidate.streamCode] = (byStream[candidate.streamCode] ?? 0) + 1;
    byType[candidate.nodeType] = (byType[candidate.nodeType] ?? 0) + 1;

    for (const code of candidate.curriculumCodes) {
      curriculumRowsByCode[code] = (curriculumRowsByCode[code] ?? 0) + 1;
    }

    for (const code of candidate.learningTargetCodes) {
      targetRowsByCode[code] = (targetRowsByCode[code] ?? 0) + 1;
    }

    for (const flag of candidate.flags) {
      flagsByCode[flag] = (flagsByCode[flag] ?? 0) + 1;
    }
  }

  return {
    subjectCode: SUBJECT_CODE,
    candidateCount: candidates.length,
    mappedCurriculumNodeCount: candidates.filter(
      (candidate) => candidate.curriculumCodes.length > 0,
    ).length,
    mappedLearningTargetNodeCount: candidates.filter(
      (candidate) => candidate.learningTargetCodes.length > 0,
    ).length,
    byStream: sortRecord(byStream),
    byType: sortRecord(byType),
    curriculumRowsByCode: sortRecord(curriculumRowsByCode),
    targetRowsByCode: sortRecord(targetRowsByCode),
    flagsByCode: sortRecord(flagsByCode),
  };
}

function collectPromptText(node: NodeContext): string {
  return node.blocks
    .filter((block) => block.role === BlockRole.PROMPT)
    .map((block) => block.textValue?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
}

function collectOwnText(node: NodeContext): string {
  return node.blocks
    .map((block) => block.textValue?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
}

function collectDescendantText(node: NodeContext): string {
  return node.children
    .flatMap((child) => [collectOwnText(child), collectDescendantText(child)])
    .filter(Boolean)
    .join(' ');
}

function collectAncestorPromptText(node: NodeContext): string {
  const parts: string[] = [];
  let current = node.parent;

  while (current) {
    if (current.nodeType !== ExamNodeType.EXERCISE) {
      const text = collectPromptText(current);

      if (text) {
        parts.unshift(text);
      }
    }

    current = current.parent;
  }

  return parts.join(' ');
}

function collectBlocks(node: NodeContext): BlockRecord[] {
  return [
    ...node.blocks,
    ...node.children.flatMap((child) => collectBlocks(child)),
  ];
}

function findNearestParentCandidate(
  node: NodeContext,
  candidates: Map<string, NodeCandidate>,
) {
  let current = node.parent;

  while (current) {
    const candidate = candidates.get(current.id);

    if (candidate?.curriculumCodes.length) {
      return candidate;
    }

    current = current.parent;
  }

  return null;
}

function depthOf(node: NodeContext): number {
  let depth = 0;
  let current = node.parent;

  while (current) {
    depth += 1;
    current = current.parent;
  }

  return depth;
}

function hasAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(normalizeArabicSearchText(pattern)));
}

function normalizeArabicSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[’'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function orderedUnique(codes: SvtCurriculumNodeCode[]): SvtCurriculumNodeCode[] {
  return unique(codes);
}

function orderLearningTargets(
  codes: SvtLearningTargetCode[],
): SvtLearningTargetCode[] {
  const selected = new Set(codes);

  return LEARNING_TARGET_ORDER.filter((code) => selected.has(code));
}

function sortRecord(record: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function printUsage() {
  console.log(`Usage: npm run tag:svt-exam-nodes -- [--stream SE|M|ALL] [--output path] [--apply] [--replace] [--mark-reviewed]

Tags published SVT exam nodes with curriculum-node and learning-target
candidates. The script is a candidate and safe-write tool, not the source of
semantic truth. Review the generated artifact before applying reviewed rows.

Options:
  --stream         Target stream. Defaults to ALL.
  --output         Write JSON and Markdown candidate artifacts at the path
                   without extension.
  --apply          Write mappings to the database.
  --replace        Replace scoped, unreviewed automatic/topic-derived rows.
  --mark-reviewed  Store applied rows as MANUAL_REVIEW with reviewed_at.
  --help           Show this message.
`);
}
