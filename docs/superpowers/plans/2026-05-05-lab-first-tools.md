# Lab First Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first student Lab section with a Math Function Explorer and an SVT DNA to Protein tool.

**Architecture:** Keep Lab metadata and tool logic local to the web app. Add typed route/registry helpers, pure testable logic for math sampling and DNA translation, then wrap each tool in focused client components inside server-rendered student routes.

**Tech Stack:** Next.js App Router, React client components, Vitest, existing `function-plot`, lucide-react icons, existing student shell styles.

---

## File Structure

- Modify `apps/web/src/lib/student-routes.ts` for Lab route constants/builders and active nav support.
- Modify `apps/web/src/lib/student-routes.spec.ts` for Lab route coverage.
- Create `apps/web/src/lib/lab-surface.ts` for the typed tool registry and course-link lookups.
- Create `apps/web/src/lib/lab-surface.spec.ts` for registry coverage.
- Create `apps/web/src/lib/lab-function-explorer.ts` for presets, safe expression validation, value tables, and root hints.
- Create `apps/web/src/lib/lab-function-explorer.spec.ts` for math helper behavior.
- Create `apps/web/src/lib/lab-dna-to-protein.ts` for DNA normalization, transcription, translation, mutation application, and consequence classification.
- Create `apps/web/src/lib/lab-dna-to-protein.spec.ts` for SVT helper behavior.
- Modify `apps/web/src/components/student-navbar.tsx` to add `المختبر`.
- Create `apps/web/src/components/lab-home-page.tsx`.
- Create `apps/web/src/components/function-explorer-lab.tsx`.
- Create `apps/web/src/components/dna-to-protein-lab.tsx`.
- Modify `apps/web/src/components/course-concept-page.tsx` and `apps/web/src/components/course-concept-player.tsx` for metadata-driven contextual Lab links.
- Create routes under `apps/web/src/app/student/lab/**/page.tsx`.
- Modify `apps/web/src/app/globals.css` with scoped `.lab-*` and `.course-lab-*` styles.

## Task 1: Routes And Registry

**Files:**
- Modify: `apps/web/src/lib/student-routes.ts`
- Modify: `apps/web/src/lib/student-routes.spec.ts`
- Create: `apps/web/src/lib/lab-surface.ts`
- Create: `apps/web/src/lib/lab-surface.spec.ts`

- [ ] **Step 1: Write route and registry tests**

```ts
expect(STUDENT_LAB_ROUTE).toBe("/student/lab");
expect(isStudentSurfaceActive("/student/lab/math/function-explorer", "lab")).toBe(true);
expect(buildStudentLabToolRoute("math", "function-explorer")).toBe("/student/lab/math/function-explorer");
expect(getLabToolById("dna-to-protein")?.href).toBe("/student/lab/svt/dna-to-protein");
expect(getLabToolsForCourseConcept({
  subjectCode: "NATURAL_SCIENCES",
  topicSlug: "proteins",
  conceptSlug: "translation-chain",
})).toHaveLength(1);
```

- [ ] **Step 2: Run the failing tests**

Run: `npm run test -w @bac-bank/web -- src/lib/student-routes.spec.ts src/lib/lab-surface.spec.ts`

Expected: fail because Lab route and registry exports do not exist.

- [ ] **Step 3: Add the route constants/builders and registry**

```ts
export const STUDENT_LAB_ROUTE = "/student/lab";

export function buildStudentLabToolRoute(subjectSlug: string, toolSlug: string) {
  return `${STUDENT_LAB_ROUTE}/${encodeURIComponent(subjectSlug)}/${encodeURIComponent(toolSlug)}`;
}
```

```ts
export const labTools = [
  {
    id: "function-explorer",
    subjectSlug: "math",
    href: buildStudentLabToolRoute("math", "function-explorer"),
    relatedCourseRefs: [{ subjectCode: "MATHEMATICS", topicSlug: "functions" }],
  },
  {
    id: "dna-to-protein",
    subjectSlug: "svt",
    href: buildStudentLabToolRoute("svt", "dna-to-protein"),
    relatedCourseRefs: [
      { subjectCode: "NATURAL_SCIENCES", topicSlug: "proteins", conceptSlug: "dna-instruction" },
      { subjectCode: "NATURAL_SCIENCES", topicSlug: "proteins", conceptSlug: "transcription-working-copy" },
      { subjectCode: "NATURAL_SCIENCES", topicSlug: "proteins", conceptSlug: "genetic-code" },
      { subjectCode: "NATURAL_SCIENCES", topicSlug: "proteins", conceptSlug: "translation-chain" },
    ],
  },
] satisfies LabTool[];
```

- [ ] **Step 4: Run tests**

Run: `npm run test -w @bac-bank/web -- src/lib/student-routes.spec.ts src/lib/lab-surface.spec.ts`

Expected: pass.

## Task 2: Pure Tool Logic

**Files:**
- Create: `apps/web/src/lib/lab-function-explorer.ts`
- Create: `apps/web/src/lib/lab-function-explorer.spec.ts`
- Create: `apps/web/src/lib/lab-dna-to-protein.ts`
- Create: `apps/web/src/lib/lab-dna-to-protein.spec.ts`

- [ ] **Step 1: Write failing helper tests**

```ts
expect(buildFunctionValueTable("x^2 - 4*x + 3", [0, 1, 3]).rows).toEqual([
  { x: 0, y: 3 },
  { x: 1, y: 0 },
  { x: 3, y: 0 },
]);
expect(detectApproximateRoots("x^2 - 4*x + 3", [0, 4])).toEqual([1, 3]);
expect(validateFunctionExpression("alert(1)").error).toContain("غير مدعومة");
```

```ts
const original = analyzeDnaSequence("ATGTTTGGGTAA");
expect(original.mrnaCodons.map((codon) => codon.value)).toEqual(["AUG", "UUU", "GGG", "UAA"]);
expect(original.aminoAcids.map((item) => item.shortCode)).toEqual(["Met", "Phe", "Gly", "Stop"]);
const mutated = buildMutatedDnaSequence("ATGTTTGGGTAA", { kind: "substitution", index: 4, base: "C" });
expect(mutated.sequence).toBe("ATG TCT GGG TAA".replaceAll(" ", ""));
expect(compareDnaAnalyses(original, analyzeDnaSequence(mutated.sequence), "substitution").kind).toBe("AMINO_ACID_CHANGE");
```

- [ ] **Step 2: Run the failing tests**

Run: `npm run test -w @bac-bank/web -- src/lib/lab-function-explorer.spec.ts src/lib/lab-dna-to-protein.spec.ts`

Expected: fail because helper files do not exist.

- [ ] **Step 3: Implement the helpers**

Use `function-plot`'s exported `EvalBuiltIn` for expression evaluation. Keep DNA logic custom and deterministic with a local codon table.

- [ ] **Step 4: Run helper tests**

Run: `npm run test -w @bac-bank/web -- src/lib/lab-function-explorer.spec.ts src/lib/lab-dna-to-protein.spec.ts`

Expected: pass.

## Task 3: Student Lab UI

**Files:**
- Modify: `apps/web/src/components/student-navbar.tsx`
- Create: `apps/web/src/components/lab-home-page.tsx`
- Create: `apps/web/src/components/function-explorer-lab.tsx`
- Create: `apps/web/src/components/dna-to-protein-lab.tsx`
- Create: `apps/web/src/app/student/lab/page.tsx`
- Create: `apps/web/src/app/student/lab/math/function-explorer/page.tsx`
- Create: `apps/web/src/app/student/lab/svt/dna-to-protein/page.tsx`

- [ ] **Step 1: Add the Lab nav item**

Use a lucide lab icon and route it to `STUDENT_LAB_ROUTE` with label `المختبر` and short label `مختبر`.

- [ ] **Step 2: Build the Lab home component**

Read `listLabSubjectGroups()` from the registry and render subject sections with tool cards, BAC use cases, and open-tool buttons.

- [ ] **Step 3: Build the Function Explorer component**

Render preset buttons, an expression input, graph preview via `FormulaGraphPlot`, root hints, and a value table from the pure helpers.

- [ ] **Step 4: Build the DNA to Protein component**

Render DNA presets/input, original and mutated pipelines, mutation controls, and the comparison consequence from the pure helpers.

- [ ] **Step 5: Add route files**

Each route should import and render the matching page component.

## Task 4: Contextual Course Links And Styles

**Files:**
- Modify: `apps/web/src/components/course-concept-page.tsx`
- Modify: `apps/web/src/components/course-concept-player.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Pass related Lab tools into concept pages**

Use `getLabToolsForCourseConcept()` with the current subject, topic, and concept slug.

- [ ] **Step 2: Render the links in the concept player**

Show a small `المختبر` inspector section only when related Lab tools exist.

- [ ] **Step 3: Add scoped styles**

Append `.lab-*` and `.course-lab-*` rules to `globals.css`. Keep the layout responsive and avoid changing existing course/training selectors.

## Task 5: Verification

**Files:**
- All changed files

- [ ] **Step 1: Run targeted unit tests**

Run: `npm run test -w @bac-bank/web -- src/lib/student-routes.spec.ts src/lib/lab-surface.spec.ts src/lib/lab-function-explorer.spec.ts src/lib/lab-dna-to-protein.spec.ts`

Expected: pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint -w @bac-bank/web`

Expected: pass or report pre-existing unrelated failures separately.

- [ ] **Step 3: Start the web app with test auth**

Run: `PLAYWRIGHT_TEST_AUTH=true npm run dev -w @bac-bank/web`

Expected: local dev server starts on port 3000 or another available port.

- [ ] **Step 4: Verify the main Lab routes**

Open with a browser/test request using the `bb_test_auth=student` cookie:

- `/student/lab`
- `/student/lab/math/function-explorer`
- `/student/lab/svt/dna-to-protein`

Expected: each page renders without blank content, the Function Explorer graph exists, and the DNA tool updates after mutation changes.
