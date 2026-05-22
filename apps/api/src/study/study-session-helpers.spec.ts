import {
  BlockRole,
  BlockType,
  ExamNodeType,
  ExamVariantCode,
  PublicationStatus,
} from '@prisma/client';
import {
  mapVariantHierarchy,
  type ExamVariantWithNodes,
} from './study-session-helpers';

function createNode(input: {
  id: string;
  parentId: string | null;
  nodeType: ExamNodeType;
  orderIndex: number;
  label?: string | null;
  blocks?: ExamVariantWithNodes['nodes'][number]['blocks'];
}): ExamVariantWithNodes['nodes'][number] {
  return {
    id: input.id,
    parentId: input.parentId,
    nodeType: input.nodeType,
    orderIndex: input.orderIndex,
    label: input.label ?? null,
    maxPoints: null,
    status: PublicationStatus.PUBLISHED,
    metadata: null,
    curriculumNodeMappings: [],
    blocks: input.blocks ?? [],
  };
}

describe('study session hierarchy helpers', () => {
  it('keeps leading root context visible when exercise roots are present', () => {
    const variant: ExamVariantWithNodes = {
      id: 'variant-1',
      code: ExamVariantCode.SUJET_1,
      title: 'الموضوع الأول',
      status: PublicationStatus.PUBLISHED,
      nodes: [
        createNode({
          id: 'context-root',
          parentId: null,
          nodeType: ExamNodeType.CONTEXT,
          orderIndex: 1,
          blocks: [
            {
              id: 'context-block',
              role: BlockRole.PROMPT,
              orderIndex: 1,
              blockType: BlockType.PARAGRAPH,
              textValue: 'أجب عن أحد الموضوعين الآتيين على الخيار.',
              data: null,
              media: null,
            },
          ],
        }),
        createNode({
          id: 'part-root',
          parentId: null,
          nodeType: ExamNodeType.EXERCISE,
          orderIndex: 2,
          label: 'الجزء الأول',
        }),
        createNode({
          id: 'question-1',
          parentId: 'part-root',
          nodeType: ExamNodeType.QUESTION,
          orderIndex: 1,
          label: 'السؤال 1',
        }),
      ],
    };

    const hierarchy = mapVariantHierarchy(variant);

    expect(hierarchy.exercises).toHaveLength(1);
    expect(hierarchy.exercises[0]).toMatchObject({
      id: 'part-root',
      children: [
        {
          id: 'context-root',
          nodeType: ExamNodeType.CONTEXT,
        },
        {
          id: 'question-1',
          nodeType: ExamNodeType.QUESTION,
        },
      ],
    });
  });
});
