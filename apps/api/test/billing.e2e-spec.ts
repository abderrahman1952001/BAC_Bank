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
import { BillingController } from './../src/billing/billing.controller';
import { BillingService } from './../src/billing/billing.service';

describe('Billing routes (e2e)', () => {
  let app: NestFastifyApplication;
  const authService = {
    authenticateRequest: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      role: 'USER',
    }),
  };
  const billingService = {
    getBillingOverview: jest.fn().mockResolvedValue({
      provider: 'CHARGILY',
      currentAccess: {
        isPremium: false,
        subscriptionStatus: 'FREE',
        subscriptionEndsAt: null,
      },
      availablePlans: [],
      recentCheckouts: [],
    }),
    createCheckoutForUser: jest.fn().mockResolvedValue({
      checkout: {
        id: 'checkout-1',
        provider: 'CHARGILY',
        planCode: 'PREMIUM_30_DAYS',
        currency: 'DZD',
        amount: 2500,
        status: 'PENDING',
        locale: 'ar',
        providerCheckoutId: 'provider_checkout_1',
        paymentMethod: null,
        checkoutUrl:
          'https://pay.chargily.dz/test/checkouts/provider_checkout_1/pay',
        failureReason: null,
        accessStartsAt: null,
        accessEndsAt: null,
        paidAt: null,
        createdAt: '2026-04-19T12:00:00.000Z',
        updatedAt: '2026-04-19T12:00:00.000Z',
      },
      redirectUrl:
        'https://pay.chargily.dz/test/checkouts/provider_checkout_1/pay',
    }),
    getCheckoutForUser: jest.fn().mockResolvedValue({
      checkout: {
        id: 'checkout-1',
        provider: 'CHARGILY',
        planCode: 'PREMIUM_30_DAYS',
        currency: 'DZD',
        amount: 2500,
        status: 'PENDING',
        locale: 'ar',
        providerCheckoutId: 'provider_checkout_1',
        paymentMethod: null,
        checkoutUrl:
          'https://pay.chargily.dz/test/checkouts/provider_checkout_1/pay',
        failureReason: null,
        accessStartsAt: null,
        accessEndsAt: null,
        paidAt: null,
        createdAt: '2026-04-19T12:00:00.000Z',
        updatedAt: '2026-04-19T12:00:00.000Z',
      },
    }),
    syncCheckoutForUser: jest.fn().mockResolvedValue({
      checkout: {
        id: 'checkout-1',
        provider: 'CHARGILY',
        planCode: 'PREMIUM_30_DAYS',
        currency: 'DZD',
        amount: 2500,
        status: 'PAID',
        locale: 'ar',
        providerCheckoutId: 'provider_checkout_1',
        paymentMethod: 'cib',
        checkoutUrl:
          'https://pay.chargily.dz/test/checkouts/provider_checkout_1/pay',
        failureReason: null,
        accessStartsAt: '2026-04-19T13:00:00.000Z',
        accessEndsAt: '2026-05-19T13:00:00.000Z',
        paidAt: '2026-04-19T13:00:00.000Z',
        createdAt: '2026-04-19T12:00:00.000Z',
        updatedAt: '2026-04-19T13:00:00.000Z',
      },
    }),
    handleChargilyWebhook: jest.fn().mockResolvedValue({
      received: true,
      duplicate: false,
    }),
  };

  beforeAll(async () => {
    process.env.CORS_ORIGIN = 'http://localhost:3000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        ClerkAuthGuard,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: BillingService,
          useValue: billingService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      createApiAdapter(),
      {
        rawBody: true,
      },
    );
    await configureApiApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`/${API_GLOBAL_PREFIX}/billing/overview returns the billing summary`, async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/billing/overview`)
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.provider).toBe('CHARGILY');
    expect(billingService.getBillingOverview).toHaveBeenCalledWith('user-1');
  });

  it(`/${API_GLOBAL_PREFIX}/billing/checkouts rejects cookie-authenticated writes without origin metadata`, () => {
    return request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/billing/checkouts`)
      .set('Cookie', '__session=test-token')
      .send({
        planCode: 'PREMIUM_30_DAYS',
      })
      .expect(403);
  });

  it(`/${API_GLOBAL_PREFIX}/billing/checkouts creates a payment session`, async () => {
    const response = await request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/billing/checkouts`)
      .set('Authorization', 'Bearer test-token')
      .send({
        planCode: 'PREMIUM_30_DAYS',
        locale: 'ar',
      })
      .expect(201);

    expect(response.body.redirectUrl).toContain('pay.chargily.dz');
    expect(billingService.createCheckoutForUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        planCode: 'PREMIUM_30_DAYS',
        locale: 'ar',
      }),
      expect.objectContaining({
        appOrigin: expect.stringContaining('http://127.0.0.1'),
      }),
    );
  });

  it(`/${API_GLOBAL_PREFIX}/billing/checkouts/:id/sync refreshes the current checkout`, async () => {
    const response = await request(app.getHttpServer())
      .post(
        `/${API_GLOBAL_PREFIX}/billing/checkouts/11111111-1111-1111-1111-111111111111/sync`,
      )
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.checkout.status).toBe('PAID');
    expect(billingService.syncCheckoutForUser).toHaveBeenCalledWith(
      'user-1',
      '11111111-1111-1111-1111-111111111111',
    );
  });

  it(`/${API_GLOBAL_PREFIX}/billing/webhooks/chargily accepts a signed webhook without auth`, async () => {
    const payload = JSON.stringify({
      id: 'evt_1',
      type: 'checkout.paid',
      data: {
        id: 'provider_checkout_1',
      },
    });

    await request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/billing/webhooks/chargily`)
      .set('signature', 'test-signature')
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(200);

    expect(billingService.handleChargilyWebhook).toHaveBeenCalledWith({
      signature: 'test-signature',
      rawPayload: payload,
    });
  });
});
