import { BrowseWorkspace } from '@/components/browse-workspace';
import {
  buildInitialBrowseSelection,
  findBrowseStream,
  findBrowseSubject,
  findBrowseYearEntry,
  findSelectedBrowseSujet,
  reconcileBrowseSujetSelection,
} from '@/lib/browse-workspace';
import type { ExamResponse } from '@/lib/qbank';
import { fetchServerCatalog, fetchServerExam } from '@/lib/server-qbank';

type BrowseWorkspacePageProps = {
  searchParams: Promise<{
    stream?: string;
    subject?: string;
    year?: string;
    examId?: string;
    sujet?: string;
  }>;
};

export default async function BrowseWorkspacePage({
  searchParams,
}: BrowseWorkspacePageProps) {
  const resolvedSearchParams = await searchParams;
  const initialCatalog = await fetchServerCatalog().catch(() => undefined);
  const initialSelection = buildInitialBrowseSelection(resolvedSearchParams);

  let initialExam: ExamResponse | undefined;

  if (initialCatalog) {
    const stream = findBrowseStream(
      initialCatalog,
      initialSelection.selectedStreamCode,
    );
    const subject = findBrowseSubject(stream, initialSelection.selectedSubjectCode);
    const yearEntry = findBrowseYearEntry(subject, initialSelection.selectedYear);
    const selectedSujetSelection = reconcileBrowseSujetSelection(
      yearEntry,
      initialSelection.selectedExamId,
      initialSelection.selectedSujetNumber,
    );
    const selectedSujet = findSelectedBrowseSujet(
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
    <BrowseWorkspace
      initialSearch={resolvedSearchParams}
      initialCatalog={initialCatalog}
      initialExam={initialExam}
    />
  );
}
