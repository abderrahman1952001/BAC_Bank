"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  recordStudyReviewQueueOutcome,
  type StudyReviewOutcome,
} from "@/lib/study-api";
import { Button } from "@/components/ui/button";

const defaultOutcomeLabels: Record<StudyReviewOutcome, string> = {
  CORRECT: "ثبتها اليوم",
  INCORRECT: "تحتاج إعادة",
};

export function StudyReviewOutcomeActions({
  exerciseNodeId,
  questionNodeId,
  outcomes = ["CORRECT", "INCORRECT"],
  labels,
  refreshAfterUpdate = true,
  onUpdated,
}: {
  exerciseNodeId: string;
  questionNodeId?: string | null;
  outcomes?: StudyReviewOutcome[];
  labels?: Partial<Record<StudyReviewOutcome, string>>;
  refreshAfterUpdate?: boolean;
  onUpdated?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [pendingOutcome, setPendingOutcome] = useState<StudyReviewOutcome | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleOutcome(outcome: StudyReviewOutcome) {
    setPendingOutcome(outcome);
    setError(null);

    try {
      await recordStudyReviewQueueOutcome({
        exerciseNodeId,
        questionNodeId: questionNodeId ?? null,
        outcome,
      });

      await onUpdated?.();

      if (refreshAfterUpdate) {
        router.refresh();
      }
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "تعذر تسجيل نتيجة المراجعة.",
      );
    } finally {
      setPendingOutcome(null);
    }
  }

  return (
    <>
      <div className="study-action-row">
        {outcomes.map((outcome) => (
          <Button
            key={outcome}
            type="button"
            variant="outline"
            className="h-10 rounded-full px-4"
            onClick={() => {
              void handleOutcome(outcome);
            }}
            disabled={pendingOutcome !== null}
          >
            {pendingOutcome === outcome
              ? "جارٍ الحفظ..."
              : labels?.[outcome] ?? defaultOutcomeLabels[outcome]}
          </Button>
        ))}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </>
  );
}
