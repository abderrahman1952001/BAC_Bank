import { describe, expect, it } from "vitest";
import {
  getLabToolById,
  getLabToolsForCourseConcept,
  labSubjects,
  labTools,
  listLabTools,
  listLabToolsForSubjectCode,
  listLabSubjectGroups,
  subjectCodeToLabSlug,
} from "./lab-surface";

describe("lab surface registry", () => {
  it("exposes the first two Lab tools with stable routes", () => {
    expect(
      labTools
        .filter((tool) => tool.status === "READY")
        .map((tool) => tool.id),
    ).toEqual([
      "function-explorer",
      "dna-to-protein",
      "svt-document-workbench",
      "svt-experimental-graph-table",
    ]);
    expect(getLabToolById("function-explorer")?.href).toBe(
      "/student/lab/math/function-explorer",
    );
    expect(getLabToolById("dna-to-protein")?.href).toBe(
      "/student/lab/svt/dna-to-protein",
    );
  });

  it("represents the premium subject labs without making draft tools ready", () => {
    expect(labSubjects.map((subject) => subject.subjectSlug)).toEqual([
      "math",
      "svt",
      "physics",
      "technology-civil",
      "technology-electrical",
      "technology-mechanical",
      "technology-process",
    ]);

    const groups = listLabSubjectGroups();

    expect(groups).toHaveLength(7);
    expect(groups[0]).toMatchObject({
      subjectSlug: "math",
      title: "Math Lab",
      readyToolCount: 1,
      draftToolCount: 0,
    });
    expect(groups[0].tools.map((tool) => tool.id)).toEqual([
      "function-explorer",
    ]);
    expect(
      groups.find((group) => group.subjectSlug === "physics"),
    ).toMatchObject({
      readyToolCount: 0,
      draftToolCount: 1,
    });
  });

  it("filters tools by READY, DRAFT, and HIDDEN status", () => {
    expect(listLabTools().some((tool) => tool.status === "HIDDEN")).toBe(false);
    expect(
      listLabTools({ statuses: ["DRAFT"] }).map((tool) => tool.id),
    ).toEqual([
      "physics-experiment-graphs",
      "technology-civil-beam-statics",
      "technology-electrical-control-logic",
      "technology-mechanical-drawing-workbench",
      "technology-process-reaction-workbench",
    ]);
    expect(
      listLabTools({ statuses: ["HIDDEN"] }).map((tool) => tool.id),
    ).toEqual(["lab-engine-sandbox"]);
  });

  it("maps Study Command subject requests to ready Lab subjects", () => {
    expect(subjectCodeToLabSlug("MATHEMATICS")).toBe("math");
    expect(subjectCodeToLabSlug("SVT")).toBe("svt");
    expect(subjectCodeToLabSlug("PHYSICS")).toBe("physics");
    expect(subjectCodeToLabSlug("TECHNOLOGY_CIVIL")).toBe("technology-civil");
    expect(listLabToolsForSubjectCode("PHYSICS")).toEqual([]);
    expect(
      listLabToolsForSubjectCode("NATURAL_SCIENCES").map((tool) => tool.id),
    ).toEqual([
      "dna-to-protein",
      "svt-document-workbench",
      "svt-experimental-graph-table",
    ]);
    expect(
      listLabToolsForSubjectCode("PHYSICS", { statuses: ["DRAFT"] }).map(
        (tool) => tool.id,
      ),
    ).toEqual(["physics-experiment-graphs"]);
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
        conceptSlug: "mutation-to-function",
      }).map((tool) => tool.id),
    ).toEqual(["svt-document-workbench"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "enzyme-conditions",
      }).map((tool) => tool.id),
    ).toEqual(["svt-experimental-graph-table"]);
  });
});
