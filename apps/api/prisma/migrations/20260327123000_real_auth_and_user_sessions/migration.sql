ALTER TABLE "users"
ADD COLUMN "stream_family_id" UUID;

UPDATE "users"
SET "stream_family_id" = "streams"."family_id"
FROM "streams"
WHERE "users"."stream_id" = "streams"."id"
  AND "users"."stream_family_id" IS NULL;

CREATE INDEX "users_stream_family_id_idx" ON "users"("stream_family_id");

ALTER TABLE "users"
ADD CONSTRAINT "users_stream_family_id_fkey"
FOREIGN KEY ("stream_family_id") REFERENCES "stream_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "practice_sessions"
ADD COLUMN "user_id" UUID;

CREATE INDEX "practice_sessions_user_id_created_at_idx" ON "practice_sessions"("user_id", "created_at");

ALTER TABLE "practice_sessions"
ADD CONSTRAINT "practice_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
