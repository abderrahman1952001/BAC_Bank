ALTER TYPE "IngestionJobStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "IngestionJobStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

ALTER TABLE "ingestion_jobs"
ADD COLUMN "processing_requested_at" TIMESTAMP(3),
ADD COLUMN "processing_started_at" TIMESTAMP(3),
ADD COLUMN "processing_finished_at" TIMESTAMP(3),
ADD COLUMN "processing_lease_expires_at" TIMESTAMP(3),
ADD COLUMN "processing_worker_id" TEXT,
ADD COLUMN "processing_attempt_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "ingestion_jobs_status_processing_requested_at_idx"
ON "ingestion_jobs"("status", "processing_requested_at");

CREATE INDEX "ingestion_jobs_processing_lease_expires_at_idx"
ON "ingestion_jobs"("processing_lease_expires_at");
