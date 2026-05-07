# SVT SE canonical lessons

This is the platform-authored layer for `علوم الطبيعة والحياة` in the `علوم تجريبية` stream.

Subject-agnostic curriculum rules live in `../../README.md`.

Canonical lessons should be aligned to `programmes/svt/SE.yml`. Source folders
are internal curriculum intelligence only: they may inform scope, density,
terminology, traps, visual needs, and student expectations, but public canonical
lessons must not reuse source wording, diagrams, page order, worked chains, or
assets unless the material is explicitly licensed or owned.

The first source extraction currently lives at:

`../../../sources/svt/SE/source 1 (السلسلة الفضية - علوم الطبيعة والحياة SE)/units/01-protein-synthesis/extracted.md`

## Course Blueprints

Canonical course journeys live as `course.json` files. The first journey is:

`proteins/course.json`

The blueprint is the reviewed product artifact. Source extractions may inform
scope, density, terminology, traps, and visual needs as private QA evidence, but
the blueprint must contain platform-authored explanations, original visual
prompts, interactions, BAC lenses, micro-quizzes, and optional depth portals.

`proteins/course.json` currently defines the full first-field mainline across:

- `PROTEIN_SYNTHESIS`
- `STRUCTURE_FUNCTION`
- `ENZYMES`
- `IMMUNITY`
- `NERVOUS_COMMUNICATION`

Every concept must belong to one of the declared `requiredUnitCodes`, and every required unit must have at least one concept. This keeps the course linear and complete without making optional depth portals mandatory.

Every concept also carries:

- `roadmapTitle`: a short familiar title for the outer roadmap.
- `title`: the richer in-node title.
- `role`: `FIELD_INTRO`, `UNIT_INTRO`, `LESSON`, or `FIELD_SYNTHESIS`.

The blueprint must start with a `FIELD_INTRO` and include at least one `UNIT_INTRO` for every required unit.

The blueprint declares the shared GPT-image visual direction in `visualStyle`. Current theme:

`premium-3d-biology-atlas`

Use it for self-contained image prompts: premium 3D-ish biology visuals, luminous molecular surfaces, clean Arabic labels, deep navy background, teal/cyan highlights, restrained gold accents, high contrast, and uncluttered educational composition.

Concept quality:

- `SKELETON`: valid but not final production prose.
- `POLISHED`: production-quality; validation requires at least three steps, two visuals, two interactions, and two BAC lenses.

Validate all canonical course blueprints before wiring or publishing:

```bash
npm run validate:course-blueprints -w @bac-bank/api
```
