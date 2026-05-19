import type { DueFlashcardsResponse } from '@bac-bank/contracts/flashcards';
import type { LabToolsResponse } from '@bac-bank/contracts/lab';
import type {
  CatalogResponse,
  CurriculumJourneysResponse,
  FiltersResponse,
  MyMistakesResponse,
  RecentExamActivitiesResponse,
  RecentStudySessionsResponse,
  WeakPointInsightsResponse,
} from '@bac-bank/contracts/study';
import {
  buildStudyCommandProposal,
  buildStudyCommandStarters,
  inferStudyCommandMode,
  markStudyCommandProposalUnavailable,
  markStudyCommandProposalNeedsContent,
  type StudyCommandContext,
} from './study-command-engine';
import { studyCommandEvalFixtures } from './study-command-eval-fixtures';

const sessions = [
  {
    id: 'session-1',
    title: 'دوال قصيرة',
    family: 'DRILL',
    kind: 'TOPIC_DRILL',
    status: 'IN_PROGRESS',
    sourceExamId: null,
    requestedExerciseCount: 8,
    exerciseCount: 6,
    durationMinutes: null,
    startedAt: '2026-05-01T08:00:00.000Z',
    deadlineAt: null,
    completedAt: null,
    lastInteractedAt: '2026-05-01T08:20:00.000Z',
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:20:00.000Z',
    progressSummary: null,
  },
] satisfies RecentStudySessionsResponse['data'];

const myMistakes = [
  {
    exerciseNodeId: 'exercise-1',
    focusQuestionId: null,
    focusQuestionLabel: null,
    reasons: ['MISSED'],
    questionSignalCount: 1,
    flagged: false,
    dueAt: '2026-05-01T09:00:00.000Z',
    successStreak: 0,
    lastReviewedAt: null,
    lastReviewOutcome: null,
    isDue: true,
    updatedAt: '2026-05-01T09:00:00.000Z',
    exercise: {
      id: 'exercise-row-1',
      orderIndex: 1,
      title: null,
    },
    exam: {
      id: 'exam-1',
      year: 2025,
      sessionType: 'NORMAL',
      stream: {
        code: 'SE',
        name: 'علوم تجريبية',
      },
      subject: {
        code: 'PHYS',
        name: 'فيزياء',
      },
      sujetNumber: 1,
      sujetLabel: 'الموضوع الأول',
    },
  },
] satisfies MyMistakesResponse['data'];

const dueFlashcards = [
  {
    card: {
      id: 'card-1',
      type: 'FRONT_BACK',
      sourceType: 'PLATFORM',
      front: 'تعريف البروتين',
      back: 'جزيء حيوي...',
      data: null,
      subject: {
        code: 'SVT',
        name: 'علوم الطبيعة والحياة',
      },
      curriculumNode: null,
      learningTarget: null,
      courseLesson: null,
      courseStep: null,
      examNode: null,
      deckIds: ['deck-1'],
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
    },
    state: {
      dueAt: '2026-05-01T08:00:00.000Z',
      intervalDays: 1,
      easeFactor: 2.5,
      reviewCount: 0,
      lapseCount: 0,
      lastReviewedAt: null,
    },
  },
] satisfies DueFlashcardsResponse['data'];

const weakPointInsights = [
  {
    subject: {
      code: 'MATH',
      name: 'رياضيات',
    },
    recommendedTopicCodes: ['FUNC'],
    totalWeaknessScore: 9,
    weakSignalCount: 3,
    flaggedExerciseCount: 0,
    lastSeenAt: '2026-05-01T08:00:00.000Z',
    topLearningTargets: [],
    topTopics: [
      {
        code: 'FUNC',
        name: 'الدوال',
        weaknessScore: 9,
        weakSignalCount: 3,
        lastSeenAt: '2026-05-01T08:00:00.000Z',
        signalCounts: {
          missed: 2,
          hard: 1,
          skipped: 0,
          revealed: 0,
          flagged: 0,
        },
        topLearningTargets: [],
      },
    ],
  },
] satisfies WeakPointInsightsResponse['data'];

const labTools = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'function-explorer',
    title: 'مختبر الدوال',
    description: 'استكشف الدوال بيانياً.',
    status: 'READY',
    metadata: null,
    subject: {
      code: 'MATHEMATICS',
      name: 'الرياضيات',
    },
    missionCount: 2,
    completedMissionCount: 0,
    inProgressMissionCount: 0,
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z',
  },
] satisfies LabToolsResponse['data'];

const filters = {
  streams: [
    {
      code: 'SE',
      name: 'علوم تجريبية',
      isDefault: true,
      subjectCodes: ['MATHEMATICS', 'PHYSICS', 'NATURAL_SCIENCES'],
    },
  ],
  subjects: [
    {
      code: 'MATHEMATICS',
      name: 'الرياضيات',
      isDefault: true,
      streams: [
        {
          code: 'SE',
          name: 'علوم تجريبية',
        },
      ],
      streamCodes: ['SE'],
    },
    {
      code: 'PHYSICS',
      name: 'العلوم الفيزيائية',
      streams: [
        {
          code: 'SE',
          name: 'علوم تجريبية',
        },
      ],
      streamCodes: ['SE'],
    },
    {
      code: 'NATURAL_SCIENCES',
      name: 'علوم الطبيعة والحياة',
      streams: [
        {
          code: 'SE',
          name: 'علوم تجريبية',
        },
      ],
      streamCodes: ['SE'],
    },
  ],
  years: [2025, 2024, 2023],
  topics: [
    {
      code: 'FUNCTIONS',
      name: 'الدوال',
      slug: 'functions',
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: 'MATHEMATICS',
        name: 'الرياضيات',
      },
      streamCodes: ['SE'],
    },
    {
      code: 'ELECTRICITY',
      name: 'الكهرباء',
      slug: 'electricity',
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: 'PHYSICS',
        name: 'العلوم الفيزيائية',
      },
      streamCodes: ['SE'],
    },
    {
      code: 'PROTEINS',
      name: 'البروتينات',
      slug: 'proteins',
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: 'NATURAL_SCIENCES',
        name: 'علوم الطبيعة والحياة',
      },
      streamCodes: ['SE'],
    },
    {
      code: 'PROTEIN_SYNTHESIS',
      name: 'تركيب البروتين',
      slug: 'protein-synthesis',
      parentCode: 'PROTEINS',
      displayOrder: 2,
      isSelectable: true,
      subject: {
        code: 'NATURAL_SCIENCES',
        name: 'علوم الطبيعة والحياة',
      },
      streamCodes: ['SE'],
    },
    {
      code: 'PHOTOSYNTHESIS',
      name: 'التركيب الضوئي',
      slug: 'photosynthesis',
      parentCode: null,
      displayOrder: 3,
      isSelectable: true,
      subject: {
        code: 'NATURAL_SCIENCES',
        name: 'علوم الطبيعة والحياة',
      },
      streamCodes: ['SE'],
    },
    {
      code: 'IMMUNITY',
      name: 'المناعة',
      slug: 'immunity',
      parentCode: null,
      displayOrder: 4,
      isSelectable: true,
      subject: {
        code: 'NATURAL_SCIENCES',
        name: 'علوم الطبيعة والحياة',
      },
      streamCodes: ['SE'],
    },
    {
      code: 'ORGANIC_CHEMISTRY',
      name: 'الكيمياء العضوية',
      slug: 'organic-chemistry',
      parentCode: null,
      displayOrder: 5,
      isSelectable: true,
      subject: {
        code: 'PHYSICS',
        name: 'العلوم الفيزيائية',
      },
      streamCodes: ['SE'],
    },
  ],
  sessionTypes: ['NORMAL', 'MAKEUP'],
} satisfies FiltersResponse;

const catalog = {
  streams: [
    {
      code: 'SE',
      name: 'علوم تجريبية',
      subjects: [
        {
          code: 'MATHEMATICS',
          name: 'الرياضيات',
          years: [
            {
              year: 2025,
              sujets: [],
            },
          ],
        },
        {
          code: 'PHYSICS',
          name: 'العلوم الفيزيائية',
          years: [
            {
              year: 2025,
              sujets: [],
            },
          ],
        },
        {
          code: 'NATURAL_SCIENCES',
          name: 'علوم الطبيعة والحياة',
          years: [
            {
              year: 2025,
              sujets: [],
            },
          ],
        },
      ],
    },
  ],
} satisfies CatalogResponse;

const svtOnlyCatalog = {
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
              year: 2025,
              sujets: [],
            },
          ],
        },
      ],
    },
  ],
} satisfies CatalogResponse;

const context: StudyCommandContext = {
  sessions,
  recentExamActivities: [] satisfies RecentExamActivitiesResponse['data'],
  myMistakes,
  curriculumJourneys: [] satisfies CurriculumJourneysResponse['data'],
  weakPointInsights,
  dueFlashcards,
  labTools: [] satisfies LabToolsResponse['data'],
  filters,
  catalog,
  userStreamCode: 'SE',
};

const emptyContext: StudyCommandContext = {
  sessions: [],
  recentExamActivities: [],
  myMistakes: [],
  curriculumJourneys: [],
  weakPointInsights: [],
  dueFlashcards: [],
  labTools: [],
  filters,
  catalog,
  userStreamCode: 'SE',
};

describe('study command', () => {
  it('builds smart starters from real context', () => {
    const starters = buildStudyCommandStarters(context);

    expect(starters[0]).toMatchObject({
      title: 'واصل دوال قصيرة',
      mode: 'CONTINUE_SESSION',
    });
    expect(starters.some((starter) => starter.id === 'due-flashcards')).toBe(
      true,
    );
    expect(starters.some((starter) => starter.id.startsWith('mistake:'))).toBe(
      true,
    );
  });

  it('does not invent generic starters when the student has no useful context', () => {
    expect(
      buildStudyCommandStarters({
        sessions: [],
        recentExamActivities: [],
        myMistakes: [],
        curriculumJourneys: [],
        weakPointInsights: [],
        dueFlashcards: [],
        labTools: [],
        filters: null,
        catalog: null,
        userStreamCode: null,
      }),
    ).toEqual([]);
  });

  it('routes messy school-test language to school test prep', () => {
    expect(
      inferStudyCommandMode('عندي فرض في الفيزياء غدوة على الكهرباء', context),
    ).toBe('SCHOOL_TEST_PREP');
  });

  it('creates a proposal for a school test command', () => {
    const proposal = buildStudyCommandProposal(
      'عندي فرض في الفيزياء غدوة على الكهرباء',
      context,
    );

    expect(proposal).toMatchObject({
      mode: 'SCHOOL_TEST_PREP',
      estimatedMinutes: 35,
      primaryLabel: 'بدء الجلسة',
    });
    expect(proposal?.title).toContain('العلوم الفيزيائية');
    expect(proposal?.title).toContain('غداً');
    expect(proposal?.primaryHref).toContain('/student/training/drill');
    expect(proposal?.primaryAction).toMatchObject({
      kind: 'CREATE_STUDY_SESSION',
      request: {
        subjectCode: 'PHYSICS',
        kind: 'TOPIC_DRILL',
        topicCodes: ['ELECTRICITY'],
        streamCodes: ['SE'],
        years: [2025, 2024, 2023],
        sessionTypes: ['NORMAL', 'MAKEUP'],
        exerciseCount: 3,
        timingEnabled: false,
      },
    });
  });

  it('asks one clarification when a drill command is missing the subject', () => {
    const proposal = buildStudyCommandProposal('أريد تدريب BAC آخر 3 سنوات', {
      sessions: [],
      recentExamActivities: [],
      myMistakes: [],
      curriculumJourneys: [],
      weakPointInsights: [],
      dueFlashcards: [],
      labTools: [],
      filters,
      catalog,
      userStreamCode: 'SE',
    });

    expect(proposal).toMatchObject({
      mode: 'BAC_TRAINING',
      clarification: {
        question: 'أي مادة تقصد؟',
        options: expect.arrayContaining(['علوم الطبيعة والحياة']),
      },
      primaryAction: {
        kind: 'OPEN_ROUTE',
      },
    });
    expect(proposal?.fineTuneOptions).toContain('الرياضيات');
  });

  it('does not borrow a passive context subject for generic BAC training', () => {
    const proposal = buildStudyCommandProposal(
      'أريد تدريب BAC آخر 3 سنوات',
      context,
    );

    expect(proposal).toMatchObject({
      mode: 'BAC_TRAINING',
      clarification: {
        question: 'أي مادة تقصد؟',
      },
      primaryAction: {
        kind: 'OPEN_ROUTE',
      },
    });
  });

  it('uses weak-point context only when the command asks for repair', () => {
    const proposal = buildStudyCommandProposal(
      'أريد جلسة قصيرة لإصلاح نقطة ضعفي',
      context,
    );

    expect(proposal).toMatchObject({
      mode: 'MISTAKE_REPAIR',
      primaryHref: '/student/training/weak-points?subject=MATH',
    });
    expect(proposal?.title).toContain('رياضيات');
    expect(proposal?.title).toContain('الدوال');
  });

  it('opens lesson understanding directly at the inferred course topic', () => {
    const proposal = buildStudyCommandProposal(
      'مافهمتش الدوال اشرحلي الدرس',
      context,
    );

    expect(proposal).toMatchObject({
      mode: 'LESSON_UNDERSTANDING',
      primaryHref: '/student/courses/MATHEMATICS/topics/functions',
      primaryAction: {
        kind: 'OPEN_ROUTE',
        href: '/student/courses/MATHEMATICS/topics/functions',
      },
    });
  });

  it('opens lab exploration at a matching ready lab tool when available', () => {
    const proposal = buildStudyCommandProposal('نحب مختبر يرسملي الدوال', {
      ...context,
      labTools,
    });

    expect(proposal).toMatchObject({
      mode: 'LAB_EXPLORATION',
      primaryHref: '/student/lab/math/function-explorer',
      availability: {
        status: 'READY',
        matchingExerciseCount: 1,
      },
      primaryAction: {
        kind: 'OPEN_ROUTE',
        href: '/student/lab/math/function-explorer',
      },
    });
  });

  it('does not mark an unrelated lab as ready for the requested subject', () => {
    const proposal = buildStudyCommandProposal('نحب مختبر في الفيزياء', {
      ...context,
      labTools,
    });

    expect(proposal).toMatchObject({
      mode: 'LAB_EXPLORATION',
      primaryHref: '/student/lab?subject=PHYSICS',
      availability: {
        status: 'NEEDS_CONTENT',
        matchingExerciseCount: 0,
      },
      primaryAction: {
        kind: 'OPEN_ROUTE',
        href: '/student/lab?subject=PHYSICS',
      },
    });
  });

  it('asks for one clarification before opening a generic lab request', () => {
    const proposal = buildStudyCommandProposal('نحب مختبر يشرحلي بصرياً', {
      ...context,
      labTools,
    });

    expect(proposal).toMatchObject({
      mode: 'LAB_EXPLORATION',
      clarification: {
        question: 'أي مادة تقصد؟',
      },
      primaryAction: {
        kind: 'OPEN_ROUTE',
        href: '/student/lab',
      },
    });
    expect(proposal?.availability).toBeUndefined();
  });

  it('opens simulation with the inferred subject preselected', () => {
    const proposal = buildStudyCommandProposal(
      'نحب محاكاة امتحان كامل في الرياضيات',
      context,
    );

    expect(proposal).toMatchObject({
      mode: 'SIMULATION',
      primaryHref: '/student/training/simulation?subject=MATHEMATICS',
      primaryAction: {
        kind: 'OPEN_ROUTE',
        href: '/student/training/simulation?subject=MATHEMATICS',
      },
    });
  });

  it('preserves stream and subject when opening the library surface', () => {
    const proposal = buildStudyCommandProposal(
      'افتحلي أرشيف مواضيع باك علوم الطبيعة',
      context,
    );

    expect(proposal).toMatchObject({
      mode: 'LIBRARY_SEARCH',
      primaryHref: '/student/library?stream=SE&subject=NATURAL_SCIENCES',
      primaryAction: {
        kind: 'OPEN_ROUTE',
        href: '/student/library?stream=SE&subject=NATURAL_SCIENCES',
      },
    });
  });

  it('applies supported fine-tuning to the create-session payload', () => {
    const proposal = buildStudyCommandProposal(
      'أريد تدريب BAC في الرياضيات، آخر 3 سنوات فقط، زد تمريناً واحداً',
      context,
    );

    expect(proposal?.primaryAction).toMatchObject({
      kind: 'CREATE_STUDY_SESSION',
      request: {
        subjectCode: 'MATHEMATICS',
        exerciseCount: 5,
        years: [2025, 2024, 2023],
      },
    });
    expect(proposal?.estimatedMinutes).toBe(45);
  });

  it('does not auto-create a drill for subjects absent from the real catalog', () => {
    const proposal = buildStudyCommandProposal(
      'عندي فرض في الفيزياء غدوة على الكهرباء',
      {
        ...context,
        catalog: svtOnlyCatalog,
      },
    );

    expect(proposal?.primaryAction).toMatchObject({
      kind: 'OPEN_ROUTE',
    });
    expect(proposal?.primaryLabel).toBe('ضبط الجلسة');
  });

  it('marks unavailable topic proposals explicitly instead of widening to mixed drill', () => {
    const proposal = buildStudyCommandProposal(
      'أريد تدريب BAC في الفيزياء على الكهرباء',
      context,
    );

    if (!proposal || proposal.primaryAction.kind !== 'CREATE_STUDY_SESSION') {
      throw new Error('Expected a create-session proposal before preview.');
    }

    const unavailable = markStudyCommandProposalUnavailable(proposal);

    expect(unavailable.availability).toMatchObject({
      status: 'UNAVAILABLE',
      matchingExerciseCount: 0,
    });
    expect(unavailable.primaryAction).toMatchObject({
      kind: 'OPEN_ROUTE',
    });
    expect(proposal.primaryAction.request).toMatchObject({
      kind: 'TOPIC_DRILL',
      topicCodes: ['ELECTRICITY'],
    });
  });

  it('infers the subject from a topic-only command', () => {
    const proposal = buildStudyCommandProposal(
      'عندي فرض غدوة على البروتينات',
      context,
    );

    expect(proposal?.primaryAction).toMatchObject({
      kind: 'CREATE_STUDY_SESSION',
      request: {
        subjectCode: 'NATURAL_SCIENCES',
        kind: 'TOPIC_DRILL',
        topicCodes: ['PROTEINS'],
      },
    });
  });

  it('prefers specific topic aliases over generic protein mentions', () => {
    const proposal = buildStudyCommandProposal(
      'مافهمتش تركيب البروتين',
      context,
    );

    expect(proposal?.title).toContain('تركيب البروتين');
  });

  it('creates a proposal for BAC-native memorization', () => {
    const proposal = buildStudyCommandProposal(
      'راجعلي تعريفات وحدة البروتينات',
      context,
    );

    expect(proposal?.mode).toBe('MEMORIZATION_REVIEW');
    expect(proposal?.primaryHref).toBe('/student/flashcards');
    expect(proposal?.availability).toMatchObject({
      status: 'READY',
      matchingExerciseCount: 1,
    });
  });

  it('marks memorization as needing content when no cards are due yet', () => {
    const proposal = buildStudyCommandProposal(
      'راجعلي تعريفات وحدة البروتينات',
      {
        ...context,
        dueFlashcards: [],
      },
    );

    expect(proposal?.availability).toMatchObject({
      status: 'NEEDS_CONTENT',
      matchingExerciseCount: 0,
    });
    expect(proposal?.primaryHref).toBe('/student/flashcards');
  });

  it('returns null for empty commands', () => {
    expect(buildStudyCommandProposal('   ', context)).toBeNull();
  });

  it.each(studyCommandEvalFixtures)(
    'routes messy BAC command fixture: $id',
    (fixture) => {
      const proposal = buildStudyCommandProposal(
        fixture.command,
        fixture.context === 'empty' ? emptyContext : context,
      );

      expect(proposal?.mode).toBe(fixture.expectedMode);

      if (fixture.expectsClarification) {
        expect(proposal?.clarification?.question).toBe('أي مادة تقصد؟');
      }

      if (fixture.expectedActionKind) {
        expect(proposal?.primaryAction.kind).toBe(fixture.expectedActionKind);
      }

      if (fixture.expectedPrimaryHref) {
        expect(proposal?.primaryHref).toBe(fixture.expectedPrimaryHref);
      }

      if (
        proposal?.primaryAction.kind === 'CREATE_STUDY_SESSION' &&
        fixture.expectedSubjectCode
      ) {
        expect(proposal.primaryAction.request.subjectCode).toBe(
          fixture.expectedSubjectCode,
        );
      }

      if (
        proposal?.primaryAction.kind === 'CREATE_STUDY_SESSION' &&
        fixture.expectedTopicCodes
      ) {
        expect(proposal.primaryAction.request.topicCodes).toEqual(
          fixture.expectedTopicCodes,
        );
      }
    },
  );

  it('distinguishes missing content from an unsafe unavailable state', () => {
    const proposal = buildStudyCommandProposal(
      'أريد تدريب BAC في الفيزياء على الكهرباء',
      context,
    );

    if (!proposal || proposal.primaryAction.kind !== 'CREATE_STUDY_SESSION') {
      throw new Error('Expected a create-session proposal before preview.');
    }

    expect(markStudyCommandProposalNeedsContent(proposal).availability).toEqual(
      {
        status: 'NEEDS_CONTENT',
        matchingExerciseCount: 0,
        message:
          'لم نجد تمارين مطابقة بهذا الربط المنهجي حالياً. افتح إعداد الجلسة وغيّر الموضوع أو السنوات.',
      },
    );
    expect(markStudyCommandProposalUnavailable(proposal).availability).toEqual({
      status: 'UNAVAILABLE',
      matchingExerciseCount: 0,
      message:
        'لم نجد تمارين مطابقة بهذا الربط المنهجي حالياً. افتح إعداد الجلسة وغيّر الموضوع أو السنوات.',
    });
  });
});
