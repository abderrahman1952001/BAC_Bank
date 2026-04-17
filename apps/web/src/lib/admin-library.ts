import type { AdminIngestionJobSummary } from "@/lib/admin";
import { type CatalogResponse, type ExamResponse } from "@/lib/study-api";
import { buildStudentLibraryExamRoute } from "@/lib/student-routes";

export type AdminLibraryInitialSearch = {
  stream?: string;
  subject?: string;
  year?: string;
  examId?: string;
  sujet?: string;
};

export type AdminLibrarySelectionState = {
  selectedStreamCode: string;
  selectedSubjectCode: string;
  selectedYear: number | null;
  selectedExamId: string | null;
  selectedSujetNumber: number | null;
};

export type AdminLibraryStream = CatalogResponse["streams"][number];
export type AdminLibrarySubject = AdminLibraryStream["subjects"][number];
export type AdminLibraryYearEntry = AdminLibrarySubject["years"][number];
export type AdminLibrarySujet = AdminLibraryYearEntry["sujets"][number];

export function normalizeCode(value: string | null) {
  return value?.trim().toUpperCase() ?? "";
}

export function buildInitialAdminLibrarySelection(
  initialSearch?: AdminLibraryInitialSearch,
): AdminLibrarySelectionState {
  return {
    selectedStreamCode: normalizeCode(initialSearch?.stream ?? null),
    selectedSubjectCode: normalizeCode(initialSearch?.subject ?? null),
    selectedYear: parseYear(initialSearch?.year ?? null),
    selectedExamId: initialSearch?.examId?.trim() || null,
    selectedSujetNumber: parseSujetNumber(initialSearch?.sujet ?? null),
  };
}

export function parseYear(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function parseSujetNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return parsed === 1 || parsed === 2 ? parsed : null;
}

export function formatPublishedSessionLabel(
  sessionType: "NORMAL" | "MAKEUP",
) {
  return sessionType === "MAKEUP" ? "Makeup" : "Normal";
}

export function findAdminLibraryStream(
  catalog: CatalogResponse | null | undefined,
  selectedStreamCode: string,
): AdminLibraryStream | null {
  return (
    catalog?.streams.find((item) => item.code === selectedStreamCode) ?? null
  );
}

export function findAdminLibrarySubject(
  stream: AdminLibraryStream | null,
  selectedSubjectCode: string,
): AdminLibrarySubject | null {
  return (
    stream?.subjects.find((item) => item.code === selectedSubjectCode) ?? null
  );
}

export function findAdminLibraryYearEntry(
  subject: AdminLibrarySubject | null,
  selectedYear: number | null,
): AdminLibraryYearEntry | null {
  return (
    subject?.years.find((item) => item.year === selectedYear) ?? null
  );
}

export function reconcileAdminLibrarySubjectCode(
  stream: AdminLibraryStream | null,
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

export function reconcileAdminLibraryYear(
  subject: AdminLibrarySubject | null,
  selectedYear: number | null,
): number | null {
  if (!subject) {
    return null;
  }

  return selectedYear && subject.years.some((item) => item.year === selectedYear)
    ? selectedYear
    : null;
}

export function reconcileAdminLibrarySujetSelection(
  yearEntry: AdminLibraryYearEntry | null,
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

export function findSelectedAdminLibrarySujet(
  yearEntry: AdminLibraryYearEntry | null,
  selectedExamId: string | null,
  selectedSujetNumber: number | null,
): AdminLibrarySujet | null {
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

export function resolveSelectionFromExamId(
  catalog: CatalogResponse,
  examId: string,
  preferredSujetNumber: number | null,
) {
  for (const stream of catalog.streams) {
    for (const subject of stream.subjects) {
      for (const year of subject.years) {
        const matchingSujet =
          year.sujets.find(
            (item) =>
              item.examId === examId &&
              item.sujetNumber === preferredSujetNumber,
          ) ??
          year.sujets.find((item) => item.examId === examId) ??
          null;

        if (!matchingSujet) {
          continue;
        }

        return {
          streamCode: stream.code,
          subjectCode: subject.code,
          year: year.year,
          sujetNumber: matchingSujet.sujetNumber,
        };
      }
    }
  }

  return null;
}

export function resolveAdminLibraryInitialSelection(
  catalog: CatalogResponse | null | undefined,
  initialSelection: AdminLibrarySelectionState,
): AdminLibrarySelectionState {
  if (!catalog) {
    return initialSelection;
  }

  let nextSelection = initialSelection;

  if (
    nextSelection.selectedExamId &&
    (!nextSelection.selectedStreamCode ||
      !nextSelection.selectedSubjectCode ||
      nextSelection.selectedYear === null ||
      nextSelection.selectedSujetNumber === null)
  ) {
    const resolvedSelection = resolveSelectionFromExamId(
      catalog,
      nextSelection.selectedExamId,
      nextSelection.selectedSujetNumber,
    );

    if (resolvedSelection) {
      nextSelection = {
        ...nextSelection,
        selectedStreamCode: resolvedSelection.streamCode,
        selectedSubjectCode: resolvedSelection.subjectCode,
        selectedYear: resolvedSelection.year,
        selectedSujetNumber: resolvedSelection.sujetNumber,
      };
    }
  }

  const stream = findAdminLibraryStream(
    catalog,
    nextSelection.selectedStreamCode,
  );

  if (!stream) {
    return {
      selectedStreamCode: "",
      selectedSubjectCode: "",
      selectedYear: null,
      selectedExamId: null,
      selectedSujetNumber: null,
    };
  }

  const selectedSubjectCode = reconcileAdminLibrarySubjectCode(
    stream,
    nextSelection.selectedSubjectCode,
  );

  if (!selectedSubjectCode) {
    return {
      selectedStreamCode: stream.code,
      selectedSubjectCode: "",
      selectedYear: null,
      selectedExamId: null,
      selectedSujetNumber: null,
    };
  }

  const subject = findAdminLibrarySubject(stream, selectedSubjectCode);
  const selectedYear = reconcileAdminLibraryYear(
    subject,
    nextSelection.selectedYear,
  );

  if (selectedYear === null) {
    return {
      selectedStreamCode: stream.code,
      selectedSubjectCode,
      selectedYear: null,
      selectedExamId: null,
      selectedSujetNumber: null,
    };
  }

  const yearEntry = findAdminLibraryYearEntry(subject, selectedYear);
  const selectedSujetSelection = reconcileAdminLibrarySujetSelection(
    yearEntry,
    nextSelection.selectedExamId,
    nextSelection.selectedSujetNumber,
  );

  return {
    selectedStreamCode: stream.code,
    selectedSubjectCode,
    selectedYear,
    selectedExamId: selectedSujetSelection.selectedExamId,
    selectedSujetNumber: selectedSujetSelection.selectedSujetNumber,
  };
}

export function buildAdminLibraryQuery(input: AdminLibrarySelectionState) {
  const nextParams = new URLSearchParams();

  if (input.selectedStreamCode) {
    nextParams.set("stream", input.selectedStreamCode);
  }

  if (input.selectedSubjectCode) {
    nextParams.set("subject", input.selectedSubjectCode);
  }

  if (input.selectedYear) {
    nextParams.set("year", String(input.selectedYear));
  }

  if (input.selectedExamId) {
    nextParams.set("examId", input.selectedExamId);
  }

  if (input.selectedSujetNumber) {
    nextParams.set("sujet", String(input.selectedSujetNumber));
  }

  return nextParams.toString();
}

export function buildAdminLibraryContextTitle(input: {
  streamName: string | null;
  subjectName: string | null;
  selectedYear: number | null;
}) {
  if (input.subjectName) {
    return `${input.subjectName}${
      input.selectedYear ? ` · ${input.selectedYear}` : ""
    }`;
  }

  if (input.streamName) {
    return `Stream: ${input.streamName}`;
  }

  return "Choose a stream, subject, and year";
}

export function buildAdminLibrarySelectionPrompt(input: {
  hasStream: boolean;
  hasSubject: boolean;
  hasSelectedYear: boolean;
  hasSelectedSujet: boolean;
}) {
  if (!input.hasStream) {
    return "Start from a stream, then narrow the library to the exact published offering you want to revise.";
  }

  if (!input.hasSubject) {
    return "Pick a subject to load the published years for this stream.";
  }

  if (!input.hasSelectedYear) {
    return "Choose a year to reveal the matching published sujets.";
  }

  if (!input.hasSelectedSujet) {
    return "Select the published sujet you want to inspect before starting a revision.";
  }

  return "This published offering is ready. Open the revision workflow to edit the canonical paper in the ingestion review editor.";
}

export function buildStudentPreviewHref(
  selectedExam: ExamResponse | null,
  selectedSujetNumber: number | null,
) {
  if (!selectedExam || !selectedSujetNumber) {
    return null;
  }

  return buildStudentLibraryExamRoute({
    streamCode: selectedExam.stream.code,
    subjectCode: selectedExam.subject.code,
    year: selectedExam.year,
    examId: selectedExam.id,
    sujetNumber: selectedExam.selectedSujetNumber ?? selectedSujetNumber,
  });
}

export function buildActiveRevisionJobIdsByPaperId(
  jobs: AdminIngestionJobSummary[],
): Record<string, string> {
  return jobs.reduce<Record<string, string>>((accumulator, job) => {
    if (
      !job.published_paper_id ||
      job.draft_kind !== "revision" ||
      !isActiveRevisionDraft(job)
    ) {
      return accumulator;
    }

    if (!accumulator[job.published_paper_id]) {
      accumulator[job.published_paper_id] = job.id;
    }

    return accumulator;
  }, {});
}

function isActiveRevisionDraft(job: AdminIngestionJobSummary) {
  return (
    job.status === "draft" ||
    job.status === "queued" ||
    job.status === "processing" ||
    job.status === "in_review" ||
    job.status === "approved"
  );
}
