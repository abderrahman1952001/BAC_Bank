import Link from "next/link";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import type { CourseSubjectCard } from "@/lib/courses-surface";
import { STUDENT_MY_SPACE_ROUTE } from "@/lib/student-routes";

export function CoursesHomePage({
  cards,
}: {
  cards?: CourseSubjectCard[];
}) {
  const subjectCards = cards ?? [];

  if (subjectCards.length === 0) {
    return (
      <StudyShell>
        <StudentNavbar />
        <EmptyState
          title="تعذر تحميل الدورات"
          description="أعد المحاولة من مساحتك أو عد لاحقاً."
          action={
            <Link href={STUDENT_MY_SPACE_ROUTE} className="btn-secondary">
              العودة إلى مساحتي
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
            <p className="page-kicker">Courses</p>
            <h1>رحلة مفاهيمية متدرجة داخل كل مادة</h1>
            <p>
              اختر المادة، وادخل عبر وحدات واضحة، ثم تحرك بين المفاهيم بخطوات
              قصيرة، نظيفة، وقابلة للمراجعة.
            </p>
            <div className="roadmap-hero-meta">
              <StudyBadge tone="brand">
                {subjectCards.length} مواد جاهزة للمسار
              </StudyBadge>
              <StudyBadge tone="accent">نمط تعلّم تفاعلي</StudyBadge>
              <StudyBadge tone="success">تصميم هادئ ومركز</StudyBadge>
            </div>
          </div>

          <div className="roadmap-hero-panel">
            <div className="roadmap-hero-panel-grid">
              <article>
                <strong>{subjectCards.reduce((sum, card) => sum + card.unitCount, 0)}</strong>
                <span>وحدات منظمة</span>
              </article>
              <article>
                <strong>
                  {subjectCards.reduce((sum, card) => sum + card.conceptCount, 0)}
                </strong>
                <span>محاور قابلة للتقدم</span>
              </article>
              <article>
                <strong>
                  {Math.round(
                    subjectCards.reduce(
                      (sum, card) => sum + card.progressPercent,
                      0,
                    ) / subjectCards.length,
                  )}
                  %
                </strong>
                <span>متوسط التقدم</span>
              </article>
            </div>
            <div className="roadmap-hero-actions">
              <Link href={subjectCards[0].continueHref} className="btn-primary">
                واصل آخر مسار
              </Link>
              <Link href={subjectCards[0].href} className="btn-secondary">
                افتح أول مادة
              </Link>
            </div>
          </div>
        </section>

        <section className="roadmap-map-shell">
          <div className="roadmap-map-head">
            <div>
              <p className="page-kicker">المواد</p>
              <h2>اختر مادة وابدأ من الخارطة</h2>
              <p>
                كل مادة تعرض تقدماً عاماً، وعدد الوحدات، وأسرع طريق للعودة إلى
                آخر موضوع نشط.
              </p>
            </div>
          </div>

          <div className="course-home-grid">
            {subjectCards.map((card) => (
              <article key={card.subjectCode} className="course-subject-card">
                <div className="course-subject-card-head">
                  <div>
                    <p className="page-kicker">Subject</p>
                    <h3>{card.title}</h3>
                  </div>
                  <StudyBadge tone="brand">{card.progressPercent}%</StudyBadge>
                </div>

                <p className="course-subject-card-copy">
                  {card.description ??
                    "مسار منظم يجمع بين فهم الموضوعات الأساسية والعودة السريعة إلى آخر نقطة توقفت عندها."}
                </p>

                <div className="course-subject-card-meta">
                  <span>{card.unitCount} وحدات</span>
                  <span>{card.conceptCount} محاور</span>
                  <span>{card.completedTopicCount} ثابتة</span>
                </div>

                <div className="course-subject-card-actions">
                  <Link href={card.href} className="btn-primary">
                    افتح المادة
                  </Link>
                  <Link href={card.continueHref} className="btn-secondary">
                    واصل
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
