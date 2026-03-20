const fs = require('fs');
const path = require('path');
const {
  PrismaClient,
  BlockRole,
  BlockType,
  ExamNodeType,
  ExamVariantCode,
  PublicationStatus,
  SessionType,
} = require('@prisma/client');

const prisma = new PrismaClient();

const DATA_PATH = path.join(__dirname, 'data', 'se-math-2024.json');
const SOURCE_PDF_PATH = '/home/abderrahman/dzexams-bac-mathematiques-1435676.pdf';

const ASSET_URLS = {
  SUJET_1_EX_4_TABLE_1:
    '/imports/dzexams/2024/math-se/sujet1_ex4_g_variation_table.jpg',
  SUJET_1_EX_4_GRAPH_1:
    '/imports/dzexams/2024/math-se/sujet1_ex4_cf_solution_graph.jpg',
  SUJET_2_EX_1_TREE_1:
    '/imports/dzexams/2024/math-se/sujet2_ex1_probability_tree_solution.jpg',
  SUJET_2_EX_4_GRAPH_1:
    '/imports/dzexams/2024/math-se/sujet2_ex4_cg_prompt_graph.jpg',
  SUJET_2_EX_4_GRAPH_2:
    '/imports/dzexams/2024/math-se/sujet2_ex4_cf_solution_graph.jpg',
};

function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function toVariantCode(value) {
  if (value === 'SUJET_1') {
    return ExamVariantCode.SUJET_1;
  }

  if (value === 'SUJET_2') {
    return ExamVariantCode.SUJET_2;
  }

  throw new Error(`Unsupported variant code: ${value}`);
}

function toSessionType(value) {
  if (value === 'NORMAL') {
    return SessionType.NORMAL;
  }

  if (value === 'MAKEUP') {
    return SessionType.MAKEUP;
  }

  throw new Error(`Unsupported session type: ${value}`);
}

function toBlockType(value) {
  if (value === 'heading') {
    return BlockType.HEADING;
  }

  if (value === 'latex') {
    return BlockType.LATEX;
  }

  return BlockType.PARAGRAPH;
}

async function createBlocks(tx, nodeId, role, blocks, assetIds, assetLookup) {
  let orderIndex = 1;

  for (const block of blocks) {
    await tx.examNodeBlock.create({
      data: {
        nodeId,
        role,
        orderIndex,
        blockType: toBlockType(block.type),
        textValue: block.text,
      },
    });
    orderIndex += 1;
  }

  for (const assetId of assetIds) {
    const asset = assetLookup.get(assetId);

    if (!asset || asset.role !== role) {
      continue;
    }

    const assetUrl = ASSET_URLS[asset.id];
    if (!assetUrl) {
      throw new Error(`Missing asset URL mapping for ${asset.id}`);
    }

    await tx.examNodeBlock.create({
      data: {
        nodeId,
        role,
        orderIndex,
        blockType: BlockType.IMAGE,
        textValue: null,
        data: {
          url: assetUrl,
          caption: asset.caption_ar ?? null,
          kind: asset.kind,
          pageNumber: asset.page_number,
          locationHint: asset.location_hint,
          notes: asset.notes ?? null,
        },
      },
    });
    orderIndex += 1;
  }
}

async function main() {
  const data = readData();

  const stream = await prisma.stream.findUnique({
    where: { code: 'SE' },
    select: { id: true, code: true, name: true },
  });
  const subject = await prisma.subject.findUnique({
    where: { code: 'MATHEMATICS' },
    select: { id: true, code: true, name: true },
  });

  if (!stream || !subject) {
    throw new Error('Required SE/MATHEMATICS taxonomy rows are missing.');
  }

  const sessionType = toSessionType(data.exam.session_type);
  const assetLookup = new Map(data.assets.map((asset) => [asset.id, asset]));

  const existingExam = await prisma.exam.findFirst({
    where: {
      year: data.exam.year,
      streamId: stream.id,
      subjectId: subject.id,
      sessionType,
    },
    select: { id: true },
  });

  if (existingExam) {
    await prisma.exam.delete({
      where: { id: existingExam.id },
    });
  }

  const exam = await prisma.exam.create({
    data: {
      year: data.exam.year,
      streamId: stream.id,
      subjectId: subject.id,
      sessionType,
      durationMinutes: data.exam.duration_minutes ?? 210,
      totalPoints: data.exam.total_points ?? 20,
      isPublished: true,
      officialSourceReference: [
        'BAC 2024 - Sciences Expérimentales - Mathématiques',
        `Primary source PDF: ${SOURCE_PDF_PATH}`,
        'Imported from manual Gemini JSON review and scanned-page crops.',
      ].join(' | '),
    },
    select: { id: true },
  });

  for (const variant of data.variants) {
    const savedVariant = await prisma.examVariant.create({
      data: {
        examId: exam.id,
        code: toVariantCode(variant.code),
        title: variant.title_ar,
        status: PublicationStatus.PUBLISHED,
        metadata: {
          sourceLanguage: data.exam.source_language,
          hasCorrection: Boolean(data.exam.has_correction),
        },
      },
      select: { id: true },
    });

    for (const exercise of variant.exercises) {
      const exerciseNode = await prisma.examNode.create({
        data: {
          variantId: savedVariant.id,
          parentId: null,
          nodeType: ExamNodeType.EXERCISE,
          orderIndex: exercise.order_index,
          label: exercise.title_ar,
          title: exercise.title_ar,
          maxPoints: exercise.max_points ?? null,
          status: PublicationStatus.PUBLISHED,
          metadata: {
            topicLabels: [],
          },
        },
        select: { id: true },
      });

      await createBlocks(
        prisma,
        exerciseNode.id,
        BlockRole.PROMPT,
        exercise.context_blocks,
        [],
        assetLookup,
      );

      for (const question of exercise.questions) {
        const questionNode = await prisma.examNode.create({
          data: {
            variantId: savedVariant.id,
            parentId: exerciseNode.id,
            nodeType: ExamNodeType.QUESTION,
            orderIndex: question.order_index,
            label: question.label ?? null,
            title: question.title_ar ?? question.label ?? null,
            maxPoints: question.max_points ?? null,
            status: PublicationStatus.PUBLISHED,
            metadata: {
              topicLabels: question.topics,
            },
          },
          select: { id: true },
        });

        await createBlocks(
          prisma,
          questionNode.id,
          BlockRole.PROMPT,
          question.prompt_blocks,
          question.asset_ids,
          assetLookup,
        );
        await createBlocks(
          prisma,
          questionNode.id,
          BlockRole.SOLUTION,
          question.solution_blocks,
          question.asset_ids,
          assetLookup,
        );

        if (Array.isArray(question.hint_blocks) && question.hint_blocks.length) {
          await createBlocks(
            prisma,
            questionNode.id,
            BlockRole.HINT,
            question.hint_blocks,
            [],
            assetLookup,
          );
        }
      }
    }
  }

  const summary = await prisma.exam.findUnique({
    where: { id: exam.id },
    select: {
      id: true,
      year: true,
      isPublished: true,
      variants: {
        select: {
          code: true,
          status: true,
          _count: {
            select: { nodes: true },
          },
        },
        orderBy: { code: 'asc' },
      },
    },
  });

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
