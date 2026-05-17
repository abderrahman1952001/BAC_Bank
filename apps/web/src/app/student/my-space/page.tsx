import { StudentHub } from "@/components/student-hub";
import {
  fetchServerCatalog,
  fetchServerFilters,
  fetchServerMyMistakes,
  fetchServerRecentExamActivities,
  fetchServerRecentExerciseStates,
  fetchServerRecentStudySessions,
  fetchServerStudyCurriculumJourneys,
  fetchServerWeakPointInsights,
} from "@/lib/server-study-api";
import { fetchServerDueFlashcards } from "@/lib/server-flashcards-api";
import { fetchServerLabTools } from "@/lib/server-lab-api";

export default async function StudentMySpacePage() {
  const [
    initialRecentStudySessions,
    initialRecentExamActivities,
    initialRecentExerciseStates,
    initialMyMistakes,
    initialCurriculumJourneys,
    initialWeakPointInsights,
    initialDueFlashcards,
    initialLabTools,
    initialFilters,
    initialCatalog,
  ] = await Promise.all([
    fetchServerRecentStudySessions(6)
      .then((payload) => payload.data)
      .catch(() => undefined),
    fetchServerRecentExamActivities(6)
      .then((payload) => payload.data)
      .catch(() => undefined),
    fetchServerRecentExerciseStates(6)
      .then((payload) => payload.data)
      .catch(() => undefined),
    fetchServerMyMistakes({
      limit: 6,
    })
      .then((payload) => payload.data)
      .catch(() => undefined),
    fetchServerStudyCurriculumJourneys({
      limit: 4,
    })
      .then((payload) => payload.data)
      .catch(() => undefined),
    fetchServerWeakPointInsights({
      limit: 4,
    }).catch(() => undefined),
    fetchServerDueFlashcards({
      limit: 6,
    })
      .then((payload) => payload.data)
      .catch(() => undefined),
    fetchServerLabTools()
      .then((payload) => payload.data)
      .catch(() => undefined),
    fetchServerFilters().catch(() => undefined),
    fetchServerCatalog().catch(() => undefined),
  ]);

  return (
    <StudentHub
      initialRecentStudySessions={initialRecentStudySessions}
      initialRecentExamActivities={initialRecentExamActivities}
      initialRecentExerciseStates={initialRecentExerciseStates}
      initialMyMistakes={initialMyMistakes}
      initialCurriculumJourneys={initialCurriculumJourneys}
      initialWeakPointInsights={initialWeakPointInsights}
      initialDueFlashcards={initialDueFlashcards}
      initialLabTools={initialLabTools}
      initialFilters={initialFilters}
      initialCatalog={initialCatalog}
    />
  );
}
