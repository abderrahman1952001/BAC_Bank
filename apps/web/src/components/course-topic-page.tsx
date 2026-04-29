import Link from "next/link";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import type { CourseTopicPageModel } from "@/lib/courses-surface";
import {
  STUDENT_COURSES_ROUTE,
  buildStudentCourseSubjectRoute,
} from "@/lib/student-routes";

export function CourseTopicPage({
  model,
}: {
  model: CourseTopicPageModel | null;
}) {
  if (!model) {
    return (
      <StudyShell>
        <StudentNavbar />
        <EmptyState
          title="تعذر تحميل الموضوع"
          description="قد يكون الرابط غير صحيح أو أن محتوى الموضوع لم يعد متاحاً."
          action={
            <Link href={STUDENT_COURSES_ROUTE} className="btn-secondary">
              العودة إلى الدورات
            </Link>
          }
        />
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      <StudentNavbar />

      <div className="hub-page roadmap-page">
        <section className="roadmap-hero course-hero">
          <div className="roadmap-hero-copy">
            <p className="page-kicker">Topic</p>
            <h1>{model.topic.shortTitle}</h1>
            <p>
              {model.description ??
                "تحرك داخل هذا الموضوع عبر مفاهيم قصيرة، لكل منها هدف واضح ونقطة مراجعة صغيرة في النهاية."}
            </p>
            <div className="roadmap-hero-meta">
              <StudyBadge tone="brand">{model.progressPercent}% تقدم</StudyBadge>
              <StudyBadge tone="accent">{model.conceptCount} مفاهيم</StudyBadge>
              <StudyBadge tone="success">{model.statusLabel}</StudyBadge>
            </div>
          </div>

          <div className="roadmap-hero-panel">
            <div className="roadmap-hero-panel-grid">
              <article>
                <strong>{model.conceptCount}</strong>
                <span>محطات تعلم</span>
              </article>
              <article>
                <strong>{model.parentUnitTitle ?? "المادة"}</strong>
                <span>الوحدة الأم</span>
              </article>
              <article>
                <strong>{model.statusLabel}</strong>
                <span>الحالة الحالية</span>
              </article>
            </div>
            <div className="roadmap-hero-actions">
              <Link href={model.continueHref} className="btn-primary">
                ابق في هذا المسار
              </Link>
              <Link
                href={buildStudentCourseSubjectRoute(model.subject.code)}
                className="btn-secondary"
              >
                العودة إلى المادة
              </Link>
            </div>
          </div>
        </section>

        <section className="roadmap-map-shell">
          <div className="roadmap-map-head">
            <div>
              <p className="page-kicker">Concepts</p>
              <h2>ابدأ من المفهوم المناسب</h2>
              <p>
                هذه المحطات هي وحدات التعلم الصغيرة داخل الموضوع. كل محطة تقود
                إلى تجربة قصيرة ومركزة.
              </p>
            </div>
          </div>

          <div className="course-concept-grid">
            {model.concepts.map((concept, index) => (
              <article key={concept.slug} className="course-concept-card">
                <div className="course-concept-card-head">
                  <StudyBadge tone="accent">المفهوم {index + 1}</StudyBadge>
                  <h3>{concept.title}</h3>
                </div>
                {concept.description ? <p>{concept.description}</p> : null}
                <div className="course-concept-card-actions">
                  <Link href={concept.href} className="btn-primary">
                    افتح المفهوم
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </StudyShell>
  );
}
