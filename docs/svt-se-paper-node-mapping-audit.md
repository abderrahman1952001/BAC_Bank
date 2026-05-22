# SVT SE Paper Node Mapping Audit

Last audited: 2026-05-21.

## Scope

This audit covers the locally published Sciences Naturelles / SE BAC papers from
2020 through 2025. The goal is to make Study Command topic drills use real
curriculum mappings instead of widening topic requests into broad mixed drills.

The mapper is:

```bash
cd apps/api
npm run map:svt-se-paper-nodes -- --stream SE --apply --replace
```

It only updates `exam_node_curriculum_nodes` for published SVT SE exercise-root
nodes inside the canonical `SE__2008__OPEN` curriculum. It does not ingest
papers, alter paper content, or create a parallel ingestion path.

## Audit Principles

- Map the exercise to the BAC unit a student would reasonably be asking for.
- Keep secondary tags only when the exercise genuinely trains that second unit.
- Do not tag a unit just because a term appears in a correction, option, or
  supporting document fragment.
- Use prompt and stem text as the mapping source. Official visual review remains
  the source of truth for future extraction fixes.
- Prefer precise topic drills over high-recall tagging. A missing tag is easier
  to refine than a noisy topic drill that breaks trust.

## Current Result

The current pass maps all 36 published SVT SE exercise roots. It inserts 47
bridge rows because some exercises genuinely carry more than one unit tag; 36
rows are marked primary.

| Curriculum code            | Exercise roots |
| -------------------------- | -------------: |
| `PROTEIN_SYNTHESIS`        |             10 |
| `IMMUNITY`                 |             10 |
| `ENZYMES`                  |              8 |
| `NERVOUS_COMMUNICATION`    |              8 |
| `STRUCTURE_FUNCTION`       |              4 |
| `PHOTOSYNTHESIS`           |              3 |
| `RESPIRATION_FERMENTATION` |              2 |
| `ENERGY_BALANCE`           |              1 |
| `EARTH_STRUCTURE`          |              1 |

## Reviewed Adjustments

- Removed broad RNA-only matching from protein synthesis. Nervous-system prompts
  that mention `ARNm` for membrane proteins stay nervous unless they explicitly
  train translation, genetic code, or protein synthesis.
- Kept ribonuclease and active-site prompts in `ENZYMES`, not generic protein
  synthesis.
- Kept multi-tags for exercises that genuinely combine units, such as
  protein-synthesis inhibitors with immunotherapy, enzyme activity inside
  energy transformation, and SOD activity in motor-neuron pathology.
- Kept photosynthesis strict: Rubisco and CO2 fixation map to
  `PHOTOSYNTHESIS`, not the generic enzyme unit unless the exercise is actually
  about enzyme properties.

## Product Rule

Study Command should now treat topic codes as a hard requirement. If a topic
proposal has no mapped exercises, the product shows an unavailable-content state
or opens the session builder. It must not silently remove `topicCodes` and
create a mixed drill.
