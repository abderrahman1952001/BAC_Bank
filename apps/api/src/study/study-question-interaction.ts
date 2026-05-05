import type {
  StudyQuestionCheckStrategy,
  StudyQuestionInteractionFormat,
  StudySessionResponse,
} from '@bac-bank/contracts/study';
import { BlockType, type Prisma } from '@prisma/client';
import type { SessionHierarchyQuestionPayload } from './study-session-helpers';
import { resolveStudySupportStyle } from './study-pedagogy';
import { resolveStudyQuestionResponseMode } from './study-question-auto-rule';

type QuestionInteraction = NonNullable<
  StudySessionResponse['exercises'][number]['hierarchy']['questions'][number]['interaction']
>;

const KNOWN_INTERACTION_FORMATS = new Set<StudyQuestionInteractionFormat>([
  'GENERAL',
  'PROBLEM_SOLVING',
  'SHORT_RECALL',
  'DOCUMENT_ANALYSIS',
  'ESSAY_RESPONSE',
]);

const KNOWN_CHECK_STRATEGIES = new Set<StudyQuestionCheckStrategy>([
  'RESULT_MATCH',
  'MODEL_COMPARISON',
  'RUBRIC_REVIEW',
]);

export function resolveStudyQuestionInteraction(input: {
  subjectCode: string | null | undefined;
  question: Pick<
    SessionHierarchyQuestionPayload,
    'metadata' | 'promptBlocks' | 'rubricBlocks'
  >;
}): QuestionInteraction {
  const configured = readConfiguredInteraction(input.question.metadata);

  if (configured) {
    return configured;
  }

  const supportStyle = resolveStudySupportStyle(input.subjectCode);
  const responseMode = resolveStudyQuestionResponseMode(
    input.question.metadata,
  );
  const allBlocks = [
    ...input.question.promptBlocks,
    ...input.question.rubricBlocks,
  ];
  const hasStructuredVisual = allBlocks.some(
    (block) =>
      block.blockType === BlockType.TABLE ||
      block.blockType === BlockType.GRAPH ||
      block.blockType === BlockType.TREE ||
      block.blockType === BlockType.IMAGE,
  );
  const hasMathLikeNotation = allBlocks.some(
    (block) =>
      block.blockType === BlockType.LATEX ||
      /[=+\-*/^%]|[0-9]/.test(block.textValue ?? ''),
  );

  if (supportStyle === 'ESSAY_HEAVY') {
    return {
      format: 'ESSAY_RESPONSE',
      captureMode: 'TYPELESS',
      responseMode,
      checkStrategy: 'RUBRIC_REVIEW',
    };
  }

  if (hasStructuredVisual && supportStyle !== 'LOGIC_HEAVY') {
    return {
      format: 'DOCUMENT_ANALYSIS',
      captureMode: 'TYPELESS',
      responseMode,
      checkStrategy: 'RUBRIC_REVIEW',
    };
  }

  if (supportStyle === 'LOGIC_HEAVY' || hasMathLikeNotation) {
    return {
      format: 'PROBLEM_SOLVING',
      captureMode: 'TYPELESS',
      responseMode,
      checkStrategy: 'RESULT_MATCH',
    };
  }

  if (supportStyle === 'CONTENT_HEAVY') {
    return {
      format: 'SHORT_RECALL',
      captureMode: 'TYPELESS',
      responseMode,
      checkStrategy: hasStructuredVisual ? 'RUBRIC_REVIEW' : 'MODEL_COMPARISON',
    };
  }

  return {
    format: 'GENERAL',
    captureMode: 'TYPELESS',
    responseMode,
    checkStrategy: 'MODEL_COMPARISON',
  };
}

function readConfiguredInteraction(
  metadata: Prisma.JsonValue | null,
): QuestionInteraction | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const root = metadata as Record<string, unknown>;
  const interactionValue =
    readRecord(root.interaction) ??
    readRecord(root.studyInteraction) ??
    readRecord(root.player);

  if (!interactionValue) {
    return null;
  }

  const format = normalizeString(interactionValue.format);
  const checkStrategy = normalizeString(
    interactionValue.checkStrategy ?? interactionValue.reviewStrategy,
  );
  const captureMode =
    normalizeString(interactionValue.captureMode) ?? 'TYPELESS';
  const responseMode =
    normalizeString(
      interactionValue.responseMode ??
        interactionValue.answerMode ??
        interactionValue.inputMode,
    ) ?? resolveStudyQuestionResponseMode(metadata);

  if (
    !format ||
    !KNOWN_INTERACTION_FORMATS.has(format as StudyQuestionInteractionFormat) ||
    captureMode !== 'TYPELESS' ||
    !['NONE', 'NUMERIC', 'SHORT_TEXT'].includes(responseMode) ||
    !checkStrategy ||
    !KNOWN_CHECK_STRATEGIES.has(checkStrategy as StudyQuestionCheckStrategy)
  ) {
    return null;
  }

  return {
    format: format as StudyQuestionInteractionFormat,
    captureMode: 'TYPELESS',
    responseMode: responseMode as QuestionInteraction['responseMode'],
    checkStrategy: checkStrategy as StudyQuestionCheckStrategy,
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : null;
}
