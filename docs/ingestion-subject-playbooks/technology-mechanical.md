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
  prompt FAST asset (`exam_fast_prompt_pg7`) was visually checked against exam
  page 7, tightened to crop `{x:860,y:1060,width:825,height:590}`, and marked
  intentionally image-backed because it is a blank student answer-sheet diagram
  rather than a filled standalone flow.
- The current audit separates intentional image-backed assets from unresolved
  native-render candidates. After the 2025 FAST prompt marker and the
  2023/2022/2020/2018/2017/2016/2015 FAST/GRAFCET slices, Mechanical has
  `33` intentional image-backed assets, `15` trusted `technical_flow`
  renderers, and `0` remaining native-render candidate assets.
- The 2023 normal `SUJET_1` correction FAST block (`s1_q1_a2_fast_corr`) was
  visually checked against correction page 2, tightened to crop
  `{x:880,y:900,width:850,height:690}`, and converted to a native
  `technical_flow`. Its blank prompt FAST crop (`s1_q1_a2_fast_exam`) and the
  related A-0 prompt/correction crops (`s1_q1_a1_a0_exam`,
  `s1_q1_a1_a0_corr`) were tightened and marked intentionally image-backed
  because they are blank answer forms or include the oval A-0 system node that
  the current renderer cannot represent faithfully.
- The 2023 normal `SUJET_2` correction FAST block (`s2_q1_a2_fast_corr`) was
  visually checked against correction page 8, tightened to crop
  `{x:850,y:850,width:880,height:1120}`, and converted to a native
  `technical_flow`. Its blank prompt FAST crop (`s2_q1_a2_fast_exam`) and the
  related A-0 prompt/correction crops (`s2_q1_a1_a0_exam`,
  `s2_q1_a1_a0_corr`) were tightened and marked intentionally image-backed for
  the same renderer-fidelity reasons as `SUJET_1`.
- The 2023 normal `SUJET_1` correction GRAFCET block
  (`s1_q2_b1_grafcet_corr`) was visually checked against correction page 6,
  tightened to crop `{x:465,y:700,width:700,height:1080}`, and converted to a
  native `technical_flow` with explicit steps, transitions, action boxes, and
  return loop. Its blank prompt form (`s1_q2_b1_grafcet_exam`) was tightened to
  crop `{x:95,y:500,width:820,height:1320}` and marked intentionally
  image-backed.
- The 2022 normal `SUJET_1` and `SUJET_2` filled FAST correction blocks
  (`s1_cor_p3_fast`, `s2_cor_p10_fast`) were visually checked against
  correction pages 3 and 10, tightened to crops
  `{x:850,y:920,width:880,height:760}` and
  `{x:800,y:1510,width:900,height:860}`, and converted to native
  `technical_flow`. Their blank FAST prompts and A-0 prompt/correction diagrams
  were tightened and marked intentionally image-backed.
- The 2022 normal `SUJET_2` filled GRAFCET correction block
  (`s2_cor_p15_grafcet`) was visually checked against correction page 15,
  tightened to crop `{x:60,y:220,width:1000,height:1280}`, and converted to a
  native `technical_flow`. Its blank prompt (`s2_p24_grafcet`) was tightened to
  the same GRAFCET-only crop and marked intentionally image-backed.
- The 2020 normal `SUJET_2` filled FAST correction block
  (`s2_q2_fast_solution`) was visually checked against correction page 10,
  tightened to crop `{x:870,y:950,width:860,height:1280}`, and converted to a
  native `technical_flow`. The matching A-0 prompt/correction diagrams and
  blank FAST prompt were tightened and marked intentionally image-backed.
- The 2018 normal filled FAST correction blocks (`S1_CORR_P3_IMG_FAST`,
  `S2_CORR_P11_IMG_FAST`) were visually checked against correction pages 3 and
  11, tightened to crops `{x:890,y:780,width:850,height:1050}` and
  `{x:880,y:820,width:850,height:1160}`, and converted to native
  `technical_flow`. Their prompt FAST forms (`S1_EXAM_P6_IMG_FAST`,
  `S2_EXAM_P16_IMG_FAST`) were tightened and marked intentionally image-backed
  because they mix prefilled cells with dotted answer fields. The mixed
  GRAFCET/pneumatic prompt page (`S2_EXAM_P20_IMG_GRAFCET`) was tightened to a
  page-content crop and marked intentionally image-backed because it combines a
  GRAFCET, actuator/distributor drawings, sensors, and instructions on one
  inseparable sheet.
- The 2017 normal `SUJET_1` filled GRAFCET correction block
  (`S1_GRAFCET_IMG_SOL`) was visually checked against correction page 7,
  tightened to crop `{x:220,y:420,width:850,height:1200}`, and converted to a
  native `technical_flow`. The matching blank GRAFCET prompt plus 2017 A-0
  prompt/correction and the `SUJET_2` prompt FAST form were tightened and
  marked intentionally image-backed because they are blank/partial answer forms
  or A-0 diagrams that the current renderer cannot faithfully represent.
- The 2016 normal filled GRAFCET/FAST correction blocks (`S1_EX1_A26`,
  `S2_EX1_A15`) were visually checked against correction pages 8 and 12,
  tightened to crops `{x:80,y:250,width:440,height:1040}` and
  `{x:40,y:650,width:1680,height:1020}`, and converted to native
  `technical_flow`. The related A-0 prompt/correction assets plus blank/partial
  GRAFCET and FAST prompt forms were tightened and marked intentionally
  image-backed.
- The 2015 normal filled GRAFCET correction blocks (`s1_q_grafcet_img_sol`,
  `s2_q_grafcet_img_sol`) were visually checked against correction pages 6 and
  13, tightened to crops `{x:260,y:1200,width:800,height:1130}` and
  `{x:400,y:420,width:980,height:1660}`, and converted to native
  `technical_flow`.
- Deferred normal-session years: `2024`, `2021`, and `2013`.
- The remaining validation warnings are expected crop/graph-image fallback debt,
  not structural errors.
