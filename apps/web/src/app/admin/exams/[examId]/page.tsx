import { AdminExamExercisesPage } from '@/components/admin-exam-exercises-page';

export default async function AdminExamExercisesRoute({
  params,
}: {
  params: Promise<{
    examId: string;
  }>;
}) {
  const { examId } = await params;

  return <AdminExamExercisesPage examId={examId} />;
}
