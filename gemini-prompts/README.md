# Gemini Prompts

This directory stores the current Gemini prompt texts used by the ingestion flow in
[apps/api/src/ingestion/gemini-extractor.ts](/home/abderrahman/BAC_Bank/apps/api/src/ingestion/gemini-extractor.ts).

The files here are prompt snapshots for review and iteration. The runtime source of truth
still lives in code.

Files:
- `extraction-system-instruction.txt`: the main Gemini system instruction for full exam extraction
- `extraction-request-template.txt`: the per-request prompt template with runtime placeholders
- `crop-recovery-system-instruction.txt`: the system instruction for crop recovery
- `crop-recovery-request-template.md`: the crop-recovery prompt template, including mode-specific branches

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
