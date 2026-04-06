# Admin Ingestion Workflow

## Purpose

This is the single canonical operator guide for BAC intake, review, publish, and
storage cleanup.

The canonical implementation lives in `apps/api/src/ingestion/*`.
Scripts may discover sources, batch work, audit storage, or queue jobs, but
they must call the shared ingestion services instead of reimplementing
rasterization, extraction, review state transitions, or publish logic.

## Canonical Data Model

### `paper_sources`

One row per shared paper source bundle.

This is the canonical source identity for a paper family:

- one exam PDF
- one correction PDF
- one subject
- one session
- one year
- one sharing family

Important columns:

- `slug`: stable human-readable identity, like `bac-english-se-m-tm-ge-2025-normal`
- `provider`: where the source came from, like `eddirasa`
- `year`
- `sessionType`
- `subjectId`
- `familyCode`: canonical sharing code, like `all`, `se-m-tm-ge`, `lp-le`, `tm-ge`
- `sourceListingUrl`: archive/list page where the source was discovered
- `sourceExamPageUrl`: detail page that exposed the exam PDF
- `sourceCorrectionPageUrl`: detail page that exposed the correction PDF
- `metadata`: source-specific audit metadata

The unique identity is:

- `year + subjectId + sessionType + familyCode`

### `paper_source_streams`

Normalized stream membership for a `paper_source`.

`familyCode` is the canonical label.
`paper_source_streams` is the queryable truth for which streams share that
paper.

Example:

- `familyCode = se-m-tm-ge`
- rows for `SE`, `M`, `TM`, `GE`

### `source_documents`

Stored source PDFs for a `paper_source`.

There should be at most two rows:

- `EXAM`
- `CORRECTION`

Important columns:

- `paperSourceId`
- `kind`
- `storageKey`
- `fileName`
- `mimeType`
- `pageCount`
- `sha256`
- `sourceUrl`
- `metadata`

The unique identity is:

- `paperSourceId + kind`

### `source_pages`

Rasterized PNG pages derived from `source_documents`.

Important columns:

- `documentId`
- `pageNumber`
- `storageKey`
- `width`
- `height`
- `sha256`

### `ingestion_jobs`

Workflow rows, not source ownership rows.

A job points at one `paper_source` and stores review and processing state:

- `DRAFT`
- `QUEUED`
- `PROCESSING`
- `IN_REVIEW`
- `APPROVED`
- `PUBLISHED`
- `FAILED`

Jobs do not own PDFs.
If jobs are deleted, the canonical source documents and pages can stay.

### `papers`

Published structured paper content created from one `paper_source`.

Important columns:

- `paperSourceId`
- `year`
- `subjectId`
- `sessionType`
- `familyCode`
- `durationMinutes`
- `officialSourceReference`

`officialSourceReference` is a display/provenance field.
The source of truth is the `paperSourceId` relation.

### `exams`

Stream-facing offerings that point to one `paper`.

This is how one published paper can serve multiple streams without duplicating
the paper structure.

Important columns:

- `paperId`
- `streamId`
- `subjectId`
- `year`
- `sessionType`
- `isPublished`

### Structured Content Tables

These stay downstream of the paper model:

- `exam_variants`
- `exam_nodes`
- `exam_node_blocks`
- `exam_node_topics`
- `media`

They store the published paper structure, not the raw PDFs.

## Canonical Storage Model

Canonical source filenames are source-agnostic and paper-family based:

- `bac-exam-{subject}-{familyCode}-{year}-{session}.pdf`
- `bac-correction-{subject}-{familyCode}-{year}-{session}.pdf`

Examples:

- `bac-exam-islamic-studies-all-2025-normal.pdf`
- `bac-correction-arabic-se-m-tm-ge-2024-normal.pdf`
- `bac-exam-philosophy-tm-ge-2025-normal.pdf`

Canonical R2 keys:

- PDFs: `bac/{year}/documents/{fileName}`
- page PNGs: `bac/{year}/pages/{documentBase}/page-001.png`
- published cropped assets: `published/assets/{year}/{paperId}/{mediaId}.png`
- admin uploads: `admin/images/{mediaId}.{ext}`

Provider identity belongs in metadata, not in the filename.

## End-to-End Admin Workflow

### 1. Intake Originals

There are two supported entry methods:

- source intake from a provider adapter, currently Eddirasa
- manual upload intake from `/admin/intake`

Both paths create or update the same `paper_source` and the same two canonical
`source_documents`.

### 2. Store Canonical PDFs

On intake:

- store the exam PDF in R2
- store the correction PDF in R2
- upsert `source_documents`
- keep the job in `DRAFT`

Processing must not start until both PDFs exist.

### 3. Process

The shared processing engine handles:

- page rasterization into `source_pages`
- full extraction into `draft_json`

Operationally:

- `pages` stops after page generation and leaves the job in `DRAFT`
- `ocr` and `process` run full extraction and leave the job in `IN_REVIEW`

### 4. Manual First Review

The PDFs are the source of truth.

Before approval, compare the extracted draft to the exam and correction PDFs and
fix obvious issues:

- wrong exercise or question boundaries
- dropped prompt text
- dropped correction steps
- ordering drift
- wrong page mapping
- misleading asset crops
- bad points
- bad topic tags

### 5. Optional Scripted Review

Use scripted review as a metadata assistant, not as proof that the extraction is
faithful to the PDFs.

Good uses:

- points coverage
- topic coverage
- consistency checks
- review notes

### 6. Approval

Approve only after:

- the manual pass is complete
- validation errors are cleared
- obvious mismatches are fixed

Any draft edit after approval invalidates approval.

### 7. User Final Review And Publish

After Codex/admin cleanup, the user performs the final lightweight check and
publishes.

Publishing writes the structured content into:

- `papers`
- `exams`
- `exam_variants`
- `exam_nodes`
- `exam_node_blocks`
- `media`

Published jobs are frozen.
Any later live correction must start from a published revision job, not by
editing the published rows directly.

## Operator Commands

### Source Intake

```bash
npm run intake:source:eddirasa -w @bac-bank/api -- --stage originals --min-year 2008
npm run intake:source:eddirasa -w @bac-bank/api -- --stage pages --min-year 2008
npm run intake:source:eddirasa -w @bac-bank/api -- --stage ocr --job-id <job-id>
npm run intake:source:eddirasa -w @bac-bank/api -- --stage process --job-id <job-id>
```

### Audits And Cleanup

```bash
npm run audit:canonical-completeness -w @bac-bank/api
npm run audit:bac-storage -w @bac-bank/api -- --min-year 2008
npm run cleanup:r2:orphans -w @bac-bank/api
npm run cleanup:r2:orphans -w @bac-bank/api -- --apply
```

`cleanup:r2:orphans` compares R2 objects under the managed prefixes against the
live DB references from:

- `source_documents`
- `source_pages`
- `media.metadata.storageKey`

The default prefixes are:

- `bac/`
- `published/assets/`
- `admin/images/`

### New Year Workflow

For a new BAC year:

1. import or upload the originals
2. verify the correction PDF exists
3. run pages or full processing on a small sample
4. do the manual first review
5. approve only after the sample is clean
6. publish after the final user check
7. scale out the rest of the year

## Archive Cleanup Status

The `2008..2025` source layer has been normalized to the canonical paper-source
model:

- canonical filenames
- canonical R2 keys
- no bad source document keys
- no bad source page keys
- no zero-page source documents

The remaining archive gaps are genuine upstream gaps, not local storage/model
problems.

## Remaining External Gaps

The only known incomplete source bundles left are missing correction PDFs:

- `bac-correction-amazigh-all-2025-normal.pdf`
- `bac-correction-economics-management-ge-2023-normal.pdf`
- `bac-correction-history-geography-ge-2023-normal.pdf`
- `bac-correction-amazigh-all-2014-normal.pdf`

Those `paper_sources` already exist with the exam PDF stored.
They should remain incomplete until a real correction source is found.

## Important Rules

- Do not create a second ingestion engine in scripts.
- Use the shared ingestion services for page generation, extraction, review
  transitions, and publish logic.
- Do not process a paper without both exam and correction PDFs.
- Treat the PDFs as the source of truth.
- Keep filenames source-agnostic and paper-family based.
- Model stream sharing through `paper_source_streams` and `familyCode`, not by
  duplicating papers.
