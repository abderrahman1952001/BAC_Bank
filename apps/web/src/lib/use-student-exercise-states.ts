"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudentExerciseStateResponse } from "@/lib/study-api";
import {
  fetchStudentExerciseStatesLookup,
  upsertStudentExerciseState,
} from "@/lib/study-api";
import { buildStudentExerciseStateMap } from "@/lib/study-exercise-state";

function normalizeExerciseNodeIds(exerciseNodeIds: string[]) {
  return Array.from(
    new Set(exerciseNodeIds.filter((exerciseNodeId) => Boolean(exerciseNodeId))),
  );
}

export function useStudentExerciseStates({
  exerciseNodeIds,
  initialStates,
}: {
  exerciseNodeIds: string[];
  initialStates?: StudentExerciseStateResponse[];
}) {
  const [exerciseStatesById, setExerciseStatesById] = useState(() =>
    buildStudentExerciseStateMap(initialStates ?? []),
  );
  const [pendingExerciseIds, setPendingExerciseIds] = useState<
    Record<string, boolean>
  >({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExerciseStatesById(buildStudentExerciseStateMap(initialStates ?? []));
  }, [initialStates]);

  const normalizedExerciseNodeIds = useMemo(
    () => normalizeExerciseNodeIds(exerciseNodeIds),
    [exerciseNodeIds],
  );
  const lookupKey = normalizedExerciseNodeIds.join(":");

  useEffect(() => {
    if (initialStates !== undefined || normalizedExerciseNodeIds.length === 0) {
      return;
    }

    let cancelled = false;

    void fetchStudentExerciseStatesLookup(normalizedExerciseNodeIds)
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setExerciseStatesById(buildStudentExerciseStateMap(payload.data));
      })
      .catch((fetchError) => {
        if (cancelled) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "تعذر تحميل المحفوظات لهذه الصفحة.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [initialStates, lookupKey, normalizedExerciseNodeIds]);

  async function updateExerciseState(
    exerciseNodeId: string,
    input: { bookmarked?: boolean; flagged?: boolean },
  ) {
    setError(null);
    setPendingExerciseIds((current) => ({
      ...current,
      [exerciseNodeId]: true,
    }));

    try {
      const nextState = await upsertStudentExerciseState(exerciseNodeId, input);

      setExerciseStatesById((current) => {
        const next = { ...current };

        if (nextState.bookmarkedAt || nextState.flaggedAt) {
          next[exerciseNodeId] = nextState;
        } else {
          delete next[exerciseNodeId];
        }

        return next;
      });
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "تعذر تحديث حالة الحفظ والمراجعة.",
      );
    } finally {
      setPendingExerciseIds((current) => {
        const next = { ...current };
        delete next[exerciseNodeId];
        return next;
      });
    }
  }

  return {
    exerciseStatesById,
    pendingExerciseIds,
    error,
    toggleBookmark(exerciseNodeId: string) {
      const currentState = exerciseStatesById[exerciseNodeId];
      return updateExerciseState(exerciseNodeId, {
        bookmarked: !Boolean(currentState?.bookmarkedAt),
      });
    },
    toggleFlag(exerciseNodeId: string) {
      const currentState = exerciseStatesById[exerciseNodeId];
      return updateExerciseState(exerciseNodeId, {
        flagged: !Boolean(currentState?.flaggedAt),
      });
    },
  };
}
