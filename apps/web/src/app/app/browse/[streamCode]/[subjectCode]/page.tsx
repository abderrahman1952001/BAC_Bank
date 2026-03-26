import { redirect } from 'next/navigation';

type BrowseYearsPageProps = {
  params: Promise<{
    streamCode: string;
    subjectCode: string;
  }>;
};

export default async function BrowseYearsPage({
  params,
}: BrowseYearsPageProps) {
  const { streamCode, subjectCode } = await params;

  redirect(
    `/app/browse?stream=${encodeURIComponent(streamCode)}&subject=${encodeURIComponent(subjectCode)}`,
  );
}
