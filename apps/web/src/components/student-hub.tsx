'use client';

import Link from 'next/link';
import { BookOpen, PenTool } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StudentNavbar } from '@/components/student-navbar';
import { useAuthSession } from '@/components/auth-provider';
import {
  HubMistakesSection,
  HubRecentActivitySection,
  HubRoadmapSection,
  HubSavedExercisesSection,
  HubWeakPointsSection,
} from '@/components/student-hub-sections';
import { EmptyState, StudyBadge, StudyShell } from '@/components/study-shell';
import { Button } from '@/components/ui/button';
import {
  formatStudySessionKind,
  MyMistakesResponse,
  RecentExerciseStatesResponse,
  StudyRoadmapsResponse,
  RecentExamActivitiesResponse,
  RecentStudySessionsResponse,
  WeakPointInsightsResponse,
} from '@/lib/study-api';
import {
  buildHubActivityItems,
  buildMyMistakeItems,
  buildRoadmapItems,
  buildSavedExerciseItems,
  buildWeakPointItems,
  findActiveHubSession,
  studentHubStatusLabels,
  studentHubStatusTones,
} from '@/lib/student-hub';
import {
  STUDENT_LIBRARY_ROUTE,
  STUDENT_TRAINING_ROUTE,
  buildStudentTrainingSessionRoute,
} from '@/lib/student-routes';
import { formatRelativeStudyTimestamp } from '@/lib/study-time';

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
    () => findActiveHubSession(sessions),
    [sessions],
  );
  const latestSession = sessions[0] ?? null;
  const spotlightSession = activeSession ?? latestSession;
  const displayName = user?.username ?? 'مِراس';
  const spotlightTitle =
    spotlightSession?.title ??
    (spotlightSession
      ? formatStudySessionKind(spotlightSession.kind)
      : 'ابدأ جلسة مركزة اليوم');
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
    : user?.stream?.name
      ? `${user.stream.name} · اختر مساراً مبنياً على هدفك`
      : 'اختر مساراً مبنياً على هدفك';
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
  const roadmapItems = useMemo(
    () => buildRoadmapItems(studyRoadmaps),
    [studyRoadmaps],
  );
  const hubMetrics = [
    {
      label: 'جلسات',
      value: sessions.length.toString(),
    },
    {
      label: 'محفوظات',
      value: savedExerciseItems.length.toString(),
    },
    {
      label: 'أخطاء',
      value: myMistakeItems.length.toString(),
    },
  ];

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
              {refreshingHub ? 'جارٍ التحديث...' : 'إعادة المحاولة'}
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
              {refreshingHub ? 'جارٍ التحديث...' : 'إعادة المحاولة'}
            </Button>
          </div>
        ) : null}

        <motion.section
          className="hub-intro"
          initial={{ opacity: 0, y: 18 }}
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
          className={`hub-command-deck${activeSession ? ' active-session' : ''}`}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.06, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="hub-focus-plane">
            <div className="hub-spotlight-copy">
              {spotlightSession ? (
                <div className="hub-spotlight-meta">
                  <StudyBadge tone={studentHubStatusTones[spotlightSession.status]}>
                    {studentHubStatusLabels[spotlightSession.status]}
                  </StudyBadge>
                </div>
              ) : null}
              <h2>{spotlightTitle}</h2>
              {spotlightMeta ? <p>{spotlightMeta}</p> : null}
            </div>

            <div className="hub-spotlight-actions">
              <Button asChild className="h-12 rounded-full px-5">
                <Link
                  href={
                    activeSession
                      ? buildStudentTrainingSessionRoute(activeSession.id)
                      : STUDENT_TRAINING_ROUTE
                  }
                >
                  {activeSession ? 'مواصلة' : 'ابدأ'}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full px-5">
                <Link href={STUDENT_LIBRARY_ROUTE}>المكتبة</Link>
              </Button>
            </div>
          </div>

          <aside className="hub-mastery-rail" aria-label="ملخص المساحة">
            <div className="hub-mastery-meter">
              <span>التركيز الآن</span>
              <strong>{activeSession ? 'نشط' : 'جاهز'}</strong>
              <p>{activeSession ? 'جلسة تنتظر الاستكمال' : 'اختر أول مسار لليوم'}</p>
            </div>

            <div className="hub-metric-row">
              {hubMetrics.map((metric) => (
                <span key={metric.label}>
                  <strong>{metric.value}</strong>
                  {metric.label}
                </span>
              ))}
            </div>

            <div className="hub-action-rows">
              <Link href={STUDENT_TRAINING_ROUTE}>
                <span className="hub-path-icon tone-warm" aria-hidden="true">
                  <PenTool size={18} strokeWidth={2.1} />
                </span>
                <span>
                  <strong>التدريب</strong>
                  <small>دريل ومحاكاة</small>
                </span>
              </Link>

              <Link href={STUDENT_LIBRARY_ROUTE}>
                <span className="hub-path-icon tone-cool" aria-hidden="true">
                  <BookOpen size={18} strokeWidth={2.1} />
                </span>
                <span>
                  <strong>الحوليات</strong>
                  <small>الشعبة · المادة · السنة</small>
                </span>
              </Link>
            </div>
          </aside>
        </motion.section>

        <HubRoadmapSection roadmapItems={roadmapItems} />
        <HubWeakPointsSection
          enabled={weakPointInsightEnabled}
          weakPointItems={weakPointItems}
        />
        <HubMistakesSection myMistakeItems={myMistakeItems} />
        <HubSavedExercisesSection savedExerciseItems={savedExerciseItems} />
        <HubRecentActivitySection activityItems={activityItems} />
      </div>
    </StudyShell>
  );
}
