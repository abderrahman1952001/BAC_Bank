# Canonical BAC Ingestion Workflow

## Purpose

This is the single canonical end-to-end workflow for turning BAC source papers
found on the internet into published papers shown in the app.

Use this document as the operator- and agent-facing source of truth for the
workflow itself. Other ingestion docs may define narrow contracts, prompts, or
normalization details, but they should not redefine the end-to-end process.

This workflow covers:

- source discovery and qualification
- canonical source storage
- page rasterization
- extraction
- draft creation and normalization
- crop review
- Codex visual and presentation review
- final human review in the student-side draft preview
- approval and publication

The canonical implementation still lives in `apps/api/src/ingestion/*`, but this
document describes the preferred operating model we want humans and agents to
follow.

Companion references are implementation details, not competing workflow sources:

- draft normalization rules: `docs/ingestion-structure-normalization.md`
- premium extraction, native rendering, and corpus sweep rules:
  `docs/premium-ingestion-extraction.md`
- agent playbook for producing reliable drafts:
  `docs/agent-ingestion-playbook.md`
- AI Studio prompt/schema reference:
  `docs/ai-studio-bac-extraction-prompts.md`
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
6. Produce a raw source-faithful model extraction artifact from the PDFs,
   preferably with Gemini Pro-family models.
7. Store the raw model output as an auditable artifact.
8. Have Codex validate, visually audit, normalize, and convert the raw artifact
   into the reviewed draft graph shape.
9. Import the reviewed extract through the canonical reviewed-extract command.
10. Human reviewer performs the crop pass in the review UI, using stored source
    pages as the visual source.
11. Codex performs the post-crop visual audit: crop completeness, asset
    placement, source faithfulness, correction/barème fidelity, and
    source-faithfulness of any native render data introduced earlier.
12. Codex performs the presentation pass: headings, paragraphs, block splitting,
    punctuation, inline notation, lists, table sizing, native asset layout,
    spacing, and mobile/desktop rendering quality.
13. Human reviewer performs the final side-by-side pass in the student-side
    draft preview, not the published student app.
14. Approve the draft.
15. Publish it.
16. Let the worker write the reviewed draft into the app-facing published
    tables.
17. Do only a light post-publish smoke check. Any substantive issue found after
    publication must go through a published revision workflow.

## Review Surface Policy

The final human review should happen before publication in the student-side draft
preview route. That route is admin-only, but it renders the draft through the
student paper viewer, so the human sees the paper in the same visual surface
students will use without freezing the job as published.

The admin draft editor is the editing surface. The crop UI is the crop surface.
The student-side draft preview is the final review surface.

Do not make normal final review a post-publish activity. Publication is the
commit point. Published jobs are frozen, and meaningful fixes after publication
must use the published revision workflow. A post-publish check is still useful,
but it should be a smoke check that confirms the worker wrote the approved draft
successfully.

## Visual-First Review Policy

The target is a perfectly faithful, premium digital version of the official
exam and correction scans. Every Codex pass that affects content, structure,
crops, native render data, cleanup, or presentation must use the canonical PDFs
or stored page PNGs as the primary evidence.

OCR, extracted text, and model output are helper tools only. They may speed up
search, comparison, or first transcription, but they do not authorize approval.
Codex must visually verify OCR-assisted text and model-assisted structure
against the source scans before treating them as reviewed.

In every pass, dense, low-quality, messy, unusual, or high-risk source regions
require repeated visual inspection. Codex should revisit those regions as many
times as needed to either repair the digital draft faithfully or record a
specific unresolved uncertainty. Do not let one quick glance over a hard region
count as review.

Codex should use a safely aggressive resolution stance. When it finds a
contradiction, ambiguous reading, damaged scan, messy layout, or difficult
source region, it should actively try to solve it before handoff:

- zoom and re-inspect the source region visually
- compare nearby labels, repeated notation, surrounding paragraphs, and page
  structure
- compare the exam against the official correction when both mention the same
  item
- reconcile exercise/question numbering, variant structure, point totals, and
  barème rows
- use OCR, search, or model text only as helper evidence
- make the best-supported faithful correction when the visual/source evidence is
  strong enough

Scan damage, provider artifacts, crop noise, and obvious extraction defects
should be corrected or cleaned when the intended source reading is supported by
the scans. Official-source contradictions and typos should also be corrected
when the correction is obvious and source-supported, such as a point total,
label, unit, sign, index, or formula that is contradicted by the surrounding
official material in only one plausible way. Record a concrete audit note for
the correction. Preserve only non-obvious official contradictions explicitly;
they should not become a vague handoff item or an invented solution.

Codex should fix every issue it can safely fix during the pass:

- source transcription mismatches
- missing or misplaced prompt, solution, hint, or rubric blocks
- formula, unit, index, exponent, table, diagram, and barème errors
- duplicate blocks, duplicate assets, stale native suggestions, and stale
  placeholder artifacts
- crop boxes that are too broad, incomplete, or attached to the wrong node
- scan/provider noise that can be removed without hiding source meaning
- presentation issues that make the faithful digital paper hard to read

Reporting is for unresolved uncertainty, missing source data, tooling gaps, or
work that genuinely needs human judgment. A known fixable issue should not be
left as a note when Codex can repair it through the normal draft, crop, native
rendering, or cleanup path. The expected handoff is intentionally small:
Codex should reduce human review to clear, concrete residual decisions.

Each Codex review handoff should include a compact visual coverage note:

- which exam and correction pages were visually checked in each Codex pass:
  pre-crop normalization, post-crop audit, and presentation review
- which high-risk formulas, tables, diagrams, barèmes, and crops received
  repeated visual passes
- whether OCR was used, and that it was only a helper
- which obvious official-source errors were corrected, if any
- which issues were fixed during the pass
- which unresolved items still need human judgment

## Canonical Extraction Route

The canonical route is source-faithful model extraction followed by
Codex-supervised normalization and import.

For corpus-scale work, use:

1. `gemini_3_pro_batch_source_extract` for the raw PDF-to-JSON artifact.
2. `codex_normalization_and_audit` for validation, visual comparison, and
   conversion into the reviewed graph.
3. `reviewed_extract_import` for the app draft.
4. `app_review` for crop review, presentation review, student-preview human
   review, approval, and publication.

For small exceptional papers, rescue work, or model-access failures, Codex may
produce the reviewed extract directly from canonical PDFs and source pages. The
same source truth, artifact, validation, crop, preview, approval, and publish
rules still apply.

Extraction produces one durable reviewed extract artifact in the premium draft
graph shape:

- `variants[].nodes[]`
- `assets[]`
- `assets[].cropBox` when crop geometry is known
- `assets[].nativeSuggestion` when a table, tree, or similar structured visual can
  be rendered faithfully with frontend technology

Native suggestions may be introduced during normalization/import when the source
evidence is already clear. They remain candidates until the post-crop audit
checks them against the canonical source page or crop.

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

1. Start from the stored raw model artifact when one exists.
2. Open the canonical exam and correction PDFs or rendered source pages for
   visual comparison.
3. Convert the visible structure into `variants[].nodes[]`.
4. Preserve prompt, correction, hint, and rubric blocks on the most specific
   matching nodes.
5. Add assets with source page references.
6. Add crop geometry when it is known.
7. Add native render suggestions whenever they are faithful and review-saving;
   treat them as candidates until the post-crop audit verifies them against the
   source page or crop.
8. Save the reviewed extract artifact with a stable paper-specific filename.

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

- extraction route, such as `gemini_3_pro_batch_source_extract` plus
  `codex_normalization_and_audit`, or `codex_app_reviewed_extraction` for
  direct fallback work
- operator or agent identifier when useful
- prompt version or prompt bundle reference
- extraction timestamp

The extraction route must follow the source faithfulness contract in
`docs/premium-ingestion-extraction.md`. The reviewed extract is allowed to
normalize hierarchy and formatting, but it must not summarize, paraphrase, omit,
or silently invent exam or correction content.

### 6. Codex Source, Visual, And Presentation Review

After reviewed-extract import and after the human crop pass, Codex owns the
heavy review work before final human review.

The goal is not merely "JSON that validates." The goal is:

- a draft whose structure is reliable
- a draft whose correction content is faithful
- a draft whose formatting is predictable
- a draft whose crops and native assets are intentional
- a draft whose student preview feels premium rather than like raw OCR
- a draft whose final human pass is fast and unsurprising

This pass must happen before approval.

The three Codex passes are cumulative, not siloed:

- the pre-crop normalization pass establishes the first visual
  source-faithfulness baseline while shaping the draft graph
- the post-crop audit checks crop/native work and redoes visual source audit for
  prompts, corrections, barèmes, assets, and high-risk regions
- the presentation pass checks renderer quality and also rechecks visual source
  faithfulness in the student preview

No pass may assume source faithfulness is already settled merely because a
previous pass ran. If post-crop or presentation reveals a transcription,
structure, correction, barème, asset, or native-rendering mismatch, Codex fixes
it during that pass.

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
- presentation quality in the student renderer

For corpus-scale work, crop tightening may be deferred when it is the slowest
part of the pass. The reviewed extract can omit unknown `assets[].cropBox`
values; the importer will create full-page placeholder crops, record the count,
and leave the draft in review for a human or dedicated second Codex crop pass.
This is acceptable for fast ingestion, but those placeholders remain review
debt and are not publish-ready.

#### Source-faithfulness gate

Codex compares the draft against the canonical PDFs or stored page PNGs. This is
a visual pass first: OCR and extracted text may help locate content, but they
must not replace visual inspection of the scans.

High-risk content must be checked visually:

- formulas, chemical notation, units, indices, and exponents
- diagrams, tables, graphs, maps, trees, figures, and legends
- correction tables, barèmes, point splits, and totals
- dense Arabic or French typography
- low-quality scans, handwritten marks, and unusual layouts

Repeat the visual pass for any dense, low-quality, or messy region until the
draft is faithful or the uncertainty is concrete enough for human judgment.

If a reading is uncertain, keep the uncertainty explicit instead of smoothing it
over, but do not mark uncertainty too early. First use the safely aggressive
resolution stance: re-check visually, compare against related source evidence,
and choose the best-supported faithful extraction when the evidence supports it.
If an official contradiction has one obvious source-supported correction, apply
that correction and record it instead of leaving it for human review.
If the issue is fixable, fix it immediately in the reviewed draft instead of
only reporting it.

#### Crop and native-rendering gate

After the human crop pass, Codex checks that every asset is attached to the
right node, references the right source page, and has a crop that includes the
smallest complete visual unit needed by the student.

This gate is not crop-only. Codex must redo a visual source-faithfulness audit
while reviewing crops and native blocks: compare nearby prompt text, solution
text, barèmes, table/tree data, labels, captions, axes, legends, units, and
asset placement against the source scans. Fix every safe mismatch found before
handoff.

If the smallest useful rectangular crop still includes unavoidable adjacent
text, labels, or scan noise, the human may mark the asset as needing cleanup
during the crop pass. Codex should treat that flag as post-crop review debt:
compare the crop against the source, add precise white cleanup masks when the
noise is truly outside the visual, and leave source content unmasked when it is
meaningful context. Those masks are applied during asset preview and publish.

When a scanned document contains labeled subparts such as A/B, (أ)/(ب), or
multiple figures inside one visible document frame, crop and render the whole
document as one asset by default. Split the subparts into separate assets only
when the source itself splits them across pages, separated frames, or otherwise
requires independent placement for faithful rendering. If a draft already has
duplicate A/B assets for one visible document, merge the structure so the
student sees the document once.

Native rendering is the default for straightforward structured assets when it is
faithful and review-saving. Every ordinary table, simple correction table,
probability tree, sign table, variation table, truth table, and similarly clear
structured visual that the app can represent faithfully should be rendered
natively, not left as an image by habit. Biological, geological, experimental,
map, microscope, document-image, and dense multi-panel SVT visuals should
normally remain image crops unless the app has a reviewed native representation
for that exact visual class.

Tables, probability trees, sign tables, and variation tables are native-first,
not crop-first. They should not be treated as normal assets for the human crop
queue when Codex can render them faithfully. Codex may keep or create a crop as
source provenance, fallback, or visual verification evidence, but the
student-facing representation should be native by default. Only difficult,
ambiguous, unreadable, or renderer-blocked structured assets that Codex could
not safely render should be handed to a human for crop work.

For sign and variation tables, Codex should choose the best faithful renderer
available. KaTeX/LaTeX is acceptable when it best preserves the source layout;
a dedicated native table renderer is better when it is more faithful,
inspectable, and responsive. The renderer choice is part of the review: Codex
must visually compare the native result against the source scan and repair any
wrong cells, labels, signs, arrows, intervals, extrema, or fallback text.

Native data can be proposed during normalization/import or added during this
gate. The post-crop audit is where Codex verifies native data against the
canonical source page or crop and either confirms it, marks it stale, repairs it,
or falls back to the image crop. A native block is not considered trusted merely
because it was generated earlier.

Keep the crop as provenance and fallback when a native block is used.

This follows the minimal-human-work rule: obvious native-renderable tables and
trees should be resolved by Codex, not passed along as manual cropping burden.

#### Presentation gate

The presentation pass is a renderer-quality pass, but it is also a visual
source-faithfulness pass in the student preview. Codex must compare the rendered
draft back against the source scans for the content it sees, especially
high-risk formulas, tables, trees, corrections, barèmes, assets, and anything
changed during presentation cleanup. Presentation polish must never hide source
drift.

Codex should improve:

- block splitting so paragraphs, headings, lists, tables, formulas, rubrics, and
  solution steps are readable
- punctuation and OCR spacing when the source meaning is unchanged
- inline notation with `$...$` where it materially improves readability
- standalone formulas as `latex` blocks
- table rows, cell sizing, and fallback text
- native tree/table layout and graph/image fallback behavior once source-checked
- image placement and captions where the current renderer supports them
- desktop and mobile preview quality

If the presentation pass finds a source mismatch, stale native data, omitted
content, wrong punctuation that affects meaning, or a crop/rendering mismatch,
Codex fixes it in the draft rather than treating it as outside the pass.

Codex must not:

- summarize, paraphrase, modernize, simplify, or embellish source content
- fake unsupported rich text with ad-hoc markup
- convert a visual natively when doing so hides uncertainty or changes meaning
- publish a draft just because validation passes
- leave known duplicate/stale/noisy artifacts in place when they can be removed
  or cleaned without changing source meaning

### 7. Final Human Review In The Student-Side Draft Preview

After Codex has normalized, visually audited, and presentation-reviewed the
draft, a human does the final review pass in the student-side draft preview.

This pass should be lightweight compared with the earlier normalization pass.

Typical final-review tasks:

- compare native-rendered assets against their source-page fallback
- fix small typos
- fix obvious mismatches missed earlier
- confirm metadata and stream sharing
- do the last side-by-side sanity check against the PDFs

The human should use the admin editor only to make fixes discovered during this
pass, then return to the student-side draft preview to confirm the result.

Before approval, open the preview route from the draft editor and check the
paper through the same subject viewer used by students. This catches layout,
crop, native rendering, and hierarchy issues that are easy to miss inside the
admin editor.

The final human reviewer should not be surprised by large structural problems.
If they are, the earlier normalization pass was not good enough.

### 8. Approval

Approve only when:

- the draft is structurally normalized
- validation errors are cleared
- the correction content is faithful enough to trust
- visual-first Codex source, crop/native, cleanup, and presentation passes have
  fixed every safe fix they found
- duplicate/stale artifacts, placeholder crops, and non-semantic scan/provider
  noise are removed or explicitly justified as preserved source context
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

After the worker publishes, a human or agent may do a light student-app smoke
check to confirm the published page is reachable and the selected sujet renders.
This is not the normal review surface. Any substantive issue discovered after
publication must be fixed through a published revision job.

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
- student-side draft preview route
- worker-backed publication path
- published paper write path

The repo now has one canonical internal extraction target: the premium reviewed
draft graph imported through the shared reviewed-extract path. Source intake,
page preparation, review, approval, and publication remain shared app services.

The remaining process gap is mostly documentation and discipline: the
presentation pass must be treated as a real pre-approval gate, even though it is
not a separate database status today.

## Important Rules

- Do not create a second ingestion engine in scripts.
- Do not process or publish a paper without both the exam PDF and the official
  correction PDF.
- Treat the canonical PDFs as the source of truth.
- Treat the stored page PNGs as the canonical visual review surface.
- Treat OCR and raw model text as helpers, not as review authority.
- Treat the student-side draft preview as the final rendering review surface.
- Do not use post-publish student-app review as the primary final review.
- Do not publish raw model output without a reviewed draft graph and final
  review.
- Do not leave known fixable issues as notes when they can be corrected through
  the normal draft, crop, native rendering, or cleanup path.
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
npm run gemini:batch-source-extract -w @bac-bank/api -- --help
npm run import:reviewed-extract -w @bac-bank/api -- --help
```

Interpretation:

- `originals` stores canonical PDFs
- `pages` prepares canonical source page PNGs
- `gemini:batch-source-extract` prepares, submits, checks, and collects raw
  Gemini batch extraction campaigns
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
- asset crops are complete or explicitly justified
- Codex has completed source-faithfulness, native-rendering, and presentation
  review
- known fixable duplicates, stale native data, placeholder artifacts, and
  non-semantic scan/provider noise have been cleaned
- the final human review happened in the student-side draft preview and was
  lightweight
- the worker has published the approved draft into the app-facing model
