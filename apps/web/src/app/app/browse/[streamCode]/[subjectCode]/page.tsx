import { BrowseYears } from '@/components/browse-years';

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

  return (
    <BrowseYears
      streamCode={streamCode}
      subjectCode={subjectCode}
    />
  );
}
