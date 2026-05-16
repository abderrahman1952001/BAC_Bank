# BAC Bank / Miras Platform Design Agent Brief

Use this file as a self-contained product and UX brief for redesigning the
whole platform. It describes the platform vision, current feature set, page
map, learning architecture, user journeys, and redesign goals.

The current UI/UX feels awkward because the product has grown from several
strong pillars into a connected learning platform, but the interface still often
presents those pillars as separate rooms. The redesign should make the platform
feel like one sealed learning loop.

## 1. Product Identity

### Product Name

The product currently appears in the student UI as `مِراس`. The repository name
is `BAC_Bank`.

### Audience

Primary users are Algerian BAC students preparing for official exams. The
interface is Arabic-first, RTL-first, but must handle French scientific terms,
subject names, formulas, DNA/mRNA notation, math symbols, and official BAC
document context.

Secondary users are admins/operators who ingest, review, crop, publish, and
manage official BAC exam and theory content.

### Positioning

This is not a generic study dashboard, PDF library, or gamified flashcard app.
It is a premium BAC preparation platform that connects official source material,
guided learning, manipulation/visualization, practice, memory, and review.

The product promise:

> Learn the concept, see it move, remember the rule, apply it to official BAC
> questions, understand what broke, then return to the exact next action.

### Desired Feeling

The redesigned platform should feel:

- serious and premium
- calm under pressure
- academically trustworthy
- fast to scan
- centered on the student's next useful action
- coherent across pages
- built for repeated daily study, not one-time exploration

The platform should not feel:

- like a marketing landing page
- like a pile of cards
- like unrelated tools stitched together
- childish or game-like
- like a PDF viewer with decoration
- like an admin console repurposed for students

## 2. Strategic Platform Model

### Main Pillars

Do not add a new top-level pillar for the redesign unless there is an extremely
strong reason. The current pillar set is enough:

- My Space
- Courses
- Library
- Lab
- Training
- Flashcards
- Billing

For admins:

- Intake
- Drafts
- Crops
- Library
- Sources
- Billing

### The Missing UX Idea

The pillars should not feel like separate products. They should communicate
through a shared learning spine:

```text
Courses -> Lab -> Flashcards -> Training -> Mistakes/Weakness -> My Space
   ^                                                        |
   |--------------------------------------------------------|
```

A sealed platform should feel like:

1. The student learns a concept in Courses.
2. The student tests intuition in Lab.
3. The student saves the rule, trap, formula, or observation to Flashcards.
4. The student applies the concept in Training.
5. The student fails, struggles, reveals a solution, or marks something hard.
6. The app knows what broke.
7. The app sends the student to the right Course step, Lab mission, card, drill,
   or official source.

### Internal Product Spine

The platform should be designed around these ideas:

- `Subject`: the school subject, such as Mathematics, Natural Sciences, Physics.
- `Curriculum`: a BAC curriculum version for a subject and stream.
- `CurriculumNode`: where something sits in the syllabus. Examples: unit, topic,
  concept, skill.
- `LearningTarget`: the smallest teachable/testable/reviewable thing. This is
  the actual atom layer.
- `LearningTargetKind`: the kind of atom: conceptual understanding, procedure,
  formula application, visual interpretation, memory fact, method, common trap,
  exam structure, BAC marking pattern.
- `StudentMasteryBucket`: the student's current state for a node or target:
  new, watch, weak, recovering, solid.
- `StudentLearningEvent`: a record that the student studied, reviewed,
  practiced, started a lab mission, completed a lab mission, created a card, or
  reviewed a card.

Design implication: every page should be able to explain where it sits in this
spine and what action it helps the student take next.

## 3. Current Implementation State

This platform is already more than a static content site.

### Already Present

- Student navigation with My Space, Courses, Library, Lab, Training,
  Flashcards, Billing.
- Admin navigation with Intake, Drafts, Crops, Library, Sources, Billing.
- Curriculum/courses surface with subject, topic, concept, concept player,
  micro-quiz, Lab links, and save-to-flashcard actions.
- Training surface with drill, simulation, weak-point drill, session player,
  review queue, mistake vault, and saved exercises.
- Library surface for official BAC paper browsing and source trust.
- Flashcards API and UI for decks, due cards, card creation, deck enrollment,
  review scheduling, and review logs.
- Lab API and UI for tools, missions, mission attempts, exit checks, and
  completion state.
- Current Lab tools:
  - Math: Function Explorer
  - SVT: DNA to Protein
- My Space dashboard that aggregates recent sessions, curriculum journeys,
  mistakes, saved exercises, due flashcards, weak points, and Lab progress.
- Billing/entitlements for free vs premium capabilities.
- Admin ingestion/review/crop/library workflows for official content.

### Partially Present

- A deterministic next-action system exists only in a narrow way. Curriculum
  journeys can recommend topic drill, review mistakes, or paper simulation.
- My Space locally prioritizes due cards, mistakes, weak points, active
  sessions, and Lab status, but there is not yet one central next-action router
  that ranks all possible actions across all pillars.
- Lab missions and flashcards write learning events, but the UI does not yet
  fully expose the learning graph as one connected map.
- Courses can save current steps to flashcards, but the authoring model for
  explicit flashcard candidates is still young.

### Not Yet Sealed

The product is sealed at navigation and mostly sealed at the data model. It is
not yet sealed at recommendation UX.

The redesign should anticipate a future central `NextActionRouter` that returns
one ranked queue of actions:

- continue a course concept
- open a related Lab mission
- review due flashcards
- retry an open mistake
- start a weak-point drill
- run an official simulation
- revisit a prerequisite concept
- inspect the official source in Library

The design should make room for this without requiring AI to be the glue.

## 4. Design System Direction

The current design system says:

- Dark mode is default.
- Visual direction is `Midnight Slate & Electric Emerald`.
- Main dark background: carbon/navy, not pure black.
- Emerald is scarce and meaningful: progress, success, lab instruments,
  selected/high-intent actions.
- Light mode is paper/ink.
- UI should be calm, dense, operational.
- Avoid decorative gradient blobs, heavy card mosaics, and one-note palettes.
- Prefer full-width work surfaces, sidebars, rails, inspectors, and simple
  section bands over nested card stacks.
- Use local shadcn primitives for controls.

For the redesign, keep the premium academic direction, but improve structure,
hierarchy, spacing, affordances, page density, and cross-pillar flow. The design
can evolve visual language, but should not become a marketing SaaS template.

## 5. Redesign Goals

### Primary UX Goal

Make the product answer one question better than anything else:

> What should I do next, and why?

### Secondary Goals

- Make the learning loop visible across pages.
- Make the official source material feel trustworthy and close at hand.
- Reduce page awkwardness caused by too many cards with similar weight.
- Make navigation feel stable and obvious on desktop and mobile.
- Use progressive disclosure: show the next action first, details second.
- Make Courses, Lab, Flashcards, Training, and Library feel like parts of one
  platform.
- Design for Arabic text, math notation, long subject names, and mixed
  Arabic/French/scientific labels.
- Make admin workflows feel operational and efficient, not decorative.

### What To Avoid

- Do not add more top-level student sections.
- Do not bury My Space under decorative content.
- Do not make every item a card.
- Do not use giant hero sections on core app pages.
- Do not use generic empty illustrations as primary UX.
- Do not make the design depend on AI chat as the main navigation.
- Do not make Courses feel like a blog.
- Do not make Library feel like a file dump.
- Do not make Lab feel like a toybox.
- Do not make Flashcards feel disconnected from course/training context.

## 6. Student Information Architecture

### Global Student Shell

The student shell should support:

- persistent top-level navigation
- active section state
- quick access to My Space
- clear premium/billing state when relevant
- mobile bottom navigation or a compact mobile equivalent
- RTL layout
- dark default

Recommended student nav order:

1. My Space
2. Courses
3. Library
4. Lab
5. Training
6. Flashcards
7. Billing

### Student Pages And Routes

#### Public/Auth

- `/`: public landing or redirect entry.
- `/auth`: auth landing.
- `/auth/sign-in/[[...sign-in]]`: sign in.
- `/auth/sign-up/[[...sign-up]]`: sign up.
- `/onboarding`: onboarding after signup.
- `/post-auth`: post-auth routing.

#### My Space

- `/student/my-space`
  - Main student command center.
  - Aggregates active session, recent activity, due flashcards, weak points,
    mistake vault, saved exercises, curriculum journeys, Lab progress.
  - Should become the primary next-action surface.

- `/student/my-space/curriculum/[subjectCode]`
  - Subject-specific curriculum journey.
  - Shows node mastery, open mistakes, next action, and remediation.

- `/student/my-space/roadmaps/[subjectCode]`
  - Legacy/compat route. Design should prefer the curriculum route language.

#### Courses

- `/student/courses`
  - Subject academy/home page.
  - Shows subjects, progress, units, concepts, continue action.

- `/student/courses/[subjectCode]`
  - Subject course map.
  - Shows units/topics, progress, locked/ready/in-progress/completed states.

- `/student/courses/[subjectCode]/topics/[topicSlug]`
  - Topic overview and concept roadmap.
  - Should show why topic matters, outcomes, related deck, related Lab tools,
    and next concept.

- `/student/courses/[subjectCode]/topics/[topicSlug]/concepts/[conceptSlug]`
  - Concept player.
  - Step-based learning, visual anchor, micro-interactions, micro-quiz, save
    step as flashcard, related Lab links.

#### Library

- `/student/library`
  - Official BAC source browser.
  - Should make trust and provenance obvious.
  - Needs strong filters: stream, subject, year, session, paper/correction.

- `/student/library/[streamCode]/[subjectCode]/[year]/[examId]/[sujetNumber]`
  - Official paper/session viewer.
  - Should support exercise/question navigation, correction blocks, saved
    exercise state, mistake context, and source assets.

- `/student/library/ingestion-preview/[jobId]`
  - Student/admin preview route for newly ingested content.

#### Lab

- `/student/lab`
  - Lab home with subject groups, tools, missions, progress.
  - Should show tools as curriculum-linked instruments, not random toys.

- `/student/lab/math/function-explorer`
  - Interactive function graphing/inspection tool.
  - Supports presets, expression input, graph, value table, roots/intersections
    when reliable, mission panel.

- `/student/lab/svt/dna-to-protein`
  - Interactive DNA -> mRNA -> amino-acid pipeline.
  - Supports sequence input, mutation controls, consequence comparison, mission
    panel.

#### Training

- `/student/training`
  - Training mode selector.
  - Entry to drill, simulation, weak-point drill.

- `/student/training/drill`
  - Drill builder.
  - Filters by subject, topic/curriculum node, years, stream/scope.

- `/student/training/simulation`
  - Official exam simulation builder.
  - Timed full paper experience.

- `/student/training/weak-points`
  - Weak-point session builder.
  - Uses mistake/weakness signals to choose targeted practice.

- `/student/training/[sessionId]`
  - Session player.
  - Shows exercises/questions, answer/evaluation state, hints, method support,
    solution reveal, correction, save-to-flashcard, review outcome.

#### Flashcards

- `/student/flashcards`
  - Flashcard home, due review, decks, create deck/card, enroll platform decks,
    review ratings.
  - Should prioritize due review and contextual cards over deck management.

#### Billing

- `/student/billing`
  - Plan/entitlement management.

- `/student/billing/success`
  - Successful checkout/upgrade state.

- `/student/billing/failure`
  - Failed checkout state.

## 7. Admin Information Architecture

Admin tools should be redesigned as operational workflows. They should be dense,
clear, and optimized for repeated review/correction, not student-like.

### Admin Pages And Routes

- `/admin`
  - Admin entry/overview.

- `/admin/intake`
  - Upload/create ingestion jobs for official content.

- `/admin/drafts`
  - Draft queue/list.

- `/admin/drafts/[jobId]`
  - Ingestion review workspace.
  - Review extracted paper structure, exercises, questions, blocks, assets,
    uncertainties, and publish flow.

- `/admin/crops`
  - Crop review/asset workspace.
  - Used to inspect and adjust page crops/assets for official content.

- `/admin/library`
  - Published library management.

- `/admin/sources`
  - Source management and provenance.

- `/admin/billing`
  - Billing/admin subscription operations.

### Admin UX Principles

- Show job state clearly.
- Keep queues scannable.
- Avoid large decorative panels.
- Use split-pane review patterns for source image, structure tree, details, and
  actions.
- Make uncertainty visible.
- Make destructive/publish actions explicit.
- Preserve source trust: page images are authoritative for BAC extraction.

## 8. Feature Inventory By Pillar

### My Space

Purpose: Continue, decide, and recover.

Current features:

- active/recent session spotlight
- metrics for sessions, saved exercises, mistakes, due cards, Lab missions
- recent study activity
- curriculum journey summaries
- weak-point insights
- saved exercises
- mistake vault/open mistakes
- due flashcard prompt
- Lab progress prompt

Redesign direction:

- Make My Space a command center, not a dashboard mosaic.
- Lead with the best next action and a reason.
- Show secondary actions as a compact queue.
- Explain how each recommendation maps to the learning loop.
- Keep recent activity and history accessible but not dominant.

### Courses

Purpose: Learn.

Current features:

- subject cards
- subject map with units/topics
- topic overview
- concept roadmap
- concept player
- step types: hook, explain, inspect, rule, worked example, common trap, quick
  check, exam lens, takeaway
- visuals/interactions
- micro-quiz
- related Lab links
- save current course step as flashcard

Redesign direction:

- Make Courses feel like guided concept journeys, not content pages.
- Use clear progress states and next concept.
- Show related Lab, Flashcards, and Training actions near the concept, but avoid
  clutter during reading.
- The concept player should feel focused: one main idea per screen, clear
  progress, visible completion.

### Library

Purpose: Trust the source.

Current features:

- official exam/correction browsing
- published sessions
- source and metadata context
- exercise/question targeting
- saved/mistake links from My Space and Training

Redesign direction:

- Treat Library as the evidence room.
- Make official origin, year, stream, subject, and correction state obvious.
- Provide quick paths from a mistake or training question back to the exact
  source location.

### Lab

Purpose: See and manipulate.

Current features:

- Lab home
- Function Explorer
- DNA to Protein
- DB-backed Lab tools and missions
- mission attempts and completion
- exit checks
- learning events
- links to curriculum nodes, learning targets, and course lessons

Redesign direction:

- Make Lab feel like a workbench.
- Tools should show the concept being manipulated, the BAC use case, and a small
  mission/check.
- Mission state should be visible but not overpower the tool.
- Lab should link back to Courses and Training.

### Training

Purpose: Apply.

Current features:

- drill builder
- simulation builder
- weak-point builder
- session player
- answer/evaluation state
- solution reveal and correction
- hints/method support
- review queue
- mistake vault
- saved exercises
- rollups for curriculum nodes and learning targets

Redesign direction:

- Make Training feel like the exam practice engine.
- The builder should be fast and clear, with fewer competing panels.
- The session player should keep the question, answer state, support, and next
  action visually stable.
- Mistakes should immediately feel recoverable, not punitive.

### Flashcards

Purpose: Remember.

Current features:

- decks
- platform/user decks
- default inbox deck
- card creation
- course-step cards
- official-correction cards
- due card review
- ratings: again, hard, good, easy
- spaced review state
- review logs
- learning events
- optional links to subject, curriculum node, learning target, course lesson,
  course step, or exam node

Redesign direction:

- Prioritize the due review session.
- Make card context visible: where did this card come from and what concept does
  it support?
- Deck management should be secondary.
- Saving a card from Courses/Training should feel lightweight and successful.

### Billing

Purpose: Explain access and manage subscription.

Current features:

- free/premium entitlement states
- drill/simulation quotas
- premium weak-point capability
- billing success/failure pages

Redesign direction:

- Keep billing clear and non-intrusive.
- Show what is unlocked in learning terms, not just feature names.

## 9. Cross-Pillar Learning Loop

The redesign should make these transitions feel natural:

### Course To Lab

When a concept has a related Lab tool, the concept player should offer:

- open tool
- start related mission
- return to this concept after Lab

### Course To Flashcards

When a step contains a rule, formula, trap, exam lens, or takeaway, the student
can save it as a card.

The ideal future is authored flashcard candidates, not arbitrary text selection
everywhere.

### Training To Mistake Recovery

When the student misses, skips, reveals, flags, or marks a question hard:

- update mastery signals
- add/open review queue item
- show a recovery path
- optionally create a flashcard from the correction
- offer a weak-point drill when enough signal exists

### Mistake To Course/Lab/Card/Drill

The mistake detail should eventually show:

- what concept broke
- what learning target was tested
- recommended course step
- related Lab mission
- due card or create-card action
- retry drill

### Flashcards To Mastery

Reviewing flashcards should update memory state and emit learning events. The
UI should make this feel connected to the learning journey, not isolated.

### My Space As Router

My Space should read the whole loop and answer:

- continue this session
- fix this weakness
- review these cards
- open this Lab mission
- revisit this course concept
- start this drill

## 10. Data Concepts The Design Should Respect

The design agent does not need to design the database, but should understand the
product objects.

### Curriculum

The official learning structure for a subject and stream.

### Curriculum Node

A syllabus location: unit, topic, concept, skill, optional portal.

### Learning Target

The actual atom of learning. Examples:

- definition
- formula
- rule
- method
- common trap
- graph-reading pattern
- proof step
- lab observation
- BAC marking habit

### Rollup

A student-level aggregate of performance and weakness for curriculum nodes and
learning targets.

### Review Queue / Mistake Vault

Open items generated from missed, hard, skipped, revealed, or flagged work.

### Lab Mission

A small guided task inside a Lab tool that can be started, completed, failed,
and linked to curriculum/learning targets.

### Flashcard State

Per-student spaced review state: due date, interval, ease, review count, lapse
count.

### Learning Event

An event emitted by actions such as flashcard review, Lab mission start/finish,
or other future study actions.

## 11. Visual And Interaction Requirements

### Arabic / RTL

- Arabic should be first-class, not squeezed into LTR templates.
- Align navigation, labels, and reading flow for RTL.
- Mixed scientific notation must still read cleanly.
- Avoid tiny Arabic labels inside crowded pills.

### Density

The app is a study tool. It should be dense enough for repeated use, but not
claustrophobic.

Use:

- rails
- split views
- compact lists
- progress strips
- inspectors
- sticky action bars
- meaningful empty states

Avoid:

- nested cards
- repetitive card grids
- oversized hero sections in app workflows
- page sections that all have equal visual weight

### Navigation

The current sections are correct. The redesign should improve:

- active state clarity
- mobile ergonomics
- cross-pillar shortcuts
- breadcrumb/context within deep pages
- "return to next action" behavior

### Status And Progress

Every surface should show state clearly:

- not started
- in progress
- due
- weak
- recovering
- solid
- completed
- locked/free/premium
- source reviewed/unreviewed where relevant

### Actions

Actions should be phrased as student outcomes:

- Continue
- Review due cards
- Fix this weakness
- Start mission
- Retry mistake
- Open source
- Save as flashcard
- Begin simulation

Avoid vague actions:

- Explore
- Learn more
- Open
- Manage

unless the context is obvious.

## 12. Recommended Redesign Structure

### My Space Layout

Recommended hierarchy:

1. Primary next action panel
2. Compact next-action queue
3. Current learning loop status
4. Recent activity
5. Mistakes/saved/source shortcuts

The primary panel should answer:

- action
- reason
- estimated effort
- linked concept/target
- destination

### Course Concept Player Layout

Recommended hierarchy:

1. Slim course/context header
2. Step progress rail
3. Main step content
4. Visual/interaction area
5. Contextual actions: save card, open Lab, quick quiz
6. Next/previous controls

### Training Session Layout

Recommended hierarchy:

1. Stable question/source header
2. Main prompt area
3. Answer/evaluation controls
4. Support drawer or side panel
5. Correction/reveal area
6. Review actions: hard/missed/save/flag

### Lab Tool Layout

Recommended hierarchy:

1. Tool title and BAC use case
2. Main interactive instrument
3. Observations/output
4. Mission panel
5. Related course/training links

### Flashcards Layout

Recommended hierarchy:

1. Due review player
2. Source/concept context
3. Rating controls
4. Deck overview
5. Create/edit flows

### Library Layout

Recommended hierarchy:

1. Filters/search
2. Official source list
3. Selected paper/exercise viewer
4. Correction/source metadata
5. Save/review/training actions

### Admin Review Layout

Recommended hierarchy:

1. Queue/status header
2. Split source image/document viewer
3. Structure tree
4. Selected block/detail editor
5. Validation/uncertainty panel
6. Publish/resolve actions

## 13. Page-Level Redesign Checklist

For every redesigned page, answer:

- What is the student's/admin's primary job here?
- What is the next action?
- What information is needed before taking that action?
- What state changed after the action?
- Where does the user go next?
- What pillar does this page connect to?
- What source/trust/progress context is visible?
- What can be hidden until needed?

## 14. AI Layer Guidance

AI should be an enhancer, not the architecture.

Good AI use:

- explain why an action is recommended
- personalize wording
- draft hints or summaries
- compare mistakes
- help generate flashcard drafts
- explain an official correction

Bad AI use:

- be the only way to navigate
- invent recommendations without deterministic backing
- replace source trust
- hide the curriculum graph
- make core flows depend on chat

Design should leave room for AI explanations, but the deterministic loop must
work if AI is disabled.

## 15. Design Agent Deliverables

A design AI agent redesigning this platform should produce:

1. A revised information architecture for student and admin surfaces.
2. A global shell/navigation proposal for desktop and mobile.
3. Page designs for:
   - My Space
   - Courses home
   - Subject course map
   - Topic overview
   - Concept player
   - Library home/source viewer
   - Lab home
   - Function Explorer
   - DNA to Protein
   - Training home
   - Drill builder
   - Simulation builder
   - Weak-point builder
   - Session player
   - Flashcards home/review
   - Billing
   - Admin intake
   - Admin drafts queue
   - Admin draft review
   - Admin crops
   - Admin library/sources
4. Component system proposals:
   - action queue item
   - mastery badge/status
   - learning target chip
   - official source badge
   - course step player
   - lab mission panel
   - flashcard review controls
   - training question panel
   - mistake recovery panel
   - admin review split pane
5. Interaction flows:
   - course -> lab -> course
   - course -> flashcard
   - training mistake -> recovery
   - due flashcard review
   - My Space next-action routing
   - admin ingestion review -> publish
6. Responsive behavior for desktop, tablet, and mobile.
7. Accessibility and RTL notes.

## 16. Non-Negotiables

- Keep the current top-level student pillars.
- Keep My Space as the decision/continuation surface.
- Keep Library as the source-of-truth surface.
- Keep Training as the practice/application surface.
- Keep Courses as guided theory, not articles.
- Keep Lab as interactive manipulation, not decoration.
- Keep Flashcards as memory/review, not a separate mini-product.
- Make official BAC source trust visible.
- Preserve Arabic-first RTL UX.
- Do not make AI the core navigation model.
- Design for deterministic recommendations.
- Avoid adding complexity just to make the redesign look novel.

## 17. Detailed Page UX By Route

This section explains the desired UX inside each major page. It is intentionally
more detailed than the route map so a design agent can redesign screens without
having to infer the job of each route.

### Public Entry: `/`

Primary job: route the right person to the right place quickly.

The public entry should not behave like a large marketing site once the user is
already signed in. For anonymous visitors, it can explain the product promise in
a concise way: official BAC source material, guided courses, training,
flashcards, and Lab are connected in one loop. For signed-in students, it should
redirect or offer a clear path to My Space. For admins, it should route toward
the admin workspace.

Recommended UX:

- Keep the first viewport focused on the product identity and one clear action.
- Show the platform loop visually, but do not over-explain every feature.
- Make sign in/sign up obvious.
- If a user is authenticated, avoid making them re-read public marketing copy.
- Use real product signals, such as official BAC, courses, training, and
  progress, instead of generic study illustrations.

### Auth Landing: `/auth`

Primary job: choose sign in or sign up.

This page should be extremely simple. It should remind users they are entering a
BAC preparation workspace and then present authentication actions. It should not
compete with Clerk's sign-in/sign-up screens.

Recommended UX:

- Use a compact centered panel or split shell with brand context.
- Keep copy short.
- Make the difference between new account and returning account obvious.
- Preserve dark mode and RTL alignment.

### Sign In: `/auth/sign-in/[[...sign-in]]`

Primary job: let a returning user authenticate with minimal friction.

Recommended UX:

- Keep the auth form visually quiet.
- Show brand and trust context, not a full marketing pitch.
- Provide a clear route to sign up.
- After successful auth, route to the user's relevant workspace.
- Error messages should be direct and not buried.

### Sign Up: `/auth/sign-up/[[...sign-up]]`

Primary job: create an account and prepare for onboarding.

Recommended UX:

- Keep the form focused.
- Set expectation that stream/level choices may follow during onboarding.
- Show privacy/trust reassurance in plain language.
- Avoid asking for study preferences before the account exists unless the auth
  system already supports it cleanly.

### Onboarding: `/onboarding`

Primary job: configure the student enough for useful recommendations.

This page should collect only the minimum profile inputs needed to personalize
study: stream, target subjects, and possibly current BAC year/session context.
It should feel like setting up a study cockpit, not filling a long form.

Recommended UX:

- Use a short stepper or one-page structured setup.
- Ask for stream first because it affects subject offering and coefficients.
- Let students adjust subjects later.
- Explain why each input matters.
- End with a clear transition into My Space.

Important states:

- first-time student
- partially completed onboarding
- returning user trying to edit profile
- missing stream/profile data

### Post Auth: `/post-auth`

Primary job: route by role and account state.

This should be mostly invisible. If shown, it should communicate that the app is
loading the correct workspace and should recover cleanly if account state is
missing.

Recommended UX:

- Minimal loading state.
- If routing fails, show a plain recovery action.
- Do not expose implementation details.

### My Space: `/student/my-space`

Primary job: decide and continue.

My Space is the heart of the student experience. It should not feel like a
dashboard made from all available widgets. It should feel like the platform has
looked at the student's work and is calmly saying: "Here is the next best move,
and here is why."

Recommended page hierarchy:

1. Primary next action.
2. Secondary action queue.
3. Learning loop status.
4. Recent activity/history.
5. Mistakes, saved items, and source shortcuts.

Primary next action UX:

- Large enough to be unmistakable, but not a decorative hero.
- Shows one action label, such as "Review 8 due cards" or "Fix functions".
- Includes a short reason: due today, weak after recent training, unfinished
  session, open mistake, incomplete Lab mission.
- Shows estimated effort when available.
- Shows the destination pillar with an icon/badge.
- Includes one primary button and one secondary context link.

Secondary queue UX:

- Compact ordered list of actions across pillars.
- Each item should include:
  - action title
  - reason
  - subject/concept/source context
  - effort or count
  - destination
- Queue items should not all look like equal cards. The order matters.

Learning loop status UX:

- Show the student's current loop as a small progress strip:
  - Learning
  - Seeing
  - Remembering
  - Applying
  - Recovering
- The strip should not be gamified. It is orientation, not reward confetti.

Content modules:

- Active session: continue, see progress, close/return.
- Due flashcards: due count, first card context, review action.
- Mistake vault: open mistakes, strongest recovery path.
- Weak points: subject/topic/learning-target explanation.
- Curriculum journeys: per-subject mastery and next action.
- Lab: mission completion count and next mission.
- Recent activity: compact timeline, not dominant.

Empty state:

- If no activity exists, My Space should offer 2-3 starter actions:
  - choose a course
  - start a drill
  - open library
- It should not look broken.

### Subject Curriculum Journey: `/student/my-space/curriculum/[subjectCode]`

Primary job: understand a subject's mastery and choose remediation.

This page is the subject-level control room. It should connect curriculum
progress, weak nodes, open mistakes, and practice routes.

Recommended layout:

- Header with subject name, curriculum title, progress, and last update.
- Top next-action panel for this subject.
- Mastery map grouped by units/sections.
- Weakest nodes list.
- Open mistakes section.
- Related actions: start drill, review mistakes, open courses, open official
  sources.

Node UX:

- Every curriculum node should show:
  - title
  - status: not started, in progress, needs review, solid
  - progress/weakness indicator
  - action when relevant
- Weak nodes should explain why they are weak: missed, hard, skipped, revealed,
  flagged.

Mistake UX:

- Mistakes should feel recoverable.
- Each mistake should show source, question label, reason, and retry/review
  action.
- If the system knows related learning targets, show them as context.

### Legacy Roadmap: `/student/my-space/roadmaps/[subjectCode]`

Primary job: compatibility only.

The redesign should visually align this route with the curriculum journey page,
but copy and navigation should prefer "curriculum journey" or student-facing
Arabic wording instead of old roadmap internals.

Recommended UX:

- If still accessible, make it look identical to the current curriculum journey
  page.
- Avoid designing a second mental model.
- Provide graceful migration language if needed.

### Courses Home: `/student/courses`

Primary job: choose or continue a subject course.

This page should feel like entering academies or guided subject paths, not
browsing articles.

Recommended hierarchy:

1. Continue learning shortcut if progress exists.
2. Subject course list.
3. Summary metrics: subjects, units, concepts, progress.
4. Optional search/filter.

Subject item UX:

- Subject name.
- Progress percent.
- Unit/concept count.
- Continue topic/concept if available.
- State: new, in progress, needs review, completed.
- One primary action: continue/open map.

Design notes:

- Avoid huge cards for every subject.
- A dense list with strong progress affordances may work better than a grid.
- Make subjects scannable in Arabic and French/scientific contexts.

Empty/error state:

- If courses fail to load, show a retry path and link back to My Space.
- Do not imply the student has no courses unless that is true.

### Course Subject Map: `/student/courses/[subjectCode]`

Primary job: show the ordered learning journey for one subject.

The student should understand what is available, where they are, and what to
learn next.

Recommended layout:

- Subject header with progress and continue button.
- Unit sections with topic rows/nodes.
- A sticky or prominent "next concept" action.
- Optional side summary: due cards, weak related topics, recommended Lab tools.

Unit/topic UX:

- Units should behave like stages.
- Topics should show:
  - title
  - short description
  - progress
  - concept count
  - status
  - linked Lab/deck badges if available
- Locked states should explain why they are locked, if locking exists.

Cross-pillar actions:

- If a topic is weak from training, show "Needs review" and route to topic or
  drill.
- If a related Lab tool exists, show it as a contextual affordance.
- If cards are due for this subject/topic, show a small review shortcut.

### Course Topic Page: `/student/courses/[subjectCode]/topics/[topicSlug]`

Primary job: orient the student inside a topic and choose the next concept.

Recommended layout:

- Topic header: title, parent unit, why it matters, progress.
- Outcome list: what the student will be able to do.
- Concept sequence.
- Context rail: related Lab, related flashcards, training drill.

Concept row/node UX:

- Shows concept title, role, estimated time, progress/completion.
- Current/next concept is visually clear.
- Completed concepts remain accessible.
- Concepts with common traps or exam lens can have small signals.

Page actions:

- Continue next concept.
- Review topic cards.
- Open related Lab.
- Start topic drill.

### Course Concept Player: `/student/courses/[subjectCode]/topics/[topicSlug]/concepts/[conceptSlug]`

Primary job: teach one concept with focused momentum.

The concept player should not feel like a long article. It should feel like a
guided sequence where every screen has one idea and one reason to continue.

Recommended layout:

- Slim context header: subject, topic, concept, progress.
- Step navigation/progress rail.
- Main teaching panel.
- Visual/interaction panel when relevant.
- Contextual action rail for Lab, flashcard, quiz.
- Bottom or sticky previous/next controls.

Step UX:

- One primary idea per step.
- Title and short body.
- Bullets only when they improve scanning.
- Visuals should be close to the explanation.
- Interactions should be clear, lightweight, and obviously answerable.
- Avoid long scroll blocks inside a step.

Step types:

- Hook: create curiosity or exam relevance.
- Explain: build the idea.
- Inspect: ask the student to observe something.
- Rule: state the reusable rule.
- Worked example: show transfer into a problem.
- Common trap: name a likely error.
- Quick check: small interaction.
- Exam lens: connect to BAC marking/thinking.
- Takeaway: compress the concept.

Flashcard action:

- "Save as flashcard" should be available on useful steps.
- Success should be visible and calm.
- The card should inherit course step/context where possible.

Lab action:

- If a related Lab tool exists, show "Try this in Lab" near relevant steps.
- If a Lab mission exists, show the mission and its state.

Quiz UX:

- The micro-quiz should feel like concept completion, not a separate exam.
- Show result and correction clearly.
- On failure, suggest retry, previous step, Lab, or drill.

### Library Home: `/student/library`

Primary job: find and trust official BAC source material.

The Library is the source-of-truth room. It should feel archival, precise, and
fast to filter.

Recommended layout:

- Filter/search bar: stream, subject, year, session, document type.
- Result list/table grouped by year or subject.
- Source status/provenance badges.
- Quick-open actions for paper and correction.
- Recent/opened sources if useful.

Result item UX:

- Year.
- Subject.
- Stream.
- Session/sujet.
- Paper/correction availability.
- Published/reviewed status.
- Exercise count or source completeness when available.

Design notes:

- Avoid generic document cards with little metadata.
- Official source trust is the reason this page exists.
- Make exactness feel good: labels, dates, correction availability, provenance.

### Library Source Viewer: `/student/library/[streamCode]/[subjectCode]/[year]/[examId]/[sujetNumber]`

Primary job: inspect an official paper/correction and act on exact exercises.

Recommended layout:

- Source header: BAC year, subject, stream, sujet, correction/source status.
- Exercise/question navigator.
- Main content viewer.
- Correction/hint/rubric area.
- Actions: save, flag, start training from this topic/source, create
  flashcard, return to mistake/session.

Viewer UX:

- Make it easy to jump between exercises and questions.
- Preserve source context as the student scrolls.
- If viewing from a mistake, highlight the target question.
- If solution/correction exists, make it clearly separate from prompt.
- If page images are available, source image access should feel authoritative.

States:

- source loaded
- source incomplete
- correction missing
- target exercise/question not found
- saved/bookmarked
- flagged/open mistake

### Ingestion Preview: `/student/library/ingestion-preview/[jobId]`

Primary job: preview newly ingested content before or around publication.

Recommended UX:

- Show job/source identity.
- Show structure preview: variants, exercises, questions, assets.
- Make uncertainty visible.
- Provide clear return route to admin or library depending on role/context.
- Do not make this look like normal trusted Library content until published.

### Lab Home: `/student/lab`

Primary job: choose a tool or continue a mission.

Lab home should feel like a curriculum-linked workbench. It should not be a
gallery of toys.

Recommended hierarchy:

1. Continue active/incomplete Lab mission if any.
2. Tool list grouped by subject.
3. Mission progress summary.
4. Related course/training suggestions.

Tool item UX:

- Tool title.
- Subject.
- BAC use case.
- Mission count and completed count.
- Related concept/topic labels if available.
- Primary action: open tool.

Mission UX:

- Mission title and goal.
- State: not started, in progress, completed, failed.
- Start/continue action.
- Exit check should feel like a short confirmation, not a test wall.

### Function Explorer: `/student/lab/math/function-explorer`

Primary job: manipulate a mathematical function and connect graph behavior to
BAC reasoning.

Recommended layout:

- Header: tool name, Math Lab, BAC use case.
- Expression/preset controls.
- Main graph area.
- Observation panel: roots, values, non-finite gaps, table, notes.
- Mission panel.
- Related course/training actions.

Interaction UX:

- Presets should give immediate useful examples.
- Expression input should validate gently.
- Unsupported expressions should show clear limitations.
- Graph should not claim symbolic certainty when only numerical sampling is
  available.
- The value table should support BAC-style reading: f(x), sign, roots, notable
  behavior.

Mission UX:

- Mission can preselect a preset/expression.
- Student completes by submitting the required observation.
- Exit-check feedback should explain what to adjust if wrong.

### DNA To Protein: `/student/lab/svt/dna-to-protein`

Primary job: make the DNA -> mRNA -> amino-acid chain mechanism visible and
test mutation consequences.

Recommended layout:

- Header: tool name, SVT Lab, BAC use case.
- DNA input and presets.
- Original pipeline: DNA, mRNA codons, amino-acid chain.
- Mutation controls: substitution, insertion, deletion.
- Mutated pipeline.
- Consequence summary.
- Mission panel.

Interaction UX:

- Normalize DNA input visibly.
- Warn about invalid bases or incomplete codons.
- Show codon grouping clearly.
- Compare original vs mutated sequence side by side.
- Classify consequences: no visible chain change, substitution, premature stop,
  frameshift.
- Keep scientific terms readable in mixed Arabic/Latin notation.

Mission UX:

- Mission should ask for an observation, such as identifying frameshift or
  protein-chain change.
- Completion should link back to the related course concept or training drill.

### Training Home: `/student/training`

Primary job: choose the right practice mode.

Recommended layout:

- Header with quotas/entitlements.
- Three practice modes:
  - drill
  - simulation
  - weak-point drill
- Current plan/access summary.
- Recent/continue session shortcut if relevant.

Mode item UX:

- Explain when to use the mode.
- Show quota/access state.
- Use one primary action per mode.
- Locked premium mode should explain value and route to billing.

### Drill Builder: `/student/training/drill`

Primary job: create a focused practice session.

Recommended layout:

- Subject selection.
- Topic/curriculum node selection.
- Year/session filters.
- Stream/scope filters if relevant.
- Preview of expected session.
- Start button.

Builder UX:

- Make defaults smart.
- Show how many exercises/questions match.
- Explain empty filter results.
- Let students start quickly, then refine if needed.
- Avoid making every filter equally visually loud.

### Simulation Builder: `/student/training/simulation`

Primary job: start an official timed BAC simulation.

Recommended layout:

- Subject/stream/year selection.
- Paper/sujet selection.
- Duration and rules.
- Availability/quota.
- Start simulation action.

Simulation UX:

- Make time pressure explicit.
- Explain that progress persists if the student exits.
- Show official source context before starting.
- Avoid accidental starts: use a clear confirmation if needed.

### Weak-Point Builder: `/student/training/weak-points`

Primary job: start a targeted recovery session based on recent weakness.

Recommended layout:

- Subject/weakness summary.
- Recommended topics/learning targets.
- Reasons: missed, hard, skipped, revealed, flagged.
- Session preview.
- Start recovery drill.

UX tone:

- Supportive, not shaming.
- Say what broke and what will be practiced.
- Make it clear that weak-point sessions are based on evidence.
- If not enough data exists, offer starter drill options.

### Training Session Player: `/student/training/[sessionId]`

Primary job: answer questions, get support, review corrections, and produce
learning signals.

Recommended layout:

- Persistent session header: mode, progress, timer if simulation, source.
- Exercise/question navigation.
- Main question area.
- Answer/evaluation area.
- Support panel: hint, method, pedagogy, weak-point intro when applicable.
- Solution/correction/reveal area.
- Review actions: missed, hard, flag, save as flashcard.

Question UX:

- Keep prompt and answer state stable.
- Avoid layout jumps when revealing hints/solutions.
- Show official correction separately from student answer/evaluation.
- Use clear state labels: unanswered, answered, correct, incorrect, partial,
  skipped, solution viewed.

Simulation UX:

- Timer should be visible but not panic-inducing.
- Exiting should preserve session state.
- Completion should summarize performance and next recovery actions.

Drill UX:

- Encourage learning behavior: hints, reveal, review, continue.
- Mistake creation should feel like useful signal, not failure.

Flashcard action:

- Saving from a question should capture prompt/correction context.
- Success should not interrupt the session.

### Flashcards Home: `/student/flashcards`

Primary job: complete due review and manage memory material.

Recommended hierarchy:

1. Due review player.
2. Card context and source.
3. Rating controls.
4. Deck list/overview.
5. Create card/deck controls.

Due review UX:

- Show one card at a time.
- Front first, reveal answer.
- After reveal, show Again/Hard/Good/Easy.
- Make the next due scheduling feel lightweight, not mathematical.
- Show source context: course step, official correction, student mistake,
  subject, curriculum node, learning target.

Deck UX:

- Decks are useful, but secondary to review.
- Show deck title, card count, due count, source type.
- Platform decks should feel enrollable, not editable.
- Student decks should feel editable.

Create UX:

- Creating a quick card should be simple.
- Advanced context fields can stay hidden unless needed.
- Default inbox deck is acceptable for quick saves.

Empty state:

- If no due cards exist, show:
  - create a card
  - open Courses
  - open Training
- Avoid making the page feel finished forever.

### Billing: `/student/billing`

Primary job: understand plan, limits, and upgrade/manage subscription.

Recommended layout:

- Current plan.
- Capabilities and quotas.
- Premium value explained by learning outcomes.
- Plan comparison.
- Manage/upgrade action.
- Billing status/errors.

UX tone:

- Transparent and calm.
- Do not block study context with aggressive upsell.
- When a premium feature is locked elsewhere, Billing should explain exactly
  what unlocks.

### Billing Success: `/student/billing/success`

Primary job: confirm upgrade and send student back to study.

Recommended UX:

- Show success state.
- Summarize unlocked capabilities.
- Primary action: return to My Space or continue previous intended action.
- Secondary action: manage billing.

### Billing Failure: `/student/billing/failure`

Primary job: recover from failed checkout.

Recommended UX:

- Plain explanation.
- Retry action.
- Return to Billing/My Space.
- Avoid alarming language.

### Admin Overview: `/admin`

Primary job: orient admins to operational queues.

Recommended layout:

- Queue summaries: intake, drafts, crops, library/source issues.
- Recent jobs.
- Publishing/validation alerts.
- Shortcuts to core workflows.

This page should be functional. It does not need a student-style welcome
experience.

### Admin Intake: `/admin/intake`

Primary job: create or upload ingestion work.

Recommended layout:

- Source metadata form.
- File upload/dropzone.
- Stream/subject/year/session fields.
- Validation preview.
- Submit/start ingestion action.
- Recent intake jobs.

UX requirements:

- Make required metadata obvious.
- Prevent ambiguous source labeling.
- Show upload/progress/errors clearly.
- Do not hide failed intake jobs.

### Admin Drafts Queue: `/admin/drafts`

Primary job: choose the next draft to review.

Recommended layout:

- Filterable queue.
- Job status.
- Subject/year/stream/session.
- Extraction confidence or uncertainty count.
- Last updated/owner.
- Primary action: review draft.

Queue UX:

- Dense table/list is better than big cards.
- Sort by status, recency, uncertainty, publish readiness.
- Batch actions can exist only if safe.

### Admin Draft Review: `/admin/drafts/[jobId]`

Primary job: verify extracted structure against authoritative source images and
publish when correct.

This is one of the most important admin screens. It should support careful,
visual review.

Recommended layout:

- Top job/status header.
- Left or central source image/PDF viewer.
- Structure tree: variants, exercises, questions, blocks.
- Detail editor for selected node/block.
- Asset/crop panel where relevant.
- Uncertainty/validation panel.
- Publish or send-back actions.

UX requirements:

- Page images are authoritative. OCR/extracted text is helper material.
- Make selected source region and selected structure node correspond visually.
- Uncertainties should be impossible to miss.
- Publishing should require a clear readiness state.
- Keep destructive actions explicit.
- Keyboard navigation would be valuable for high-volume review.

### Admin Crops: `/admin/crops`

Primary job: inspect and adjust extracted visual assets/crops.

Recommended layout:

- Crop queue.
- Source page image.
- Crop overlay/editor.
- Extracted asset preview.
- Classification/status controls.
- Save/approve/reject actions.

UX requirements:

- The crop editor must prioritize visual accuracy.
- Show page number, document kind, role, and linked exercise/question.
- Provide zoom and fit controls.
- Make approved vs needs revision obvious.

### Admin Library: `/admin/library`

Primary job: inspect and manage published content.

Recommended layout:

- Published exam/session list.
- Filters by stream, subject, year, status.
- Completeness indicators.
- Link to student preview/source viewer.
- Admin actions for update/unpublish if supported.

UX requirements:

- Make public/student-visible state clear.
- Show provenance and publish date.
- Avoid mixing draft and published states ambiguously.

### Admin Sources: `/admin/sources`

Primary job: manage source records and provenance.

Recommended layout:

- Source list/table.
- Metadata: origin, subject, year, stream, session, file status.
- Link to ingestion jobs/published sessions.
- Validation issues.

UX requirements:

- Source identity must be precise.
- Duplicate or conflicting sources should be visible.
- Provenance should be easy to audit.

### Admin Billing: `/admin/billing`

Primary job: inspect billing/subscription state for users or plans.

Recommended layout:

- Search/filter users/accounts.
- Plan/subscription status.
- Entitlements/quotas.
- Billing actions if available.
- Audit/status messages.

UX requirements:

- Be careful with sensitive data.
- Avoid exposing unnecessary personal details.
- Make role/access boundaries clear.

## 18. One-Sentence North Star

Design `مِراس` as a calm, premium BAC command center where every page knows the
concept being learned, the official source behind it, the student's current
mastery, and the next action that closes the loop.
