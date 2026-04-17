INSERT INTO "streams" (
  "id",
  "family_id",
  "code",
  "name",
  "slug",
  "is_default",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  "stream_families"."id",
  "leafs"."code",
  "leafs"."name",
  "leafs"."slug",
  FALSE,
  now(),
  now()
FROM "stream_families"
JOIN (
  VALUES
    ('LE_GERMAN', 'لغات أجنبية - ألمانية', 'le-german'),
    ('LE_SPANISH', 'لغات أجنبية - إسبانية', 'le-spanish'),
    ('LE_ITALIAN', 'لغات أجنبية - إيطالية', 'le-italian')
) AS "leafs"("code", "name", "slug") ON TRUE
WHERE "stream_families"."code" = 'LE'
ON CONFLICT ("code") DO UPDATE
SET
  "family_id" = EXCLUDED."family_id",
  "name" = EXCLUDED."name",
  "slug" = EXCLUDED."slug",
  "is_default" = EXCLUDED."is_default",
  "updated_at" = now();

UPDATE "streams"
SET
  "is_default" = FALSE,
  "updated_at" = now()
WHERE "code" = 'LE';

WITH "desired_stream_subjects"("stream_code", "subject_code", "is_optional") AS (
  VALUES
    ('LE_GERMAN', 'ARABIC', FALSE),
    ('LE_GERMAN', 'ISLAMIC_STUDIES', FALSE),
    ('LE_GERMAN', 'MATHEMATICS', FALSE),
    ('LE_GERMAN', 'ENGLISH', FALSE),
    ('LE_GERMAN', 'PHILOSOPHY', FALSE),
    ('LE_GERMAN', 'FRENCH', FALSE),
    ('LE_GERMAN', 'HISTORY_GEOGRAPHY', FALSE),
    ('LE_GERMAN', 'AMAZIGH', TRUE),
    ('LE_GERMAN', 'GERMAN', FALSE),
    ('LE_SPANISH', 'ARABIC', FALSE),
    ('LE_SPANISH', 'ISLAMIC_STUDIES', FALSE),
    ('LE_SPANISH', 'MATHEMATICS', FALSE),
    ('LE_SPANISH', 'ENGLISH', FALSE),
    ('LE_SPANISH', 'PHILOSOPHY', FALSE),
    ('LE_SPANISH', 'FRENCH', FALSE),
    ('LE_SPANISH', 'HISTORY_GEOGRAPHY', FALSE),
    ('LE_SPANISH', 'AMAZIGH', TRUE),
    ('LE_SPANISH', 'SPANISH', FALSE),
    ('LE_ITALIAN', 'ARABIC', FALSE),
    ('LE_ITALIAN', 'ISLAMIC_STUDIES', FALSE),
    ('LE_ITALIAN', 'MATHEMATICS', FALSE),
    ('LE_ITALIAN', 'ENGLISH', FALSE),
    ('LE_ITALIAN', 'PHILOSOPHY', FALSE),
    ('LE_ITALIAN', 'FRENCH', FALSE),
    ('LE_ITALIAN', 'HISTORY_GEOGRAPHY', FALSE),
    ('LE_ITALIAN', 'AMAZIGH', TRUE),
    ('LE_ITALIAN', 'ITALIAN', FALSE)
)
INSERT INTO "stream_subjects" (
  "id",
  "stream_id",
  "subject_id",
  "is_optional",
  "valid_from_year",
  "valid_to_year",
  "created_at"
)
SELECT
  gen_random_uuid(),
  "streams"."id",
  "subjects"."id",
  "desired_stream_subjects"."is_optional",
  0,
  NULL,
  now()
FROM "desired_stream_subjects"
JOIN "streams" ON "streams"."code" = "desired_stream_subjects"."stream_code"
JOIN "subjects" ON "subjects"."code" = "desired_stream_subjects"."subject_code"
ON CONFLICT ("stream_id", "subject_id", "valid_from_year") DO UPDATE
SET
  "is_optional" = EXCLUDED."is_optional",
  "valid_to_year" = EXCLUDED."valid_to_year";

DELETE FROM "stream_subjects"
USING "streams"
WHERE "stream_subjects"."stream_id" = "streams"."id"
  AND "streams"."code" = 'LE';

WITH "canonical_family_streams" AS (
  SELECT
    "stream_families"."id" AS "family_id",
    CASE
      WHEN COUNT("streams"."id") = 1
        THEN (array_agg("streams"."id" ORDER BY "streams"."id"))[1]
      WHEN COUNT(*) FILTER (WHERE "streams"."is_default") = 1
        THEN (array_agg("streams"."id" ORDER BY "streams"."id") FILTER (WHERE "streams"."is_default"))[1]
      ELSE NULL
    END AS "stream_id"
  FROM "stream_families"
  JOIN "streams" ON "streams"."family_id" = "stream_families"."id"
  WHERE "stream_families"."code" <> 'LE'
  GROUP BY "stream_families"."id"
)
UPDATE "users"
SET "stream_id" = "canonical_family_streams"."stream_id"
FROM "canonical_family_streams"
WHERE "users"."stream_family_id" = "canonical_family_streams"."family_id"
  AND "users"."stream_id" IS NULL
  AND "canonical_family_streams"."stream_id" IS NOT NULL;

UPDATE "users"
SET "stream_id" = NULL
WHERE "stream_id" IN (
  SELECT "id"
  FROM "streams"
  WHERE "code" = 'LE'
);

ALTER TABLE "users"
DROP CONSTRAINT IF EXISTS "users_stream_family_id_fkey";

DROP INDEX IF EXISTS "users_stream_family_id_idx";

ALTER TABLE "users"
DROP COLUMN IF EXISTS "stream_family_id";
