import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type {
  StudyCommandAcceptResponse,
  StudyCommandAiRouteTelemetry,
  StudyCommandDiagnosticsResponse,
  StudyCommandHistoryEvent,
  StudyCommandHistoryResponse,
  StudyCommandProposal,
} from '@bac-bank/contracts/study-command';
import { PrismaService } from '../prisma/prisma.service';
import type { StudyCommandAiRouterResult } from './study-command-ai-router.service';

const STUDY_COMMAND_PROPOSED_EVENT = 'STUDY_COMMAND_PROPOSED';
const STUDY_COMMAND_ACCEPTED_EVENT = 'STUDY_COMMAND_ACCEPTED';
const STUDY_COMMAND_GUARD_BLOCKED_EVENT = 'STUDY_COMMAND_GUARD_BLOCKED';
const STUDY_COMMAND_SOURCE_TYPE = 'STUDY_COMMAND';
const STUDY_COMMAND_DIAGNOSTIC_WINDOW_DAYS = 30;
const STUDY_COMMAND_DIAGNOSTIC_SAMPLE_LIMIT = 1000;
const STUDY_COMMAND_EVENT_MODES = new Set([
  'SCHOOL_TEST_PREP',
  'TUTOR_REPLAY',
  'BAC_TRAINING',
  'LESSON_UNDERSTANDING',
  'MEMORIZATION_REVIEW',
  'SIMULATION',
  'MISTAKE_REPAIR',
  'LAB_EXPLORATION',
  'LIBRARY_SEARCH',
  'CONTINUE_SESSION',
]);

type StudyCommandEventValue = {
  version: 1;
  kind: 'PROPOSED' | 'ACCEPTED' | 'GUARD_BLOCKED';
  commandLength: number;
  commandFingerprint: string | null;
  mode: StudyCommandProposal['mode'] | null;
  title: string | null;
  primaryHref: string | null;
  resultHref: string | null;
  subjectCode: string | null;
  topicCodes: string[];
  availabilityStatus:
    | NonNullable<StudyCommandProposal['availability']>['status']
    | null;
  matchingExerciseCount: number | null;
  actionKind: StudyCommandProposal['primaryAction']['kind'] | null;
  resultKind: StudyCommandAcceptResponse['kind'] | null;
  guardAction: 'propose' | 'accept' | null;
  guardReason: string | null;
  clarificationRequired: boolean;
  aiRoute: StudyCommandAiRouteTelemetry;
};

type StudyCommandLearningEventRecord = {
  id: string;
  eventType: string;
  value: Prisma.JsonValue;
  occurredAt: Date;
};

@Injectable()
export class StudyCommandBrainService {
  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(input: {
    userId: string;
    command: string;
    proposal: StudyCommandProposal | null;
    aiRouterResult: StudyCommandAiRouterResult | null;
    kind: 'PROPOSED' | 'ACCEPTED';
    resultKind: StudyCommandAcceptResponse['kind'] | null;
    sourceId: string | null;
    resultHref?: string | null;
  }) {
    const value = this.buildEventValue(input);

    await this.safe(
      this.prisma.studentLearningEvent.create({
        data: {
          userId: input.userId,
          eventType:
            input.kind === 'PROPOSED'
              ? STUDY_COMMAND_PROPOSED_EVENT
              : STUDY_COMMAND_ACCEPTED_EVENT,
          sourceType: STUDY_COMMAND_SOURCE_TYPE,
          sourceId: input.sourceId,
          value: this.toJsonValue(value),
        },
      }),
      null,
    );
  }

  async recordGuardBlocked(input: {
    userId: string;
    command: string;
    action: 'propose' | 'accept';
    reason: string;
  }) {
    const command = input.command.trim();
    const value: StudyCommandEventValue = {
      version: 1,
      kind: 'GUARD_BLOCKED',
      commandLength: command.length,
      commandFingerprint: command ? this.hashCommand(command) : null,
      mode: null,
      title: null,
      primaryHref: null,
      resultHref: null,
      subjectCode: null,
      topicCodes: [],
      availabilityStatus: null,
      matchingExerciseCount: null,
      actionKind: null,
      resultKind: null,
      guardAction: input.action,
      guardReason: input.reason,
      clarificationRequired: false,
      aiRoute: this.toAiRouteTelemetry({
        interpretation: null,
        usageEvent: null,
      }),
    };

    await this.safe(
      this.prisma.studentLearningEvent.create({
        data: {
          userId: input.userId,
          eventType: STUDY_COMMAND_GUARD_BLOCKED_EVENT,
          sourceType: STUDY_COMMAND_SOURCE_TYPE,
          sourceId: null,
          value: this.toJsonValue(value),
        },
      }),
      null,
    );
  }

  async listHistory(userId: string): Promise<StudyCommandHistoryResponse> {
    const events = await this.prisma.studentLearningEvent.findMany({
      where: {
        userId,
        eventType: {
          in: [STUDY_COMMAND_PROPOSED_EVENT, STUDY_COMMAND_ACCEPTED_EVENT],
        },
      },
      select: {
        id: true,
        eventType: true,
        value: true,
        occurredAt: true,
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: 20,
    });

    return {
      data: events
        .map((event) => this.toHistoryEvent(event))
        .filter((event): event is StudyCommandHistoryEvent => event !== null),
    };
  }

  async getDiagnostics(): Promise<StudyCommandDiagnosticsResponse> {
    const windowDays = STUDY_COMMAND_DIAGNOSTIC_WINDOW_DAYS;
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const events = await this.prisma.studentLearningEvent.findMany({
      where: {
        eventType: {
          in: [
            STUDY_COMMAND_PROPOSED_EVENT,
            STUDY_COMMAND_ACCEPTED_EVENT,
            STUDY_COMMAND_GUARD_BLOCKED_EVENT,
          ],
        },
        occurredAt: {
          gte: since,
        },
      },
      select: {
        id: true,
        eventType: true,
        value: true,
        occurredAt: true,
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: STUDY_COMMAND_DIAGNOSTIC_SAMPLE_LIMIT,
    });

    return this.buildDiagnostics(events, windowDays);
  }

  private buildEventValue(input: {
    command: string;
    proposal: StudyCommandProposal | null;
    aiRouterResult: StudyCommandAiRouterResult | null;
    kind: 'PROPOSED' | 'ACCEPTED';
    resultKind: StudyCommandAcceptResponse['kind'] | null;
    resultHref?: string | null;
  }): StudyCommandEventValue {
    const proposal = input.proposal;
    const primaryAction = proposal?.primaryAction ?? null;
    const command = input.command.trim();

    return {
      version: 1,
      kind: input.kind,
      commandLength: command.length,
      commandFingerprint: command ? this.hashCommand(command) : null,
      mode: proposal?.mode ?? null,
      title: proposal?.title ?? null,
      primaryHref: proposal?.primaryHref ?? null,
      resultHref: input.resultHref ?? null,
      subjectCode: this.extractSubjectCode(proposal),
      topicCodes: this.extractTopicCodes(proposal),
      availabilityStatus: proposal?.availability?.status ?? null,
      matchingExerciseCount:
        proposal?.availability?.matchingExerciseCount ?? null,
      actionKind: primaryAction?.kind ?? null,
      resultKind: input.resultKind,
      guardAction: null,
      guardReason: null,
      clarificationRequired: Boolean(proposal?.clarification),
      aiRoute: this.toAiRouteTelemetry(input.aiRouterResult),
    };
  }

  private toAiRouteTelemetry(
    aiRouterResult: StudyCommandAiRouterResult | null,
  ): StudyCommandAiRouteTelemetry {
    if (!aiRouterResult) {
      return {
        status: 'SERVICE_ERROR',
        provider: null,
        model: null,
        skippedReason: null,
        failureCode: null,
        confidence: null,
      };
    }

    if (aiRouterResult.skippedReason) {
      return {
        status: 'SKIPPED',
        provider: null,
        model: null,
        skippedReason: aiRouterResult.skippedReason,
        failureCode: null,
        confidence: null,
      };
    }

    if (aiRouterResult.failureCode) {
      return {
        status: 'FAILED',
        provider: aiRouterResult.usageEvent?.provider ?? null,
        model: aiRouterResult.usageEvent?.model ?? null,
        skippedReason: null,
        failureCode: aiRouterResult.failureCode,
        confidence: null,
      };
    }

    if (aiRouterResult.interpretation) {
      return {
        status: 'SUCCESS',
        provider: aiRouterResult.usageEvent?.provider ?? null,
        model: aiRouterResult.usageEvent?.model ?? null,
        skippedReason: null,
        failureCode: null,
        confidence: aiRouterResult.interpretation.confidence,
      };
    }

    return {
      status: 'NOT_ATTEMPTED',
      provider: null,
      model: null,
      skippedReason: null,
      failureCode: null,
      confidence: null,
    };
  }

  private extractSubjectCode(proposal: StudyCommandProposal | null) {
    const action = proposal?.primaryAction;

    if (action?.kind === 'CREATE_STUDY_SESSION') {
      return action.request.subjectCode;
    }

    if (!proposal?.primaryHref) {
      return null;
    }

    try {
      const url = new URL(proposal.primaryHref, 'http://bac-bank.local');
      return url.searchParams.get('subject');
    } catch {
      return null;
    }
  }

  private extractTopicCodes(proposal: StudyCommandProposal | null) {
    const action = proposal?.primaryAction;

    if (action?.kind === 'CREATE_STUDY_SESSION') {
      return action.request.topicCodes ?? [];
    }

    if (!proposal?.primaryHref) {
      return [];
    }

    try {
      const url = new URL(proposal.primaryHref, 'http://bac-bank.local');
      return url.searchParams.getAll('topic');
    } catch {
      return [];
    }
  }

  private toHistoryEvent(
    event: StudyCommandLearningEventRecord,
  ): StudyCommandHistoryEvent | null {
    const value = this.toStudyCommandEventValue(event.value);

    if (!value) {
      return null;
    }

    if (value.kind === 'GUARD_BLOCKED') {
      return null;
    }

    return {
      id: event.id,
      kind: value.kind,
      occurredAt: event.occurredAt.toISOString(),
      mode: value.mode,
      title: value.title,
      href: value.resultHref ?? value.primaryHref,
      subjectCode: value.subjectCode,
      topicCodes: value.topicCodes,
      availabilityStatus: value.availabilityStatus,
      matchingExerciseCount: value.matchingExerciseCount,
      actionKind: value.actionKind,
      resultKind: value.resultKind,
      clarificationRequired: value.clarificationRequired,
      aiRoute: value.aiRoute,
    };
  }

  private buildDiagnostics(
    events: StudyCommandLearningEventRecord[],
    windowDays: number,
  ): StudyCommandDiagnosticsResponse {
    const values = events
      .map((event) => ({
        value: this.toStudyCommandEventValue(event.value),
        occurredAt: event.occurredAt,
      }))
      .filter(
        (event): event is { value: StudyCommandEventValue; occurredAt: Date } =>
          event.value !== null,
      );
    const proposals = values.filter((event) => event.value.kind === 'PROPOSED');
    const accepted = values.filter((event) => event.value.kind === 'ACCEPTED');
    const guardBlocked = values.filter(
      (event) => event.value.kind === 'GUARD_BLOCKED',
    );

    return {
      generatedAt: new Date().toISOString(),
      windowDays,
      sampledEventCount: values.length,
      summary: {
        proposals: proposals.length,
        accepted: accepted.length,
        createdStudySessions: accepted.filter(
          (event) => event.value.resultKind === 'CREATED_STUDY_SESSION',
        ).length,
        openedRoutes: accepted.filter(
          (event) => event.value.resultKind === 'OPEN_ROUTE',
        ).length,
        noProposal: accepted.filter(
          (event) => event.value.resultKind === 'NO_PROPOSAL',
        ).length,
        clarifications: values.filter(
          (event) => event.value.clarificationRequired,
        ).length,
        guardBlocked: guardBlocked.length,
      },
      modes: this.bucket(values.map((event) => event.value.mode)),
      availability: this.bucket(
        values.map((event) => event.value.availabilityStatus),
      ),
      actions: this.bucket(values.map((event) => event.value.actionKind)),
      guardrails: this.bucket(
        guardBlocked.map((event) =>
          [event.value.guardAction, event.value.guardReason]
            .filter((part): part is string => Boolean(part))
            .join(':'),
        ),
      ),
      aiRouting: this.bucket(
        values.map((event) =>
          event.value.aiRoute.skippedReason
            ? `${event.value.aiRoute.status}:${event.value.aiRoute.skippedReason}`
            : event.value.aiRoute.failureCode
              ? `${event.value.aiRoute.status}:${event.value.aiRoute.failureCode}`
              : event.value.aiRoute.status,
        ),
      ),
      topSubjects: this.bucket(values.map((event) => event.value.subjectCode)),
      topTopics: this.bucket(values.flatMap((event) => event.value.topicCodes)),
      missingContentSignals: this.buildMissingContentSignals(values),
    };
  }

  private buildMissingContentSignals(
    values: Array<{ value: StudyCommandEventValue; occurredAt: Date }>,
  ) {
    const grouped = new Map<
      string,
      {
        mode: StudyCommandEventValue['mode'];
        subjectCode: string | null;
        topicCodes: string[];
        count: number;
        lastSeenAt: Date;
      }
    >();

    for (const event of values) {
      if (event.value.availabilityStatus !== 'NEEDS_CONTENT') {
        continue;
      }

      const topicKey = event.value.topicCodes.join(',');
      const key = [
        event.value.mode ?? 'unknown',
        event.value.subjectCode ?? 'unknown',
        topicKey || 'no-topic',
      ].join('|');
      const current = grouped.get(key);

      if (!current) {
        grouped.set(key, {
          mode: event.value.mode,
          subjectCode: event.value.subjectCode,
          topicCodes: event.value.topicCodes,
          count: 1,
          lastSeenAt: event.occurredAt,
        });
        continue;
      }

      current.count += 1;

      if (event.occurredAt > current.lastSeenAt) {
        current.lastSeenAt = event.occurredAt;
      }
    }

    return Array.from(grouped.entries())
      .map(([key, signal]) => ({
        key,
        mode: signal.mode,
        subjectCode: signal.subjectCode,
        topicCodes: signal.topicCodes,
        count: signal.count,
        lastSeenAt: signal.lastSeenAt.toISOString(),
      }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return right.lastSeenAt.localeCompare(left.lastSeenAt);
      })
      .slice(0, 10);
  }

  private bucket(values: Array<string | null>) {
    const counts = new Map<string, number>();

    for (const value of values) {
      if (!value) {
        continue;
      }

      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        count,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.key.localeCompare(right.key);
      })
      .slice(0, 10);
  }

  private toStudyCommandEventValue(
    value: Prisma.JsonValue,
  ): StudyCommandEventValue | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const candidate = value as Record<string, unknown>;

    if (
      candidate.version !== 1 ||
      (candidate.kind !== 'PROPOSED' &&
        candidate.kind !== 'ACCEPTED' &&
        candidate.kind !== 'GUARD_BLOCKED')
    ) {
      return null;
    }

    return {
      version: 1,
      kind: candidate.kind,
      commandLength:
        typeof candidate.commandLength === 'number'
          ? candidate.commandLength
          : 0,
      commandFingerprint:
        typeof candidate.commandFingerprint === 'string'
          ? candidate.commandFingerprint
          : null,
      mode: this.isStudyCommandEventMode(candidate.mode)
        ? candidate.mode
        : null,
      title: typeof candidate.title === 'string' ? candidate.title : null,
      primaryHref:
        typeof candidate.primaryHref === 'string'
          ? candidate.primaryHref
          : null,
      resultHref:
        typeof candidate.resultHref === 'string' ? candidate.resultHref : null,
      subjectCode:
        typeof candidate.subjectCode === 'string'
          ? candidate.subjectCode
          : null,
      topicCodes: Array.isArray(candidate.topicCodes)
        ? candidate.topicCodes.filter(
            (item): item is string => typeof item === 'string',
          )
        : [],
      availabilityStatus:
        candidate.availabilityStatus === 'READY' ||
        candidate.availabilityStatus === 'NEEDS_CONTENT' ||
        candidate.availabilityStatus === 'UNAVAILABLE'
          ? candidate.availabilityStatus
          : null,
      matchingExerciseCount:
        typeof candidate.matchingExerciseCount === 'number'
          ? candidate.matchingExerciseCount
          : null,
      actionKind:
        candidate.actionKind === 'CREATE_STUDY_SESSION' ||
        candidate.actionKind === 'OPEN_ROUTE'
          ? candidate.actionKind
          : null,
      resultKind:
        candidate.resultKind === 'CREATED_STUDY_SESSION' ||
        candidate.resultKind === 'OPEN_ROUTE' ||
        candidate.resultKind === 'NO_PROPOSAL'
          ? candidate.resultKind
          : null,
      guardAction:
        candidate.guardAction === 'propose' ||
        candidate.guardAction === 'accept'
          ? candidate.guardAction
          : null,
      guardReason:
        typeof candidate.guardReason === 'string'
          ? candidate.guardReason
          : null,
      clarificationRequired: candidate.clarificationRequired === true,
      aiRoute: this.toStoredAiRouteTelemetry(candidate.aiRoute),
    };
  }

  private toStoredAiRouteTelemetry(
    value: unknown,
  ): StudyCommandAiRouteTelemetry {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return this.toAiRouteTelemetry(null);
    }

    const candidate = value as Record<string, unknown>;
    const status =
      candidate.status === 'SKIPPED' ||
      candidate.status === 'SUCCESS' ||
      candidate.status === 'FAILED' ||
      candidate.status === 'SERVICE_ERROR' ||
      candidate.status === 'NOT_ATTEMPTED'
        ? candidate.status
        : 'NOT_ATTEMPTED';

    return {
      status,
      provider:
        typeof candidate.provider === 'string' ? candidate.provider : null,
      model: typeof candidate.model === 'string' ? candidate.model : null,
      skippedReason:
        typeof candidate.skippedReason === 'string'
          ? candidate.skippedReason
          : null,
      failureCode:
        typeof candidate.failureCode === 'string'
          ? candidate.failureCode
          : null,
      confidence:
        typeof candidate.confidence === 'number' ? candidate.confidence : null,
    };
  }

  private hashCommand(command: string) {
    return createHash('sha256')
      .update(command.trim().toLocaleLowerCase())
      .digest('hex');
  }

  private isStudyCommandEventMode(
    value: unknown,
  ): value is StudyCommandProposal['mode'] {
    return typeof value === 'string' && STUDY_COMMAND_EVENT_MODES.has(value);
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private async safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
    try {
      return await promise;
    } catch {
      return fallback;
    }
  }
}
