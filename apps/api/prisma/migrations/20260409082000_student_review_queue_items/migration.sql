-- CreateEnum
CREATE TYPE "StudyReviewQueueReasonType" AS ENUM (
  'MISSED',
  'HARD',
  'SKIPPED',
  'REVEALED',
  'FLAGGED'
);

-- CreateTable
CREATE TABLE "student_review_queue_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "identity_key" TEXT NOT NULL,
  "question_node_id" UUID,
  "exercise_node_id" UUID NOT NULL,
  "reason_type" "StudyReviewQueueReasonType" NOT NULL,
  "priority_score" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_promoted_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "student_review_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_review_queue_items_user_id_identity_key_key"
ON "student_review_queue_items"("user_id", "identity_key");

-- CreateIndex
CREATE INDEX "student_review_queue_items_question_node_id_idx"
ON "student_review_queue_items"("question_node_id");

-- CreateIndex
CREATE INDEX "student_review_queue_items_exercise_node_id_idx"
ON "student_review_queue_items"("exercise_node_id");

-- CreateIndex
CREATE INDEX "student_review_queue_items_user_id_priority_score_idx"
ON "student_review_queue_items"("user_id", "priority_score");

-- CreateIndex
CREATE INDEX "student_review_queue_items_user_id_last_promoted_at_idx"
ON "student_review_queue_items"("user_id", "last_promoted_at");

-- AddForeignKey
ALTER TABLE "student_review_queue_items"
ADD CONSTRAINT "student_review_queue_items_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_review_queue_items"
ADD CONSTRAINT "student_review_queue_items_question_node_id_fkey"
FOREIGN KEY ("question_node_id") REFERENCES "exam_nodes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_review_queue_items"
ADD CONSTRAINT "student_review_queue_items_exercise_node_id_fkey"
FOREIGN KEY ("exercise_node_id") REFERENCES "exam_nodes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
