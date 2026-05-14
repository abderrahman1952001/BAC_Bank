"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpLeft, CheckCircle2, Play, RotateCcw } from "lucide-react";
import { StudyBadge } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import {
  completeLabMissionAttempt,
  startLabMissionAttempt,
  type LabMissionAttempt,
  type LabMissionItem,
} from "@/lib/lab-api";

type LabMissionPanelProps = {
  missions: LabMissionItem[];
  toolHref: string;
};

function buildMissionToolHref(toolHref: string, missionId: string) {
  const params = new URLSearchParams({
    mission: missionId,
  });

  return `${toolHref}?${params.toString()}`;
}

function getMissionStatusLabel(item: LabMissionItem) {
  if (item.latestAttempt?.status === "IN_PROGRESS") {
    return "قيد الإنجاز";
  }

  if (item.completedAttemptCount > 0) {
    return "مكتملة";
  }

  return "لم تبدأ";
}

function getMissionStatusTone(item: LabMissionItem) {
  if (item.latestAttempt?.status === "IN_PROGRESS") {
    return "brand";
  }

  if (item.completedAttemptCount > 0) {
    return "success";
  }

  return "neutral";
}

export function LabMissionPanel({ missions, toolHref }: LabMissionPanelProps) {
  const [items, setItems] = useState(missions);
  const [busyMissionId, setBusyMissionId] = useState<string | null>(null);
  const [busyAttemptId, setBusyAttemptId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completedCount = useMemo(
    () => items.filter((item) => item.completedAttemptCount > 0).length,
    [items],
  );

  function updateMissionAttempt(
    missionId: string,
    attempt: LabMissionAttempt,
    completedDelta = 0,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.mission.id === missionId
          ? {
              ...item,
              latestAttempt: attempt,
              completedAttemptCount:
                item.completedAttemptCount + completedDelta,
            }
          : item,
      ),
    );
  }

  async function handleStartMission(missionId: string) {
    setBusyMissionId(missionId);
    setNotice(null);
    setError(null);

    try {
      const response = await startLabMissionAttempt(missionId);

      updateMissionAttempt(missionId, response.attempt);
      setNotice("بدأت المهمة. افتح الأداة واتبع الهدف المحدد.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "تعذر بدء مهمة المختبر.",
      );
    } finally {
      setBusyMissionId(null);
    }
  }

  async function handleCompleteMission(
    attempt: LabMissionAttempt,
    status: "COMPLETED" | "FAILED",
  ) {
    setBusyAttemptId(attempt.id);
    setNotice(null);
    setError(null);

    try {
      const response = await completeLabMissionAttempt(attempt.id, {
        status,
        resultJson: {
          completedFrom: "lab-home",
        },
      });

      updateMissionAttempt(
        response.attempt.missionId,
        response.attempt,
        status === "COMPLETED" && attempt.status !== "COMPLETED" ? 1 : 0,
      );
      setNotice(
        status === "COMPLETED"
          ? "تم تثبيت المهمة في سجل المختبر."
          : "حُفظت المحاولة لإعادتها لاحقاً.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "تعذر تحديث مهمة المختبر.",
      );
    } finally {
      setBusyAttemptId(null);
    }
  }

  if (!items.length) {
    return null;
  }

  return (
    <section className="lab-mission-panel" aria-label="مهمات المختبر">
      <div className="lab-mission-panel-head">
        <div>
          <p className="page-kicker">Missions</p>
          <h4>مهمات قصيرة</h4>
        </div>
        <StudyBadge tone={completedCount ? "success" : "accent"}>
          {completedCount}/{items.length}
        </StudyBadge>
      </div>

      {notice ? <p className="lab-mission-notice">{notice}</p> : null}
      {error ? <p className="lab-mission-error">{error}</p> : null}

      <div className="lab-mission-list">
        {items.map((item) => {
          const latestAttempt = item.latestAttempt;
          const inProgress = latestAttempt?.status === "IN_PROGRESS";

          return (
            <article key={item.mission.id} className="lab-mission-card">
              <div className="lab-mission-card-head">
                <div>
                  <h5>{item.mission.title}</h5>
                  <span>
                    {item.mission.learningTarget?.name ??
                      item.mission.curriculumNode?.name ??
                      "مهمة تدريبية"}
                  </span>
                </div>
                <StudyBadge tone={getMissionStatusTone(item)}>
                  {getMissionStatusLabel(item)}
                </StudyBadge>
              </div>

              <p>{item.mission.goal}</p>

              <div className="lab-mission-actions">
                {inProgress ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        void handleCompleteMission(latestAttempt, "COMPLETED")
                      }
                      disabled={busyAttemptId === latestAttempt.id}
                    >
                      <CheckCircle2
                        data-icon="inline-start"
                        strokeWidth={2.1}
                      />
                      <span>
                        {busyAttemptId === latestAttempt.id
                          ? "جارٍ الحفظ..."
                          : "أنهيت المهمة"}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void handleCompleteMission(latestAttempt, "FAILED")
                      }
                      disabled={busyAttemptId === latestAttempt.id}
                    >
                      <RotateCcw data-icon="inline-start" strokeWidth={2.1} />
                      <span>أحتاج إعادة</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      item.completedAttemptCount > 0 ? "outline" : "default"
                    }
                    onClick={() => void handleStartMission(item.mission.id)}
                    disabled={busyMissionId === item.mission.id}
                  >
                    <Play data-icon="inline-start" strokeWidth={2.1} />
                    <span>
                      {busyMissionId === item.mission.id
                        ? "جارٍ البدء..."
                        : item.completedAttemptCount > 0
                          ? "إعادة المهمة"
                          : "ابدأ المهمة"}
                    </span>
                  </Button>
                )}

                <Button asChild size="sm" variant="ghost">
                  <Link href={buildMissionToolHref(toolHref, item.mission.id)}>
                    افتح الأداة
                    <ArrowUpLeft data-icon="inline-end" strokeWidth={2.1} />
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
