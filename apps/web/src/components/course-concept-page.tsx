import Link from "next/link";
import { StudentNavbar } from "@/components/student-navbar";
import { CourseConceptPlayer } from "@/components/course-concept-player";
import { EmptyState, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import type { CourseConceptPageModel } from "@/lib/courses-surface";
import { getLabToolsForCourseConcept } from "@/lib/lab-surface";
import { STUDENT_COURSES_ROUTE } from "@/lib/student-routes";

export function CourseConceptPage({
  model,
}: {
  model: CourseConceptPageModel | null;
}) {
  if (!model) {
    return (
      <StudyShell>
        <StudentNavbar />
        <EmptyState
          title="تعذر تحميل المفهوم"
          description="لا يمكن الوصول إلى هذا المفهوم حالياً."
          action={
            <Button asChild variant="outline" className="h-11 rounded-full px-5">
              <Link href={STUDENT_COURSES_ROUTE}>العودة إلى الدورات</Link>
            </Button>
          }
        />
      </StudyShell>
    );
  }

  const relatedLabTools = getLabToolsForCourseConcept({
    subjectCode: model.subject.code,
    topicSlug: model.topic.slug,
    conceptSlug: model.concept.slug,
  });

  return (
    <StudyShell>
      <StudentNavbar />

      <div className="hub-page roadmap-page">
        <CourseConceptPlayer
          concept={model.concept}
          topicTitle={model.topic.shortTitle}
          subjectName={model.subject.name}
          backHref={model.backHref}
          nextHref={model.nextHref}
          relatedLabTools={relatedLabTools}
        />
      </div>
    </StudyShell>
  );
}
