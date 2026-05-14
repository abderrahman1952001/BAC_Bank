# Ingestion Known Source Issues

This file records source-level BAC paper problems that should not be "fixed"
with weak or duplicate sources. Use it as a quick warning list before repairing
R2/local source documents.

## 2025 Technology Mechanical, MT Mech, Normal Session

- Paper source slug: `bac-technology-mechanical-mt-mech-2025-normal`
- Current exam source URL:
  `https://eddirasa.com/wp-content/uploads/2025/06/bac-tech-g-mechanical-2025-1.pdf`
- Current exam storage key:
  `bac/2025/documents/technology-mechanical/bac-exam-technology-mechanical-mt-mech-2025-normal.pdf`
- Current exam SHA-256:
  `a4ad801e13273cacbdb6deddddc06f0513c294b0f4f7fe658be60954da121b50`
- Current exam page count: `12`
- Current correction page count: `14`

Observed issue:

- The exam PDF is only the first topic/variant.
- Visual check: exam page 1 says the subject has pages `1/24` through `24/24`,
  but the stored/current exam PDF contains only pages `1` through `12`.
- The correction includes both topics; pages around the second half solve the
  second topic, so the correction is not evidence that the current exam is
  complete.

Sources checked without finding a safe replacement:

- Eddirasa page and guessed filename variants.
- A-onec page and Google Drive mirror.
- DzExams 2025 mechanical bundle.
- BacZoneDZ mechanical page and Google Drive mirror.
- Bac-dz mechanical page, rejected because the candidate was visually and
  metadata-wise an old 2021 paper.
- Scribd/search snippets only showed the same 12-page `...2025-1` document, not
  a complete 24-page exam.

Do not replace the current exam unless the candidate is visually confirmed as
the full 2025 mechanical exam containing all 24 pages or a complete official
equivalent.

## 2025 Technology Civil, MT Civil, Normal Session

- Paper source slug: `bac-technology-civil-mt-civil-2025-normal`
- Current exam source URL:
  `https://eddirasa.com/wp-content/uploads/2025/06/bac-tech-g-civil-2025.pdf`
- Current exam storage key:
  `bac/2025/documents/technology-civil/bac-exam-technology-civil-mt-civil-2025-normal.pdf`
- Current exam SHA-256:
  `079118fd09e65304c635918d9fb9874633c482ea3f3aa8540c4721f2f47a62c8`
- Current exam page count: `6`
- Current correction page count: `13`

Observed issue:

- The exam PDF is missing one page.
- Visual check: exam page 1 says the first topic includes pages `1` to `7`.
- The stored/current PDF has only 6 pages, and the current sixth page is visibly
  the final page `7/7`, which means the original page `6/7` is missing.

Sources checked without finding a safe replacement:

- Eddirasa page and guessed filename variants.
- A-onec page, Blogger image pages, and Google Drive mirror.
- DzExams 2025 civil bundle.
- BacZoneDZ civil page and Google Drive mirror.
- Bac-dz civil page, rejected because the candidate was visually and
  metadata-wise an old 2021 paper.

Do not replace the current exam unless the candidate is visually confirmed as
the full 2025 civil exam containing all 7 pages or a complete official
equivalent.

## General Repair Note

For these two papers, the public mirrors found on 2026-05-13 were incomplete in
the same way or were mislabeled older papers. Leave R2 and the local mirror as-is
until a complete source is found. When a complete source is found, repair both
the PDF and rasterized source pages in the canonical source layer, then update
the affected draft source-page references.
