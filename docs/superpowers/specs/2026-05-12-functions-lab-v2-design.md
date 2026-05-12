# Functions Lab v2 Design

## Goal

Upgrade the current Math Function Explorer into a BAC-specific `Functions Lab`
suite. The tool should help students move between a function expression, graph,
values, roots, sign reasoning, derivative intuition, tangent slope, variation
reasoning, and BAC-style questions without splitting those ideas into unrelated
micro-tools.

The goal is not to build a general CAS or clone a graphing calculator. The goal
is to make the function workflow BAC students actually use feel visible,
interactive, and trustworthy.

## Product Position

Functions Lab is the flagship Math Lab tool. It should replace the mental model
of separate top-level tools such as:

- Function Explorer
- Sign Table Builder
- Derivative Explorer
- Variation Table Explorer

Those become panels or missions inside one coherent function suite.

Courses explain the concepts. Functions Lab lets the student manipulate them.
Training checks transfer to BAC exercises. Functions Lab should support both
free exploration and guided repair after a student misses a function-related
question.

## Student Experience

The student opens one tool: `Functions Lab`.

The interface has two entry modes:

1. `Explore`
   The student selects a preset or enters a supported expression. The tool shows
   the graph, value table, approximate roots, sampled sign hints, and derivative
   or tangent estimates where reliable.

2. `BAC Mission`
   The student starts from a guided BAC task such as completing a sign table or
   deducing variations. Missions use controlled function families where the app
   can safely provide exact checks and clear explanations.

Both modes share the same underlying function engine. The difference is framing:
Explore gives freedom; BAC Mission gives structure.

## Initial Scope

The first v2 release should support these function families:

- linear functions
- quadratic functions
- simple polynomial presets with estimated results only
- simple rational presets with one excluded value

The first v2 release should include these panels:

- expression and preset controls
- graph viewport
- value table
- axis intersections
- roots and approximate zero detection
- sign intervals
- derivative/tangent preview
- variation table for supported presets
- BAC question panel
- common mistake panel
- short exit checks

The first v2 release should not attempt:

- full symbolic limits for arbitrary input
- full symbolic derivatives for arbitrary input
- exact sign tables for every expression a student types
- trigonometric, logarithmic, or exponential limit solving
- absolute value derivative and corner handling
- general CAS behavior
- saved sessions or admin-authored Lab missions

## Exact, Estimated, And Unsupported Results

The tool must label every derived result with a confidence class:

- `Exact`: produced from a supported function family or curated BAC preset.
- `Estimated`: produced from numerical sampling or finite differences.
- `Unsupported`: unavailable for the current expression without pretending.

This rule is central to the design. Students may freely enter expressions, but
the app should never present a sampled result as mathematical proof.

Examples:

- A quadratic preset can produce exact roots, exact sign intervals, derivative,
  extrema, and variation table.
- A free-entered expression can produce a graph, sampled values, approximate
  roots, and derivative estimates.
- A rational preset can mark excluded values and asymptote behavior only when
  the family parser recognizes the structure.
- Expressions with corners, such as absolute value functions, are not required
  for v2 exact analysis. If they are accepted in free exploration, derivative
  claims near corners should be marked `Estimated` or `Unsupported`.

## BAC Missions

A mission is a guided path inside the same tool, not a separate route. Missions
exist to turn weak points into repair loops.

Initial missions:

- `Read roots from graph`: identify solutions of `f(x)=0`.
- `Build the sign table`: fill signs over intervals separated by roots or
  excluded values.
- `Read tangent slope`: move a point and connect slope to derivative sign.
- `Complete variation table`: use derivative sign to infer increasing and
  decreasing intervals.

Each mission should include:

- one concept link
- one function preset
- one interactive manipulation
- one common BAC mistake
- two exit checks
- a link back to related Training when available

Exit checks are lightweight local interactions. They do not need to create a
full study session in v2.

## UI Structure

Use a dense tool layout that remains mobile-friendly:

- top: compact title, mode switch, preset/expression summary
- primary area: graph and active interactive panel
- inspector: roots, sign, derivative, or variation details
- lower area on mobile: stacked panels and mission checks

Desktop can use a three-region layout:

- left controls
- center graph
- right BAC inspector

Mobile should prioritize one active panel at a time through tabs or a segmented
control. Do not force a tiny desktop dashboard onto a phone screen.

The UI should follow `docs/design-system.md`: dark ink/navy by default, local
shadcn primitives for controls, electric emerald only for intentional Lab
signals, and no legacy control classes.

## Architecture

Keep the route as a server component under the current Lab route family. The
interactive tool remains a focused client component.

Recommended module split:

- `apps/web/src/lib/lab-functions/presets.ts`
  Curated BAC function presets and supported family metadata.

- `apps/web/src/lib/lab-functions/expression.ts`
  Expression normalization, validation, parsing wrapper, and safe evaluation.

- `apps/web/src/lib/lab-functions/sampling.ts`
  Graph samples, value tables, approximate roots, sign sampling, and derivative
  estimates.

- `apps/web/src/lib/lab-functions/families.ts`
  Exact analyzers for supported BAC families such as linear, quadratic, and
  selected rational forms.

- `apps/web/src/lib/lab-functions/missions.ts`
  Mission definitions, expected answers, and local checking helpers.

- `apps/web/src/components/functions-lab.tsx`
  Main client component that composes controls, graph, panels, and missions.

This keeps mathematical logic out of large TSX files and makes exact/estimated
behavior testable.

## Dependencies And Technical Spike

Before implementation, run a small technical spike for math engine choices.

Evaluate:

- current `function-plot` usage for graph rendering
- a proper expression parsing/evaluation library for safer free input
- whether a lightweight symbolic library is worth using for supported families
- whether exact BAC family analyzers are simpler and safer than relying on a CAS

Default recommendation:

- keep graph rendering library-backed
- use a real parser/evaluator instead of expanding the custom parser too far
- implement exact BAC family analyzers ourselves for linear, quadratic, and
  simple rational functions
- defer full CAS integration until there is a clear need and a tested boundary

The spike should produce a short note in the implementation plan, not a separate
long research project.

## Data Flow

1. Student selects `Explore` or `BAC Mission`.
2. Student chooses a preset or edits an expression.
3. Expression layer validates and normalizes input.
4. Family analyzers attempt exact recognition.
5. Sampling layer computes graph data, value table, approximate roots, and
   derivative estimates when possible.
6. UI panels render exact, estimated, or unsupported facts with explicit labels.
7. Mission checks compare student answers against exact expected answers when a
   supported mission is active.

No API or database calls are required for v2.

## Course, Flashcard, And Training Links

The Lab registry remains the integration boundary.

Functions Lab should be related to course topics and concepts for:

- function graph reading
- roots and equations `f(x)=0`
- sign tables
- derivative and tangent
- variation tables
- future limits and asymptote work

For v2, the course UI only needs contextual links into the tool. Flashcard and
Training generation can stay out of scope, but the design should leave room for
future actions such as:

- save this common mistake as a flashcard
- retry a related function exercise
- open a mission from a weak point

## Error Handling

The student should never land on a blank tool.

Handle:

- empty expression
- unsupported tokens
- parse errors
- non-finite values
- discontinuities
- domains with no reliable roots
- derivative estimates near gaps or corners
- exact analysis unavailable for free-entered expressions

Errors should be local and recoverable. Unsupported exact facts should render as
clear empty states, not as failures.

## Performance

Functions Lab should not slow down unrelated app surfaces.

Implementation rules:

- lazy-load heavy math or graphing code only on the Functions Lab route
- throttle or debounce recalculation while typing
- keep graph sampling bounded
- memoize derived results by expression, viewport, and preset
- avoid server work for interactive graph updates
- verify that dashboard, courses, training, and flashcards do not import heavy
  Lab modules through shared registries

The Lab home and course contextual links should only import lightweight metadata.

## Testing

Add focused unit tests for:

- expression validation and normalization
- exact family recognition
- exact linear and quadratic roots/sign/variation facts
- rational excluded value handling for supported presets
- approximate root detection edge cases
- derivative estimates over smooth regions
- unsupported result labeling
- mission answer checking

Important math edge cases:

- double roots such as `(x - 1)^2`
- roots at interval boundaries
- rational gaps such as `1/(x - 1)`
- restricted domains if supported later
- corners such as `abs(x)`
- expressions where sampling should not claim exact certainty

UI verification should cover:

- `/student/lab/math/function-explorer` renders with Functions Lab copy
- Explore mode responds to expression changes
- BAC Mission mode checks answers
- mobile layout does not overflow
- unsupported facts render clearly

## Rollout

Use an incremental rollout:

1. Rename or reposition the existing Function Explorer as `Functions Lab` in
   student-facing copy and registry metadata.
2. Add exact/estimated/unsupported result labels.
3. Add exact analyzers for linear and quadratic functions.
4. Add sign table and variation table panels for supported presets.
5. Add the first two missions: roots and sign table.
6. Add tangent/derivative preview.
7. Add more missions only after the first mission flow is verified.

The existing route may remain stable initially to avoid churn. A route rename can
be considered in a separate routing cleanup after the v2 behavior is shipped.

## Risks

- Overpromising exact math for arbitrary student input.
- Letting the tool become a generic graphing calculator instead of a BAC repair
  engine.
- Pulling heavy math dependencies into the whole web app bundle.
- Building too many panels before the first mission loop is proven.
- Making mobile students scroll through a desktop-style dashboard.

## Assumptions

- Functions Lab remains local to `apps/web` in v2.
- No database schema changes are needed.
- No public API contract changes are needed.
- Existing Lab registry and course contextual-link patterns remain the right
  integration boundary.
- Arabic remains primary in the student UI, with standard math notation kept in
  conventional symbolic form.
