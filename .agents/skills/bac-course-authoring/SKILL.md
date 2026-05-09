---
name: bac-course-authoring
description: Use when creating, reviewing, revising, or converting BAC Bank canonical course lessons, curriculum-node lesson drafts, BAC course content, or course blueprints under bac_theory_content/canonical.
---

# BAC Course Authoring

## Core Rule

Do not generate a full `course.json` in one pass. Author one curriculum-node
lesson at a time, in Markdown, then review it before any JSON conversion.

## Source Of Truth

Read only the files needed for the requested subject/unit:

- `bac_theory_content/canonical/README.md`
- subject blueprint, for example `bac_theory_content/canonical/math/README.md`
- unit README, for example
  `bac_theory_content/canonical/math/SE-M-MT/sequences/README.md`
- course-authoring pack:
  - `bac_theory_content/canonical/course-authoring/style-guide.md`
  - `bac_theory_content/canonical/course-authoring/node-template.md`
  - `bac_theory_content/canonical/course-authoring/quality-rubric.md`

Use `bac_theory_content/programmes/**` and `bac_theory_content/sources/**` as
internal evidence only. Do not copy source wording, examples, order, diagrams,
solution chains, or assets into public lessons.

## Workflow

1. Identify the target `CurriculumNode` and the leaf streams it serves.
2. Build a short node brief: objective, official scope, allowed formulas,
   forbidden drift, expected BAC moves, traps, and evidence level.
3. Draft the lesson in Markdown using the node template.
4. Run a math/subject review: correctness, legal conditions, examples, traps,
   missing scope, and drift.
5. Run a style review: serious BAC tone, concise Arabic, no fake hype, no
   copied source expression.
6. Revise once and mark review fields in the draft frontmatter.
7. Convert to JSON only after review approval. Prefer a deterministic compiler
   or importer; do not hand-author a large JSON artifact.

## Draft Location

Use this path pattern unless the existing unit establishes a stricter one:

`bac_theory_content/canonical/<subject>/<stream-family>/<unit>/nodes/<NODE_CODE>.md`

Keep one file per lesson node. Keep evidence notes internal and clearly marked.

## Hard Gates

Every production node must include:

- objective
- intuition
- formal rule or method, with conditions
- worked example
- interaction
- common trap
- BAC lens
- micro-quiz
- optional portal only when useful

Reject drafts that:

- hide uncertainty or invent official scope
- overuse metaphors, cinematic language, battles, powers, or magic language
- omit formula conditions
- treat OCR/source extraction as the public lesson
- produce `course.json` before the node content passes review
- mix several nodes into one sprawling lesson
