"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { EmptyState } from "@/components/study-shell";
import {
  SessionPlayerContextPane,
  SessionPlayerHeader,
  SessionPlayerNavigatorModal,
  SessionPlayerQuestionPane,
} from "@/components/session-player-sections";
import type { PracticeSessionResponse } from "@/lib/qbank";
import { useSessionPlayer } from "@/lib/use-session-player";

export function SessionPlayer({
  sessionId,
  initialSession,
}: {
  sessionId: string;
  initialSession?: PracticeSessionResponse;
}) {
  const sessionSeedKey = `${sessionId}:${initialSession?.id ?? "missing"}:${initialSession?.updatedAt ?? "initial"}`;

  return (
    <SessionPlayerScreen
      key={sessionSeedKey}
      sessionId={sessionId}
      initialSession={initialSession}
    />
  );
}

function SessionPlayerScreen({
  sessionId,
  initialSession,
}: {
  sessionId: string;
  initialSession?: PracticeSessionResponse;
}) {
  const router = useRouter();
  const [refreshingSession, startRefreshingSession] = useTransition();
  const {
    session,
    error,
    progress,
    completionOpen,
    showNavigator,
    activeExercise,
    activeQuestion,
    progressCounts,
    currentQuestionPosition,
    progressPercent,
    sessionMeta,
    activeExerciseTopics,
    navigatorExercises,
    questionMotionClass,
    questionStatePresentation,
    activeQuestionState,
    solutionVisible,
    questionMotionLocked,
    primaryActionLabel,
    openNavigator,
    closeNavigator,
    selectExercise,
    selectQuestion,
    setMode,
    toggleMode,
    goToFirstUnanswered,
    goToFirstSkipped,
    handlePrimaryAction,
    skipCurrentQuestion,
  } = useSessionPlayer(sessionId, initialSession);

  if (!session || !activeExercise || !activeQuestion) {
    return (
      <div className="theater-mode theater-mode-empty">
        <header className="theater-header">
          <div className="theater-header-left">
            <Link href="/student" className="btn-ghost">
              إغلاق
            </Link>
          </div>
          <div className="theater-header-center" />
          <div className="theater-header-right" />
        </header>

        <div className="theater-empty-shell">
          <EmptyState
            title="تعذر تحميل الجلسة"
            description={error || "لا توجد بيانات لهذه الجلسة"}
            action={
              <div className="study-action-row">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    startRefreshingSession(() => {
                      router.refresh();
                    });
                  }}
                  disabled={refreshingSession}
                >
                  {refreshingSession ? "جارٍ التحديث..." : "إعادة المحاولة"}
                </button>
                <Link href="/student" className="btn-secondary">
                  العودة للرئيسية
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="theater-mode">
      <SessionPlayerHeader
        currentQuestionPosition={currentQuestionPosition}
        totalQuestionCount={progressCounts.totalCount}
        progressPercent={progressPercent}
        onOpenNavigator={openNavigator}
      />

      <div className="theater-body">
        <SessionPlayerContextPane
          session={session}
          sessionMeta={sessionMeta}
          activeExerciseTopics={activeExerciseTopics}
          activeExercise={activeExercise}
        />

        <SessionPlayerQuestionPane
          activeQuestion={activeQuestion}
          activeExercise={activeExercise}
          questionMotionClass={questionMotionClass}
          questionStatePresentation={questionStatePresentation}
          currentQuestionPosition={currentQuestionPosition}
          progressCounts={progressCounts}
          progressMode={progress.mode}
          activeQuestionState={activeQuestionState}
          solutionVisible={solutionVisible}
          questionMotionLocked={questionMotionLocked}
          primaryActionLabel={primaryActionLabel}
          completionOpen={completionOpen}
          onPrimaryAction={handlePrimaryAction}
          onSkipQuestion={skipCurrentQuestion}
          onGoToFirstUnanswered={goToFirstUnanswered}
          onGoToFirstSkipped={goToFirstSkipped}
          onToggleMode={toggleMode}
        />
      </div>

      {showNavigator ? (
        <SessionPlayerNavigatorModal
          sessionTitle={session.title}
          progressMode={progress.mode}
          progressCounts={progressCounts}
          navigatorExercises={navigatorExercises}
          activeExerciseId={activeExercise.id}
          activeQuestionId={activeQuestion.id}
          onClose={closeNavigator}
          onSetMode={setMode}
          onGoToFirstUnanswered={goToFirstUnanswered}
          onGoToFirstSkipped={goToFirstSkipped}
          onSelectExercise={selectExercise}
          onSelectQuestion={selectQuestion}
        />
      ) : null}
    </div>
  );
}
