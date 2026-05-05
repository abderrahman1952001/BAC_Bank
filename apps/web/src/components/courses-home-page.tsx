import Link from "next/link";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
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
            <Button asChild variant="outline" className="h-11 rounded-full px-5">
              <Link href={STUDENT_MY_SPACE_ROUTE}>العودة إلى مساحتي</Link>
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
            <p className="page-kicker">الدورات</p>
            <h1>خارطة مفاهيمية دقيقة لكل مادة</h1>
            <p>
              اختر المادة، ثم تحرك بين الوحدات والمفاهيم بخطوات قصيرة مرتبطة
              بالتدريب والمراجعة.
            </p>
            <div className="roadmap-hero-meta">
              <StudyBadge tone="brand">
                {subjectCards.length} مواد جاهزة للمسار
              </StudyBadge>
              <StudyBadge tone="accent">شرح نشط</StudyBadge>
              <StudyBadge tone="success">مرتبط بالتدريب</StudyBadge>
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
              <Button asChild className="h-11 rounded-full px-5">
                <Link href={subjectCards[0].continueHref}>واصل آخر مسار</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full px-5">
                <Link href={subjectCards[0].href}>افتح أول مادة</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="roadmap-map-shell">
          <div className="roadmap-map-head">
            <div>
              <p className="page-kicker">المواد</p>
              <h2>اختر مادة وابدأ من الخارطة</h2>
              <p>
                كل مادة تعرض تقدمك العام، الوحدات النشطة، وأسرع عودة إلى آخر
                مفهوم يحتاج تثبيتاً.
              </p>
            </div>
          </div>

          <div className="course-home-grid">
            {subjectCards.map((card) => (
              <article key={card.subjectCode} className="course-subject-card">
                <div className="course-subject-card-head">
                  <div>
                    <p className="page-kicker">المادة</p>
                    <h3>{card.title}</h3>
                  </div>
                  <StudyBadge tone="brand">{card.progressPercent}%</StudyBadge>
                </div>

                <p className="course-subject-card-copy">
                  {card.description ??
                    "مسار منظم يجمع بين فهم المفاهيم الأساسية والعودة السريعة إلى آخر نقطة توقفت عندها."}
                </p>

                <div className="course-subject-card-meta">
                  <span>{card.unitCount} وحدات</span>
                  <span>{card.conceptCount} محاور</span>
                  <span>{card.completedTopicCount} ثابتة</span>
                </div>

                <div className="course-subject-card-actions">
                  <Button asChild className="h-11 rounded-full px-5">
                    <Link href={card.href}>افتح المادة</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-full px-5">
                    <Link href={card.continueHref}>واصل</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </StudyShell>
  );
}
