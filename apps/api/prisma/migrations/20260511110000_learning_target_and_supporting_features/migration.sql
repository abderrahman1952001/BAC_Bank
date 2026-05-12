-- Promote Skill-centric schema names to LearningTarget and add growth pillars.

-- 1) Rename skill tables and foreign-key columns.
DO $$
BEGIN
  IF to_regclass('public.skills') IS NOT NULL
     AND to_regclass('public.learning_targets') IS NULL THEN
    ALTER TABLE "skills" RENAME TO "learning_targets";
  END IF;

  IF to_regclass('public.curriculum_node_skills') IS NOT NULL
     AND to_regclass('public.curriculum_node_learning_targets') IS NULL THEN
    ALTER TABLE "curriculum_node_skills" RENAME TO "curriculum_node_learning_targets";
  END IF;

  IF to_regclass('public.exam_node_skills') IS NOT NULL
     AND to_regclass('public.exam_node_learning_targets') IS NULL THEN
    ALTER TABLE "exam_node_skills" RENAME TO "exam_node_learning_targets";
  END IF;

  IF to_regclass('public.student_skill_rollups') IS NOT NULL
     AND to_regclass('public.student_learning_target_rollups') IS NULL THEN
    ALTER TABLE "student_skill_rollups" RENAME TO "student_learning_target_rollups";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'curriculum_node_learning_targets'
      AND column_name = 'skill_id'
  ) THEN
    ALTER TABLE "curriculum_node_learning_targets"
      RENAME COLUMN "skill_id" TO "learning_target_id";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exam_node_learning_targets'
      AND column_name = 'skill_id'
  ) THEN
    ALTER TABLE "exam_node_learning_targets"
      RENAME COLUMN "skill_id" TO "learning_target_id";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_learning_target_rollups'
      AND column_name = 'skill_id'
  ) THEN
    ALTER TABLE "student_learning_target_rollups"
      RENAME COLUMN "skill_id" TO "learning_target_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ExamNodeSkillSource'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ExamNodeLearningTargetSource'
  ) THEN
    ALTER TYPE "ExamNodeSkillSource" RENAME TO "ExamNodeLearningTargetSource";
  END IF;
END $$;

-- 2) Enums used by the added modules.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ExamNodeLearningTargetSource'
  ) THEN
    CREATE TYPE "ExamNodeLearningTargetSource" AS ENUM (
      'TOPIC_DERIVED',
      'MANUAL_REVIEW'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'LearningTargetKind'
  ) THEN
    CREATE TYPE "LearningTargetKind" AS ENUM (
      'CONCEPTUAL_UNDERSTANDING',
      'PROCEDURE',
      'FORMULA_APPLICATION',
      'VISUAL_INTERPRETATION',
      'MEMORY_FACT',
      'METHOD',
      'COMMON_TRAP',
      'EXAM_STRUCTURE',
      'BAC_MARKING_PATTERN'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'FlashcardSourceType'
  ) THEN
    CREATE TYPE "FlashcardSourceType" AS ENUM (
      'PLATFORM',
      'USER_CREATED',
      'COURSE_STEP',
      'COURSE_LESSON',
      'OFFICIAL_CORRECTION',
      'STUDENT_MISTAKE',
      'AI_DRAFT'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'FlashcardType'
  ) THEN
    CREATE TYPE "FlashcardType" AS ENUM (
      'FRONT_BACK',
      'CLOZE',
      'IMAGE_LABEL',
      'ORDERED_STEPS'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'FlashcardReviewRating'
  ) THEN
    CREATE TYPE "FlashcardReviewRating" AS ENUM (
      'AGAIN',
      'HARD',
      'GOOD',
      'EASY'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'LabToolStatus'
  ) THEN
    CREATE TYPE "LabToolStatus" AS ENUM (
      'READY',
      'DRAFT',
      'HIDDEN'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.learning_targets') IS NOT NULL THEN
    ALTER TABLE "learning_targets"
      ADD COLUMN IF NOT EXISTS "kind" "LearningTargetKind" NOT NULL DEFAULT 'PROCEDURE'::"LearningTargetKind";
    ALTER TABLE "learning_targets"
      ADD COLUMN IF NOT EXISTS "is_assessable" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "learning_targets"
      ADD COLUMN IF NOT EXISTS "is_reviewable" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- 3) Flashcards + spaced review and overrides.
CREATE TABLE IF NOT EXISTS "flashcard_decks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID,
  "subject_id" UUID,
  "curriculum_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "source_type" "FlashcardSourceType" NOT NULL DEFAULT 'USER_CREATED',
  "is_platform_seed" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "flashcards" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_by_user_id" UUID,
  "subject_id" UUID,
  "curriculum_node_id" UUID,
  "learning_target_id" UUID,
  "course_lesson_id" UUID,
  "course_step_id" UUID,
  "exam_node_id" UUID,
  "type" "FlashcardType" NOT NULL,
  "source_type" "FlashcardSourceType" NOT NULL DEFAULT 'USER_CREATED',
  "front" TEXT NOT NULL,
  "back" TEXT NOT NULL,
  "data" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "flashcard_deck_cards" (
  "deck_id" UUID NOT NULL,
  "card_id" UUID NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("deck_id", "card_id")
);

CREATE TABLE IF NOT EXISTS "student_flashcard_states" (
  "user_id" UUID NOT NULL,
  "card_id" UUID NOT NULL,
  "due_at" TIMESTAMP(3) NOT NULL,
  "interval_days" INTEGER NOT NULL DEFAULT 0,
  "ease_factor" DECIMAL(4,2) NOT NULL DEFAULT 2.5,
  "review_count" INTEGER NOT NULL DEFAULT 0,
  "lapse_count" INTEGER NOT NULL DEFAULT 0,
  "last_reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("user_id", "card_id")
);

CREATE TABLE IF NOT EXISTS "flashcard_review_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "card_id" UUID NOT NULL,
  "rating" "FlashcardReviewRating" NOT NULL,
  "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);

CREATE TABLE IF NOT EXISTS "user_flashcard_overrides" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "card_id" UUID NOT NULL,
  "is_hidden" BOOLEAN NOT NULL DEFAULT false,
  "due_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_flashcard_overrides_user_id_card_id_key" UNIQUE ("user_id", "card_id")
);

CREATE INDEX IF NOT EXISTS "flashcard_decks_owner_user_id_idx" ON "flashcard_decks"("owner_user_id");
CREATE INDEX IF NOT EXISTS "flashcard_decks_subject_id_idx" ON "flashcard_decks"("subject_id");
CREATE INDEX IF NOT EXISTS "flashcard_decks_curriculum_id_idx" ON "flashcard_decks"("curriculum_id");
CREATE INDEX IF NOT EXISTS "flashcard_decks_source_type_idx" ON "flashcard_decks"("source_type");
CREATE INDEX IF NOT EXISTS "flashcard_deck_cards_card_id_idx" ON "flashcard_deck_cards"("card_id");
CREATE INDEX IF NOT EXISTS "flashcard_deck_cards_deck_id_order_index_idx" ON "flashcard_deck_cards"("deck_id", "order_index");
CREATE INDEX IF NOT EXISTS "flashcards_created_by_user_id_idx" ON "flashcards"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "flashcards_learning_target_id_idx" ON "flashcards"("learning_target_id");
CREATE INDEX IF NOT EXISTS "flashcards_curriculum_node_id_idx" ON "flashcards"("curriculum_node_id");
CREATE INDEX IF NOT EXISTS "flashcards_course_lesson_id_idx" ON "flashcards"("course_lesson_id");
CREATE INDEX IF NOT EXISTS "flashcards_course_step_id_idx" ON "flashcards"("course_step_id");
CREATE INDEX IF NOT EXISTS "flashcards_exam_node_id_idx" ON "flashcards"("exam_node_id");
CREATE INDEX IF NOT EXISTS "flashcards_subject_id_idx" ON "flashcards"("subject_id");
CREATE INDEX IF NOT EXISTS "student_flashcard_states_user_id_due_at_idx" ON "student_flashcard_states"("user_id", "due_at");
CREATE INDEX IF NOT EXISTS "flashcard_review_logs_user_id_reviewed_at_idx" ON "flashcard_review_logs"("user_id", "reviewed_at");
CREATE INDEX IF NOT EXISTS "flashcard_review_logs_card_id_idx" ON "flashcard_review_logs"("card_id");
CREATE INDEX IF NOT EXISTS "user_flashcard_overrides_user_id_idx" ON "user_flashcard_overrides"("user_id");
CREATE INDEX IF NOT EXISTS "user_flashcard_overrides_card_id_idx" ON "user_flashcard_overrides"("card_id");
CREATE INDEX IF NOT EXISTS "user_flashcard_overrides_due_at_idx" ON "user_flashcard_overrides"("due_at");

-- 4) Course interaction and quiz attempts.
CREATE TABLE IF NOT EXISTS "student_course_step_progress" (
  "user_id" UUID NOT NULL,
  "step_id" UUID NOT NULL,
  "viewed_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("user_id", "step_id")
);

CREATE INDEX IF NOT EXISTS "student_course_step_progress_user_id_viewed_at_idx" ON "student_course_step_progress"("user_id", "viewed_at");

CREATE TABLE IF NOT EXISTS "student_course_quiz_attempts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "quiz_id" UUID NOT NULL,
  "is_correct" BOOLEAN NOT NULL,
  "selected_option_id" UUID,
  "answer_json" JSONB,
  "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "student_course_quiz_attempts_user_id_quiz_id_attempted_at_idx" ON "student_course_quiz_attempts"("user_id", "quiz_id", "attempted_at");
CREATE INDEX IF NOT EXISTS "student_course_quiz_attempts_selected_option_id_idx" ON "student_course_quiz_attempts"("selected_option_id");

-- 5) Labs and lab events.
CREATE TABLE IF NOT EXISTS "lab_tools" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subject_id" UUID,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "LabToolStatus" NOT NULL DEFAULT 'READY',
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "lab_tools_slug_key" ON "lab_tools"("slug");
CREATE INDEX IF NOT EXISTS "lab_tools_subject_id_idx" ON "lab_tools"("subject_id");
CREATE INDEX IF NOT EXISTS "lab_tools_status_idx" ON "lab_tools"("status");

CREATE TABLE IF NOT EXISTS "lab_missions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tool_id" UUID NOT NULL,
  "curriculum_node_id" UUID,
  "learning_target_id" UUID,
  "course_lesson_id" UUID,
  "title" TEXT NOT NULL,
  "goal" TEXT NOT NULL,
  "preset" JSONB,
  "exit_check" JSONB,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "lab_missions_tool_id_order_index_idx" ON "lab_missions"("tool_id", "order_index");
CREATE INDEX IF NOT EXISTS "lab_missions_curriculum_node_id_idx" ON "lab_missions"("curriculum_node_id");
CREATE INDEX IF NOT EXISTS "lab_missions_learning_target_id_idx" ON "lab_missions"("learning_target_id");
CREATE INDEX IF NOT EXISTS "lab_missions_course_lesson_id_idx" ON "lab_missions"("course_lesson_id");

CREATE TABLE IF NOT EXISTS "student_lab_mission_attempts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "mission_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "result_json" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "student_lab_mission_attempts_user_id_started_at_idx" ON "student_lab_mission_attempts"("user_id", "started_at");
CREATE INDEX IF NOT EXISTS "student_lab_mission_attempts_mission_id_idx" ON "student_lab_mission_attempts"("mission_id");

-- 6) Cross-pillar learning event log.
CREATE TABLE IF NOT EXISTS "student_learning_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_id" UUID,
  "curriculum_node_id" UUID,
  "learning_target_id" UUID,
  "course_lesson_id" UUID,
  "exam_node_id" UUID,
  "value" JSONB,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "student_learning_events_user_id_occurred_at_idx" ON "student_learning_events"("user_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "student_learning_events_user_id_event_type_occurred_at_idx" ON "student_learning_events"("user_id", "event_type", "occurred_at");
CREATE INDEX IF NOT EXISTS "student_learning_events_user_id_learning_target_id_occurred_idx" ON "student_learning_events"("user_id", "learning_target_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "student_learning_events_user_id_curriculum_node_id_occurred_idx" ON "student_learning_events"("user_id", "curriculum_node_id", "occurred_at");

-- 7) Root exam node order uniqueness for top-level nodes.
CREATE UNIQUE INDEX IF NOT EXISTS "exam_nodes_root_order_unique"
ON "exam_nodes" ("variant_id", "order_index")
WHERE "parent_id" IS NULL;

-- 8) Add missing FK constraints for newly added objects (if not already present).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcard_decks_owner_user_id_fkey'
  ) AND to_regclass('public.flashcard_decks') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE "flashcard_decks"
      ADD CONSTRAINT "flashcard_decks_owner_user_id_fkey"
      FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcard_decks_subject_id_fkey'
  ) AND to_regclass('public.flashcard_decks') IS NOT NULL AND to_regclass('public.subjects') IS NOT NULL THEN
    ALTER TABLE "flashcard_decks"
      ADD CONSTRAINT "flashcard_decks_subject_id_fkey"
      FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcard_decks_curriculum_id_fkey'
  ) AND to_regclass('public.flashcard_decks') IS NOT NULL AND to_regclass('public.curricula') IS NOT NULL THEN
    ALTER TABLE "flashcard_decks"
      ADD CONSTRAINT "flashcard_decks_curriculum_id_fkey"
      FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcards_created_by_user_id_fkey'
  ) AND to_regclass('public.flashcards') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE "flashcards"
      ADD CONSTRAINT "flashcards_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcards_subject_id_fkey'
  ) AND to_regclass('public.flashcards') IS NOT NULL AND to_regclass('public.subjects') IS NOT NULL THEN
    ALTER TABLE "flashcards"
      ADD CONSTRAINT "flashcards_subject_id_fkey"
      FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcards_curriculum_node_id_fkey'
  ) AND to_regclass('public.flashcards') IS NOT NULL AND to_regclass('public.curriculum_nodes') IS NOT NULL THEN
    ALTER TABLE "flashcards"
      ADD CONSTRAINT "flashcards_curriculum_node_id_fkey"
      FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcards_learning_target_id_fkey'
  ) AND to_regclass('public.flashcards') IS NOT NULL AND to_regclass('public.learning_targets') IS NOT NULL THEN
    ALTER TABLE "flashcards"
      ADD CONSTRAINT "flashcards_learning_target_id_fkey"
      FOREIGN KEY ("learning_target_id") REFERENCES "learning_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcards_course_lesson_id_fkey'
  ) AND to_regclass('public.flashcards') IS NOT NULL AND to_regclass('public.course_lessons') IS NOT NULL THEN
    ALTER TABLE "flashcards"
      ADD CONSTRAINT "flashcards_course_lesson_id_fkey"
      FOREIGN KEY ("course_lesson_id") REFERENCES "course_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcards_course_step_id_fkey'
  ) AND to_regclass('public.flashcards') IS NOT NULL AND to_regclass('public.course_steps') IS NOT NULL THEN
    ALTER TABLE "flashcards"
      ADD CONSTRAINT "flashcards_course_step_id_fkey"
      FOREIGN KEY ("course_step_id") REFERENCES "course_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcards_exam_node_id_fkey'
  ) AND to_regclass('public.flashcards') IS NOT NULL AND to_regclass('public.exam_nodes') IS NOT NULL THEN
    ALTER TABLE "flashcards"
      ADD CONSTRAINT "flashcards_exam_node_id_fkey"
      FOREIGN KEY ("exam_node_id") REFERENCES "exam_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcard_deck_cards_deck_id_fkey'
  ) AND to_regclass('public.flashcard_deck_cards') IS NOT NULL AND to_regclass('public.flashcard_decks') IS NOT NULL THEN
    ALTER TABLE "flashcard_deck_cards"
      ADD CONSTRAINT "flashcard_deck_cards_deck_id_fkey"
      FOREIGN KEY ("deck_id") REFERENCES "flashcard_decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcard_deck_cards_card_id_fkey'
  ) AND to_regclass('public.flashcard_deck_cards') IS NOT NULL AND to_regclass('public.flashcards') IS NOT NULL THEN
    ALTER TABLE "flashcard_deck_cards"
      ADD CONSTRAINT "flashcard_deck_cards_card_id_fkey"
      FOREIGN KEY ("card_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_flashcard_states_user_id_fkey'
  ) AND to_regclass('public.student_flashcard_states') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE "student_flashcard_states"
      ADD CONSTRAINT "student_flashcard_states_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_flashcard_states_card_id_fkey'
  ) AND to_regclass('public.student_flashcard_states') IS NOT NULL AND to_regclass('public.flashcards') IS NOT NULL THEN
    ALTER TABLE "student_flashcard_states"
      ADD CONSTRAINT "student_flashcard_states_card_id_fkey"
      FOREIGN KEY ("card_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcard_review_logs_user_id_fkey'
  ) AND to_regclass('public.flashcard_review_logs') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE "flashcard_review_logs"
      ADD CONSTRAINT "flashcard_review_logs_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcard_review_logs_card_id_fkey'
  ) AND to_regclass('public.flashcard_review_logs') IS NOT NULL AND to_regclass('public.flashcards') IS NOT NULL THEN
    ALTER TABLE "flashcard_review_logs"
      ADD CONSTRAINT "flashcard_review_logs_card_id_fkey"
      FOREIGN KEY ("card_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_flashcard_overrides_user_id_fkey'
  ) AND to_regclass('public.user_flashcard_overrides') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE "user_flashcard_overrides"
      ADD CONSTRAINT "user_flashcard_overrides_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_flashcard_overrides_card_id_fkey'
  ) AND to_regclass('public.user_flashcard_overrides') IS NOT NULL AND to_regclass('public.flashcards') IS NOT NULL THEN
    ALTER TABLE "user_flashcard_overrides"
      ADD CONSTRAINT "user_flashcard_overrides_card_id_fkey"
      FOREIGN KEY ("card_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_course_step_progress_user_id_fkey'
  ) AND to_regclass('public.student_course_step_progress') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE "student_course_step_progress"
      ADD CONSTRAINT "student_course_step_progress_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_course_step_progress_step_id_fkey'
  ) AND to_regclass('public.student_course_step_progress') IS NOT NULL AND to_regclass('public.course_steps') IS NOT NULL THEN
    ALTER TABLE "student_course_step_progress"
      ADD CONSTRAINT "student_course_step_progress_step_id_fkey"
      FOREIGN KEY ("step_id") REFERENCES "course_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_course_quiz_attempts_user_id_fkey'
  ) AND to_regclass('public.student_course_quiz_attempts') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE "student_course_quiz_attempts"
      ADD CONSTRAINT "student_course_quiz_attempts_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_course_quiz_attempts_quiz_id_fkey'
  ) AND to_regclass('public.student_course_quiz_attempts') IS NOT NULL AND to_regclass('public.course_quizzes') IS NOT NULL THEN
    ALTER TABLE "student_course_quiz_attempts"
      ADD CONSTRAINT "student_course_quiz_attempts_quiz_id_fkey"
      FOREIGN KEY ("quiz_id") REFERENCES "course_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_course_quiz_attempts_selected_option_id_fkey'
  ) AND to_regclass('public.student_course_quiz_attempts') IS NOT NULL AND to_regclass('public.course_quiz_options') IS NOT NULL THEN
    ALTER TABLE "student_course_quiz_attempts"
      ADD CONSTRAINT "student_course_quiz_attempts_selected_option_id_fkey"
      FOREIGN KEY ("selected_option_id") REFERENCES "course_quiz_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lab_tools_subject_id_fkey'
  ) AND to_regclass('public.lab_tools') IS NOT NULL AND to_regclass('public.subjects') IS NOT NULL THEN
    ALTER TABLE "lab_tools"
      ADD CONSTRAINT "lab_tools_subject_id_fkey"
      FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lab_missions_tool_id_fkey'
  ) AND to_regclass('public.lab_missions') IS NOT NULL AND to_regclass('public.lab_tools') IS NOT NULL THEN
    ALTER TABLE "lab_missions"
      ADD CONSTRAINT "lab_missions_tool_id_fkey"
      FOREIGN KEY ("tool_id") REFERENCES "lab_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lab_missions_curriculum_node_id_fkey'
  ) AND to_regclass('public.lab_missions') IS NOT NULL AND to_regclass('public.curriculum_nodes') IS NOT NULL THEN
    ALTER TABLE "lab_missions"
      ADD CONSTRAINT "lab_missions_curriculum_node_id_fkey"
      FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lab_missions_learning_target_id_fkey'
  ) AND to_regclass('public.lab_missions') IS NOT NULL AND to_regclass('public.learning_targets') IS NOT NULL THEN
    ALTER TABLE "lab_missions"
      ADD CONSTRAINT "lab_missions_learning_target_id_fkey"
      FOREIGN KEY ("learning_target_id") REFERENCES "learning_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lab_missions_course_lesson_id_fkey'
  ) AND to_regclass('public.lab_missions') IS NOT NULL AND to_regclass('public.course_lessons') IS NOT NULL THEN
    ALTER TABLE "lab_missions"
      ADD CONSTRAINT "lab_missions_course_lesson_id_fkey"
      FOREIGN KEY ("course_lesson_id") REFERENCES "course_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_lab_mission_attempts_user_id_fkey'
  ) AND to_regclass('public.student_lab_mission_attempts') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE "student_lab_mission_attempts"
      ADD CONSTRAINT "student_lab_mission_attempts_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_lab_mission_attempts_mission_id_fkey'
  ) AND to_regclass('public.student_lab_mission_attempts') IS NOT NULL AND to_regclass('public.lab_missions') IS NOT NULL THEN
    ALTER TABLE "student_lab_mission_attempts"
      ADD CONSTRAINT "student_lab_mission_attempts_mission_id_fkey"
      FOREIGN KEY ("mission_id") REFERENCES "lab_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_learning_events_user_id_fkey'
  ) AND to_regclass('public.student_learning_events') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE "student_learning_events"
      ADD CONSTRAINT "student_learning_events_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_learning_events_curriculum_node_id_fkey'
  ) AND to_regclass('public.student_learning_events') IS NOT NULL AND to_regclass('public.curriculum_nodes') IS NOT NULL THEN
    ALTER TABLE "student_learning_events"
      ADD CONSTRAINT "student_learning_events_curriculum_node_id_fkey"
      FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_learning_events_learning_target_id_fkey'
  ) AND to_regclass('public.student_learning_events') IS NOT NULL AND to_regclass('public.learning_targets') IS NOT NULL THEN
    ALTER TABLE "student_learning_events"
      ADD CONSTRAINT "student_learning_events_learning_target_id_fkey"
      FOREIGN KEY ("learning_target_id") REFERENCES "learning_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_learning_events_course_lesson_id_fkey'
  ) AND to_regclass('public.student_learning_events') IS NOT NULL AND to_regclass('public.course_lessons') IS NOT NULL THEN
    ALTER TABLE "student_learning_events"
      ADD CONSTRAINT "student_learning_events_course_lesson_id_fkey"
      FOREIGN KEY ("course_lesson_id") REFERENCES "course_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_learning_events_exam_node_id_fkey'
  ) AND to_regclass('public.student_learning_events') IS NOT NULL AND to_regclass('public.exam_nodes') IS NOT NULL THEN
    ALTER TABLE "student_learning_events"
      ADD CONSTRAINT "student_learning_events_exam_node_id_fkey"
      FOREIGN KEY ("exam_node_id") REFERENCES "exam_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 9) Ensure course lesson slug uniqueness at the curriculum scope is enforced.
CREATE UNIQUE INDEX IF NOT EXISTS "course_lessons_curriculum_id_slug_key"
ON "course_lessons" ("curriculum_id", "slug");

-- 10) Normalize names left behind by earlier table renames so Prisma's
-- migration diff sees the same database shape as the schema.
ALTER TABLE IF EXISTS "course_visual_assets"
  ALTER COLUMN "kind" DROP DEFAULT;

DO $$
DECLARE
  constraint_rename text[];
  index_rename text[];
  constraint_renames text[][] := ARRAY[
    ARRAY['curricula', 'subject_curricula_pkey', 'curricula_pkey'],
    ARRAY['curricula', 'subject_curricula_subject_id_fkey', 'curricula_subject_id_fkey'],
    ARRAY['curriculum_nodes', 'topics_pkey', 'curriculum_nodes_pkey'],
    ARRAY['curriculum_nodes', 'topics_curriculum_id_fkey', 'curriculum_nodes_curriculum_id_fkey'],
    ARRAY['curriculum_nodes', 'topics_parent_id_fkey', 'curriculum_nodes_parent_id_fkey'],
    ARRAY['curriculum_nodes', 'topics_subject_id_fkey', 'curriculum_nodes_subject_id_fkey'],
    ARRAY['curriculum_node_learning_targets', 'topic_skills_pkey', 'curriculum_node_learning_targets_pkey'],
    ARRAY['curriculum_node_learning_targets', 'topic_skills_skill_id_fkey', 'curriculum_node_learning_targets_learning_target_id_fkey'],
    ARRAY['curriculum_node_learning_targets', 'topic_skills_topic_id_fkey', 'curriculum_node_learning_targets_curriculum_node_id_fkey'],
    ARRAY['exam_node_curriculum_nodes', 'exam_node_topics_pkey', 'exam_node_curriculum_nodes_pkey'],
    ARRAY['exam_node_curriculum_nodes', 'exam_node_topics_node_id_fkey', 'exam_node_curriculum_nodes_node_id_fkey'],
    ARRAY['exam_node_curriculum_nodes', 'exam_node_topics_topic_id_fkey', 'exam_node_curriculum_nodes_curriculum_node_id_fkey'],
    ARRAY['exam_node_learning_targets', 'exam_node_skills_pkey', 'exam_node_learning_targets_pkey'],
    ARRAY['exam_node_learning_targets', 'exam_node_skills_node_id_fkey', 'exam_node_learning_targets_node_id_fkey'],
    ARRAY['exam_node_learning_targets', 'exam_node_skills_skill_id_fkey', 'exam_node_learning_targets_learning_target_id_fkey'],
    ARRAY['learning_targets', 'skills_pkey', 'learning_targets_pkey'],
    ARRAY['learning_targets', 'skills_curriculum_id_fkey', 'learning_targets_curriculum_id_fkey'],
    ARRAY['learning_targets', 'skills_subject_id_fkey', 'learning_targets_subject_id_fkey'],
    ARRAY['student_curriculum_node_rollups', 'student_topic_rollups_pkey', 'student_curriculum_node_rollups_pkey'],
    ARRAY['student_curriculum_node_rollups', 'student_topic_rollups_topic_id_fkey', 'student_curriculum_node_rollups_curriculum_node_id_fkey'],
    ARRAY['student_curriculum_node_rollups', 'student_topic_rollups_user_id_fkey', 'student_curriculum_node_rollups_user_id_fkey'],
    ARRAY['student_learning_target_rollups', 'student_skill_rollups_pkey', 'student_learning_target_rollups_pkey'],
    ARRAY['student_learning_target_rollups', 'student_skill_rollups_skill_id_fkey', 'student_learning_target_rollups_learning_target_id_fkey'],
    ARRAY['student_learning_target_rollups', 'student_skill_rollups_user_id_fkey', 'student_learning_target_rollups_user_id_fkey'],
    ARRAY['subject_offerings', 'stream_subjects_pkey', 'subject_offerings_pkey'],
    ARRAY['subject_offerings', 'stream_subjects_stream_id_fkey', 'subject_offerings_stream_id_fkey'],
    ARRAY['subject_offerings', 'stream_subjects_subject_id_fkey', 'subject_offerings_subject_id_fkey'],
    ARRAY['user_curriculum_node_stats', 'user_topic_stats_pkey', 'user_curriculum_node_stats_pkey']
  ];
  index_renames text[][] := ARRAY[
    ARRAY['subject_curricula_subject_id_code_key', 'curricula_subject_id_code_key'],
    ARRAY['subject_curricula_subject_id_family_code_idx', 'curricula_subject_id_family_code_idx'],
    ARRAY['subject_curricula_subject_id_is_active_idx', 'curricula_subject_id_is_active_idx'],
    ARRAY['subject_curricula_subject_id_valid_from_year_valid_to_year_idx', 'curricula_subject_id_valid_from_year_valid_to_year_idx'],
    ARRAY['topics_curriculum_id_code_key', 'curriculum_nodes_curriculum_id_code_key'],
    ARRAY['topics_curriculum_id_display_order_idx', 'curriculum_nodes_curriculum_id_display_order_idx'],
    ARRAY['topics_curriculum_id_idx', 'curriculum_nodes_curriculum_id_idx'],
    ARRAY['topics_curriculum_id_parent_id_name_key', 'curriculum_nodes_curriculum_id_parent_id_name_key'],
    ARRAY['topics_curriculum_id_path_idx', 'curriculum_nodes_curriculum_id_path_idx'],
    ARRAY['topics_curriculum_id_slug_key', 'curriculum_nodes_curriculum_id_slug_key'],
    ARRAY['topics_parent_id_idx', 'curriculum_nodes_parent_id_idx'],
    ARRAY['topics_subject_id_idx', 'curriculum_nodes_subject_id_idx'],
    ARRAY['topic_skills_skill_id_idx', 'curriculum_node_learning_targets_learning_target_id_idx'],
    ARRAY['exam_node_topics_topic_id_idx', 'exam_node_curriculum_nodes_curriculum_node_id_idx'],
    ARRAY['exam_node_skills_skill_id_idx', 'exam_node_learning_targets_learning_target_id_idx'],
    ARRAY['exam_node_skills_source_idx', 'exam_node_learning_targets_source_idx'],
    ARRAY['skills_curriculum_id_code_key', 'learning_targets_curriculum_id_code_key'],
    ARRAY['skills_curriculum_id_display_order_idx', 'learning_targets_curriculum_id_display_order_idx'],
    ARRAY['skills_curriculum_id_idx', 'learning_targets_curriculum_id_idx'],
    ARRAY['skills_curriculum_id_slug_key', 'learning_targets_curriculum_id_slug_key'],
    ARRAY['skills_subject_id_idx', 'learning_targets_subject_id_idx'],
    ARRAY['student_topic_rollups_topic_id_idx', 'student_curriculum_node_rollups_curriculum_node_id_idx'],
    ARRAY['student_topic_rollups_user_id_last_seen_at_idx', 'student_curriculum_node_rollups_user_id_last_seen_at_idx'],
    ARRAY['student_topic_rollups_user_id_mastery_bucket_idx', 'student_curriculum_node_rollups_user_id_mastery_bucket_idx'],
    ARRAY['student_topic_rollups_user_id_weakness_score_idx', 'student_curriculum_node_rollups_user_id_weakness_score_idx'],
    ARRAY['student_skill_rollups_skill_id_idx', 'student_learning_target_rollups_learning_target_id_idx'],
    ARRAY['student_skill_rollups_user_id_last_seen_at_idx', 'student_learning_target_rollups_user_id_last_seen_at_idx'],
    ARRAY['student_skill_rollups_user_id_mastery_bucket_idx', 'student_learning_target_rollups_user_id_mastery_bucket_idx'],
    ARRAY['student_skill_rollups_user_id_weakness_score_idx', 'student_learning_target_rollups_user_id_weakness_score_idx'],
    ARRAY['stream_subjects_stream_id_subject_id_valid_from_year_key', 'subject_offerings_stream_id_subject_id_valid_from_year_key'],
    ARRAY['stream_subjects_stream_id_valid_from_year_valid_to_year_idx', 'subject_offerings_stream_id_valid_from_year_valid_to_year_idx'],
    ARRAY['stream_subjects_subject_id_idx', 'subject_offerings_subject_id_idx']
  ];
BEGIN
  FOREACH constraint_rename SLICE 1 IN ARRAY constraint_renames LOOP
    IF to_regclass('public.' || constraint_rename[1]) IS NOT NULL
       AND EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = to_regclass('public.' || constraint_rename[1])
          AND conname = constraint_rename[2]
      )
       AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = to_regclass('public.' || constraint_rename[1])
          AND conname = constraint_rename[3]
      ) THEN
      EXECUTE format(
        'ALTER TABLE %I RENAME CONSTRAINT %I TO %I',
        constraint_rename[1],
        constraint_rename[2],
        constraint_rename[3]
      );
    END IF;
  END LOOP;

  FOREACH index_rename SLICE 1 IN ARRAY index_renames LOOP
    IF to_regclass('public.' || index_rename[1]) IS NOT NULL
       AND to_regclass('public.' || index_rename[2]) IS NULL THEN
      EXECUTE format(
        'ALTER INDEX %I RENAME TO %I',
        index_rename[1],
        index_rename[2]
      );
    END IF;
  END LOOP;
END $$;
