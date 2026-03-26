import { BrowseWorkspace } from '@/components/browse-workspace';

type BrowseWorkspacePageProps = {
  searchParams: Promise<{
    stream?: string;
    subject?: string;
    year?: string;
    examId?: string;
    sujet?: string;
  }>;
};

export default async function BrowseWorkspacePage({
  searchParams,
}: BrowseWorkspacePageProps) {
  const resolvedSearchParams = await searchParams;

  return <BrowseWorkspace initialSearch={resolvedSearchParams} />;
}
