-- Remove ingestion draft workflow tables and enums.
DROP TABLE IF EXISTS "ingestion_issues" CASCADE;
DROP TABLE IF EXISTS "ingestion_question_topic_drafts" CASCADE;
DROP TABLE IF EXISTS "ingestion_question_asset_drafts" CASCADE;
DROP TABLE IF EXISTS "ingestion_question_drafts" CASCADE;
DROP TABLE IF EXISTS "ingestion_exercise_drafts" CASCADE;
DROP TABLE IF EXISTS "ingestion_exam_drafts" CASCADE;
DROP TABLE IF EXISTS "ingestion_documents" CASCADE;
DROP TABLE IF EXISTS "ingestion_batches" CASCADE;

DROP TYPE IF EXISTS "IngestionIssueSeverity";
DROP TYPE IF EXISTS "IngestionDraftStatus";
DROP TYPE IF EXISTS "IngestionBatchStatus";
