import { describe, expect, it } from "vitest";
import type { CatalogResponse } from "@/lib/study-api";
import {
  buildOfficialSimulationPaperKey,
  listOfficialSimulationPapers,
  listTrainingSimulationStreams,
  listTrainingSimulationSubjects,
  resolveOfficialSimulationPaperKey,
  resolveTrainingSimulationStream,
  resolveTrainingSimulationSubjectCode,
} from "./training-simulation";

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
              year: 2025,
              sujets: [
                {
                  examId: "exam-2025",
                  sujetNumber: 2,
                  label: "Sujet 2",
                  sessionType: "MAKEUP",
                  exerciseCount: 4,
                },
                {
                  examId: "exam-2025",
                  sujetNumber: 1,
                  label: "Sujet 1",
                  sessionType: "NORMAL",
                  exerciseCount: 4,
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

describe("training simulation helpers", () => {
  it("keeps only streams and subjects that have official papers", () => {
    const streams = listTrainingSimulationStreams(catalog);

    expect(streams.map((stream) => stream.code)).toEqual(["SE"]);
    expect(
      listTrainingSimulationSubjects(streams[0]).map((subject) => subject.code),
    ).toEqual(["MATH"]);
  });

  it("resolves the preferred stream and subject selection safely", () => {
    const stream = resolveTrainingSimulationStream({
      catalog,
      userStreamCode: "SE",
      selectedStreamCode: "TM",
    });

    expect(stream?.code).toBe("SE");
    expect(
      resolveTrainingSimulationSubjectCode(
        listTrainingSimulationSubjects(stream),
        "PHYS",
      ),
    ).toBe("MATH");
  });

  it("builds and repairs sorted official paper options", () => {
    const stream = resolveTrainingSimulationStream({
      catalog,
      selectedStreamCode: "SE",
    });
    const papers = listOfficialSimulationPapers(stream, "MATH");

    expect(papers.map((paper) => buildOfficialSimulationPaperKey(paper))).toEqual([
      "exam-2025:1",
      "exam-2025:2",
    ]);
    expect(resolveOfficialSimulationPaperKey(papers, "missing")).toBe(
      "exam-2025:1",
    );
  });
});
