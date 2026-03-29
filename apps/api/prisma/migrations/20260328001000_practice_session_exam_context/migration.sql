ALTER TABLE "practice_session_exercises"
ADD COLUMN "exam_id" UUID;

CREATE INDEX "practice_session_exercises_exam_id_idx"
ON "practice_session_exercises"("exam_id");

ALTER TABLE "practice_session_exercises"
ADD CONSTRAINT "practice_session_exercises_exam_id_fkey"
FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
