-- Promote the catalog spine to Curriculum/SubjectOffering/CurriculumNode and
-- normalize the course teaching layer. The guards are intentional: local data
-- already had parts of this rename applied outside migration history.

DROP TABLE IF EXISTS "roadmap_nodes";
DROP TABLE IF EXISTS "roadmap_sections";
DROP TABLE IF EXISTS "subject_roadmaps";

DO $$
BEGIN
  IF to_regclass('public.subject_curricula') IS NOT NULL
     AND to_regclass('public.curricula') IS NULL THEN
    ALTER TABLE "subject_curricula" RENAME TO "curricula";
  END IF;

  IF to_regclass('public.topics') IS NOT NULL
     AND to_regclass('public.curriculum_nodes') IS NULL THEN
    ALTER TABLE "topics" RENAME TO "curriculum_nodes";
  END IF;

  IF to_regclass('public.topic_skills') IS NOT NULL
     AND to_regclass('public.curriculum_node_skills') IS NULL THEN
    ALTER TABLE "topic_skills" RENAME TO "curriculum_node_skills";
  END IF;

  IF to_regclass('public.exam_node_topics') IS NOT NULL
     AND to_regclass('public.exam_node_curriculum_nodes') IS NULL THEN
    ALTER TABLE "exam_node_topics" RENAME TO "exam_node_curriculum_nodes";
  END IF;

  IF to_regclass('public.student_topic_rollups') IS NOT NULL
     AND to_regclass('public.student_curriculum_node_rollups') IS NULL THEN
    ALTER TABLE "student_topic_rollups" RENAME TO "student_curriculum_node_rollups";
  END IF;

  IF to_regclass('public.user_topic_stats') IS NOT NULL
     AND to_regclass('public.user_curriculum_node_stats') IS NULL THEN
    ALTER TABLE "user_topic_stats" RENAME TO "user_curriculum_node_stats";
  END IF;

  IF to_regclass('public.stream_subjects') IS NOT NULL
     AND to_regclass('public.subject_offerings') IS NULL THEN
    ALTER TABLE "stream_subjects" RENAME TO "subject_offerings";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CurriculumNodeKind') THEN
    CREATE TYPE "CurriculumNodeKind" AS ENUM (
      'FIELD',
      'UNIT',
      'TOPIC',
      'CONCEPT',
      'SKILL',
      'OPTIONAL_PORTAL'
    );
  END IF;
END $$;

ALTER TYPE "CurriculumNodeKind" ADD VALUE IF NOT EXISTS 'FIELD';
ALTER TYPE "CurriculumNodeKind" ADD VALUE IF NOT EXISTS 'UNIT';
ALTER TYPE "CurriculumNodeKind" ADD VALUE IF NOT EXISTS 'TOPIC';
ALTER TYPE "CurriculumNodeKind" ADD VALUE IF NOT EXISTS 'CONCEPT';
ALTER TYPE "CurriculumNodeKind" ADD VALUE IF NOT EXISTS 'SKILL';
ALTER TYPE "CurriculumNodeKind" ADD VALUE IF NOT EXISTS 'OPTIONAL_PORTAL';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TopicKind') THEN
    ALTER TABLE "curriculum_nodes" ALTER COLUMN "kind" DROP DEFAULT;
    ALTER TABLE "curriculum_nodes"
      ALTER COLUMN "kind" TYPE "CurriculumNodeKind"
      USING (
        CASE
          WHEN "kind"::text = 'SUBTOPIC' THEN 'CONCEPT'
          ELSE "kind"::text
        END
      )::"CurriculumNodeKind";
    ALTER TABLE "curriculum_nodes" ALTER COLUMN "kind" SET DEFAULT 'CONCEPT';
    DROP TYPE "TopicKind";
  END IF;
END $$;

ALTER TABLE "curriculum_nodes" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_node_skills'
      AND column_name = 'topic_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_node_skills'
      AND column_name = 'curriculum_node_id'
  ) THEN
    ALTER TABLE "curriculum_node_skills" RENAME COLUMN "topic_id" TO "curriculum_node_id";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exam_node_curriculum_nodes'
      AND column_name = 'topic_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exam_node_curriculum_nodes'
      AND column_name = 'curriculum_node_id'
  ) THEN
    ALTER TABLE "exam_node_curriculum_nodes" RENAME COLUMN "topic_id" TO "curriculum_node_id";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_curriculum_node_rollups'
      AND column_name = 'topic_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_curriculum_node_rollups'
      AND column_name = 'curriculum_node_id'
  ) THEN
    ALTER TABLE "student_curriculum_node_rollups" RENAME COLUMN "topic_id" TO "curriculum_node_id";
  END IF;

  IF to_regclass('public.user_curriculum_node_stats') IS NOT NULL
     AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_curriculum_node_stats'
        AND column_name = 'topic_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_curriculum_node_stats'
        AND column_name = 'curriculum_node_id'
    ) THEN
    ALTER TABLE "user_curriculum_node_stats" RENAME COLUMN "topic_id" TO "curriculum_node_id";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "user_curriculum_node_stats" (
  "user_id" UUID NOT NULL,
  "curriculum_node_id" UUID NOT NULL,
  "accuracy_percentage" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  "total_attempts" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_curriculum_node_stats_pkey" PRIMARY KEY ("user_id", "curriculum_node_id")
);

ALTER TABLE "subject_offerings" ADD COLUMN IF NOT EXISTS "curriculum_id" UUID;

DO $$
BEGIN
  IF to_regclass('public.subject_curriculum_streams') IS NOT NULL THEN
    UPDATE "subject_offerings" AS "offering"
    SET "curriculum_id" = (
      SELECT "curriculum"."id"
      FROM "curricula" AS "curriculum"
      INNER JOIN "subject_curriculum_streams" AS "curriculum_stream"
        ON "curriculum_stream"."curriculum_id" = "curriculum"."id"
      WHERE "curriculum"."subject_id" = "offering"."subject_id"
        AND "curriculum_stream"."stream_id" = "offering"."stream_id"
      ORDER BY
        "curriculum"."is_active" DESC,
        "curriculum"."valid_to_year" IS NULL DESC,
        "curriculum"."valid_from_year" DESC
      LIMIT 1
    )
    WHERE "offering"."curriculum_id" IS NULL;
  END IF;
END $$;

UPDATE "subject_offerings" AS "offering"
SET "curriculum_id" = (
  SELECT "curriculum"."id"
  FROM "curricula" AS "curriculum"
  WHERE "curriculum"."subject_id" = "offering"."subject_id"
    AND "curriculum"."valid_from_year" <= COALESCE(NULLIF("offering"."valid_from_year", 0), "curriculum"."valid_from_year")
    AND (
      "curriculum"."valid_to_year" IS NULL
      OR "offering"."valid_to_year" IS NULL
      OR "curriculum"."valid_to_year" >= "offering"."valid_to_year"
    )
  ORDER BY
    "curriculum"."is_active" DESC,
    "curriculum"."valid_to_year" IS NULL DESC,
    "curriculum"."valid_from_year" DESC
  LIMIT 1
)
WHERE "offering"."curriculum_id" IS NULL;

DELETE FROM "subject_offerings" WHERE "curriculum_id" IS NULL;
ALTER TABLE "subject_offerings" ALTER COLUMN "curriculum_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "subject_offerings_curriculum_id_idx" ON "subject_offerings"("curriculum_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subject_offerings_curriculum_id_fkey'
  ) THEN
    ALTER TABLE "subject_offerings"
      ADD CONSTRAINT "subject_offerings_curriculum_id_fkey"
      FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DROP TABLE IF EXISTS "subject_curriculum_streams";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CourseLessonStatus') THEN
    CREATE TYPE "CourseLessonStatus" AS ENUM (
      'DRAFT',
      'IN_REVIEW',
      'APPROVED',
      'PUBLISHED',
      'REJECTED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CourseStepKind') THEN
    CREATE TYPE "CourseStepKind" AS ENUM (
      'OBJECTIVE',
      'INTUITION',
      'FORMAL_RULE',
      'WORKED_EXAMPLE',
      'INTERACTION',
      'COMMON_TRAP',
      'BAC_LENS',
      'MICRO_QUIZ',
      'OPTIONAL_PORTAL',
      'SUMMARY',
      'CUSTOM'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CourseLessonProgressStatus') THEN
    CREATE TYPE "CourseLessonProgressStatus" AS ENUM (
      'NOT_STARTED',
      'IN_PROGRESS',
      'COMPLETED',
      'NEEDS_REVIEW'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "course_lessons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "curriculum_id" UUID,
  "curriculum_node_id" UUID NOT NULL,
  "code" TEXT,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "language" TEXT NOT NULL DEFAULT 'ar-DZ',
  "status" "CourseLessonStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "estimated_minutes" INTEGER,
  "source_markdown_path" TEXT,
  "content_hash" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "course_lessons" ADD COLUMN IF NOT EXISTS "curriculum_id" UUID;
ALTER TABLE "course_lessons" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "course_lessons" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "course_lessons" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'ar-DZ';
ALTER TABLE "course_lessons" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "course_lessons" ADD COLUMN IF NOT EXISTS "source_markdown_path" TEXT;
ALTER TABLE "course_lessons" ADD COLUMN IF NOT EXISTS "content_hash" TEXT;
ALTER TABLE "course_lessons" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

UPDATE "course_lessons" AS "lesson"
SET "curriculum_id" = "node"."curriculum_id"
FROM "curriculum_nodes" AS "node"
WHERE "lesson"."curriculum_node_id" = "node"."id"
  AND "lesson"."curriculum_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_lessons'
      AND column_name = 'source_blueprint_id'
  ) THEN
    UPDATE "course_lessons"
    SET "code" = COALESCE(
      NULLIF("source_blueprint_id", '') || ':' || "slug" || ':' || left("id"::text, 8),
      "code",
      "slug" || '-' || left("id"::text, 8)
    );
  ELSE
    UPDATE "course_lessons"
    SET "code" = COALESCE("code", "slug" || '-' || left("id"::text, 8))
    WHERE "code" IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_lessons'
      AND column_name = 'summary'
  ) THEN
    UPDATE "course_lessons"
    SET "description" = COALESCE("description", "summary");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_lessons'
      AND column_name = 'source_metadata'
  ) THEN
    UPDATE "course_lessons"
    SET "metadata" =
      COALESCE("metadata", '{}'::jsonb)
      || COALESCE("source_metadata", '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
        'legacyRole', "role",
        'quality', "quality",
        'learningObjective', "learning_objective",
        'sourceBlueprintId', "source_blueprint_id",
        'orderIndex', "order_index",
        'summary', "summary"
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_lessons'
      AND column_name = 'status'
      AND udt_name <> 'CourseLessonStatus'
  ) THEN
    ALTER TABLE "course_lessons" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "course_lessons"
      ALTER COLUMN "status" TYPE "CourseLessonStatus"
      USING (
        CASE
          WHEN "status"::text = 'APPROVED' THEN 'APPROVED'
          WHEN "status"::text = 'PUBLISHED' THEN 'PUBLISHED'
          WHEN "status"::text = 'REJECTED' THEN 'REJECTED'
          WHEN "status"::text = 'IN_REVIEW' THEN 'IN_REVIEW'
          ELSE 'DRAFT'
        END
      )::"CourseLessonStatus";
    ALTER TABLE "course_lessons" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
  END IF;
END $$;

ALTER TABLE "course_lessons" ALTER COLUMN "curriculum_id" SET NOT NULL;
ALTER TABLE "course_lessons" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "course_lessons" ALTER COLUMN "language" SET DEFAULT 'ar-DZ';
ALTER TABLE "course_lessons" ALTER COLUMN "version" SET DEFAULT 1;

ALTER TABLE "course_lessons" DROP COLUMN IF EXISTS "role";
ALTER TABLE "course_lessons" DROP COLUMN IF EXISTS "quality";
ALTER TABLE "course_lessons" DROP COLUMN IF EXISTS "summary";
ALTER TABLE "course_lessons" DROP COLUMN IF EXISTS "learning_objective";
ALTER TABLE "course_lessons" DROP COLUMN IF EXISTS "order_index";
ALTER TABLE "course_lessons" DROP COLUMN IF EXISTS "source_blueprint_id";
ALTER TABLE "course_lessons" DROP COLUMN IF EXISTS "source_metadata";

DO $$
BEGIN
  IF to_regclass('public.course_lesson_steps') IS NOT NULL
     AND to_regclass('public.course_steps') IS NULL THEN
    ALTER TABLE "course_lesson_steps" RENAME TO "course_steps";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "course_steps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lesson_id" UUID NOT NULL,
  "kind" "CourseStepKind" NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL,
  "data" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_steps_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_steps'
      AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_steps'
      AND column_name = 'kind'
  ) THEN
    ALTER TABLE "course_steps" RENAME COLUMN "type" TO "kind";
  END IF;
END $$;

ALTER TABLE "course_steps" ADD COLUMN IF NOT EXISTS "data" JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_steps'
      AND column_name = 'step_id'
  ) THEN
    UPDATE "course_steps"
    SET "data" =
      COALESCE("data", '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
        'legacyStepId', "step_id",
        'eyebrow', "eyebrow",
        'bullets', "bullets",
        'visual', "visual",
        'interaction', "interaction",
        'examLens', "exam_lens"
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_steps'
      AND column_name = 'kind'
      AND udt_name <> 'CourseStepKind'
  ) THEN
    ALTER TABLE "course_steps"
      ALTER COLUMN "kind" TYPE "CourseStepKind"
      USING (
        CASE
          WHEN "kind"::text = 'RULE' THEN 'FORMAL_RULE'
          WHEN "kind"::text = 'WORKED_EXAMPLE' THEN 'WORKED_EXAMPLE'
          WHEN "kind"::text = 'COMMON_TRAP' THEN 'COMMON_TRAP'
          WHEN "kind"::text = 'EXAM_LENS' THEN 'BAC_LENS'
          WHEN "kind"::text = 'QUICK_CHECK' THEN 'MICRO_QUIZ'
          WHEN "kind"::text = 'TAKEAWAY' THEN 'SUMMARY'
          WHEN "kind"::text = 'INSPECT' THEN 'INTERACTION'
          WHEN "kind"::text = 'HOOK' THEN 'OBJECTIVE'
          WHEN "kind"::text = 'EXPLAIN' THEN 'INTUITION'
          ELSE 'CUSTOM'
        END
      )::"CourseStepKind";
  END IF;
END $$;

ALTER TABLE "course_steps" DROP COLUMN IF EXISTS "step_id";
ALTER TABLE "course_steps" DROP COLUMN IF EXISTS "eyebrow";
ALTER TABLE "course_steps" DROP COLUMN IF EXISTS "bullets";
ALTER TABLE "course_steps" DROP COLUMN IF EXISTS "visual";
ALTER TABLE "course_steps" DROP COLUMN IF EXISTS "interaction";
ALTER TABLE "course_steps" DROP COLUMN IF EXISTS "exam_lens";

CREATE TABLE IF NOT EXISTS "course_visual_assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lesson_id" UUID,
  "step_id" UUID,
  "code" TEXT,
  "title" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'IMAGE',
  "url" TEXT,
  "prompt" TEXT,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_visual_assets_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_visual_assets'
      AND column_name = 'lesson_step_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_visual_assets'
      AND column_name = 'step_id'
  ) THEN
    ALTER TABLE "course_visual_assets" RENAME COLUMN "lesson_step_id" TO "step_id";
  END IF;
END $$;

ALTER TABLE "course_visual_assets" ADD COLUMN IF NOT EXISTS "lesson_id" UUID;
ALTER TABLE "course_visual_assets" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "course_visual_assets" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "course_visual_assets" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'IMAGE';
ALTER TABLE "course_visual_assets" ADD COLUMN IF NOT EXISTS "prompt" TEXT;
ALTER TABLE "course_visual_assets" ADD COLUMN IF NOT EXISTS "order_index" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "course_visual_assets" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

UPDATE "course_visual_assets" AS "asset"
SET "lesson_id" = "step"."lesson_id"
FROM "course_steps" AS "step"
WHERE "asset"."step_id" = "step"."id"
  AND "asset"."lesson_id" IS NULL;

DELETE FROM "course_visual_assets" WHERE "lesson_id" IS NULL;

UPDATE "course_visual_assets"
SET "code" = COALESCE("code", 'asset-' || left("id"::text, 8))
WHERE "code" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_visual_assets'
      AND column_name = 'path'
  ) THEN
    UPDATE "course_visual_assets"
    SET "metadata" =
      COALESCE("metadata", '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
        'legacyStatus', "status",
        'path', "path",
        'mimeType', "mime_type",
        'width', "width",
        'height', "height",
        'model', "model",
        'generatedAt', "generated_at",
        'reviewStatus', "review_status"
      ));
  END IF;
END $$;

ALTER TABLE "course_visual_assets" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "course_visual_assets" ALTER COLUMN "lesson_id" SET NOT NULL;
ALTER TABLE "course_visual_assets" ALTER COLUMN "url" DROP NOT NULL;
ALTER TABLE "course_visual_assets" DROP COLUMN IF EXISTS "status";
ALTER TABLE "course_visual_assets" DROP COLUMN IF EXISTS "path";
ALTER TABLE "course_visual_assets" DROP COLUMN IF EXISTS "mime_type";
ALTER TABLE "course_visual_assets" DROP COLUMN IF EXISTS "width";
ALTER TABLE "course_visual_assets" DROP COLUMN IF EXISTS "height";
ALTER TABLE "course_visual_assets" DROP COLUMN IF EXISTS "model";
ALTER TABLE "course_visual_assets" DROP COLUMN IF EXISTS "generated_at";
ALTER TABLE "course_visual_assets" DROP COLUMN IF EXISTS "review_status";

CREATE TABLE IF NOT EXISTS "course_depth_portals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lesson_id" UUID NOT NULL,
  "code" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_depth_portals_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_depth_portals'
      AND column_name = 'slug'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_depth_portals'
      AND column_name = 'code'
  ) THEN
    ALTER TABLE "course_depth_portals" RENAME COLUMN "slug" TO "code";
  END IF;
END $$;

ALTER TABLE "course_depth_portals" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "course_depth_portals" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_depth_portals'
      AND column_name = 'summary'
  ) THEN
    UPDATE "course_depth_portals"
    SET "metadata" =
      COALESCE("metadata", '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
        'kind', "kind",
        'summary', "summary",
        'estimatedMinutes', "estimated_minutes"
      ));
  END IF;
END $$;

UPDATE "course_depth_portals"
SET "code" = COALESCE("code", 'portal-' || left("id"::text, 8))
WHERE "code" IS NULL;

ALTER TABLE "course_depth_portals" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "course_depth_portals" DROP COLUMN IF EXISTS "kind";
ALTER TABLE "course_depth_portals" DROP COLUMN IF EXISTS "summary";
ALTER TABLE "course_depth_portals" DROP COLUMN IF EXISTS "estimated_minutes";

CREATE TABLE IF NOT EXISTS "course_quizzes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lesson_id" UUID NOT NULL,
  "step_id" UUID,
  "code" TEXT,
  "prompt" TEXT,
  "explanation" TEXT,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_quizzes_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_quizzes'
      AND column_name = 'question'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_quizzes'
      AND column_name = 'prompt'
  ) THEN
    ALTER TABLE "course_quizzes" RENAME COLUMN "question" TO "prompt";
  END IF;
END $$;

ALTER TABLE "course_quizzes" ADD COLUMN IF NOT EXISTS "step_id" UUID;
ALTER TABLE "course_quizzes" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "course_quizzes" ADD COLUMN IF NOT EXISTS "prompt" TEXT;
ALTER TABLE "course_quizzes" ADD COLUMN IF NOT EXISTS "order_index" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "course_quizzes" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_quizzes'
      AND column_name = 'correct_index'
  ) THEN
    UPDATE "course_quizzes"
    SET "metadata" =
      COALESCE("metadata", '{}'::jsonb)
      || jsonb_build_object('correctIndex', "correct_index");
  END IF;
END $$;

UPDATE "course_quizzes"
SET "code" = COALESCE("code", 'quiz-' || left("id"::text, 8))
WHERE "code" IS NULL;

ALTER TABLE "course_quizzes" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "course_quizzes" ALTER COLUMN "prompt" SET NOT NULL;
ALTER TABLE "course_quizzes" DROP COLUMN IF EXISTS "correct_index";

CREATE TABLE IF NOT EXISTS "course_quiz_options" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quiz_id" UUID NOT NULL,
  "order_index" INTEGER NOT NULL,
  "text" TEXT,
  "is_correct" BOOLEAN NOT NULL DEFAULT false,
  "feedback" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_quiz_options_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_quiz_options'
      AND column_name = 'option_text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_quiz_options'
      AND column_name = 'text'
  ) THEN
    ALTER TABLE "course_quiz_options" RENAME COLUMN "option_text" TO "text";
  END IF;
END $$;

ALTER TABLE "course_quiz_options" ADD COLUMN IF NOT EXISTS "text" TEXT;
ALTER TABLE "course_quiz_options" ADD COLUMN IF NOT EXISTS "feedback" TEXT;
ALTER TABLE "course_quiz_options" ALTER COLUMN "text" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "student_course_lesson_progress" (
  "user_id" UUID NOT NULL,
  "lesson_id" UUID NOT NULL,
  "status" "CourseLessonProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "progress_percent" INTEGER NOT NULL DEFAULT 0,
  "last_seen_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_course_lesson_progress_pkey" PRIMARY KEY ("user_id", "lesson_id")
);

ALTER TABLE "student_course_lesson_progress" ADD COLUMN IF NOT EXISTS "status" "CourseLessonProgressStatus" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "student_course_lesson_progress" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_course_lesson_progress'
      AND column_name = 'last_opened_at'
  ) THEN
    UPDATE "student_course_lesson_progress"
    SET "last_seen_at" = COALESCE("last_seen_at", "last_opened_at");
    ALTER TABLE "student_course_lesson_progress" DROP COLUMN "last_opened_at";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "course_lessons_curriculum_id_code_key" ON "course_lessons"("curriculum_id", "code");
CREATE INDEX IF NOT EXISTS "course_lessons_curriculum_id_status_idx" ON "course_lessons"("curriculum_id", "status");
CREATE INDEX IF NOT EXISTS "course_lessons_curriculum_node_id_status_idx" ON "course_lessons"("curriculum_node_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "course_steps_lesson_id_order_index_key" ON "course_steps"("lesson_id", "order_index");
CREATE INDEX IF NOT EXISTS "course_steps_lesson_id_kind_idx" ON "course_steps"("lesson_id", "kind");

CREATE UNIQUE INDEX IF NOT EXISTS "course_visual_assets_lesson_id_code_key" ON "course_visual_assets"("lesson_id", "code");
CREATE INDEX IF NOT EXISTS "course_visual_assets_lesson_id_order_index_idx" ON "course_visual_assets"("lesson_id", "order_index");
CREATE INDEX IF NOT EXISTS "course_visual_assets_step_id_idx" ON "course_visual_assets"("step_id");

CREATE UNIQUE INDEX IF NOT EXISTS "course_depth_portals_lesson_id_code_key" ON "course_depth_portals"("lesson_id", "code");
CREATE INDEX IF NOT EXISTS "course_depth_portals_lesson_id_order_index_idx" ON "course_depth_portals"("lesson_id", "order_index");

CREATE UNIQUE INDEX IF NOT EXISTS "course_quizzes_lesson_id_code_key" ON "course_quizzes"("lesson_id", "code");
CREATE INDEX IF NOT EXISTS "course_quizzes_lesson_id_order_index_idx" ON "course_quizzes"("lesson_id", "order_index");
CREATE INDEX IF NOT EXISTS "course_quizzes_step_id_idx" ON "course_quizzes"("step_id");

CREATE UNIQUE INDEX IF NOT EXISTS "course_quiz_options_quiz_id_order_index_key" ON "course_quiz_options"("quiz_id", "order_index");
CREATE INDEX IF NOT EXISTS "course_quiz_options_quiz_id_is_correct_idx" ON "course_quiz_options"("quiz_id", "is_correct");

CREATE INDEX IF NOT EXISTS "student_course_lesson_progress_lesson_id_idx" ON "student_course_lesson_progress"("lesson_id");
CREATE INDEX IF NOT EXISTS "student_course_lesson_progress_user_id_status_idx" ON "student_course_lesson_progress"("user_id", "status");
CREATE INDEX IF NOT EXISTS "student_course_lesson_progress_user_id_last_seen_at_idx" ON "student_course_lesson_progress"("user_id", "last_seen_at");

CREATE INDEX IF NOT EXISTS "user_curriculum_node_stats_curriculum_node_id_idx" ON "user_curriculum_node_stats"("curriculum_node_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_lessons_curriculum_id_fkey') THEN
    ALTER TABLE "course_lessons"
      ADD CONSTRAINT "course_lessons_curriculum_id_fkey"
      FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_lessons_curriculum_node_id_fkey') THEN
    ALTER TABLE "course_lessons"
      ADD CONSTRAINT "course_lessons_curriculum_node_id_fkey"
      FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_steps_lesson_id_fkey') THEN
    ALTER TABLE "course_steps"
      ADD CONSTRAINT "course_steps_lesson_id_fkey"
      FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_visual_assets_lesson_id_fkey') THEN
    ALTER TABLE "course_visual_assets"
      ADD CONSTRAINT "course_visual_assets_lesson_id_fkey"
      FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_visual_assets_step_id_fkey') THEN
    ALTER TABLE "course_visual_assets"
      ADD CONSTRAINT "course_visual_assets_step_id_fkey"
      FOREIGN KEY ("step_id") REFERENCES "course_steps"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_depth_portals_lesson_id_fkey') THEN
    ALTER TABLE "course_depth_portals"
      ADD CONSTRAINT "course_depth_portals_lesson_id_fkey"
      FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_quizzes_lesson_id_fkey') THEN
    ALTER TABLE "course_quizzes"
      ADD CONSTRAINT "course_quizzes_lesson_id_fkey"
      FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_quizzes_step_id_fkey') THEN
    ALTER TABLE "course_quizzes"
      ADD CONSTRAINT "course_quizzes_step_id_fkey"
      FOREIGN KEY ("step_id") REFERENCES "course_steps"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_quiz_options_quiz_id_fkey') THEN
    ALTER TABLE "course_quiz_options"
      ADD CONSTRAINT "course_quiz_options_quiz_id_fkey"
      FOREIGN KEY ("quiz_id") REFERENCES "course_quizzes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_course_lesson_progress_user_id_fkey') THEN
    ALTER TABLE "student_course_lesson_progress"
      ADD CONSTRAINT "student_course_lesson_progress_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_course_lesson_progress_lesson_id_fkey') THEN
    ALTER TABLE "student_course_lesson_progress"
      ADD CONSTRAINT "student_course_lesson_progress_lesson_id_fkey"
      FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_curriculum_node_stats_user_id_fkey') THEN
    ALTER TABLE "user_curriculum_node_stats"
      ADD CONSTRAINT "user_curriculum_node_stats_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_curriculum_node_stats_curriculum_node_id_fkey') THEN
    ALTER TABLE "user_curriculum_node_stats"
      ADD CONSTRAINT "user_curriculum_node_stats_curriculum_node_id_fkey"
      FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
