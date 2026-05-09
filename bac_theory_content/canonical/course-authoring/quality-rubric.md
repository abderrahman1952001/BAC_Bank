# BAC Bank Course Node Quality Rubric

Status: `QUALITY_GATE_V0`

Use this rubric before a Markdown node can be compiled or mapped into course
JSON.

## Review Status

Use one of:

- `APPROVED`
- `NEEDS_REVISION`
- `BLOCKED`

`json_ready` may be `true` only when math/subject, style, and originality
reviews are all `APPROVED`.

## Gate 1: Scope

Approve when:

- the node matches an existing `CurriculumNode`;
- the target streams are explicit;
- mainline content stays inside official and expected BAC scope;
- optional material is clearly marked as optional.

Reject when:

- the draft invents official scope;
- it mixes multiple curriculum nodes;
- it teaches stream-specific material to the wrong stream.

## Gate 2: Correctness

Approve when:

- formulas, definitions, and examples are mathematically or scientifically
  correct;
- every method states its conditions;
- high-risk claims are backed by visually checked or line-checked evidence when
  needed.

Reject when:

- conditions are missing;
- examples contain arithmetic or logic errors;
- the draft uses a conclusion before proving its premise.

## Gate 3: BAC Relevance

Approve when:

- the BAC lens is concrete;
- the worked example resembles real exam moves without copying a source;
- the micro-quiz checks a skill the node actually taught.

Reject when:

- the lesson is generic textbook explanation with no exam move;
- the quiz is decorative or too broad;
- the BAC lens is vague, such as "this is important in BAC" without saying how.

## Gate 4: Tone

Approve when:

- Arabic is clear and calm;
- motivation comes from control and exam usefulness;
- metaphors are rare and useful.

Reject when:

- the text sounds cinematic, childish, or like a product landing page;
- every section has a new metaphor;
- titles use "powers", "machines", battles, magic lenses, or similar hype.

## Gate 5: Originality

Approve when:

- explanations, examples, diagrams, and solution chains are platform-authored;
- source evidence remains internal;
- source-inspired examples are structurally rewritten.

Reject when:

- wording is close to a teacher source;
- a source page order is reproduced as the public lesson path;
- diagrams or tables are recreated from scans without licensing or a new design.

## Gate 6: JSON Readiness

Approve when:

- every required lesson section is present;
- step boundaries are clear enough for a deterministic compiler or mapper;
- visual and interaction notes are concrete but not over-specified;
- unsupported metadata is kept out of future public JSON.

Reject when:

- the draft requires a human to guess the step structure;
- it depends on a visual that has not been specified;
- it uses custom fields that the current course schema cannot carry.
