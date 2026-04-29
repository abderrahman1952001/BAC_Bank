import { describe, expect, it } from "vitest";
import type {
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
} from "@bac-bank/contracts/courses";
import {
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
      title: "الدالة الأسية",
      description: null,
    },
    {
      conceptCode: "LOGARITHM",
      slug: "logarithm",
      title: "الدالة اللوغاريتمية",
      description: null,
    },
  ],
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

  it("builds a topic page model with prototype concept checkpoints", () => {
    const model = buildCourseTopicPageModel(topicFixture);

    expect(model.topic.slug).toBe("functions");
    expect(model.concepts).toHaveLength(3);
    expect(model.concepts[0].href).toBe(
      "/student/courses/MATHEMATICS/topics/functions/concepts/numeric-function",
    );
  });
});
