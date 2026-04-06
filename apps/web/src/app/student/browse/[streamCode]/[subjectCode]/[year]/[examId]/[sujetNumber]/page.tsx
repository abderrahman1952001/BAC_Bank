import { SujetViewer } from '@/components/sujet-viewer';
import { fetchServerExam } from '@/lib/server-qbank';

type SujetViewerPageProps = {
  params: Promise<{
    streamCode: string;
    subjectCode: string;
    year: string;
    examId: string;
    sujetNumber: string;
  }>;
  searchParams: Promise<{
    exercise?: string;
    question?: string;
  }>;
};

export default async function SujetViewerPage({
  params,
  searchParams,
}: SujetViewerPageProps) {
  const { streamCode, subjectCode, year, examId, sujetNumber } = await params;
  const { exercise, question } = await searchParams;
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
      initialQuestion={question}
      initialExam={initialExam}
    />
  );
}
