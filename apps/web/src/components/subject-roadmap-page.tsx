import Link from "next/link";
import { StudyClearVaultButton } from "@/components/study-clear-vault-button";
import { StudentNavbar } from "@/components/student-navbar";
import { SubjectRoadmapTrail } from "@/components/subject-roadmap-trail";
import { StudyReviewQueueActions } from "@/components/study-review-queue-actions";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import {
  formatStudyReviewReason,
  type MyMistakesResponse,
} from "@/lib/study-api";
import {
  STUDENT_LIBRARY_ROUTE,
  STUDENT_MY_SPACE_ROUTE,
  STUDENT_TRAINING_ROUTE,
  STUDENT_TRAINING_SIMULATION_ROUTE,
  buildStudentLibraryExamRouteWithSearch,
  buildStudentMySpaceRoadmapRoute,
  buildStudentTrainingDrillRoute,
} from "@/lib/student-routes";
import type { Roadmap } from "@/lib/subject-roadmap-view";
import { formatRelativeStudyTimestamp } from "@/lib/study-time";

function describeMistakeReviewCadence(
  item: MyMistakesResponse["data"][number],
): { label: string; tone: "brand" | "warning" | "success" | "neutral" } {
  const streakLabel =
    item.successStreak > 0 ? `ثبات ${item.successStreak}/3` : "أول تثبيت";

  if (item.isDue) {
    return {
      label: `${streakLabel} · مستحق الآن`,
      tone: item.successStreak >= 2 ? "brand" : "warning",
    };
  }

  if (item.dueAt) {
    return {
      label: `${streakLabel} · ${formatRelativeStudyTimestamp(item.dueAt)}`,
      tone: "neutral",
    };
  }

  return {
    label: streakLabel,
    tone: "success",
  };
}

function buildRoadmapNextActionHref(roadmap: Roadmap) {
  switch (roadmap.nextAction?.type) {
    case "TOPIC_DRILL":
      return buildStudentTrainingDrillRoute({
        subjectCode: roadmap.subject.code,
        topicCodes: roadmap.nextAction.topicCode
          ? [roadmap.nextAction.topicCode]
          : [],
      });
    case "REVIEW_MISTAKES":
      return buildStudentMySpaceRoadmapRoute(roadmap.subject.code, "mistakes");
    case "PAPER_SIMULATION":
      return STUDENT_TRAINING_SIMULATION_ROUTE;
    default:
      return STUDENT_TRAINING_ROUTE;
  }
}

function buildMistakeHref(item: MyMistakesResponse["data"][number]) {
  return buildStudentLibraryExamRouteWithSearch({
    streamCode: item.exam.stream.code,
    subjectCode: item.exam.subject.code,
    year: item.exam.year,
    examId: item.exam.id,
    sujetNumber: item.exam.sujetNumber,
    exercise: item.exerciseNodeId,
    question: item.focusQuestionId,
  });
}

export function SubjectRoadmapPage({
  roadmap,
  initialMyMistakes,
}: {
  roadmap?: Roadmap;
  initialMyMistakes?: MyMistakesResponse["data"];
}) {
  if (!roadmap) {
    return (
      <StudyShell>
        <StudentNavbar />
        <EmptyState
          title="تعذر تحميل خارطة المادة"
          description="أعد المحاولة من مساحتك أو ارجع إلى التدريب."
          action={
            <div className="study-action-row">
              <Button asChild className="h-11 rounded-full px-5">
                <Link href={STUDENT_MY_SPACE_ROUTE}>العودة إلى مساحتي</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full px-5">
                <Link href={STUDENT_TRAINING_ROUTE}>التدريب</Link>
              </Button>
            </div>
          }
        />
      </StudyShell>
    );
  }

  const myMistakes = initialMyMistakes ?? [];
  const nextActionHref = buildRoadmapNextActionHref(roadmap);
  const recommendedTopicCode =
    roadmap.nextAction?.type === "TOPIC_DRILL" ? roadmap.nextAction.topicCode : null;

  return (
    <StudyShell>
      <StudentNavbar />

      <div className="hub-page roadmap-page">
        <section className="roadmap-hero">
          <div className="roadmap-hero-copy">
            <p className="page-kicker">خارطة التقدم</p>
            <h1>{roadmap.subject.name}</h1>
            <p>
              {roadmap.description ?? roadmap.curriculum.title}
              {roadmap.updatedAt
                ? ` · آخر نشاط ${formatRelativeStudyTimestamp(roadmap.updatedAt)}`
                : ""}
            </p>

            <div className="roadmap-hero-meta">
              <StudyBadge tone="brand">{roadmap.progressPercent}% إنجاز</StudyBadge>
              <StudyBadge tone="success">
                {roadmap.solidNodeCount} محاور ثابتة
              </StudyBadge>
              {roadmap.needsReviewNodeCount > 0 ? (
                <StudyBadge tone="warning">
                  {roadmap.needsReviewNodeCount} تحتاج علاجاً
                </StudyBadge>
              ) : null}
              {roadmap.openReviewItemCount > 0 ? (
                <StudyBadge tone="accent">
                  {roadmap.openReviewItemCount} عناصر مراجعة
                </StudyBadge>
              ) : null}
            </div>
          </div>

          <div className="roadmap-hero-panel">
            <div className="roadmap-hero-panel-grid">
              <article>
                <strong>{roadmap.sections.length}</strong>
                <span>مراحل المسار</span>
              </article>
              <article>
                <strong>{roadmap.totalNodeCount}</strong>
                <span>محاور ظاهرة</span>
              </article>
              <article>
                <strong>{roadmap.notStartedNodeCount}</strong>
                <span>محاور متاحة</span>
              </article>
            </div>

            <div className="roadmap-hero-actions">
              <Button asChild className="h-11 rounded-full px-5">
                <Link href={nextActionHref}>
                  {roadmap.nextAction?.label ?? "ابدأ الآن"}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full px-5">
                <Link href={STUDENT_TRAINING_SIMULATION_ROUTE}>محاكاة كاملة</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="roadmap-map-shell">
          <div className="roadmap-map-head">
            <div>
              <h2>المسار المرئي للمادة</h2>
              <p>
                يمكنك القفز لأي محور، لكن الخارطة ترشّح لك أين تضع جلستك القادمة
                بناءً على ما بدأته وما يحتاج علاجاً.
              </p>
            </div>

            <div className="roadmap-legend">
              <StudyBadge tone="accent">جاهز</StudyBadge>
              <StudyBadge tone="brand">قيد البناء</StudyBadge>
              <StudyBadge tone="warning">مراجعة الآن</StudyBadge>
              <StudyBadge tone="success">ثابت</StudyBadge>
            </div>
          </div>

          <SubjectRoadmapTrail
            roadmap={roadmap}
            recommendedTopicCode={recommendedTopicCode}
          />
        </section>

        <section id="mistakes" className="hub-activity-section">
          <div className="hub-activity-head">
            <div>
              <h2>مراجعة الأخطاء المفتوحة</h2>
              <p className="roadmap-support-copy">
                هذه الطبقة تصحح المسار بسرعة عندما تتكرر الأخطاء أو يحين موعد
                التثبيت.
              </p>
            </div>
            {myMistakes.length > 0 ? (
              <StudyClearVaultButton subjectCode={roadmap.subject.code} />
            ) : null}
          </div>

          {myMistakes.length === 0 ? (
            <EmptyState
              title="لا توجد أخطاء مفتوحة لهذه المادة"
              description="يمكنك الآن تثبيت المحاور أو الانتقال إلى محاكاة رسمية كاملة."
              action={
                <div className="study-action-row">
                  <Button asChild className="h-11 rounded-full px-5">
                    <Link href={STUDENT_TRAINING_SIMULATION_ROUTE}>ابدأ محاكاة</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-full px-5">
                    <Link href={STUDENT_LIBRARY_ROUTE}>المكتبة</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="hub-activity-list">
              {myMistakes.map((item, index) => {
                const cadence = describeMistakeReviewCadence(item);

                return (
                  <article
                    key={`roadmap-mistake:${item.exerciseNodeId}`}
                    className={
                      item.flagged
                        ? "hub-activity-card kind-mistake is-flagged"
                        : "hub-activity-card kind-mistake"
                    }
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="hub-activity-top">
                      <div className="hub-activity-copy">
                        <span className="hub-activity-kicker">
                          {item.reasons
                            .slice(0, 3)
                            .map((reason) => formatStudyReviewReason(reason))
                            .join(" · ")}
                        </span>
                        <h3>{item.exercise.title ?? `التمرين ${item.exercise.orderIndex}`}</h3>
                        <small>
                          {item.exam.subject.name} · {item.exam.year} · {item.exam.sujetLabel}
                        </small>
                      </div>
                      <span className="hub-activity-time">
                        {formatRelativeStudyTimestamp(item.updatedAt)}
                      </span>
                    </div>

                    <div className="hub-activity-foot">
                      <Link
                        href={buildMistakeHref(item)}
                        className="hub-activity-action tone-brand"
                      >
                        افتح التمرين
                      </Link>
                      <StudyBadge tone={item.flagged ? "brand" : "warning"}>
                        {item.questionSignalCount > 0
                          ? `${item.questionSignalCount} أسئلة تحتاج رجوعاً`
                          : "تمرين يحتاج رجوعاً"}
                      </StudyBadge>
                      <StudyBadge tone={cadence.tone}>{cadence.label}</StudyBadge>
                    </div>

                    <div className="hub-activity-foot">
                      <StudyReviewQueueActions
                        exerciseNodeId={item.exerciseNodeId}
                        statuses={["DONE", "SNOOZED", "REMOVED"]}
                        labels={{
                          DONE: "تمت",
                          SNOOZED: "لاحقاً",
                          REMOVED: "إخفاء",
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </StudyShell>
  );
}
