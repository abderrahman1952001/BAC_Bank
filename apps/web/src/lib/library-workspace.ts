import type { CatalogResponse } from "@/lib/study-api";

export type LibraryInitialSearch = {
  stream?: string;
  subject?: string;
  year?: string;
  examId?: string;
  sujet?: string;
};

export type LibrarySelectionState = {
  selectedStreamCode: string;
  selectedSubjectCode: string;
  selectedYear: number | null;
  selectedExamId: string | null;
  selectedSujetNumber: number | null;
};

export type LibraryStream = CatalogResponse["streams"][number];
export type LibrarySubject = LibraryStream["subjects"][number];
export type LibraryYearEntry = LibrarySubject["years"][number];
export type LibrarySujet = LibraryYearEntry["sujets"][number];

export function normalizeLibraryCode(value: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

export function buildInitialLibrarySelection(
  initialSearch?: LibraryInitialSearch,
): LibrarySelectionState {
  return {
    selectedStreamCode: normalizeLibraryCode(initialSearch?.stream ?? null),
    selectedSubjectCode: normalizeLibraryCode(initialSearch?.subject ?? null),
    selectedYear: initialSearch?.year ? Number(initialSearch.year) : null,
    selectedExamId: initialSearch?.examId ?? null,
    selectedSujetNumber: initialSearch?.sujet
      ? Number(initialSearch.sujet)
      : null,
  };
}

export function findLibraryStream(
  catalog: CatalogResponse | null,
  selectedStreamCode: string,
): LibraryStream | null {
  return (
    catalog?.streams.find((item) => item.code === selectedStreamCode) ?? null
  );
}

export function findLibrarySubject(
  stream: LibraryStream | null,
  selectedSubjectCode: string,
): LibrarySubject | null {
  return (
    stream?.subjects.find((item) => item.code === selectedSubjectCode) ?? null
  );
}

export function findLibraryYearEntry(
  subject: LibrarySubject | null,
  selectedYear: number | null,
): LibraryYearEntry | null {
  return (
    subject?.years.find((item) => item.year === selectedYear) ?? null
  );
}

export function reconcileLibrarySubjectCode(
  stream: LibraryStream | null,
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

export function reconcileLibraryYear(
  subject: LibrarySubject | null,
  selectedYear: number | null,
): number | null {
  if (!subject) {
    return null;
  }

  return selectedYear && subject.years.some((item) => item.year === selectedYear)
    ? selectedYear
    : null;
}

export function reconcileLibrarySujetSelection(
  yearEntry: LibraryYearEntry | null,
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

export function findSelectedLibrarySujet(
  yearEntry: LibraryYearEntry | null,
  selectedExamId: string | null,
  selectedSujetNumber: number | null,
): LibrarySujet | null {
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

export function buildLibraryQuery(selection: LibrarySelectionState): string {
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

export function buildLibraryContext(input: {
  stream: LibraryStream | null;
  subject: LibrarySubject | null;
  selectedYear: number | null;
  yearEntry: LibraryYearEntry | null;
  selectedSujet: LibrarySujet | null;
}) {
  const selectedMeta = [
    input.stream ? { label: "الشعبة", value: input.stream.name } : null,
    input.subject ? { label: "المادة", value: input.subject.name } : null,
    input.selectedYear
      ? { label: "السنة", value: String(input.selectedYear) }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const libraryContextTitle = input.subject
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
    libraryContextTitle,
    sujetsCount,
    selectionPrompt,
  };
}
