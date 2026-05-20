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

  return {
    studyService,
    studyCommandAiRouterService,
    service: new StudyCommandService(
      prisma as never,
      studyService as never,
      studyReviewService as never,
      studyCurriculumJourneyService as never,
      studyWeakPointService as never,
      flashcardsService as never,
      labService as never,
      studyCommandAiRouterService as never,
    ),
  };
}

describe('StudyCommandService', () => {
  it('marks create-session proposals ready only after real preview availability', async () => {
    const { service, studyService } = createService({
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
    expect(response.proposal?.availability).toEqual({
      status: 'READY',
      matchingExerciseCount: 2,
    });
    expect(response.proposal?.primaryAction.kind).toBe('CREATE_STUDY_SESSION');
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
    const { service, studyService } = createService({
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
});
