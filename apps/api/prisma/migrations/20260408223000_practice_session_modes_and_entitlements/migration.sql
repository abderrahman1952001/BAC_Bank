CREATE TYPE "PracticeSessionFamily" AS ENUM ('DRILL', 'SIMULATION');

CREATE TYPE "PracticeSessionKind" AS ENUM (
    'TOPIC_DRILL',
    'MIXED_DRILL',
    'WEAK_POINT_DRILL',
    'PAPER_SIMULATION'
);

ALTER TYPE "PracticeSessionStatus"
ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "practice_sessions"
ADD COLUMN "family" "PracticeSessionFamily" NOT NULL DEFAULT 'DRILL',
ADD COLUMN "kind" "PracticeSessionKind" NOT NULL DEFAULT 'MIXED_DRILL',
ADD COLUMN "source_exam_id" UUID,
ADD COLUMN "duration_minutes" INTEGER,
ADD COLUMN "started_at" TIMESTAMP(3),
ADD COLUMN "deadline_at" TIMESTAMP(3),
ADD COLUMN "submitted_at" TIMESTAMP(3),
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "last_interacted_at" TIMESTAMP(3),
ADD COLUMN "active_exercise_node_id" UUID,
ADD COLUMN "active_question_node_id" UUID;

UPDATE "practice_sessions"
SET
    "family" = 'DRILL'::"PracticeSessionFamily",
    "kind" = CASE
        WHEN jsonb_typeof(COALESCE("filters_json"->'topicCodes', '[]'::jsonb)) = 'array'
          AND jsonb_array_length(COALESCE("filters_json"->'topicCodes', '[]'::jsonb)) > 0
        THEN 'TOPIC_DRILL'::"PracticeSessionKind"
        ELSE 'MIXED_DRILL'::"PracticeSessionKind"
    END,
    "started_at" = CASE
        WHEN "status" IN ('IN_PROGRESS', 'COMPLETED') THEN "created_at"
        ELSE NULL
    END,
    "completed_at" = CASE
        WHEN "status" = 'COMPLETED' THEN "updated_at"
        ELSE NULL
    END,
    "last_interacted_at" = CASE
        WHEN "status" IN ('IN_PROGRESS', 'COMPLETED') THEN "updated_at"
        ELSE NULL
    END;

CREATE INDEX "practice_sessions_user_id_family_created_at_idx"
ON "practice_sessions"("user_id", "family", "created_at");

CREATE INDEX "practice_sessions_user_id_last_interacted_at_idx"
ON "practice_sessions"("user_id", "last_interacted_at");

CREATE INDEX "practice_sessions_source_exam_id_idx"
ON "practice_sessions"("source_exam_id");

ALTER TABLE "practice_sessions"
ADD CONSTRAINT "practice_sessions_source_exam_id_fkey"
FOREIGN KEY ("source_exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
