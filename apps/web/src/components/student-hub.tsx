"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpLeft,
  BookOpen,
  Brain,
  Flame,
  FlaskConical,
  Layers3,
  Map,
  PenTool,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import { type CSSProperties, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StudentNavbar } from "@/components/student-navbar";
import { useAuthSession } from "@/components/auth-provider";
import {
  HubMistakesSection,
  HubRecentActivitySection,
  HubCurriculumJourneySection,
  HubSavedExercisesSection,
  HubWeakPointsSection,
} from "@/components/student-hub-sections";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import {
  formatStudySessionKind,
  MyMistakesResponse,
  RecentExerciseStatesResponse,
  CurriculumJourneysResponse,
  RecentExamActivitiesResponse,
  RecentStudySessionsResponse,
  WeakPointInsightsResponse,
} from "@/lib/study-api";
import type { DueFlashcardsResponse } from "@/lib/flashcards-api";
import type { LabToolsResponse } from "@/lib/lab-api";
import {
  describeFlashcardSource,
  getFlashcardContextLabel,
} from "@/lib/flashcards-surface";
import {
  buildHubActivityItems,
  buildCurriculumJourneyItems,
  buildMyMistakeItems,
  buildSavedExerciseItems,
  buildWeakPointItems,
  findActiveHubSession,
  studentHubStatusLabels,
  studentHubStatusTones,
} from "@/lib/student-hub";
import {
  STUDENT_LIBRARY_ROUTE,
  STUDENT_FLASHCARDS_ROUTE,
  STUDENT_LAB_ROUTE,
  STUDENT_TRAINING_ROUTE,
  buildStudentTrainingSessionRoute,
} from "@/lib/student-routes";
import { formatRelativeStudyTimestamp } from "@/lib/study-time";

export function StudentHub({
  initialRecentStudySessions,
  initialRecentExamActivities,
  initialRecentExerciseStates,
  initialMyMistakes,
  initialCurriculumJourneys,
  initialWeakPointInsights,
  initialDueFlashcards,
  initialLabTools,
}: {
  initialRecentStudySessions?: RecentStudySessionsResponse["data"];
  initialRecentExamActivities?: RecentExamActivitiesResponse["data"];
  initialRecentExerciseStates?: RecentExerciseStatesResponse["data"];
  initialMyMistakes?: MyMistakesResponse["data"];
  initialCurriculumJourneys?: CurriculumJourneysResponse["data"];
  initialWeakPointInsights?: WeakPointInsightsResponse;
  initialDueFlashcards?: DueFlashcardsResponse["data"];
  initialLabTools?: LabToolsResponse["data"];
}) {
  const router = useRouter();
  const [refreshingHub, startRefreshingHub] = useTransition();
  const { user } = useAuthSession();
  const weakPointInsightEnabled =
    user?.studyEntitlements.capabilities.weakPointInsight ??
    initialWeakPointInsights?.enabled ??
    false;
  const missingHubData =
    initialRecentStudySessions === undefined ||
    initialRecentExamActivities === undefined ||
    initialRecentExerciseStates === undefined ||
    initialMyMistakes === undefined ||
    initialCurriculumJourneys === undefined ||
    (weakPointInsightEnabled && initialWeakPointInsights === undefined);
  const sessions = useMemo<RecentStudySessionsResponse["data"]>(
    () => initialRecentStudySessions ?? [],
    [initialRecentStudySessions],
  );
  const examActivities = useMemo<RecentExamActivitiesResponse["data"]>(
    () => initialRecentExamActivities ?? [],
    [initialRecentExamActivities],
  );
  const recentExerciseStates = useMemo<RecentExerciseStatesResponse["data"]>(
    () => initialRecentExerciseStates ?? [],
    [initialRecentExerciseStates],
  );
  const myMistakes = useMemo<MyMistakesResponse["data"]>(
    () => initialMyMistakes ?? [],
    [initialMyMistakes],
  );
  const curriculumJourneys = useMemo<CurriculumJourneysResponse["data"]>(
    () => initialCurriculumJourneys ?? [],
    [initialCurriculumJourneys],
  );
  const weakPointInsights = useMemo<WeakPointInsightsResponse["data"]>(
    () => initialWeakPointInsights?.data ?? [],
    [initialWeakPointInsights],
  );
  const dueFlashcards = useMemo<DueFlashcardsResponse["data"]>(
    () => initialDueFlashcards ?? [],
    [initialDueFlashcards],
  );
  const labTools = useMemo<LabToolsResponse["data"]>(
    () => initialLabTools ?? [],
    [initialLabTools],
  );
  const hubUnavailable =
    !sessions.length &&
    !examActivities.length &&
    !recentExerciseStates.length &&
    !curriculumJourneys.length &&
    !weakPointInsights.length &&
    !labTools.length &&
    !myMistakes.length &&
    missingHubData;

  const activeSession = useMemo(
    () => findActiveHubSession(sessions),
    [sessions],
  );
  const latestSession = sessions[0] ?? null;
  const spotlightSession = activeSession ?? latestSession;
  const displayName = user?.username ?? "مِراس";
  const spotlightTitle =
    spotlightSession?.title ??
    (spotlightSession
      ? formatStudySessionKind(spotlightSession.kind)
      : "ابدأ جلسة مركزة اليوم");
  const spotlightMeta = spotlightSession
    ? [
        formatRelativeStudyTimestamp(
          spotlightSession.lastInteractedAt ?? spotlightSession.updatedAt,
        ),
        spotlightSession.family === "SIMULATION" &&
        spotlightSession.durationMinutes
          ? `${spotlightSession.durationMinutes} دقيقة`
          : `${spotlightSession.exerciseCount} تمارين`,
      ].join(" · ")
    : user?.stream?.name
      ? `${user.stream.name} · اختر مساراً مبنياً على هدفك`
      : "اختر مساراً مبنياً على هدفك";
  const activityItems = useMemo(
    () =>
      buildHubActivityItems({
        sessions,
        examActivities,
      }),
    [examActivities, sessions],
  );
  const savedExerciseItems = useMemo(
    () => buildSavedExerciseItems(recentExerciseStates),
    [recentExerciseStates],
  );
  const myMistakeItems = useMemo(
    () => buildMyMistakeItems(myMistakes),
    [myMistakes],
  );
  const weakPointItems = useMemo(
    () => buildWeakPointItems(weakPointInsights),
    [weakPointInsights],
  );
  const curriculumJourneyItems = useMemo(
    () => buildCurriculumJourneyItems(curriculumJourneys),
    [curriculumJourneys],
  );
  const labMissionCount = labTools.reduce(
    (sum, tool) => sum + tool.missionCount,
    0,
  );
  const completedLabMissionCount = labTools.reduce(
    (sum, tool) => sum + tool.completedMissionCount,
    0,
  );
  const hubMetrics = [
    {
      label: "جلسات",
      value: sessions.length.toString(),
    },
    {
      label: "محفوظات",
      value: savedExerciseItems.length.toString(),
    },
    {
      label: "أخطاء",
      value: myMistakeItems.length.toString(),
    },
    {
      label: "بطاقات",
      value: dueFlashcards.length.toString(),
    },
    {
      label: "مختبر",
      value: labMissionCount
        ? `${completedLabMissionCount}/${labMissionCount}`
        : "0",
    },
  ];
  const primaryWeakPoint = weakPointItems[0] ?? null;
  const primaryCurriculumJourney = curriculumJourneyItems[0] ?? null;
  const primaryMistake = myMistakeItems[0] ?? null;
  const primarySavedExercise = savedExerciseItems[0] ?? null;
  const primaryDueFlashcard = dueFlashcards[0] ?? null;
  const primaryLabTool =
    labTools.find((tool) => tool.inProgressMissionCount > 0) ??
    labTools.find((tool) => tool.completedMissionCount < tool.missionCount) ??
    null;
  const reviewCount =
    dueFlashcards.length + myMistakeItems.length + savedExerciseItems.length;
  const spotlightHref = activeSession
    ? buildStudentTrainingSessionRoute(activeSession.id)
    : STUDENT_TRAINING_ROUTE;
  const spotlightActionLabel = activeSession ? "مواصلة الآن" : "ابدأ جلسة";
  const spotlightProgressPercent = spotlightSession?.progressSummary
    ?.totalQuestionCount
    ? Math.round(
        (spotlightSession.progressSummary.completedQuestionCount /
          spotlightSession.progressSummary.totalQuestionCount) *
          100,
      )
    : spotlightSession?.status === "COMPLETED"
      ? 100
      : 0;
  const insightHref = primaryWeakPoint?.href ?? STUDENT_TRAINING_ROUTE;
  const insightTitle =
    primaryWeakPoint?.title ??
    (weakPointInsightEnabled ? "اجمع إشارات الضعف" : "دريل مركز جاهز");
  const insightCopy =
    primaryWeakPoint?.subtitle ??
    (weakPointInsightEnabled
      ? "أكمل بعض الأسئلة حتى تظهر لك توصية علاجية دقيقة."
      : "ابدأ تدريباً قصيراً لتحديد أول نقطة تحتاج تثبيتاً.");
  const curriculumJourneyHref =
    primaryCurriculumJourney?.detailsHref ?? STUDENT_TRAINING_ROUTE;
  const curriculumJourneyProgress =
    primaryCurriculumJourney?.progressPercent ?? 0;
  const reviewHref = primaryDueFlashcard
    ? STUDENT_FLASHCARDS_ROUTE
    : (primaryMistake?.href ??
      primarySavedExercise?.href ??
      STUDENT_LIBRARY_ROUTE);
  const reviewTitle = primaryDueFlashcard
    ? `${dueFlashcards.length} بطاقة مستحقة`
    : (primaryMistake?.title ??
      primarySavedExercise?.title ??
      "لا توجد مراجعة مستحقة");
  const reviewCopy = primaryDueFlashcard
    ? `${describeFlashcardSource(
        primaryDueFlashcard.card.sourceType,
      )} · ${getFlashcardContextLabel(primaryDueFlashcard.card)}`
    : (primaryMistake?.subtitle ??
      primarySavedExercise?.subtitle ??
      "عندما تحفظ تمريناً أو تفوّت سؤالاً سيظهر هنا مباشرة.");

  if (hubUnavailable) {
    return (
      <StudyShell>
        <StudentNavbar />
        <EmptyState
          title="تعذر تحميل مساحة الطالب"
          description="أعد المحاولة."
          action={
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-5"
              onClick={() => {
                startRefreshingHub(() => {
                  router.refresh();
                });
              }}
              disabled={refreshingHub}
            >
              {refreshingHub ? "جارٍ التحديث..." : "إعادة المحاولة"}
            </Button>
          }
        />
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      <StudentNavbar />

      <div className="hub-page">
        {missingHubData ? (
          <div className="hub-sync-notice">
            <p>بعض البيانات لم تتحدث الآن. يمكنك المتابعة أو إعادة المحاولة.</p>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-5"
              onClick={() => {
                startRefreshingHub(() => {
                  router.refresh();
                });
              }}
              disabled={refreshingHub}
            >
              {refreshingHub ? "جارٍ التحديث..." : "إعادة المحاولة"}
            </Button>
          </div>
        ) : null}

        <motion.section
          className="hub-intro"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div>
            <p className="page-kicker">Study Command</p>
            <h1>مرحباً بك، {displayName}</h1>
          </div>
          <p>سطح واحد لما يجب أن تدرسه الآن، وما يجب أن تعود إليه لاحقاً.</p>
        </motion.section>

        <motion.section
          className="hub-command-bento"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.06, ease: [0.2, 0.8, 0.2, 1] }}
          aria-label="مركز الدراسة"
        >
          <Link
            href={spotlightHref}
            className={`hub-bento-card hub-bento-continue${
              activeSession ? " is-active" : ""
            }`}
          >
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-primary" aria-hidden="true">
                <Target size={19} strokeWidth={2.1} />
              </span>
              {spotlightSession ? (
                <StudyBadge
                  tone={studentHubStatusTones[spotlightSession.status]}
                >
                  {studentHubStatusLabels[spotlightSession.status]}
                </StudyBadge>
              ) : (
                <StudyBadge tone="accent">جاهز</StudyBadge>
              )}
            </div>
            <div className="hub-bento-copy">
              <span>Continue</span>
              <h2>{spotlightTitle}</h2>
              {spotlightMeta ? <p>{spotlightMeta}</p> : null}
            </div>
            <div className="hub-bento-progress">
              <div aria-hidden="true">
                <span style={{ width: `${spotlightProgressPercent}%` }} />
              </div>
              <strong>{spotlightActionLabel}</strong>
              <ArrowUpLeft size={17} strokeWidth={2.1} aria-hidden="true" />
            </div>
          </Link>

          <Link href={insightHref} className="hub-bento-card hub-bento-insight">
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-cool" aria-hidden="true">
                <Brain size={19} strokeWidth={2.1} />
              </span>
              <span className="hub-bento-label">Insight</span>
            </div>
            <div className="hub-bento-copy">
              <h3>{insightTitle}</h3>
              <p>{insightCopy}</p>
            </div>
            <span className="hub-bento-action">ابدأ الإصلاح</span>
          </Link>

          <div className="hub-bento-card hub-bento-momentum">
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-warm" aria-hidden="true">
                <Flame size={19} strokeWidth={2.1} />
              </span>
              <span className="hub-bento-label">Momentum</span>
            </div>
            <strong>{sessions.length}</strong>
            <p>
              {activeSession ? "جلسة مفتوحة الآن" : "جلسات حديثة في المساحة"}
            </p>
            <div className="hub-bento-mini-metrics">
              {hubMetrics.map((metric) => (
                <span key={metric.label}>
                  <b>{metric.value}</b>
                  {metric.label}
                </span>
              ))}
            </div>
          </div>

          <Link
            href={curriculumJourneyHref}
            className="hub-bento-card hub-bento-journey"
          >
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-neutral" aria-hidden="true">
                <Map size={19} strokeWidth={2.1} />
              </span>
              <span className="hub-bento-label">Journey</span>
            </div>
            <div className="hub-bento-copy">
              <h3>{primaryCurriculumJourney?.title ?? "مسار المنهج"}</h3>
              <p>
                {primaryCurriculumJourney?.progressLabel ??
                  "اختر مساراً لتظهر خطواتك."}
              </p>
            </div>
            <div
              className="hub-bento-ring"
              style={
                {
                  "--hub-ring": `${curriculumJourneyProgress}%`,
                } as CSSProperties
              }
            >
              <strong>{curriculumJourneyProgress}%</strong>
            </div>
          </Link>

          <Link href={reviewHref} className="hub-bento-card hub-bento-review">
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-danger" aria-hidden="true">
                {primaryDueFlashcard ? (
                  <Layers3 size={19} strokeWidth={2.1} />
                ) : (
                  <AlertTriangle size={19} strokeWidth={2.1} />
                )}
              </span>
              <span className="hub-bento-label">{reviewCount} مراجعة</span>
            </div>
            <div className="hub-bento-copy">
              <h3>{reviewTitle}</h3>
              <p>{reviewCopy}</p>
            </div>
          </Link>

          <div className="hub-bento-card hub-bento-actions">
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-primary" aria-hidden="true">
                <Activity size={19} strokeWidth={2.1} />
              </span>
              <span className="hub-bento-label">Quick Start</span>
            </div>
            <div className="hub-bento-action-grid">
              <Link href={STUDENT_TRAINING_ROUTE}>
                <PenTool size={18} strokeWidth={2.1} aria-hidden="true" />
                <span>تدريب</span>
              </Link>
              <Link href={STUDENT_LIBRARY_ROUTE}>
                <BookOpen size={18} strokeWidth={2.1} aria-hidden="true" />
                <span>مكتبة</span>
              </Link>
              <Link href={STUDENT_LAB_ROUTE}>
                <FlaskConical size={18} strokeWidth={2.1} aria-hidden="true" />
                <span>
                  {primaryLabTool?.inProgressMissionCount
                    ? "مهمة مختبر"
                    : "مختبر"}
                </span>
              </Link>
            </div>
          </div>
        </motion.section>

        <div className="hub-workstream-grid">
          <HubCurriculumJourneySection
            curriculumJourneyItems={curriculumJourneyItems}
          />
          <HubWeakPointsSection
            enabled={weakPointInsightEnabled}
            weakPointItems={weakPointItems}
          />
          <HubMistakesSection myMistakeItems={myMistakeItems} />
          <HubSavedExercisesSection savedExerciseItems={savedExerciseItems} />
          <HubRecentActivitySection activityItems={activityItems} />
        </div>
      </div>
    </StudyShell>
  );
}
