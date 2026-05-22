# French Ingestion Playbook

Subject code: `FRENCH`

Use this alongside `.agents/skills/bac-ingestion/SKILL.md`,
`docs/agent-ingestion-playbook.md`, and
`docs/ingestion-structure-normalization.md`.

## Scope

- Paper families currently present: `le`, `lp`, `se-m-tm-ge`, and
  `se-m-tm-ge-arts` for the 2024/2025 shared-family sources.
- French is multi-family. Do not assume one source covers all streams for a
  year.
- Many DB draft jobs are source-intake shells with empty variants. Treat them
  as unreviewed until a real reviewed extract is imported.

## Paper Shape

French papers normally contain two selectable variants:

- `SUJET_1` / `الموضوع الأول`
- `SUJET_2` / `الموضوع الثاني`

Use the visible text passage as a `CONTEXT` node for each variant. Use the
visible sections as root or child `PART` nodes:

- `I. COMPREHENSION` or `I. Compréhension de l'écrit`
- `II. PRODUCTION ECRITE` or `II. Production écrite`

For production écrite, model the candidate choice as one scored `QUESTION`
labelled `un sujet au choix`, with both prompt options inside that question.
Do not split the two production topics into two independently scored questions.

## Polish

- Keep reading passages source-close. They are dense and high-risk; do not
  silently modernize spelling, punctuation, dates, citations, or source lines.
- Keep French section names and source-visible capitalization close to the scan,
  while removing duplicated score text from node labels when `maxPoints`
  carries the score.
- Correction grids may be converted into readable rubric paragraphs or native
  tables when that preserves the official barème.
- If the exam and correction disagree about a section total, preserve the
  official correction scoring and add an uncertainty note.

## Native Rendering

- Simple comprehension tables should be native table blocks with `data.rows`,
  not crop assets.
- Production-writing barèmes can be native rubric paragraphs or native tables.
- French papers are expected to be asset-free unless a future scan contains a
  genuinely non-text visual.

## Review Focus

- Visually check page coverage for both sujets before import.
- Check every reading passage title, source line, author attribution, footnote,
  and quoted expression against the page image.
- Check production écrite totals carefully: many papers use `13 + 7` or
  `14 + 6`; language-stream papers may differ from shared-family papers.
- Do not publish a French source from an empty draft job or an incomplete
  extracted artifact.
