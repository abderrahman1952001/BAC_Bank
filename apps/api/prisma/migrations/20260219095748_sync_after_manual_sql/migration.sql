-- CreateEnum
CREATE TYPE "IngestionBatchStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PARTIALLY_PUBLISHED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "IngestionDraftStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "IngestionIssueSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- Keep the primary key constraint name stable when this migration is replayed
-- against a database where "subjects" was already normalized manually.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE c.conname = 'subjects_new_pkey'
          AND t.relname = 'subjects'
          AND n.nspname = 'public'
    ) THEN
        ALTER TABLE "public"."subjects" RENAME CONSTRAINT "subjects_new_pkey" TO "subjects_pkey";
    END IF;
END
$$;

-- CreateTable
CREATE TABLE "ingestion_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" TEXT NOT NULL,
    "source_type" TEXT NOT NULL DEFAULT 'PDF_OCR',
    "source_path" TEXT,
    "parser_version" TEXT,
    "ocr_engine" TEXT,
    "status" "IngestionBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "checksum_sha256" TEXT,
    "page_count" INTEGER,
    "language_hint" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_exam_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "document_id" UUID,
    "year" INTEGER NOT NULL,
    "stream_code" TEXT NOT NULL,
    "subject_code" TEXT NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "duration_minutes" INTEGER,
    "total_points" INTEGER,
    "official_source_reference" TEXT,
    "title" TEXT,
    "status" "IngestionDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "review_notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_exam_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_exercise_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_draft_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "title" TEXT,
    "intro_text" TEXT,
    "total_points" INTEGER,
    "status" "IngestionDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "review_notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_exercise_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_question_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exercise_draft_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "points" INTEGER,
    "difficulty_level" INTEGER,
    "content_format" "ContentFormat" NOT NULL DEFAULT 'MARKDOWN',
    "content_markdown" TEXT NOT NULL,
    "official_answer_markdown" TEXT,
    "marking_scheme_markdown" TEXT,
    "common_mistakes_markdown" TEXT,
    "examiner_commentary_markdown" TEXT,
    "source_page_start" INTEGER,
    "source_page_end" INTEGER,
    "status" "IngestionDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "review_notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_question_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_question_asset_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_draft_id" UUID NOT NULL,
    "file_url" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingestion_question_asset_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_question_topic_drafts" (
    "question_draft_id" UUID NOT NULL,
    "topic_code" TEXT NOT NULL,
    "weight" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingestion_question_topic_drafts_pkey" PRIMARY KEY ("question_draft_id","topic_code")
);

-- CreateTable
CREATE TABLE "ingestion_issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "exam_draft_id" UUID,
    "question_draft_id" UUID,
    "severity" "IngestionIssueSeverity" NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "ingestion_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingestion_batches_status_idx" ON "ingestion_batches"("status");

-- CreateIndex
CREATE INDEX "ingestion_batches_created_at_idx" ON "ingestion_batches"("created_at");

-- CreateIndex
CREATE INDEX "ingestion_documents_batch_id_idx" ON "ingestion_documents"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingestion_documents_batch_id_file_name_key" ON "ingestion_documents"("batch_id", "file_name");

-- CreateIndex
CREATE INDEX "ingestion_exam_drafts_batch_id_idx" ON "ingestion_exam_drafts"("batch_id");

-- CreateIndex
CREATE INDEX "ingestion_exam_drafts_document_id_idx" ON "ingestion_exam_drafts"("document_id");

-- CreateIndex
CREATE INDEX "ingestion_exam_drafts_year_stream_code_subject_code_session_idx" ON "ingestion_exam_drafts"("year", "stream_code", "subject_code", "session_type");

-- CreateIndex
CREATE INDEX "ingestion_exercise_drafts_exam_draft_id_idx" ON "ingestion_exercise_drafts"("exam_draft_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingestion_exercise_drafts_exam_draft_id_order_index_key" ON "ingestion_exercise_drafts"("exam_draft_id", "order_index");

-- CreateIndex
CREATE INDEX "ingestion_question_drafts_exercise_draft_id_idx" ON "ingestion_question_drafts"("exercise_draft_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingestion_question_drafts_exercise_draft_id_order_index_key" ON "ingestion_question_drafts"("exercise_draft_id", "order_index");

-- CreateIndex
CREATE INDEX "ingestion_question_asset_drafts_question_draft_id_order_ind_idx" ON "ingestion_question_asset_drafts"("question_draft_id", "order_index");

-- CreateIndex
CREATE INDEX "ingestion_question_topic_drafts_topic_code_idx" ON "ingestion_question_topic_drafts"("topic_code");

-- CreateIndex
CREATE INDEX "ingestion_issues_batch_id_severity_is_resolved_idx" ON "ingestion_issues"("batch_id", "severity", "is_resolved");

-- CreateIndex
CREATE INDEX "ingestion_issues_exam_draft_id_idx" ON "ingestion_issues"("exam_draft_id");

-- CreateIndex
CREATE INDEX "ingestion_issues_question_draft_id_idx" ON "ingestion_issues"("question_draft_id");

-- AddForeignKey
ALTER TABLE "ingestion_documents" ADD CONSTRAINT "ingestion_documents_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ingestion_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_exam_drafts" ADD CONSTRAINT "ingestion_exam_drafts_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ingestion_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_exam_drafts" ADD CONSTRAINT "ingestion_exam_drafts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "ingestion_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_exercise_drafts" ADD CONSTRAINT "ingestion_exercise_drafts_exam_draft_id_fkey" FOREIGN KEY ("exam_draft_id") REFERENCES "ingestion_exam_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_question_drafts" ADD CONSTRAINT "ingestion_question_drafts_exercise_draft_id_fkey" FOREIGN KEY ("exercise_draft_id") REFERENCES "ingestion_exercise_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_question_asset_drafts" ADD CONSTRAINT "ingestion_question_asset_drafts_question_draft_id_fkey" FOREIGN KEY ("question_draft_id") REFERENCES "ingestion_question_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_question_topic_drafts" ADD CONSTRAINT "ingestion_question_topic_drafts_question_draft_id_fkey" FOREIGN KEY ("question_draft_id") REFERENCES "ingestion_question_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_issues" ADD CONSTRAINT "ingestion_issues_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ingestion_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_issues" ADD CONSTRAINT "ingestion_issues_exam_draft_id_fkey" FOREIGN KEY ("exam_draft_id") REFERENCES "ingestion_exam_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_issues" ADD CONSTRAINT "ingestion_issues_question_draft_id_fkey" FOREIGN KEY ("question_draft_id") REFERENCES "ingestion_question_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
