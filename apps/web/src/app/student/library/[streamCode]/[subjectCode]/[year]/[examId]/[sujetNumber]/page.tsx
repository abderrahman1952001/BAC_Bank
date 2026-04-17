import { SujetViewer } from '@/components/sujet-viewer';
import { fetchServerExam } from '@/lib/server-study-api';

type StudentLibrarySujetViewerPageProps = {
  params: Promise<{
    streamCode: string;
    subjectCode: string;
    year: string;
    examId: string;
    sujetNumber: string;
  }>;
  searchParams: Promise<{
    exercise?: string;
  }>;
};

export default async function StudentLibrarySujetViewerPage({
  params,
  searchParams,
}: StudentLibrarySujetViewerPageProps) {
  const { streamCode, subjectCode, year, examId, sujetNumber } = await params;
  const { exercise } = await searchParams;
  const parsedSujetNumber = Number(sujetNumber);
  const initialExam = Number.isInteger(parsedSujetNumber)
    ? await fetchServerExam(examId, parsedSujetNumber).catch(() => undefined)
    : undefined;

  return (
    <SujetViewer
      streamCode={streamCode}
      subjectCode={subjectCode}
      year={year}
      examId={examId}
      sujetNumber={sujetNumber}
      initialExercise={exercise}
      initialExam={initialExam}
    />
  );
}
