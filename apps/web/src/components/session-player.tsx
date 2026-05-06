"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { EmptyState } from "@/components/study-shell";
import { useAuthSession } from "@/components/auth-provider";
import { StudyReviewOutcomeActions } from "@/components/study-review-outcome-actions";
import { StudyExerciseStateActions } from "@/components/study-exercise-state-actions";
import { StudyReviewQueueActions } from "@/components/study-review-queue-actions";
import { Button } from "@/components/ui/button";
import {
  SessionPlayerContextPane,
  SessionPlayerHeader,
  SessionPlayerNavigatorModal,
  SessionPlayerQuestionPane,
} from "@/components/session-player-sections";
import type {
  StudentExerciseStateResponse,
  StudySessionResponse,
} from "@/lib/study-api";
import {
  fetchStudyQuestionAiExplanation,
  type StudyQuestionAiExplanationResponse,
} from "@/lib/study-api";
import { resolveSessionSupportStyle } from "@/lib/study-pedagogy";
import { STUDENT_MY_SPACE_ROUTE } from "@/lib/student-routes";
import { useStudentExerciseStates } from "@/lib/use-student-exercise-states";
import { useSessionPlayer } from "@/lib/use-session-player";

export function SessionPlayer({
  sessionId,
  initialSession,
  initialExerciseStates,
}: {
  sessionId: string;
  initialSession?: StudySessionResponse;
  initialExerciseStates?: StudentExerciseStateResponse[];
}) {
  const sessionSeedKey = `${sessionId}:${initialSession?.id ?? "missing"}:${initialSession?.updatedAt ?? "initial"}`;

  return (
    <SessionPlayerScreen
      key={sessionSeedKey}
      sessionId={sessionId}
      initialSession={initialSession}
      initialExerciseStates={initialExerciseStates}
    />
  );
}

function SessionPlayerScreen({
  sessionId,
  initialSession,
  initialExerciseStates,
}: {
  sessionId: string;
  initialSession?: StudySessionResponse;
  initialExerciseStates?: StudentExerciseStateResponse[];
}) {
  const [weakPointIntroDismissed, setWeakPointIntroDismissed] = useState(false);
  const router = useRouter();
  const [refreshingSession, startRefreshingSession] = useTransition();
  const { user } = useAuthSession();
  const [aiExplanation, setAiExplanation] =
    useState<StudyQuestionAiExplanationResponse | null>(null);
  const [aiExplanationLoading, setAiExplanationLoading] = useState(false);
  const [aiExplanationError, setAiExplanationError] = useState<string | null>(null);
  const {
    session,
    error,
    progress,
    completionOpen,
    exerciseCheckpointSummary,
    showNavigator,
    activeExercise,
    activeQuestion,
    progressCounts,
    currentQuestionPosition,
    progressPercent,
    remainingTimeMs,
    isActiveSimulation,
    canToggleMode,
    sessionMeta,
    activeExerciseTopics,
    navigatorExercises,
    questionMotionClass,
    questionStatePresentation,
    activeQuestionState,
    solutionVisible,
    canRevealSolution,
    canSubmitAutoAnswer,
    requiresResultEvaluation,
    requiresAutoCorrectReflection,
    requiresAutoDiagnosis,
    requiresReflection,
    questionMotionLocked,
    primaryActionLabel,
    primaryActionDisabled,
    answerDraftValue,
    answerSubmitting,
    answerError,
    evaluationDraftResultStatus,
    evaluationSubmitting,
    evaluationError,
    openNavigator,
    closeNavigator,
    selectExercise,
    selectQuestion,
    setMode,
    toggleMode,
    goToFirstUnanswered,
    goToFirstSkipped,
    handlePrimaryAction,
    markQuestionAttemptedAndRevealSolution,
    setAnswerDraftValue,
    submitQuestionAnswer,
    setQuestionResultStatus,
    submitCorrectQuestionReflection,
    submitIncorrectQuestionDiagnosis,
    continueAfterExerciseCheckpoint,
    closeExerciseCheckpoint,
    showQuestionHint,
    showQuestionMethod,
    setQuestionReflection,
    setQuestionDiagnosis,
    skipCurrentQuestion,
  } = useSessionPlayer(sessionId, initialSession);
  const {
    exerciseStatesById,
    pendingExerciseIds,
    error: exerciseStateError,
    toggleBookmark,
    toggleFlag,
  } = useStudentExerciseStates({
    exerciseNodeIds:
      session?.exercises.map((exercise) => exercise.hierarchy.exerciseNodeId) ?? [],
    initialStates: initialExerciseStates,
  });

  useEffect(() => {
    setAiExplanation(null);
    setAiExplanationError(null);
    setAiExplanationLoading(false);
  }, [activeQuestion?.id, session?.id, solutionVisible]);

  if (!session || !activeExercise || !activeQuestion) {
    return (
      <div className="theater-mode theater-mode-empty">
        <header className="theater-header">
          <div className="theater-header-left">
            <Button asChild variant="ghost" className="h-10 rounded-full px-4">
              <Link href={STUDENT_MY_SPACE_ROUTE}>إغلاق</Link>
            </Button>
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
                <Button
                  type="button"
                  className="h-11 rounded-full px-5"
                  onClick={() => {
                    startRefreshingSession(() => {
                      router.refresh();
                    });
                  }}
                  disabled={refreshingSession}
                >
                  {refreshingSession ? "جارٍ التحديث..." : "إعادة المحاولة"}
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-full px-5">
                  <Link href={STUDENT_MY_SPACE_ROUTE}>العودة إلى مساحتي</Link>
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const showReviewQueueActions =
    progress.mode === "REVIEW" &&
    solutionVisible &&
    Boolean(
      activeQuestionState?.reflection === "MISSED" ||
        activeQuestionState?.reflection === "HARD" ||
        activeQuestionState?.skipped ||
        activeQuestionState?.solutionViewed,
    );
  const supportStyle = resolveSessionSupportStyle(session);
  const shouldShowWeakPointIntro =
    !weakPointIntroDismissed &&
    session.kind === "WEAK_POINT_DRILL" &&
    Boolean(session.pedagogy.weakPointIntro) &&
    progressCounts.completedCount === 0 &&
    progressCounts.skippedCount === 0 &&
    progressCounts.solutionViewedCount === 0 &&
    currentQuestionPosition <= 1;
  const canRequestAiExplanation = Boolean(
    user?.studyEntitlements.capabilities.aiExplanation &&
      solutionVisible &&
      !isActiveSimulation &&
      activeQuestion.solutionBlocks.length,
  );
  const activeExerciseActions = (
    <StudyExerciseStateActions
      state={exerciseStatesById[activeExercise.exerciseNodeId]}
      pending={pendingExerciseIds[activeExercise.exerciseNodeId]}
      onToggleBookmark={() => {
        void toggleBookmark(activeExercise.exerciseNodeId);
      }}
      onToggleFlag={() => {
        void toggleFlag(activeExercise.exerciseNodeId);
      }}
    />
  );

  async function handleOpenAiExplanation() {
    if (!session || !activeQuestion || !canRequestAiExplanation || aiExplanationLoading) {
      return;
    }

    setAiExplanationLoading(true);
    setAiExplanationError(null);

    try {
      const response = await fetchStudyQuestionAiExplanation(
        session.id,
        activeQuestion.id,
      );
      setAiExplanation(response);
    } catch (requestError) {
      setAiExplanationError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تحميل الشرح الإضافي.",
      );
    } finally {
      setAiExplanationLoading(false);
    }
  }

  return (
    <div className="theater-mode">
      <SessionPlayerHeader
        currentQuestionPosition={currentQuestionPosition}
        totalQuestionCount={progressCounts.totalCount}
        progressPercent={progressPercent}
        remainingTimeMs={remainingTimeMs}
        onOpenNavigator={openNavigator}
      />

      <div className="theater-body">
        <SessionPlayerContextPane
          session={session}
          sessionMeta={sessionMeta}
          activeExerciseTopics={activeExerciseTopics}
          activeExercise={activeExercise}
          exerciseActions={activeExerciseActions}
        />

        <SessionPlayerQuestionPane
          activeQuestion={activeQuestion}
          activeExercise={activeExercise}
          exerciseActions={activeExerciseActions}
          questionMotionClass={questionMotionClass}
          questionStatePresentation={questionStatePresentation}
          currentQuestionPosition={currentQuestionPosition}
          progressCounts={progressCounts}
          sessionFamily={session.family}
          sessionStatus={session.status}
          progressMode={progress.mode}
          activeQuestionState={activeQuestionState}
          solutionVisible={solutionVisible}
          canRevealSolution={canRevealSolution}
          canSubmitAutoAnswer={canSubmitAutoAnswer}
          requiresResultEvaluation={requiresResultEvaluation}
          requiresAutoCorrectReflection={requiresAutoCorrectReflection}
          requiresAutoDiagnosis={requiresAutoDiagnosis}
          requiresReflection={requiresReflection}
          supportStyle={supportStyle}
          questionMotionLocked={questionMotionLocked}
          primaryActionLabel={primaryActionLabel}
          primaryActionDisabled={primaryActionDisabled}
          answerDraftValue={answerDraftValue}
          answerSubmitting={answerSubmitting}
          answerError={answerError}
          evaluationDraftResultStatus={evaluationDraftResultStatus}
          evaluationSubmitting={evaluationSubmitting}
          evaluationError={evaluationError}
          completionOpen={completionOpen}
          exerciseCheckpointSummary={exerciseCheckpointSummary}
          remainingTimeMs={remainingTimeMs}
          onPrimaryAction={handlePrimaryAction}
          onMarkQuestionAttemptedAndRevealSolution={
            markQuestionAttemptedAndRevealSolution
          }
          onContinueAfterExerciseCheckpoint={continueAfterExerciseCheckpoint}
          onPauseAfterExerciseCheckpoint={() => {
            closeExerciseCheckpoint();
            router.push(STUDENT_MY_SPACE_ROUTE);
          }}
          onOpenHint={showQuestionHint}
          onOpenMethod={showQuestionMethod}
          onSkipQuestion={skipCurrentQuestion}
          onGoToFirstUnanswered={goToFirstUnanswered}
          onGoToFirstSkipped={goToFirstSkipped}
          onToggleMode={toggleMode}
          onSetAnswerDraftValue={setAnswerDraftValue}
          onSubmitQuestionAnswer={submitQuestionAnswer}
          onSetQuestionResultStatus={setQuestionResultStatus}
          onSubmitCorrectQuestionReflection={submitCorrectQuestionReflection}
          onSubmitIncorrectQuestionDiagnosis={submitIncorrectQuestionDiagnosis}
          onSetQuestionReflection={setQuestionReflection}
          onSetQuestionDiagnosis={setQuestionDiagnosis}
          canRequestAiExplanation={canRequestAiExplanation}
          aiExplanation={aiExplanation}
          aiExplanationLoading={aiExplanationLoading}
          aiExplanationError={aiExplanationError}
          onRequestAiExplanation={() => {
            void handleOpenAiExplanation();
          }}
          weakPointIntro={
            shouldShowWeakPointIntro ? session.pedagogy.weakPointIntro : null
          }
          onDismissWeakPointIntro={() => setWeakPointIntroDismissed(true)}
          reviewQueueActions={
            showReviewQueueActions ? (
              <>
                <StudyReviewOutcomeActions
                  exerciseNodeId={activeExercise.exerciseNodeId}
                  questionNodeId={activeQuestion.id}
                  labels={{
                    CORRECT: "ثبتها اليوم",
                    INCORRECT: "ما زالت تحتاج",
                  }}
                  refreshAfterUpdate={false}
                />
                <StudyReviewQueueActions
                  exerciseNodeId={activeExercise.exerciseNodeId}
                  questionNodeId={activeQuestion.id}
                  statuses={["SNOOZED"]}
                  labels={{
                    SNOOZED: "ذكّرني لاحقاً",
                  }}
                  refreshAfterUpdate={false}
                />
              </>
            ) : undefined
          }
        />
      </div>

      {exerciseStateError ? <p className="error-text">{exerciseStateError}</p> : null}

      {showNavigator ? (
        <SessionPlayerNavigatorModal
          sessionTitle={session.title}
          sessionFamily={session.family}
          sessionStatus={session.status}
          progressMode={progress.mode}
          progressCounts={progressCounts}
          navigatorExercises={navigatorExercises}
          activeExerciseId={activeExercise.id}
          activeQuestionId={activeQuestion.id}
          onClose={closeNavigator}
          onSetMode={setMode}
          canToggleMode={canToggleMode}
          onGoToFirstUnanswered={goToFirstUnanswered}
          onGoToFirstSkipped={goToFirstSkipped}
          onSelectExercise={selectExercise}
          onSelectQuestion={selectQuestion}
        />
      ) : null}
    </div>
  );
}
