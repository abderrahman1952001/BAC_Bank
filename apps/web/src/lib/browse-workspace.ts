import type { CatalogResponse } from "@/lib/qbank";

export type BrowseInitialSearch = {
  stream?: string;
  subject?: string;
  year?: string;
  examId?: string;
  sujet?: string;
};

export type BrowseSelectionState = {
  selectedStreamCode: string;
  selectedSubjectCode: string;
  selectedYear: number | null;
  selectedExamId: string | null;
  selectedSujetNumber: number | null;
};

export type BrowseStream = CatalogResponse["streams"][number];
export type BrowseSubject = BrowseStream["subjects"][number];
export type BrowseYearEntry = BrowseSubject["years"][number];
export type BrowseSujet = BrowseYearEntry["sujets"][number];

export function normalizeBrowseCode(value: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

export function buildInitialBrowseSelection(
  initialSearch?: BrowseInitialSearch,
): BrowseSelectionState {
  return {
    selectedStreamCode: normalizeBrowseCode(initialSearch?.stream ?? null),
    selectedSubjectCode: normalizeBrowseCode(initialSearch?.subject ?? null),
    selectedYear: initialSearch?.year ? Number(initialSearch.year) : null,
    selectedExamId: initialSearch?.examId ?? null,
    selectedSujetNumber: initialSearch?.sujet
      ? Number(initialSearch.sujet)
      : null,
  };
}

export function findBrowseStream(
  catalog: CatalogResponse | null,
  selectedStreamCode: string,
): BrowseStream | null {
  return (
    catalog?.streams.find((item) => item.code === selectedStreamCode) ?? null
  );
}

export function findBrowseSubject(
  stream: BrowseStream | null,
  selectedSubjectCode: string,
): BrowseSubject | null {
  return (
    stream?.subjects.find((item) => item.code === selectedSubjectCode) ?? null
  );
}

export function findBrowseYearEntry(
  subject: BrowseSubject | null,
  selectedYear: number | null,
): BrowseYearEntry | null {
  return (
    subject?.years.find((item) => item.year === selectedYear) ?? null
  );
}

export function reconcileBrowseSubjectCode(
  stream: BrowseStream | null,
  selectedSubjectCode: string,
): string {
  if (!stream) {
    return "";
  }

  return selectedSubjectCode &&
    stream.subjects.some((item) => item.code === selectedSubjectCode)
    ? selectedSubjectCode
    : "";
}

export function reconcileBrowseYear(
  subject: BrowseSubject | null,
  selectedYear: number | null,
): number | null {
  if (!subject) {
    return null;
  }

  return selectedYear && subject.years.some((item) => item.year === selectedYear)
    ? selectedYear
    : null;
}

export function reconcileBrowseSujetSelection(
  yearEntry: BrowseYearEntry | null,
  selectedExamId: string | null,
  selectedSujetNumber: number | null,
) {
  if (!yearEntry) {
    return {
      selectedExamId: null,
      selectedSujetNumber: null,
    };
  }

  const nextExamId =
    selectedExamId &&
    yearEntry.sujets.some((item) => item.examId === selectedExamId)
      ? selectedExamId
      : null;
  const nextSujetNumber =
    selectedSujetNumber !== null &&
    yearEntry.sujets.some(
      (item) =>
        item.examId === nextExamId && item.sujetNumber === selectedSujetNumber,
    )
      ? selectedSujetNumber
      : null;

  return {
    selectedExamId: nextExamId,
    selectedSujetNumber: nextSujetNumber,
  };
}

export function findSelectedBrowseSujet(
  yearEntry: BrowseYearEntry | null,
  selectedExamId: string | null,
  selectedSujetNumber: number | null,
): BrowseSujet | null {
  if (!yearEntry || !selectedExamId || !selectedSujetNumber) {
    return null;
  }

  return (
    yearEntry.sujets.find(
      (item) =>
        item.examId === selectedExamId &&
        item.sujetNumber === selectedSujetNumber,
    ) ?? null
  );
}

export function buildBrowseQuery(selection: BrowseSelectionState): string {
  const nextParams = new URLSearchParams();

  if (selection.selectedStreamCode) {
    nextParams.set("stream", selection.selectedStreamCode);
  }

  if (selection.selectedSubjectCode) {
    nextParams.set("subject", selection.selectedSubjectCode);
  }

  if (selection.selectedYear) {
    nextParams.set("year", String(selection.selectedYear));
  }

  if (selection.selectedExamId) {
    nextParams.set("examId", selection.selectedExamId);
  }

  if (selection.selectedSujetNumber) {
    nextParams.set("sujet", String(selection.selectedSujetNumber));
  }

  return nextParams.toString();
}

export function buildBrowseContext(input: {
  stream: BrowseStream | null;
  subject: BrowseSubject | null;
  selectedYear: number | null;
  yearEntry: BrowseYearEntry | null;
  selectedSujet: BrowseSujet | null;
}) {
  const selectedMeta = [
    input.stream ? { label: "الشعبة", value: input.stream.name } : null,
    input.subject ? { label: "المادة", value: input.subject.name } : null,
    input.selectedYear
      ? { label: "السنة", value: String(input.selectedYear) }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const browseContextTitle = input.subject
    ? `${input.subject.name}${input.selectedYear ? ` · ${input.selectedYear}` : ""}`
    : input.stream
      ? input.stream.name
      : "المواضيع الرسمية";
  const sujetsCount = input.yearEntry?.sujets.length ?? 0;
  const selectionPrompt = !input.stream
    ? "اختر الشعبة."
    : !input.subject
      ? "اختر المادة."
      : !input.selectedYear
        ? "اختر السنة."
        : !input.selectedSujet
          ? "اختر الموضوع."
          : input.selectedSujet.label;

  return {
    selectedMeta,
    browseContextTitle,
    sujetsCount,
    selectionPrompt,
  };
}
