import { SessionPlayer } from "@/components/session-player";
import { fetchServerDueFlashcards } from "@/lib/server-flashcards-api";
import {
  fetchServerExerciseStatesLookup,
  fetchServerMyMistakes,
  fetchServerStudySession,
} from "@/lib/server-study-api";

type StudentTrainingSessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function StudentTrainingSessionPage({
  params,
}: StudentTrainingSessionPageProps) {
  const { sessionId } = await params;
  const initialSession = await fetchServerStudySession(sessionId).catch(
    () => undefined,
  );
  const initialExerciseStates = initialSession?.exercises.length
    ? await fetchServerExerciseStatesLookup(
        initialSession.exercises.map(
          (exercise) => exercise.hierarchy.exerciseNodeId,
        ),
      )
        .then((payload) => payload.data)
        .catch(() => undefined)
    : undefined;
  const subjectCode =
    initialSession?.filters?.subjectCode ??
    initialSession?.exercises[0]?.exam.subject.code ??
    null;
  const [mistakesPayload, dueFlashcardsPayload] = initialSession
    ? await Promise.all([
        fetchServerMyMistakes({
          limit: 5,
          subjectCode,
        }).catch(() => undefined),
        fetchServerDueFlashcards({
          limit: 5,
          subjectCode,
        }).catch(() => undefined),
      ])
    : [undefined, undefined];

  return (
    <SessionPlayer
      sessionId={sessionId}
      initialSession={initialSession}
      initialExerciseStates={initialExerciseStates}
      recoveryContext={{
        subjectCode,
        openMistakeCount: mistakesPayload?.data.length ?? 0,
        dueMistakeCount:
          mistakesPayload?.data.filter((item) => item.isDue).length ?? 0,
        dueFlashcardCount: dueFlashcardsPayload?.data.length ?? 0,
      }}
    />
  );
}
