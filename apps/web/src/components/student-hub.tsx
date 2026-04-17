'use client';

import Link from 'next/link';
import { BookOpen, PenTool } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StudentNavbar } from '@/components/student-navbar';
import { useAuthSession } from '@/components/auth-provider';
import { StudyClearVaultButton } from '@/components/study-clear-vault-button';
import { StudyReviewQueueActions } from '@/components/study-review-queue-actions';
import {
  EmptyState,
  StudyBadge,
  StudyShell,
} from '@/components/study-shell';
import {
  formatStudySessionKind,
  formatSessionType,
  formatStudyReviewReason,
  MyMistakesResponse,
  RecentExerciseStatesResponse,
  StudySessionProgressSummary,
  StudyRoadmapsResponse,
  RecentExamActivitiesResponse,
  RecentStudySessionsResponse,
  WeakPointInsightsResponse,
} from '@/lib/study-api';
import {
  STUDENT_LIBRARY_ROUTE,
  STUDENT_TRAINING_ROUTE,
  STUDENT_TRAINING_SIMULATION_ROUTE,
  buildStudentLibraryExamRoute,
  buildStudentLibraryExamRouteWithSearch,
  buildStudentMySpaceRoadmapRoute,
  buildStudentTrainingDrillRoute,
  buildStudentTrainingSessionRoute,
  buildStudentTrainingWeakPointsRoute,
} from '@/lib/student-routes';
import { describeStudentExerciseState as describeSavedExerciseState } from '@/lib/study-exercise-state';
import { formatRelativeStudyTimestamp } from '@/lib/study-time';

const statusLabels: Record<
  RecentStudySessionsResponse['data'][number]['status'],
  string
> = {
  CREATED: 'جديدة',
  IN_PROGRESS: 'نشطة',
  COMPLETED: 'مكتملة',
  EXPIRED: 'منتهية',
};

const statusTones: Record<
  RecentStudySessionsResponse['data'][number]['status'],
  'accent' | 'brand' | 'success' | 'warning'
> = {
  CREATED: 'accent',
  IN_PROGRESS: 'brand',
  COMPLETED: 'success',
  EXPIRED: 'warning',
};

function getSummaryProgressPercent(summary: StudySessionProgressSummary | null) {
  if (!summary?.totalQuestionCount) {
    return 0;
  }

  return Math.round(
    (summary.completedQuestionCount / summary.totalQuestionCount) * 100,
  );
}

function describeMistakeReviewCadence(
  item: MyMistakesResponse['data'][number],
): { label: string; tone: 'brand' | 'warning' | 'success' | 'neutral' } {
  const streakLabel =
    item.successStreak > 0 ? `ثبات ${item.successStreak}/3` : 'أول تثبيت';

  if (item.isDue) {
    return {
      label: `${streakLabel} · مستحق الآن`,
      tone: item.successStreak >= 2 ? 'brand' : 'warning',
    };
  }

  if (item.dueAt) {
    return {
      label: `${streakLabel} · ${formatRelativeStudyTimestamp(item.dueAt)}`,
      tone: 'neutral',
    };
  }

  return {
    label: streakLabel,
    tone: 'success',
  };
}

type HubActivityItem = {
  key: string;
  kind: 'session' | 'exam';
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  actionLabel: string;
  tone: 'neutral' | 'brand' | 'success';
  progressPercent: number;
  progressLabel: string;
  timestamp: string;
  relativeTimestamp: string;
};

type RoadmapActivityItem = {
  key: string;
  actionHref: string;
  detailsHref: string;
  title: string;
  subtitle: string;
  updatedAt: string | null;
  relativeTimestamp: string;
  actionLabel: string;
  progressPercent: number;
  progressLabel: string;
  summaryLabel: string;
  tone: 'warning' | 'brand' | 'success';
};

function buildSessionActivityItem(
  session: RecentStudySessionsResponse['data'][number],
): HubActivityItem {
  const progressPercent = session.progressSummary
    ? getSummaryProgressPercent(session.progressSummary)
    : session.status === 'COMPLETED'
      ? 100
      : 0;
  const tone =
    session.status === 'COMPLETED'
      ? 'success'
      : session.status === 'EXPIRED'
        ? 'neutral'
      : session.status === 'IN_PROGRESS'
        ? 'brand'
        : 'neutral';
  const actionLabel =
    session.status === 'COMPLETED'
      ? 'فتح'
      : session.status === 'EXPIRED'
        ? 'مراجعة'
      : session.status === 'IN_PROGRESS'
        ? 'متابعة'
        : 'ابدأ';
  const sessionLabel = formatStudySessionKind(session.kind);
  const subtitleParts = [`${session.exerciseCount} تمارين`];

  if (session.family === 'SIMULATION' && session.durationMinutes) {
    subtitleParts.push(`${session.durationMinutes} دقيقة`);
  }

  return {
    key: `session:${session.id}`,
    kind: 'session',
    eyebrow: sessionLabel,
    title: session.title ?? sessionLabel,
    subtitle: subtitleParts.join(' · '),
    href: buildStudentTrainingSessionRoute(session.id),
    actionLabel,
    tone,
    progressPercent,
    progressLabel: session.progressSummary
      ? `${session.progressSummary.completedQuestionCount}/${session.progressSummary.totalQuestionCount}`
      : `${session.exerciseCount} تمارين`,
    timestamp: session.lastInteractedAt ?? session.updatedAt,
    relativeTimestamp: formatRelativeStudyTimestamp(
      session.lastInteractedAt ?? session.updatedAt,
    ),
  };
}

function buildExamActivityItem(
  activity: RecentExamActivitiesResponse['data'][number],
): HubActivityItem {
  const progressPercent = activity.totalQuestionCount
    ? Math.round(
        (activity.completedQuestionCount / activity.totalQuestionCount) * 100,
      )
    : 0;
  const hasActivity =
    activity.completedQuestionCount > 0 ||
    activity.openedQuestionCount > 0 ||
    activity.solutionViewedCount > 0;
  const isCompleted =
    activity.totalQuestionCount > 0 &&
    activity.completedQuestionCount >= activity.totalQuestionCount;

  return {
    key: `exam:${activity.examId}:${activity.sujetNumber}`,
    kind: 'exam',
    eyebrow: 'موضوع رسمي',
    title: `بكالوريا ${activity.year} · ${activity.subject.name} (${activity.sujetLabel})`,
    subtitle: `${activity.stream.name} · ${formatSessionType(activity.sessionType)}`,
    href: buildStudentLibraryExamRoute({
      streamCode: activity.stream.code,
      subjectCode: activity.subject.code,
      year: activity.year,
      examId: activity.examId,
      sujetNumber: activity.sujetNumber,
    }),
    actionLabel: isCompleted ? 'مكتمل' : hasActivity ? 'متابعة' : 'فتح',
    tone: isCompleted ? 'success' : hasActivity ? 'brand' : 'neutral',
    progressPercent,
    progressLabel: activity.totalQuestionCount
      ? `${activity.completedQuestionCount}/${activity.totalQuestionCount}`
      : '0/0',
    timestamp: activity.lastOpenedAt,
    relativeTimestamp: formatRelativeStudyTimestamp(activity.lastOpenedAt),
  };
}

export function StudentHub({
  initialRecentStudySessions,
  initialRecentExamActivities,
  initialRecentExerciseStates,
  initialMyMistakes,
  initialStudyRoadmaps,
  initialWeakPointInsights,
}: {
  initialRecentStudySessions?: RecentStudySessionsResponse["data"];
  initialRecentExamActivities?: RecentExamActivitiesResponse["data"];
  initialRecentExerciseStates?: RecentExerciseStatesResponse["data"];
  initialMyMistakes?: MyMistakesResponse["data"];
  initialStudyRoadmaps?: StudyRoadmapsResponse["data"];
  initialWeakPointInsights?: WeakPointInsightsResponse;
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
    initialStudyRoadmaps === undefined ||
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
  const studyRoadmaps = useMemo<StudyRoadmapsResponse["data"]>(
    () => initialStudyRoadmaps ?? [],
    [initialStudyRoadmaps],
  );
  const weakPointInsights = useMemo<WeakPointInsightsResponse["data"]>(
    () => initialWeakPointInsights?.data ?? [],
    [initialWeakPointInsights],
  );
  const hubUnavailable =
    !sessions.length &&
    !examActivities.length &&
    !recentExerciseStates.length &&
    !studyRoadmaps.length &&
    !weakPointInsights.length &&
    !myMistakes.length &&
    missingHubData;

  const activeSession = useMemo(
    () =>
      sessions.find(
        (session) =>
          session.family === 'DRILL' &&
          session.status !== 'COMPLETED' &&
          session.status !== 'EXPIRED',
      ) ??
      sessions.find(
        (session) =>
          session.status !== 'COMPLETED' && session.status !== 'EXPIRED',
      ) ??
      null,
    [sessions],
  );
  const latestSession = sessions[0] ?? null;
  const spotlightSession = activeSession ?? latestSession;
  const displayName = user?.username ?? 'BAC Bank';
  const spotlightTitle =
    spotlightSession?.title ??
    (spotlightSession ? formatStudySessionKind(spotlightSession.kind) : 'جلسة جديدة');
  const spotlightMeta = spotlightSession
    ? [
        formatRelativeStudyTimestamp(
          spotlightSession.lastInteractedAt ?? spotlightSession.updatedAt,
        ),
        spotlightSession.family === 'SIMULATION' &&
        spotlightSession.durationMinutes
          ? `${spotlightSession.durationMinutes} دقيقة`
          : `${spotlightSession.exerciseCount} تمارين`,
      ].join(' · ')
    : user?.stream?.name ?? null;
  const activityItems = useMemo(
    () =>
      [
        ...sessions.map(buildSessionActivityItem),
        ...examActivities.map(buildExamActivityItem),
      ]
        .sort(
          (left, right) =>
            new Date(right.timestamp).getTime() -
            new Date(left.timestamp).getTime(),
        )
        .slice(0, 6),
    [examActivities, sessions],
  );
  const savedExerciseItems = useMemo(
    () =>
      recentExerciseStates.map((exerciseState) => {
        const statePresentation = describeSavedExerciseState(exerciseState);
        const exerciseTitle =
          exerciseState.exercise.title ??
          `التمرين ${exerciseState.exercise.orderIndex}`;

        return {
          key: `saved:${exerciseState.exerciseNodeId}`,
          href: buildStudentLibraryExamRouteWithSearch({
            streamCode: exerciseState.exam.stream.code,
            subjectCode: exerciseState.exam.subject.code,
            year: exerciseState.exam.year,
            examId: exerciseState.exam.id,
            sujetNumber: exerciseState.exam.sujetNumber,
            exercise: exerciseState.exerciseNodeId,
          }),
          title: exerciseTitle,
          subtitle: `${exerciseState.exam.subject.name} · ${exerciseState.exam.year} · ${exerciseState.exam.sujetLabel}`,
          timestamp: exerciseState.updatedAt,
          relativeTimestamp: formatRelativeStudyTimestamp(exerciseState.updatedAt),
          stateLabel: statePresentation.label,
          tone: statePresentation.tone,
          flagged: Boolean(exerciseState.flaggedAt),
        };
      }),
    [recentExerciseStates],
  );
  const myMistakeItems = useMemo(
    () =>
      myMistakes.map((item) => {
        const cadence = describeMistakeReviewCadence(item);

        return {
          key: `mistake:${item.exerciseNodeId}`,
          href: buildStudentLibraryExamRouteWithSearch({
            streamCode: item.exam.stream.code,
            subjectCode: item.exam.subject.code,
            year: item.exam.year,
            examId: item.exam.id,
            sujetNumber: item.exam.sujetNumber,
            exercise: item.exerciseNodeId,
            question: item.focusQuestionId,
          }),
          title:
            item.exercise.title ?? `التمرين ${item.exercise.orderIndex}`,
          subtitle: `${item.exam.subject.name} · ${item.exam.year} · ${item.exam.sujetLabel}`,
          relativeTimestamp: formatRelativeStudyTimestamp(item.updatedAt),
          reasonsLabel: item.reasons
            .slice(0, 3)
            .map((reason) => formatStudyReviewReason(reason))
            .join(' · '),
          questionSignalCount: item.questionSignalCount,
          flagged: item.flagged,
          exerciseNodeId: item.exerciseNodeId,
          questionNodeId: item.focusQuestionId,
          cadenceLabel: cadence.label,
          cadenceTone: cadence.tone,
        };
      }),
    [myMistakes],
  );
  const weakPointItems = useMemo(
    () =>
      weakPointInsights.map((subject) => ({
        key: `weak-point:${subject.subject.code}`,
        href: buildStudentTrainingWeakPointsRoute(subject.subject.code),
        title: subject.subject.name,
        subtitle: subject.topSkills
          .slice(0, 3)
          .map((skill) => skill.name)
          .join(' · '),
        topicsLabel: subject.topTopics
          .slice(0, 3)
          .map((topic) => topic.name)
          .join(' · '),
        weakSignalCount: subject.weakSignalCount,
        flaggedExerciseCount: subject.flaggedExerciseCount,
        relativeTimestamp: subject.lastSeenAt
          ? formatRelativeStudyTimestamp(subject.lastSeenAt)
          : 'حديثاً',
      })),
    [weakPointInsights],
  );
  const roadmapItems = useMemo<RoadmapActivityItem[]>(
    () =>
      studyRoadmaps.map((roadmap: StudyRoadmapsResponse["data"][number]) => {
        const needsReview = roadmap.needsReviewNodeCount;
        const detailsHref = buildStudentMySpaceRoadmapRoute(roadmap.subject.code);
        const nextActionHref =
          roadmap.nextAction?.type === 'TOPIC_DRILL'
            ? buildStudentTrainingDrillRoute({
                subjectCode: roadmap.subject.code,
                topicCodes: roadmap.nextAction.topicCode
                  ? [roadmap.nextAction.topicCode]
                  : [],
              })
            : roadmap.nextAction?.type === 'REVIEW_MISTAKES'
              ? buildStudentMySpaceRoadmapRoute(roadmap.subject.code, 'mistakes')
            : roadmap.nextAction?.type === 'PAPER_SIMULATION'
              ? STUDENT_TRAINING_SIMULATION_ROUTE
              : detailsHref;
        const tone =
          needsReview > 0 || roadmap.openReviewItemCount > 0
            ? 'warning'
            : roadmap.notStartedNodeCount > 0
              ? 'brand'
              : 'success';

        return {
          key: `roadmap:${roadmap.id}`,
          actionHref: nextActionHref,
          detailsHref,
          title: roadmap.subject.name,
          subtitle: roadmap.nodes
            .slice(0, 3)
            .map((node: StudyRoadmapsResponse["data"][number]["nodes"][number]) => node.title)
            .join(' · '),
          updatedAt: roadmap.updatedAt,
          relativeTimestamp: roadmap.updatedAt
            ? formatRelativeStudyTimestamp(roadmap.updatedAt)
            : 'جديد',
          actionLabel: roadmap.nextAction?.label ?? 'ابدأ المسار',
          progressPercent: roadmap.progressPercent,
          progressLabel: `${roadmap.solidNodeCount}/${roadmap.totalNodeCount} ثابت`,
          summaryLabel:
            needsReview > 0
              ? `${needsReview} محاور تحتاج مراجعة`
              : roadmap.openReviewItemCount > 0
                ? `${roadmap.openReviewItemCount} عناصر مراجعة مفتوحة`
              : roadmap.notStartedNodeCount > 0
                ? `${roadmap.notStartedNodeCount} محاور متبقية`
                : 'جاهز للمحاكاة',
          tone: tone as 'warning' | 'brand' | 'success',
        };
      }),
    [studyRoadmaps],
  );

  if (hubUnavailable) {
    return (
      <StudyShell>
        <StudentNavbar />
        <EmptyState
          title="تعذر تحميل مساحة الطالب"
          description="أعد المحاولة."
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                startRefreshingHub(() => {
                  router.refresh();
                });
              }}
              disabled={refreshingHub}
            >
              {refreshingHub ? 'جارٍ التحديث...' : 'إعادة المحاولة'}
            </button>
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
          <div className="study-action-row">
            <p className="error-text">تعذر تحديث بعض بيانات الصفحة.</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                startRefreshingHub(() => {
                  router.refresh();
                });
              }}
              disabled={refreshingHub}
            >
              {refreshingHub ? 'جارٍ التحديث...' : 'إعادة المحاولة'}
            </button>
          </div>
        ) : null}

        <motion.section
          className="hub-intro"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="page-kicker">BAC Bank</p>
          <h1>مرحباً بك، {displayName}</h1>
        </motion.section>

        <motion.section
          className={`hub-spotlight${activeSession ? ' active-session' : ''}`}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.06, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="hub-spotlight-copy">
            {spotlightSession ? (
              <div className="hub-spotlight-meta">
                <StudyBadge tone={statusTones[spotlightSession.status]}>
                  {statusLabels[spotlightSession.status]}
                </StudyBadge>
              </div>
            ) : null}
            <h2>{spotlightTitle}</h2>
            {spotlightMeta ? <p>{spotlightMeta}</p> : null}
          </div>

          <div className="hub-spotlight-actions">
            <Link
                href={
                  activeSession
                    ? buildStudentTrainingSessionRoute(activeSession.id)
                    : STUDENT_TRAINING_ROUTE
                }
              className="btn-primary"
            >
              {activeSession ? 'مواصلة' : 'ابدأ'}
            </Link>
            <Link href={STUDENT_LIBRARY_ROUTE} className="btn-secondary">
              المكتبة
            </Link>
          </div>
        </motion.section>

        <motion.div
          className="hub-path-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Link href={STUDENT_TRAINING_ROUTE} className="hub-path-card">
            <span className="hub-path-icon tone-warm" aria-hidden="true">
              <PenTool size={24} strokeWidth={2.1} />
            </span>
            <div>
              <h2>التدريب</h2>
              <p>دريل مرن ومحاكاة امتحان كاملة</p>
            </div>
          </Link>

          <Link href={STUDENT_LIBRARY_ROUTE} className="hub-path-card secondary">
            <span className="hub-path-icon tone-cool" aria-hidden="true">
              <BookOpen size={24} strokeWidth={2.1} />
            </span>
            <div>
              <h2>تصفح الحوليات</h2>
              <p>الشعبة · المادة · السنة</p>
            </div>
          </Link>
        </motion.div>

        <section className="hub-activity-section">
          <div className="hub-activity-head">
            <h2>خارطة التقدم</h2>
          </div>

          {roadmapItems.length === 0 ? (
            <EmptyState
              title="لم تُجهّز خارطة بعد"
              description="ستظهر لك مسارات المواد هنا عندما تتوفر خارطة المنهج لهذه المادة."
              action={
                <div className="study-action-row">
                  <Link href={STUDENT_TRAINING_ROUTE} className="btn-primary">
                    ابدأ التدريب
                  </Link>
                  <Link href={STUDENT_LIBRARY_ROUTE} className="btn-secondary">
                    المكتبة
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="hub-activity-list">
              {roadmapItems.map((item, index) => (
                <motion.article
                  key={item.key}
                  className="hub-activity-card kind-session"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    delay: 0.04 * index,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                >
                  <div className="hub-activity-top">
                    <div className="hub-activity-copy">
                      <span className="hub-activity-kicker">خارطة المنهج</span>
                      <h3>
                        <Link href={item.detailsHref}>{item.title}</Link>
                      </h3>
                      <small>{item.subtitle}</small>
                    </div>
                    <span className="hub-activity-time">
                      {item.relativeTimestamp}
                    </span>
                  </div>

                  <div className="hub-activity-foot hub-activity-progress-row">
                    <Link
                      href={item.actionHref}
                      className={`hub-activity-action tone-${item.tone}`}
                    >
                      {item.actionLabel}
                    </Link>
                    <div className="hub-activity-metric">
                      <strong>{item.progressPercent}%</strong>
                      <small>{item.progressLabel}</small>
                    </div>
                    <div className="hub-activity-progress-track" aria-hidden="true">
                      <div
                        className={`hub-activity-progress-fill tone-${item.tone}`}
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="hub-activity-foot">
                    <Link href={item.detailsHref} className="hub-activity-action tone-neutral">
                      افتح الخارطة
                    </Link>
                    <StudyBadge tone={item.tone === 'success' ? 'success' : item.tone === 'brand' ? 'brand' : 'warning'}>
                      {item.summaryLabel}
                    </StudyBadge>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>

        {weakPointInsightEnabled ? (
          <section className="hub-activity-section">
            <div className="hub-activity-head">
              <h2>نقاط الضعف</h2>
            </div>

            {weakPointItems.length === 0 ? (
              <EmptyState
                title="لا توجد إشارات ضعف كافية بعد"
                description="أكمل بعض المراجعات وحدد الأسئلة التي فاتتك أو بدت صعبة حتى نكوّن لك دريل علاجياً مباشراً."
                action={
                  <div className="study-action-row">
                    <Link href={STUDENT_TRAINING_ROUTE} className="btn-primary">
                      ابدأ جلسة تدريب
                    </Link>
                    <Link href={STUDENT_LIBRARY_ROUTE} className="btn-secondary">
                      المكتبة
                    </Link>
                  </div>
                }
              />
            ) : (
              <div className="hub-activity-list">
                {weakPointItems.map((item, index) => (
                  <motion.article
                    key={item.key}
                    className="hub-activity-card kind-weak-point"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.28,
                      delay: 0.04 * index,
                      ease: [0.2, 0.8, 0.2, 1],
                    }}
                  >
                    <div className="hub-activity-top">
                      <div className="hub-activity-copy">
                        <span className="hub-activity-kicker">{item.topicsLabel}</span>
                        <h3>{item.title}</h3>
                        <small>{item.subtitle}</small>
                      </div>
                      <span className="hub-activity-time">
                        {item.relativeTimestamp}
                      </span>
                    </div>

                    <div className="hub-activity-foot">
                      <Link href={item.href} className="hub-activity-action tone-brand">
                        أصلحها الآن
                      </Link>
                      <StudyBadge tone="warning">
                        {item.flaggedExerciseCount > 0
                          ? `${item.weakSignalCount} إشارات · ${item.flaggedExerciseCount} تمارين معلّمة`
                          : `${item.weakSignalCount} إشارات علاجية`}
                      </StudyBadge>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <section className="hub-activity-section">
          <div className="hub-activity-head">
            <h2>أخطائي الأخيرة</h2>
            {myMistakeItems.length > 0 ? <StudyClearVaultButton /> : null}
          </div>

          {myMistakeItems.length === 0 ? (
            <EmptyState
              title="لا توجد أخطاء مراجعة بعد"
              description="بعد إنهاء المراجعة، ستظهر هنا الأسئلة التي علّمتها بأنها فاتتك أو بدت صعبة."
              action={
                <div className="study-action-row">
                  <Link href={STUDENT_TRAINING_ROUTE} className="btn-primary">
                    ابدأ جلسة تدريب
                  </Link>
                  <Link href={STUDENT_LIBRARY_ROUTE} className="btn-secondary">
                    المكتبة
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="hub-activity-list">
              {myMistakeItems.map((item, index) => (
                <motion.article
                  key={item.key}
                  className={
                    item.flagged
                      ? 'hub-activity-card kind-mistake is-flagged'
                      : 'hub-activity-card kind-mistake'
                  }
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    delay: 0.04 * index,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                >
                  <div className="hub-activity-top">
                    <div className="hub-activity-copy">
                      <span className="hub-activity-kicker">{item.reasonsLabel}</span>
                      <h3>{item.title}</h3>
                      <small>{item.subtitle}</small>
                    </div>
                    <span className="hub-activity-time">
                      {item.relativeTimestamp}
                    </span>
                  </div>

                  <div className="hub-activity-foot">
                    <Link href={item.href} className="hub-activity-action tone-brand">
                      راجع الآن
                    </Link>
                    <StudyBadge tone={item.flagged ? 'brand' : 'warning'}>
                      {item.questionSignalCount > 0
                        ? `${item.questionSignalCount} أسئلة تحتاج رجوعاً`
                        : 'تمرين يحتاج رجوعاً'}
                    </StudyBadge>
                    <StudyBadge tone={item.cadenceTone}>{item.cadenceLabel}</StudyBadge>
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
                </motion.article>
              ))}
            </div>
          )}
        </section>

        <section className="hub-activity-section">
          <div className="hub-activity-head">
            <h2>المحفوظات والمراجعة</h2>
          </div>

          {savedExerciseItems.length === 0 ? (
            <EmptyState
              title="لا توجد تمارين محفوظة بعد"
              description="احفظ تمريناً من المكتبة أو علّمه للمراجعة داخل جلساتك."
              action={
                <div className="study-action-row">
                  <Link href={STUDENT_LIBRARY_ROUTE} className="btn-primary">
                    افتح المكتبة
                  </Link>
                  <Link href={STUDENT_TRAINING_ROUTE} className="btn-secondary">
                    ابدأ التدريب
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="hub-activity-list">
              {savedExerciseItems.map((item, index) => (
                <motion.article
                  key={item.key}
                  className={
                    item.flagged
                      ? 'hub-activity-card kind-saved is-flagged'
                      : 'hub-activity-card kind-saved'
                  }
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    delay: 0.04 * index,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                >
                  <div className="hub-activity-top">
                    <div className="hub-activity-copy">
                      <span className="hub-activity-kicker">{item.stateLabel}</span>
                      <h3>{item.title}</h3>
                      <small>{item.subtitle}</small>
                    </div>
                    <span className="hub-activity-time">
                      {item.relativeTimestamp}
                    </span>
                  </div>

                  <div className="hub-activity-foot">
                    <Link
                      href={item.href}
                      className={`hub-activity-action tone-${item.tone}`}
                    >
                      افتح في المكتبة
                    </Link>
                    <StudyBadge tone={item.flagged ? 'brand' : 'accent'}>
                      {item.flagged ? 'راجع هذا التمرين' : 'تمرين محفوظ'}
                    </StudyBadge>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>

        <section className="hub-activity-section">
          <div className="hub-activity-head">
            <h2>النشاط الأخير</h2>
          </div>

          {activityItems.length === 0 ? (
            <EmptyState
              title="لا يوجد نشاط بعد"
              description="ابدأ من جلسة أو موضوع."
              action={
                <div className="study-action-row">
                  <Link href={STUDENT_TRAINING_ROUTE} className="btn-primary">
                    ابدأ التدريب
                  </Link>
                  <Link href={STUDENT_LIBRARY_ROUTE} className="btn-secondary">
                    المكتبة
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="hub-activity-list">
              {activityItems.map((item, index) => (
                <motion.article
                  key={item.key}
                  className={`hub-activity-card kind-${item.kind}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.28,
                    delay: 0.04 * index,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                >
                  <div className="hub-activity-top">
                    <div className="hub-activity-copy">
                      <span className="hub-activity-kicker">{item.eyebrow}</span>
                      <h3>{item.title}</h3>
                      <small>{item.subtitle}</small>
                    </div>
                    <span className="hub-activity-time">
                      {item.relativeTimestamp}
                    </span>
                  </div>

                  <div className="hub-activity-foot hub-activity-progress-row">
                    <Link
                      href={item.href}
                      className={`hub-activity-action tone-${item.tone}`}
                    >
                      {item.actionLabel}
                    </Link>
                    <div className="hub-activity-metric">
                      <strong>{item.progressPercent}%</strong>
                      <small>{item.progressLabel}</small>
                    </div>
                    <div className="hub-activity-progress-track" aria-hidden="true">
                      <div
                        className={`hub-activity-progress-fill tone-${item.tone}`}
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudyShell>
  );
}
