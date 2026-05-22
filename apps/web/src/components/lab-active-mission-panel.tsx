"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Play, RotateCcw } from "lucide-react";
import { StudyBadge } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import {
  completeLabMissionAttempt,
  startLabMissionAttempt,
  type LabMissionAttempt,
  type LabMissionItem,
} from "@/lib/lab-api";
import { STUDENT_LAB_ROUTE } from "@/lib/student-routes";

type ActiveLabMissionPanelProps = {
  missionItem: LabMissionItem | null;
  resultJson: Record<string, unknown>;
};

function getStatusLabel(attempt: LabMissionAttempt | null) {
  if (!attempt) {
    return "جاهزة للبدء";
  }

  if (attempt.status === "COMPLETED") {
    return "مكتملة";
  }

  if (attempt.status === "FAILED") {
    return "تحتاج إعادة";
  }

  return "قيد الإنجاز";
}

function getStatusTone(attempt: LabMissionAttempt | null) {
  if (!attempt) {
    return "accent";
  }

  if (attempt.status === "COMPLETED") {
    return "success";
  }

  if (attempt.status === "FAILED") {
    return "warning";
  }

  return "brand";
}

function describeExitCheck(exitCheck: Record<string, unknown> | null) {
  const kind = typeof exitCheck?.kind === "string" ? exitCheck.kind : null;

  switch (kind) {
    case "ROOTS_NEAR":
      return "تحقق من الجذور التقريبية على الرسم وجدول القيم.";
    case "SIGN_INTERVALS":
      return "اكتب مجالات الإشارة بعد تحديد الجذور.";
    case "VERTEX_NEAR":
      return "حدد القيمة القصوى بصرياً ثم اربطها بالتغيرات.";
    case "MRNA_AND_CODONS":
      return "تحقق من mRNA والرامزات الناتجة.";
    case "MUTATION_EFFECT":
      return "صنّف أثر الطفرة على السلسلة البروتينية.";
    case "DOCUMENT_EVIDENCE":
      return "اختر الأدلة الأساسية واكتب استنتاجا يتضمن العلاقات المطلوبة.";
    default:
      return "أنهِ المهمة عندما تستطيع شرح الملاحظة بكلماتك.";
  }
}

export function ActiveLabMissionPanel({
  missionItem,
  resultJson,
}: ActiveLabMissionPanelProps) {
  const [latestAttempt, setLatestAttempt] = useState(
    missionItem?.latestAttempt ?? null,
  );
  const [completedCount, setCompletedCount] = useState(
    missionItem?.completedAttemptCount ?? 0,
  );
  const [busy, setBusy] = useState<"start" | "complete" | "retry" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!missionItem) {
    return null;
  }

  async function handleStartMission() {
    if (!missionItem) {
      return;
    }

    setBusy("start");
    setNotice(null);
    setError(null);

    try {
      const response = await startLabMissionAttempt(missionItem.mission.id);

      setLatestAttempt(response.attempt);
      setNotice("بدأت المهمة. طبّق الملاحظة ثم احفظ النتيجة من هنا.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر بدء المهمة.");
    } finally {
      setBusy(null);
    }
  }

  async function handleCompleteMission(status: "COMPLETED" | "FAILED") {
    if (!latestAttempt) {
      return;
    }

    setBusy(status === "COMPLETED" ? "complete" : "retry");
    setNotice(null);
    setError(null);

    try {
      const response = await completeLabMissionAttempt(latestAttempt.id, {
        status,
        resultJson,
      });

      setLatestAttempt(response.attempt);
      if (status === "COMPLETED" && latestAttempt.status !== "COMPLETED") {
        setCompletedCount((value) => value + 1);
      }
      setNotice(
        status === "COMPLETED"
          ? "تم التحقق من نتيجة المهمة وحفظها في سجل المختبر."
          : "حُفظت المحاولة، ويمكنك إعادة المهمة لاحقاً.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ المهمة.");
    } finally {
      setBusy(null);
    }
  }

  const isInProgress = latestAttempt?.status === "IN_PROGRESS";

  return (
    <section className="lab-active-mission" aria-label="المهمة الحالية">
      <div className="lab-active-mission-head">
        <div>
          <p className="page-kicker">Mission</p>
          <h2>{missionItem.mission.title}</h2>
        </div>
        <StudyBadge tone={getStatusTone(latestAttempt)}>
          {getStatusLabel(latestAttempt)}
        </StudyBadge>
      </div>

      <p>{missionItem.mission.goal}</p>

      <div className="lab-active-mission-meta">
        <span>
          {missionItem.mission.learningTarget?.name ??
            missionItem.mission.curriculumNode?.name ??
            "هدف تعلم"}
        </span>
        <span>{describeExitCheck(missionItem.mission.exitCheck)}</span>
        <span>{completedCount} إنجاز سابق</span>
      </div>

      {notice ? <p className="lab-mission-notice">{notice}</p> : null}
      {error ? <p className="lab-mission-error">{error}</p> : null}

      <div className="lab-active-mission-actions">
        {isInProgress ? (
          <>
            <Button
              type="button"
              onClick={() => void handleCompleteMission("COMPLETED")}
              disabled={busy !== null}
            >
              <CheckCircle2 data-icon="inline-start" strokeWidth={2.1} />
              <span>
                {busy === "complete" ? "جارٍ التحقق..." : "تحقق وأنهِ المهمة"}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCompleteMission("FAILED")}
              disabled={busy !== null}
            >
              <RotateCcw data-icon="inline-start" strokeWidth={2.1} />
              <span>{busy === "retry" ? "جارٍ الحفظ..." : "أحتاج إعادة"}</span>
            </Button>
          </>
        ) : (
          <Button
            type="button"
            onClick={() => void handleStartMission()}
            disabled={busy !== null}
          >
            <Play data-icon="inline-start" strokeWidth={2.1} />
            <span>{busy === "start" ? "جارٍ البدء..." : "ابدأ المهمة"}</span>
          </Button>
        )}

        <Button asChild variant="ghost">
          <Link href={STUDENT_LAB_ROUTE}>كل المهمات</Link>
        </Button>
      </div>
    </section>
  );
}
