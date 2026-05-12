import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Layers,
  Lock,
} from "lucide-react";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import type {
  CourseSubjectPageModel,
  CourseUnitCard,
} from "@/lib/courses-surface";
import { STUDENT_COURSES_ROUTE } from "@/lib/student-routes";

function getUnitIcon(unit: CourseUnitCard) {
  if (!unit.topics.length) {
    return Lock;
  }

  if (unit.progressPercent >= 100) {
    return CheckCircle2;
  }

  if (unit.progressPercent > 0) {
    return CircleDot;
  }

  return Layers;
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

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

      <div className="hub-page course-space">
        <section className="course-command-panel">
          <div className="course-command-head">
            <div>
              <p className="page-kicker">{model.subject.code}</p>
              <h1>{model.subject.name}</h1>
            </div>
            <div className="course-command-metrics" aria-label="ملخص المادة">
              <span>
                <strong>{model.progressPercent}%</strong>
                تقدم
              </span>
              <span>
                <strong>
                  {model.completedTopicCount}/{model.topicCount}
                </strong>
                محاور
              </span>
              <span>
                <strong>{model.units.length}</strong>
                وحدات
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
              <span>المسار الحالي</span>
              <strong>{model.title}</strong>
              <small>{model.topicCount} محاور · {model.units.length} وحدات</small>
            </div>
            <div className="course-inline-track" aria-hidden="true">
              <span />
            </div>
            <Button asChild className="h-11 rounded-full px-5">
              <Link href={model.continueHref}>
                واصل
                <ArrowLeft data-icon />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full px-5">
              <Link href={STUDENT_COURSES_ROUTE}>المواد</Link>
            </Button>
          </div>

          <div className="course-snake-panel">
            <div className="course-snake-head">
              <div>
                <span>خارطة المادة</span>
                <h2>الوحدات</h2>
              </div>
              <StudyBadge tone="accent">{model.units.length} وحدات</StudyBadge>
            </div>

            <div className="course-snake-map course-unit-snake-map">
              {chunkItems(model.units, 4).map((lane, laneIndex) => (
                <div
                  key={`unit-lane-${laneIndex}`}
                  className={`course-snake-lane ${
                    laneIndex % 2 === 1 ? "is-reverse" : ""
                  }`}
                >
                  {lane.map((unit, unitOffset) => {
                    const unitIndex = laneIndex * 4 + unitOffset;
                    const firstTopic = unit.topics[0] ?? null;
                    const Icon = getUnitIcon(unit);
                    const nodeClassName = `course-snake-node course-unit-node ${
                      unit.progressPercent > 0 ? "is-active" : ""
                    } ${!firstTopic ? "is-locked" : ""}`;
                    const nodeContent = (
                      <>
                        <span className="course-snake-node-orb" aria-hidden="true">
                          <Icon />
                        </span>
                        <span className="course-snake-node-copy">
                          <small>الوحدة {unitIndex + 1}</small>
                          <strong>{unit.title}</strong>
                          <em>
                            {unit.topics.length} محاور · {unit.progressPercent}%
                          </em>
                        </span>
                        <span className="course-snake-node-action">
                          {firstTopic ? "ادخل" : "مغلق"}
                          {firstTopic ? <ArrowLeft aria-hidden="true" /> : null}
                        </span>
                      </>
                    );

                    return firstTopic ? (
                      <Link
                        key={unit.id}
                        href={firstTopic.href}
                        className={nodeClassName}
                      >
                        {nodeContent}
                      </Link>
                    ) : (
                      <div key={unit.id} className={nodeClassName}>
                        {nodeContent}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </StudyShell>
  );
}
