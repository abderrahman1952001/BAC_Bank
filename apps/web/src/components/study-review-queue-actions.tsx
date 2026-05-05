"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type StudyReviewQueueStatus,
  updateStudyReviewQueueStatus,
} from "@/lib/study-api";
import { Button } from "@/components/ui/button";

const defaultStatusLabels: Record<Exclude<StudyReviewQueueStatus, "OPEN">, string> = {
  DONE: "تمت المراجعة",
  SNOOZED: "لاحقاً",
  REMOVED: "إخفاء",
};

export function StudyReviewQueueActions({
  exerciseNodeId,
  questionNodeId,
  statuses,
  labels,
  refreshAfterUpdate = true,
  onUpdated,
}: {
  exerciseNodeId: string;
  questionNodeId?: string | null;
  statuses: Array<Exclude<StudyReviewQueueStatus, "OPEN">>;
  labels?: Partial<Record<Exclude<StudyReviewQueueStatus, "OPEN">, string>>;
  refreshAfterUpdate?: boolean;
  onUpdated?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<StudyReviewQueueStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(status: Exclude<StudyReviewQueueStatus, "OPEN">) {
    setPendingStatus(status);
    setError(null);

    try {
      await updateStudyReviewQueueStatus({
        exerciseNodeId,
        questionNodeId: questionNodeId ?? null,
        status,
      });

      await onUpdated?.();

      if (refreshAfterUpdate) {
        router.refresh();
      }
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "تعذر تحديث حالة المراجعة.",
      );
    } finally {
      setPendingStatus(null);
    }
  }

  return (
    <>
      <div className="study-action-row">
        {statuses.map((status) => (
          <Button
            key={status}
            type="button"
            variant="outline"
            className="h-10 rounded-full px-4"
            onClick={() => {
              void handleStatusChange(status);
            }}
            disabled={pendingStatus !== null}
          >
            {pendingStatus === status
              ? "جارٍ التحديث..."
              : labels?.[status] ?? defaultStatusLabels[status]}
          </Button>
        ))}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </>
  );
}
