import { AdminExerciseEditorPage } from '@/components/admin-exercise-editor-page';

export default async function AdminExerciseEditorRoute({
  params,
}: {
  params: Promise<{
    exerciseId: string;
  }>;
}) {
  const { exerciseId } = await params;

  return <AdminExerciseEditorPage exerciseId={exerciseId} />;
}
