"use client";

import Link from "next/link";
import {
  BookOpen,
  FileText,
  Lightbulb,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  StudyHierarchyBlocks,
  StudySectionCard,
} from "@/components/study-content";
import {
  StudyQuestionAssistCard,
  StudyQuestionMethodPanel,
  StudyWeakPointIntroCard,
} from "@/components/study-pedagogy-panels";
import { StudyQuestionPanel } from "@/components/study-question-panel";
import {
  StudyExerciseStageCard,
  StudyQuestionPromptContent,
  StudyQuestionSolutionStack,
} from "@/components/study-stage";
import {
  StudyKeyHint,
  StudyNavigator,
  StudyStateLegend,
} from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState, type ReactNode } from "react";
import {
  formatStudyQuestionReflection,
  type StudyQuestionAiExplanationResponse,
  type StudyQuestionReflection,
  type StudyQuestionResultStatus,
  formatStudySessionKind,
  formatSessionType,
  type StudySessionPedagogy,
  type StudySessionResponse,
  type StudySupportStyle,
} from "@/lib/study-api";
import {
  formatStudyQuestionDiagnosisForSupportStyle,
  getDiagnosisPromptTitle,
  shouldOfferMethodGuidance,
  shouldCollectDiagnosis,
} from "@/lib/study-pedagogy";
import {
  type ExerciseCheckpointSummary,
} from "@/lib/session-player";
import {
  buildSessionPlayerMobileTools,
  type SessionPlayerMobileTools,
} from "@/lib/session-player-mobile";
import { STUDENT_MY_SPACE_ROUTE } from "@/lib/student-routes";
import { type StudyQuestionState } from "@/lib/study";
import {
  getStudyQuestionTopics,
  type StudyExerciseModel,
  type StudyQuestionModel,
} from "@/lib/study-surface";
import { formatStudyCountdown, formatStudyDuration } from "@/lib/study-time";

type SessionProgressCounts = {
  totalCount: number;
  completedCount: number;
  skippedCount: number;
  solutionViewedCount: number;
  openedCount: number;
  trackedTimeSeconds: number;
  unansweredCount: number;
};

type QuestionStatePresentation = {
  label: string;
  tone: "neutral" | "brand" | "success" | "warning" | "danger" | "accent";
};

type SessionPlayerHeaderProps = {
  currentQuestionPosition: number;
  totalQuestionCount: number;
  progressPercent: number;
  remainingTimeMs: number | null;
  onOpenNavigator: () => void;
};

type SessionPlayerContextPaneProps = {
  session: StudySessionResponse;
  sessionMeta: Array<{ label: string; value: string }>;
  activeExerciseTopics: Array<{ code: string; name: string }>;
  activeExercise: StudyExerciseModel;
  exerciseActions?: ReactNode;
};

type SessionPlayerQuestionPaneProps = {
  activeQuestion: StudyQuestionModel;
  activeExercise: StudyExerciseModel;
  exerciseActions?: ReactNode;
  questionMotionClass: string;
  questionStatePresentation: QuestionStatePresentation;
  currentQuestionPosition: number;
  progressCounts: SessionProgressCounts;
  sessionFamily: StudySessionResponse["family"];
  sessionStatus: StudySessionResponse["status"];
  progressMode: "SOLVE" | "REVIEW";
  activeQuestionState: StudyQuestionState | undefined;
  solutionVisible: boolean;
  canRevealSolution: boolean;
  canSubmitAutoAnswer: boolean;
  requiresResultEvaluation: boolean;
  requiresAutoCorrectReflection: boolean;
  requiresAutoDiagnosis: boolean;
  requiresReflection: boolean;
  supportStyle: StudySupportStyle;
  questionMotionLocked: boolean;
  primaryActionLabel: string;
  primaryActionDisabled: boolean;
  answerDraftValue: string;
  answerSubmitting: boolean;
  answerError: string | null;
  evaluationDraftResultStatus: Exclude<StudyQuestionResultStatus, "UNKNOWN"> | null;
  evaluationSubmitting: boolean;
  evaluationError: string | null;
  completionOpen: boolean;
  exerciseCheckpointSummary: ExerciseCheckpointSummary | null;
  remainingTimeMs: number | null;
  onPrimaryAction: () => void;
  onMarkQuestionAttemptedAndRevealSolution: () => void;
  onContinueAfterExerciseCheckpoint: () => void;
  onPauseAfterExerciseCheckpoint: () => void;
  onOpenHint: () => void;
  onOpenMethod: () => void;
  onSkipQuestion: () => void;
  onGoToFirstUnanswered: () => void;
  onGoToFirstSkipped: () => void;
  onToggleMode: () => void;
  onSetAnswerDraftValue: (value: string) => void;
  onSubmitQuestionAnswer: () => void;
  onSetQuestionResultStatus: (
    resultStatus: Exclude<StudyQuestionResultStatus, "UNKNOWN">,
  ) => void;
  onSubmitCorrectQuestionReflection: (
    reflection: Exclude<StudyQuestionReflection, "MISSED">,
  ) => void;
  onSubmitIncorrectQuestionDiagnosis: (
    diagnosis: "CONCEPT" | "METHOD" | "CALCULATION",
  ) => void;
  onSetQuestionReflection: (reflection: StudyQuestionReflection) => void;
  onSetQuestionDiagnosis: (
    diagnosis: "CONCEPT" | "METHOD" | "CALCULATION",
  ) => void;
  canRequestAiExplanation: boolean;
  aiExplanation: StudyQuestionAiExplanationResponse | null;
  aiExplanationLoading: boolean;
  aiExplanationError: string | null;
  onRequestAiExplanation: () => void;
  weakPointIntro: StudySessionPedagogy["weakPointIntro"];
  onDismissWeakPointIntro: () => void;
  reviewQueueActions?: ReactNode;
};

type SessionPlayerNavigatorModalProps = {
  sessionTitle: string | null;
  sessionFamily: StudySessionResponse["family"];
  sessionStatus: StudySessionResponse["status"];
  progressMode: "SOLVE" | "REVIEW";
  progressCounts: SessionProgressCounts;
  navigatorExercises: Parameters<typeof StudyNavigator>[0]["exercises"];
  activeExerciseId: string;
  activeQuestionId: string;
  onClose: () => void;
  canToggleMode: boolean;
  onSetMode: (mode: "SOLVE" | "REVIEW") => void;
  onGoToFirstUnanswered: () => void;
  onGoToFirstSkipped: () => void;
  onSelectExercise: (exerciseId: string) => void;
  onSelectQuestion: (exerciseId: string, questionId: string) => void;
};

type MobileSheetType = "context" | "support" | "solution";

type SessionPlayerMobileToolDockProps = {
  tools: SessionPlayerMobileTools;
  activeSheet: MobileSheetType | null;
  onOpenSheet: (sheet: MobileSheetType) => void;
};

function SessionPlayerMobileToolDock({
  tools,
  activeSheet,
  onOpenSheet,
}: SessionPlayerMobileToolDockProps) {
  return (
    <div className="theater-mobile-tool-dock" aria-label="أدوات السؤال">
      <button
        type="button"
        className={activeSheet === "context" ? "is-active" : ""}
        onClick={() => onOpenSheet("context")}
        disabled={!tools.contextEnabled}
      >
        <BookOpen data-icon="solo" strokeWidth={2} />
        <span>التمرين</span>
      </button>
      <button
        type="button"
        className={activeSheet === "support" ? "is-active" : ""}
        onClick={() => onOpenSheet("support")}
        disabled={!tools.supportEnabled}
      >
        <Lightbulb data-icon="solo" strokeWidth={2} />
        <span>دعم</span>
      </button>
      <button
        type="button"
        className={activeSheet === "solution" ? "is-active" : ""}
        onClick={() => onOpenSheet("solution")}
        disabled={!tools.solutionEnabled}
      >
        <FileText data-icon="solo" strokeWidth={2} />
        <span>{tools.solutionLabel}</span>
      </button>
    </div>
  );
}

function SessionPlayerMobileSheet({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="theater-mobile-sheet-backdrop"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.aside
        className="theater-mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={prefersReducedMotion ? false : { y: "100%" }}
        animate={{ y: 0 }}
        exit={prefersReducedMotion ? undefined : { y: "100%" }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 28,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="theater-mobile-sheet-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onClose}
            aria-label="إغلاق"
            title="إغلاق"
          >
            <X data-icon="solo" strokeWidth={2} />
          </Button>
        </header>
        <div className="theater-mobile-sheet-body">{children}</div>
      </motion.aside>
    </motion.div>
  );
}

export function SessionPlayerHeader({
  currentQuestionPosition,
  totalQuestionCount,
  progressPercent,
  remainingTimeMs,
  onOpenNavigator,
}: SessionPlayerHeaderProps) {
  return (
    <header className="theater-header">
      <div className="theater-header-left">
        <Button asChild variant="ghost" className="h-10 rounded-full px-4">
          <Link href={STUDENT_MY_SPACE_ROUTE}>إغلاق</Link>
        </Button>
      </div>

      <div className="theater-header-center">
        <div className="theater-progress-container">
          <span className="theater-progress-text">
            السؤال {currentQuestionPosition} من {totalQuestionCount}
          </span>
          <div className="theater-progress-track" aria-hidden="true">
            <div
              className="theater-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="theater-header-right">
        {remainingTimeMs !== null ? (
          <span className="study-meta-pill">
            <strong>الوقت</strong>
            <span>
              {remainingTimeMs > 0
                ? formatStudyCountdown(remainingTimeMs)
                : "انتهى الوقت"}
            </span>
          </span>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full px-5"
          onClick={onOpenNavigator}
        >
          الخريطة
        </Button>
      </div>
    </header>
  );
}

export function SessionPlayerContextPane({
  session,
  sessionMeta,
  activeExerciseTopics,
  activeExercise,
  exerciseActions,
}: SessionPlayerContextPaneProps) {
  return (
    <aside className="theater-context-pane">
      <div className="theater-pane-shell">
        <section className="theater-session-intro">
          <p className="page-kicker">{formatStudySessionKind(session.kind)}</p>
          <h1>{session.title ?? formatStudySessionKind(session.kind)}</h1>
          <p className="theater-session-copy">
            {session.family === "SIMULATION" && session.durationMinutes
              ? `${session.exerciseCount} تمارين · ${session.durationMinutes} دقيقة`
              : `${session.exerciseCount} تمارين`}
          </p>
          <div className="study-meta-row">
            {sessionMeta.map((item) => (
              <span
                key={`${item.label}:${item.value}`}
                className="study-meta-pill"
              >
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </span>
            ))}
          </div>
        </section>

        <StudySectionCard tone="commentary" title="المحاور">
          {activeExerciseTopics.length ? (
            <div className="topic-chip-row theater-context-topics">
              {activeExerciseTopics.slice(0, 8).map((topic) => (
                <span key={`${activeExercise.id}:${topic.code}`}>{topic.name}</span>
              ))}
            </div>
          ) : null}
        </StudySectionCard>

        <StudyExerciseStageCard
          exercise={activeExercise}
          kicker={
            activeExercise.sourceExam
              ? `${activeExercise.sourceExam.subject.name} · ${activeExercise.sourceExam.stream.name} · ${activeExercise.sourceExam.year} · ${formatSessionType(activeExercise.sourceExam.sessionType)}`
              : formatStudySessionKind(session.kind)
          }
          heading={
            <>
              التمرين {activeExercise.displayOrder}
              {activeExercise.title ? ` · ${activeExercise.title}` : ""}
            </>
          }
          badgeLabel={`${activeExercise.questions.length} أسئلة`}
          actions={exerciseActions}
        />
      </div>
    </aside>
  );
}

export function SessionPlayerQuestionPane({
  activeQuestion,
  activeExercise,
  exerciseActions,
  questionMotionClass,
  questionStatePresentation,
  currentQuestionPosition,
  progressCounts,
  sessionFamily,
  sessionStatus,
  progressMode,
  activeQuestionState,
  solutionVisible,
  canRevealSolution,
  canSubmitAutoAnswer,
  requiresResultEvaluation,
  requiresAutoCorrectReflection,
  requiresAutoDiagnosis,
  requiresReflection,
  supportStyle,
  questionMotionLocked,
  primaryActionLabel,
  primaryActionDisabled,
  answerDraftValue,
  answerSubmitting,
  answerError,
  evaluationDraftResultStatus,
  evaluationSubmitting,
  evaluationError,
  completionOpen,
  exerciseCheckpointSummary,
  remainingTimeMs,
  onPrimaryAction,
  onMarkQuestionAttemptedAndRevealSolution,
  onContinueAfterExerciseCheckpoint,
  onPauseAfterExerciseCheckpoint,
  onOpenHint,
  onOpenMethod,
  onSkipQuestion,
  onGoToFirstUnanswered,
  onGoToFirstSkipped,
  onToggleMode,
  onSetAnswerDraftValue,
  onSubmitQuestionAnswer,
  onSetQuestionResultStatus,
  onSubmitCorrectQuestionReflection,
  onSubmitIncorrectQuestionDiagnosis,
  onSetQuestionReflection,
  onSetQuestionDiagnosis,
  canRequestAiExplanation,
  aiExplanation,
  aiExplanationLoading,
  aiExplanationError,
  onRequestAiExplanation,
  weakPointIntro,
  onDismissWeakPointIntro,
  reviewQueueActions,
}: SessionPlayerQuestionPaneProps) {
  const isActiveSimulation =
    sessionFamily === "SIMULATION" &&
    sessionStatus !== "COMPLETED" &&
    sessionStatus !== "EXPIRED" &&
    progressMode !== "REVIEW";
  const showReflectionSection =
    solutionVisible &&
    activeQuestionState?.evaluationMode !== "AUTO" &&
    !requiresResultEvaluation &&
    !activeQuestionState?.attempted &&
    (progressMode === "REVIEW" || sessionFamily === "DRILL");
  const hasMethodGuidance = shouldOfferMethodGuidance({
    supportStyle,
    question: activeQuestion,
  });
  const showAutoAnswerCard = canSubmitAutoAnswer;
  const showAttemptCard =
    activeQuestion.interaction.responseMode === "NONE" &&
    !requiresAutoCorrectReflection &&
    !solutionVisible &&
    progressMode !== "REVIEW" &&
    !isActiveSimulation &&
    canRevealSolution;
  const showAssistCard =
    !requiresAutoCorrectReflection &&
    !solutionVisible &&
    !isActiveSimulation &&
    (activeQuestion.hintBlocks.length > 0 || hasMethodGuidance);
  const showCorrectFollowUp =
    requiresAutoCorrectReflection ||
    (requiresResultEvaluation && evaluationDraftResultStatus === "CORRECT");
  const showDiagnosisFollowUp =
    requiresAutoDiagnosis ||
    (requiresResultEvaluation &&
      (evaluationDraftResultStatus === "PARTIAL" ||
        evaluationDraftResultStatus === "INCORRECT"));
  const [mobileSheetState, setMobileSheetState] = useState<{
    questionId: string;
    sheet: MobileSheetType;
  } | null>(null);
  const mobileSheet =
    mobileSheetState?.questionId === activeQuestion.id
      ? mobileSheetState.sheet
      : null;
  const mobileTools = buildSessionPlayerMobileTools({
    hasHints: activeQuestion.hintBlocks.length > 0,
    hasMethodGuidance,
    solutionVisible,
    canRevealSolution,
    isActiveSimulation,
  });

  function openMobileSheet(sheet: MobileSheetType) {
    setMobileSheetState({ questionId: activeQuestion.id, sheet });
  }

  function closeMobileSheet() {
    setMobileSheetState(null);
  }

  function renderSupportSheetContent() {
    return (
      <>
        {showAssistCard ? (
          <StudyQuestionAssistCard
            supportStyle={supportStyle}
            hasHints={activeQuestion.hintBlocks.length > 0}
            hasMethodGuidance={hasMethodGuidance}
            canRevealSolution={false}
            onOpenHint={onOpenHint}
            onOpenMethod={onOpenMethod}
            onRevealSolution={onPrimaryAction}
          />
        ) : null}

        {!solutionVisible &&
        !isActiveSimulation &&
        activeQuestionState?.hintViewed &&
        activeQuestion.hintBlocks.length ? (
          <StudySectionCard tone="hint" title="تلميح">
            <StudyHierarchyBlocks blocks={activeQuestion.hintBlocks} />
          </StudySectionCard>
        ) : null}

        {!solutionVisible &&
        !isActiveSimulation &&
        activeQuestionState?.methodViewed &&
        hasMethodGuidance ? (
          <StudyQuestionMethodPanel
            supportStyle={supportStyle}
            question={activeQuestion}
          />
        ) : null}

        {!showAssistCard &&
        !activeQuestionState?.hintViewed &&
        !activeQuestionState?.methodViewed ? (
          <StudySectionCard tone="commentary" title="الدعم">
            <p className="pedagogy-support-copy">
              لا توجد تلميحات مفتوحة لهذا السؤال الآن.
            </p>
          </StudySectionCard>
        ) : null}
      </>
    );
  }

  function renderSolutionSheetContent() {
    if (solutionVisible) {
      return <StudyQuestionSolutionStack question={activeQuestion} />;
    }

    return (
      <StudySectionCard tone="commentary" title={mobileTools.solutionLabel}>
        <p className="pedagogy-support-copy">{mobileTools.solutionDescription}</p>
        {canRevealSolution && !isActiveSimulation ? (
          <div className="study-action-row">
            <Button
              type="button"
              className="h-10 rounded-full px-5"
              onClick={onPrimaryAction}
              disabled={questionMotionLocked}
            >
              اكشف التصحيح
            </Button>
          </div>
        ) : null}
      </StudySectionCard>
    );
  }

  function renderMobileSheetContent() {
    if (mobileSheet === "context") {
      return (
        <StudyExerciseStageCard
          exercise={activeExercise}
          kicker={
            activeExercise.sourceExam
              ? `${activeExercise.sourceExam.subject.name} · ${activeExercise.sourceExam.stream.name} · ${activeExercise.sourceExam.year} · ${formatSessionType(activeExercise.sourceExam.sessionType)}`
              : "تمرين الجلسة"
          }
          heading={
            <>
              التمرين {activeExercise.displayOrder}
              {activeExercise.title ? ` · ${activeExercise.title}` : ""}
            </>
          }
          badgeLabel={`${activeExercise.questions.length} أسئلة`}
          actions={exerciseActions}
        />
      );
    }

    if (mobileSheet === "support") {
      return renderSupportSheetContent();
    }

    return renderSolutionSheetContent();
  }

  return (
    <main className="theater-question-pane">
      <div className="theater-pane-shell theater-question-shell">
        {weakPointIntro ? (
          <StudyWeakPointIntroCard
            intro={weakPointIntro}
            supportStyle={supportStyle}
            onStart={onDismissWeakPointIntro}
          />
        ) : null}

        <div className="theater-question-deck">
          <div
            key={activeQuestion.id}
            className={`theater-question-card ${questionMotionClass}`.trim()}
          >
            <StudyQuestionPanel
              title={activeQuestion.label}
              subtitle={`التمرين ${activeExercise.displayOrder}`}
              isActive={false}
              stateLabel={questionStatePresentation.label}
              stateTone={questionStatePresentation.tone}
              positionLabel={`${currentQuestionPosition}/${progressCounts.totalCount}`}
              pointsLabel={`${activeQuestion.points} ن`}
              modeLabel={progressMode === "REVIEW" ? "مراجعة" : undefined}
              solutionViewed={Boolean(activeQuestionState?.solutionViewed)}
              topics={getStudyQuestionTopics(activeQuestion).map((topic) => ({
                key: `${activeQuestion.id}-${topic.code}`,
                label: topic.name,
              }))}
            >
              <StudyQuestionPromptContent question={activeQuestion} />
            </StudyQuestionPanel>

            {showAutoAnswerCard ? (
              <StudySectionCard
                tone="commentary"
                title={getAutoAnswerTitle(activeQuestion)}
              >
                <p className="pedagogy-support-copy">
                  {getAutoAnswerCopy({
                    question: activeQuestion,
                    resultStatus: activeQuestionState?.resultStatus ?? "UNKNOWN",
                  })}
                </p>
                <form
                  className="study-answer-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onSubmitQuestionAnswer();
                  }}
                >
                  <Input
                    type="text"
                    inputMode={
                      activeQuestion.interaction.responseMode === "NUMERIC"
                        ? "decimal"
                        : "text"
                    }
                    className="study-answer-input"
                    value={answerDraftValue}
                    placeholder={getAutoAnswerPlaceholder(activeQuestion)}
                    onChange={(event) => onSetAnswerDraftValue(event.target.value)}
                    disabled={answerSubmitting || questionMotionLocked}
                    autoComplete="off"
                    dir={
                      activeQuestion.interaction.responseMode === "NUMERIC"
                        ? "ltr"
                        : "auto"
                    }
                  />
                  <Button
                    type="submit"
                    className="h-10 rounded-full px-5"
                    disabled={
                      answerSubmitting ||
                      questionMotionLocked ||
                      !answerDraftValue.trim()
                    }
                  >
                    {answerSubmitting ? "جارٍ التحقق..." : "تحقق"}
                  </Button>
                </form>
                {answerError ? <p className="error-text">{answerError}</p> : null}
                <div className="pedagogy-support-actions">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-full px-5"
                    onClick={onMarkQuestionAttemptedAndRevealSolution}
                    disabled={answerSubmitting || questionMotionLocked}
                  >
                    جاوبت على الورقة
                  </Button>
                  {canRevealSolution ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-full px-5"
                      onClick={onPrimaryAction}
                      disabled={answerSubmitting || questionMotionLocked}
                    >
                      اكشف الحل مباشرة
                    </Button>
                  ) : null}
                </div>
              </StudySectionCard>
            ) : null}

            {showAttemptCard ? (
              <StudySectionCard tone="commentary" title="قبل التصحيح">
                <p className="pedagogy-support-copy">
                  إذا جاوبت على الورقة، افتح التصحيح من هنا ثم قيّم نتيجتك بسرعة
                  بدون كتابة.
                </p>
                <div className="pedagogy-support-actions">
                  <Button
                    type="button"
                    className="h-10 rounded-full px-5"
                    onClick={onMarkQuestionAttemptedAndRevealSolution}
                    disabled={questionMotionLocked}
                  >
                    جاوبت، صحح لي
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-full px-5"
                    onClick={onPrimaryAction}
                    disabled={questionMotionLocked}
                  >
                    اكشف الحل مباشرة
                  </Button>
                </div>
              </StudySectionCard>
            ) : null}

            {showAssistCard ? (
              <div className="theater-desktop-flow">
                <StudyQuestionAssistCard
                  supportStyle={supportStyle}
                  hasHints={activeQuestion.hintBlocks.length > 0}
                  hasMethodGuidance={hasMethodGuidance}
                  canRevealSolution={false}
                  onOpenHint={onOpenHint}
                  onOpenMethod={onOpenMethod}
                  onRevealSolution={onPrimaryAction}
                />
              </div>
            ) : null}

            {!solutionVisible && isActiveSimulation ? (
              <StudySectionCard tone="commentary" title="وضع المحاكاة">
                <p className="pedagogy-support-copy">
                  التصحيح والدعم سيفتحان فقط بعد تسليم المحاكاة أو انتهاء الوقت.
                </p>
                {remainingTimeMs !== null ? (
                  <p className="completion-summary-copy">
                    {remainingTimeMs > 0
                      ? `الوقت المتبقي: ${formatStudyCountdown(remainingTimeMs)}`
                      : "انتهى الوقت. انتقل الآن إلى المراجعة."}
                  </p>
                ) : null}
              </StudySectionCard>
            ) : null}

            {!solutionVisible &&
            !isActiveSimulation &&
            activeQuestionState?.hintViewed &&
            activeQuestion.hintBlocks.length ? (
              <div className="theater-desktop-flow">
                <StudySectionCard tone="hint" title="تلميح">
                  <StudyHierarchyBlocks blocks={activeQuestion.hintBlocks} />
                </StudySectionCard>
              </div>
            ) : null}

            {!solutionVisible &&
            !isActiveSimulation &&
            activeQuestionState?.methodViewed &&
            hasMethodGuidance ? (
              <div className="theater-desktop-flow">
                <StudyQuestionMethodPanel
                  supportStyle={supportStyle}
                  question={activeQuestion}
                />
              </div>
            ) : null}

            <div
              className={`theater-desktop-flow solution-reveal-wrapper${solutionVisible ? " is-open" : ""}`}
            >
              <div className="solution-reveal-inner">
                <StudyQuestionSolutionStack question={activeQuestion} />
              </div>
            </div>
          </div>
        </div>

        <SessionPlayerMobileToolDock
          tools={mobileTools}
          activeSheet={mobileSheet}
          onOpenSheet={openMobileSheet}
        />

        <AnimatePresence>
          {mobileSheet ? (
            <SessionPlayerMobileSheet
              key={mobileSheet}
              title={
                mobileSheet === "context"
                  ? "معطيات التمرين"
                  : mobileSheet === "support"
                    ? "الدعم"
                    : mobileTools.solutionLabel
              }
              subtitle={
                mobileSheet === "solution"
                  ? mobileTools.solutionDescription
                  : undefined
              }
              onClose={closeMobileSheet}
            >
              {renderMobileSheetContent()}
            </SessionPlayerMobileSheet>
          ) : null}
        </AnimatePresence>

        <div className="theater-actions-bar">
          {!(canRevealSolution && !solutionVisible && progressMode !== "REVIEW") ? (
            <Button
              type="button"
              data-testid="session-primary-action"
              className="h-11 rounded-full px-5"
              onClick={onPrimaryAction}
              disabled={questionMotionLocked || primaryActionDisabled}
            >
              {primaryActionLabel}
            </Button>
          ) : null}

          {!solutionVisible && progressMode !== "REVIEW" ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-full px-4"
              onClick={onSkipQuestion}
              disabled={questionMotionLocked}
            >
              تخطي
            </Button>
          ) : null}
        </div>

        {requiresResultEvaluation ? (
          <StudySectionCard
            tone="commentary"
            title={getObjectiveResultTitle(activeQuestion)}
          >
            <p className="completion-summary-copy">
              {getObjectiveResultCopy(activeQuestion)}
            </p>
            <div className="chip-grid">
              {(
                ["CORRECT", "PARTIAL", "INCORRECT"] as Array<
                  Exclude<StudyQuestionResultStatus, "UNKNOWN">
                >
              ).map((resultStatus) => (
                <FilterChip
                  key={resultStatus}
                  type="button"
                  active={evaluationDraftResultStatus === resultStatus}
                  onClick={() => onSetQuestionResultStatus(resultStatus)}
                  disabled={evaluationSubmitting}
                >
                  {formatObjectiveResultLabel(
                    resultStatus,
                    activeQuestion.interaction.checkStrategy,
                  )}
                </FilterChip>
              ))}
            </div>
            {evaluationError ? <p className="error-text">{evaluationError}</p> : null}
          </StudySectionCard>
        ) : null}

        {showCorrectFollowUp ? (
          <StudySectionCard tone="commentary" title="كيف كانت المحاولة؟">
            <p className="completion-summary-copy">
              {requiresAutoCorrectReflection
                ? "الإجابة مطابقة. اختر فقط مدى سهولة الوصول إليها."
                : "بما أن الإجابة مطابقة، اختر فقط مستوى الراحة لديك."}
            </p>
            <div className="chip-grid">
              {(["HARD", "MEDIUM", "EASY"] as const).map((reflection) => (
                <FilterChip
                  key={reflection}
                  type="button"
                  onClick={() => onSubmitCorrectQuestionReflection(reflection)}
                  disabled={evaluationSubmitting}
                >
                  {formatStudyQuestionReflection(reflection)}
                </FilterChip>
              ))}
            </div>
            {evaluationError ? <p className="error-text">{evaluationError}</p> : null}
          </StudySectionCard>
        ) : null}

        {showDiagnosisFollowUp ? (
          <StudySectionCard
            tone="commentary"
            title={getDiagnosisPromptTitle(supportStyle)}
          >
            <p className="completion-summary-copy">
              {requiresAutoDiagnosis
                ? "بعد مقارنة جوابك بالحل الرسمي، اختر السبب الأقرب للتعثر."
                : "اختر السبب الأقرب حتى نبني العلاج على إشارة أوضح."}
            </p>
            <div className="chip-grid">
              {(["CONCEPT", "METHOD", "CALCULATION"] as const).map((diagnosis) => (
                <FilterChip
                  key={diagnosis}
                  type="button"
                  onClick={() => onSubmitIncorrectQuestionDiagnosis(diagnosis)}
                  disabled={evaluationSubmitting}
                >
                  {formatStudyQuestionDiagnosisForSupportStyle({
                    diagnosis,
                    supportStyle,
                  })}
                </FilterChip>
              ))}
            </div>
            {evaluationError ? <p className="error-text">{evaluationError}</p> : null}
          </StudySectionCard>
        ) : null}

        {showReflectionSection ? (
          <StudySectionCard
            tone="commentary"
            title={progressMode === "REVIEW" ? "تقديرك بعد المراجعة" : "قيّم هذا السؤال"}
          >
            {requiresReflection ? (
              <p className="completion-summary-copy">
                اختر تقييمك لهذا السؤال للانتقال إلى التالي.
              </p>
            ) : null}
            <div className="chip-grid">
              {(["MISSED", "HARD", "MEDIUM", "EASY"] as const).map(
                (reflection) => (
                  <FilterChip
                    key={reflection}
                    type="button"
                    active={activeQuestionState?.reflection === reflection}
                    onClick={() => onSetQuestionReflection(reflection)}
                  >
                    {formatStudyQuestionReflection(reflection)}
                  </FilterChip>
                ),
              )}
            </div>
          </StudySectionCard>
        ) : null}

        {showReflectionSection &&
        !activeQuestionState?.attempted &&
        shouldCollectDiagnosis(
          activeQuestionState?.diagnosis,
          activeQuestionState?.reflection ?? null,
        ) ? (
          <StudySectionCard
            tone="commentary"
            title={getDiagnosisPromptTitle(supportStyle)}
          >
            <div className="chip-grid">
              {(["CONCEPT", "METHOD", "CALCULATION"] as const).map((diagnosis) => (
                <FilterChip
                  key={diagnosis}
                  type="button"
                  active={activeQuestionState?.diagnosis === diagnosis}
                  onClick={() => onSetQuestionDiagnosis(diagnosis)}
                >
                  {formatStudyQuestionDiagnosisForSupportStyle({
                    diagnosis,
                    supportStyle,
                  })}
                </FilterChip>
              ))}
            </div>
          </StudySectionCard>
        ) : null}

        {solutionVisible && canRequestAiExplanation ? (
          <StudySectionCard tone="commentary" title="شرح إضافي">
            <div className="study-action-row">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-5"
                onClick={onRequestAiExplanation}
                disabled={aiExplanationLoading}
              >
                {aiExplanationLoading ? "جارٍ توليد الشرح..." : "اشرحه بالذكاء الاصطناعي"}
              </Button>
            </div>
            {aiExplanationError ? <p className="error-text">{aiExplanationError}</p> : null}
            {aiExplanation ? (
              <div className="pedagogy-checklist">
                <article>
                  <strong>الفكرة</strong>
                  <span>{aiExplanation.summary}</span>
                </article>
                {aiExplanation.steps.map((step) => (
                  <article key={step}>
                    <strong>الخطوة</strong>
                    <span>{step}</span>
                  </article>
                ))}
                {aiExplanation.pitfalls.map((pitfall) => (
                  <article key={pitfall}>
                    <strong>تنبه إلى</strong>
                    <span>{pitfall}</span>
                  </article>
                ))}
                {aiExplanation.nextMove ? (
                  <article>
                    <strong>خطوتك التالية</strong>
                    <span>{aiExplanation.nextMove}</span>
                  </article>
                ) : null}
              </div>
            ) : null}
          </StudySectionCard>
        ) : null}

        {reviewQueueActions ? (
          <StudySectionCard tone="commentary" title="إدارة قائمة المراجعة">
            {reviewQueueActions}
          </StudySectionCard>
        ) : null}

        {exerciseCheckpointSummary ? (
          <StudySectionCard tone="commentary" title="وقفة سريعة بعد التمرين">
            <p className="completion-summary-copy">
              أنهيت {exerciseCheckpointSummary.title}. هل تريد متابعة التمرين التالي
              الآن أم التوقف هنا والعودة لاحقاً؟
            </p>

            <div className="completion-summary-grid">
              <article>
                <strong>{exerciseCheckpointSummary.counts.completedCount}</strong>
                <span>منجزة</span>
              </article>
              <article>
                <strong>{exerciseCheckpointSummary.counts.solutionViewedCount}</strong>
                <span>حلول مكشوفة</span>
              </article>
              <article>
                <strong>{exerciseCheckpointSummary.counts.missedCount}</strong>
                <span>فاتتني</span>
              </article>
            </div>

            {exerciseCheckpointSummary.totalTimeSeconds > 0 ? (
              <p className="completion-summary-copy">
                الوقت النشط في هذا التمرين:{" "}
                {formatStudyDuration(exerciseCheckpointSummary.totalTimeSeconds)}
              </p>
            ) : null}

            <div className="pedagogy-checklist">
              {exerciseCheckpointSummary.insights.map((insight) => (
                <article key={insight}>
                  <strong>ملاحظة</strong>
                  <span>{insight}</span>
                </article>
              ))}
            </div>

            <div className="theater-summary-actions">
              <Button
                type="button"
                className="h-10 rounded-full px-5"
                onClick={onContinueAfterExerciseCheckpoint}
              >
                تابع إلى التمرين التالي
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-5"
                onClick={onPauseAfterExerciseCheckpoint}
              >
                توقّف هنا وارجع لاحقاً
              </Button>
            </div>
          </StudySectionCard>
        ) : null}

        {completionOpen ? (
          <StudySectionCard tone="commentary" title="الملخص">
            <p className="completion-summary-copy">
              {progressCounts.unansweredCount || progressCounts.skippedCount
                ? "ما زالت هناك أسئلة تحتاج رجوعاً."
                : "أكملت المرور الحالي على الجلسة."}
            </p>

            <div className="completion-summary-grid">
              <article>
                <strong>{progressCounts.completedCount}</strong>
                <span>منجزة</span>
              </article>
              <article>
                <strong>{progressCounts.skippedCount}</strong>
                <span>متروكة</span>
              </article>
              <article>
                <strong>{progressCounts.solutionViewedCount}</strong>
                <span>حلول مكشوفة</span>
              </article>
              {progressCounts.trackedTimeSeconds > 0 ? (
                <article>
                  <strong>{formatStudyDuration(progressCounts.trackedTimeSeconds)}</strong>
                  <span>وقت نشط</span>
                </article>
              ) : null}
            </div>

            <div className="theater-summary-actions">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-5"
                onClick={onGoToFirstUnanswered}
                disabled={progressCounts.unansweredCount === 0}
              >
                اذهب إلى غير المنجز
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-5"
                onClick={onGoToFirstSkipped}
                disabled={progressCounts.skippedCount === 0}
              >
                راجع المتروك
              </Button>
              {sessionFamily === "DRILL" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-full px-5"
                  onClick={onToggleMode}
                >
                  {progressMode === "REVIEW"
                    ? "العودة لوضع الحل"
                    : "فتح وضع المراجعة"}
                </Button>
              ) : null}
              <Button asChild className="h-10 rounded-full px-5">
                <Link href={STUDENT_MY_SPACE_ROUTE}>العودة إلى مساحتي</Link>
              </Button>
            </div>
          </StudySectionCard>
        ) : null}
      </div>
    </main>
  );
}

function getObjectiveResultTitle(question: StudyQuestionModel) {
  switch (question.interaction.checkStrategy) {
    case "RESULT_MATCH":
      return "صحّح النتيجة النهائية";
    case "RUBRIC_REVIEW":
      return "راجِع عناصر الإجابة";
    default:
      return "قارن جوابك بالتصحيح";
  }
}

function getObjectiveResultCopy(question: StudyQuestionModel) {
  switch (question.interaction.checkStrategy) {
    case "RESULT_MATCH":
      return "بعد مقارنة النتيجة النهائية بما في الحل الرسمي، اختر الوضع الأقرب.";
    case "RUBRIC_REVIEW":
      return "بعد مراجعة العناصر المطلوبة في التصحيح أو السلم، اختر أقرب وصف.";
    default:
      return "بعد قراءة التصحيح الرسمي، اختر بسرعة مدى مطابقة جوابك.";
  }
}

function formatObjectiveResultLabel(
  resultStatus: Exclude<StudyQuestionResultStatus, "UNKNOWN">,
  checkStrategy: StudyQuestionModel["interaction"]["checkStrategy"],
) {
  if (resultStatus === "CORRECT") {
    return checkStrategy === "RESULT_MATCH" ? "مطابق" : "صحيح";
  }

  if (resultStatus === "PARTIAL") {
    return "جزئي";
  }

  return checkStrategy === "RESULT_MATCH" ? "غير مطابق" : "خاطئ";
}

function getAutoAnswerTitle(question: StudyQuestionModel) {
  return question.interaction.responseMode === "NUMERIC"
    ? "تحقق سريع للنتيجة"
    : "تحقق سريع للإجابة";
}

function getAutoAnswerCopy(input: {
  question: StudyQuestionModel;
  resultStatus: StudyQuestionResultStatus;
}) {
  if (
    input.resultStatus === "PARTIAL" ||
    input.resultStatus === "INCORRECT"
  ) {
    return "بدّل جوابك إن أردت المحاولة من جديد، أو افتح الحل ثم حدّد سبب التعثر.";
  }

  return input.question.interaction.responseMode === "NUMERIC"
    ? "اكتب النتيجة النهائية فقط. إذا كنت حللت على الورقة ولا تريد الكتابة، انتقل مباشرة إلى التصحيح."
    : "اكتب الجواب القصير فقط. إذا كنت حللت على الورقة ولا تريد الكتابة، انتقل مباشرة إلى التصحيح.";
}

function getAutoAnswerPlaceholder(question: StudyQuestionModel) {
  return question.interaction.responseMode === "NUMERIC"
    ? "مثال: 12.5"
    : "اكتب الجواب المختصر";
}

export function SessionPlayerNavigatorModal({
  sessionTitle,
  sessionFamily,
  sessionStatus,
  progressMode,
  progressCounts,
  navigatorExercises,
  activeExerciseId,
  activeQuestionId,
  onClose,
  canToggleMode,
  onSetMode,
  onGoToFirstUnanswered,
  onGoToFirstSkipped,
  onSelectExercise,
  onSelectQuestion,
}: SessionPlayerNavigatorModalProps) {
  return (
    <div className="navigator-modal-backdrop" onClick={onClose}>
      <aside
        className="navigator-modal-content"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="theater-modal-stack">
          <div className="study-stage-head">
            <div>
              <p className="page-kicker">خريطة الجلسة</p>
              <h2>{sessionTitle ?? "جلسة تدريب"}</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-full px-4"
              onClick={onClose}
            >
              إغلاق
            </Button>
          </div>

          <div className="theater-modal-section">
            <StudyStateLegend includeSkipped />
            <StudyKeyHint keys={["→", "←"]} label="تنقل" />
            {sessionFamily === "DRILL" ? (
              <StudyKeyHint keys={["S"]} label="الحل" />
            ) : null}
          </div>

          <div className="theater-modal-actions">
            {canToggleMode ? (
              <>
                <ToggleGroup
                  type="single"
                  value={progressMode}
                  onValueChange={(value) => {
                    if (value === "SOLVE" || value === "REVIEW") {
                      onSetMode(value);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-wrap"
                >
                  <ToggleGroupItem value="SOLVE">حل</ToggleGroupItem>
                  <ToggleGroupItem value="REVIEW">مراجعة</ToggleGroupItem>
                </ToggleGroup>
              </>
            ) : sessionStatus === "COMPLETED" || sessionStatus === "EXPIRED" ? (
              <span className="study-meta-pill">
                <strong>الوضع</strong>
                <span>مراجعة المحاكاة</span>
              </span>
            ) : (
              <span className="study-meta-pill">
                <strong>الوضع</strong>
                <span>محاكاة جارية</span>
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-5"
              onClick={onGoToFirstUnanswered}
              disabled={progressCounts.unansweredCount === 0}
            >
              أول غير منجز
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-5"
              onClick={onGoToFirstSkipped}
              disabled={progressCounts.skippedCount === 0}
            >
              راجع المتروك
            </Button>
          </div>

          <StudyNavigator
            exercises={navigatorExercises}
            activeExerciseId={activeExerciseId}
            activeQuestionId={activeQuestionId}
            onSelectExercise={onSelectExercise}
            onSelectQuestion={onSelectQuestion}
          />
        </div>
      </aside>
    </div>
  );
}
