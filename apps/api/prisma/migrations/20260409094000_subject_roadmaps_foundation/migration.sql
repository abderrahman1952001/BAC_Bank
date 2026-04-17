-- CreateTable
CREATE TABLE "subject_roadmaps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "curriculum_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subject_roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_nodes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "roadmap_id" UUID NOT NULL,
  "topic_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order_index" INTEGER NOT NULL,
  "parent_roadmap_node_id" UUID,
  "estimated_sessions" INTEGER,
  "is_optional" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "roadmap_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subject_roadmaps_curriculum_id_code_key"
ON "subject_roadmaps"("curriculum_id", "code");

-- CreateIndex
CREATE INDEX "subject_roadmaps_curriculum_id_is_active_idx"
ON "subject_roadmaps"("curriculum_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_nodes_roadmap_id_topic_id_key"
ON "roadmap_nodes"("roadmap_id", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_nodes_roadmap_id_order_index_key"
ON "roadmap_nodes"("roadmap_id", "order_index");

-- CreateIndex
CREATE INDEX "roadmap_nodes_topic_id_idx"
ON "roadmap_nodes"("topic_id");

-- CreateIndex
CREATE INDEX "roadmap_nodes_parent_roadmap_node_id_idx"
ON "roadmap_nodes"("parent_roadmap_node_id");

-- AddForeignKey
ALTER TABLE "subject_roadmaps"
ADD CONSTRAINT "subject_roadmaps_curriculum_id_fkey"
FOREIGN KEY ("curriculum_id") REFERENCES "subject_curricula"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_nodes"
ADD CONSTRAINT "roadmap_nodes_roadmap_id_fkey"
FOREIGN KEY ("roadmap_id") REFERENCES "subject_roadmaps"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_nodes"
ADD CONSTRAINT "roadmap_nodes_topic_id_fkey"
FOREIGN KEY ("topic_id") REFERENCES "topics"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_nodes"
ADD CONSTRAINT "roadmap_nodes_parent_roadmap_node_id_fkey"
FOREIGN KEY ("parent_roadmap_node_id") REFERENCES "roadmap_nodes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill a default roadmap shell for active curricula.
INSERT INTO "subject_roadmaps" (
  "curriculum_id",
  "code",
  "title",
  "description",
  "version",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  sc."id",
  'CORE_PATH',
  CONCAT('مسار ', sc."title"),
  NULL,
  1,
  true,
  NOW(),
  NOW()
FROM "subject_curricula" sc
WHERE sc."is_active" = true;

-- Backfill top-level roadmap nodes from current curriculum units.
INSERT INTO "roadmap_nodes" (
  "roadmap_id",
  "topic_id",
  "title",
  "description",
  "order_index",
  "parent_roadmap_node_id",
  "estimated_sessions",
  "is_optional",
  "created_at",
  "updated_at"
)
SELECT
  sr."id" AS "roadmap_id",
  topic_rows."id" AS "topic_id",
  COALESCE(topic_rows."student_label", topic_rows."name") AS "title",
  NULL,
  topic_rows."order_index",
  NULL,
  GREATEST(
    1,
    LEAST(
      4,
      COALESCE(topic_rows."children_count", 0)
    )
  ) AS "estimated_sessions",
  false,
  NOW(),
  NOW()
FROM "subject_roadmaps" sr
JOIN (
  SELECT
    t."id",
    t."curriculum_id",
    t."name",
    t."student_label",
    ROW_NUMBER() OVER (
      PARTITION BY t."curriculum_id"
      ORDER BY t."display_order" ASC, t."name" ASC
    ) AS "order_index",
    (
      SELECT COUNT(*)
      FROM "topics" child
      WHERE child."parent_id" = t."id"
    ) AS "children_count"
  FROM "topics" t
  WHERE t."parent_id" IS NULL
) AS topic_rows
  ON topic_rows."curriculum_id" = sr."curriculum_id";
