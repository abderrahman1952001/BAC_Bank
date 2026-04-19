import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  BillingPlan,
  BillingPlanCode,
  BillingCheckoutResponse,
  BillingCreateCheckoutRequest,
  BillingCreateCheckoutResponse,
  BillingOverviewResponse,
} from '@bac-bank/contracts/billing';
import { billingPlanSchema } from '@bac-bank/contracts/billing';
import {
  BillingCheckoutStatus,
  BillingProvider,
  BillingWebhookEventStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { API_GLOBAL_PREFIX } from '../app-setup';
import { PrismaService } from '../prisma/prisma.service';
import { describeError } from '../runtime/logging';
import {
  buildPremiumAccessWindow,
  hasPremiumAccess,
  resolveEffectiveSubscriptionStatus,
} from './billing-access';
import { BillingSettingsService } from './billing-settings.service';
import { ChargilyCheckout, ChargilyClient } from './chargily.client';

const CHARGILY_CHECKOUT_EXPIRATION_MINUTES = 30;

type BillingUserRecord = {
  id: string;
  email: string;
  fullName: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAt: Date | null;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingSettingsService: BillingSettingsService,
    private readonly chargilyClient: ChargilyClient,
  ) {}

  async getBillingOverview(userId: string): Promise<BillingOverviewResponse> {
    const user = await this.readUserOrThrow(userId);
    const normalizedUser = await this.ensureSubscriptionFresh(user);
    const recentCheckouts = await this.prisma.billingCheckout.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      provider: 'CHARGILY',
      currentAccess: {
        isPremium: hasPremiumAccess(normalizedUser.subscriptionEndsAt),
        subscriptionStatus: hasPremiumAccess(normalizedUser.subscriptionEndsAt)
          ? 'ACTIVE'
          : 'FREE',
        subscriptionEndsAt:
          normalizedUser.subscriptionEndsAt?.toISOString() ?? null,
      },
      availablePlans: await this.billingSettingsService.listAvailablePlans(),
      recentCheckouts: recentCheckouts.map((checkout) =>
        this.mapBillingCheckout(checkout),
      ),
    };
  }

  async createCheckoutForUser(
    userId: string,
    payload: BillingCreateCheckoutRequest,
    input: {
      appOrigin?: string | null;
    },
  ): Promise<BillingCreateCheckoutResponse> {
    if (!input.appOrigin) {
      throw new BadRequestException(
        'The application origin could not be determined for the payment flow.',
      );
    }

    if (!this.chargilyClient.isConfigured()) {
      throw new ServiceUnavailableException(
        'The payment gateway is not configured on the server.',
      );
    }

    const now = new Date();
    const plan = await this.billingSettingsService.findPlanByCode(
      payload.planCode,
      {
        now,
      },
    );

    if (!plan) {
      throw new BadRequestException('The selected billing plan is invalid.');
    }

    const locale = payload.locale ?? 'ar';
    const user = await this.ensureSubscriptionFresh(
      await this.readUserOrThrow(userId),
    );
    this.assertPlanPurchaseAllowed({
      plan,
      user,
      now,
    });
    const successUrl = `${input.appOrigin}/student/billing/success?checkout=`;
    const failureUrl = `${input.appOrigin}/student/billing/failure?checkout=`;
    const webhookUrl = `${input.appOrigin}/${API_GLOBAL_PREFIX}/billing/webhooks/chargily`;
    const createdCheckout = await this.prisma.billingCheckout.create({
      data: {
        userId,
        provider: BillingProvider.CHARGILY,
        planCode: plan.code,
        currency: plan.currency,
        amount: plan.amount,
        status: BillingCheckoutStatus.PENDING,
        locale,
        successUrl: `${successUrl}pending`,
        failureUrl: `${failureUrl}pending`,
        webhookUrl,
        metadata: this.toJsonValue({
          createdBy: 'student-billing',
          planSnapshot: this.buildPlanSnapshot(plan),
        }),
      },
    });
    const localSuccessUrl = `${successUrl}${createdCheckout.id}`;
    const localFailureUrl = `${failureUrl}${createdCheckout.id}`;
    let providerCustomerId: string | null = null;

    try {
      providerCustomerId = await this.resolveChargilyCustomerId(user);
      const providerCheckout = await this.chargilyClient.createCheckout({
        amount: plan.amount,
        currency: 'dzd',
        locale,
        successUrl: localSuccessUrl,
        failureUrl: localFailureUrl,
        webhookUrl,
        description: `${plan.name} · BAC Bank`,
        customerId: providerCustomerId,
        metadata: {
          localCheckoutId: createdCheckout.id,
          userId,
          planCode: plan.code,
        },
        feesAllocation: 'merchant',
      });
      const syncedCheckout = await this.prisma.billingCheckout.update({
        where: { id: createdCheckout.id },
        data: {
          providerCheckoutId: providerCheckout.id,
          providerCustomerId,
          providerPaymentMethod: providerCheckout.paymentMethod,
          providerInvoiceId: providerCheckout.invoiceId,
          providerLivemode: providerCheckout.livemode,
          checkoutUrl: providerCheckout.checkoutUrl,
          successUrl: localSuccessUrl,
          failureUrl: localFailureUrl,
          webhookUrl,
          status: this.mapProviderStatusToLocalStatus(providerCheckout),
          providerPayload: this.toJsonValue(providerCheckout.payload),
          lastSyncedAt: new Date(),
        },
      });

      if (!syncedCheckout.checkoutUrl) {
        throw new Error('Chargily checkout URL is missing.');
      }

      return {
        checkout: this.mapBillingCheckout(syncedCheckout),
        redirectUrl: syncedCheckout.checkoutUrl,
      };
    } catch (error) {
      await this.prisma.billingCheckout.update({
        where: { id: createdCheckout.id },
        data: {
          providerCustomerId,
          successUrl: localSuccessUrl,
          failureUrl: localFailureUrl,
          status: BillingCheckoutStatus.FAILED,
          failureReason: describeError(error),
          lastSyncedAt: new Date(),
        },
      });

      throw new ServiceUnavailableException(
        'The payment session could not be created. Please try again in a moment.',
      );
    }
  }

  async getCheckoutForUser(
    userId: string,
    checkoutId: string,
  ): Promise<BillingCheckoutResponse> {
    const checkout = await this.prisma.billingCheckout.findFirst({
      where: {
        id: checkoutId,
        userId,
      },
    });

    if (!checkout) {
      throw new NotFoundException('Payment checkout not found.');
    }

    return {
      checkout: this.mapBillingCheckout(checkout),
    };
  }

  async syncCheckoutForUser(
    userId: string,
    checkoutId: string,
  ): Promise<BillingCheckoutResponse> {
    const checkout = await this.prisma.billingCheckout.findFirst({
      where: {
        id: checkoutId,
        userId,
      },
    });

    if (!checkout) {
      throw new NotFoundException('Payment checkout not found.');
    }

    if (!checkout.providerCheckoutId) {
      return {
        checkout: this.mapBillingCheckout(checkout),
      };
    }

    if (!this.chargilyClient.isConfigured()) {
      throw new ServiceUnavailableException(
        'The payment gateway is not configured on the server.',
      );
    }

    const providerCheckout = await this.chargilyClient.retrieveCheckout(
      checkout.providerCheckoutId,
    );
    const reconciledCheckout = await this.reconcileCheckout(
      checkout.id,
      providerCheckout,
    );

    return {
      checkout: this.mapBillingCheckout(reconciledCheckout),
    };
  }

  async handleChargilyWebhook(input: {
    signature?: string | null;
    rawPayload?: string | null;
  }) {
    if (!this.chargilyClient.isConfigured()) {
      throw new ServiceUnavailableException(
        'The payment gateway is not configured on the server.',
      );
    }

    const rawPayload = input.rawPayload?.trim();

    if (!rawPayload) {
      throw new BadRequestException('Webhook payload is missing.');
    }

    if (
      !this.chargilyClient.verifyWebhookSignature({
        payload: rawPayload,
        signature: input.signature,
      })
    ) {
      throw new ForbiddenException('Invalid payment webhook signature.');
    }

    const event = this.chargilyClient.parseWebhookEvent(rawPayload);
    const existingEvent = await this.prisma.billingWebhookEvent.findUnique({
      where: { providerEventId: event.id },
    });

    if (existingEvent) {
      return {
        received: true,
        duplicate: true,
      };
    }

    const localCheckoutId =
      this.readLocalCheckoutIdFromProviderPayload(event.checkout) ?? null;
    const matchedCheckout =
      localCheckoutId !== null
        ? await this.prisma.billingCheckout.findUnique({
            where: { id: localCheckoutId },
          })
        : await this.prisma.billingCheckout.findUnique({
            where: {
              providerCheckoutId: event.checkout.id,
            },
          });
    const webhookEvent = await this.prisma.billingWebhookEvent.create({
      data: {
        provider: BillingProvider.CHARGILY,
        providerEventId: event.id,
        billingCheckoutId: matchedCheckout?.id ?? null,
        eventType: event.type,
        providerCheckoutId: event.checkout.id,
        providerLivemode: event.livemode,
        signatureVerified: true,
        payload: this.toJsonValue(event.payload),
      },
    });

    if (!matchedCheckout) {
      await this.prisma.billingWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: BillingWebhookEventStatus.IGNORED,
          processedAt: new Date(),
          errorMessage:
            'The webhook event did not match any local checkout session.',
        },
      });

      return {
        received: true,
        duplicate: false,
      };
    }

    try {
      await this.reconcileCheckout(matchedCheckout.id, event.checkout, {
        webhookEventId: webhookEvent.id,
      });
      await this.prisma.billingWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: BillingWebhookEventStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.billingWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: BillingWebhookEventStatus.FAILED,
          processedAt: new Date(),
          errorMessage: describeError(error),
        },
      });

      throw error;
    }

    return {
      received: true,
      duplicate: false,
    };
  }

  private async reconcileCheckout(
    checkoutId: string,
    providerCheckout: ChargilyCheckout,
    input?: {
      webhookEventId?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const checkout = await tx.billingCheckout.findUnique({
        where: { id: checkoutId },
      });

      if (!checkout) {
        throw new NotFoundException('Payment checkout not found.');
      }

      const localStatus = this.mapProviderStatusToLocalStatus(providerCheckout);
      const commonUpdate = {
        providerCheckoutId: providerCheckout.id,
        providerPaymentMethod: providerCheckout.paymentMethod,
        providerInvoiceId: providerCheckout.invoiceId,
        providerCustomerId: providerCheckout.customerId,
        providerLivemode: providerCheckout.livemode,
        checkoutUrl: providerCheckout.checkoutUrl,
        successUrl: providerCheckout.successUrl ?? checkout.successUrl,
        failureUrl: providerCheckout.failureUrl ?? checkout.failureUrl,
        webhookUrl: providerCheckout.webhookEndpoint ?? checkout.webhookUrl,
        providerPayload: this.toJsonValue(providerCheckout.payload),
        lastSyncedAt: new Date(),
        failureReason: this.resolveFailureReason(
          localStatus,
          checkout.failureReason,
        ),
      };

      if (localStatus === BillingCheckoutStatus.PAID) {
        if (checkout.status === BillingCheckoutStatus.PAID) {
          return tx.billingCheckout.update({
            where: { id: checkout.id },
            data: {
              ...commonUpdate,
              status: BillingCheckoutStatus.PAID,
            },
          });
        }

        const user = await tx.user.findUnique({
          where: { id: checkout.userId },
          select: {
            id: true,
            subscriptionEndsAt: true,
          },
        });

        if (!user) {
          throw new NotFoundException('Billing user not found.');
        }

        const plan =
          this.readPlanSnapshotFromCheckoutMetadata(checkout.metadata) ??
          (await this.billingSettingsService.findPlanByCode(
            checkout.planCode as BillingPlanCode,
            {
              now: checkout.createdAt,
              includeUnavailable: true,
            },
          ));

        if (!plan) {
          throw new BadRequestException(
            `Billing plan ${checkout.planCode} is not configured.`,
          );
        }

        const paidAt = new Date(providerCheckout.updatedAt * 1000);
        const accessWindow = buildPremiumAccessWindow({
          now: paidAt,
          currentSubscriptionEndsAt: user.subscriptionEndsAt,
          grant: this.buildPlanGrant(plan),
        });
        const updatedCheckout = await tx.billingCheckout.update({
          where: { id: checkout.id },
          data: {
            ...commonUpdate,
            status: BillingCheckoutStatus.PAID,
            accessStartsAt: accessWindow.startsAt,
            accessEndsAt: accessWindow.endsAt,
            paidAt,
            failureReason: null,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: resolveEffectiveSubscriptionStatus({
              subscriptionStatus: SubscriptionStatus.ACTIVE,
              subscriptionEndsAt: accessWindow.endsAt,
              now: paidAt,
            }),
            subscriptionEndsAt: accessWindow.endsAt,
          },
        });

        if (input?.webhookEventId) {
          await tx.billingWebhookEvent.update({
            where: { id: input.webhookEventId },
            data: {
              billingCheckoutId: checkout.id,
            },
          });
        }

        return updatedCheckout;
      }

      const updatedCheckout = await tx.billingCheckout.update({
        where: { id: checkout.id },
        data: {
          ...commonUpdate,
          status: localStatus,
        },
      });

      if (input?.webhookEventId) {
        await tx.billingWebhookEvent.update({
          where: { id: input.webhookEventId },
          data: {
            billingCheckoutId: checkout.id,
          },
        });
      }

      return updatedCheckout;
    });
  }

  private async readUserOrThrow(userId: string): Promise<BillingUserRecord> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private async ensureSubscriptionFresh(user: BillingUserRecord) {
    const effectiveStatus = resolveEffectiveSubscriptionStatus({
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndsAt: user.subscriptionEndsAt,
    });

    if (effectiveStatus === user.subscriptionStatus) {
      return user;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: effectiveStatus,
      },
    });

    return {
      ...user,
      subscriptionStatus: effectiveStatus,
    };
  }

  private async resolveChargilyCustomerId(user: BillingUserRecord) {
    const existingCheckout = await this.prisma.billingCheckout.findFirst({
      where: {
        userId: user.id,
        provider: BillingProvider.CHARGILY,
        providerCustomerId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        providerCustomerId: true,
      },
    });

    if (existingCheckout?.providerCustomerId) {
      return existingCheckout.providerCustomerId;
    }

    const customer = await this.chargilyClient.createCustomer({
      name:
        user.fullName?.trim() ||
        user.email.split('@')[0]?.trim() ||
        'BAC Bank Student',
      email: user.email,
      metadata: {
        userId: user.id,
      },
    });

    return customer.id;
  }

  private mapProviderStatusToLocalStatus(providerCheckout: ChargilyCheckout) {
    if (providerCheckout.status === 'paid') {
      return BillingCheckoutStatus.PAID;
    }

    if (providerCheckout.status === 'failed') {
      return BillingCheckoutStatus.FAILED;
    }

    if (providerCheckout.status === 'canceled') {
      return BillingCheckoutStatus.CANCELED;
    }

    if (providerCheckout.status === 'processing') {
      return BillingCheckoutStatus.PROCESSING;
    }

    const ageMs =
      Date.now() - new Date(providerCheckout.createdAt * 1000).getTime();

    if (ageMs > CHARGILY_CHECKOUT_EXPIRATION_MINUTES * 60_000) {
      return BillingCheckoutStatus.EXPIRED;
    }

    return BillingCheckoutStatus.PENDING;
  }

  private mapBillingCheckout(
    checkout: Awaited<ReturnType<typeof this.prisma.billingCheckout.findFirst>>,
  ) {
    if (!checkout) {
      throw new NotFoundException('Payment checkout not found.');
    }

    return {
      id: checkout.id,
      provider: 'CHARGILY' as const,
      planCode: checkout.planCode as BillingPlanCode,
      currency: checkout.currency as 'DZD',
      amount: checkout.amount,
      status: checkout.status,
      locale: checkout.locale as 'ar' | 'fr' | 'en',
      providerCheckoutId: checkout.providerCheckoutId,
      paymentMethod: checkout.providerPaymentMethod,
      checkoutUrl: checkout.checkoutUrl,
      failureReason: checkout.failureReason,
      accessStartsAt: checkout.accessStartsAt?.toISOString() ?? null,
      accessEndsAt: checkout.accessEndsAt?.toISOString() ?? null,
      paidAt: checkout.paidAt?.toISOString() ?? null,
      createdAt: checkout.createdAt.toISOString(),
      updatedAt: checkout.updatedAt.toISOString(),
    };
  }

  private readLocalCheckoutIdFromProviderPayload(
    providerCheckout: ChargilyCheckout,
  ) {
    const metadata = providerCheckout.payload.metadata;

    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const localCheckoutId = (metadata as Record<string, unknown>)
      .localCheckoutId;

    return typeof localCheckoutId === 'string' && localCheckoutId.trim()
      ? localCheckoutId
      : null;
  }

  private readPlanSnapshotFromCheckoutMetadata(
    metadata: Prisma.JsonValue | null,
  ) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const planSnapshot = (metadata as Record<string, unknown>).planSnapshot;
    const parsedPlan = billingPlanSchema.safeParse(planSnapshot);

    return parsedPlan.success ? parsedPlan.data : null;
  }

  private buildPlanSnapshot(plan: BillingPlan) {
    return {
      code: plan.code,
      name: plan.name,
      description: plan.description,
      currency: plan.currency,
      amount: plan.amount,
      accessType: plan.accessType,
      durationDays: plan.durationDays,
      seasonEndsAt: plan.seasonEndsAt,
      features: plan.features,
      ...(plan.recommended ? { recommended: plan.recommended } : {}),
    };
  }

  private assertPlanPurchaseAllowed(input: {
    plan: BillingPlan;
    user: BillingUserRecord;
    now: Date;
  }) {
    if (input.plan.accessType !== 'SEASON_END') {
      return;
    }

    const seasonEndsAt = this.readSeasonEndsAt(input.plan);

    if (!seasonEndsAt || seasonEndsAt.getTime() <= input.now.getTime()) {
      throw new BadRequestException(
        'The BAC season pass is not currently available.',
      );
    }

    if (
      input.user.subscriptionEndsAt &&
      input.user.subscriptionEndsAt.getTime() >= seasonEndsAt.getTime()
    ) {
      throw new BadRequestException(
        'Your current premium access already covers the BAC season pass window.',
      );
    }
  }

  private buildPlanGrant(plan: BillingPlan):
    | {
        mode: 'FIXED_DAYS';
        durationDays: number;
      }
    | {
        mode: 'SEASON_END';
        endsAt: Date;
      } {
    if (plan.accessType === 'FIXED_DAYS') {
      if (!plan.durationDays) {
        throw new BadRequestException(
          `Billing plan ${plan.code} is missing a fixed access duration.`,
        );
      }

      return {
        mode: 'FIXED_DAYS',
        durationDays: plan.durationDays,
      };
    }

    const seasonEndsAt = this.readSeasonEndsAt(plan);

    if (!seasonEndsAt) {
      throw new BadRequestException(
        `Billing plan ${plan.code} is missing a season end date.`,
      );
    }

    return {
      mode: 'SEASON_END',
      endsAt: seasonEndsAt,
    };
  }

  private readSeasonEndsAt(plan: BillingPlan) {
    if (!plan.seasonEndsAt) {
      return null;
    }

    const seasonEndsAt = new Date(plan.seasonEndsAt);

    return Number.isNaN(seasonEndsAt.getTime()) ? null : seasonEndsAt;
  }

  private resolveFailureReason(
    status: BillingCheckoutStatus,
    fallback: string | null,
  ) {
    if (status === BillingCheckoutStatus.FAILED) {
      return 'The payment was rejected by the payment gateway.';
    }

    if (status === BillingCheckoutStatus.CANCELED) {
      return 'The payment flow was canceled before completion.';
    }

    if (status === BillingCheckoutStatus.EXPIRED) {
      return 'The payment session expired before the student completed the checkout.';
    }

    if (
      status === BillingCheckoutStatus.PENDING ||
      status === BillingCheckoutStatus.PROCESSING ||
      status === BillingCheckoutStatus.PAID
    ) {
      return status === BillingCheckoutStatus.PAID ? null : fallback;
    }

    return fallback;
  }

  private toJsonValue(value: Record<string, unknown>) {
    return value as Prisma.InputJsonValue;
  }
}
