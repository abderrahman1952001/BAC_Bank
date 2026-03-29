import { type CatalogResponse, type ExamResponse } from "@/lib/qbank";

export function normalizeCode(value: string | null) {
  return value?.trim().toUpperCase() ?? "";
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

export function buildAdminLibraryQuery(input: {
  selectedStreamCode: string;
  selectedSubjectCode: string;
  selectedYear: number | null;
  selectedExamId: string | null;
  selectedSujetNumber: number | null;
}) {
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

  return `/app/browse/${selectedExam.stream.code}/${selectedExam.subject.code}/${selectedExam.year}/${selectedExam.id}/${selectedExam.selectedSujetNumber ?? selectedSujetNumber}`;
}
