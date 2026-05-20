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
10. Persist safe command metadata so the platform can learn where routing,
    availability, and missing-content states break down without storing raw
    student prompts as the product truth.

## Controlled AI Routing

Study Command may use AI to improve interpretation, but AI is not the product
owner. The student can type or speak freely, yet the server still turns that
input into a typed platform command.

The routing contract is:

- deterministic routing always exists and remains the fallback.
- AI routing is disabled unless the server has an explicit feature flag, model,
  provider credentials, and a registered provider adapter.
- AI output must parse as `StudyCommandAiInterpretation` from
  `packages/contracts/src/study-command.ts`.
- valid AI output may only provide interpretation hints: mode, confidence,
  subject hint, topic hint, deadline, duration, language, missing fields, and a
  short student-facing summary.
- AI output feeds the existing deterministic proposal composer. It cannot create
  sessions, open routes, invent workflow steps, generate arbitrary UI, bypass
  preview checks, or hide missing-content states.
- provider failures, invalid output, low confidence, timeouts, missing
  credentials, and missing adapters all fall back to deterministic routing.
- usage logging must stay content-free: feature, provider, model, status,
  estimated tokens, latency, and error code only.

This is intentionally not a generic chatbot. It is a controlled interpreter in
front of real Study Command workflows.

## Platform Brain And Evaluation Loop

Study Command needs an improvement loop, not just a proposal card. The platform
records proposal and acceptance metadata into `student_learning_events` using
the event types `STUDY_COMMAND_PROPOSED` and `STUDY_COMMAND_ACCEPTED`.

Those events must stay safe and diagnostic:

- store mode, title, subject code, topic codes, action kind, result kind,
  availability status, clarification presence, and matching-count metadata.
- store command length and a normalized hash fingerprint for deduplication, not
  the raw command text.
- store AI routing outcome as metadata only: status, provider, model,
  skipped/failure reason, and confidence.
- never store API keys, raw prompts, full chat transcripts, private notes, or
  source/content blobs in Study Command telemetry.

The student-facing history endpoint may show recent structured command events,
but it should remain a practical trace of product actions, not a chat log.
My Space may render this as a compact command trail with safe titles, modes,
availability, matching counts, and resume/open links. It must not display raw
student commands or transcripts.

The internal diagnostic endpoint is `GET /api/v1/admin/study-command/diagnostics`
and is guarded by admin auth. It summarizes the recent command window:

- proposal and acceptance counts
- created-session, opened-route, no-proposal, and clarification counts
- top modes, subjects, topics, action kinds, availability states, and AI routing
  outcomes
- top `NEEDS_CONTENT` signals so content work can target real student demand

The web admin surface for this loop is `/admin/study-command`. It should remain
an operational report for routing quality, missing-content pressure, and AI
fallback behavior, not a prompt-inspection console.

This gives BAC Bank a product feedback loop while preserving the core rule:
deterministic routing and availability checks remain the source of truth.

Study Command proposal and acceptance endpoints should pass through a per-user
usage guard before AI routing, context building, availability preview, or
session creation. The current API guard uses Redis-backed counters with the
repo's memory fallback and is configurable through:

- `STUDY_COMMAND_RATE_LIMIT_ENABLED`
- `STUDY_COMMAND_RATE_LIMIT_WINDOW_MS`
- `STUDY_COMMAND_PROPOSE_LIMIT_PER_WINDOW`
- `STUDY_COMMAND_ACCEPT_LIMIT_PER_WINDOW`

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

| Mode                   | Student situation                                                            | Required fields                                              | Primary workflow                                      | Availability rule                                           | Honest fallback                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `SCHOOL_TEST_PREP`     | "I have a school test / devoir / فرض soon."                                  | Subject, topic when mentioned                                | Create a short drill session with previewed exercises | `READY` only after preview finds matches                    | Open the drill builder with subject/topic prefilled                             |
| `TUTOR_REPLAY`         | "I just came from tutor/private lesson and need recap or similar exercises." | Subject, topic when mentioned                                | Create a short drill session from the tutor topic     | `READY` only after preview finds matches                    | Open the drill builder with subject/topic prefilled                             |
| `BAC_TRAINING`         | "I want BAC practice, official-style exercises, or recent years."            | Subject, topic when mentioned                                | Create a drill session from mapped BAC content        | `READY` only after preview finds matches                    | Ask one subject clarification, or open the builder if mapped content is missing |
| `LESSON_UNDERSTANDING` | "I did not understand this lesson/concept."                                  | Subject, topic when mentioned                                | Open the course subject/topic surface                 | Route must use known subject/topic slugs when available     | Open the closest course surface; let that surface show its own empty state      |
| `MEMORIZATION_REVIEW`  | Definitions, laws, maps, dates, formulas, methods, theory prompts            | None required; subject/topic improve targeting               | Open flashcards                                       | `READY` when due cards exist in context                     | Open flashcards with a needs-content message when no due cards exist            |
| `MISTAKE_REPAIR`       | Open mistakes, weak topics, repeated errors, "fix my weak point"             | None required; passive weak/mistake context may fill subject | Open weak-points / mistake repair                     | `READY` when mistakes or weak signals exist                 | Open weak-points with a needs-content message                                   |
| `SIMULATION`           | Timed mock, full exam, bac blanc, full paper                                 | Subject when the student names it                            | Open simulation builder with subject preselected      | Builder owns official-paper availability                    | Ask one subject clarification if missing; builder shows empty states            |
| `LAB_EXPLORATION`      | Visual/interactive understanding request                                     | Subject                                                      | Open matching ready lab tool                          | `READY` only for a ready lab matching the requested subject | Ask one subject clarification, or open Lab with needs-content state             |
| `LIBRARY_SEARCH`       | Archive, annales, official paper lookup, source finding                      | None required; subject/stream improve targeting              | Open Library with stream/subject query when known     | `READY` when catalog has published entries                  | Open Library with a needs-content message when catalog is empty                 |
| `CONTINUE_SESSION`     | Continue/resume an unfinished study session                                  | Active session                                               | Open the active session directly                      | Active session must exist                                   | Fall back to normal command routing if no active session exists                 |

## Session Aftermath Loop

Session completion is part of Study Command, not a generic success screen. The
post-session state should help the student make one believable next move from
real signals:

- due or open mistakes take priority over generic repeat-practice suggestions
  because they are already persisted repair work.
- skipped questions, viewed solutions, hard/missed reflections, and concept,
  method, or calculation diagnoses may create a local repair suggestion for the
  just-finished session.
- due flashcards may open flashcard review; the recovery layer must not invent
  flashcards or imply that canonical decks exist when they do not.
- drill sessions may suggest another drill with the same verified subject/topic
  filters, leaving the builder or API preview to check availability again.
- simulation sessions may suggest another simulation while preserving the
  session subject when known.
- if no recovery signal exists, send the student back to My Space so smart
  starters can use persisted context instead of client-only assumptions.

This loop must stay typed: recovery actions are links or commands into existing
platform surfaces. They are not free-form AI plans, hidden fallback drills, or
content-generation promises.

## Secondary Landing States

When Study Command opens a surface instead of creating a session, that landing
surface must preserve the student's requested context and explain any mismatch:

- if Lab has no ready tool for the requested subject, open Lab with the subject
  in the route and show a clear unavailable-subject notice.
- if Simulation receives a subject with no official paper in the active stream,
  explain that the requested subject is not ready before showing available
  subjects.
- if Mistake Repair receives a subject with no weak signals, explain that the
  repair queue has no real data for that subject and show only real weak-signal
  subjects.
- if Flashcards receives a subject from Study Command, keep that subject in the
  route and filter the due queue to real due cards for that subject. If none are
  due, explain that clearly and let the student open all cards.
- if a repair or simulation preview has zero matching content, show that as a
  needs-content state; do not leave a disabled action without explanation.

These states should feel like honest product answers, not errors. The student
should always understand whether the blocker is missing content, missing
personal history, quota, or a temporary loading/API issue.

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
- accepted command proposals go back through the API-owned accept path. The
  server re-runs proposal composition and availability before creating a drill
  session or returning the platform route to open; the client must not create
  sessions directly from a stale embedded proposal payload.
- My Space can show recent structured command events from
  `GET /api/v1/study/command/history`, but only as safe recovery/action
  metadata. It should never recreate a chat transcript.
- Admin can inspect aggregate routing health from `/admin/study-command`, backed
  by `GET /api/v1/admin/study-command/diagnostics`.
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
- course surfaces must not synthesize lesson checkpoints from taxonomy alone.
  If an authored topic exists, show its concepts; if it does not, show an honest
  course-content-not-ready state and offer real training/library alternatives.
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
- the executable eval harness lives in
  `apps/api/src/study/study-command-eval-harness.ts` and is exercised by the
  Study Command unit tests. It should remain deterministic and run without live
  AI credentials.
- controlled AI routing lives behind `StudyCommandAiRouterService`. It is
  disabled by default and requires `AI_STUDY_COMMAND_ROUTER_ENABLED=true`,
  `AI_STUDY_COMMAND_ROUTER_MODEL`, provider credentials, and an adapter
  registered as `STUDY_COMMAND_AI_ROUTER_PROVIDER`. Without that, My Space uses
  deterministic routing normally.
- the AI router should use compact context only: stream, active-session signal,
  due counts, weak subjects, and available subject/topic codes. Do not send full
  history, full curriculum, private notes, raw secrets, or large content blobs
  into the router.
- the server may pass validated AI interpretation into
  `buildStudyCommandProposal`, but proposal actions and availability remain
  owned by the existing Study Command composer and preview logic.
- the command brain reuses `student_learning_events`; do not create a parallel
  analytics table until event volume, retention, or query performance requires a
  dedicated migration.
- a full-stack Playwright smoke can be run with `PLAYWRIGHT_FULL_STACK=true`
  to verify command proposal, API preview, real session creation, and training
  navigation against the local API and database

Persisted proposal history should be added only when we need auditability or
cross-device resume beyond the created session itself.
