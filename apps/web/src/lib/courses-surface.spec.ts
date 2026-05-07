import { describe, expect, it } from "vitest";
import type {
  CourseConceptResponse,
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
} from "@bac-bank/contracts/courses";
import {
  buildCourseConceptPageModel,
  buildCourseSubjectCards,
  buildCourseSubjectPageModel,
  buildCourseTopicPageModel,
} from "./courses-surface";

const subjectCardsFixture: CourseSubjectCardsResponse["data"] = [
  {
    subject: { code: "MATHEMATICS", name: "الرياضيات" },
    title: "الرياضيات",
    description: "مسار الرياضيات.",
    progressPercent: 62,
    unitCount: 2,
    topicCount: 2,
    completedTopicCount: 1,
    continueTopicCode: "FUNCTIONS",
  },
];

const subjectFixture: CourseSubjectResponse = {
  subject: { code: "MATHEMATICS", name: "الرياضيات" },
  title: "خارطة الرياضيات",
  description: "مسار الرياضيات.",
  progressPercent: 62,
  topicCount: 2,
  completedTopicCount: 1,
  continueTopicCode: "FUNCTIONS",
  units: [
    {
      id: "section-analysis",
      code: "ANALYSIS",
      title: "التحليل",
      description: "مدخل المادة.",
      progressPercent: 55,
      topics: [
        {
          topicCode: "FUNCTIONS",
          slug: "functions",
          title: "الدوال",
          shortTitle: "الدوال",
          description: "فهم السلوك العام للدوال.",
          status: "IN_PROGRESS",
          progressPercent: 55,
          conceptCount: 2,
        },
      ],
    },
    {
      id: "section-sequences",
      code: "SEQUENCES",
      title: "المتتاليات",
      description: "التدرج العددي.",
      progressPercent: 100,
      topics: [
        {
          topicCode: "SEQUENCES",
          slug: "sequences",
          title: "المتتاليات",
          shortTitle: "المتتاليات",
          description: "الأنماط والتقارب.",
          status: "COMPLETED",
          progressPercent: 100,
          conceptCount: 1,
        },
      ],
    },
  ],
};

const topicFixture: CourseTopicResponse = {
  subject: { code: "MATHEMATICS", name: "الرياضيات" },
  topic: {
    code: "FUNCTIONS",
    slug: "functions",
    title: "الدوال والتحليل",
    shortTitle: "الدوال والتحليل",
  },
  parentUnitTitle: "التحليل",
  description: "فهم السلوك العام للدوال.",
  progressPercent: 55,
  status: "IN_PROGRESS",
  concepts: [
    {
      conceptCode: "EXPONENTIAL",
      slug: "exponential",
      unitCode: "PROTEIN_SYNTHESIS",
      role: "UNIT_INTRO",
      title: "الدالة الأسية",
      description: null,
    },
    {
      conceptCode: "LOGARITHM",
      slug: "logarithm",
      unitCode: "PROTEIN_SYNTHESIS",
      role: "LESSON",
      title: "الدالة اللوغاريتمية",
      description: null,
    },
  ],
};

const conceptFixture: CourseConceptResponse = {
  subject: { code: "MATHEMATICS", name: "الرياضيات" },
  topic: {
    code: "FUNCTIONS",
    slug: "functions",
    title: "الدوال والتحليل",
    shortTitle: "الدوال والتحليل",
  },
  concept: {
    conceptCode: "NUMERIC_FUNCTION",
    slug: "numeric-function",
    unitCode: "ANALYSIS",
    role: "LESSON",
    title: "ما معنى الدالة العددية؟",
    summary: "كل قيمة من المجال تقود إلى صورة وحيدة.",
    estimatedMinutes: 4,
  },
  navigation: {
    previousConceptSlug: null,
    nextConceptSlug: "domain-of-definition",
  },
  steps: [
    {
      id: "definition",
      type: "EXPLAIN",
      eyebrow: "تعريف",
      title: "الصورة والسابقة",
      body: "إذا كان y = f(x) فإن y هي صورة x بالدالة.",
      bullets: ["الصورة: العدد الناتج"],
      visual: {
        kind: "DIAGRAM",
        title: "علاقة الدخول بالخروج",
        description: "مخطط بسيط يربط x بصورة وحيدة.",
        prompt: "Diagram showing one input x mapped to one output f(x).",
        altText: "سهم من x إلى f(x).",
      },
      interaction: {
        kind: "SIMPLE_CHOICE",
        prompt: "اختر العبارة التي تحافظ على معنى الوحيدة.",
        items: ["صورة واحدة", "صورتان مختلفتان"],
        answer: "صورة واحدة",
      },
      examLens: {
        bacSkill: "صياغة تعريف دقيق",
        prompt: "في BAC، التعريف يجب أن يظهر المجال والوحيدة.",
        trap: "خلط الدالة بالمنحنى فقط.",
      },
    },
  ],
  depthPortals: [
    {
      slug: "mapping-vs-function",
      kind: "ADVANCED_CONTEXT",
      title: "متى لا تكون العلاقة دالة؟",
      summary: "استكشاف سريع لعلاقة تعطي صورتين لنفس السابقة.",
      body: "هذا الاستكشاف اختياري، لكنه يوضح لماذا شرط الصورة الوحيدة ليس تفصيلاً لغوياً.",
      estimatedMinutes: 2,
    },
  ],
  quiz: {
    question: "أي عبارة تعبّر بدقة عن الدالة؟",
    options: ["كل x يملك صورة وحيدة", "كل x يملك صورتين"],
    correctIndex: 0,
    explanation: "جوهر التعريف هو الوحيدة.",
  },
};

describe("courses surface builders", () => {
  it("builds subject cards from course responses", () => {
    const cards = buildCourseSubjectCards(subjectCardsFixture);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      subjectCode: "MATHEMATICS",
      progressPercent: 62,
      unitCount: 2,
    });
    expect(cards[0].href).toBe("/student/courses/MATHEMATICS");
  });

  it("builds a subject page model from course subject responses", () => {
    const model = buildCourseSubjectPageModel(subjectFixture);

    expect(model.subject.code).toBe("MATHEMATICS");
    expect(model.units).toHaveLength(2);
    expect(model.units[0].topics[0]).toMatchObject({
      topicCode: "FUNCTIONS",
      conceptCount: 2,
      href: "/student/courses/MATHEMATICS/topics/functions",
    });
  });

  it("builds a topic page model from API concept checkpoints", () => {
    const model = buildCourseTopicPageModel(topicFixture);

    expect(model.topic.slug).toBe("functions");
    expect(model.concepts).toHaveLength(2);
    expect(model.conceptGroups).toEqual([
      {
        unitCode: "PROTEIN_SYNTHESIS",
        title: "تركيب البروتين",
        concepts: model.concepts,
      },
    ]);
    expect(model.concepts[0]).toMatchObject({
      title: "الدالة الأسية",
      role: "UNIT_INTRO",
      roleLabel: "مدخل الوحدة",
    });
    expect(model.concepts[0].href).toBe(
      "/student/courses/MATHEMATICS/topics/functions/concepts/exponential",
    );
    expect(model.continueHref).toBe(
      "/student/courses/MATHEMATICS/topics/functions/concepts/exponential",
    );
  });

  it("builds a concept page model with navigation routes", () => {
    const model = buildCourseConceptPageModel(conceptFixture);

    expect(model.concept.slug).toBe("numeric-function");
    expect(model.concept.steps[0].visual?.kind).toBe("DIAGRAM");
    expect(model.concept.steps[0].interaction?.kind).toBe("SIMPLE_CHOICE");
    expect(model.concept.steps[0].examLens?.bacSkill).toBe("صياغة تعريف دقيق");
    expect(model.concept.depthPortals[0]).toMatchObject({
      slug: "mapping-vs-function",
      estimatedMinutes: 2,
    });
    expect(model.backHref).toBe(
      "/student/courses/MATHEMATICS/topics/functions",
    );
    expect(model.nextHref).toBe(
      "/student/courses/MATHEMATICS/topics/functions/concepts/domain-of-definition",
    );
  });
});
