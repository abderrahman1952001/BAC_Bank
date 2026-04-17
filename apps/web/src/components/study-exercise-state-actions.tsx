import { Bookmark, Flag } from "lucide-react";
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
      <button
        type="button"
        className={isBookmarked ? "study-toggle-button active" : "study-toggle-button"}
        onClick={onToggleBookmark}
        disabled={pending}
      >
        <Bookmark size={16} aria-hidden="true" />
        {isBookmarked ? "محفوظ" : "حفظ"}
      </button>
      <button
        type="button"
        className={isFlagged ? "study-toggle-button active" : "study-toggle-button"}
        onClick={onToggleFlag}
        disabled={pending}
      >
        <Flag size={16} aria-hidden="true" />
        {isFlagged ? "للمراجعة" : "علّم للمراجعة"}
      </button>
    </>
  );
}
