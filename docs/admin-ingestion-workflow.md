# Ingestion Workflow

## Purpose

This is the canonical end-to-end workflow for turning BAC source papers found on
the internet into published papers shown in the app.

Use this document as the operator-facing source of truth for:

- source discovery and qualification
- canonical source storage
- page rasterization
- extraction
- draft creation and normalization
- final human review
- approval and publication

The canonical implementation still lives in `apps/api/src/ingestion/*`, but this
document describes the preferred operating model we want humans and agents to
follow.

Companion references:

- draft normalization rules: `docs/ingestion-structure-normalization.md`
- premium extraction, native rendering, and corpus sweep rules:
  `docs/premium-ingestion-extraction.md`
- agent playbook for producing reliable drafts:
  `docs/agent-ingestion-playbook.md`
- runtime implementation: `apps/api/src/ingestion/*`

## Source of Truth Boundaries

There are three distinct layers. Do not blur them.

### 1. Source Layer

This is the canonical representation of the original BAC bundle.

- `paper_sources`
- `paper_source_streams`
- `source_documents`
- `source_pages`

This layer answers:

- what paper bundle did we find
- where did it come from
- which streams share it
- which canonical PDFs do we trust
- which rasterized source pages belong to those PDFs

### 2. Draft Workflow Layer

This is the working review layer.

- `ingestion_jobs`
- `draft_json`

This layer answers:

- has a source bundle been extracted yet
- what is the current structured draft
- what still needs review
- is the draft approved, published, or failed

### 3. Published App Layer

This is what the app serves to students.

- `papers`
- `exams`
- `exam_variants`
- `exam_nodes`
- `exam_node_blocks`
- `exam_node_topics`
- `media`

This layer answers:

- what published paper exists for a year, subject, session, and stream
- what structure and content the app should render

## Workflow At A Glance

1. Find a new BAC source bundle on the internet.
2. Qualify it as a canonical paper family.
3. Download the exam PDF and the official correction PDF.
4. Store both PDFs under the canonical naming and storage model.
5. Rasterize both PDFs into canonical `source_pages`.
6. Extract structured JSON from the two PDFs.
7. Create or refresh the ingestion draft from that extraction output.
8. Normalize and review the draft until it is boring and reliable.
9. Open the student-side draft preview and verify the draft with the same
   renderer students will use.
10. Do a final human pass for crops, native assets, typos, and small
    mismatches.
11. Approve the draft.
12. Publish it.
13. Let the worker write the reviewed draft into the app-facing published
    tables.

## Canonical Extraction Route

The canonical extraction route is `codex_app_reviewed_extraction` as described
in `docs/premium-ingestion-extraction.md`.

Extraction produces one durable reviewed extract artifact in the premium draft
graph shape:

- `variants[].nodes[]`
- `assets[]`
- `assets[].cropBox` when crop geometry is known
- `assets[].nativeSuggestion` when a table, graph, tree, or similar visual can
  be rendered faithfully with frontend technology

The reviewed extract is imported through the shared reviewed-extract command.
There is no separate model-owned ingestion engine.

Optional model helpers may exist for narrow review tasks, such as crop-to-native
suggestions, but they do not own full-paper extraction, draft state,
publication, or source storage.

## Detailed Workflow

### 1. Discover And Qualify A Source Bundle

The workflow starts when a human asks an agent to get new BAC papers from the
internet.

The agent may:

- search source listings
- inspect source detail pages
- download candidate PDFs
- record provenance URLs and provider metadata

But it must not create a second ingestion engine in scripts. Discovery and
download are allowed. Canonical storage, page generation, draft review state,
and publication must stay on the shared ingestion path.

A candidate bundle is only considered valid for ingestion when we can identify:

- year
- subject
- session type
- paper-sharing family
- exam PDF
- official correction PDF

If the correction does not exist yet, the bundle is incomplete. We may keep the
source identity and exam PDF, but we do not move forward to extraction or
publication.

### 2. Normalize And Store The Canonical Source Bundle

Once the source bundle is accepted, we normalize it into the canonical source
layer.

#### Canonical source identity

One `paper_source` represents one shared BAC paper family:

- one year
- one subject
- one session
- one sharing family
- one exam PDF
- one correction PDF

`paper_source_streams` stores the queryable truth of which streams share that
paper.

#### Canonical filenames

Canonical filenames are source-agnostic:

- `bac-exam-{subject}-{familyCode}-{year}-{session}.pdf`
- `bac-correction-{subject}-{familyCode}-{year}-{session}.pdf`

Examples:

- `bac-exam-islamic-studies-all-2025-normal.pdf`
- `bac-correction-arabic-se-m-tm-ge-2024-normal.pdf`

Provider identity belongs in metadata, not in the canonical filename.

#### Canonical storage keys

- PDFs: `bac/{year}/documents/{subject}/{fileName}`
- page PNGs: `bac/{year}/pages/{documentBase}/page-001.png`
- published cropped assets: `published/assets/{year}/{paperId}/{mediaId}.png`
- admin uploads: `admin/images/{mediaId}.{ext}`

The source layer owns the original PDFs and rasterized pages. Jobs do not own
those files.

### 3. Generate Canonical Source Pages

Before serious draft review starts, both PDFs should have canonical PNG pages in
`source_pages`.

This step exists for two reasons:

- the review workflow needs stable page references
- later asset cropping must come from the stored page images, not from ad hoc
  local screenshots

The important rule is:

- page generation must go through the shared rasterization path

Do not create a second page-generation workflow in random scripts.

### 4. Produce A Premium Reviewed Extract

Extraction is separate from canonical storage and should speak the app's draft
graph directly.

Operator sequence:

1. Open the canonical exam and correction PDFs or rendered source pages.
2. Extract the visible structure into `variants[].nodes[]`.
3. Preserve prompt, correction, hint, and rubric blocks on the most specific
   matching nodes.
4. Add assets with source page references.
5. Add crop geometry when it is known.
6. Add native render suggestions whenever they are faithful and review-saving.
7. Save the reviewed extract artifact with a stable paper-specific filename.

The extraction artifact is already shaped like the reviewed draft. The importer
validates and normalizes it, but it should not have to rediscover the paper
hierarchy from provider-specific output.

### 5. Create Or Refresh The Draft

After extraction, the job needs a reviewed working draft in `draft_json`.

Conceptually this step is:

- take the premium reviewed extract JSON
- parse it into the repo's ingestion draft contract
- attach extraction provenance metadata
- save it as the job's current `draft_json`

The important distinction is:

- extraction produces a candidate structure
- the draft is the working review artifact

The draft should carry enough metadata to explain where it came from, including:

- extraction route: `codex_app_reviewed_extraction`
- operator or agent identifier when useful
- prompt version or prompt bundle reference
- extraction timestamp

The extraction route must follow the source faithfulness contract in
`docs/premium-ingestion-extraction.md`. The reviewed extract is allowed to
normalize hierarchy and formatting, but it must not summarize, paraphrase, omit,
or silently invent exam or correction content.

### 6. Normalize And Review The Draft

This is the most important quality step in the workflow.

The goal is not merely "JSON that validates." The goal is:

- a draft whose structure is reliable
- a draft whose correction content is faithful
- a draft whose formatting is predictable
- a draft whose final human pass is fast and unsurprising

This pass should happen before approval.

Use `docs/ingestion-structure-normalization.md` during this stage. Do not rely
on operator habit.

There is no universal hierarchy template for all BAC papers. The normalization
pass must infer the real hierarchy from the visible labels and grouping in that
paper.

The draft normalization pass is where we settle:

- hierarchy shape actually shown by the paper
- question boundaries
- part boundaries
- block types
- notation conventions
- source-page mapping
- asset placement
- correction fidelity

For corpus-scale work, crop tightening may be deferred when it is the slowest
part of the pass. The reviewed extract can omit unknown `assets[].cropBox`
values; the importer will create full-page placeholder crops, record the count,
and leave the draft in review for a human or dedicated second Codex crop pass.
This is acceptable for fast ingestion, but those placeholders remain review
debt and are not publish-ready.

### 7. Final Human Review

After the agent or operator has normalized the draft, a human does the final
review pass.

This pass should be lightweight compared with the earlier normalization pass.

Typical final-review tasks:

- crop assets
- compare native-rendered assets against their source-page fallback
- fix small typos
- fix obvious mismatches missed earlier
- confirm metadata and stream sharing
- do the last side-by-side sanity check against the PDFs

The admin draft editor is the editing surface. The student-side draft preview is
the rendering surface. Before approval, open the preview route from the draft
editor and check the paper through the same subject viewer used by students.
This catches layout, crop, native rendering, and hierarchy issues that are easy
to miss inside the admin editor.

The final human reviewer should not be surprised by large structural problems.
If they are, the earlier normalization pass was not good enough.

### 8. Approval

Approve only when:

- the draft is structurally normalized
- validation errors are cleared
- the correction content is faithful enough to trust
- the remaining work is genuinely minor

Any meaningful draft edit after approval invalidates approval.

### 9. Publish

The human triggers publish only after the draft is approved.

The worker then does the publication work. The worker does not author the paper.
It publishes the already-reviewed draft into the app-facing tables.

Publishing writes into:

- `papers`
- `exams`
- `exam_variants`
- `exam_nodes`
- `exam_node_blocks`
- `media`

Published jobs are frozen. Later fixes must start from a published revision
workflow, not by editing live published rows directly.

## Role Of The Worker

The worker is responsible for background execution, not for replacing review
judgment.

Today it can:

- drain queued jobs
- prepare canonical source pages
- publish approved drafts
- keep heartbeats and processing leases current

In the preferred operator workflow, the worker remains essential for publication
and shared source-page generation. It does not author full-paper draft content.

## Current Alignment With The Repo

The current repo already aligns with this workflow in the most important places:

- canonical source storage model
- job and status model
- review and approval path
- worker-backed publication path
- published paper write path

The repo now has one canonical internal extraction target: the premium reviewed
draft graph imported through the shared reviewed-extract path. Source intake,
page preparation, review, approval, and publication remain shared app services.

## Important Rules

- Do not create a second ingestion engine in scripts.
- Do not process or publish a paper without both the exam PDF and the official
  correction PDF.
- Treat the canonical PDFs as the source of truth.
- Treat the stored page PNGs as the canonical visual review surface.
- Treat the student-side draft preview as the final rendering review surface.
- Do not publish raw model output without a reviewed draft graph and final
  review.
- Keep filenames source-agnostic and paper-family based.
- Model stream sharing through `paper_source_streams` and `familyCode`, not by
  duplicating papers.
- Keep extraction provenance visible in the draft metadata.
- Use published revision jobs for live corrections after publication.

## Operator Commands

These commands still matter for source intake, audits, and storage hygiene:

### Source Intake

```bash
npm run ingest:eddirasa -w @bac-bank/api -- --stage originals --min-year 2008
npm run ingest:eddirasa -w @bac-bank/api -- --stage pages --min-year 2008
npm run ingest:eddirasa -w @bac-bank/api -- --stage pages --job-id <job-id>
```

Interpretation:

- `originals` stores canonical PDFs
- `pages` prepares canonical source page PNGs
- content enters the draft through the reviewed-extract import command

### Audits And Cleanup

```bash
npm run audit:canonical-completeness -w @bac-bank/api
npm run audit:bac-storage -w @bac-bank/api -- --min-year 2008
npm run cleanup:r2:orphans -w @bac-bank/api
npm run cleanup:r2:orphans -w @bac-bank/api -- --apply
```

`cleanup:r2:orphans` compares managed R2 objects against live DB references
from:

- `source_documents`
- `source_pages`
- `media.metadata.storageKey`

## What "Done" Looks Like

An ingestion is truly done only when:

- the source bundle is canonically stored
- both PDFs have canonical page PNGs
- the premium reviewed extract has produced a faithful draft graph
- the draft has been normalized into a reliable review artifact
- the final human review is lightweight
- the worker has published the approved draft into the app-facing model
