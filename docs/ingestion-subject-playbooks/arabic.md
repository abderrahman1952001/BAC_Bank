# Arabic Ingestion Playbook

Subject code: `ARABIC`

Use this alongside `.agents/skills/bac-ingestion/SKILL.md`,
`docs/admin-ingestion-workflow.md`, and
`docs/ingestion-structure-normalization.md`.

## Shape

- Arabic papers are usually two optional topics, modeled as `SUJET_1` and
  `SUJET_2`, each with a root `CONTEXT` node labeled `النص`.
- Keep the literary text, poem, glossary, and source reference in the context.
  Questions should not duplicate the text itself.
- The common modern topic shape is three `PART` nodes:
  `أولا- البناء الفكري`, `ثانيا- البناء اللغوي`, and
  `ثالثا- التقييم النقدي`. Preserve older or unusual labels when the scan
  differs.
- Part and question labels belong in the node tree. Strip duplicated leading
  labels such as `1)`, `2 -`, or `ثانيا- البناء اللغوي: (06 نقاط)` from block
  prose once the node label and `maxPoints` carry them.
- Raw Arabic Gemini files may use global `orderIndex` values. Normalize sibling
  order to contiguous one-based values per parent before approval.

## Polish

- Preserve poem verses, prose paragraphs, quotations, author/source references,
  diacritics, and punctuation source-close. Arabic literary wording is content,
  not decoration.
- For poems printed in columns, keep the visible reading order. If the intended
  order is uncertain, stop short of approval and leave a source note.
- Correction content may be split into readable native paragraphs or lists, but
  do not add literary analysis that is absent from the official correction.
- Keep rubric math explicit, including fractional values and multipliers such as
  `0.5 x 4`, and attach each rubric to the most specific scored node.

## Native Rendering

- Straight correction tables for الإعراب, الإحالة, الصور البيانية, العروض, or
  التقطيع should be native table content before approval. Do not approve full
  page placeholder table crops when the table can be represented faithfully.
- If a file has table assets without native data, either convert them visually
  from the correction pages or hold the paper out of the approved batch.

## Known Risks

- Some local raw artifacts parse but still include unresolved uncertainties.
  Do not approve those until the uncertainty has been visually resolved or the
  user provides a corrected extraction.
- Some raw files use non-positive or global `orderIndex` values. If the content
  otherwise matches the source, repair those by normalizing sibling order per
  parent and re-import through the canonical reviewed-extract path.
- Watch for stream-family mismatches. In particular, never import an `others`
  artifact that says it was extracted from LP scans into the grouped
  `se-m-tm-ge` source.

## Sweep Notes

- `bac-arabic-lp-2025-normal` is the first golden paper for this sweep. It was
  visually checked against the exam and correction page structure, normalized
  to remove duplicated labels, imported through `import:reviewed-extract`, and
  approved with zero validation errors or warnings.
- The first Arabic sweep approved 37 jobs with zero validation errors and zero
  validation warnings. The approved set includes clean raw extracts plus
  visually/source-resolved cases where redundant table assets or non-content
  uncertainty notes were removed.
- A follow-up repair pass fixed usable `orderIndex` failures, visually resolved
  a few source quirks, and brought the Arabic approved total to 48 of 57 paper
  sources, all with zero validation errors and zero validation warnings.
- The corrected-JSON pass plus a direct visual reconstruction of
  `bac-arabic-le-2012-normal` brought Arabic to 56 approved jobs out of 57
  paper sources, all with zero validation errors and zero validation warnings.
  The corrected pass converted straightforward correction tables into native
  table blocks where present.
- `bac-arabic-lp-2023-normal` was repaired from the DzExams 2023 LP annale:
  the old correction object was a scientific/math/technical/economics-stream
  mismatch, while the verified replacement has the LP exam on pages 1-4 and
  the LP correction on pages 5-10. The canonical correction document now stores
  the split 6-page LP correction, and the reviewed extract uses that source.
- Arabic is published end to end for all 57 paper sources after a final
  no-asset preflight. The post-publish audit found 57 published papers, 173
  live exam offerings, 114 published variants, 1,727 published nodes, 5,289
  published blocks, zero validation errors, zero validation warnings, and zero
  media-backed blocks.
