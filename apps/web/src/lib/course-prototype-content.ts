export type PrototypeConceptStep = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
};

export type PrototypeConceptQuiz = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type PrototypeConcept = {
  slug: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  steps: PrototypeConceptStep[];
  quiz: PrototypeConceptQuiz;
};

type PrototypeTopic = {
  subjectCode: string;
  topicSlug: string;
  concepts: PrototypeConcept[];
};

const prototypeTopics: PrototypeTopic[] = [
  {
    subjectCode: "MATHEMATICS",
    topicSlug: "functions",
    concepts: [
      {
        slug: "numeric-function",
        title: "ما معنى الدالة العددية؟",
        summary:
          "مقدمة قصيرة تبني الفكرة الأساسية: كل قيمة من المجال تقود إلى صورة وحيدة.",
        estimatedMinutes: 4,
        steps: [
          {
            id: "hook",
            eyebrow: "فكرة",
            title: "العلاقة ليست فوضى",
            body:
              "الدالة ليست مجرد جدول قيم. هي قاعدة تربط كل عنصر x من مجموعة التعريف بصورة واحدة فقط.",
          },
          {
            id: "definition",
            eyebrow: "تعريف",
            title: "الصورة والسابقة",
            body:
              "إذا كان y = f(x) فإن y هي صورة x بالدالة، و x هو سابقة y. المهم في البداية هو ثبات هذه اللغة.",
            bullets: ["الصورة: العدد الناتج", "السابقة: العدد الذي أدخلناه"],
          },
          {
            id: "exam-lens",
            eyebrow: "منهجية",
            title: "كيف تصيغها في BAC",
            body:
              "عند تعريف الدالة، يجب أن تظهر ثلاث أفكار بوضوح: مجموعة تعريف، عنصر x من المجال، وصورة وحيدة f(x).",
          },
        ],
        quiz: {
          question:
            "أي عبارة تعبّر بدقة عن الدالة العددية لمتغير حقيقي؟",
          options: [
            "يمكن لـ x أن يملك صورتين مختلفتين إذا كان التمثيل البياني واضحاً.",
            "كل عنصر x من المجال يرتبط بصورة وحيدة y = f(x).",
            "الدالة هي فقط جدول تغيّرات أو منحنى.",
          ],
          correctIndex: 1,
          explanation:
            "جوهر التعريف هو الوحيدة: كل x من المجال يقابل قيمة واحدة فقط.",
        },
      },
      {
        slug: "domain-of-definition",
        title: "مجموعة التعريف",
        summary:
          "كيف تحدد الأعداد المسموح بها قبل أي حساب أو تمثيل بياني.",
        estimatedMinutes: 4,
        steps: [
          {
            id: "idea",
            eyebrow: "قاعدة",
            title: "ابدأ بالسؤال: متى تكون f(x) قابلة للحساب؟",
            body:
              "مجموعة التعريف هي جميع القيم الحقيقية التي تجعل عبارة الدالة موجودة وقابلة للحساب.",
          },
          {
            id: "filters",
            eyebrow: "فلترة",
            title: "ما الذي يمنع قيمة من الدخول إلى المجال؟",
            body:
              "في BAC، المنع يأتي غالباً من المقام المنعدم، أو الجذر لعدد سالب، أو اللوغاريتم لعدد غير موجب.",
            bullets: [
              "المقام ≠ 0",
              "ما تحت الجذر الزوجي ≥ 0",
              "داخل اللوغاريتم > 0",
            ],
          },
          {
            id: "exam-lens",
            eyebrow: "منهجية",
            title: "لا تكتب المجال بلا تبرير",
            body:
              "الجواب الجيد لا يكتفي بالنتيجة النهائية. اذكر القيد أولاً ثم استنتج المجال بصياغة مرتبة.",
          },
        ],
        quiz: {
          question: "ما الفكرة الصحيحة عند تحديد مجموعة تعريف دالة؟",
          options: [
            "أبحث فقط عن جدول التغيّرات.",
            "أجمع كل القيم التي تجعل التعبير غير معرف ثم أعتبرها المجال.",
            "أحدد جميع القيم التي تجعل f(x) موجودة وقابلة للحساب.",
          ],
          correctIndex: 2,
          explanation:
            "مجموعة التعريف تجمع القيم المسموح بها، لا القيم الممنوعة.",
        },
      },
      {
        slug: "graph-reading",
        title: "قراءة التمثيل البياني",
        summary:
          "تحويل المنحنى إلى معلومات سريعة: صور، سوابق، تغيرات، وحلول.",
        estimatedMinutes: 5,
        steps: [
          {
            id: "reading",
            eyebrow: "قراءة",
            title: "ابدأ من السؤال لا من الرسم كله",
            body:
              "عندما يُطلب منك f(0) فأنت تبحث عن الصورة عند x = 0. وعندما تُطلب سوابق 2 فأنت تبحث عن جميع x التي تجعل y = 2.",
          },
          {
            id: "workflow",
            eyebrow: "خطوات",
            title: "ماذا تستخرج من التمثيل البياني؟",
            body:
              "في التمرين الواحد يمكنك استخراج المجال، الصور، السوابق، جدول التغيّرات، والحلول التقريبية للمعادلات والمتراجحات.",
            bullets: [
              "صور قيم محددة",
              "سوابق قيمة معينة",
              "فترات التزايد والتناقص",
              "نقاط التقاطع والحلول",
            ],
          },
          {
            id: "exam-lens",
            eyebrow: "منهجية",
            title: "فرّق بين f(x)=0 و f(x)=g(x)",
            body:
              "الأولى تعني تقاطع منحنى الدالة مع محور الفواصل، والثانية تعني تقاطع منحنيين معاً.",
          },
        ],
        quiz: {
          question: "إذا طلب منك سوابق العدد 2 بالدالة f، ماذا تبحث؟",
          options: [
            "القيم y التي تجعل x = 2",
            "كل قيم x التي يكون عندها f(x) = 2",
            "قيمة f(2) فقط",
          ],
          correctIndex: 1,
          explanation:
            "السوابق هي قيم x التي تعطي نفس الصورة المطلوبة.",
        },
      },
    ],
  },
];

export function getPrototypeTopicContent(
  subjectCode: string,
  topicSlug: string,
): PrototypeTopic | null {
  return (
    prototypeTopics.find(
      (topic) =>
        topic.subjectCode === subjectCode && topic.topicSlug === topicSlug,
    ) ?? null
  );
}

export function getPrototypeConceptContent(input: {
  subjectCode: string;
  topicSlug: string;
  conceptSlug: string;
}): PrototypeConcept | null {
  const topic = getPrototypeTopicContent(input.subjectCode, input.topicSlug);

  if (!topic) {
    return null;
  }

  return topic.concepts.find((concept) => concept.slug === input.conceptSlug) ?? null;
}
