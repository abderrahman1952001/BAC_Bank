import { StudentHub } from '@/components/student-hub';
import {
  fetchServerRecentExamActivities,
  fetchServerRecentPracticeSessions,
} from '@/lib/server-qbank';

export default async function StudentHomePage() {
  const [initialRecentPracticeSessions, initialRecentExamActivities] =
    await Promise.all([
      fetchServerRecentPracticeSessions(6)
        .then((payload) => payload.data)
        .catch(() => undefined),
      fetchServerRecentExamActivities(6)
        .then((payload) => payload.data)
        .catch(() => undefined),
    ]);

  return (
    <StudentHub
      initialRecentPracticeSessions={initialRecentPracticeSessions}
      initialRecentExamActivities={initialRecentExamActivities}
    />
  );
}
