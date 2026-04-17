import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import {
  API_GLOBAL_PREFIX,
  configureApiApp,
  createApiAdapter,
} from './../src/app-setup';
import { AppModule } from './../src/app.module';

jest.setTimeout(15000);

describe('App (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.PRISMA_CONNECT_ON_STARTUP = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

  it(`/${API_GLOBAL_PREFIX}/health/live (GET)`, async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/health/live`)
      .expect(200);

    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-request-id']).toBeDefined();
  });
});
