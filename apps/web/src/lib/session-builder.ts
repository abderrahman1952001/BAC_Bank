import {
  formatSessionType,
  type FiltersResponse,
  type SessionPreviewResponse,
  type SessionType,
} from "@/lib/qbank";
import {
  buildTopicAncestorsByCode,
  buildTopicDescendantsByCode,
  buildTopicTree,
  collectSelectableTopics,
  countSelectableTopics,
  type TopicTreeNode,
} from "@/lib/topic-taxonomy";

export const SESSION_BUILDER_STORAGE_KEY = "bac-bank:session-builder:v4";

export type BuilderYearMode = "3" | "5" | "8" | "all" | "custom";
export type TopicSelectionMode = "all" | "custom" | null;
export type BuilderStep = 1 | 2 | 3 | 4;

export type StoredSessionBuilderPreferences = {
  subjectCode?: string;
  topicCodes?: string[];
  topicMode?: "all" | "custom";
  streamCodes?: string[] | null;
  streamCode?: string;
  yearMode?: BuilderYearMode;
  yearStart?: number | null;
  yearEnd?: number | null;
  sessionTypes?: SessionType[];
  exerciseCount?: number;
};

export type StreamWithFamily = {
  code: string;
  name: string;
  family?: {
    code: string;
    name: string;
  };
};

export type BuilderZeroResultsGuidanceAction =
  | "open_all_topics"
  | "open_all_streams"
  | "open_all_session_types"
  | "open_all_years"
  | null;

export type BuilderZeroResultsGuidance = {
  title: string;
  description: string;
  actionLabel: string | null;
  action: BuilderZeroResultsGuidanceAction;
};

export type SessionBuilderViewModel = {
  suggestedSubjects: FiltersResponse["subjects"];
  selectedSubject: FiltersResponse["subjects"][number] | null;
  availableStreams: FiltersResponse["streams"];
  defaultStreamCodes: string[];
  effectiveStreamCodes: string[];
  availableTopics: FiltersResponse["topics"];
  chapterTopics: TopicTreeNode<FiltersResponse["topics"][number]>[];
  selectableSubtopicsByChapter: Array<{
    chapter: TopicTreeNode<FiltersResponse["topics"][number]>;
    subtopics: TopicTreeNode<FiltersResponse["topics"][number]>[];
  }>;
  topicDescendantsByCode: Map<string, string[]>;
  topicAncestorsByCode: Map<string, string[]>;
  selectedYears: number[];
  topicSelectionComplete: boolean;
  yearSelectionComplete: boolean;
  builderReadyToPreview: boolean;
  hasPreviewResults: boolean;
  maxExerciseCount: number;
  selectedTopicLabel: string;
  selectedYearsLabel: string;
  summaryText: string;
  planText: string;
  zeroResultsGuidance: BuilderZeroResultsGuidance | null;
};

export const SESSION_BUILDER_STEP_ITEMS = [
  {
    step: 1 as BuilderStep,
    label: "المادة",
    description: "ابدأ",
  },
  {
    step: 2 as BuilderStep,
    label: "المحاور",
    description: "حدد",
  },
  {
    step: 3 as BuilderStep,
    label: "السنوات",
    description: "اختر",
  },
  {
    step: 4 as BuilderStep,
    label: "الحجم",
    description: "راجع",
  },
];

export const SESSION_BUILDER_SIZE_OPTIONS = [
  {
    value: 4,
    label: "4",
    description: "سريعة",
    helper: "خفيفة",
  },
  {
    value: 8,
    label: "8",
    description: "قياسية",
    helper: "الأكثر توازناً",
  },
  {
    value: 12,
    label: "12",
    description: "مكثفة",
    helper: "أطول",
  },
];

export function toggleInList<T>(items: T[], value: T): T[] {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

export function buildYearsFromRange(
  allYears: number[],
  mode: BuilderYearMode,
  startYear: number | null,
  endYear: number | null,
) {
  if (!allYears.length) {
    return [];
  }

  if (mode === "all") {
    return allYears;
  }

  if (mode === "custom") {
    if (!startYear || !endYear) {
      return [];
    }

    const minYear = Math.min(startYear, endYear);
    const maxYear = Math.max(startYear, endYear);

    return allYears.filter((year) => year >= minYear && year <= maxYear);
  }

  return allYears.slice(0, Number(mode));
}

export function streamMatchesUserStream(
  stream: StreamWithFamily,
  userStreamCode?: string | null,
) {
  if (!userStreamCode) {
    return true;
  }

  return (
    stream.code === userStreamCode || stream.family?.code === userStreamCode
  );
}

export function resolveDefaultStreamCodes(
  streams: StreamWithFamily[],
  userStreamCode?: string | null,
) {
  if (!userStreamCode) {
    return [];
  }

  return Array.from(
    new Set(
      streams
        .filter((stream) => streamMatchesUserStream(stream, userStreamCode))
        .map((stream) => stream.code),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function resolveStoredSessionBuilderState(
  saved: StoredSessionBuilderPreferences,
  filters: FiltersResponse,
  userStreamCode?: string | null,
) {
  const next: {
    subjectCode?: string;
    topicCodes: string[];
    topicSelectionMode?: Exclude<TopicSelectionMode, null>;
    selectedStreamCodes?: string[] | null;
    yearMode?: BuilderYearMode;
    yearStart?: number | null;
    yearEnd?: number | null;
    sessionTypes: SessionType[];
    exerciseCount?: number;
  } = {
    topicCodes: Array.isArray(saved.topicCodes) ? saved.topicCodes : [],
    sessionTypes: Array.isArray(saved.sessionTypes)
      ? saved.sessionTypes.filter((type) => filters.sessionTypes.includes(type))
      : [],
  };

  if (
    saved.subjectCode &&
    filters.subjects.some(
      (subject) =>
        subject.code === saved.subjectCode &&
        subject.streams.some((stream) =>
          streamMatchesUserStream(stream, userStreamCode),
        ),
    )
  ) {
    next.subjectCode = saved.subjectCode;
  }

  if (saved.topicMode === "all" || saved.topicMode === "custom") {
    next.topicSelectionMode = saved.topicMode;
  } else if (Array.isArray(saved.topicCodes)) {
    next.topicSelectionMode = saved.topicCodes.length > 0 ? "custom" : "all";
  }

  if (saved.streamCodes === null) {
    next.selectedStreamCodes = null;
  } else if (Array.isArray(saved.streamCodes)) {
    next.selectedStreamCodes = saved.streamCodes;
  } else if (typeof saved.streamCode === "string") {
    next.selectedStreamCodes = [saved.streamCode];
  }

  if (
    saved.yearMode &&
    ["3", "5", "8", "all", "custom"].includes(saved.yearMode)
  ) {
    next.yearMode = saved.yearMode;
  }

  if (typeof saved.yearStart === "number") {
    next.yearStart = saved.yearStart;
  }

  if (typeof saved.yearEnd === "number") {
    next.yearEnd = saved.yearEnd;
  }

  if (typeof saved.exerciseCount === "number") {
    next.exerciseCount = saved.exerciseCount;
  }

  return next;
}

export function buildPreviewSessionRequest(input: {
  subjectCode: string;
  topicCodes: string[];
  effectiveStreamCodes: string[];
  selectedYears: number[];
  sessionTypes: SessionType[];
}) {
  return {
    subjectCode: input.subjectCode,
    topicCodes: input.topicCodes,
    streamCodes: input.effectiveStreamCodes.length
      ? input.effectiveStreamCodes
      : undefined,
    years: input.selectedYears,
    sessionTypes: input.sessionTypes,
  };
}

export function buildCreateSessionRequest(input: {
  title: string;
  subjectCode: string;
  topicCodes: string[];
  effectiveStreamCodes: string[];
  selectedYears: number[];
  sessionTypes: SessionType[];
  exerciseCount: number;
}) {
  return {
    title: input.title.trim() || undefined,
    subjectCode: input.subjectCode,
    topicCodes: input.topicCodes,
    streamCodes: input.effectiveStreamCodes.length
      ? input.effectiveStreamCodes
      : undefined,
    years: input.selectedYears,
    sessionTypes: input.sessionTypes,
    exerciseCount: input.exerciseCount,
  };
}

export function buildStoredSessionBuilderPreferences(input: {
  subjectCode: string;
  topicCodes: string[];
  topicSelectionMode: TopicSelectionMode;
  selectedStreamCodes: string[] | null;
  yearMode: BuilderYearMode;
  yearStart: number | null;
  yearEnd: number | null;
  sessionTypes: SessionType[];
  exerciseCount: number;
}): StoredSessionBuilderPreferences {
  return {
    subjectCode: input.subjectCode || undefined,
    topicCodes: input.topicCodes,
    topicMode: input.topicSelectionMode ?? undefined,
    streamCodes: input.selectedStreamCodes,
    streamCode:
      input.selectedStreamCodes && input.selectedStreamCodes.length === 1
        ? input.selectedStreamCodes[0]
        : undefined,
    yearMode: input.yearMode,
    yearStart: input.yearStart,
    yearEnd: input.yearEnd,
    sessionTypes: input.sessionTypes,
    exerciseCount: input.exerciseCount,
  };
}

export function buildSelectedTopicLabel(input: {
  selectedSubjectName: string | null;
  topicSelectionComplete: boolean;
  topicSelectionMode: TopicSelectionMode;
  topicCodes: string[];
  topicLookup: ReadonlyMap<string, { name: string }>;
}) {
  if (!input.selectedSubjectName) {
    return "اختر المحاور التي تريد التركيز عليها";
  }

  if (!input.topicSelectionComplete) {
    return `اختر المحاور داخل ${input.selectedSubjectName}`;
  }

  if (input.topicSelectionMode === "all") {
    return "كل فصول المادة";
  }

  if (input.topicCodes.length === 1) {
    return input.topicLookup.get(input.topicCodes[0])?.name ?? "محور واحد";
  }

  return `${input.topicCodes.length} محاور`;
}

export function buildSelectedYearsLabel(selectedYears: number[]) {
  if (!selectedYears.length) {
    return "آخر السنوات المتاحة";
  }

  return selectedYears.length === 1
    ? `سنة ${selectedYears[0]}`
    : `بين ${selectedYears[selectedYears.length - 1]} و ${selectedYears[0]}`;
}

export function buildBuilderSummaryText(input: {
  selectedSubjectName: string | null;
  topicSelectionComplete: boolean;
  yearSelectionComplete: boolean;
  selectedTopicLabel: string;
  selectedYearsLabel: string;
}) {
  if (!input.selectedSubjectName) {
    return "اختر مادة.";
  }

  if (!input.topicSelectionComplete) {
    return `${input.selectedSubjectName} · اختر المحاور.`;
  }

  if (!input.yearSelectionComplete) {
    return `${input.selectedSubjectName} · ${input.selectedTopicLabel}.`;
  }

  return `${input.selectedSubjectName} · ${input.selectedTopicLabel} · ${input.selectedYearsLabel}.`;
}

export function buildBuilderPlanText(input: {
  selectedSubjectName: string | null;
  topicSelectionComplete: boolean;
  yearSelectionComplete: boolean;
  selectedTopicLabel: string;
  selectedYearsLabel: string;
  effectiveStreamCodes: string[];
  availableStreams: Array<{ code: string; name: string }>;
  previewMatchingExerciseCount?: number;
  exerciseCount: number;
  sessionTypes: SessionType[];
}) {
  if (!input.selectedSubjectName) {
    return "اختر مادة أولاً.";
  }

  if (!input.topicSelectionComplete) {
    return `${input.selectedSubjectName} · اختر المحاور.`;
  }

  if (!input.yearSelectionComplete) {
    return `${input.selectedSubjectName} · اختر السنوات.`;
  }

  const selectedStreamLabels = input.effectiveStreamCodes
    .map(
      (streamCode) =>
        input.availableStreams.find((item) => item.code === streamCode)?.name,
    )
    .filter((value): value is string => Boolean(value));
  const streamLabel = !input.effectiveStreamCodes.length
    ? "كل الشعب المتاحة"
    : selectedStreamLabels.length === 1
      ? selectedStreamLabels[0]
      : selectedStreamLabels.length === 2
        ? selectedStreamLabels.join(" + ")
        : `${selectedStreamLabels.length} شعب مختارة`;
  const plannedExerciseCount = Math.min(
    input.exerciseCount,
    input.previewMatchingExerciseCount ?? input.exerciseCount,
  );
  const sessionTypeLabel = input.sessionTypes.length
    ? ` · ${input.sessionTypes.map((type) => formatSessionType(type)).join(" + ")}`
    : "";

  return `${plannedExerciseCount} تمارين · ${input.selectedTopicLabel} · ${streamLabel} · ${input.selectedYearsLabel}${sessionTypeLabel}.`;
}

export function buildZeroResultsGuidance(input: {
  builderReadyToPreview: boolean;
  previewLoading: boolean;
  previewMatchingExerciseCount?: number;
  topicSelectionMode: TopicSelectionMode;
  topicCodesLength: number;
  effectiveStreamCodesLength: number;
  sessionTypesLength: number;
  totalYearsCount: number;
  selectedYearsLength: number;
  yearMode: BuilderYearMode;
}): BuilderZeroResultsGuidance | null {
  if (
    !input.builderReadyToPreview ||
    input.previewLoading ||
    input.previewMatchingExerciseCount
  ) {
    return null;
  }

  if (input.topicSelectionMode === "custom" && input.topicCodesLength > 0) {
    return {
      title: "لا توجد تمارين بهذه المحاور",
      description: "وسّع الاختيار أو افتح كل المحاور.",
      actionLabel: "فتح كل المحاور",
      action: "open_all_topics",
    };
  }

  if (input.effectiveStreamCodesLength > 0) {
    return {
      title: "لا توجد نتائج لهذه الشعبة",
      description: "جرّب كل الشعب.",
      actionLabel: "كل الشعب",
      action: "open_all_streams",
    };
  }

  if (input.sessionTypesLength > 0) {
    return {
      title: "نوع الدورة ضيق النتائج",
      description: "ألغِ تقييد الدورة الحالية.",
      actionLabel: "كل الدورات",
      action: "open_all_session_types",
    };
  }

  if (
    input.totalYearsCount > 0 &&
    (input.yearMode !== "all" ||
      input.selectedYearsLength < input.totalYearsCount)
  ) {
    return {
      title: "الفترة الزمنية ضيقة",
      description: "وسّع مجال السنوات.",
      actionLabel: "كل السنوات",
      action: "open_all_years",
    };
  }

  return {
    title: "لا توجد نتائج حالياً",
    description: "غيّر المادة أو وسّع النطاق.",
    actionLabel: null,
    action: null,
  };
}

export function buildSessionBuilderViewModel(input: {
  filters: FiltersResponse | null;
  userStreamCode?: string | null;
  subjectCode: string;
  topicCodes: string[];
  topicSelectionMode: TopicSelectionMode;
  selectedStreamCodes: string[] | null;
  yearMode: BuilderYearMode;
  yearStart: number | null;
  yearEnd: number | null;
  sessionTypes: SessionType[];
  exerciseCount: number;
  preview: SessionPreviewResponse | null;
  previewLoading: boolean;
}): SessionBuilderViewModel {
  const suggestedSubjects = input.filters
    ? input.filters.subjects.filter((subject) =>
        subject.streams.some((stream) =>
          streamMatchesUserStream(stream, input.userStreamCode),
        ),
      )
    : [];

  const selectedSubject =
    input.filters?.subjects.find(
      (subject) => subject.code === input.subjectCode,
    ) ?? null;

  const availableStreams =
    input.filters && input.subjectCode
      ? input.filters.streams.filter((stream) =>
          stream.subjectCodes.includes(input.subjectCode),
        )
      : [];

  const defaultStreamCodes = resolveDefaultStreamCodes(
    availableStreams,
    input.userStreamCode,
  );
  const effectiveStreamCodes =
    input.selectedStreamCodes === null
      ? defaultStreamCodes
      : input.selectedStreamCodes;

  const availableTopics =
    input.filters && input.subjectCode
      ? input.filters.topics.filter((topic) => {
          if (topic.subject.code !== input.subjectCode) {
            return false;
          }

          if (!effectiveStreamCodes.length) {
            return true;
          }

          return effectiveStreamCodes.some((streamCode) =>
            topic.streamCodes.includes(streamCode),
          );
        })
      : [];

  const topicTree = buildTopicTree(availableTopics);
  const topicLookup = new Map(availableTopics.map((topic) => [topic.code, topic]));
  const chapterTopics = topicTree.filter(
    (topic) => topic.isSelectable || countSelectableTopics(topic.children) > 0,
  );
  const selectableSubtopicsByChapter = chapterTopics.map((chapter) => ({
    chapter,
    subtopics: collectSelectableTopics(chapter.children),
  }));
  const topicDescendantsByCode = buildTopicDescendantsByCode(topicTree);
  const topicAncestorsByCode = buildTopicAncestorsByCode(topicTree);
  const selectedYears = buildYearsFromRange(
    input.filters?.years ?? [],
    input.yearMode,
    input.yearStart,
    input.yearEnd,
  );
  const topicSelectionComplete =
    input.topicSelectionMode === "all" || input.topicCodes.length > 0;
  const yearSelectionComplete =
    input.yearMode !== "custom" ||
    (input.yearStart !== null && input.yearEnd !== null);
  const builderReadyToPreview =
    Boolean(input.subjectCode) &&
    topicSelectionComplete &&
    yearSelectionComplete;
  const selectedTopicLabel = buildSelectedTopicLabel({
    selectedSubjectName: selectedSubject?.name ?? null,
    topicSelectionComplete,
    topicSelectionMode: input.topicSelectionMode,
    topicCodes: input.topicCodes,
    topicLookup,
  });
  const selectedYearsLabel = buildSelectedYearsLabel(selectedYears);
  const summaryText = buildBuilderSummaryText({
    selectedSubjectName: selectedSubject?.name ?? null,
    topicSelectionComplete,
    yearSelectionComplete,
    selectedTopicLabel,
    selectedYearsLabel,
  });
  const planText = buildBuilderPlanText({
    selectedSubjectName: selectedSubject?.name ?? null,
    topicSelectionComplete,
    yearSelectionComplete,
    selectedTopicLabel,
    selectedYearsLabel,
    effectiveStreamCodes,
    availableStreams,
    previewMatchingExerciseCount: input.preview?.matchingExerciseCount,
    exerciseCount: input.exerciseCount,
    sessionTypes: input.sessionTypes,
  });
  const zeroResultsGuidance = buildZeroResultsGuidance({
    builderReadyToPreview,
    previewLoading: input.previewLoading,
    previewMatchingExerciseCount: input.preview?.matchingExerciseCount,
    topicSelectionMode: input.topicSelectionMode,
    topicCodesLength: input.topicCodes.length,
    effectiveStreamCodesLength: effectiveStreamCodes.length,
    sessionTypesLength: input.sessionTypes.length,
    totalYearsCount: input.filters?.years.length ?? 0,
    selectedYearsLength: selectedYears.length,
    yearMode: input.yearMode,
  });

  return {
    suggestedSubjects,
    selectedSubject,
    availableStreams,
    defaultStreamCodes,
    effectiveStreamCodes,
    availableTopics,
    chapterTopics,
    selectableSubtopicsByChapter,
    topicDescendantsByCode,
    topicAncestorsByCode,
    selectedYears,
    topicSelectionComplete,
    yearSelectionComplete,
    builderReadyToPreview,
    hasPreviewResults: Boolean(input.preview?.matchingExerciseCount),
    maxExerciseCount: Math.max(
      1,
      Math.min(20, input.preview?.maxSelectableExercises ?? 20),
    ),
    selectedTopicLabel,
    selectedYearsLabel,
    summaryText,
    planText,
    zeroResultsGuidance,
  };
}

export function isBuilderStepCompleted(
  step: BuilderStep,
  input: {
    subjectCode: string;
    topicSelectionComplete: boolean;
    yearSelectionComplete: boolean;
    hasPreviewResults: boolean;
  },
) {
  if (step === 1) {
    return Boolean(input.subjectCode);
  }

  if (step === 2) {
    return input.topicSelectionComplete;
  }

  if (step === 3) {
    return input.yearSelectionComplete;
  }

  return input.hasPreviewResults;
}

export function isBuilderStepEnabled(
  step: BuilderStep,
  input: {
    subjectCode: string;
    topicSelectionComplete: boolean;
    yearSelectionComplete: boolean;
  },
) {
  if (step === 1) {
    return true;
  }

  if (step === 2) {
    return Boolean(input.subjectCode);
  }

  if (step === 3) {
    return Boolean(input.subjectCode) && input.topicSelectionComplete;
  }

  return (
    Boolean(input.subjectCode) &&
    input.topicSelectionComplete &&
    input.yearSelectionComplete
  );
}
