# Economics And Management Ingestion Playbook

Subject code: `ECONOMICS_MANAGEMENT`

Use this alongside `.agents/skills/bac-ingestion/SKILL.md`,
`docs/agent-ingestion-playbook.md`, and
`docs/ingestion-structure-normalization.md`.

These notes come from an initial audit of the existing GE economics/management
drafts. Tighten them after a fully reviewed golden paper.

## Shape

- Modern normal-session papers commonly have two variants with three main roots:
  `الجزء الأول` worth 6 points, `الجزء الثاني` worth 6 points, and
  `الجزء الثالث` worth 8 points.
- Older papers commonly use two roots per variant: a 16-point first part and a
  4-point second part. Do not force the modern 6/6/8 shape onto older papers.
- Root nodes may be modeled as `PART` or as app-facing `EXERCISE` roots labeled
  with the visible part name. Keep the visible hierarchy and avoid duplicated
  headings in blocks.
- Application sections often start with `السند`, `السند 01`, or `الوضعية`,
  followed by `المطلوب`. Preserve those setup blocks because later questions
  depend on them.

## Polish

- Keep economic, banking, management, and enterprise terms source-close. Small
  changes can alter the expected answer.
- Split list-like correction prose into readable lists when the official answer
  already has separate items.
- Use `latex` blocks for calculation-heavy solution lines when that improves
  readability, especially elasticity, exchange-rate, productivity, and index
  calculations.
- Preserve units, percentages, currency markers such as `دج`, time periods, and
  all formula variables exactly.
- Attach barèmes to the most specific scored node and keep multipliers such as
  `0.5 x 4`, fractional marks, and totals.

## Native Rendering

- Demand/supply tables, exchange-rate tables, simple accounting-like tables, and
  correction calculation tables should be native blocks or native assets when
  faithful.
- Graphs and plotted curves can stay image-backed under the current graph
  renderer limitations unless a faithful structured graph representation is
  available.
- If a native table is created from a source table, visually compare headers,
  row labels, units, numeric values, and unknown placeholders such as `؟`.

## Known Risks

- Raw artifacts may use inconsistent subject labels such as
  `الاقتصاد والمناجمنت`, `الاقتصاد والمانجمنت`, `economy_management`, or
  `economics_management`. Normalize to `ECONOMICS_MANAGEMENT`.
- Raw artifacts in this local checkout are mixed: some use the reviewed-extract
  node shape, some use older `exercises` shape, and at least one raw file does
  not parse as JSON. Treat app drafts and canonical source pages as the working
  state, not the local raw folder alone.
- Existing imported drafts may predate the pre-approval checklist metadata.
  Add or refresh checklist notes during the next approval pass.
- Check for duplicated structural labels in block text after import, especially
  older papers where blocks may repeat `الجزء`, `السؤال`, or numeric labels
  already represented by nodes.

## Sweep Notes

- The 2025 GE normal paper was used as the golden paper for this sweep. Its
  native demand/supply and correction tables are a good target for later
  economics/management imports; its graph stays as an accepted image fallback.
- The completed local sweep published GE normal-session papers from 2025 down
  to 2008, plus the 2017 makeup paper, with zero validation errors.
- Remaining warnings in the completed sweep were graph image fallbacks only.
  This is acceptable under the current renderer when the crop is tight and the
  source labels remain readable.
- Older drafts can contain many repeated structural markers inside prompt or
  solution blocks. Strip duplicated `الجزء`, `السؤال`, numeric, or letter
  markers when the node label already renders them.
