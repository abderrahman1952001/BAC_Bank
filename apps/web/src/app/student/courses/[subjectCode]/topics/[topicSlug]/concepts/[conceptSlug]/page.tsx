import { CourseConceptPage } from "@/components/course-concept-page";
import { fetchServerCourseConceptPageModel } from "@/lib/server-courses-api";

export default async function StudentCourseConceptRoutePage({
  params,
}: {
  params: Promise<{
    subjectCode: string;
    topicSlug: string;
    conceptSlug: string;
  }>;
}) {
  const { subjectCode: rawSubjectCode, topicSlug, conceptSlug } = await params;
  const subjectCode = rawSubjectCode.trim().toUpperCase();
  const model = await fetchServerCourseConceptPageModel(
    subjectCode,
    topicSlug,
    conceptSlug,
  ).catch(() => null);

  return <CourseConceptPage model={model} />;
}
