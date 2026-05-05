import Link from "next/link";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { STUDENT_COURSES_ROUTE } from "@/lib/student-routes";

export function FlashcardsHomePage() {
  return (
    <StudyShell>
      <StudentNavbar />

      <div className="hub-page roadmap-page">
        <section className="roadmap-hero course-hero flashcards-hero">
          <div className="roadmap-hero-copy">
            <p className="page-kicker">البطاقات</p>
            <h1>مركز مراجعة سريع وخفيف</h1>
            <p>
              مساحة مراجعة يومية ستجمع بطاقات الدروس، أخطاءك المتكررة، وما
              يجب تثبيته قبل الامتحان.
            </p>
            <div className="roadmap-hero-meta">
              <StudyBadge tone="brand">قريباً</StudyBadge>
              <StudyBadge tone="accent">مجموعات مرنة</StudyBadge>
              <StudyBadge tone="success">مرتبط بالدورات</StudyBadge>
            </div>
          </div>

          <div className="roadmap-hero-panel">
            <div className="roadmap-hero-panel-grid">
              <article>
                <strong>اليوم</strong>
                <span>مراجعات يومية</span>
              </article>
              <article>
                <strong>خاص</strong>
                <span>بطاقات شخصية</span>
              </article>
              <article>
                <strong>ربط</strong>
                <span>ربط مع الدروس</span>
              </article>
            </div>
            <div className="roadmap-hero-actions">
              <Button asChild className="h-11 rounded-full px-5">
                <Link href={STUDENT_COURSES_ROUTE}>ارجع إلى الدورات</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="roadmap-map-shell">
          <EmptyState
            title="سطح البطاقات بدأ الآن"
            description="المسار جاهز داخل التطبيق، ونظام البطاقات سيكون مرتبطاً بالدروس والأخطاء بدل أن يكون قائمة منفصلة."
          />
        </section>
      </div>
    </StudyShell>
  );
}
