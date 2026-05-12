# Agent Ingestion Playbook

## Purpose

Use this playbook when an agent is asked to produce a reliable BAC ingestion
draft from source papers.

The success criterion is not "got some JSON back." The success criterion is:

- the draft is structurally reliable
- the correction is faithful
- the human final review is fast
- publication should not produce surprises

This playbook follows the canonical workflow in
`docs/admin-ingestion-workflow.md`.

This document is a narrow agent reference, not a second workflow definition.
When it conflicts with or feels broader than `docs/admin-ingestion-workflow.md`,
the canonical workflow document wins.

For subject-neutral premium extraction, native asset rendering, crop policy,
and corpus sweeps, also follow `docs/premium-ingestion-extraction.md`.

## Default Route

Follow `docs/admin-ingestion-workflow.md` for route selection.

For corpus-scale work, the default route is raw Gemini Pro-family extraction,
Codex normalization/audit, reviewed-extract import, crop review, Codex
post-crop/presentation review, student-side draft preview, approval, and
publish.

Direct `codex_app_reviewed_extraction` remains a fallback for small exceptional
papers, recovery work, or when model access is unavailable:

- inspect the canonical PDFs and rendered source pages
- create a durable reviewed extract artifact in the premium draft graph shape
- import it through the generic reviewed-extract command
- keep source storage, review state, approval, and publication on the shared
  ingestion path

## Inputs Required Before Draft Work Starts

Do not start draft production until these are clear:

- year
- subject
- session type
- paper-sharing family
- exam PDF
- official correction PDF

If the correction PDF is missing, stop at canonical source storage. Do not
pretend the bundle is ready for extraction, review, or publication.

## Agent Responsibilities

An agent may:

- discover sources
- download candidate PDFs
- qualify the paper family
- store canonical source records and files through the shared ingestion path
- generate canonical page PNGs through the shared path
- produce a premium reviewed extract in the app's draft graph shape
- import the reviewed extract into a reviewed draft
- normalize and clean the draft
- verify the draft through the student-side preview route
- save the reviewed draft back to the job

An agent must not:

- create a second ingestion engine in scripts
- invent missing source or correction content
- publish raw model output without review
- replace the final human review with guesswork

## Standard Procedure

### 1. Confirm The Source Bundle

Before doing anything else, confirm:

- the exam and correction belong to the same BAC bundle
- the year, subject, session, and sharing family are correct
- provider URLs and provenance are recorded

If anything is ambiguous, keep the source bundle incomplete rather than
guessing.

### 2. Normalize And Store The Source Bundle

Use the shared source-storage path to create or update:

- `paper_sources`
- `paper_source_streams`
- `source_documents`

Rules:

- canonical filenames are source-agnostic
- provider-specific naming stays in metadata only
- one canonical `paper_source` represents one paper family
- jobs do not own the source PDFs

### 3. Generate Canonical Source Pages

Make sure both PDFs have rasterized `source_pages`.

Do not use ad hoc local screenshots as the review surface. The stored page PNGs
must be the stable basis for:

- page references
- asset mapping
- final crop review

### 4. Produce The Premium Reviewed Extract

Use the same extraction contract for every paper. The model may normalize
structure, labels, block types, punctuation, and obvious OCR noise, but it must
not summarize, paraphrase, omit, or replace source content with its own wording.
The exam PDF is the source of truth for prompts. The correction PDF is the
source of truth for solutions, rubrics, and barèmes.

All Codex review passes are visual-first. Use OCR or extracted text only as a
helper for search, comparison, and initial transcription; visually verify the
canonical PDF or stored page PNG before trusting the result. When Codex finds a
fixable fidelity, crop, cleanup, duplicate, stale native data, or presentation
issue, it should repair it through the normal draft/crop/native path instead of
only reporting it.

The pre-crop normalization pass, post-crop audit, and presentation pass each
redo visual source-faithfulness checks. Post-crop is not crop-only; presentation
is not layout-only. If either later pass finds a mismatch in prompt text,
solutions, barèmes, native data, asset placement, crops, or source structure,
Codex fixes it during that pass.

In every pass, repeat visual inspection over dense, low-quality, messy,
unusual, or high-risk regions until the draft is faithful or the unresolved
uncertainty is specific enough for human judgment. This especially applies to
crowded tables, formulas, diagrams, correction grids, poor scans, handwritten
marks, and awkward layouts.

Use a safely aggressive resolution stance for contradictions and ambiguities.
Before handing off a hard case, zoom and re-check visually, compare nearby
source context, compare exam and correction references, reconcile numbering and
barème totals, and use OCR/search/model text only as helper evidence. If the
evidence strongly supports a faithful reading or scan repair, make the fix.
Official-source contradictions and typos should also be corrected when the
correction is obvious and source-supported. Record a concrete audit note for the
correction. Leave only non-obvious official-source contradictions or unresolved
readings for human judgment, and make those notes concrete.

The standard extraction sequence is:

1. Inspect the canonical exam PDF and correction PDF.
2. Use rendered source pages for visual checks and asset coordinates.
3. Build `variants[].nodes[]` directly in the app's draft graph shape.
4. Preserve prompt, solution, hint, and rubric blocks on the right nodes.
5. Attach assets to the right node and source page.
6. Add crop geometry when known.
7. Add native render suggestions when they are faithful and review-saving.
8. Save the reviewed extract artifact with a stable paper-specific filename.

If crop tightening is the bottleneck during a bulk run, defer it deliberately:
finish the text, structure, correction, asset references, and import first;
omit unknown `assets[].cropBox` values; and report the placeholder crop count
as review debt. The follow-up crop pass may be human-led or Codex-led, but the
draft is not publish-ready until those placeholders are resolved.

Before saving the JSON, run a self-review pass:

- compare each prompt block back to the exam source
- compare each solution and rubric block back to the official correction
- verify that no prompt, condition, unit, formula, point split, or repeated
  instruction was compressed away
- repeat visual passes over dense, low-quality, messy, unusual, or high-risk
  regions before treating them as reviewed
- actively resolve contradictions and ambiguities from source evidence before
  adding an uncertainty
- correct obvious official-source contradictions or typos when the correction is
  source-supported, and record the evidence
- remove duplicate blocks/assets, stale native suggestions, stale placeholders,
  and non-semantic scan/provider noise when source meaning is preserved
- move uncertain readings into `uncertainties[]` instead of hiding them in
  polished prose

### 5. Create Or Refresh The Draft

Take the reviewed extract JSON and turn it into the job's `draft_json`.

At minimum, preserve extraction provenance in `draft.exam.metadata`:

- route: the route used from `docs/admin-ingestion-workflow.md`, such as
  `gemini_3_pro_batch_source_extract` plus `codex_normalization_and_audit`, or
  `codex_app_reviewed_extraction` for direct fallback work
- extracted timestamp
- source artifact path

The reviewed draft is the artifact that matters. The reviewed extract JSON is
only an input to that draft.

### 6. Normalize The Draft

This is the main quality gate.

Use `docs/ingestion-structure-normalization.md` and keep the draft boring,
explicit, and predictable.

The normalization pass must settle:

- metadata consistency
- the real hierarchy shown by the paper
- exercise, part, question, and subquestion boundaries
- block types
- source-page references
- asset references
- correction fidelity
- notation and readability

### 7. Validate The Draft

The repo already has structural validation. Use it as a floor, not as the full
definition of quality.

A draft is not ready just because validation passes. The agent still owns:

- semantic correctness
- sane boundaries
- faithful correction content
- readable normalized blocks

Validation should catch broken references and missing required structure.
Normalization should remove surprise.

### 8. Student-Side Preview QA

Open the draft from the student-side preview route before handoff or approval.
This route converts the reviewed draft graph into the same `ExamResponse` shape
used by published papers, then renders it with the student subject viewer.

Use it to check:

- hierarchy and exercise navigation
- crop fit and image clarity
- native table, tree, and formula rendering
- graph/image fallback rendering under the current sealed graph policy
- solution reveal behavior
- mobile and desktop layout issues

If the draft only looks correct in the admin editor, it is not done.

### 9. Save The Reviewed Draft

When the draft is materially better, save it back to the ingestion job.

Important status behavior:

- draft edits before approval are normal
- draft edits after approval invalidate approval
- published jobs are frozen

### 10. Hand Off For Final Human Review

The handoff target is a draft where the human mostly needs to:

- crop assets
- fix minor typos
- resolve a small number of known mismatches
- do the last PDF sanity check

If the human still needs to restructure the paper heavily, the agent handoff was
not good enough.

## Draft Quality Checklist

Before handing off, verify all of the following.

### Metadata

- subject code is correct
- year is correct
- session type is correct
- paper stream membership is correct
- paper-sharing family is correct
- exam and correction document references are present

### Structure

- hierarchy is inferred from visible paper labels and grouping, not forced into
  one universal template
- top-level nodes may be `EXERCISE`, `PART`, or another supported shape that is
  clearly shown by the paper
- every visible exercise appears once and in order
- parts are used only when the paper clearly has real subdivisions
- Roman-numbered part markers are normalized into Arabic labels such as
  `الجزء الأول` and `الجزء الثاني`
- questions and subquestions are not flattened just because the pattern is
  unusual
- the draft has the correct root shape for that paper instead of a forced
  template
- no duplicate or cyclic node relationships exist

### Blocks

- blocks contain content only; structural numbering and labels live in node
  labels, not block text
- prompt text is not dropped
- correction text is not silently compressed away
- short labels are headings only when they truly act like headings
- standalone formulas use `latex` blocks when needed
- prose with inline notation stays readable
- duplicated chrome or numbering noise is removed from block text
- straightforward structured assets are native by default when the app can
  render them faithfully
- tables, simple correction tables, probability trees, sign tables, variation
  tables, truth tables, and formula-heavy visuals are native blocks whenever
  faithful native rendering is possible
- tables, probability trees, sign tables, and variation tables are native-first,
  not crop-first; do not hand obvious native-renderable structures to humans as
  crop work
- sign and variation tables use the best faithful renderer available; KaTeX is
  acceptable when it best preserves the source layout, while a dedicated native
  table renderer is better when it is more faithful and inspectable

### Correction Fidelity

- official correction steps are preserved faithfully
- barème and point splits are preserved precisely
- no invented solution steps are added beyond minimal clarifying context
- hints never replace the official solution

### Assets

- assets point to the right source page and document
- assets are attached to the right question or exercise
- assets that should remain structured blocks are not reduced carelessly to
  images
- native-rendered assets are visually rechecked against the source page or crop
  and repaired before handoff
- crops for native-rendered tables/trees/sign/variation tables are provenance or
  fallback, not human crop debt, unless Codex could not safely render them
- crops are tight enough that the student-side preview looks intentional
- any remaining full-page or broad placeholder crops are explicitly called out
  and are not publish-ready
- duplicate assets, stale native suggestions, and cleanup noise are fixed before
  handoff whenever they can be fixed without changing source meaning

### Readability

- OCR spacing and punctuation are cleaned when obvious
- notation is consistent
- block ordering follows the visible source order
- the draft reads like a trustworthy structured version of the paper, not like
  raw OCR

## Handoff Standard

When handing off to the human reviewer, report:

- what source bundle was processed
- which extraction route was used
- whether the draft was created fresh or refreshed
- what major normalization fixes were applied
- any remaining risks or open questions that could not be safely fixed

Do not claim the draft is verified unless it was actually reviewed against the
PDFs.

## Escalate Instead Of Guessing

Pause and ask for direction if any of these are true:

- the exam and correction appear mismatched
- the stream-sharing family is ambiguous
- the subject or session cannot be resolved confidently
- the correction omits too much to recover a faithful structure
- the source has layout patterns not covered by the current normalization rules

When in doubt, keep the uncertainty explicit in the handoff instead of hiding it
inside the draft.

## What "Good" Looks Like

A good agent-produced draft should feel boring to the final human reviewer:

- no major hierarchy surprises
- no major correction omissions
- no confusing block typing
- no unexplained metadata drift
- no obvious source-page confusion

The final reviewer should be able to move quickly because the agent already did
the heavy thinking.
