import { describe, expect, it } from "vitest";
import {
  compareLabMeasurement,
  evaluateFormulaSteps,
  evaluateLabMeasurements,
} from "./lab-formula-unit-engine";

describe("lab formula and unit engine", () => {
  it("checks values with tolerance and accepted units", () => {
    expect(
      compareLabMeasurement(
        {
          id: "tau",
          label: "ثابت الزمن",
          expected: { value: 0.47, unit: "s" },
          tolerance: 0.02,
          acceptedUnits: ["sec"],
        },
        {
          id: "tau",
          value: 0.48,
          unit: "sec",
        },
      ),
    ).toMatchObject({
      passed: true,
      valueMatches: true,
      unitMatches: true,
    });
  });

  it("evaluates several measurements and required formula steps", () => {
    expect(
      evaluateLabMeasurements(
        [
          {
            id: "force",
            label: "Force",
            expected: { value: 12, unit: "N" },
          },
          {
            id: "moment",
            label: "Moment",
            expected: { value: 24, unit: "N.m" },
            acceptedUnits: ["N·m"],
          },
        ],
        [
          { id: "force", value: 12, unit: "N" },
          { id: "moment", value: 24, unit: "N⋅m" },
        ],
      ).passed,
    ).toBe(true);
    expect(
      evaluateFormulaSteps(["write-law", "replace", "solve"], ["replace"]),
    ).toEqual({
      passed: false,
      missingStepIds: ["write-law", "solve"],
    });
  });
});
