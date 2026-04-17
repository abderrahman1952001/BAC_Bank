-- CreateTable
CREATE TABLE "roadmap_sections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "roadmap_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order_index" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "roadmap_sections_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "roadmap_nodes"
ADD COLUMN "section_id" UUID,
ADD COLUMN "recommended_previous_roadmap_node_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_sections_roadmap_id_code_key"
ON "roadmap_sections"("roadmap_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_sections_roadmap_id_order_index_key"
ON "roadmap_sections"("roadmap_id", "order_index");

-- CreateIndex
CREATE INDEX "roadmap_sections_roadmap_id_order_index_idx"
ON "roadmap_sections"("roadmap_id", "order_index");

-- CreateIndex
CREATE INDEX "roadmap_nodes_section_id_idx"
ON "roadmap_nodes"("section_id");

-- CreateIndex
CREATE INDEX "roadmap_nodes_recommended_previous_roadmap_node_id_idx"
ON "roadmap_nodes"("recommended_previous_roadmap_node_id");

-- AddForeignKey
ALTER TABLE "roadmap_sections"
ADD CONSTRAINT "roadmap_sections_roadmap_id_fkey"
FOREIGN KEY ("roadmap_id") REFERENCES "subject_roadmaps"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_nodes"
ADD CONSTRAINT "roadmap_nodes_section_id_fkey"
FOREIGN KEY ("section_id") REFERENCES "roadmap_sections"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_nodes"
ADD CONSTRAINT "roadmap_nodes_recommended_previous_roadmap_node_id_fkey"
FOREIGN KEY ("recommended_previous_roadmap_node_id") REFERENCES "roadmap_nodes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill a default section for every existing roadmap.
INSERT INTO "roadmap_sections" (
  "roadmap_id",
  "code",
  "title",
  "description",
  "order_index",
  "created_at",
  "updated_at"
)
SELECT
  sr."id",
  'CORE',
  'المسار الأساسي',
  NULL,
  1,
  NOW(),
  NOW()
FROM "subject_roadmaps" sr
WHERE NOT EXISTS (
  SELECT 1
  FROM "roadmap_sections" rs
  WHERE rs."roadmap_id" = sr."id"
);

-- Attach all existing roadmap nodes to the default section.
UPDATE "roadmap_nodes" node
SET "section_id" = section_rows."id"
FROM (
  SELECT "id", "roadmap_id"
  FROM "roadmap_sections"
  WHERE "code" = 'CORE'
) AS section_rows
WHERE node."roadmap_id" = section_rows."roadmap_id"
  AND node."section_id" IS NULL;

-- Seed a soft recommended path from the existing order.
UPDATE "roadmap_nodes" current_node
SET "recommended_previous_roadmap_node_id" = previous_node."id"
FROM "roadmap_nodes" previous_node
WHERE previous_node."roadmap_id" = current_node."roadmap_id"
  AND previous_node."order_index" = current_node."order_index" - 1
  AND current_node."recommended_previous_roadmap_node_id" IS NULL;
