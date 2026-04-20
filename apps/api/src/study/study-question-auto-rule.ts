import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type {
  StudyQuestionResponseMode,
  SubmitStudyQuestionAnswerRequest,
} from '@bac-bank/contracts/study';
import {
  StudyQuestionAnswerState,
  StudyQuestionEvaluationMode,
  StudyQuestionResultStatus,
  StudySessionFamily,
  StudySessionStatus,
  type Prisma,
} from '@prisma/client';
import type { StoredStudySessionQuestionRow } from './study-session-state';

type NumericAutoRuleConfig = {
  kind: 'NUMERIC';
  responseMode: 'NUMERIC';
  acceptedValues: number[];
  tolerance: number;
};

type ShortTextAutoRuleConfig = {
  kind: 'SHORT_TEXT';
  responseMode: 'SHORT_TEXT';
  acceptedAnswers: string[];
  acceptedKeywords: string[];
};

export type StudyQuestionAutoRuleConfig =
  | NumericAutoRuleConfig
  | ShortTextAutoRuleConfig;

type AutoRuleAnswerPayload = {
  autoRule?: {
    kind: StudyQuestionAutoRuleConfig['kind'];
    submittedAt: string;
    rawValue: string;
    normalizedValue: string;
    resultStatus: StudyQuestionResultStatus;
    matchedValue: string | number | null;
    attemptCount: number;
  };
};

type AutoRuleOutcome = {
  resultStatus: StudyQuestionResultStatus;
  normalizedValue: string;
  matchedValue: string | number | null;
};

export function resolveStudyQuestionAutoRuleConfig(
  metadata: Prisma.JsonValue | null,
): StudyQuestionAutoRuleConfig | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const root = metadata as Record<string, unknown>;
  const interaction = readRecord(root.interaction);
  const autoRuleValue =
    readRecord(interaction?.autoRule) ??
    readRecord(readRecord(root.studyEvaluation)?.autoRule) ??
    readRecord(readRecord(root.player)?.autoRule) ??
    readRecord(root.autoRule);

  if (!autoRuleValue) {
    return null;
  }

  const kind = normalizeString(
    autoRuleValue.kind ?? autoRuleValue.type ?? interaction?.responseMode,
  );

  if (kind === 'NUMERIC') {
    const acceptedValues = readFiniteNumbers(
      autoRuleValue.acceptedValues ??
        autoRuleValue.acceptedAnswers ??
        autoRuleValue.values,
    );

    if (!acceptedValues.length) {
      return null;
    }

    const tolerance = Math.max(
      0,
      Number(autoRuleValue.tolerance ?? autoRuleValue.margin ?? 0) || 0,
    );

    return {
      kind: 'NUMERIC',
      responseMode: 'NUMERIC',
      acceptedValues,
      tolerance,
    };
  }

  if (kind === 'SHORT_TEXT') {
    const acceptedAnswers = readNormalizedStrings(
      autoRuleValue.acceptedAnswers ?? autoRuleValue.answers,
    );
    const acceptedKeywords = readNormalizedStrings(
      autoRuleValue.acceptedKeywords ?? autoRuleValue.keywords,
    );

    if (!acceptedAnswers.length && !acceptedKeywords.length) {
      return null;
    }

    return {
      kind: 'SHORT_TEXT',
      responseMode: 'SHORT_TEXT',
      acceptedAnswers,
      acceptedKeywords,
    };
  }

  return null;
}

export function resolveStudyQuestionResponseMode(
  metadata: Prisma.JsonValue | null,
): StudyQuestionResponseMode {
  return resolveStudyQuestionAutoRuleConfig(metadata)?.responseMode ?? 'NONE';
}

export function buildStudyQuestionAutoRuleSubmission(input: {
  current: StoredStudySessionQuestionRow;
  payload: SubmitStudyQuestionAnswerRequest;
  autoRule: StudyQuestionAutoRuleConfig;
  sessionFamily: StudySessionFamily;
  effectiveStatus: StudySessionStatus;
  now: Date;
}): StoredStudySessionQuestionRow {
  if (
    input.sessionFamily === StudySessionFamily.SIMULATION &&
    input.effectiveStatus !== StudySessionStatus.COMPLETED &&
    input.effectiveStatus !== StudySessionStatus.EXPIRED
  ) {
    throw new ForbiddenException(
      'Automatic answer checking is available only after the simulation ends.',
    );
  }

  const rawValue = input.payload.value.trim();

  if (!rawValue) {
    throw new BadRequestException('Answer submission requires a non-empty value.');
  }

  const outcome = evaluateAutoRuleSubmission(rawValue, input.autoRule);
  const currentPayload = readAnswerPayload(input.current.answerPayloadJson);
  const previousAttemptCount = currentPayload.autoRule?.attemptCount ?? 0;
  const shouldPreserveCompletion =
    input.current.evaluationMode === StudyQuestionEvaluationMode.AUTO &&
    input.current.resultStatus === outcome.resultStatus &&
    input.current.completedAt !== null &&
    input.current.reflection !== null;

  return {
    ...input.current,
    answerState: StudyQuestionAnswerState.ANSWERED,
    resultStatus: outcome.resultStatus,
    evaluationMode: StudyQuestionEvaluationMode.AUTO,
    reflection: shouldPreserveCompletion ? input.current.reflection : null,
    diagnosis: shouldPreserveCompletion ? input.current.diagnosis : null,
    firstOpenedAt: input.current.firstOpenedAt ?? input.now,
    lastInteractedAt: input.now,
    completedAt: shouldPreserveCompletion ? input.current.completedAt : null,
    skippedAt: null,
    answerPayloadJson: {
      ...currentPayload,
      autoRule: {
        kind: input.autoRule.kind,
        submittedAt: input.now.toISOString(),
        rawValue,
        normalizedValue: outcome.normalizedValue,
        resultStatus: outcome.resultStatus,
        matchedValue: outcome.matchedValue,
        attemptCount: previousAttemptCount + 1,
      },
    } satisfies AutoRuleAnswerPayload,
  };
}

function evaluateAutoRuleSubmission(
  rawValue: string,
  autoRule: StudyQuestionAutoRuleConfig,
): AutoRuleOutcome {
  if (autoRule.kind === 'NUMERIC') {
    const maybeNormalizedValue = normalizeNumericInput(rawValue);
    const parsedValue =
      maybeNormalizedValue === null
        ? null
        : Number.parseFloat(maybeNormalizedValue);

    if (maybeNormalizedValue === null || parsedValue === null || Number.isNaN(parsedValue)) {
      return {
        resultStatus: StudyQuestionResultStatus.INCORRECT,
        normalizedValue: rawValue.trim(),
        matchedValue: null,
      };
    }

    const normalizedValue = maybeNormalizedValue;

    const matchedValue =
      autoRule.acceptedValues.find(
        (acceptedValue) =>
          Math.abs(acceptedValue - parsedValue) <= autoRule.tolerance,
      ) ?? null;

    return {
      resultStatus:
        matchedValue === null
          ? StudyQuestionResultStatus.INCORRECT
          : StudyQuestionResultStatus.CORRECT,
      normalizedValue,
      matchedValue,
    };
  }

  const normalizedValue = normalizeShortText(rawValue);

  if (!normalizedValue) {
    return {
      resultStatus: StudyQuestionResultStatus.INCORRECT,
      normalizedValue,
      matchedValue: null,
    };
  }

  const exactMatch =
    autoRule.acceptedAnswers.find((answer) => answer === normalizedValue) ?? null;

  if (exactMatch) {
    return {
      resultStatus: StudyQuestionResultStatus.CORRECT,
      normalizedValue,
      matchedValue: exactMatch,
    };
  }

  if (!autoRule.acceptedKeywords.length) {
    return {
      resultStatus: StudyQuestionResultStatus.INCORRECT,
      normalizedValue,
      matchedValue: null,
    };
  }

  const matchedKeywords = autoRule.acceptedKeywords.filter((keyword) =>
    normalizedValue.includes(keyword),
  );

  return {
    resultStatus:
      matchedKeywords.length === autoRule.acceptedKeywords.length
        ? StudyQuestionResultStatus.CORRECT
        : matchedKeywords.length > 0
          ? StudyQuestionResultStatus.PARTIAL
          : StudyQuestionResultStatus.INCORRECT,
    normalizedValue,
    matchedValue: matchedKeywords.length
      ? matchedKeywords.join(', ')
      : null,
  };
}

function readAnswerPayload(value: Prisma.JsonValue | null): AutoRuleAnswerPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as AutoRuleAnswerPayload;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : null;
}

function readFiniteNumbers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      typeof item === 'number'
        ? item
        : typeof item === 'string'
          ? Number.parseFloat(normalizeArabicDigits(item).replace(',', '.'))
          : Number.NaN,
    )
    .filter((item) => Number.isFinite(item));
}

function readNormalizedStrings(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? normalizeShortText(item) : ''))
        .filter(Boolean),
    ),
  );
}

function normalizeNumericInput(value: string) {
  const normalizedDigits = normalizeArabicDigits(value)
    .replace(/[٬,\s]+/g, '')
    .replace(/٫/g, '.');

  const match = normalizedDigits.match(/^[+-]?\d+(?:\.\d+)?$/);
  return match ? match[0] : null;
}

function normalizeShortText(value: string) {
  return normalizeArabicDigits(value)
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeArabicDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) =>
    String(digit.charCodeAt(0) - '٠'.charCodeAt(0)),
  );
}
