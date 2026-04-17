"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  API_BASE_URL,
  type CreateSessionResponse,
  fetchJson,
  type FiltersResponse,
  parseCreateSessionResponse,
  parseSessionPreviewResponse,
  type SessionPreviewResponse,
  type SessionType,
} from "@/lib/study-api";
import {
  buildBuilderSessionKindLabel,
  buildCreateSessionRequest,
  buildPreviewSessionRequest,
  buildSessionBuilderViewModel,
  buildStoredSessionBuilderPreferences,
  isBuilderStepEnabled,
  resolveStoredSessionBuilderState,
  SESSION_BUILDER_STORAGE_KEY,
  toggleInList,
  type BuilderStep,
  type BuilderYearMode,
  type TopicSelectionMode,
} from "@/lib/session-builder";
import { buildStudentTrainingSessionRoute } from "@/lib/student-routes";
import { toggleExclusiveTopicSelection } from "@/lib/topic-taxonomy";

function readInitialYearStart(filters?: FiltersResponse) {
  return filters?.years[filters.years.length - 1] ?? null;
}

function readInitialYearEnd(filters?: FiltersResponse) {
  return filters?.years[0] ?? null;
}

export function useSessionBuilder(
  userStreamCode?: string | null,
  initialFilters?: FiltersResponse,
  initialSelection?: {
    subjectCode?: string;
    topicCodes?: string[];
  },
) {
  const router = useRouter();
  const filters = initialFilters ?? null;
  const initialTopicCodes = initialSelection?.topicCodes ?? [];
  const hasInitialSelection =
    Boolean(initialSelection?.subjectCode) || initialTopicCodes.length > 0;
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subjectCode, setSubjectCode] = useState(
    initialSelection?.subjectCode ?? "",
  );
  const [topicCodes, setTopicCodes] = useState<string[]>(initialTopicCodes);
  const [topicSelectionMode, setTopicSelectionMode] = useState<TopicSelectionMode>(
    initialTopicCodes.length > 0 ? "custom" : null,
  );
  const [selectedStreamCodes, setSelectedStreamCodes] = useState<
    string[] | null
  >(null);
  const [yearMode, setYearMode] = useState<BuilderYearMode>("5");
  const [yearStart, setYearStart] = useState<number | null>(
    readInitialYearStart(initialFilters),
  );
  const [yearEnd, setYearEnd] = useState<number | null>(
    readInitialYearEnd(initialFilters),
  );
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [exerciseCount, setExerciseCount] = useState(2);
  const [timingEnabled, setTimingEnabled] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<BuilderStep>(
    initialTopicCodes.length > 0
      ? 3
      : initialSelection?.subjectCode
        ? 2
        : 1,
  );
  const [stepMotionDirection, setStepMotionDirection] = useState<
    "forward" | "backward"
  >("forward");
  const [preview, setPreview] = useState<SessionPreviewResponse | null>(null);
  const [preferencesReady, setPreferencesReady] = useState(false);

  const viewModel = useMemo(
    () =>
      buildSessionBuilderViewModel({
        filters,
        userStreamCode,
        subjectCode,
        topicCodes,
        topicSelectionMode,
        selectedStreamCodes,
        yearMode,
        yearStart,
        yearEnd,
        sessionTypes,
        exerciseCount,
        preview,
        previewLoading,
      }),
    [
      exerciseCount,
      filters,
      preview,
      previewLoading,
      selectedStreamCodes,
      sessionTypes,
      subjectCode,
      topicCodes,
      topicSelectionMode,
      userStreamCode,
      yearEnd,
      yearMode,
      yearStart,
    ],
  );
  const suggestedSubjectCodesKey = viewModel.suggestedSubjects
    .map((subject) => subject.code)
    .join("|");
  const suggestedSubjectCodeSet = useMemo(
    () =>
      new Set(
        suggestedSubjectCodesKey ? suggestedSubjectCodesKey.split("|") : [],
      ),
    [suggestedSubjectCodesKey],
  );
  const availableStreamCodesKey = viewModel.availableStreams
    .map((stream) => stream.code)
    .join("|");
  const availableStreamCodeSet = useMemo(
    () =>
      new Set(
        availableStreamCodesKey ? availableStreamCodesKey.split("|") : [],
      ),
    [availableStreamCodesKey],
  );
  const availableTopicCodesKey = viewModel.availableTopics
    .map((topic) => topic.code)
    .join("|");
  const availableTopicCodeSet = useMemo(
    () =>
      new Set(availableTopicCodesKey ? availableTopicCodesKey.split("|") : []),
    [availableTopicCodesKey],
  );
  const effectiveStreamCodesKey = viewModel.effectiveStreamCodes.join("|");
  const effectiveStreamCodes = useMemo(
    () => (effectiveStreamCodesKey ? effectiveStreamCodesKey.split("|") : []),
    [effectiveStreamCodesKey],
  );
  const selectedYearsKey = viewModel.selectedYears.join("|");
  const selectedYears = useMemo(
    () =>
      selectedYearsKey
        ? selectedYearsKey.split("|").map((year) => Number(year))
        : [],
    [selectedYearsKey],
  );

  useEffect(() => {
    if (
      !filters ||
      preferencesReady ||
      typeof window === "undefined"
    ) {
      return;
    }

    if (hasInitialSelection) {
      setPreferencesReady(true);
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

      if (typeof restored.timingEnabled === "boolean") {
        setTimingEnabled(restored.timingEnabled);
      }
    } catch {
      return;
    } finally {
      setPreferencesReady(true);
    }
  }, [filters, hasInitialSelection, preferencesReady, userStreamCode]);

  useEffect(() => {
    if (!filters) {
      return;
    }

    setYearStart((current) => current ?? readInitialYearStart(filters));
    setYearEnd((current) => current ?? readInitialYearEnd(filters));
  }, [filters]);

  useEffect(() => {
    if (!subjectCode) {
      return;
    }

    if (suggestedSubjectCodeSet.has(subjectCode)) {
      return;
    }

    setStepMotionDirection("backward");
    setCurrentStep(1);
    setSubjectCode("");
    setSelectedStreamCodes(null);
    setTopicCodes([]);
    setTopicSelectionMode(null);
    setPreview(null);
  }, [subjectCode, suggestedSubjectCodeSet]);

  useEffect(() => {
    if (!subjectCode) {
      setSelectedStreamCodes((current) => (current === null ? current : null));
      setTopicCodes((current) => (current.length ? [] : current));
      setPreview((current) => (current === null ? current : null));
      return;
    }

    setSelectedStreamCodes((current) => {
      if (current === null) {
        return null;
      }

      const next = current.filter((streamCode) =>
        availableStreamCodeSet.has(streamCode),
      );

      return next.length === current.length ? current : next;
    });
  }, [availableStreamCodeSet, subjectCode]);

  useEffect(() => {
    setTopicCodes((current) => {
      const next = current.filter((topicCode) =>
        availableTopicCodeSet.has(topicCode),
      );

      return next.length === current.length ? current : next;
    });
  }, [availableTopicCodeSet]);

  useEffect(() => {
    if (!subjectCode && currentStep !== 1) {
      setCurrentStep(1);
      return;
    }

    if (
      (currentStep === 3 || currentStep === 4) &&
      subjectCode &&
      !viewModel.topicSelectionComplete
    ) {
      setCurrentStep(2);
      return;
    }

    if (currentStep === 4 && !viewModel.yearSelectionComplete) {
      setCurrentStep(3);
    }
  }, [
    currentStep,
    subjectCode,
    viewModel.topicSelectionComplete,
    viewModel.yearSelectionComplete,
  ]);

  useEffect(() => {
    if (!viewModel.builderReadyToPreview) {
      setPreview(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<SessionPreviewResponse>(
          `${API_BASE_URL}/study/sessions/preview`,
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
                topicSelectionMode,
                effectiveStreamCodes,
                selectedYears,
                sessionTypes,
              }),
            ),
          },
          parseSessionPreviewResponse,
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
    effectiveStreamCodes,
    selectedYears,
    sessionTypes,
    subjectCode,
    topicCodes,
    topicSelectionMode,
    viewModel.builderReadyToPreview,
  ]);

  useEffect(() => {
    if (exerciseCount > viewModel.maxExerciseCount) {
      setExerciseCount(viewModel.maxExerciseCount);
    }
  }, [exerciseCount, viewModel.maxExerciseCount]);

  useEffect(() => {
    if (!preferencesReady || !filters || typeof window === "undefined") {
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
          timingEnabled,
        }),
      ),
    );
  }, [
    exerciseCount,
    filters,
    preferencesReady,
    selectedStreamCodes,
    sessionTypes,
    subjectCode,
    topicCodes,
    topicSelectionMode,
    timingEnabled,
    yearEnd,
    yearMode,
    yearStart,
  ]);

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
      toggleInList(current ?? viewModel.defaultStreamCodes, streamCode),
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
        viewModel.topicDescendantsByCode,
        viewModel.topicAncestorsByCode,
      ),
    );
  }

  function handleGoToStep(step: BuilderStep) {
    if (
      isBuilderStepEnabled(step, {
        subjectCode,
        topicSelectionComplete: viewModel.topicSelectionComplete,
        yearSelectionComplete: viewModel.yearSelectionComplete,
      })
    ) {
      setWizardStep(step);
    }
  }

  function handleZeroResultsGuidanceAction() {
    if (!viewModel.zeroResultsGuidance?.action) {
      return;
    }

    switch (viewModel.zeroResultsGuidance.action) {
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
    if (
      creating ||
      !viewModel.builderReadyToPreview ||
      !preview?.matchingExerciseCount
    ) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const startedAt = Date.now();
      const payload = await fetchJson<CreateSessionResponse>(
        `${API_BASE_URL}/study/sessions`,
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
              topicSelectionMode,
              effectiveStreamCodes: viewModel.effectiveStreamCodes,
              selectedYears: viewModel.selectedYears,
              sessionTypes,
              exerciseCount,
              timingEnabled,
            }),
          ),
        },
        parseCreateSessionResponse,
      );

      const remainingDelay = 900 - (Date.now() - startedAt);

      if (remainingDelay > 0) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, remainingDelay),
        );
      }

      router.push(buildStudentTrainingSessionRoute(payload.id));
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

  return {
    filters,
    loading: false,
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
    suggestedSubjects: viewModel.suggestedSubjects,
    selectedSubject: viewModel.selectedSubject,
    availableStreams: viewModel.availableStreams,
    effectiveStreamCodes: viewModel.effectiveStreamCodes,
    availableTopics: viewModel.availableTopics,
    chapterTopics: viewModel.chapterTopics,
    selectableSubtopicsByChapter: viewModel.selectableSubtopicsByChapter,
    topicDescendantsByCode: viewModel.topicDescendantsByCode,
    topicSelectionComplete: viewModel.topicSelectionComplete,
    yearSelectionComplete: viewModel.yearSelectionComplete,
    builderReadyToPreview: viewModel.builderReadyToPreview,
    selectedTopicLabel: viewModel.selectedTopicLabel,
    selectedYearsLabel: viewModel.selectedYearsLabel,
    summaryText: viewModel.summaryText,
    planText: viewModel.planText,
    sessionKindLabel: buildBuilderSessionKindLabel(
      topicSelectionMode,
      topicCodes,
    ),
    selectedYears: viewModel.selectedYears,
    zeroResultsGuidance: viewModel.zeroResultsGuidance,
    maxExerciseCount: viewModel.maxExerciseCount,
    hasPreviewResults: viewModel.hasPreviewResults,
    selectSubject: handleSubjectSelect,
    setYearMode,
    setYearStart,
    setYearEnd,
    goToStep: handleGoToStep,
    goToWizardStep: setWizardStep,
    toggleAdvancedOpen: () => setAdvancedOpen((current) => !current),
    openAllStreams: () => setSelectedStreamCodes([]),
    toggleStream: handleStreamToggle,
    changeTopicMode: handleTopicModeChange,
    toggleTopic: handleTopicToggle,
    toggleSessionType: (type: SessionType) =>
      setSessionTypes((current) => toggleInList(current, type)),
    setExerciseCount,
    setTimingEnabled,
    setTitle,
    triggerZeroResultsAction: handleZeroResultsGuidanceAction,
    createSession: handleCreateSession,
  };
}
