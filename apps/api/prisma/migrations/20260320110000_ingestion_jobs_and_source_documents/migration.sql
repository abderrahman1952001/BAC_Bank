-- Reintroduce ingestion workflow with source storage and JSON draft review.

-- CreateEnum
CREATE TYPE "IngestionJobStatus" AS ENUM (
    'DRAFT',
    'IN_REVIEW',
    'APPROVED',
    'PUBLISHED',
    'FAILED'
);

-- CreateEnum
CREATE TYPE "SourceDocumentKind" AS ENUM ('EXAM', 'CORRECTION');

-- CreateTable
CREATE TABLE "ingestion_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "source_listing_url" TEXT,
    "source_exam_page_url" TEXT,
    "source_correction_page_url" TEXT,
    "year" INTEGER NOT NULL,
    "stream_code" TEXT,
    "subject_code" TEXT,
    "session_type" "SessionType",
    "min_year" INTEGER NOT NULL,
    "status" "IngestionJobStatus" NOT NULL DEFAULT 'DRAFT',
    "review_notes" TEXT,
    "error_message" TEXT,
    "draft_json" JSONB NOT NULL,
    "metadata" JSONB,
    "reviewed_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "published_exam_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "kind" "SourceDocumentKind" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "page_count" INTEGER,
    "sha256" TEXT,
    "source_url" TEXT,
    "language" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "page_number" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sha256" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingestion_jobs_status_created_at_idx" ON "ingestion_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "ingestion_jobs_year_stream_code_subject_code_session_type_idx" ON "ingestion_jobs"("year", "stream_code", "subject_code", "session_type");

-- CreateIndex
CREATE INDEX "ingestion_jobs_published_exam_id_idx" ON "ingestion_jobs"("published_exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_documents_job_id_kind_key" ON "source_documents"("job_id", "kind");

-- CreateIndex
CREATE INDEX "source_documents_job_id_idx" ON "source_documents"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_pages_document_id_page_number_key" ON "source_pages"("document_id", "page_number");

-- CreateIndex
CREATE INDEX "source_pages_document_id_idx" ON "source_pages"("document_id");

-- AddForeignKey
ALTER TABLE "ingestion_jobs"
ADD CONSTRAINT "ingestion_jobs_published_exam_id_fkey"
FOREIGN KEY ("published_exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_documents"
ADD CONSTRAINT "source_documents_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "ingestion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_pages"
ADD CONSTRAINT "source_pages_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "source_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
