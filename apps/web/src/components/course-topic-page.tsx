import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  Flag,
  Layers,
  Play,
  TriangleAlert,
} from "lucide-react";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import type {
  CourseConceptCard,
  CourseTopicPageModel,
} from "@/lib/courses-surface";
import {
  STUDENT_COURSES_ROUTE,
  buildStudentCourseSubjectRoute,
} from "@/lib/student-routes";

function getConceptIcon(concept: CourseConceptCard) {
  if (concept.role === "FIELD_INTRO") {
    return Play;
  }

  if (concept.role === "UNIT_INTRO") {
    return Layers;
  }

  if (concept.role === "FIELD_SYNTHESIS") {
    return Flag;
  }

  return BookOpenCheck;
}

function getConceptTone(concept: CourseConceptCard, index: number) {
  if (index === 0) {
    return "brand";
  }

  if (concept.role === "FIELD_SYNTHESIS") {
    return "accent";
  }

  if (concept.title.includes("فخ") || concept.title.includes("تحقق")) {
    return "warning";
  }

  return "neutral";
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

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
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full px-5"
            >
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

      <div className="hub-page course-space">
        <section className="course-command-panel">
          <div className="course-command-head">
            <div>
              <p className="page-kicker">{model.subject.name}</p>
              <h1>{model.topic.shortTitle}</h1>
            </div>
            <div className="course-command-metrics" aria-label="ملخص الموضوع">
              <span>
                <strong>{model.progressPercent}%</strong>
                تقدم
              </span>
              <span>
                <strong>{model.conceptCount}</strong>
                مفاهيم
              </span>
              <span>
                <strong>{model.statusLabel}</strong>
                حالة
              </span>
            </div>
          </div>

          <div
            className="course-continue-strip"
            style={
              {
                "--course-progress": `${model.progressPercent}%`,
              } as CSSProperties
            }
          >
            <div className="course-continue-copy">
              <span>{model.parentUnitTitle ?? "المادة"}</span>
              <strong>{model.topic.title}</strong>
              <small>{model.conceptCount} محطات</small>
            </div>
            <div className="course-inline-track" aria-hidden="true">
              <span />
            </div>
            <Button asChild className="h-11 rounded-full px-5">
              <Link href={model.continueHref}>
                ابدأ
                <ArrowLeft data-icon />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full px-5"
            >
              <Link href={buildStudentCourseSubjectRoute(model.subject.code)}>
                المادة
              </Link>
            </Button>
          </div>

          <div className="course-concept-path">
            {model.conceptGroups.map((group) => (
              <section
                key={group.unitCode ?? "course-path"}
                className="course-snake-panel course-concept-snake-panel"
              >
                <div className="course-snake-head">
                  <div>
                    <span>خارطة الوحدة</span>
                    <h2>{group.title}</h2>
                  </div>
                  <StudyBadge tone="accent">
                    {group.concepts.length} محطات
                  </StudyBadge>
                </div>

                <div className="course-snake-map course-concept-snake-map">
                  {chunkItems(group.concepts, 4).map((lane, laneIndex) => (
                    <div
                      key={`${group.unitCode ?? "path"}-${laneIndex}`}
                      className={`course-snake-lane ${
                        laneIndex % 2 === 1 ? "is-reverse" : ""
                      }`}
                    >
                      {lane.map((concept, conceptOffset) => {
                        const index = laneIndex * 4 + conceptOffset;

                        return (
                          <Link
                            key={concept.slug}
                            href={concept.href}
                            className={`course-snake-node course-concept-node ${
                              index === 0 ? "is-recommended" : ""
                            }`}
                          >
                            <span
                              className="course-snake-node-orb"
                              aria-hidden="true"
                            >
                              {(() => {
                                const Icon = getConceptIcon(concept);
                                return <Icon />;
                              })()}
                            </span>
                            <span className="course-snake-node-copy">
                              <span>
                                <StudyBadge
                                  tone={getConceptTone(concept, index)}
                                >
                                  {concept.roleLabel}
                                </StudyBadge>
                                {concept.title.includes("فخ") ||
                                concept.title.includes("تحقق") ? (
                                  <StudyBadge tone="warning">
                                    <TriangleAlert
                                      size={12}
                                      aria-hidden="true"
                                    />
                                    تثبيت
                                  </StudyBadge>
                                ) : null}
                              </span>
                              <strong>{concept.title}</strong>
                              <em>
                                {index + 1}/{group.concepts.length}
                              </em>
                            </span>
                            <span className="course-snake-node-action">
                              افتح
                              <ArrowLeft aria-hidden="true" />
                            </span>
                          </Link>
                        );
                      })}
                    </div>
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
