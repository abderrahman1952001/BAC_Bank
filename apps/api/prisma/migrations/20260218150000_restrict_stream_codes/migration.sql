-- Normalize the legacy stream code used in the early seed script.
UPDATE "streams"
SET "code" = 'SE',
    "name" = 'علوم تجريبية'
WHERE "code" = 'SCI'
  AND NOT EXISTS (
    SELECT 1
    FROM "streams"
    WHERE "code" = 'SE'
  );

-- Keep canonical Arabic names for the supported BAC streams.
UPDATE "streams" SET "name" = 'علوم تجريبية' WHERE "code" = 'SE';
UPDATE "streams" SET "name" = 'رياضيات' WHERE "code" = 'M';
UPDATE "streams" SET "name" = 'تقني رياضي - هندسة ميكانيكية' WHERE "code" = 'MT_MECH';
UPDATE "streams" SET "name" = 'تقني رياضي - هندسة كهربائية' WHERE "code" = 'MT_ELEC';
UPDATE "streams" SET "name" = 'تقني رياضي - هندسة مدنية' WHERE "code" = 'MT_CIVIL';
UPDATE "streams" SET "name" = 'تقني رياضي - هندسة الطرائق' WHERE "code" = 'MT_PROC';
UPDATE "streams" SET "name" = 'تسيير و اقتصاد' WHERE "code" = 'GE';
UPDATE "streams" SET "name" = 'آداب و فلسفة' WHERE "code" = 'LP';
UPDATE "streams" SET "name" = 'لغات أجنبية' WHERE "code" = 'LE';

-- Enforce the allowed stream code set at the database level.
ALTER TABLE "streams"
ADD CONSTRAINT "streams_code_check"
CHECK (
  "code" IN (
    'SE',
    'M',
    'MT_MECH',
    'MT_ELEC',
    'MT_CIVIL',
    'MT_PROC',
    'GE',
    'LP',
    'LE'
  )
);
