"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SubjectIcon } from "@/components/subject-icon";
import { useAuthSession } from "@/components/auth-provider";
import {
  EmptyState,
  StudyBadge,
  StudyHeader,
  StudyShell,
} from "@/components/study-shell";
import { Badge } from "@/components/ui/badge";
import { StudentNavbar } from "@/components/student-navbar";
import { Button } from "@/components/ui/button";
import { SelectionCard } from "@/components/ui/selection-card";
import {
  API_BASE_URL,
  fetchJson,
  parseCreateSessionResponse,
  parseSessionPreviewResponse,
  type CreateSessionResponse,
  type SessionPreviewResponse,
  type WeakPointInsightsResponse,
} from "@/lib/study-api";
import {
  buildStudentTrainingSessionRoute,
  STUDENT_TRAINING_ROUTE,
} from "@/lib/student-routes";

function pickInitialSubjectCode(
  insights: WeakPointInsightsResponse["data"],
  preferredSubjectCode: string | null,
) {
  if (
    preferredSubjectCode &&
    insights.some((subject) => subject.subject.code === preferredSubjectCode)
  ) {
    return preferredSubjectCode;
  }

  return insights[0]?.subject.code ?? "";
}

export function TrainingWeakPointBuilder({
  initialInsights,
}: {
  initialInsights?: WeakPointInsightsResponse;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthSession();
  const [selectedSubjectCode, setSelectedSubjectCode] = useState("");
  const [preview, setPreview] = useState<SessionPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const capability =
    user?.studyEntitlements.capabilities.weakPointDrill ??
    initialInsights?.enabled ??
    false;
  const insights = useMemo(
    () => initialInsights?.data ?? [],
    [initialInsights?.data],
  );
  const preferredSubjectCode =
    searchParams.get("subject")?.trim().toUpperCase() ?? null;
  const selectedInsight = useMemo(
    () =>
      insights.find((subject) => subject.subject.code === selectedSubjectCode) ??
      null,
    [insights, selectedSubjectCode],
  );
  const drillQuota = user?.studyEntitlements.quotas.drillStarts ?? null;

  useEffect(() => {
    const nextSubjectCode = pickInitialSubjectCode(insights, preferredSubjectCode);

    setSelectedSubjectCode((current) =>
      current === nextSubjectCode ? current : nextSubjectCode,
    );
  }, [insights, preferredSubjectCode]);

  useEffect(() => {
    let cancelled = false;

    if (!capability || !selectedSubjectCode) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    void fetchJson<SessionPreviewResponse>(
      `${API_BASE_URL}/study/sessions/preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "WEAK_POINT_DRILL",
          subjectCode: selectedSubjectCode,
          streamCodes: user?.stream?.code ? [user.stream.code] : undefined,
          exerciseCount: 6,
        }),
      },
      parseSessionPreviewResponse,
    )
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setPreview(payload);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setPreview(null);
        setPreviewError(
          error instanceof Error
            ? error.message
            : "تعذر تحميل معاينة دريل نقاط الضعف.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [capability, selectedSubjectCode, user?.stream?.code]);

  async function startWeakPointDrill() {
    if (!selectedInsight || starting) {
      return;
    }

    setStartError(null);
    setStarting(true);

    try {
      const payload = await fetchJson<CreateSessionResponse>(
        `${API_BASE_URL}/study/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            kind: "WEAK_POINT_DRILL",
            title: `دريل نقاط الضعف · ${selectedInsight.subject.name}`,
            subjectCode: selectedInsight.subject.code,
            streamCodes: user?.stream?.code ? [user.stream.code] : undefined,
            exerciseCount: 6,
          }),
        },
        parseCreateSessionResponse,
      );

      router.push(buildStudentTrainingSessionRoute(payload.id));
    } catch (error) {
      setStartError(
        error instanceof Error ? error.message : "تعذر بدء دريل نقاط الضعف.",
      );
    } finally {
      setStarting(false);
    }
  }

  if (!capability) {
    return (
      <StudyShell>
        <StudentNavbar />
        <section className="student-main-frame student-main-frame-builder">
          <StudyHeader
            eyebrow="نقاط الضعف"
            title="دريل نقاط الضعف"
            subtitle="يبني جلسة مباشرة من الإشارات الضعيفة الحديثة بعد مراجعاتك."
            actions={
              <Button asChild variant="outline" className="h-10 rounded-full px-5">
                <Link href={STUDENT_TRAINING_ROUTE}>العودة إلى التدريب</Link>
              </Button>
            }
          />
          <EmptyState
            title="هذا المسار متاح ضمن Premium"
            description="عند تفعيل Premium، سنعرض نقاط الضعف الأوضح ونقترح جلسة علاجية مباشرة."
            action={
              <Button asChild className="h-10 rounded-full px-5">
                <Link href={STUDENT_TRAINING_ROUTE}>العودة إلى التدريب</Link>
              </Button>
            }
          />
        </section>
      </StudyShell>
    );
  }

  if (!insights.length) {
    return (
      <StudyShell>
        <StudentNavbar />
        <section className="student-main-frame student-main-frame-builder">
          <StudyHeader
            eyebrow="نقاط الضعف"
            title="دريل نقاط الضعف"
            subtitle="يبني جلسة مباشرة من الإشارات الضعيفة الحديثة بعد مراجعاتك."
            actions={
              <Button asChild variant="outline" className="h-10 rounded-full px-5">
                <Link href={STUDENT_TRAINING_ROUTE}>العودة إلى التدريب</Link>
              </Button>
            }
          />
          <EmptyState
            title="لا توجد إشارات ضعف كافية بعد"
            description="أكمل بعض جلسات التدريب، ثم افتح الحل وعلّم الأسئلة التي فاتتك أو بدت صعبة حتى نبني مساراً علاجياً واضحاً."
            action={
              <div className="study-action-row">
                <Button asChild className="h-10 rounded-full px-5">
                  <Link href={STUDENT_TRAINING_ROUTE}>العودة إلى التدريب</Link>
                </Button>
              </div>
            }
          />
        </section>
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame student-main-frame-builder">
        <StudyHeader
          eyebrow="نقاط الضعف"
          title="دريل نقاط الضعف"
          subtitle="اختر مادة فيها إشارات ضعف حديثة، ثم ابدأ جلسة علاجية مبنية على نفس محرك التدريب."
          actions={
            <Button asChild variant="outline" className="h-10 rounded-full px-5">
              <Link href={STUDENT_TRAINING_ROUTE}>العودة إلى التدريب</Link>
            </Button>
          }
          meta={[
            ...(drillQuota
              ? [
                  {
                    label: "الدريل",
                    value:
                      drillQuota.monthlyLimit === null
                        ? "غير محدود"
                        : `${drillQuota.remaining}/${drillQuota.monthlyLimit}`,
                  },
                ]
              : []),
            ...(selectedInsight
              ? [
                  {
                    label: "الإشارات",
                    value: `${selectedInsight.weakSignalCount}`,
                  },
                ]
              : []),
          ]}
        />

        <section className="builder-preview-card builder-preview-summary-card">
          <h3>كيف نختار هذا الدريل؟</h3>
          <p>
            نجمع الإشارات الحديثة من الأسئلة التي علّمتها بأنها فاتتك أو بدت
            صعبة، مع المتروك، وكشف الحل، والتمارين المعلّمة للمراجعة، ثم نحوّلها
            إلى محاور علاجية داخل نفس المادة.
          </p>
        </section>

        <section className="builder-preview-card">
          <h3>المواد ذات الإشارات الأوضح</h3>
          <div className="builder-subject-grid">
            {insights.map((subject) => (
              <SelectionCard
                key={subject.subject.code}
                type="button"
                active={selectedSubjectCode === subject.subject.code}
                className="min-h-44 content-start border-primary/20 bg-secondary/60"
                onClick={() => setSelectedSubjectCode(subject.subject.code)}
              >
                <span className="builder-card-icon" aria-hidden="true">
                  <SubjectIcon
                    subjectCode={subject.subject.code}
                    subjectName={subject.subject.name}
                    size={24}
                  />
                </span>
                <strong>{subject.subject.name}</strong>
                <span>{subject.topTopics.slice(0, 2).map((topic) => topic.name).join(" · ")}</span>
              </SelectionCard>
            ))}
          </div>
        </section>

        {selectedInsight ? (
          <>
            <section className="builder-preview-card">
              <h3>المحاور المقترحة لهذا الدريل</h3>
              <div className="builder-preview-exercises">
                {selectedInsight.topTopics.map((topic) => (
                  <article
                    key={`${selectedInsight.subject.code}:${topic.code}`}
                    className="builder-preview-exercise"
                  >
                    <div>
                      <strong>{topic.name}</strong>
                      <p>
                        {[
                          topic.signalCounts.missed
                            ? `${topic.signalCounts.missed} فاتت`
                            : null,
                          topic.signalCounts.hard
                            ? `${topic.signalCounts.hard} صعبة`
                            : null,
                          topic.signalCounts.skipped
                            ? `${topic.signalCounts.skipped} متروكة`
                            : null,
                          topic.signalCounts.revealed
                            ? `${topic.signalCounts.revealed} مع كشف حل`
                            : null,
                          topic.signalCounts.flagged
                            ? `${topic.signalCounts.flagged} معلّمة`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <StudyBadge tone="warning">
                      {topic.weakSignalCount} إشارة
                    </StudyBadge>
                  </article>
                ))}
              </div>
            </section>

            <section className="builder-preview-card">
              <h3>المهارات الأكثر تأثراً</h3>
              <div className="chip-grid">
                {selectedInsight.topSkills.map((skill) => (
                  <Badge
                    key={skill.code}
                    variant="secondary"
                    className="px-3 py-1.5"
                  >
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {previewError ? <p className="error-text">{previewError}</p> : null}
        {startError ? <p className="error-text">{startError}</p> : null}

        {preview ? (
          <div className="builder-preview-stack">
            <section className="builder-preview-card builder-preview-summary-card">
              <h3>معاينة الجلسة</h3>
              <div className="study-meta-row">
                <span className="study-meta-pill">
                  <strong>التمارين المطابقة</strong>
                  <span>{preview.matchingExerciseCount}</span>
                </span>
                <span className="study-meta-pill">
                  <strong>المواضيع</strong>
                  <span>{preview.matchingSujetCount}</span>
                </span>
                <span className="study-meta-pill">
                  <strong>المحاور المستهدفة</strong>
                  <span>{preview.topicCodes.length}</span>
                </span>
              </div>
            </section>

            {preview.sampleExercises.length ? (
              <section className="builder-preview-card">
                <h3>أمثلة مما سيدخل في الجلسة</h3>
                <div className="builder-preview-exercises">
                  {preview.sampleExercises.map((exercise) => (
                    <article
                      key={`${exercise.exerciseNodeId}:${exercise.examId}`}
                      className="builder-preview-exercise"
                    >
                      <div>
                        <strong>
                          {exercise.title ?? `التمرين ${exercise.orderIndex}`}
                        </strong>
                        <p>
                          {exercise.subject.name} · {exercise.year} ·{" "}
                          {exercise.sujetLabel}
                        </p>
                      </div>
                      <span>{exercise.questionCount} أسئلة</span>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : previewLoading ? (
          <section className="builder-preview-card builder-preview-summary-card">
            <h3>جاري بناء المعاينة</h3>
            <p>نختار التمارين الأقرب إلى نقاط الضعف الحالية في هذه المادة.</p>
          </section>
        ) : null}

        <div className="builder-stage-actions">
          <Button asChild variant="outline" className="h-11 rounded-full px-5">
            <Link href={STUDENT_TRAINING_ROUTE}>رجوع</Link>
          </Button>
          <Button
            type="button"
            className="h-11 rounded-full px-5"
            onClick={() => void startWeakPointDrill()}
            disabled={
              starting ||
              previewLoading ||
              !preview ||
              preview.matchingExerciseCount === 0
            }
          >
            {starting ? "جارٍ البدء..." : "ابدأ دريل نقاط الضعف"}
          </Button>
        </div>
      </section>
    </StudyShell>
  );
}
