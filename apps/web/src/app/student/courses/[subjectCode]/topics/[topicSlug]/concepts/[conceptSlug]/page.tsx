import { redirect } from "next/navigation";
import { CourseConceptPage } from "@/components/course-concept-page";
import {
  fetchServerCourseConceptPageModel,
  fetchServerCourseTopicPageModel,
} from "@/lib/server-courses-api";

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

  if (conceptSlug.trim().toLowerCase() === topicSlug.trim().toLowerCase()) {
    const topic = await fetchServerCourseTopicPageModel(
      subjectCode,
      topicSlug,
    ).catch(() => null);
    const firstConceptHref = topic?.concepts[0]?.href;

    if (firstConceptHref) {
      redirect(firstConceptHref);
    }
  }

  const model = await fetchServerCourseConceptPageModel(
    subjectCode,
    topicSlug,
    conceptSlug,
  ).catch(() => null);

  return <CourseConceptPage model={model} />;
}
