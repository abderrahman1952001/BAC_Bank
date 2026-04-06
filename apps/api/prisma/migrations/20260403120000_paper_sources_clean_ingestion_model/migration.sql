-- Introduce canonical paper_sources ownership for source PDFs/pages, link
-- published papers back to their source bundle, and reset legacy ingestion
-- jobs after salvaging the canonical source assets.

-- CreateTable
CREATE TABLE "paper_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "subject_id" UUID NOT NULL,
    "family_code" TEXT NOT NULL,
    "source_listing_url" TEXT,
    "source_exam_page_url" TEXT,
    "source_correction_page_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_source_streams" (
    "paper_source_id" UUID NOT NULL,
    "stream_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_source_streams_pkey" PRIMARY KEY ("paper_source_id", "stream_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paper_sources_slug_key"
ON "paper_sources"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "paper_sources_year_subject_id_session_type_family_code_key"
ON "paper_sources"("year", "subject_id", "session_type", "family_code");

-- CreateIndex
CREATE INDEX "paper_sources_subject_id_idx"
ON "paper_sources"("subject_id");

-- CreateIndex
CREATE INDEX "paper_sources_year_subject_id_session_type_idx"
ON "paper_sources"("year", "subject_id", "session_type");

-- CreateIndex
CREATE INDEX "paper_source_streams_stream_id_idx"
ON "paper_source_streams"("stream_id");

-- AddForeignKey
ALTER TABLE "paper_sources"
ADD CONSTRAINT "paper_sources_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_source_streams"
ADD CONSTRAINT "paper_source_streams_paper_source_id_fkey"
FOREIGN KEY ("paper_source_id") REFERENCES "paper_sources"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_source_streams"
ADD CONSTRAINT "paper_source_streams_stream_id_fkey"
FOREIGN KEY ("stream_id") REFERENCES "streams"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddColumn
ALTER TABLE "papers"
ADD COLUMN "paper_source_id" UUID;

-- AddColumn
ALTER TABLE "ingestion_jobs"
ADD COLUMN "paper_source_id" UUID;

-- AddColumn
ALTER TABLE "source_documents"
ADD COLUMN "paper_source_id" UUID;

-- Collect complete legacy source pairs before we rewrite ownership.
CREATE TEMP TABLE "_legacy_complete_job_sources" AS
SELECT
    j."id" AS "job_id",
    j."provider",
    j."published_paper_id",
    j."year",
    j."session_type",
    subj."id" AS "subject_id",
    subj."code" AS "subject_code",
    exam."id" AS "exam_document_id",
    COALESCE(NULLIF(exam."sha256", ''), exam."storage_key") AS "exam_fingerprint",
    correction."id" AS "correction_document_id",
    COALESCE(NULLIF(correction."sha256", ''), correction."storage_key") AS "correction_fingerprint",
    j."source_listing_url",
    j."source_exam_page_url",
    j."source_correction_page_url",
    stream."id" AS "stream_id",
    stream."code" AS "stream_code",
    j."created_at",
    j."updated_at"
FROM "ingestion_jobs" j
JOIN "subjects" subj
  ON subj."code" = j."subject_code"
JOIN "source_documents" exam
  ON exam."job_id" = j."id"
 AND exam."kind" = 'EXAM'
JOIN "source_documents" correction
  ON correction."job_id" = j."id"
 AND correction."kind" = 'CORRECTION'
LEFT JOIN "streams" stream
  ON stream."code" = j."stream_code"
WHERE j."session_type" IS NOT NULL;

-- Group identical source bundles into canonical paper_source candidates, then
-- collapse legacy duplicates down to one canonical paper_source identity.
CREATE TEMP TABLE "_paper_source_candidates" AS
WITH grouped AS (
    SELECT
        legacy."year",
        legacy."session_type",
        legacy."subject_id",
        legacy."subject_code",
        legacy."exam_fingerprint",
        legacy."correction_fingerprint",
        (ARRAY_AGG(legacy."job_id" ORDER BY legacy."updated_at" DESC, legacy."job_id" DESC))[1] AS "representative_job_id",
        (ARRAY_AGG(legacy."provider" ORDER BY legacy."updated_at" DESC, legacy."job_id" DESC))[1] AS "provider",
        (ARRAY_AGG(legacy."source_listing_url" ORDER BY legacy."updated_at" DESC, legacy."job_id" DESC))[1] AS "source_listing_url",
        (ARRAY_AGG(legacy."source_exam_page_url" ORDER BY legacy."updated_at" DESC, legacy."job_id" DESC))[1] AS "source_exam_page_url",
        (ARRAY_AGG(legacy."source_correction_page_url" ORDER BY legacy."updated_at" DESC, legacy."job_id" DESC))[1] AS "source_correction_page_url",
        BOOL_OR(legacy."published_paper_id" IS NOT NULL) AS "has_published_paper",
        MIN(legacy."created_at") AS "created_at",
        MAX(legacy."updated_at") AS "updated_at"
    FROM "_legacy_complete_job_sources" legacy
    GROUP BY
        legacy."year",
        legacy."session_type",
        legacy."subject_id",
        legacy."subject_code",
        legacy."exam_fingerprint",
        legacy."correction_fingerprint"
),
grouped_with_family AS (
    SELECT
        grouped.*,
        COALESCE(
            NULLIF(
                (
                    SELECT string_agg(streams."stream_slug", '-' ORDER BY streams."stream_rank", streams."stream_slug")
                    FROM (
                        SELECT DISTINCT
                            lower(replace(legacy."stream_code", '_', '-')) AS "stream_slug",
                            CASE legacy."stream_code"
                                WHEN 'SE' THEN 10
                                WHEN 'M' THEN 20
                                WHEN 'TM' THEN 30
                                WHEN 'MT_CIVIL' THEN 31
                                WHEN 'MT_ELEC' THEN 32
                                WHEN 'MT_MECH' THEN 33
                                WHEN 'MT_PROC' THEN 34
                                WHEN 'GE' THEN 40
                                WHEN 'LP' THEN 50
                                WHEN 'LE' THEN 60
                                WHEN 'ARTS' THEN 70
                                ELSE 100
                            END AS "stream_rank"
                        FROM "_legacy_complete_job_sources" legacy
                        WHERE legacy."year" = grouped."year"
                          AND legacy."session_type" = grouped."session_type"
                          AND legacy."subject_id" = grouped."subject_id"
                          AND legacy."exam_fingerprint" = grouped."exam_fingerprint"
                          AND legacy."correction_fingerprint" = grouped."correction_fingerprint"
                          AND legacy."stream_code" IS NOT NULL
                    ) streams
                ),
                ''
            ),
            'unassigned'
        ) AS "family_code"
    FROM grouped
)
SELECT
    grouped_with_family.*,
    concat(
        'bac-',
        lower(replace(grouped_with_family."subject_code", '_', '-')),
        '-',
        grouped_with_family."family_code",
        '-',
        grouped_with_family."year",
        '-',
        lower(grouped_with_family."session_type"::text)
    ) AS "slug"
FROM grouped_with_family;

CREATE TEMP TABLE "_paper_source_groups" AS
SELECT
    gen_random_uuid() AS "paper_source_id",
    candidates."slug",
    candidates."provider",
    candidates."year",
    candidates."session_type",
    candidates."subject_id",
    candidates."subject_code",
    candidates."family_code",
    candidates."source_listing_url",
    candidates."source_exam_page_url",
    candidates."source_correction_page_url",
    candidates."representative_job_id",
    candidates."created_at",
    candidates."updated_at"
FROM (
    SELECT DISTINCT ON (
        candidate."year",
        candidate."session_type",
        candidate."subject_id",
        candidate."family_code"
    )
        candidate.*
    FROM "_paper_source_candidates" candidate
    ORDER BY
        candidate."year",
        candidate."session_type",
        candidate."subject_id",
        candidate."family_code",
        candidate."has_published_paper" DESC,
        candidate."updated_at" DESC,
        candidate."representative_job_id" DESC
) candidates;

INSERT INTO "paper_sources" (
    "id",
    "slug",
    "provider",
    "year",
    "session_type",
    "subject_id",
    "family_code",
    "source_listing_url",
    "source_exam_page_url",
    "source_correction_page_url",
    "created_at",
    "updated_at"
)
SELECT
    groups."paper_source_id",
    groups."slug",
    groups."provider",
    groups."year",
    groups."session_type",
    groups."subject_id",
    groups."family_code",
    groups."source_listing_url",
    groups."source_exam_page_url",
    groups."source_correction_page_url",
    groups."created_at",
    groups."updated_at"
FROM "_paper_source_groups" groups;

INSERT INTO "paper_source_streams" (
    "paper_source_id",
    "stream_id",
    "created_at"
)
SELECT DISTINCT
    groups."paper_source_id",
    legacy."stream_id",
    CURRENT_TIMESTAMP
FROM "_paper_source_groups" groups
JOIN "_paper_source_candidates" candidates
  ON candidates."year" = groups."year"
 AND candidates."session_type" = groups."session_type"
 AND candidates."subject_id" = groups."subject_id"
 AND candidates."family_code" = groups."family_code"
JOIN "_legacy_complete_job_sources" legacy
  ON legacy."year" = candidates."year"
 AND legacy."session_type" = candidates."session_type"
 AND legacy."subject_id" = candidates."subject_id"
 AND legacy."exam_fingerprint" = candidates."exam_fingerprint"
 AND legacy."correction_fingerprint" = candidates."correction_fingerprint"
WHERE legacy."stream_id" IS NOT NULL;

-- Published papers keep their structured content but now point back to the
-- canonical source bundle that produced them.
UPDATE "papers" paper
SET "paper_source_id" = mapping."paper_source_id"
FROM (
    SELECT DISTINCT ON (legacy."published_paper_id")
        legacy."published_paper_id" AS "paper_id",
        groups."paper_source_id"
    FROM "_legacy_complete_job_sources" legacy
    JOIN "_paper_source_candidates" candidates
      ON legacy."year" = candidates."year"
     AND legacy."session_type" = candidates."session_type"
     AND legacy."subject_id" = candidates."subject_id"
     AND legacy."exam_fingerprint" = candidates."exam_fingerprint"
     AND legacy."correction_fingerprint" = candidates."correction_fingerprint"
    JOIN "_paper_source_groups" groups
      ON groups."year" = candidates."year"
     AND groups."session_type" = candidates."session_type"
     AND groups."subject_id" = candidates."subject_id"
     AND groups."family_code" = candidates."family_code"
    WHERE legacy."published_paper_id" IS NOT NULL
    ORDER BY legacy."published_paper_id", legacy."updated_at" DESC, legacy."job_id" DESC
) mapping
WHERE paper."id" = mapping."paper_id";

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "papers"
        WHERE "paper_source_id" IS NULL
    ) THEN
        RAISE EXCEPTION 'paper_sources backfill failed: some published papers could not be mapped to a canonical source bundle.';
    END IF;
END $$;

-- Keep one canonical exam/correction document pair per paper_source. We reuse
-- the existing R2 objects and page rows by reassigning ownership instead of
-- reuploading files.
UPDATE "source_documents" document
SET "paper_source_id" = mapping."paper_source_id"
FROM (
    SELECT
        groups."paper_source_id",
        legacy."exam_document_id" AS "document_id"
    FROM "_paper_source_groups" groups
    JOIN "_legacy_complete_job_sources" legacy
      ON legacy."job_id" = groups."representative_job_id"

    UNION ALL

    SELECT
        groups."paper_source_id",
        legacy."correction_document_id" AS "document_id"
    FROM "_paper_source_groups" groups
    JOIN "_legacy_complete_job_sources" legacy
      ON legacy."job_id" = groups."representative_job_id"
) mapping
WHERE document."id" = mapping."document_id";

-- Reset workflow state cleanly. We intentionally drop duplicate/incomplete
-- job-owned source rows that were not promoted into canonical paper_sources.
ALTER TABLE "source_documents"
DROP CONSTRAINT IF EXISTS "source_documents_job_id_fkey";

DELETE FROM "source_pages"
WHERE "document_id" IN (
    SELECT "id"
    FROM "source_documents"
    WHERE "paper_source_id" IS NULL
);

DELETE FROM "source_documents"
WHERE "paper_source_id" IS NULL;

DELETE FROM "ingestion_jobs";

-- Replace legacy ownership and provenance columns with clean paper_source
-- links.
DROP INDEX IF EXISTS "source_documents_job_id_kind_key";
DROP INDEX IF EXISTS "source_documents_job_id_idx";
DROP INDEX IF EXISTS "ingestion_jobs_year_stream_code_subject_code_session_type_idx";

ALTER TABLE "papers"
ALTER COLUMN "paper_source_id" SET NOT NULL;

ALTER TABLE "source_documents"
ALTER COLUMN "paper_source_id" SET NOT NULL;

ALTER TABLE "ingestion_jobs"
ALTER COLUMN "paper_source_id" SET NOT NULL;

ALTER TABLE "papers"
DROP COLUMN "total_points";

ALTER TABLE "source_documents"
DROP COLUMN "job_id";

ALTER TABLE "ingestion_jobs"
DROP COLUMN "provider",
DROP COLUMN "source_listing_url",
DROP COLUMN "source_exam_page_url",
DROP COLUMN "source_correction_page_url",
DROP COLUMN "year",
DROP COLUMN "stream_code",
DROP COLUMN "subject_code",
DROP COLUMN "session_type",
DROP COLUMN "min_year";

-- CreateIndex
CREATE UNIQUE INDEX "papers_paper_source_id_key"
ON "papers"("paper_source_id");

-- CreateIndex
CREATE INDEX "ingestion_jobs_paper_source_id_idx"
ON "ingestion_jobs"("paper_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_documents_paper_source_id_kind_key"
ON "source_documents"("paper_source_id", "kind");

-- CreateIndex
CREATE INDEX "source_documents_paper_source_id_idx"
ON "source_documents"("paper_source_id");

-- AddForeignKey
ALTER TABLE "papers"
ADD CONSTRAINT "papers_paper_source_id_fkey"
FOREIGN KEY ("paper_source_id") REFERENCES "paper_sources"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_jobs"
ADD CONSTRAINT "ingestion_jobs_paper_source_id_fkey"
FOREIGN KEY ("paper_source_id") REFERENCES "paper_sources"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_documents"
ADD CONSTRAINT "source_documents_paper_source_id_fkey"
FOREIGN KEY ("paper_source_id") REFERENCES "paper_sources"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
