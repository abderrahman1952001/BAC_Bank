import { SessionPlayer } from '@/components/session-player';

type SessionPlayerPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function SessionPlayerPage({
  params,
}: SessionPlayerPageProps) {
  const { sessionId } = await params;

  return <SessionPlayer sessionId={sessionId} />;
}
