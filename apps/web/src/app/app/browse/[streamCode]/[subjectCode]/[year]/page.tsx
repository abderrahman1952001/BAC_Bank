import { redirect } from 'next/navigation';

type BrowseYearPageProps = {
  params: Promise<{
    streamCode: string;
    subjectCode: string;
    year: string;
  }>;
};

export default async function BrowseYearPage({ params }: BrowseYearPageProps) {
  const { streamCode, subjectCode, year } = await params;

  redirect(
    `/app/browse?stream=${encodeURIComponent(streamCode)}&subject=${encodeURIComponent(subjectCode)}&year=${encodeURIComponent(year)}`,
  );
}
