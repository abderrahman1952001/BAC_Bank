import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowLeft, Command, Search } from "lucide-react";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import type { CourseSubjectCard } from "@/lib/courses-surface";
import { STUDENT_MY_SPACE_ROUTE } from "@/lib/student-routes";

function getCourseInstrumentVariant(subjectCode: string) {
  const normalizedCode = subjectCode.toUpperCase();

  if (
    normalizedCode.includes("NATURAL") ||
    normalizedCode.includes("SVT") ||
    normalizedCode.includes("SCIENCE")
  ) {
    return "biology";
  }

  if (normalizedCode.includes("PHYS")) {
    return "physics";
  }

  return "math";
}

function CourseInstrumentVisual({
  progressPercent,
  subjectCode,
}: {
  progressPercent: number;
  subjectCode: string;
}) {
  const variant = getCourseInstrumentVariant(subjectCode);

  return (
    <span
      className={`instrument-visual course-subject-visual is-${variant}`}
      aria-hidden="true"
    >
      {variant === "biology" ? (
        <svg
          className="instrument-vector course-subject-vector"
          viewBox="0 0 220 130"
          fill="none"
        >
          <path d="M72 18c54 0 76 94 76 94" />
          <path d="M148 18c-54 0-76 94-76 94" />
          <path d="M82 35h56" />
          <path d="M74 58h72" />
          <path d="M76 81h68" />
          <path d="M84 104h52" />
        </svg>
      ) : variant === "physics" ? (
        <svg
          className="instrument-vector course-subject-vector"
          viewBox="0 0 220 130"
          fill="none"
        >
          <path d="M34 94c34-50 67-74 103-74 22 0 38 11 49 33" />
          <path d="M34 94h152" />
          <path d="M64 94V54" />
          <path d="M112 94V30" />
          <path d="M160 94V54" />
          <circle cx="112" cy="30" r="8" />
        </svg>
      ) : (
        <svg
          className="instrument-vector course-subject-vector"
          viewBox="0 0 220 130"
          fill="none"
        >
          <path d="M24 92c34-72 58-72 86 0s52 72 86 0" />
          <path d="M24 94h172" />
          <path d="M110 18v94" />
          <path d="M48 70h124" />
        </svg>
      )}

      <span className="instrument-mini-ui course-subject-mini">
        <strong>{progressPercent}%</strong>
        <span>
          <i />
          <i />
          <i />
          <em />
        </span>
      </span>
    </span>
  );
}

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
              <span>بحث</span>
              <kbd>
                <Command aria-hidden="true" /> K
              </kbd>
            </div>
            <StudyBadge tone="brand">Courses</StudyBadge>
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
                className="instrument-card course-subject-chip"
                style={
                  {
                    "--course-progress": `${card.progressPercent}%`,
                  } as CSSProperties
                }
              >
                <CourseInstrumentVisual
                  progressPercent={card.progressPercent}
                  subjectCode={card.subjectCode}
                />
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
