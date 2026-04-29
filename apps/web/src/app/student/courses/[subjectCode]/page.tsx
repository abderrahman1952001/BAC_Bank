import { CourseSubjectPage } from "@/components/course-subject-page";
import { fetchServerCourseSubjectPageModel } from "@/lib/server-courses-api";

export default async function StudentCourseSubjectPage({
  params,
}: {
  params: Promise<{ subjectCode: string }>;
}) {
  const { subjectCode: rawSubjectCode } = await params;
  const subjectCode = rawSubjectCode.trim().toUpperCase();
  const model = await fetchServerCourseSubjectPageModel(subjectCode).catch(
    () => null,
  );

  return <CourseSubjectPage model={model} />;
}
