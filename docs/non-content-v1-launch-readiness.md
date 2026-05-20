# Non-Content V1 Launch Readiness

This note covers the platform work that can be launch-hardened before the BAC
content pipeline is sealed. It does not cover exam ingestion, canonical course
authoring, tagging, or mapping.

## Product Boundary

BAC Bank V1 should feel like a premium AI-native study desk:

1. The student opens My Space and types or speaks what they need now.
2. Study Command interprets the intent into a typed workflow.
3. The server previews real availability and entitlement limits.
4. The product proposes one structured session or opens the right surface.
5. Accepted proposals create or open real workflows and persist safe metadata.

The center is not a generic chatbot, not a strict daily planner, and not a
feature museum. If real content or personal history is missing, the platform
must say so cleanly instead of using hidden fallbacks.

## Required Runtime Checks

Study Command should work with AI disabled. The deterministic spine is the
default safety path.

- `AI_STUDY_COMMAND_ROUTER_ENABLED`: set `true` only after a provider adapter,
  model, credentials, and eval confidence are ready.
- `AI_STUDY_COMMAND_ROUTER_PROVIDER`: `openai` or `google`.
- `AI_STUDY_COMMAND_ROUTER_MODEL`: required when AI routing is enabled.
- `AI_STUDY_COMMAND_ROUTER_MAX_INPUT_TOKENS`: caps router input.
- `AI_STUDY_COMMAND_ROUTER_MAX_OUTPUT_TOKENS`: caps structured output.
- `AI_STUDY_COMMAND_ROUTER_TIMEOUT_MS`: keeps the command entrance responsive.
- `AI_STUDY_COMMAND_ROUTER_MIN_CONFIDENCE`: below this, deterministic routing
  wins.

Voice V1 is only push-to-talk transcription feeding the same text command flow.
It should degrade to normal typing.

- `STUDY_COMMAND_VOICE_ENABLED`: set `false` to hide the provider path.
- `OPENAI_API_KEY`: required for the current transcription route.
- `STUDY_COMMAND_VOICE_TRANSCRIBE_MODEL`: preferred transcription model knob.
- `OPENAI_TRANSCRIBE_MODEL`: legacy fallback knob.
- `STUDY_COMMAND_VOICE_MAX_AUDIO_BYTES`: upload cap.
- `STUDY_COMMAND_VOICE_TIMEOUT_MS`: provider timeout.

Study Command proposal and acceptance endpoints are guarded before expensive
work starts.

- `STUDY_COMMAND_RATE_LIMIT_ENABLED`
- `STUDY_COMMAND_RATE_LIMIT_WINDOW_MS`
- `STUDY_COMMAND_PROPOSE_LIMIT_PER_WINDOW`
- `STUDY_COMMAND_ACCEPT_LIMIT_PER_WINDOW`

## Operator Diagnostics

Use `/admin/study-command` to inspect aggregate Study Command health. It should
show:

- proposal, acceptance, created-session, opened-route, no-proposal, and
  clarification counts
- mode, subject, topic, action, availability, and AI-routing buckets
- safe guardrail pressure, including rate-limited proposal or acceptance turns
- missing-content pressure grouped by mode, subject, and topic

This page must not expose raw commands, voice transcripts, prompts, source
content, API keys, or provider payloads.

## Honest States

Before launch, each command outcome should land in one of these honest states:

- `READY`: real content and current entitlement/quota can start the workflow.
- `NEEDS_CONTENT`: the workflow is valid, but mapped content is not available.
- `UNAVAILABLE`: the blocker is quota, subscription, missing personal history,
  disabled feature config, or a temporary API/platform problem.

Do not label a proposal ready if starting it will immediately fail because of
quota or entitlement limits.

## Verification Commands

Use focused tests while editing, then run broad checks before a launch candidate:

```bash
npm run test:unit -w @bac-bank/api -- study-command.service.spec.ts study-command-engine.spec.ts study-command-ai-router.service.spec.ts study-command-usage-guard.service.spec.ts
npm run test -w @bac-bank/web -- src/app/api/study-command/propose/route.spec.ts src/app/api/study-command/accept/route.spec.ts src/app/api/study-command/transcribe/route.spec.ts src/lib/student-hub.spec.ts
npm run build -w @bac-bank/api
npm run build -w @bac-bank/web
```

When the local stack is available, run the full-stack Study Command smoke:

```bash
PLAYWRIGHT_FULL_STACK=true npm run test:e2e -w @bac-bank/web -- study-command.full-stack.spec.ts
```

## Known Non-Content Blockers

- Real launch quality still depends on the separate content pipeline producing
  mapped papers, canonical lessons, flashcard decks, simulations, and lab
  availability metadata.
- AI routing should stay disabled until provider integration is connected,
  schema validation is observed in staging, and messy Algerian command evals are
  stable.
- Voice is optional for V1; text command must remain the complete path.
- Admin diagnostics are aggregate by design. Debugging a single student command
  should rely on safe IDs and structured outcome metadata, not raw prompt logs.
