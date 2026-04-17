CREATE TYPE "TopicKind" AS ENUM ('UNIT', 'TOPIC', 'SUBTOPIC');

CREATE TABLE "subject_curricula" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" UUID NOT NULL,
    "stream_id" UUID,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "valid_from_year" INTEGER NOT NULL DEFAULT 0,
    "valid_to_year" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_curricula_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "topics"
ADD COLUMN "curriculum_id" UUID,
ADD COLUMN "kind" "TopicKind" NOT NULL DEFAULT 'SUBTOPIC',
ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "path" TEXT NOT NULL DEFAULT '';

ALTER TABLE "skills"
ADD COLUMN "curriculum_id" UUID;

INSERT INTO "subject_curricula" (
    "subject_id",
    "stream_id",
    "code",
    "title",
    "valid_from_year",
    "valid_to_year",
    "is_active",
    "updated_at"
)
SELECT
    "id",
    NULL,
    'CURRENT',
    "name",
    0,
    NULL,
    true,
    CURRENT_TIMESTAMP
FROM "subjects";

UPDATE "topics" AS "topic"
SET "curriculum_id" = "curriculum"."id"
FROM "subject_curricula" AS "curriculum"
WHERE "curriculum"."subject_id" = "topic"."subject_id"
  AND "curriculum"."code" = 'CURRENT';

UPDATE "skills" AS "skill"
SET "curriculum_id" = "curriculum"."id"
FROM "subject_curricula" AS "curriculum"
WHERE "curriculum"."subject_id" = "skill"."subject_id"
  AND "curriculum"."code" = 'CURRENT';

WITH RECURSIVE "topic_tree" AS (
    SELECT
        "id",
        "curriculum_id",
        "parent_id",
        "code",
        0 AS "depth",
        "code"::TEXT AS "path"
    FROM "topics"
    WHERE "parent_id" IS NULL

    UNION ALL

    SELECT
        "child"."id",
        "child"."curriculum_id",
        "child"."parent_id",
        "child"."code",
        "topic_tree"."depth" + 1,
        "topic_tree"."path" || '/' || "child"."code"
    FROM "topics" AS "child"
    INNER JOIN "topic_tree"
        ON "child"."parent_id" = "topic_tree"."id"
)
UPDATE "topics" AS "topic"
SET
    "depth" = "topic_tree"."depth",
    "path" = "topic_tree"."path",
    "kind" = CASE
        WHEN "topic_tree"."depth" = 0 THEN 'UNIT'::"TopicKind"
        WHEN "topic_tree"."depth" = 1 THEN 'TOPIC'::"TopicKind"
        ELSE 'SUBTOPIC'::"TopicKind"
    END
FROM "topic_tree"
WHERE "topic"."id" = "topic_tree"."id";

UPDATE "topics"
SET
    "path" = NULLIF("path", '')
WHERE "path" <> '';

UPDATE "topics"
SET
    "path" = "code",
    "kind" = 'UNIT'::"TopicKind"
WHERE "path" = '';

ALTER TABLE "topics"
    ALTER COLUMN "curriculum_id" SET NOT NULL,
    ALTER COLUMN "path" DROP DEFAULT;

ALTER TABLE "skills"
    ALTER COLUMN "curriculum_id" SET NOT NULL;

DROP INDEX "topics_subject_id_code_key";
DROP INDEX "topics_subject_id_slug_key";
DROP INDEX "topics_subject_id_parent_id_name_key";
DROP INDEX "topics_subject_id_display_order_idx";
DROP INDEX "skills_subject_id_code_key";
DROP INDEX "skills_subject_id_slug_key";
DROP INDEX "skills_subject_id_display_order_idx";

CREATE UNIQUE INDEX "subject_curricula_subject_id_code_key"
ON "subject_curricula"("subject_id", "code");

CREATE INDEX "subject_curricula_subject_id_is_active_idx"
ON "subject_curricula"("subject_id", "is_active");

CREATE INDEX "subject_curricula_stream_id_is_active_idx"
ON "subject_curricula"("stream_id", "is_active");

CREATE INDEX "subject_curricula_subject_id_stream_id_valid_from_year_valid_to_year_idx"
ON "subject_curricula"("subject_id", "stream_id", "valid_from_year", "valid_to_year");

CREATE UNIQUE INDEX "topics_curriculum_id_code_key"
ON "topics"("curriculum_id", "code");

CREATE UNIQUE INDEX "topics_curriculum_id_slug_key"
ON "topics"("curriculum_id", "slug");

CREATE UNIQUE INDEX "topics_curriculum_id_parent_id_name_key"
ON "topics"("curriculum_id", "parent_id", "name");

CREATE INDEX "topics_curriculum_id_idx"
ON "topics"("curriculum_id");

CREATE INDEX "topics_curriculum_id_display_order_idx"
ON "topics"("curriculum_id", "display_order");

CREATE INDEX "topics_curriculum_id_path_idx"
ON "topics"("curriculum_id", "path");

CREATE UNIQUE INDEX "skills_curriculum_id_code_key"
ON "skills"("curriculum_id", "code");

CREATE UNIQUE INDEX "skills_curriculum_id_slug_key"
ON "skills"("curriculum_id", "slug");

CREATE INDEX "skills_curriculum_id_idx"
ON "skills"("curriculum_id");

CREATE INDEX "skills_curriculum_id_display_order_idx"
ON "skills"("curriculum_id", "display_order");

ALTER TABLE "subject_curricula"
ADD CONSTRAINT "subject_curricula_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subject_curricula"
ADD CONSTRAINT "subject_curricula_stream_id_fkey"
FOREIGN KEY ("stream_id") REFERENCES "streams"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "topics"
ADD CONSTRAINT "topics_curriculum_id_fkey"
FOREIGN KEY ("curriculum_id") REFERENCES "subject_curricula"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "skills"
ADD CONSTRAINT "skills_curriculum_id_fkey"
FOREIGN KEY ("curriculum_id") REFERENCES "subject_curricula"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
