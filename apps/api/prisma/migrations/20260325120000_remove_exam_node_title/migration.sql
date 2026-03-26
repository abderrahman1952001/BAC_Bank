UPDATE "exam_nodes"
SET "label" = "title"
WHERE "title" IS NOT NULL
  AND (
    "label" IS NULL
    OR btrim("label") = ''
    OR "label" ~ '^(Exercise|Question) [0-9]+$'
  );

ALTER TABLE "exam_nodes"
DROP COLUMN "title";
