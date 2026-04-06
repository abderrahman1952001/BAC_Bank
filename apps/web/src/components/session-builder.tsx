"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { StudentNavbar } from "@/components/student-navbar";
import { useAuthSession } from "@/components/auth-provider";
import {
  SessionBuilderReviewStep,
  SessionBuilderStepper,
  SessionBuilderSubjectStep,
  SessionBuilderTopicsStep,
  SessionBuilderYearsStep,
} from "@/components/session-builder-sections";
import {
  EmptyState,
  StudyHeader,
  StudyShell,
} from "@/components/study-shell";
import type { FiltersResponse } from "@/lib/qbank";
import { useSessionBuilder } from "@/lib/use-session-builder";

export function SessionBuilder({
  initialFilters,
}: {
  initialFilters?: FiltersResponse;
}) {
  const router = useRouter();
  const [refreshingFilters, startRefreshingFilters] = useTransition();
  const { user } = useAuthSession();
  const userStreamCode = user?.stream?.code ?? null;
  const {
    filters,
    previewLoading,
    creating,
    error,
    title,
    subjectCode,
    topicCodes,
    topicSelectionMode,
    yearMode,
    yearStart,
    yearEnd,
    sessionTypes,
    exerciseCount,
    advancedOpen,
    currentStep,
    stepMotionDirection,
    preview,
    suggestedSubjects,
    selectedSubject,
    availableStreams,
    effectiveStreamCodes,
    availableTopics,
    chapterTopics,
    selectableSubtopicsByChapter,
    topicDescendantsByCode,
    topicSelectionComplete,
    yearSelectionComplete,
    builderReadyToPreview,
    selectedTopicLabel,
    selectedYearsLabel,
    planText,
    selectedYears,
    zeroResultsGuidance,
    maxExerciseCount,
    hasPreviewResults,
    selectSubject,
    setYearMode,
    setYearStart,
    setYearEnd,
    goToStep,
    goToWizardStep,
    toggleAdvancedOpen,
    openAllStreams,
    toggleStream,
    changeTopicMode,
    toggleTopic,
    toggleSessionType,
    setExerciseCount,
    setTitle,
    triggerZeroResultsAction,
    createSession,
  } = useSessionBuilder(userStreamCode, initialFilters);

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame student-main-frame-builder">
        <StudyHeader title="بناء جلسة مخصصة" />

        {!filters ? (
          <EmptyState
            title="تعذر تحميل الجلسة"
            description="أعد المحاولة."
            action={
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  startRefreshingFilters(() => {
                    router.refresh();
                  });
                }}
                disabled={refreshingFilters}
              >
                {refreshingFilters ? "جارٍ التحديث..." : "إعادة المحاولة"}
              </button>
            }
          />
        ) : null}

        {error && filters ? <p className="error-text">{error}</p> : null}

        {filters ? (
          <div className="builder-workspace builder-workspace-wizard">
            <section className="builder-form-panel builder-form-panel-wizard">
              <SessionBuilderStepper
                currentStep={currentStep}
                subjectCode={subjectCode}
                topicSelectionComplete={topicSelectionComplete}
                yearSelectionComplete={yearSelectionComplete}
                hasPreviewResults={hasPreviewResults}
                onGoToStep={goToStep}
              />

              <section className="builder-stage-card">
                <div
                  key={`builder-step-${currentStep}`}
                  className={`builder-stage-motion is-${stepMotionDirection}`}
                >
                  {currentStep === 1 ? (
                    <SessionBuilderSubjectStep
                      loading={false}
                      suggestedSubjects={suggestedSubjects}
                      subjectCode={subjectCode}
                      onSelectSubject={selectSubject}
                    />
                  ) : null}

                  {currentStep === 2 ? (
                    <SessionBuilderTopicsStep
                      selectedSubject={selectedSubject}
                      availableTopics={availableTopics}
                      topicSelectionMode={topicSelectionMode}
                      topicCodes={topicCodes}
                      chapterTopics={chapterTopics}
                      selectableSubtopicsByChapter={selectableSubtopicsByChapter}
                      topicDescendantsByCode={topicDescendantsByCode}
                      topicSelectionComplete={topicSelectionComplete}
                      onChangeTopicMode={changeTopicMode}
                      onToggleTopic={toggleTopic}
                      onBack={() => goToWizardStep(1)}
                      onNext={() => goToWizardStep(3)}
                    />
                  ) : null}

                  {currentStep === 3 ? (
                    <SessionBuilderYearsStep
                      filters={filters}
                      selectedSubject={selectedSubject}
                      topicSelectionComplete={topicSelectionComplete}
                      selectedTopicLabel={selectedTopicLabel}
                      yearMode={yearMode}
                      yearStart={yearStart}
                      yearEnd={yearEnd}
                      advancedOpen={advancedOpen}
                      subjectCode={subjectCode}
                      effectiveStreamCodes={effectiveStreamCodes}
                      availableStreams={availableStreams}
                      sessionTypes={sessionTypes}
                      yearSelectionComplete={yearSelectionComplete}
                      onBack={() => goToWizardStep(2)}
                      onNext={() => goToWizardStep(4)}
                      onReturnToTopics={() => goToWizardStep(2)}
                      onSetYearMode={setYearMode}
                      onSetYearStart={setYearStart}
                      onSetYearEnd={setYearEnd}
                      onToggleAdvanced={toggleAdvancedOpen}
                      onOpenAllStreams={openAllStreams}
                      onToggleStream={toggleStream}
                      onToggleSessionType={toggleSessionType}
                    />
                  ) : null}

                  {currentStep === 4 ? (
                    <SessionBuilderReviewStep
                      selectedSubject={selectedSubject}
                      topicSelectionComplete={topicSelectionComplete}
                      selectedTopicLabel={selectedTopicLabel}
                      builderReadyToPreview={builderReadyToPreview}
                      selectedYearsLabel={selectedYearsLabel}
                      exerciseCount={exerciseCount}
                      maxExerciseCount={maxExerciseCount}
                      advancedOpen={advancedOpen}
                      title={title}
                      previewLoading={previewLoading}
                      preview={preview}
                      selectedYears={selectedYears}
                      planText={planText}
                      zeroResultsGuidance={zeroResultsGuidance}
                      creating={creating}
                      onBack={() => goToWizardStep(3)}
                      onReturnToYears={() => goToWizardStep(3)}
                      onSelectExerciseCount={setExerciseCount}
                      onToggleAdvanced={toggleAdvancedOpen}
                      onTitleChange={setTitle}
                      onZeroResultsAction={triggerZeroResultsAction}
                      onCreateSession={createSession}
                    />
                  ) : null}
                </div>
              </section>
            </section>
          </div>
        ) : null}
      </section>
    </StudyShell>
  );
}
