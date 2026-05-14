import Link from "next/link";
import { StudyClearVaultButton } from "@/components/study-clear-vault-button";
import { StudentNavbar } from "@/components/student-navbar";
import { SubjectCurriculumJourneyTrail } from "@/components/subject-curriculum-journey-trail";
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
  buildStudentMySpaceCurriculumJourneyRoute,
  buildStudentTrainingDrillRoute,
} from "@/lib/student-routes";
import type { CurriculumJourney } from "@/lib/subject-curriculum-journey-view";
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

function buildCurriculumJourneyNextActionHref(
  curriculumJourney: CurriculumJourney,
) {
  switch (curriculumJourney.nextAction?.type) {
    case "TOPIC_DRILL":
      return buildStudentTrainingDrillRoute({
        subjectCode: curriculumJourney.subject.code,
        topicCodes: curriculumJourney.nextAction.curriculumNodeCode
          ? [curriculumJourney.nextAction.curriculumNodeCode]
          : [],
      });
    case "REVIEW_MISTAKES":
      return buildStudentMySpaceCurriculumJourneyRoute(
        curriculumJourney.subject.code,
        "mistakes",
      );
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

export function SubjectCurriculumJourneyPage({
  curriculumJourney,
  initialMyMistakes,
}: {
  curriculumJourney?: CurriculumJourney;
  initialMyMistakes?: MyMistakesResponse["data"];
}) {
  if (!curriculumJourney) {
    return (
      <StudyShell>
        <StudentNavbar />
        <EmptyState
          title="تعذر تحميل مسار المادة"
          description="أعد المحاولة من مساحتك أو ارجع إلى التدريب."
          action={
            <div className="study-action-row">
              <Button asChild className="h-11 rounded-full px-5">
                <Link href={STUDENT_MY_SPACE_ROUTE}>العودة إلى مساحتي</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full px-5"
              >
                <Link href={STUDENT_TRAINING_ROUTE}>التدريب</Link>
              </Button>
            </div>
          }
        />
      </StudyShell>
    );
  }

  const myMistakes = initialMyMistakes ?? [];
  const nextActionHref =
    buildCurriculumJourneyNextActionHref(curriculumJourney);
  const recommendedCurriculumNodeCode =
    curriculumJourney.nextAction?.type === "TOPIC_DRILL"
      ? curriculumJourney.nextAction.curriculumNodeCode
      : null;

  return (
    <StudyShell>
      <StudentNavbar />

      <div className="hub-page curriculum-journey-page">
        <section className="curriculum-journey-hero">
          <div className="curriculum-journey-hero-copy">
            <p className="page-kicker">مسار المنهج</p>
            <h1>{curriculumJourney.subject.name}</h1>
            <p>
              {curriculumJourney.description ??
                curriculumJourney.curriculum.title}
              {curriculumJourney.updatedAt
                ? ` · آخر نشاط ${formatRelativeStudyTimestamp(
                    curriculumJourney.updatedAt,
                  )}`
                : ""}
            </p>

            <div className="curriculum-journey-hero-meta">
              <StudyBadge tone="brand">
                {curriculumJourney.progressPercent}% إنجاز
              </StudyBadge>
              <StudyBadge tone="success">
                {curriculumJourney.solidNodeCount} محاور ثابتة
              </StudyBadge>
              {curriculumJourney.needsReviewNodeCount > 0 ? (
                <StudyBadge tone="warning">
                  {curriculumJourney.needsReviewNodeCount} تحتاج علاجاً
                </StudyBadge>
              ) : null}
              {curriculumJourney.openReviewItemCount > 0 ? (
                <StudyBadge tone="accent">
                  {curriculumJourney.openReviewItemCount} عناصر مراجعة
                </StudyBadge>
              ) : null}
            </div>
          </div>

          <div className="curriculum-journey-hero-panel">
            <div className="curriculum-journey-hero-panel-grid">
              <article>
                <strong>{curriculumJourney.sections.length}</strong>
                <span>مراحل المسار</span>
              </article>
              <article>
                <strong>{curriculumJourney.totalNodeCount}</strong>
                <span>محاور ظاهرة</span>
              </article>
              <article>
                <strong>{curriculumJourney.notStartedNodeCount}</strong>
                <span>محاور متاحة</span>
              </article>
            </div>

            <div className="curriculum-journey-hero-actions">
              <Button asChild className="h-11 rounded-full px-5">
                <Link href={nextActionHref}>
                  {curriculumJourney.nextAction?.label ?? "ابدأ الآن"}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full px-5"
              >
                <Link href={STUDENT_TRAINING_SIMULATION_ROUTE}>
                  محاكاة كاملة
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="curriculum-journey-map-shell">
          <div className="curriculum-journey-map-head">
            <div>
              <h2>المسار المرئي للمادة</h2>
              <p>
                يمكنك القفز لأي محور، لكن المسار يرشدك إلى جلستك القادمة بناءً
                على ما بدأته وما يحتاج علاجاً.
              </p>
            </div>

            <div className="curriculum-journey-legend">
              <StudyBadge tone="accent">جاهز</StudyBadge>
              <StudyBadge tone="brand">قيد البناء</StudyBadge>
              <StudyBadge tone="warning">مراجعة الآن</StudyBadge>
              <StudyBadge tone="success">ثابت</StudyBadge>
            </div>
          </div>

          <SubjectCurriculumJourneyTrail
            curriculumJourney={curriculumJourney}
            recommendedCurriculumNodeCode={recommendedCurriculumNodeCode}
          />
        </section>

        <section id="mistakes" className="hub-activity-section">
          <div className="hub-activity-head">
            <div>
              <h2>مراجعة الأخطاء المفتوحة</h2>
              <p className="curriculum-journey-support-copy">
                هذه الطبقة تصحح المسار بسرعة عندما تتكرر الأخطاء أو يحين موعد
                التثبيت.
              </p>
            </div>
            {myMistakes.length > 0 ? (
              <StudyClearVaultButton
                subjectCode={curriculumJourney.subject.code}
              />
            ) : null}
          </div>

          {myMistakes.length === 0 ? (
            <EmptyState
              title="لا توجد أخطاء مفتوحة لهذه المادة"
              description="يمكنك الآن تثبيت المحاور أو الانتقال إلى محاكاة رسمية كاملة."
              action={
                <div className="study-action-row">
                  <Button asChild className="h-11 rounded-full px-5">
                    <Link href={STUDENT_TRAINING_SIMULATION_ROUTE}>
                      ابدأ محاكاة
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-full px-5"
                  >
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
                    key={`curriculum-journey-mistake:${item.exerciseNodeId}`}
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
                        <h3>
                          {item.exercise.title ??
                            `التمرين ${item.exercise.orderIndex}`}
                        </h3>
                        <small>
                          {item.exam.subject.name} · {item.exam.year} ·{" "}
                          {item.exam.sujetLabel}
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
                      <StudyBadge tone={cadence.tone}>
                        {cadence.label}
                      </StudyBadge>
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
