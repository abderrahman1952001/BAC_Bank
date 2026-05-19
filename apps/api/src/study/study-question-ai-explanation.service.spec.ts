import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { StudyQuestionAiExplanationService } from './study-question-ai-explanation.service';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
  createPartFromText: jest.fn((text: string) => ({ text })),
}));

const baseInput = {
  questionId: 'question-1',
  subjectName: 'العلوم الطبيعية',
  supportStyle: 'LOGIC_HEAVY' as const,
  questionLabel: '1',
  topics: [{ code: 'PROTEINS', name: 'البروتينات' }],
  promptBlocks: [
    {
      id: 'prompt-1',
      role: 'PROMPT' as const,
      orderIndex: 1,
      blockType: 'PARAGRAPH' as const,
      textValue: 'اشرح تركيب البروتين.',
      data: null,
      media: null,
    },
  ],
  hintBlocks: [],
  solutionBlocks: [
    {
      id: 'solution-1',
      role: 'SOLUTION' as const,
      orderIndex: 1,
      blockType: 'PARAGRAPH' as const,
      textValue: 'يبدأ الحل من النسخ ثم الترجمة.',
      data: null,
      media: null,
    },
  ],
  rubricBlocks: [],
};

describe('StudyQuestionAiExplanationService', () => {
  const originalEnv = process.env;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_API_KEY: 'google-key',
    };
    mockGenerateContent.mockReset();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    logSpy.mockRestore();
  });

  it('logs a content-free failed usage event when the provider throws', async () => {
    mockGenerateContent.mockRejectedValue(new Error('network failed'));

    await expect(
      new StudyQuestionAiExplanationService().generate(baseInput),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const event = JSON.parse(String(logSpy.mock.calls[0]?.[0])) as {
      status: string;
      errorCode: string;
      estimatedInputTokens: number;
      estimatedOutputTokens: number;
    };

    expect(event).toMatchObject({
      status: 'FAILED',
      errorCode: 'PROVIDER_ERROR',
      estimatedOutputTokens: 0,
    });
    expect(event.estimatedInputTokens).toBeGreaterThan(0);
  });
});
