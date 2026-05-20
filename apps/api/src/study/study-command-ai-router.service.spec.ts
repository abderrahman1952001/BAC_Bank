import { Logger } from '@nestjs/common';
import type { StudyCommandAiInterpretation } from '@bac-bank/contracts/study-command';
import {
  StudyCommandAiRouterService,
  type StudyCommandAiRouterProvider,
} from './study-command-ai-router.service';
import type { StudyCommandContext } from './study-command-engine';

const context: StudyCommandContext = {
  sessions: [],
  recentExamActivities: [],
  myMistakes: [],
  curriculumJourneys: [],
  weakPointInsights: [],
  dueFlashcards: [],
  labTools: [],
  filters: {
    streams: [
      {
        code: 'SE',
        name: 'علوم تجريبية',
        isDefault: true,
        subjectCodes: ['NATURAL_SCIENCES'],
      },
    ],
    subjects: [
      {
        code: 'NATURAL_SCIENCES',
        name: 'علوم الطبيعة والحياة',
        isDefault: true,
        streams: [
          {
            code: 'SE',
            name: 'علوم تجريبية',
          },
        ],
        streamCodes: ['SE'],
      },
    ],
    years: [2026],
    topics: [
      {
        code: 'PHOTOSYNTHESIS',
        name: 'التركيب الضوئي',
        slug: 'photosynthesis',
        parentCode: null,
        displayOrder: 1,
        isSelectable: true,
        subject: {
          code: 'NATURAL_SCIENCES',
          name: 'علوم الطبيعة والحياة',
        },
        streamCodes: ['SE'],
      },
    ],
    sessionTypes: ['NORMAL'],
  },
  catalog: null,
  userStreamCode: 'SE',
};

const validInterpretation: StudyCommandAiInterpretation = {
  mode: 'TUTOR_REPLAY',
  confidence: 0.86,
  subjectHint: 'svt علوم الطبيعة',
  topicHint: 'التركيب الضوئي',
  deadline: null,
  durationMinutes: 30,
  language: 'MIXED',
  missingFields: [],
  studentFacingSummary: 'حصة دعم في التركيب الضوئي تحتاج تثبيتاً.',
};

function configuredEnv() {
  process.env.AI_STUDY_COMMAND_ROUTER_ENABLED = 'true';
  process.env.AI_STUDY_COMMAND_ROUTER_MODEL = 'router-model';
  process.env.OPENAI_API_KEY = 'test-key';
}

describe('StudyCommandAiRouterService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AI_STUDY_COMMAND_ROUTER_ENABLED;
    delete process.env.AI_STUDY_COMMAND_ROUTER_MODEL;
    delete process.env.AI_STUDY_COMMAND_ROUTER_TIMEOUT_MS;
    delete process.env.OPENAI_API_KEY;
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  it('skips cleanly when credentials or flags are missing', async () => {
    const interpret = jest.fn();
    const provider: StudyCommandAiRouterProvider = {
      interpret,
    };
    const service = new StudyCommandAiRouterService(provider);

    process.env.AI_STUDY_COMMAND_ROUTER_ENABLED = 'true';
    process.env.AI_STUDY_COMMAND_ROUTER_MODEL = 'router-model';

    const response = await service.interpret({
      userId: 'user-1',
      command: 'خرجت من cours ta3 prof',
      context,
    });

    expect(response).toMatchObject({
      interpretation: null,
      usageEvent: null,
      skippedReason: 'MISSING_CREDENTIALS',
    });
    expect(interpret).not.toHaveBeenCalled();
  });

  it('accepts schema-valid high-confidence provider output', async () => {
    configuredEnv();
    const provider: StudyCommandAiRouterProvider = {
      interpret: jest.fn().mockResolvedValue(validInterpretation),
    };
    const service = new StudyCommandAiRouterService(provider);

    const response = await service.interpret({
      userId: 'user-1',
      command: 'خرجت من cours ta3 prof',
      context,
    });

    expect(response.interpretation).toEqual(validInterpretation);
    expect(response.usageEvent).toMatchObject({
      feature: 'STUDY_COMMAND_ROUTER',
      provider: 'openai',
      model: 'router-model',
      status: 'SUCCESS',
    });
  });

  it('falls back when provider output is invalid', async () => {
    configuredEnv();
    const service = new StudyCommandAiRouterService({
      interpret: jest.fn().mockResolvedValue({
        mode: 'NOT_A_STUDY_MODE',
      }),
    });

    const response = await service.interpret({
      userId: 'user-1',
      command: 'rani kharej men cours',
      context,
    });

    expect(response).toMatchObject({
      interpretation: null,
      failureCode: 'INVALID_OUTPUT',
      usageEvent: {
        status: 'FAILED',
        errorCode: 'INVALID_OUTPUT',
      },
    });
  });

  it('falls back when provider confidence is low', async () => {
    configuredEnv();
    const service = new StudyCommandAiRouterService({
      interpret: jest.fn().mockResolvedValue({
        ...validInterpretation,
        confidence: 0.2,
      }),
    });

    const response = await service.interpret({
      userId: 'user-1',
      command: 'help',
      context,
    });

    expect(response).toMatchObject({
      interpretation: null,
      failureCode: 'LOW_CONFIDENCE',
      usageEvent: {
        status: 'FAILED',
        errorCode: 'LOW_CONFIDENCE',
      },
    });
  });

  it('falls back when the provider times out', async () => {
    configuredEnv();
    process.env.AI_STUDY_COMMAND_ROUTER_TIMEOUT_MS = '300';
    const service = new StudyCommandAiRouterService({
      interpret: jest.fn(
        () => new Promise<StudyCommandAiInterpretation>(() => undefined),
      ),
    });

    const response = await service.interpret({
      userId: 'user-1',
      command: 'خرجت من cours ta3 prof',
      context,
    });

    expect(response).toMatchObject({
      interpretation: null,
      failureCode: 'TIMEOUT',
      usageEvent: {
        status: 'FAILED',
        errorCode: 'TIMEOUT',
      },
    });
  });
});
