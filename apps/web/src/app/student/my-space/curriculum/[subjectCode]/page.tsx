import { SubjectCurriculumJourneyPage } from "@/components/subject-curriculum-journey-page";
import {
  fetchServerMyMistakes,
  fetchServerStudyCurriculumJourneys,
} from "@/lib/server-study-api";

export default async function StudentSubjectCurriculumJourneyPage({
  params,
}: {
  params: Promise<{ subjectCode: string }>;
}) {
  const { subjectCode: rawSubjectCode } = await params;
  const subjectCode = rawSubjectCode.trim().toUpperCase();
  const [curriculumJourneyPayload, myMistakesPayload] = await Promise.all([
    fetchServerStudyCurriculumJourneys({
      limit: 1,
      subjectCode,
    }).catch(() => undefined),
    fetchServerMyMistakes({
      limit: 12,
      subjectCode,
      status: "OPEN",
    }).catch(() => undefined),
  ]);

  return (
    <SubjectCurriculumJourneyPage
      curriculumJourney={curriculumJourneyPayload?.data[0]}
      initialMyMistakes={myMistakesPayload?.data}
    />
  );
}
