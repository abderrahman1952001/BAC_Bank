import { LibraryWorkspace } from "@/components/library-workspace";
import {
  buildInitialLibrarySelection,
  findLibraryStream,
  findLibrarySubject,
  findLibraryYearEntry,
  findSelectedLibrarySujet,
  reconcileLibrarySujetSelection,
} from "@/lib/library-workspace";
import type { ExamResponse } from "@/lib/study-api";
import { fetchServerCatalog, fetchServerExam } from "@/lib/server-study-api";
import { readServerSessionUser } from "@/lib/server-auth";

type LibraryWorkspacePageProps = {
  searchParams: Promise<{
    stream?: string;
    subject?: string;
    year?: string;
    examId?: string;
    sujet?: string;
  }>;
};

export default async function StudentLibraryPage({
  searchParams,
}: LibraryWorkspacePageProps) {
  const [resolvedSearchParams, user] = await Promise.all([
    searchParams,
    readServerSessionUser(),
  ]);
  const initialSearch = resolvedSearchParams.stream
    ? resolvedSearchParams
    : {
        ...resolvedSearchParams,
        stream: user?.stream?.code,
      };
  const initialCatalog = await fetchServerCatalog().catch(() => undefined);
  const initialSelection = buildInitialLibrarySelection(initialSearch);

  let initialExam: ExamResponse | undefined;

  if (initialCatalog) {
    const stream = findLibraryStream(
      initialCatalog,
      initialSelection.selectedStreamCode,
    );
    const subject = findLibrarySubject(
      stream,
      initialSelection.selectedSubjectCode,
    );
    const yearEntry = findLibraryYearEntry(subject, initialSelection.selectedYear);
    const selectedSujetSelection = reconcileLibrarySujetSelection(
      yearEntry,
      initialSelection.selectedExamId,
      initialSelection.selectedSujetNumber,
    );
    const selectedSujet = findSelectedLibrarySujet(
      yearEntry,
      selectedSujetSelection.selectedExamId,
      selectedSujetSelection.selectedSujetNumber,
    );

    if (selectedSujet) {
      initialExam = await fetchServerExam(
        selectedSujet.examId,
        selectedSujet.sujetNumber,
      ).catch(() => undefined);
    }
  }

  return (
    <LibraryWorkspace
      initialSearch={initialSearch}
      initialCatalog={initialCatalog}
      initialExam={initialExam}
    />
  );
}
