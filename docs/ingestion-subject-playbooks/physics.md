# Physics Ingestion Playbook

Use with `.agents/skills/bac-ingestion/SKILL.md` and the canonical workflow.
This playbook records physics-specific lessons from the normal-session sweep
over `bac-physics-{se,m-tm}-{2008..2025}-normal`.

## Structure

- Physics papers may be either exercise-first or part-first. Infer from the
  visible source, not from a universal template.
- Modern part-first shapes should keep real top-level `PART` roots:
  - `M-TM`: `الجزء الأول` usually contains the first three exercises, and
    `الجزء الثاني` contains `التمرين التجريبي`.
  - `SE`: `الجزء الأول` usually contains the first two exercises, and
    `الجزء الثاني` contains `التمرين التجريبي`.
- The 2017 and 2018 normal papers for both `SE` and `M-TM` use real top-level
  parts; preserve them instead of flattening the experimental exercise beside
  the first-part exercises.
- The 2017 makeup papers are also part-first. `M-TM` keeps `الجزء الأول`
  with the first three exercises and `الجزء الثاني` with the experimental
  exercise; `SE` keeps `الجزء الأول` with the first two exercises and
  `الجزء الثاني` with the experimental exercise.
- Some later papers remain exercise-first in the reviewed draft even with
  internal named parts. In particular, do not force the 2023 `SE` normal draft
  into top-level parts; it has exercise roots with internal `PART` children.
- Normalize score-bearing labels by keeping scores in `maxPoints` and labels
  like `التمرين الأول`, `التمرين التجريبي`, `الجزء الأول`, and
  `الجزء الثاني`.

## Assets

- Graphs, plotted curves, circuits, apparatus drawings, photos, and multi-panel
  experimental documents remain image-backed unless a reviewed native renderer
  exists.
- Straight tables should be native when rows are recoverable and visually
  checkable. Keep the source asset as provenance/fallback.
- For 2025 `M-TM`, the two experimental tables were calibrated as native rows:
  `sujet1_exo4_doc3` and `sujet2_exo4_doc3`.
- Existing non-placeholder crop geometry is valuable. Preserve it by asset id,
  document kind, and page number whenever re-importing a reviewed extract.

## Import Caveats

- Several older raw JSON files in `extracted papers/Physics` contain raw control
  characters and cannot be parsed by the reviewed-extract importer. Polish their
  existing drafts in-place unless the user provides repaired JSON.
- Do not blindly re-import `bac-physics-se-2023-normal` from the current raw
  file: that artifact only carries `SUJET_2` and will drop `SUJET_1`.
- Do not blindly re-import `bac-physics-se-2017-normal` without preserving
  existing crops: the raw artifact has useful part hierarchy but the pre-pass
  draft had stronger crop geometry.
- The `bac-physics-m-tm-2017-makeup` Gemini artifact may arrive with both
  optional subjects collapsed into one `SUJET_1`. Split `s1_*` nodes into
  `SUJET_1` and `s2_*` nodes into `SUJET_2` before import or final polish.

## Handoff

- Leave physics jobs in `IN_REVIEW` until the human crop pass and student-side
  preview review are done.
- A validation-clean physics draft may still have major crop debt because most
  graph and diagram assets publish as image fallbacks. Report placeholder crop
  counts explicitly.
