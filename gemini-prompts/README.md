# Gemini Prompts

This directory stores the prompt assets used by the BAC ingestion extraction
flow.

The preferred operator route is manual extraction in Google AI Studio with
`Gemini 3.1 Pro`. The shared API path in
[apps/api/src/ingestion/gemini-extractor.ts](/home/abderrahman/BAC_Bank/apps/api/src/ingestion/gemini-extractor.ts)
should stay aligned with the same prompt contract.

If you run the fallback API route, confirm the exact Google API model code
explicitly. Do not assume the Studio-facing model label is the API identifier.

Files:
- `extraction-system-instruction.txt`: the main Gemini system instruction for full exam extraction
- `extraction-request-template.txt`: the per-request prompt template with runtime placeholders
- `crop-recovery-system-instruction.txt`: the system instruction for crop recovery
- `crop-recovery-request-template.md`: the crop-recovery prompt template, including mode-specific branches

The extraction output structure is still defined in code today. Keep manual
Google AI Studio runs aligned with the structured response contract in
`apps/api/src/ingestion/gemini-extractor.ts`.

Runtime placeholders:
- `{{label}}`
- `{{year}}`
- `{{streamCode}}`
- `{{subjectCode}}`
- `{{sessionType}}`
- `{{title}}`
- `{{mode}}`
- `{{caption}}`
- `{{notes}}`
