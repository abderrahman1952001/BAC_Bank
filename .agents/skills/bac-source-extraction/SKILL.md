---
name: bac-source-extraction
description: Use when working in BAC_Bank on Algerian BAC textbook, teacher booklet, scanned course source, or methodology source extraction into source-faithful Markdown files with linked page images/crops for later canonical course building.
---

# BAC Source Extraction

## Purpose

Use this skill for `BAC_Bank` source-content extraction work under
`bac_theory_content/sources/**`.

This is not the official BAC paper ingestion workflow. For official exam paper
storage, reviewed draft import, or source-document ingestion jobs, use the
`bac-ingestion` skill instead.

The goal here is to preserve what a real Algerian student source teaches, in a
durable Markdown form that can later feed a separate canonical platform course.

## Core Standard

- Extract source-faithfully; do not rewrite into the platform's future course
  voice.
- Preserve the source's page order, headings, exercise numbering, definitions,
  examples, formulas, tables, and final results.
- Avoid vague placeholders such as "the page calculates..." or "the source
  explains...". If a page contains a calculation, transcribe the calculation
  chain or explicitly mark the unresolved part.
- Keep the original page image beside each page section using a relative asset
  link.
- Use Markdown tables and KaTeX for renderable math, sign tables, variation
  tables, probability laws, and compact schemas when reliable.
- Use image links/crops for diagrams, graphs, trees, scanned illustrations, and
  visual layouts that are not worth recreating textually.
- Keep source extraction separate from canonical course authoring. Do not add
  platform pedagogy, simplifications, interactivity, or new explanations unless
  the user explicitly asks for canonical course work.

## Folder Conventions

Prefer the source library shape:

```text
bac_theory_content/sources/
  <subject>/
    <stream-or-stream-family>/
      source 1 (<source name>)/
        <unit-or-topic>/
          extracted.md
          assets/
          crops.json
          scans/
```

For shared scientific math sources, use stream families such as `SE-M-MT` when
that is the user's chosen organization. For SVT or stream-specific material,
use the stream folder that reflects the source's audience.

## Extraction Workflow

1. Locate the target source folder and list available scans/assets with `rg
   --files`.
2. Confirm page order from filenames, page numbers visible in scans, or the
   user's normalized ordering. If order is uncertain, stop and say exactly what
   is uncertain.
3. Create or update `extracted.md` with frontmatter that records subject,
   streams, unit/topic, source name, page range, extraction model, asset
   strategy, caveats, and review status.
4. For each page, create:

```markdown
## صفحة المصدر <n>

<!-- source-page: <n> -->

![صفحة المصدر <n>](assets/<asset-name>.jpg)
```

5. Under each page, transcribe the source in source order:
   headings, paragraphs, formulas, examples, exercise statements, solution
   steps, tables, and results.
6. When a visual object matters and is not recreated faithfully in Markdown or
   KaTeX, keep the page image and add a clear future crop target if useful.
7. Finish with a compact links section only when it helps auditing all pages.

## Repeated Pass Model

Use two modes for this work:

1. **First pass: full extraction.** Build or complete the `extracted.md` file
   page by page. The goal is durable capture: every source page has a page
   marker, linked scan, headings, formulas, definitions, exercises, solutions,
   tables when practical, and image/crop links for visuals.
2. **Later passes: audit and tighten.** Compare the existing Markdown against
   the scans and patch only what is missing, wrong, poorly rendered, or
   structurally misplaced. Treat "tighten", "audit", "improve fidelity",
   "coverage audit", and "structure tightening" as this mode unless the user
   explicitly asks for canonical course rewriting.

Later audit passes should combine:

- fidelity audit: wrong symbols, signs, limits, formulas, wording, numbering,
  page boundaries, and missing calculation steps;
- coverage audit: source items that exist in scans but not in Markdown,
  including exercises, solutions, examples, diagrams, tables, and notes;
- structure/render tightening: better Markdown/KaTeX tables, headings, and
  crop/image links without changing the source meaning.

Audit passes must not make the text prettier by drifting away from the source.
Prefer small patches tied to page numbers. If a scan/source appears internally
inconsistent, preserve the source and add a short local audit note.

Useful short prompts the user may give in future chats:

- "Use bac-source-extraction. First-pass extract this unit: <folder>."
- "Use bac-source-extraction. Audit and tighten this extraction: <extracted.md>."
- "Use bac-source-extraction. Audit pages <a-b> against scans: <extracted.md>."
- "Use bac-source-extraction. Finish the next unextracted source."

## Fidelity Rules

- Be honest about uncertainty. Use a short local note only when a scan is
  unreadable or a formula could not be confidently verified.
- Do not silently "fix" the source. If an apparent source mistake exists, copy
  the source and add a clearly labeled review note.
- Do not mix exercises across pages or sources. Check boundaries when pages are
  dense.
- Do not translate Arabic verbs into French. Keep French only when it is part of
  a term actually used by the source and needed for fidelity.
- For math sources, prefer more literal extraction than for biology summaries:
  keep formulas, derivations, examples, and probability/sequence/function tables
  close to the source.
- For biology/SVT sources, preserve scope, definitions, mechanisms, diagrams,
  and experimental logic without drifting into a new lesson plan.

## Quality Checks

Before final response, run the validator when possible:

```bash
node .agents/skills/bac-source-extraction/scripts/validate_source_md.js <path-to-extracted.md>
```

Also run:

```bash
git diff --check -- <path-to-extracted.md>
```

Treat these as minimum checks, not proof of perfect OCR. If the source is dense,
do at least one visual pass on the hardest pages before saying the file is
ready.

## Reporting

In the final response, report:

- the exact `extracted.md` path changed
- whether page markers and asset links passed validation
- any scan/page/order caveats
- whether the result is source-faithful extraction or canonical course writing

Do not claim character-perfect transcription unless it was actually verified
line by line.
