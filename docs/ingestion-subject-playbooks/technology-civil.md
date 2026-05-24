# Technology Civil Ingestion Playbook

Subject code: `TECHNOLOGY_CIVIL`

Use this alongside `.agents/skills/bac-ingestion/SKILL.md`,
`docs/admin-ingestion-workflow.md`, and
`docs/ingestion-structure-normalization.md`.

## Shape

- Civil technology papers are for `MT_CIVIL` and normally carry two optional
  variants, `SUJET_1` and `SUJET_2`.
- The visible structure is commonly organized around large discipline roots
  such as `الميكانيك المطبقة` and `البناء`, then activity/part nodes such as
  `النشاط الأول` and `النشاط الثاني`, then numbered questions.
- Do not force every root into a generic exercise template. Preserve the
  discipline-root shape when it is visible in the source.
- Keep activity headings that contain a real topic title, such as an activity
  label followed by `الانحناء المستوي البسيط`, because that text is content,
  not just a duplicate structural label.
- Remove exact duplicate heading blocks only when the node label already renders
  the same text and no additional topic or score information is present.

## Visual Assets

- A dedicated `civilDiagram` renderer now exists for simple, visually checked
  civil assets. Use it for isolated beams, supports, point loads, distributed
  loads, dimension lines, compact rectangular/profile sections, and simple
  labeled geometry when every visible mark can be represented explicitly. Keep
  the source crop attached as provenance/fallback and set `reviewStatus:
"visual_checked"` only after comparing against the crop.
- Shear-force and bending-moment graphs, dense correction diagrams, truss
  systems, free-body/node-isolation drawings, reinforcement sketches,
  bridge/profile drawings, plans, complex section drawings, and official
  correction pages remain image-backed unless a dedicated renderer can capture
  that exact visual faithfully.
- Tables can be native when the cells are already transcribed and cheap to
  verify. Keep image-backed provenance for profile tables, reinforcement tables,
  and official correction tables when the crop is still needed for confidence.
- Full-page placeholder crops are not publish-ready. They are acceptable only as
  review handoff debt so the human can quickly tighten each visual in the crop
  UI before approval/publish.

## Current Sweep Notes

- Normal-session files `2008` through `2025` exist locally under
  `extracted papers/techno civil` and have two extracted variants each.
- The `2017 makeup` paper is imported as
  `bac-technology-civil-mt-civil-2017-makeup` and is `IN_REVIEW`. It was built
  from direct visual inspection of canonical page images because Gemini quota
  was unavailable locally. Its four prompt tables are native-rendered and its
  remaining diagrams/correction derivations are image-backed with non-full-page
  crops.
- The `2017 makeup` exam bundle has pages `1-6`, while the visible prompt
  references page `7/7`. The page-7 profile/answer sheet is present in the
  correction bundle and is referenced as prompt provenance for the second topic
  building activity. Keep that source irregularity visible until approval.
- Existing normal-session drafts were already imported from older Gemini
  source extracts. They are usable starting points, but most image assets are
  full-page placeholder crops and should remain in review until crop cleanup.
- Native table-row data has been added to every civil table block currently in
  the DB (`83/83` tables with rows; `0` missing row payloads). The latest
  technology native-rendering audit has `0` Civil native-render candidate
  assets, `28` trusted `civil_diagram` renderers, and `46` intentionally
  image-backed Civil assets. Remaining validation warnings are
  crop-placeholder warnings on older normal-session image assets, not
  table-rendering gaps or native-render review debt.
- The reviewed civil native-render slices currently live in the DB include:
  2017 makeup `SUJET_2` beam/rectangular-section assets, 2020 normal
  `SUJET_1` / `SUJET_2` isolated beam figures, 2013 normal `SUJET_1` /
  `SUJET_2` beam figures, and 2018 normal prompt axial-bar/beam/section
  figures, plus the 2009 normal `SUJET_2` prompt beam figure, the 2010 normal
  `SUJET_2` prompt truss, the 2021 normal `SUJET_1` prompt truss, and the 2020
  normal correction beam-reaction sketch. These are `visual_checked` native
  `civil_diagram` blocks with source crops preserved.
- Keep 2018 correction shear/moment/free-body pages, 2017 normal correction
  shear/moment pages, truss-heavy/node-isolation assets, reinforcement-section
  correction crops, the 2021 correction force-diagram sheet, and the 2008
  building/stair section image-backed unless they get a separate,
  element-by-element visual renderer pass.
- The 2013 normal `SUJET_1` and `SUJET_2` correction beam/shear/moment graph
  clusters (`s1_beam_diagram`, `s2_beam_diagram`) were visually checked,
  tightened from full-page placeholders to graph-cluster crops, and marked
  intentionally image-backed. They are not simple `civil_diagram` targets under
  the current renderer contract.
- The 2017 makeup `SUJET_1` activity-one loaded beam
  (`s1_a1_beam_diagram`) was visually checked against exam page 1, tightened to
  crop `{x:170,y:1060,width:1250,height:480}`, and converted to a
  `visual_checked` native `civil_diagram` with the crop preserved as fallback.
- The same job's activity-two truss prompt crops (`s1_a2_truss_diagram`,
  `s2_a2_truss_diagram`) were visually checked against exam pages 2 and 5,
  tightened to crop `{x:190,y:450,width:1080,height:610}` and
  `{x:180,y:590,width:1200,height:570}`, and converted to `visual_checked`
  native `civil_diagram` payloads with all members, loads, supports, dimensions,
  and alpha/beta markers represented explicitly.
- The 2015 normal `SUJET_1` profile/cross-section assets were visually checked
  and kept image-backed because the source combines profile geometry, completion
  tables, correction-photo overlays, and handwritten/marked values. Three
  placeholder crops were tightened instead:
  `corr_t1_p2_cut`, `exam_t1_cross_sec`, and `corr_t1_p3_cross_sec`.
- The final Civil candidate sweep visually checked all remaining audit
  candidates in 2021, 2020, 2018, 2017 normal, 2009, and 2008. One clean 2020
  correction beam-reaction sketch was converted to `civil_diagram`; the
  remaining 19 assets were tightened and marked intentionally image-backed
  because they are correction sheets, shear/moment graph regions,
  node-isolation regions, reinforcement sections, or building/plan context.
- No Civil audit-native candidate assets remain. Future Civil work should
  focus on ordinary crop cleanup/review for the older placeholder assets, not
  additional native rendering unless a new dedicated renderer is added for
  graphs, reinforcement, node-isolation sheets, or plans.
