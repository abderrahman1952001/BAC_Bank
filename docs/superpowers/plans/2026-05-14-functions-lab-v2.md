# Functions Lab v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the current Function Explorer into a BAC-specific Functions Lab with exact/estimated labels, sign and variation panels, tangent preview, and a simple guided mission mode.

**Architecture:** Keep this first implementation inside the existing web Lab boundary to preserve current user work. Extend `apps/web/src/lib/lab-function-explorer.ts` with testable analysis helpers, then update `apps/web/src/components/function-explorer-lab.tsx` to compose the new panels. Add scoped CSS in `apps/web/src/app/globals.css` and focused Vitest coverage.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, existing SVG graph component, local shadcn primitives.

---

### Task 1: Add Function Analysis Helpers

**Files:**
- Modify: `apps/web/src/lib/lab-function-explorer.ts`
- Modify: `apps/web/src/lib/lab-function-explorer.spec.ts`

- [ ] **Step 1: Add tests for exact polynomial analysis**

Add tests covering linear and quadratic expressions:

```ts
expect(analyzeFunctionExpression("x^2 - 4*x + 3", [-2, 6], 2).family.kind).toBe("quadratic");
expect(analyzeFunctionExpression("2*x - 3", [-4, 5], 0).family.kind).toBe("linear");
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm run test -w @bac-bank/web -- src/lib/lab-function-explorer.spec.ts`

Expected: fail because `analyzeFunctionExpression` does not exist yet.

- [ ] **Step 3: Implement analysis helpers**

Add typed helpers for exact/estimated/unsupported facts, linear/quadratic recognition, simple rational recognition, sign intervals, variation intervals, derivative summaries, and tangent preview.

- [ ] **Step 4: Run focused tests and confirm pass**

Run: `npm run test -w @bac-bank/web -- src/lib/lab-function-explorer.spec.ts`

Expected: pass.

### Task 2: Upgrade Functions Lab UI

**Files:**
- Modify: `apps/web/src/components/function-explorer-lab.tsx`
- Modify: `apps/web/src/lib/lab-surface.ts`

- [ ] **Step 1: Update student-facing copy**

Rename the student-facing tool from Function Explorer to Functions Lab while keeping the existing route and id stable.

- [ ] **Step 2: Add Explore and BAC Mission modes**

Use existing local UI primitives and state. Explore shows all facts; BAC Mission emphasizes the active mission checklist.

- [ ] **Step 3: Add panels for exact/estimated/unsupported facts**

Render roots, sign intervals, derivative/tangent, variation, and common mistakes from `analyzeFunctionExpression`.

- [ ] **Step 4: Keep backend mission panel compatible**

Preserve the existing `missionItem` prop and `ActiveLabMissionPanel` behavior already present in the dirty worktree.

### Task 3: Add Scoped Styling

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Add Functions Lab layout styles**

Add scoped classes for mode controls, fact cards, sign/variation tables, tangent preview, and mission checklists.

- [ ] **Step 2: Verify mobile stacking**

Use CSS grid and wrapping so the new panels fit under the existing `@media` Lab rules without horizontal overflow.

### Task 4: Verify

**Files:**
- No planned source changes.

- [ ] **Step 1: Run focused unit tests**

Run: `npm run test -w @bac-bank/web -- src/lib/lab-function-explorer.spec.ts`

Expected: pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint -w @bac-bank/web`

Expected: pass, or report pre-existing unrelated failures if the dirty worktree blocks it.

- [ ] **Step 3: Review git diff**

Run: `git diff -- apps/web/src/lib/lab-function-explorer.ts apps/web/src/lib/lab-function-explorer.spec.ts apps/web/src/components/function-explorer-lab.tsx apps/web/src/lib/lab-surface.ts apps/web/src/app/globals.css docs/superpowers/plans/2026-05-14-functions-lab-v2.md`

Expected: only intended Functions Lab v2 changes appear in these files.
