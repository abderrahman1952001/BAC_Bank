# Courses + Flashcards Design

## Goal

Add two premium student-facing surfaces to BAC Bank:

- `Courses`: a visually rich, interactive curriculum experience for theory learning
- `Flashcards`: a flexible memory and review system that ships with platform-built decks and supports personal editing

This slice is intentionally theory-first. It should stand on its own before deeper theory-to-practice loop closure is added.

## Product Position

The platform is not adding a digital textbook shelf.
It is adding a premium guided learning layer on top of the existing BAC Bank foundations.

The student should feel:

- `I know where to start`
- `I can move through the subject in order`
- `Each lesson feels light, clear, and premium`
- `Important facts become reviewable immediately`

The product should not feel like:

- a PDF viewer
- a dumped markdown chapter
- a chaotic card database
- a childish gamified app

## Scope

In scope for this feature family:

- sidebar entry for `Courses`
- sidebar entry for `Flashcards`
- subject -> unit -> topic -> concept curriculum journey
- Duolingo-like ordered progression at the topic and concept level
- premium concept player with micro-interactions and micro-quizzes
- platform-authored decks seeded into the app
- student editing, creating, merging, removing, and reorganizing decks
- private student overrides so one student's edits do not affect others

Out of scope for this first architecture pass:

- direct auto-generation of drill sessions from lessons
- teacher mission distribution
- open-ended AI chat in lessons
- complex social or classroom features
- forcing flashcards into a rigid topic-only structure

## Core Decisions

### 1. Courses is a separate authored domain

Existing `subject_curricula`, `topics`, and training `roadmaps` remain the backbone for curriculum identity and practice flows.

`Courses` should be a new authored layer that references curriculum entities, but does not overload the training roadmap tables with lesson-player responsibilities.

### 2. Topic progression and concept progression are separate

A topic is not a single article.
A topic is a roadmap made of several concepts.

Recommended hierarchy:

- `Subject`: the course entry point
- `Unit`: large subject stage
- `Topic`: student-recognizable revision chunk
- `Concept`: one learnable idea or mechanism
- `Step`: one screen inside the concept player

### 3. Flashcards stay flexible

Decks are just decks.

The platform can seed decks with curriculum links, but the student must be free to:

- keep decks organized by topic
- merge decks into unit-level collections
- create fully custom decks
- move or duplicate cards into personal structures

This means the data model should support optional curriculum association, not mandatory taxonomy lock-in.

### 4. Student edits are private

Platform-built decks and cards are canonical seeds.

Student edits create private copies, overrides, or user-owned items.
No user edit should mutate the shared deck or card for everyone else.

## Information Architecture

### Sidebar

Student sidebar should include:

- `My Space`
- `Library`
- `Training`
- `Courses`
- `Flashcards`
- `Billing` when relevant

### Courses routes

Recommended route family:

- `/student/courses`
- `/student/courses/[subjectCode]`
- `/student/courses/[subjectCode]/topics/[topicSlug]`
- `/student/courses/[subjectCode]/topics/[topicSlug]/concepts/[conceptSlug]`

### Flashcards routes

Recommended route family:

- `/student/flashcards`
- `/student/flashcards/decks/[deckId]`
- `/student/flashcards/study/[deckId]`

## Courses Experience

### Courses home

The first `Courses` screen should show the list of subjects as premium academies, not as plain filter chips.

Each subject card should show:

- subject name
- short positioning line
- progress summary
- units count
- concepts completed
- `Continue` CTA when activity exists

The page should answer:

- what subjects are available
- where the student left off
- which subject is most worth continuing

### Subject page

When entering a subject, the student sees the full curriculum as ordered units.

Each unit should read like a stage in a learning journey:

- unit title
- short narrative summary
- progress state
- topic roadmap

Topic nodes should show:

- title
- status: `Locked`, `Ready`, `In Progress`, `Completed`
- estimated effort
- linked deck badge when a deck exists
- saved review count when student review data exists

This map can be visually inspired by Duolingo, but it should look premium, calm, and academically serious.

### Topic page

A topic page should have two layers:

- a topic overview shell
- a concept roadmap

The overview shell should show:

- topic title
- why this topic matters
- key outcomes
- estimated completion time
- continue CTA
- access to the related deck when available

The concept roadmap is the main action surface.
Each concept is a node in order, with clear completion states and a visible next step.

## Concept Experience

This is the most important part of the system.

### Concept definition

A concept is one coherent learning outcome, not a chapter fragment.

Good concept examples:

- `What an exponential function represents`
- `Properties of logarithms`
- `Stages of protein synthesis`
- `How to read a titration curve`

Bad concept examples:

- `All of functions`
- `Entire protein chapter`

### Concept player structure

Each concept is composed of `steps`.
The student moves step by step through a tight, guided sequence.

The concept player should support these step types:

- `Hook`
- `Explain`
- `Inspect`
- `Rule`
- `Worked Example`
- `Common Trap`
- `Quick Check`
- `Exam Lens`
- `Takeaway`

Not every concept needs every step type, but each concept must be intentionally composed.

### Tightened pacing rules

The concept player must be stricter than a normal article reader.

Rules:

- one primary idea per step
- one visual anchor per step when useful
- no long uninterrupted scroll inside the concept player
- no more than 80 to 120 words of primary teaching copy on a single step without interaction
- no more than 2 passive steps in a row before a student action
- every concept must include at least 2 interactions before completion
- every concept ends with a micro-quiz

The player should feel like `guided momentum`, not `reading endurance`.

### Interaction grammar

The interaction system should stay focused and reusable.

Supported concept interactions should favor:

- tap-to-reveal
- highlight annotation
- step ordering
- simple choice question
- drag match
- image hotspot
- fill one missing word or formula element

Avoid early overreach into complex simulations unless the concept truly requires it.

### Visual grammar

The visual system should make lessons feel expensive and cognitively clean.

Rules:

- strong typographic hierarchy
- one dominant focal area per step
- spacious margins and readable line lengths
- diagrams and formulas treated as premium first-class objects
- motion used to advance attention, not decorate everything
- subject-specific accents are allowed, but the overall product language stays unified

### Step composition guidance

Typical high-quality concept flows:

`Hook -> Explain -> Inspect -> Quick Check -> Rule -> Worked Example -> Common Trap -> Exam Lens -> Micro-Quiz`

or

`Hook -> Explain -> Rule -> Inspect -> Quick Check -> Takeaway -> Micro-Quiz`

### Micro-quiz

Every concept ends with a short quiz.

Recommended structure:

- 2 required items
- 1 challenge item when the concept genuinely benefits from extra difficulty

Question styles may include:

- recall
- interpretation
- rule application
- trap detection

Quiz outcomes:

- pass: concept marked complete
- partial struggle: show short correction and retry the missed item
- repeated struggle: concept can be left as `Needs Review` without blocking the entire subject

### Completion states

Concept states:

- `Locked`
- `Ready`
- `In Progress`
- `Completed`
- `Needs Review`

Topic completion should derive from concept progress rather than a manual topic checkbox.

## Lesson Content Architecture

Lessons should be authored as structured content objects, not free-form documents first.

Recommended authored model:

- course subject
- course unit
- course topic
- course concept
- course step
- concept quiz item
- asset attachments when the step uses diagrams, formulas, tables, or images

Each step should have:

- type
- title
- short copy payload
- structured data payload when needed
- order index
- asset references
- flashcard extraction candidates when the author marks a rule, definition, diagram, or trap as save-worthy

This allows different subjects to share one player while still supporting different pedagogical patterns.

## Flashcards Experience

### Flashcards home

The first Flashcards screen should prioritize use over catalog browsing.

Top sections:

- `Due now`
- `Continue last deck`
- `Platform decks`
- `My decks`

This screen should not feel like a folder tree first.
It should feel like a review command center.

### Deck model

There is no hard product-level deck typing system.

A deck is a deck, but it may carry optional metadata such as:

- subject link
- unit link
- topic link
- source type
- ownership

That metadata supports filtering and organization without constraining the student's mental model.

### Deck ownership model

Deck sources:

- platform-seeded deck
- user-created deck
- user-copy of platform deck

Editing rules:

- platform decks remain immutable at the shared layer
- student edits produce private user state
- students may add cards to their own decks freely
- students may duplicate platform cards into personal decks
- students may remove cards from personal decks without affecting the source deck

### Organization model

The product should support both structure and freedom.

The default experience should make deck discovery easy through curriculum-aware filters:

- by subject
- by unit
- by topic when relevant

But the student should also be able to:

- combine cards from multiple topics into one unit deck
- build exam-season cram decks
- build `mistakes`, `definitions`, or `must memorize` decks

The right architecture is:

- optional curriculum associations
- flexible personal grouping
- no assumption that every topic must map to a deck

### Card forms

The first release should support a small, premium set of card forms:

- front/back text
- cloze
- image with hidden label or prompt
- ordered steps

This is enough to cover most BAC use cases without exploding authoring complexity.

### Review flow

Flashcard study sessions should be short, fast, and calm.

Recommended session order:

- due cards
- then new cards
- then optional overflow cards

Session actions:

- reveal
- correct / incorrect
- edit
- move to another deck
- duplicate
- remove from personal deck

The review loop should feel lightweight and daily, not like a second giant study application.

## Courses to Flashcards Bridge

This bridge is part of the premium value.

Within lessons, the student should be able to save selected learning atoms into flashcards, such as:

- definitions
- rules
- formulas
- labeled diagrams
- traps
- takeaways

The first implementation should not try to support arbitrary text selection everywhere.

A better first architecture is:

- authors mark selected step fragments as `flashcard candidates`
- the player exposes focused `Add to deck` or `Save card` actions on those fragments

This keeps quality high and keeps lesson markup manageable.

## Technical Architecture

### Existing foundations to reuse

Keep and reuse:

- `subjects`
- `subject_curricula`
- `topics`
- current student routing shell
- current topic and roadmap identity rules

Do not overload:

- training `roadmaps`
- `skills`
- practice session models

### New backend domains

Recommended backend modules:

- `apps/api/src/courses/*`
- `apps/api/src/flashcards/*`

Recommended contracts:

- `packages/contracts/src/courses.ts`
- `packages/contracts/src/flashcards.ts`

Recommended web surfaces:

- `apps/web/src/app/student/courses/*`
- `apps/web/src/app/student/flashcards/*`

### Recommended persistence model

Courses:

- `course_units`
- `course_unit_topic_links`
- `course_concepts`
- `course_steps`
- `course_step_assets`
- `course_quiz_items`
- `student_concept_progress`

Flashcards:

- `flashcard_decks`
- `flashcards`
- `flashcard_deck_cards`
- `user_flashcard_overrides`
- `flashcard_review_logs`
- `flashcard_deck_curriculum_links`

The exact Prisma field names may be normalized to repo conventions during implementation, but the boundary should stay:

- lesson delivery domain
- flashcard memory domain

## Rollout Strategy

### Phase 1: data and contracts foundation

Ship:

- Prisma schema additions
- API contracts
- seedable sample subject/course content
- flashcard seed model

### Phase 2: Courses shell

Ship:

- sidebar entry
- courses home
- subject page
- topic page
- concept player with 2 to 3 step types and micro-quiz

### Phase 3: Flashcards shell

Ship:

- flashcards home
- deck page
- study session
- editing and personal-copy behavior

### Phase 4: bridge

Ship:

- save card from lesson step
- link topic to suggested decks
- concept completion to deck recommendation

## Launch Constraints

To protect quality, the first release should start with a narrow content slice.

Recommended first-content launch shape:

- 1 subject fully premium
- 1 or 2 units deeply built
- enough concepts to validate the player
- enough decks to validate the review loop

This is better than broad but shallow coverage.

## Final Product Standard

When this feature family is working well, a student should be able to:

1. open `Courses`
2. choose a subject
3. move through a beautiful and cognitively tight topic journey
4. finish concept micro-quizzes
5. save important facts into flashcards
6. open `Flashcards`
7. review what matters without chaos

The experience should feel:

- premium
- clear
- trustworthy
- calm
- academically serious

It should not feel like books pasted into a browser.
