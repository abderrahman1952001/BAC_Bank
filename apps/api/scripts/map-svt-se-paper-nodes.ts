import path from 'node:path';
import {
  BlockRole,
  ExamNodeType,
  ExamVariantCode,
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
const AUTO_RULE_CONFIDENCE = 0.85;
const API_ROOT = path.resolve(__dirname, '..');

type SupportedStreamCode = (typeof SUPPORTED_STREAM_CODES)[number];

type CliOptions = {
  streamCode: SupportedStreamCode;
  apply: boolean;
  replace: boolean;
};

type ExerciseMappingCandidate = {
  year: number;
  variantCode: ExamVariantCode;
  orderIndex: number;
  nodeId: string;
  label: string | null;
  codes: SvtCurriculumNodeCode[];
  inferredCodes: SvtCurriculumNodeCode[];
  outOfScopeCodes: SvtCurriculumNodeCode[];
  textPreview: string;
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`SVT paper-node mapping failed: ${message}`);
  process.exitCode = 1;
});

async function main() {
  loadApiScriptEnv(API_ROOT);
  loadApiScriptEnv(process.cwd());

  const options = parseCliOptions(process.argv.slice(2));
  const curriculumCode = CURRICULUM_CODE_BY_STREAM[options.streamCode];
  const prisma = new PrismaClient();

  try {
    const curriculumNodeIdsByCode = await readCurriculumNodeIdsByCode(
      prisma,
      options.streamCode,
      curriculumCode,
    );
    const candidates = await buildExerciseMappingCandidates(
      prisma,
      options.streamCode,
    );
    const missing = candidates.filter((candidate) => !candidate.codes.length);
    const rows = candidates.flatMap((candidate) =>
      candidate.codes.map((code) => {
        const curriculumNodeId = curriculumNodeIdsByCode.get(code);

        if (!curriculumNodeId) {
          throw new Error(
            `Curriculum node ${code} does not exist in ${curriculumCode}.`,
          );
        }

        return {
          nodeId: candidate.nodeId,
          curriculumNodeId,
          source: 'AUTO_RULE' as const,
          confidence: AUTO_RULE_CONFIDENCE,
          isPrimary:
            candidate.codes.length === 1 || candidate.codes[0] === code,
        };
      }),
    );

    const result = options.apply
      ? await prisma.$transaction(async (tx) => {
          if (options.replace) {
            await tx.examNodeCurriculumNode.deleteMany({
              where: {
                nodeId: {
                  in: candidates.map((candidate) => candidate.nodeId),
                },
                curriculumNode: {
                  curriculum: {
                    code: curriculumCode,
                  },
                },
                source: 'AUTO_RULE',
                reviewedAt: null,
              },
            });
          }

          return tx.examNodeCurriculumNode.createMany({
            data: rows,
            skipDuplicates: true,
          });
        })
      : { count: 0 };

    printMappingSummary({
      streamCode: options.streamCode,
      curriculumCode,
      applied: options.apply,
      replaced: options.replace,
      insertedCount: result.count,
      candidates,
      missing,
    });
  } finally {
    await prisma.$disconnect();
  }
}

function parseCliOptions(argv: string[]): CliOptions {
  let streamCode: SupportedStreamCode = 'SE';
  let apply = false;
  let replace = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--stream') {
      const value = argv[index + 1]?.trim().toUpperCase();

      if (!isSupportedStreamCode(value)) {
        throw new Error(
          `Unsupported stream ${value ?? ''}. Use one of: ${SUPPORTED_STREAM_CODES.join(', ')}.`,
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

    if (arg === '--help') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    streamCode,
    apply,
    replace,
  };
}

function isSupportedStreamCode(
  value: string | undefined,
): value is SupportedStreamCode {
  return SUPPORTED_STREAM_CODES.includes(value as SupportedStreamCode);
}

async function readCurriculumNodeIdsByCode(
  prisma: PrismaClient,
  streamCode: SupportedStreamCode,
  curriculumCode: string,
) {
  const curriculum = await prisma.curriculum.findFirst({
    where: {
      code: curriculumCode,
      subject: {
        code: SUBJECT_CODE,
      },
      subjectOfferings: {
        some: {
          stream: {
            code: streamCode,
          },
        },
      },
    },
    select: {
      curriculumNodes: {
        select: {
          id: true,
          code: true,
        },
      },
    },
  });

  if (!curriculum) {
    throw new Error(
      `Could not find ${curriculumCode} for ${SUBJECT_CODE}/${streamCode}.`,
    );
  }

  return new Map(
    curriculum.curriculumNodes.map((node) => [node.code, node.id] as const),
  );
}

async function buildExerciseMappingCandidates(
  prisma: PrismaClient,
  streamCode: SupportedStreamCode,
): Promise<ExerciseMappingCandidate[]> {
  const exams = await prisma.exam.findMany({
    where: {
      isPublished: true,
      subject: {
        code: SUBJECT_CODE,
      },
      stream: {
        code: streamCode,
      },
    },
    orderBy: [{ year: 'asc' }, { sessionType: 'asc' }],
    select: {
      year: true,
      paper: {
        select: {
          variants: {
            where: {
              status: PublicationStatus.PUBLISHED,
              code: {
                in: [ExamVariantCode.SUJET_1, ExamVariantCode.SUJET_2],
              },
            },
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

  const candidates: ExerciseMappingCandidate[] = [];

  for (const exam of exams) {
    for (const variant of exam.paper.variants) {
      const nodesByParentId = groupNodesByParentId(variant.nodes);
      const exerciseRoots = variant.nodes
        .filter(
          (node) =>
            node.parentId === null && node.nodeType === ExamNodeType.EXERCISE,
        )
        .sort((a, b) => a.orderIndex - b.orderIndex);

      for (const exerciseRoot of exerciseRoots) {
        const text = collectNodeText(exerciseRoot.id, nodesByParentId).join(
          ' ',
        );
        const seInferredCodes = inferSvtSeCurriculumNodeCodesFromText(text);
        const mInferredCodes = inferSvtMCurriculumNodeCodesFromText(text);
        const codes =
          streamCode === 'M' ? mInferredCodes : seInferredCodes;
        const inferredCodes =
          streamCode === 'M'
            ? uniqueCodes([...seInferredCodes, ...mInferredCodes])
            : seInferredCodes;
        const codeSet = new Set(codes);

        candidates.push({
          year: exam.year,
          variantCode: variant.code,
          orderIndex: exerciseRoot.orderIndex,
          nodeId: exerciseRoot.id,
          label: exerciseRoot.label,
          codes,
          inferredCodes,
          outOfScopeCodes:
            streamCode === 'M'
              ? seInferredCodes.filter((code) => !codeSet.has(code))
              : [],
          textPreview: compactPreview(text),
        });
      }
    }
  }

  return candidates;
}

function uniqueCodes(codes: SvtCurriculumNodeCode[]): SvtCurriculumNodeCode[] {
  return Array.from(new Set(codes));
}

function groupNodesByParentId(
  nodes: Array<{
    id: string;
    parentId: string | null;
    orderIndex: number;
    blocks: Array<{
      role: BlockRole;
      textValue: string | null;
    }>;
  }>,
) {
  const byParentId = new Map<string | null, typeof nodes>();

  for (const node of nodes) {
    const siblings = byParentId.get(node.parentId) ?? [];
    siblings.push(node);
    byParentId.set(node.parentId, siblings);
  }

  for (const siblings of byParentId.values()) {
    siblings.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  return byParentId;
}

function collectNodeText(
  nodeId: string,
  nodesByParentId: Map<
    string | null,
    Array<{
      id: string;
      orderIndex: number;
      blocks: Array<{
        role: BlockRole;
        textValue: string | null;
      }>;
    }>
  >,
): string[] {
  const node = [...nodesByParentId.values()]
    .flat()
    .find((candidate) => candidate.id === nodeId);

  if (!node) {
    return [];
  }

  const blockText = node.blocks.flatMap((block) => {
    if (block.role !== BlockRole.PROMPT && block.role !== BlockRole.STEM) {
      return [];
    }

    return block.textValue?.trim() ? [block.textValue.trim()] : [];
  });
  const childText = (nodesByParentId.get(node.id) ?? []).flatMap((child) =>
    collectNodeText(child.id, nodesByParentId),
  );

  return [...blockText, ...childText];
}

function compactPreview(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 180);
}

function printMappingSummary(input: {
  streamCode: SupportedStreamCode;
  curriculumCode: string;
  applied: boolean;
  replaced: boolean;
  insertedCount: number;
  candidates: ExerciseMappingCandidate[];
  missing: ExerciseMappingCandidate[];
}) {
  const countsByCode = new Map<string, number>();
  const outOfScopeCountsByCode = new Map<string, number>();

  for (const candidate of input.candidates) {
    for (const code of candidate.codes) {
      countsByCode.set(code, (countsByCode.get(code) ?? 0) + 1);
    }

    for (const code of candidate.outOfScopeCodes) {
      outOfScopeCountsByCode.set(
        code,
        (outOfScopeCountsByCode.get(code) ?? 0) + 1,
      );
    }
  }

  const outOfScope = input.candidates.filter(
    (candidate) => candidate.outOfScopeCodes.length > 0,
  );

  console.log(
    JSON.stringify(
      {
        mode: input.applied ? 'apply' : 'dry-run',
        replace: input.replaced,
        subjectCode: SUBJECT_CODE,
        streamCode: input.streamCode,
        curriculumCode: input.curriculumCode,
        exerciseCount: input.candidates.length,
        mappedExerciseCount: input.candidates.length - input.missing.length,
        missingExerciseCount: input.missing.length,
        outOfScopeExerciseCount: outOfScope.length,
        insertedMappingCount: input.insertedCount,
        mappingsByCode: Object.fromEntries(
          [...countsByCode.entries()].sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
        outOfScopeMappingsByCode: Object.fromEntries(
          [...outOfScopeCountsByCode.entries()].sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        ),
        missing: input.missing.map((candidate) => ({
          year: candidate.year,
          variantCode: candidate.variantCode,
          orderIndex: candidate.orderIndex,
          nodeId: candidate.nodeId,
          preview: candidate.textPreview,
        })),
        outOfScope: outOfScope.map((candidate) => ({
          year: candidate.year,
          variantCode: candidate.variantCode,
          orderIndex: candidate.orderIndex,
          nodeId: candidate.nodeId,
          inferredCodes: candidate.inferredCodes,
          outOfScopeCodes: candidate.outOfScopeCodes,
          preview: candidate.textPreview,
        })),
        candidates: input.candidates.map((candidate) => ({
          year: candidate.year,
          variantCode: candidate.variantCode,
          orderIndex: candidate.orderIndex,
          nodeId: candidate.nodeId,
          codes: candidate.codes,
          inferredCodes: candidate.inferredCodes,
          outOfScopeCodes: candidate.outOfScopeCodes,
          preview: candidate.textPreview,
        })),
      },
      null,
      2,
    ),
  );
}

function printUsage() {
  console.log(`Usage: npm run map:svt-se-paper-nodes -- [--stream SE|M] [--apply] [--replace]

Maps published Sciences Naturelles exercise roots to canonical curriculum
nodes using deterministic rules over the already-published exam-node text.

Options:
  --stream    Target SVT stream. Defaults to SE. Supported: SE, M.
  --apply     Insert missing exam_node_curriculum_nodes rows. Omit for dry-run.
  --replace   Before inserting, remove existing mappings for the targeted SVT
              exercise roots inside the selected stream curriculum.
  --help      Show this message.
`);
}
