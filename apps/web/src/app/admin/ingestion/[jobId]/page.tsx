import { AdminIngestionReviewPage } from '@/components/admin-ingestion-review-page';

export default async function AdminIngestionReviewRoute({
  params,
}: {
  params: Promise<{
    jobId: string;
  }>;
}) {
  const { jobId } = await params;

  return <AdminIngestionReviewPage jobId={jobId} />;
}
