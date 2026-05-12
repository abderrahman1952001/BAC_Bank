import type { CourseConceptStep } from "@bac-bank/contracts/courses";
import type {
  CreateFlashcardRequest,
  FlashcardCard,
  FlashcardDeckSummary,
  FlashcardReviewRating,
  FlashcardSourceType,
} from "@bac-bank/contracts/flashcards";
import type { ExamHierarchyBlock } from "@bac-bank/contracts/study";

export type FlashcardDraft = Pick<
  CreateFlashcardRequest,
  | "front"
  | "back"
  | "sourceType"
  | "data"
  | "courseStepId"
  | "courseLessonId"
  | "examNodeId"
  | "learningTargetId"
  | "curriculumNodeId"
  | "subjectId"
>;

export type FlashcardStudyQuestionDraftInput = {
  id: string;
  label: string;
  promptBlocks: ExamHierarchyBlock[];
  solutionBlocks: ExamHierarchyBlock[];
  hintBlocks: ExamHierarchyBlock[];
  rubricBlocks: ExamHierarchyBlock[];
};

export const flashcardReviewRatingLabels: Record<
  FlashcardReviewRating,
  string
> = {
  AGAIN: "مرة أخرى",
  HARD: "صعب",
  GOOD: "جيد",
  EASY: "سهل",
};

export const flashcardReviewRatingHints: Record<FlashcardReviewRating, string> =
  {
    AGAIN: "بعد 10 دقائق",
    HARD: "قريباً",
    GOOD: "غداً",
    EASY: "بعد أيام",
  };

export function describeFlashcardSource(sourceType: FlashcardSourceType) {
  switch (sourceType) {
    case "PLATFORM":
      return "منصة";
    case "COURSE_STEP":
      return "درس";
    case "COURSE_LESSON":
      return "درس";
    case "OFFICIAL_CORRECTION":
      return "تصحيح رسمي";
    case "STUDENT_MISTAKE":
      return "خطأ محفوظ";
    case "AI_DRAFT":
      return "مسودة AI";
    default:
      return "شخصية";
  }
}

export function formatFlashcardDueLabel(dueAt: string, now = new Date()) {
  const dueDate = new Date(dueAt);

  if (Number.isNaN(dueDate.getTime())) {
    return "مستحقة";
  }

  const diffMs = dueDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "مستحقة الآن";
  }

  const diffMinutes = Math.ceil(diffMs / 60_000);

  if (diffMinutes < 60) {
    return `بعد ${diffMinutes} د`;
  }

  const diffHours = Math.ceil(diffMinutes / 60);

  if (diffHours < 24) {
    return `بعد ${diffHours} س`;
  }

  return `بعد ${Math.ceil(diffHours / 24)} يوم`;
}

export function summarizeDecks(decks: FlashcardDeckSummary[]) {
  return {
    deckCount: decks.length,
    cardCount: decks.reduce((sum, deck) => sum + deck.cardCount, 0),
    dueCardCount: decks.reduce((sum, deck) => sum + deck.dueCardCount, 0),
    platformDeckCount: decks.filter((deck) => deck.isPlatformSeed).length,
  };
}

export function getFlashcardContextLabel(card: FlashcardCard) {
  return (
    card.learningTarget?.name ??
    card.curriculumNode?.name ??
    card.courseLesson?.title ??
    card.subject?.name ??
    describeFlashcardSource(card.sourceType)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function extractBlockDataText(data: unknown): string | null {
  if (!isRecord(data)) {
    return null;
  }

  if (typeof data.text === "string") {
    return data.text;
  }

  if (Array.isArray(data.rows)) {
    const rows = data.rows
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) =>
        row
          .map((cell) => (typeof cell === "string" ? cell : String(cell ?? "")))
          .join(" | "),
      )
      .filter(Boolean);

    return rows.length ? rows.join("\n") : null;
  }

  if (
    isRecord(data.scripture) &&
    typeof data.scripture.displayText === "string"
  ) {
    return data.scripture.displayText;
  }

  return null;
}

export function plainTextFromStudyBlocks(
  blocks: ExamHierarchyBlock[],
  options?: {
    maxLength?: number;
  },
) {
  const maxLength = options?.maxLength ?? 1600;
  const text = blocks
    .map((block) => {
      const textValue = block.textValue?.trim();

      if (textValue) {
        return textValue;
      }

      const dataText = extractBlockDataText(block.data)?.trim();

      if (dataText) {
        return dataText;
      }

      if (block.media || block.blockType === "IMAGE") {
        return "مرفق بصري في نص السؤال";
      }

      return null;
    })
    .filter((value): value is string => Boolean(value))
    .join("\n\n");

  return truncateText(text, maxLength);
}

export function buildCourseStepFlashcardDraft(
  step: CourseConceptStep,
  input: {
    conceptTitle: string;
    topicTitle?: string | null;
    subjectName?: string | null;
  },
): FlashcardDraft {
  const backSections = [
    step.body,
    step.bullets.length
      ? step.bullets.map((bullet) => `- ${bullet}`).join("\n")
      : null,
    step.examLens
      ? `BAC Lens: ${step.examLens.prompt}\nالفخ: ${step.examLens.trap}`
      : null,
    step.visual ? `${step.visual.title}: ${step.visual.description}` : null,
  ].filter((section): section is string => Boolean(section?.trim()));

  return {
    sourceType: "COURSE_STEP",
    courseStepId: step.id,
    front: truncateText(`${input.conceptTitle} · ${step.title}`, 5000),
    back: truncateText(backSections.join("\n\n"), 5000),
    data: {
      origin: "course_step",
      stepType: step.type,
      topicTitle: input.topicTitle ?? null,
      subjectName: input.subjectName ?? null,
    },
  };
}

export function buildStudyQuestionFlashcardDraft(
  question: FlashcardStudyQuestionDraftInput,
  input?: {
    exerciseLabel?: string | null;
    subjectName?: string | null;
    sourceLabel?: string | null;
  },
): FlashcardDraft {
  const prompt = plainTextFromStudyBlocks(question.promptBlocks, {
    maxLength: 1400,
  });
  const solution = plainTextFromStudyBlocks(
    [
      ...question.solutionBlocks,
      ...question.rubricBlocks,
      ...question.hintBlocks,
    ],
    {
      maxLength: 2200,
    },
  );
  const frontPrefix = [input?.subjectName, input?.exerciseLabel, question.label]
    .filter(Boolean)
    .join(" · ");

  return {
    sourceType: "OFFICIAL_CORRECTION",
    examNodeId: question.id,
    front: truncateText(
      prompt ? `${frontPrefix}\n${prompt}` : frontPrefix || question.label,
      5000,
    ),
    back: solution || "راجع التصحيح الرسمي لهذا السؤال.",
    data: {
      origin: "official_correction",
      sourceLabel: input?.sourceLabel ?? null,
    },
  };
}
