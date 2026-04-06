import { AdminLibraryPage } from "@/components/admin-library-page";
import {
  buildActiveRevisionJobIdsByPaperId,
  buildInitialAdminLibrarySelection,
  findAdminLibraryStream,
  findAdminLibrarySubject,
  findAdminLibraryYearEntry,
  findSelectedAdminLibrarySujet,
  resolveAdminLibraryInitialSelection,
} from "@/lib/admin-library";
import type { ExamResponse } from "@/lib/qbank";
import { fetchServerAdminIngestionJobs } from "@/lib/server-admin";
import { fetchServerCatalog, fetchServerExam } from "@/lib/server-qbank";

type AdminLibraryRouteProps = {
  searchParams: Promise<{
    stream?: string;
    subject?: string;
    year?: string;
    examId?: string;
    sujet?: string;
  }>;
};

export default async function AdminLibraryRoute({
  searchParams,
}: AdminLibraryRouteProps) {
  const resolvedSearchParams = await searchParams;
  const [initialCatalog, initialJobs] = await Promise.all([
    fetchServerCatalog().catch(() => undefined),
    fetchServerAdminIngestionJobs().catch(() => undefined),
  ]);
  const initialSelection = resolveAdminLibraryInitialSelection(
    initialCatalog,
    buildInitialAdminLibrarySelection(resolvedSearchParams),
  );

  let initialExam: ExamResponse | undefined;

  if (initialCatalog) {
    const stream = findAdminLibraryStream(
      initialCatalog,
      initialSelection.selectedStreamCode,
    );
    const subject = findAdminLibrarySubject(
      stream,
      initialSelection.selectedSubjectCode,
    );
    const yearEntry = findAdminLibraryYearEntry(
      subject,
      initialSelection.selectedYear,
    );
    const selectedSujet = findSelectedAdminLibrarySujet(
      yearEntry,
      initialSelection.selectedExamId,
      initialSelection.selectedSujetNumber,
    );

    if (selectedSujet) {
      initialExam = await fetchServerExam(
        selectedSujet.examId,
        selectedSujet.sujetNumber,
      ).catch(() => undefined);
    }
  }

  return (
    <AdminLibraryPage
      initialSelection={initialSelection}
      initialCatalog={initialCatalog}
      initialExam={initialExam}
      initialActiveRevisionJobIdsByPaperId={
        initialJobs
          ? buildActiveRevisionJobIdsByPaperId(initialJobs.data)
          : undefined
      }
    />
  );
}
