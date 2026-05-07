# AI Studio BAC Extraction Prompts

Use this document when extracting Algerian BAC exam PDFs with Gemini in Google
AI Studio, then handing the JSON to Codex for normalization, validation, import,
and app review.

The intended split is:

1. AI Studio does the first source-faithful PDF-to-JSON extraction.
2. Codex validates and normalizes the JSON into the BAC_Bank reviewed extract
   shape.
3. The app review UI handles human review, asset crops, approval, and publish.

Use a Gemini Pro-family model for the first pass. Do not use Flash models as the
authoritative extractor for BAC papers.

## Where To Paste

- Paste the system prompt into AI Studio system instructions.
- Paste the per-paper prompt into the main prompt.
- Paste the JSON schema into AI Studio structured output.
- Attach both PDFs in every run: the exam subject PDF and the official
  correction PDF.

## System Prompt

```text
You extract structured Algerian BAC exam content from scanned exam and official correction PDFs.

The exam PDF and correction PDF are authoritative source documents. Stay maximally faithful to the visible pages. Do not summarize, compress, simplify, invent, or silently rewrite visible content.

Core rules:
- Return strict JSON only, matching the provided structured output schema.
- Extract all visible variants/topics, usually SUJET_1 and SUJET_2, when present.
- Preserve exercise, part, question, and subquestion order exactly as shown.
- Use nodes with nodeType: EXERCISE, PART, QUESTION, SUBQUESTION, or CONTEXT.
- Use parentLocalId to represent hierarchy. Root nodes may omit parentLocalId or use an empty string.
- Put exam statement content in PROMPT blocks.
- Put official correction content in SOLUTION blocks.
- Put visible grading, bareme, score splits, and point allocation details in RUBRIC blocks.
- Do not drop correction steps, bare results, notes, tables, answer conditions, or point splits.
- Do not paraphrase away visible text just to make it shorter.
- If the correction gives a compressed step, you may add only a minimal clarifying bridge, but preserved source content must remain dominant.
- Preserve Arabic/French text and math notation faithfully.
- Use latex blocks for standalone formulas or formula-heavy lines.
- Use paragraph blocks for normal text.
- Use heading blocks only for short visible headings.
- Use table blocks only when the table is simple enough to transcribe textually.
- Detect meaningful assets: graphs, tables, probability trees, diagrams, and images.
- Graphs must stay as image assets. Do not recreate graphs natively.
- Native render candidates are allowed only for simple tables, sign tables, variation tables, and probability trees when the structure is visibly clear.
- Do not invent crop boxes.
- Asset page numbers are 1-based within the EXAM or CORRECTION document.
- If wording, structure, or mapping is uncertain, preserve the closest faithful result and record the uncertainty.
- Do not leave visible pages unaccounted for. Use coverageLog for every exam and correction page.
```

## Per-Paper Prompt

Replace the bracketed metadata before each run.

```text
Extract the attached BAC exam subject PDF and official correction PDF into structured JSON for ingestion.

Paper metadata:
- Current label: [PUT LABEL HERE]
- Known year: [PUT YEAR HERE]
- Current inferred stream code: [PUT STREAM CODE HERE OR unknown]
- Current inferred subject code: [PUT SUBJECT CODE HERE OR unknown]
- Current session type: [normal / makeup / unknown]
- Current title: [PUT TITLE HERE]

Attached files:
1. Exam subject PDF
2. Official correction PDF

Extraction target:
- Return all variants/topics in the paper, in order.
- Return all exercises, parts, questions, and subquestions in order.
- Do not drop any visible content from the exam PDF.
- Do not drop any visible content from the correction PDF.
- Keep SOLUTION blocks especially faithful to the correction PDF.
- Preserve visible bareme and point allocations exactly in RUBRIC blocks.
- Use assetIds to attach assets to the nearest relevant node.
- Graphs stay as image assets only.
- Put simple tables, sign tables, variation tables, and probability trees in nativeRenderCandidates only when they are clearly readable.
- If a field is unknown, omit it or use an empty string; do not guess.
- Return strict JSON only.
```

## Structured Output Schema

Paste only the JSON object below into AI Studio structured output.

```json
{
  "type": "object",
  "properties": {
    "schemaVersion": {
      "type": "string",
      "enum": ["bac_gemini_source_extract/v1"]
    },
    "paper": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "year": { "type": "integer" },
        "streamCode": { "type": "string" },
        "subjectCode": { "type": "string" },
        "sessionType": {
          "type": "string",
          "enum": ["normal", "makeup", "unknown"]
        },
        "durationMinutes": { "type": "integer" },
        "totalPoints": { "type": "number" },
        "sourceLanguage": { "type": "string" },
        "hasCorrection": { "type": "boolean" }
      },
      "propertyOrdering": [
        "title",
        "year",
        "streamCode",
        "subjectCode",
        "sessionType",
        "durationMinutes",
        "totalPoints",
        "sourceLanguage",
        "hasCorrection"
      ]
    },
    "variants": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "code": {
            "type": "string",
            "enum": ["SUJET_1", "SUJET_2"]
          },
          "title": { "type": "string" },
          "nodes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "localId": { "type": "string" },
                "parentLocalId": { "type": "string" },
                "nodeType": {
                  "type": "string",
                  "enum": ["EXERCISE", "PART", "QUESTION", "SUBQUESTION", "CONTEXT"]
                },
                "orderIndex": { "type": "integer" },
                "label": { "type": "string" },
                "maxPoints": { "type": "number" },
                "sourceRefs": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "documentKind": {
                        "type": "string",
                        "enum": ["EXAM", "CORRECTION"]
                      },
                      "pageNumber": { "type": "integer" }
                    },
                    "required": ["documentKind", "pageNumber"],
                    "propertyOrdering": ["documentKind", "pageNumber"]
                  }
                },
                "blocks": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "role": {
                        "type": "string",
                        "enum": ["PROMPT", "SOLUTION", "HINT", "RUBRIC", "META"]
                      },
                      "type": {
                        "type": "string",
                        "enum": ["paragraph", "latex", "heading", "table"]
                      },
                      "text": { "type": "string" },
                      "caption": { "type": "string" }
                    },
                    "required": ["role", "type", "text"],
                    "propertyOrdering": ["role", "type", "text", "caption"]
                  }
                },
                "assetIds": {
                  "type": "array",
                  "items": { "type": "string" }
                }
              },
              "required": [
                "localId",
                "nodeType",
                "orderIndex",
                "sourceRefs",
                "blocks",
                "assetIds"
              ],
              "propertyOrdering": [
                "localId",
                "parentLocalId",
                "nodeType",
                "orderIndex",
                "label",
                "maxPoints",
                "sourceRefs",
                "blocks",
                "assetIds"
              ]
            }
          }
        },
        "required": ["code", "title", "nodes"],
        "propertyOrdering": ["code", "title", "nodes"]
      }
    },
    "assets": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "variantCode": {
            "type": "string",
            "enum": ["SUJET_1", "SUJET_2"]
          },
          "nearestNodeLocalId": { "type": "string" },
          "documentKind": {
            "type": "string",
            "enum": ["EXAM", "CORRECTION"]
          },
          "role": {
            "type": "string",
            "enum": ["PROMPT", "SOLUTION", "HINT", "RUBRIC"]
          },
          "classification": {
            "type": "string",
            "enum": ["image", "table", "tree", "graph"]
          },
          "pageNumber": { "type": "integer" },
          "label": { "type": "string" },
          "caption": { "type": "string" },
          "notes": { "type": "string" }
        },
        "required": [
          "id",
          "nearestNodeLocalId",
          "documentKind",
          "role",
          "classification",
          "pageNumber"
        ],
        "propertyOrdering": [
          "id",
          "variantCode",
          "nearestNodeLocalId",
          "documentKind",
          "role",
          "classification",
          "pageNumber",
          "label",
          "caption",
          "notes"
        ]
      }
    },
    "nativeRenderCandidates": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "variantCode": {
            "type": "string",
            "enum": ["SUJET_1", "SUJET_2"]
          },
          "nearestNodeLocalId": { "type": "string" },
          "kind": {
            "type": "string",
            "enum": ["simple_table", "sign_table", "variation_table", "probability_tree"]
          },
          "documentKind": {
            "type": "string",
            "enum": ["EXAM", "CORRECTION"]
          },
          "pageNumber": { "type": "integer" },
          "sourceText": { "type": "string" },
          "notes": { "type": "string" }
        },
        "required": [
          "id",
          "nearestNodeLocalId",
          "kind",
          "documentKind",
          "pageNumber",
          "sourceText"
        ],
        "propertyOrdering": [
          "id",
          "variantCode",
          "nearestNodeLocalId",
          "kind",
          "documentKind",
          "pageNumber",
          "sourceText",
          "notes"
        ]
      }
    },
    "coverageLog": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "documentKind": {
            "type": "string",
            "enum": ["EXAM", "CORRECTION"]
          },
          "pageNumber": { "type": "integer" },
          "status": {
            "type": "string",
            "enum": ["covered", "partially_covered", "unreadable"]
          },
          "notes": { "type": "string" }
        },
        "required": ["documentKind", "pageNumber", "status"],
        "propertyOrdering": ["documentKind", "pageNumber", "status", "notes"]
      }
    },
    "uncertainties": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": [
    "schemaVersion",
    "paper",
    "variants",
    "assets",
    "nativeRenderCandidates",
    "coverageLog",
    "uncertainties"
  ],
  "propertyOrdering": [
    "schemaVersion",
    "paper",
    "variants",
    "assets",
    "nativeRenderCandidates",
    "coverageLog",
    "uncertainties"
  ]
}
```

## Codex Handoff

After AI Studio produces JSON, save the raw output as an artifact and give it to
Codex with the matching paper source slug or ingestion job id. Codex should then:

1. Validate that both PDFs and all visible pages are accounted for.
2. Normalize the flat nodes into the reviewed extract graph shape.
3. Convert reliable native render candidates into app-native suggestions.
4. Keep graph assets as image assets.
5. Import through the canonical reviewed-extract ingestion path.
6. Report validation errors, warnings, uncertain mappings, and remaining review
   debt.
