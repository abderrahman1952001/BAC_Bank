# Technology Mechanical Ingestion Playbook

Subject code: `TECHNOLOGY_MECHANICAL`

Use this alongside `.agents/skills/bac-ingestion/SKILL.md`,
`docs/admin-ingestion-workflow.md`, and
`docs/ingestion-structure-normalization.md`.

## Shape

- Mechanical technology papers are for `MT_MECH` and commonly have two optional
  variants (`SUJET_1`, `SUJET_2`). Some years may have only one extracted
  variant; do not invent a second variant without source evidence.
- The visible structure is usually a technical file followed by answer-file
  work. Model the technical file as a `CONTEXT` root such as `الملف التقني`,
  then keep the work sections as roots or children according to the extraction:
  `دراسة تصميم المشروع` / `دراسة الإنشاء` and
  `دراسة تحضير المشروع`.
- Keep system descriptions, operating cycles, technical data, resource sheets,
  and answer instructions source-close. They are often needed to understand
  later drawing, FAST, kinematic, machining, and tolerance questions.
- Normalize empty or numeric labels from headings when possible:
  `1.4- دراسة تصميم المشروع` -> `دراسة تصميم المشروع`,
  `2.4- دراسة تحضير المشروع` -> `دراسة تحضير المشروع`, and
  `1-5-1- دراسة الإنشاء` -> `دراسة الإنشاء`.

## Visual Assets

- Assembly drawings, definition drawings, kinematic diagrams, pneumatic
  diagrams, machining drawings, tolerance-chain drawings, and dense correction
  drawings should remain image-backed. They are authoritative technical
  drawings, not decoration.
- A dedicated `technicalDiagram` renderer now exists for simple `technical_flow`,
  `technical_grid`, and `technical_waveform` payloads. Use it only when the crop
  is isolated enough to visually check every label, arrow, mark, and geometric
  relationship. Set `reviewStatus: "visual_checked"` only after that source
  comparison.
- FAST, A-0/SADT, and GRAFCET assets may be native-rendered with
  `technical_flow` when they are simple and source-faithful. Mechanical answer
  pages often mix FAST/A-0/GRAFCET with drawings, blank answer forms, tables, and
  instructions on one page; keep those image-backed unless the visual has been
  split into a clear crop or fully captured with explicit geometry.
- Table-like answer grids, nomenclature tables, machining-operation tables, and
  filled correction tables are native-first when the cells are already
  transcribed or can be visually checked cheaply. Keep the crop as
  provenance/fallback by linking the source asset to the native `table` block
  when possible.
- Nomenclature/parts-list sheets should use the stable native column order
  `رقم | عدد | تعيينات | مادة | ملاحظات`, even when the source is visually
  right-to-left. Preserve trade/reference-standard notes in `ملاحظات`, not in
  the designation cell.
- Karnaugh maps, resource sheets, phase contracts, and stage/manufacturing forms
  may look table-like, but their grid geometry, grouping marks, drawing regions,
  and blank form areas are part of the source content. Use `technical_grid` only
  for visually checked small grids whose spans, marks, blanks, and labels can be
  captured faithfully; otherwise keep a crop.
- Many Gemini-reviewed mechanical drafts contain correction tables as
  pipe-delimited paragraph text next to a table crop. Convert those paragraphs
  to `table` blocks with `data.rows`; if the matching table asset is clear,
  move its `assetId` onto the native table block and remove the duplicate image
  block.
- Full-page placeholder crops are not publish-ready. If a page mixes several
  inseparable technical visuals, a conservative page-content crop is acceptable:
  trim outer blank margins while preserving all labels, axes, legends, panel
  markers, and surrounding context. Do not split or over-tighten mixed technical
  sheets by guesswork.

## Known Risks

- The local raw folder is misspelled:
  `extracted papers/thechno mechanic`.
- Some raw files are cheap mechanical repairs rather than failed extractions:
  `2015.txt` and `2022.txt` had control characters or quote/backslash issues
  and can be repaired into import-ready reviewed JSON.
- Some local raw files are not usable as reviewed extracts:
  `2024.txt` is a Gemini refusal/empty extraction, `2021.txt` has no variants,
  and `2013.txt` is missing locally.
- `2017 makeup` has a complete source bundle in the DB but no local raw JSON or
  existing job in this checkout. A readiness report and contact sheets now live
  under `output/technology-native-render-audit/missing-2017-makeup/`. Leave it
  for a later extraction or deeper visual reconstruction pass; do not create an
  empty placeholder job.
- Do not import a single-variant raw file over a stronger existing two-variant
  draft unless the source pages confirm the exam is genuinely single-variant.

## Current Sweep Notes

- The no-publish pass repaired/imported the cheap `2015` and `2022` JSONs,
  normalized labels/order on usable normal-session drafts, and left all jobs in
  `IN_REVIEW`.
- A follow-up native-table polish converted existing pipe-delimited correction
  table transcriptions into native table rows. Remaining table assets still need
  cell-by-cell visual reconstruction when they are not already transcribed.
- A later visual pass converted the remaining legible nomenclature sheets
  (2023, 2022, 2020, 2018, 2017, 2012) plus compact 2023 dimension and 2018
  truth tables into native rows. Karnaugh maps, phase contracts, resource
  sheets, and stage forms remain image-backed intentionally.
- The first mechanical `technical_flow` pilot is the 2025 normal `SUJET_1`
  correction FAST diagram for `FS` / `طي الصفائح`
  (`corr_fast_sol_pg2`). It was visually checked against correction page 2,
  given a tight fallback crop, and stored as a native FAST flow. The matching
  prompt FAST asset remains image-backed because it is a blank mixed answer
  sheet rather than a filled standalone diagram.
- Deferred normal-session years: `2024`, `2021`, and `2013`.
- The remaining validation warnings are expected crop/graph-image fallback debt,
  not structural errors.
