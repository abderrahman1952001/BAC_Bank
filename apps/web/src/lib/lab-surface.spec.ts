import { describe, expect, it } from "vitest";
import {
  getLabToolById,
  getLabToolsForCourseConcept,
  labTools,
  listLabSubjectGroups,
} from "./lab-surface";

describe("lab surface registry", () => {
  it("exposes the first two Lab tools with stable routes", () => {
    expect(labTools.map((tool) => tool.id)).toEqual([
      "function-explorer",
      "dna-to-protein",
    ]);
    expect(getLabToolById("function-explorer")?.href).toBe(
      "/student/lab/math/function-explorer",
    );
    expect(getLabToolById("dna-to-protein")?.href).toBe(
      "/student/lab/svt/dna-to-protein",
    );
  });

  it("groups tools by subject for the Lab home page", () => {
    const groups = listLabSubjectGroups();

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      subjectSlug: "math",
      title: "Math Lab",
    });
    expect(groups[0].tools.map((tool) => tool.id)).toEqual([
      "function-explorer",
    ]);
    expect(groups[1]).toMatchObject({
      subjectSlug: "svt",
      title: "SVT Lab",
    });
  });

  it("resolves contextual course links conservatively", () => {
    expect(
      getLabToolsForCourseConcept({
        subjectCode: "MATHEMATICS",
        topicSlug: "functions",
        conceptSlug: "numeric-function",
      }).map((tool) => tool.id),
    ).toEqual(["function-explorer"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "translation-chain",
      }).map((tool) => tool.id),
    ).toEqual(["dna-to-protein"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "enzyme-conditions",
      }),
    ).toEqual([]);
  });
});
