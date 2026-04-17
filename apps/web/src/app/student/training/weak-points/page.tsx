import { TrainingWeakPointBuilder } from "@/components/training-weak-point-builder";
import { fetchServerWeakPointInsights } from "@/lib/server-study-api";

export default async function StudentTrainingWeakPointsPage() {
  const initialInsights = await fetchServerWeakPointInsights({
    limit: 4,
  }).catch(() => undefined);

  return <TrainingWeakPointBuilder initialInsights={initialInsights} />;
}
