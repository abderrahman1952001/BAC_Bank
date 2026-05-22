# Mathematics Ingestion Playbook

## Scope

Use this playbook for Algerian BAC mathematics papers imported through the
canonical reviewed-extract workflow.

## Source Policy

- Treat rendered source pages as authoritative.
- Do not use OCR or PDF text-layer extraction for math papers.
- When no reviewed JSON exists, do direct visual extraction from the stored page
  PNGs, then import the reviewed graph through `import-reviewed-extract`.

## Structure

- Preserve the visible two-topic paper shape when present: `SUJET_1` and
  `SUJET_2`, each with its own exercises.
- Use `EXERCISE -> QUESTION` for standard math exercises.
- Use `PART` nodes only when the source visibly separates a problem into parts
  such as probability part I/II or function study part I/II.
- Put score totals on exercises and the most specific scored question/part when
  the correction makes the split clear.

## Native Rendering

- Render probability trees natively when the branches and probabilities are
  visually clear. Keep blank probabilities blank for incomplete prompt trees.
- Render probability-law tables, sign tables, and variation tables as native
  table rows with inline KaTeX strings in cells.
- Keep hand-drawn graphs, function curves, graphical readings, and construction
  diagrams as cropped source assets unless a faithful checked structured graph
  payload is available.
- For graph image fallbacks, supply crop geometry and keep the validation warning
  as expected review debt rather than converting the asset to a weaker native
  approximation.

## 2025 SE Normal Exemplar

- Reviewed extract:
  `extracted papers/mathematics/reviewed/bac-mathematics-se-2025-normal.reviewed.json`
- Import target: `bac-mathematics-se-2025-normal`
- Result: imported to `IN_REVIEW` with 2 variants, 8 exercises, 35 question
  nodes, 12 assets, 8 native-rendered assets, and 0 placeholder/full-page crops.
- Expected warnings: 4 graph fallback warnings for source-cropped graphs.

## 2025 GE Normal

- Reviewed extract:
  `extracted papers/mathematics/reviewed/bac-mathematics-ge-2025-normal.reviewed.json`
- Import target: `bac-mathematics-ge-2025-normal`
- Result: imported to `IN_REVIEW` with 2 variants, 8 exercises, 33 question
  nodes, 12 assets, 9 native-rendered table assets, and 0 placeholder/full-page
  crops.
- Expected warnings: 3 graph fallback warnings for source-cropped graphs.
- Source note: the stored exam page order is visually shuffled. Subject 1 uses
  source pages 1 and 4; subject 2 uses source pages 3 and 2. Correction pages
  1-5 are math; stored correction pages 6-7 are unrelated stray pages and were
  not used.

## 2025 LP/LE/Arts Normal

- Reviewed extract:
  `extracted papers/mathematics/reviewed/bac-mathematics-lp-le-arts-2025-normal.reviewed.json`
- Import target: `bac-mathematics-lp-le-arts-2025-normal`
- Result: imported to `IN_REVIEW` with 2 variants, 6 exercises, 25 question
  nodes, 4 assets, 2 native-rendered variation tables, and 0 placeholder/full-
  page crops.
- Visual coverage: exam pages 1-3 and correction pages 1-4 checked visually.
- Expected warnings: 2 graph fallback warnings for source-cropped function
  graphs.
- Crop debt: hand-drawn cubic curve/tangent sketches remain source crops;
  variation tables were rebuilt natively with KaTeX-friendly cells.
- Source uncertainty: none beyond graph-as-crop fallback.
- Next paper: `bac-mathematics-m-2025-normal`.

## 2025 M Normal

- Reviewed extract:
  `extracted papers/mathematics/reviewed/bac-mathematics-m-2025-normal.reviewed.json`
- Import target: `bac-mathematics-m-2025-normal`
- Result: imported to `IN_REVIEW` with 2 variants, 8 exercises, 34 question
  nodes, 13 assets, 9 native-rendered assets, and 0 placeholder/full-page
  crops.
- Visual coverage: exam pages 1-5 and correction pages 1-6 checked visually.
- Native assets: probability prompt/solution trees, probability-law table,
  modular residue table, sign table, and variation tables.
- Expected warnings: 4 graph fallback warnings for the hand-drawn prompt and
  solution function graphs.
- Crop debt: function graphs remain source crops; no placeholder crops.
- Source uncertainty: the numeric check around the subject-1 $h$ root is noisy
  in the correction scan, so the official visible interval
  `$-0.7 < \alpha < -0.6$` is preserved with an uncertainty note.
- Next paper: `bac-mathematics-tm-2025-normal`.

## 2025 TM Normal

- Reviewed extract:
  `extracted papers/mathematics/reviewed/bac-mathematics-tm-2025-normal.reviewed.json`
- Import target: `bac-mathematics-tm-2025-normal`
- Result: imported to `IN_REVIEW` with 2 variants, 8 exercises, 33 question
  nodes, 9 assets, 7 native-rendered assets, and 0 placeholder/full-page crops.
- Visual coverage: exam pages 1-4 and correction pages 1-6 checked visually.
- Native assets: probability-law tables, sign tables, and variation tables.
- Expected warnings: 2 graph fallback warnings for source-cropped function
  graphs.
- Crop debt: hand-drawn function graphs remain source crops; no placeholder
  crops.
- Source uncertainty: none beyond graph-as-crop fallback.
- Next paper: `bac-mathematics-ge-2024-normal`.

## 2024 GE Normal

- Reviewed extract:
  `extracted papers/mathematics/reviewed/bac-mathematics-ge-2024-normal.reviewed.json`
- Import target: `bac-mathematics-ge-2024-normal`
- Result: imported to `IN_REVIEW` with 2 variants, 8 exercises, 36 question
  nodes, 7 assets, 4 native-rendered table assets, and 0 placeholder/full-page
  crops.
- Visual coverage: exam pages 1-4 and correction pages 1-4 checked visually.
- Native assets: sign tables for `$f$` and `$P(X)$`, plus variation tables for
  both function-study exercises.
- Expected warnings: 3 graph fallback warnings for the hand-drawn prompt and
  correction function graphs.
- Crop debt: function graphs remain source crops; no placeholder crops.
- Source uncertainty: none beyond graph-as-crop fallback.
- Next paper: `bac-mathematics-lp-le-arts-2024-normal`.

## 2024 LP/LE/Arts Normal

- Reviewed extract:
  `extracted papers/mathematics/reviewed/bac-mathematics-lp-le-arts-2024-normal.reviewed.json`
- Import target: `bac-mathematics-lp-le-arts-2024-normal`
- Result: imported to `IN_REVIEW` with 2 variants, 6 exercises, 27 question
  nodes, 6 assets, 3 native-rendered table assets, and 0 placeholder/full-page
  crops.
- Visual coverage: exam pages 1-4 and correction pages 1-4 checked visually.
- Native assets: subject-1 cubic variation table, subject-2 sign table for
  `$g$`, and subject-2 cubic variation table.
- Expected warnings: 3 graph fallback warnings for the hand-drawn prompt and
  correction function graphs.
- Crop debt: hand-drawn graphs remain source crops; no placeholder crops.
- Source uncertainty: none beyond graph-as-crop fallback.
- Next paper: `bac-mathematics-m-2024-normal`.
