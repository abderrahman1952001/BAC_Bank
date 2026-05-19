import { FlashcardsHomePage } from "@/components/flashcards-home-page";
import {
  fetchServerDueFlashcards,
  fetchServerFlashcardDecks,
} from "@/lib/server-flashcards-api";

function toUppercaseSearchParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim().toUpperCase() || null;
}

export default async function StudentFlashcardsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedSubjectCode = toUppercaseSearchParam(
    resolvedSearchParams?.subject,
  );
  const [initialDecks, initialDueCards] = await Promise.all([
    fetchServerFlashcardDecks()
      .then((payload) => payload.data)
      .catch(() => undefined),
    fetchServerDueFlashcards({
      limit: 20,
      subjectCode: requestedSubjectCode,
    })
      .then((payload) => payload.data)
      .catch(() => undefined),
  ]);

  return (
    <FlashcardsHomePage
      initialDecks={initialDecks}
      initialDueCards={initialDueCards}
      requestedSubjectCode={requestedSubjectCode}
    />
  );
}
