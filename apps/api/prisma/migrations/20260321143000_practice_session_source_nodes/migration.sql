ALTER TABLE "practice_session_exercises"
ADD COLUMN "source_variant_id" UUID,
ADD COLUMN "source_exercise_node_id" UUID,
ADD COLUMN "question_node_map_json" JSONB;

CREATE INDEX "practice_session_exercises_source_variant_id_idx"
ON "practice_session_exercises"("source_variant_id");

CREATE INDEX "practice_session_exercises_source_exercise_node_id_idx"
ON "practice_session_exercises"("source_exercise_node_id");

ALTER TABLE "practice_session_exercises"
ADD CONSTRAINT "practice_session_exercises_source_variant_id_fkey"
FOREIGN KEY ("source_variant_id") REFERENCES "exam_variants"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "practice_session_exercises"
ADD CONSTRAINT "practice_session_exercises_source_exercise_node_id_fkey"
FOREIGN KEY ("source_exercise_node_id") REFERENCES "exam_nodes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
