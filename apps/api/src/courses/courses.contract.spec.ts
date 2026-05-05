import {
  parseCourseConceptResponse,
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

  it('parses course concept responses with authored steps and quiz', () => {
    expect(
      parseCourseConceptResponse({
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
        concept: {
          conceptCode: 'NUMERIC_FUNCTION',
          slug: 'numeric-function',
          unitCode: 'ANALYSIS',
          role: 'LESSON',
          title: 'ما معنى الدالة العددية؟',
          summary: 'كل قيمة من المجال تقود إلى صورة وحيدة.',
          estimatedMinutes: 4,
        },
        navigation: {
          previousConceptSlug: null,
          nextConceptSlug: 'domain-of-definition',
        },
        steps: [
          {
            id: 'definition',
            type: 'EXPLAIN',
            eyebrow: 'تعريف',
            title: 'الصورة والسابقة',
            body: 'إذا كان y = f(x) فإن y هي صورة x بالدالة.',
            bullets: ['الصورة: العدد الناتج'],
            visual: {
              kind: 'DIAGRAM',
              title: 'علاقة الدخول بالخروج',
              description: 'مخطط بسيط يربط x بصورة وحيدة.',
              prompt: 'Diagram showing one input x mapped to one output f(x).',
              altText: 'سهم من x إلى f(x).',
              asset: {
                status: 'GENERATED',
                path: 'assets/generated/numeric-function/definition.png',
                url: '/api/course-assets/math/functions/assets/generated/numeric-function/definition.png',
                mimeType: 'image/png',
                width: 1536,
                height: 1024,
                model: 'gpt-image-1',
                generatedAt: '2026-05-04T10:00:00.000Z',
                reviewStatus: 'UNREVIEWED',
              },
            },
            interaction: {
              kind: 'SIMPLE_CHOICE',
              prompt: 'اختر العبارة التي تحافظ على معنى الوحيدة.',
              items: ['صورة واحدة', 'صورتان مختلفتان'],
              answer: 'صورة واحدة',
            },
            examLens: {
              bacSkill: 'صياغة تعريف دقيق',
              prompt: 'في BAC، التعريف يجب أن يظهر المجال والوحيدة.',
              trap: 'خلط الدالة بالمنحنى فقط.',
            },
          },
        ],
        depthPortals: [
          {
            slug: 'mapping-vs-function',
            kind: 'ADVANCED_CONTEXT',
            title: 'متى لا تكون العلاقة دالة؟',
            summary: 'استكشاف سريع لعلاقة تعطي صورتين لنفس السابقة.',
            body: 'هذا الاستكشاف اختياري، لكنه يوضح لماذا شرط الصورة الوحيدة ليس تفصيلاً لغوياً.',
            estimatedMinutes: 2,
          },
        ],
        quiz: {
          question: 'أي عبارة تعبّر بدقة عن الدالة؟',
          options: ['كل x يملك صورة وحيدة', 'كل x يملك صورتين'],
          correctIndex: 0,
          explanation: 'جوهر التعريف هو الوحيدة.',
        },
      }),
    ).toMatchObject({
      concept: {
        slug: 'numeric-function',
        role: 'LESSON',
        estimatedMinutes: 4,
      },
      depthPortals: [
        {
          slug: 'mapping-vs-function',
          estimatedMinutes: 2,
        },
      ],
      navigation: {
        nextConceptSlug: 'domain-of-definition',
      },
      steps: [
        {
          visual: {
            asset: {
              status: 'GENERATED',
              reviewStatus: 'UNREVIEWED',
            },
          },
        },
      ],
    });
  });
});
