import { describe, expect, it } from "vitest";
import {
  buildMethodGuidance,
  buildPedagogyAssistActions,
  formatStudyQuestionDiagnosisForSupportStyle,
  resolveSessionSupportStyle,
} from "./study-pedagogy";

describe("study pedagogy helpers", () => {
  it("prefers the server support style when it is available", () => {
    expect(
      resolveSessionSupportStyle({
        pedagogy: {
          supportStyle: "CONTENT_HEAVY",
          weakPointIntro: null,
        },
        exercises: [],
      }),
    ).toBe("CONTENT_HEAVY");
  });

  it("falls back to subject code when support style is missing", () => {
    expect(
      resolveSessionSupportStyle({
        pedagogy: undefined as never,
        exercises: [
          {
            exam: {
              subject: {
                code: "PHILO",
              },
            },
          },
        ] as never,
      }),
    ).toBe("ESSAY_HEAVY");
  });

  it("builds subject-aware method guidance for logic-heavy questions", () => {
    expect(
      buildMethodGuidance({
        supportStyle: "LOGIC_HEAVY",
        question: {
          id: "q1",
          orderIndex: 1,
          label: "Q1",
          points: 5,
          depth: 0,
          interaction: {
            format: "GENERAL",
            captureMode: "TYPELESS",
            responseMode: "NONE",
            checkStrategy: "MODEL_COMPARISON",
          },
          topics: [{ code: "FUNC", name: "Functions" }],
          promptBlocks: [],
          solutionBlocks: [],
          hintBlocks: [],
          rubricBlocks: [],
        },
      }),
    ).toMatchObject({
      title: "طريقة الانطلاق",
      steps: [
        "اكتب المعطيات والمطلوب بدقة.",
        "حدّد القاعدة أو الخاصية أو النظرية المناسبة.",
        "نفّذ خطوة واحدة فقط ثم قارنها بالتلميح.",
      ],
    });
  });

  it("orders assist actions through the support profile", () => {
    expect(
      buildPedagogyAssistActions({
        supportStyle: "CONTENT_HEAVY",
        hasHints: true,
        hasMethodGuidance: true,
        canRevealSolution: true,
      }).map((action) => action.id),
    ).toEqual(["method", "hint", "solution"]);
  });

  it("formats diagnosis labels through the support profile", () => {
    expect(
      formatStudyQuestionDiagnosisForSupportStyle({
        diagnosis: "METHOD",
        supportStyle: "ESSAY_HEAVY",
      }),
    ).toBe("البناء المنهجي");
  });
});
