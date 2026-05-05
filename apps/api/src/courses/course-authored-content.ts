import type { CourseConceptStep } from '@bac-bank/contracts/courses';
import type {
  CourseBlueprintAuthoredConceptContent,
  CourseBlueprintAuthoredTopicContent,
} from './course-blueprint';
import { toAuthoredCourseTopicContent } from './course-blueprint';
import { loadCanonicalCourseBlueprints } from './course-blueprint-files';

export type AuthoredCourseConceptContent =
  CourseBlueprintAuthoredConceptContent;

export type AuthoredCourseTopicContent = CourseBlueprintAuthoredTopicContent;

const noStepEnhancements = {
  visual: null,
  interaction: null,
  examLens: null,
} satisfies Pick<CourseConceptStep, 'visual' | 'interaction' | 'examLens'>;

const staticAuthoredCourseTopics: AuthoredCourseTopicContent[] = [
  {
    subjectCode: 'MATHEMATICS',
    topicSlug: 'functions',
    concepts: [
      {
        conceptCode: 'NUMERIC_FUNCTION',
        slug: 'numeric-function',
        title: 'ما معنى الدالة العددية؟',
        summary:
          'مقدمة قصيرة تبني الفكرة الأساسية: كل قيمة من المجال تقود إلى صورة وحيدة.',
        estimatedMinutes: 4,
        steps: [
          {
            id: 'hook',
            type: 'HOOK',
            eyebrow: 'فكرة',
            title: 'العلاقة ليست فوضى',
            body: 'الدالة ليست مجرد جدول قيم. هي قاعدة تربط كل عنصر x من مجموعة التعريف بصورة واحدة فقط.',
            bullets: [],
            ...noStepEnhancements,
          },
          {
            id: 'definition',
            type: 'EXPLAIN',
            eyebrow: 'تعريف',
            title: 'الصورة والسابقة',
            body: 'إذا كان y = f(x) فإن y هي صورة x بالدالة، و x هو سابقة y. المهم في البداية هو ثبات هذه اللغة.',
            bullets: ['الصورة: العدد الناتج', 'السابقة: العدد الذي أدخلناه'],
            ...noStepEnhancements,
          },
          {
            id: 'exam-lens',
            type: 'EXAM_LENS',
            eyebrow: 'منهجية',
            title: 'كيف تصيغها في BAC',
            body: 'عند تعريف الدالة، يجب أن تظهر ثلاث أفكار بوضوح: مجموعة تعريف، عنصر x من المجال، وصورة وحيدة f(x).',
            bullets: [],
            ...noStepEnhancements,
          },
        ],
        quiz: {
          question: 'أي عبارة تعبّر بدقة عن الدالة العددية لمتغير حقيقي؟',
          options: [
            'يمكن لـ x أن يملك صورتين مختلفتين إذا كان التمثيل البياني واضحاً.',
            'كل عنصر x من المجال يرتبط بصورة وحيدة y = f(x).',
            'الدالة هي فقط جدول تغيّرات أو منحنى.',
          ],
          correctIndex: 1,
          explanation:
            'جوهر التعريف هو الوحيدة: كل x من المجال يقابل قيمة واحدة فقط.',
        },
      },
      {
        conceptCode: 'DOMAIN_OF_DEFINITION',
        slug: 'domain-of-definition',
        title: 'مجموعة التعريف',
        summary: 'كيف تحدد الأعداد المسموح بها قبل أي حساب أو تمثيل بياني.',
        estimatedMinutes: 4,
        steps: [
          {
            id: 'idea',
            type: 'HOOK',
            eyebrow: 'قاعدة',
            title: 'ابدأ بالسؤال: متى تكون f(x) قابلة للحساب؟',
            body: 'مجموعة التعريف هي جميع القيم الحقيقية التي تجعل عبارة الدالة موجودة وقابلة للحساب.',
            bullets: [],
            ...noStepEnhancements,
          },
          {
            id: 'filters',
            type: 'RULE',
            eyebrow: 'فلترة',
            title: 'ما الذي يمنع قيمة من الدخول إلى المجال؟',
            body: 'في BAC، المنع يأتي غالباً من المقام المنعدم، أو الجذر لعدد سالب، أو اللوغاريتم لعدد غير موجب.',
            bullets: [
              'المقام ≠ 0',
              'ما تحت الجذر الزوجي ≥ 0',
              'داخل اللوغاريتم > 0',
            ],
            ...noStepEnhancements,
          },
          {
            id: 'exam-lens',
            type: 'EXAM_LENS',
            eyebrow: 'منهجية',
            title: 'لا تكتب المجال بلا تبرير',
            body: 'الجواب الجيد لا يكتفي بالنتيجة النهائية. اذكر القيد أولاً ثم استنتج المجال بصياغة مرتبة.',
            bullets: [],
            ...noStepEnhancements,
          },
        ],
        quiz: {
          question: 'ما الفكرة الصحيحة عند تحديد مجموعة تعريف دالة؟',
          options: [
            'أبحث فقط عن جدول التغيّرات.',
            'أجمع كل القيم التي تجعل التعبير غير معرف ثم أعتبرها المجال.',
            'أحدد جميع القيم التي تجعل f(x) موجودة وقابلة للحساب.',
          ],
          correctIndex: 2,
          explanation:
            'مجموعة التعريف تجمع القيم المسموح بها، لا القيم الممنوعة.',
        },
      },
      {
        conceptCode: 'GRAPH_READING',
        slug: 'graph-reading',
        title: 'قراءة التمثيل البياني',
        summary: 'تحويل المنحنى إلى معلومات سريعة: صور، سوابق، تغيرات، وحلول.',
        estimatedMinutes: 5,
        steps: [
          {
            id: 'reading',
            type: 'HOOK',
            eyebrow: 'قراءة',
            title: 'ابدأ من السؤال لا من الرسم كله',
            body: 'عندما يُطلب منك f(0) فأنت تبحث عن الصورة عند x = 0. وعندما تُطلب سوابق 2 فأنت تبحث عن جميع x التي تجعل y = 2.',
            bullets: [],
            ...noStepEnhancements,
          },
          {
            id: 'workflow',
            type: 'RULE',
            eyebrow: 'خطوات',
            title: 'ماذا تستخرج من التمثيل البياني؟',
            body: 'في التمرين الواحد يمكنك استخراج المجال، الصور، السوابق، جدول التغيّرات، والحلول التقريبية للمعادلات والمتراجحات.',
            bullets: [
              'صور قيم محددة',
              'سوابق قيمة معينة',
              'فترات التزايد والتناقص',
              'نقاط التقاطع والحلول',
            ],
            ...noStepEnhancements,
          },
          {
            id: 'exam-lens',
            type: 'EXAM_LENS',
            eyebrow: 'منهجية',
            title: 'فرّق بين f(x)=0 و f(x)=g(x)',
            body: 'الأولى تعني تقاطع منحنى الدالة مع محور الفواصل، والثانية تعني تقاطع منحنيين معاً.',
            bullets: [],
            ...noStepEnhancements,
          },
        ],
        quiz: {
          question: 'إذا طلب منك سوابق العدد 2 بالدالة f، ماذا تبحث؟',
          options: [
            'القيم y التي تجعل x = 2',
            'كل قيم x التي يكون عندها f(x) = 2',
            'قيمة f(2) فقط',
          ],
          correctIndex: 1,
          explanation: 'السوابق هي قيم x التي تعطي نفس الصورة المطلوبة.',
        },
      },
    ],
  },
];

const canonicalCourseTopics = loadCanonicalCourseBlueprints().map(
  toAuthoredCourseTopicContent,
);
const authoredCourseTopics: AuthoredCourseTopicContent[] = [
  ...canonicalCourseTopics,
  ...staticAuthoredCourseTopics,
];

export function getAuthoredCourseTopicContent(
  subjectCode: string,
  topicSlug: string,
): AuthoredCourseTopicContent | null {
  const normalizedSubjectCode = subjectCode.trim().toUpperCase();
  const normalizedTopicSlug = topicSlug.trim().toLowerCase();

  return (
    authoredCourseTopics.find(
      (topic) =>
        topic.subjectCode === normalizedSubjectCode &&
        topic.topicSlug === normalizedTopicSlug,
    ) ?? null
  );
}

export function listAuthoredCourseTopicContent(
  subjectCode?: string,
): AuthoredCourseTopicContent[] {
  const normalizedSubjectCode = subjectCode?.trim().toUpperCase();

  return authoredCourseTopics.filter(
    (topic) =>
      !normalizedSubjectCode || topic.subjectCode === normalizedSubjectCode,
  );
}
