import {
  parseStudyCommandAcceptRequest,
  parseStudyCommandAcceptResponse,
  type StudyCommandAcceptResponse,
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
  const payload = parseStudyCommandAcceptRequest(body);

  if (
    process.env.PLAYWRIGHT_TEST_AUTH === "true" &&
    process.env.PLAYWRIGHT_FIXTURE_DATA !== "false"
  ) {
    return NextResponse.json(
      buildPlaywrightStudyCommandAcceptResponse(payload.command),
    );
  }

  const response = await fetchServerApiJson<StudyCommandAcceptResponse>(
    "/study/command/accept",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "Study command acceptance failed.",
    parseStudyCommandAcceptResponse,
  );

  return NextResponse.json(response);
}

function buildPlaywrightStudyCommandAcceptResponse(
  command: string,
): StudyCommandAcceptResponse {
  const href = "/student/training/session-123";

  return {
    kind: "OPEN_ROUTE",
    href,
    proposal: {
      mode: "CONTINUE_SESSION",
      title: "مواصلة Focused training",
      subtitle: command.trim() || "أريد مواصلة جلسة Focused training الآن",
      estimatedMinutes: 20,
      rationale: "لديك جلسة مفتوحة؛ إكمالها يقلل التشتت ويحافظ على السياق.",
      primaryHref: href,
      primaryLabel: "مواصلة الجلسة",
      primaryAction: {
        kind: "OPEN_ROUTE",
        href,
      },
      steps: [
        {
          title: "الرجوع إلى نفس السياق",
          detail: "نفتح الجلسة التي توقفت عندها بدون تغيير المسار.",
        },
      ],
      fineTuneOptions: [],
    },
  };
}
