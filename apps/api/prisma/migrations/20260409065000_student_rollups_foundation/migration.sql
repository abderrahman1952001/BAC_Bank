CREATE TYPE "StudentMasteryBucket" AS ENUM (
    'NEW',
    'WATCH',
    'WEAK',
    'RECOVERING',
    'SOLID'
);

CREATE TABLE "student_topic_rollups" (
    "user_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "attempted_questions" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "revealed_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "hard_count" INTEGER NOT NULL DEFAULT 0,
    "missed_count" INTEGER NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMP(3),
    "weakness_score" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "mastery_bucket" "StudentMasteryBucket" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_topic_rollups_pkey" PRIMARY KEY ("user_id", "topic_id")
);

CREATE TABLE "student_skill_rollups" (
    "user_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "attempted_questions" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "revealed_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "hard_count" INTEGER NOT NULL DEFAULT 0,
    "missed_count" INTEGER NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMP(3),
    "weakness_score" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "mastery_bucket" "StudentMasteryBucket" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_skill_rollups_pkey" PRIMARY KEY ("user_id", "skill_id")
);

CREATE INDEX "student_topic_rollups_topic_id_idx"
ON "student_topic_rollups"("topic_id");

CREATE INDEX "student_topic_rollups_user_id_mastery_bucket_idx"
ON "student_topic_rollups"("user_id", "mastery_bucket");

CREATE INDEX "student_topic_rollups_user_id_weakness_score_idx"
ON "student_topic_rollups"("user_id", "weakness_score");

CREATE INDEX "student_topic_rollups_user_id_last_seen_at_idx"
ON "student_topic_rollups"("user_id", "last_seen_at");

CREATE INDEX "student_skill_rollups_skill_id_idx"
ON "student_skill_rollups"("skill_id");

CREATE INDEX "student_skill_rollups_user_id_mastery_bucket_idx"
ON "student_skill_rollups"("user_id", "mastery_bucket");

CREATE INDEX "student_skill_rollups_user_id_weakness_score_idx"
ON "student_skill_rollups"("user_id", "weakness_score");

CREATE INDEX "student_skill_rollups_user_id_last_seen_at_idx"
ON "student_skill_rollups"("user_id", "last_seen_at");

ALTER TABLE "student_topic_rollups"
ADD CONSTRAINT "student_topic_rollups_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_topic_rollups"
ADD CONSTRAINT "student_topic_rollups_topic_id_fkey"
FOREIGN KEY ("topic_id") REFERENCES "topics"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_skill_rollups"
ADD CONSTRAINT "student_skill_rollups_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_skill_rollups"
ADD CONSTRAINT "student_skill_rollups_skill_id_fkey"
FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
