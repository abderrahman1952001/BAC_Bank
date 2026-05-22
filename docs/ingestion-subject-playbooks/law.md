# Law Ingestion Playbook

Subject code: `LAW`

Use this alongside `.agents/skills/bac-ingestion/SKILL.md`,
`docs/agent-ingestion-playbook.md`, and
`docs/ingestion-structure-normalization.md`.

## Shape

- Law papers are often text-first and may be `PART`-rooted rather than
  `EXERCISE`-rooted. Follow the visible root shape instead of forcing exercise
  roots.
- Keep shared setup text as `CONTEXT` when it introduces multiple questions or
  a full part. Preserve context in the student preview; it is part of the paper.
- The common modern shape is usually two variants, each with two main parts:
  a short direct-question part and a source-document/application part. Older
  papers may use different point totals and larger independent questions.
- Labels such as `الجزء الأول`, `السؤال الأول`, `السند 01`, and `المطلوب`
  should live in node labels or heading blocks according to their visible role,
  not be duplicated as prose noise.

## Polish

- Keep prompt wording source-close. Law questions often hinge on a small legal
  term, article reference, or qualifier.
- Correction paragraphs may be split into readable lists when the official
  answer is already list-like. Do not add explanatory legal reasoning that is
  not in the correction.
- Preserve article references, company-form names, tax/budget terminology, and
  point splits exactly.
- Make rubric text inspectable: keep fractional points and multipliers such as
  `0.5 x 4`, and attach them to the most specific scored node available.

## Native Rendering

- Simple comparison tables and correction/barème tables should be native
  blocks when faithful. They should not be left as human crop work.
- Most law papers have no semantic image assets. If only text tables are
  present, an approved/published draft can be asset-free after visual and
  student-preview checks.
- Use crops only for genuinely non-native visuals or when the scan layout is
  needed as provenance for an unusual table.

## Known Risks

- Raw extracts may mix Arabic subject/stream labels with canonical codes. Normalize
  to `LAW` and the appropriate stream code before approval.
- Older papers may use broad root context and non-modern totals; do not force
  them into the 6/6/8 modern split.
- Watch for duplicated structural headings in block text after import, especially
  when the same label is already represented by a node.

