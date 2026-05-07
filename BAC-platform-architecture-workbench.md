# BAC Platform Build Spec

This file is the current source of truth for the BAC student platform.

Update it in place.
Keep only the latest agreed design instead of preserving decision history.
Do not append decision logs, changelogs, or superseded alternatives here.
When a direction changes, replace the old version with the new one.
Everything in this file is open to change, refinement, and upgrade as the product gets clearer.
Nothing here should be treated as untouchable doctrine if a better product decision emerges.

---

## 1) Product Definition

### Goal

- Build a student-first premium platform for Algerian BAC students, intended to be the go-to platform for preparing for that exam.
- The platform should become a serious daily study environment, not a PDF dump, not a tutor marketplace, and not an AI wrapper.
- The platform should reduce study fragmentation and become the place where the student browses trusted content, trains, reviews, resumes work, and gradually receives better guidance.
- The platform should not stop at measuring performance; it should help the student understand weaknesses and move into the next corrective action with minimal friction.

### Product qualities

- Premium feel over feature clutter.
- Strong continuity across study sessions.
- Trusted BAC content first.
- AI as an assistive layer, not the source of truth.
- Calm, structured, anxiety-reducing UX that feels dependable during a high-pressure exam season.
- A closed remediation loop: detect weakness, explain it clearly, and guide the student toward fixing it.
- Architecture that can absorb many future features without rewrite.



## Users and Tiers

### Primary users

- BAC student
- Admin / content operator

### Deferred users

- Parent
- Teacher / tutor

### Tier model

Free:

- Library access
- Paper browsing
- Official correction access
- Recent sessions in My Space
- Bookmark and flag actions
- Topic Drill and Mixed Drill only
- 5 new drill session starts per calendar month
- 1 new full-paper simulation start per calendar month

Premium:

- Unlimited serious practice
- Weak-Point Drill
- Analytics and weak-topic insight
- Personalization
- AI explanation layer

Entitlement rule:

- Gate by product capability boundaries, not scattered micro-gates.
- Library, official correction access, bookmarks, flags, and continuity remain free.
- Weak-Point Drill, weak-point insight, lightweight analytics, and AI explanation are premium-only.
- Free-tier practice limits use recurring monthly quotas, not lifetime caps.
- Free users get separate quotas for drill starts and simulation starts.
- Quotas reset at the start of each calendar month using Algeria time (`Africa/Algiers`).
- Resuming an already started session never consumes quota.
- Raw exercise counts are not part of entitlement logic.

### V1 launch slice

Core launch experience:

- Library with digital BAC paper browsing, exercise tags, and official corrections
- Training with Topic Drill, Mixed Drill, Weak-Point Drill, and full-paper timed simulation
- My Space with continue, recent sessions, saved/review continuity, and a corrective `My Mistakes` block
- Drill autosave and resume behavior
- Strict timed simulation behavior

Premium launch additions inside the core experience:

- unlimited serious practice
- weak-point insight in My Space
- lightweight subject/topic analytics
- AI explanation layered after official correction

Positioning rule:

- Trusted content, structured training, and continuity are the center of the product.
- AI, analytics, weak-point insight, and personalization are support layers inside that core loop.

---

## 4) Student App Surfaces

### Top-level surfaces

- Library
- Training
- My Space
- Courses
- Flashcards

### Surface intent

- Library: browse trusted BAC material digitally
- Training: actively create and run study sessions
- My Space: continuity, saved/review state, recent work, and later progress
- Courses: move through a premium guided theory journey by subject, unit, topic, and concept
- Flashcards: review important facts through flexible decks that may start from the platform and evolve privately for each student

### Student context defaults

- The student stream should be predefined before normal study use, either during sign-up or immediately after first entry.
- In normal student browsing flows, stream should not be a repeated primary filter.
- Library and Training should usually start from the student's selected stream context.

### Route direction

- `/student/library`
- `/student/training`
- `/student/sessions/new`
- `/student/sessions/:sessionId`
- `/student/my-space`
- `/student/courses`
- `/student/flashcards`
- `/admin/intake`
- `/admin/drafts/*`

---

## 5) Core Product Rules

- Exercise is the main study unit.
- Session is the main delivery and orchestration unit.
- Paper matters, but the app is not centered on raw papers alone.
- A paper is modeled as a collection of exercises.
- The default serious action in the product is continue or start training, not passive browsing.
- Drill and Simulation are different behavioral families and must not collapse into one fuzzy mode.
- Official correction comes before AI explanation.
- Student signals must stay explicit and separable, not flattened into one fake magic score.

### Product center

- The center of the product is trusted content + structured training + continuity.
- Premium capabilities strengthen that loop rather than replace it.

### Remediation rule

- Diagnosis without a corrective next step is incomplete product behavior.
- When the app detects visible weakness, it should naturally offer a `Fix it now` style next action into the best available corrective path.
- In `v1`, that corrective path may be a topic drill, a weak-point drill, or a focused review flow depending on the student's tier and context (this is open to upgrade with the available features in the app)

### Granularity rules

- The topic tree remains the curriculum and navigation structure.
- Skills are a separate diagnostic and remediation structure.
- Both subtopics and skills are needed.
- Topic mapping is exercise-level by default.
- Question-level topic mapping is allowed only when one exercise clearly mixes multiple curriculum areas.
- Skill mapping should be question-level by default.
- Bookmark and flag are exercise-level persistent state.
- Reflection is question-level manual learning state.
- Solve / skip progress is question-level session state.
- Weak-point derivation should read from question signals mapped to skills first, then roll up into topics for student-facing explanation.
- Do not collect both manual question reflection and manual exercise reflection in `v1`.

### Curriculum and roadmap rules

- Curriculum structure, student roadmap, and weak-point analytics are different layers and should not be forced into one table.
- `topics` represent curriculum grouping and browsing.
- `skills` represent the abilities being tested and remediated across or within topics.
- The student roadmap is a curated product surface built on top of curriculum and read models, not the raw taxonomy itself.
- The first roadmap should be a calm ordered unit map per subject rather than a highly branching graph.
- Student-facing curriculum should resolve through the student's selected leaf stream; stream-family overlap is an internal authoring convenience, not a repeated student filter.
- Canonical course authoring rules live in `bac_theory_content/canonical/README.md`: respected sources are internal curriculum intelligence, while published lessons must be original, stream-scoped BAC Bank content.

### Subject interaction formats

- Do not model the platform as if all BAC subjects behave like math problem sets.
- The app must support both logic-heavy subjects and memorization / essay-heavy subjects without splitting into separate products.
- The right distinction is interaction format, not subject prestige or subject type.
- In practice, the player and content model should be able to support formats such as:
  - `PROBLEM_SOLVING`
  - `SHORT_RECALL`
  - `ESSAY_OUTLINE`
  - `DOCUMENT_ANALYSIS`
- `Topic Drill` remains one product concept, but the player can adapt its interaction style to the content format.

---

## 6) Training Model

### Training families

First-level training choice:

- Drill Session
- Full Exam Simulation

Drill Session modes:

- Topic Drill
- Mixed Drill
- Weak-Point Drill

Simulation modes:

- Official paper simulation
- Custom mock simulation built from trusted internal content

### Drill rules

- Drill sessions are resumable.
- In drill mode, correction can be opened during the session.
- In drill mode, the student may reveal correction without submitting a formal answer.
- Reflection is captured per question.
- Reflection options are `MISSED`, `HARD`, `MEDIUM`, `EASY`.
- Bookmarking and flagging are available during drill.
- Drill remains learning-oriented and flexible.

### Topic Drill

- Entry flow: subject -> topic(s) -> year range -> sort & trim set -> start
- Sort options: newest, oldest, random
- Student can explicitly trim the exercise count after filtering

### Mixed Drill

- Scope is per subject
- Entry flow: subject ->  sizing -> optional year range -> start
- Session assembly is varied within that subject

### Weak-Point Drill

- Scope is per chosen subject
- Premium only
- Entry flow: subject -> start
- Uses weak signals derived from question-level outcomes and persistent review state
- Pulls both previously weak/review items and fresh exercises from the same weak topics
- The first screen of a weak-point drill should be a short remediation card before the first question, not an immediate jump into more exercises.
- That remediation card should be generated from the weak topics already selected for the session and should include a few key rules, a common trap, prerequisite topics when available, and a preview of the first exercise or question.
- The remediation intro should stay lightweight and derived from the existing topic, skill, and exercise model rather than introducing a second authored lesson system in `v1`.

### Simulation rules

- Launch with full-paper timing first
- Official paper simulation
- Custom mock simulation also exists, but it remains narrow and controlled
- Simulation is strict and measurement-oriented
- Simulation is not pausable once started
- The student may re-enter an active simulation before deadline, but the timer keeps running
- Correction remains locked until the simulation ends or is submitted
- Simulation should feel exam-like and stricter than drill
- Simulation should stay as close to the real BAC exam experience as practical.
- Custom mock simulation should be clearly labeled as custom and not confused with official BAC material.
- Custom mock simulation should ask only for subject and then assemble the mock automatically.

### Simulation launch flow

- Start from Library paper context or from Training
- If the student is browsing a paper, they may launch a simulation from that paper
- In Training, the student first chooses between:
  - an official paper simulation
  - a custom mock simulation
- Official paper simulation flow: choose subject -> choose an existing paper -> see metadata -> start
- Custom mock simulation flow: choose subject -> see generated metadata -> start
- Show a lightweight metadata screen first
- Official paper simulation metadata may include subject, year, stream, duration, and basic exam info
- Custom mock simulation metadata should include subject, stream, estimated duration, exercise count, and a note that it is a custom mock built from trusted internal exercises
- Then allow immediate start
- AI may help assemble the custom mock simulation behind the scenes.

---

## 7) Library and My Space

### Library

- Library owns trusted BAC browsing
- Browse papers digitally
- Library browsing should assume the student's selected stream by default
- Primary browse path is subject -> years -> papers
- View paper metadata
- View exercises and exercise topic tags and points count
- Official correction is revealed inline at question level, not as a separate correction paper surface
- Each question can expose a small `Show official solution` dropdown beneath it
- Primary CTA at paper level: `Simulate this paper`
- Secondary CTA at exercise level: `Drill this topic`

### My Space

Purpose:

- My Space is the continuity layer, not a junk drawer

Initial contents:

- Continue your work
- BAC countdown and gentle pacing block
- Recent sessions
- Saved / review list with flagged items visually highlighted
- My Mistakes / Mistake Vault
- Weak-point insight block for premium users
- subject roadmap / study map once the underlying signals are trustworthy enough


Optional additions:

- Subject and topic performance
- Recommendations
- Deeper personalization

Saved / review semantics:

- Bookmark means keep or save
- Flag means revisit or review
- The UI may merge them into one list
- The data model must keep them distinct

### My Mistakes / Mistake Vault

- `My Mistakes` is a corrective review block inside My Space.
- It is part of the core continuity experience and should be available to both free and premium users.
- It should pool items surfaced by recent `MISSED`, `HARD`, flagged, skipped, or repeatedly revealed patterns.
- It should support lightweight queue actions such as `Done`, `Later`, and `Hide` without inventing a separate corrective product.
- Its primary CTA should feel action-oriented, such as `Clear the Vault`.
- It is a light corrective queue built on top of existing drill/review flows rather than a separate primary training family.
- It now uses a lightweight spaced-repetition loop on top of the existing review queue.
- Each open review item should keep `dueAt`, `successStreak`, `lastReviewedAt`, and `lastReviewOutcome`.
- A fresh struggle signal should reopen the item, reset its streak, and make it due immediately again.
- A correct review should advance the item across a simple cadence such as `tomorrow`, then `3 days`, and clear it after `3` successful review days.
- Repeating a correct answer on the same calendar day should not advance the streak twice.
- `Clear the Vault` should prioritize due items first and fall back to the soonest open items when nothing is due.
- `Clear the Vault` should create a bite-sized corrective session, not a giant backlog dump.
- The default vault-clearing batch should be capped to a small chunk such as `10` questions.
- If more items remain after a vault-clearing session, the student should be able to continue later rather than being thrown into an overwhelming queue.
- If `Clear the Vault` creates a new session, it should follow the normal drill entitlement rules rather than invent a separate quota system.

### BAC countdown

- My Space should show a subtle and calm BAC countdown when the official exam period is configured.
- The countdown should feel supportive, not alarming.
- It may be paired with a gentle pacing indicator or weekly target reminder.
- It should be small, seasonal, and easy to ignore if the student does not want to focus on it constantly.

### Subject roadmap / study map

- The roadmap may use topic or unit nodes with visual progress, weak-signal cues, and direct `Continue`, `Drill`, or `Review mistakes` actions.
- The first version should be ordered and mobile-friendly rather than a fully free-form tree.
- It should exist both as a My Space summary block and as a dedicated subject page rather than staying trapped inside one dashboard card.
- The roadmap should be authored as ordered sections / units containing nodes, not auto-read as a raw topic dump.
- A roadmap node should stay a student-recognizable revision chunk, usually mapped to one main topic in `v1`.
- Nodes may carry a soft recommended previous node for guidance, but the student should still be able to jump manually.
- Topic circles, progress rings, and connectors are UI choices; they must read from derived progress state rather than become the data model.
- Roadmap progression should be derived from question signals rolled up into topic and skill read models.

---

## 8) Student Flow Details

### Training builder

- The training builder should feel lightweight and fast.
- The first choice in Training should be `Full Exam Simulation` or `Drill Session`.
- If `Drill Session` is chosen, the builder then asks for the drill mode.
- Topic Drill builder should show a live preview of matching exercise count.
- The student should understand the candidate pool before creating the session.
- The student should explicitly choose the exercise count of the session.
- Drill builder should also let the student opt into `active time tracking` for that session.
- Time tracking in `v1` should stay optional and descriptive; it should not present prescriptive target times yet.
- Weak-Point Drill should explain that it targets recent weak areas inside the selected subject.
- Free users should see the remaining monthly drill and simulation quota before starting a new eligible session.

Recommended builder flows:

- Topic Drill: subject -> topic(s) -> year range -> sizing and ordering -> start
- Mixed Drill: subject -> sizing -> optional year range -> start
- Weak-Point Drill: subject -> sizing -> start
- Simulation: official paper or custom mock -> metadata -> start

### Session player

- The session page should be mobile-first.
- The session player should use theatre mode.
- Theatre mode should already feel calm and low-clutter by default, so it does the job an explicit `Zen Mode` toggle would otherwise do.
- The session player should show one question at a time.
- Exercise context and prompt content should remain clear and readable on small screens (maybe hidden behind a button at the bottom of the screen in mobiles)
- The current question, exercise position, and overall progress should be visible.
- Navigation should support next, previous, and direct jump through a navigator.
- Progress should autosave.
- Resume should return the student to the last active session exercise and question.
- Resume-position sync to the server should be debounced or flushed periodically rather than written on every next/previous click.
- In drill mode, reveal of official correction should be available in the active study flow after the student chooses to reveal it.
- In drill mode, the support chips should default to `Hint` and `Official answer`.
- A third support chip should appear only when it adds distinct value for that specific question, and its label should stay subject-aware: for example `How to start`, `Method`, `Structure`, or `Key idea`.
- If the hint already covers the opening support need, the player should not force the extra middle support chip.
- After the student opens the official answer in a drill, the player should show a lightweight reflection step before advancing.
- The `v1` drill reflection options should be `MISSED`, `HARD`, `OKAY / manageable`, `EASY`.
- Reflection should stay question-level; do not collect a second manual exercise-level reflection in `v1`.
- If the student marks a question as `MISSED`, the player should capture one lightweight root-cause reason.
- In `v1`, the active drill reason set should stay compact and subject-aware around three buckets: `CONCEPT`, `METHOD / how to start`, and `EXECUTION / detail`.
- `TIME_PRESSURE` should be deferred from the active drill diagnosis flow until drill timing is a real explicit contract in the product.
- After the official answer is opened, the player may show an optional secondary AI explanation CTA.
- The player should remain one shared system, but it should adapt its support style by subject family:
  - logic-heavy subjects prioritize hints, step setup, and method-first guidance
  - content-heavy subjects prioritize key facts and recall structure
  - essay-heavy subjects prioritize methodology and response structure
- Subject-aware support should be expressed through modular panels inside one player rather than separate players per subject.
- Subject-aware support should be implemented through a shared pedagogy-profile layer keyed by support style, not through scattered subject conditionals across the player.
- Subject support style should default from the subject, and later question interaction format may override it when richer node metadata exists.

### My Space continuity

- My Space should lead with `Continue your work`.
- Continue should prefer the most recent unfinished drill session.
- Recent sessions should be visible to free and premium users.
- Saved/review should highlight flagged items from plain bookmarks.
- Premium users should see weak-point insight in My Space.

### First-run onboarding

- On first encounter, require the student to choose their stream before normal study use.
- Stream should remain editable later from settings.
- After stream selection, the app may ask for an optional target BAC average range or goal band to personalize tone and pacing.
- This goal input should stay lightweight and aspirational, not pretend to be a score prediction.
- It should prefer a few simple presets such as `Just pass confidently`, `12-14`, `14-16`, and `16+` rather than requiring a precise typed number.
- After stream selection, new users should see a short explanatory sequential onboarding journey that introduces the product clearly.
- The onboarding journey should explain the main surfaces and study loop without feeling long or heavy.
- After onboarding, a new user lands in My Space with clear links to Training and Library.
- Returning users should land directly in My Space.

### Simulation player behavior

- Simulation should clearly show remaining time.
- Simulation should not expose corrections before completion or expiry.
- Simulation should not expose hint, support-step, official answer, or AI explanation during the active timed run.
- If the browser closes, re-entry should reopen the same active simulation while time has continued running.
- Simulation completion should lead into a dedicated review state after submission or expiry.
- The client should keep robust local state during an active simulation so temporary connection loss does not destroy the student's in-progress work.
- If progress is captured while offline, the client should queue it locally and sync when connectivity returns.
- The server deadline remains authoritative for simulation validity.
- If reconnect happens after deadline, the product may preserve local work for review/recovery UX, but it must not silently treat late unsynced work as a valid on-time simulation submission.

### End-of-session direction

- End screens should stay calm and useful.
- Drill end should focus on what was completed, what was flagged, and what to do next.
- Drill should not wait until the full session end to surface all insight.
- After each drill exercise, the player should show a short exercise checkpoint with immediate insight, then ask whether the student wants to continue or pause and return later.
- Pausing after one exercise should feel normal, not like abandoning the session.
- If drill timing was enabled, the exercise checkpoint may include descriptive time observations such as where the student spent the longest time, but not prescriptive target coaching in `v1`.
- Simulation end should unlock review cleanly without pretending to provide overly smart grading.
- When a clear weak topic or mistake cluster is visible, the end screen should offer a direct corrective CTA such as `Fix this topic`.
- Premium users may get secondary AI CTA options on the end screen.
- AI CTAs on the end screen should remain secondary to the official review flow.
- Drill end should usually offer:
  - a primary CTA to start another drill
  - a secondary CTA to return to My Space
  - a premium AI CTA
- Simulation end should usually offer:
  - a primary CTA to review the simulation
  - a secondary CTA to return to My Space
  - a premium AI CTA

### Premium Conversion UX

- Free limits should appear calmly before session creation.
- When the student is running low on quota, the product should warn them visually before they hit zero, for example when roughly 20% remains.
- On quota exhaustion:
  - remind the student that Library and saved work are still available
  - show the next refill timing in simple language
  - explain what premium unlocks
  - use empathetic momentum-preserving language rather than punitive lockout copy
  - offer one clear upgrade CTA
- Do not block or blur an already active session because of quota exhaustion; quotas gate new eligible session starts, not in-progress work.
- Do not spam upgrade prompts across normal study flow.
- Upsell moments should mainly happen at:
  - Weak-Point Drill entry
  - weak-point insight block
  - AI explanation access
  - quota exhaustion

---

## 9) Correction and AI Rules

- Official correction is the source of truth
- AI is assistive, not authoritative
- The first AI insertion point is optional explanation layered on top of official correction
- AI is premium-only
- AI explanation ships
- AI appears only after official correction is opened
- AI must not replace trusted correction content
- AI must not become the system's curriculum or truth layer
- AI must not drive deep personalization before the underlying student-state model is ready

### V1 AI scope

- AI explanation should stay inside the correction flow.
- AI should focus on explaining the official correction more clearly, breaking it into steps, and highlighting the key idea or common trap.
- AI interaction should prefer fixed guided prompt chips over an open-ended blank chat input.
- Good prompt chips include:
  - `Explain simply`
  - `How could i mess this up?` (for common pitfalls)
  - `What rule should I remember?`
  - `Break down the steps`
- These AI prompts should target the student's confusion rather than dumping a generic wall of text.
- `v1` should not introduce a standalone AI chat surface.
- Custom mock simulation may use AI behind the scenes to assemble from trusted internal content, but it must not invent fake official BAC material.

---

## 10) Data Model Snapshot

This section distinguishes the schema that already exists in the repo from the planned target evolution.

Source of truth for current schema:

- `apps/api/prisma/schema.prisma`

Reference for target study-state evolution:

- `bac_platform_buildkit.md`

### Current enums already in the repo

- `SessionType`: `NORMAL`, `MAKEUP`
- `StudySessionStatus`: `CREATED`, `IN_PROGRESS`, `COMPLETED`
- `PublicationStatus`: `DRAFT`, `PUBLISHED`
- `IngestionJobStatus`: `DRAFT`, `QUEUED`, `PROCESSING`, `IN_REVIEW`, `APPROVED`, `PUBLISHED`, `FAILED`
- `SourceDocumentKind`: `EXAM`, `CORRECTION`
- `ExamVariantCode`: `SUJET_1`, `SUJET_2`
- `ExamNodeType`: `EXERCISE`, `PART`, `QUESTION`, `SUBQUESTION`, `CONTEXT`
- `BlockRole`: `STEM`, `PROMPT`, `SOLUTION`, `HINT`, `RUBRIC`, `META`
- `BlockType`: `PARAGRAPH`, `LATEX`, `IMAGE`, `CODE`, `HEADING`, `LIST`, `TABLE`, `GRAPH`, `TREE`
- `MediaType`: `IMAGE`, `FILE`
- `UserRole`: `USER`, `ADMIN`, `REVIEWER`
- `SubscriptionStatus`: `FREE`, `ACTIVE`, `PAST_DUE`, `CANCELED`

### Current tables already in the repo

Catalog and academic structure:

- `stream_families` (`StreamFamily`): `id`, `code`, `name`, `slug`, `description`, `created_at`, `updated_at`
- `streams` (`Stream`): `id`, `family_id`, `code`, `name`, `slug`, `description`, `is_default`, `created_at`, `updated_at`
- `subject_families` (`SubjectFamily`): `id`, `code`, `name`, `slug`, `description`, `created_at`, `updated_at`
- `subjects` (`Subject`): `id`, `family_id`, `code`, `name`, `slug`, `description`, `is_default`, `created_at`, `updated_at`
- `stream_subjects` (`StreamSubject`): `id`, `stream_id`, `subject_id`, `coefficient`, `is_optional`, `valid_from_year`, `valid_to_year`, `created_at`

Source and publication structure:

- `paper_sources` (`PaperSource`): `id`, `slug`, `provider`, `year`, `session_type`, `subject_id`, `family_code`, `source_listing_url`, `source_exam_page_url`, `source_correction_page_url`, `metadata`, `created_at`, `updated_at`
- `paper_source_streams` (`PaperSourceStream`): `paper_source_id`, `stream_id`, `created_at`
- `papers` (`Paper`): `id`, `paper_source_id`, `year`, `subject_id`, `session_type`, `family_code`, `duration_minutes`, `official_source_reference`, `created_at`, `updated_at`
- `exams` (`Exam`): `id`, `year`, `stream_id`, `subject_id`, `session_type`, `paper_id`, `is_published`, `created_at`, `updated_at`
- `exam_variants` (`ExamVariant`): `id`, `paper_id`, `code`, `title`, `status`, `metadata`, `created_at`, `updated_at`
- `exam_nodes` (`ExamNode`): `id`, `variant_id`, `parent_id`, `node_type`, `order_index`, `label`, `max_points`, `status`, `metadata`, `created_at`, `updated_at`
- `exam_node_blocks` (`ExamNodeBlock`): `id`, `node_id`, `role`, `order_index`, `block_type`, `text_value`, `media_id`, `data`, `created_at`, `updated_at`
- `subject_curricula` (`SubjectCurriculum`): `id`, `subject_id`, `stream_id`, `code`, `title`, `valid_from_year`, `valid_to_year`, `is_active`, `created_at`, `updated_at`
- `topics` (`Topic`): `id`, `subject_id`, `curriculum_id`, `code`, `name`, `slug`, `parent_id`, `kind`, `depth`, `path`, `display_order`, `is_selectable`, `student_label`, `created_at`, `updated_at`
- `skills` (`Skill`): `id`, `subject_id`, `curriculum_id`, `code`, `name`, `slug`, `description`, `display_order`, `is_assessable`, `created_at`, `updated_at`
- `topic_skills` (`TopicSkill`): `topic_id`, `skill_id`, `weight`, `is_primary`
- `exam_node_skills` (`ExamNodeSkill`): `node_id`, `skill_id`, `weight`, `is_primary`, `source`, `confidence`, `reviewed_at`, `created_at`, `updated_at`
- `exam_node_topics` (`ExamNodeTopic`): `node_id`, `topic_id`
- `media` (`Media`): `id`, `url`, `type`, `uploaded_by`, `metadata`, `created_at`, `updated_at`

Admin and ingestion workflow:

- `ingestion_jobs` (`IngestionJob`): `id`, `paper_source_id`, `label`, `status`, `review_notes`, `error_message`, `processing_requested_at`, `processing_started_at`, `processing_finished_at`, `processing_lease_expires_at`, `processing_worker_id`, `processing_attempt_count`, `draft_json`, `metadata`, `reviewed_at`, `published_at`, `published_exam_id`, `published_paper_id`, `created_at`, `updated_at`
- `worker_heartbeats` (`WorkerHeartbeat`): `worker_id`, `worker_type`, `last_heartbeat_at`, `started_at`, `stopped_at`, `metadata`, `created_at`, `updated_at`
- `source_documents` (`SourceDocument`): `id`, `paper_source_id`, `kind`, `storage_key`, `file_name`, `mime_type`, `page_count`, `sha256`, `source_url`, `language`, `metadata`, `created_at`, `updated_at`
- `source_pages` (`SourcePage`): `id`, `document_id`, `page_number`, `storage_key`, `width`, `height`, `sha256`, `metadata`, `created_at`, `updated_at`

Users and student data:

- `users` (`User`): `id`, `clerk_user_id`, `email`, `full_name`, `role`, `subscription_status`, `stream_id`, `created_at`, `updated_at`
- `user_topic_stats` (`UserTopicStats`): `user_id`, `topic_id`, `accuracy_percentage`, `total_attempts`, `updated_at`
- `exam_activities` (`ExamActivity`): `id`, `user_id`, `exam_id`, `sujet_number`, `total_question_count`, `completed_question_count`, `opened_question_count`, `solution_viewed_count`, `created_at`, `last_opened_at`, `updated_at`
- `study_sessions` (`StudySession`): `id`, `user_id`, `title`, `family`, `kind`, `source_exam_id`, `requested_exercise_count`, `duration_minutes`, `filters_json`, `resume_mode`, `status`, `started_at`, `deadline_at`, `submitted_at`, `completed_at`, `last_interacted_at`, `active_exercise_node_id`, `active_question_node_id`, `created_at`, `updated_at`
- `study_sessions` should also carry whether optional drill timing was enabled for that run
- `study_session_exercises` (`StudySessionExercise`): `id`, `session_id`, `exercise_node_id`, `exam_id`, `order_index`, `first_opened_at`, `last_interacted_at`, `completed_at`, `created_at`, `updated_at`
- `study_session_questions` (`StudySessionQuestion`): `id`, `session_exercise_id`, `question_node_id`, `sequence_index`, `answer_state`, `result_status`, `evaluation_mode`, `first_opened_at`, `last_interacted_at`, `completed_at`, `skipped_at`, `solution_viewed_at`, `time_spent_seconds`, `reveal_count`, `reflection`, `diagnosis`, `answer_payload_json`, `finalized_at`, `created_at`, `updated_at`
- `student_exercise_states` (`StudentExerciseState`): `user_id`, `exercise_node_id`, `bookmarked_at`, `flagged_at`, `created_at`, `updated_at`
- `student_topic_rollups` (`StudentTopicRollup`): `user_id`, `topic_id`, `attempted_questions`, `correct_count`, `incorrect_count`, `revealed_count`, `skipped_count`, `hard_count`, `missed_count`, `last_seen_at`, `weakness_score`, `mastery_bucket`, `created_at`, `updated_at`
- `student_skill_rollups` (`StudentSkillRollup`): `user_id`, `skill_id`, `attempted_questions`, `correct_count`, `incorrect_count`, `revealed_count`, `skipped_count`, `hard_count`, `missed_count`, `last_seen_at`, `weakness_score`, `mastery_bucket`, `created_at`, `updated_at`
- `student_review_queue_items` (`StudentReviewQueueItem`): `id`, `user_id`, `identity_key`, `question_node_id`, `exercise_node_id`, `reason_type`, `status`, `priority_score`, `created_at`, `last_promoted_at`, `status_updated_at`, `updated_at`
- `subject_roadmaps` (`SubjectRoadmap`): `id`, `curriculum_id`, `code`, `title`, `description`, `version`, `is_active`, `created_at`, `updated_at`
- `roadmap_sections` (`RoadmapSection`): `id`, `roadmap_id`, `code`, `title`, `description`, `order_index`, `created_at`, `updated_at`
- `roadmap_nodes` (`RoadmapNode`): `id`, `roadmap_id`, `section_id`, `topic_id`, `title`, `description`, `order_index`, `parent_roadmap_node_id`, `recommended_previous_roadmap_node_id`, `estimated_sessions`, `is_optional`, `created_at`, `updated_at`

### Current schema limitations that matter

- `study_session_questions` now owns normalized question-level interaction truth, and reflection is surfaced in the active student flows, but richer result evaluation and answer payload writes are not yet surfaced
- `study_session_questions` now also persist a lightweight post-review diagnosis so the system can distinguish concept, method, and execution/detail failures without inventing a second reflection model; `time pressure` should remain deferred from the active drill flow until drill timing is explicit
- bookmark and flag state is now normalized in `student_exercise_states`, and `My Mistakes` is now backed by the persisted `student_review_queue_items` read model
- AI explanation caching does not yet have its own table
- `subject_curricula` now own topic and skill trees, and the active study/admin filters read through that scope, but the seed still creates one active general curriculum per subject rather than multiple stream- or year-specific variants
- the first `skills` layer now exists and powers weak-point drill derivation, but it is still starter coverage rather than a complete subject-by-subject diagnostic map
- `exam_node_skills` now exists and is backfilled/published from `topic_skills`, but it is still a derived first pass rather than a manually reviewed or independently authored node-skill layer
- `student_topic_rollups` and `student_skill_rollups` now exist and are refreshed from session-progress writes, and weak-point insight now reads from rollups plus the persisted review queue rather than raw session-history scans
- question interaction and evaluation format are not first-class schema fields yet
- `student_review_queue_items` is still a derived read model, but it now preserves explicit student-managed workflow state through `DONE`, `SNOOZED`, and `REMOVED`
- `subject_roadmaps`, `roadmap_sections`, and `roadmap_nodes` now exist and power both the My Space roadmap summary and the dedicated subject roadmap page
- roadmap authoring is now seed-managed through curated section/node definitions with a safe fallback, but it is still not exposed through a dedicated admin authoring flow
- roadmap progression is now derived from `student_topic_rollups`, not stored in a separate student roadmap table
- `user_topic_stats` exists, but it should not remain the long-term source of truth for premium insight

### Target model decisions

- Keep `topics` as the curriculum tree and browsing structure.
- Add curriculum scoping and versioning so the tree can vary by stream and by valid years.
- Store the user's selected stream as the leaf stream only; derive the family through the stream relation rather than storing both.
- Add `skills` as a separate subject-aware layer linked to topics.
- Keep topic drill and roadmap grouping shaped by topics or units, not by skills alone.
- Derive weak-point insight from question signals mapped to skills and then rolled up into topics.
- Treat roadmaps as curated student-facing structures built on top of curriculum and rollups.

### Planned target additions and schema evolution

Target enum additions and changes:

- add `StudySessionFamily`: `DRILL`, `SIMULATION`
- add `StudySessionKind`: `TOPIC_DRILL`, `MIXED_DRILL`, `WEAK_POINT_DRILL`, `PAPER_SIMULATION`
- extend `StudySessionStatus` with `EXPIRED`
- add `SessionQuestionReflection`: `MISSED`, `HARD`, `MEDIUM`, `EASY`
- add `TopicKind`: `UNIT`, `TOPIC`, `SUBTOPIC`
- add `QuestionAnswerState`: `UNSEEN`, `OPENED`, `ANSWERED`, `REVEALED`, `SKIPPED`
- add `QuestionResultStatus`: `CORRECT`, `PARTIAL`, `INCORRECT`, `UNKNOWN`
- add `QuestionEvaluationMode`: `AUTO`, `MANUAL`, `SELF_ASSESSED`, `UNGRADED`
- add `QuestionInteractionFormat`: `PROBLEM_SOLVING`, `SHORT_RECALL`, `ESSAY_OUTLINE`, `DOCUMENT_ANALYSIS`
- add `StudentMasteryBucket`: `NEW`, `WATCH`, `WEAK`, `RECOVERING`, `SOLID`
- add `ReviewQueueReasonType`: `MISSED`, `HARD`, `SKIPPED`, `REVEALED`, `FLAGGED`, `WEAK_SKILL`
- add `ReviewQueueStatus`: `OPEN`, `DONE`, `SNOOZED`, `REMOVED`

Planned evolution of existing tables:

- `exam_node_topics` may remain the `v1` join table, but if topic tagging needs weights or provenance it should be evolved in place rather than replaced by a parallel mapping path
- `exam_nodes` should gain nullable content-delivery fields such as `interaction_format`, `response_mode`, `evaluation_mode`, and `difficulty_band` for question nodes
- `study_sessions` still needs `active_session_exercise_id` if we want the resume pointer to move from exercise-node identity to session-row identity
- `study_sessions` should persist whether optional drill timing was enabled for that session
- `study_session_questions` should eventually gain richer answer/result writes from the active student UI, not just normalized persistence columns
- `user_topic_stats` should become a derived read model or cache rather than a write-owned truth table
- `exam_activities` may remain for browse continuity, but it should not own training-state truth

Planned new tables:

- `subject_curricula` (`SubjectCurriculum`): `id`, `subject_id`, `stream_id`, `code`, `title`, `valid_from_year`, `valid_to_year`, `is_active`, `created_at`, `updated_at`
- `skills` (`Skill`): `id`, `subject_id`, `curriculum_id`, `code`, `name`, `slug`, `description`, `display_order`, `is_assessable`, `created_at`, `updated_at`
- `topic_skills` (`TopicSkill`): `topic_id`, `skill_id`, `weight`, `is_primary`
- `exam_node_skills` (`ExamNodeSkill`): `node_id`, `skill_id`, `weight`, `is_primary`, `source`, `confidence`, `reviewed_at`, `created_at`, `updated_at`
- `study_session_questions` (`StudySessionQuestion`): `id`, `session_exercise_id`, `question_node_id`, `sequence_index`, `answer_state`, `result_status`, `evaluation_mode`, `first_opened_at`, `last_interacted_at`, `completed_at`, `skipped_at`, `solution_viewed_at`, `time_spent_seconds`, `reveal_count`, `reflection`, `answer_payload_json`, `finalized_at`, `created_at`, `updated_at`
- `student_exercise_states` (`StudentExerciseState`): `user_id`, `exercise_node_id`, `bookmarked_at`, `flagged_at`, `created_at`, `updated_at`
- `question_ai_explanation_cache` (`QuestionAiExplanationCache`): `id`, `question_node_id`, `locale`, `explanation_key`, `content_version`, `prompt_version`, `explanation_json`, `generated_at`, `updated_at`
- `student_topic_rollups` (`StudentTopicRollup`): `user_id`, `topic_id`, `attempted_questions`, `correct_count`, `incorrect_count`, `revealed_count`, `skipped_count`, `hard_count`, `missed_count`, `last_seen_at`, `weakness_score`, `mastery_bucket`, `updated_at`
- `student_skill_rollups` (`StudentSkillRollup`): `user_id`, `skill_id`, `attempted_questions`, `correct_count`, `incorrect_count`, `revealed_count`, `skipped_count`, `hard_count`, `missed_count`, `last_seen_at`, `weakness_score`, `mastery_bucket`, `updated_at`
- `student_review_queue_items` (`StudentReviewQueueItem`): `id`, `user_id`, `identity_key`, `question_node_id`, `exercise_node_id`, `reason_type`, `status`, `priority_score`, `created_at`, `last_promoted_at`, `status_updated_at`, `updated_at`
- `student_roadmap_progress` (`StudentRoadmapProgress`): `user_id`, `roadmap_node_id`, `status`, `completion_percent`, `last_activity_at`, `updated_at`

Still deferred:

- `student_roadmap_progress` (`StudentRoadmapProgress`): `user_id`, `roadmap_node_id`, `status`, `completion_percent`, `last_activity_at`, `updated_at`

### Planned target study-state model

Target ownership:

- `SubjectCurriculum` owns the active learning structure for one subject, stream, and validity window
- `Topic` is the curriculum tree
- `Skill` is the diagnostic and remediation layer
- `StudySession` is the orchestration unit
- `StudySessionExercise` is one assigned exercise inside one session
- `StudySessionQuestion` is the question-level interaction truth
- `StudentExerciseState` is persistent cross-session saved/review state
- `QuestionAiExplanationCache` is a shared cache for explanation output

Planned state rules:

- question-level state is the canonical manual learning signal
- topics explain where content sits in the curriculum
- skills explain what ability the student is struggling with
- reflection is question-level
- bookmark and flag stay exercise-level persistent state
- weak-point insight should derive from question signals mapped to skills and then rolled up to topics plus exercise-level saved/review state
- resume pointers on `StudySession` are eventually synced convenience state, not per-click hard truth
- roadmap progress should read from derived rollups, not manual per-node toggles, and the current implementation now follows that rule

Analytics/read-model direction:

- weak-topic insight should derive from `StudySessionQuestion`, `StudentExerciseState`, and the topic/skill mapping layer, but read through persisted rollups and review-queue items rather than raw scans where possible
- the product should prefer transparent counts and recency over one opaque score
- the first cached aggregate layer is now in place through `student_topic_rollups`, `student_skill_rollups`, and `student_review_queue_items`
- derived topic rollups, skill rollups, and review queue items should be treated as read models rather than write-owned truth
- review-queue workflow state should sit on top of those derived items rather than creating a second corrective persistence model, and the current implementation now follows that rule
- the first roadmap can read from topic rollups; more advanced recommendation logic can come later, and that first derived roadmap layer is now active

### Migration direction

1. Extend `StudySession`
2. Add `StudySessionExercise.id`
3. Add `StudySessionQuestion` with richer question-state fields
4. Add `StudentExerciseState`
5. Add `QuestionAiExplanationCache`
6. Add derived read models for topic rollups, skill rollups, and review queue reads
7. Add roadmap tables only after the student signals and rollups are trustworthy
8. Keep roadmap progress derived until there is a real user-owned workflow that justifies `student_roadmap_progress`
