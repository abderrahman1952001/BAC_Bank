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
      "math-probability-workbench",
      "math-sequences-workbench",
      "math-geometry-complex-plane",
      "dna-to-protein",
      "svt-document-workbench",
      "svt-experimental-graph-table",
      "svt-diagram-labeling-workbench",
      "svt-energy-metabolism-workbench",
      "svt-nervous-immune-response-workbench",
      "svt-tectonics-workbench",
      "physics-experiment-graphs",
      "physics-circuits-workbench",
      "physics-mechanics-workbench",
      "physics-chemistry-reaction-workbench",
      "technology-civil-beam-statics",
      "technology-civil-structures-materials",
      "technology-civil-technical-sheet",
      "technology-electrical-control-logic",
      "technology-electrical-circuits-chronograms",
      "technology-electrical-technical-file",
      "technology-mechanical-drawing-workbench",
      "technology-mechanical-mechanism-kinematics",
      "technology-mechanical-manufacturing-tolerances",
      "technology-process-reaction-workbench",
      "technology-process-material-balance-advancement",
      "technology-process-flow-instrumentation",
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
      readyToolCount: 4,
      draftToolCount: 0,
    });
    expect(groups[0].tools.map((tool) => tool.id)).toEqual([
      "function-explorer",
      "math-probability-workbench",
      "math-sequences-workbench",
      "math-geometry-complex-plane",
    ]);
    expect(
      groups.find((group) => group.subjectSlug === "physics"),
    ).toMatchObject({
      readyToolCount: 4,
      draftToolCount: 0,
    });
  });

  it("filters tools by READY, DRAFT, and HIDDEN status", () => {
    expect(listLabTools().some((tool) => tool.status === "HIDDEN")).toBe(false);
    expect(
      listLabTools({ statuses: ["DRAFT"] }).map((tool) => tool.id),
    ).toEqual([]);
    expect(
      listLabTools({ statuses: ["HIDDEN"] }).map((tool) => tool.id),
    ).toEqual(["lab-engine-sandbox"]);
  });

  it("maps Study Command subject requests to ready Lab subjects", () => {
    expect(subjectCodeToLabSlug("MATHEMATICS")).toBe("math");
    expect(subjectCodeToLabSlug("SVT")).toBe("svt");
    expect(subjectCodeToLabSlug("PHYSICS")).toBe("physics");
    expect(subjectCodeToLabSlug("TECHNOLOGY_CIVIL")).toBe("technology-civil");
    expect(listLabToolsForSubjectCode("PHYSICS").map((tool) => tool.id)).toEqual(
      [
        "physics-experiment-graphs",
        "physics-circuits-workbench",
        "physics-mechanics-workbench",
        "physics-chemistry-reaction-workbench",
      ],
    );
    expect(
      listLabToolsForSubjectCode("NATURAL_SCIENCES").map((tool) => tool.id),
    ).toEqual([
      "dna-to-protein",
      "svt-document-workbench",
      "svt-experimental-graph-table",
      "svt-diagram-labeling-workbench",
      "svt-energy-metabolism-workbench",
      "svt-nervous-immune-response-workbench",
      "svt-tectonics-workbench",
    ]);
    expect(
      listLabToolsForSubjectCode("PHYSICS", { statuses: ["DRAFT"] }).map(
        (tool) => tool.id,
      ),
    ).toEqual([]);
    expect(
      listLabToolsForSubjectCode("TECHNOLOGY_CIVIL").map((tool) => tool.id),
    ).toEqual([
      "technology-civil-beam-statics",
      "technology-civil-structures-materials",
      "technology-civil-technical-sheet",
    ]);
    expect(
      listLabToolsForSubjectCode("TECHNOLOGY_ELECTRICAL").map(
        (tool) => tool.id,
      ),
    ).toEqual([
      "technology-electrical-control-logic",
      "technology-electrical-circuits-chronograms",
      "technology-electrical-technical-file",
    ]);
    expect(
      listLabToolsForSubjectCode("TECHNOLOGY_MECHANICAL").map(
        (tool) => tool.id,
      ),
    ).toEqual([
      "technology-mechanical-drawing-workbench",
      "technology-mechanical-mechanism-kinematics",
      "technology-mechanical-manufacturing-tolerances",
    ]);
    expect(
      listLabToolsForSubjectCode("TECHNOLOGY_PROCESS").map((tool) => tool.id),
    ).toEqual([
      "technology-process-reaction-workbench",
      "technology-process-material-balance-advancement",
      "technology-process-flow-instrumentation",
    ]);
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
        subjectCode: "MATHEMATICS",
        topicSlug: "probability",
        conceptSlug: "probability-modeling",
      }).map((tool) => tool.id),
    ).toEqual(["math-probability-workbench"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "MATHEMATICS",
        topicSlug: "sequences",
        conceptSlug: "sequence-proof",
      }).map((tool) => tool.id),
    ).toEqual(["math-sequences-workbench"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "MATHEMATICS",
        topicSlug: "complex-numbers",
        conceptSlug: "complex-number-manipulation",
      }).map((tool) => tool.id),
    ).toEqual(["math-geometry-complex-plane"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "PHYSICS",
        topicSlug: "electricity",
        conceptSlug: "circuit-transient-analysis",
      }).map((tool) => tool.id),
    ).toEqual(["physics-experiment-graphs", "physics-circuits-workbench"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "PHYSICS",
        topicSlug: "mechanics",
        conceptSlug: "mechanics-reasoning",
      }).map((tool) => tool.id),
    ).toEqual(["physics-experiment-graphs", "physics-mechanics-workbench"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "PHYSICS",
        topicSlug: "chemistry",
        conceptSlug: "reaction-advancement",
      }).map((tool) => tool.id),
    ).toEqual(["physics-chemistry-reaction-workbench"]);

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

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "proteins",
        conceptSlug: "biological-diagram-labeling",
      }).map((tool) => tool.id),
    ).toEqual(["svt-diagram-labeling-workbench"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "photosynthesis",
        conceptSlug: "energy-metabolism",
      }).map((tool) => tool.id),
    ).toEqual(["svt-energy-metabolism-workbench"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "immunity",
        conceptSlug: "response-chain",
      }).map((tool) => tool.id),
    ).toEqual(["svt-nervous-immune-response-workbench"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "NATURAL_SCIENCES",
        topicSlug: "plate-tectonics",
        conceptSlug: "geological-interpretation",
      }).map((tool) => tool.id),
    ).toEqual(["svt-tectonics-workbench"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_CIVIL",
        topicSlug: "beam-statics",
        conceptSlug: "reactions-and-bending",
      }).map((tool) => tool.id),
    ).toEqual(["technology-civil-beam-statics"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_CIVIL",
        topicSlug: "reinforced-concrete",
        conceptSlug: "section-material-check",
      }).map((tool) => tool.id),
    ).toEqual(["technology-civil-structures-materials"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_CIVIL",
        topicSlug: "building-structure",
        conceptSlug: "technical-sheet-workflow",
      }).map((tool) => tool.id),
    ).toEqual(["technology-civil-technical-sheet"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_ELECTRICAL",
        topicSlug: "automation-grafcet-gemma",
        conceptSlug: "logic-grafcet-workflow",
      }).map((tool) => tool.id),
    ).toEqual(["technology-electrical-control-logic"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_ELECTRICAL",
        topicSlug: "automation-grafcet-gemma",
        conceptSlug: "circuits-chronograms",
      }).map((tool) => tool.id),
    ).toEqual(["technology-electrical-circuits-chronograms"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_ELECTRICAL",
        topicSlug: "project",
        conceptSlug: "technical-file-workflow",
      }).map((tool) => tool.id),
    ).toEqual(["technology-electrical-technical-file"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_MECHANICAL",
        topicSlug: "functional-analysis",
        conceptSlug: "assembly-nomenclature",
      }).map((tool) => tool.id),
    ).toEqual(["technology-mechanical-drawing-workbench"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_MECHANICAL",
        topicSlug: "motion-transmission-conversion",
        conceptSlug: "speed-ratio",
      }).map((tool) => tool.id),
    ).toEqual(["technology-mechanical-mechanism-kinematics"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_MECHANICAL",
        topicSlug: "manufacturing-preparation",
        conceptSlug: "fits-and-tolerances",
      }).map((tool) => tool.id),
    ).toEqual(["technology-mechanical-manufacturing-tolerances"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_PROCESS",
        topicSlug: "oxygenated-functions",
        conceptSlug: "esterification-scheme",
      }).map((tool) => tool.id),
    ).toEqual(["technology-process-reaction-workbench"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_PROCESS",
        topicSlug: "chemical-kinetics",
        conceptSlug: "advancement-table",
      }).map((tool) => tool.id),
    ).toEqual(["technology-process-material-balance-advancement"]);

    expect(
      getLabToolsForCourseConcept({
        subjectCode: "TECHNOLOGY_PROCESS",
        topicSlug: "thermodynamics",
        conceptSlug: "process-flow-diagram",
      }).map((tool) => tool.id),
    ).toEqual(["technology-process-flow-instrumentation"]);
  });
});
