export type AiFeature =
  | 'STUDY_COMMAND_ROUTER'
  | 'STUDY_QUESTION_EXPLANATION'
  | 'VOICE_TRANSCRIPTION';

export type AiProvider = 'google' | 'openai';
export type AiCallStatus = 'SUCCESS' | 'FAILED';

export type AiFeatureConfig = {
  feature: AiFeature;
  provider: AiProvider;
  model: string;
  configured: boolean;
  apiKey: string | null;
  maxOutputTokens: number;
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

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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
