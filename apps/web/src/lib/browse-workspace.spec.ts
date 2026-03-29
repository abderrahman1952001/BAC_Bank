import { describe, expect, it } from "vitest";
import type { CatalogResponse } from "@/lib/qbank";
import {
  buildBrowseContext,
  buildBrowseQuery,
  buildInitialBrowseSelection,
  findBrowseStream,
  findBrowseSubject,
  findBrowseYearEntry,
  findSelectedBrowseSujet,
  reconcileBrowseSubjectCode,
  reconcileBrowseSujetSelection,
  reconcileBrowseYear,
} from "./browse-workspace";

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

describe("browse workspace helpers", () => {
  it("normalizes the initial search selection", () => {
    expect(
      buildInitialBrowseSelection({
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
    const stream = findBrowseStream(catalog, "SE");
    const subject = findBrowseSubject(stream, "MATH");
    const yearEntry = findBrowseYearEntry(subject, 2024);

    expect(reconcileBrowseSubjectCode(stream, "PHYS")).toBe("");
    expect(reconcileBrowseYear(subject, 1999)).toBeNull();
    expect(
      reconcileBrowseSujetSelection(yearEntry, "missing-exam", 2),
    ).toEqual({
      selectedExamId: null,
      selectedSujetNumber: null,
    });
  });

  it("preserves valid selections and resolves the active sujet", () => {
    const stream = findBrowseStream(catalog, "SE");
    const subject = findBrowseSubject(stream, "MATH");
    const yearEntry = findBrowseYearEntry(subject, 2024);

    expect(reconcileBrowseSubjectCode(stream, "MATH")).toBe("MATH");
    expect(reconcileBrowseYear(subject, 2024)).toBe(2024);
    expect(
      reconcileBrowseSujetSelection(yearEntry, "exam-2024", 2),
    ).toEqual({
      selectedExamId: "exam-2024",
      selectedSujetNumber: 2,
    });
    expect(findSelectedBrowseSujet(yearEntry, "exam-2024", 2)).toMatchObject({
      label: "Sujet 2",
      sujetNumber: 2,
    });
  });

  it("builds browse query strings without empty values", () => {
    expect(
      buildBrowseQuery({
        selectedStreamCode: "SE",
        selectedSubjectCode: "MATH",
        selectedYear: 2024,
        selectedExamId: "exam-2024",
        selectedSujetNumber: 2,
      }),
    ).toBe("stream=SE&subject=MATH&year=2024&examId=exam-2024&sujet=2");

    expect(
      buildBrowseQuery({
        selectedStreamCode: "",
        selectedSubjectCode: "",
        selectedYear: null,
        selectedExamId: null,
        selectedSujetNumber: null,
      }),
    ).toBe("");
  });

  it("builds context copy and meta from the current selection", () => {
    const stream = findBrowseStream(catalog, "SE");
    const subject = findBrowseSubject(stream, "MATH");
    const yearEntry = findBrowseYearEntry(subject, 2024);
    const selectedSujet = findSelectedBrowseSujet(yearEntry, "exam-2024", 2);

    expect(
      buildBrowseContext({
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
      browseContextTitle: "Mathematics · 2024",
      sujetsCount: 2,
      selectionPrompt: "Sujet 2",
    });

    expect(
      buildBrowseContext({
        stream,
        subject: null,
        selectedYear: null,
        yearEntry: null,
        selectedSujet: null,
      }).selectionPrompt,
    ).toBe("اختر المادة.");
  });
});
