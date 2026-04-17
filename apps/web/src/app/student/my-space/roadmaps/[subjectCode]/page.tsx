import { SubjectRoadmapPage } from "@/components/subject-roadmap-page";
import {
  fetchServerMyMistakes,
  fetchServerStudyRoadmaps,
} from "@/lib/server-study-api";

export default async function StudentSubjectRoadmapPage({
  params,
}: {
  params: Promise<{ subjectCode: string }>;
}) {
  const { subjectCode: rawSubjectCode } = await params;
  const subjectCode = rawSubjectCode.trim().toUpperCase();
  const [roadmapPayload, myMistakesPayload] = await Promise.all([
    fetchServerStudyRoadmaps({
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
    <SubjectRoadmapPage
      roadmap={roadmapPayload?.data[0]}
      initialMyMistakes={myMistakesPayload?.data}
    />
  );
}
