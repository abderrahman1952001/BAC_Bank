DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ExamNodeCurriculumNodeSource'
  ) THEN
    CREATE TYPE "ExamNodeCurriculumNodeSource" AS ENUM (
      'AUTO_RULE',
      'AI_CANDIDATE',
      'MANUAL_REVIEW'
    );
  END IF;
END $$;

ALTER TABLE "exam_node_curriculum_nodes"
  ADD COLUMN IF NOT EXISTS "source" "ExamNodeCurriculumNodeSource" NOT NULL DEFAULT 'AUTO_RULE',
  ADD COLUMN IF NOT EXISTS "confidence" DECIMAL(4, 2),
  ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "exam_node_curriculum_nodes_source_idx"
  ON "exam_node_curriculum_nodes"("source");
