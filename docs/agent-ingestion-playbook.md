# Agent Ingestion Playbook

## Purpose

Use this playbook when an agent is asked to produce a reliable BAC ingestion
draft from source papers.

The success criterion is not "got some JSON back from Gemini." The success
criterion is:

- the draft is structurally reliable
- the correction is faithful
- the human final review is fast
- publication should not produce surprises

This playbook follows the canonical workflow in
`docs/admin-ingestion-workflow.md`.

## Default Route

Unless the user explicitly says otherwise, use this extraction route:

- Google AI Studio
- `Gemini 3.1 Pro`
- structured output enabled
- both the exam PDF and correction PDF attached

If the extraction must go through the API, verify the exact Google API model
code before running it. Do not assume the Studio-facing name is the same as the
API identifier.

Fallback:

- Gemini API through the shared ingestion path only when needed

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
- run the manual extraction workflow in Google AI Studio
- turn the extraction output into a reviewed draft
- normalize and clean the draft
- save the reviewed draft back to the job

An agent must not:

- create a second ingestion engine in scripts
- invent missing source or correction content
- publish raw Gemini output without review
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

### 4. Run Extraction In Google AI Studio

The default manual extraction sequence is:

1. Open Google AI Studio.
2. Select `Gemini 3.1 Pro`.
3. Enable structured output.
4. Paste the general extraction prompt.
5. Paste the request-specific prompt.
6. Paste the output JSON structure.
7. Attach the exam PDF.
8. Attach the correction PDF.
9. Run the extraction.
10. Save the raw JSON response.

Current prompt sources:

- `gemini-prompts/extraction-system-instruction.txt`
- `gemini-prompts/extraction-request-template.txt`
- output structure aligned with
  `apps/api/src/ingestion/gemini-extractor.ts`

If the user explicitly asks for API extraction, use the shared ingestion
processing path instead of inventing a separate API script.

### 5. Create Or Refresh The Draft

Take the raw extraction JSON and turn it into the job's `draft_json`.

At minimum, preserve extraction provenance in `draft.exam.metadata`:

- route: `google_ai_studio` or `api`
- model: `gemini-3.1-pro`
- extracted timestamp
- prompt version or prompt bundle reference

The reviewed draft is the artifact that matters. The raw extraction JSON is only
an input to that draft.

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

### 8. Save The Reviewed Draft

When the draft is materially better, save it back to the ingestion job.

Important status behavior:

- draft edits before approval are normal
- draft edits after approval invalidate approval
- published jobs are frozen

### 9. Hand Off For Final Human Review

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
- uncropped assets are acceptable only when the later human pass can fix them
  quickly

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
- which model was used
- whether the draft was created fresh or refreshed
- what major normalization fixes were applied
- any remaining risks or open questions

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
