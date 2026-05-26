# SVT Exam Tagging Playbook

Subject code: `NATURAL_SCIENCES`

Use this alongside `.agents/skills/bac-exam-tagging/SKILL.md`,
`docs/svt-curriculum-mapping.md`, and the SVT programme files under
`bac_theory_content/programmes/svt/`.

## Scope

- Streams in scope: `SE`, `M`.
- Active curricula: `SE__2008__OPEN`, `M__2008__OPEN`.
- Current published mapping baseline:
  - `SE`: 36 exercise roots, 47 curriculum mapping rows, 36 primary rows.
  - `M`: 32 exercise roots, 37 curriculum mapping rows, 32 primary rows.
- Current baseline is exercise-root/unit-level. A high-accuracy pass should move
  toward the lowest meaningful assessable node, especially when exercises mix
  concepts.

## Curriculum Notes

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

`M__2008__OPEN` currently uses:

- `PROTEINS`
  - `PROTEIN_SYNTHESIS`
  - `STRUCTURE_FUNCTION`
  - `IMMUNITY`
- `HUMAN_AND_PLANET_MANAGEMENT`
  - `AIR_POLLUTION`
  - `WATER_POLLUTION`

M stream tagging should respect the M curriculum boundary. If old M papers test
environment or another legacy unit, tag the paper truthfully and mark the unit
as legacy/currently not studied before exposing it as normal student practice.

## Learning Targets

Existing M targets are a useful starting point, not a finished SVT taxonomy:

- `DOCUMENT_ANALYSIS`
- `PROTEIN_FUNCTION_REASONING`
- `IMMUNITY_REASONING`
- `BIOLOGICAL_DATA_INTERPRETATION`
- `ENVIRONMENTAL_DOCUMENT_ANALYSIS`

Likely SVT-wide target candidates to calibrate from papers:

- document analysis
- graph/table/image interpretation
- experimental reasoning
- biological mechanism explanation
- structure-function reasoning
- genetic-information reasoning
- immune-response reasoning
- photosynthesis/energy reasoning
- nervous-communication reasoning
- tectonic/geological interpretation
- diagram/schema labeling
- conclusion or hypothesis justification

Keep the final taxonomy compact. Merge rare or wording-specific target ideas
unless they clearly improve analytics or study recommendations.

## Mapping Rules

- Prefer question/subquestion tags when the node is independently assessed.
- Use exercise-root tags as rollups or when the published hierarchy is not
  granular enough.
- Secondary curriculum tags require real assessed content, not incidental
  vocabulary inside a document.
- Corrections/barèmes can clarify whether a node asks for naming, reasoning,
  interpretation, or conclusion writing.
- Shared stems and documents are evidence for child nodes; do not treat them as
  student performance signals by default.

## Known Traps

- Broad RNA/ARNm wording can falsely suggest `PROTEIN_SYNTHESIS` inside nervous
  communication or other protein-related contexts. Require explicit translation,
  genetic code, ribosome, antibiotic-inhibitor, or synthesis reasoning evidence.
- Enzyme vocabulary can appear inside photosynthesis, immunity, or protein
  synthesis contexts. Tag `ENZYMES` only when enzyme activity/properties are
  actually assessed.
- UV wording can appear in protein-function/disinfection prompts. Do not map to
  `AIR_POLLUTION` unless there is stronger atmosphere/ozone/pollution evidence.
- M papers may contain legacy environment-management content even if current
  students do not study it. Preserve the historical truth in tags while marking
  the product availability separately.
- Source scans may be SE-family scans reused for M-equivalent content. Verify
  visually when a stream-specific or legacy conclusion depends on the scan.

## Script Usage Notes

The existing stream-aware SVT mapper is useful for candidate generation and
coverage checks, but it is not enough for a perfect pass:

- It now maps every non-`CONTEXT` published assessable node, including
  `EXERCISE`, `PART`, `QUESTION`, and `SUBQUESTION` rollups/leaves.
- It uses deterministic text rules, so visually rich questions need manual
  review.
- It should remain conservative and should preserve reviewed/manual rows.
- For a high-quality pass, generate candidates first, review risky or all
  assessable nodes, then apply reviewed rows.
- Keep `DOCUMENT_ANALYSIS` as a fallback learning target. Prefer more specific
  targets such as graph/table interpretation, experiment reasoning, diagram
  labeling, mechanism explanation, or calculation when the prompt indicates
  them.
- Avoid treating generic terms as subject signals:
  - `كمون` in energy exercises often means redox potential, not nervous
    communication.
  - `إنزيم` inside protein synthesis/function prompts can be incidental unless
    enzyme activity, active site, substrate, or conditions are assessed.
  - `التنفس` in disease symptoms is not the respiration/fermentation unit.
  - `الكرة الأرضية` in atmosphere/ozone prompts is not Earth-structure evidence.

## Validation Log

- 2026-05-26:
  - performed a targeted manual QA pass over the highest-risk automatic SVT
    tags before checkpointing:
    - reviewed the inherited-parent-topic bucket and kept it as an explicit
      flag rather than silently using broad exercise-root context on leaf nodes.
    - reviewed all `M` stream out-of-scope secondary hints; the remaining hints
      are legacy/incidental enzyme signals in older protein/immunity papers and
      were not written as M curriculum tags.
    - sampled the mixed leaf-topic clusters, especially
      enzyme/respiration, protein/immunity, and nervous/immunity overlaps.
  - rule changes from the manual pass:
    - leaf nodes no longer use `EXERCISE` prompt text as direct topic evidence;
      they either use local/part context or inherit transparently from a parent.
    - immunofluorescence/fluorescent-antibody lab methods in nervous
      communication no longer create immunity tags by themselves.
    - inherited amino-acid/peptide/pH chemistry prompts prefer
      `STRUCTURE_FUNCTION` unless there is explicit translation/transcription
      evidence.
  - final applied candidate artifact:
    `apps/api/output/tagging/svt-exam-node-tagging-20260526-manual-pass2.*`.
  - final DB readback after the manual QA refinements:
    - total taggable non-`CONTEXT` nodes: `1690`.
    - curriculum-mapped nodes: `1690`; rows: `2055`; primary rows: `1690`.
    - learning-target-mapped nodes: `1690`; rows: `5545`; primary rows:
      `1690`.
    - `CONTEXT` curriculum rows: `0`; `CONTEXT` learning-target rows: `0`.
  - retained review flags after the manual pass:
    - image-evidence: `506`.
    - inherited-parent-topic: `148`.
    - multi-curriculum: `318`.
    - multi-learning-target: `192`.
    - stream-out-of-scope-secondary: `17`.
  - rows remain automatic/topic-derived rather than manual-reviewed because this
    pass improved and sampled the mapping rules but did not visually certify all
    image-heavy nodes:
    - curriculum mappings: `source=AUTO_RULE`, `reviewed_at=null`.
    - learning-target mappings: `source=TOPIC_DERIVED`, `reviewed_at=null`.

- 2026-05-25:
  - added `bac-exam-tagging` skill and this subject playbook as the durable
    workflow memory for exam-node tagging.
  - seeded/updated a compact SVT-wide learning-target taxonomy for `SE` and `M`.
  - applied node-level mappings for all published `NATURAL_SCIENCES` `SE` and
    `M` normal/makeup papers from 2008-2025.
  - applied rows are automatic/topic-derived, not manual review:
    - curriculum mappings: `source=AUTO_RULE`, confidence `0.88`,
      `reviewed_at=null`.
    - learning-target mappings: `source=TOPIC_DERIVED`, confidence `0.84`,
      `reviewed_at=null`.
  - coverage readback:
    - total taggable non-`CONTEXT` nodes: `1690`.
    - curriculum-mapped nodes: `1690`; rows: `2113`; primary rows: `1690`.
    - learning-target-mapped nodes: `1690`; rows: `5612`; primary rows:
      `1690`.
    - `CONTEXT` curriculum rows: `0`; `CONTEXT` learning-target rows: `0`.
  - stream/node coverage:
    - `M`: `76` exercise, `110` part, `309` question, `166` subquestion nodes
      all mapped to curriculum and learning targets.
    - `SE`: `114` exercise, `205` part, `496` question, `214` subquestion nodes
      all mapped to curriculum and learning targets.
  - final candidate flags retained for future manual review:
    - image-evidence: `506`.
    - inherited-parent-topic: `42`.
    - multi-curriculum: `370`.
    - multi-learning-target: `194`.
    - stream-out-of-scope-secondary: `15`.
  - remaining `M` stream out-of-scope secondary hints are `ENZYMES` in older
    protein/function papers. They were not written as M curriculum tags, but
    they should be considered when deciding whether to expose historical M
    exercises involving enzyme examples.
  - validation commands:
    - `npm run tag:svt-exam-nodes -w @bac-bank/api -- --stream ALL --apply --replace --output output/tagging/svt-exam-node-tagging-20260525-final`
    - DB readback confirmed full coverage and zero context mappings.
    - `npm run prisma:validate -w @bac-bank/api`
    - `npm run test:unit -w @bac-bank/api -- svt-se-curriculum-mapping.spec.ts --runInBand`
    - `npm run build -w @bac-bank/api`

- 2026-05-21:
  - baseline pass applied curriculum-node mappings at exercise-root/unit level.
  - `SE`: 36 exercise roots, 47 rows, 36 primary rows.
  - `M`: 32 exercise roots, 37 rows, 32 primary rows.
  - all baseline rows were `AUTO_RULE` with confidence `0.85`.
  - M out-of-scope secondary hints were `ENZYMES` and
    `RESPIRATION_FERMENTATION`, apparently incidental inside protein exercises.
  - old M environment content justified keeping
    `HUMAN_AND_PLANET_MANAGEMENT`, especially `AIR_POLLUTION`.
