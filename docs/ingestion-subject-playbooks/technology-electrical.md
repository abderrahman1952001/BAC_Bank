# Technology Electrical Ingestion Playbook

Subject code: `TECHNOLOGY_ELECTRICAL`

Use this alongside `.agents/skills/bac-ingestion/SKILL.md`,
`docs/admin-ingestion-workflow.md`, and
`docs/ingestion-structure-normalization.md`.

## Shape

- Electrical technology papers are `MT_ELEC` papers and normally have two
  variants (`SUJET_1`, `SUJET_2`).
- The visible structure is usually a technical file followed by answer-file
  work. Preserve the technical file as shared `CONTEXT` when the paper presents
  system description, A-0/SADT, GRAFCET, circuit, manufacturer, and technology
  choice documents before the questions.
- Keep the two subject variants separate even when they share families of
  questions. The systems, task numbers, circuits, registers, and component
  labels often differ enough that forcing a shared tree is risky.
- Modern years may use named parts inside each variant. Preserve visible
  `CONTEXT -> PART -> QUESTION` or `EXERCISE -> CONTEXT/PART -> QUESTION`
  grouping rather than flattening every question into the root.

## Native Rendering

- Render activation/deactivation equation tables, TRISA/TRISB tables, truth or
  state tables, component/function tables, Zener-choice tables, and small
  correction tables natively when the crop or reviewed extraction gives clear
  cell data.
- Convert pipe-delimited paragraph tables and LaTeX `array` correction tables
  into `table` blocks with `data.rows`; do not leave them as prose or formula
  blocks when the table structure is already known.
- A dedicated `technicalDiagram` renderer now exists for simple
  `technical_flow`, `technical_grid`, and `technical_waveform` payloads. It
  should follow the same trust policy as native tables: keep the source crop
  attached for provenance/fallback and set `reviewStatus: "visual_checked"` only
  after comparing the native render with the page/crop.
- A-0/SADT diagrams, simple FAST-like functional flows, compact GRAFCET/state
  diagrams, Karnaugh maps with clear grouping marks, register/config grids, and
  timing charts may be native-rendered when every label, arrow, state, group,
  transition, and axis can be represented explicitly. Prefer explicit
  coordinates over auto-layout when the source geometry carries meaning.
- Keep power/control circuits, ladder diagrams, dense counter/register
  drawings, IC pinout sheets, manufacturer sheets, pneumatic/kinematic forms,
  and multi-panel answer documents image-backed unless a faithful dedicated
  renderer exists for that exact form.
- Dense technology-choice sheets often contain merged cells and multi-row
  grouping. Do not flatten them into the simple table renderer unless the
  grouping can be preserved faithfully. Use the image crop instead.
- Blank answer-document pages often combine a table with circuit/register
  diagrams on the same page. Keep those image-backed unless the page has been
  split into a tight table crop and a separate diagram crop.

## Current Sweep Notes

- The 2025 local Gemini JSON has variant shells but no extracted node graph.
  The DB draft is usable enough for review, but it should be treated as a
  visual-audit draft rather than a trustworthy raw-extract import.
- `extracted papers/techno electric/2009.txt` is the usable 2009 raw artifact.
  `2009 .txt` appears to be an older duplicate and should not overwrite the
  current two-variant draft.
- The native-table pass converted all reviewed extraction candidates with
  complete cell data into app-native table blocks. Candidates that only named a
  table location, such as "table data for..." or "الجدول في صفحة...", were not
  treated as cell data.
- The 2024 pure table crop pass converted visually checked correction tables
  and the Zener reference table. Dense technology-choice sheets and ambiguous
  equation rows remain image-backed intentionally.
- The 2024 published revision
  `af880821-814e-4b8e-aace-75119436d2ee` now has three visually checked
  `technical_flow` renders. The latest added render is the `SUJET_1` GMMA state
  diagram on exam page 3 (`revision_asset_71c4834a-08e5-4b61-9111-499090cad9d8`);
  its source crop remains attached as fallback/provenance. Keep the surrounding
  circuits, dense technology-choice sheets, and manufacturer documents
  image-backed unless split and checked separately.
  The technology native-rendering audit treats this latest published revision
  as the effective 2024 job so old origin-job A-0 candidates do not reappear in
  effective candidate accounting.
- The 2021 normal paper has a published revision
  `46157b4f-46a9-467e-bef4-a6ac0b0fc2f1`. Its six full-page correction-table
  fallback crops were visually checked and tightened while preserving their
  native `table` rows. The two remaining exam-page native candidates were
  checked against exam pages 15 and 16 and marked intentionally image-backed
  because they are mixed answer sheets with A-0, actuator, register, logic, and
  counter material rather than isolated renderer-safe diagrams.
- The 2023 normal paper has a published revision
  `e9be9273-3e26-496a-bc6b-96419f01953b`. Its two A-0 context diagrams on exam
  pages 1 and 11 were visually checked, tightened to focused provenance crops,
  and marked intentionally image-backed. They are isolated, but the current
  `technical_flow` renderer cannot faithfully place the A-0 corner marker,
  external Arabic labels, and adjacent legend exactly enough for a trusted
  native render.
- The 2016 normal paper has a published revision
  `a44ef902-c007-4fc1-bdcc-ee0d896087bf`. Its remaining effective candidate is
  a `SUJET_2` correction page that combines A-0/SADT-style analysis, a GRAFCET
  correction, and marks columns; it was visually checked and marked
  intentionally image-backed with the preserved source-page crop. The 2016
  exam-page A-0 and dense 7490/7474/CONFIG manufacturer sheets should also stay
  image-backed unless split into smaller visually checked assets.
- The 2019 normal paper has a published revision
  `f2a806d7-d6ef-446c-95af-c7d9f084d7e6`. Its inspected GRAFCET/A-0 candidates
  were kept image-backed after visual review: `SUJET_1` exam page 4, correction
  page 1, `SUJET_2` exam page 15, correction page 6, and the `SUJET_2`
  manufacturer/reference sheet on exam page 18. The page-level crops are
  preserved as provenance. Page 18 still has possible future split-table work
  for the 7490 operating table and transformer table, but the CTN graph and IC
  pinout should remain image-backed unless a dedicated renderer exists.
- The 2018 normal paper has a published revision
  `188da8f3-0b4c-4512-8930-a769fb876a45`. After the revision was opened, the
  effective audit flagged two `SUJET_2` assets: exam page 19 and correction page
  6. Both were visually checked and marked intentionally image-backed because
  they are mixed A-0/logic/circuit/correction sheets rather than isolated
  renderer-safe flows.
- The 2014 normal paper has a published revision
  `03b0b425-fa34-4131-a478-36210ebdbd8c`. The old published candidate set was
  checked against exam pages 4, 11, and 12 plus correction pages 1, 4, 5, 6,
  and 9. Sixteen corresponding revision assets were marked intentionally
  image-backed: multi-panel GRAFCET sheets, mixed A-0/GPN sheets, mixed
  correction pages with marks columns, and the Karnaugh/truth-table/circuit
  correction page. Keep page 5's existing native table rows, but do not
  native-render the surrounding mixed correction sheet as one asset.
- The 2013 normal paper has a published revision
  `8adaa5b5-e8b8-4457-8d98-0492dc49e34f`. Its A-0/GRAFCET candidates were
  visually checked against exam pages 1, 5, 10, and 13 plus correction pages 1
  and 5. Fourteen corresponding revision assets were marked intentionally
  image-backed because they are mixed A-0/GRAFCET/circuit/correction-table
  sheets or use external labels/corner marker placement that the current
  `technical_flow` renderer cannot reproduce source-faithfully. Keep the
  source crops as provenance; only split future work into smaller native assets
  after visual checks.
- The 2012 normal paper has a published revision
  `db4e39ff-2e3b-42fc-ada2-8b46c49210f4`. Its old ten published candidates
  were replaced by the revision draft, then the corresponding revision assets
  were visually checked against exam pages 2, 3, 4, 13, and 14 plus correction
  pages 1, 2, and 5. Fifteen revision assets were marked intentionally
  image-backed because the pages combine A-0/SADT context, multi-panel
  GRAFCETs, timing charts, counter/IC/circuit references, formulas, tables,
  and official marks columns. The 2012 effective candidate count is now zero.
- The 2017 makeup paper has a published revision
  `04fe2211-1366-4f33-b00b-3c39f2971c09`. Its page-level visual-fallback assets
  were checked with exam and correction contact sheets. All 47 revision image
  blocks were marked intentionally image-backed because the paper is represented
  as full-page or page-level exam/correction sheets containing mixed source
  prose, A-0/SADT, GRAFCETs, technical tables, circuits, manufacturer/reference
  sheets, formulas, timing charts, and official marks columns rather than
  isolated renderer-safe diagrams. Electrical now has zero effective native
  candidates; improving this paper further would require a deeper structural
  extraction/review slice rather than native-rendering the page assets.
- The 2011 normal paper has a published revision
  `3377f2ee-c6bb-4428-9521-13a0a43416fd`. Opening the revision removed the old
  five published candidates from effective candidate accounting; the
  corresponding revision pages were still visually checked against exam pages 3
  and 12 plus correction pages 1, 5, and 6. Eight revision assets were marked
  intentionally image-backed because the pages combine multi-panel GRAFCET,
  A-0/SADT-style correction material, marks columns, watermarks, hierarchy
  diagrams, and dense circuit/control drawings.
- The 2010 normal paper has a published revision
  `5d47c365-2625-4607-9ba3-08e387984b55`. Its old six published candidates
  were replaced by the revision draft, then the corresponding revision assets
  were visually checked against exam pages 5, 6, and 12 plus correction pages 1,
  6, and 7. Nine revision assets were marked intentionally image-backed because
  the pages combine GRAFCETs, A-0/SADT correction material, control panels,
  power/circuit diagrams, tables, calculations, watermarks, and official marks
  columns. The 2010 effective candidate count is now zero.
- The 2009 normal paper has a published revision
  `f4fed840-f1d7-4875-98d7-2b2f6da53c02`. Its remaining candidate pages were
  visually checked against exam pages 3 and 8 plus correction pages 1 and 5.
  Six revision assets were marked intentionally image-backed: `SUJET_1`
  multi-panel GRAFCET source material, `SUJET_1` correction GRAFCET/hierarchy
  page with marks columns, `SUJET_2` GRAFCET/power sheet, and `SUJET_2`
  correction page with GRAFCET, equation table, answer prose, and marks
  columns. The 2009 effective candidate count is now zero; keep future work
  split and visually checked if any smaller native table or flow assets are
  extracted later.
- The 2008 normal paper has a published revision
  `931f8727-956c-423a-a7be-78a0c996882c`. Its old five published candidates
  were replaced by the revision draft and the corresponding pages were visually
  checked against exam pages 2, 12, and 13 plus correction pages 2 and 4. Seven
  revision assets were marked intentionally image-backed because the pages
  combine A-0/SADT context, multi-panel GRAFCETs, a dense JK counter circuit,
  rotated/skewed source sheets, equation tables, and marks columns. The 2008
  effective candidate count is now zero.
- The 2019 manufacturer/reference page has several independent simple tables
  that can be split from old full-page placeholders: CTN resistance values,
  Zener references, transformer characteristics, SAA1027 input/sequence tables,
  PIC prescaler values, and the 7490 operating table. These are good native
  table candidates when visually checked; the CTN graph and partial/multi-page
  transformer references should remain image-backed unless split carefully.
- The 2014 correction pages include clear activation/deactivation and operating
  tables that old drafts may store as full-page correction images. Convert the
  table blocks natively and keep only tight crop boxes for provenance; the
  GRAFCETs, circuits, and waveform diagrams remain image-backed.
- The 2010 S2 photoelectric-cell operating table is a clear native table even
  though the old asset crop also contains unrelated correction diagrams.
- The 2016 S1 manufacturer annex stores 7490/7474/CONFIG/oscillator material as
  mixed pages with IC diagrams and explanatory text. Add split native table
  assets for the simple operating/config tables, but keep the original page
  image blocks for the non-table diagrams and prose.
- The shared development DB is now Neon-hosted. Batch/audit scripts that read or
  update ingestion jobs should wrap Prisma calls with a small retry/backoff for
  Neon cold-start or transient `Can't reach database server` failures.
- Remaining validation warnings in this subject are crop-placeholder warnings
  for non-native diagrams, dense sheets, or mixed answer/correction pages, not
  structural validation errors.
- The `2017 makeup` source bundle and published ingestion job exist for
  `bac-technology-electrical-mt-elec-2017-makeup` with 15 exam pages and 16
  correction pages. Treat the old "missing job" note as stale. Its active
  published revision has explicit image-backed native-review decisions for the
  page-level fallback assets; do not native-render those pages without first
  splitting smaller assets and visually checking them.
- When the user authorizes Codex to do the crop pass, prefer conservative
  source-page content crops for this subject's dense diagrams and mixed answer
  sheets instead of guessing tight per-diagram boxes. Trim outer blank margins
  from stored page PNGs, keep padding, and preserve native-rendered table crops.
  This removes placeholder debt while keeping labels, legends, axes, panel
  markers, and multi-panel sheet context intact.
- Published electrical papers are frozen. Add new native technical renders
  through published revision drafts; do not mutate live published rows directly.
