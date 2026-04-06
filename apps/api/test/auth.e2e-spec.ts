import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import {
  API_GLOBAL_PREFIX,
  configureApiApp,
  createApiAdapter,
} from './../src/app-setup';
import { AuthController } from './../src/auth/auth.controller';
import { AuthService } from './../src/auth/auth.service';
import { SessionAuthGuard } from './../src/auth/session-auth.guard';

describe('Auth routes (e2e)', () => {
  let app: NestFastifyApplication;
  const authService = {
    authenticateRequest: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      role: 'USER',
      sessionId: 'sess_123',
    }),
    getRegistrationOptions: jest.fn(() => ({
      streams: [],
    })),
    getUserProfile: jest.fn((userId: string) => ({
      user: {
        id: userId,
        email: 'student@example.com',
        role: 'STUDENT',
        stream: null,
        subscriptionStatus: 'FREE',
        username: 'Student',
      },
    })),
    updateCurrentUserProfile: jest.fn((userId: string) => ({
      user: {
        id: userId,
        email: 'student@example.com',
        role: 'STUDENT',
        stream: {
          code: 'SE',
          name: 'Sciences experimentales',
        },
        subscriptionStatus: 'FREE',
        username: 'Student',
      },
    })),
  };

  beforeAll(async () => {
    process.env.CORS_ORIGIN = 'http://localhost:3000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        SessionAuthGuard,
        {
          provide: AuthService,
          useValue: authService,
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

  it(`/${API_GLOBAL_PREFIX}/auth/options returns onboarding options`, async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/auth/options`)
      .expect(200);

    expect(response.body).toEqual({
      streams: [],
    });
  });

  it(`/${API_GLOBAL_PREFIX}/auth/logout rejects cookie-authenticated writes without origin metadata`, () => {
    return request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/auth/logout`)
      .set('Cookie', '__session=test-token')
      .expect(403);
  });

  it(`/${API_GLOBAL_PREFIX}/auth/me returns the active user profile`, async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/auth/me`)
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    const body = response.body as { user: { id: string } };

    expect(body.user.id).toBe('user-1');
    expect(authService.authenticateRequest).toHaveBeenCalled();
  });

  it(`/${API_GLOBAL_PREFIX}/auth/profile updates the active user profile`, async () => {
    const response = await request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/auth/profile`)
      .set('Authorization', 'Bearer test-token')
      .send({
        username: 'Student',
        streamCode: 'SE',
      })
      .expect(201);

    expect(response.body.user.stream.code).toBe('SE');
    expect(authService.updateCurrentUserProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        username: 'Student',
        streamCode: 'SE',
      }),
    );
  });
});
