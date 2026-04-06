import { SessionPlayer } from '@/components/session-player';
import { fetchServerPracticeSession } from '@/lib/server-qbank';

type SessionPlayerPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function SessionPlayerPage({
  params,
}: SessionPlayerPageProps) {
  const { sessionId } = await params;
  const initialSession = await fetchServerPracticeSession(sessionId).catch(
    () => undefined,
  );

  return <SessionPlayer sessionId={sessionId} initialSession={initialSession} />;
}
