-- CreateEnum
CREATE TYPE "StudyReviewOutcome" AS ENUM ('CORRECT', 'INCORRECT');

-- AlterTable
ALTER TABLE "student_review_queue_items"
ADD COLUMN "due_at" TIMESTAMP(3),
ADD COLUMN "success_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "last_reviewed_at" TIMESTAMP(3),
ADD COLUMN "last_review_outcome" "StudyReviewOutcome";

-- Backfill existing review rows as immediately due.
UPDATE "student_review_queue_items"
SET "due_at" = COALESCE(
  "last_promoted_at",
  "updated_at",
  "created_at",
  CURRENT_TIMESTAMP
)
WHERE "due_at" IS NULL;

-- CreateIndex
CREATE INDEX "student_review_queue_items_user_id_status_due_at_idx"
ON "student_review_queue_items"("user_id", "status", "due_at");
