# SVT Ingestion Playbook

## Scope

Use this playbook for `NATURAL_SCIENCES` / SVT BAC paper sweeps.
It supplements the BAC ingestion skill and the canonical ingestion workflow.

## Calibration

- Calibration paper: `bac-natural-sciences-se-2019-normal`
- Job calibrated: `6e8bed4d-6640-4a4b-84ec-e67107c847f2`
- Existing 2008-2019 local drafts use the legacy `variants[].exercises[]`
  shape, but imported DB drafts are already normalized into app draft nodes.

## Asset Policy

- Treat old asset ids containing `table`, `tab`, or similar text as candidates
  only. Visually inspect the crop before changing the block type.
- Render simple rectangular data tables natively when all cells are readable and
  the table can be represented faithfully with `data.rows`.
- Keep source crop provenance/fallback on native tables by preserving
  `assetId`, crop geometry, and a `nativeSuggestion`.
- Keep biological diagrams, geological cross-sections, experimental apparatus,
  microscope/document imagery, plotted graphs, and immune-response flowcharts as
  image crops unless a reviewed native renderer exists for that exact visual
  class.
- Graphs in SVT papers usually remain image crops under the current graph
  policy because axis scale, plotted shape, and handwritten/source styling are
  part of the evidence.

## Structure And Polish

- Normal papers usually contain two variants: `SUJET_1` and `SUJET_2`.
- SE variants commonly have three exercises per sujet; M variants commonly have
  two exercises per sujet.
- Exercise introductions often contain shared scientific setup and documents;
  keep that setup on the exercise or part, then attach the specific prompt to
  the question node.
- Roman section markers inside exercises should become `PART` nodes when they
  organize multiple questions or a shared document set.
- Prompt text remains source-close. Polish correction blocks for readability
  only when the official reasoning, values, labels, and barème stay faithful.

## Published Papers

- Published SVT papers must be polished through published revision jobs, not by
  editing frozen published ingestion jobs directly.
- Reuse or create the canonical published-revision draft for the current paper,
  then run the same source/crop/native/presentation review before approval and
  revision publication.

