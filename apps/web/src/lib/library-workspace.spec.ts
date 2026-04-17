import { describe, expect, it } from "vitest";
import type { CatalogResponse } from "@/lib/study-api";
import {
  buildLibraryContext,
  buildLibraryQuery,
  buildInitialLibrarySelection,
  findLibraryStream,
  findLibrarySubject,
  findLibraryYearEntry,
  findSelectedLibrarySujet,
  reconcileLibrarySubjectCode,
  reconcileLibrarySujetSelection,
  reconcileLibraryYear,
} from "./library-workspace";

const catalog = {
  streams: [
    {
      code: "SE",
      name: "Sciences experimentales",
      subjects: [
        {
          code: "MATH",
          name: "Mathematics",
          years: [
            {
              year: 2024,
              sujets: [
                {
                  examId: "exam-2024",
                  sujetNumber: 1,
                  label: "Sujet 1",
                  sessionType: "NORMAL",
                  exerciseCount: 4,
                },
                {
                  examId: "exam-2024",
                  sujetNumber: 2,
                  label: "Sujet 2",
                  sessionType: "MAKEUP",
                  exerciseCount: 4,
                },
              ],
            },
            {
              year: 2023,
              sujets: [
                {
                  examId: "exam-2023",
                  sujetNumber: 1,
                  label: "Sujet 1",
                  sessionType: "NORMAL",
                  exerciseCount: 3,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      code: "TM",
      name: "Techniques mathematiques",
      subjects: [
        {
          code: "PHYS",
          name: "Physics",
          years: [],
        },
      ],
    },
  ],
} satisfies CatalogResponse;

describe("library workspace helpers", () => {
  it("normalizes the initial search selection", () => {
    expect(
      buildInitialLibrarySelection({
        stream: " se ",
        subject: " math ",
        year: "2024",
        examId: "exam-2024",
        sujet: "2",
      }),
    ).toEqual({
      selectedStreamCode: "SE",
      selectedSubjectCode: "MATH",
      selectedYear: 2024,
      selectedExamId: "exam-2024",
      selectedSujetNumber: 2,
    });
  });

  it("repairs invalid downstream selections when stream or subject changes", () => {
    const stream = findLibraryStream(catalog, "SE");
    const subject = findLibrarySubject(stream, "MATH");
    const yearEntry = findLibraryYearEntry(subject, 2024);

    expect(reconcileLibrarySubjectCode(stream, "PHYS")).toBe("");
    expect(reconcileLibraryYear(subject, 1999)).toBeNull();
    expect(
      reconcileLibrarySujetSelection(yearEntry, "missing-exam", 2),
    ).toEqual({
      selectedExamId: null,
      selectedSujetNumber: null,
    });
  });

  it("preserves valid selections and resolves the active sujet", () => {
    const stream = findLibraryStream(catalog, "SE");
    const subject = findLibrarySubject(stream, "MATH");
    const yearEntry = findLibraryYearEntry(subject, 2024);

    expect(reconcileLibrarySubjectCode(stream, "MATH")).toBe("MATH");
    expect(reconcileLibraryYear(subject, 2024)).toBe(2024);
    expect(
      reconcileLibrarySujetSelection(yearEntry, "exam-2024", 2),
    ).toEqual({
      selectedExamId: "exam-2024",
      selectedSujetNumber: 2,
    });
    expect(findSelectedLibrarySujet(yearEntry, "exam-2024", 2)).toMatchObject({
      label: "Sujet 2",
      sujetNumber: 2,
    });
  });

  it("builds library query strings without empty values", () => {
    expect(
      buildLibraryQuery({
        selectedStreamCode: "SE",
        selectedSubjectCode: "MATH",
        selectedYear: 2024,
        selectedExamId: "exam-2024",
        selectedSujetNumber: 2,
      }),
    ).toBe("stream=SE&subject=MATH&year=2024&examId=exam-2024&sujet=2");

    expect(
      buildLibraryQuery({
        selectedStreamCode: "",
        selectedSubjectCode: "",
        selectedYear: null,
        selectedExamId: null,
        selectedSujetNumber: null,
      }),
    ).toBe("");
  });

  it("builds context copy and meta from the current selection", () => {
    const stream = findLibraryStream(catalog, "SE");
    const subject = findLibrarySubject(stream, "MATH");
    const yearEntry = findLibraryYearEntry(subject, 2024);
    const selectedSujet = findSelectedLibrarySujet(yearEntry, "exam-2024", 2);

    expect(
      buildLibraryContext({
        stream,
        subject,
        selectedYear: 2024,
        yearEntry,
        selectedSujet,
      }),
    ).toEqual({
      selectedMeta: [
        { label: "الشعبة", value: "Sciences experimentales" },
        { label: "المادة", value: "Mathematics" },
        { label: "السنة", value: "2024" },
      ],
      libraryContextTitle: "Mathematics · 2024",
      sujetsCount: 2,
      selectionPrompt: "Sujet 2",
    });

    expect(
      buildLibraryContext({
        stream,
        subject: null,
        selectedYear: null,
        yearEntry: null,
        selectedSujet: null,
      }).selectionPrompt,
    ).toBe("اختر المادة.");
  });
});
