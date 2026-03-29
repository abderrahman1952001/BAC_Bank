import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
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
  StudyProgressBar,
  StudySidebar,
  StudyStateLegend,
} from "@/components/study-shell";
import { type ExamResponse, formatSessionType } from "@/lib/qbank";
import {
  type StudyQuestionState,
  type StudyQuestionStateDescriptor,
} from "@/lib/study";
import {
  getStudyQuestionTopics,
  type StudyExerciseModel,
  type StudyQuestionModel,
} from "@/lib/study-surface";

type NavigatorExercises = ComponentProps<typeof StudyNavigator>["exercises"];

type SujetProgressCounts = {
  totalCount: number;
  completedCount: number;
  skippedCount: number;
  solutionViewedCount: number;
  openedCount: number;
  unansweredCount: number;
};

type SujetViewerHeaderActionsProps = {
  backToBrowseHref: string;
  progressMode: "SOLVE" | "REVIEW";
  onEnterFocusMode: () => void;
  onSetMode: (mode: "SOLVE" | "REVIEW") => void;
};

type SujetViewerHeaderProgressProps = {
  progressCounts: SujetProgressCounts;
  currentQuestionPosition: number;
};

type SujetViewerStandardLayoutProps = {
  exam: ExamResponse;
  exercises: StudyExerciseModel[];
  activeExerciseIndex: number;
  activeExercise: StudyExerciseModel;
  activeQuestion: StudyQuestionModel;
  activeQuestionIndex: number;
  activeQuestionStateDescriptor: StudyQuestionStateDescriptor;
  activeQuestionState: StudyQuestionState | undefined;
  solutionVisible: boolean;
  progressMode: "SOLVE" | "REVIEW";
  navigatorExercises: NavigatorExercises;
  exerciseAction: ReactNode;
  questionActions: ReactNode;
  onSelectExercise: (exerciseId: string) => void;
  onSelectQuestion: (exerciseId: string, questionId: string) => void;
};

type SujetViewerFocusHeaderProps = {
  backToBrowseHref: string;
  currentQuestionPosition: number;
  totalQuestionCount: number;
  progressPercent: number;
  onExitFocusMode: () => void;
  onOpenNavigator: () => void;
};

type SujetViewerFocusContextPaneProps = {
  exam: ExamResponse;
  sujetNumber: string;
  progressMode: "SOLVE" | "REVIEW";
  totalQuestionCount: number;
  activeExerciseTopics: Array<{ code: string; name: string }>;
  activeExercise: StudyExerciseModel;
  exerciseAction: ReactNode;
  onSetMode: (mode: "SOLVE" | "REVIEW") => void;
};

type SujetViewerFocusQuestionPaneProps = {
  activeExercise: StudyExerciseModel;
  activeQuestion: StudyQuestionModel;
  activeQuestionStateDescriptor: StudyQuestionStateDescriptor;
  activeQuestionState: StudyQuestionState | undefined;
  progressMode: "SOLVE" | "REVIEW";
  currentQuestionPosition: number;
  totalQuestionCount: number;
  solutionVisible: boolean;
  questionActions: ReactNode;
};

type SujetViewerFocusNavigatorModalProps = {
  exam: ExamResponse;
  sujetNumber: string;
  progressMode: "SOLVE" | "REVIEW";
  navigatorExercises: NavigatorExercises;
  activeExerciseId: string;
  activeQuestionId: string;
  onClose: () => void;
  onExitFocusMode: () => void;
  onSetMode: (mode: "SOLVE" | "REVIEW") => void;
  onSelectExercise: (exerciseId: string) => void;
  onSelectQuestion: (exerciseId: string, questionId: string) => void;
};

export function SujetViewerHeaderActions({
  backToBrowseHref,
  progressMode,
  onEnterFocusMode,
  onSetMode,
}: SujetViewerHeaderActionsProps) {
  return (
    <div className="study-toggle-row">
      <Link href={backToBrowseHref} className="btn-secondary">
        العودة للتصفح
      </Link>
      <button type="button" className="btn-secondary" onClick={onEnterFocusMode}>
        وضع التركيز
      </button>
      <button
        type="button"
        className={
          progressMode === "SOLVE"
            ? "study-toggle-button active"
            : "study-toggle-button"
        }
        onClick={() => onSetMode("SOLVE")}
      >
        وضع الحل
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
        وضع المراجعة
      </button>
    </div>
  );
}

export function SujetViewerHeaderProgress({
  progressCounts,
  currentQuestionPosition,
}: SujetViewerHeaderProgressProps) {
  return (
    <div className="study-progress-grid">
      <StudyProgressBar
        label="تقدم الموضوع"
        detail={`${progressCounts.completedCount} من ${progressCounts.totalCount} منجزة`}
        value={
          (progressCounts.completedCount / Math.max(progressCounts.totalCount, 1)) *
          100
        }
      />
      <StudyProgressBar
        label="الموضع الحالي"
        detail={`السؤال ${currentQuestionPosition} من ${progressCounts.totalCount}`}
        value={
          (currentQuestionPosition / Math.max(progressCounts.totalCount, 1)) * 100
        }
      />
    </div>
  );
}

export function SujetViewerStandardLayout({
  exam,
  exercises,
  activeExerciseIndex,
  activeExercise,
  activeQuestion,
  activeQuestionIndex,
  activeQuestionStateDescriptor,
  activeQuestionState,
  solutionVisible,
  progressMode,
  navigatorExercises,
  exerciseAction,
  questionActions,
  onSelectExercise,
  onSelectQuestion,
}: SujetViewerStandardLayoutProps) {
  return (
    <div className="study-layout">
      <StudySidebar
        title="الموضوع"
        subtitle={`${activeExerciseIndex + 1} / ${exercises.length}`}
        footer={
          <div className="study-sidebar-footer-stack">
            <StudyStateLegend />
            <StudyKeyHint keys={["N", "P"]} label="التالي / السابق" />
          </div>
        }
      >
        <StudyNavigator
          exercises={navigatorExercises}
          activeExerciseId={activeExercise.id}
          activeQuestionId={activeQuestion.id}
          onSelectExercise={onSelectExercise}
          onSelectQuestion={onSelectQuestion}
        />
      </StudySidebar>

      <section className="study-stage">
        <StudyExerciseStageCard
          exercise={activeExercise}
          kicker={`${exam.subject.name} · ${exam.stream.name} · ${exam.year}`}
          heading={
            <>
              التمرين {activeExercise.displayOrder}
              {activeExercise.title ? ` · ${activeExercise.title}` : ""}
            </>
          }
          badgeLabel={`${activeExercise.questions.length} أسئلة`}
          actions={exerciseAction}
        />

        <StudyQuestionPanel
          key={`${activeExercise.id}:${activeQuestion.id}`}
          title={activeQuestion.label}
          subtitle={`التمرين ${activeExercise.displayOrder}`}
          stateLabel={activeQuestionStateDescriptor.label}
          stateTone={activeQuestionStateDescriptor.tone}
          positionLabel={`${activeQuestionIndex + 1}/${activeExercise.questions.length}`}
          pointsLabel={`${activeQuestion.points} ن`}
          modeLabel={progressMode === "REVIEW" ? "مراجعة" : undefined}
          solutionViewed={Boolean(activeQuestionState?.solutionViewed)}
          topics={getStudyQuestionTopics(activeQuestion).map((topic) => ({
            key: `${activeQuestion.id}-${topic.code}`,
            label: topic.name,
          }))}
          actions={questionActions}
        >
          <StudyQuestionPromptContent question={activeQuestion} />
        </StudyQuestionPanel>

        {solutionVisible ? (
          <StudyQuestionSolutionStack question={activeQuestion} />
        ) : null}
      </section>
    </div>
  );
}

export function SujetViewerFocusHeader({
  backToBrowseHref,
  currentQuestionPosition,
  totalQuestionCount,
  progressPercent,
  onExitFocusMode,
  onOpenNavigator,
}: SujetViewerFocusHeaderProps) {
  return (
    <header className="theater-header">
      <div className="theater-header-left">
        <button type="button" className="btn-ghost" onClick={onExitFocusMode}>
          العرض العادي
        </button>
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
        <div className="study-action-row">
          <Link href={backToBrowseHref} className="btn-secondary">
            التصفح
          </Link>
          <button type="button" className="btn-secondary" onClick={onOpenNavigator}>
            الخريطة
          </button>
        </div>
      </div>
    </header>
  );
}

export function SujetViewerFocusContextPane({
  exam,
  sujetNumber,
  progressMode,
  totalQuestionCount,
  activeExerciseTopics,
  activeExercise,
  exerciseAction,
  onSetMode,
}: SujetViewerFocusContextPaneProps) {
  return (
    <aside className="theater-context-pane">
      <div className="theater-pane-shell">
        <section className="theater-session-intro">
          <p className="page-kicker">موضوع رسمي</p>
          <h1>{exam.selectedSujetLabel ?? `الموضوع ${sujetNumber}`}</h1>
          <p className="theater-session-copy">
            {formatSessionType(exam.sessionType)} · {totalQuestionCount} أسئلة ·
            تنقل حر داخل الموضوع.
          </p>
          <div className="study-meta-row">
            <span className="study-meta-pill">
              <strong>المادة</strong>
              <span>{exam.subject.name}</span>
            </span>
            <span className="study-meta-pill">
              <strong>الشعبة</strong>
              <span>{exam.stream.name}</span>
            </span>
            <span className="study-meta-pill">
              <strong>السنة</strong>
              <span>{exam.year}</span>
            </span>
          </div>
        </section>

        <StudySectionCard tone="commentary" title="الوضع الحالي">
          <p className="muted-text">
            {progressMode === "REVIEW"
              ? "أنت في وضع المراجعة، لذلك يظهر الحل مباشرة للسؤال الحالي."
              : "أنت في وضع الحل، ويمكنك التنقل بين الأسئلة مع إبقاء خريطة الموضوع مخفية حتى تحتاجها."}
          </p>
          {activeExerciseTopics.length ? (
            <div className="topic-chip-row theater-context-topics">
              {activeExerciseTopics.slice(0, 8).map((topic) => (
                <span key={`${activeExercise.id}:${topic.code}`}>{topic.name}</span>
              ))}
            </div>
          ) : null}
          <div className="study-action-row">
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
          </div>
        </StudySectionCard>

        <StudyExerciseStageCard
          exercise={activeExercise}
          kicker={`${exam.subject.name} · ${exam.stream.name} · ${exam.year}`}
          heading={
            <>
              التمرين {activeExercise.displayOrder}
              {activeExercise.title ? ` · ${activeExercise.title}` : ""}
            </>
          }
          badgeLabel={`${activeExercise.questions.length} أسئلة`}
          actions={exerciseAction}
        />
      </div>
    </aside>
  );
}

export function SujetViewerFocusQuestionPane({
  activeExercise,
  activeQuestion,
  activeQuestionStateDescriptor,
  activeQuestionState,
  progressMode,
  currentQuestionPosition,
  totalQuestionCount,
  solutionVisible,
  questionActions,
}: SujetViewerFocusQuestionPaneProps) {
  return (
    <main className="theater-question-pane">
      <div className="theater-pane-shell theater-question-shell">
        <div className="theater-question-deck">
          <div key={`${activeExercise.id}:${activeQuestion.id}`} className="theater-question-card">
            <StudyQuestionPanel
              title={activeQuestion.label}
              subtitle={`التمرين ${activeExercise.displayOrder}`}
              stateLabel={activeQuestionStateDescriptor.label}
              stateTone={activeQuestionStateDescriptor.tone}
              positionLabel={`${currentQuestionPosition}/${totalQuestionCount}`}
              pointsLabel={`${activeQuestion.points} ن`}
              modeLabel={progressMode === "REVIEW" ? "مراجعة" : undefined}
              solutionViewed={Boolean(activeQuestionState?.solutionViewed)}
              topics={getStudyQuestionTopics(activeQuestion).map((topic) => ({
                key: `${activeQuestion.id}-${topic.code}`,
                label: topic.name,
              }))}
              keyboardHint={{
                keys: ["N", "P"],
                label: "التالي / السابق",
              }}
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

        {questionActions ? (
          <div className="theater-actions-bar">{questionActions}</div>
        ) : null}
      </div>
    </main>
  );
}

export function SujetViewerFocusNavigatorModal({
  exam,
  sujetNumber,
  progressMode,
  navigatorExercises,
  activeExerciseId,
  activeQuestionId,
  onClose,
  onExitFocusMode,
  onSetMode,
  onSelectExercise,
  onSelectQuestion,
}: SujetViewerFocusNavigatorModalProps) {
  return (
    <div className="navigator-modal-backdrop" onClick={onClose}>
      <aside
        className="navigator-modal-content"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="theater-modal-stack">
          <div className="study-stage-head">
            <div>
              <p className="page-kicker">خريطة الموضوع</p>
              <h2>{exam.selectedSujetLabel ?? `الموضوع ${sujetNumber}`}</h2>
            </div>
            <button type="button" className="btn-ghost" onClick={onClose}>
              إغلاق
            </button>
          </div>

          <div className="study-action-row">
            <StudyStateLegend />
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
            <button type="button" className="btn-secondary" onClick={onExitFocusMode}>
              العرض العادي
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
