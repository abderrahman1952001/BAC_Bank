import { SujetViewer } from '@/components/sujet-viewer';

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

  return (
    <SujetViewer
      streamCode={streamCode}
      subjectCode={subjectCode}
      year={year}
      examId={examId}
      sujetNumber={sujetNumber}
      initialExercise={exercise}
      initialQuestion={question}
    />
  );
}
