# English Ingestion Playbook

Subject code: `ENGLISH`

Use this alongside `.agents/skills/bac-ingestion/SKILL.md`,
`docs/agent-ingestion-playbook.md`, and
`docs/ingestion-structure-normalization.md`.

## Shape

- English papers usually have two variants, each built around reading,
  text-exploration, and written-expression sections. Follow the visible section
  labels; `PART` roots are normal and should not be forced into exercise roots.
- Keep the reading passage as source-close `CONTEXT` or parent prompt content.
  Do not summarize, modernize, or trim adapted-source lines unless the scan
  clearly marks them as non-content.
- Numbered activities become `QUESTION` nodes. Lettered activity items may
  become `SUBQUESTION` nodes when the extract already separates them cleanly;
  otherwise keep the source list inside the question prompt.

## Polish

- Move repeated structural headings such as `Part One: Reading`, `A/
  Comprehension`, and `B/ Text Exploration` into node labels when they already
  define the node.
- Keep exam wording source-close. English wording, capitalization, punctuation,
  quotation marks, and underlined-word references can be semantically important.
- Correction answers may be compact, but do not collapse official alternatives,
  dotted quotation gaps, or accepted-answer notes.
- Preserve barème multipliers such as `0.5 x 4`, `0.25 x 6`, and written
  expression criteria totals.

## Native Rendering

- Morphology, phonology, matching, true/false, and written-expression scoring
  grids are simple native tables when the extract contains the cells.
- Do not publish table assets as full-page crops for English when the table is
  already represented in structured text. Convert markdown-table rows into
  `block.data.rows` and keep the draft asset-free.
- If the extract only says a table exists but omits its cells or official
  answers, hold that paper out for a better JSON or a dedicated visual
  reconstruction pass.
- If Gemini stopped early on a recitation block but left a usable scaffold,
  salvage the paper with a dedicated visual reconstruction pass rather than
  treating the incomplete JSON as useless. Only approve content whose missing
  prompts, table cells, and rubrics have been checked against source pages.

## Known Risks

- Some raw English JSONs contain unescaped line breaks or quoted phrases inside
  JSON strings. These are cheap mechanical repairs only when the full JSON
  object is still present.
- Some older language-stream extracts keep table content only as image-asset
  placeholders. Do not approve those unless the table cells are reconstructed
  natively from source evidence.
- The 2017 makeup papers have complete source PDFs in this checkout but no
  extracted JSONs in the current English folder; handle them later from fresh
  extractions or direct visual reconstruction.
