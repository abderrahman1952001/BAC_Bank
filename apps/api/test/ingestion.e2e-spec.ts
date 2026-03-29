import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import {
  API_GLOBAL_PREFIX,
  configureApiApp,
  createApiAdapter,
} from './../src/app-setup';
import { AdminRoleGuard } from './../src/admin/admin.guard';
import { AuthService } from './../src/auth/auth.service';
import { IngestionController } from './../src/ingestion/ingestion.controller';
import { IngestionService } from './../src/ingestion/ingestion.service';

describe('Ingestion admin routes (e2e)', () => {
  let app: NestFastifyApplication;
  const authService = {
    authenticateRequest: jest.fn().mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
      sessionId: 'session-1',
    }),
  };
  const ingestionService = {
    approveJob: jest.fn().mockResolvedValue({
      job: {
        id: 'job-1',
        status: 'approved',
      },
    }),
    createManualUploadJob: jest.fn(),
    createPublishedRevisionJob: jest.fn(),
    getDocumentFile: jest.fn(),
    getJob: jest.fn(),
    getPageImage: jest.fn(),
    getPreviewAsset: jest.fn(),
    listJobs: jest.fn(),
    processJob: jest.fn().mockResolvedValue({
      job: {
        id: 'job-1',
        status: 'queued',
      },
      workflow: {
        awaiting_correction: false,
        can_process: false,
        has_correction_document: true,
        has_exam_document: true,
        review_started: false,
      },
      documents: [],
      draft_json: {
        assets: [],
        exam: {
          correctionDocumentId: 'doc-2',
          correctionDocumentStorageKey: 'correction.pdf',
          examDocumentId: 'doc-1',
          examDocumentStorageKey: 'exam.pdf',
          metadata: {},
          minYear: 2024,
          provider: 'manual_upload',
          sessionType: 'NORMAL',
          sourceCorrectionPageUrl: null,
          sourceExamPageUrl: null,
          sourceListingUrl: null,
          streamCode: 'SE',
          subjectCode: 'MATHEMATICS',
          title: 'Queued Job',
          year: 2024,
        },
        schema: 'bac_ingestion_draft/v1',
        sourcePages: [],
        variants: [],
      },
      validation: {
        can_approve: false,
        can_publish: false,
        errors: [],
        issues: [],
        warnings: [],
      },
      asset_preview_base_url: '',
    }),
    publishJob: jest.fn().mockResolvedValue({
      success: true,
    }),
    recoverAssetContent: jest.fn(),
    recoverSnippetContent: jest.fn(),
    updateJob: jest.fn(),
  };

  beforeAll(async () => {
    process.env.CORS_ORIGIN = 'http://localhost:3000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [
        AdminRoleGuard,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: IngestionService,
          useValue: ingestionService,
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

  it(`/${API_GLOBAL_PREFIX}/admin/ingestion/jobs/:jobId/process queues background processing`, async () => {
    const response = await request(app.getHttpServer())
      .post(
        `/${API_GLOBAL_PREFIX}/admin/ingestion/jobs/11111111-1111-1111-1111-111111111111/process`,
      )
      .set('Cookie', 'bb_session=test-token')
      .set('Origin', 'http://localhost:3000')
      .send({
        force_reprocess: false,
      })
      .expect(201);

    const body = response.body as { job: { status: string } };

    expect(body.job.status).toBe('queued');
    expect(ingestionService.processJob).toHaveBeenCalled();
  });

  it(`/${API_GLOBAL_PREFIX}/admin/ingestion/jobs/:jobId/approve enforces admin access`, async () => {
    authService.authenticateRequest.mockRejectedValueOnce(
      new ForbiddenException('ADMIN role is required to access this endpoint.'),
    );

    await request(app.getHttpServer())
      .post(
        `/${API_GLOBAL_PREFIX}/admin/ingestion/jobs/11111111-1111-1111-1111-111111111111/approve`,
      )
      .set('Cookie', 'bb_session=test-token')
      .set('Origin', 'http://localhost:3000')
      .expect(403);
  });

  it(`/${API_GLOBAL_PREFIX}/admin/ingestion/jobs/:jobId/publish publishes approved jobs`, async () => {
    await request(app.getHttpServer())
      .post(
        `/${API_GLOBAL_PREFIX}/admin/ingestion/jobs/11111111-1111-1111-1111-111111111111/publish`,
      )
      .set('Cookie', 'bb_session=test-token')
      .set('Origin', 'http://localhost:3000')
      .expect(201);

    expect(ingestionService.publishJob).toHaveBeenCalled();
  });
});
