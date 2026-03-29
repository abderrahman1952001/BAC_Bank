import { describe, expect, it } from "vitest";
import type { CatalogResponse, ExamResponse } from "@/lib/qbank";
import {
  buildAdminLibraryContextTitle,
  buildAdminLibraryQuery,
  buildAdminLibrarySelectionPrompt,
  buildStudentPreviewHref,
  formatPublishedSessionLabel,
  normalizeCode,
  parseSujetNumber,
  parseYear,
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
    year: 2024,
    sessionType: "NORMAL",
    durationMinutes: 180,
    totalPoints: 20,
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

describe("admin-library helpers", () => {
  it("normalizes URL-driven filters", () => {
    expect(normalizeCode(" sci ")).toBe("SCI");
    expect(parseYear("2024")).toBe(2024);
    expect(parseYear("oops")).toBeNull();
    expect(parseSujetNumber("1")).toBe(1);
    expect(parseSujetNumber("3")).toBeNull();
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
      "/app/browse/SCI/MATH/2024/exam-1/2",
    );
  });
});
