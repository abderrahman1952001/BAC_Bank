import {
  parseStudyCommandProposalRequest,
  type StudyCommandProposalResponse,
} from "@bac-bank/contracts/study-command";
import { NextResponse } from "next/server";
import { readServerSessionUser } from "@/lib/server-auth";
import { fetchServerDueFlashcards } from "@/lib/server-flashcards-api";
import { fetchServerLabTools } from "@/lib/server-lab-api";
import {
  fetchServerCatalog,
  fetchServerFilters,
  fetchServerMyMistakes,
  fetchServerRecentExamActivities,
  fetchServerRecentStudySessions,
  fetchServerStudyCurriculumJourneys,
  fetchServerWeakPointInsights,
} from "@/lib/server-study-api";
import { buildStudyCommandProposal } from "@/lib/study-command";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await readServerSessionUser();

  if (!user) {
    return NextResponse.json(
      { message: "Authentication is required for study commands." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const payload = parseStudyCommandProposalRequest(body);
  const [
    recentSessions,
    recentExamActivities,
    myMistakes,
    curriculumJourneys,
    weakPointInsights,
    dueFlashcards,
    labTools,
    filters,
    catalog,
  ] = await Promise.all([
    fetchServerRecentStudySessions(6)
      .then((response) => response.data)
      .catch(() => []),
    fetchServerRecentExamActivities(6)
      .then((response) => response.data)
      .catch(() => []),
    fetchServerMyMistakes({ limit: 6 })
      .then((response) => response.data)
      .catch(() => []),
    fetchServerStudyCurriculumJourneys({ limit: 4 })
      .then((response) => response.data)
      .catch(() => []),
    fetchServerWeakPointInsights({ limit: 4 })
      .then((response) => response.data)
      .catch(() => []),
    fetchServerDueFlashcards({ limit: 6 })
      .then((response) => response.data)
      .catch(() => []),
    fetchServerLabTools()
      .then((response) => response.data)
      .catch(() => []),
    fetchServerFilters().catch(() => null),
    fetchServerCatalog().catch(() => null),
  ]);
  const response: StudyCommandProposalResponse = {
    proposal: buildStudyCommandProposal(payload.command, {
      sessions: recentSessions,
      recentExamActivities,
      myMistakes,
      curriculumJourneys,
      weakPointInsights,
      dueFlashcards,
      labTools,
      filters,
      catalog,
      userStreamCode: user.stream?.code ?? null,
    }),
  };

  return NextResponse.json(response);
}
