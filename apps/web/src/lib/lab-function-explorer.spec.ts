import { describe, expect, it } from "vitest";
import {
  analyzeFunctionExpression,
  buildFunctionValueTable,
  detectApproximateExtrema,
  detectApproximateRoots,
  evaluateFunctionMissionAnswer,
  getFunctionExplorerPreset,
  validateFunctionExpression,
} from "./lab-function-explorer";

describe("Function Explorer helpers", () => {
  it("builds value tables for BAC-friendly expressions", () => {
    expect(buildFunctionValueTable("x^2 - 4*x + 3", [0, 1, 3]).rows).toEqual([
      { x: 0, y: 3 },
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("detects approximate roots over a finite domain", () => {
    expect(detectApproximateRoots("x^2 - 4*x + 3", [0, 4])).toEqual([1, 3]);
  });

  it("detects approximate extrema over a finite domain", () => {
    expect(detectApproximateExtrema("x^2 - 2*x - 3", [-2, 6])).toMatchObject({
      minimum: { x: 1, y: -4 },
    });
  });

  it("returns exact BAC facts for recognized quadratic expressions", () => {
    const analysis = analyzeFunctionExpression("x^2 - 4*x + 3", [-2, 6], 2);

    expect(analysis.family.kind).toBe("quadratic");
    expect(analysis.roots).toMatchObject({
      confidence: "EXACT",
      value: [1, 3],
    });
    expect(analysis.derivative).toMatchObject({
      confidence: "EXACT",
      value: {
        expression: "2*x - 4",
        valueAtTangent: 0,
      },
    });
    expect(analysis.variation.value?.map((entry) => entry.direction)).toEqual([
      "decreasing",
      "increasing",
    ]);
  });

  it("keeps double-root sign logic exact for quadratics", () => {
    const analysis = analyzeFunctionExpression("x^2 - 2*x + 1", [-2, 4], 1);

    expect(analysis.roots).toMatchObject({
      confidence: "EXACT",
      value: [1],
    });
    expect(analysis.signIntervals.value?.map((entry) => entry.sign)).toEqual([
      "positive",
      "zero",
      "positive",
    ]);
  });

  it("returns exact variation for recognized linear expressions", () => {
    const analysis = analyzeFunctionExpression("2*x - 3", [-4, 5], 0);

    expect(analysis.family.kind).toBe("linear");
    expect(analysis.variation).toMatchObject({
      confidence: "EXACT",
      value: [
        {
          direction: "increasing",
        },
      ],
    });
  });

  it("marks free-form trigonometric facts as estimated instead of exact", () => {
    const analysis = analyzeFunctionExpression("sin(x)", [-4, 4], 0);

    expect(analysis.family.kind).toBe("free");
    expect(analysis.roots.confidence).toBe("ESTIMATED");
    expect(analysis.variation.confidence).toBe("UNSUPPORTED");
  });

  it("checks root answers with BAC-friendly separators", () => {
    const analysis = analyzeFunctionExpression("x^2 - 4*x + 3", [-2, 6], 2);

    expect(
      evaluateFunctionMissionAnswer(analysis, {
        kind: "ROOTS",
        answer: "1 ; 3",
      }),
    ).toMatchObject({
      status: "correct",
      expected: "1 ; 3",
    });
  });

  it("detects incorrect root answers without hiding the expected result", () => {
    const analysis = analyzeFunctionExpression("x^2 - 4*x + 3", [-2, 6], 2);

    expect(
      evaluateFunctionMissionAnswer(analysis, {
        kind: "ROOTS",
        answer: "1 ; 4",
      }),
    ).toMatchObject({
      status: "incorrect",
      expected: "1 ; 3",
    });
  });

  it("checks exact sign table answers including double roots", () => {
    const analysis = analyzeFunctionExpression("x^2 - 2*x + 1", [-2, 4], 1);

    expect(
      evaluateFunctionMissionAnswer(analysis, {
        kind: "SIGN_TABLE",
        answer: "+ 0 +",
      }),
    ).toMatchObject({
      status: "correct",
      expected: "+ 0 +",
    });
  });

  it("checks variation direction answers for supported functions", () => {
    const analysis = analyzeFunctionExpression("x^2 - 4*x + 3", [-2, 6], 2);

    expect(
      evaluateFunctionMissionAnswer(analysis, {
        kind: "VARIATION",
        answer: "decreasing, increasing",
      }),
    ).toMatchObject({
      status: "correct",
      expected: "decreasing ; increasing",
    });
  });

  it("rejects unsupported expression tokens before evaluation", () => {
    expect(validateFunctionExpression("alert(1)").error).toContain(
      "غير مدعومة",
    );
  });

  it("returns stable presets for the first Lab release", () => {
    expect(getFunctionExplorerPreset("quadratic")?.expression).toBe(
      "x^2 - 4*x + 3",
    );
  });
});
