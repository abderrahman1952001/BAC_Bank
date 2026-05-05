import { Bookmark, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudentExerciseStateResponse } from "@/lib/study-api";
import {
  getStudentExerciseStateFlags,
} from "@/lib/study-exercise-state";

export function StudyExerciseStateActions({
  state,
  pending,
  onToggleBookmark,
  onToggleFlag,
}: {
  state?: StudentExerciseStateResponse;
  pending?: boolean;
  onToggleBookmark: () => void;
  onToggleFlag: () => void;
}) {
  const { isBookmarked, isFlagged } = getStudentExerciseStateFlags(state);

  return (
    <>
      <Button
        type="button"
        variant={isBookmarked ? "secondary" : "outline"}
        className="h-10 rounded-full px-4"
        onClick={onToggleBookmark}
        disabled={pending}
      >
        <Bookmark data-icon="inline-start" aria-hidden="true" />
        {isBookmarked ? "محفوظ" : "حفظ"}
      </Button>
      <Button
        type="button"
        variant={isFlagged ? "secondary" : "outline"}
        className="h-10 rounded-full px-4"
        onClick={onToggleFlag}
        disabled={pending}
      >
        <Flag data-icon="inline-start" aria-hidden="true" />
        {isFlagged ? "للمراجعة" : "علّم للمراجعة"}
      </Button>
    </>
  );
}
