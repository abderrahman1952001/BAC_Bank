import { describe, expect, it } from "vitest";
import {
  buildPlaywrightCanonicalCourseConceptResponse,
  buildPlaywrightCanonicalCourseSubjectCards,
  buildPlaywrightCanonicalCourseSubjectResponse,
  buildPlaywrightCanonicalCourseTopicResponse,
  buildPlaywrightSvtCourseConceptResponse,
  buildPlaywrightSvtCourseSubjectCard,
  buildPlaywrightSvtCourseSubjectResponse,
  buildPlaywrightSvtCourseTopicResponse,
} from "@/lib/playwright-svt-course-preview";

describe("playwright SVT course preview", () => {
  it("builds contract-valid SVT protein course preview models", async () => {
    const subjectCard = await buildPlaywrightSvtCourseSubjectCard();
    const subject =
      await buildPlaywrightSvtCourseSubjectResponse("NATURAL_SCIENCES");
    const topic = await buildPlaywrightSvtCourseTopicResponse(
      "NATURAL_SCIENCES",
      "proteins",
    );
    const concept = await buildPlaywrightSvtCourseConceptResponse(
      "NATURAL_SCIENCES",
      "proteins",
      "protein-world",
    );

    expect(subjectCard?.topicCount).toBe(1);
    expect(subject?.units[0]?.topics[0]?.slug).toBe("proteins");
    expect(topic?.concepts.length).toBeGreaterThan(40);
    expect(concept?.concept.slug).toBe("protein-world");
    expect(concept?.steps[0]?.visual?.asset?.url).toContain(
      "/api/course-assets/svt/SE/proteins/",
    );
  });

  it("does not expose the removed canonical math sequence draft", async () => {
    const cards = await buildPlaywrightCanonicalCourseSubjectCards();
    const subject =
      await buildPlaywrightCanonicalCourseSubjectResponse("MATHEMATICS");
    const topic = await buildPlaywrightCanonicalCourseTopicResponse(
      "MATHEMATICS",
      "sequences",
    );
    const concept = await buildPlaywrightCanonicalCourseConceptResponse(
      "MATHEMATICS",
      "sequences",
      "sequence-field-gate",
    );

    expect(cards.some((card) => card.subject.code === "MATHEMATICS")).toBe(
      false,
    );
    expect(subject).toBeNull();
    expect(topic).toBeNull();
    expect(concept).toBeNull();
  });
});
