# History And Geography Ingestion Playbook

## Exemplar

- First exemplar: `bac-history-geography-se-m-tm-arts-2025-normal`
- Reviewed artifact: `extracted papers/history-geography/reviewed/bac-history-geography-se-m-tm-arts-2025-normal.reviewed.json`
- Source shape: two optional topics, each split into `التاريخ` and `الجغرافيا`, with each subject carrying `الجزء الأول` and `الجزء الثاني`.

## Hierarchy

- Use `SUJET_1` and `SUJET_2` for the two visible optional topics.
- Use top-level `PART` nodes for `التاريخ` and `الجغرافيا`.
- Nest each subject's `الجزء الأول` and `الجزء الثاني` as child `PART` nodes.
- Use `QUESTION` nodes for numbered prompts, table completion/graphing prompts, definition prompts, and article-writing prompts.
- Keep the visible quote or statistical prompt in `PROMPT` blocks on the question node; do not duplicate structural labels inside block text.

## Tables And Visuals

- Render simple date/event tables and statistical tables natively as `table` blocks with `data.rows`.
- Keep manually drawn graphs as image/graph assets from the correction scan unless a faithful graph renderer is available.
- For first-pass graph assets, use complete rough crops that include title, key, axes, plotted lines, and scale notes; leave pixel tightening to crop review.

## Correction Style

- For term definitions, use concise list blocks with one item per official term and keep the official meaning source-close.
- For article questions, preserve the official outline as introduction, required axes, and conclusion.
- Because correction scans can be low contrast, record concrete uncertainty when secondary essay bullets are normalized from a weak visual region.

## Current Risks

- Some correction pages are low contrast, especially dense essay sections. Do not mark a paper as approval-ready until those regions receive a focused final visual check.
- History/geography papers often have no Gemini JSON candidates in this repo; rely on canonical source pages and direct visual extraction, not OCR.
- `bac-history-geography-ge-2022-normal`: the stored correction bundle is labeled as a blind-candidate correction while the exam has standard graph/map tasks. Treat the graph/map solution coverage as unresolved until a standard correction is found or the mismatch is explicitly accepted.
