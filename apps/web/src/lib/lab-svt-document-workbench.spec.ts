import { describe, expect, it } from "vitest";
import {
  buildSvtDocumentWorkbenchResult,
  evaluateSvtDocumentWorkbenchAnswer,
  getSvtDocumentWorkbenchPreset,
  svtDocumentWorkbenchPresets,
  toggleSvtDocumentEvidence,
} from "./lab-svt-document-workbench";

describe("SVT document workbench", () => {
  const preset = svtDocumentWorkbenchPresets[0];

  it("evaluates required evidence and conclusion keywords", () => {
    const evaluation = evaluateSvtDocumentWorkbenchAnswer(preset, {
      selectedEvidenceIds: [
        "ldl-normal-entry",
        "r2-stop-codon",
        "ldl-accumulation",
      ],
      conclusion:
        "تؤدي طفرة إلى رامزة توقف في المستقبل، فتتغير بنية البروتين ولا يقتنص LDL.",
    });

    expect(evaluation).toMatchObject({
      passed: true,
      selectedRequiredCount: 3,
      requiredEvidenceCount: 3,
      missingEvidenceIds: [],
      missingKeywords: [],
    });
  });

  it("reports missing evidence and missing reasoning terms", () => {
    const evaluation = evaluateSvtDocumentWorkbenchAnswer(preset, {
      selectedEvidenceIds: ["ldl-normal-entry"],
      conclusion: "المصاب لا يستعمل الجزيئة بشكل عادي.",
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.missingEvidenceIds).toEqual([
      "r2-stop-codon",
      "ldl-accumulation",
    ]);
    expect(evaluation.missingEvidenceItems.map((item) => item.id)).toEqual([
      "r2-stop-codon",
      "ldl-accumulation",
    ]);
    expect(evaluation.missingKeywords).toEqual([
      "LDL",
      "مستقبل",
      "طفرة",
      "رامزة توقف",
      "بنية",
    ]);
  });

  it("builds mission result JSON that the Lab attempt API can save", () => {
    const result = buildSvtDocumentWorkbenchResult({
      missionId: "mission-1",
      preset,
      selectedEvidenceIds: preset.prompt.requiredEvidenceIds,
      conclusion:
        "طفرة أحدثت رامزة توقف في المستقبل فغيرت بنية البروتين ومنعت اقتناص LDL.",
    });

    expect(result).toMatchObject({
      tool: "svt-document-workbench",
      missionId: "mission-1",
      presetId: preset.id,
      selectedEvidenceIds: preset.prompt.requiredEvidenceIds,
    });
    expect(result.evaluation?.passed).toBe(true);
  });

  it("parses valid mission presets and falls back on invalid payloads", () => {
    expect(getSvtDocumentWorkbenchPreset(preset).id).toBe(preset.id);
    expect(getSvtDocumentWorkbenchPreset({ broken: true }).id).toBe(preset.id);
  });

  it("toggles evidence selection without duplicating ids", () => {
    expect(toggleSvtDocumentEvidence([], "a")).toEqual(["a"]);
    expect(toggleSvtDocumentEvidence(["a"], "a")).toEqual([]);
  });
});
