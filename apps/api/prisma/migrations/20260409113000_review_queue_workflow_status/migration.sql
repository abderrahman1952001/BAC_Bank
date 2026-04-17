-- CreateEnum
CREATE TYPE "StudyReviewQueueStatus" AS ENUM (
  'OPEN',
  'DONE',
  'SNOOZED',
  'REMOVED'
);

-- AlterTable
ALTER TABLE "student_review_queue_items"
ADD COLUMN "status" "StudyReviewQueueStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN "status_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing derived items as currently open.
UPDATE "student_review_queue_items"
SET
  "status" = 'OPEN',
  "status_updated_at" = COALESCE(
    "updated_at",
    "last_promoted_at",
    "created_at",
    CURRENT_TIMESTAMP
  );

-- CreateIndex
CREATE INDEX "student_review_queue_items_user_id_status_priority_score_idx"
ON "student_review_queue_items"("user_id", "status", "priority_score");

-- CreateIndex
CREATE INDEX "student_review_queue_items_user_id_status_last_promoted_at_idx"
ON "student_review_queue_items"("user_id", "status", "last_promoted_at");
