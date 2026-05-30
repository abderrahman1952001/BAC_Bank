# Technology Process Ingestion Playbook

Subject code: `TECHNOLOGY_PROCESS`

Use this alongside `.agents/skills/bac-ingestion/SKILL.md`,
`docs/agent-ingestion-playbook.md`, and
`docs/ingestion-structure-normalization.md`.

## Shape

- Technology process papers are `EXERCISE`-rooted, usually with two variants
  (`SUJET_1`, `SUJET_2`) and three or four visible exercises per variant.
- Modern papers often nest named parts inside exercises. Preserve
  `EXERCISE -> PART -> QUESTION -> SUBQUESTION` when visible, but do not create
  artificial parts for every small transition sentence.
- Normalize Roman part markers such as `I`, `II`, `III` to Arabic labels
  (`الجزء الأول`, `الجزء الثاني`, `الجزء الثالث`).
- Remove score text from exercise labels when `maxPoints` stores the score.
- Avoid coarse `نص الامتحان` / `التصحيح الرسمي` child parts as final structure.
  They are acceptable only as temporary review debt on an old extract that needs
  deeper re-splitting.

## Chemistry And Formula Rendering

- KaTeX `mhchem` is enabled in the web renderer. Use `\ce{...}` for clear typed
  chemical formulas, reaction equations, reversible reactions, ionic equations,
  and units with `\pu{...}` when it improves readability.
- RDKit-backed native molecule rendering is available for visually checked
  standalone structures stored on image blocks as `kind:
"chemistry_structure"` with `chemistryStructure.source` as SMILES or molblock.
  Multi-molecule source panels can use `chemistryStructure.items[]`, with one
  SMILES/molblock per visibly labeled molecule. Keep the source crop attached
  as provenance/fallback.
- Keep calculation-heavy thermodynamics, kinetics, yield, mass, and
  concentration derivations as normal math LaTeX unless `\ce{...}` is clearly
  the better semantic wrapper for a reaction line.
- Do not use `\ce{...}` to replace a drawn structural formula when spatial
  layout, bonds, rings, stereochemistry, or polymer/peptide geometry matters
  unless the RDKit render has been compared visually against the scan.

## Native Rendering

- Render ordinary data tables, correction tables, and small fully legible
  structured tables natively when source-faithful.
- Keep crops as provenance/fallback for native tables when useful.
- Graphs, chromatograms, Hess cycles, electrophoresis strips, apparatus
  diagrams, reaction schemes with arrows/placeholders, Fischer projections, and
  polymer fragments remain image assets unless a dedicated renderer has been
  reviewed for that exact layout.
- Standalone molecule drawings and simple peptide-chain structures may be
  rendered natively with RDKit after visual checking. For amino-acid panels,
  preserve each visible abbreviation in the item title and compare the side
  chain connectivity against the scan before clearing crop debt. Use
  `reviewStatus: "visual_checked"` only when connectivity and visible labels
  match the source; otherwise leave `reviewStatus: "candidate"` and keep the
  crop debt.

## Crop Policy

- This subject has real non-native visual debt. Full-page placeholder crops are
  not publish-ready and must stay in review until a human or dedicated crop pass
  refines them.
- For drawn chemistry structures, crop the smallest complete source visual,
  including labels, arrows, reagents, captions, and table headers needed for
  meaning.
- If a single visible document frame contains multiple related subfigures,
  prefer one complete crop over duplicated partial crops unless the source
  layout requires separate placement.

## Known Risks

- Older Gemini imports may have valid text but weak structure, especially
  exercise children named `نص الامتحان` and `التصحيح الرسمي`.
- Some extracts preserve full-page placeholder crops for every visual. Treat
  those as explicit crop review debt, not as approved assets.
- Raw extracts may use source labels such as `I-`, `1)`, or empty labels; normalize
  structural labels while preserving the source order.
- Be careful with official correction rows: many solution blocks combine
  drawn chemistry, short rubrics, and calculations on the same correction page.
  Do not remove image fallbacks unless the native representation is visually
  source-faithful.

## Current Sweep Notes

- Published Process papers must be changed through published revision drafts,
  not by editing the frozen published job directly.
- Live audit `audit-20260527T-final-preview-checked.json` shows the
  effective Process set as 19 jobs: 16 `PUBLISHED` and three active
  published-revision `DRAFT` jobs: 2022 normal
  (`7b95e93c-5ac8-4a15-881e-11388f8708d1`), 2016 normal
  (`9fb635a4-2954-4b20-9be5-e35b9a04a14c`), and 2010 normal
  (`6bd72d1e-62ce-4118-b917-f4058458c38e`). Several revision jobs noted below
  were reviewed while they were drafts but are now published in the live DB;
  future substantive changes to those years must open new revision drafts.
- The 2025 normal paper's latest effective job is published revision
  `577fd5de-7a7a-46cb-95a2-255858ebad15`. Its source page and revision-crop
  contact sheets were visually checked. All 48 preserved image blocks in the
  revision were marked intentionally image-backed because they are reaction
  schemes, mixed official correction rows, multi-structure amino/peptide
  panels, thermodynamic diagrams, or calculation regions whose exact source
  layout is not represented faithfully by the current RDKit molecule renderer.
  Future substantive changes require a new revision draft.
- The 2024 normal paper's latest effective job is published revision
  `c7090a79-d185-436b-97d7-f59a5c17d172`. Its three thermodynamics/bond-energy
  source tables were visually checked against the stored page images, corrected
  to source comma decimals, deduplicated to one native table block each, and
  given tight table fallback crops.
- The 2023 normal paper's latest effective job is published revision
  `d4d13c05-6051-4d14-b0e5-b830cae67215`. Five clear source tables were visually
  checked against stored exam pages 3, 4, 7, and 8, corrected to source comma
  decimals, deduplicated to one native table block each, and given tight table
  fallback crops. On 2026-05-26 the three visually checked
  `chemistry_structure` fallback/provenance crops for the `Arg-Gly-Glu` pH 1
  prompt structure, the pH 13 correction structure, and the `Glu, Gly, Arg`
  amino-acid panel were tightened from full-page crops to source visuals only.
  Keep Hess-cycle/reaction-scheme diagrams on those pages image-backed unless a
  dedicated faithful renderer is added.
- The 2022 normal paper has active published-revision draft
  `7b95e93c-5ac8-4a15-881e-11388f8708d1`. On 2026-05-27 four full-page table
  fallback crops were checked against stored exam pages 3, 4, 6, and 7 and
  tightened. The compact heat-capacity table and state table were marked
  `reviewStatus: "visual_checked"` after comparing every visible heading,
  value, comma decimal, and dotted blank with the scan. The two amino-acid
  structure tables were converted from flattened native table rows to
  intentionally image-backed source visuals because the current table renderer
  cannot reproduce the drawn side-chain geometry faithfully. Backups are stored
  at
  `output/technology-native-render-audit/db-patches/20260527T-process-2022-table-crops-before.json`
  and
  `output/technology-native-render-audit/db-patches/20260527T-process-2022-table-crops-after.json`.
- The 2020 normal paper's latest effective job is published revision
  `bf420154-dedc-4355-b54d-cacf025b3ede`. Six clear kinetics/calibration and
  composition tables were visually checked against stored exam/correction page
  images, deduplicated to one native table block each, and given tight fallback
  crops. On 2026-05-26 the two visually checked peptide
  `chemistry_structure` fallback/provenance crops were tightened from full-page
  crops to the source peptide visuals only: `Gln-Arg-Phe-Ser-Lys` on exam page
  3 and `Ile-Ala-Cys` on exam page 6. Nearby reaction schemes, graphs, and
  drawn structures remain image-backed.
- The 2019 normal paper's latest effective job is published revision
  `6dfe8079-e38e-41eb-9f18-5f471c3b7f95`. Its existing visually checked native
  amino-acid panels (`Ala, Tyr, Asp` and `Asn, Glu, Ser`) were preserved, and
  their source fallback crops were tightened. The other 33 revision image
  blocks were visually checked against the page/crop contact sheets and marked
  intentionally image-backed because they are reaction schemes, mixed official
  correction calculation regions, multi-structure correction panels,
  thermodynamic diagrams, polymer/peptide panels with source-specific layout,
  or official correction visuals outside the current RDKit renderer's faithful
  scope. Future substantive changes require a new revision draft.
- The 2018 normal paper's latest effective job is published revision
  `eb8c4009-3eb3-4087-ae61-d7588d363237`. Its inherited native
  `Lys-Ala-Cys-Phe tetrapeptide` chemistry block and four native table blocks
  were preserved, and their fallback/provenance crops were tightened. The other
  18 revision image blocks were visually checked against the page/crop contact
  sheets and marked intentionally image-backed because they are reaction
  schemes, mixed official correction rows, multi-structure correction panels,
  thermodynamic diagrams, polymer/peptide panels with source-specific layout,
  or official correction visuals outside the current renderer's faithful scope.
  Future substantive changes require a new revision draft.
- The 2017 normal paper's latest effective job is published revision
  `bcf37ce7-1941-4b6d-8e1f-643bf99cfcef`. Four native table blocks were
  visually checked against stored exam pages 2, 3, and 6, marked
  `reviewStatus: "visual_checked"`, and given focused fallback/provenance
  crops. The existing visually checked RDKit blocks for `Glu-Cys-Ala` and the
  Glu/Phe/Arg side-chain panel were preserved with focused source crops. The
  remaining 16 image blocks were visually checked against source page/crop
  contact sheets and marked intentionally image-backed because they are mixed
  correction pages, reaction-scheme/calculation regions, graph visuals, or
  source-specific chemistry panels outside the current renderer's faithful
  scope.
- The 2017 makeup paper's latest effective job is published revision
  `3eb0f6dd-9e6b-40ee-8b92-e12750be41fa`. Four native table blocks were
  visually checked against stored exam/correction pages 2, 4, 6, and correction
  page 2, marked `reviewStatus: "visual_checked"`, and given focused
  fallback/provenance crops. The remaining 17 image blocks were visually checked
  against source page/crop contact sheets and marked intentionally image-backed
  because they are reaction schemes, full or mixed correction pages, graph
  visuals, or official calculation regions outside the current renderer's
  faithful scope. One asset-free neon-state table remains native rows without a
  crop fallback because no source asset is attached in the old draft.
- The 2016 normal paper has active published-revision draft
  `9fb635a4-2954-4b20-9be5-e35b9a04a14c`. On 2026-05-27 three full-page table
  fallback crops were visually checked against stored exam pages 3, 4, and 7,
  tightened to source tables only, and kept as `reviewStatus:
  "visual_checked"` native tables: the bond-dissociation table, the H2O2
  kinetics table, and the propane-combustion heat-capacity table. Backups are
  stored at
  `output/technology-native-render-audit/db-patches/20260527T-process-2016-table-crops-before.json`
  and
  `output/technology-native-render-audit/db-patches/20260527T-process-2016-table-crops-after.json`.
- The 2014 normal paper's latest effective job is published revision
  `66f567eb-edf2-4ba3-bfd5-960c1aad8664`. Ten source tables were visually
  checked against stored exam/correction page images and normalized to native
  rows with table fallback crops: bond-energy tables, heat-capacity tables,
  pKa tables, amino-acid structure panels, the amino-acid classification table,
  and the pHi calculation table. These tables use `direction: "ltr"` metadata
  because the source scans lay the table columns out left-to-right even inside
  Arabic text flow.
- The 2012 normal paper's latest effective job is published revision
  `80873792-f023-4133-93d2-a2098f8770e6`. The prior 2012 revision draft
  `8654ab27-f2ce-420c-a70b-c11726971cac` was published in the live DB on
  2026-05-26 while the crop pass was in progress, so a new draft was opened
  before making changes. The live DB later shows the new 2012 revision published
  at `2026-05-27T16:32:18.104Z`. On 2026-05-27 seven visually checked native
  table/`chemistry_structure` fallback crops were tightened from full-page
  crops to source visuals only, and one duplicate candidate amino-radical table
  block/asset was removed. The patched draft validated with 0 errors, warnings,
  and issues, and the effective audit shows no remaining 2012 crop debt.
  Backups are stored at
  `output/technology-native-render-audit/db-patches/20260527T-process-2012-crop-tighten-before.json`
  and
  `output/technology-native-render-audit/db-patches/20260527T-process-2012-crop-tighten-after.json`.
- The 2011 normal paper's latest effective job is published revision
  `77770921-2260-41ab-b985-d7c82d5d5c6e`. Two source tables were visually
  checked and normalized to native rows with fallback crops: the amino-acid
  structure panel on exam page 2 and the materials/tools table on exam page 3.
  The duplicate empty materials/tools table block was removed from the revision
  draft. On 2026-05-26 the preserved fallback/provenance crop for the
  visually checked amino-acid `chemistry_structure` panel was tightened from a
  full-page crop to the source table only (`x=188, y=338, width=1455,
  height=830`), reducing effective Process crop debt by one without changing
  the native structure data.
- The 2010 normal paper has active published-revision draft
  `6bd72d1e-62ce-4118-b917-f4058458c38e`. On 2026-05-27 two duplicate native
  table blocks/assets were removed from the draft, and six retained
  fallback/provenance crops were tightened after visual comparison with stored
  source pages: the `SUJET_1` heat-capacity table, the Met/Gly/Phe/Ala/Leu
  amino-acid panel, the Met-Leu prompt dipeptide, the Phe-Gly-Leu correction
  structure, the Met/Leu correction structures, and the `SUJET_2` amino-acid
  table. Backups are stored at
  `output/technology-native-render-audit/db-patches/20260527T-process-2010-crop-tighten-before.json`
  and
  `output/technology-native-render-audit/db-patches/20260527T-process-2010-crop-tighten-after.json`.
- The 2009 normal paper's latest effective job is published revision
  `794247a1-1155-424c-a4f2-a525b01f8264`. Two thermodynamics source tables on
  exam page 3 were visually checked, marked `reviewStatus: "visual_checked"`,
  and given focused fallback/provenance crops. The remaining nine image blocks
  were visually checked against source page/crop contact sheets and marked
  intentionally image-backed because they are amino-acid/peptide diagrams,
  correction sheets with marks columns, electrophoresis sketches, reaction or
  enthalpy schemes, or mixed official calculation visuals outside the current
  renderer's faithful scope.
- The 2008 normal paper's latest effective job is published revision
  `705a3be5-69da-4a70-8c7f-d36eda995e16`. Its former `SUJET_2`
  polystyrene/polymer-fragment candidate (`asset_s2_e1_q1_b_sol`) was visually
  checked against correction page 4, kept image-backed because the
  source-specific polymer fragment is outside the current standalone RDKit
  renderer scope, and given a focused fallback/provenance crop.
- The 2015 normal paper's latest effective job is published revision
  `47ad39b4-46a0-4cee-8fd7-29e9cbf9a11d`. Six real source tables were visually
  checked and normalized to native rows with fallback crops: the correction
  amino-acid structure panel, prompt amino-radical table, Glu/Arg pKa table,
  heat-capacity table, correction pKa/pHi table, and prompt amino-acid
  pKa/structure table. The remaining 55 2015 `RUBRIC` table blocks were point
  split prose, not source tables, and were retyped as rubric paragraphs while
  preserving their values.
- The 2021 normal paper's latest effective job is published revision
  `f1deaf40-78bf-447b-8a9f-ccdbd35b175e`. Its 28 remaining table-debt blocks
  were extracted point-split snippets on `RUBRIC` blocks, not standalone source
  tables, so they were retyped as rubric paragraphs after checking the
  correction contact sheet. Do not recreate fake native rows for these snippets;
  the dense correction/marks-column pages remain image-backed where represented
  as visuals.
- The technology native-rendering audit now reports both raw job totals and
  `effectiveSummaries`, where active published revision drafts or the latest
  published revision replace their frozen origin paper for progress accounting.
- After the 2025, 2019, 2018, 2017, 2009, and 2008 revisions were opened and
  reviewed, the effective audit reports `0` Process native-render candidates.
  After the 2011, 2020, 2023, 2012, 2022, 2016, and 2010 fallback crop
  tightening passes, effective Process crop debt is 0, effective table-block
  debt is 0, and effective native-renderer debt is 0. Keep reaction schemes,
  apparatus, chromatograms, Hess cycles, electrophoresis, polymers, and mixed
  correction pages image-backed unless a faithful dedicated renderer exists.
