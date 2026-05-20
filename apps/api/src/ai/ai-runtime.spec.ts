import {
  buildAiUsageEvent,
  evaluateStudyCommandAiRouterAttempt,
  estimateAiTokens,
  resolveStudyCommandAiRouterConfig,
  resolveStudyQuestionAiExplanationConfig,
} from './ai-runtime';

describe('AI runtime helpers', () => {
  it('keeps AI explanation disabled when provider credentials are missing', () => {
    expect(resolveStudyQuestionAiExplanationConfig({})).toMatchObject({
      feature: 'STUDY_QUESTION_EXPLANATION',
      provider: 'google',
      model: 'gemini-3-flash-preview',
      configured: false,
      apiKey: null,
      maxOutputTokens: 1600,
    });
  });

  it('resolves configured model and clamps max output tokens', () => {
    expect(
      resolveStudyQuestionAiExplanationConfig({
        GOOGLE_API_KEY: ' google-key ',
        AI_STUDY_QUESTION_EXPLANATION_MODEL: 'gemini-custom',
        AI_STUDY_QUESTION_EXPLANATION_MAX_OUTPUT_TOKENS: '99999',
      }),
    ).toMatchObject({
      configured: true,
      apiKey: 'google-key',
      model: 'gemini-custom',
      maxOutputTokens: 2400,
    });
  });

  it('keeps Study Command AI routing disabled unless the feature flag and provider config are present', () => {
    expect(resolveStudyCommandAiRouterConfig({})).toMatchObject({
      feature: 'STUDY_COMMAND_ROUTER',
      provider: 'openai',
      model: 'not-configured',
      enabled: false,
      configured: false,
      apiKey: null,
      maxInputTokens: 1200,
      maxOutputTokens: 320,
      timeoutMs: 2500,
      minConfidence: 0.72,
    });

    expect(
      evaluateStudyCommandAiRouterAttempt(
        resolveStudyCommandAiRouterConfig({}),
        'أريد تدريب BAC',
      ),
    ).toEqual({
      ok: false,
      reason: 'DISABLED',
    });
  });

  it('resolves Study Command AI router safety limits and catches incomplete config', () => {
    const missingCredentials = resolveStudyCommandAiRouterConfig({
      AI_STUDY_COMMAND_ROUTER_ENABLED: 'true',
      AI_STUDY_COMMAND_ROUTER_MODEL: 'router-model',
      AI_STUDY_COMMAND_ROUTER_MAX_INPUT_TOKENS: '999999',
      AI_STUDY_COMMAND_ROUTER_MAX_OUTPUT_TOKENS: '20',
      AI_STUDY_COMMAND_ROUTER_TIMEOUT_MS: '50',
      AI_STUDY_COMMAND_ROUTER_MIN_CONFIDENCE: '0.99',
    });

    expect(missingCredentials).toMatchObject({
      enabled: true,
      configured: false,
      model: 'router-model',
      maxInputTokens: 4000,
      maxOutputTokens: 120,
      timeoutMs: 300,
      minConfidence: 0.95,
    });
    expect(
      evaluateStudyCommandAiRouterAttempt(missingCredentials, 'أريد تدريب BAC'),
    ).toEqual({
      ok: false,
      reason: 'MISSING_CREDENTIALS',
    });

    const configured = resolveStudyCommandAiRouterConfig({
      AI_STUDY_COMMAND_ROUTER_ENABLED: 'yes',
      AI_STUDY_COMMAND_ROUTER_PROVIDER: 'google',
      AI_STUDY_COMMAND_ROUTER_MODEL: 'gemini-router',
      GOOGLE_API_KEY: ' key ',
    });

    expect(configured).toMatchObject({
      provider: 'google',
      enabled: true,
      configured: true,
      apiKey: 'key',
      model: 'gemini-router',
    });
    expect(
      evaluateStudyCommandAiRouterAttempt(configured, 'أريد تدريب BAC'),
    ).toEqual({
      ok: true,
    });
  });

  it('estimates token counts and builds content-free usage events', () => {
    expect(estimateAiTokens('')).toBe(0);
    expect(estimateAiTokens('abcd')).toBe(1);
    expect(
      buildAiUsageEvent({
        feature: 'STUDY_QUESTION_EXPLANATION',
        provider: 'google',
        model: 'gemini',
        status: 'SUCCESS',
        inputText: 'question prompt',
        outputText: 'answer',
        latencyMs: 12.4,
      }),
    ).toEqual({
      feature: 'STUDY_QUESTION_EXPLANATION',
      provider: 'google',
      model: 'gemini',
      status: 'SUCCESS',
      estimatedInputTokens: 4,
      estimatedOutputTokens: 2,
      latencyMs: 12,
      errorCode: undefined,
    });
  });
});
