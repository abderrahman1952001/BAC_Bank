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
import type { FiltersResponse } from "@/lib/study-api";
import { useSessionBuilder } from "@/lib/use-session-builder";

export function SessionBuilder({
  initialFilters,
  initialSelection,
}: {
  initialFilters?: FiltersResponse;
  initialSelection?: {
    subjectCode?: string;
    topicCodes?: string[];
  };
}) {
  const router = useRouter();
  const [refreshingFilters, startRefreshingFilters] = useTransition();
  const { user } = useAuthSession();
  const userStreamCode = user?.stream?.code ?? null;
  const studyEntitlements = user?.studyEntitlements ?? null;
  const drillQuota = studyEntitlements?.quotas.drillStarts ?? null;
  const simulationQuota = studyEntitlements?.quotas.simulationStarts ?? null;
  const drillStartBlocked = Boolean(drillQuota?.exhausted);
  const drillStartBlockedMessage = drillQuota?.exhausted
    ? `وصلت إلى الحد الشهري لجلسات التدريب. يتجدد في ${new Date(
        drillQuota.resetsAt,
      ).toLocaleDateString("ar-DZ")}.`
    : null;
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
    timingEnabled,
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
    sessionKindLabel,
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
    setTimingEnabled,
    setTitle,
    triggerZeroResultsAction,
    createSession,
  } = useSessionBuilder(userStreamCode, initialFilters, initialSelection);

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame student-main-frame-builder">
        <StudyHeader title="إعداد جلسة تدريب" />

        {studyEntitlements ? (
          <section className="builder-preview-card builder-preview-summary-card">
            <h3>الخطة الحالية</h3>
            <p>
              {studyEntitlements.tier === "PREMIUM"
                ? "Premium · تدريب غير محدود مع طبقات الدعم المتقدمة."
                : "Free · التدريب يُدار بحصص شهرية منفصلة للدريل والمحاكاة."}
            </p>
            <div className="study-meta-row">
              {drillQuota ? (
                <span className="study-meta-pill">
                  <strong>الدريل</strong>
                  <span>
                    {drillQuota.monthlyLimit === null
                      ? "غير محدود"
                      : `${drillQuota.remaining}/${drillQuota.monthlyLimit}`}
                  </span>
                </span>
              ) : null}
              {simulationQuota ? (
                <span className="study-meta-pill">
                  <strong>المحاكاة</strong>
                  <span>
                    {simulationQuota.monthlyLimit === null
                      ? "غير محدود"
                      : `${simulationQuota.remaining}/${simulationQuota.monthlyLimit}`}
                  </span>
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

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
                      timingEnabled={timingEnabled}
                      previewLoading={previewLoading}
                      preview={preview}
                      selectedYears={selectedYears}
                      planText={planText}
                      sessionKindLabel={sessionKindLabel}
                      zeroResultsGuidance={zeroResultsGuidance}
                      startBlocked={drillStartBlocked}
                      startBlockedMessage={drillStartBlockedMessage}
                      creating={creating}
                      onBack={() => goToWizardStep(3)}
                      onReturnToYears={() => goToWizardStep(3)}
                      onSelectExerciseCount={setExerciseCount}
                      onSetTimingEnabled={setTimingEnabled}
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
