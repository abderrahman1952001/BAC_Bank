CREATE TYPE "ExamNodeSkillSource" AS ENUM ('TOPIC_DERIVED', 'MANUAL_REVIEW');

CREATE TABLE "exam_node_skills" (
    "node_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "weight" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "source" "ExamNodeSkillSource" NOT NULL DEFAULT 'TOPIC_DERIVED',
    "confidence" DECIMAL(4,2),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_node_skills_pkey" PRIMARY KEY ("node_id","skill_id")
);

CREATE INDEX "exam_node_skills_skill_id_idx" ON "exam_node_skills"("skill_id");
CREATE INDEX "exam_node_skills_source_idx" ON "exam_node_skills"("source");

ALTER TABLE "exam_node_skills"
ADD CONSTRAINT "exam_node_skills_node_id_fkey"
FOREIGN KEY ("node_id") REFERENCES "exam_nodes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_node_skills"
ADD CONSTRAINT "exam_node_skills_skill_id_fkey"
FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "exam_node_skills" (
    "node_id",
    "skill_id",
    "weight",
    "is_primary",
    "source",
    "confidence",
    "created_at",
    "updated_at"
)
SELECT
    "exam_node_topics"."node_id",
    "topic_skills"."skill_id",
    SUM("topic_skills"."weight")::DECIMAL(4,2) AS "weight",
    BOOL_OR("topic_skills"."is_primary") AS "is_primary",
    'TOPIC_DERIVED'::"ExamNodeSkillSource" AS "source",
    1::DECIMAL(4,2) AS "confidence",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "exam_node_topics"
INNER JOIN "topic_skills"
    ON "topic_skills"."topic_id" = "exam_node_topics"."topic_id"
GROUP BY "exam_node_topics"."node_id", "topic_skills"."skill_id";
