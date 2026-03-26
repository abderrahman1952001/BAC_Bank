# Intake Pipeline

## Goal

Keep one canonical intake pipeline for BAC content, regardless of how PDFs enter the system.

## Entry Methods

### 1. Source Intake

Use a source-specific adapter to discover and download PDFs from the web.

Current adapter:

- Eddirasa via `npm run intake:source:eddirasa -w @bac-bank/api -- ...`

This path is good for:

- historical backfills
- yearly bulk imports
- refreshing drafts from a known source

### 2. Manual Upload Intake

Upload the exam and correction PDFs directly from the admin UI.

This path is good for:

- official ministry PDFs
- fixing flaky or missing source URLs
- one-off urgent additions

Manual uploads are available at:

- `/admin/ingestion`

## Canonical Pipeline

Both entry methods feed the same storage and review pipeline:

1. Store original PDFs in R2 with canonical `bac-...pdf` names.
2. Record them in `source_documents`.
3. Rasterize pages to PNG and store them in R2.
4. Record page images in `source_pages`.
5. Run extraction into `draft_json`.
6. Review the draft in the admin UI.
7. Publish into the live `exam*` tables.

## Extraction Default

- The current default extraction model is `gemini-3-flash-preview`.
- Override it with `--gemini-model ...`, `INGESTION_GEMINI_MODEL`, or `GEMINI_MODEL`.
- This is a preview model, so limits and behavior may change before a stable Gemini 3 Flash release.

## Storage Rules

- Stored filenames are source-agnostic.
- Source/provider identity lives in metadata, not in the canonical filename.
- Originals and page images must be readable from R2 without depending on the upstream website.

## Operational Commands

### Source Intake

```bash
npm run intake:source:eddirasa -w @bac-bank/api -- --stage originals --min-year 2008
npm run intake:source:eddirasa -w @bac-bank/api -- --stage pages --min-year 2008
npm run intake:source:eddirasa -w @bac-bank/api -- --stage ocr --ocr-backend gemini --job-id <job-id>
```

### Storage Verification

```bash
npm run intake:storage:audit -w @bac-bank/api -- --min-year 2008
npm run intake:storage:readability -w @bac-bank/api -- --min-year 2008 --repair
```

## Yearly Operation

For a new BAC year, the expected workflow is incremental:

1. Import or upload that year’s originals.
2. Generate pages.
3. Extract a small sample first.
4. Review and publish.
5. Scale extraction only after the sample quality is acceptable.

This should be much cheaper than the historical `2008+` backfill because the one-time storage cleanup is already done.
