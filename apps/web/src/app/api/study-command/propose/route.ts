import {
  parseStudyCommandProposalRequest,
  parseStudyCommandProposalResponse,
  type StudyCommandProposalResponse,
} from "@bac-bank/contracts/study-command";
import { NextResponse } from "next/server";
import { fetchServerApiJson } from "@/lib/server-api";
import { readServerSessionUser } from "@/lib/server-auth";

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

  if (
    process.env.PLAYWRIGHT_TEST_AUTH === "true" &&
    process.env.PLAYWRIGHT_FIXTURE_DATA !== "false"
  ) {
    return NextResponse.json(
      buildPlaywrightStudyCommandProposal(payload.command),
    );
  }

  const response = await fetchServerApiJson<StudyCommandProposalResponse>(
    "/study/command/propose",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "Study command proposal failed.",
    parseStudyCommandProposalResponse,
  );

  return NextResponse.json(response);
}

function buildPlaywrightStudyCommandProposal(
  command: string,
): StudyCommandProposalResponse {
  const trimmedCommand = command.trim();

  if (!trimmedCommand) {
    return {
      proposal: null,
    };
  }

  const title = "تدريب BAC علوم الطبيعة والحياة · البروتينات";

  return {
    proposal: {
      mode: "BAC_TRAINING",
      title,
      subtitle: trimmedCommand,
      estimatedMinutes: 35,
      rationale:
        "نبدأ من تدريب قريب من BAC حتى تبقى المراجعة مرتبطة بما سيظهر في الامتحان.",
      availability: {
        status: "READY",
        matchingExerciseCount: 3,
      },
      primaryHref:
        "/student/training/drill?subject=NATURAL_SCIENCES&topic=PROTEINS",
      primaryLabel: "بدء الجلسة",
      primaryAction: {
        kind: "CREATE_STUDY_SESSION",
        request: {
          title,
          subjectCode: "NATURAL_SCIENCES",
          kind: "TOPIC_DRILL",
          topicCodes: ["PROTEINS"],
          streamCodes: ["SE"],
          years: [2025, 2024, 2023],
          sessionTypes: ["NORMAL", "MAKEUP"],
          exerciseCount: 4,
          timingEnabled: false,
        },
      },
      steps: [
        {
          title: "تدريب على نمط BAC",
          detail: "نبدأ من أسئلة رسمية أو قريبة من الرسمي.",
        },
        {
          title: "تصحيح موثوق",
          detail: "التصحيح الرسمي يسبق أي شرح إضافي.",
        },
      ],
      fineTuneOptions: ["اجعلها أقصر", "زد تمريناً واحداً", "آخر 3 سنوات فقط"],
    },
  };
}
