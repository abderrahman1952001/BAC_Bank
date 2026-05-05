# AI-Native SVT Course Engine Design

## Goal

Build BAC Bank's theory layer as a rigorous, linear, AI-native course journey rather than a digital textbook rewrite.

The first target is the SVT `التخصص الوظيفي للبروتينات` field for `علوم تجريبية`. The course should preserve the authority and sufficiency of the strongest student textbooks while reducing cognitive heaviness through sequence, visuals, interaction, exam context, and optional depth.

## Product Position

The course is a universal spine. Every student follows the same mainline path, which protects rigor, pacing, and trust.

Personalization should not fragment the curriculum. It should happen around the spine:

- optional depth portals for curious or advanced students
- adaptive review after micro-quizzes
- recommended BAC drills based on weak concepts
- flashcard suggestions for durable memory

The course should feel like UWorld's authority, Brilliant's interactive clarity, and an AI-native visual tutor wrapped into one serious BAC experience.

## Source Policy

The `sources` layer is private research material. It can inform:

- scope
- depth
- terminology
- common textbook expectations
- experiment coverage
- exam-facing traps
- diagram needs

It must not become a direct lesson-generation substrate.

The canonical course layer must be authored as BAC Bank's own learning graph: original explanations, original visuals, original interactions, original examples where possible, and explicit alignment to the official programme and BAC exam patterns.

## Course Structure

Recommended hierarchy:

- `Field`: a large programme field, such as `التخصص الوظيفي للبروتينات`
- `Unit`: an official unit inside the field
- `Concept`: one coherent learning outcome in the universal journey
- `Step`: one screen or one focused teaching move inside a concept
- `Depth Portal`: optional non-blocking exploration attached to a concept

The first SVT field narrative:

`The gene writes the machine, the machine folds into form, and form becomes life.`

Mainline arc:

1. Proteins as the hidden machines of life
2. DNA as instruction, not action
3. Transcription: protected code becomes a working copy
4. RNA types and the translation workshop
5. Genetic code: three-letter words become amino-acid choices
6. Translation: a chain is assembled
7. Protein folding: chain becomes form
8. Enzymes: form becomes catalysis
9. Immunity: form becomes recognition
10. Neural communication: form becomes signal

The first implementation should not attempt the whole arc. It should seed the first vertical slice on the `PROTEINS` topic and prove the model.

## Concept Grammar

Each mainline concept should be intentionally composed. A strong default flow is:

`Hook -> Explain -> Visual Inspect -> Micro Interaction -> Trap -> BAC Lens -> Micro Quiz -> Takeaway`

Supported step types:

- `HOOK`
- `EXPLAIN`
- `INSPECT`
- `RULE`
- `WORKED_EXAMPLE`
- `COMMON_TRAP`
- `QUICK_CHECK`
- `EXAM_LENS`
- `TAKEAWAY`

Each step may carry:

- short body copy
- bullets
- visual plan
- interaction prompt
- BAC lens

The course player should render the same structured model across subjects.

## Depth Portals

Depth portals are optional. They do not block completion and should not make the main course feel incomplete.

Examples:

- experiment details
- molecular mechanism details
- historical context
- advanced exam extension
- richer analogy or visualization

They should be presented as "explore deeper" material, not as required detours.

## Visual Grammar

SVT should be visual-first. Every important mechanism should eventually have an original visual plan:

- sequence diagrams for DNA/RNA/protein flow
- hotspot diagrams for transcription and translation machinery
- comparison panels for normal vs abnormal sequence
- graph-reading surfaces for enzymes
- identity/recognition diagrams for immunity
- membrane/channel diagrams for neural transmission

Generated images and diagrams must be original assets produced for BAC Bank, not textbook scans.

## Exam Bridge

Every important concept should carry a BAC lens:

- how the concept appears in documents
- common command verbs
- common traps
- what correction expects
- links to tagged BAC exercises when available

The exam bridge is what makes the course more than theory. It closes the loop from understanding to score.

## First Build Slice

Build the foundation for:

- richer course contracts
- authored SVT protein field content
- optional depth portals
- player rendering for visual, interaction, and exam-lens metadata

Seed a narrow `PROTEINS` topic slice with a few concepts. This proves the spine and portal model without overcommitting to full subject coverage.

## Conceptual Difficulty

Conceptual difficulty is high.

The hard parts are:

- splitting dense source material without flattening it
- preserving a single authoritative path
- deciding what is required vs optional
- making rigor feel light
- integrating BAC exam logic continuously
- maintaining one voice and one pedagogical standard at scale

## Technical Difficulty

Technical difficulty is medium-high.

The difficult parts are:

- structured content contracts
- reusable concept player rendering
- authoring/review workflow
- asset generation and management
- exam-to-concept tagging
- versioning published content without breaking progress

The initial technical slice is deliberately smaller: it updates the current Courses foundation and proves the model on authored static content before introducing database-backed authoring.
