import { describe, expect, it } from "vitest";
import {
  buildFunctionValueTable,
  detectApproximateRoots,
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
