-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ExamVariantCode" AS ENUM ('SUJET_1', 'SUJET_2');

-- CreateEnum
CREATE TYPE "ExamNodeType" AS ENUM ('EXERCISE', 'PART', 'QUESTION', 'SUBQUESTION', 'CONTEXT');

-- CreateEnum
CREATE TYPE "BlockRole" AS ENUM ('STEM', 'PROMPT', 'SOLUTION', 'HINT', 'RUBRIC', 'META');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('PARAGRAPH', 'LATEX', 'IMAGE', 'CODE', 'HEADING', 'LIST', 'TABLE');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'FILE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'REVIEWER');

-- AlterTable
ALTER TABLE "streams"
ADD COLUMN "slug" TEXT,
ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "subjects"
ADD COLUMN "slug" TEXT,
ADD COLUMN "coefficient" INTEGER;

-- AlterTable
ALTER TABLE "stream_subjects"
ADD COLUMN "coefficient" INTEGER;

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "exam_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_id" UUID NOT NULL,
    "code" "ExamVariantCode" NOT NULL,
    "title" TEXT,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variant_id" UUID NOT NULL,
    "parent_id" UUID,
    "node_type" "ExamNodeType" NOT NULL,
    "order_index" INTEGER NOT NULL,
    "label" TEXT,
    "title" TEXT,
    "max_points" DECIMAL(6,2),
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "uploaded_by" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_node_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "node_id" UUID NOT NULL,
    "role" "BlockRole" NOT NULL,
    "order_index" INTEGER NOT NULL,
    "block_type" "BlockType" NOT NULL,
    "text_value" TEXT,
    "media_id" UUID,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_node_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "streams_slug_key" ON "streams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_slug_key" ON "subjects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "exam_variants_exam_id_code_key" ON "exam_variants"("exam_id", "code");

-- CreateIndex
CREATE INDEX "exam_variants_exam_id_status_idx" ON "exam_variants"("exam_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "exam_nodes_variant_id_parent_id_order_index_key" ON "exam_nodes"("variant_id", "parent_id", "order_index");

-- CreateIndex
CREATE INDEX "exam_nodes_variant_id_node_type_idx" ON "exam_nodes"("variant_id", "node_type");

-- CreateIndex
CREATE INDEX "exam_nodes_parent_id_idx" ON "exam_nodes"("parent_id");

-- CreateIndex
CREATE INDEX "media_uploaded_by_created_at_idx" ON "media"("uploaded_by", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "exam_node_blocks_node_id_role_order_index_key" ON "exam_node_blocks"("node_id", "role", "order_index");

-- CreateIndex
CREATE INDEX "exam_node_blocks_node_id_role_idx" ON "exam_node_blocks"("node_id", "role");

-- CreateIndex
CREATE INDEX "exam_node_blocks_media_id_idx" ON "exam_node_blocks"("media_id");

-- AddCheckConstraint
ALTER TABLE "exam_nodes"
ADD CONSTRAINT "exam_nodes_order_index_check"
CHECK ("order_index" > 0);

-- AddCheckConstraint
ALTER TABLE "exam_nodes"
ADD CONSTRAINT "exam_nodes_max_points_check"
CHECK ("max_points" IS NULL OR "max_points" >= 0);

-- AddCheckConstraint
ALTER TABLE "exam_node_blocks"
ADD CONSTRAINT "exam_node_blocks_order_index_check"
CHECK ("order_index" > 0);

-- AddForeignKey
ALTER TABLE "exam_variants"
ADD CONSTRAINT "exam_variants_exam_id_fkey"
FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_nodes"
ADD CONSTRAINT "exam_nodes_variant_id_fkey"
FOREIGN KEY ("variant_id") REFERENCES "exam_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_nodes"
ADD CONSTRAINT "exam_nodes_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "exam_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"
ADD CONSTRAINT "media_uploaded_by_fkey"
FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_node_blocks"
ADD CONSTRAINT "exam_node_blocks_node_id_fkey"
FOREIGN KEY ("node_id") REFERENCES "exam_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_node_blocks"
ADD CONSTRAINT "exam_node_blocks_media_id_fkey"
FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
