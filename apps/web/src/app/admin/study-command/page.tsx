import { AdminStudyCommandDiagnosticsPage } from "@/components/admin-study-command-diagnostics-page";
import { fetchServerAdminStudyCommandDiagnostics } from "@/lib/server-admin";

export default async function AdminStudyCommandRoute() {
  const diagnostics = await fetchServerAdminStudyCommandDiagnostics().catch(
    () => undefined,
  );

  return <AdminStudyCommandDiagnosticsPage diagnostics={diagnostics} />;
}
