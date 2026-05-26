---
name: bac-exam-tagging
description: Use when tagging BAC_Bank published exam nodes with curriculum nodes, theory-topic links, learning targets, skills, concepts, or reviewable mapping metadata across any subject or stream.
---

# BAC Exam Tagging

## Purpose

Use this skill for high-accuracy mapping/tagging of already-ingested BAC exam
nodes to:

- `CurriculumNode` through `exam_node_curriculum_nodes`
- `LearningTarget` through `exam_node_learning_targets`
- durable review notes in subject playbooks

This is not an ingestion workflow. Do not alter exam text, hierarchy, media, or
published paper content unless the user explicitly asks for an ingestion
revision. When visual source fidelity is in question, combine this skill with
`bac-ingestion` and follow its source-truth rules.

## Quality Standard

Quality beats speed.

- A script may accelerate candidate generation, coverage reports, and safe DB
  writes, but it is never the source of truth.
- Drop or narrow a script when it lowers judgment quality, hides uncertainty, or
  produces noisy tags.
- Prefer fewer, reviewed, defensible tags over broad high-recall tagging.
- Do not claim perfect tagging unless the relevant assessable nodes were
  reviewed against enough evidence to justify that claim.
- Treat source scans and official corrections as the authority when extracted
  text is ambiguous, incomplete, diagram-heavy, formula-heavy, or historically
  surprising.

## Required Context

Before tagging a subject, inspect only what is needed:

1. Prisma schema for mapping tables and source/review metadata.
2. The subject/stream curriculum tree in the DB and repo programme files.
3. Existing learning targets and curriculum-node-to-target mappings.
4. Published exam node hierarchy and block text.
5. Corrections/barèmes when they clarify the assessed skill.
6. Subject playbook at `docs/exam-tagging-subject-playbooks/<subject>.md`, if it
   exists.
7. Source scans for visually ambiguous questions, diagrams, tables, formulas,
   or suspected extraction problems.

If the subject has no playbook, create one from
`docs/exam-tagging-subject-playbooks/README.md` before or during the first
serious tagging pass.

## Tagging Unit

Tag the lowest meaningful assessable node.

- Prefer `QUESTION` or `SUBQUESTION` when the node is independently assessed.
- Use `PART` when the whole part has one coherent target or when children are
  not granular enough.
- Use `EXERCISE` for rollup/summary tags and for legacy papers whose extracted
  structure is not granular enough yet.
- Do not tag pure `CONTEXT` as assessed knowledge by default. Use it as evidence
  for child tags.

Roll up parent tags from reviewed child tags when practical. Parent tags should
not contradict child tags.

## Curriculum Tags

Curriculum-node tags answer: "What official topic/unit/concept is this node
testing?"

Rules:

- Map to the most specific stable curriculum node available.
- Use `is_primary=true` for the main tested node. Secondary nodes must be real
  assessed content, not incidental vocabulary.
- Stream-specific curricula are hard boundaries. If a paper appears to test a
  missing or legacy unit, record it as legacy/out-of-scope in the playbook
  before changing the curriculum.
- Course lessons are not the mapping target. Lessons hang from curriculum nodes;
  exam nodes map to curriculum nodes.

## Learning Targets

Learning targets answer: "What kind of thinking or performance is being
assessed?"

Derive a compact subject taxonomy from real papers, then seed/reuse it. Keep it
small enough to be useful for analytics.

Good learning targets are stable across many questions, such as:

- document/source analysis
- graph/table/image interpretation
- formula or calculation application
- mechanism explanation
- comparison and inference
- experimental reasoning
- proof/argument construction
- diagram labeling or schema completion
- common-trap recognition
- BAC response structure

Avoid one-off targets tied to a single document, drug name, historical example,
or wording accident. If a target is too rare, keep it as review notes rather
than schema.

Use direct `ExamNodeLearningTarget` rows when a node's assessed skill is clearer
than the curriculum-derived default. Otherwise, derived targets from
`CurriculumNodeLearningTarget` can be enough.

## Workflow

### 1. Audit readiness

- Confirm the published node hierarchy is usable enough for tagging.
- Check whether source scans and corrections are available.
- List existing curriculum nodes and learning targets for the subject/stream.
- Identify legacy/current-scope distinctions.

Stop and report blockers if the hierarchy is too broken or source evidence is
missing for high-risk questions.

### 2. Calibrate

Pick a representative sample across streams, years, variants, and topic areas.
For the sample:

- inspect the node text and source evidence where needed;
- assign curriculum tags;
- derive or refine learning targets;
- record subject-specific rules and traps in the playbook.

Do not scale tagging until the taxonomy and rules feel stable.

### 3. Generate candidates only when helpful

Candidate tools may:

- traverse published exam nodes;
- collect prompt/stem/solution/rubric snippets;
- suggest curriculum tags and learning targets;
- flag unmapped, multi-topic, low-confidence, legacy, and out-of-scope nodes;
- write JSON/Markdown review artifacts;
- apply reviewed rows through the existing DB tables.

Candidate tools must not:

- create a parallel ingestion engine;
- rewrite exam content;
- silently change curriculum or learning-target taxonomies;
- overwrite reviewed rows;
- apply unreviewed low-confidence mappings just to improve coverage.

### 4. Review

Review every risky node:

- mixed-topic exercises;
- multi-tag suggestions;
- no-tag or low-confidence suggestions;
- diagrams, tables, graphs, formulas, maps, and dense documents;
- legacy stream content;
- prompts whose extracted text conflicts with source scans;
- cases where correction/barème changes what the question actually assesses.

For "utmost quality" runs, review every assessable node, not only risky nodes.

### 5. Apply

Apply only reviewed or intentionally accepted mappings.

DB write rules:

- use transactions;
- use existing bridge tables;
- preserve rows with `reviewed_at` or `source=MANUAL_REVIEW`;
- write `source`, `confidence`, `is_primary`, and `reviewed_at` honestly;
- make reruns idempotent and scoped by subject/stream/curriculum.

### 6. Validate

Run a final report before delivery:

- assessable nodes mapped vs unmapped;
- rows by curriculum node and learning target;
- primary-tag coverage;
- multi-tag counts;
- legacy/out-of-scope cases;
- reviewed vs candidate/auto rows;
- DB readback count after applying.

Sample visually when the subject depends on diagrams or scans. A green script
report is not proof of semantic accuracy.

## Subject Playbooks

Subject playbooks live under:

```text
docs/exam-tagging-subject-playbooks/
```

Update the playbook during each serious tagging pass with:

- subject and stream scope;
- current/legacy curriculum notes;
- learning-target taxonomy decisions;
- repeated mapping rules;
- ambiguous cases and resolutions;
- script failures or false positives;
- source-scan caveats;
- validation counts and dates.

Keep playbooks concise and operational. They are memory for future agents, not
public course content.

## Reporting

In the final response, report:

- what subject/streams/years were tagged;
- whether tagging was candidate-only or applied to DB;
- reviewed coverage and remaining uncertain nodes;
- validation commands or DB readbacks actually run;
- any legacy curriculum findings;
- playbook files updated.

Do not say "perfect" unless the review depth actually supports it.
