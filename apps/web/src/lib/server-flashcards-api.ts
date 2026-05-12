import type {
  DueFlashcardsResponse,
  FlashcardDeckCardsResponse,
  FlashcardDecksResponse,
} from "@bac-bank/contracts/flashcards";
import {
  parseDueFlashcardsResponse,
  parseFlashcardDeckCardsResponse,
  parseFlashcardDecksResponse,
} from "@bac-bank/contracts/flashcards";
import { fetchServerApiJson } from "@/lib/server-api";

export async function fetchServerFlashcardDecks() {
  return fetchServerApiJson<FlashcardDecksResponse>(
    "/flashcards/decks",
    undefined,
    "Flashcards request failed.",
    parseFlashcardDecksResponse,
  );
}

export async function fetchServerDueFlashcards(input?: {
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

  return fetchServerApiJson<DueFlashcardsResponse>(
    `/flashcards/due${query ? `?${query}` : ""}`,
    undefined,
    "Flashcards request failed.",
    parseDueFlashcardsResponse,
  );
}

export async function fetchServerFlashcardDeckCards(
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

  return fetchServerApiJson<FlashcardDeckCardsResponse>(
    `/flashcards/decks/${encodeURIComponent(deckId)}/cards${
      query ? `?${query}` : ""
    }`,
    undefined,
    "Flashcards request failed.",
    parseFlashcardDeckCardsResponse,
  );
}
