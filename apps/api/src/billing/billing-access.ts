import { SubscriptionStatus } from '@prisma/client';

export function hasPremiumAccess(
  subscriptionEndsAt?: Date | null,
  now = new Date(),
) {
  if (!subscriptionEndsAt) {
    return false;
  }

  return subscriptionEndsAt.getTime() > now.getTime();
}

export function resolveEffectiveSubscriptionStatus(input: {
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAt?: Date | null;
  now?: Date;
}) {
  if (
    input.subscriptionStatus === SubscriptionStatus.ACTIVE &&
    !hasPremiumAccess(input.subscriptionEndsAt, input.now)
  ) {
    return SubscriptionStatus.FREE;
  }

  return input.subscriptionStatus;
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date.getTime());
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

export function buildPremiumAccessWindow(input: {
  now?: Date;
  currentSubscriptionEndsAt?: Date | null;
  grant:
    | {
        mode: 'FIXED_DAYS';
        durationDays: number;
      }
    | {
        mode: 'SEASON_END';
        endsAt: Date;
      };
}) {
  const now = input.now ?? new Date();
  const startsAt =
    input.currentSubscriptionEndsAt &&
    input.currentSubscriptionEndsAt.getTime() > now.getTime()
      ? new Date(input.currentSubscriptionEndsAt.getTime())
      : now;
  const endsAt =
    input.grant.mode === 'FIXED_DAYS'
      ? addDays(startsAt, input.grant.durationDays)
      : new Date(Math.max(startsAt.getTime(), input.grant.endsAt.getTime()));

  return {
    startsAt,
    endsAt,
  };
}
