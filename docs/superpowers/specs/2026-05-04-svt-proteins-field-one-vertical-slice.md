# SVT Proteins Field One Vertical Slice

## Goal

Turn the first SVT field, `التخصص الوظيفي للبروتينات`, into one rigorous linear course journey that can carry the UWorld-style authority, Brilliant-style interaction, and AI-native visual/feedback layer.

## Product Shape

The mainline is universal for all students. Optional depth portals are allowed, but they must not carry required exam knowledge that would make the mainline incomplete.

Each concept has two title layers:

- `roadmapTitle`: short, familiar, and suitable for the outer roadmap.
- `title`: more engaging and expressive inside the lesson page.

This keeps the roadmap authoritative and easy to scan while preserving the more memorable tone inside each node.

The first six concepts are the current quality bar:

- `protein-world`
- `protein-synthesis-unit-intro`
- `dna-instruction`
- `transcription-working-copy`
- `genetic-code`
- `translation-chain`

They model the desired rhythm:

- memorable but mature hook
- one core idea at a time
- strong visual prompt
- lightweight interaction
- explicit BAC lens
- optional depth only where it adds curiosity or high-level mastery

## Coverage

The canonical proteins blueprint must cover the five official units from `bac_theory_content/programmes/svt/SE.yml`:

- `PROTEIN_SYNTHESIS`
- `STRUCTURE_FUNCTION`
- `ENZYMES`
- `IMMUNITY`
- `NERVOUS_COMMUNICATION`

The current vertical slice is intentionally a skeleton for most later nodes. Skeleton means the node has enough structure to render, validate, and communicate the intended pedagogy, but not every paragraph is final production prose yet.

The journey uses explicit node roles:

- `FIELD_INTRO`: opening nodes that prepare and excite the student for the whole field.
- `UNIT_INTRO`: one introductory node at the beginning of each official unit.
- `LESSON`: normal teaching nodes.
- `FIELD_SYNTHESIS`: closing synthesis nodes that reconnect the field.

Validation requires the blueprint to start with a field intro and to include a unit intro for every required unit.

The journey declares a shared visual style for GPT image generation:

- `imageModel`: `gpt-image-1`
- `name`: `premium-3d-biology-atlas`
- direction: cinematic 3D-ish biology renders, luminous molecular surfaces, clean Arabic labels, deep navy backgrounds, teal/cyan highlights, restrained gold accents, high contrast, and uncluttered educational composition.

Visual prompts should be self-contained and ready for image generation. They should show the real biological object, sequence, comparison, graph, or mechanism the student needs to inspect.

Concepts can be marked by quality:

- `SKELETON`: structurally valid but not final prose.
- `POLISHED`: production-quality node with at least three steps, at least two visual plans, at least two interactions, and at least two BAC lenses.

## Authoring Boundary

Source extractions are allowed to inform:

- scope
- sequence
- terminology students expect
- common traps
- visual/exam document needs

They must not be used as final phrasing. Canonical nodes should be platform-authored and transformed into micro-learning structure.

## Next Quality Pass

The next pass should polish a small number of hard nodes to the same quality bar as the opening sequence before expanding prose everywhere. Good candidates:

- `synthesis-to-structure-bridge`
- `amino-acids-and-peptide-bond`
- `primary-structure`
- `folding-levels`
- `enzyme-conditions`
