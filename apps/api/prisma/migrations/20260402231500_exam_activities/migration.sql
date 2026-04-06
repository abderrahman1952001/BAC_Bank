-- Track recently opened official exams per user.
CREATE TABLE "exam_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "sujet_number" INTEGER NOT NULL,
    "total_question_count" INTEGER NOT NULL DEFAULT 0,
    "completed_question_count" INTEGER NOT NULL DEFAULT 0,
    "opened_question_count" INTEGER NOT NULL DEFAULT 0,
    "solution_viewed_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_activities_user_id_exam_id_sujet_number_key"
ON "exam_activities"("user_id", "exam_id", "sujet_number");

CREATE INDEX "exam_activities_exam_id_idx"
ON "exam_activities"("exam_id");

CREATE INDEX "exam_activities_user_id_last_opened_at_idx"
ON "exam_activities"("user_id", "last_opened_at");

ALTER TABLE "exam_activities"
ADD CONSTRAINT "exam_activities_sujet_number_check"
CHECK ("sujet_number" IN (1, 2));

ALTER TABLE "exam_activities"
ADD CONSTRAINT "exam_activities_total_question_count_check"
CHECK ("total_question_count" >= 0);

ALTER TABLE "exam_activities"
ADD CONSTRAINT "exam_activities_completed_question_count_check"
CHECK ("completed_question_count" >= 0);

ALTER TABLE "exam_activities"
ADD CONSTRAINT "exam_activities_opened_question_count_check"
CHECK ("opened_question_count" >= 0);

ALTER TABLE "exam_activities"
ADD CONSTRAINT "exam_activities_solution_viewed_count_check"
CHECK ("solution_viewed_count" >= 0);

ALTER TABLE "exam_activities"
ADD CONSTRAINT "exam_activities_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_activities"
ADD CONSTRAINT "exam_activities_exam_id_fkey"
FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
