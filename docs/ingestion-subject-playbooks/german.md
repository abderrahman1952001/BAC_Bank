# German Ingestion Playbook

Subject code: `GERMAN`

Use this alongside `.agents/skills/bac-ingestion/SKILL.md`,
`docs/agent-ingestion-playbook.md`, and
`docs/ingestion-structure-normalization.md`.

## Scope

- Current paper family: `le`
- Current stream: `LE`
- Source bundles are exam plus correction PDFs with page images.
- No local Gemini JSONs were available at the start of the German pass, so
  direct visual reconstruction is expected paper by paper.

## Paper Shape

German LE papers normally contain two selectable variants:

- `SUJET_1` / `الموضوع الأول`
- `SUJET_2` / `الموضوع الثاني`

Use one root `CONTEXT` per variant for the shared candidate instruction when it
is visible, then one root `EXERCISE` for the selected subject. Put the reading
passage, source line, and vocabulary footnotes on that exercise.

Inside each subject, preserve the visible three-section structure:

- `I. TEXTVERSTÄNDNIS` as a `PART`
- `II. SPRACHFÄHIGKEIT` as a `PART`
- `III. SCHREIBFÄHIGKEIT` as a `PART`

When `II. SPRACHFÄHIGKEIT` is split into `A. Wortschatz` and `B. Grammatik`,
nest those as child `PART` nodes and put their numbered prompts underneath.

## Polish

- Keep German prompts source-close. Do not normalize capitalization,
  punctuation, umlauts, quoted titles, or visible underlined-word references
  unless the scan makes the correction unambiguous.
- Keep Arabic instruction, source lines, and vocabulary glosses because they
  are printed source content.
- Correction answers may be broken into readable lines, but official accepted
  alternatives and barème multipliers must stay visible.
- If an official correction appears to conflict with the exam text, preserve
  the official correction and add an uncertainty note instead of silently
  repairing it.

## Native Rendering

- True/false justification grids, matching grids, and short answer tables should
  be native markdown table blocks with `data.rows`.
- Written-expression topics should be native text lists. They are not crop
  assets.
- German LE papers are expected to be asset-free unless a future scan contains a
  genuinely non-text visual.

## Review Focus

- Check the full reading passage visually. The passage is usually the highest
  transcription risk.
- Check every synonym, antonym, word-formation item, tense transformation,
  passive transformation, relative pronoun, modal-verb replacement, declension,
  and translation answer against the correction.
- Preserve point totals: comprehension is usually 7 points, language skills 8
  points, and writing 5 points, but per-question rubrics must follow the visible
  correction.
