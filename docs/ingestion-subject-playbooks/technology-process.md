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
- The 2024 normal paper has an active published revision draft
  `c7090a79-d185-436b-97d7-f59a5c17d172`. Its three thermodynamics/bond-energy
  source tables were visually checked against the stored page images, corrected
  to source comma decimals, deduplicated to one native table block each, and
  given tight table fallback crops. The published 2024 job remains frozen until
  the revision is reviewed and published.
- The 2023 normal paper has an active published revision draft
  `d4d13c05-6051-4d14-b0e5-b830cae67215`. Five clear source tables were visually
  checked against stored exam pages 3, 4, 7, and 8, corrected to source comma
  decimals, deduplicated to one native table block each, and given tight table
  fallback crops. Keep Hess-cycle/reaction-scheme diagrams on those pages
  image-backed unless a dedicated faithful renderer is added.
- The 2020 normal paper has an active published revision draft
  `bf420154-dedc-4355-b54d-cacf025b3ede`. Six clear kinetics/calibration and
  composition tables were visually checked against stored exam/correction page
  images, deduplicated to one native table block each, and given tight fallback
  crops. Nearby reaction schemes, graphs, and drawn structures remain image-backed.
- The 2014 normal paper has an active published revision draft
  `66f567eb-edf2-4ba3-bfd5-960c1aad8664`. Ten source tables were visually
  checked against stored exam/correction page images and normalized to native
  rows with table fallback crops: bond-energy tables, heat-capacity tables,
  pKa tables, amino-acid structure panels, the amino-acid classification table,
  and the pHi calculation table. These tables use `direction: "ltr"` metadata
  because the source scans lay the table columns out left-to-right even inside
  Arabic text flow.
- The 2011 normal paper has an active published revision draft
  `77770921-2260-41ab-b985-d7c82d5d5c6e`. Two source tables were visually
  checked and normalized to native rows with fallback crops: the amino-acid
  structure panel on exam page 2 and the materials/tools table on exam page 3.
  The duplicate empty materials/tools table block was removed from the revision
  draft.
- The 2015 normal paper has an active published revision draft
  `47ad39b4-46a0-4cee-8fd7-29e9cbf9a11d`. Six real source tables were visually
  checked and normalized to native rows with fallback crops: the correction
  amino-acid structure panel, prompt amino-radical table, Glu/Arg pKa table,
  heat-capacity table, correction pKa/pHi table, and prompt amino-acid
  pKa/structure table. The remaining 55 2015 `RUBRIC` table blocks were point
  split prose, not source tables, and were retyped as rubric paragraphs while
  preserving their values.
- The 2021 normal paper has an active published revision draft
  `f1deaf40-78bf-447b-8a9f-ccdbd35b175e`. Its 28 remaining table-debt blocks
  were extracted point-split snippets on `RUBRIC` blocks, not standalone source
  tables, so they were retyped as rubric paragraphs after checking the
  correction contact sheet. Do not recreate fake native rows for these snippets;
  the dense correction/marks-column pages remain image-backed where represented
  as visuals.
- The technology native-rendering audit now reports both raw job totals and
  `effectiveSummaries`, where active published revision drafts replace their
  frozen origin paper for progress accounting.
