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
  the DB (`83/83` tables with rows; `0` missing row payloads). Remaining
  validation warnings are crop-placeholder warnings on older normal-session
  image assets, not table-rendering gaps.
- The reviewed civil native-render slices currently live in the DB include:
  2017 makeup `SUJET_2` beam/rectangular-section assets, 2020 normal
  `SUJET_1` / `SUJET_2` isolated beam figures, 2013 normal `SUJET_1` /
  `SUJET_2` beam figures, and 2018 normal prompt axial-bar/beam/section
  figures, plus the 2009 normal `SUJET_2` prompt beam figure and the 2010
  normal `SUJET_2` prompt truss, and the 2021 normal `SUJET_1` prompt truss.
  These are `visual_checked` native `civil_diagram` blocks with source crops
  preserved.
- Keep 2020 correction-page beam-reaction sheets, 2018 correction
  shear/moment/free-body pages, 2017 normal correction shear/moment pages, and
  truss-heavy/node-isolation assets image-backed unless they get a separate,
  element-by-element visual renderer pass. The 2009 normal column reinforcement
  correction crop, the 2021 correction force-diagram sheet, and the 2008
  building/stair section should also stay image-backed.
- The 2015 normal `SUJET_1` profile/cross-section assets were visually checked
  and kept image-backed because the source combines profile geometry, completion
  tables, correction-photo overlays, and handwritten/marked values. Three
  placeholder crops were tightened instead:
  `corr_t1_p2_cut`, `exam_t1_cross_sec`, and `corr_t1_p3_cross_sec`.
- Next best civil candidates are the remaining small normal-session prompt
  visuals in 2015 and any remaining 2021 prompt-only figures. Inspect each
  source crop before conversion because several keyword hits are trusses,
  correction sheets, or compact section/graph mixes that should remain
  image-backed.
