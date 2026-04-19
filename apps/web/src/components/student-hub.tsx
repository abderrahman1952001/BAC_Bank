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
                <StudyBadge tone={studentHubStatusTones[spotlightSession.status]}>
                  {studentHubStatusLabels[spotlightSession.status]}
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
