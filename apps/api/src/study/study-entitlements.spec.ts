import {
  StudySessionFamily,
  StudySessionKind,
  SubscriptionStatus,
} from '@prisma/client';
import {
  buildStudyEntitlements,
  canStartStudySessionKind,
  getStudyMonthlyQuotaWindow,
  resolveStudySessionFamilyFromKind,
  resolveStudyTier,
} from './study-entitlements';

describe('study entitlements', () => {
  it('builds the monthly quota window using Algeria month boundaries', () => {
    const window = getStudyMonthlyQuotaWindow(
      new Date('2026-04-08T10:00:00.000Z'),
    );

    expect(window.startsAt.toISOString()).toBe('2026-03-31T23:00:00.000Z');
    expect(window.resetsAt.toISOString()).toBe('2026-04-30T23:00:00.000Z');
  });

  it('resolves premium and free study tiers from subscription status', () => {
    expect(resolveStudyTier(SubscriptionStatus.ACTIVE)).toBe('PREMIUM');
    expect(resolveStudyTier(SubscriptionStatus.FREE)).toBe('FREE');
    expect(resolveStudyTier(SubscriptionStatus.CANCELED)).toBe('FREE');
  });

  it('maps session kinds to their orchestration families', () => {
    expect(
      resolveStudySessionFamilyFromKind(StudySessionKind.TOPIC_DRILL),
    ).toBe(StudySessionFamily.DRILL);
    expect(
      resolveStudySessionFamilyFromKind(StudySessionKind.PAPER_SIMULATION),
    ).toBe(StudySessionFamily.SIMULATION);
  });

  it('builds free-tier quotas and warns when the remaining quota is low', () => {
    const entitlements = buildStudyEntitlements({
      subscriptionStatus: SubscriptionStatus.FREE,
      drillStartsUsed: 4,
      simulationStartsUsed: 0,
      now: new Date('2026-04-08T10:00:00.000Z'),
    });

    expect(entitlements).toEqual(
      expect.objectContaining({
        tier: 'FREE',
        capabilities: expect.objectContaining({
          topicDrill: true,
          mixedDrill: true,
          weakPointDrill: false,
          paperSimulation: true,
        }),
      }),
    );
    expect(entitlements.quotas.drillStarts).toEqual(
      expect.objectContaining({
        monthlyLimit: 5,
        used: 4,
        remaining: 1,
        exhausted: false,
        nearLimit: true,
      }),
    );
    expect(entitlements.quotas.simulationStarts).toEqual(
      expect.objectContaining({
        monthlyLimit: 1,
        used: 0,
        remaining: 1,
        exhausted: false,
        nearLimit: false,
      }),
    );
  });

  it('treats premium as unlimited and still keeps capability boundaries explicit', () => {
    const entitlements = buildStudyEntitlements({
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      drillStartsUsed: 12,
      simulationStartsUsed: 4,
      now: new Date('2026-04-08T10:00:00.000Z'),
    });

    expect(entitlements.tier).toBe('PREMIUM');
    expect(entitlements.capabilities.weakPointDrill).toBe(true);
    expect(entitlements.quotas.drillStarts).toEqual(
      expect.objectContaining({
        monthlyLimit: null,
        used: 12,
        remaining: null,
        exhausted: false,
      }),
    );
    expect(entitlements.quotas.simulationStarts).toEqual(
      expect.objectContaining({
        monthlyLimit: null,
        used: 4,
        remaining: null,
        exhausted: false,
      }),
    );
  });

  it('blocks exhausted starts and free weak-point drill attempts', () => {
    const freeEntitlements = buildStudyEntitlements({
      subscriptionStatus: SubscriptionStatus.FREE,
      drillStartsUsed: 5,
      simulationStartsUsed: 1,
      now: new Date('2026-04-08T10:00:00.000Z'),
    });

    expect(
      canStartStudySessionKind({
        entitlements: freeEntitlements,
        family: StudySessionFamily.DRILL,
        kind: StudySessionKind.TOPIC_DRILL,
      }),
    ).toBe(false);
    expect(
      canStartStudySessionKind({
        entitlements: freeEntitlements,
        family: StudySessionFamily.SIMULATION,
        kind: StudySessionKind.PAPER_SIMULATION,
      }),
    ).toBe(false);
    expect(
      canStartStudySessionKind({
        entitlements: freeEntitlements,
        family: StudySessionFamily.DRILL,
        kind: StudySessionKind.WEAK_POINT_DRILL,
      }),
    ).toBe(false);
  });
});
