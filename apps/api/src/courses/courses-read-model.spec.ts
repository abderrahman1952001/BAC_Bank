import type {
  FiltersResponse,
  StudyRoadmapsResponse,
} from '@bac-bank/contracts/study';
import {
  buildCourseConceptResponse,
  buildCourseSubjectCardsResponse,
  buildCourseSubjectResponse,
  buildCourseTopicResponse,
} from './courses-read-model';
import type { AuthoredCourseTopicContent } from './course-authored-content';

const filtersFixture: FiltersResponse = {
  streams: [],
  subjects: [
    {
      code: 'MATHEMATICS',
      name: 'الرياضيات',
      streamCodes: ['SE'],
      streams: [],
    },
    {
      code: 'NATURAL_SCIENCES',
      name: 'علوم الطبيعة والحياة',
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

const authoredSvtTopicFixture: AuthoredCourseTopicContent = {
  subjectCode: 'NATURAL_SCIENCES',
  stream: 'SE',
  fieldCode: 'PROTEINS',
  topicCode: 'PROTEINS',
  topicSlug: 'proteins',
  title: 'Proteins: From Code To Living Function',
  description: 'A full first-field SVT journey.',
  requiredUnitCodes: ['PROTEIN_SYNTHESIS'],
  concepts: [
    {
      conceptCode: 'PROTEIN_WORLD',
      slug: 'protein-world',
      unitCode: 'PROTEIN_SYNTHESIS',
      role: 'FIELD_INTRO',
      roadmapTitle: 'مدخل المجال',
      title: 'لماذا تبدأ الحياة بالبروتينات؟',
      summary: 'البروتينات آلات خلوية تجعل المعلومة الوراثية فعلا حيا.',
      estimatedMinutes: 9,
      steps: [],
      quiz: {
        question: 'ما الخيط الذي يجمع المجال؟',
        options: ['حفظ الأسماء', 'المعلومة ثم البنية ثم الوظيفة'],
        correctIndex: 1,
        explanation: 'هذا هو الخيط المركزي في المجال.',
      },
    },
  ],
};

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

  it('adds authored-only subjects to course subject cards', () => {
    const response = buildCourseSubjectCardsResponse(roadmapsFixture, [
      authoredSvtTopicFixture,
    ]);

    expect(response.data).toHaveLength(2);
    expect(response.data[1]).toMatchObject({
      subject: {
        code: 'NATURAL_SCIENCES',
        name: 'علوم الطبيعة والحياة',
      },
      title: 'علوم الطبيعة والحياة',
      description:
        'مسار المجال الأول لشعبة علوم تجريبية: من تركيب البروتين إلى البنية والوظيفة، الإنزيمات، المناعة، والاتصال العصبي.',
      unitCount: 1,
      topicCount: 1,
      continueTopicCode: null,
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

  it('builds an authored-only course subject response without a roadmap', () => {
    const response = buildCourseSubjectResponse({
      subjectCode: 'NATURAL_SCIENCES',
      roadmaps: [],
      filters: filtersFixture,
      authoredTopics: [authoredSvtTopicFixture],
    });

    expect(response).toMatchObject({
      subject: {
        code: 'NATURAL_SCIENCES',
        name: 'علوم الطبيعة والحياة',
      },
      title: 'علوم الطبيعة والحياة',
      topicCount: 1,
      continueTopicCode: null,
      units: [
        {
          id: 'authored:proteins',
          title: 'المجال الأول: التخصص الوظيفي للبروتينات',
          topics: [
            {
              topicCode: 'PROTEINS',
              slug: 'proteins',
              shortTitle: 'التخصص الوظيفي للبروتينات',
              conceptCount: 1,
            },
          ],
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
          unitCode: null,
          role: 'LESSON',
          title: 'الدالة الأسية',
          description: null,
        },
        {
          conceptCode: 'LOGARITHM',
          slug: 'logarithm',
          unitCode: null,
          role: 'LESSON',
          title: 'الدالة اللوغاريتمية',
          description: null,
        },
      ],
    });
  });

  it('builds an authored-only course topic response without taxonomy topics', () => {
    const response = buildCourseTopicResponse({
      subjectCode: 'NATURAL_SCIENCES',
      topicSlug: 'proteins',
      roadmaps: [],
      filters: filtersFixture,
      authoredTopic: authoredSvtTopicFixture,
    });

    expect(response).toMatchObject({
      subject: {
        code: 'NATURAL_SCIENCES',
        name: 'علوم الطبيعة والحياة',
      },
      topic: {
        code: 'PROTEINS',
        slug: 'proteins',
        title: 'التخصص الوظيفي للبروتينات',
        shortTitle: 'التخصص الوظيفي للبروتينات',
      },
      parentUnitTitle: 'المجال الأول',
      concepts: [
        {
          conceptCode: 'PROTEIN_WORLD',
          slug: 'protein-world',
          unitCode: 'PROTEIN_SYNTHESIS',
          role: 'FIELD_INTRO',
          title: 'مدخل المجال',
        },
      ],
    });
  });

  it('uses authored course concepts before taxonomy fallback concepts', () => {
    const response = buildCourseTopicResponse({
      subjectCode: 'MATHEMATICS',
      topicSlug: 'functions',
      roadmaps: roadmapsFixture,
      filters: filtersFixture,
      authoredTopic: {
        subjectCode: 'MATHEMATICS',
        topicSlug: 'functions',
        concepts: [
          {
            conceptCode: 'NUMERIC_FUNCTION',
            slug: 'numeric-function',
            unitCode: 'ANALYSIS',
            role: 'LESSON',
            roadmapTitle: 'الدالة العددية',
            title: 'ما معنى الدالة العددية؟',
            summary: 'كل قيمة من المجال تقود إلى صورة وحيدة.',
            estimatedMinutes: 4,
            steps: [],
            quiz: {
              question: 'أي عبارة تعبّر بدقة عن الدالة؟',
              options: ['كل x يملك صورة وحيدة', 'كل x يملك صورتين'],
              correctIndex: 0,
              explanation: 'جوهر التعريف هو الوحيدة.',
            },
          },
        ],
      },
    });

    expect(response?.concepts).toEqual([
      {
        conceptCode: 'NUMERIC_FUNCTION',
        slug: 'numeric-function',
        unitCode: 'ANALYSIS',
        role: 'LESSON',
        title: 'الدالة العددية',
        description: 'كل قيمة من المجال تقود إلى صورة وحيدة.',
      },
    ]);
  });

  it('builds a course concept response from authored concept content', () => {
    const response = buildCourseConceptResponse({
      subjectCode: 'MATHEMATICS',
      topicSlug: 'functions',
      conceptSlug: 'numeric-function',
      roadmaps: roadmapsFixture,
      filters: filtersFixture,
      authoredTopic: {
        subjectCode: 'MATHEMATICS',
        topicSlug: 'functions',
        concepts: [
          {
            conceptCode: 'NUMERIC_FUNCTION',
            slug: 'numeric-function',
            unitCode: 'ANALYSIS',
            role: 'LESSON',
            roadmapTitle: 'الدالة العددية',
            title: 'ما معنى الدالة العددية؟',
            summary: 'كل قيمة من المجال تقود إلى صورة وحيدة.',
            estimatedMinutes: 4,
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
                  prompt:
                    'Diagram showing one input x mapped to one output f(x).',
                  altText: 'سهم من x إلى f(x).',
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
          },
          {
            conceptCode: 'DOMAIN_OF_DEFINITION',
            slug: 'domain-of-definition',
            unitCode: 'ANALYSIS',
            role: 'LESSON',
            roadmapTitle: 'مجموعة التعريف',
            title: 'مجموعة التعريف',
            summary: 'تحديد الأعداد المسموح بها.',
            estimatedMinutes: 4,
            steps: [],
            quiz: {
              question: 'ما الفكرة الصحيحة؟',
              options: ['القيم المسموح بها', 'القيم الممنوعة'],
              correctIndex: 0,
              explanation: 'المجال هو القيم المسموح بها.',
            },
          },
        ],
      },
    });

    expect(response).toMatchObject({
      subject: {
        code: 'MATHEMATICS',
      },
      topic: {
        slug: 'functions',
      },
      concept: {
        conceptCode: 'NUMERIC_FUNCTION',
        slug: 'numeric-function',
        unitCode: 'ANALYSIS',
        role: 'LESSON',
        title: 'ما معنى الدالة العددية؟',
        estimatedMinutes: 4,
      },
      navigation: {
        previousConceptSlug: null,
        nextConceptSlug: 'domain-of-definition',
      },
      depthPortals: [
        {
          slug: 'mapping-vs-function',
          estimatedMinutes: 2,
        },
      ],
    });
    expect(response?.steps).toHaveLength(1);
  });

  it('builds an authored-only concept response without a roadmap', () => {
    const response = buildCourseConceptResponse({
      subjectCode: 'NATURAL_SCIENCES',
      topicSlug: 'proteins',
      conceptSlug: 'protein-world',
      roadmaps: [],
      filters: filtersFixture,
      authoredTopic: authoredSvtTopicFixture,
    });

    expect(response).toMatchObject({
      subject: {
        code: 'NATURAL_SCIENCES',
        name: 'علوم الطبيعة والحياة',
      },
      topic: {
        slug: 'proteins',
        title: 'التخصص الوظيفي للبروتينات',
      },
      concept: {
        conceptCode: 'PROTEIN_WORLD',
        slug: 'protein-world',
        unitCode: 'PROTEIN_SYNTHESIS',
        role: 'FIELD_INTRO',
        title: 'لماذا تبدأ الحياة بالبروتينات؟',
      },
      navigation: {
        previousConceptSlug: null,
        nextConceptSlug: null,
      },
    });
  });
});
