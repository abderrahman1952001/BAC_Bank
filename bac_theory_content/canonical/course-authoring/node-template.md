# Course Node Draft Template

Copy this template for one lesson node only.

Recommended path:

`bac_theory_content/canonical/<subject>/<stream-family>/<unit>/nodes/<NODE_CODE>.md`

```markdown
---
node_code: NODE_CODE
curriculum_node_code: CURRICULUM_NODE_CODE
subject_code: MATHEMATICS
unit_code: SEQUENCES
stream_scope: ALL_SCIENTIFIC
status: DRAFT
evidence_level: SOURCE_EXTRACTED
programme_evidence:
  - bac_theory_content/programmes/math/SE-M-MT.yml#SEQUENCES
source_evidence:
  - path: bac_theory_content/sources/...
    note: Internal scope/trap evidence only; do not copy wording or examples.
review:
  math: PENDING
  style: PENDING
  originality: PENDING
  json_ready: false
---

# Student Title

## Node Brief

Objective:

BAC move unlocked:

Allowed formulas or methods:

Conditions that must be stated:

Common traps to handle:

Out-of-scope drift to avoid:

## Lesson Draft

### Hook

### Intuition

### Formal Rule

### Worked Example

### Interaction

Interaction type:

Prompt:

Expected answer:

Feedback:

### Common Trap

### BAC Lens

### Micro-Quiz

Question:

Options:

- A.
- B.
- C.

Correct answer:

Feedback:

### Optional Portal

Use `None` if no portal is useful.

## Review Notes

Math review:

Style review:

Originality review:

JSON mapping notes:
```

## Rules

- Do not put several curriculum nodes in one draft.
- Do not leave `TODO` in student-facing sections.
- Keep internal evidence private and separate from the lesson copy.
- If the optional portal is weak, remove it.
- Mark `json_ready: true` only after math, style, and originality review pass.
