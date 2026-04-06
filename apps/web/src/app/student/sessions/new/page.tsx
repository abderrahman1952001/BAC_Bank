import { SessionBuilder } from '@/components/session-builder';
import { fetchServerFilters } from '@/lib/server-qbank';

export default async function NewSessionPage() {
  const initialFilters = await fetchServerFilters().catch(() => undefined);

  return <SessionBuilder initialFilters={initialFilters} />;
}
