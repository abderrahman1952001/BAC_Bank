import type {
  CreateFlashcardDeckRequest,
  CreateFlashcardDeckResponse,
  CreateFlashcardRequest,
  CreateFlashcardResponse,
  DueFlashcardsResponse,
  EnrollFlashcardDeckResponse,
  FlashcardDeckCardsResponse,
  FlashcardDecksResponse,
  ReviewFlashcardRequest,
  ReviewFlashcardResponse,
} from "@bac-bank/contracts/flashcards";
import {
  parseCreateFlashcardDeckResponse,
  parseCreateFlashcardResponse,
  parseDueFlashcardsResponse,
  parseEnrollFlashcardDeckResponse,
  parseFlashcardDeckCardsResponse,
  parseFlashcardDecksResponse,
  parseReviewFlashcardResponse,
} from "@bac-bank/contracts/flashcards";
import { API_BASE_URL, fetchApiJson, withJsonRequest } from "@/lib/api-client";

export { API_BASE_URL };
export type {
  CreateFlashcardDeckRequest,
  CreateFlashcardDeckResponse,
  CreateFlashcardRequest,
  CreateFlashcardResponse,
  DueFlashcardsResponse,
  EnrollFlashcardDeckResponse,
  FlashcardCard,
  FlashcardDeckCardsResponse,
  FlashcardDecksResponse,
  FlashcardDeckSummary,
  FlashcardReviewRating,
  FlashcardSourceType,
  FlashcardType,
  ReviewFlashcardRequest,
  ReviewFlashcardResponse,
  StudentFlashcardState,
} from "@bac-bank/contracts/flashcards";

export async function fetchFlashcardDecks() {
  return fetchApiJson<FlashcardDecksResponse>(
    `${API_BASE_URL}/flashcards/decks`,
    undefined,
    "تعذر تحميل مجموعات البطاقات.",
    parseFlashcardDecksResponse,
  );
}

export async function fetchFlashcardDeckCards(
  deckId: string,
  input?: {
    limit?: number;
  },
) {
  const params = new URLSearchParams();

  if (typeof input?.limit === "number") {
    params.set("limit", String(input.limit));
  }

  const query = params.toString();

  return fetchApiJson<FlashcardDeckCardsResponse>(
    `${API_BASE_URL}/flashcards/decks/${encodeURIComponent(deckId)}/cards${
      query ? `?${query}` : ""
    }`,
    undefined,
    "تعذر تحميل بطاقات المجموعة.",
    parseFlashcardDeckCardsResponse,
  );
}

export async function fetchDueFlashcards(input?: {
  limit?: number;
  deckId?: string | null;
  subjectCode?: string | null;
}) {
  const params = new URLSearchParams();

  if (typeof input?.limit === "number") {
    params.set("limit", String(input.limit));
  }

  if (input?.deckId) {
    params.set("deckId", input.deckId);
  }

  if (input?.subjectCode) {
    params.set("subjectCode", input.subjectCode);
  }

  const query = params.toString();

  return fetchApiJson<DueFlashcardsResponse>(
    `${API_BASE_URL}/flashcards/due${query ? `?${query}` : ""}`,
    undefined,
    "تعذر تحميل مراجعات اليوم.",
    parseDueFlashcardsResponse,
  );
}

export async function createFlashcardDeck(input: CreateFlashcardDeckRequest) {
  return fetchApiJson<CreateFlashcardDeckResponse>(
    `${API_BASE_URL}/flashcards/decks`,
    withJsonRequest({
      method: "POST",
      body: JSON.stringify(input),
    }),
    "تعذر إنشاء المجموعة.",
    parseCreateFlashcardDeckResponse,
  );
}

export async function enrollFlashcardDeck(deckId: string) {
  return fetchApiJson<EnrollFlashcardDeckResponse>(
    `${API_BASE_URL}/flashcards/decks/${encodeURIComponent(deckId)}/enroll`,
    withJsonRequest({
      method: "POST",
    }),
    "تعذر إضافة المجموعة إلى مراجعاتك.",
    parseEnrollFlashcardDeckResponse,
  );
}

export async function createFlashcard(input: CreateFlashcardRequest) {
  return fetchApiJson<CreateFlashcardResponse>(
    `${API_BASE_URL}/flashcards`,
    withJsonRequest({
      method: "POST",
      body: JSON.stringify(input),
    }),
    "تعذر حفظ البطاقة.",
    parseCreateFlashcardResponse,
  );
}

export async function reviewFlashcard(
  cardId: string,
  input: ReviewFlashcardRequest,
) {
  return fetchApiJson<ReviewFlashcardResponse>(
    `${API_BASE_URL}/flashcards/${encodeURIComponent(cardId)}/review`,
    withJsonRequest({
      method: "POST",
      body: JSON.stringify(input),
    }),
    "تعذر تسجيل المراجعة.",
    parseReviewFlashcardResponse,
  );
}
