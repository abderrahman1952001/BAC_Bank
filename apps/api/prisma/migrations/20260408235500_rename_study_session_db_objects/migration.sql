ALTER TYPE "PracticeSessionStatus" RENAME TO "StudySessionStatus";
ALTER TYPE "PracticeSessionFamily" RENAME TO "StudySessionFamily";
ALTER TYPE "PracticeSessionKind" RENAME TO "StudySessionKind";

ALTER TABLE "practice_sessions" RENAME TO "study_sessions";
ALTER TABLE "practice_session_exercises" RENAME TO "study_session_exercises";

ALTER TABLE "study_sessions"
RENAME CONSTRAINT "practice_sessions_pkey" TO "study_sessions_pkey";

ALTER TABLE "study_sessions"
RENAME CONSTRAINT "practice_sessions_requested_exercise_count_check" TO "study_sessions_requested_exercise_count_check";

ALTER TABLE "study_sessions"
RENAME CONSTRAINT "practice_sessions_user_id_fkey" TO "study_sessions_user_id_fkey";

ALTER TABLE "study_sessions"
RENAME CONSTRAINT "practice_sessions_source_exam_id_fkey" TO "study_sessions_source_exam_id_fkey";

ALTER INDEX "practice_sessions_status_created_at_idx"
RENAME TO "study_sessions_status_created_at_idx";

ALTER INDEX "practice_sessions_user_id_created_at_idx"
RENAME TO "study_sessions_user_id_created_at_idx";

ALTER INDEX "practice_sessions_user_id_family_created_at_idx"
RENAME TO "study_sessions_user_id_family_created_at_idx";

ALTER INDEX "practice_sessions_user_id_last_interacted_at_idx"
RENAME TO "study_sessions_user_id_last_interacted_at_idx";

ALTER INDEX "practice_sessions_source_exam_id_idx"
RENAME TO "study_sessions_source_exam_id_idx";

ALTER TABLE "study_session_exercises"
RENAME CONSTRAINT "practice_session_exercises_pkey" TO "study_session_exercises_pkey";

ALTER TABLE "study_session_exercises"
RENAME CONSTRAINT "practice_session_exercises_session_id_fkey" TO "study_session_exercises_session_id_fkey";

ALTER TABLE "study_session_exercises"
RENAME CONSTRAINT "practice_session_exercises_exercise_node_id_fkey" TO "study_session_exercises_exercise_node_id_fkey";

ALTER TABLE "study_session_exercises"
RENAME CONSTRAINT "practice_session_exercises_exam_id_fkey" TO "study_session_exercises_exam_id_fkey";

ALTER INDEX "practice_session_exercises_session_id_order_index_key"
RENAME TO "study_session_exercises_session_id_order_index_key";

ALTER INDEX "practice_session_exercises_exercise_node_id_idx"
RENAME TO "study_session_exercises_exercise_node_id_idx";

ALTER INDEX "practice_session_exercises_exam_id_idx"
RENAME TO "study_session_exercises_exam_id_idx";
