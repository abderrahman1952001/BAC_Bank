import { TrainingSimulationBuilder } from "@/components/training-simulation-builder";
import { fetchServerCatalog } from "@/lib/server-study-api";

export default async function StudentTrainingSimulationPage() {
  const initialCatalog = await fetchServerCatalog().catch(() => undefined);

  return <TrainingSimulationBuilder initialCatalog={initialCatalog} />;
}
