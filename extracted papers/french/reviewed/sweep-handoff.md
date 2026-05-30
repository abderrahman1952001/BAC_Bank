# French Ingestion Sweep Handoff

## Published In This Sweep

### bac-french-le-2025-normal

- Source bundle: confirmed in DB with EXAM PDF, CORRECTION PDF, 4 exam source pages, and 2 correction source pages.
- Reviewed file: `extracted papers/french/reviewed/bac-french-le-2025-normal.reviewed.json`
- Extraction route: direct Codex visual extraction from canonical rendered page images; no OCR or PDF text-layer extraction.
- Visual coverage: exam pages 1-4 and correction pages 1-2 checked; `SUJET_1` and `SUJET_2` transcribed as native text/rubric blocks; no assets.
- Import result: `jobId=3b0f23d0-2671-43d2-b89b-dae4715d8228`, final import status `IN_REVIEW`, validation errors `0`, warnings `0`, variants `2`, questions `20`, assets `0`, uncertainties `0`.
- Shape check: each sujet has 1 `CONTEXT`, 2 `PART` nodes, 10 `QUESTION` nodes, and exactly 1 production question labelled `un sujet au choix`.
- Preview confidence: DB structure and native text shape checked; no crop/asset debt.
- Publish result: final status `PUBLISHED`, published paper `8238bfca-c069-435f-ac98-e8d54730948e`, stream offering `LE`.
- Remaining uncertainty: none recorded.

## 2026-05-25 Continuation

- Live DB preflight: `57` French source bundles; every bundle had EXAM and CORRECTION source pages.
- Visual route used: direct Gemini visual extraction from canonical rendered page images under `output/r2-bac-assets`; no OCR or PDF text-layer extraction.
- Import route used: `npm run import:reviewed-extract -w @bac-bank/api -- --paper-source-slug <slug> --file ../../extracted papers/french/reviewed/<slug>.reviewed.json --status in-review`.
- Publish route used: `npx ts-node --transpile-only apps/api/scripts/approve-publish-ingestion-jobs.ts --paper-source-slug <slug>`.
- Validation/preview confidence: every published source in this continuation passed reviewed-extract import with `0` validation errors and `0` warnings after structural gates; French papers were native text/rubric/table only with `0` assets and no crop debt. Preview confidence is DB/student-viewer shape confidence, not a human browser side-by-side pass.

Published in this continuation with reviewed files under `extracted papers/french/reviewed/`:

- 2025: `bac-french-lp-2025-normal`, `bac-french-se-m-tm-ge-arts-2025-normal`
- 2024: `bac-french-le-2024-normal`, `bac-french-lp-2024-normal`, `bac-french-se-m-tm-ge-arts-2024-normal`
- 2023: `bac-french-le-2023-normal`, `bac-french-lp-2023-normal`, `bac-french-se-m-tm-ge-2023-normal`
- 2022: `bac-french-le-2022-normal`, `bac-french-lp-2022-normal`, `bac-french-se-m-tm-ge-2022-normal`
- 2021: `bac-french-le-2021-normal`, `bac-french-lp-2021-normal`, `bac-french-se-m-tm-ge-2021-normal`
- 2020: `bac-french-le-2020-normal`, `bac-french-lp-2020-normal`, `bac-french-se-m-tm-ge-2020-normal`
- 2019: `bac-french-le-2019-normal`, `bac-french-lp-2019-normal`, `bac-french-se-m-tm-ge-2019-normal`
- 2018: `bac-french-le-2018-normal`, `bac-french-lp-2018-normal`, `bac-french-se-m-tm-ge-2018-normal`
- 2017 normal: `bac-french-le-2017-normal`, `bac-french-lp-2017-normal`
- 2017 makeup: `bac-french-le-2017-makeup`, `bac-french-lp-2017-makeup`
- 2016: `bac-french-le-2016-normal`, `bac-french-lp-2016-normal`, `bac-french-se-m-tm-ge-2016-normal`
- 2015: `bac-french-se-m-tm-ge-2015-normal`
- 2014: `bac-french-lp-2014-normal`, `bac-french-se-m-tm-ge-2014-normal`
- 2013: `bac-french-le-2013-normal`, `bac-french-lp-2013-normal`, `bac-french-se-m-tm-ge-2013-normal`
- 2012: `bac-french-le-2012-normal`, `bac-french-lp-2012-normal`, `bac-french-se-m-tm-ge-2012-normal`

## 2026-05-28 Final Closure

The previous five blocked sources were finished by manual direct visual extraction
from the canonical rendered source pages. No OCR, PDF text-layer extraction, or
Gemini JSON was used for the manual completions.

| Source | Source bundle | Reviewed file | Import / validation | Publish result | Preview confidence | Remaining uncertainty |
| --- | --- | --- | --- | --- | --- | --- |
| `bac-french-se-m-tm-ge-2017-normal` | EXAM PDF, CORRECTION PDF, 4 exam pages, 3 correction pages | `extracted papers/french/reviewed/bac-french-se-m-tm-ge-2017-normal.reviewed.json` | `jobId=2d0c1595-cf99-4523-aaeb-2d4adc634c9f`; variants `2`, questions `18`, assets `0`, uncertainties `0`, validation errors `0`, warnings `0` | `PUBLISHED`; paper `bd40516b-f8f3-42aa-b37e-941ab03320e5` | Native text/rubric hierarchy checked structurally; no crop/asset debt | none |
| `bac-french-se-m-tm-ge-2017-makeup` | EXAM PDF, CORRECTION PDF, 4 exam pages, 3 correction pages | `extracted papers/french/reviewed/bac-french-se-m-tm-ge-2017-makeup.reviewed.json` | `jobId=d4da7a21-b867-44dc-9921-23fe59eb394b`; variants `2`, questions `18`, assets `0`, uncertainties `0`, validation errors `0`, warnings `0` | `PUBLISHED`; paper `58d35540-94a9-4882-bbbd-e3047e220741` | Native text/rubric hierarchy checked structurally; no crop/asset debt | none |
| `bac-french-lp-2015-normal` | EXAM PDF, CORRECTION PDF, 4 exam pages, 3 correction pages | `extracted papers/french/reviewed/bac-french-lp-2015-normal.reviewed.json` | `jobId=fb75bc5e-4fea-4b3c-baba-0095eedac619`; variants `2`, questions `21`, assets `0`, uncertainties `0`, validation errors `0`, warnings `0` | `PUBLISHED`; paper `0d970ab7-6c6d-462f-a152-223958be06d6` | Native text/rubric hierarchy checked structurally; no crop/asset debt | none |
| `bac-french-le-2015-normal` | EXAM PDF, CORRECTION PDF, 4 exam pages, 3 correction pages | `extracted papers/french/reviewed/bac-french-le-2015-normal.reviewed.json` | `jobId=d7cba530-2961-48c0-a69c-b11c8914a26e`; variants `2`, questions `22`, assets `0`, uncertainties `0`, validation errors `0`, warnings `0` | `PUBLISHED`; paper `7363ca78-2e9b-4723-9889-bf91f8f29507` | Native text/rubric hierarchy checked structurally; no crop/asset debt | none |
| `bac-french-le-2014-normal` | EXAM PDF, CORRECTION PDF, 4 exam pages, 2 correction pages | `extracted papers/french/reviewed/bac-french-le-2014-normal.reviewed.json` | `jobId=ba9f1f21-7b8d-44ad-8c45-8479409971e7`; variants `2`, questions `22`, assets `0`, uncertainties `0`, validation errors `0`, warnings `0` | `PUBLISHED`; paper `ce0b9fa7-ed28-480b-b0d2-9d917c5f96c6` | `SUJET_2` exam pages 3-4 and correction pages 1-2 visually checked in this closure pass; native text/rubric hierarchy checked structurally; no crop/asset debt | none |

Final live DB audit:

- French paper sources: `57`
- Published French paper sources: `57`
- Remaining unpublished French paper sources: `0`
- Source bundle gaps: `0`
- Published-paper/variant gaps: `0`
- Live published draft validation errors: `0`
- Live published draft validation warnings: `0`
