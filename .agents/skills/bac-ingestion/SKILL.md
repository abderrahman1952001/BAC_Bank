---
name: bac-ingestion
description: Use when working in the BAC_Bank repo on Algerian BAC paper discovery, canonical source storage, Gemini-assisted extraction, Codex reviewed draft normalization, subject corpus sweeps, published premium QA sweeps, crop-review handoff, approval-candidate preparation, or publish-ready ingestion handoff.
---

# BAC Ingestion

## Purpose

Use this skill when moving Algerian BAC papers from source PDFs or existing
Gemini extraction JSONs into reliable, polished drafts in `BAC_Bank`.

The goal is not raw extraction and not a second ingestion engine. The goal is a
premium, source-faithful draft that lets the human do minimal work: refine
remaining crops, quick-check the student preview, approve, and publish.

Read the canonical workflow first when command, storage, status, or publication
details matter:

- `docs/admin-ingestion-workflow.md`

Use these docs as narrow references when needed:

- `docs/ingestion-structure-normalization.md`
- `docs/premium-ingestion-extraction.md`
- `docs/agent-ingestion-playbook.md`
- `docs/ai-studio-bac-extraction-prompts.md`

The implementation authority remains `apps/api/src/ingestion/*`. Do not create
or keep a parallel ingestion engine in scripts.

## Operating Model

Default corpus work is a subject sweep:

1. The user gives Codex a subject, stream/family when relevant, source papers,
   and existing Gemini JSON artifacts when available.
2. Codex and the user finish the first paper heavily enough to settle the
   subject's working structure and polish expectations.
3. Codex uses that reviewed paper as a golden exemplar for the rest of the
   subject sweep, without forcing its hierarchy onto papers whose scans show a
   different structure.
4. Codex processes the remaining papers one by one down to the requested year
   range, usually to 2008.
5. Codex marks each good draft as an approval candidate or ready for human crop
   refinement, not as automatically published.
6. The human refines remaining non-native crops, does the final quick preview
   review, approves, and publishes.

Use one dedicated chat per subject. Split further by stream/family only when the
paper shape or variant structure differs enough to make one chat confusing.

Avoid adding more modes. Use the same operating model and adjust depth by risk.
If the user explicitly asks for "fast mode", "quick pass", or "review-ready
only", reduce visual depth and report the remaining review debt clearly.

## Trust Boundaries

These are non-negotiable:

- Canonical PDFs and stored source page images are the source of truth.
- Gemini JSON is a high-quality candidate artifact, not source truth.
- Existing Gemini extractions are usually good and sometimes perfect for simple
  papers, so start from them and do not re-transcribe line by line by default.
- Gemini quality must not make Codex lazy. Always visually check structure,
  page coverage, assets, native render data, correction/barème totals, and
  representative or high-risk content.
- Escalate visual checking for formulas, exponents, indices, units, chemical
  notation, tables, graphs, diagrams, maps, dense Arabic/French typography,
  long quoted literary texts, poems, citations, poor scans, unusual hierarchy,
  handwritten marks, and correction grids.
- Exam prompts stay conservative and source-close. Do not summarize, simplify,
  modernize, embellish, or silently paraphrase prompts.
- Correction content may be structurally polished, but official reasoning,
  formulas, values, point splits, and answer meaning must stay faithful.
- Raw model output is never the publish source. Convert it into the app's
  reviewed extract graph and import through the canonical path.
- Publish only after human approval unless the user explicitly requests a
  controlled publish operation.
- Published jobs are frozen. Substantive post-publish fixes must use the
  published revision workflow.

## Visual-Only PDF Extraction Policy

For BAC PDF extraction tasks, OCR and PDF text-layer extraction are disallowed.

Do not run:

- `pdftotext`
- `tesseract`
- `ocrmypdf`
- `pdfplumber` text extraction
- `pypdf` text extraction
- `rg`, `grep`, `sed`, or scripts over extracted PDF text
- OCR language checks such as `tesseract --list-langs`

Allowed:

- `pdfinfo` or equivalent metadata/page-count checks
- `pdftoppm`, `mutool draw`, or equivalent PDF-to-image rendering
- image crop/split/resize tools
- visual model/API extraction from rendered page images
- JSON/schema validation of extracted results

If the extraction cannot be done visually, stop and report the blocker. Do not
fall back to OCR or text-layer extraction.

## Subject Sweep Loop

For each paper family:

1. Confirm the canonical source bundle exists: exam PDF, correction PDF,
   `paper_sources`, `paper_source_streams`, `source_documents`, and
   `source_pages`.
2. Locate the Gemini raw extraction JSON if it exists. Use it as the starting
   point; do not call Gemini again just to redo usable work.
3. If Gemini failed, refused, or produced unusable output, do direct Codex
   visual extraction from canonical source pages for that paper only.
4. Normalize the candidate into the canonical reviewed extract shape:
   `variants[].nodes[]` plus `assets[]`.
5. Infer hierarchy from the visible paper, not from a universal template and
   not blindly from the golden exemplar.
6. Put structural labels in node labels, not duplicated block text.
7. Preserve prompt, solution, hint, and rubric blocks on the most specific
   correct nodes.
8. Add native render data for straightforward structured assets when faithful.
9. Add complete-enough crops or source-page asset references for non-native
   visuals. Do not spend excessive time perfecting crop geometry.
10. Run validation and fix structural errors.
11. Import through the reviewed-extract command.
12. Check the student-side draft preview when practical before handoff, focusing
    on hierarchy, native rendering, table/tree/formula layout, obvious text
    overflow, RTL issues, image placement, and major source mismatches.
13. Leave a compact per-paper note: source bundle, raw artifact path, reviewed
    artifact path, import target, visual coverage, fixes made, confidence,
    remaining crop debt, remaining source uncertainty, validation result, and
    whether the draft is an approval candidate.

Do not let one difficult paper block the whole subject sweep. Isolate it with a
clear note and continue with the next paper when safe.

## Golden Exemplar Policy

A heavily reviewed first paper is a calibration artifact.

Use it to learn:

- common hierarchy and node labeling choices for the subject/family
- how prompts, solutions, rubrics, headings, lists, formulas, and tables should
  feel in the student preview
- subject-specific native-rendering choices
- common Gemini mistakes and app-rendering traps
- the expected final polish level

Do not use it to:

- force the same hierarchy onto papers whose visible structure differs
- suppress source-specific labels, instructions, variants, or point splits
- assume later years have the same format
- skip visual checks for high-risk content

If the exemplar reveals repeated subject-specific rules, record them in a
subject playbook under:

```text
docs/ingestion-subject-playbooks/<subject>.md
```

Keep the main skill subject-neutral. Promote a lesson into this skill only when
it is truly reusable across subjects.

## Draft Normalization Rules

Use `docs/ingestion-structure-normalization.md` for detailed rules. Core rules:

- Follow the visible hierarchy. Common shapes include
  `EXERCISE -> PART -> QUESTION -> SUBQUESTION`,
  `PART -> EXERCISE -> QUESTION`, and
  `EXERCISE -> QUESTION -> SUBQUESTION`.
- Use `CONTEXT` for shared setup text that is not itself a question.
- Normalize Roman structural markers to Arabic labels such as `الجزء الأول`.
- Remove score text from labels when points live in `maxPoints`.
- Blocks contain content only; exercise, part, question, and subquestion labels
  live in the node tree.
- Do not duplicate labels such as `التمرين الأول`, `الجزء الأول`, `1)`, or
  `أ)` inside block text when the node already represents them.
- Attach rubrics to the most specific scored node available.
- Preserve point values exactly, including fractional values and multipliers.
- Keep visible grouping and source order unless the node tree explicitly
  represents that order.

## Polish Rules

Polish is allowed when it improves digital readability without changing source
meaning.

Do:

- convert real short labels into heading blocks when they are not already node
  labels
- split long correction paragraphs into readable steps when the source logic
  supports the split
- convert bullet-like or enumerated correction content into proper lists
- render simple tables, correction tables, truth tables, sign/variation tables,
  and probability trees natively when faithful
- use inline `$...$` notation where it materially improves readability
- use standalone `latex` blocks for formula-heavy lines or derivations
- fix obvious spacing, punctuation, and line-join artifacts when visually
  supported
- make rubric text self-explanatory when the target is obvious from source
  context, while preserving official point values

Do not:

- rewrite exam prompts for style
- invent solution steps or alternate explanations
- keep structural labels as prose headings when the node already renders them
- fold instruction labels such as `العمل المطلوب`, `من السند`, or
  `انطلاقا من الوضعية` into the source panel facts when they introduce the
  following questions
- simulate unsupported rich text purely for appearance
- leave known duplicate blocks, duplicate assets, stale native data, or
  placeholder text when safe to remove

## Asset And Native Rendering Policy

Spend Codex time where it matters most: faithful native rendering and correct
asset placement.

Native-first when faithful:

- ordinary tables
- simple correction tables
- truth tables
- sign tables
- variation tables
- probability trees
- compact formula-heavy boxed derivations that render cleanly

For native-rendered assets:

- make the native data source-faithful; this is more important than perfect crop
  geometry
- visually compare the native render against the source page or crop
- repair wrong cells, labels, signs, arrows, intervals, extrema, totals, and
  fallback text
- keep a crop or source-page reference as provenance/fallback when useful
- do not send obvious native-renderable structures to humans as crop work

Image-first unless a reviewed native renderer exists:

- graphs and plotted curves under the current sealed graph policy
- experimental apparatus
- biological, geological, technical, and multi-panel diagrams
- maps
- document images
- photographs and microscope imagery
- visuals whose axes, legends, scale, or layout cannot be reproduced faithfully

For non-native assets:

- create or preserve a complete-enough crop that includes all semantic content:
  labels, legends, axes, units, captions, scale marks, and panel markers
- avoid wasting long loops on pixel-perfect crop geometry
- exclude obvious unrelated page chrome when easy
- leave exact crop tightening to the human crop pass when it does not affect
  meaning
- mark crop debt concretely: source page, node, asset, and what needs refining

Do not invent precise crop boxes. If geometry is unknown or rough, say so.

## Source Intake

Never proceed to extraction or publication without both the exam PDF and the
official correction PDF.

Prefer the canonical source layer:

- `paper_sources`
- `paper_source_streams`
- `source_documents`
- `source_pages`

For Eddirasa, prefer the reusable operator command:

```bash
npm run ingest:eddirasa -w @bac-bank/api -- --help
```

If the source is not Eddirasa and no reusable command exists, add or use a
reusable operator command that wraps shared ingestion services. Do not create a
paper-specific ingestion script.

If source storage looks suspicious, audit it before continuing:

```bash
npm run audit:bac-storage -w @bac-bank/api -- --min-year <year> --max-year <year>
```

## Extraction And Import

Default route:

```text
Gemini raw extraction JSON
-> Codex normalization, risk-based visual audit, native rendering, and polish
-> reviewed extract artifact
-> reviewed-extract import
-> human crop refinement and quick final preview
-> human approval and publish
```

Use Gemini Pro-family extraction artifacts when available. Do not use Flash
models as the authoritative extractor for BAC papers.

The reviewed extract artifact must use the app draft graph shape:

- `variants[].nodes[]`
- `assets[]`
- `assets[].cropBox` only when known or intentionally rough
- `assets[].nativeSuggestion` when a faithful native representation exists

Import with:

```bash
npm run import:reviewed-extract -w @bac-bank/api -- --paper-source-slug <slug> --file <path> --status in-review
```

Use `--job-id` instead of `--paper-source-slug` when the task points to an
existing ingestion job.

The importer is the canonical reviewed-extract bridge. It validates the draft
and saves it to the ingestion workflow. Do not write directly into published
tables.

## Risk-Based Visual Audit

Do not reread every word from the scan by default when a good Gemini artifact
exists. Use risk-based visual checks:

Always check:

- all source pages exist and are in order
- paper metadata, subject, year, session, streams/family
- variant, exercise, part, question, and subquestion counts
- page references and asset attachments
- correction and rubric totals
- obvious missing pages, missing exercises, duplicate nodes, and stale blocks
- student preview for layout and native-rendering problems when practical

Spot-check:

- representative prompt text per exercise/variant
- representative solution text per correction section
- first and last page of exam and correction
- any content changed during normalization or polish

Escalate to focused visual checking:

- formulas, signs, exponents, indices, limits, units, and chemical notation
- dense tables, sign/variation tables, probability trees, correction grids
- diagrams, graphs, maps, and visual documents
- poor scans, handwritten marks, unusual layout, or inconsistent numbering
- language papers with poems, citations, long quoted texts, essays, or source
  passages that triggered model refusal
- any mismatch between Gemini output, draft validation, source pages, and
  student preview

If a region remains ambiguous after active visual checking, leave a concrete
uncertainty with page, node, and issue. Do not hide uncertainty inside polished
prose.

## Human Handoff Standard

Codex's target before handoff:

- source bundle and source pages are canonical
- Gemini artifact, if used, is stored as an auditable raw artifact
- reviewed extract JSON exists in the app draft graph shape
- import succeeds with zero validation errors
- hierarchy is stable enough that no major rewrite should remain
- prompts remain source-close
- correction and rubric content are faithful enough for quick human review
- native-rendered assets are visually checked and repaired
- non-native assets have complete-enough crops or concrete crop debt
- duplicate blocks/assets, stale native suggestions, placeholders, and
  non-semantic provider noise are removed when safe
- student preview has no obvious native-rendering, hierarchy, overflow, or RTL
  surprises when it was checked

The human owns:

- final crop refinement for non-native assets
- final quick preview review
- approval
- publish

Codex does not need to re-check after the human final preview unless the user
explicitly asks.

## Post-Publish Premium QA Sweep

Use this mode when the user explicitly asks to audit already published papers
for premium quality, source faithfulness, stream coverage, or student-facing
render quality.

This is not the normal final review surface. Publication remains the commit
point. A substantive issue found in a published paper must be fixed through the
published revision workflow, not by editing live published rows directly. If the
issue is in shared rendering code rather than one paper's content, fix the app
code in its owning module and verify representative published papers before
calling the sweep complete.

Start each subject sweep with a published-state inventory:

- list published papers by subject, year, session, stream/family, and slug
- confirm the canonical exam and correction PDFs and source pages still exist
- reconcile `paper_source_streams`, published variants, and live exam offerings
  so students see the correct stream/session coverage
- check for duplicate, missing, stale, or orphaned live offerings and media
- identify queued or processing ingestion/revision jobs before changing data
- record any source gap as a blocker rather than guessing from published content

For each published paper, audit source faithfulness and structure:

- compare the published paper against the canonical exam and correction scans
- confirm every visible prompt, instruction, source document, correction,
  solution, hint, rubric, and barème row is represented once in the right place
- verify the hierarchy follows the visible paper: variant, exercise, part,
  context, question, and subquestion boundaries must match the source
- keep structural labels in node labels, not duplicated prose, unless the source
  makes the label part of the content
- attach rubrics to the most specific scored node available
- preserve point values, fractional points, multipliers, totals, and official
  meaning exactly
- check formulas, units, signs, exponents, indices, tables, diagrams, maps,
  graphs, quoted text, poems, and dense Arabic/French typography visually
- fix every safe mismatch through a published revision draft; leave only
  unresolved source ambiguity as a concrete note with page, node, and issue

Audit assets with a native-first but source-faithful rule:

- native-render ordinary tables, correction tables, truth tables, sign/variation
  tables, probability trees, and similar structured visuals when the renderer can
  preserve the source faithfully
- visually compare native data against the source page or crop and repair wrong
  rows, cells, labels, signs, arrows, intervals, extrema, totals, and fallback
  text
- leave graphs, maps, experimental apparatus, biological/geological diagrams,
  document images, photos, microscope imagery, and dense multi-panel visuals as
  image crops unless a reviewed native representation exists
- make image crops precise and pleasant: include all semantic labels, legends,
  axes, units, captions, scale marks, and panel markers while excluding obvious
  unrelated page chrome when safe
- preserve published human-verified crops unless source comparison or reviewed
  native rendering clearly proves a better result
- remove duplicate assets, stale placeholders, stale native suggestions, and
  non-semantic provider noise when removal does not hide source meaning

Do a premium student-facing presentation pass:

- open the student-facing published paper view, and use draft/revision preview
  where a fix needs review before republishing
- check desktop and mobile layouts when practical, especially for long Arabic
  and French content, formulas, RTL direction, tables, trees, assets, and rubric
  panels
- fix ugly or unpremium rendering when source meaning is preserved: typography,
  font weight, heading level, block splitting, punctuation, spacing, line joins,
  list structure, formula display, asset sizing, asset placement, captions,
  overflow, and rubric panel readability
- do not rewrite exam prompts, invent solution steps, modernize source wording,
  or add decorative formatting that the app cannot render consistently
- if the same presentation defect appears across papers, treat it as a renderer
  or component issue and verify the shared fix against multiple subjects

The per-paper sweep note must include:

- published slug, subject, year, session, streams/family, and offering status
- source bundle status and pages visually checked
- content, hierarchy, rubric, point-total, and stream-offering findings
- native assets confirmed or repaired
- image crops confirmed, refined, or left with concrete crop debt
- student-facing routes and viewport sizes checked when practical
- published revision job or app files changed, if any
- validation and automated integrity checks run
- remaining source uncertainty, renderer limitation, or human decision needed
- confidence: high, medium, or low, with the reason
- final status: clean, fixed through revision, needs human review, blocked, or
  skipped

## Controlled Learning

During a subject sweep, Codex may record lessons learned, but must avoid
polluting this core skill with one-paper habits.

Use this order:

1. Add candidate repeated lessons to a subject playbook:
   `docs/ingestion-subject-playbooks/<subject>.md`.
2. After multiple papers confirm the lesson, keep it as a subject rule.
3. Promote a lesson into this skill only if it is subject-neutral and likely to
   help future BAC ingestion across subjects.

Subject playbook entries should be compact:

- exemplar paper slug or job id
- common hierarchy patterns
- polish conventions
- native-rendering defaults
- known Gemini failure modes
- crop and asset conventions
- unresolved app renderer limitations

Do not auto-edit the core skill after every paper. Propose core-skill changes
only when the lesson is durable and general.

## Completion Report

For each processed paper, report:

- source slug or job id
- subject, year, session, streams/family
- whether canonical source bundle and source pages existed
- Gemini raw artifact path, if used
- reviewed extract artifact path
- import command target and validation result
- visual audit coverage and high-risk regions checked
- native assets created or repaired
- non-native crop debt left for the human
- source uncertainties or official-source contradictions corrected
- whether student preview was checked
- for post-publish sweeps, offering integrity, published revision target, and
  student-facing rendering result
- confidence: high, medium, or low, with a short reason
- final status: imported, approval candidate, needs human crop refinement,
  clean, fixed through revision, needs human review, blocked, or skipped

Stop before publish unless the user explicitly asks to publish.

## Useful Commands

```bash
npm run ingest:eddirasa -w @bac-bank/api -- --help
npm run import:reviewed-extract -w @bac-bank/api -- --help
npm run audit:canonical-completeness -w @bac-bank/api
npm run audit:bac-storage -w @bac-bank/api -- --min-year 2008
npm run gemini:batch-source-extract -w @bac-bank/api -- --help
npm run repair:source-document-readability -w @bac-bank/api -- --help
npm run cleanup:r2:orphans -w @bac-bank/api -- --prefix <prefix> [--apply]
```
