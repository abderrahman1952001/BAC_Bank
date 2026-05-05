# AI-Native SVT Course Engine Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Extend the existing Courses slice so it can carry a rigorous linear SVT journey with optional depth portals, visual plans, interactions, and BAC lens metadata.

**Architecture:** Keep using the current contracts -> API read model -> web surface path. Do not introduce database-backed authoring yet. Add structured course content to the existing authored content layer and render it in the current concept player.

**Tech Stack:** TypeScript, Zod contracts, NestJS read models, Next.js App Router, React client island, Vitest/Jest.

**Execution Status:** Initial foundation implemented in this branch.

---

### Task 1: Extend Course Contracts

**Files:**
- Modify: `packages/contracts/src/courses.ts`
- Modify: `apps/api/src/courses/courses.contract.spec.ts`

- [x] **Step 1: Write the failing contract test**

Add a concept response fixture that includes:

- required step `type`
- optional `visual`
- optional `interaction`
- optional `examLens`
- `depthPortals`

Expected failure before implementation: parsed response does not preserve the new fields.

- [x] **Step 2: Add Zod schemas and TypeScript types**

Add:

- `CourseConceptStepType`
- `CourseConceptVisual`
- `CourseConceptInteraction`
- `CourseExamLens`
- `CourseDepthPortal`

Update `CourseConceptStep` and `CourseConceptResponse`.

- [x] **Step 3: Verify contracts**

Run: `npm run test:unit -w @bac-bank/api -- courses.contract.spec.ts --runInBand`

Expected: PASS.

### Task 2: Seed The First SVT Protein Journey Slice

**Files:**
- Modify: `apps/api/src/courses/course-authored-content.ts`
- Modify: `apps/api/src/courses/courses-read-model.spec.ts`

- [x] **Step 1: Write the failing read-model test**

Assert that an authored `NATURAL_SCIENCES` / `proteins` topic returns concepts with depth portal metadata preserved through `buildCourseConceptResponse`.

- [x] **Step 2: Add the authored SVT topic**

Seed a narrow first slice:

- `protein-world`
- `dna-instruction`
- `transcription-working-copy`
- `genetic-code`
- `translation-chain`

Each concept should include structured steps, at least one visual plan, at least one interaction prompt, one BAC lens, one micro-quiz, and optional depth portals when useful.

- [x] **Step 3: Verify read model**

Run: `npm run test:unit -w @bac-bank/api -- courses-read-model.spec.ts --runInBand`

Expected: PASS.

### Task 3: Render The Rich Concept Player

**Files:**
- Modify: `apps/web/src/lib/courses-surface.ts`
- Modify: `apps/web/src/lib/courses-surface.spec.ts`
- Modify: `apps/web/src/components/course-concept-player.tsx`
- Modify: `apps/web/src/app/globals.css`

- [x] **Step 1: Write the failing surface test**

Assert that `buildCourseConceptPageModel` preserves `depthPortals`, visual plans, interactions, and exam lens metadata.

- [x] **Step 2: Update the player**

Render:

- step type label
- visual plan panel
- interaction prompt panel
- BAC lens panel
- optional depth portal section

- [x] **Step 3: Verify web surface**

Run: `npm run test -w @bac-bank/web -- courses-surface.spec.ts`

Expected: PASS.

### Task 4: Final Verification

**Files:**
- All files changed above

- [x] **Step 1: Run targeted API tests**

Run: `npm run test:unit -w @bac-bank/api -- courses.contract.spec.ts courses-read-model.spec.ts --runInBand`

Expected: PASS.

- [x] **Step 2: Run targeted web tests**

Run: `npm run test -w @bac-bank/web -- courses-surface.spec.ts`

Expected: PASS.

- [x] **Step 3: Report remaining risks**

Report that this is still static authored content and that the next meaningful step is a reviewed authoring pipeline for canonical course nodes.
