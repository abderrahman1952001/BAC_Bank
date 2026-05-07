# Canonical curriculum charter

Status: `VISION_V0`

This directory is the platform-authored curriculum layer. It is not a public
copy of teacher booklets, commercial series, or scanned sources. Those sources
are studied internally so BAC Bank can understand what Algerian BAC students
actually see, expect, fear, and trust, then build a clearer and more premium
curriculum in BAC Bank's own voice.

## Student-Facing Model

Each student belongs to one leaf stream, such as `SE`, `M`, `MT`, `LP`, or
`LE`. In normal study mode, the student should see only the curriculum for that
stream.

The sane normalized model is:

1. `Stream`: the student's chosen leaf stream.
2. `SubjectCurriculum`: the active curriculum for one subject, one stream, and
   one validity window.
3. `SubjectRoadmap`: the visible journey for that curriculum.
4. `RoadmapSection` / `RoadmapNode`: the ordered stations and nodes the student
   uses.
5. Shared canonical modules: internal authoring units reused across multiple
   stream roadmaps when the learning substance is truly shared.

So yes: the product should resolve to a roadmap per stream. Internally, we can
author shared modules for overlapping material, then project them into each
stream's roadmap with the correct scope, order, depth, examples, and optional
portals.

Stream families like `SE-M-MT` or `LP-LE` are authoring conveniences, not the
student's primary browsing model. A scientific shared module may feed `SE`,
`M`, and `MT`; a literary shared module may feed `LP` and `LE`; but the student
still experiences one clean subject route for their own stream.

## Source-Use Boundary

Respected Algerian BAC sources are internal curriculum intelligence. They help
us identify:

- expected scope and sequencing;
- terminology students already recognize;
- common exercise patterns and traps;
- formula density and proof expectations;
- diagram, table, and visual needs;
- what omission would damage student trust;
- where optional depth can safely go beyond the mainline.

They are not public canonical content.

Canonical lessons must not look like a digitized version of a copyrighted
source. Do not publicly cite teacher/commercial sources as if BAC Bank is
republishing them. Do not reuse source wording, page order, table expression,
worked-solution chains, diagrams, or image assets unless we explicitly own or
license that material.

Source paths, page ranges, and extraction notes may appear in internal evidence
fields for QA and authoring review. They should not become public student-facing
attribution or public lesson copy.

## Authorship Standard

The canonical curriculum should be original and premium:

- original explanations in BAC Bank's voice;
- original examples by default, shaped by BAC patterns rather than copied;
- original visuals and interactions where possible;
- explicit BAC lenses showing how a concept appears in exams;
- micro-quizzes and retrieval checks;
- common-trap handling;
- optional portals for curious or strong students.

Additions are welcome, but they must be grounded. The mainline should stay
inside the official programme plus the realistic scope students expect from the
trusted source ecosystem. Extra context belongs in clearly marked optional
portals, not in the required exam route.

## Trust Rules

Three failures are especially dangerous:

1. Omitting material that students are used to seeing in respected BAC sources.
2. Drifting into material that is not actually part of the studied stream.
3. Copying source expression closely enough that BAC Bank feels derivative or
   legally unsafe.

Every canonical unit should therefore pass:

- a scope check against the official programme;
- an expectation check against internal source extractions;
- a drift check for out-of-scope mainline material;
- an originality check before public publishing;
- a stream check so each leaf stream receives only its valid path.

## Evidence Gates

Source extraction does not need to be perfect before canonical work begins, but
the required evidence level depends on the use:

| Gate | Meaning | Good Enough For |
| --- | --- | --- |
| `SOURCE_EXTRACTED` | The source is captured enough to understand scope and order. | Whole-subject maps, concept inventories, early lesson skeletons. |
| `STRUCTURE_VERIFIED` | Page order, page markers, and assets are structurally valid. | Internal source references and coverage planning. |
| `COVERAGE_VERIFIED` | A page/range was visually checked for missing major items. | Polished unit scope, trap lists, visual needs, expected exercise patterns. |
| `LINE_VERIFIED` | A formula, table, statement, or solution step was checked line by line against the scan. | Exact internal claims, high-risk formulas, or rare cases where source fidelity itself matters. |

For canonical curriculum, the default is not line-by-line transcription. The
default is source-grounded original authorship. Use line-level audit only for
high-risk formulas, dense tables, visual structures, and exact statements we
need to understand without ambiguity.

## Workflow For Any Subject

Use the same workflow for math, SVT, physics, philosophy, languages, and later
subjects:

1. Register the official programme and target streams.
2. Extract respected sources into `bac_theory_content/sources/**` as internal
   evidence.
3. Build a thin whole-subject authoring map, using stream families only when
   the overlap is real.
4. Normalize shared modules internally.
5. Produce a student-facing roadmap per leaf stream.
6. Build one golden unit to prove the tone, node shape, visuals, interactions,
   and validation rules.
7. Expand unit by unit, keeping optional portals clearly separate from the
   required BAC path.
8. Publish only after scope, stream, drift, originality, and validation checks.

## Directory Boundary

- `bac_theory_content/programmes/**`: official programme scope and unit codes.
- `bac_theory_content/sources/**`: source-faithful internal extraction and
  audit material.
- `bac_theory_content/canonical/**`: BAC Bank's authored curriculum, roadmaps,
  course blueprints, interactions, and publishing-ready lesson structure.

The canonical layer may depend on internal evidence. It must not become a
second source-extraction layer.
