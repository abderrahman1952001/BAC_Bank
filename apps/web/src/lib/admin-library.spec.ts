import { describe, expect, it } from "vitest";
import type { AdminIngestionJobSummary } from "@/lib/admin";
import type { CatalogResponse, ExamResponse } from "@/lib/study-api";
import {
  buildActiveRevisionJobIdsByPaperId,
  buildAdminLibraryContextTitle,
  buildAdminLibraryQuery,
  buildAdminLibrarySelectionPrompt,
  buildInitialAdminLibrarySelection,
  buildStudentPreviewHref,
  findAdminLibraryStream,
  findAdminLibrarySubject,
  findAdminLibraryYearEntry,
  findSelectedAdminLibrarySujet,
  formatPublishedSessionLabel,
  normalizeCode,
  parseSujetNumber,
  parseYear,
  resolveAdminLibraryInitialSelection,
  resolveSelectionFromExamId,
} from "@/lib/admin-library";

function makeCatalog(): CatalogResponse {
  return {
    streams: [
      {
        code: "SCI",
        name: "Sciences",
        subjects: [
          {
            code: "MATH",
            name: "Math",
            years: [
              {
                year: 2024,
                sujets: [
                  {
                    examId: "exam-1",
                    sujetNumber: 1,
                    label: "Sujet 1",
                    sessionType: "NORMAL",
                    exerciseCount: 4,
                  },
                  {
                    examId: "exam-1",
                    sujetNumber: 2,
                    label: "Sujet 2",
                    sessionType: "NORMAL",
                    exerciseCount: 4,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeExam(): ExamResponse {
  return {
    id: "exam-1",
    paperId: "paper-1",
    year: 2024,
    sessionType: "NORMAL",
    durationMinutes: 180,
    officialSourceReference: null,
    stream: { code: "SCI", name: "Sciences" },
    subject: { code: "MATH", name: "Math" },
    selectedSujetNumber: 2,
    selectedSujetLabel: "Sujet 2",
    availableSujets: [
      { sujetNumber: 1, label: "Sujet 1" },
      { sujetNumber: 2, label: "Sujet 2" },
    ],
    exerciseCount: 4,
    exercises: [],
  };
}

function makeJob(
  overrides: Partial<AdminIngestionJobSummary>,
): AdminIngestionJobSummary {
  return {
    id: "job-1",
    label: "Revision draft",
    draft_kind: "revision",
    provider: "manual",
    year: 2024,
    stream_codes: ["SCI"],
    subject_code: "MATH",
    session: null,
    min_year: 2024,
    status: "draft",
    source_document_count: 2,
    source_page_count: 8,
    workflow: {
      has_exam_document: true,
      has_correction_document: true,
      awaiting_correction: false,
      can_process: true,
      review_started: false,
      active_operation: "idle",
    },
    published_paper_id: "paper-1",
    published_exams: [],
    created_at: "2026-04-06T00:00:00.000Z",
    updated_at: "2026-04-06T00:00:00.000Z",
    ...overrides,
  };
}

describe("admin-library helpers", () => {
  it("normalizes URL-driven filters", () => {
    expect(normalizeCode(" sci ")).toBe("SCI");
    expect(parseYear("2024")).toBe(2024);
    expect(parseYear("oops")).toBeNull();
    expect(parseSujetNumber("1")).toBe(1);
    expect(parseSujetNumber("3")).toBeNull();
    expect(
      buildInitialAdminLibrarySelection({
        stream: " sci ",
        subject: " math ",
        year: "2024",
        examId: " exam-1 ",
        sujet: "2",
      }),
    ).toEqual({
      selectedStreamCode: "SCI",
      selectedSubjectCode: "MATH",
      selectedYear: 2024,
      selectedExamId: "exam-1",
      selectedSujetNumber: 2,
    });
  });

  it("formats session labels and query strings", () => {
    expect(formatPublishedSessionLabel("NORMAL")).toBe("Normal");
    expect(formatPublishedSessionLabel("MAKEUP")).toBe("Makeup");
    expect(
      buildAdminLibraryQuery({
        selectedStreamCode: "SCI",
        selectedSubjectCode: "MATH",
        selectedYear: 2024,
        selectedExamId: "exam-1",
        selectedSujetNumber: 2,
      }),
    ).toBe("stream=SCI&subject=MATH&year=2024&examId=exam-1&sujet=2");
  });

  it("resolves catalog selection from an exam id", () => {
    expect(resolveSelectionFromExamId(makeCatalog(), "exam-1", 2)).toEqual({
      streamCode: "SCI",
      subjectCode: "MATH",
      year: 2024,
      sujetNumber: 2,
    });

    expect(resolveSelectionFromExamId(makeCatalog(), "exam-1", null)).toEqual({
      streamCode: "SCI",
      subjectCode: "MATH",
      year: 2024,
      sujetNumber: 1,
    });

    expect(
      resolveAdminLibraryInitialSelection(
        makeCatalog(),
        buildInitialAdminLibrarySelection({
          examId: "exam-1",
          sujet: "2",
        }),
      ),
    ).toEqual({
      selectedStreamCode: "SCI",
      selectedSubjectCode: "MATH",
      selectedYear: 2024,
      selectedExamId: "exam-1",
      selectedSujetNumber: 2,
    });
  });

  it("builds titles, prompts, and preview links", () => {
    expect(
      buildAdminLibraryContextTitle({
        streamName: null,
        subjectName: null,
        selectedYear: null,
      }),
    ).toBe("Choose a stream, subject, and year");

    expect(
      buildAdminLibraryContextTitle({
        streamName: "Sciences",
        subjectName: "Math",
        selectedYear: 2024,
      }),
    ).toBe("Math · 2024");

    expect(
      buildAdminLibrarySelectionPrompt({
        hasStream: true,
        hasSubject: true,
        hasSelectedYear: true,
        hasSelectedSujet: false,
      }),
    ).toBe(
      "Select the published sujet you want to inspect before starting a revision.",
    );

    expect(buildStudentPreviewHref(makeExam(), 1)).toBe(
      "/student/library/SCI/MATH/2024/exam-1/2",
    );
  });

  it("finds catalog entries and active revision drafts", () => {
    const catalog = makeCatalog();
    const stream = findAdminLibraryStream(catalog, "SCI");
    const subject = findAdminLibrarySubject(stream, "MATH");
    const yearEntry = findAdminLibraryYearEntry(subject, 2024);

    expect(stream?.name).toBe("Sciences");
    expect(subject?.name).toBe("Math");
    expect(yearEntry?.year).toBe(2024);
    expect(findSelectedAdminLibrarySujet(yearEntry, "exam-1", 2)?.label).toBe(
      "Sujet 2",
    );

    expect(
      buildActiveRevisionJobIdsByPaperId([
        makeJob({ id: "job-1", published_paper_id: "paper-1" }),
        makeJob({
          id: "job-2",
          published_paper_id: "paper-2",
          status: "published",
        }),
      ]),
    ).toEqual({
      "paper-1": "job-1",
    });
  });
});
