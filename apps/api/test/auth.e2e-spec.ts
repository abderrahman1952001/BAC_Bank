import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import {
  API_GLOBAL_PREFIX,
  configureApiApp,
  createApiAdapter,
} from './../src/app-setup';
import { AuthController } from './../src/auth/auth.controller';
import { AuthRateLimitService } from './../src/auth/auth-rate-limit.service';
import { AuthService } from './../src/auth/auth.service';
import { SessionAuthGuard } from './../src/auth/session-auth.guard';

describe('Auth routes (e2e)', () => {
  let app: NestFastifyApplication;
  const authService = {
    authenticateRequest: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      role: 'USER',
      sessionId: 'session-1',
    }),
    createClearedSessionCookie: jest.fn(() => 'bb_session=; Max-Age=0; Path=/'),
    getRegistrationOptions: jest.fn(() => ({
      streams: [],
    })),
    getUserProfile: jest.fn((userId: string) => ({
      user: {
        id: userId,
        email: 'student@example.com',
        role: 'USER',
        stream: null,
        username: 'Student',
      },
    })),
    invalidateSession: jest.fn().mockResolvedValue(undefined),
    login: jest.fn().mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'student@example.com',
        role: 'USER',
        stream: null,
        username: 'Student',
      },
      cookie: 'bb_session=test-token; Path=/; HttpOnly',
    }),
    register: jest.fn(),
  };
  const authRateLimitService = {
    assertRequestAllowed: jest.fn().mockResolvedValue(undefined),
    recordFailure: jest.fn().mockResolvedValue(undefined),
    recordSuccess: jest.fn().mockResolvedValue(undefined),
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
        {
          provide: AuthRateLimitService,
          useValue: authRateLimitService,
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

  it(`/${API_GLOBAL_PREFIX}/auth/login accepts allowed-origin login requests`, async () => {
    const response = await request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/auth/login`)
      .set('Origin', 'http://localhost:3000')
      .send({
        email: 'student@example.com',
        password: 'password123',
      })
      .expect(200);

    const body = response.body as { user: { email: string } };

    expect(body.user.email).toBe('student@example.com');
    expect(response.headers['set-cookie']).toBeDefined();
    expect(authRateLimitService.assertRequestAllowed).toHaveBeenCalled();
  });

  it(`/${API_GLOBAL_PREFIX}/auth/logout rejects cookie-authenticated writes without origin metadata`, () => {
    return request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/auth/logout`)
      .set('Cookie', 'bb_session=test-token')
      .expect(403);
  });

  it(`/${API_GLOBAL_PREFIX}/auth/me returns the active user profile`, async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/auth/me`)
      .set('Cookie', 'bb_session=test-token')
      .expect(200);

    const body = response.body as { user: { id: string } };

    expect(body.user.id).toBe('user-1');
    expect(authService.authenticateRequest).toHaveBeenCalled();
  });
});
