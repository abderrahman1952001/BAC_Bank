import Link from "next/link";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { STUDENT_COURSES_ROUTE } from "@/lib/student-routes";

export function FlashcardsHomePage() {
  return (
    <StudyShell>
      <StudentNavbar />

      <div className="hub-page roadmap-page">
        <section className="roadmap-hero course-hero flashcards-hero">
          <div className="roadmap-hero-copy">
            <p className="page-kicker">Flashcards</p>
            <h1>مركز مراجعة سريع وخفيف</h1>
            <p>
              هذه الواجهة جاهزة لتصبح محطة المراجعة اليومية للدروس: بطاقات جاهزة،
              بطاقات خاصة بك، ومراجعة قصيرة تعيد لك أهم ما يجب تثبيته.
            </p>
            <div className="roadmap-hero-meta">
              <StudyBadge tone="brand">قيد البناء الآن</StudyBadge>
              <StudyBadge tone="accent">ديك مرن</StudyBadge>
              <StudyBadge tone="success">سيرتبط بالدورات</StudyBadge>
            </div>
          </div>

          <div className="roadmap-hero-panel">
            <div className="roadmap-hero-panel-grid">
              <article>
                <strong>Due</strong>
                <span>مراجعات يومية</span>
              </article>
              <article>
                <strong>Edit</strong>
                <span>بطاقات شخصية</span>
              </article>
              <article>
                <strong>Sync</strong>
                <span>ربط مع الدروس</span>
              </article>
            </div>
            <div className="roadmap-hero-actions">
              <Link href={STUDENT_COURSES_ROUTE} className="btn-primary">
                ارجع إلى الدورات
              </Link>
            </div>
          </div>
        </section>

        <section className="roadmap-map-shell">
          <EmptyState
            title="سطح البطاقات بدأ الآن"
            description="في هذه الدفعة فتحنا المسار والهيكل العام. نظام البطاقات نفسه سيكون الدفعة التالية المباشرة."
          />
        </section>
      </div>
    </StudyShell>
  );
}
