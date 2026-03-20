import { BrowseSubjects } from '@/components/browse-subjects';

type BrowseSubjectsPageProps = {
  params: Promise<{
    streamCode: string;
  }>;
};

export default async function BrowseSubjectsPage({
  params,
}: BrowseSubjectsPageProps) {
  const { streamCode } = await params;

  return <BrowseSubjects streamCode={streamCode} />;
}
