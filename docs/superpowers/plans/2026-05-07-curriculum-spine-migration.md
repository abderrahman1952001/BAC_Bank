# Curriculum Spine Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status note:** This plan describes the old-to-new migration. Current docs and new code should treat curriculum journeys as canonical; `roadmap` names below are legacy compatibility or removal targets, not current product identity.

**Goal:** Replace the old exam-practice-first topic/roadmap model with one curriculum spine that powers courses, exam-node mappings, student progress, and stream-specific subject offerings.

**Architecture:** The canonical spine is `Stream -> SubjectOffering -> Curriculum -> CurriculumNode`. Course lessons, exam nodes, skills, and student progress attach to `CurriculumNode`. Legacy roadmap tables are removed after the study/course APIs are moved to curriculum-derived journeys.

**Tech Stack:** NestJS API, Prisma/Postgres, `packages/contracts` runtime schemas, Next.js student/admin surfaces, canonical `bac_theory_content/canonical/**/course.json` blueprints.

---

## File Structure

- Modify: `apps/api/prisma/schema.prisma`
  - Rename the curriculum taxonomy models and add lesson/progress models.
  - Remove `SubjectRoadmap`, `RoadmapSection`, `RoadmapNode`, and `SubjectCurriculumStream` after replacement services compile.
- Create: `apps/api/prisma/migrations/<timestamp>_curriculum_spine_foundation/migration.sql`
  - Rename topic/curriculum tables, add subject-offering curriculum references, add course lesson tables, and keep existing exam-practice and progress data.
- Modify: `apps/api/prisma/seed.ts`
  - Seed `SubjectOffering` with `curriculumId` instead of maintaining separate `stream_subjects` plus `subject_curriculum_streams`.
  - Seed `CurriculumNode` hierarchy directly; do not seed roadmap shells.
- Delete: `apps/api/prisma/roadmap-definitions.ts`
  - Its purpose is replaced by curriculum node ordering and optional lesson ordering.
- Create: `apps/api/src/curriculum/curriculum-node-read-model.ts`
  - Builds filter trees, subject journeys, and next actions from `CurriculumNode` plus student rollups.
- Create: `apps/api/src/curriculum/curriculum-blueprint-sync.service.ts`
  - Imports canonical `course.json` files into `CurriculumNode`, `CourseLesson`, and child course tables.
- Create: `apps/api/scripts/sync-course-blueprints.ts`
  - Operator command wrapping `CurriculumBlueprintSyncService`.
- Modify: `apps/api/src/study/study-roadmap.service.ts`
  - Replace with a compatibility facade that delegates to curriculum journeys, then delete once web routes are renamed.
- Modify: `apps/api/src/study/study.controller.ts`
  - Add `/study/curriculum-journeys`; keep `/study/roadmaps` temporarily as an alias only during migration.
- Modify: `apps/api/src/courses/*`
  - Read course pages from DB-backed `CourseLesson` instead of file-backed authored content.
- Modify: `apps/api/src/study/study-session.service.ts`, `apps/api/src/study/study-read-model.service.ts`, `apps/api/src/study/study-weak-point.service.ts`
  - Replace topic rollup and topic mapping names with curriculum node mapping names.
- Modify: `packages/contracts/src/study.ts`, `packages/contracts/src/courses.ts`
  - Rename public contract concepts from roadmap/topic where they now mean curriculum node.
- Modify: `apps/web/src/lib/study-api.ts`, `apps/web/src/lib/server-study-api.ts`, `apps/web/src/lib/student-hub.ts`, `apps/web/src/components/subject-roadmap-page.tsx`, `apps/web/src/components/subject-roadmap-trail.tsx`
  - Rename the student journey surface away from roadmap internals.
- Modify: `apps/web/src/lib/session-builder.ts`, `apps/web/src/components/topic-tag-picker.tsx`, admin ingestion editor files
  - Keep UI wording as "محاور" where appropriate, but wire selection to curriculum node codes.
- Create/modify tests beside each touched API/web module.

---

## Target Data Model

Use this as the target Prisma shape. Exact relation names can be adjusted during implementation, but the ownership boundaries should stay intact.

```prisma
enum CurriculumNodeKind {
  FIELD
  UNIT
  TOPIC
  CONCEPT
  SKILL
  OPTIONAL_PORTAL
}

enum CourseContentStatus {
  DRAFT
  REVIEWED
  PUBLISHED
  ARCHIVED
}

model SubjectOffering {
  id            String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  streamId      String     @map("stream_id") @db.Uuid
  subjectId     String     @map("subject_id") @db.Uuid
  curriculumId  String     @map("curriculum_id") @db.Uuid
  coefficient   Int?
  isOptional    Boolean    @default(false) @map("is_optional")
  validFromYear Int        @default(0) @map("valid_from_year")
  validToYear   Int?       @map("valid_to_year")
  stream        Stream     @relation(fields: [streamId], references: [id], onDelete: Cascade)
  subject       Subject    @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  curriculum    Curriculum @relation(fields: [curriculumId], references: [id], onDelete: Restrict)
  createdAt     DateTime   @default(now()) @map("created_at")

  @@unique([streamId, subjectId, validFromYear])
  @@index([curriculumId])
  @@map("subject_offerings")
}

model Curriculum {
  id            String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subjectId     String           @map("subject_id") @db.Uuid
  code          String
  familyCode    String           @default("legacy") @map("family_code")
  title         String
  validFromYear Int              @default(0) @map("valid_from_year")
  validToYear   Int?             @map("valid_to_year")
  isActive      Boolean          @default(true) @map("is_active")
  subject       Subject          @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  offerings     SubjectOffering[]
  nodes         CurriculumNode[]
  skills        Skill[]
  createdAt     DateTime         @default(now()) @map("created_at")
  updatedAt     DateTime         @updatedAt @map("updated_at")

  @@unique([subjectId, code])
  @@index([subjectId, isActive])
  @@map("curricula")
}

model CurriculumNode {
  id             String                    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subjectId      String                    @map("subject_id") @db.Uuid
  curriculumId   String                    @map("curriculum_id") @db.Uuid
  code           String
  name           String
  slug           String
  kind           CurriculumNodeKind
  parentId       String?                   @map("parent_id") @db.Uuid
  depth          Int                       @default(0)
  path           String                    @db.Text
  displayOrder   Int                       @default(0) @map("display_order")
  isSelectable   Boolean                   @default(true) @map("is_selectable")
  studentLabel   String?                   @map("student_label")
  subject        Subject                   @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  curriculum     Curriculum                @relation(fields: [curriculumId], references: [id], onDelete: Cascade)
  parent         CurriculumNode?           @relation("CurriculumNodeHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children       CurriculumNode[]          @relation("CurriculumNodeHierarchy")
  examMappings   ExamNodeCurriculumNode[]
  skillMappings  CurriculumNodeSkill[]
  lesson         CourseLesson?
  studentRollups StudentCurriculumNodeRollup[]
  createdAt      DateTime                  @default(now()) @map("created_at")
  updatedAt      DateTime                  @updatedAt @map("updated_at")

  @@unique([curriculumId, code])
  @@unique([curriculumId, slug])
  @@index([subjectId])
  @@index([curriculumId, path])
  @@index([parentId])
  @@map("curriculum_nodes")
}

model CourseLesson {
  id               String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  curriculumNodeId String              @unique @map("curriculum_node_id") @db.Uuid
  status           CourseContentStatus @default(DRAFT)
  slug             String
  role             String
  title            String
  summary          String              @db.Text
  learningObjective String?            @map("learning_objective") @db.Text
  estimatedMinutes Int                 @map("estimated_minutes")
  orderIndex       Int                 @map("order_index")
  sourceBlueprintId String?            @map("source_blueprint_id")
  sourceMetadata   Json?               @map("source_metadata")
  curriculumNode   CurriculumNode      @relation(fields: [curriculumNodeId], references: [id], onDelete: Cascade)
  steps            CourseLessonStep[]
  depthPortals     CourseDepthPortal[]
  quiz             CourseQuiz?
  progress         StudentCourseLessonProgress[]
  createdAt        DateTime            @default(now()) @map("created_at")
  updatedAt        DateTime            @updatedAt @map("updated_at")

  @@index([status])
  @@map("course_lessons")
}
```

---

## Task 1: Add Contract Names Without Breaking Runtime Shapes

**Files:**
- Modify: `packages/contracts/src/study.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: existing contract/API tests using `npm run test:unit -w @bac-bank/api -- courses/courses.contract.spec.ts`

- [ ] **Step 1: Add curriculum journey aliases beside existing roadmap contracts**

In `packages/contracts/src/study.ts`, add new exported aliases while keeping current response shape:

```ts
export type CurriculumJourneyNodeStatus = StudyRoadmapNodeStatus;
export type CurriculumJourneyActionType = StudyRoadmapActionType;
export type CurriculumJourneysResponse = StudyRoadmapsResponse;

export const curriculumJourneysResponseSchema = studyRoadmapsResponseSchema;

export function parseCurriculumJourneysResponse(value: unknown) {
  return parseContract(
    curriculumJourneysResponseSchema,
    value,
    "CurriculumJourneysResponse",
  );
}
```

- [ ] **Step 2: Export the aliases**

In `packages/contracts/src/index.ts`, export the new parser and types from `./study.js`.

- [ ] **Step 3: Run contract tests**

Run:

```bash
npm run test:unit -w @bac-bank/api -- courses/courses.contract.spec.ts
```

Expected: PASS.

---

## Task 2: Rename The Curriculum Spine In Prisma

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_curriculum_spine_rename/migration.sql`

- [ ] **Step 1: Write the migration SQL**

Create a migration that preserves data while renaming legacy physical tables:

```sql
ALTER TABLE "subject_curricula" RENAME TO "curricula";
ALTER TABLE "topics" RENAME TO "curriculum_nodes";
ALTER TABLE "topic_skills" RENAME TO "curriculum_node_skills";
ALTER TABLE "exam_node_topics" RENAME TO "exam_node_curriculum_nodes";
ALTER TABLE "student_topic_rollups" RENAME TO "student_curriculum_node_rollups";

ALTER TABLE "stream_subjects" RENAME TO "subject_offerings";
ALTER TABLE "subject_offerings"
ADD COLUMN "curriculum_id" UUID;

UPDATE "subject_offerings" offering
SET "curriculum_id" = curriculum_pick."id"
FROM LATERAL (
  SELECT c."id"
  FROM "curricula" c
  JOIN "subject_curriculum_streams" scs ON scs."curriculum_id" = c."id"
  WHERE c."subject_id" = offering."subject_id"
    AND scs."stream_id" = offering."stream_id"
    AND c."is_active" = TRUE
  ORDER BY c."valid_from_year" DESC
  LIMIT 1
) curriculum_pick
WHERE offering."curriculum_id" IS NULL;

ALTER TABLE "subject_offerings"
ALTER COLUMN "curriculum_id" SET NOT NULL;

ALTER TABLE "subject_offerings"
ADD CONSTRAINT "subject_offerings_curriculum_id_fkey"
FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 2: Update Prisma model names**

In `apps/api/prisma/schema.prisma`:

- Rename `SubjectCurriculum` model to `Curriculum`.
- Rename `Topic` model to `CurriculumNode`.
- Rename `TopicKind` enum to `CurriculumNodeKind` and expand it to `FIELD`, `UNIT`, `TOPIC`, `CONCEPT`, `SKILL`, `OPTIONAL_PORTAL`.
- Rename `StreamSubject` model to `SubjectOffering`.
- Rename `ExamNodeTopic` model to `ExamNodeCurriculumNode`.
- Rename `TopicSkill` model to `CurriculumNodeSkill`.
- Rename `StudentTopicRollup` model to `StudentCurriculumNodeRollup`.
- Leave `Skill` as-is.

- [ ] **Step 3: Validate Prisma**

Run:

```bash
npm run prisma:validate -w @bac-bank/api
```

Expected: Prisma schema validates.

---

## Task 3: Replace Seed Roadmaps With Curriculum Nodes

**Files:**
- Modify: `apps/api/prisma/seed.ts`
- Delete after replacement: `apps/api/prisma/roadmap-definitions.ts`
- Test: `npm run prisma:validate -w @bac-bank/api`

- [ ] **Step 1: Update subject offering seeding**

Replace current `streamSubject`/`subjectCurriculumStream` split with a single upsert into `subjectOffering` that includes `curriculumId`.

Expected behavior:

- Islamic studies can map many stream offerings to one shared curriculum.
- Math can map `SE`, `M`, `MT_*`, `GE`, and `LP/LE` offerings to different curricula.
- A student’s stream+subject resolves exactly one active curriculum for the current year.

- [ ] **Step 2: Stop seeding `SubjectRoadmap`, `RoadmapSection`, and `RoadmapNode`**

Remove calls to `syncSubjectRoadmap`.

Delete `resolveSubjectRoadmapDefinition` import from `seed.ts`.

- [ ] **Step 3: Seed curriculum nodes directly**

Keep existing topic tree data, but write it into `curriculumNode` with `kind`.

Use mapping:

```ts
const legacyKindToCurriculumNodeKind = {
  UNIT: 'UNIT',
  TOPIC: 'TOPIC',
  SUBTOPIC: 'CONCEPT',
} as const;
```

- [ ] **Step 4: Run seed in a disposable database**

Run:

```bash
npm run prisma:validate -w @bac-bank/api
```

Then run the seed against the local dev DB only after the migration compiles:

```bash
npm run prisma:seed -w @bac-bank/api
```

Expected: no roadmap tables are required by seed code.

---

## Task 4: Add Course Lesson Tables And Blueprint Sync

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/curriculum/curriculum-blueprint-sync.service.ts`
- Create: `apps/api/scripts/sync-course-blueprints.ts`
- Modify: `apps/api/package.json`
- Test: `apps/api/src/curriculum/curriculum-blueprint-sync.service.spec.ts`

- [ ] **Step 1: Add course lesson Prisma models**

Add:

- `CourseLesson`
- `CourseLessonStep`
- `CourseVisualAsset`
- `CourseDepthPortal`
- `CourseQuiz`
- `CourseQuizOption`
- `StudentCourseLessonProgress`

Keep step `visual`, `interaction`, and `examLens` as structured columns where they query well, and as `Json` where the shape is polymorphic.

- [ ] **Step 2: Implement blueprint stream expansion**

In `curriculum-blueprint-sync.service.ts`, implement:

```ts
export function expandBlueprintStreamCode(stream: string): string[] {
  if (stream === 'SE-M-MT') {
    return ['SE', 'M', 'MT_CIVIL', 'MT_ELEC', 'MT_MECH', 'MT_PROC'];
  }

  return stream
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}
```

- [ ] **Step 3: Sync canonical concepts into curriculum nodes**

For each blueprint:

- resolve one or more `SubjectOffering` records by `subjectCode` and expanded streams
- require all matched offerings to point to compatible curricula
- find or create the parent `CurriculumNode` for `topicCode`
- upsert each blueprint concept as a `CurriculumNode` of kind `CONCEPT`
- upsert `CourseLesson` and child rows from the concept content

- [ ] **Step 4: Add operator command**

In `apps/api/package.json`:

```json
"sync:course-blueprints": "ts-node --transpile-only scripts/sync-course-blueprints.ts"
```

- [ ] **Step 5: Test sync without writing duplicates**

Create a test that runs the sync twice on a temporary Prisma test setup or a mocked transaction client and asserts:

- same `CourseLesson` count after both runs
- math sequences expands to SE/M/MT offerings
- SVT proteins only maps to SE offering
- missing curriculum node throws a clear error unless `--create-nodes` is passed

---

## Task 5: Replace Study Roadmap Service With Curriculum Journey Service

**Files:**
- Create: `apps/api/src/curriculum/curriculum-journey.service.ts`
- Modify: `apps/api/src/study/study-roadmap.service.ts`
- Modify: `apps/api/src/study/study.controller.ts`
- Test: `apps/api/src/curriculum/curriculum-journey.service.spec.ts`

- [ ] **Step 1: Build journeys from curriculum nodes**

`CurriculumJourneyService.listCurriculumJourneys(userId, { subjectCode, limit })` should:

- resolve user stream
- load subject offerings for that stream
- load active curricula
- load `CurriculumNode` trees where `kind IN ('FIELD', 'UNIT', 'TOPIC', 'CONCEPT')`
- derive sections from top-level `FIELD` or `UNIT` nodes
- derive progress from `StudentCurriculumNodeRollup`
- derive next action from weakest/in-progress/not-started selectable node

- [ ] **Step 2: Keep `/study/roadmaps` as a temporary alias**

`StudyRoadmapService` becomes:

```ts
@Injectable()
export class StudyRoadmapService {
  constructor(private readonly curriculumJourneyService: CurriculumJourneyService) {}

  listStudyRoadmaps(userId: string, input?: { subjectCode?: string; limit?: number }) {
    return this.curriculumJourneyService.listCurriculumJourneys(userId, input);
  }
}
```

- [ ] **Step 3: Add new route**

In `StudyController`, add:

```ts
@Get('curriculum-journeys')
listCurriculumJourneys(...)
```

Expected: old and new routes return identical payloads during migration.

---

## Task 6: Move Courses API To DB-Backed Lessons

**Files:**
- Create: `apps/api/src/courses/course-content.repository.ts`
- Modify: `apps/api/src/courses/courses.service.ts`
- Modify: `apps/api/src/courses/courses-read-model.ts`
- Delete later: `apps/api/src/courses/course-authored-content.ts`
- Test: `apps/api/src/courses/courses.service.spec.ts`

- [ ] **Step 1: Resolve course content by student stream**

`CoursesService` should use:

```ts
user.streamId -> SubjectOffering -> Curriculum -> CurriculumNode -> CourseLesson
```

Do not resolve by hard-coded blueprint stream strings.

- [ ] **Step 2: Return only published content by default**

Rules:

- student routes: `CourseLesson.status = PUBLISHED`
- admin/dev preview: can include `DRAFT` and `REVIEWED`
- local test auth may still read draft content until admin preview exists

- [ ] **Step 3: Remove file-backed fallback after sync tests pass**

Delete the runtime dependency on `loadCanonicalCourseBlueprints()` from course serving code.

Keep canonical files as authoring/import artifacts, not runtime content.

---

## Task 7: Rename Exam Mapping From Topic To Curriculum Node

**Files:**
- Modify: `apps/api/src/study/study-session.service.ts`
- Modify: `apps/api/src/study/study-read-model.service.ts`
- Modify: `apps/api/src/study/study-weak-point.service.ts`
- Modify: admin ingestion import/review modules that write `ExamNodeTopic`
- Modify: web admin topic picker labels only after API contract aliases exist

- [ ] **Step 1: Update Prisma client calls**

Replace:

- `examNodeTopic` with `examNodeCurriculumNode`
- `topicId` relation fields with `curriculumNodeId`
- `studentTopicRollup` with `studentCurriculumNodeRollup`

- [ ] **Step 2: Keep request field aliases temporarily**

External request fields may still accept `topicCodes` for one transition window, but internally normalize to `curriculumNodeCodes`.

Example:

```ts
const curriculumNodeCodes = dto.curriculumNodeCodes ?? dto.topicCodes ?? [];
```

- [ ] **Step 3: Update weak-point and study read-model tests**

Run:

```bash
npm run test:unit -w @bac-bank/api -- study/study-read-model.service.spec.ts study/study-weak-point.service.spec.ts study/study-session.service.spec.ts
```

Expected: PASS.

---

## Task 8: Update Web Surfaces From Roadmaps To Curriculum Journeys

**Files:**
- Modify: `apps/web/src/lib/study-api.ts`
- Modify: `apps/web/src/lib/server-study-api.ts`
- Modify: `apps/web/src/lib/student-hub.ts`
- Rename: `apps/web/src/components/subject-roadmap-page.tsx` to `apps/web/src/components/subject-curriculum-journey-page.tsx`
- Rename: `apps/web/src/components/subject-roadmap-trail.tsx` to `apps/web/src/components/subject-curriculum-journey-trail.tsx`
- Modify route: `apps/web/src/app/student/my-space/roadmaps/[subjectCode]/page.tsx`
- Later route rename: `apps/web/src/app/student/my-space/curriculum/[subjectCode]/page.tsx`

- [ ] **Step 1: Switch fetcher to new endpoint**

Add `fetchStudyCurriculumJourneys()` and make old `fetchStudyRoadmaps()` call it.

- [ ] **Step 2: Rename internal types**

Use `CurriculumJourney` in web code while preserving Arabic UI labels like `مساري` or `البرنامج`.

- [ ] **Step 3: Keep old URL as redirect**

Make `/student/my-space/roadmaps/[subjectCode]` redirect to `/student/my-space/curriculum/[subjectCode]`.

- [ ] **Step 4: Visual verification**

Run:

```bash
npm run lint -w @bac-bank/web
npm run test -w @bac-bank/web -- --testTimeout=20000
npm run build -w @bac-bank/web
```

Then use browser verification for:

- `/student/my-space`
- `/student/my-space/curriculum/MATHEMATICS`
- `/student/courses/MATHEMATICS/topics/sequences/concepts/sequence-field-gate`
- training drill builder with curriculum node selection

---

## Task 9: Drop Legacy Roadmap Tables And Compatibility Code

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: final cleanup migration
- Delete: `apps/api/src/study/study-roadmap.service.ts`
- Delete: `apps/api/src/study/dto/get-study-roadmaps-query.dto.ts`
- Delete old web roadmap route after redirect window if desired

- [ ] **Step 1: Confirm no runtime references remain**

Run:

```bash
rg -n "subjectRoadmap|roadmapNode|roadmapSection|SubjectRoadmap|RoadmapNode|RoadmapSection|subject_roadmaps|roadmap_nodes|roadmap_sections" apps/api apps/web packages
```

Expected: only migration files and archived docs mention them.

- [ ] **Step 2: Drop tables**

Migration SQL:

```sql
DROP TABLE IF EXISTS "roadmap_nodes";
DROP TABLE IF EXISTS "roadmap_sections";
DROP TABLE IF EXISTS "subject_roadmaps";
DROP TABLE IF EXISTS "subject_curriculum_streams";
DROP TABLE IF EXISTS "user_topic_stats";
```

- [ ] **Step 3: Full verification**

Run:

```bash
npm run prisma:validate -w @bac-bank/api
npm run test:unit -w @bac-bank/api
npm run lint -w @bac-bank/web
npm run test -w @bac-bank/web -- --testTimeout=20000
npm run build -w @bac-bank/web
```

Expected: PASS.

---

## Task 10: Backfill Current Canonical Content

**Files:**
- Runtime data from `bac_theory_content/canonical/math/SE-M-MT/sequences/course.json`
- Runtime data from `bac_theory_content/canonical/svt/SE/proteins/course.json`

- [ ] **Step 1: Run blueprint sync**

Run:

```bash
npm run sync:course-blueprints -w @bac-bank/api -- --status draft
```

Expected report:

- `MATHEMATICS/SE-M-MT/sequences`: 13 lessons synced
- `NATURAL_SCIENCES/SE/proteins`: 43 lessons synced
- no duplicate nodes
- no missing stream offerings

- [ ] **Step 2: Publish only reviewed content**

For now, keep both as `DRAFT` unless the user explicitly approves publication.

- [ ] **Step 3: Verify stream visibility**

Expected visibility:

- SE sees math sequences and SVT proteins.
- M sees math sequences only until SVT M content exists.
- MT leaf streams see math sequences.
- GE does not see SE-M-MT math sequences until GE math content exists.
- LP/LE do not see SE-M-MT math sequences.

---

## Self-Review

- Spec coverage: The plan removes the redundant roadmap spine, replaces topic-as-tag with curriculum node as the shared spine, keeps stream/subject/curriculum sharing explicit, maps published exam questions to curriculum nodes, and moves course content to DB-backed lessons.
- Placeholder scan: No task depends on an unspecified "do later" implementation. The only flexible items are relation names where Prisma may require generated naming adjustments.
- Type consistency: The plan consistently uses `Curriculum`, `CurriculumNode`, `SubjectOffering`, `CourseLesson`, `StudentCurriculumNodeRollup`, and temporary compatibility aliases for roadmap/topic public fields.
