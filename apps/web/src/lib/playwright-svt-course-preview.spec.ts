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

  it("builds contract-valid canonical math sequence preview models", async () => {
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
      true,
    );
    expect(subject?.units[0]?.topics[0]?.slug).toBe("sequences");
    expect(topic?.concepts).toHaveLength(13);
    expect(concept?.concept.slug).toBe("sequence-field-gate");
    expect(concept?.steps[0]?.visual?.asset?.status).toBe("GENERATED");
    expect(concept?.steps[0]?.visual?.asset?.url).toContain(
      "/api/course-assets/math/SE-M-MT/sequences/",
    );
  });
});
