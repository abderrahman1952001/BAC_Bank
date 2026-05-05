import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminIngestionStudentPreviewPage } from "@/components/admin-ingestion-student-preview-page";
import { buildAdminIngestionStudentPreviewExam } from "@/lib/admin-ingestion-student-preview";
import { getPostAuthRoute } from "@/lib/auth-routing";
import { requireServerSessionUser } from "@/lib/server-auth";
import { fetchServerAdminIngestionJob } from "@/lib/server-admin";

export const metadata: Metadata = {
  title: "Draft student preview · مِراس",
};

type SearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(params: SearchParams, key: string) {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentIngestionPreviewRoute({
  params,
  searchParams,
}: {
  params: Promise<{
    jobId: string;
  }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireServerSessionUser({
    allowIncompleteProfile: true,
  });

  if (user.role !== "ADMIN") {
    redirect(getPostAuthRoute(user));
  }

  const { jobId } = await params;
  const query = await searchParams;
  const sujetNumber = readSearchParam(query, "sujet");
  const initialExercise = readSearchParam(query, "exercise");
  const requestedStreamCode = readSearchParam(query, "stream") ?? null;
  const payload = await fetchServerAdminIngestionJob(jobId).catch(
    () => undefined,
  );
  const exam = payload
    ? buildAdminIngestionStudentPreviewExam(payload, {
        sujetNumber,
        streamCode: requestedStreamCode,
      })
    : null;

  return (
    <AdminIngestionStudentPreviewPage
      jobId={jobId}
      exam={exam}
      editorHref={`/admin/drafts/${encodeURIComponent(jobId)}`}
      streamCode={exam?.stream.code ?? requestedStreamCode}
      initialExercise={initialExercise}
    />
  );
}
