import { StudentHub } from "@/components/student-hub";
import {
  fetchServerMyMistakes,
  fetchServerRecentExamActivities,
  fetchServerRecentExerciseStates,
  fetchServerRecentStudySessions,
  fetchServerStudyRoadmaps,
  fetchServerWeakPointInsights,
} from "@/lib/server-study-api";

export default async function StudentMySpacePage() {
  const [
    initialRecentStudySessions,
    initialRecentExamActivities,
    initialRecentExerciseStates,
    initialMyMistakes,
    initialStudyRoadmaps,
    initialWeakPointInsights,
  ] =
    await Promise.all([
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
      fetchServerStudyRoadmaps({
        limit: 4,
      })
        .then((payload) => payload.data)
        .catch(() => undefined),
      fetchServerWeakPointInsights({
        limit: 4,
      }).catch(() => undefined),
    ]);

  return (
    <StudentHub
      initialRecentStudySessions={initialRecentStudySessions}
      initialRecentExamActivities={initialRecentExamActivities}
      initialRecentExerciseStates={initialRecentExerciseStates}
      initialMyMistakes={initialMyMistakes}
      initialStudyRoadmaps={initialStudyRoadmaps}
      initialWeakPointInsights={initialWeakPointInsights}
    />
  );
}
