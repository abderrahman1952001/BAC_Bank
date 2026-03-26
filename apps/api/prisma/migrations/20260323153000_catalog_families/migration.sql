CREATE TABLE "stream_families" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stream_families_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stream_families_code_key"
ON "stream_families"("code");

CREATE UNIQUE INDEX "stream_families_slug_key"
ON "stream_families"("slug");

ALTER TABLE "streams"
ADD COLUMN "family_id" UUID,
ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "streams"
DROP CONSTRAINT IF EXISTS "streams_code_check";

DROP INDEX IF EXISTS "streams_name_key";

INSERT INTO "stream_families" (
    "code",
    "name",
    "slug",
    "created_at",
    "updated_at"
)
SELECT DISTINCT
    CASE
      WHEN s."code" IN ('MT_MECH', 'MT_ELEC', 'MT_CIVIL', 'MT_PROC') THEN 'MT'
      ELSE s."code"
    END AS "code",
    CASE
      WHEN s."code" IN ('MT_MECH', 'MT_ELEC', 'MT_CIVIL', 'MT_PROC') THEN 'تقني رياضي'
      ELSE s."name"
    END AS "name",
    CASE
      WHEN s."code" IN ('MT_MECH', 'MT_ELEC', 'MT_CIVIL', 'MT_PROC') THEN 'mt'
      ELSE s."slug"
    END AS "slug",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "streams" s
ON CONFLICT ("code") DO NOTHING;

UPDATE "streams" s
SET
  "family_id" = sf."id",
  "is_default" = CASE
    WHEN s."code" IN ('MT_MECH', 'MT_ELEC', 'MT_CIVIL', 'MT_PROC') THEN false
    ELSE true
  END
FROM "stream_families" sf
WHERE sf."code" = CASE
  WHEN s."code" IN ('MT_MECH', 'MT_ELEC', 'MT_CIVIL', 'MT_PROC') THEN 'MT'
  ELSE s."code"
END;

ALTER TABLE "streams"
ALTER COLUMN "family_id" SET NOT NULL;

ALTER TABLE "streams"
ADD CONSTRAINT "streams_family_id_fkey"
FOREIGN KEY ("family_id") REFERENCES "stream_families"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "streams_family_id_idx"
ON "streams"("family_id");

CREATE INDEX "streams_family_id_is_default_idx"
ON "streams"("family_id", "is_default");

CREATE TABLE "subject_families" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_families_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subject_families_code_key"
ON "subject_families"("code");

CREATE UNIQUE INDEX "subject_families_slug_key"
ON "subject_families"("slug");

ALTER TABLE "subjects"
ADD COLUMN "family_id" UUID,
ADD COLUMN "description" TEXT,
ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "subjects"
DROP CONSTRAINT IF EXISTS "subjects_code_check";

DROP INDEX IF EXISTS "subjects_name_key";

INSERT INTO "subject_families" (
    "code",
    "name",
    "slug",
    "created_at",
    "updated_at"
)
SELECT DISTINCT
    CASE
      WHEN subj."code" IN (
        'TECHNOLOGY_MECHANICAL',
        'TECHNOLOGY_ELECTRICAL',
        'TECHNOLOGY_CIVIL',
        'TECHNOLOGY_PROCESS'
      ) THEN 'TECHNOLOGY'
      ELSE subj."code"
    END AS "code",
    CASE
      WHEN subj."code" IN (
        'TECHNOLOGY_MECHANICAL',
        'TECHNOLOGY_ELECTRICAL',
        'TECHNOLOGY_CIVIL',
        'TECHNOLOGY_PROCESS'
      ) THEN 'التكنولوجيا'
      ELSE subj."name"
    END AS "name",
    CASE
      WHEN subj."code" IN (
        'TECHNOLOGY_MECHANICAL',
        'TECHNOLOGY_ELECTRICAL',
        'TECHNOLOGY_CIVIL',
        'TECHNOLOGY_PROCESS'
      ) THEN 'technology'
      ELSE subj."slug"
    END AS "slug",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "subjects" subj
ON CONFLICT ("code") DO NOTHING;

UPDATE "subjects" subj
SET
  "family_id" = sf."id",
  "is_default" = CASE
    WHEN subj."code" IN (
      'TECHNOLOGY_MECHANICAL',
      'TECHNOLOGY_ELECTRICAL',
      'TECHNOLOGY_CIVIL',
      'TECHNOLOGY_PROCESS'
    ) THEN false
    ELSE true
  END
FROM "subject_families" sf
WHERE sf."code" = CASE
  WHEN subj."code" IN (
    'TECHNOLOGY_MECHANICAL',
    'TECHNOLOGY_ELECTRICAL',
    'TECHNOLOGY_CIVIL',
    'TECHNOLOGY_PROCESS'
  ) THEN 'TECHNOLOGY'
  ELSE subj."code"
END;

ALTER TABLE "subjects"
ALTER COLUMN "family_id" SET NOT NULL;

ALTER TABLE "subjects"
ADD CONSTRAINT "subjects_family_id_fkey"
FOREIGN KEY ("family_id") REFERENCES "subject_families"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "subjects_family_id_idx"
ON "subjects"("family_id");

CREATE INDEX "subjects_family_id_is_default_idx"
ON "subjects"("family_id", "is_default");
