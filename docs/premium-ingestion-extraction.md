# Premium Ingestion Extraction

## Purpose

This document defines the subject-neutral extraction and normalization standard
for BAC papers. It applies to all subjects, streams, years, and sessions.

The goal is not merely valid JSON. The goal is a premium student-facing paper:

- faithful to the official exam and correction
- structurally predictable
- visually clean
- reviewable with minimal human effort
- able to render native web assets whenever that is more premium than an image

The canonical workflow still owns source storage, rasterized pages, draft review,
approval, and publication. Extraction routes must feed that workflow; they must
not create a second ingestion system.

## Extraction Route

The canonical extraction route is:

- `codex_app_reviewed_extraction`: operator-assisted extraction in Codex from
  the canonical PDFs and page renders.

Every extraction run must save a durable reviewed extract artifact and import it
through:

```bash
npm run import:reviewed-extract -w @bac-bank/api -- --paper-source-slug <slug> --file <path> --status in-review
```

## Source Faithfulness Contract

The extraction model or agent is allowed to normalize structure, not content.
This contract applies no matter which model produced the reviewed extract.

Required:

- preserve every exam prompt, condition, figure reference, table label, unit,
  formula, and official correction step that affects meaning
- preserve barèmes and point splits exactly, including fractions, repeated
  multipliers, and parent totals
- keep the paper's content in source order unless the normalized hierarchy makes
  the same order explicit through parent and child nodes
- copy official correction reasoning faithfully instead of replacing it with a
  newly solved or shorter answer
- keep uncertainty explicit in `uncertainties[]` when a source word, symbol,
  point split, or grouping is not fully legible

Forbidden:

- summarizing prompts or corrections
- paraphrasing for style
- omitting repeated instructions, constraints, labels, units, or rubric details
- inventing missing steps, inferred data, or alternate solutions
- silently choosing one reading when the source is ambiguous

Allowed cleanup:

- move visible structural markers into `node.label`
- remove page headers, footers, provider chrome, and duplicated labels only when
  the same meaning is already represented structurally
- fix obvious OCR spacing, punctuation, and line-join artifacts when the source
  meaning is unchanged
- convert standalone formulas into `latex` blocks without changing notation

Before import, the extractor must do a source comparison pass against the
canonical PDFs or page PNGs. A draft that merely validates structurally is not
reviewed unless this comparison was done.

## Reviewed Extract Shape

Use the premium draft graph shape:

- `variants[].nodes[]` using the draft graph model directly
- `assets[]` with crop geometry when available
- `assets[].nativeSuggestion` when a native web rendering exists

Draft graph nodes must use the existing node types:

- `EXERCISE`
- `PART`
- `QUESTION`
- `SUBQUESTION`
- `CONTEXT`

Blocks must use the existing block roles and types:

- roles: `PROMPT`, `SOLUTION`, `HINT`, `RUBRIC`, `META`
- types: `paragraph`, `latex`, `image`, `code`, `heading`, `table`, `list`,
  `graph`, `tree`

## Normalization Rules

Use the general hierarchy rules in
`docs/ingestion-structure-normalization.md`. The following rules tighten them
for corpus-scale consistency.

### Structure

- Follow the paper's visible hierarchy. Do not force a universal subject
  template.
- Top-level roots may be `EXERCISE` or `CONTEXT` when the source really has
  shared context before exercises.
- Visible exercises become `EXERCISE`.
- Visible paper parts become `PART`.
- Numbered prompts become `QUESTION`.
- Lettered prompts nested under numbered prompts become `SUBQUESTION`.
- Lettered prompts without a numbered parent become `QUESTION`.
- Shared scientific, literary, historical, or mathematical setup that is not a
  prompt becomes `CONTEXT` or parent prompt blocks, depending on the visible
  paper grouping.

### Labels

- Structural labels belong in `node.label`.
- Do not repeat structural labels in block text unless the source text needs the
  label for meaning.
- Normalize Roman part markers to Arabic labels such as `الجزء الأول`.
- Normalize question labels to `السؤال 1`, `السؤال 2`, and so on.
- Normalize subquestion labels to `الفقرة أ`, `الفقرة ب`, and so on.
- Remove score text from exercise labels.

### Blocks

- Blocks contain content, not UI chrome.
- Preserve visible prompt text from the exam PDF.
- Preserve official solution and rubric text from the correction PDF.
- Use `latex` for standalone formulas and formula-heavy lines.
- Keep normal prose with inline notation in `paragraph` blocks.
- Use `table`, `graph`, and `tree` blocks only when structured render data is
  present or there is a linked asset fallback.
- Use `image` only when native rendering would lose fidelity or take more review
  than it saves.

### Rubrics

- Preserve point values exactly, including fractional values and repeated
  multipliers.
- Attach rubrics to the most specific matching node.
- If a correction table gives one row per subquestion, split rubric rows across
  `SUBQUESTION` nodes.
- If a paper gives only a parent total, keep it on the parent and avoid invented
  point splits.

## Native Asset Policy

The app should feel premium. Anything that can be rendered reliably with web
frontend technology should become a native block, while retaining source-page
asset fallback for review and provenance.

Prefer native rendering for:

- tables
- sign tables
- variation tables
- truth tables
- probability trees
- simple function graphs
- simple bar charts or line charts
- formula-heavy boxed derivations that KaTeX can render cleanly

Prefer image crops for:

- experimental apparatus
- biological, geological, geographical, or technical diagrams
- maps
- dense multi-panel figures
- photographs or microscope imagery
- handwritten/scan-only figures where redrawing risks changing meaning
- any chart whose axes, labels, scale, or styling cannot be reproduced
  confidently

When using native rendering:

- keep `assetId` on the block when a source crop exists
- store structured data in `block.data`
- store the same structured draft in `asset.nativeSuggestion`
- keep image crop fallback for reviewer comparison
- mark stale native suggestions when crop geometry changes
- verify the native block in the student-side draft preview before approval

## Crop Policy

Crop boxes should include the smallest complete visual unit that a student needs
to solve the question.

Include:

- figure/table title when it is semantically part of the visual
- legends, keys, axis labels, scale, units, and captions needed for meaning
- panel labels such as `(أ)`, `(ب)`, `الشكل 1`

Exclude:

- unrelated neighboring text
- page headers and footers
- decorative borders that add no meaning
- duplicated prompt text already present as structured text

Published human-verified crops are treated as trusted source data. Revision
passes should preserve them unless the reviewed native rendering or source
comparison clearly proves a better crop.

### Deferred Crop Pass

For bulk ingestion, crop tightening may be deferred to a second pass when it is
the bottleneck. In that mode:

- finish source storage, page rasterization, extraction, structure
  normalization, correction transcription, and reviewed-extract import first
- omit `assets[].cropBox` when reliable geometry is not known
- let the importer create full-page placeholder crops and count them as crop
  review debt
- keep the job in review until a human or a dedicated second Codex pass refines
  those crops
- do not approve or publish drafts with full-page placeholder crops unless the
  full page is intentionally the smallest complete visual unit

This does not lower the text or correction fidelity bar. It only moves visual
crop geometry out of the first ingestion pass.

## Corpus Sweep Procedure

For each paper family:

1. Confirm canonical source documents and pages exist.
2. Review the current job status.
3. If published, start from the published revision workflow or a separate
   review plan; do not overwrite the frozen job.
4. If approved or in review, normalize the existing draft through the shared
   draft path.
5. If draft quality is low, re-extract from the PDFs using the premium draft
   graph shape.
6. Preserve or add crop geometry, or explicitly defer it as crop review debt.
7. Add native suggestions where they are faithful and review-saving.
8. Run validation.
9. Open the student-side draft preview and check hierarchy, crops, and native
   blocks in the same renderer used by students.
10. Compare point totals and variant/exercise/question counts.
11. Hand off remaining warnings explicitly.

Do not publish as part of a sweep unless the user explicitly asks for
publication.
