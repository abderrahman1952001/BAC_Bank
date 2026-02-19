-- Normalize subjects to a unique catalog and connect streams through a join table.
ALTER TABLE "exams"
DROP CONSTRAINT IF EXISTS "exams_subject_id_stream_id_fkey";

ALTER TABLE "topics"
DROP CONSTRAINT IF EXISTS "topics_subject_id_fkey";

ALTER TABLE "subjects"
DROP CONSTRAINT IF EXISTS "subjects_stream_id_fkey";

DROP INDEX IF EXISTS "subjects_stream_id_idx";
DROP INDEX IF EXISTS "subjects_stream_id_name_key";
DROP INDEX IF EXISTS "subjects_id_stream_id_key";
DROP INDEX IF EXISTS "topics_subject_id_code_key";
DROP INDEX IF EXISTS "topics_subject_id_parent_id_name_key";

CREATE TABLE "subjects_new" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_new_pkey" PRIMARY KEY ("id")
);

CREATE TEMP TABLE "_subject_mapping" (
    "old_subject_id" UUID NOT NULL,
    "new_subject_id" UUID NOT NULL,

    CONSTRAINT "_subject_mapping_pkey" PRIMARY KEY ("old_subject_id")
);

WITH old_subjects AS (
    SELECT
        s."id",
        s."name",
        s."created_at",
        s."updated_at",
        CASE s."name"
            WHEN 'اللغة العربية وآدابها' THEN 'ARABIC'
            WHEN 'العلوم الإسلامية' THEN 'ISLAMIC_STUDIES'
            WHEN 'الرياضيات' THEN 'MATHEMATICS'
            WHEN 'اللغة الإنجليزية' THEN 'ENGLISH'
            WHEN 'علوم الطبيعة والحياة' THEN 'NATURAL_SCIENCES'
            WHEN 'العلوم الفيزيائية' THEN 'PHYSICS'
            WHEN 'اللغة الفرنسية' THEN 'FRENCH'
            WHEN 'التاريخ والجغرافيا' THEN 'HISTORY_GEOGRAPHY'
            WHEN 'اللغة الأمازيغية' THEN 'AMAZIGH'
            WHEN 'الفلسفة' THEN 'PHILOSOPHY'
            WHEN 'التكنولوجيا (هندسة ميكانيكية)' THEN 'TECHNOLOGY_MECHANICAL'
            WHEN 'التكنولوجيا (هندسة كهربائية)' THEN 'TECHNOLOGY_ELECTRICAL'
            WHEN 'التكنولوجيا (هندسة مدنية)' THEN 'TECHNOLOGY_CIVIL'
            WHEN 'التكنولوجيا (هندسة الطرائق)' THEN 'TECHNOLOGY_PROCESS'
            WHEN 'القانون' THEN 'LAW'
            WHEN 'التسيير المحاسبي والمالي' THEN 'ACCOUNTING_FINANCE'
            WHEN 'الاقتصاد والمناجمنت' THEN 'ECONOMICS_MANAGEMENT'
            WHEN 'لغة أجنبية ثالثة (ألمانية أو إسبانية أو إيطالية)' THEN 'THIRD_FOREIGN_LANGUAGE'
            ELSE UPPER(REGEXP_REPLACE(s."name", '[^A-Za-z0-9]+', '_', 'g'))
        END AS "canonical_code"
    FROM "subjects" s
), canonical_subjects AS (
    SELECT DISTINCT ON (o."canonical_code")
        o."id",
        o."canonical_code",
        o."name",
        o."created_at",
        o."updated_at"
    FROM old_subjects o
    ORDER BY o."canonical_code", o."created_at" ASC
)
INSERT INTO "subjects_new" ("id", "code", "name", "created_at", "updated_at")
SELECT
    c."id",
    c."canonical_code",
    c."name",
    c."created_at",
    c."updated_at"
FROM canonical_subjects c;

WITH old_subjects AS (
    SELECT
        s."id",
        CASE s."name"
            WHEN 'اللغة العربية وآدابها' THEN 'ARABIC'
            WHEN 'العلوم الإسلامية' THEN 'ISLAMIC_STUDIES'
            WHEN 'الرياضيات' THEN 'MATHEMATICS'
            WHEN 'اللغة الإنجليزية' THEN 'ENGLISH'
            WHEN 'علوم الطبيعة والحياة' THEN 'NATURAL_SCIENCES'
            WHEN 'العلوم الفيزيائية' THEN 'PHYSICS'
            WHEN 'اللغة الفرنسية' THEN 'FRENCH'
            WHEN 'التاريخ والجغرافيا' THEN 'HISTORY_GEOGRAPHY'
            WHEN 'اللغة الأمازيغية' THEN 'AMAZIGH'
            WHEN 'الفلسفة' THEN 'PHILOSOPHY'
            WHEN 'التكنولوجيا (هندسة ميكانيكية)' THEN 'TECHNOLOGY_MECHANICAL'
            WHEN 'التكنولوجيا (هندسة كهربائية)' THEN 'TECHNOLOGY_ELECTRICAL'
            WHEN 'التكنولوجيا (هندسة مدنية)' THEN 'TECHNOLOGY_CIVIL'
            WHEN 'التكنولوجيا (هندسة الطرائق)' THEN 'TECHNOLOGY_PROCESS'
            WHEN 'القانون' THEN 'LAW'
            WHEN 'التسيير المحاسبي والمالي' THEN 'ACCOUNTING_FINANCE'
            WHEN 'الاقتصاد والمناجمنت' THEN 'ECONOMICS_MANAGEMENT'
            WHEN 'لغة أجنبية ثالثة (ألمانية أو إسبانية أو إيطالية)' THEN 'THIRD_FOREIGN_LANGUAGE'
            ELSE UPPER(REGEXP_REPLACE(s."name", '[^A-Za-z0-9]+', '_', 'g'))
        END AS "canonical_code"
    FROM "subjects" s
)
INSERT INTO "_subject_mapping" ("old_subject_id", "new_subject_id")
SELECT o."id", sn."id"
FROM old_subjects o
JOIN "subjects_new" sn
  ON sn."code" = o."canonical_code";

CREATE TABLE "stream_subjects" (
    "stream_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stream_subjects_pkey" PRIMARY KEY ("stream_id","subject_id")
);

CREATE INDEX "stream_subjects_subject_id_idx" ON "stream_subjects"("subject_id");

INSERT INTO "stream_subjects" ("stream_id", "subject_id", "created_at")
SELECT DISTINCT
    s."stream_id",
    sm."new_subject_id",
    CURRENT_TIMESTAMP
FROM "subjects" s
JOIN "_subject_mapping" sm
  ON sm."old_subject_id" = s."id";

UPDATE "exams" e
SET "subject_id" = sm."new_subject_id"
FROM "_subject_mapping" sm
WHERE e."subject_id" = sm."old_subject_id";

UPDATE "topics" t
SET "subject_id" = sm."new_subject_id"
FROM "_subject_mapping" sm
WHERE t."subject_id" = sm."old_subject_id";

-- If any topics collide after normalization, merge dependents onto the canonical topic id.
CREATE TEMP TABLE "_topic_dedup" AS
SELECT
    (ARRAY_AGG(t."id" ORDER BY t."id"))[1] AS "keep_id",
    ARRAY_AGG(t."id") AS "all_ids"
FROM "topics" t
GROUP BY t."subject_id", t."code"
HAVING COUNT(*) > 1;

INSERT INTO "question_topics" ("question_id", "topic_id", "weight", "is_primary")
SELECT
    qt."question_id",
    td."keep_id",
    MAX(qt."weight") AS "weight",
    BOOL_OR(qt."is_primary") AS "is_primary"
FROM "question_topics" qt
JOIN "_topic_dedup" td
  ON qt."topic_id" = ANY(td."all_ids")
GROUP BY qt."question_id", td."keep_id"
ON CONFLICT ("question_id", "topic_id") DO UPDATE SET
    "weight" = GREATEST("question_topics"."weight", EXCLUDED."weight"),
    "is_primary" = ("question_topics"."is_primary" OR EXCLUDED."is_primary");

DELETE FROM "question_topics" qt
USING "_topic_dedup" td
WHERE qt."topic_id" = ANY(td."all_ids")
  AND qt."topic_id" <> td."keep_id";

INSERT INTO "user_topic_stats" ("user_id", "topic_id", "accuracy_percentage", "total_attempts", "updated_at")
SELECT
    uts."user_id",
    td."keep_id",
    CASE
      WHEN SUM(uts."total_attempts") = 0 THEN ROUND(AVG(uts."accuracy_percentage"), 2)
      ELSE ROUND(SUM(uts."accuracy_percentage" * uts."total_attempts") / NULLIF(SUM(uts."total_attempts"), 0), 2)
    END AS "accuracy_percentage",
    SUM(uts."total_attempts") AS "total_attempts",
    MAX(uts."updated_at") AS "updated_at"
FROM "user_topic_stats" uts
JOIN "_topic_dedup" td
  ON uts."topic_id" = ANY(td."all_ids")
GROUP BY uts."user_id", td."keep_id"
ON CONFLICT ("user_id", "topic_id") DO UPDATE SET
    "accuracy_percentage" = EXCLUDED."accuracy_percentage",
    "total_attempts" = EXCLUDED."total_attempts",
    "updated_at" = EXCLUDED."updated_at";

DELETE FROM "user_topic_stats" uts
USING "_topic_dedup" td
WHERE uts."topic_id" = ANY(td."all_ids")
  AND uts."topic_id" <> td."keep_id";

UPDATE "topics" t
SET "parent_id" = td."keep_id"
FROM "_topic_dedup" td
WHERE t."parent_id" = ANY(td."all_ids")
  AND t."parent_id" <> td."keep_id";

DELETE FROM "topics" t
USING "_topic_dedup" td
WHERE t."id" = ANY(td."all_ids")
  AND t."id" <> td."keep_id";

DROP TABLE "subjects";
ALTER TABLE "subjects_new" RENAME TO "subjects";

CREATE UNIQUE INDEX "subjects_code_key" ON "subjects"("code");
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");
CREATE UNIQUE INDEX "topics_subject_id_code_key" ON "topics"("subject_id", "code");
CREATE UNIQUE INDEX "topics_subject_id_parent_id_name_key" ON "topics"("subject_id", "parent_id", "name");

ALTER TABLE "stream_subjects"
ADD CONSTRAINT "stream_subjects_stream_id_fkey"
FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stream_subjects"
ADD CONSTRAINT "stream_subjects_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exams"
ADD CONSTRAINT "exams_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "topics"
ADD CONSTRAINT "topics_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add persistent practice sessions.
CREATE TYPE "PracticeSessionStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE "practice_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT,
    "requested_exercise_count" INTEGER NOT NULL DEFAULT 6,
    "filters_json" JSONB,
    "status" "PracticeSessionStatus" NOT NULL DEFAULT 'CREATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "practice_session_exercises" (
    "session_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_session_exercises_pkey" PRIMARY KEY ("session_id","exercise_id")
);

CREATE INDEX "practice_sessions_status_created_at_idx" ON "practice_sessions"("status", "created_at");
CREATE UNIQUE INDEX "practice_session_exercises_session_id_order_index_key" ON "practice_session_exercises"("session_id", "order_index");
CREATE INDEX "practice_session_exercises_exercise_id_idx" ON "practice_session_exercises"("exercise_id");

ALTER TABLE "practice_sessions"
ADD CONSTRAINT "practice_sessions_requested_exercise_count_check"
CHECK ("requested_exercise_count" > 0 AND "requested_exercise_count" <= 30);

ALTER TABLE "practice_session_exercises"
ADD CONSTRAINT "practice_session_exercises_order_index_check"
CHECK ("order_index" > 0);

ALTER TABLE "practice_session_exercises"
ADD CONSTRAINT "practice_session_exercises_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "practice_session_exercises"
ADD CONSTRAINT "practice_session_exercises_exercise_id_fkey"
FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
