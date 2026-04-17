CREATE TYPE "StudyQuestionDiagnosis" AS ENUM (
  'CONCEPT',
  'METHOD',
  'CALCULATION',
  'TIME_PRESSURE'
);

ALTER TABLE "study_session_questions"
ADD COLUMN "diagnosis" "StudyQuestionDiagnosis";
