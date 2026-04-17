CREATE TYPE "StudySessionResumeMode" AS ENUM ('SOLVE', 'REVIEW');

CREATE TYPE "StudyQuestionAnswerState" AS ENUM (
  'UNSEEN',
  'OPENED',
  'ANSWERED',
  'REVEALED',
  'SKIPPED'
);

CREATE TYPE "StudyQuestionResultStatus" AS ENUM (
  'CORRECT',
  'PARTIAL',
  'INCORRECT',
  'UNKNOWN'
);

CREATE TYPE "StudyQuestionEvaluationMode" AS ENUM (
  'AUTO',
  'MANUAL',
  'SELF_ASSESSED',
  'UNGRADED'
);

CREATE TYPE "StudyQuestionReflection" AS ENUM (
  'MISSED',
  'HARD',
  'MEDIUM',
  'EASY'
);

ALTER TABLE "study_sessions"
ADD COLUMN "resume_mode" "StudySessionResumeMode" NOT NULL DEFAULT 'SOLVE';

UPDATE "study_sessions"
SET "resume_mode" = CASE
  WHEN COALESCE("progress_json"->>'mode', 'SOLVE') = 'REVIEW'
    THEN 'REVIEW'::"StudySessionResumeMode"
  ELSE 'SOLVE'::"StudySessionResumeMode"
END;

ALTER TABLE "study_session_exercises"
ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN "first_opened_at" TIMESTAMP(3),
ADD COLUMN "last_interacted_at" TIMESTAMP(3),
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "study_session_exercises"
DROP CONSTRAINT "study_session_exercises_pkey";

ALTER TABLE "study_session_exercises"
ADD CONSTRAINT "study_session_exercises_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "study_session_exercises_session_id_exercise_node_id_key"
ON "study_session_exercises"("session_id", "exercise_node_id");

CREATE TABLE "study_session_questions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_exercise_id" UUID NOT NULL,
  "question_node_id" UUID NOT NULL,
  "sequence_index" INTEGER NOT NULL,
  "answer_state" "StudyQuestionAnswerState" NOT NULL DEFAULT 'UNSEEN',
  "result_status" "StudyQuestionResultStatus" NOT NULL DEFAULT 'UNKNOWN',
  "evaluation_mode" "StudyQuestionEvaluationMode" NOT NULL DEFAULT 'UNGRADED',
  "first_opened_at" TIMESTAMP(3),
  "last_interacted_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "skipped_at" TIMESTAMP(3),
  "solution_viewed_at" TIMESTAMP(3),
  "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
  "reveal_count" INTEGER NOT NULL DEFAULT 0,
  "reflection" "StudyQuestionReflection",
  "answer_payload_json" JSONB,
  "finalized_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "study_session_questions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "study_session_questions_session_exercise_id_question_node_id_key"
ON "study_session_questions"("session_exercise_id", "question_node_id");

CREATE UNIQUE INDEX "study_session_questions_session_exercise_id_sequence_index_key"
ON "study_session_questions"("session_exercise_id", "sequence_index");

CREATE INDEX "study_session_questions_question_node_id_idx"
ON "study_session_questions"("question_node_id");

ALTER TABLE "study_session_questions"
ADD CONSTRAINT "study_session_questions_session_exercise_id_fkey"
FOREIGN KEY ("session_exercise_id") REFERENCES "study_session_exercises"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "study_session_questions"
ADD CONSTRAINT "study_session_questions_question_node_id_fkey"
FOREIGN KEY ("question_node_id") REFERENCES "exam_nodes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

WITH RECURSIVE "session_question_tree" AS (
  SELECT
    "study_session_exercises"."id" AS "session_exercise_id",
    "exam_nodes"."id" AS "node_id",
    "exam_nodes"."node_type" AS "node_type",
    ARRAY["exam_nodes"."order_index"]::INTEGER[] AS "order_path"
  FROM "study_session_exercises"
  JOIN "exam_nodes"
    ON "exam_nodes"."parent_id" = "study_session_exercises"."exercise_node_id"

  UNION ALL

  SELECT
    "session_question_tree"."session_exercise_id",
    "exam_nodes"."id" AS "node_id",
    "exam_nodes"."node_type" AS "node_type",
    "session_question_tree"."order_path" || "exam_nodes"."order_index"
  FROM "session_question_tree"
  JOIN "exam_nodes"
    ON "exam_nodes"."parent_id" = "session_question_tree"."node_id"
),
"ordered_session_questions" AS (
  SELECT
    gen_random_uuid() AS "id",
    "session_exercise_id",
    "node_id" AS "question_node_id",
    ROW_NUMBER() OVER (
      PARTITION BY "session_exercise_id"
      ORDER BY "order_path", "node_id"
    ) AS "sequence_index"
  FROM "session_question_tree"
  WHERE "node_type" IN ('QUESTION', 'SUBQUESTION')
)
INSERT INTO "study_session_questions" (
  "id",
  "session_exercise_id",
  "question_node_id",
  "sequence_index"
)
SELECT
  "id",
  "session_exercise_id",
  "question_node_id",
  "sequence_index"
FROM "ordered_session_questions";

WITH "session_question_progress" AS (
  SELECT
    "study_session_questions"."id" AS "session_question_id",
    COALESCE(("state_item"->>'opened')::BOOLEAN, FALSE) AS "opened",
    COALESCE(("state_item"->>'completed')::BOOLEAN, FALSE) AS "completed",
    COALESCE(("state_item"->>'skipped')::BOOLEAN, FALSE) AS "skipped",
    COALESCE(("state_item"->>'solutionViewed')::BOOLEAN, FALSE) AS "solution_viewed",
    COALESCE("study_sessions"."started_at", "study_sessions"."created_at") AS "opened_at",
    COALESCE(
      "study_sessions"."completed_at",
      "study_sessions"."last_interacted_at",
      "study_sessions"."updated_at",
      "study_sessions"."created_at"
    ) AS "completed_marker_at",
    COALESCE(
      "study_sessions"."last_interacted_at",
      "study_sessions"."updated_at",
      "study_sessions"."created_at"
    ) AS "interacted_at"
  FROM "study_sessions"
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE("study_sessions"."progress_json"->'questionStates', '[]'::JSONB)
  ) AS "state_item"
  JOIN "study_session_exercises"
    ON "study_session_exercises"."session_id" = "study_sessions"."id"
  JOIN "study_session_questions"
    ON "study_session_questions"."session_exercise_id" = "study_session_exercises"."id"
   AND "study_session_questions"."question_node_id" = ("state_item"->>'questionId')::UUID
)
UPDATE "study_session_questions"
SET
  "answer_state" = CASE
    WHEN "session_question_progress"."skipped"
      THEN 'SKIPPED'::"StudyQuestionAnswerState"
    WHEN "session_question_progress"."completed"
      THEN 'ANSWERED'::"StudyQuestionAnswerState"
    WHEN "session_question_progress"."solution_viewed"
      THEN 'REVEALED'::"StudyQuestionAnswerState"
    WHEN "session_question_progress"."opened"
      THEN 'OPENED'::"StudyQuestionAnswerState"
    ELSE 'UNSEEN'::"StudyQuestionAnswerState"
  END,
  "first_opened_at" = CASE
    WHEN
      "session_question_progress"."opened" OR
      "session_question_progress"."completed" OR
      "session_question_progress"."skipped" OR
      "session_question_progress"."solution_viewed"
      THEN "session_question_progress"."opened_at"
    ELSE NULL
  END,
  "last_interacted_at" = CASE
    WHEN
      "session_question_progress"."opened" OR
      "session_question_progress"."completed" OR
      "session_question_progress"."skipped" OR
      "session_question_progress"."solution_viewed"
      THEN "session_question_progress"."interacted_at"
    ELSE NULL
  END,
  "completed_at" = CASE
    WHEN "session_question_progress"."completed"
      THEN "session_question_progress"."completed_marker_at"
    ELSE NULL
  END,
  "skipped_at" = CASE
    WHEN "session_question_progress"."skipped"
      THEN "session_question_progress"."interacted_at"
    ELSE NULL
  END,
  "solution_viewed_at" = CASE
    WHEN "session_question_progress"."solution_viewed"
      THEN "session_question_progress"."interacted_at"
    ELSE NULL
  END,
  "reveal_count" = CASE
    WHEN "session_question_progress"."solution_viewed" THEN 1
    ELSE 0
  END,
  "finalized_at" = CASE
    WHEN "session_question_progress"."completed" OR "session_question_progress"."skipped"
      THEN "session_question_progress"."completed_marker_at"
    ELSE NULL
  END,
  "updated_at" = "session_question_progress"."interacted_at"
FROM "session_question_progress"
WHERE "study_session_questions"."id" = "session_question_progress"."session_question_id";

WITH "exercise_question_rollups" AS (
  SELECT
    "study_session_questions"."session_exercise_id",
    MIN("study_session_questions"."first_opened_at") AS "first_opened_at",
    MAX("study_session_questions"."last_interacted_at") AS "last_interacted_at",
    MAX(COALESCE("study_session_questions"."completed_at", "study_session_questions"."skipped_at")) AS "resolved_at",
    COUNT(*) AS "question_count",
    COUNT(*) FILTER (
      WHERE
        "study_session_questions"."completed_at" IS NOT NULL OR
        "study_session_questions"."skipped_at" IS NOT NULL
    ) AS "resolved_question_count"
  FROM "study_session_questions"
  GROUP BY "study_session_questions"."session_exercise_id"
)
UPDATE "study_session_exercises"
SET
  "first_opened_at" = "exercise_question_rollups"."first_opened_at",
  "last_interacted_at" = "exercise_question_rollups"."last_interacted_at",
  "completed_at" = CASE
    WHEN
      "exercise_question_rollups"."question_count" > 0 AND
      "exercise_question_rollups"."resolved_question_count" = "exercise_question_rollups"."question_count"
      THEN "exercise_question_rollups"."resolved_at"
    ELSE NULL
  END,
  "updated_at" = COALESCE(
    "exercise_question_rollups"."last_interacted_at",
    "study_session_exercises"."created_at"
  )
FROM "exercise_question_rollups"
WHERE "study_session_exercises"."id" = "exercise_question_rollups"."session_exercise_id";

ALTER TABLE "study_sessions"
DROP COLUMN "progress_json";
