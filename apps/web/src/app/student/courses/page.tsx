import { CoursesHomePage } from "@/components/courses-home-page";
import { fetchServerCourseSubjectCards } from "@/lib/server-courses-api";

export default async function StudentCoursesPage() {
  const cards = await fetchServerCourseSubjectCards().catch(() => undefined);

  return <CoursesHomePage cards={cards} />;
}
