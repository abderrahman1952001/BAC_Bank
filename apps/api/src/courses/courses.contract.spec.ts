import {
  parseCourseSubjectCardsResponse,
  parseCourseSubjectResponse,
  parseCourseTopicResponse,
} from '@bac-bank/contracts/courses';

describe('courses contracts', () => {
  it('parses course subject card responses', () => {
    expect(
      parseCourseSubjectCardsResponse({
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
      }),
    ).toEqual({
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

  it('parses course subject responses', () => {
    expect(
      parseCourseSubjectResponse({
        subject: {
          code: 'MATHEMATICS',
          name: 'الرياضيات',
        },
        title: 'خارطة الرياضيات',
        description: 'مسار الرياضيات.',
        progressPercent: 62,
        topicCount: 2,
        completedTopicCount: 1,
        continueTopicCode: 'FUNCTIONS',
        units: [
          {
            id: 'section-analysis',
            code: 'ANALYSIS',
            title: 'التحليل',
            description: 'مدخل المادة.',
            progressPercent: 55,
            topics: [
              {
                topicCode: 'FUNCTIONS',
                slug: 'functions',
                title: 'الدوال',
                shortTitle: 'الدوال',
                description: 'فهم السلوك العام للدوال.',
                status: 'IN_PROGRESS',
                progressPercent: 55,
                conceptCount: 2,
              },
            ],
          },
        ],
      }),
    ).toMatchObject({
      subject: {
        code: 'MATHEMATICS',
      },
      units: [
        {
          topics: [
            {
              status: 'IN_PROGRESS',
            },
          ],
        },
      ],
    });
  });

  it('rejects invalid course topic responses', () => {
    expect(() =>
      parseCourseTopicResponse({
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
        status: 'BROKEN',
        concepts: [],
      }),
    ).toThrow();
  });
});
