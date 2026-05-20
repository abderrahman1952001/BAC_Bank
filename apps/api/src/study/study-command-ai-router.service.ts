import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  parseStudyCommandAiInterpretation,
  type StudyCommandAiInterpretation,
} from '@bac-bank/contracts/study-command';
import {
  buildAiUsageEvent,
  evaluateStudyCommandAiRouterAttempt,
  resolveStudyCommandAiRouterConfig,
  type AiUsageEvent,
  type StudyCommandAiRouterConfig,
} from '../ai/ai-runtime';
import type { StudyCommandContext } from './study-command-engine';

export const STUDY_COMMAND_AI_ROUTER_PROVIDER = Symbol(
  'STUDY_COMMAND_AI_ROUTER_PROVIDER',
);

export const STUDY_COMMAND_AI_ROUTER_SYSTEM_INSTRUCTION = `
You interpret messy Algerian BAC student study commands.
Return only a StudyCommandAiInterpretation JSON object.
Do not create a plan, UI, session, route, correction, or content.
Use the typed mode that best describes the student's current situation.
Prefer null hints when the student did not provide enough information.
Keep confidence below 0.72 when the wording is ambiguous.
`;

const STUDY_COMMAND_AI_INTERPRETATION_JSON_SCHEMA = {
  type: 'object',
  required: [
    'mode',
    'confidence',
    'subjectHint',
    'topicHint',
    'deadline',
    'durationMinutes',
    'language',
    'missingFields',
    'studentFacingSummary',
  ],
  properties: {
    mode: {
      type: 'string',
      enum: [
        'SCHOOL_TEST_PREP',
        'TUTOR_REPLAY',
        'BAC_TRAINING',
        'LESSON_UNDERSTANDING',
        'MEMORIZATION_REVIEW',
        'SIMULATION',
        'MISTAKE_REPAIR',
        'LAB_EXPLORATION',
        'LIBRARY_SEARCH',
      ],
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    subjectHint: {
      type: ['string', 'null'],
    },
    topicHint: {
      type: ['string', 'null'],
    },
    deadline: {
      type: ['string', 'null'],
    },
    durationMinutes: {
      type: ['integer', 'null'],
      minimum: 5,
      maximum: 180,
    },
    language: {
      type: 'string',
      enum: ['ARABIC', 'DARIJA', 'FRENCH', 'ARABIZI', 'MIXED', 'UNKNOWN'],
    },
    missingFields: {
      type: 'array',
      items: {
        type: 'string',
      },
      maxItems: 3,
    },
    studentFacingSummary: {
      type: 'string',
    },
  },
} as const;

export type StudyCommandAiRouterCompactContext = {
  userStreamCode: string | null;
  hasActiveSession: boolean;
  dueFlashcardCount: number;
  openMistakeCount: number;
  weakSubjects: string[];
  availableSubjectCodes: string[];
  availableTopicCodes: string[];
};

export type StudyCommandAiRouterProviderInput = {
  command: string;
  compactContext: StudyCommandAiRouterCompactContext;
  systemInstruction: string;
  responseSchemaName: 'StudyCommandAiInterpretation';
  responseSchemaJson: unknown;
  config: Omit<StudyCommandAiRouterConfig, 'apiKey'>;
};

export interface StudyCommandAiRouterProvider {
  interpret(input: StudyCommandAiRouterProviderInput): Promise<unknown>;
}

export type StudyCommandAiRouterSkippedReason =
  | 'EMPTY_COMMAND'
  | 'DISABLED'
  | 'MISSING_MODEL'
  | 'MISSING_CREDENTIALS'
  | 'INPUT_TOO_LARGE'
  | 'PROVIDER_NOT_AVAILABLE';

export type StudyCommandAiRouterResult = {
  interpretation: StudyCommandAiInterpretation | null;
  usageEvent: AiUsageEvent | null;
  skippedReason?: StudyCommandAiRouterSkippedReason;
  failureCode?:
    | 'PROVIDER_ERROR'
    | 'TIMEOUT'
    | 'INVALID_OUTPUT'
    | 'LOW_CONFIDENCE';
};

function normalizeProviderOutput(raw: unknown) {
  if (typeof raw !== 'string') {
    return raw;
  }

  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error('EMPTY_AI_ROUTER_OUTPUT');
  }

  return JSON.parse(trimmed) as unknown;
}

function stringifyForTokenEstimate(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error('STUDY_COMMAND_AI_ROUTER_TIMEOUT'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

@Injectable()
export class StudyCommandAiRouterService {
  private readonly logger = new Logger(StudyCommandAiRouterService.name);

  constructor(
    @Optional()
    @Inject(STUDY_COMMAND_AI_ROUTER_PROVIDER)
    private readonly provider?: StudyCommandAiRouterProvider,
  ) {}

  async interpret(input: {
    userId: string;
    command: string;
    context: StudyCommandContext;
  }): Promise<StudyCommandAiRouterResult> {
    const command = input.command.trim();

    if (!command) {
      return {
        interpretation: null,
        usageEvent: null,
        skippedReason: 'EMPTY_COMMAND',
      };
    }

    const config = resolveStudyCommandAiRouterConfig();
    const compactContext = this.buildCompactContext(input.context);
    const inputText = this.buildInputText(command, compactContext);
    const guard = evaluateStudyCommandAiRouterAttempt(config, inputText);

    if (!guard.ok) {
      return {
        interpretation: null,
        usageEvent: null,
        skippedReason: guard.reason,
      };
    }

    if (!this.provider) {
      return {
        interpretation: null,
        usageEvent: null,
        skippedReason: 'PROVIDER_NOT_AVAILABLE',
      };
    }

    const startedAt = Date.now();
    let rawOutput: unknown = null;

    try {
      rawOutput = await withTimeout(
        this.provider.interpret({
          command,
          compactContext,
          systemInstruction: STUDY_COMMAND_AI_ROUTER_SYSTEM_INSTRUCTION,
          responseSchemaName: 'StudyCommandAiInterpretation',
          responseSchemaJson: STUDY_COMMAND_AI_INTERPRETATION_JSON_SCHEMA,
          config: {
            feature: config.feature,
            provider: config.provider,
            model: config.model,
            configured: config.configured,
            maxOutputTokens: config.maxOutputTokens,
            enabled: config.enabled,
            maxInputTokens: config.maxInputTokens,
            timeoutMs: config.timeoutMs,
            minConfidence: config.minConfidence,
          },
        }),
        config.timeoutMs,
      );
    } catch (error) {
      const errorCode =
        error instanceof Error &&
        error.message === 'STUDY_COMMAND_AI_ROUTER_TIMEOUT'
          ? 'TIMEOUT'
          : 'PROVIDER_ERROR';
      const usageEvent = this.buildUsageEvent({
        config,
        inputText,
        rawOutput,
        startedAt,
        status: 'FAILED',
        errorCode,
      });

      this.logUsage(usageEvent);

      return {
        interpretation: null,
        usageEvent,
        failureCode: errorCode,
      };
    }

    let interpretation: StudyCommandAiInterpretation;

    try {
      interpretation = parseStudyCommandAiInterpretation(
        normalizeProviderOutput(rawOutput),
      );
    } catch {
      const usageEvent = this.buildUsageEvent({
        config,
        inputText,
        rawOutput,
        startedAt,
        status: 'FAILED',
        errorCode: 'INVALID_OUTPUT',
      });

      this.logUsage(usageEvent);

      return {
        interpretation: null,
        usageEvent,
        failureCode: 'INVALID_OUTPUT',
      };
    }

    if (interpretation.confidence < config.minConfidence) {
      const usageEvent = this.buildUsageEvent({
        config,
        inputText,
        rawOutput,
        startedAt,
        status: 'FAILED',
        errorCode: 'LOW_CONFIDENCE',
      });

      this.logUsage(usageEvent);

      return {
        interpretation: null,
        usageEvent,
        failureCode: 'LOW_CONFIDENCE',
      };
    }

    const usageEvent = this.buildUsageEvent({
      config,
      inputText,
      rawOutput,
      startedAt,
      status: 'SUCCESS',
    });

    this.logUsage(usageEvent);

    return {
      interpretation,
      usageEvent,
    };
  }

  private buildCompactContext(
    context: StudyCommandContext,
  ): StudyCommandAiRouterCompactContext {
    return {
      userStreamCode: context.userStreamCode ?? null,
      hasActiveSession: context.sessions.some(
        (session) =>
          session.status !== 'COMPLETED' && session.status !== 'EXPIRED',
      ),
      dueFlashcardCount: context.dueFlashcards.length,
      openMistakeCount: context.myMistakes.length,
      weakSubjects: context.weakPointInsights
        .map((insight) => insight.subject.code)
        .slice(0, 5),
      availableSubjectCodes: (context.filters?.subjects ?? [])
        .map((subject) => subject.code)
        .slice(0, 12),
      availableTopicCodes: (context.filters?.topics ?? [])
        .map((topic) => topic.code)
        .slice(0, 24),
    };
  }

  private buildInputText(
    command: string,
    compactContext: StudyCommandAiRouterCompactContext,
  ) {
    return JSON.stringify({
      command,
      context: compactContext,
    });
  }

  private buildUsageEvent(input: {
    config: StudyCommandAiRouterConfig;
    inputText: string;
    rawOutput: unknown;
    startedAt: number;
    status: 'SUCCESS' | 'FAILED';
    errorCode?: string;
  }) {
    return buildAiUsageEvent({
      feature: input.config.feature,
      provider: input.config.provider,
      model: input.config.model,
      status: input.status,
      inputText: input.inputText,
      outputText: stringifyForTokenEstimate(input.rawOutput),
      latencyMs: Date.now() - input.startedAt,
      errorCode: input.errorCode,
    });
  }

  private logUsage(event: AiUsageEvent) {
    this.logger.log(JSON.stringify(event));
  }
}
