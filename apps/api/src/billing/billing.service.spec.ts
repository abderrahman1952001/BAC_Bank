import {
  BillingCheckoutStatus,
  BillingProvider,
  SubscriptionStatus,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import type { BillingPlan, BillingPlanCode } from '@bac-bank/contracts/billing';
import { BillingService } from './billing.service';

describe('BillingService', () => {
  type TransactionMockContext = {
    billingCheckout: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    billingWebhookEvent: {
      update: jest.Mock;
    };
  };

  type TransactionUserUpdateArgs = {
    data: {
      subscriptionStatus?: SubscriptionStatus;
      subscriptionEndsAt?: Date | null;
    };
  };

  type TransactionCheckoutUpdateArgs = {
    data: {
      accessEndsAt?: Date | null;
    };
  };

  type BillingCheckoutCreateArgs = {
    data: {
      metadata?: {
        createdBy?: string;
        planSnapshot?: {
          code?: string;
          amount?: number;
        };
      };
    };
  };

  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    billingCheckout: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    billingWebhookEvent: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let chargilyClient: {
    isConfigured: jest.Mock;
    createCheckout: jest.Mock;
    createCustomer: jest.Mock;
    retrieveCheckout: jest.Mock;
    parseWebhookEvent: jest.Mock;
    verifyWebhookSignature: jest.Mock;
  };
  let billingSettingsService: {
    findPlanByCode: jest.Mock;
    listAvailablePlans: jest.Mock;
  };
  let service: BillingService;

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      billingCheckout: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      billingWebhookEvent: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    chargilyClient = {
      isConfigured: jest.fn().mockReturnValue(true),
      createCheckout: jest.fn(),
      createCustomer: jest.fn(),
      retrieveCheckout: jest.fn(),
      parseWebhookEvent: jest.fn(),
      verifyWebhookSignature: jest.fn(),
    };
    billingSettingsService = {
      findPlanByCode: jest.fn(
        (
          planCode: BillingPlanCode,
          input?: {
            now?: Date;
          },
        ) => {
          const now = input?.now ?? new Date('2026-04-19T12:00:00.000Z');
          const targetYear =
            now.getUTCMonth() >= 6
              ? now.getUTCFullYear() + 1
              : now.getUTCFullYear();
          const seasonEndsAt = new Date(
            Date.UTC(targetYear, 5, 30, 22, 59, 59),
          ).toISOString();

          const plans: Record<BillingPlanCode, BillingPlan> = {
            PREMIUM_30_DAYS: {
              code: 'PREMIUM_30_DAYS',
              name: 'Premium لمدة 30 يوماً',
              description: '30-day premium access',
              currency: 'DZD',
              amount: 2500,
              accessType: 'FIXED_DAYS',
              durationDays: 30,
              seasonEndsAt: null,
              features: [],
            },
            PREMIUM_90_DAYS: {
              code: 'PREMIUM_90_DAYS',
              name: 'Premium لثلاثة أشهر (سداسي)',
              description: '90-day premium access',
              currency: 'DZD',
              amount: 6500,
              accessType: 'FIXED_DAYS',
              durationDays: 90,
              seasonEndsAt: null,
              features: [],
            },
            PREMIUM_BAC_SEASON: {
              code: 'PREMIUM_BAC_SEASON',
              name: 'Premium لموسم الباك',
              description: 'BAC season premium access',
              currency: 'DZD',
              amount: 9000,
              accessType: 'SEASON_END',
              durationDays: null,
              seasonEndsAt,
              features: [],
            },
          };

          return plans[planCode] ?? null;
        },
      ),
      listAvailablePlans: jest.fn().mockResolvedValue([]),
    };

    service = new BillingService(
      prisma as never,
      billingSettingsService as never,
      chargilyClient as never,
    );
  });

  it('creates a local checkout, provisions a Chargily checkout, and returns a redirect URL', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'student@example.com',
      fullName: 'Student',
      subscriptionStatus: SubscriptionStatus.FREE,
      subscriptionEndsAt: null,
    });
    prisma.billingCheckout.create.mockResolvedValueOnce({
      id: 'checkout-1',
      userId: 'user-1',
      provider: BillingProvider.CHARGILY,
      planCode: 'PREMIUM_30_DAYS',
      currency: 'DZD',
      amount: 2500,
      status: BillingCheckoutStatus.PENDING,
      locale: 'ar',
      providerCheckoutId: null,
      providerCustomerId: null,
      providerPaymentMethod: null,
      providerInvoiceId: null,
      providerLivemode: null,
      checkoutUrl: null,
      successUrl:
        'https://bacbank.app/student/billing/success?checkout=pending',
      failureUrl:
        'https://bacbank.app/student/billing/failure?checkout=pending',
      webhookUrl: 'https://bacbank.app/api/v1/billing/webhooks/chargily',
      failureReason: null,
      providerPayload: null,
      metadata: null,
      accessStartsAt: null,
      accessEndsAt: null,
      paidAt: null,
      lastSyncedAt: null,
      createdAt: new Date('2026-04-19T12:00:00.000Z'),
      updatedAt: new Date('2026-04-19T12:00:00.000Z'),
    });
    prisma.billingCheckout.findFirst.mockResolvedValueOnce(null);
    chargilyClient.createCustomer.mockResolvedValueOnce({
      id: 'cust_1',
      livemode: false,
    });
    chargilyClient.createCheckout.mockResolvedValueOnce({
      id: 'provider_checkout_1',
      livemode: false,
      amount: 2500,
      currency: 'dzd',
      status: 'pending',
      locale: 'ar',
      successUrl:
        'https://bacbank.app/student/billing/success?checkout=checkout-1',
      failureUrl:
        'https://bacbank.app/student/billing/failure?checkout=checkout-1',
      webhookEndpoint: 'https://bacbank.app/api/v1/billing/webhooks/chargily',
      paymentMethod: null,
      invoiceId: null,
      customerId: 'cust_1',
      createdAt: 1776600000,
      updatedAt: 1776600000,
      checkoutUrl:
        'https://pay.chargily.dz/test/checkouts/provider_checkout_1/pay',
      payload: {
        id: 'provider_checkout_1',
      },
    });
    prisma.billingCheckout.update.mockResolvedValueOnce({
      id: 'checkout-1',
      userId: 'user-1',
      provider: BillingProvider.CHARGILY,
      planCode: 'PREMIUM_30_DAYS',
      currency: 'DZD',
      amount: 2500,
      status: BillingCheckoutStatus.PENDING,
      locale: 'ar',
      providerCheckoutId: 'provider_checkout_1',
      providerCustomerId: 'cust_1',
      providerPaymentMethod: null,
      providerInvoiceId: null,
      providerLivemode: false,
      checkoutUrl:
        'https://pay.chargily.dz/test/checkouts/provider_checkout_1/pay',
      successUrl:
        'https://bacbank.app/student/billing/success?checkout=checkout-1',
      failureUrl:
        'https://bacbank.app/student/billing/failure?checkout=checkout-1',
      webhookUrl: 'https://bacbank.app/api/v1/billing/webhooks/chargily',
      failureReason: null,
      providerPayload: {
        id: 'provider_checkout_1',
      },
      metadata: null,
      accessStartsAt: null,
      accessEndsAt: null,
      paidAt: null,
      lastSyncedAt: new Date('2026-04-19T12:00:10.000Z'),
      createdAt: new Date('2026-04-19T12:00:00.000Z'),
      updatedAt: new Date('2026-04-19T12:00:10.000Z'),
    });

    const response = await service.createCheckoutForUser(
      'user-1',
      {
        planCode: 'PREMIUM_30_DAYS',
        locale: 'ar',
      },
      {
        appOrigin: 'https://bacbank.app',
      },
    );

    expect(response.redirectUrl).toBe(
      'https://pay.chargily.dz/test/checkouts/provider_checkout_1/pay',
    );
    expect(response.checkout.providerCheckoutId).toBe('provider_checkout_1');
    const [[createCheckoutArgs]] = prisma.billingCheckout.create.mock.calls as [
      [BillingCheckoutCreateArgs],
    ];

    expect(createCheckoutArgs?.data.metadata?.createdBy).toBe(
      'student-billing',
    );
    expect(createCheckoutArgs?.data.metadata?.planSnapshot?.code).toBe(
      'PREMIUM_30_DAYS',
    );
    expect(createCheckoutArgs?.data.metadata?.planSnapshot?.amount).toBe(2500);
    expect(chargilyClient.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2500,
        currency: 'dzd',
        customerId: 'cust_1',
        feesAllocation: 'merchant',
      }),
    );
  });

  it('rejects a BAC season checkout when the user already has premium through the season end', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-19T12:00:00.000Z'));

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'student@example.com',
      fullName: 'Student',
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionEndsAt: new Date('2026-07-10T00:00:00.000Z'),
    });

    await expect(
      service.createCheckoutForUser(
        'user-1',
        {
          planCode: 'PREMIUM_BAC_SEASON',
          locale: 'ar',
        },
        {
          appOrigin: 'https://bacbank.app',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.billingCheckout.create).not.toHaveBeenCalled();
    expect(chargilyClient.createCheckout).not.toHaveBeenCalled();
  });

  it('syncs a paid checkout and grants premium access on the user record', async () => {
    const initialCheckout = {
      id: 'checkout-1',
      userId: 'user-1',
      provider: BillingProvider.CHARGILY,
      planCode: 'PREMIUM_30_DAYS',
      currency: 'DZD',
      amount: 2500,
      status: BillingCheckoutStatus.PENDING,
      locale: 'ar',
      providerCheckoutId: 'provider_checkout_1',
      providerCustomerId: 'cust_1',
      providerPaymentMethod: null,
      providerInvoiceId: null,
      providerLivemode: false,
      checkoutUrl:
        'https://pay.chargily.dz/test/checkouts/provider_checkout_1/pay',
      successUrl:
        'https://bacbank.app/student/billing/success?checkout=checkout-1',
      failureUrl:
        'https://bacbank.app/student/billing/failure?checkout=checkout-1',
      webhookUrl: 'https://bacbank.app/api/v1/billing/webhooks/chargily',
      failureReason: null,
      providerPayload: null,
      metadata: null,
      accessStartsAt: null,
      accessEndsAt: null,
      paidAt: null,
      lastSyncedAt: null,
      createdAt: new Date('2026-04-19T12:00:00.000Z'),
      updatedAt: new Date('2026-04-19T12:00:00.000Z'),
    };

    prisma.billingCheckout.findFirst.mockResolvedValueOnce(initialCheckout);
    chargilyClient.retrieveCheckout.mockResolvedValueOnce({
      id: 'provider_checkout_1',
      livemode: false,
      amount: 2500,
      currency: 'dzd',
      status: 'paid',
      locale: 'ar',
      successUrl: initialCheckout.successUrl,
      failureUrl: initialCheckout.failureUrl,
      webhookEndpoint: initialCheckout.webhookUrl,
      paymentMethod: 'cib',
      invoiceId: 'invoice_1',
      customerId: 'cust_1',
      createdAt: 1776600000,
      updatedAt: 1776603600,
      checkoutUrl: initialCheckout.checkoutUrl,
      payload: {
        id: 'provider_checkout_1',
        status: 'paid',
      },
    });

    const transactionBillingCheckoutUpdate = jest.fn().mockResolvedValue({
      ...initialCheckout,
      status: BillingCheckoutStatus.PAID,
      providerPaymentMethod: 'cib',
      providerInvoiceId: 'invoice_1',
      accessStartsAt: new Date('2026-04-19T13:00:00.000Z'),
      accessEndsAt: new Date('2026-05-19T13:00:00.000Z'),
      paidAt: new Date('2026-04-19T13:00:00.000Z'),
      updatedAt: new Date('2026-04-19T13:00:00.000Z'),
    });
    const transactionUserUpdate = jest.fn().mockResolvedValue({});

    prisma.$transaction.mockImplementation(
      (callback: (tx: TransactionMockContext) => unknown) =>
        callback({
          billingCheckout: {
            findUnique: jest.fn().mockResolvedValue(initialCheckout),
            update: transactionBillingCheckoutUpdate,
          },
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'user-1',
              subscriptionEndsAt: null,
            }),
            update: transactionUserUpdate,
          },
          billingWebhookEvent: {
            update: jest.fn(),
          },
        }),
    );

    const response = await service.syncCheckoutForUser('user-1', 'checkout-1');
    const [[userUpdateArgs]] = transactionUserUpdate.mock.calls as [
      [TransactionUserUpdateArgs],
    ];

    expect(response.checkout.status).toBe('PAID');
    expect(response.checkout.paymentMethod).toBe('cib');
    expect(userUpdateArgs?.data.subscriptionStatus).toBe(
      SubscriptionStatus.ACTIVE,
    );
  });

  it('resolves BAC season access against the checkout creation season, not the sync date', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-19T12:00:00.000Z'));

    const initialCheckout = {
      id: 'checkout-season-1',
      userId: 'user-1',
      provider: BillingProvider.CHARGILY,
      planCode: 'PREMIUM_BAC_SEASON',
      currency: 'DZD',
      amount: 9000,
      status: BillingCheckoutStatus.PENDING,
      locale: 'ar',
      providerCheckoutId: 'provider_checkout_season_1',
      providerCustomerId: 'cust_1',
      providerPaymentMethod: null,
      providerInvoiceId: null,
      providerLivemode: false,
      checkoutUrl:
        'https://pay.chargily.dz/test/checkouts/provider_checkout_season_1/pay',
      successUrl:
        'https://bacbank.app/student/billing/success?checkout=checkout-season-1',
      failureUrl:
        'https://bacbank.app/student/billing/failure?checkout=checkout-season-1',
      webhookUrl: 'https://bacbank.app/api/v1/billing/webhooks/chargily',
      failureReason: null,
      providerPayload: null,
      metadata: null,
      accessStartsAt: null,
      accessEndsAt: null,
      paidAt: null,
      lastSyncedAt: null,
      createdAt: new Date('2026-08-15T09:00:00.000Z'),
      updatedAt: new Date('2026-08-15T09:00:00.000Z'),
    };

    prisma.billingCheckout.findFirst.mockResolvedValueOnce(initialCheckout);
    chargilyClient.retrieveCheckout.mockResolvedValueOnce({
      id: 'provider_checkout_season_1',
      livemode: false,
      amount: 9000,
      currency: 'dzd',
      status: 'paid',
      locale: 'ar',
      successUrl: initialCheckout.successUrl,
      failureUrl: initialCheckout.failureUrl,
      webhookEndpoint: initialCheckout.webhookUrl,
      paymentMethod: 'edahabia',
      invoiceId: 'invoice_season_1',
      customerId: 'cust_1',
      createdAt: 1786784400,
      updatedAt: 1789376400,
      checkoutUrl: initialCheckout.checkoutUrl,
      payload: {
        id: 'provider_checkout_season_1',
        status: 'paid',
      },
    });

    const transactionBillingCheckoutUpdate = jest.fn().mockResolvedValue({
      ...initialCheckout,
      status: BillingCheckoutStatus.PAID,
      providerPaymentMethod: 'edahabia',
      providerInvoiceId: 'invoice_season_1',
      accessStartsAt: new Date('2026-09-14T09:00:00.000Z'),
      accessEndsAt: new Date('2027-06-30T22:59:59.000Z'),
      paidAt: new Date('2026-09-14T09:00:00.000Z'),
      updatedAt: new Date('2026-09-14T09:00:00.000Z'),
    });
    const transactionUserUpdate = jest.fn().mockResolvedValue({});

    prisma.$transaction.mockImplementation(
      (callback: (tx: TransactionMockContext) => unknown) =>
        callback({
          billingCheckout: {
            findUnique: jest.fn().mockResolvedValue(initialCheckout),
            update: transactionBillingCheckoutUpdate,
          },
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'user-1',
              subscriptionEndsAt: null,
            }),
            update: transactionUserUpdate,
          },
          billingWebhookEvent: {
            update: jest.fn(),
          },
        }),
    );

    const response = await service.syncCheckoutForUser(
      'user-1',
      'checkout-season-1',
    );
    const [[checkoutUpdateArgs]] = transactionBillingCheckoutUpdate.mock
      .calls as [[TransactionCheckoutUpdateArgs]];
    const [[userUpdateArgs]] = transactionUserUpdate.mock.calls as [
      [TransactionUserUpdateArgs],
    ];

    expect(response.checkout.status).toBe('PAID');
    expect(checkoutUpdateArgs?.data.accessEndsAt).toEqual(
      new Date('2027-06-30T22:59:59.000Z'),
    );
    expect(userUpdateArgs?.data.subscriptionEndsAt).toEqual(
      new Date('2027-06-30T22:59:59.000Z'),
    );
  });
});
