import Link from "next/link";
import { StudentNavbar } from "@/components/student-navbar";
import { CourseConceptPlayer } from "@/components/course-concept-player";
import { EmptyState, StudyShell } from "@/components/study-shell";
import {
  getPrototypeConceptContent,
  getPrototypeTopicContent,
} from "@/lib/course-prototype-content";
import type { CourseTopicPageModel } from "@/lib/courses-surface";
import { STUDENT_COURSES_ROUTE } from "@/lib/student-routes";

export function CourseConceptPage({
  model,
  conceptSlug,
}: {
  model: CourseTopicPageModel | null;
  conceptSlug: string;
}) {
  if (!model) {
    return (
      <StudyShell>
        <StudentNavbar />
        <EmptyState
          title="تعذر تحميل المفهوم"
          description="لا يمكن الوصول إلى هذا المفهوم حالياً."
          action={
            <Link href={STUDENT_COURSES_ROUTE} className="btn-secondary">
              العودة إلى الدورات
            </Link>
          }
        />
      </StudyShell>
    );
  }

  const topicPrototype = getPrototypeTopicContent(
    model.subject.code,
    model.topic.slug,
  );
  const concept = getPrototypeConceptContent({
    subjectCode: model.subject.code,
    topicSlug: model.topic.slug,
    conceptSlug,
  });

  if (!topicPrototype || !concept) {
    return (
      <StudyShell>
        <StudentNavbar />
        <EmptyState
          title="هذا المفهوم لم يُؤلَّف بعد"
          description="تم تجهيز خارطة الموضوع، لكن التجربة التفاعلية لهذا المفهوم ستُنشر في التحديث القادم."
          action={
            <Link href={model.continueHref} className="btn-secondary">
              العودة إلى الموضوع
            </Link>
          }
        />
      </StudyShell>
    );
  }

  const conceptIndex = topicPrototype.concepts.findIndex(
    (item) => item.slug === concept.slug,
  );
  const nextConcept = topicPrototype.concepts[conceptIndex + 1] ?? null;

  return (
    <StudyShell>
      <StudentNavbar />

      <div className="hub-page roadmap-page">
        <CourseConceptPlayer
          concept={concept}
          topicTitle={model.topic.shortTitle}
          subjectName={model.subject.name}
          backHref={model.continueHref}
          nextHref={
            nextConcept
              ? `/student/courses/${encodeURIComponent(
                  model.subject.code,
                )}/topics/${encodeURIComponent(
                  model.topic.slug,
                )}/concepts/${encodeURIComponent(nextConcept.slug)}`
              : null
          }
        />
      </div>
    </StudyShell>
  );
}
