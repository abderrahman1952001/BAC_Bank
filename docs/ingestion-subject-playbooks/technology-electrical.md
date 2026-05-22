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
- The 2024 active published revision draft
  `af880821-814e-4b8e-aace-75119436d2ee` now has three visually checked
  `technical_flow` renders. The latest added render is the `SUJET_1` GMMA state
  diagram on exam page 3 (`revision_asset_71c4834a-08e5-4b61-9111-499090cad9d8`);
  its source crop remains attached as fallback/provenance. Keep the surrounding
  circuits, dense technology-choice sheets, and manufacturer documents
  image-backed unless split and checked separately.
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
- The `2017 makeup` source bundle exists in the DB
  (`bac-technology-electrical-mt-elec-2017-makeup`) with 15 exam pages and 16
  correction pages, but there is no local reviewed/raw artifact and no ingestion
  job yet. A readiness report and contact sheets are under
  `output/technology-native-render-audit/missing-2017-makeup/`. Do a visual
  extraction/normalization pass before creating the job; do not create an empty
  placeholder job.
- When the user authorizes Codex to do the crop pass, prefer conservative
  source-page content crops for this subject's dense diagrams and mixed answer
  sheets instead of guessing tight per-diagram boxes. Trim outer blank margins
  from stored page PNGs, keep padding, and preserve native-rendered table crops.
  This removes placeholder debt while keeping labels, legends, axes, panel
  markers, and multi-panel sheet context intact.
- Published electrical papers are frozen. Add new native technical renders
  through published revision drafts; do not mutate live published rows directly.
