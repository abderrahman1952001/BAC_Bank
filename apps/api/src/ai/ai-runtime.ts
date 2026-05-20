export type AiFeature =
  | 'STUDY_COMMAND_ROUTER'
  | 'STUDY_QUESTION_EXPLANATION'
  | 'VOICE_TRANSCRIPTION';

export type AiProvider = 'google' | 'openai';
export type AiCallStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export type AiFeatureConfig = {
  feature: AiFeature;
  provider: AiProvider;
  model: string;
  configured: boolean;
  apiKey: string | null;
  maxOutputTokens: number;
};

export type StudyCommandAiRouterConfig = AiFeatureConfig & {
  enabled: boolean;
  maxInputTokens: number;
  timeoutMs: number;
  minConfidence: number;
};

export type AiUsageEvent = {
  feature: AiFeature;
  provider: AiProvider;
  model: string;
  status: AiCallStatus;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  latencyMs: number;
  errorCode?: string;
};

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';
const DEFAULT_STUDY_EXPLANATION_MAX_OUTPUT_TOKENS = 1600;
const DEFAULT_STUDY_COMMAND_ROUTER_MODEL = 'not-configured';
const DEFAULT_STUDY_COMMAND_ROUTER_MAX_INPUT_TOKENS = 1200;
const DEFAULT_STUDY_COMMAND_ROUTER_MAX_OUTPUT_TOKENS = 320;
const DEFAULT_STUDY_COMMAND_ROUTER_TIMEOUT_MS = 2500;
const DEFAULT_STUDY_COMMAND_ROUTER_MIN_CONFIDENCE = 0.72;

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeBoolean(value: string | null | undefined) {
  const normalized = value?.trim().toLocaleLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function normalizeProvider(value: string | null | undefined): AiProvider {
  const normalized = value?.trim().toLocaleLowerCase();
  return normalized === 'google' ? 'google' : 'openai';
}

function readPositiveInteger(
  value: string | null | undefined,
  fallback: number,
  input: {
    min: number;
    max: number;
  },
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, input.min), input.max);
}

function readConfidence(
  value: string | null | undefined,
  fallback: number,
  input: {
    min: number;
    max: number;
  },
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, input.min), input.max);
}

export function estimateAiTokens(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return 0;
  }

  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function resolveStudyQuestionAiExplanationConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiFeatureConfig {
  return {
    feature: 'STUDY_QUESTION_EXPLANATION',
    provider: 'google',
    model:
      normalizeOptionalString(env.GEMINI_MODEL) ??
      normalizeOptionalString(env.AI_STUDY_QUESTION_EXPLANATION_MODEL) ??
      DEFAULT_GEMINI_MODEL,
    configured: Boolean(
      normalizeOptionalString(env.GEMINI_API_KEY) ??
      normalizeOptionalString(env.GOOGLE_API_KEY),
    ),
    apiKey:
      normalizeOptionalString(env.GEMINI_API_KEY) ??
      normalizeOptionalString(env.GOOGLE_API_KEY),
    maxOutputTokens: readPositiveInteger(
      env.AI_STUDY_QUESTION_EXPLANATION_MAX_OUTPUT_TOKENS,
      DEFAULT_STUDY_EXPLANATION_MAX_OUTPUT_TOKENS,
      {
        min: 300,
        max: 2400,
      },
    ),
  };
}

export function resolveStudyCommandAiRouterConfig(
  env: NodeJS.ProcessEnv = process.env,
): StudyCommandAiRouterConfig {
  const provider = normalizeProvider(env.AI_STUDY_COMMAND_ROUTER_PROVIDER);
  const apiKey =
    provider === 'google'
      ? (normalizeOptionalString(env.GEMINI_API_KEY) ??
        normalizeOptionalString(env.GOOGLE_API_KEY))
      : normalizeOptionalString(env.OPENAI_API_KEY);
  const model =
    normalizeOptionalString(env.AI_STUDY_COMMAND_ROUTER_MODEL) ??
    DEFAULT_STUDY_COMMAND_ROUTER_MODEL;
  const enabled = normalizeBoolean(env.AI_STUDY_COMMAND_ROUTER_ENABLED);

  return {
    feature: 'STUDY_COMMAND_ROUTER',
    provider,
    model,
    enabled,
    configured:
      enabled &&
      model !== DEFAULT_STUDY_COMMAND_ROUTER_MODEL &&
      Boolean(apiKey),
    apiKey,
    maxInputTokens: readPositiveInteger(
      env.AI_STUDY_COMMAND_ROUTER_MAX_INPUT_TOKENS,
      DEFAULT_STUDY_COMMAND_ROUTER_MAX_INPUT_TOKENS,
      {
        min: 200,
        max: 4000,
      },
    ),
    maxOutputTokens: readPositiveInteger(
      env.AI_STUDY_COMMAND_ROUTER_MAX_OUTPUT_TOKENS,
      DEFAULT_STUDY_COMMAND_ROUTER_MAX_OUTPUT_TOKENS,
      {
        min: 120,
        max: 1000,
      },
    ),
    timeoutMs: readPositiveInteger(
      env.AI_STUDY_COMMAND_ROUTER_TIMEOUT_MS,
      DEFAULT_STUDY_COMMAND_ROUTER_TIMEOUT_MS,
      {
        min: 300,
        max: 10000,
      },
    ),
    minConfidence: readConfidence(
      env.AI_STUDY_COMMAND_ROUTER_MIN_CONFIDENCE,
      DEFAULT_STUDY_COMMAND_ROUTER_MIN_CONFIDENCE,
      {
        min: 0.5,
        max: 0.95,
      },
    ),
  };
}

export type StudyCommandAiRouterGuardResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason:
        | 'DISABLED'
        | 'MISSING_MODEL'
        | 'MISSING_CREDENTIALS'
        | 'INPUT_TOO_LARGE';
    };

export function evaluateStudyCommandAiRouterAttempt(
  config: StudyCommandAiRouterConfig,
  inputText: string,
): StudyCommandAiRouterGuardResult {
  if (!config.enabled) {
    return {
      ok: false,
      reason: 'DISABLED',
    };
  }

  if (config.model === DEFAULT_STUDY_COMMAND_ROUTER_MODEL) {
    return {
      ok: false,
      reason: 'MISSING_MODEL',
    };
  }

  if (!config.apiKey) {
    return {
      ok: false,
      reason: 'MISSING_CREDENTIALS',
    };
  }

  if (estimateAiTokens(inputText) > config.maxInputTokens) {
    return {
      ok: false,
      reason: 'INPUT_TOO_LARGE',
    };
  }

  return {
    ok: true,
  };
}

export function buildAiUsageEvent(input: {
  feature: AiFeature;
  provider: AiProvider;
  model: string;
  status: AiCallStatus;
  inputText: string;
  outputText?: string | null;
  latencyMs: number;
  errorCode?: string;
}): AiUsageEvent {
  return {
    feature: input.feature,
    provider: input.provider,
    model: input.model,
    status: input.status,
    estimatedInputTokens: estimateAiTokens(input.inputText),
    estimatedOutputTokens: estimateAiTokens(input.outputText ?? ''),
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    errorCode: input.errorCode,
  };
}
