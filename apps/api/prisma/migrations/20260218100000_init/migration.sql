CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('NORMAL', 'MAKEUP');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('MARKDOWN', 'HYBRID');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'GRAPH', 'TABLE', 'FILE');

-- CreateTable
CREATE TABLE "streams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stream_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "year" INTEGER NOT NULL,
    "stream_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL,
    "official_source_reference" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_id" UUID NOT NULL,
    "title" TEXT,
    "intro_text" TEXT,
    "order_index" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exercise_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "difficulty_level" INTEGER,
    "content_format" "ContentFormat" NOT NULL DEFAULT 'MARKDOWN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_contents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "content_markdown" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "file_url" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "official_answer_markdown" TEXT NOT NULL,
    "marking_scheme_markdown" TEXT,
    "common_mistakes_markdown" TEXT,
    "examiner_commentary_markdown" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_topics" (
    "question_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "weight" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "question_topics_pkey" PRIMARY KEY ("question_id","topic_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "password_hash" TEXT NOT NULL,
    "stream_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_answer" TEXT,
    "is_correct" BOOLEAN,
    "score_awarded" DECIMAL(5,2),
    "max_score" DECIMAL(5,2),
    "time_spent_seconds" INTEGER,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_topic_stats" (
    "user_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "accuracy_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_topic_stats_pkey" PRIMARY KEY ("user_id","topic_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "streams_code_key" ON "streams"("code");

-- CreateIndex
CREATE UNIQUE INDEX "streams_name_key" ON "streams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");

-- CreateIndex
CREATE INDEX "subjects_stream_id_idx" ON "subjects"("stream_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_stream_id_name_key" ON "subjects"("stream_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_id_stream_id_key" ON "subjects"("id", "stream_id");

-- CreateIndex
CREATE INDEX "exams_year_stream_id_subject_id_idx" ON "exams"("year", "stream_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "exams_year_stream_id_subject_id_session_type_key" ON "exams"("year", "stream_id", "subject_id", "session_type");

-- CreateIndex
CREATE INDEX "exercises_exam_id_idx" ON "exercises"("exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_exam_id_order_index_key" ON "exercises"("exam_id", "order_index");

-- CreateIndex
CREATE INDEX "questions_exercise_id_idx" ON "questions"("exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "questions_exercise_id_order_index_key" ON "questions"("exercise_id", "order_index");

-- CreateIndex
CREATE INDEX "question_contents_question_id_created_at_idx" ON "question_contents"("question_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "question_contents_question_id_version_number_key" ON "question_contents"("question_id", "version_number");

-- CreateIndex
CREATE INDEX "question_assets_question_id_order_index_idx" ON "question_assets"("question_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "answers_question_id_key" ON "answers"("question_id");

-- CreateIndex
CREATE INDEX "topics_subject_id_idx" ON "topics"("subject_id");

-- CreateIndex
CREATE INDEX "topics_parent_id_idx" ON "topics"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "topics_subject_id_code_key" ON "topics"("subject_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "topics_subject_id_parent_id_name_key" ON "topics"("subject_id", "parent_id", "name");

-- CreateIndex
CREATE INDEX "question_topics_topic_id_idx" ON "question_topics"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_stream_id_idx" ON "users"("stream_id");

-- CreateIndex
CREATE INDEX "user_attempts_user_id_question_id_idx" ON "user_attempts"("user_id", "question_id");

-- CreateIndex
CREATE INDEX "user_attempts_question_id_attempted_at_idx" ON "user_attempts"("question_id", "attempted_at");

-- CreateIndex
CREATE INDEX "user_topic_stats_topic_id_idx" ON "user_topic_stats"("topic_id");

-- AddCheckConstraint
ALTER TABLE "exams" ADD CONSTRAINT "exams_year_check" CHECK ("year" BETWEEN 2000 AND 2100);

-- AddCheckConstraint
ALTER TABLE "exams" ADD CONSTRAINT "exams_duration_minutes_check" CHECK ("duration_minutes" > 0);

-- AddCheckConstraint
ALTER TABLE "exams" ADD CONSTRAINT "exams_total_points_check" CHECK ("total_points" >= 0);

-- AddCheckConstraint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_order_index_check" CHECK ("order_index" > 0);

-- AddCheckConstraint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_total_points_check" CHECK ("total_points" >= 0);

-- AddCheckConstraint
ALTER TABLE "questions" ADD CONSTRAINT "questions_order_index_check" CHECK ("order_index" > 0);

-- AddCheckConstraint
ALTER TABLE "questions" ADD CONSTRAINT "questions_points_check" CHECK ("points" >= 0);

-- AddCheckConstraint
ALTER TABLE "questions" ADD CONSTRAINT "questions_difficulty_level_check" CHECK ("difficulty_level" IS NULL OR ("difficulty_level" BETWEEN 1 AND 5));

-- AddCheckConstraint
ALTER TABLE "question_topics" ADD CONSTRAINT "question_topics_weight_check" CHECK ("weight" > 0);

-- AddCheckConstraint
ALTER TABLE "user_attempts" ADD CONSTRAINT "user_attempts_time_spent_seconds_check" CHECK ("time_spent_seconds" IS NULL OR "time_spent_seconds" >= 0);

-- AddCheckConstraint
ALTER TABLE "user_attempts" ADD CONSTRAINT "user_attempts_score_awarded_check" CHECK ("score_awarded" IS NULL OR "score_awarded" >= 0);

-- AddCheckConstraint
ALTER TABLE "user_attempts" ADD CONSTRAINT "user_attempts_max_score_check" CHECK ("max_score" IS NULL OR "max_score" >= 0);

-- AddCheckConstraint
ALTER TABLE "user_attempts" ADD CONSTRAINT "user_attempts_score_vs_max_check" CHECK (
  "score_awarded" IS NULL
  OR "max_score" IS NULL
  OR "score_awarded" <= "max_score"
);

-- AddCheckConstraint
ALTER TABLE "user_topic_stats" ADD CONSTRAINT "user_topic_stats_accuracy_percentage_check" CHECK ("accuracy_percentage" BETWEEN 0 AND 100);

-- AddCheckConstraint
ALTER TABLE "user_topic_stats" ADD CONSTRAINT "user_topic_stats_total_attempts_check" CHECK ("total_attempts" >= 0);

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_subject_id_stream_id_fkey" FOREIGN KEY ("subject_id", "stream_id") REFERENCES "subjects"("id", "stream_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_contents" ADD CONSTRAINT "question_contents_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_assets" ADD CONSTRAINT "question_assets_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_topics" ADD CONSTRAINT "question_topics_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_topics" ADD CONSTRAINT "question_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attempts" ADD CONSTRAINT "user_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attempts" ADD CONSTRAINT "user_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_topic_stats" ADD CONSTRAINT "user_topic_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_topic_stats" ADD CONSTRAINT "user_topic_stats_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
