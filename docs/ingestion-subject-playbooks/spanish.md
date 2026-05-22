# Spanish Ingestion Playbook

## Scope

- Subject code: `SPANISH`
- Current paper family: `le`
- Current stream: `LE`
- Normal-session range: 2008-2025
- Makeup sessions: handle separately; 2017 makeup exists as a source bundle but may not have a reviewed extraction yet.

## Paper Shape

Spanish papers normally contain two selectable variants:

- `SUJET_1` / `الموضوع الأول`
- `SUJET_2` / `الموضوع الثاني`

The common hierarchy is:

- root `CONTEXT` for the reading passage
- `EXERCISE` or `PART` for `I. Comprensión del texto`
- `EXERCISE` or `PART` for `II. Competencia lingüística`
- nested `PART` nodes for `A. Léxico` and `B. Gramática` when the scan uses them
- `EXERCISE` or `PART` for `III. Producción escrita` / `Expresión escrita`

Do not force every year into the same node type. Older extractions often use
`PART` roots while newer extractions use `EXERCISE` roots; both are acceptable
when they match the visible paper and validate cleanly.

## Native Rendering

Spanish papers usually do not need crop assets. Render these natively:

- true/false justification grids
- verb / noun / adjective morphology tables
- synonym/antonym matching tables
- positive/negative classification tables
- written-expression rubrics

If a Gemini extract creates placeholder `table`, `graph`, or `image` assets for
simple matching/rubric material, remove the asset fallback and keep the native
text/table representation instead. Placeholder full-page assets are not
approval-ready for this subject unless the scan has a genuinely non-native
visual, which has not been typical in the Spanish LE papers reviewed so far.

## Common Extraction Repairs

- Some Gemini outputs start root node `orderIndex` at `0`; normalize sibling
  order to positive, per-parent indexes before import.
- Some outputs include raw line breaks inside JSON strings; escape them rather
  than retranscribing when the content is otherwise intact.
- Some legacy `exercises[]` extracts are valid and can be imported through the
  reviewed-extract command after lightweight metadata and asset cleanup.
- Do not trust a validation-clean import if a variant is missing its reading
  passage or prompt blocks. For example, the local 2010 source/extract currently
  lacks prompt content for several `SUJET_2` comprehension questions and needs
  source repair or direct visual reconstruction before approval.

## Review Focus

- Preserve Spanish accents, punctuation, inverted question/exclamation marks,
  author/source lines, footnotes, and quoted expressions.
- Ignore handwritten candidate marks unless they are part of the official
  printed correction; do not encode crossed boxes or scribbled choices as
  official answers.
- Check correction answers against the official correction, especially
  true/false justifications and synonym/antonym mappings.
- Written-expression sections should keep both topic choices and the official
  form/content rubric when present.
