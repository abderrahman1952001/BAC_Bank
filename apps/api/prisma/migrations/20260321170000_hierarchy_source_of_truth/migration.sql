DROP TABLE IF EXISTS "practice_session_exercises";

CREATE TABLE "exam_node_topics" (
    "node_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "weight" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "exam_node_topics_pkey" PRIMARY KEY ("node_id", "topic_id")
);

CREATE INDEX "exam_node_topics_topic_id_idx" ON "exam_node_topics"("topic_id");

ALTER TABLE "exam_node_topics"
  ADD CONSTRAINT "exam_node_topics_node_id_fkey"
  FOREIGN KEY ("node_id") REFERENCES "exam_nodes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_node_topics"
  ADD CONSTRAINT "exam_node_topics_topic_id_fkey"
  FOREIGN KEY ("topic_id") REFERENCES "topics"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "practice_session_exercises" (
    "session_id" UUID NOT NULL,
    "exercise_node_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "practice_session_exercises_pkey" PRIMARY KEY ("session_id", "exercise_node_id")
);

CREATE UNIQUE INDEX "practice_session_exercises_session_id_order_index_key"
  ON "practice_session_exercises"("session_id", "order_index");

CREATE INDEX "practice_session_exercises_exercise_node_id_idx"
  ON "practice_session_exercises"("exercise_node_id");

ALTER TABLE "practice_session_exercises"
  ADD CONSTRAINT "practice_session_exercises_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "practice_session_exercises"
  ADD CONSTRAINT "practice_session_exercises_exercise_node_id_fkey"
  FOREIGN KEY ("exercise_node_id") REFERENCES "exam_nodes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "user_attempts";
DROP TABLE IF EXISTS "question_topics";
DROP TABLE IF EXISTS "answers";
DROP TABLE IF EXISTS "question_assets";
DROP TABLE IF EXISTS "question_contents";
DROP TABLE IF EXISTS "questions";
DROP TABLE IF EXISTS "exercises";

DROP TYPE IF EXISTS "AssetType";
DROP TYPE IF EXISTS "ContentFormat";
