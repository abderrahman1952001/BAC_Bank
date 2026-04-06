import { AdminIngestionReviewPage } from "@/components/admin-ingestion-review-page";
import { fetchServerAdminIngestionJob } from "@/lib/server-admin";

export default async function AdminDraftEditorRoute({
  params,
}: {
  params: Promise<{
    jobId: string;
  }>;
}) {
  const { jobId } = await params;
  const initialPayload = await fetchServerAdminIngestionJob(jobId).catch(
    () => undefined,
  );

  return (
    <AdminIngestionReviewPage
      jobId={jobId}
      initialPayload={initialPayload}
    />
  );
}
