"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppNavbar } from "@/components/app-navbar";
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
  SessionBuilderSkeleton,
  StudyHeader,
  StudyShell,
} from "@/components/study-shell";
import {
  API_BASE_URL,
  CreateSessionResponse,
  fetchJson,
  FiltersResponse,
  SessionPreviewResponse,
  SessionType,
} from "@/lib/qbank";
import {
  buildBuilderPlanText,
  buildBuilderSummaryText,
  buildCreateSessionRequest,
  buildPreviewSessionRequest,
  buildSelectedTopicLabel,
  buildSelectedYearsLabel,
  buildStoredSessionBuilderPreferences,
  buildYearsFromRange,
  buildZeroResultsGuidance,
  type BuilderStep,
  type BuilderYearMode,
  isBuilderStepEnabled,
  resolveDefaultStreamCodes,
  resolveStoredSessionBuilderState,
  SESSION_BUILDER_STORAGE_KEY,
  streamMatchesUserStream,
  toggleInList,
  type TopicSelectionMode,
} from "@/lib/session-builder";
import {
  buildTopicAncestorsByCode,
  buildTopicDescendantsByCode,
  buildTopicTree,
  collectSelectableTopics,
  countSelectableTopics,
  toggleExclusiveTopicSelection,
} from "@/lib/topic-taxonomy";

export function SessionBuilder() {
  const router = useRouter();
  const { user } = useAuthSession();

  const [filters, setFilters] = useState<FiltersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [topicCodes, setTopicCodes] = useState<string[]>([]);
  const [topicSelectionMode, setTopicSelectionMode] =
    useState<TopicSelectionMode>(null);
  const [selectedStreamCodes, setSelectedStreamCodes] = useState<
    string[] | null
  >(null);
  const [yearMode, setYearMode] = useState<BuilderYearMode>("5");
  const [yearStart, setYearStart] = useState<number | null>(null);
  const [yearEnd, setYearEnd] = useState<number | null>(null);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [exerciseCount, setExerciseCount] = useState(8);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<BuilderStep>(1);
  const [stepMotionDirection, setStepMotionDirection] = useState<
    "forward" | "backward"
  >("forward");

  const [preview, setPreview] = useState<SessionPreviewResponse | null>(null);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const userStreamCode = user?.stream?.code ?? null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadFilters() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<FiltersResponse>(
          `${API_BASE_URL}/qbank/filters`,
          {
            signal: controller.signal,
          },
        );

        setFilters(payload);
        setYearStart(payload.years[payload.years.length - 1] ?? null);
        setYearEnd(payload.years[0] ?? null);
      } catch (loadError) {
        if (!(loadError instanceof Error) || loadError.name !== "AbortError") {
          setError("تعذر تحميل خيارات الجلسة.");
        }
      } finally {
        setLoading(false);
      }
    }

    void loadFilters();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (
      loading ||
      !filters ||
      preferencesReady ||
      typeof window === "undefined"
    ) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(SESSION_BUILDER_STORAGE_KEY);

      if (!raw) {
        return;
      }

      const restored = resolveStoredSessionBuilderState(
        JSON.parse(raw),
        filters,
        userStreamCode,
      );

      if (restored.subjectCode) {
        setSubjectCode(restored.subjectCode);
      }

      setTopicCodes(restored.topicCodes);

      if (restored.topicSelectionMode) {
        setTopicSelectionMode(restored.topicSelectionMode);
      }

      if ("selectedStreamCodes" in restored) {
        setSelectedStreamCodes(restored.selectedStreamCodes ?? null);
      }

      if (restored.yearMode) {
        setYearMode(restored.yearMode);
      }

      if (typeof restored.yearStart === "number") {
        setYearStart(restored.yearStart);
      }

      if (typeof restored.yearEnd === "number") {
        setYearEnd(restored.yearEnd);
      }

      setSessionTypes(restored.sessionTypes);

      if (typeof restored.exerciseCount === "number") {
        setExerciseCount(restored.exerciseCount);
      }
    } catch {
      return;
    } finally {
      setPreferencesReady(true);
    }
  }, [filters, loading, preferencesReady, userStreamCode]);

  const suggestedSubjects = useMemo(() => {
    if (!filters) {
      return [];
    }

    return filters.subjects.filter((subject) =>
      subject.streams.some((stream) =>
        streamMatchesUserStream(stream, userStreamCode),
      ),
    );
  }, [filters, userStreamCode]);

  const selectedSubject = useMemo(
    () =>
      filters?.subjects.find((subject) => subject.code === subjectCode) ?? null,
    [filters, subjectCode],
  );

  const availableStreams = useMemo(() => {
    if (!filters || !subjectCode) {
      return [];
    }

    return filters.streams.filter((stream) =>
      stream.subjectCodes.includes(subjectCode),
    );
  }, [filters, subjectCode]);

  const defaultStreamCodes = useMemo(
    () => resolveDefaultStreamCodes(availableStreams, userStreamCode),
    [availableStreams, userStreamCode],
  );

  const effectiveStreamCodes = useMemo(
    () =>
      selectedStreamCodes === null ? defaultStreamCodes : selectedStreamCodes,
    [defaultStreamCodes, selectedStreamCodes],
  );

  const availableTopics = useMemo(() => {
    if (!filters || !subjectCode) {
      return [];
    }

    return filters.topics.filter((topic) => {
      if (topic.subject.code !== subjectCode) {
        return false;
      }

      if (!effectiveStreamCodes.length) {
        return true;
      }

      return effectiveStreamCodes.some((streamCode) =>
        topic.streamCodes.includes(streamCode),
      );
    });
  }, [effectiveStreamCodes, filters, subjectCode]);

  const topicTree = useMemo(
    () => buildTopicTree(availableTopics),
    [availableTopics],
  );

  const topicLookup = useMemo(
    () => new Map(availableTopics.map((topic) => [topic.code, topic])),
    [availableTopics],
  );

  const chapterTopics = useMemo(
    () =>
      topicTree.filter(
        (topic) =>
          topic.isSelectable || countSelectableTopics(topic.children) > 0,
      ),
    [topicTree],
  );

  const selectableSubtopicsByChapter = useMemo(
    () =>
      chapterTopics.map((chapter) => ({
        chapter,
        subtopics: collectSelectableTopics(chapter.children),
      })),
    [chapterTopics],
  );

  const topicDescendantsByCode = useMemo(() => {
    return buildTopicDescendantsByCode(topicTree);
  }, [topicTree]);

  const topicAncestorsByCode = useMemo(() => {
    return buildTopicAncestorsByCode(topicTree);
  }, [topicTree]);

  useEffect(() => {
    if (!subjectCode) {
      return;
    }

    if (suggestedSubjects.some((subject) => subject.code === subjectCode)) {
      return;
    }

    setStepMotionDirection("backward");
    setCurrentStep(1);
    setSubjectCode("");
    setSelectedStreamCodes(null);
    setTopicCodes([]);
    setTopicSelectionMode(null);
    setPreview(null);
  }, [subjectCode, suggestedSubjects]);

  useEffect(() => {
    if (!subjectCode) {
      setSelectedStreamCodes(null);
      setTopicCodes([]);
      setPreview(null);
      return;
    }

    const availableStreamCodes = new Set(
      availableStreams.map((stream) => stream.code),
    );

    setSelectedStreamCodes((current) => {
      if (current === null) {
        return null;
      }

      const next = current.filter((streamCode) =>
        availableStreamCodes.has(streamCode),
      );

      return next.length === current.length ? current : next;
    });
  }, [availableStreams, subjectCode]);

  useEffect(() => {
    setTopicCodes((current) =>
      current.filter((topicCode) =>
        availableTopics.some((topic) => topic.code === topicCode),
      ),
    );
  }, [availableTopics]);

  const selectedYears = useMemo(
    () =>
      buildYearsFromRange(filters?.years ?? [], yearMode, yearStart, yearEnd),
    [filters?.years, yearEnd, yearMode, yearStart],
  );

  const topicSelectionComplete =
    topicSelectionMode === "all" || topicCodes.length > 0;
  const yearSelectionComplete =
    yearMode !== "custom" || (yearStart !== null && yearEnd !== null);
  const builderReadyToPreview =
    Boolean(subjectCode) && topicSelectionComplete && yearSelectionComplete;

  useEffect(() => {
    if (!subjectCode && currentStep !== 1) {
      setCurrentStep(1);
      return;
    }

    if (
      (currentStep === 3 || currentStep === 4) &&
      subjectCode &&
      !topicSelectionComplete
    ) {
      setCurrentStep(2);
      return;
    }

    if (currentStep === 4 && !yearSelectionComplete) {
      setCurrentStep(3);
    }
  }, [currentStep, subjectCode, topicSelectionComplete, yearSelectionComplete]);

  useEffect(() => {
    if (!builderReadyToPreview) {
      setPreview(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<SessionPreviewResponse>(
          `${API_BASE_URL}/qbank/sessions/preview`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify(
              buildPreviewSessionRequest({
                subjectCode,
                topicCodes,
                effectiveStreamCodes,
                selectedYears,
                sessionTypes,
              }),
            ),
          },
        );

        setPreview(payload);
      } catch (previewError) {
        if (
          !(previewError instanceof Error) ||
          previewError.name !== "AbortError"
        ) {
          setPreview(null);
          setError(
            previewError instanceof Error
              ? previewError.message
              : "تعذر بناء معاينة الجلسة.",
          );
        }
      } finally {
        setPreviewLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    builderReadyToPreview,
    effectiveStreamCodes,
    selectedYears,
    sessionTypes,
    subjectCode,
    topicCodes,
  ]);

  const maxExerciseCount = useMemo(
    () => Math.max(1, Math.min(20, preview?.maxSelectableExercises ?? 20)),
    [preview],
  );

  useEffect(() => {
    if (exerciseCount > maxExerciseCount) {
      setExerciseCount(maxExerciseCount);
    }
  }, [exerciseCount, maxExerciseCount]);

  useEffect(() => {
    if (!preferencesReady || loading || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SESSION_BUILDER_STORAGE_KEY,
      JSON.stringify(
        buildStoredSessionBuilderPreferences({
          subjectCode,
          topicCodes,
          topicSelectionMode,
          selectedStreamCodes,
          yearMode,
          yearStart,
          yearEnd,
          sessionTypes,
          exerciseCount,
        }),
      ),
    );
  }, [
    exerciseCount,
    loading,
    preferencesReady,
    sessionTypes,
    selectedStreamCodes,
    subjectCode,
    topicCodes,
    topicSelectionMode,
    yearEnd,
    yearMode,
    yearStart,
  ]);

  const selectedTopicLabel = useMemo(
    () =>
      buildSelectedTopicLabel({
        selectedSubjectName: selectedSubject?.name ?? null,
        topicSelectionComplete,
        topicSelectionMode,
        topicCodes,
        topicLookup,
      }),
    [
      selectedSubject,
      topicCodes,
      topicLookup,
      topicSelectionComplete,
      topicSelectionMode,
    ],
  );

  const selectedYearsLabel = useMemo(
    () => buildSelectedYearsLabel(selectedYears),
    [selectedYears],
  );

  const summaryText = useMemo(
    () =>
      buildBuilderSummaryText({
        selectedSubjectName: selectedSubject?.name ?? null,
        topicSelectionComplete,
        yearSelectionComplete,
        selectedTopicLabel,
        selectedYearsLabel,
      }),
    [
      selectedSubject,
      selectedTopicLabel,
      selectedYearsLabel,
      topicSelectionComplete,
      yearSelectionComplete,
    ],
  );

  const planText = useMemo(
    () =>
      buildBuilderPlanText({
        selectedSubjectName: selectedSubject?.name ?? null,
        topicSelectionComplete,
        yearSelectionComplete,
        selectedTopicLabel,
        selectedYearsLabel,
        effectiveStreamCodes,
        availableStreams,
        previewMatchingExerciseCount: preview?.matchingExerciseCount,
        exerciseCount,
        sessionTypes,
      }),
    [
      availableStreams,
      exerciseCount,
      preview?.matchingExerciseCount,
      selectedSubject,
      selectedTopicLabel,
      selectedYearsLabel,
      sessionTypes,
      effectiveStreamCodes,
      topicSelectionComplete,
      yearSelectionComplete,
    ],
  );

  const zeroResultsGuidance = useMemo(
    () =>
      buildZeroResultsGuidance({
        builderReadyToPreview,
        previewLoading,
        previewMatchingExerciseCount: preview?.matchingExerciseCount,
        topicSelectionMode,
        topicCodesLength: topicCodes.length,
        effectiveStreamCodesLength: effectiveStreamCodes.length,
        sessionTypesLength: sessionTypes.length,
        totalYearsCount: filters?.years.length ?? 0,
        selectedYearsLength: selectedYears.length,
        yearMode,
      }),
    [
      builderReadyToPreview,
      filters?.years.length,
      preview?.matchingExerciseCount,
      previewLoading,
      sessionTypes.length,
      selectedYears.length,
      effectiveStreamCodes.length,
      topicCodes.length,
      topicSelectionMode,
      yearMode,
    ],
  );

  function setWizardStep(step: BuilderStep) {
    if (step === currentStep) {
      return;
    }

    setStepMotionDirection(step > currentStep ? "forward" : "backward");
    setCurrentStep(step);
  }

  function handleSubjectSelect(nextSubjectCode: string) {
    setSubjectCode(nextSubjectCode);
    setTopicCodes([]);
    setTopicSelectionMode(null);
    setSelectedStreamCodes(null);
    setPreview(null);
    setWizardStep(2);
  }

  function handleStreamToggle(streamCode: string) {
    setSelectedStreamCodes((current) =>
      toggleInList(current ?? defaultStreamCodes, streamCode),
    );
  }

  function handleTopicModeChange(mode: Exclude<TopicSelectionMode, null>) {
    setTopicSelectionMode(mode);

    if (mode === "all") {
      setTopicCodes([]);
    }
  }

  function handleTopicToggle(topicCode: string) {
    setTopicSelectionMode("custom");
    setTopicCodes((current) =>
      toggleExclusiveTopicSelection(
        current,
        topicCode,
        topicDescendantsByCode,
        topicAncestorsByCode,
      ),
    );
  }

  function handleGoToStep(step: BuilderStep) {
    if (
      isBuilderStepEnabled(step, {
        subjectCode,
        topicSelectionComplete,
        yearSelectionComplete,
      })
    ) {
      setWizardStep(step);
    }
  }

  function handleZeroResultsGuidanceAction() {
    if (!zeroResultsGuidance?.action) {
      return;
    }

    switch (zeroResultsGuidance.action) {
      case "open_all_topics":
        setTopicCodes([]);
        setTopicSelectionMode("all");
        return;
      case "open_all_streams":
        setSelectedStreamCodes([]);
        return;
      case "open_all_session_types":
        setSessionTypes([]);
        return;
      case "open_all_years":
        setYearMode("all");
        return;
      default:
        return;
    }
  }

  async function handleCreateSession() {
    if (creating || !builderReadyToPreview || !preview?.matchingExerciseCount) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const startedAt = Date.now();
      const payload = await fetchJson<CreateSessionResponse>(
        `${API_BASE_URL}/qbank/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildCreateSessionRequest({
              title,
              subjectCode,
              topicCodes,
              effectiveStreamCodes,
              selectedYears,
              sessionTypes,
              exerciseCount,
            }),
          ),
        },
      );

      const remainingDelay = 900 - (Date.now() - startedAt);

      if (remainingDelay > 0) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, remainingDelay),
        );
      }

      router.push(`/app/sessions/${payload.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر إنشاء الجلسة.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <StudyShell>
      <AppNavbar />

      <StudyHeader eyebrow="جلسة مخصصة" title="جلسة مخصصة" />

      {error && !filters ? (
        <EmptyState
          title="تعذر تحميل منشئ الجلسات"
          description={error}
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              إعادة المحاولة
            </button>
          }
        />
      ) : null}

      {error && filters ? <p className="error-text">{error}</p> : null}

      {loading && !filters ? <SessionBuilderSkeleton /> : null}

      {filters ? (
        <div className="builder-workspace builder-workspace-wizard">
          <section className="builder-form-panel builder-form-panel-wizard">
            <div className="builder-wizard-lead">
              <p className="page-kicker">Builder</p>
              <h2>أربع خطوات فقط</h2>
              <p>{summaryText}</p>
            </div>

            <SessionBuilderStepper
              currentStep={currentStep}
              subjectCode={subjectCode}
              topicSelectionComplete={topicSelectionComplete}
              yearSelectionComplete={yearSelectionComplete}
              hasPreviewResults={Boolean(preview?.matchingExerciseCount)}
              onGoToStep={handleGoToStep}
            />

            <section className="builder-stage-card">
              <div
                key={`builder-step-${currentStep}`}
                className={`builder-stage-motion is-${stepMotionDirection}`}
              >
                {currentStep === 1 ? (
                  <SessionBuilderSubjectStep
                    loading={loading}
                    suggestedSubjects={suggestedSubjects}
                    subjectCode={subjectCode}
                    onSelectSubject={handleSubjectSelect}
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
                    onChangeTopicMode={handleTopicModeChange}
                    onToggleTopic={handleTopicToggle}
                    onBack={() => setWizardStep(1)}
                    onNext={() => setWizardStep(3)}
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
                    onBack={() => setWizardStep(2)}
                    onNext={() => setWizardStep(4)}
                    onReturnToTopics={() => setWizardStep(2)}
                    onSetYearMode={setYearMode}
                    onSetYearStart={setYearStart}
                    onSetYearEnd={setYearEnd}
                    onToggleAdvanced={() =>
                      setAdvancedOpen((current) => !current)
                    }
                    onOpenAllStreams={() => setSelectedStreamCodes([])}
                    onToggleStream={handleStreamToggle}
                    onToggleSessionType={(type) =>
                      setSessionTypes((current) => toggleInList(current, type))
                    }
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
                    onBack={() => setWizardStep(3)}
                    onReturnToYears={() => setWizardStep(3)}
                    onSelectExerciseCount={setExerciseCount}
                    onToggleAdvanced={() =>
                      setAdvancedOpen((current) => !current)
                    }
                    onTitleChange={setTitle}
                    onZeroResultsAction={handleZeroResultsGuidanceAction}
                    onCreateSession={handleCreateSession}
                  />
                ) : null}
              </div>
            </section>
          </section>
        </div>
      ) : null}
    </StudyShell>
  );
}
