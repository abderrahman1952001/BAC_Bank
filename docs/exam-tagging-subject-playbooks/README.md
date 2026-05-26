# Exam Tagging Subject Playbooks

Use these playbooks with `.agents/skills/bac-exam-tagging/SKILL.md`.

The goal is to preserve operational lessons learned while tagging exam nodes:
curriculum-scope decisions, learning-target taxonomy choices, false positives,
legacy units, source-scan caveats, and validation counts.

## File Naming

Use one file per subject:

```text
docs/exam-tagging-subject-playbooks/<subject>.md
```

Prefer short lowercase subject names, for example:

- `svt.md`
- `mathematics.md`
- `physics.md`
- `history-geography.md`

## Playbook Shape

Each subject playbook should stay concise and practical:

```markdown
# <Subject> Exam Tagging Playbook

Subject code: `<SUBJECT_CODE>`

Use this alongside `.agents/skills/bac-exam-tagging/SKILL.md`.

## Scope

- Streams:
- Years:
- Published coverage:
- Source scan coverage:

## Curriculum Notes

- Current curriculum nodes:
- Legacy or out-of-scope nodes:
- Stream-specific caveats:

## Learning Targets

- Accepted target taxonomy:
- Rejected/merged target ideas:
- Curriculum-node-to-target defaults:

## Mapping Rules

- Main topic rules:
- Secondary tag rules:
- Parent rollup rules:
- Cases requiring source-scan review:

## Known Traps

- False positives:
- Historical wording:
- Extraction issues:
- Correction/barème caveats:

## Validation Log

- YYYY-MM-DD:
  - pass scope:
  - candidate rows:
  - reviewed rows:
  - unresolved cases:
  - commands/readbacks:
```

Update the playbook after each serious pass. Do not use it as public course
content.
