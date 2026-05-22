# Philosophy Ingestion Playbook

Subject code: `PHILOSOPHY`

Use this alongside `.agents/skills/bac-ingestion/SKILL.md`,
`docs/agent-ingestion-playbook.md`, and
`docs/ingestion-structure-normalization.md`.

## Shape

- Philosophy papers are organized around optional topics. Model each visible
  topic as an `EXERCISE` root labeled `الموضوع الأول`, `الموضوع الثاني`, or
  `الموضوع الثالث`.
- Philosophy uses one handed paper, not two separate sujets. Keep the visible
  paper in `SUJET_1`, put all optional topic roots there, and leave `SUJET_2`
  empty. Mark these drafts with
  `draft.exam.metadata.paperChoiceMode = "single_paper_optional_roots"` so the
  empty second variant is intentional and does not publish as a live sujet.
- Shared instructions such as `عالج موضوعا واحدا على الخيار` can be a root
  `CONTEXT` node before the first topic.
- Correction-only grading components such as `طرح المشكلة`, `محاولة حل
  المشكلة`, and `حل المشكلة` should usually be `PART` nodes. Do not model
  rubric-only rows as leaf `QUESTION` or `SUBQUESTION` nodes unless the exam
  source actually has a matching question prompt.

## Polish

- Preserve essay prompts, quotations, named authors, and source references
  source-close. Philosophy wording is the content.
- Correction content may be split into readable native paragraphs and rubric
  blocks, but do not invent alternate arguments or collapse official point
  splits.
- Keep point splits such as `01.5`, `0.5`, `04`, and language-note deductions
  visible in rubric text.
- If a topic is a text analysis, keep the quoted passage in the prompt and keep
  the reference/source line when present.

## Correction Tables

- Official correction pages often use grids where each row is a paragraph and
  the side columns hold partial/total marks. These are grading layout tables,
  not student-facing data tables.
- Prefer converting those grids into native prose/list-like rubric blocks under
  the relevant topic/part nodes.
- Do not publish full-page correction-table crops as assets when the same
  content has already been decomposed into native solution/rubric nodes.
- Keep native `table` blocks only for genuinely tabular information whose
  columns and rows are meaningful to the learner beyond print layout.

## Known Risks

- Raw JSON metadata uses inconsistent stream and subject labels. Trust the
  target `paper_source` slug for stream/family placement.
- Before publishing, align `draft.exam.metadata.paperStreamCodes` with the
  target `paper_source_streams`. Old combined-family philosophy drafts can keep
  stale `SE/M` stream metadata even when the source is actually `tm-ge`, causing
  live-exam stream collisions at publication.
- Some older drafts split the first topic into `SUJET_1` and the second/third
  topics into `SUJET_2`. Merge those topic roots back under `SUJET_1` before
  approval or revision publication.
- Some Gemini files include top-level correction-table asset candidates even
  when the same correction has already been transcribed into nodes. Remove the
  redundant placeholder assets.
- Some years or makeup sessions may not have JSON yet. Use visual extraction
  only when needed and keep uncertainty explicit.

## Sweep Notes

- The completed local sweep published 75 philosophy jobs: normal-session
  papers from 2025 down to 2008 across available stream families, plus the four
  2017 makeup papers.
- The final sweep state was zero validation errors, zero validation warnings,
  and no remaining non-native assets.
- `2014 se-m` required a mechanical raw JSON repair because its root context
  used `orderIndex: 0`; normalize sibling order to positive one-based values
  before import.
