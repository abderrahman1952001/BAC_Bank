import { HttpException, HttpStatus } from '@nestjs/common';
import { StudyCommandBrainService } from './study-command-brain.service';
import { StudyCommandService } from './study-command.service';

const filters = {
  streams: [
    {
      code: 'SE',
      name: 'علوم تجريبية',
      isDefault: true,
      subjectCodes: ['NATURAL_SCIENCES'],
    },
  ],
  subjects: [
    {
      code: 'NATURAL_SCIENCES',
      name: 'علوم الطبيعة والحياة',
      isDefault: true,
      streams: [
        {
          code: 'SE',
          name: 'علوم تجريبية',
        },
      ],
      streamCodes: ['SE'],
    },
  ],
  years: [2026, 2025, 2024],
  topics: [
    {
      code: 'PHOTOSYNTHESIS',
      name: 'التركيب الضوئي',
      slug: 'photosynthesis',
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: 'NATURAL_SCIENCES',
        name: 'علوم الطبيعة والحياة',
      },
      streamCodes: ['SE'],
    },
  ],
  sessionTypes: ['NORMAL', 'MAKEUP'],
};

const catalog = {
  streams: [
    {
      code: 'SE',
      name: 'علوم تجريبية',
      subjects: [
        {
          code: 'NATURAL_SCIENCES',
          name: 'علوم الطبيعة والحياة',
          years: [
            {
              year: 2026,
              sujets: [
                {
                  examId: 'exam-1',
                  sujetNumber: 1,
                  label: 'الموضوع الأول',
                  sessionType: 'NORMAL',
                  exerciseCount: 3,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function createService(input?: {
  matchingExerciseCount?: number;
  previewRejects?: boolean;
  aiInterpretation?: unknown;
  usageGuardRejects?: boolean;
  startState?:
    | { allowed: true }
    | { allowed: false; reason: 'QUOTA_EXHAUSTED'; message: string };
}) {
  const matchingExerciseCount = input?.matchingExerciseCount ?? 2;
  const studyService = {
    listRecentStudySessions: jest.fn().mockResolvedValue({ data: [] }),
    listRecentExamActivities: jest.fn().mockResolvedValue({ data: [] }),
    getFilters: jest.fn().mockResolvedValue(filters),
    getCatalog: jest.fn().mockResolvedValue(catalog),
    previewStudySession: input?.previewRejects
      ? jest.fn().mockRejectedValue(new Error('preview failed'))
      : jest.fn().mockResolvedValue({
          matchingExerciseCount,
        }),
    getStudySessionStartState: jest
      .fn()
      .mockResolvedValue(input?.startState ?? { allowed: true }),
    createStudySession: jest.fn().mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
    }),
  };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        stream: {
          code: 'SE',
        },
      }),
    },
    studentLearningEvent: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const studyReviewService = {
    listMyMistakes: jest.fn().mockResolvedValue({ data: [] }),
  };
  const studyCurriculumJourneyService = {
    listCurriculumJourneys: jest.fn().mockResolvedValue({ data: [] }),
  };
  const studyWeakPointService = {
    listWeakPointInsights: jest.fn().mockResolvedValue({ data: [] }),
  };
  const flashcardsService = {
    listDueCards: jest.fn().mockResolvedValue({ data: [] }),
  };
  const labService = {
    listTools: jest.fn().mockResolvedValue({ data: [] }),
  };
  const studyCommandAiRouterService = {
    interpret: jest.fn().mockResolvedValue({
      interpretation: input?.aiInterpretation ?? null,
      usageEvent: null,
    }),
  };
  const studyCommandBrainService = new StudyCommandBrainService(
    prisma as never,
  );
  const studyCommandUsageGuardService = {
    consume: input?.usageGuardRejects
      ? jest.fn().mockRejectedValue(
          new HttpException(
            {
              message: 'rate limited',
              code: 'STUDY_COMMAND_RATE_LIMITED',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          ),
        )
      : jest.fn().mockResolvedValue(undefined),
  };

  return {
    prisma,
    studyService,
    studyCommandAiRouterService,
    studyCommandUsageGuardService,
    service: new StudyCommandService(
      prisma as never,
      studyService as never,
      studyReviewService as never,
      studyCurriculumJourneyService as never,
      studyWeakPointService as never,
      flashcardsService as never,
      labService as never,
      studyCommandAiRouterService as never,
      studyCommandBrainService,
      studyCommandUsageGuardService as never,
    ),
  };
}

describe('StudyCommandService', () => {
  it('marks create-session proposals ready only after real preview availability', async () => {
    const { service, studyService, studyCommandUsageGuardService } =
      createService({
        matchingExerciseCount: 2,
      });

    const response = await service.propose(
      'user-1',
      'أريد تدريب BAC في علوم الطبيعة على التركيب الضوئي آخر 3 سنوات',
    );

    expect(studyService.previewStudySession).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        subjectCode: 'NATURAL_SCIENCES',
        kind: 'TOPIC_DRILL',
        topicCodes: ['PHOTOSYNTHESIS'],
      }),
    );
    expect(studyCommandUsageGuardService.consume).toHaveBeenCalledWith(
      'user-1',
      'propose',
    );
    expect(response.proposal?.availability).toEqual({
      status: 'READY',
      matchingExerciseCount: 2,
    });
    expect(response.proposal?.primaryAction.kind).toBe('CREATE_STUDY_SESSION');
  });

  it('checks usage limits before proposal composition work', async () => {
    const { service, studyService, studyCommandAiRouterService, prisma } =
      createService({
        usageGuardRejects: true,
      });

    await expect(
      service.propose('user-1', 'أريد تدريب BAC'),
    ).rejects.toBeInstanceOf(HttpException);

    expect(studyCommandAiRouterService.interpret).not.toHaveBeenCalled();
    expect(studyService.previewStudySession).not.toHaveBeenCalled();
    expect(prisma.studentLearningEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        eventType: 'STUDY_COMMAND_GUARD_BLOCKED',
        sourceType: 'STUDY_COMMAND',
        sourceId: null,
        value: expect.objectContaining({
          version: 1,
          kind: 'GUARD_BLOCKED',
          guardAction: 'propose',
          guardReason: 'RATE_LIMITED',
          commandFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    });
  });

  it('records proposal telemetry without storing the raw command', async () => {
    const { service, prisma } = createService({
      matchingExerciseCount: 2,
    });

    await service.propose(
      'user-1',
      'أريد تدريب BAC في علوم الطبيعة على التركيب الضوئي',
    );

    expect(prisma.studentLearningEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        eventType: 'STUDY_COMMAND_PROPOSED',
        sourceType: 'STUDY_COMMAND',
        sourceId: null,
        value: expect.objectContaining({
          version: 1,
          kind: 'PROPOSED',
          mode: 'BAC_TRAINING',
          primaryHref:
            '/student/training/drill?subject=NATURAL_SCIENCES&topic=PHOTOSYNTHESIS',
          resultHref: null,
          subjectCode: 'NATURAL_SCIENCES',
          topicCodes: ['PHOTOSYNTHESIS'],
          availabilityStatus: 'READY',
          actionKind: 'CREATE_STUDY_SESSION',
          resultKind: null,
          clarificationRequired: false,
          commandLength: expect.any(Number),
          commandFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    });
    expect(
      JSON.stringify(
        prisma.studentLearningEvent.create.mock.calls[0][0].data.value,
      ),
    ).not.toContain('أريد تدريب BAC');
  });

  it('uses validated AI interpretation as hints before deterministic proposal composition', async () => {
    const { service, studyService, studyCommandAiRouterService } =
      createService({
        matchingExerciseCount: 2,
        aiInterpretation: {
          mode: 'TUTOR_REPLAY',
          confidence: 0.9,
          subjectHint: 'svt علوم الطبيعة',
          topicHint: 'التركيب الضوئي',
          deadline: null,
          durationMinutes: 30,
          language: 'MIXED',
          missingFields: [],
          studentFacingSummary: 'حصة دعم تحتاج تثبيتاً.',
        },
      });

    const response = await service.propose(
      'user-1',
      'خرجت من cours ta3 prof و نحتاج نفس الستايل',
    );

    expect(studyCommandAiRouterService.interpret).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        command: 'خرجت من cours ta3 prof و نحتاج نفس الستايل',
      }),
    );
    expect(studyService.previewStudySession).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        subjectCode: 'NATURAL_SCIENCES',
        kind: 'TOPIC_DRILL',
        topicCodes: ['PHOTOSYNTHESIS'],
        exerciseCount: 3,
      }),
    );
    expect(response.proposal).toMatchObject({
      mode: 'TUTOR_REPLAY',
      estimatedMinutes: 30,
      availability: {
        status: 'READY',
      },
    });
  });

  it('does not widen unavailable topic proposals after preview returns zero matches', async () => {
    const { service } = createService({
      matchingExerciseCount: 0,
    });

    const response = await service.propose(
      'user-1',
      'أريد تدريب BAC في علوم الطبيعة على التركيب الضوئي',
    );

    expect(response.proposal?.availability).toMatchObject({
      status: 'NEEDS_CONTENT',
      matchingExerciseCount: 0,
    });
    expect(response.proposal?.primaryAction).toMatchObject({
      kind: 'OPEN_ROUTE',
      href: '/student/training/drill?subject=NATURAL_SCIENCES&topic=PHOTOSYNTHESIS',
    });
  });

  it('marks content-ready drill proposals unavailable when quota is exhausted', async () => {
    const { service, studyService } = createService({
      matchingExerciseCount: 2,
      startState: {
        allowed: false,
        reason: 'QUOTA_EXHAUSTED',
        message: 'Your monthly drill session quota is exhausted until reset.',
      },
    });

    const response = await service.propose(
      'user-1',
      'أريد تدريب BAC في علوم الطبيعة على التركيب الضوئي',
    );

    expect(studyService.getStudySessionStartState).toHaveBeenCalledWith(
      'user-1',
      {
        family: 'DRILL',
        kind: 'TOPIC_DRILL',
      },
    );
    expect(response.proposal).toMatchObject({
      availability: {
        status: 'UNAVAILABLE',
        matchingExerciseCount: 2,
        message: expect.stringContaining('quota is exhausted'),
      },
      primaryHref: '/student/billing',
      primaryLabel: 'فتح الاشتراك',
      primaryAction: {
        kind: 'OPEN_ROUTE',
        href: '/student/billing',
      },
    });
  });

  it('fails closed when preview cannot confirm availability', async () => {
    const { service } = createService({
      previewRejects: true,
    });

    const response = await service.propose(
      'user-1',
      'أريد تدريب BAC في علوم الطبيعة على التركيب الضوئي',
    );

    expect(response.proposal?.availability?.status).toBe('UNAVAILABLE');
    expect(response.proposal?.primaryAction.kind).toBe('OPEN_ROUTE');
  });

  it('accepts a ready command by creating the server-owned study session', async () => {
    const { service, studyService, prisma } = createService({
      matchingExerciseCount: 2,
    });

    const response = await service.accept(
      'user-1',
      'أريد تدريب BAC في علوم الطبيعة على التركيب الضوئي آخر 3 سنوات',
    );

    expect(studyService.previewStudySession).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        subjectCode: 'NATURAL_SCIENCES',
        topicCodes: ['PHOTOSYNTHESIS'],
      }),
    );
    expect(studyService.createStudySession).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        subjectCode: 'NATURAL_SCIENCES',
        topicCodes: ['PHOTOSYNTHESIS'],
      }),
    );
    expect(response).toMatchObject({
      kind: 'CREATED_STUDY_SESSION',
      sessionId: '11111111-1111-4111-8111-111111111111',
      href: '/student/training/11111111-1111-4111-8111-111111111111',
      proposal: {
        availability: {
          status: 'READY',
          matchingExerciseCount: 2,
        },
      },
    });
    expect(prisma.studentLearningEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'STUDY_COMMAND_ACCEPTED',
        sourceType: 'STUDY_COMMAND',
        sourceId: '11111111-1111-4111-8111-111111111111',
        value: expect.objectContaining({
          kind: 'ACCEPTED',
          resultKind: 'CREATED_STUDY_SESSION',
          resultHref: '/student/training/11111111-1111-4111-8111-111111111111',
          availabilityStatus: 'READY',
        }),
      }),
    });
  });

  it('accepts missing-content commands by opening the builder instead of creating', async () => {
    const { service, studyService } = createService({
      matchingExerciseCount: 0,
    });

    const response = await service.accept(
      'user-1',
      'أريد تدريب BAC في علوم الطبيعة على التركيب الضوئي',
    );

    expect(studyService.createStudySession).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      kind: 'OPEN_ROUTE',
      href: '/student/training/drill?subject=NATURAL_SCIENCES&topic=PHOTOSYNTHESIS',
      proposal: {
        availability: {
          status: 'NEEDS_CONTENT',
          matchingExerciseCount: 0,
        },
      },
    });
  });

  it('accepts secondary surface commands by opening their typed route', async () => {
    const { service, studyService } = createService();

    const response = await service.accept(
      'user-1',
      'راجعلي تعريفات علوم الطبيعة',
    );

    expect(studyService.createStudySession).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      kind: 'OPEN_ROUTE',
      href: '/student/flashcards?subject=NATURAL_SCIENCES',
      proposal: {
        mode: 'MEMORIZATION_REVIEW',
      },
    });
  });

  it('returns a no-proposal result for empty accepted commands', async () => {
    const { service, studyService } = createService();

    const response = await service.accept('user-1', '   ');

    expect(studyService.previewStudySession).not.toHaveBeenCalled();
    expect(studyService.createStudySession).not.toHaveBeenCalled();
    expect(response).toEqual({
      kind: 'NO_PROPOSAL',
      message: 'اكتب ما تريد دراسته الآن حتى نحوله إلى جلسة واضحة.',
    });
  });

  it('lists safe Study Command history from learning events', async () => {
    const { service, prisma } = createService();
    prisma.studentLearningEvent.findMany.mockResolvedValue([
      {
        id: 'event-1',
        eventType: 'STUDY_COMMAND_PROPOSED',
        occurredAt: new Date('2026-05-20T08:00:00.000Z'),
        value: {
          version: 1,
          kind: 'PROPOSED',
          commandLength: 24,
          commandFingerprint: 'a'.repeat(64),
          mode: 'BAC_TRAINING',
          title: 'تدريب BAC علوم الطبيعة والحياة',
          primaryHref:
            '/student/training/drill?subject=NATURAL_SCIENCES&topic=PHOTOSYNTHESIS',
          resultHref: null,
          subjectCode: 'NATURAL_SCIENCES',
          topicCodes: ['PHOTOSYNTHESIS'],
          availabilityStatus: 'NEEDS_CONTENT',
          matchingExerciseCount: 0,
          actionKind: 'OPEN_ROUTE',
          resultKind: null,
          clarificationRequired: false,
          aiRoute: {
            status: 'SKIPPED',
            provider: null,
            model: null,
            skippedReason: 'DISABLED',
            failureCode: null,
            confidence: null,
          },
        },
      },
    ]);

    await expect(service.listHistory('user-1')).resolves.toEqual({
      data: [
        {
          id: 'event-1',
          kind: 'PROPOSED',
          occurredAt: '2026-05-20T08:00:00.000Z',
          mode: 'BAC_TRAINING',
          title: 'تدريب BAC علوم الطبيعة والحياة',
          href: '/student/training/drill?subject=NATURAL_SCIENCES&topic=PHOTOSYNTHESIS',
          subjectCode: 'NATURAL_SCIENCES',
          topicCodes: ['PHOTOSYNTHESIS'],
          availabilityStatus: 'NEEDS_CONTENT',
          matchingExerciseCount: 0,
          actionKind: 'OPEN_ROUTE',
          resultKind: null,
          clarificationRequired: false,
          aiRoute: {
            status: 'SKIPPED',
            provider: null,
            model: null,
            skippedReason: 'DISABLED',
            failureCode: null,
            confidence: null,
          },
        },
      ],
    });
  });

  it('builds internal diagnostics for routing quality and missing-content signals', async () => {
    const { service, prisma } = createService();
    prisma.studentLearningEvent.findMany.mockResolvedValue([
      {
        id: 'event-1',
        eventType: 'STUDY_COMMAND_PROPOSED',
        occurredAt: new Date('2026-05-20T08:00:00.000Z'),
        value: {
          version: 1,
          kind: 'PROPOSED',
          commandLength: 24,
          commandFingerprint: 'a'.repeat(64),
          mode: 'BAC_TRAINING',
          title: 'تدريب BAC علوم الطبيعة والحياة',
          subjectCode: 'NATURAL_SCIENCES',
          topicCodes: ['PHOTOSYNTHESIS'],
          availabilityStatus: 'NEEDS_CONTENT',
          matchingExerciseCount: 0,
          actionKind: 'OPEN_ROUTE',
          resultKind: null,
          clarificationRequired: false,
          aiRoute: {
            status: 'SKIPPED',
            provider: null,
            model: null,
            skippedReason: 'DISABLED',
            failureCode: null,
            confidence: null,
          },
        },
      },
      {
        id: 'event-2',
        eventType: 'STUDY_COMMAND_ACCEPTED',
        occurredAt: new Date('2026-05-20T08:01:00.000Z'),
        value: {
          version: 1,
          kind: 'ACCEPTED',
          commandLength: 24,
          commandFingerprint: 'b'.repeat(64),
          mode: 'BAC_TRAINING',
          title: 'تدريب BAC علوم الطبيعة والحياة',
          subjectCode: 'NATURAL_SCIENCES',
          topicCodes: ['PHOTOSYNTHESIS'],
          availabilityStatus: 'READY',
          matchingExerciseCount: 2,
          actionKind: 'CREATE_STUDY_SESSION',
          resultKind: 'CREATED_STUDY_SESSION',
          clarificationRequired: false,
          aiRoute: {
            status: 'SUCCESS',
            provider: 'openai',
            model: 'router-model',
            skippedReason: null,
            failureCode: null,
            confidence: 0.88,
          },
        },
      },
      {
        id: 'event-3',
        eventType: 'STUDY_COMMAND_GUARD_BLOCKED',
        occurredAt: new Date('2026-05-20T08:02:00.000Z'),
        value: {
          version: 1,
          kind: 'GUARD_BLOCKED',
          commandLength: 24,
          commandFingerprint: 'c'.repeat(64),
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
          guardAction: 'accept',
          guardReason: 'RATE_LIMITED',
          clarificationRequired: false,
          aiRoute: {
            status: 'NOT_ATTEMPTED',
            provider: null,
            model: null,
            skippedReason: null,
            failureCode: null,
            confidence: null,
          },
        },
      },
    ]);

    const diagnostics = await service.getDiagnostics();

    expect(diagnostics).toMatchObject({
      windowDays: 30,
      sampledEventCount: 3,
      summary: {
        proposals: 1,
        accepted: 1,
        createdStudySessions: 1,
        openedRoutes: 0,
        noProposal: 0,
        clarifications: 0,
        guardBlocked: 1,
      },
      modes: [
        {
          key: 'BAC_TRAINING',
          count: 2,
        },
      ],
      missingContentSignals: [
        {
          key: 'BAC_TRAINING|NATURAL_SCIENCES|PHOTOSYNTHESIS',
          mode: 'BAC_TRAINING',
          subjectCode: 'NATURAL_SCIENCES',
          topicCodes: ['PHOTOSYNTHESIS'],
          count: 1,
          lastSeenAt: '2026-05-20T08:00:00.000Z',
        },
      ],
    });
    expect(diagnostics.guardrails).toEqual([
      {
        key: 'accept:RATE_LIMITED',
        count: 1,
      },
    ]);
    expect(diagnostics.aiRouting).toEqual(
      expect.arrayContaining([
        {
          key: 'SKIPPED:DISABLED',
          count: 1,
        },
        {
          key: 'SUCCESS',
          count: 1,
        },
        {
          key: 'NOT_ATTEMPTED',
          count: 1,
        },
      ]),
    );
  });
});
