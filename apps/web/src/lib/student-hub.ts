import {
  formatSessionType,
  formatStudyReviewReason,
  formatStudySessionKind,
  type MyMistakesResponse,
  type RecentExamActivitiesResponse,
  type RecentExerciseStatesResponse,
  type RecentStudySessionsResponse,
  type StudyRoadmapsResponse,
  type StudySessionProgressSummary,
  type WeakPointInsightsResponse,
} from "@/lib/study-api";
import { describeStudentExerciseState } from "@/lib/study-exercise-state";
import {
  STUDENT_TRAINING_SIMULATION_ROUTE,
  buildStudentLibraryExamRoute,
  buildStudentLibraryExamRouteWithSearch,
  buildStudentMySpaceRoadmapRoute,
  buildStudentTrainingDrillRoute,
  buildStudentTrainingSessionRoute,
  buildStudentTrainingWeakPointsRoute,
} from "@/lib/student-routes";
import { formatRelativeStudyTimestamp } from "@/lib/study-time";

type StudyBadgeTone = "neutral" | "brand" | "success" | "warning" | "accent";
type HubActionTone = "neutral" | "brand" | "success";
type HubRoadmapTone = "warning" | "brand" | "success";

type RecentStudySession = RecentStudySessionsResponse["data"][number];
type RecentExamActivity = RecentExamActivitiesResponse["data"][number];
type MyMistake = MyMistakesResponse["data"][number];

export const studentHubStatusLabels: Record<
  RecentStudySession["status"],
  string
> = {
  CREATED: "جديدة",
  IN_PROGRESS: "نشطة",
  COMPLETED: "مكتملة",
  EXPIRED: "منتهية",
};

export const studentHubStatusTones: Record<
  RecentStudySession["status"],
  Exclude<StudyBadgeTone, "neutral">
> = {
  CREATED: "accent",
  IN_PROGRESS: "brand",
  COMPLETED: "success",
  EXPIRED: "warning",
};

export type HubActivityItem = {
  key: string;
  kind: "session" | "exam";
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  actionLabel: string;
  tone: HubActionTone;
  progressPercent: number;
  progressLabel: string;
  timestamp: string;
  relativeTimestamp: string;
};

export type SavedExerciseItem = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  timestamp: string;
  relativeTimestamp: string;
  stateLabel: string;
  tone: "brand" | "neutral";
  flagged: boolean;
};

export type MistakeReviewCadence = {
  label: string;
  tone: HubActionTone | "warning";
};

export type MyMistakeItem = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  relativeTimestamp: string;
  reasonsLabel: string;
  questionSignalCount: number;
  flagged: boolean;
  exerciseNodeId: string;
  questionNodeId: string | null;
  cadenceLabel: string;
  cadenceTone: MistakeReviewCadence["tone"];
};

export type WeakPointItem = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  topicsLabel: string;
  weakSignalCount: number;
  flaggedExerciseCount: number;
  relativeTimestamp: string;
};

export type RoadmapActivityItem = {
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
  tone: HubRoadmapTone;
};

export function getSummaryProgressPercent(
  summary: StudySessionProgressSummary | null,
) {
  if (!summary?.totalQuestionCount) {
    return 0;
  }

  return Math.round(
    (summary.completedQuestionCount / summary.totalQuestionCount) * 100,
  );
}

export function describeMistakeReviewCadence(
  item: MyMistake,
): MistakeReviewCadence {
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

export function findActiveHubSession(
  sessions: RecentStudySessionsResponse["data"],
) {
  return (
    sessions.find(
      (session) =>
        session.family === "DRILL" &&
        session.status !== "COMPLETED" &&
        session.status !== "EXPIRED",
    ) ??
    sessions.find(
      (session) =>
        session.status !== "COMPLETED" && session.status !== "EXPIRED",
    ) ??
    null
  );
}

export function buildSessionActivityItem(
  session: RecentStudySession,
): HubActivityItem {
  const progressPercent = session.progressSummary
    ? getSummaryProgressPercent(session.progressSummary)
    : session.status === "COMPLETED"
      ? 100
      : 0;
  const tone =
    session.status === "COMPLETED"
      ? "success"
      : session.status === "EXPIRED"
        ? "neutral"
        : session.status === "IN_PROGRESS"
          ? "brand"
          : "neutral";
  const actionLabel =
    session.status === "COMPLETED"
      ? "فتح"
      : session.status === "EXPIRED"
        ? "مراجعة"
        : session.status === "IN_PROGRESS"
          ? "متابعة"
          : "ابدأ";
  const sessionLabel = formatStudySessionKind(session.kind);
  const subtitleParts = [`${session.exerciseCount} تمارين`];

  if (session.family === "SIMULATION" && session.durationMinutes) {
    subtitleParts.push(`${session.durationMinutes} دقيقة`);
  }

  return {
    key: `session:${session.id}`,
    kind: "session",
    eyebrow: sessionLabel,
    title: session.title ?? sessionLabel,
    subtitle: subtitleParts.join(" · "),
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

export function buildExamActivityItem(
  activity: RecentExamActivity,
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
    kind: "exam",
    eyebrow: "موضوع رسمي",
    title: `بكالوريا ${activity.year} · ${activity.subject.name} (${activity.sujetLabel})`,
    subtitle: `${activity.stream.name} · ${formatSessionType(activity.sessionType)}`,
    href: buildStudentLibraryExamRoute({
      streamCode: activity.stream.code,
      subjectCode: activity.subject.code,
      year: activity.year,
      examId: activity.examId,
      sujetNumber: activity.sujetNumber,
    }),
    actionLabel: isCompleted ? "مكتمل" : hasActivity ? "متابعة" : "فتح",
    tone: isCompleted ? "success" : hasActivity ? "brand" : "neutral",
    progressPercent,
    progressLabel: activity.totalQuestionCount
      ? `${activity.completedQuestionCount}/${activity.totalQuestionCount}`
      : "0/0",
    timestamp: activity.lastOpenedAt,
    relativeTimestamp: formatRelativeStudyTimestamp(activity.lastOpenedAt),
  };
}

export function buildHubActivityItems(input: {
  sessions: RecentStudySessionsResponse["data"];
  examActivities: RecentExamActivitiesResponse["data"];
}) {
  return [
    ...input.sessions.map(buildSessionActivityItem),
    ...input.examActivities.map(buildExamActivityItem),
  ]
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    )
    .slice(0, 6);
}

export function buildSavedExerciseItems(
  recentExerciseStates: RecentExerciseStatesResponse["data"],
): SavedExerciseItem[] {
  return recentExerciseStates.map((exerciseState) => {
    const statePresentation = describeStudentExerciseState(exerciseState);
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
  });
}

export function buildMyMistakeItems(
  myMistakes: MyMistakesResponse["data"],
): MyMistakeItem[] {
  return myMistakes.map((item) => {
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
      title: item.exercise.title ?? `التمرين ${item.exercise.orderIndex}`,
      subtitle: `${item.exam.subject.name} · ${item.exam.year} · ${item.exam.sujetLabel}`,
      relativeTimestamp: formatRelativeStudyTimestamp(item.updatedAt),
      reasonsLabel: item.reasons
        .slice(0, 3)
        .map((reason) => formatStudyReviewReason(reason))
        .join(" · "),
      questionSignalCount: item.questionSignalCount,
      flagged: item.flagged,
      exerciseNodeId: item.exerciseNodeId,
      questionNodeId: item.focusQuestionId,
      cadenceLabel: cadence.label,
      cadenceTone: cadence.tone,
    };
  });
}

export function buildWeakPointItems(
  weakPointInsights: WeakPointInsightsResponse["data"],
): WeakPointItem[] {
  return weakPointInsights.map((subject) => ({
    key: `weak-point:${subject.subject.code}`,
    href: buildStudentTrainingWeakPointsRoute(subject.subject.code),
    title: subject.subject.name,
    subtitle: subject.topSkills
      .slice(0, 3)
      .map((skill) => skill.name)
      .join(" · "),
    topicsLabel: subject.topTopics
      .slice(0, 3)
      .map((topic) => topic.name)
      .join(" · "),
    weakSignalCount: subject.weakSignalCount,
    flaggedExerciseCount: subject.flaggedExerciseCount,
    relativeTimestamp: subject.lastSeenAt
      ? formatRelativeStudyTimestamp(subject.lastSeenAt)
      : "حديثاً",
  }));
}

export function buildRoadmapItems(
  studyRoadmaps: StudyRoadmapsResponse["data"],
): RoadmapActivityItem[] {
  return studyRoadmaps.map((roadmap) => {
    const needsReview = roadmap.needsReviewNodeCount;
    const detailsHref = buildStudentMySpaceRoadmapRoute(roadmap.subject.code);
    const actionHref =
      roadmap.nextAction?.type === "TOPIC_DRILL"
        ? buildStudentTrainingDrillRoute({
            subjectCode: roadmap.subject.code,
            topicCodes: roadmap.nextAction.topicCode
              ? [roadmap.nextAction.topicCode]
              : [],
          })
        : roadmap.nextAction?.type === "REVIEW_MISTAKES"
          ? buildStudentMySpaceRoadmapRoute(roadmap.subject.code, "mistakes")
          : roadmap.nextAction?.type === "PAPER_SIMULATION"
            ? STUDENT_TRAINING_SIMULATION_ROUTE
            : detailsHref;
    const tone: HubRoadmapTone =
      needsReview > 0 || roadmap.openReviewItemCount > 0
        ? "warning"
        : roadmap.notStartedNodeCount > 0
          ? "brand"
          : "success";

    return {
      key: `roadmap:${roadmap.id}`,
      actionHref,
      detailsHref,
      title: roadmap.subject.name,
      subtitle: roadmap.nodes
        .slice(0, 3)
        .map((node) => node.title)
        .join(" · "),
      updatedAt: roadmap.updatedAt,
      relativeTimestamp: roadmap.updatedAt
        ? formatRelativeStudyTimestamp(roadmap.updatedAt)
        : "جديد",
      actionLabel: roadmap.nextAction?.label ?? "ابدأ المسار",
      progressPercent: roadmap.progressPercent,
      progressLabel: `${roadmap.solidNodeCount}/${roadmap.totalNodeCount} ثابت`,
      summaryLabel:
        needsReview > 0
          ? `${needsReview} محاور تحتاج مراجعة`
          : roadmap.openReviewItemCount > 0
            ? `${roadmap.openReviewItemCount} عناصر مراجعة مفتوحة`
            : roadmap.notStartedNodeCount > 0
              ? `${roadmap.notStartedNodeCount} محاور متبقية`
              : "جاهز للمحاكاة",
      tone,
    };
  });
}
