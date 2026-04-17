CREATE TABLE "skills" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "subject_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_assessable" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "topic_skills" (
  "topic_id" UUID NOT NULL,
  "skill_id" UUID NOT NULL,
  "weight" DECIMAL(4,2) NOT NULL DEFAULT 1,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "topic_skills_pkey" PRIMARY KEY ("topic_id", "skill_id")
);

CREATE UNIQUE INDEX "skills_subject_id_code_key" ON "skills"("subject_id", "code");
CREATE UNIQUE INDEX "skills_subject_id_slug_key" ON "skills"("subject_id", "slug");
CREATE INDEX "skills_subject_id_idx" ON "skills"("subject_id");
CREATE INDEX "skills_subject_id_display_order_idx" ON "skills"("subject_id", "display_order");
CREATE INDEX "topic_skills_skill_id_idx" ON "topic_skills"("skill_id");

ALTER TABLE "skills"
ADD CONSTRAINT "skills_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "topic_skills"
ADD CONSTRAINT "topic_skills_topic_id_fkey"
FOREIGN KEY ("topic_id") REFERENCES "topics"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "topic_skills"
ADD CONSTRAINT "topic_skills_skill_id_fkey"
FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
