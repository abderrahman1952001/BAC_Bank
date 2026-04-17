import type { StudentExerciseStateResponse } from "@/lib/study-api";

export type StudentExerciseStateMap = Record<
  string,
  StudentExerciseStateResponse
>;

export function buildStudentExerciseStateMap(
  states: StudentExerciseStateResponse[],
): StudentExerciseStateMap {
  return Object.fromEntries(
    states.map((state) => [state.exerciseNodeId, state] as const),
  );
}

export function getStudentExerciseStateFlags(
  state: StudentExerciseStateResponse | null | undefined,
) {
  return {
    isBookmarked: Boolean(state?.bookmarkedAt),
    isFlagged: Boolean(state?.flaggedAt),
  };
}

export function describeStudentExerciseState(
  state: StudentExerciseStateResponse | null | undefined,
) {
  const { isBookmarked, isFlagged } = getStudentExerciseStateFlags(state);

  if (isBookmarked && isFlagged) {
    return {
      label: "محفوظ للمراجعة",
      tone: "brand" as const,
    };
  }

  if (isFlagged) {
    return {
      label: "للمراجعة",
      tone: "brand" as const,
    };
  }

  if (isBookmarked) {
    return {
      label: "محفوظ",
      tone: "neutral" as const,
    };
  }

  return {
    label: "غير محفوظ",
    tone: "neutral" as const,
  };
}
