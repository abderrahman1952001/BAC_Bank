-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('CHARGILY');

-- CreateEnum
CREATE TYPE "BillingCheckoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingWebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

-- AlterTable
ALTER TABLE "exam_node_skills" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "paper_sources" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "roadmap_nodes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "roadmap_sections" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "skills" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_exercise_states" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_review_queue_items" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_skill_rollups" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_topic_rollups" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "study_session_exercises" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "study_session_questions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "subject_curricula" ALTER COLUMN "family_code" SET DEFAULT 'legacy';

-- AlterTable
ALTER TABLE "subject_roadmaps" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "subjects" RENAME CONSTRAINT "subjects_new_pkey" TO "subjects_pkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "subscription_ends_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "billing_checkouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "plan_code" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "BillingCheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "locale" TEXT NOT NULL,
    "provider_checkout_id" TEXT,
    "provider_customer_id" TEXT,
    "provider_payment_method" TEXT,
    "provider_invoice_id" TEXT,
    "provider_livemode" BOOLEAN,
    "checkout_url" TEXT,
    "success_url" TEXT NOT NULL,
    "failure_url" TEXT NOT NULL,
    "webhook_url" TEXT NOT NULL,
    "failure_reason" TEXT,
    "provider_payload" JSONB,
    "metadata" JSONB,
    "access_starts_at" TIMESTAMP(3),
    "access_ends_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" "BillingProvider" NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "billing_checkout_id" UUID,
    "event_type" TEXT NOT NULL,
    "status" "BillingWebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "provider_checkout_id" TEXT,
    "provider_livemode" BOOLEAN,
    "signature_verified" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_checkouts_provider_checkout_id_key" ON "billing_checkouts"("provider_checkout_id");

-- CreateIndex
CREATE INDEX "billing_checkouts_user_id_created_at_idx" ON "billing_checkouts"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "billing_checkouts_user_id_status_created_at_idx" ON "billing_checkouts"("user_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "billing_checkouts_provider_status_created_at_idx" ON "billing_checkouts"("provider", "status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "billing_webhook_events_provider_event_id_key" ON "billing_webhook_events"("provider_event_id");

-- CreateIndex
CREATE INDEX "billing_webhook_events_billing_checkout_id_created_at_idx" ON "billing_webhook_events"("billing_checkout_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "billing_webhook_events_provider_checkout_id_created_at_idx" ON "billing_webhook_events"("provider_checkout_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "billing_webhook_events_status_created_at_idx" ON "billing_webhook_events"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "users_subscription_status_subscription_ends_at_idx" ON "users"("subscription_status", "subscription_ends_at");

-- AddForeignKey
ALTER TABLE "billing_checkouts" ADD CONSTRAINT "billing_checkouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_billing_checkout_id_fkey" FOREIGN KEY ("billing_checkout_id") REFERENCES "billing_checkouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "study_session_questions_session_exercise_id_question_node_id_ke" RENAME TO "study_session_questions_session_exercise_id_question_node_i_key";
