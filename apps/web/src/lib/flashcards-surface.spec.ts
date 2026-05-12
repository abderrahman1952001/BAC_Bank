import { describe, expect, it } from "vitest";
import type { CourseConceptStep } from "@bac-bank/contracts/courses";
import type { ExamHierarchyBlock } from "@bac-bank/contracts/study";
import {
  buildCourseStepFlashcardDraft,
  buildStudyQuestionFlashcardDraft,
  formatFlashcardDueLabel,
  plainTextFromStudyBlocks,
  summarizeDecks,
} from "@/lib/flashcards-surface";

describe("flashcards surface helpers", () => {
  it("summarizes deck counts", () => {
    expect(
      summarizeDecks([
        {
          id: "deck-1",
          title: "رياضيات",
          description: null,
          sourceType: "USER_CREATED",
          isPlatformSeed: false,
          cardCount: 4,
          dueCardCount: 2,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
        },
        {
          id: "deck-2",
          title: "منصة",
          description: null,
          sourceType: "PLATFORM",
          isPlatformSeed: true,
          cardCount: 3,
          dueCardCount: 1,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
        },
      ]),
    ).toEqual({
      deckCount: 2,
      cardCount: 7,
      dueCardCount: 3,
      platformDeckCount: 1,
    });
  });

  it("extracts useful study block text", () => {
    const blocks = [
      {
        id: "block-1",
        role: "PROMPT",
        orderIndex: 0,
        blockType: "PARAGRAPH",
        textValue: "احسب نهاية الدالة.",
        data: null,
        media: null,
      },
      {
        id: "block-2",
        role: "PROMPT",
        orderIndex: 1,
        blockType: "TABLE",
        textValue: null,
        data: {
          rows: [
            ["x", "0", "1"],
            ["f(x)", "2", "3"],
          ],
        },
        media: null,
      },
    ] satisfies ExamHierarchyBlock[];

    expect(plainTextFromStudyBlocks(blocks)).toContain("احسب نهاية الدالة.");
    expect(plainTextFromStudyBlocks(blocks)).toContain("x | 0 | 1");
  });

  it("builds course-step flashcard drafts", () => {
    const step = {
      id: "4d7133bb-5141-44a8-962f-352f627e44c7",
      type: "RULE",
      eyebrow: "قاعدة",
      title: "إشارة المشتقة",
      body: "إذا كانت f' موجبة فالدالة متزايدة.",
      bullets: ["ابحث عن القيم الحرجة", "ابن جدول الإشارة"],
      visual: null,
      interaction: null,
      examLens: {
        bacSkill: "جدول التغيرات",
        prompt: "اربط إشارة f' باتجاه f.",
        trap: "لا تخلط بين إشارة f وإشارة f'.",
      },
    } satisfies CourseConceptStep;

    expect(
      buildCourseStepFlashcardDraft(step, {
        conceptTitle: "دراسة تغيرات دالة",
      }),
    ).toMatchObject({
      sourceType: "COURSE_STEP",
      courseStepId: step.id,
      front: "دراسة تغيرات دالة · إشارة المشتقة",
    });
  });

  it("builds official-correction flashcard drafts", () => {
    const block = {
      id: "block-1",
      role: "SOLUTION",
      orderIndex: 0,
      blockType: "PARAGRAPH",
      textValue: "نستعمل جدول الإشارة ثم نستنتج التغيرات.",
      data: null,
      media: null,
    } satisfies ExamHierarchyBlock;

    expect(
      buildStudyQuestionFlashcardDraft(
        {
          id: "de80b21d-5c0f-447f-b49b-5167ffb9c9b1",
          label: "السؤال 2",
          promptBlocks: [],
          solutionBlocks: [block],
          hintBlocks: [],
          rubricBlocks: [],
        },
        {
          exerciseLabel: "التمرين الأول",
        },
      ),
    ).toMatchObject({
      sourceType: "OFFICIAL_CORRECTION",
      examNodeId: "de80b21d-5c0f-447f-b49b-5167ffb9c9b1",
      back: "نستعمل جدول الإشارة ثم نستنتج التغيرات.",
    });
  });

  it("formats near due timestamps", () => {
    expect(
      formatFlashcardDueLabel(
        "2026-05-12T10:05:00.000Z",
        new Date("2026-05-12T10:00:00.000Z"),
      ),
    ).toBe("بعد 5 د");
  });
});
