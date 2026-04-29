import { CourseTopicPage } from "@/components/course-topic-page";
import { fetchServerCourseTopicPageModel } from "@/lib/server-courses-api";

export default async function StudentCourseTopicRoutePage({
  params,
}: {
  params: Promise<{ subjectCode: string; topicSlug: string }>;
}) {
  const { subjectCode: rawSubjectCode, topicSlug } = await params;
  const subjectCode = rawSubjectCode.trim().toUpperCase();
  const model = await fetchServerCourseTopicPageModel(
    subjectCode,
    topicSlug,
  ).catch(() => null);

  return <CourseTopicPage model={model} />;
}
