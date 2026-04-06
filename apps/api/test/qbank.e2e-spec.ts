import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import {
  API_GLOBAL_PREFIX,
  configureApiApp,
  createApiAdapter,
} from './../src/app-setup';
import { AuthService } from './../src/auth/auth.service';
import { SessionAuthGuard } from './../src/auth/session-auth.guard';
import { QbankController } from './../src/qbank/qbank.controller';
import { QbankService } from './../src/qbank/qbank.service';

describe('QBank routes (e2e)', () => {
  let app: NestFastifyApplication;
  const authService = {
    authenticateRequest: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      role: 'USER',
      sessionId: 'session-1',
    }),
  };
  const qbankService = {
    createPracticeSession: jest.fn().mockResolvedValue({
      id: 'session-123',
    }),
    getCatalog: jest.fn().mockResolvedValue({
      streams: [],
    }),
    getExamById: jest.fn(),
    getFilters: jest.fn(),
    getPracticeSessionById: jest.fn(),
    listRecentExamActivities: jest.fn().mockResolvedValue({
      data: [],
    }),
    listRecentPracticeSessions: jest.fn(),
    previewPracticeSession: jest.fn(),
    upsertExamActivity: jest.fn().mockResolvedValue({
      id: 'activity-123',
      lastOpenedAt: new Date().toISOString(),
    }),
    updatePracticeSessionProgress: jest.fn().mockResolvedValue({
      id: 'session-123',
      progress: null,
      status: 'IN_PROGRESS',
      updatedAt: new Date().toISOString(),
    }),
  };

  beforeAll(async () => {
    process.env.CORS_ORIGIN = 'http://localhost:3000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [QbankController],
      providers: [
        SessionAuthGuard,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: QbankService,
          useValue: qbankService,
        },
      ],
    }).compile();

    app =
      moduleFixture.createNestApplication<NestFastifyApplication>(
        createApiAdapter(),
      );
    await configureApiApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`/${API_GLOBAL_PREFIX}/qbank/catalog returns the browse catalog`, async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/qbank/catalog`)
      .expect(200);

    expect(response.body).toEqual({
      streams: [],
    });
  });

  it(`/${API_GLOBAL_PREFIX}/qbank/sessions validates and creates practice sessions`, async () => {
    await request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/qbank/sessions`)
      .set('Cookie', 'bb_session=test-token')
      .set('Origin', 'http://localhost:3000')
      .send({
        subjectCode: 'mathematics',
        years: [2024, '2023'],
        exerciseCount: '6',
      })
      .expect(201);

    expect(qbankService.createPracticeSession).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        subjectCode: 'MATHEMATICS',
        years: [2024, 2023],
        exerciseCount: 6,
      }),
    );
  });

  it(`/${API_GLOBAL_PREFIX}/qbank/exam-activities lists recent opened exams`, async () => {
    await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/qbank/exam-activities?limit=5`)
      .set('Cookie', 'bb_session=test-token')
      .expect(200);

    expect(qbankService.listRecentExamActivities).toHaveBeenCalledWith(
      'user-1',
      5,
    );
  });

  it(`/${API_GLOBAL_PREFIX}/qbank/exams/:id/activity validates and stores exam activity`, async () => {
    await request(app.getHttpServer())
      .post(
        `/${API_GLOBAL_PREFIX}/qbank/exams/11111111-1111-1111-1111-111111111111/activity`,
      )
      .set('Cookie', 'bb_session=test-token')
      .set('Origin', 'http://localhost:3000')
      .send({
        sujetNumber: '2',
        totalQuestionCount: '10',
        completedQuestionCount: '4',
        openedQuestionCount: '7',
      })
      .expect(201);

    expect(qbankService.upsertExamActivity).toHaveBeenCalledWith(
      'user-1',
      '11111111-1111-1111-1111-111111111111',
      expect.objectContaining({
        sujetNumber: 2,
        totalQuestionCount: 10,
        completedQuestionCount: 4,
        openedQuestionCount: 7,
      }),
    );
  });

  it(`/${API_GLOBAL_PREFIX}/qbank/sessions/:id/progress rejects cookie-authenticated writes without origin metadata`, () => {
    return request(app.getHttpServer())
      .post(
        `/${API_GLOBAL_PREFIX}/qbank/sessions/11111111-1111-1111-1111-111111111111/progress`,
      )
      .set('Cookie', 'bb_session=test-token')
      .send({})
      .expect(403);
  });
});
