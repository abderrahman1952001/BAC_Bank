'use client';

import Link from 'next/link';
import { BookOpen, PenTool } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StudentNavbar } from '@/components/student-navbar';
import { useAuthSession } from '@/components/auth-provider';
import {
  EmptyState,
  StudyBadge,
  StudyShell,
} from '@/components/study-shell';
import {
  formatSessionType,
  PracticeProgressSummary,
  RecentExamActivitiesResponse,
  RecentPracticeSessionsResponse,
} from '@/lib/qbank';

const statusLabels: Record<
  RecentPracticeSessionsResponse['data'][number]['status'],
  string
> = {
  CREATED: 'جديدة',
  IN_PROGRESS: 'نشطة',
  COMPLETED: 'مكتملة',
};

const statusTones: Record<
  RecentPracticeSessionsResponse['data'][number]['status'],
  'accent' | 'brand' | 'success'
> = {
  CREATED: 'accent',
  IN_PROGRESS: 'brand',
  COMPLETED: 'success',
};

function formatSessionTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat('ar-DZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatRelativeTimestamp(timestamp: string) {
  const value = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - value.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / oneDay);

  if (diffDays <= 0) {
    return 'اليوم';
  }

  if (diffDays === 1) {
    return 'أمس';
  }

  if (diffDays === 2) {
    return 'منذ يومين';
  }

  if (diffDays < 7) {
    return `منذ ${diffDays} أيام`;
  }

  const diffWeeks = Math.floor(diffDays / 7);

  if (diffWeeks === 1) {
    return 'منذ أسبوع';
  }

  if (diffWeeks < 5) {
    return `منذ ${diffWeeks} أسابيع`;
  }

  return formatSessionTimestamp(timestamp);
}

function getSummaryProgressPercent(summary: PracticeProgressSummary | null) {
  if (!summary?.totalQuestionCount) {
    return 0;
  }

  return Math.round(
    (summary.completedQuestionCount / summary.totalQuestionCount) * 100,
  );
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

function buildSessionActivityItem(
  session: RecentPracticeSessionsResponse['data'][number],
): HubActivityItem {
  const progressPercent = session.progressSummary
    ? getSummaryProgressPercent(session.progressSummary)
    : session.status === 'COMPLETED'
      ? 100
      : 0;
  const tone =
    session.status === 'COMPLETED'
      ? 'success'
      : session.status === 'IN_PROGRESS'
        ? 'brand'
        : 'neutral';
  const actionLabel =
    session.status === 'COMPLETED'
      ? 'فتح'
      : session.status === 'IN_PROGRESS'
        ? 'متابعة'
        : 'ابدأ';

  return {
    key: `session:${session.id}`,
    kind: 'session',
    eyebrow: 'جلسة مخصصة',
    title: session.title ?? 'جلسة تدريب مخصصة',
    subtitle: `${session.exerciseCount} تمارين`,
    href: `/student/sessions/${session.id}`,
    actionLabel,
    tone,
    progressPercent,
    progressLabel: session.progressSummary
      ? `${session.progressSummary.completedQuestionCount}/${session.progressSummary.totalQuestionCount}`
      : `${session.exerciseCount} تمارين`,
    timestamp: session.updatedAt,
    relativeTimestamp: formatRelativeTimestamp(session.updatedAt),
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
    href: `/student/browse/${encodeURIComponent(
      activity.stream.code,
    )}/${encodeURIComponent(activity.subject.code)}/${activity.year}/${encodeURIComponent(
      activity.examId,
    )}/${activity.sujetNumber}`,
    actionLabel: isCompleted ? 'مكتمل' : hasActivity ? 'متابعة' : 'فتح',
    tone: isCompleted ? 'success' : hasActivity ? 'brand' : 'neutral',
    progressPercent,
    progressLabel: activity.totalQuestionCount
      ? `${activity.completedQuestionCount}/${activity.totalQuestionCount}`
      : '0/0',
    timestamp: activity.lastOpenedAt,
    relativeTimestamp: formatRelativeTimestamp(activity.lastOpenedAt),
  };
}

export function StudentHub({
  initialRecentPracticeSessions,
  initialRecentExamActivities,
}: {
  initialRecentPracticeSessions?: RecentPracticeSessionsResponse["data"];
  initialRecentExamActivities?: RecentExamActivitiesResponse["data"];
}) {
  const router = useRouter();
  const [refreshingHub, startRefreshingHub] = useTransition();
  const { user } = useAuthSession();
  const missingHubData =
    initialRecentPracticeSessions === undefined ||
    initialRecentExamActivities === undefined;
  const sessions = useMemo(
    () => initialRecentPracticeSessions ?? [],
    [initialRecentPracticeSessions],
  );
  const examActivities = useMemo(
    () => initialRecentExamActivities ?? [],
    [initialRecentExamActivities],
  );
  const hubUnavailable = !sessions.length && !examActivities.length && missingHubData;

  const activeSession = useMemo(
    () => sessions.find((session) => session.status !== 'COMPLETED') ?? null,
    [sessions],
  );
  const latestSession = sessions[0] ?? null;
  const spotlightSession = activeSession ?? latestSession;
  const displayName = user?.username ?? 'BAC Bank';
  const spotlightTitle = spotlightSession?.title ?? 'جلسة جديدة';
  const spotlightMeta = spotlightSession
    ? `${formatRelativeTimestamp(spotlightSession.updatedAt)} · ${spotlightSession.exerciseCount} تمارين`
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
                  ? `/student/sessions/${activeSession.id}`
                  : '/student/sessions/new'
              }
              className="btn-primary"
            >
              {activeSession ? 'مواصلة' : 'ابدأ'}
            </Link>
            <Link href="/student/browse" className="btn-secondary">
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
          <Link href="/student/sessions/new" className="hub-path-card">
            <span className="hub-path-icon tone-warm" aria-hidden="true">
              <PenTool size={24} strokeWidth={2.1} />
            </span>
            <div>
              <h2>بناء جلسة مخصصة</h2>
              <p>المحاور · السنوات</p>
            </div>
          </Link>

          <Link href="/student/browse" className="hub-path-card secondary">
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
            <h2>النشاط الأخير</h2>
          </div>

          {activityItems.length === 0 ? (
            <EmptyState
              title="لا يوجد نشاط بعد"
              description="ابدأ من جلسة أو موضوع."
              action={
                <div className="study-action-row">
                  <Link href="/student/sessions/new" className="btn-primary">
                    جلسة جديدة
                  </Link>
                  <Link href="/student/browse" className="btn-secondary">
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
