import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  AdminBillingSettingsResponse,
  UpdateAdminBillingSettingsRequest,
} from '@bac-bank/contracts/admin';
import type { BillingPlan, BillingPlanCode } from '@bac-bank/contracts/billing';
import { ConfigService } from '@nestjs/config';
import type { BillingSettings } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  BillingPlanSettingsOverrides,
  BillingPlanSettingsSnapshot,
  resolveBillingPlanSettings,
  resolveBillingPlansFromSettings,
} from './billing-plans';

const BILLING_SETTINGS_SINGLETON_KEY = 'default';
type BillingSettingsRecord = BillingSettings | null;

@Injectable()
export class BillingSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getPlanSettingsSnapshot(now = new Date()) {
    const record = await this.readSettingsRecord();
    return this.resolveSettingsSnapshot(record, now);
  }

  async findPlanByCode(
    planCode: BillingPlanCode,
    input?: {
      now?: Date;
      includeUnavailable?: boolean;
    },
  ): Promise<BillingPlan | null> {
    const now = input?.now ?? new Date();
    const settings = await this.getPlanSettingsSnapshot(now);
    const plans = resolveBillingPlansFromSettings(settings).filter(
      (plan) =>
        input?.includeUnavailable ||
        plan.accessType !== 'SEASON_END' ||
        (plan.seasonEndsAt !== null &&
          new Date(plan.seasonEndsAt).getTime() > now.getTime()),
    );

    return plans.find((plan) => plan.code === planCode) ?? null;
  }

  async listAvailablePlans(now = new Date()) {
    const settings = await this.getPlanSettingsSnapshot(now);
    return resolveBillingPlansFromSettings(settings).filter(
      (plan) =>
        plan.accessType !== 'SEASON_END' ||
        (plan.seasonEndsAt !== null &&
          new Date(plan.seasonEndsAt).getTime() > now.getTime()),
    );
  }

  async getAdminBillingSettings(
    now = new Date(),
  ): Promise<AdminBillingSettingsResponse> {
    const record = await this.readSettingsRecord();
    return this.buildAdminBillingSettingsResponse(record, now);
  }

  async updateAdminBillingSettings(
    user: AuthenticatedUser,
    payload: UpdateAdminBillingSettingsRequest,
  ): Promise<AdminBillingSettingsResponse> {
    const configuredBacSeasonEndsAt = this.parseConfiguredBacSeasonEndsAt(
      payload.configuredBacSeasonEndsAt,
    );
    const record = await this.prisma.billingSettings.upsert({
      where: {
        singletonKey: BILLING_SETTINGS_SINGLETON_KEY,
      },
      create: {
        singletonKey: BILLING_SETTINGS_SINGLETON_KEY,
        premium30DaysAmountDzd: payload.premium30DaysAmountDzd,
        premium30DaysDurationDays: payload.premium30DaysDurationDays,
        premium90DaysAmountDzd: payload.premium90DaysAmountDzd,
        premium90DaysDurationDays: payload.premium90DaysDurationDays,
        premiumBacSeasonAmountDzd: payload.premiumBacSeasonAmountDzd,
        bacSeasonEndsAt: configuredBacSeasonEndsAt,
        updatedByUserId: user.id,
        updatedByEmail: user.email,
      },
      update: {
        premium30DaysAmountDzd: payload.premium30DaysAmountDzd,
        premium30DaysDurationDays: payload.premium30DaysDurationDays,
        premium90DaysAmountDzd: payload.premium90DaysAmountDzd,
        premium90DaysDurationDays: payload.premium90DaysDurationDays,
        premiumBacSeasonAmountDzd: payload.premiumBacSeasonAmountDzd,
        bacSeasonEndsAt: configuredBacSeasonEndsAt,
        updatedByUserId: user.id,
        updatedByEmail: user.email,
      },
    });

    return this.buildAdminBillingSettingsResponse(record, new Date());
  }

  private readSettingsRecord() {
    return this.prisma.billingSettings.findUnique({
      where: {
        singletonKey: BILLING_SETTINGS_SINGLETON_KEY,
      },
    });
  }

  private buildAdminBillingSettingsResponse(
    record: BillingSettingsRecord,
    now: Date,
  ): AdminBillingSettingsResponse {
    const settings = this.resolveSettingsSnapshot(record, now);

    return {
      settings: {
        premium30DaysAmountDzd: settings.premium30DaysAmountDzd,
        premium30DaysDurationDays: settings.premium30DaysDurationDays,
        premium90DaysAmountDzd: settings.premium90DaysAmountDzd,
        premium90DaysDurationDays: settings.premium90DaysDurationDays,
        premiumBacSeasonAmountDzd: settings.premiumBacSeasonAmountDzd,
        configuredBacSeasonEndsAt:
          record?.bacSeasonEndsAt?.toISOString() ?? null,
        effectiveBacSeasonEndsAt:
          settings.effectiveBacSeasonEndsAt.toISOString(),
        checkoutFeeResponsibility: 'MERCHANT',
        persisted: record !== null,
        updatedAt: record?.updatedAt?.toISOString() ?? null,
        updatedByUserId: record?.updatedByUserId ?? null,
        updatedByEmail: record?.updatedByEmail ?? null,
      },
      plans: resolveBillingPlansFromSettings(settings),
    };
  }

  private resolveSettingsSnapshot(
    record: BillingSettingsRecord,
    now: Date,
  ): BillingPlanSettingsSnapshot {
    return resolveBillingPlanSettings(this.configService, now, {
      premium30DaysAmountDzd: record?.premium30DaysAmountDzd,
      premium30DaysDurationDays: record?.premium30DaysDurationDays,
      premium90DaysAmountDzd: record?.premium90DaysAmountDzd,
      premium90DaysDurationDays: record?.premium90DaysDurationDays,
      premiumBacSeasonAmountDzd: record?.premiumBacSeasonAmountDzd,
      configuredBacSeasonEndsAt: record?.bacSeasonEndsAt ?? undefined,
    } satisfies BillingPlanSettingsOverrides);
  }

  private parseConfiguredBacSeasonEndsAt(value: string | null) {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(
        'The configured BAC season end date must be a valid ISO datetime.',
      );
    }

    return parsedDate;
  }
}
