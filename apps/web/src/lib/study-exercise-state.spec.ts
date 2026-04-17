import { describe, expect, it } from "vitest";
import {
  buildStudentExerciseStateMap,
  describeStudentExerciseState,
  getStudentExerciseStateFlags,
} from "@/lib/study-exercise-state";

describe("study exercise state helpers", () => {
  it("maps saved exercise state rows by exercise node id", () => {
    const result = buildStudentExerciseStateMap([
      {
        exerciseNodeId: "exercise-1",
        bookmarkedAt: "2026-04-09T09:00:00.000Z",
        flaggedAt: null,
        updatedAt: "2026-04-09T09:00:00.000Z",
      },
      {
        exerciseNodeId: "exercise-2",
        bookmarkedAt: null,
        flaggedAt: "2026-04-09T10:00:00.000Z",
        updatedAt: "2026-04-09T10:00:00.000Z",
      },
    ]);

    expect(Object.keys(result)).toEqual(["exercise-1", "exercise-2"]);
    expect(result["exercise-2"]?.flaggedAt).toBe("2026-04-09T10:00:00.000Z");
  });

  it("describes bookmarked and review-only states explicitly", () => {
    expect(
      describeStudentExerciseState({
        exerciseNodeId: "exercise-1",
        bookmarkedAt: "2026-04-09T09:00:00.000Z",
        flaggedAt: "2026-04-09T10:00:00.000Z",
        updatedAt: "2026-04-09T10:00:00.000Z",
      }),
    ).toEqual({
      label: "محفوظ للمراجعة",
      tone: "brand",
    });
    expect(
      getStudentExerciseStateFlags({
        exerciseNodeId: "exercise-2",
        bookmarkedAt: null,
        flaggedAt: "2026-04-09T10:00:00.000Z",
        updatedAt: "2026-04-09T10:00:00.000Z",
      }),
    ).toEqual({
      isBookmarked: false,
      isFlagged: true,
    });
  });
});
