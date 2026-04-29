import type {
  FiltersResponse,
  StudyRoadmapsResponse,
} from '@bac-bank/contracts/study';
import {
  buildCourseSubjectCardsResponse,
  buildCourseSubjectResponse,
  buildCourseTopicResponse,
} from './courses-read-model';

const filtersFixture: FiltersResponse = {
  streams: [],
  subjects: [
    {
      code: 'MATHEMATICS',
      name: 'الرياضيات',
      streamCodes: ['SE'],
      streams: [],
    },
  ],
  years: [],
  sessionTypes: ['NORMAL', 'MAKEUP'],
  topics: [
    {
      code: 'FUNCTIONS',
      name: 'الدوال والتحليل',
      slug: 'functions',
      parentCode: null,
      displayOrder: 0,
      isSelectable: true,
      subject: { code: 'MATHEMATICS', name: 'الرياضيات' },
      streamCodes: ['SE'],
    },
    {
      code: 'EXPONENTIAL',
      name: 'الدالة الأسية',
      slug: 'exponential',
      parentCode: 'FUNCTIONS',
      displayOrder: 0,
      isSelectable: true,
      subject: { code: 'MATHEMATICS', name: 'الرياضيات' },
      streamCodes: ['SE'],
    },
    {
      code: 'LOGARITHM',
      name: 'الدالة اللوغاريتمية',
      slug: 'logarithm',
      parentCode: 'FUNCTIONS',
      displayOrder: 1,
      isSelectable: true,
      subject: { code: 'MATHEMATICS', name: 'الرياضيات' },
      streamCodes: ['SE'],
    },
    {
      code: 'SEQUENCES',
      name: 'المتتاليات',
      slug: 'sequences',
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: { code: 'MATHEMATICS', name: 'الرياضيات' },
      streamCodes: ['SE'],
    },
  ],
};

const roadmapsFixture: StudyRoadmapsResponse['data'] = [
  {
    id: 'roadmap-math',
    title: 'خارطة الرياضيات',
    description: 'مسار الرياضيات.',
    subject: { code: 'MATHEMATICS', name: 'الرياضيات' },
    curriculum: { code: 'CURR_MATH', title: 'برنامج الرياضيات' },
    totalNodeCount: 2,
    solidNodeCount: 1,
    needsReviewNodeCount: 0,
    inProgressNodeCount: 1,
    notStartedNodeCount: 0,
    openReviewItemCount: 0,
    progressPercent: 62,
    updatedAt: null,
    nextAction: {
      type: 'TOPIC_DRILL',
      label: 'واصل الدوال',
      topicCode: 'FUNCTIONS',
      topicName: 'الدوال',
    },
    sections: [
      {
        id: 'section-analysis',
        code: 'ANALYSIS',
        title: 'التحليل',
        description: 'مدخل المادة.',
        orderIndex: 0,
        nodes: [
          {
            id: 'node-functions',
            title: 'الدوال',
            description: 'فهم السلوك العام للدوال.',
            topicCode: 'FUNCTIONS',
            topicName: 'الدوال',
            orderIndex: 0,
            estimatedSessions: 4,
            isOptional: false,
            sectionId: 'section-analysis',
            recommendedPreviousNodeId: null,
            recommendedPreviousNodeTitle: null,
            status: 'IN_PROGRESS',
            progressPercent: 55,
            weaknessScore: 0.4,
            attemptedQuestions: 18,
            correctCount: 10,
            incorrectCount: 8,
            lastSeenAt: null,
          },
        ],
      },
      {
        id: 'section-sequences',
        code: 'SEQUENCES',
        title: 'المتتاليات',
        description: 'التدرج العددي.',
        orderIndex: 1,
        nodes: [
          {
            id: 'node-sequences',
            title: 'المتتاليات',
            description: 'الأنماط والتقارب.',
            topicCode: 'SEQUENCES',
            topicName: 'المتتاليات',
            orderIndex: 1,
            estimatedSessions: 3,
            isOptional: false,
            sectionId: 'section-sequences',
            recommendedPreviousNodeId: null,
            recommendedPreviousNodeTitle: null,
            status: 'SOLID',
            progressPercent: 100,
            weaknessScore: 0.1,
            attemptedQuestions: 12,
            correctCount: 10,
            incorrectCount: 2,
            lastSeenAt: null,
          },
        ],
      },
    ],
    nodes: [],
  },
];

describe('courses read-model builders', () => {
  it('builds course subject cards without web routes', () => {
    expect(buildCourseSubjectCardsResponse(roadmapsFixture)).toEqual({
      data: [
        {
          subject: {
            code: 'MATHEMATICS',
            name: 'الرياضيات',
          },
          title: 'الرياضيات',
          description: 'مسار الرياضيات.',
          progressPercent: 62,
          unitCount: 2,
          topicCount: 2,
          completedTopicCount: 1,
          continueTopicCode: 'FUNCTIONS',
        },
      ],
    });
  });

  it('builds a course subject response from roadmap sections and curriculum topics', () => {
    const response = buildCourseSubjectResponse({
      subjectCode: 'MATHEMATICS',
      roadmaps: roadmapsFixture,
      filters: filtersFixture,
    });

    expect(response).toMatchObject({
      subject: {
        code: 'MATHEMATICS',
        name: 'الرياضيات',
      },
      title: 'خارطة الرياضيات',
      progressPercent: 62,
      topicCount: 2,
      completedTopicCount: 1,
      continueTopicCode: 'FUNCTIONS',
    });
    expect(response?.units).toHaveLength(2);
    expect(response?.units[0]).toMatchObject({
      id: 'section-analysis',
      topics: [
        {
          topicCode: 'FUNCTIONS',
          slug: 'functions',
          title: 'الدوال',
          shortTitle: 'الدوال',
          status: 'IN_PROGRESS',
          progressPercent: 55,
          conceptCount: 2,
        },
      ],
    });
  });

  it('builds a course topic response with fallback concept checkpoints', () => {
    expect(
      buildCourseTopicResponse({
        subjectCode: 'MATHEMATICS',
        topicSlug: 'functions',
        roadmaps: roadmapsFixture,
        filters: filtersFixture,
      }),
    ).toEqual({
      subject: {
        code: 'MATHEMATICS',
        name: 'الرياضيات',
      },
      topic: {
        code: 'FUNCTIONS',
        slug: 'functions',
        title: 'الدوال والتحليل',
        shortTitle: 'الدوال والتحليل',
      },
      parentUnitTitle: 'التحليل',
      description: 'فهم السلوك العام للدوال.',
      progressPercent: 55,
      status: 'IN_PROGRESS',
      concepts: [
        {
          conceptCode: 'EXPONENTIAL',
          slug: 'exponential',
          title: 'الدالة الأسية',
          description: null,
        },
        {
          conceptCode: 'LOGARITHM',
          slug: 'logarithm',
          title: 'الدالة اللوغاريتمية',
          description: null,
        },
      ],
    });
  });
});
