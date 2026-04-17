import { SessionPlayer } from '@/components/session-player';
import {
  fetchServerExerciseStatesLookup,
  fetchServerStudySession,
} from '@/lib/server-study-api';

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
  const initialExerciseStates =
    initialSession?.exercises.length
      ? await fetchServerExerciseStatesLookup(
          initialSession.exercises.map(
            (exercise) => exercise.hierarchy.exerciseNodeId,
          ),
        )
          .then((payload) => payload.data)
          .catch(() => undefined)
      : undefined;

  return (
    <SessionPlayer
      sessionId={sessionId}
      initialSession={initialSession}
      initialExerciseStates={initialExerciseStates}
    />
  );
}
