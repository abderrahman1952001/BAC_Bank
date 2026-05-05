import Link from "next/link";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import type { CourseSubjectPageModel } from "@/lib/courses-surface";
import { STUDENT_COURSES_ROUTE } from "@/lib/student-routes";

export function CourseSubjectPage({
  model,
}: {
  model: CourseSubjectPageModel | null;
}) {
  if (!model) {
    return (
      <StudyShell>
        <StudentNavbar />
        <EmptyState
          title="تعذر تحميل مسار المادة"
          description="تحقق من اختيار المادة أو أعد المحاولة لاحقاً."
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
            <p className="page-kicker">Course</p>
            <h1>{model.subject.name}</h1>
            <p>
              {model.description ??
                "ابدأ من الوحدات الأساسية، ثم ادخل كل موضوع عبر خارطة مفاهيم قصيرة ومترابطة."}
            </p>
            <div className="roadmap-hero-meta">
              <StudyBadge tone="brand">{model.progressPercent}% تقدم</StudyBadge>
              <StudyBadge tone="success">
                {model.completedTopicCount} محاور ثابتة
              </StudyBadge>
              <StudyBadge tone="accent">{model.topicCount} محاور</StudyBadge>
            </div>
          </div>

          <div className="roadmap-hero-panel">
            <div className="roadmap-hero-panel-grid">
              <article>
                <strong>{model.units.length}</strong>
                <span>وحدات</span>
              </article>
              <article>
                <strong>{model.topicCount}</strong>
                <span>محاور إجمالية</span>
              </article>
              <article>
                <strong>{model.completedTopicCount}</strong>
                <span>محاور مكتملة</span>
              </article>
            </div>
            <div className="roadmap-hero-actions">
              <Button asChild className="h-11 rounded-full px-5">
                <Link href={model.continueHref}>واصل التعلم</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full px-5">
                <Link href={STUDENT_COURSES_ROUTE}>كل المواد</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="roadmap-map-shell">
          <div className="roadmap-map-head">
            <div>
              <p className="page-kicker">الوحدات</p>
              <h2>خارطة المادة</h2>
              <p>
                كل وحدة تقود إلى مواضيع واضحة، ثم إلى مفاهيم أو نقاط دخول
                قابلة للتقدم خطوة بخطوة.
              </p>
            </div>
          </div>

          <div className="roadmap-map-canvas">
            {model.units.map((unit, unitIndex) => (
              <section key={unit.id} className="roadmap-stage">
                <div className="roadmap-stage-head">
                  <div>
                    <span className="roadmap-stage-step">
                      الوحدة {unitIndex + 1}
                    </span>
                    <h3>{unit.title}</h3>
                    {unit.description ? <p>{unit.description}</p> : null}
                  </div>
                  <div className="roadmap-stage-metrics">
                    <StudyBadge tone="brand">{unit.progressPercent}%</StudyBadge>
                    <StudyBadge tone="accent">
                      {unit.topics.length} مواضيع
                    </StudyBadge>
                  </div>
                </div>

                <div className="course-topic-grid">
                  {unit.topics.map((topic) => (
                    <article key={topic.topicCode} className="course-topic-card">
                      <div className="course-topic-card-head">
                        <div>
                          <h4>{topic.shortTitle}</h4>
                          {topic.description ? <p>{topic.description}</p> : null}
                        </div>
                        <StudyBadge
                          tone={
                            topic.status === "COMPLETED"
                              ? "success"
                              : topic.status === "NEEDS_REVIEW"
                                ? "warning"
                                : topic.status === "IN_PROGRESS"
                                  ? "brand"
                                  : "accent"
                          }
                        >
                          {topic.statusLabel}
                        </StudyBadge>
                      </div>

                      <div className="course-topic-card-meta">
                        <span>{topic.conceptCount} مفاهيم</span>
                        <span>{topic.progressPercent}% تقدم</span>
                      </div>

                      <div className="course-topic-card-actions">
                        <Button asChild className="h-11 rounded-full px-5">
                          <Link href={topic.href}>افتح الموضوع</Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="h-11 rounded-full px-5"
                        >
                          <Link href={topic.continueHref}>التفاصيل</Link>
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
