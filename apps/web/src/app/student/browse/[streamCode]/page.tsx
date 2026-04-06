import { redirect } from 'next/navigation';

type BrowseSubjectsPageProps = {
  params: Promise<{
    streamCode: string;
  }>;
};

export default async function BrowseSubjectsPage({
  params,
}: BrowseSubjectsPageProps) {
  const { streamCode } = await params;

  redirect(`/student/browse?stream=${encodeURIComponent(streamCode)}`);
}
