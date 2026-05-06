import { describe, expect, it } from "vitest";
import { buildSessionPlayerMobileTools } from "./session-player-mobile";

describe("session player mobile tools", () => {
  it("enables context and support while a drill question is still hidden", () => {
    expect(
      buildSessionPlayerMobileTools({
        hasHints: true,
        hasMethodGuidance: false,
        solutionVisible: false,
        canRevealSolution: true,
        isActiveSimulation: false,
      }),
    ).toEqual({
      contextEnabled: true,
      supportEnabled: true,
      solutionEnabled: true,
      solutionLabel: "التصحيح",
      solutionDescription: "افتح ورقة التصحيح عندما تنتهي من محاولتك.",
    });
  });

  it("keeps the solution sheet available after the official solution is visible", () => {
    expect(
      buildSessionPlayerMobileTools({
        hasHints: false,
        hasMethodGuidance: false,
        solutionVisible: true,
        canRevealSolution: false,
        isActiveSimulation: false,
      }),
    ).toMatchObject({
      supportEnabled: false,
      solutionEnabled: true,
      solutionLabel: "الحل",
    });
  });

  it("locks correction while a simulation is active", () => {
    expect(
      buildSessionPlayerMobileTools({
        hasHints: true,
        hasMethodGuidance: true,
        solutionVisible: false,
        canRevealSolution: false,
        isActiveSimulation: true,
      }),
    ).toMatchObject({
      supportEnabled: false,
      solutionEnabled: false,
      solutionLabel: "مقفل",
    });
  });
});
