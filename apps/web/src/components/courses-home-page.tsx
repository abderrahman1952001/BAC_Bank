import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  Command,
  Search,
} from "lucide-react";
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
  const totalUnits = subjectCards.reduce((sum, card) => sum + card.unitCount, 0);
  const totalConcepts = subjectCards.reduce(
    (sum, card) => sum + card.conceptCount,
    0,
  );
  const averageProgress = subjectCards.length
    ? Math.round(
        subjectCards.reduce((sum, card) => sum + card.progressPercent, 0) /
          subjectCards.length,
      )
    : 0;

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

      <div className="hub-page course-space">
        <section className="course-command-panel">
          <div className="course-board-toolbar">
            <div className="course-board-search" aria-hidden="true">
              <Search />
              <span>ابحث عن مادة أو مفهوم...</span>
              <kbd>
                <Command aria-hidden="true" /> K
              </kbd>
            </div>
            <StudyBadge tone="brand">متابعة سريعة</StudyBadge>
          </div>

          <div className="course-command-head">
            <div>
              <p className="page-kicker">الدورات</p>
              <h1>مسارات المواد</h1>
            </div>
            <div className="course-command-metrics" aria-label="ملخص الدورات">
              <span>
                <strong>{averageProgress}%</strong>
                تقدم
              </span>
              <span>
                <strong>{totalUnits}</strong>
                وحدات
              </span>
              <span>
                <strong>{totalConcepts}</strong>
                مفاهيم
              </span>
            </div>
          </div>

          <div className="course-subject-chip-grid" aria-label="مواد المسار">
            {subjectCards.map((card) => (
              <Link
                key={card.subjectCode}
                href={card.href}
                className="course-subject-chip"
                style={
                  {
                    "--course-progress": `${card.progressPercent}%`,
                  } as CSSProperties
                }
              >
                <span className="course-subject-orb" aria-hidden="true">
                  <BookOpenCheck />
                </span>
                <span className="course-subject-chip-copy">
                  <span className="course-subject-chip-head">
                    <h2>{card.subjectName}</h2>
                    <StudyBadge
                      tone={card.progressPercent >= 80 ? "success" : "brand"}
                    >
                      {card.progressPercent}%
                    </StudyBadge>
                  </span>
                  <span className="course-subject-chip-meta">
                    <span>{card.unitCount} وحدات</span>
                    <span>{card.conceptCount} مفاهيم</span>
                    <span>{card.completedTopicCount} مكتملة</span>
                  </span>
                  <span className="course-subject-chip-track" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <em />
                  </span>
                </span>
                <span className="course-subject-chip-action">
                  الخريطة
                  <ArrowLeft aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </StudyShell>
  );
}
