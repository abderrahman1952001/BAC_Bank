import type {
  DraftAsset,
  DraftAssetClassification,
  DraftBlock,
  DraftBlockRole,
  DraftBlockType,
  DraftDocumentKind,
  DraftNode,
  DraftVariantCode,
  IngestionDraft,
} from './ingestion.contract';
import { normalizeIngestionDraft } from './ingestion.contract';
import {
  detectPartMarkerFromLabel,
  inferPointsFromTextBlocks,
  normalizeExerciseLabel,
  questionLabelForIndex,
  splitLeadingQuestionMarker,
  splitLeadingSubquestionMarker,
  splitLeadingPartContextBlocks,
  splitTextAtPartMarkerLine,
  subquestionLabelForLetter,
  type DetectedPartMarker,
  type DetectedSubquestionMarker,
} from './ingestion-part-normalization';

type ReviewedTextBlock = {
  type: 'paragraph' | 'heading' | 'latex';
  text: string;
};

type ReviewedQuestion = {
  orderIndex: number;
  label: string | null;
  maxPoints: number | null;
  promptBlocks: ReviewedTextBlock[];
  solutionBlocks: ReviewedTextBlock[];
  hintBlocks: ReviewedTextBlock[];
  rubricBlocks: ReviewedTextBlock[];
  assetIds: string[];
};

type ReviewedExercise = {
  orderIndex: number;
  title: string;
  maxPoints: number | null;
  contextBlocks: ReviewedTextBlock[];
  assetIds: string[];
  questions: ReviewedQuestion[];
};

type ReviewedVariant = {
  code: DraftVariantCode;
  title: string;
  exercises: ReviewedExercise[];
};

type ReviewedAsset = {
  id: string;
  exerciseOrderIndex: number;
  questionOrderIndex: number | null;
  documentKind: DraftDocumentKind;
  role: DraftBlockRole;
  classification: DraftAssetClassification;
  pageNumber: number;
  caption: string | null;
  variantCode: DraftVariantCode | null;
};

type ReviewedExamMetadata = {
  durationMinutes: number | null;
  hasCorrection: boolean | null;
  sourceLanguage: string | null;
  title: string | null;
  totalPoints: number | null;
};

export type ReviewedPaperExtract = {
  variants: ReviewedVariant[];
  assets: ReviewedAsset[];
  uncertainties: unknown[];
  exam: ReviewedExamMetadata;
};

export type ReviewedPaperImportSummary = {
  variantCount: number;
  exerciseCount: number;
  questionCount: number;
  assetCount: number;
  uncertaintyCount: number;
  placeholderAssetCount: number;
  missingVariantCodes: DraftVariantCode[];
};

const DEFAULT_VARIANT_TITLES: Record<DraftVariantCode, string> = {
  SUJET_1: 'الموضوع الأول',
  SUJET_2: 'الموضوع الثاني',
};

export function parseReviewedPaperExtract(
  value: unknown,
  sourceLabel = 'reviewed paper extract',
): ReviewedPaperExtract {
  const root = asRecord(value, sourceLabel);

  return {
    variants: readArray(root.variants, `${sourceLabel}.variants`).map(
      (entry, index) =>
        parseReviewedVariant(entry, `${sourceLabel}.variants[${index}]`),
    ),
    assets: readArray(root.assets, `${sourceLabel}.assets`).map(
      (entry, index) =>
        parseReviewedAsset(entry, `${sourceLabel}.assets[${index}]`),
    ),
    uncertainties: readArray(
      root.uncertainties,
      `${sourceLabel}.uncertainties`,
    ).map((entry) => entry),
    exam: parseReviewedExamMetadata(root.exam, `${sourceLabel}.exam`),
  };
}

export function importReviewedPaperExtract(input: {
  baseDraft: IngestionDraft;
  reviewedExtract: ReviewedPaperExtract;
  importFilePath: string;
  importedAt?: Date;
  jobTitle?: string | null;
}) {
  const importedAt = input.importedAt ?? new Date();
  const draft = normalizeIngestionDraft(
    JSON.parse(JSON.stringify(input.baseDraft)),
  );
  const sourcePagesByKey = new Map(
    draft.sourcePages.map((page) => [
      buildSourcePageKey(page.documentKind, page.pageNumber),
      page,
    ]),
  );

  draft.exam.title =
    normalizeOptionalString(input.jobTitle) ?? draft.exam.title.trim();
  draft.exam.metadata = {
    ...draft.exam.metadata,
    importedFromReviewedExtract: true,
    reviewedExtractFile: input.importFilePath,
    importedReviewedExtractAt: importedAt.toISOString(),
    reviewedExtractExamTitle: input.reviewedExtract.exam.title,
    reviewedExtractHasCorrection: input.reviewedExtract.exam.hasCorrection,
    reviewedExtractSourceLanguage: input.reviewedExtract.exam.sourceLanguage,
    reviewedExtractUncertaintyCount: input.reviewedExtract.uncertainties.length,
    ...(input.reviewedExtract.exam.durationMinutes !== null
      ? {
          durationMinutes: input.reviewedExtract.exam.durationMinutes,
        }
      : {}),
    ...(input.reviewedExtract.exam.totalPoints !== null
      ? {
          totalPoints: input.reviewedExtract.exam.totalPoints,
        }
      : {}),
  };

  const assets = input.reviewedExtract.assets.map((asset) => {
    const sourcePage = sourcePagesByKey.get(
      buildSourcePageKey(asset.documentKind, asset.pageNumber),
    );

    if (!sourcePage) {
      throw new Error(
        `Asset ${asset.id} references missing ${asset.documentKind} page ${asset.pageNumber}.`,
      );
    }

    const importedAsset: DraftAsset = {
      id: asset.id,
      sourcePageId: sourcePage.id,
      documentKind: asset.documentKind,
      pageNumber: asset.pageNumber,
      variantCode: asset.variantCode,
      role: asset.role,
      classification: asset.classification,
      cropBox: {
        x: 0,
        y: 0,
        width: sourcePage.width,
        height: sourcePage.height,
      },
      label: asset.caption,
      notes:
        'Imported without crop geometry; refine before approval or publish.',
      nativeSuggestion: null,
    };

    return importedAsset;
  });
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  draft.assets = assets;
  draft.variants = (['SUJET_1', 'SUJET_2'] as const).map((variantCode) => {
    const sourceVariant = input.reviewedExtract.variants.find(
      (entry) => entry.code === variantCode,
    );
    const existingVariant = draft.variants.find(
      (entry) => entry.code === variantCode,
    );

    return {
      code: variantCode,
      title:
        normalizeOptionalString(sourceVariant?.title) ??
        normalizeOptionalString(existingVariant?.title) ??
        DEFAULT_VARIANT_TITLES[variantCode],
      nodes: sourceVariant
        ? buildVariantNodes({
            variant: sourceVariant,
            assetsById,
          })
        : [],
    };
  });

  const summary = buildImportSummary(input.reviewedExtract, assets.length);

  return {
    draft: normalizeIngestionDraft(draft),
    summary,
  };
}

function buildImportSummary(
  reviewedExtract: ReviewedPaperExtract,
  placeholderAssetCount: number,
): ReviewedPaperImportSummary {
  const exerciseCount = reviewedExtract.variants.reduce(
    (sum, variant) => sum + variant.exercises.length,
    0,
  );
  const questionCount = reviewedExtract.variants.reduce(
    (sum, variant) =>
      sum +
      variant.exercises.reduce(
        (exerciseSum, exercise) => exerciseSum + exercise.questions.length,
        0,
      ),
    0,
  );

  return {
    variantCount: reviewedExtract.variants.length,
    exerciseCount,
    questionCount,
    assetCount: reviewedExtract.assets.length,
    uncertaintyCount: reviewedExtract.uncertainties.length,
    placeholderAssetCount,
    missingVariantCodes: (['SUJET_1', 'SUJET_2'] as const).filter(
      (variantCode) =>
        !reviewedExtract.variants.some(
          (variant) => variant.code === variantCode,
        ),
    ),
  };
}

function buildVariantNodes(input: {
  variant: ReviewedVariant;
  assetsById: Map<string, DraftAsset>;
}) {
  return input.variant.exercises.flatMap((exercise) =>
    buildExerciseNodes({
      variantCode: input.variant.code,
      exercise,
      assetsById: input.assetsById,
    }),
  );
}

function buildExerciseNodes(input: {
  variantCode: DraftVariantCode;
  exercise: ReviewedExercise;
  assetsById: Map<string, DraftAsset>;
}) {
  const { variantCode, exercise, assetsById } = input;
  const exerciseNodeId = buildExerciseNodeId(variantCode, exercise.orderIndex);
  const exerciseContextBlocks: ReviewedTextBlock[] = [];
  const partsByIndex = new Map<number, PendingReviewedPart>();
  const questionNodes: DraftNode[] = [];
  let activePart: PendingReviewedPart | null = null;
  const childQuestionCounters = new Map<string, number>();
  const activeQuestionsByParentId = new Map<string, PendingReviewedQuestion>();
  const pendingQuestionsById = new Map<string, PendingReviewedQuestion>();

  const ensurePart = (marker: DetectedPartMarker) => {
    const existing = partsByIndex.get(marker.partIndex);

    if (existing) {
      return existing;
    }

    const part: PendingReviewedPart = {
      id: buildPartNodeId(variantCode, exercise.orderIndex, marker.partIndex),
      orderIndex: marker.partIndex,
      label: marker.label,
      contextBlocks: [],
    };

    partsByIndex.set(marker.partIndex, part);
    return part;
  };

  const appendQuestion = (input: {
    parentId: string;
    parentPart: PendingReviewedPart | null;
    requestedQuestionIndex: number | null;
    promptBlocks: ReviewedTextBlock[];
    sourceQuestion: ReviewedQuestion;
    includeSourceContent: boolean;
    includePromptAssets: boolean;
    maxPoints: number | null;
  }) => {
    const questionOrderIndex = nextChildQuestionOrder(
      childQuestionCounters,
      input.parentId,
      input.requestedQuestionIndex,
    );
    const questionNodeId = input.parentPart
      ? buildPartQuestionNodeId(
          variantCode,
          exercise.orderIndex,
          input.parentPart.orderIndex,
          questionOrderIndex,
        )
      : buildQuestionNodeId(
          variantCode,
          exercise.orderIndex,
          questionOrderIndex,
        );
    const questionNode: DraftNode = {
      id: questionNodeId,
      nodeType: 'QUESTION',
      parentId: input.parentId,
      orderIndex: questionOrderIndex,
      label: questionLabelForIndex(questionOrderIndex),
      maxPoints: input.maxPoints,
      topicCodes: [],
      blocks: buildQuestionLikeBlocks({
        nodeId: questionNodeId,
        promptBlocks: input.promptBlocks,
        sourceQuestion: input.sourceQuestion,
        assetsById,
        includePromptAssets: input.includePromptAssets,
        includeSolution: input.includeSourceContent,
        includeHint: input.includeSourceContent,
        includeRubric: input.includeSourceContent,
      }),
    };
    const pendingQuestion: PendingReviewedQuestion = {
      node: questionNode,
      subquestionPoints: [],
    };

    questionNodes.push(questionNode);
    activeQuestionsByParentId.set(input.parentId, pendingQuestion);
    pendingQuestionsById.set(questionNode.id, pendingQuestion);

    return pendingQuestion;
  };

  const appendSubquestion = (input: {
    parentQuestion: PendingReviewedQuestion;
    marker: DetectedSubquestionMarker;
    promptBlocks: ReviewedTextBlock[];
    sourceQuestion: ReviewedQuestion;
    includePromptAssets: boolean;
    maxPoints: number | null;
  }) => {
    const subquestionOrderIndex =
      input.parentQuestion.subquestionPoints.length + 1;
    const subquestionNodeId = `${input.parentQuestion.node.id}_subquestion_${subquestionOrderIndex}`;
    const subquestionNode: DraftNode = {
      id: subquestionNodeId,
      nodeType: 'SUBQUESTION',
      parentId: input.parentQuestion.node.id,
      orderIndex: subquestionOrderIndex,
      label: subquestionLabelForLetter(input.marker.letter),
      maxPoints: input.maxPoints,
      topicCodes: [],
      blocks: buildQuestionLikeBlocks({
        nodeId: subquestionNodeId,
        promptBlocks: input.promptBlocks,
        sourceQuestion: input.sourceQuestion,
        assetsById,
        includePromptAssets: input.includePromptAssets,
        includeSolution: true,
        includeHint: true,
        includeRubric: true,
      }),
    };

    questionNodes.push(subquestionNode);
    input.parentQuestion.subquestionPoints.push(input.maxPoints);

    return subquestionNode;
  };

  for (const block of exercise.contextBlocks) {
    const split = splitTextAtPartMarkerLine(block.text);

    if (!split) {
      const targetBlocks = activePart
        ? activePart.contextBlocks
        : exerciseContextBlocks;
      targetBlocks.push(block);
      continue;
    }

    if (split.beforeText) {
      const targetBlocks = activePart
        ? activePart.contextBlocks
        : exerciseContextBlocks;
      targetBlocks.push({
        ...block,
        text: split.beforeText,
      });
    }

    const part = ensurePart(split.marker);
    activePart = part;

    if (split.marker.restText) {
      part.contextBlocks.push({
        ...block,
        text: split.marker.restText,
      });
    }
  }

  for (const question of [...exercise.questions].sort(
    (left, right) => left.orderIndex - right.orderIndex,
  )) {
    const normalizedQuestion = normalizeReviewedQuestionForParts(question);
    const labelPartMarker = detectPartMarkerFromLabel(question.label);
    const partMarker =
      normalizedQuestion.partMarker ??
      (labelPartMarker
        ? {
            partIndex: labelPartMarker.partIndex,
            label: labelPartMarker.label,
            restText: '',
          }
        : null);

    if (partMarker) {
      const part = ensurePart(partMarker);
      activePart = part;
      part.contextBlocks.push(...normalizedQuestion.partContextBlocks);
    }

    const parentId = activePart?.id ?? exerciseNodeId;
    const structuredQuestion = splitReviewedQuestionMarkers(
      normalizedQuestion.promptBlocks,
    );
    const inferredPoints =
      question.maxPoints ?? inferPointsFromTextBlocks(question.rubricBlocks);

    if (structuredQuestion.questionMarker) {
      const subquestionContents = splitReviewedQuestionContentForSubquestions(
        question,
        structuredQuestion.subquestionSegments,
      );
      const questionNode = appendQuestion({
        parentId,
        parentPart: activePart,
        requestedQuestionIndex: structuredQuestion.questionMarker.questionIndex,
        promptBlocks: structuredQuestion.questionPromptBlocks,
        sourceQuestion: question,
        includeSourceContent:
          structuredQuestion.subquestionSegments.length === 0,
        includePromptAssets: true,
        maxPoints:
          structuredQuestion.subquestionSegments.length > 0
            ? subquestionContents.parentMaxPoints
            : inferredPoints,
      });

      for (const [
        index,
        segment,
      ] of structuredQuestion.subquestionSegments.entries()) {
        const content = subquestionContents.segments[index];
        appendSubquestion({
          parentQuestion: questionNode,
          marker: segment.marker,
          promptBlocks: segment.promptBlocks,
          sourceQuestion: content?.sourceQuestion ?? question,
          includePromptAssets: false,
          maxPoints:
            content?.maxPoints ??
            (structuredQuestion.subquestionSegments.length === 1
              ? inferredPoints
              : null),
        });
      }

      continue;
    }

    if (structuredQuestion.subquestionSegments.length) {
      const activeQuestion = activeQuestionsByParentId.get(parentId);

      if (activeQuestion) {
        const subquestionContents = splitReviewedQuestionContentForSubquestions(
          question,
          structuredQuestion.subquestionSegments,
        );

        for (const [
          index,
          segment,
        ] of structuredQuestion.subquestionSegments.entries()) {
          const content = subquestionContents.segments[index];
          appendSubquestion({
            parentQuestion: activeQuestion,
            marker: segment.marker,
            promptBlocks: segment.promptBlocks,
            sourceQuestion: content?.sourceQuestion ?? question,
            includePromptAssets: true,
            maxPoints: content?.maxPoints ?? inferredPoints,
          });
        }
        continue;
      }
    }

    appendQuestion({
      parentId,
      parentPart: activePart,
      requestedQuestionIndex: null,
      promptBlocks: normalizedQuestion.promptBlocks,
      sourceQuestion: question,
      includeSourceContent: true,
      includePromptAssets: true,
      maxPoints: inferredPoints,
    });
  }

  for (const pendingQuestion of pendingQuestionsById.values()) {
    const hasSubquestions = pendingQuestion.subquestionPoints.length > 0;
    const subquestionPoints = pendingQuestion.subquestionPoints.filter(
      (points): points is number => points !== null,
    );

    if (
      hasSubquestions &&
      subquestionPoints.length === pendingQuestion.subquestionPoints.length
    ) {
      pendingQuestion.node.maxPoints = roundPoints(
        subquestionPoints.reduce((sum, points) => sum + points, 0),
      );
    }
  }

  const exerciseNode: DraftNode = {
    id: exerciseNodeId,
    nodeType: 'EXERCISE',
    parentId: null,
    orderIndex: exercise.orderIndex,
    label: normalizeExerciseLabel(exercise.title),
    maxPoints: exercise.maxPoints ?? parsePointsFromText(exercise.title),
    topicCodes: [],
    blocks: [
      ...buildTextBlocks({
        prefix: `${exerciseNodeId}_prompt`,
        role: 'PROMPT',
        blocks: exerciseContextBlocks,
      }),
      ...buildAssetBlocks({
        prefix: `${exerciseNodeId}_asset`,
        assetIds: exercise.assetIds,
        allowedRoles: ['PROMPT', 'SOLUTION', 'HINT', 'RUBRIC', 'META'],
        assetsById,
      }),
    ],
  };

  const partNodes = [...partsByIndex.values()]
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map<DraftNode>((part) => ({
      id: part.id,
      nodeType: 'PART',
      parentId: exerciseNodeId,
      orderIndex: part.orderIndex,
      label: part.label,
      maxPoints: inferPartPoints(part.id, questionNodes),
      topicCodes: [],
      blocks: buildTextBlocks({
        prefix: `${part.id}_prompt`,
        role: 'PROMPT',
        blocks: part.contextBlocks,
      }),
    }));

  return [exerciseNode, ...partNodes, ...questionNodes];
}

type PendingReviewedPart = {
  id: string;
  orderIndex: number;
  label: string;
  contextBlocks: ReviewedTextBlock[];
};

type PendingReviewedQuestion = {
  node: DraftNode;
  subquestionPoints: Array<number | null>;
};

function normalizeReviewedQuestionForParts(question: ReviewedQuestion) {
  const promptBlocks = [...question.promptBlocks];

  for (const [index, block] of promptBlocks.entries()) {
    const split = splitTextAtPartMarkerLine(block.text);

    if (!split) {
      continue;
    }

    const nextPromptBlocks: ReviewedTextBlock[] = [
      ...promptBlocks.slice(0, index),
    ];

    if (split.beforeText) {
      nextPromptBlocks.push({
        ...block,
        text: split.beforeText,
      });
    }

    const remainingPromptBlocks = [
      ...(split.marker.restText
        ? [
            {
              ...block,
              text: split.marker.restText,
            },
          ]
        : []),
      ...promptBlocks.slice(index + 1),
    ];
    const splitRemaining = splitLeadingPartContextBlocks(remainingPromptBlocks);

    nextPromptBlocks.push(...splitRemaining.promptBlocks);

    return {
      partMarker: split.marker,
      partContextBlocks: splitRemaining.partContextBlocks,
      promptBlocks: nextPromptBlocks,
    };
  }

  return {
    partMarker: null,
    partContextBlocks: [],
    promptBlocks,
  };
}

function splitReviewedQuestionMarkers(promptBlocks: ReviewedTextBlock[]) {
  const firstPromptBlock = promptBlocks[0];

  if (!firstPromptBlock) {
    return {
      questionMarker: null,
      questionPromptBlocks: [],
      subquestionSegments: [],
    };
  }

  const questionMarker = splitLeadingQuestionMarker(firstPromptBlock.text);

  if (questionMarker) {
    const promptWithoutQuestionMarker = [
      {
        ...firstPromptBlock,
        text: questionMarker.restText,
      },
      ...promptBlocks.slice(1),
    ].filter(hasReviewedBlockText);
    const subquestionSplit = splitSubquestionsFromBlocks(
      promptWithoutQuestionMarker,
    );

    if (subquestionSplit.segments.length) {
      return {
        questionMarker,
        questionPromptBlocks: subquestionSplit.beforeBlocks,
        subquestionSegments: subquestionSplit.segments,
      };
    }

    return {
      questionMarker,
      questionPromptBlocks: promptWithoutQuestionMarker,
      subquestionSegments: [],
    };
  }

  const subquestionSplit =
    splitContinuationSubquestionsFromBlocks(promptBlocks);

  if (subquestionSplit.segments.length) {
    return {
      questionMarker: null,
      questionPromptBlocks: [],
      subquestionSegments: subquestionSplit.segments,
    };
  }

  return {
    questionMarker: null,
    questionPromptBlocks: promptBlocks,
    subquestionSegments: [],
  };
}

function splitContinuationSubquestionsFromBlocks(blocks: ReviewedTextBlock[]) {
  for (const [index, block] of blocks.entries()) {
    if (!splitLeadingSubquestionMarker(block.text)) {
      continue;
    }

    const split = splitSubquestionsFromBlocks(blocks.slice(index));
    const leadingContextBlocks = blocks.slice(0, index);
    const firstSegment = split.segments[0];

    if (firstSegment && leadingContextBlocks.length) {
      firstSegment.promptBlocks = [
        ...leadingContextBlocks,
        ...firstSegment.promptBlocks,
      ].filter(hasReviewedBlockText);
    }

    return {
      beforeBlocks: [],
      segments: split.segments,
    };
  }

  return {
    beforeBlocks: blocks,
    segments: [],
  };
}

function splitSubquestionsFromBlocks(blocks: ReviewedTextBlock[]) {
  const beforeBlocks: ReviewedTextBlock[] = [];
  const segments: Array<{
    marker: DetectedSubquestionMarker;
    promptBlocks: ReviewedTextBlock[];
  }> = [];
  let activeSegment: {
    marker: DetectedSubquestionMarker;
    promptBlocks: ReviewedTextBlock[];
  } | null = null;

  const pushText = (block: ReviewedTextBlock, text: string) => {
    const normalizedText = text.trim();

    if (!normalizedText) {
      return;
    }

    const targetBlocks = activeSegment
      ? activeSegment.promptBlocks
      : beforeBlocks;
    targetBlocks.push({
      ...block,
      text: normalizedText,
    });
  };

  for (const block of blocks) {
    const lines = block.text.replace(/\r\n/g, '\n').split('\n');
    let bufferedLines: string[] = [];

    const flush = () => {
      pushText(block, bufferedLines.join('\n'));
      bufferedLines = [];
    };

    for (const line of lines) {
      const marker = splitLeadingSubquestionMarker(line);

      if (!marker) {
        bufferedLines.push(line);
        continue;
      }

      flush();
      activeSegment = {
        marker,
        promptBlocks: [],
      };
      segments.push(activeSegment);

      if (marker.restText) {
        bufferedLines.push(marker.restText);
      }
    }

    flush();
  }

  return {
    beforeBlocks,
    segments,
  };
}

function hasReviewedBlockText(block: ReviewedTextBlock) {
  return block.text.trim().length > 0;
}

function splitReviewedQuestionContentForSubquestions(
  question: ReviewedQuestion,
  subquestionSegments: Array<{
    marker: DetectedSubquestionMarker;
    promptBlocks: ReviewedTextBlock[];
  }>,
) {
  if (!subquestionSegments.length) {
    return {
      parentMaxPoints:
        question.maxPoints ?? inferPointsFromTextBlocks(question.rubricBlocks),
      segments: [],
    };
  }

  const count = subquestionSegments.length;
  const solutionSegments = splitContentBlocksBySubquestions(
    question.solutionBlocks,
    count,
  );
  const hintSegments = splitContentBlocksBySubquestions(
    question.hintBlocks,
    count,
  );
  const rubricDistribution = splitRubricBlocksBySubquestions(
    question.rubricBlocks,
    subquestionSegments,
  );
  const parentMaxPoints =
    question.maxPoints ??
    rubricDistribution.parentMaxPoints ??
    inferPointsFromTextBlocks(question.rubricBlocks);

  return {
    parentMaxPoints,
    segments: subquestionSegments.map((_, index) => {
      const rubricBlocks =
        rubricDistribution.segments[index]?.blocks ??
        (index === 0 ? question.rubricBlocks : []);
      const sourceQuestion: ReviewedQuestion = {
        ...question,
        solutionBlocks:
          solutionSegments[index] ??
          (index === 0 ? question.solutionBlocks : []),
        hintBlocks:
          hintSegments[index] ?? (index === 0 ? question.hintBlocks : []),
        rubricBlocks,
      };

      return {
        sourceQuestion,
        maxPoints:
          rubricDistribution.segments[index]?.maxPoints ??
          inferPointsFromTextBlocks(rubricBlocks),
      };
    }),
  };
}

function splitContentBlocksBySubquestions(
  blocks: ReviewedTextBlock[],
  expectedCount: number,
) {
  if (!blocks.length) {
    return [];
  }

  const normalizedBlocks = stripLeadingStructuralMarkersFromBlocks(blocks);
  const split = splitSubquestionsFromBlocks(normalizedBlocks);

  if (split.segments.length !== expectedCount) {
    return [];
  }

  return split.segments.map((segment) => segment.promptBlocks);
}

function stripLeadingStructuralMarkersFromBlocks(blocks: ReviewedTextBlock[]) {
  const firstBlock = blocks[0];

  if (!firstBlock) {
    return blocks;
  }

  let text = firstBlock.text;
  const partSplit = splitTextAtPartMarkerLine(text);

  if (partSplit) {
    text = partSplit.marker.restText;
  }

  const questionMarker = splitLeadingQuestionMarker(text);

  if (questionMarker) {
    text = questionMarker.restText;
  }

  return [
    {
      ...firstBlock,
      text,
    },
    ...blocks.slice(1),
  ].filter(hasReviewedBlockText);
}

function splitRubricBlocksBySubquestions(
  blocks: ReviewedTextBlock[],
  subquestionSegments: Array<{
    marker: DetectedSubquestionMarker;
    promptBlocks: ReviewedTextBlock[];
  }>,
) {
  const expectedCount = subquestionSegments.length;
  const markerSplit = splitContentBlocksBySubquestions(blocks, expectedCount);

  if (markerSplit.length === expectedCount) {
    return {
      parentMaxPoints: inferPointsFromTextBlocks(blocks),
      segments: markerSplit.map((segmentBlocks) => ({
        blocks: segmentBlocks,
        maxPoints: inferPointsFromTextBlocks(segmentBlocks),
      })),
    };
  }

  const lineDistribution = distributeRubricLinesByPoints(
    blocks,
    subquestionSegments,
  );

  if (lineDistribution) {
    return lineDistribution;
  }

  return {
    parentMaxPoints: inferSplitRubricParentPoints(blocks),
    segments: subquestionSegments.map(() => ({
      blocks: [],
      maxPoints: null,
    })),
  };
}

function distributeRubricLinesByPoints(
  blocks: ReviewedTextBlock[],
  subquestionSegments: Array<{
    marker: DetectedSubquestionMarker;
    promptBlocks: ReviewedTextBlock[];
  }>,
) {
  const scoredLines = flattenRubricScoreLines(blocks);
  const expectedCount = subquestionSegments.length;

  if (scoredLines.length < expectedCount) {
    return null;
  }

  const firstScore = scoredLines[0];
  const remainingScores = scoredLines.slice(1);
  const remainingTotal = sumScoreLines(remainingScores);
  const hasLeadingTotal =
    expectedCount > 1 && firstScore && remainingScores.length >= expectedCount
      ? pointsEqual(firstScore.maxPoints, remainingTotal)
      : false;
  const distributableScores = hasLeadingTotal ? remainingScores : scoredLines;

  if (distributableScores.length < expectedCount) {
    return null;
  }

  const groups = groupRubricScoreLines(
    distributableScores,
    subquestionSegments,
  );

  if (!groups) {
    return null;
  }

  return {
    parentMaxPoints: hasLeadingTotal
      ? (firstScore?.maxPoints ?? null)
      : sumScoreLines(distributableScores),
    segments: groups.map((group) => ({
      blocks: group.map((entry) => entry.block),
      maxPoints: sumScoreLines(group),
    })),
  };
}

function groupRubricScoreLines(
  scoredLines: ReviewedRubricScoreLine[],
  subquestionSegments: Array<{
    marker: DetectedSubquestionMarker;
    promptBlocks: ReviewedTextBlock[];
  }>,
) {
  if (scoredLines.length === subquestionSegments.length) {
    return scoredLines.map((line) => [line]);
  }

  if (subquestionSegments.length !== 2) {
    return null;
  }

  const secondPromptText = subquestionSegments[1]?.promptBlocks
    .map((block) => block.text)
    .join('\n');
  const lastLineOnlyForSecond =
    secondPromptText && /(?:رسم|مثّل|مثل|أنجز)/.test(secondPromptText);

  if (lastLineOnlyForSecond) {
    return [scoredLines.slice(0, -1), scoredLines.slice(-1)];
  }

  const midpoint = Math.ceil(scoredLines.length / 2);
  return [scoredLines.slice(0, midpoint), scoredLines.slice(midpoint)];
}

function flattenRubricScoreLines(blocks: ReviewedTextBlock[]) {
  const scoredLines: ReviewedRubricScoreLine[] = [];

  for (const block of blocks) {
    for (const line of block.text.replace(/\r\n/g, '\n').split('\n')) {
      const maxPoints = inferPointsFromTextBlocks([{ text: line }]);

      if (maxPoints === null) {
        continue;
      }

      scoredLines.push({
        block: {
          ...block,
          text: line,
        },
        maxPoints,
      });
    }
  }

  return scoredLines;
}

type ReviewedRubricScoreLine = {
  block: ReviewedTextBlock;
  maxPoints: number;
};

function inferSplitRubricParentPoints(blocks: ReviewedTextBlock[]) {
  const scoredLines = flattenRubricScoreLines(blocks);
  const firstScore = scoredLines[0];

  if (!firstScore) {
    return null;
  }

  const remainingTotal = sumScoreLines(scoredLines.slice(1));

  return pointsEqual(firstScore.maxPoints, remainingTotal)
    ? firstScore.maxPoints
    : null;
}

function sumScoreLines(scoredLines: ReviewedRubricScoreLine[]) {
  return roundPoints(
    scoredLines.reduce((sum, entry) => sum + entry.maxPoints, 0),
  );
}

function pointsEqual(left: number, right: number) {
  return Math.abs(left - right) < 0.001;
}

function buildQuestionLikeBlocks(input: {
  nodeId: string;
  promptBlocks: ReviewedTextBlock[];
  sourceQuestion: ReviewedQuestion;
  assetsById: Map<string, DraftAsset>;
  includePromptAssets: boolean;
  includeSolution: boolean;
  includeHint: boolean;
  includeRubric: boolean;
}) {
  return [
    ...buildTextBlocks({
      prefix: `${input.nodeId}_prompt`,
      role: 'PROMPT',
      blocks: input.promptBlocks,
    }),
    ...(input.includePromptAssets
      ? buildAssetBlocks({
          prefix: `${input.nodeId}_prompt_asset`,
          assetIds: input.sourceQuestion.assetIds,
          allowedRoles: ['PROMPT'],
          assetsById: input.assetsById,
        })
      : []),
    ...(input.includeSolution
      ? [
          ...buildTextBlocks({
            prefix: `${input.nodeId}_solution`,
            role: 'SOLUTION',
            blocks: input.sourceQuestion.solutionBlocks,
          }),
          ...buildAssetBlocks({
            prefix: `${input.nodeId}_solution_asset`,
            assetIds: input.sourceQuestion.assetIds,
            allowedRoles: ['SOLUTION'],
            assetsById: input.assetsById,
          }),
        ]
      : []),
    ...(input.includeHint
      ? [
          ...buildTextBlocks({
            prefix: `${input.nodeId}_hint`,
            role: 'HINT',
            blocks: input.sourceQuestion.hintBlocks,
          }),
          ...buildAssetBlocks({
            prefix: `${input.nodeId}_hint_asset`,
            assetIds: input.sourceQuestion.assetIds,
            allowedRoles: ['HINT'],
            assetsById: input.assetsById,
          }),
        ]
      : []),
    ...(input.includeRubric
      ? [
          ...buildTextBlocks({
            prefix: `${input.nodeId}_rubric`,
            role: 'RUBRIC',
            blocks: input.sourceQuestion.rubricBlocks,
          }),
          ...buildAssetBlocks({
            prefix: `${input.nodeId}_rubric_asset`,
            assetIds: input.sourceQuestion.assetIds,
            allowedRoles: ['RUBRIC', 'META'],
            assetsById: input.assetsById,
          }),
        ]
      : []),
  ];
}

function inferPartPoints(parentId: string, nodes: DraftNode[]) {
  const childQuestions = nodes.filter(
    (node) => node.parentId === parentId && node.nodeType === 'QUESTION',
  );

  if (!childQuestions.length) {
    return null;
  }

  if (childQuestions.some((node) => node.maxPoints === null)) {
    return null;
  }

  return roundPoints(
    childQuestions.reduce((sum, node) => sum + (node.maxPoints ?? 0), 0),
  );
}

function nextChildQuestionOrder(
  counters: Map<string, number>,
  parentId: string,
  requestedOrderIndex: number | null = null,
) {
  const currentOrder = counters.get(parentId) ?? 0;
  const nextOrder =
    requestedOrderIndex !== null && requestedOrderIndex > currentOrder
      ? requestedOrderIndex
      : currentOrder + 1;
  counters.set(parentId, nextOrder);
  return nextOrder;
}

function roundPoints(value: number) {
  return Number.parseFloat(value.toFixed(3));
}

function buildPartNodeId(
  variantCode: DraftVariantCode,
  exerciseOrderIndex: number,
  partOrderIndex: number,
) {
  return `${variantCode.toLowerCase()}_exercise_${exerciseOrderIndex}_part_${partOrderIndex}`;
}

function buildPartQuestionNodeId(
  variantCode: DraftVariantCode,
  exerciseOrderIndex: number,
  partOrderIndex: number,
  questionOrderIndex: number,
) {
  return `${variantCode.toLowerCase()}_exercise_${exerciseOrderIndex}_part_${partOrderIndex}_question_${questionOrderIndex}`;
}

function buildTextBlocks(input: {
  prefix: string;
  role: DraftBlockRole;
  blocks: ReviewedTextBlock[];
}) {
  return input.blocks.flatMap((block, index) => {
    const value = block.text.trim();

    if (!value) {
      return [];
    }

    const draftBlock: DraftBlock = {
      id: `${input.prefix}_${index + 1}`,
      role: input.role,
      type: block.type,
      value,
    };

    return [draftBlock];
  });
}

function buildAssetBlocks(input: {
  prefix: string;
  assetIds: string[];
  allowedRoles: DraftBlockRole[];
  assetsById: Map<string, DraftAsset>;
}) {
  return input.assetIds.flatMap((assetId, index) => {
    const asset = input.assetsById.get(assetId);

    if (!asset || !input.allowedRoles.includes(asset.role)) {
      return [];
    }

    const draftBlock: DraftBlock = {
      id: `${input.prefix}_${index + 1}`,
      role: asset.role,
      type: mapAssetClassificationToBlockType(asset.classification),
      value: asset.label ?? '',
      assetId: asset.id,
    };

    return [draftBlock];
  });
}

function parseReviewedVariant(
  value: unknown,
  sourceLabel: string,
): ReviewedVariant {
  const record = asRecord(value, sourceLabel);
  const code = readVariantCode(record.code, `${sourceLabel}.code`);

  return {
    code,
    title:
      normalizeOptionalString(record.title) ?? DEFAULT_VARIANT_TITLES[code],
    exercises: readArray(record.exercises, `${sourceLabel}.exercises`).map(
      (entry, index) =>
        parseReviewedExercise(entry, `${sourceLabel}.exercises[${index}]`),
    ),
  };
}

function parseReviewedExercise(
  value: unknown,
  sourceLabel: string,
): ReviewedExercise {
  const record = asRecord(value, sourceLabel);

  return {
    orderIndex: readPositiveInteger(
      record.orderIndex,
      `${sourceLabel}.orderIndex`,
    ),
    title: readRequiredString(record.title, `${sourceLabel}.title`),
    maxPoints: readOptionalNumber(record.maxPoints, `${sourceLabel}.maxPoints`),
    contextBlocks: readReviewedBlocks(
      record.contextBlocks,
      `${sourceLabel}.contextBlocks`,
    ),
    assetIds: readStringArray(record.assetIds, `${sourceLabel}.assetIds`),
    questions: readArray(record.questions, `${sourceLabel}.questions`).map(
      (entry, index) =>
        parseReviewedQuestion(entry, `${sourceLabel}.questions[${index}]`),
    ),
  };
}

function parseReviewedQuestion(
  value: unknown,
  sourceLabel: string,
): ReviewedQuestion {
  const record = asRecord(value, sourceLabel);

  return {
    orderIndex: readPositiveInteger(
      record.orderIndex,
      `${sourceLabel}.orderIndex`,
    ),
    label: normalizeOptionalString(record.label),
    maxPoints: readOptionalNumber(record.maxPoints, `${sourceLabel}.maxPoints`),
    promptBlocks: readReviewedBlocks(
      record.promptBlocks,
      `${sourceLabel}.promptBlocks`,
    ),
    solutionBlocks: readReviewedBlocks(
      record.solutionBlocks,
      `${sourceLabel}.solutionBlocks`,
    ),
    hintBlocks: readReviewedBlocks(
      record.hintBlocks,
      `${sourceLabel}.hintBlocks`,
    ),
    rubricBlocks: readReviewedBlocks(
      record.rubricBlocks,
      `${sourceLabel}.rubricBlocks`,
    ),
    assetIds: readStringArray(record.assetIds, `${sourceLabel}.assetIds`),
  };
}

function parseReviewedAsset(
  value: unknown,
  sourceLabel: string,
): ReviewedAsset {
  const record = asRecord(value, sourceLabel);

  return {
    id: readRequiredString(record.id, `${sourceLabel}.id`),
    exerciseOrderIndex: readPositiveInteger(
      record.exerciseOrderIndex,
      `${sourceLabel}.exerciseOrderIndex`,
    ),
    questionOrderIndex: readOptionalPositiveInteger(
      record.questionOrderIndex,
      `${sourceLabel}.questionOrderIndex`,
    ),
    documentKind: readDocumentKind(
      record.documentKind,
      `${sourceLabel}.documentKind`,
    ),
    role: readBlockRole(record.role, `${sourceLabel}.role`),
    classification: readAssetClassification(
      record.classification,
      `${sourceLabel}.classification`,
    ),
    pageNumber: readPositiveInteger(
      record.pageNumber,
      `${sourceLabel}.pageNumber`,
    ),
    caption: normalizeOptionalString(record.caption),
    variantCode: readOptionalVariantCode(
      record.variantCode,
      `${sourceLabel}.variantCode`,
    ),
  };
}

function parseReviewedExamMetadata(
  value: unknown,
  sourceLabel: string,
): ReviewedExamMetadata {
  const record =
    value === undefined || value === null ? {} : asRecord(value, sourceLabel);

  return {
    durationMinutes: readOptionalInteger(
      record.durationMinutes,
      `${sourceLabel}.durationMinutes`,
    ),
    hasCorrection:
      typeof record.hasCorrection === 'boolean' ? record.hasCorrection : null,
    sourceLanguage: normalizeOptionalString(record.sourceLanguage),
    title: normalizeOptionalString(record.title),
    totalPoints: readOptionalInteger(
      record.totalPoints,
      `${sourceLabel}.totalPoints`,
    ),
  };
}

function readReviewedBlocks(value: unknown, sourceLabel: string) {
  return readArray(value, sourceLabel).map((entry, index) => {
    const record = asRecord(entry, `${sourceLabel}[${index}]`);
    const type = readTextBlockType(
      record.type,
      `${sourceLabel}[${index}].type`,
    );

    return {
      type,
      text: readRequiredString(record.text, `${sourceLabel}[${index}].text`),
    };
  });
}

function buildSourcePageKey(
  documentKind: DraftDocumentKind,
  pageNumber: number,
) {
  return `${documentKind}:${pageNumber}`;
}

function buildExerciseNodeId(
  variantCode: DraftVariantCode,
  exerciseOrderIndex: number,
) {
  return `${variantCode.toLowerCase()}_exercise_${exerciseOrderIndex}`;
}

function buildQuestionNodeId(
  variantCode: DraftVariantCode,
  exerciseOrderIndex: number,
  questionOrderIndex: number,
) {
  return `${variantCode.toLowerCase()}_exercise_${exerciseOrderIndex}_question_${questionOrderIndex}`;
}

function mapAssetClassificationToBlockType(
  classification: DraftAssetClassification,
): DraftBlockType {
  return classification;
}

function parsePointsFromText(value: string) {
  const matches = Array.from(
    value.matchAll(/\(([\d٠-٩]+(?:[.,][\d٠-٩]+)?)\s*نقاط?\)/g),
  );

  if (matches.length === 0) {
    return null;
  }

  const raw = matches[matches.length - 1]?.[1];
  if (!raw) {
    return null;
  }

  const normalized = normalizeNumericString(raw).replace(',', '.');
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function readArray(value: unknown, sourceLabel: string): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  throw new Error(`${sourceLabel} must be an array.`);
}

function asRecord(value: unknown, sourceLabel: string) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw new Error(`${sourceLabel} must be an object.`);
}

function readRequiredString(value: unknown, sourceLabel: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${sourceLabel} must be a non-empty string.`);
  }

  return value.trim();
}

function readPositiveInteger(value: unknown, sourceLabel: string) {
  const parsed = readOptionalInteger(value, sourceLabel);

  if (parsed === null || parsed < 1) {
    throw new Error(`${sourceLabel} must be a positive integer.`);
  }

  return parsed;
}

function readOptionalPositiveInteger(value: unknown, sourceLabel: string) {
  const parsed = readOptionalInteger(value, sourceLabel);

  if (parsed === null) {
    return null;
  }

  if (parsed < 1) {
    throw new Error(`${sourceLabel} must be a positive integer when present.`);
  }

  return parsed;
}

function readOptionalInteger(value: unknown, sourceLabel: string) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized =
    typeof value === 'string' ? normalizeNumericString(value.trim()) : value;
  let parsed: number;

  if (typeof normalized === 'number') {
    parsed = normalized;
  } else if (typeof normalized === 'string') {
    parsed = Number.parseInt(normalized, 10);
  } else {
    throw new Error(`${sourceLabel} must be an integer.`);
  }

  if (!Number.isInteger(parsed)) {
    throw new Error(`${sourceLabel} must be an integer.`);
  }

  return parsed;
}

function readOptionalNumber(value: unknown, sourceLabel: string) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized =
    typeof value === 'string'
      ? normalizeNumericString(value.trim()).replace(',', '.')
      : value;
  let parsed: number;

  if (typeof normalized === 'number') {
    parsed = normalized;
  } else if (typeof normalized === 'string') {
    parsed = Number.parseFloat(normalized);
  } else {
    throw new Error(`${sourceLabel} must be a finite number.`);
  }

  if (!Number.isFinite(parsed)) {
    throw new Error(`${sourceLabel} must be a finite number.`);
  }

  return parsed;
}

function readStringArray(value: unknown, sourceLabel: string) {
  return readArray(value, sourceLabel).map((entry, index) =>
    readRequiredString(entry, `${sourceLabel}[${index}]`),
  );
}

function readVariantCode(
  value: unknown,
  sourceLabel: string,
): DraftVariantCode {
  if (value === 'SUJET_1' || value === 'SUJET_2') {
    return value;
  }

  throw new Error(`${sourceLabel} must be SUJET_1 or SUJET_2.`);
}

function readOptionalVariantCode(
  value: unknown,
  sourceLabel: string,
): DraftVariantCode | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return readVariantCode(value, sourceLabel);
}

function readDocumentKind(
  value: unknown,
  sourceLabel: string,
): DraftDocumentKind {
  if (value === 'EXAM' || value === 'CORRECTION') {
    return value;
  }

  throw new Error(`${sourceLabel} must be EXAM or CORRECTION.`);
}

function readBlockRole(value: unknown, sourceLabel: string): DraftBlockRole {
  if (
    value === 'PROMPT' ||
    value === 'SOLUTION' ||
    value === 'HINT' ||
    value === 'RUBRIC' ||
    value === 'META'
  ) {
    return value;
  }

  throw new Error(
    `${sourceLabel} must be one of PROMPT, SOLUTION, HINT, RUBRIC, META.`,
  );
}

function readAssetClassification(
  value: unknown,
  sourceLabel: string,
): DraftAssetClassification {
  if (
    value === 'image' ||
    value === 'table' ||
    value === 'tree' ||
    value === 'graph'
  ) {
    return value;
  }

  throw new Error(`${sourceLabel} must be one of image, table, tree, graph.`);
}

function readTextBlockType(
  value: unknown,
  sourceLabel: string,
): ReviewedTextBlock['type'] {
  if (value === 'paragraph' || value === 'heading' || value === 'latex') {
    return value;
  }

  throw new Error(`${sourceLabel} must be paragraph, heading, or latex.`);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumericString(value: string) {
  return value.replace(/[٠-٩]/g, (digit) =>
    String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
  );
}
