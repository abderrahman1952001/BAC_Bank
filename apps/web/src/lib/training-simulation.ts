import type { CatalogResponse } from "@/lib/study-api";

type CatalogStream = CatalogResponse["streams"][number];
type CatalogSubject = CatalogStream["subjects"][number];

export type OfficialSimulationPaperOption = {
  examId: string;
  sujetNumber: 1 | 2;
  label: string;
  sessionType: "NORMAL" | "MAKEUP";
  exerciseCount: number;
  year: number;
  streamCode: string;
  streamName: string;
  subjectCode: string;
  subjectName: string;
};

export function listTrainingSimulationStreams(
  catalog: CatalogResponse | null | undefined,
) {
  return (catalog?.streams ?? []).filter((stream) =>
    stream.subjects.some((subject) =>
      subject.years.some((yearEntry) => yearEntry.sujets.length > 0),
    ),
  );
}

export function resolveTrainingSimulationStream(input: {
  catalog: CatalogResponse | null | undefined;
  userStreamCode?: string | null;
  selectedStreamCode?: string | null;
}) {
  const streams = listTrainingSimulationStreams(input.catalog);

  if (!streams.length) {
    return null;
  }

  const preferredCodes = [
    input.userStreamCode?.trim().toUpperCase() ?? null,
    input.selectedStreamCode?.trim().toUpperCase() ?? null,
  ].filter((value): value is string => Boolean(value));

  for (const code of preferredCodes) {
    const match = streams.find((stream) => stream.code === code);

    if (match) {
      return match;
    }
  }

  return streams[0] ?? null;
}

export function listTrainingSimulationSubjects(
  stream: CatalogStream | null | undefined,
) {
  return (stream?.subjects ?? []).filter((subject) =>
    subject.years.some((yearEntry) => yearEntry.sujets.length > 0),
  );
}

export function resolveTrainingSimulationSubjectCode(
  subjects: CatalogSubject[],
  selectedSubjectCode: string,
) {
  return subjects.some((subject) => subject.code === selectedSubjectCode)
    ? selectedSubjectCode
    : (subjects[0]?.code ?? "");
}

export function listOfficialSimulationPapers(
  stream: CatalogStream | null | undefined,
  subjectCode: string,
): OfficialSimulationPaperOption[] {
  if (!stream) {
    return [];
  }

  const subject =
    stream.subjects.find((item) => item.code === subjectCode) ?? null;

  if (!subject) {
    return [];
  }

  return subject.years
    .flatMap((yearEntry) =>
      yearEntry.sujets.map((sujet) => ({
        examId: sujet.examId,
        sujetNumber: sujet.sujetNumber,
        label: sujet.label,
        sessionType: sujet.sessionType,
        exerciseCount: sujet.exerciseCount,
        year: yearEntry.year,
        streamCode: stream.code,
        streamName: stream.name,
        subjectCode: subject.code,
        subjectName: subject.name,
      })),
    )
    .sort((left, right) => {
      if (left.year !== right.year) {
        return right.year - left.year;
      }

      if (left.sessionType !== right.sessionType) {
        return left.sessionType === "NORMAL" ? -1 : 1;
      }

      return left.sujetNumber - right.sujetNumber;
    });
}

export function buildOfficialSimulationPaperKey(
  paper: Pick<OfficialSimulationPaperOption, "examId" | "sujetNumber">,
) {
  return `${paper.examId}:${paper.sujetNumber}`;
}

export function resolveOfficialSimulationPaperKey(
  papers: OfficialSimulationPaperOption[],
  selectedPaperKey: string,
) {
  return papers.some(
    (paper) => buildOfficialSimulationPaperKey(paper) === selectedPaperKey,
  )
    ? selectedPaperKey
    : (papers[0] ? buildOfficialSimulationPaperKey(papers[0]) : "");
}
