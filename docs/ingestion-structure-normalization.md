# Ingestion Structure Normalization

## Purpose

This document defines the default normalization rules for manually reviewed BAC
paper ingestion drafts.

Use these rules for new imports so drafts do not drift by operator habit.
Prefer a faithful semantic structure over flattening everything into
`EXERCISE -> QUESTION`.

This is especially important for subjects where one exercise may contain:

- direct sibling questions
- named parts such as `الجزء الأول`
- nested subquestions under a numbered question

## Current Policy

Apply this normalization from now on for new structured imports and draft
cleanups.

Earlier drafts may stay as-is temporarily, but they should be backfilled toward
the same shape before large-scale publication.

## Canonical Node Hierarchy

The draft model already supports:

- `EXERCISE`
- `PART`
- `QUESTION`
- `SUBQUESTION`
- `CONTEXT`

Use them as follows.

### `EXERCISE`

Root node under a variant.

Use one `EXERCISE` node per visible exercise in the paper.

Examples:

- `التمرين الأول`
- `التمرين الثاني`

### `PART`

Use `PART` when the paper clearly introduces a structural subdivision that
contains multiple child prompts, questions, or a shared statement.

Typical triggers:

- `الجزء الأول`
- `الجزء الثاني`
- a clearly separated named section inside the exercise

Do **not** create a `PART` for every decorative heading. If the heading is only
stylistic and does not actually organize child nodes, keep it in blocks.

### `QUESTION`

Use `QUESTION` for the main numbered prompts in an exercise or part.

Default rule:

- numbered items like `1`, `2`, `3`, `4` are `QUESTION` nodes

Questions may appear:

- directly under `EXERCISE`
- under `PART`

### `SUBQUESTION`

Use `SUBQUESTION` for prompts nested under a numbered question.

Default rule:

- lettered items like `أ`, `ب`, `ج`, `د` are `SUBQUESTION` nodes only when
  they are clearly nested under a numbered question

`SUBQUESTION` should normally live under a `QUESTION`.

If lettered prompts appear directly under an `EXERCISE` or `PART`, and there is
no parent numbered question introducing them, treat them as `QUESTION` nodes
instead.

### `CONTEXT`

Use `CONTEXT` for shared setup text that belongs to the exercise or part but is
not itself a numbered question.

Typical examples:

- a scientific setup paragraph before questions start
- instructions shared by several questions
- a short transition paragraph before a part

## Default Nesting Rules

When the source is unambiguous, use these shapes.

### Simple exercise

If the exercise is just a statement followed by numbered prompts:

- `EXERCISE`
- `QUESTION`
- `QUESTION`
- `QUESTION`

### Exercise split into named parts

If the exercise explicitly contains parts such as `الجزء الأول` and
`الجزء الثاني`:

- `EXERCISE`
- `PART`
- `QUESTION`
- `QUESTION`
- `PART`
- `QUESTION`

### Numbered question with lettered children

If one prompt contains lettered follow-ups:

- `EXERCISE`
- `QUESTION`
- `SUBQUESTION`
- `SUBQUESTION`

### Direct lettered prompts without a parent numbered question

If an exercise or part starts directly with lettered prompts:

- `EXERCISE`
- `QUESTION`
- `QUESTION`

### Shared setup before a part or question set

If a shared paragraph introduces the next grouped prompts:

- `EXERCISE`
- `CONTEXT`
- `PART`
- `QUESTION`

or:

- `EXERCISE`
- `CONTEXT`
- `QUESTION`
- `QUESTION`

## Label Normalization

Keep one canonical structural label in `node.label`.
Do not duplicate the same heading in both the UI chrome and the prompt block
unless the source text truly requires it.

### Exercise labels

Use the visible heading text, normalized without trailing score text.

Examples:

- source: `التمرين الأول: (08 نقاط)`
- label: `التمرين الأول`

### Part labels

Use the visible part heading, normalized without decorative punctuation.

Examples:

- source: `الجزء الأول:`
- label: `الجزء الأول`

### Question labels

Use a normalized numeric structural label.

Examples:

- `السؤال 1`
- `السؤال 2`

### Subquestion labels

Use a normalized lettered structural label.

Examples:

- `الفقرة أ`
- `الفقرة ب`

## Block Content Rules

Blocks should contain the actual content, not repeated structural chrome.

### Put in `node.label`

- exercise heading
- part heading
- question numbering
- subquestion lettering

### Put in blocks

- the real statement text
- correction text
- hints
- rubric text
- images and other assets

## Notation And Presentation Normalization

Normalize notation and block presentation when doing manual cleanup or when
reviewing automated extraction output.

### Use `paragraph` blocks for

- normal prose
- mixed prose plus inline scientific or mathematical notation
- short explanatory sentences that include values, units, ions, genes, or
  symbols inline

### Use `latex` blocks for

- standalone formulas
- reaction equations
- symbolic equalities or derivations
- formula-heavy lines that are awkward or noisy as plain prose

### Inline notation policy

Prefer inline `$...$` inside `paragraph` blocks when notation is part of a
sentence and the formatting materially affects meaning or readability.

Typical examples:

- subscripts and superscripts like `$CO_2$`, `$H_2O$`, `$10^{-3}$`
- ions and charges like `$Ca^{2+}$`, `$Cl^-$`, `$NH_3^+$`
- indexed variables or Greek-letter notation
- pH expressions like `$pH = 6.11$`
- units with powers like `$mm^3$`, `$g/mol$`

### Keep as normal prose

Do not force plain text into LaTeX just because it is scientific.

Keep these as ordinary `paragraph` content unless notation genuinely requires
formatting:

- simple numbers
- ordinary units without exponents or symbolic structure
- plain scientific names or Latin names
- ordinary prose labels that read clearly without math formatting

### Heading and readability cleanup

Use `heading` blocks for short visible labels that organize nearby content but
do not deserve their own node.

Typical examples:

- `ملاحظة`
- `الاستنتاج`
- `التعليل`

Do not use `heading` blocks for labels already represented structurally as node
labels, such as:

- exercise labels
- part labels
- question numbering
- subquestion lettering

### Punctuation and spacing cleanup

During review, clean obvious OCR or extraction noise when doing so does not
change meaning.

Good cleanup examples:

- broken spacing around punctuation
- duplicated punctuation
- malformed spacing around inline notation
- accidental line-join artifacts that make the sentence harder to read

### Avoid fake styling

Until the content model supports real inline rich text, do not simulate bold or
italic emphasis with ad-hoc markup purely for appearance.

Prefer:

- correct block splitting
- proper node labels
- proper heading blocks
- faithful inline notation

over fake markdown styling inside prose.

### Avoid when possible

- repeating `التمرين الأول` inside prompt text if it already exists as
  `node.label`
- keeping `1.` or `أ)` at the start of block text if that marker is already
  represented by the node label
- keeping score suffixes like `(08 نقاط)` in labels when the points already
  live in `maxPoints`

## Points Normalization

- exercise totals belong in `EXERCISE.maxPoints`
- part totals belong in `PART.maxPoints` only when clearly stated or safely
  inferable
- question totals belong in `QUESTION.maxPoints`
- lettered subparts belong in `SUBQUESTION.maxPoints` when they have distinct
  scoring

Do not leave score text only in rubric blocks when the node-level points are
clear enough to capture.

## Ambiguity Rules

When the source is ambiguous:

- prefer preserving the source faithfully over inventing deep structure
- infer hierarchy from the full local context, not from letters or digits in
  isolation
- keep shared prose in blocks rather than guessing a `PART`
- add a review note when a point split or hierarchy choice required judgment

## Asset Rules

Until native structured assets are recovered:

- import document figures as `image`
- keep the asset attached to the node where it is used
- refine crops later if needed

## Cleanup Strategy For Earlier Drafts

This normalization can be backfilled later because:

- the DB model already supports richer nesting
- the admin inspector already supports changing node type, parent, label, and
  points

But cleanup is cheaper before mass publication.

Recommended order:

1. Use this policy for all new ingestions now.
2. Backfill the first batch of already imported drafts to match it.
3. After the data shape stabilizes, improve the web rendering so parts and
   subquestions display natively instead of being flattened.
