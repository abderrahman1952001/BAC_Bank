import Link from "next/link";
import { StudySectionCard } from "@/components/study-content";
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
import { formatSessionType, type PracticeSessionResponse } from "@/lib/qbank";
import { type StudyQuestionState } from "@/lib/study";
import {
  getStudyQuestionTopics,
  type StudyExerciseModel,
  type StudyQuestionModel,
} from "@/lib/study-surface";

type SessionProgressCounts = {
  totalCount: number;
  completedCount: number;
  skippedCount: number;
  solutionViewedCount: number;
  openedCount: number;
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
  onOpenNavigator: () => void;
};

type SessionPlayerContextPaneProps = {
  session: PracticeSessionResponse;
  sessionMeta: Array<{ label: string; value: string }>;
  sessionGoalSummary: string;
  activeExerciseTopics: Array<{ code: string; name: string }>;
  activeExercise: StudyExerciseModel;
};

type SessionPlayerQuestionPaneProps = {
  activeQuestion: StudyQuestionModel;
  activeExercise: StudyExerciseModel;
  questionMotionClass: string;
  questionStatePresentation: QuestionStatePresentation;
  currentQuestionPosition: number;
  progressCounts: SessionProgressCounts;
  progressMode: "SOLVE" | "REVIEW";
  activeQuestionState: StudyQuestionState | undefined;
  solutionVisible: boolean;
  questionMotionLocked: boolean;
  primaryActionLabel: string;
  completionOpen: boolean;
  onPrimaryAction: () => void;
  onSkipQuestion: () => void;
  onGoToFirstUnanswered: () => void;
  onGoToFirstSkipped: () => void;
  onToggleMode: () => void;
};

type SessionPlayerNavigatorModalProps = {
  sessionTitle: string | null;
  progressMode: "SOLVE" | "REVIEW";
  progressCounts: SessionProgressCounts;
  navigatorExercises: Parameters<typeof StudyNavigator>[0]["exercises"];
  activeExerciseId: string;
  activeQuestionId: string;
  onClose: () => void;
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
  onOpenNavigator,
}: SessionPlayerHeaderProps) {
  return (
    <header className="theater-header">
      <div className="theater-header-left">
        <Link href="/app" className="btn-ghost">
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
  sessionGoalSummary,
  activeExerciseTopics,
  activeExercise,
}: SessionPlayerContextPaneProps) {
  return (
    <aside className="theater-context-pane">
      <div className="theater-pane-shell">
        <section className="theater-session-intro">
          <p className="page-kicker">جلسة دراسة</p>
          <h1>{session.title ?? "جلسة تدريب مخصصة"}</h1>
          <p className="theater-session-copy">
            {session.exerciseCount} تمارين · حفظ تلقائي.
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

        <StudySectionCard tone="commentary" title="التركيز">
          <p className="muted-text">{sessionGoalSummary}</p>
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
              : "جلسة تدريب مخصصة"
          }
          heading={
            <>
              التمرين {activeExercise.displayOrder}
              {activeExercise.title ? ` · ${activeExercise.title}` : ""}
            </>
          }
          badgeLabel={`${activeExercise.questions.length} أسئلة`}
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
  progressMode,
  activeQuestionState,
  solutionVisible,
  questionMotionLocked,
  primaryActionLabel,
  completionOpen,
  onPrimaryAction,
  onSkipQuestion,
  onGoToFirstUnanswered,
  onGoToFirstSkipped,
  onToggleMode,
}: SessionPlayerQuestionPaneProps) {
  return (
    <main className="theater-question-pane">
      <div className="theater-pane-shell theater-question-shell">
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
          <button
            type="button"
            data-testid="session-primary-action"
            className="btn-primary"
            onClick={onPrimaryAction}
            disabled={questionMotionLocked}
          >
            {primaryActionLabel}
          </button>

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
              <button type="button" className="btn-secondary" onClick={onToggleMode}>
                {progressMode === "REVIEW"
                  ? "العودة لوضع الحل"
                  : "فتح وضع المراجعة"}
              </button>
              <Link href="/app" className="btn-primary">
                العودة للرئيسية
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
  progressMode,
  progressCounts,
  navigatorExercises,
  activeExerciseId,
  activeQuestionId,
  onClose,
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
              <h2>{sessionTitle ?? "جلسة تدريب مخصصة"}</h2>
            </div>
            <button type="button" className="btn-ghost" onClick={onClose}>
              إغلاق
            </button>
          </div>

          <div className="theater-modal-section">
            <StudyStateLegend includeSkipped />
            <StudyKeyHint keys={["N", "P"]} label="التالي / السابق" />
          </div>

          <div className="theater-modal-actions">
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
