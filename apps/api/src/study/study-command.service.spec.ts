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

  return {
    studyService,
    service: new StudyCommandService(
      prisma as never,
      studyService as never,
      studyReviewService as never,
      studyCurriculumJourneyService as never,
      studyWeakPointService as never,
      flashcardsService as never,
      labService as never,
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
});
