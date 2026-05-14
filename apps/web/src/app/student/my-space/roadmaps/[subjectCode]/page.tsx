import { redirect } from "next/navigation";
import { buildStudentMySpaceCurriculumJourneyRoute } from "@/lib/student-routes";

export default async function LegacyStudentCurriculumJourneyRedirect({
  params,
}: {
  params: Promise<{ subjectCode: string }>;
}) {
  const { subjectCode: rawSubjectCode } = await params;
  const subjectCode = rawSubjectCode.trim().toUpperCase();
  redirect(buildStudentMySpaceCurriculumJourneyRoute(subjectCode));
}
