import { describe, expect, it } from "vitest";
import type { FiltersResponse, StudyRoadmapsResponse } from "@/lib/study-api";
import {
  buildCourseSubjectCards,
  buildCourseSubjectPageModel,
  buildCourseTopicPageModel,
} from "./courses-surface";

const filtersFixture: FiltersResponse = {
  streams: [],
  subjects: [
    {
      code: "MATHEMATICS",
      name: "الرياضيات",
      streamCodes: ["SE"],
      streams: [],
    },
  ],
  years: [],
  sessionTypes: ["NORMAL", "MAKEUP"],
  topics: [
    {
      code: "FUNCTIONS",
      name: "الدوال والتحليل",
      slug: "functions",
      parentCode: null,
      displayOrder: 0,
      isSelectable: true,
      subject: { code: "MATHEMATICS", name: "الرياضيات" },
      streamCodes: ["SE"],
    },
    {
      code: "EXPONENTIAL",
      name: "الدالة الأسية",
      slug: "exponential",
      parentCode: "FUNCTIONS",
      displayOrder: 0,
      isSelectable: true,
      subject: { code: "MATHEMATICS", name: "الرياضيات" },
      streamCodes: ["SE"],
    },
    {
      code: "LOGARITHM",
      name: "الدالة اللوغاريتمية",
      slug: "logarithm",
      parentCode: "FUNCTIONS",
      displayOrder: 1,
      isSelectable: true,
      subject: { code: "MATHEMATICS", name: "الرياضيات" },
      streamCodes: ["SE"],
    },
    {
      code: "SEQUENCES",
      name: "المتتاليات",
      slug: "sequences",
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: { code: "MATHEMATICS", name: "الرياضيات" },
      streamCodes: ["SE"],
    },
  ],
};

const roadmapsFixture: StudyRoadmapsResponse["data"] = [
  {
    id: "roadmap-math",
    title: "خارطة الرياضيات",
    description: "مسار الرياضيات.",
    subject: { code: "MATHEMATICS", name: "الرياضيات" },
    curriculum: { code: "CURR_MATH", title: "برنامج الرياضيات" },
    totalNodeCount: 2,
    solidNodeCount: 1,
    needsReviewNodeCount: 0,
    inProgressNodeCount: 1,
    notStartedNodeCount: 0,
    openReviewItemCount: 0,
    progressPercent: 62,
    updatedAt: null,
    nextAction: {
      type: "TOPIC_DRILL",
      label: "واصل الدوال",
      topicCode: "FUNCTIONS",
      topicName: "الدوال",
    },
    sections: [
      {
        id: "section-analysis",
        code: "ANALYSIS",
        title: "التحليل",
        description: "مدخل المادة.",
        orderIndex: 0,
        nodes: [
          {
            id: "node-functions",
            title: "الدوال",
            description: "فهم السلوك العام للدوال.",
            topicCode: "FUNCTIONS",
            topicName: "الدوال",
            orderIndex: 0,
            estimatedSessions: 4,
            isOptional: false,
            sectionId: "section-analysis",
            recommendedPreviousNodeId: null,
            recommendedPreviousNodeTitle: null,
            status: "IN_PROGRESS",
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
        id: "section-sequences",
        code: "SEQUENCES",
        title: "المتتاليات",
        description: "التدرج العددي.",
        orderIndex: 1,
        nodes: [
          {
            id: "node-sequences",
            title: "المتتاليات",
            description: "الأنماط والتقارب.",
            topicCode: "SEQUENCES",
            topicName: "المتتاليات",
            orderIndex: 1,
            estimatedSessions: 3,
            isOptional: false,
            sectionId: "section-sequences",
            recommendedPreviousNodeId: null,
            recommendedPreviousNodeTitle: null,
            status: "SOLID",
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

describe("courses surface builders", () => {
  it("builds subject cards from study roadmaps", () => {
    const cards = buildCourseSubjectCards(roadmapsFixture);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      subjectCode: "MATHEMATICS",
      progressPercent: 62,
      unitCount: 2,
    });
    expect(cards[0].href).toBe("/student/courses/MATHEMATICS");
  });

  it("builds a subject page model from roadmap sections and curriculum topics", () => {
    const model = buildCourseSubjectPageModel({
      subjectCode: "MATHEMATICS",
      roadmaps: roadmapsFixture,
      filters: filtersFixture,
    });

    expect(model?.subject.code).toBe("MATHEMATICS");
    expect(model?.units).toHaveLength(2);
    expect(model?.units[0].topics[0]).toMatchObject({
      topicCode: "FUNCTIONS",
      conceptCount: 2,
      href: "/student/courses/MATHEMATICS/topics/functions",
    });
  });

  it("builds a topic page model with concept checkpoints from child topics", () => {
    const model = buildCourseTopicPageModel({
      subjectCode: "MATHEMATICS",
      topicSlug: "functions",
      roadmaps: roadmapsFixture,
      filters: filtersFixture,
    });

    expect(model?.topic.slug).toBe("functions");
    expect(model?.concepts).toHaveLength(3);
    expect(model?.concepts[0].href).toBe(
      "/student/courses/MATHEMATICS/topics/functions/concepts/numeric-function",
    );
  });
});
