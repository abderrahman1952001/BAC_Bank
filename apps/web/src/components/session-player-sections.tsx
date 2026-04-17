import Link from "next/link";
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
import type { ReactNode } from "react";
import {
  formatStudyQuestionReflection,
  type StudyQuestionAiExplanationResponse,
  type StudyQuestionReflection,
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
  requiresReflection: boolean;
  supportStyle: StudySupportStyle;
  questionMotionLocked: boolean;
  primaryActionLabel: string;
  primaryActionDisabled: boolean;
  completionOpen: boolean;
  exerciseCheckpointSummary: ExerciseCheckpointSummary | null;
  remainingTimeMs: number | null;
  onPrimaryAction: () => void;
  onContinueAfterExerciseCheckpoint: () => void;
  onPauseAfterExerciseCheckpoint: () => void;
  onOpenHint: () => void;
  onOpenMethod: () => void;
  onSkipQuestion: () => void;
  onGoToFirstUnanswered: () => void;
  onGoToFirstSkipped: () => void;
  onToggleMode: () => void;
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
        <Link href={STUDENT_MY_SPACE_ROUTE} className="btn-ghost">
          إغلاق
        </Link>
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
        <button type="button" className="btn-secondary" onClick={onOpenNavigator}>
          الخريطة
        </button>
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
  requiresReflection,
  supportStyle,
  questionMotionLocked,
  primaryActionLabel,
  primaryActionDisabled,
  completionOpen,
  exerciseCheckpointSummary,
  remainingTimeMs,
  onPrimaryAction,
  onContinueAfterExerciseCheckpoint,
  onPauseAfterExerciseCheckpoint,
  onOpenHint,
  onOpenMethod,
  onSkipQuestion,
  onGoToFirstUnanswered,
  onGoToFirstSkipped,
  onToggleMode,
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
    (progressMode === "REVIEW" || sessionFamily === "DRILL");
  const hasMethodGuidance = shouldOfferMethodGuidance({
    supportStyle,
    question: activeQuestion,
  });

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

            {!solutionVisible && progressMode !== "REVIEW" && !isActiveSimulation ? (
              <StudyQuestionAssistCard
                supportStyle={supportStyle}
                hasHints={activeQuestion.hintBlocks.length > 0}
                hasMethodGuidance={hasMethodGuidance}
                canRevealSolution={canRevealSolution}
                onOpenHint={onOpenHint}
                onOpenMethod={onOpenMethod}
                onRevealSolution={onPrimaryAction}
              />
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

            <div
              className={`solution-reveal-wrapper${solutionVisible ? " is-open" : ""}`}
            >
              <div className="solution-reveal-inner">
                <StudyQuestionSolutionStack question={activeQuestion} />
              </div>
            </div>
          </div>
        </div>

        <div className="theater-actions-bar">
          {!(canRevealSolution && !solutionVisible && progressMode !== "REVIEW") ? (
            <button
              type="button"
              data-testid="session-primary-action"
              className="btn-primary"
              onClick={onPrimaryAction}
              disabled={questionMotionLocked || primaryActionDisabled}
            >
              {primaryActionLabel}
            </button>
          ) : null}

          {!solutionVisible && progressMode !== "REVIEW" ? (
            <button
              type="button"
              className="theater-subtle-action"
              onClick={onSkipQuestion}
              disabled={questionMotionLocked}
            >
              تخطي
            </button>
          ) : null}
        </div>

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
                  <button
                    key={reflection}
                    type="button"
                    className={
                      activeQuestionState?.reflection === reflection
                        ? "choice-chip active"
                        : "choice-chip"
                    }
                    onClick={() => onSetQuestionReflection(reflection)}
                  >
                    {formatStudyQuestionReflection(reflection)}
                  </button>
                ),
              )}
            </div>
          </StudySectionCard>
        ) : null}

        {showReflectionSection &&
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
                <button
                  key={diagnosis}
                  type="button"
                  className={
                    activeQuestionState?.diagnosis === diagnosis
                      ? "choice-chip active"
                      : "choice-chip"
                  }
                  onClick={() => onSetQuestionDiagnosis(diagnosis)}
                >
                  {formatStudyQuestionDiagnosisForSupportStyle({
                    diagnosis,
                    supportStyle,
                  })}
                </button>
              ))}
            </div>
          </StudySectionCard>
        ) : null}

        {solutionVisible && canRequestAiExplanation ? (
          <StudySectionCard tone="commentary" title="شرح إضافي">
            <div className="study-action-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={onRequestAiExplanation}
                disabled={aiExplanationLoading}
              >
                {aiExplanationLoading ? "جارٍ توليد الشرح..." : "اشرحه بالذكاء الاصطناعي"}
              </button>
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
              <button
                type="button"
                className="btn-primary"
                onClick={onContinueAfterExerciseCheckpoint}
              >
                تابع إلى التمرين التالي
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onPauseAfterExerciseCheckpoint}
              >
                توقّف هنا وارجع لاحقاً
              </button>
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
              <button
                type="button"
                className="btn-secondary"
                onClick={onGoToFirstUnanswered}
                disabled={progressCounts.unansweredCount === 0}
              >
                اذهب إلى غير المنجز
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onGoToFirstSkipped}
                disabled={progressCounts.skippedCount === 0}
              >
                راجع المتروك
              </button>
              {sessionFamily === "DRILL" ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onToggleMode}
                >
                  {progressMode === "REVIEW"
                    ? "العودة لوضع الحل"
                    : "فتح وضع المراجعة"}
                </button>
              ) : null}
              <Link href={STUDENT_MY_SPACE_ROUTE} className="btn-primary">
                العودة إلى مساحتي
              </Link>
            </div>
          </StudySectionCard>
        ) : null}
      </div>
    </main>
  );
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
            <button type="button" className="btn-ghost" onClick={onClose}>
              إغلاق
            </button>
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
                <button
                  type="button"
                  className={
                    progressMode === "SOLVE"
                      ? "study-toggle-button active"
                      : "study-toggle-button"
                  }
                  onClick={() => onSetMode("SOLVE")}
                >
                  حل
                </button>
                <button
                  type="button"
                  className={
                    progressMode === "REVIEW"
                      ? "study-toggle-button active"
                      : "study-toggle-button"
                  }
                  onClick={() => onSetMode("REVIEW")}
                >
                  مراجعة
                </button>
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
            <button
              type="button"
              className="btn-secondary"
              onClick={onGoToFirstUnanswered}
              disabled={progressCounts.unansweredCount === 0}
            >
              أول غير منجز
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onGoToFirstSkipped}
              disabled={progressCounts.skippedCount === 0}
            >
              راجع المتروك
            </button>
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
