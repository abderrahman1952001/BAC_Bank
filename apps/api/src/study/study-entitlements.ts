import type {
  AuthStudyEntitlements,
  AuthStudyQuotaBucket,
  AuthStudyTier,
} from '@bac-bank/contracts/auth';
import {
  StudySessionFamily,
  StudySessionKind,
  SubscriptionStatus,
} from '@prisma/client';

const ALGIERS_TIME_ZONE = 'Africa/Algiers';
const FREE_DRILL_START_LIMIT = 5;
const FREE_SIMULATION_START_LIMIT = 1;

type MonthlyQuotaWindow = {
  startsAt: Date;
  resetsAt: Date;
};

function readTimeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const readPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: readPart('year'),
    month: readPart('month'),
    day: readPart('day'),
    hour: readPart('hour'),
    minute: readPart('minute'),
    second: readPart('second'),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = readTimeZoneParts(date, timeZone);
  const asUtcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtcTimestamp - date.getTime();
}

function buildTimeZoneDate(
  timeZone: string,
  year: number,
  month: number,
  day: number,
) {
  const approximateUtcTimestamp = Date.UTC(year, month - 1, day, 0, 0, 0);
  const approximateDate = new Date(approximateUtcTimestamp);
  const offsetMs = getTimeZoneOffsetMs(approximateDate, timeZone);

  return new Date(approximateUtcTimestamp - offsetMs);
}

export function getStudyMonthlyQuotaWindow(now = new Date()): MonthlyQuotaWindow {
  const { year, month } = readTimeZoneParts(now, ALGIERS_TIME_ZONE);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;

  return {
    startsAt: buildTimeZoneDate(ALGIERS_TIME_ZONE, year, month, 1),
    resetsAt: buildTimeZoneDate(ALGIERS_TIME_ZONE, nextMonthYear, nextMonth, 1),
  };
}

export function resolveStudyTier(
  subscriptionStatus: SubscriptionStatus,
): AuthStudyTier {
  return subscriptionStatus === SubscriptionStatus.ACTIVE ? 'PREMIUM' : 'FREE';
}

export function resolveStudySessionFamilyFromKind(
  kind: StudySessionKind,
): StudySessionFamily {
  return kind === StudySessionKind.PAPER_SIMULATION
    ? StudySessionFamily.SIMULATION
    : StudySessionFamily.DRILL;
}

export function buildStudyEntitlements(input: {
  subscriptionStatus: SubscriptionStatus;
  drillStartsUsed: number;
  simulationStartsUsed: number;
  now?: Date;
}): AuthStudyEntitlements {
  const tier = resolveStudyTier(input.subscriptionStatus);
  const quotaWindow = getStudyMonthlyQuotaWindow(input.now);
  const isPremium = tier === 'PREMIUM';

  return {
    tier,
    capabilities: {
      topicDrill: true,
      mixedDrill: true,
      weakPointDrill: isPremium,
      paperSimulation: true,
      aiExplanation: isPremium,
      weakPointInsight: isPremium,
    },
    quotas: {
      drillStarts: buildQuotaBucket({
        monthlyLimit: isPremium ? null : FREE_DRILL_START_LIMIT,
        used: input.drillStartsUsed,
        resetsAt: quotaWindow.resetsAt,
      }),
      simulationStarts: buildQuotaBucket({
        monthlyLimit: isPremium ? null : FREE_SIMULATION_START_LIMIT,
        used: input.simulationStartsUsed,
        resetsAt: quotaWindow.resetsAt,
      }),
    },
  };
}

export function canStartStudySessionKind(input: {
  entitlements: AuthStudyEntitlements;
  family: StudySessionFamily;
  kind: StudySessionKind;
}) {
  if (
    input.kind === StudySessionKind.WEAK_POINT_DRILL &&
    !input.entitlements.capabilities.weakPointDrill
  ) {
    return false;
  }

  const quotaBucket =
    input.family === StudySessionFamily.SIMULATION
      ? input.entitlements.quotas.simulationStarts
      : input.entitlements.quotas.drillStarts;

  return !quotaBucket.exhausted;
}

function buildQuotaBucket(input: {
  monthlyLimit: number | null;
  used: number;
  resetsAt: Date;
}): AuthStudyQuotaBucket {
  const remaining =
    input.monthlyLimit === null
      ? null
      : Math.max(input.monthlyLimit - input.used, 0);
  const exhausted = input.monthlyLimit !== null && remaining === 0;
  const nearLimit =
    input.monthlyLimit !== null &&
    remaining !== null &&
    remaining > 0 &&
    remaining / input.monthlyLimit <= 0.2;

  return {
    monthlyLimit: input.monthlyLimit,
    used: input.used,
    remaining,
    exhausted,
    nearLimit,
    resetsAt: input.resetsAt.toISOString(),
  };
}
