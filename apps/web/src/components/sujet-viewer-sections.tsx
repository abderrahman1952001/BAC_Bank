"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
  describeStudyQuestionState,
  type StudyQuestionState,
  type StudyQuestionStateDescriptor,
} from "@/lib/study";
import {
  canRevealStudyQuestionSolution,
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
  onSetMode: (mode: "SOLVE" | "REVIEW") => void;
  adminAction?: ReactNode;
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
  activeQuestionId: string;
  progressMode: "SOLVE" | "REVIEW";
  questionStates: Record<string, StudyQuestionState>;
  navigatorExercises: NavigatorExercises;
  exerciseHeaderActions: ReactNode;
  onSelectExercise: (exerciseId: string) => void;
  onSelectQuestion: (exerciseId: string, questionId: string) => void;
  onToggleQuestionComplete: (exerciseId: string, questionId: string) => void;
  onToggleQuestionSolution: (exerciseId: string, questionId: string) => void;
  isQuestionSolutionVisible: (questionId: string) => boolean;
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
  onSetMode,
  adminAction,
}: SujetViewerHeaderActionsProps) {
  return (
    <div className="study-toggle-row">
      <Link href={backToBrowseHref} className="btn-secondary">
        العودة
      </Link>
      {adminAction}
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
  );
}

export function SujetViewerHeaderProgress({
  progressCounts,
  currentQuestionPosition,
}: SujetViewerHeaderProgressProps) {
  return (
    <div className="study-progress-grid">
      <StudyProgressBar
        label="التقدم"
        detail={`${progressCounts.completedCount}/${progressCounts.totalCount}`}
        value={
          (progressCounts.completedCount / Math.max(progressCounts.totalCount, 1)) *
          100
        }
      />
      <StudyProgressBar
        label="الموضع"
        detail={`${currentQuestionPosition}/${progressCounts.totalCount}`}
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
  activeQuestionId,
  progressMode,
  questionStates,
  navigatorExercises,
  exerciseHeaderActions,
  onSelectExercise,
  onSelectQuestion,
  onToggleQuestionComplete,
  onToggleQuestionSolution,
  isQuestionSolutionVisible,
}: SujetViewerStandardLayoutProps) {
  return (
    <div className="study-layout">
      <StudySidebar
        className="study-sidebar-exam"
        title="الموضوع"
        subtitle={`${activeExerciseIndex + 1} / ${exercises.length}`}
        footer={
          <div className="study-sidebar-footer-stack">
            <StudyStateLegend />
            <div className="study-action-row-tight">
              <StudyKeyHint keys={["→", "←"]} label="تنقل" />
              <StudyKeyHint keys={["S"]} label="الحل" />
            </div>
          </div>
        }
      >
        <StudyNavigator
          exercises={navigatorExercises}
          activeExerciseId={activeExercise.id}
          activeQuestionId={activeQuestionId}
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
          headerActions={exerciseHeaderActions}
        />

        <div className="study-question-stack">
          {activeExercise.questions.map((question, questionIndex) => {
            const questionState = questionStates[question.id];
            const isActive = question.id === activeQuestionId;
            const stateDescriptor = describeStudyQuestionState(
              questionState,
              isActive,
            );
            const solutionVisible = isQuestionSolutionVisible(question.id);
            const canRevealSolution = canRevealStudyQuestionSolution(question);

            return (
              <article
                key={`${activeExercise.id}:${question.id}`}
                id={`study-question-${question.id}`}
                className={
                  isActive
                    ? "study-question-stack-item is-active"
                    : "study-question-stack-item"
                }
              >
                <StudyQuestionPanel
                  title={question.label}
                  subtitle={`التمرين ${activeExercise.displayOrder}`}
                  isActive={isActive}
                  stateLabel={stateDescriptor.label}
                  stateTone={stateDescriptor.tone}
                  positionLabel={`${questionIndex + 1}/${activeExercise.questions.length}`}
                  pointsLabel={`${question.points} ن`}
                  modeLabel={progressMode === "REVIEW" ? "مراجعة" : undefined}
                  solutionViewed={Boolean(questionState?.solutionViewed)}
                  topics={getStudyQuestionTopics(question).map((topic) => ({
                    key: `${question.id}-${topic.code}`,
                    label: topic.name,
                  }))}
                  actions={
                    <>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          onToggleQuestionComplete(activeExercise.id, question.id)
                        }
                      >
                        {questionState?.completed ? "إلغاء الإنجاز" : "تم"}
                      </button>
                      {progressMode === "SOLVE" && canRevealSolution ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() =>
                            onToggleQuestionSolution(activeExercise.id, question.id)
                          }
                        >
                          {solutionVisible ? (
                            <>
                              <EyeOff size={16} aria-hidden="true" />
                              إخفاء الحل
                            </>
                          ) : (
                            <>
                              <Eye size={16} aria-hidden="true" />
                              إظهار الحل
                            </>
                          )}
                        </button>
                      ) : null}
                    </>
                  }
                >
                  <StudyQuestionPromptContent question={question} />
                </StudyQuestionPanel>

                <AnimatePresence initial={false}>
                  {solutionVisible ? (
                    <motion.div
                      className="study-inline-solution-motion"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <div className="study-inline-solution-inner">
                        <StudyQuestionSolutionStack question={question} />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
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
          عادي
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
            {formatSessionType(exam.sessionType)} · {totalQuestionCount} أسئلة
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

        <StudySectionCard tone="commentary" title="الوضع">
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
                keys: ["→", "←"],
                label: "تنقل",
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
            <StudyKeyHint keys={["→", "←"]} label="تنقل" />
            <StudyKeyHint keys={["S"]} label="الحل" />
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
              عادي
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
