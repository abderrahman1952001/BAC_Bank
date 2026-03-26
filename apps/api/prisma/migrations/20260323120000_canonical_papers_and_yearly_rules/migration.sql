ALTER TABLE "subjects"
DROP COLUMN IF EXISTS "coefficient";

ALTER TABLE "stream_subjects"
ADD COLUMN "id" UUID DEFAULT gen_random_uuid(),
ADD COLUMN "is_optional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "valid_from_year" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "valid_to_year" INTEGER;

UPDATE "stream_subjects"
SET "id" = gen_random_uuid()
WHERE "id" IS NULL;

ALTER TABLE "stream_subjects"
ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "stream_subjects"
DROP CONSTRAINT IF EXISTS "stream_subjects_pkey";

ALTER TABLE "stream_subjects"
ADD CONSTRAINT "stream_subjects_pkey" PRIMARY KEY ("id");

DROP INDEX IF EXISTS "stream_subjects_stream_id_subject_id_valid_from_year_key";

CREATE UNIQUE INDEX "stream_subjects_stream_id_subject_id_valid_from_year_key"
ON "stream_subjects"("stream_id", "subject_id", "valid_from_year");

CREATE INDEX "stream_subjects_stream_id_valid_from_year_valid_to_year_idx"
ON "stream_subjects"("stream_id", "valid_from_year", "valid_to_year");

ALTER TABLE "stream_subjects"
DROP CONSTRAINT IF EXISTS "stream_subjects_valid_year_range_check";

ALTER TABLE "stream_subjects"
ADD CONSTRAINT "stream_subjects_valid_year_range_check"
CHECK ("valid_to_year" IS NULL OR "valid_to_year" >= "valid_from_year");

CREATE TABLE "papers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "year" INTEGER NOT NULL,
    "subject_id" UUID NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "family_code" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL,
    "official_source_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "papers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "papers_year_subject_id_session_type_family_code_key"
ON "papers"("year", "subject_id", "session_type", "family_code");

CREATE INDEX "papers_year_subject_id_session_type_idx"
ON "papers"("year", "subject_id", "session_type");

ALTER TABLE "papers"
ADD CONSTRAINT "papers_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "exams"
ADD COLUMN "paper_id" UUID;

INSERT INTO "papers" (
    "id",
    "year",
    "subject_id",
    "session_type",
    "family_code",
    "duration_minutes",
    "total_points",
    "official_source_reference",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    e."year",
    e."subject_id",
    e."session_type",
    CONCAT(s."code", '__', subj."code"),
    e."duration_minutes",
    e."total_points",
    e."official_source_reference",
    e."created_at",
    e."updated_at"
FROM "exams" e
JOIN "streams" s
  ON s."id" = e."stream_id"
JOIN "subjects" subj
  ON subj."id" = e."subject_id";

UPDATE "exams" e
SET "paper_id" = p."id"
FROM "papers" p,
     "streams" s,
     "subjects" subj
WHERE p."year" = e."year"
  AND s."id" = e."stream_id"
  AND subj."id" = e."subject_id"
  AND p."subject_id" = e."subject_id"
  AND p."session_type" = e."session_type"
  AND p."family_code" = CONCAT(s."code", '__', subj."code");

ALTER TABLE "exams"
ALTER COLUMN "paper_id" SET NOT NULL;

CREATE INDEX "exams_paper_id_idx"
ON "exams"("paper_id");

ALTER TABLE "exams"
ADD CONSTRAINT "exams_paper_id_fkey"
FOREIGN KEY ("paper_id") REFERENCES "papers"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "exam_variants"
ADD COLUMN "paper_id" UUID;

UPDATE "exam_variants" ev
SET "paper_id" = e."paper_id"
FROM "exams" e
WHERE ev."exam_id" = e."id";

ALTER TABLE "exam_variants"
ALTER COLUMN "paper_id" SET NOT NULL;

DROP INDEX IF EXISTS "exam_variants_exam_id_code_key";
DROP INDEX IF EXISTS "exam_variants_exam_id_status_idx";

ALTER TABLE "exam_variants"
DROP CONSTRAINT IF EXISTS "exam_variants_exam_id_fkey";

ALTER TABLE "exam_variants"
DROP COLUMN "exam_id";

CREATE UNIQUE INDEX "exam_variants_paper_id_code_key"
ON "exam_variants"("paper_id", "code");

CREATE INDEX "exam_variants_paper_id_status_idx"
ON "exam_variants"("paper_id", "status");

ALTER TABLE "exam_variants"
ADD CONSTRAINT "exam_variants_paper_id_fkey"
FOREIGN KEY ("paper_id") REFERENCES "papers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ingestion_jobs"
ADD COLUMN "published_paper_id" UUID;

UPDATE "ingestion_jobs" ij
SET "published_paper_id" = e."paper_id"
FROM "exams" e
WHERE ij."published_exam_id" = e."id";

CREATE INDEX "ingestion_jobs_published_paper_id_idx"
ON "ingestion_jobs"("published_paper_id");

ALTER TABLE "ingestion_jobs"
ADD CONSTRAINT "ingestion_jobs_published_paper_id_fkey"
FOREIGN KEY ("published_paper_id") REFERENCES "papers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "exams"
DROP COLUMN "duration_minutes",
DROP COLUMN "total_points",
DROP COLUMN "official_source_reference";
