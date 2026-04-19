import { ConfigService } from '@nestjs/config';
import type { BillingPlan, BillingPlanCode } from '@bac-bank/contracts/billing';
import { resolvePositiveInteger } from '../runtime/runtime-config';

const DEFAULT_PREMIUM_30_DAYS_AMOUNT_DZD = 2500;
const DEFAULT_PREMIUM_90_DAYS_AMOUNT_DZD = 6500;
const DEFAULT_PREMIUM_BAC_SEASON_AMOUNT_DZD = 9000;
const DEFAULT_PREMIUM_30_DAYS_DURATION_DAYS = 30;
const DEFAULT_PREMIUM_90_DAYS_DURATION_DAYS = 90;

export type BillingPlanSettingsOverrides = {
  premium30DaysAmountDzd?: number | null;
  premium30DaysDurationDays?: number | null;
  premium90DaysAmountDzd?: number | null;
  premium90DaysDurationDays?: number | null;
  premiumBacSeasonAmountDzd?: number | null;
  configuredBacSeasonEndsAt?: Date | null;
};

export type BillingPlanSettingsSnapshot = {
  premium30DaysAmountDzd: number;
  premium30DaysDurationDays: number;
  premium90DaysAmountDzd: number;
  premium90DaysDurationDays: number;
  premiumBacSeasonAmountDzd: number;
  configuredBacSeasonEndsAt: Date | null;
  effectiveBacSeasonEndsAt: Date;
};

export function resolveBillingPlanSettings(
  configService: Pick<ConfigService, 'get'>,
  now = new Date(),
  overrides?: BillingPlanSettingsOverrides,
): BillingPlanSettingsSnapshot {
  const premium30DaysAmountDzd =
    overrides?.premium30DaysAmountDzd ??
    resolvePositiveInteger({
      value: configService.get<string>('BILLING_PREMIUM_30_DAYS_AMOUNT_DZD'),
      fallback: DEFAULT_PREMIUM_30_DAYS_AMOUNT_DZD,
      min: 100,
    });
  const premium30DaysDurationDays =
    overrides?.premium30DaysDurationDays ??
    resolvePositiveInteger({
      value: configService.get<string>('BILLING_PREMIUM_30_DAYS_DURATION_DAYS'),
      fallback: DEFAULT_PREMIUM_30_DAYS_DURATION_DAYS,
      min: 1,
    });
  const premium90DaysAmountDzd =
    overrides?.premium90DaysAmountDzd ??
    resolvePositiveInteger({
      value: configService.get<string>('BILLING_PREMIUM_90_DAYS_AMOUNT_DZD'),
      fallback: DEFAULT_PREMIUM_90_DAYS_AMOUNT_DZD,
      min: 100,
    });
  const premium90DaysDurationDays =
    overrides?.premium90DaysDurationDays ??
    resolvePositiveInteger({
      value: configService.get<string>('BILLING_PREMIUM_90_DAYS_DURATION_DAYS'),
      fallback: DEFAULT_PREMIUM_90_DAYS_DURATION_DAYS,
      min: 1,
    });
  const premiumBacSeasonAmountDzd =
    overrides?.premiumBacSeasonAmountDzd ??
    resolvePositiveInteger({
      value: configService.get<string>('BILLING_PREMIUM_BAC_SEASON_AMOUNT_DZD'),
      fallback: DEFAULT_PREMIUM_BAC_SEASON_AMOUNT_DZD,
      min: 100,
    });
  const configuredBacSeasonEndsAt =
    overrides?.configuredBacSeasonEndsAt ??
    readConfiguredBacSeasonEndsAt(configService);

  return {
    premium30DaysAmountDzd,
    premium30DaysDurationDays,
    premium90DaysAmountDzd,
    premium90DaysDurationDays,
    premiumBacSeasonAmountDzd,
    configuredBacSeasonEndsAt,
    effectiveBacSeasonEndsAt: resolveBacSeasonEndsAt(
      configService,
      now,
      configuredBacSeasonEndsAt,
    ),
  };
}

export function resolveBillingPlans(
  configService: Pick<ConfigService, 'get'>,
  now = new Date(),
  overrides?: BillingPlanSettingsOverrides,
): BillingPlan[] {
  return resolveConfiguredBillingPlans(configService, now, overrides).filter(
    (plan) =>
      plan.accessType !== 'SEASON_END' ||
      (plan.seasonEndsAt !== null &&
        new Date(plan.seasonEndsAt).getTime() > now.getTime()),
  );
}

export function resolveConfiguredBillingPlans(
  configService: Pick<ConfigService, 'get'>,
  now = new Date(),
  overrides?: BillingPlanSettingsOverrides,
): BillingPlan[] {
  return resolveBillingPlansFromSettings(
    resolveBillingPlanSettings(configService, now, overrides),
  );
}

export function resolveBillingPlansFromSettings(
  settings: BillingPlanSettingsSnapshot,
): BillingPlan[] {
  const plans: BillingPlan[] = [
    {
      code: 'PREMIUM_30_DAYS',
      name: 'Premium لمدة 30 يوماً',
      description:
        'وصول كامل إلى شرح الذكاء الاصطناعي، دريل نقاط الضعف، والرؤى المتقدمة لمدة 30 يوماً بسعر نهائي دون رسوم دفع إضافية على الطالب.',
      currency: 'DZD',
      amount: settings.premium30DaysAmountDzd,
      accessType: 'FIXED_DAYS',
      durationDays: settings.premium30DaysDurationDays,
      seasonEndsAt: null,
      features: [
        'شرح بالذكاء الاصطناعي داخل الجلسات',
        'دريل نقاط الضعف المبني على أدائك',
        'رؤى أعمق حول المحاور الأضعف',
        'إمكانية تمديد الوصول قبل انتهاء المدة',
        'السعر الظاهر نهائي ورسوم الدفع تتحملها المنصة',
      ],
    },
    {
      code: 'PREMIUM_90_DAYS',
      name: 'Premium لثلاثة أشهر (سداسي)',
      description:
        'خطة فصل دراسي كامل تمنحك 90 يوماً من الوصول الممتاز مع أفضل قيمة للطلاب المنتظمين، وبسعر نهائي دون رسوم دفع إضافية.',
      currency: 'DZD',
      amount: settings.premium90DaysAmountDzd,
      accessType: 'FIXED_DAYS',
      durationDays: settings.premium90DaysDurationDays,
      seasonEndsAt: null,
      features: [
        'صلاحية فصل دراسي كامل',
        'شرح بالذكاء الاصطناعي ودريل نقاط الضعف',
        'مناسبة للتحضير المنتظم خلال السداسي',
        'قيمة أفضل من تجديد 30 يوماً كل مرة',
        'السعر الظاهر نهائي ورسوم الدفع تتحملها المنصة',
      ],
      recommended: true,
    },
    {
      code: 'PREMIUM_BAC_SEASON',
      name: 'Premium لموسم الباك',
      description:
        'وصول مدفوع مستمر حتى نهاية موسم امتحان البكالوريا الحالي كما هو مضبوط في إعدادات المنصة، مع سعر نهائي دون رسوم إضافية على الطالب.',
      currency: 'DZD',
      amount: settings.premiumBacSeasonAmountDzd,
      accessType: 'SEASON_END',
      durationDays: null,
      seasonEndsAt: settings.effectiveBacSeasonEndsAt.toISOString(),
      features: [
        'صلاحية حتى نهاية موسم امتحان البكالوريا',
        'مناسب للمرحلة النهائية قبل الامتحان',
        'لا حاجة إلى تجديد أثناء الموسم',
        'يشمل كل مزايا Premium المتقدمة',
        'السعر الظاهر نهائي ورسوم الدفع تتحملها المنصة',
      ],
    },
  ];

  return plans;
}

export function findBillingPlan(
  configService: Pick<ConfigService, 'get'>,
  planCode: BillingPlanCode,
  now = new Date(),
  options?: {
    includeUnavailable?: boolean;
    overrides?: BillingPlanSettingsOverrides;
  },
) {
  const plans = options?.includeUnavailable
    ? resolveConfiguredBillingPlans(configService, now, options?.overrides)
    : resolveBillingPlans(configService, now, options?.overrides);

  return plans.find((plan) => plan.code === planCode) ?? null;
}

export function resolveBacSeasonEndsAt(
  configService: Pick<ConfigService, 'get'>,
  now = new Date(),
  configuredEndsAt?: Date | null,
) {
  if (configuredEndsAt && !Number.isNaN(configuredEndsAt.getTime())) {
    return configuredEndsAt;
  }

  const envConfiguredDate = readConfiguredBacSeasonEndsAt(configService);

  if (envConfiguredDate) {
    return envConfiguredDate;
  }

  const currentYear = now.getUTCFullYear();
  const targetYear = now.getUTCMonth() >= 6 ? currentYear + 1 : currentYear;

  return new Date(Date.UTC(targetYear, 5, 30, 22, 59, 59));
}

export function readConfiguredBacSeasonEndsAt(
  configService: Pick<ConfigService, 'get'>,
) {
  const configuredValue = configService
    .get<string>('BILLING_BAC_SEASON_ENDS_AT')
    ?.trim();

  if (!configuredValue) {
    return null;
  }

  const configuredDate = new Date(configuredValue);

  return Number.isNaN(configuredDate.getTime()) ? null : configuredDate;
}
