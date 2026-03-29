ALTER TABLE "topics"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "is_selectable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "student_label" TEXT;

UPDATE "topics"
SET "slug" = LOWER(REPLACE("code", '_', '-'))
WHERE "slug" IS NULL;

ALTER TABLE "topics"
  ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "topics_subject_id_slug_key"
  ON "topics"("subject_id", "slug");

CREATE INDEX "topics_subject_id_display_order_idx"
  ON "topics"("subject_id", "display_order");

ALTER TABLE "exam_node_topics"
  DROP COLUMN "weight",
  DROP COLUMN "is_primary";
