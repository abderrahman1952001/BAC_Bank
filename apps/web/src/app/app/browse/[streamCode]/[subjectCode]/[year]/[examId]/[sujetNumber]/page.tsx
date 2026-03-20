import { SujetViewer } from '@/components/sujet-viewer';

type SujetViewerPageProps = {
  params: Promise<{
    streamCode: string;
    subjectCode: string;
    year: string;
    examId: string;
    sujetNumber: string;
  }>;
};

export default async function SujetViewerPage({ params }: SujetViewerPageProps) {
  const { streamCode, subjectCode, year, examId, sujetNumber } = await params;

  return (
    <SujetViewer
      streamCode={streamCode}
      subjectCode={subjectCode}
      year={year}
      examId={examId}
      sujetNumber={sujetNumber}
    />
  );
}
