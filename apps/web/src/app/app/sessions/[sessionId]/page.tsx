import { SessionPlayer } from '@/components/session-player';

type SessionPlayerPageProps = {
  params: {
    sessionId: string;
  };
};

export default function SessionPlayerPage({ params }: SessionPlayerPageProps) {
  return <SessionPlayer sessionId={params.sessionId} />;
}
