ALTER TABLE "subject_curricula"
ADD COLUMN "family_code" TEXT NOT NULL DEFAULT 'legacy';

ALTER TABLE "subject_curricula"
ALTER COLUMN "family_code" DROP DEFAULT;

CREATE TABLE "subject_curriculum_streams" (
    "curriculum_id" UUID NOT NULL,
    "stream_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_curriculum_streams_pkey" PRIMARY KEY ("curriculum_id", "stream_id")
);

INSERT INTO "subject_curriculum_streams" (
    "curriculum_id",
    "stream_id",
    "created_at"
)
SELECT
    "id",
    "stream_id",
    CURRENT_TIMESTAMP
FROM "subject_curricula"
WHERE "stream_id" IS NOT NULL
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS "subject_curricula_stream_id_is_active_idx";
DROP INDEX IF EXISTS "subject_curricula_subject_id_stream_id_valid_from_year_valid_to_year_idx";

ALTER TABLE "subject_curricula"
DROP CONSTRAINT IF EXISTS "subject_curricula_stream_id_fkey";

ALTER TABLE "subject_curricula"
DROP COLUMN "stream_id";

CREATE INDEX "subject_curricula_subject_id_family_code_idx"
ON "subject_curricula"("subject_id", "family_code");

CREATE INDEX "subject_curricula_subject_id_valid_from_year_valid_to_year_idx"
ON "subject_curricula"("subject_id", "valid_from_year", "valid_to_year");

CREATE INDEX "subject_curriculum_streams_stream_id_idx"
ON "subject_curriculum_streams"("stream_id");

CREATE INDEX "subject_curriculum_streams_curriculum_id_idx"
ON "subject_curriculum_streams"("curriculum_id");

ALTER TABLE "subject_curriculum_streams"
ADD CONSTRAINT "subject_curriculum_streams_curriculum_id_fkey"
FOREIGN KEY ("curriculum_id") REFERENCES "subject_curricula"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subject_curriculum_streams"
ADD CONSTRAINT "subject_curriculum_streams_stream_id_fkey"
FOREIGN KEY ("stream_id") REFERENCES "streams"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
