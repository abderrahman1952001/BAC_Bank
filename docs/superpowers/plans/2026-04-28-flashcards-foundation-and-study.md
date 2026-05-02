# Flashcards Foundation and Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-ready `Flashcards` slice for BAC Bank, including deck persistence, private user copies and overrides, student deck browsing, and a lightweight daily review flow.

**Architecture:** Add a dedicated flashcards domain with shared platform-seeded decks and private user-owned deck/card state. The first release should emphasize due review and flexible deck organization, while keeping curriculum links optional and non-blocking.

**Tech Stack:** Prisma, NestJS, Next.js App Router, TypeScript, Zod runtime contracts, Vitest, Jest, existing BAC Bank student shell.

---

### Task 1: Add Flashcards Contracts and Persistence

**Files:**
- Create: `packages/contracts/src/flashcards.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/prisma/seed.ts`
- Test: `apps/api/src/flashcards/flashcards-read.service.spec.ts`

- [ ] **Step 1: Write the failing parser test**

```ts
it("parses deck summaries with ownership and due counts", () => {
  const payload = parseFlashcardDeckListResponse({
    data: [
      {
        id: "deck-1",
        title: "الدوال",
        ownerType: "PLATFORM",
        dueCount: 6,
        cardCount: 24,
      },
    ],
  });

  expect(payload.data[0].dueCount).toBe(6);
});
```

- [ ] **Step 2: Run the parser test to verify it fails**

Run: `npm test -- --runInBand packages/contracts/src/flashcards.ts`

Expected: FAIL because flashcards contracts do not exist yet.

- [ ] **Step 3: Add core flashcards models**

```prisma
enum FlashcardOwnerType {
  PLATFORM
  USER
}

model FlashcardDeck {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerType   FlashcardOwnerType @map("owner_type")
  ownerUserId String?  @map("owner_user_id") @db.Uuid
  title       String
  description String?  @db.Text
  cards       FlashcardDeckCard[]
  overrides   UserFlashcardOverride[]
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
}
```

- [ ] **Step 4: Seed initial platform decks**

Run: `npm run prisma:seed -w @bac-bank/api`

Expected: PASS with a small set of platform decks and cards for the first launch subject.

- [ ] **Step 5: Run verification**

Run: `npm run prisma:generate -w @bac-bank/api`

Expected: PASS with new flashcards models generated.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/flashcards.ts packages/contracts/src/index.ts apps/api/prisma/schema.prisma apps/api/prisma/seed.ts
git commit -m "feat: add flashcards schema and contracts"
```

### Task 2: Add Flashcards API

**Files:**
- Create: `apps/api/src/flashcards/flashcards.module.ts`
- Create: `apps/api/src/flashcards/flashcards.controller.ts`
- Create: `apps/api/src/flashcards/flashcards-read.service.ts`
- Create: `apps/api/src/flashcards/flashcards-review.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/flashcards/flashcards-read.service.spec.ts`

- [ ] **Step 1: Write the failing read-model test**

```ts
it("lists platform and user decks separately", async () => {
  const payload = await service.listDecksForUser({ userId: "user-1" });
  expect(payload.sections[0].title).toBe("Due now");
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -w @bac-bank/api -- flashcards-read.service.spec.ts --runInBand`

Expected: FAIL because the flashcards module does not exist.

- [ ] **Step 3: Implement deck and study endpoints**

```ts
@Get("decks")
listDecks() {}

@Get("decks/:deckId")
getDeck() {}

@Post("decks/:deckId/study")
startStudySession() {}

@Post("cards/:cardId/review")
recordReview() {}
```

- [ ] **Step 4: Run verification**

Run: `npm test -w @bac-bank/api -- flashcards-read.service.spec.ts --runInBand`

Expected: PASS with deck list, deck detail, and review recording behavior.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/flashcards apps/api/src/app.module.ts
git commit -m "feat: add flashcards api"
```

### Task 3: Add Student Navigation and Deck Surfaces

**Files:**
- Modify: `apps/web/src/lib/student-routes.ts`
- Modify: `apps/web/src/components/student-navbar.tsx`
- Create: `apps/web/src/app/student/flashcards/page.tsx`
- Create: `apps/web/src/app/student/flashcards/decks/[deckId]/page.tsx`
- Create: `apps/web/src/app/student/flashcards/study/[deckId]/page.tsx`
- Create: `apps/web/src/components/flashcards-home-page.tsx`
- Create: `apps/web/src/components/flashcard-deck-page.tsx`
- Test: `apps/web/src/lib/student-routes.spec.ts`

- [ ] **Step 1: Write the failing route test**

```ts
it("builds flashcards routes", () => {
  expect(buildStudentFlashcardsRoute()).toBe("/student/flashcards");
});
```

- [ ] **Step 2: Run the route test to verify it fails**

Run: `npm test -w @bac-bank/web -- student-routes.spec.ts --runInBand`

Expected: FAIL because flashcards routes do not exist.

- [ ] **Step 3: Add route helpers, nav item, and server pages**

```tsx
{
  href: STUDENT_FLASHCARDS_ROUTE,
  label: "البطاقات",
  shortLabel: "بطاقات",
  icon: Layers,
  surface: "flashcards" as const,
}
```

- [ ] **Step 4: Run verification**

Run: `npm test -w @bac-bank/web -- student-routes.spec.ts --runInBand`

Expected: PASS with flashcards surface recognition.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/student-routes.ts apps/web/src/lib/student-routes.spec.ts apps/web/src/components/student-navbar.tsx apps/web/src/app/student/flashcards apps/web/src/components/flashcards-home-page.tsx apps/web/src/components/flashcard-deck-page.tsx
git commit -m "feat: add flashcards routes and pages"
```

### Task 4: Add Study Player and Private Deck Operations

**Files:**
- Create: `apps/web/src/components/flashcard-study-player.tsx`
- Create: `apps/web/src/lib/flashcards-api.ts`
- Create: `apps/web/src/lib/server-flashcards-api.ts`
- Create: `apps/web/src/lib/flashcard-review-session.ts`
- Test: `apps/web/src/lib/flashcard-review-session.spec.ts`

- [ ] **Step 1: Write the failing study-session test**

```ts
it("surfaces due cards before new cards", () => {
  const session = createFlashcardReviewSession(fixtureDeck);
  expect(session.cards[0].queueBucket).toBe("DUE");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -w @bac-bank/web -- flashcard-review-session.spec.ts --runInBand`

Expected: FAIL because the study session helper does not exist.

- [ ] **Step 3: Implement the lightweight study player**

```tsx
"use client";

export function FlashcardStudyPlayer({ deck }: { deck: FlashcardDeckDetail }) {
  const [index, setIndex] = useState(0);
  return <div>{/* reveal, correct, incorrect, edit, move */}</div>;
}
```

- [ ] **Step 4: Run verification**

Run: `npm test -w @bac-bank/web -- flashcard-review-session.spec.ts --runInBand`

Expected: PASS with due-first ordering and review progression.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/flashcard-study-player.tsx apps/web/src/lib/flashcards-api.ts apps/web/src/lib/server-flashcards-api.ts apps/web/src/lib/flashcard-review-session.ts apps/web/src/lib/flashcard-review-session.spec.ts
git commit -m "feat: add flashcards study player"
```

### Task 5: Final Verification and Bridge Readiness

**Files:**
- Modify: `BAC-platform-architecture-workbench.md`
- Modify: `apps/web/src/app/globals.css`
- Test: `apps/web/e2e/app.smoke.spec.ts`

- [ ] **Step 1: Add the smoke expectation**

```ts
await expect(page.getByRole("link", { name: "البطاقات" })).toBeVisible();
```

- [ ] **Step 2: Run the smoke test to verify current failure**

Run: `npm test -w @bac-bank/web -- app.smoke.spec.ts --runInBand`

Expected: FAIL before the flashcards surface is fully wired.

- [ ] **Step 3: Update the workbench and apply final UI polish**

```md
- Flashcards is now a first-class student surface
- Decks remain flexible and are not hard-bound to topic taxonomy
```

- [ ] **Step 4: Run full verification**

Run: `npm run release:check`

Expected: PASS or a documented local-environment blocker.

- [ ] **Step 5: Commit**

```bash
git add BAC-platform-architecture-workbench.md apps/web/src/app/globals.css apps/web/e2e/app.smoke.spec.ts
git commit -m "feat: ship flashcards study flow"
```
