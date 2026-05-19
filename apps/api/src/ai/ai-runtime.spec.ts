import {
  buildAiUsageEvent,
  estimateAiTokens,
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
