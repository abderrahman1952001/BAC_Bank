import { ConfigService } from '@nestjs/config';
import { BillingSettingsService } from './billing-settings.service';

describe('BillingSettingsService', () => {
  let configService: Pick<ConfigService, 'get'>;
  let prisma: {
    billingSettings: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let service: BillingSettingsService;

  beforeEach(() => {
    configService = {
      get: jest.fn((name: string) => {
        const values: Record<string, string> = {
          BILLING_PREMIUM_30_DAYS_AMOUNT_DZD: '2500',
          BILLING_PREMIUM_30_DAYS_DURATION_DAYS: '30',
          BILLING_PREMIUM_90_DAYS_AMOUNT_DZD: '6500',
          BILLING_PREMIUM_90_DAYS_DURATION_DAYS: '90',
          BILLING_PREMIUM_BAC_SEASON_AMOUNT_DZD: '9000',
        };

        return values[name];
      }),
    };
    prisma = {
      billingSettings: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    service = new BillingSettingsService(
      prisma as never,
      configService as ConfigService,
    );
  });

  it('returns environment-backed defaults when no billing settings row exists', async () => {
    prisma.billingSettings.findUnique.mockResolvedValueOnce(null);

    const response = await service.getAdminBillingSettings(
      new Date('2026-04-19T12:00:00.000Z'),
    );

    expect(response.settings.persisted).toBe(false);
    expect(response.settings.premium30DaysAmountDzd).toBe(2500);
    expect(response.settings.premium90DaysDurationDays).toBe(90);
    expect(response.settings.checkoutFeeResponsibility).toBe('MERCHANT');
    expect(response.settings.configuredBacSeasonEndsAt).toBeNull();
    expect(response.settings.effectiveBacSeasonEndsAt).toBe(
      '2026-06-30T22:59:59.000Z',
    );
  });

  it('prefers persisted overrides and includes the admin preview plans', async () => {
    prisma.billingSettings.findUnique.mockResolvedValueOnce({
      id: 'billing-settings-1',
      singletonKey: 'default',
      premium30DaysAmountDzd: 2800,
      premium30DaysDurationDays: 31,
      premium90DaysAmountDzd: 7000,
      premium90DaysDurationDays: 95,
      premiumBacSeasonAmountDzd: 9800,
      bacSeasonEndsAt: new Date('2026-06-15T20:00:00.000Z'),
      updatedByUserId: 'admin-1',
      updatedByEmail: 'admin@example.com',
      createdAt: new Date('2026-04-19T10:00:00.000Z'),
      updatedAt: new Date('2026-04-19T12:30:00.000Z'),
    });

    const response = await service.getAdminBillingSettings(
      new Date('2026-04-19T12:00:00.000Z'),
    );

    expect(response.settings.persisted).toBe(true);
    expect(response.settings.premium30DaysAmountDzd).toBe(2800);
    expect(response.settings.premium90DaysDurationDays).toBe(95);
    expect(response.settings.configuredBacSeasonEndsAt).toBe(
      '2026-06-15T20:00:00.000Z',
    );
    expect(response.settings.updatedByEmail).toBe('admin@example.com');
    expect(response.plans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PREMIUM_30_DAYS',
          amount: 2800,
          durationDays: 31,
        }),
        expect.objectContaining({
          code: 'PREMIUM_BAC_SEASON',
          amount: 9800,
          seasonEndsAt: '2026-06-15T20:00:00.000Z',
        }),
      ]),
    );
  });
});
