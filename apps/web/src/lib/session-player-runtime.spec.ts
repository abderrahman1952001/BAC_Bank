import { describe, expect, it } from "vitest";
import type { StudyQuestionState } from "@/lib/study";
import {
  buildCompletedQuestionState,
  buildDiagnosisQuestionState,
  buildHintViewedQuestionState,
  buildMethodViewedQuestionState,
  buildReflectionQuestionState,
  buildRevealSolutionQuestionState,
  buildSkippedQuestionState,
  isQuestionTimingTrackingEnabled,
  resolveQuestionProgressPlan,
  resolveRemainingSessionTimeMs,
  resolveSimulationReviewAction,
  shouldAutoRevealReviewSolution,
  shouldStayOnCurrentQuestionAfterDiagnosis,
  shouldStayOnCurrentQuestionAfterReflection,
} from "./session-player-runtime";

describe("session player runtime helpers", () => {
  it("resolves timing tracking and remaining simulation time", () => {
    expect(
      isQuestionTimingTrackingEnabled({
        timingEnabled: true,
        sessionFamily: "DRILL",
        progressMode: "SOLVE",
      }),
    ).toBe(true);
    expect(
      isQuestionTimingTrackingEnabled({
        timingEnabled: true,
        sessionFamily: "SIMULATION",
        progressMode: "SOLVE",
      }),
    ).toBe(false);

    expect(
      resolveRemainingSessionTimeMs({
        sessionFamily: "SIMULATION",
        deadlineAt: "2026-04-19T07:00:10.000Z",
        countdownNow: new Date("2026-04-19T07:00:00.000Z").getTime(),
      }),
    ).toBe(10000);
    expect(
      resolveRemainingSessionTimeMs({
        sessionFamily: "DRILL",
        deadlineAt: "2026-04-19T07:00:10.000Z",
        countdownNow: new Date("2026-04-19T07:00:00.000Z").getTime(),
      }),
    ).toBeNull();
  });

  it("resolves simulation review transitions", () => {
    expect(
      resolveSimulationReviewAction({
        sessionFamily: "SIMULATION",
        sessionStatus: "COMPLETED",
        deadlineAt: null,
        progressMode: "SOLVE",
        countdownNow: Date.now(),
      }),
    ).toBe("enter_review");
    expect(
      resolveSimulationReviewAction({
        sessionFamily: "SIMULATION",
        sessionStatus: "IN_PROGRESS",
        deadlineAt: "2026-04-19T07:00:00.000Z",
        progressMode: "SOLVE",
        countdownNow: new Date("2026-04-19T07:00:01.000Z").getTime(),
      }),
    ).toBe("expire_and_enter_review");
    expect(
      resolveSimulationReviewAction({
        sessionFamily: "SIMULATION",
        sessionStatus: "IN_PROGRESS",
        deadlineAt: "2026-04-19T07:00:10.000Z",
        progressMode: "REVIEW",
        countdownNow: new Date("2026-04-19T07:00:01.000Z").getTime(),
      }),
    ).toBe("none");
  });

  it("decides when review-mode solutions should auto-open", () => {
    expect(
      shouldAutoRevealReviewSolution({
        progressMode: "REVIEW",
        activeQuestionId: "q1",
        questionStates: {},
      }),
    ).toBe(true);
    expect(
      shouldAutoRevealReviewSolution({
        progressMode: "REVIEW",
        activeQuestionId: "q1",
        questionStates: {
          q1: {
            solutionViewed: true,
          },
        },
      }),
    ).toBe(false);
  });

  it("builds question-state patches for the main player actions", () => {
    const base: StudyQuestionState = {
      opened: true,
      diagnosis: "METHOD",
    };

    expect(buildRevealSolutionQuestionState(base)).toMatchObject({
      opened: true,
      skipped: false,
      solutionViewed: true,
      diagnosis: "METHOD",
    });
    expect(buildHintViewedQuestionState(base)).toMatchObject({
      opened: true,
      hintViewed: true,
    });
    expect(buildMethodViewedQuestionState(base)).toMatchObject({
      opened: true,
      methodViewed: true,
    });
    expect(buildSkippedQuestionState(base)).toMatchObject({
      opened: true,
      completed: false,
      skipped: true,
    });
    expect(
      buildCompletedQuestionState({
        current: base,
        progressMode: "REVIEW",
      }),
    ).toMatchObject({
      opened: true,
      completed: true,
      skipped: false,
      solutionViewed: true,
    });
  });

  it("builds reflection and diagnosis states with review-aware completion rules", () => {
    const current: StudyQuestionState = {
      diagnosis: "METHOD",
      solutionViewed: false,
    };

    expect(
      buildReflectionQuestionState({
        current,
        reflection: "MISSED",
        progressMode: "SOLVE",
        complete: false,
      }),
    ).toMatchObject({
      opened: true,
      reflection: "MISSED",
      diagnosis: "METHOD",
      solutionViewed: false,
    });
    expect(
      buildReflectionQuestionState({
        current,
        reflection: "HARD",
        progressMode: "REVIEW",
        complete: true,
      }),
    ).toMatchObject({
      opened: true,
      completed: true,
      skipped: false,
      reflection: "HARD",
      diagnosis: null,
      solutionViewed: true,
    });
    expect(
      buildDiagnosisQuestionState({
        current,
        diagnosis: "DETAIL",
        progressMode: "REVIEW",
        complete: false,
      }),
    ).toMatchObject({
      opened: true,
      diagnosis: "DETAIL",
      solutionViewed: true,
    });
  });

  it("decides when reflection and diagnosis stay on the current question", () => {
    expect(
      shouldStayOnCurrentQuestionAfterReflection({
        reflection: "MISSED",
        progressMode: "SOLVE",
        sessionFamily: "DRILL",
      }),
    ).toBe(true);
    expect(
      shouldStayOnCurrentQuestionAfterReflection({
        reflection: "HARD",
        progressMode: "SOLVE",
        sessionFamily: "DRILL",
      }),
    ).toBe(false);
    expect(
      shouldStayOnCurrentQuestionAfterDiagnosis({
        progressMode: "REVIEW",
        sessionFamily: "DRILL",
      }),
    ).toBe(true);
    expect(
      shouldStayOnCurrentQuestionAfterDiagnosis({
        progressMode: "SOLVE",
        sessionFamily: "DRILL",
      }),
    ).toBe(false);
  });

  it("resolves progression plans for transition, checkpoint, completion, and review-switch cases", () => {
    expect(
      resolveQuestionProgressPlan({
        activeExerciseId: "exercise-1",
        nextRef: {
          exerciseId: "exercise-1",
          questionId: "q2",
        },
        firstRef: {
          exerciseId: "exercise-1",
          questionId: "q1",
        },
        sessionFamily: "DRILL",
        progressMode: "SOLVE",
      }),
    ).toEqual({
      kind: "transition",
      nextRef: {
        exerciseId: "exercise-1",
        questionId: "q2",
      },
    });

    expect(
      resolveQuestionProgressPlan({
        activeExerciseId: "exercise-1",
        nextRef: {
          exerciseId: "exercise-2",
          questionId: "q3",
        },
        firstRef: {
          exerciseId: "exercise-1",
          questionId: "q1",
        },
        sessionFamily: "DRILL",
        progressMode: "SOLVE",
      }),
    ).toEqual({
      kind: "checkpoint",
      exerciseId: "exercise-1",
    });

    expect(
      resolveQuestionProgressPlan({
        activeExerciseId: "exercise-2",
        nextRef: null,
        firstRef: {
          exerciseId: "exercise-1",
          questionId: "q1",
        },
        sessionFamily: "SIMULATION",
        progressMode: "SOLVE",
        switchToReviewOnEnd: true,
      }),
    ).toEqual({
      kind: "switch_to_review",
      firstRef: {
        exerciseId: "exercise-1",
        questionId: "q1",
      },
    });

    expect(
      resolveQuestionProgressPlan({
        activeExerciseId: "exercise-2",
        nextRef: null,
        firstRef: null,
        sessionFamily: "DRILL",
        progressMode: "SOLVE",
      }),
    ).toEqual({
      kind: "completion",
    });
  });
});
