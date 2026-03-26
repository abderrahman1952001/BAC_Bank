# Arabic BAC Ingestion Workflow

## Goal

Convert scanned Algerian BAC PDFs into one canonical content model that supports:

- Arabic-first exam text
- nested exam structure
- scanned source provenance
- elegant digital rendering
- prompt/answer differences for visual assets

## Product Reality

BAC math sujets are usually mostly text with a small number of important visual assets:

- probability trees
- function graphs
- geometric or coordinate-plane sketches
- occasional tables

These visuals should not all be treated as plain images.

## Canonical Model

Keep one authoring model only:

- `Paper`
- `Exam`
- `ExamVariant`
- `ExamNode`
- `ExamNodeBlock`
- `Media`
- `Topic`
- `ExamNodeTopic`
- `SourceDocument`
- `SourcePage`

Do not keep parallel authoring tables for `Exercise`, `Question`, `QuestionContent`,
`QuestionAsset`, and `Answer`.

Use `Paper` as the canonical content owner and `Exam` as the stream-facing offering row.
Use leaf `streams` / `subjects` for actual pathway and paper identities, with family tables above them for the top-level BAC taxonomy.
That keeps shared BAC papers deduplicated while preserving browse URLs and admin workflows per stream/year/subject/session.

## Block Strategy

Every visible thing in the sujet should become a block.

Recommended block kinds:

- `PARAGRAPH`
- `HEADING`
- `LATEX`
- `TABLE`
- `IMAGE`
- `PROBABILITY_TREE`
- `FUNCTION_GRAPH`
- `SVG`

Use prompt/solution roles instead of separate question tables:

- prompt blocks show what the student sees
- solution blocks show the completed or corrected version
- hint/rubric blocks stay optional

This directly handles cases like:

- incomplete probability tree in the prompt
- complete probability tree in the answer
- approximate sketch in the prompt
- more explicit or annotated version in the answer

## Visual Asset Rules

### Probability trees

Do not store only a JPG.

Store:

- the original crop as `Media`
- a structured tree object as block data

Suggested block payload:

```json
{
  "schema": "probability_tree/v1",
  "direction": "ltr",
  "root": {
    "label": "start",
    "children": [
      {
        "label": "R",
        "edge": {
          "value": "1/10",
          "revealed": true
        },
        "children": []
      },
      {
        "label": "V",
        "edge": {
          "value": null,
          "revealed": false
        },
        "children": []
      }
    ]
  },
  "sourceMediaId": "uuid"
}
```

Use the same renderer for prompt and answer. The difference is only the data:

- prompt data contains blanks or hidden values
- solution data contains completed values

### Function graphs

For BAC sujets, the printed graph is often illustrative and not numerically exact.
Do not regenerate the prompt graph only from the mathematical function.

Instead store one of these modes:

- `scan_trace`: traced from the printed scan and meant to visually match the sujet
- `analytic`: rendered from actual equations, asymptotes, and points
- `hybrid`: traced base curve plus explicit annotations

Suggested block payload:

```json
{
  "schema": "function_graph/v1",
  "renderMode": "scan_trace",
  "viewport": {
    "xMin": -1,
    "xMax": 4,
    "yMin": -1,
    "yMax": 3
  },
  "axes": {
    "showGrid": true,
    "xStep": 1,
    "yStep": 1
  },
  "curves": [
    {
      "label": "Cf",
      "path": "M ...",
      "source": "traced"
    }
  ],
  "annotations": [
    {
      "type": "line",
      "label": "Δ",
      "path": "M ..."
    }
  ],
  "sourceMediaId": "uuid"
}
```

If the answer needs a clearer graph, the solution block can use:

- a cleaner SVG path
- more labels
- key points
- asymptotes

### Tables

Do not label a scanned image as a table and stop there.

Store:

- original crop as `Media`
- structured rows/cells in block data

Suggested block payload:

```json
{
  "schema": "table/v1",
  "caption": "جدول تغيرات",
  "columns": 5,
  "rows": [
    [
      { "text": "x", "colSpan": 1, "rowSpan": 1 },
      { "text": "-4", "colSpan": 1, "rowSpan": 1 }
    ]
  ],
  "sourceMediaId": "uuid"
}
```

## Source Provenance

Add source tracking for every imported paper.

### `SourceDocument`

Suggested fields:

- `id`
- `storageKey`
- `fileName`
- `mimeType`
- `pageCount`
- `sha256`
- `language`
- `provider`
- `createdAt`

### `SourcePage`

Suggested fields:

- `id`
- `documentId`
- `pageNumber`
- `imageMediaId`
- `width`
- `height`

### `Media`

Suggested fields:

- `id`
- `storageKey`
- `mimeType`
- `width`
- `height`
- `sizeBytes`
- `sha256`
- `caption`
- `altText`
- `documentId`
- `pageId`
- `cropX`
- `cropY`
- `cropWidth`
- `cropHeight`

This lets you always go back from a rendered block to the scan region that produced it.

## OCR / AI Workflow

Do not let AI write directly into production tables.

Use this pipeline:

1. Upload scanned PDF
2. Create `SourceDocument`
3. Rasterize PDF pages to images
4. Create `SourcePage` rows
5. Run page-level extraction with AI
6. Run asset-level extraction for detected visual regions
7. Validate against your schema
8. Save extraction draft JSON
9. Human review in admin UI
10. Publish into canonical DB tables

## Gemini Role

Gemini is a good fit for the extraction stage because it supports:

- PDF document understanding
- image understanding
- structured JSON output

Use it as a draft extractor, not as the final source of truth.

Recommended extraction passes:

1. Page segmentation:
   identify title, exercise boundaries, question boundaries, and visual regions
2. Text extraction:
   produce Arabic text, formulas, and labels
3. Asset classification:
   classify region as probability tree, graph, table, or generic image
4. Asset structuring:
   produce typed JSON payload for the renderer

## Validation Rules

Always validate AI output before DB insert.

Examples:

- all node IDs unique
- question order contiguous
- probability-tree edges present where required
- graph viewport numeric
- media references valid
- topic codes valid
- Arabic text not empty where expected

## Human Review Rules

Human review is mandatory for:

- exercise and question boundaries
- Arabic OCR fixes
- formulas
- incomplete-vs-complete probability trees
- approximate graphs
- answer correctness

## Rendering Rules

Render semantically whenever possible:

- Arabic content in RTL
- graph internals can stay LTR if that matches math notation
- SVG for trees and graphs
- HTML table for tables
- scanned crop as fallback or "view original" mode

## Practical Recommendation

The ingestion system should be provider-agnostic.

Define one internal extraction JSON contract. Then:

- Gemini can be the first extractor
- another OCR or vision model can replace one stage later
- the DB insert logic stays unchanged

This avoids coupling your schema to one model vendor.
