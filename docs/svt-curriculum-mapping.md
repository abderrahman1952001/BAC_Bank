# SVT Curriculum Mapping

Last updated: 2026-05-21.

## Stream Curriculum Spine

The app keeps separate active SVT curricula:

- `SE__2008__OPEN` for `SE`
- `M__2008__OPEN` for `M`

`SE__2008__OPEN` uses the full current SVT tree:

- `PROTEINS`
  - `PROTEIN_SYNTHESIS`
  - `STRUCTURE_FUNCTION`
  - `ENZYMES`
  - `IMMUNITY`
  - `NERVOUS_COMMUNICATION`
- `ENERGY_TRANSFORMATIONS`
  - `PHOTOSYNTHESIS`
  - `RESPIRATION_FERMENTATION`
  - `ENERGY_BALANCE`
- `PLATE_TECTONICS`
  - `EARTH_STRUCTURE`
  - `PLATE_ACTIVITY`
  - `TECTONIC_INTERPRETATION`

`M__2008__OPEN` is intentionally a strict slice of the SE protein field plus
the older M environment-management field seen in historical papers:

- `PROTEINS`
  - `PROTEIN_SYNTHESIS`
  - `STRUCTURE_FUNCTION`
  - `IMMUNITY`
- `HUMAN_AND_PLANET_MANAGEMENT`
  - `AIR_POLLUTION`
  - `WATER_POLLUTION`

Do not map M papers to SE-only energy, tectonics, enzyme, or
nervous-communication nodes. If a future M paper genuinely trains a unit outside
this slice, report it as an out-of-scope mapping candidate before changing the
app curriculum.

## Mapping Storage

Paper-node mappings live in `exam_node_curriculum_nodes`. The bridge stores:

- `source`: `AUTO_RULE`, `AI_CANDIDATE`, or `MANUAL_REVIEW`
- `confidence`
- `is_primary`
- `reviewed_at`

Automatic mapping rows should stay replaceable. Human-reviewed mappings should
be protected by future mappers.

## Current Mapping Approach

Use the existing published exam-node graph as the mapping source. Do not create
a second ingestion path.

For SVT:

1. Collect the already-published exercise-root prompt and stem text.
2. Run deterministic SVT rules to infer candidate curriculum units.
3. For `SE`, keep all SE curriculum-unit candidates.
4. For `M`, filter candidates to the confirmed M curriculum slice and report any
   inferred SE-only units.
5. Insert rows only through the canonical bridge table, with `source=AUTO_RULE`.
6. Prefer conservative mappings. Missing or reported candidates are better than
   noisy topic drills.

Dry-run commands:

```bash
cd apps/api
npm run map:svt-se-paper-nodes -- --stream SE --replace
npm run map:svt-se-paper-nodes -- --stream M --replace
```

Apply commands, after reviewing dry-run output:

```bash
cd apps/api
npm run map:svt-se-paper-nodes -- --stream SE --apply --replace
npm run map:svt-se-paper-nodes -- --stream M --apply --replace
```

## Applied Snapshot

Applied on 2026-05-21 against the local published DB.

| Stream | Curriculum | Exercise roots | Mapping rows | Primary rows |
| ------ | ---------- | -------------: | -----------: | -----------: |
| `SE` | `SE__2008__OPEN` | 36 | 47 | 36 |
| `M` | `M__2008__OPEN` | 32 | 37 | 32 |

All inserted rows use `source=AUTO_RULE` and `confidence=0.85`. The mapper's
`--replace` mode only replaces unreviewed automatic rows, so later manual
reviews can stay stable across reruns.

SE applied counts:

| Curriculum code | Rows |
| --- | ---: |
| `PROTEIN_SYNTHESIS` | 10 |
| `IMMUNITY` | 10 |
| `ENZYMES` | 8 |
| `NERVOUS_COMMUNICATION` | 8 |
| `STRUCTURE_FUNCTION` | 4 |
| `PHOTOSYNTHESIS` | 3 |
| `RESPIRATION_FERMENTATION` | 2 |
| `ENERGY_BALANCE` | 1 |
| `EARTH_STRUCTURE` | 1 |

M applied counts:

| Curriculum code | Rows |
| --- | ---: |
| `PROTEIN_SYNTHESIS` | 13 |
| `IMMUNITY` | 12 |
| `STRUCTURE_FUNCTION` | 12 |

## M Paper Audit Notes

Published DB rows currently cover M papers from 2018 through 2025. The mapper
run found 32 exercise roots, all with at least one allowed M mapping. It
reported three secondary out-of-scope hits:

- 2018 `SUJET_2`, exercise 2: inferred `ENZYMES` secondarily, but the prompt is
  about genetic information and protein function.
- 2020 `SUJET_2`, exercise 2: inferred `RESPIRATION_FERMENTATION` secondarily,
  but the prompt is about sickle-cell hemoglobin and protein function.
- 2023 `SUJET_2`, exercise 2: inferred `ENZYMES` secondarily, but the prompt is
  about protein synthesis and structure-function.

Local extracted M artifacts from 2008 through 2019 confirmed one reason to keep
the M environment field:

- 2009 `SUJET_1`, exercise 2: ozone/atmosphere pollution. This belongs to the
  `AIR_POLLUTION` unit under `HUMAN_AND_PLANET_MANAGEMENT`.

Other older extracted-paper hits against `ENZYMES` or `NERVOUS_COMMUNICATION`
look like secondary wording inside protein/immunity exercises, not standalone
units.
