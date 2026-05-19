# Study Desk Command Workflow

## Product Philosophy

BAC Bank is not a strict planner that claims to know the student's single best
task every day. Algerian BAC study life is too messy for that: school exams,
tutor homework, family pressure, weak subjects, memorization, official papers,
and last-minute revision all compete for attention.

The platform should instead feel like a premium AI-native study desk. The
student arrives with a real situation, types or speaks it naturally, and the app
turns that intent into a structured study session.

The center of the student experience is:

> What are you trying to study now?

The product answer is not a generic chat reply. It is a useful session proposal
that can draw from courses, official BAC exercises, flashcards, simulations,
mistake repair, labs, and the student's recent work.

## Core Direction

- Free-form at the surface, typed workflows underneath.
- Smart starters should come from real student context, not generic category
  buttons.
- AI may interpret intent, rewrite suggestions, explain content, and help tune a
  session, but trusted platform workflows select and execute the actual study
  steps.
- The app should not depend on long-term plans being followed perfectly.
- Recommendations are contextual assists, not commands.
- My Space is the command entrance and recovery surface, not a widget dashboard.
- Every major feature should belong to one or more study-session situations.

## General Workflow

1. Gather compact context:
   student stream, recent sessions, due cards, open mistakes, weak signals,
   curriculum position, saved items, and useful lab/course progress.
2. Produce smart prompt starters from that context:
   continue an unfinished session, repair a due mistake, review due cards,
   revisit a weak unit, prepare for a school test, or turn a tutor topic into a
   focused drill.
3. Let the student type or use push-to-talk for a natural command.
4. Route the command into a small set of internal study-session modes.
5. Ask at most one clarification when required fields are missing.
6. Render a session proposal card with estimated effort, steps, source context,
   and lightweight fine-tuning actions.
7. On acceptance, create or open real platform workflows: training sessions,
   flashcard review, lesson surfaces, simulations, mistake repair, library
   source work, or labs.
8. At session completion, offer recovery actions from real state: unfinished
   questions, open mistakes, due flashcards, weak-point repair, another drill,
   or a return to My Space. Do not invent follow-up content.
9. During the session, keep AI object-aware: lesson-aware, correction-aware,
   exercise-aware, flashcard-aware, or mistake-aware.

## V1 Hidden Study Modes

The command layer should route into a small set of internal modes. These are
product architecture, not necessarily visible labels.

- `SCHOOL_TEST_PREP`: short preparation for a school test, devoir, فرض, or
  nearby classroom exam.
- `TUTOR_REPLAY`: recap and follow-up after a tutor/private lesson.
- `BAC_TRAINING`: official or exam-style BAC practice.
- `LESSON_UNDERSTANDING`: course-first help for a lesson or concept the student
  does not understand yet.
- `MEMORIZATION_REVIEW`: definitions, laws, maps, dates, formulas, methods, and
  repeated theory prompts.
- `MISTAKE_REPAIR`: open mistakes, weak topics, and repeated-error repair.
- `SIMULATION`: strict timed exam or mock-exam work.
- `LAB_EXPLORATION`: visual/interactive exploration connected back to lessons
  or exercises.
- `LIBRARY_SEARCH`: source finding, official paper lookup, and archive
  navigation.

`CONTINUE_SESSION` is a system action and smart starter, not a core study mode.

## Mode Acceptance Matrix

This matrix is the shipping contract for the command layer. If a new prompt,
starter, or AI router changes a mode, it should preserve the mode's workflow
owner and fallback behavior.

| Mode | Student situation | Required fields | Primary workflow | Availability rule | Honest fallback |
| --- | --- | --- | --- | --- | --- |
| `SCHOOL_TEST_PREP` | "I have a school test / devoir / فرض soon." | Subject, topic when mentioned | Create a short drill session with previewed exercises | `READY` only after preview finds matches | Open the drill builder with subject/topic prefilled |
| `TUTOR_REPLAY` | "I just came from tutor/private lesson and need recap or similar exercises." | Subject, topic when mentioned | Create a short drill session from the tutor topic | `READY` only after preview finds matches | Open the drill builder with subject/topic prefilled |
| `BAC_TRAINING` | "I want BAC practice, official-style exercises, or recent years." | Subject, topic when mentioned | Create a drill session from mapped BAC content | `READY` only after preview finds matches | Ask one subject clarification, or open the builder if mapped content is missing |
| `LESSON_UNDERSTANDING` | "I did not understand this lesson/concept." | Subject, topic when mentioned | Open the course subject/topic surface | Route must use known subject/topic slugs when available | Open the closest course surface; let that surface show its own empty state |
| `MEMORIZATION_REVIEW` | Definitions, laws, maps, dates, formulas, methods, theory prompts | None required; subject/topic improve targeting | Open flashcards | `READY` when due cards exist in context | Open flashcards with a needs-content message when no due cards exist |
| `MISTAKE_REPAIR` | Open mistakes, weak topics, repeated errors, "fix my weak point" | None required; passive weak/mistake context may fill subject | Open weak-points / mistake repair | `READY` when mistakes or weak signals exist | Open weak-points with a needs-content message |
| `SIMULATION` | Timed mock, full exam, bac blanc, full paper | Subject when the student names it | Open simulation builder with subject preselected | Builder owns official-paper availability | Ask one subject clarification if missing; builder shows empty states |
| `LAB_EXPLORATION` | Visual/interactive understanding request | Subject | Open matching ready lab tool | `READY` only for a ready lab matching the requested subject | Ask one subject clarification, or open Lab with needs-content state |
| `LIBRARY_SEARCH` | Archive, annales, official paper lookup, source finding | None required; subject/stream improve targeting | Open Library with stream/subject query when known | `READY` when catalog has published entries | Open Library with a needs-content message when catalog is empty |
| `CONTINUE_SESSION` | Continue/resume an unfinished study session | Active session | Open the active session directly | Active session must exist | Fall back to normal command routing if no active session exists |

## Guardrails

- Do not add a standalone open chatbot as the student product center.
- Do not let the model invent unsupported UI or study workflows.
- Do not treat AI output as authoritative for official corrections, formulas,
  source content, or exam marking.
- Do not turn smart starters into static generic chips.
- Do not make a long-term planner the main daily UX.
- Do not hide the normal navigation; students should still be able to open
  Library, Training, Courses, Flashcards, Lab, and My Space directly.
- Do not silently borrow a subject from passive context for generic commands.
  A command like "أريد تدريب BAC آخر 3 سنوات" should ask which subject even if
  the student has recent math weak points. Passive context may fill the subject
  only when the wording clearly asks for that context, such as "أصلح نقطة ضعفي"
  or "راجع البطاقات المستحقة".

## Implementation Stance

The first implementation should be intentionally narrow:

- deterministic smart starters from existing context. If there is no useful
  context, show no starters rather than generic static chips.
- text command entrance
- push-to-talk transcription feeding the same text entrance
- API-owned command proposal and smart-starter composition under
  `apps/api/src/study/study-command-*`, with the web route acting as a thin
  authenticated proxy. The frontend renders typed contracts from
  `packages/contracts/src/study-command.ts` and must not own a second command
  brain.
- explicit proposal actions, optional one-question clarifications, and runtime
  contracts
- real content mappings before relying on topic drills. For the current SVT SE
  first pass, published paper exercise roots are mapped to the canonical
  `SE__2008__OPEN` curriculum through
  `npm run map:svt-se-paper-nodes -- --apply --replace` in `apps/api`. The mapper uses
  deterministic rules over already-published prompt text and inserts only
  `exam_node_curriculum_nodes` bridge rows, so it does not create a second
  ingestion path.
- real session creation for safe drill-like modes:
  `SCHOOL_TEST_PREP`, `TUTOR_REPLAY`, and `BAC_TRAINING`
- preview-before-create for drill sessions. A topic command should create a
  topic drill only when mapped content exists. If the mapping is missing or no
  exercise matches, the product should show a clear unavailable-content state or
  send the student to the builder; it should not silently widen to a mixed drill.
- proposal availability is explicit: `READY` means the workflow can open or
  create now, `NEEDS_CONTENT` means the surface exists but does not yet have
  enough mapped/reviewable user content, and `UNAVAILABLE` means the platform
  could not safely verify the workflow.
- real links into existing platform surfaces for lesson, flashcard, simulation,
  lab, library, mistake-repair, and continuation flows
- completed training sessions render typed recovery actions from session
  progress plus lightweight mistake/flashcard counts. The recovery layer opens
  existing surfaces; it does not create canonical content or hidden drills.
- prompt fixtures for messy Algerian BAC commands live in
  `apps/api/src/study/study-command-eval-fixtures.ts` and should grow whenever
  a real student wording fails routing.
- the command router is a measurable brain, not a bag of UI labels. Every new
  important wording should become an eval fixture with expected mode, subject,
  topic, and clarification behavior. The system should pass those fixtures
  before adding broader autonomy.
- a full-stack Playwright smoke can be run with `PLAYWRIGHT_FULL_STACK=true`
  to verify command proposal, API preview, real session creation, and training
  navigation against the local API and database

Deeper AI routing should only be added behind typed schemas, model-routing
budgets, usage logging, and deterministic fallbacks. The current V1 command
router remains rules-first; future AI routing should improve interpretation,
not bypass preview checks, availability states, or platform-owned workflows. AI
runtime boundaries currently live in `apps/api/src/ai/ai-runtime.ts` and provide
credential detection, model/output-token guardrails, coarse token estimates, and
content-free usage-event metadata for explanation features.
Persisted proposal history should be added only when we need auditability or
cross-device resume beyond the created session itself.
