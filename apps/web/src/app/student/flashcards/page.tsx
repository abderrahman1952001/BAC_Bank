import { FlashcardsHomePage } from "@/components/flashcards-home-page";
import {
  fetchServerDueFlashcards,
  fetchServerFlashcardDecks,
} from "@/lib/server-flashcards-api";

export default async function StudentFlashcardsPage() {
  const [initialDecks, initialDueCards] = await Promise.all([
    fetchServerFlashcardDecks()
      .then((payload) => payload.data)
      .catch(() => undefined),
    fetchServerDueFlashcards({
      limit: 20,
    })
      .then((payload) => payload.data)
      .catch(() => undefined),
  ]);

  return (
    <FlashcardsHomePage
      initialDecks={initialDecks}
      initialDueCards={initialDueCards}
    />
  );
}
