import Link from "next/link";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
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
            <Button asChild variant="outline" className="h-11 rounded-full px-5">
              <Link href={STUDENT_COURSES_ROUTE}>العودة إلى الدورات</Link>
            </Button>
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
              <StudyBadge tone="brand">
                {model.progressPercent}% تقدم
              </StudyBadge>
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
              <Button asChild className="h-11 rounded-full px-5">
                <Link href={model.continueHref}>ابق في هذا المسار</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full px-5">
                <Link href={buildStudentCourseSubjectRoute(model.subject.code)}>
                  العودة إلى المادة
                </Link>
              </Button>
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

          <div className="course-concept-unit-stack">
            {model.conceptGroups.map((group) => (
              <section
                key={group.unitCode ?? "course-path"}
                className="course-concept-unit"
              >
                <div className="course-concept-unit-head">
                  <h3>{group.title}</h3>
                  <StudyBadge tone="accent">
                    {group.concepts.length} محطات
                  </StudyBadge>
                </div>

                <div className="course-concept-grid">
                  {group.concepts.map((concept, index) => (
                    <article key={concept.slug} className="course-concept-card">
                      <div className="course-concept-card-head">
                        <StudyBadge
                          tone={concept.role === "LESSON" ? "accent" : "brand"}
                        >
                          {concept.roleLabel}
                        </StudyBadge>
                        <StudyBadge tone="accent">{index + 1}</StudyBadge>
                        <h4>{concept.title}</h4>
                      </div>
                      {concept.description ? (
                        <p>{concept.description}</p>
                      ) : null}
                      <div className="course-concept-card-actions">
                        <Button asChild className="h-11 rounded-full px-5">
                          <Link href={concept.href}>افتح المفهوم</Link>
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </StudyShell>
  );
}
