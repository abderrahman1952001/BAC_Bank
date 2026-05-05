# Lab First Tools Design

## Goal

Add a first student-facing `Lab / المختبر` section that makes difficult BAC concepts manipulable, not just readable. The first release covers two tools:

- Math Lab: Function Explorer
- SVT Lab: DNA to Protein

The Lab should become a main student navigation surface and also support contextual links from course lessons when a related tool helps explain the current concept.

## Product Position

The Lab is the interactive understanding layer between courses and training:

- Courses teach the concept.
- Lab lets the student manipulate the concept.
- Training tests whether the concept transfers to BAC exercises.

The first slice should feel useful and serious, not like a generic toybox. Every tool needs a visible curriculum use case and a short BAC-facing explanation of what the student should learn from it.

## Scope

In scope for the first build:

- Add `المختبر` as an explicit student navigation surface.
- Add a Lab home page with Math and SVT sections.
- Add a Function Explorer page.
- Add a DNA to Protein page.
- Add a typed local Lab registry that describes available tools and related course references.
- Add simple course-facing link support only where the existing course UI can consume static metadata safely.
- Omit Physics from the Lab home until the first Physics tool exists.

Out of scope for the first build:

- Database-backed Lab tool authoring.
- Admin Lab management.
- Saved Lab sessions.
- Full computer algebra.
- Full symbolic derivative, sign-table, or variation-table solving.
- Advanced biology modeling beyond transcription, codon grouping, translation, and simple mutation comparison.
- Physics Lab implementation.

## Student Experience

The main route is `/student/lab`. The student sees subject groups with concise tool cards:

- `Math Lab`
- `SVT Lab`

Each card explains the BAC use case and opens the tool. Courses can also link into the same tool with a preselected preset or plain route.

### Function Explorer

The student can enter a function expression, select a preset, and inspect the graph. The first version should support common BAC-friendly functions such as:

- linear functions
- quadratic functions
- simple polynomial examples
- simple rational examples with discontinuities treated as graph gaps when evaluation is non-finite

The first interface should include:

- expression input
- preset selector
- graph viewport
- table of values
- detected x-axis intersections when reliable
- optional toggles for axes, grid, and sample points
- a BAC note that explains how graph features map to exercise language

The tool should avoid pretending to be a full CAS. If a result cannot be computed reliably, the UI should say that this feature is unavailable for the current expression instead of inventing an answer.

### DNA to Protein

The student starts from a short DNA coding sequence and sees the deterministic pipeline:

`DNA coding sequence -> mRNA codons -> amino-acid chain`

The first interface should include:

- DNA input with normalization to valid bases
- preset examples
- original sequence pipeline
- mutation controls for substitution, insertion, and deletion
- mutated sequence pipeline
- side-by-side consequence summary

The tool should classify first-order mutation effects:

- no amino-acid chain change for the visible translated segment
- amino-acid substitution
- premature stop codon
- frameshift for insertion/deletion not divisible by three

The BAC note should connect the sequence comparison to SVT reasoning: mutation changes the protein chain, which can change structure and function.

## Course Links

Contextual course links should be metadata-driven and conservative in the first build. The initial references are:

- Function Explorer: `MATHEMATICS` topics related to functions.
- DNA to Protein: `SVT` protein-synthesis concepts related to DNA instructions, transcription, genetic code, and translation.

If a referenced course concept is absent from the current authored content, the Lab registry should still define the relationship but the course UI should simply render no contextual link for that missing concept.

## Architecture

### Routes

Add student routes:

- `/student/lab`
- `/student/lab/math/function-explorer`
- `/student/lab/svt/dna-to-protein`

The route files should remain server components. The interactive tools should live in focused client components.

### Registry

Add a typed registry in `apps/web/src/lib/lab-surface.ts`.

The registry should describe:

- tool id
- subject code/category
- title
- short description
- BAC use case
- route
- status
- optional related course references

The registry is the first integration boundary. Navigation, Lab home cards, and course contextual links should read from it instead of duplicating tool metadata.

### Routes Helper

Extend `apps/web/src/lib/student-routes.ts` with Lab constants and route builders. Add Lab to `StudentSurface` so navigation active-state behavior stays consistent with the existing student shell.

### Components

Add focused components:

- Lab home page component
- Function Explorer client component
- DNA to Protein client component

Shared pure logic should stay out of TSX when possible:

- expression/preset helpers for Math Lab
- transcription, translation, codon, and mutation helpers for SVT Lab

## Data Flow

For the first release, all Lab metadata and presets are local typed data.

Function Explorer:

1. Student selects preset or edits expression.
2. Client component evaluates plottable points using a safe expression evaluator.
3. Graph and table update from local state.
4. Reliable derived facts render as guidance; unavailable facts render as clear empty states.

DNA to Protein:

1. Student selects preset or edits DNA sequence.
2. Pure helper normalizes and validates the sequence.
3. Pure helper transcribes to mRNA codons.
4. Pure helper translates codons through a local codon table.
5. Mutation helper builds the mutated sequence and translated result.
6. Comparison helper returns a structured consequence summary for the UI.

No API or database calls are required for this first slice.

## Error Handling

Function Explorer should handle:

- empty expressions
- unsupported characters
- expressions that cannot be evaluated
- expressions that evaluate to non-finite values over parts of the viewport
- roots/intersections that cannot be detected reliably

DNA to Protein should handle:

- empty sequence
- invalid bases
- sequence length not divisible by three
- missing start codon as a warning, not a hard blocker
- stop codons inside the translated segment

Errors should be local, visible, and recoverable. The student should never land on a blank tool.

## Testing

Add unit tests for:

- Lab route builders and active surface behavior.
- Lab registry shape and expected first tools.
- DNA normalization, transcription, codon grouping, translation, mutation application, and consequence classification.

For Function Explorer, test pure helpers where they exist:

- preset lookup
- table generation for simple functions
- invalid expression handling

After implementation, verify manually or with Playwright that:

- `/student/lab` renders the tool cards.
- `/student/lab/math/function-explorer` renders a graph and responds to preset changes.
- `/student/lab/svt/dna-to-protein` shows original and mutated pipelines and responds to mutation controls.

## Dependencies

Use the existing `function-plot` dependency for graph rendering. Do not hand-roll a general math parser. Add local wrapper logic only for presets, sampling tables, defensive evaluation, and BAC-facing guidance.

The DNA to Protein logic should be custom pure TypeScript because the rules in scope are small, deterministic, and need curriculum-specific explanations.

## Assumptions

- Lab is available to signed-in students in the existing student shell.
- The first slice does not introduce new entitlements or billing behavior.
- Contextual course links can be added through static metadata without changing the course API contract in this first pass.
- Arabic labels are primary in the student UI, with scientific abbreviations such as DNA and mRNA left as standard terms.
