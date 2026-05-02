# Courses Foundation and Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-ready `Courses` slice for BAC Bank, including schema, contracts, API read models, navigation, subject/topic pages, and a premium concept player with micro-quiz completion.

**Architecture:** Add a new authored-content domain that references the existing curriculum taxonomy without overloading the current study roadmap tables. The backend owns authored course data and student concept progress; the web app renders server-first routes for course discovery and topic progression, with a small client island for the concept player and micro-quiz interactions.

**Tech Stack:** Prisma, NestJS, Next.js App Router, TypeScript, Zod runtime contracts, Vitest, Jest e2e, existing BAC Bank student shell.

---

### Task 1: Add Courses Contracts and Persistence

**Files:**
- Create: `packages/contracts/src/courses.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/prisma/seed.ts`
- Test: `apps/api/src/courses/courses-read.service.spec.ts`

- [ ] **Step 1: Write the failing backend shape test**

```ts
import { describe, expect, it } from "@jest/globals";
import { parseCoursesSubjectListResponse } from "@bac-bank/contracts";

describe("courses contracts", () => {
  it("parses the subject courses payload", () => {
    const payload = parseCoursesSubjectListResponse({
      data: [
        {
          subject: { code: "MATHEMATICS", name: "الرياضيات", slug: "mathematics" },
          progressPercent: 0,
          unitCount: 2,
          conceptCount: 8,
          completedConceptCount: 0,
          href: "/student/courses/MATHEMATICS",
        },
      ],
    });

    expect(payload.data[0].subject.code).toBe("MATHEMATICS");
  });
});
```

- [ ] **Step 2: Run the parser test to verify it fails**

Run: `npm test -- --runInBand packages/contracts/src/courses.ts`

Expected: FAIL because `courses.ts` parsers do not exist yet.

- [ ] **Step 3: Add the contracts and Prisma enums/tables**

```ts
export const courseConceptStatusSchema = z.enum([
  "LOCKED",
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
  "NEEDS_REVIEW",
]);
```

```prisma
enum CourseStepType {
  HOOK
  EXPLAIN
  INSPECT
  RULE
  WORKED_EXAMPLE
  COMMON_TRAP
  QUICK_CHECK
  EXAM_LENS
  TAKEAWAY
}

enum StudentConceptStatus {
  LOCKED
  READY
  IN_PROGRESS
  COMPLETED
  NEEDS_REVIEW
}
```

- [ ] **Step 4: Add the first authored tables**

```prisma
model CourseUnit {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  curriculumId String  @map("curriculum_id") @db.Uuid
  code        String
  title       String
  description String?  @db.Text
  orderIndex  Int      @map("order_index")
  curriculum  SubjectCurriculum @relation(fields: [curriculumId], references: [id], onDelete: Cascade)
  topicLinks   CourseUnitTopic[]
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([curriculumId, code])
  @@unique([curriculumId, orderIndex])
  @@map("course_units")
}
```

```prisma
model CourseConcept {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  topicId      String  @map("topic_id") @db.Uuid
  code        String
  slug        String
  title       String
  summary     String?  @db.Text
  orderIndex  Int      @map("order_index")
  estimatedMinutes Int? @map("estimated_minutes")
  topic       Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  steps       CourseStep[]
  quizItems   CourseQuizItem[]
  studentProgress StudentConceptProgress[]
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([topicId, code])
  @@unique([topicId, slug])
  @@unique([topicId, orderIndex])
  @@map("course_concepts")
}
```

- [ ] **Step 5: Seed one narrow launch slice**

Run: `npm run prisma:seed -w @bac-bank/api`

Expected: PASS with sample course units, topic links, concepts, steps, and quiz rows for one subject slice.

- [ ] **Step 6: Run targeted verification**

Run: `npm run prisma:generate -w @bac-bank/api`

Expected: PASS with generated client reflecting new course models.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/src/courses.ts packages/contracts/src/index.ts apps/api/prisma/schema.prisma apps/api/prisma/seed.ts
git commit -m "feat: add courses schema and contracts"
```

### Task 2: Add Courses API Read Models and Controller

**Files:**
- Create: `apps/api/src/courses/courses.module.ts`
- Create: `apps/api/src/courses/courses.controller.ts`
- Create: `apps/api/src/courses/courses-read.service.ts`
- Create: `apps/api/src/courses/courses-read.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/app.e2e-spec.ts`

- [ ] **Step 1: Write the failing read-model test**

```ts
it("builds subject course summaries with progress and continue links", async () => {
  const payload = await service.listSubjectsForUser({
    userId: "user-1",
    streamId: "stream-1",
  });

  expect(payload.data[0].unitCount).toBeGreaterThan(0);
  expect(payload.data[0].href).toContain("/student/courses/");
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -w @bac-bank/api -- courses-read.service.spec.ts --runInBand`

Expected: FAIL because the courses module does not exist.

- [ ] **Step 3: Implement subject, topic, and concept read endpoints**

```ts
@Controller("courses")
export class CoursesController {
  @Get("subjects")
  listSubjects() {
    return this.coursesReadService.listSubjectsForUser(/* auth user */);
  }

  @Get("subjects/:subjectCode")
  getSubject(@Param("subjectCode") subjectCode: string) {
    return this.coursesReadService.getSubjectCourse(subjectCode);
  }

  @Get("subjects/:subjectCode/topics/:topicSlug")
  getTopic(
    @Param("subjectCode") subjectCode: string,
    @Param("topicSlug") topicSlug: string,
  ) {
    return this.coursesReadService.getTopicCourse(subjectCode, topicSlug);
  }
}
```

- [ ] **Step 4: Mount the module**

```ts
imports: [
  RedisModule,
  PrismaModule,
  CatalogModule,
  AuthModule,
  BillingModule,
  HealthModule,
  StudyModule,
  CoursesModule,
  AdminModule,
  IngestionModule,
]
```

- [ ] **Step 5: Add one e2e smoke assertion**

```ts
it("/api/v1/courses/subjects (GET)", async () => {
  const response = await request(app.getHttpServer())
    .get("/api/v1/courses/subjects")
    .expect(200);

  expect(Array.isArray(response.body.data)).toBe(true);
});
```

- [ ] **Step 6: Run verification**

Run: `npm test -w @bac-bank/api -- courses-read.service.spec.ts app.e2e-spec.ts --runInBand`

Expected: PASS for subject and topic course responses.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/courses apps/api/src/app.module.ts apps/api/test/app.e2e-spec.ts
git commit -m "feat: add courses read api"
```

### Task 3: Add Student Routes and Navigation for Courses

**Files:**
- Modify: `apps/web/src/lib/student-routes.ts`
- Modify: `apps/web/src/components/student-navbar.tsx`
- Create: `apps/web/src/app/student/courses/page.tsx`
- Create: `apps/web/src/app/student/courses/[subjectCode]/page.tsx`
- Create: `apps/web/src/app/student/courses/[subjectCode]/topics/[topicSlug]/page.tsx`
- Test: `apps/web/src/lib/student-routes.spec.ts`

- [ ] **Step 1: Write the failing route test**

```ts
it("builds courses routes", () => {
  expect(buildStudentCoursesRoute()).toBe("/student/courses");
  expect(buildStudentCourseSubjectRoute("MATHEMATICS")).toBe(
    "/student/courses/MATHEMATICS",
  );
});
```

- [ ] **Step 2: Run the route test to verify it fails**

Run: `npm test -w @bac-bank/web -- student-routes.spec.ts --runInBand`

Expected: FAIL because the route helpers do not exist.

- [ ] **Step 3: Add route helpers and sidebar items**

```ts
export const STUDENT_COURSES_ROUTE = "/student/courses";

export function buildStudentCourseSubjectRoute(subjectCode: string): string {
  return `${STUDENT_COURSES_ROUTE}/${encodeURIComponent(subjectCode)}`;
}
```

```tsx
{
  href: STUDENT_COURSES_ROUTE,
  label: "الدورات",
  shortLabel: "دورات",
  icon: GraduationCap,
  surface: "courses" as const,
}
```

- [ ] **Step 4: Add server route shells**

```tsx
export default async function StudentCoursesPage() {
  return <CoursesHomePage />;
}
```

- [ ] **Step 5: Run verification**

Run: `npm test -w @bac-bank/web -- student-routes.spec.ts --runInBand`

Expected: PASS with new route builders and surface matching.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/student-routes.ts apps/web/src/lib/student-routes.spec.ts apps/web/src/components/student-navbar.tsx apps/web/src/app/student/courses
git commit -m "feat: add courses routes and navigation"
```

### Task 4: Add Server Fetchers and Courses Pages

**Files:**
- Create: `apps/web/src/lib/courses-api.ts`
- Create: `apps/web/src/lib/server-courses-api.ts`
- Create: `apps/web/src/components/courses-home-page.tsx`
- Create: `apps/web/src/components/course-subject-page.tsx`
- Create: `apps/web/src/components/course-topic-page.tsx`
- Test: `apps/web/src/lib/courses-api.spec.ts`

- [ ] **Step 1: Write the failing parser test**

```ts
it("parses a course subject payload", () => {
  const payload = parseCourseSubjectResponse(fixture);
  expect(payload.subject.code).toBe("MATHEMATICS");
  expect(payload.units[0].topics.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the parser test to verify it fails**

Run: `npm test -w @bac-bank/web -- courses-api.spec.ts --runInBand`

Expected: FAIL because courses API parsers do not exist.

- [ ] **Step 3: Add shared parsers and server fetchers**

```ts
export async function fetchServerCourseSubjects() {
  return fetchServerApiJson("/courses/subjects", undefined, "Courses request failed.", parseCourseSubjectListResponse);
}
```

- [ ] **Step 4: Build the first server components**

```tsx
export async function CoursesHomePage() {
  const payload = await fetchServerCourseSubjects();
  return <section>{/* premium subject grid */}</section>;
}
```

- [ ] **Step 5: Run verification**

Run: `npm test -w @bac-bank/web -- courses-api.spec.ts --runInBand`

Expected: PASS with parsed subject and topic structures.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/courses-api.ts apps/web/src/lib/server-courses-api.ts apps/web/src/components/courses-home-page.tsx apps/web/src/components/course-subject-page.tsx apps/web/src/components/course-topic-page.tsx
git commit -m "feat: add courses pages and fetchers"
```

### Task 5: Add Concept Player and Student Concept Progress

**Files:**
- Create: `apps/api/src/courses/courses-progress.service.ts`
- Modify: `apps/api/src/courses/courses.controller.ts`
- Create: `apps/web/src/components/course-concept-player.tsx`
- Create: `apps/web/src/lib/course-concept-player.ts`
- Test: `apps/web/src/lib/course-concept-player.spec.ts`
- Test: `apps/api/src/courses/courses-progress.service.spec.ts`

- [ ] **Step 1: Write the failing player-state test**

```ts
it("advances through steps and requires quiz completion before concept completion", () => {
  const state = createCourseConceptPlayerState(fixtureConcept);
  state.advance();
  state.completeQuiz([{ itemId: "quiz-1", isCorrect: true }, { itemId: "quiz-2", isCorrect: true }]);

  expect(state.status).toBe("COMPLETED");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w @bac-bank/web -- course-concept-player.spec.ts --runInBand`

Expected: FAIL because player state helpers do not exist.

- [ ] **Step 3: Add minimal player logic and progress endpoint**

```ts
export function deriveConceptStatus(input: {
  quizPassed: boolean;
  startedAt: string | null;
}) {
  if (input.quizPassed) return "COMPLETED";
  if (input.startedAt) return "IN_PROGRESS";
  return "READY";
}
```

```ts
@Post("concepts/:conceptId/progress")
updateConceptProgress(@Param("conceptId") conceptId: string, @Body() body: UpdateConceptProgressDto) {
  return this.coursesProgressService.updateProgress(conceptId, body);
}
```

- [ ] **Step 4: Render the first client player**

```tsx
"use client";

export function CourseConceptPlayer({ concept }: { concept: CourseConcept }) {
  const [stepIndex, setStepIndex] = useState(0);
  return <div>{/* step renderer + micro-quiz */}</div>;
}
```

- [ ] **Step 5: Run verification**

Run: `npm test -w @bac-bank/web -- course-concept-player.spec.ts --runInBand`

Run: `npm test -w @bac-bank/api -- courses-progress.service.spec.ts --runInBand`

Expected: PASS with player state transitions and persisted completion.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/courses/courses-progress.service.ts apps/api/src/courses/courses-progress.service.spec.ts apps/api/src/courses/courses.controller.ts apps/web/src/components/course-concept-player.tsx apps/web/src/lib/course-concept-player.ts apps/web/src/lib/course-concept-player.spec.ts
git commit -m "feat: add courses concept player and progress"
```

### Task 6: Final UI Polish, Docs, and Verification

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `BAC-platform-architecture-workbench.md`
- Test: `apps/web/e2e/app.smoke.spec.ts`

- [ ] **Step 1: Add the failing smoke expectation**

```ts
await expect(page.getByRole("link", { name: "الدورات" })).toBeVisible();
```

- [ ] **Step 2: Run the smoke test to verify current failure**

Run: `npm test -w @bac-bank/web -- app.smoke.spec.ts --runInBand`

Expected: FAIL before the courses surface is fully wired.

- [ ] **Step 3: Add premium layout styles and update the workbench source of truth**

```md
- Top-level surfaces now include `Courses` and `Flashcards`
- Courses is the authored theory domain
```

- [ ] **Step 4: Run end-to-end verification**

Run: `npm run release:check`

Expected: PASS or a clearly documented known blocker if local infra prevents full completion.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/globals.css BAC-platform-architecture-workbench.md apps/web/e2e/app.smoke.spec.ts
git commit -m "feat: ship courses foundation and player"
```
