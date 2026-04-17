import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import {
  API_GLOBAL_PREFIX,
  configureApiApp,
  createApiAdapter,
} from './../src/app-setup';
import { AuthService } from './../src/auth/auth.service';
import { ClerkAuthGuard } from './../src/auth/clerk-auth.guard';
import { StudyController } from './../src/study/study.controller';
import { StudyExerciseStateService } from './../src/study/study-exercise-state.service';
import { StudyRoadmapService } from './../src/study/study-roadmap.service';
import { StudyReviewService } from './../src/study/study-review.service';
import { StudyService } from './../src/study/study.service';
import { StudyWeakPointService } from './../src/study/study-weak-point.service';

describe('Study routes (e2e)', () => {
  let app: NestFastifyApplication;
  const authService = {
    authenticateRequest: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      role: 'USER',
    }),
  };
  const studyService = {
    createStudySession: jest.fn().mockResolvedValue({
      id: 'session-123',
    }),
    getCatalog: jest.fn().mockResolvedValue({
      streams: [],
    }),
    getExamById: jest.fn(),
    getFilters: jest.fn(),
    getStudySessionById: jest.fn(),
    listRecentExamActivities: jest.fn().mockResolvedValue({
      data: [],
    }),
    listRecentStudySessions: jest.fn(),
    previewStudySession: jest.fn(),
    upsertExamActivity: jest.fn().mockResolvedValue({
      id: 'activity-123',
      lastOpenedAt: new Date().toISOString(),
    }),
    updateStudySessionProgress: jest.fn().mockResolvedValue({
      id: 'session-123',
      progress: null,
      status: 'IN_PROGRESS',
      updatedAt: new Date().toISOString(),
    }),
  };
  const studyExerciseStateService = {
    listRecentExerciseStates: jest.fn().mockResolvedValue({
      data: [],
    }),
    lookupExerciseStates: jest.fn().mockResolvedValue({
      data: [],
    }),
    upsertExerciseState: jest.fn().mockResolvedValue({
      exerciseNodeId: '11111111-1111-1111-1111-111111111111',
      bookmarkedAt: new Date().toISOString(),
      flaggedAt: null,
      updatedAt: new Date().toISOString(),
    }),
  };
  const studyReviewService = {
    listMyMistakes: jest.fn().mockResolvedValue({
      data: [],
    }),
    updateReviewQueueStatus: jest.fn().mockResolvedValue({
      exerciseNodeId: '11111111-1111-1111-1111-111111111111',
      questionNodeId: null,
      status: 'DONE',
      matchedItemCount: 1,
      updatedAt: new Date().toISOString(),
    }),
  };
  const studyRoadmapService = {
    listStudyRoadmaps: jest.fn().mockResolvedValue({
      data: [],
    }),
  };
  const studyWeakPointService = {
    listWeakPointInsights: jest.fn().mockResolvedValue({
      enabled: true,
      data: [],
    }),
  };

  beforeAll(async () => {
    process.env.CORS_ORIGIN = 'http://localhost:3000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StudyController],
      providers: [
        ClerkAuthGuard,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: StudyService,
          useValue: studyService,
        },
        {
          provide: StudyExerciseStateService,
          useValue: studyExerciseStateService,
        },
        {
          provide: StudyReviewService,
          useValue: studyReviewService,
        },
        {
          provide: StudyRoadmapService,
          useValue: studyRoadmapService,
        },
        {
          provide: StudyWeakPointService,
          useValue: studyWeakPointService,
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

  it(`/${API_GLOBAL_PREFIX}/study/catalog returns the study catalog`, async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/study/catalog`)
      .expect(200);

    expect(response.body).toEqual({
      streams: [],
    });
  });

  it(`/${API_GLOBAL_PREFIX}/study/sessions validates and creates training sessions`, async () => {
    await request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/study/sessions`)
      .set('Cookie', 'bb_session=test-token')
      .set('Origin', 'http://localhost:3000')
      .send({
        subjectCode: 'mathematics',
        years: [2024, '2023'],
        exerciseCount: '6',
      })
      .expect(201);

    expect(studyService.createStudySession).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        subjectCode: 'MATHEMATICS',
        years: [2024, 2023],
        exerciseCount: 6,
      }),
    );
  });

  it(`/${API_GLOBAL_PREFIX}/study/exam-activities lists recent opened exams`, async () => {
    await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/study/exam-activities?limit=5`)
      .set('Cookie', 'bb_session=test-token')
      .expect(200);

    expect(studyService.listRecentExamActivities).toHaveBeenCalledWith(
      'user-1',
      5,
    );
  });

  it(`/${API_GLOBAL_PREFIX}/study/exercise-states lists recent saved exercises`, async () => {
    await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/study/exercise-states?limit=4`)
      .set('Cookie', 'bb_session=test-token')
      .expect(200);

    expect(studyExerciseStateService.listRecentExerciseStates).toHaveBeenCalledWith(
      'user-1',
      4,
    );
  });

  it(`/${API_GLOBAL_PREFIX}/study/exercises/:id/state validates and stores bookmark state`, async () => {
    await request(app.getHttpServer())
      .post(
        `/${API_GLOBAL_PREFIX}/study/exercises/11111111-1111-1111-1111-111111111111/state`,
      )
      .set('Cookie', 'bb_session=test-token')
      .set('Origin', 'http://localhost:3000')
      .send({
        bookmarked: true,
      })
      .expect(201);

    expect(studyExerciseStateService.upsertExerciseState).toHaveBeenCalledWith(
      'user-1',
      '11111111-1111-1111-1111-111111111111',
      expect.objectContaining({
        bookmarked: true,
      }),
    );
  });

  it(`/${API_GLOBAL_PREFIX}/study/my-mistakes lists corrective review items`, async () => {
    await request(app.getHttpServer())
      .get(
        `/${API_GLOBAL_PREFIX}/study/my-mistakes?limit=3&subjectCode=mathematics&status=open`,
      )
      .set('Cookie', 'bb_session=test-token')
      .expect(200);

    expect(studyReviewService.listMyMistakes).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        limit: 3,
        subjectCode: 'MATHEMATICS',
        status: 'OPEN',
      }),
    );
  });

  it(`/${API_GLOBAL_PREFIX}/study/review-queue/status validates and stores workflow state`, async () => {
    await request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/study/review-queue/status`)
      .set('Cookie', 'bb_session=test-token')
      .set('Origin', 'http://localhost:3000')
      .send({
        exerciseNodeId: '550e8400-e29b-41d4-a716-446655440000',
        questionNodeId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        status: 'done',
      })
      .expect(201);

    expect(studyReviewService.updateReviewQueueStatus).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        exerciseNodeId: '550e8400-e29b-41d4-a716-446655440000',
        questionNodeId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        status: 'DONE',
      }),
    );
  });

  it(`/${API_GLOBAL_PREFIX}/study/roadmaps lists derived study roadmaps`, async () => {
    await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/study/roadmaps?limit=2&subjectCode=mathematics`)
      .set('Cookie', 'bb_session=test-token')
      .expect(200);

    expect(studyRoadmapService.listStudyRoadmaps).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        limit: 2,
        subjectCode: 'MATHEMATICS',
      }),
    );
  });

  it(`/${API_GLOBAL_PREFIX}/study/weak-points lists premium weak-point insights`, async () => {
    await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/study/weak-points?limit=2&subjectCode=mathematics`)
      .set('Cookie', 'bb_session=test-token')
      .expect(200);

    expect(studyWeakPointService.listWeakPointInsights).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        limit: 2,
        subjectCode: 'MATHEMATICS',
      }),
    );
  });

  it(`/${API_GLOBAL_PREFIX}/study/sessions/preview validates and previews study sessions`, async () => {
    await request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/study/sessions/preview`)
      .set('Cookie', 'bb_session=test-token')
      .set('Origin', 'http://localhost:3000')
      .send({
        subjectCode: 'mathematics',
        years: [2024, '2023'],
        exerciseCount: '6',
      })
      .expect(201);

    expect(studyService.previewStudySession).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        subjectCode: 'MATHEMATICS',
        years: [2024, 2023],
        exerciseCount: 6,
      }),
    );
  });

  it(`/${API_GLOBAL_PREFIX}/study/exams/:id/activity validates and stores exam activity`, async () => {
    await request(app.getHttpServer())
      .post(
        `/${API_GLOBAL_PREFIX}/study/exams/11111111-1111-1111-1111-111111111111/activity`,
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

    expect(studyService.upsertExamActivity).toHaveBeenCalledWith(
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

  it(`/${API_GLOBAL_PREFIX}/study/sessions/:id/progress rejects cookie-authenticated writes without origin metadata`, () => {
    return request(app.getHttpServer())
      .post(
        `/${API_GLOBAL_PREFIX}/study/sessions/11111111-1111-1111-1111-111111111111/progress`,
      )
      .set('Cookie', 'bb_session=test-token')
      .send({})
      .expect(403);
  });
});
