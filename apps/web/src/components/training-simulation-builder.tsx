"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { SubjectIcon } from "@/components/subject-icon";
import { useAuthSession } from "@/components/auth-provider";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { SelectionCard } from "@/components/ui/selection-card";
import {
  createOfficialPaperSimulationSession,
  fetchStudyExamBySujet,
  formatSessionType,
  type CatalogResponse,
  type ExamResponse,
} from "@/lib/study-api";
import {
  buildOfficialSimulationPaperKey,
  listOfficialSimulationPapers,
  listTrainingSimulationStreams,
  listTrainingSimulationSubjects,
  resolveOfficialSimulationPaperKey,
  resolveTrainingSimulationStream,
  resolveTrainingSimulationSubjectCode,
} from "@/lib/training-simulation";
import {
  buildStudentTrainingSessionRoute,
  STUDENT_TRAINING_ROUTE,
} from "@/lib/student-routes";

export function TrainingSimulationBuilder({
  initialCatalog,
}: {
  initialCatalog?: CatalogResponse;
}) {
  const router = useRouter();
  const [refreshingCatalog, startRefreshingCatalog] = useTransition();
  const { user } = useAuthSession();
  const [selectedStreamCode, setSelectedStreamCode] = useState("");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState("");
  const [selectedPaperKey, setSelectedPaperKey] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamResponse | null>(null);
  const [startingSimulation, setStartingSimulation] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const catalog = initialCatalog ?? null;
  const studyEntitlements = user?.studyEntitlements ?? null;
  const simulationQuota = studyEntitlements?.quotas.simulationStarts ?? null;
  const simulationStartBlocked = Boolean(simulationQuota?.exhausted);
  const simulationStartBlockedMessage = simulationQuota?.exhausted
    ? `وصلت إلى الحد الشهري للمحاكاة. يتجدد في ${new Date(
        simulationQuota.resetsAt,
      ).toLocaleDateString("ar-DZ")}.`
    : null;

  const availableStreams = useMemo(
    () => listTrainingSimulationStreams(catalog),
    [catalog],
  );
  const activeStream = useMemo(
    () =>
      resolveTrainingSimulationStream({
        catalog,
        userStreamCode: user?.stream?.code ?? null,
        selectedStreamCode,
      }),
    [catalog, selectedStreamCode, user?.stream?.code],
  );
  const availableSubjects = useMemo(
    () => listTrainingSimulationSubjects(activeStream),
    [activeStream],
  );
  const papers = useMemo(
    () => listOfficialSimulationPapers(activeStream, selectedSubjectCode),
    [activeStream, selectedSubjectCode],
  );
  const selectedPaper = useMemo(
    () =>
      papers.find(
        (paper) => buildOfficialSimulationPaperKey(paper) === selectedPaperKey,
      ) ?? null,
    [papers, selectedPaperKey],
  );

  useEffect(() => {
    const nextStreamCode = activeStream?.code ?? "";

    setSelectedStreamCode((current) =>
      current === nextStreamCode ? current : nextStreamCode,
    );
  }, [activeStream?.code]);

  useEffect(() => {
    const nextSubjectCode = resolveTrainingSimulationSubjectCode(
      availableSubjects,
      selectedSubjectCode,
    );

    setSelectedSubjectCode((current) =>
      current === nextSubjectCode ? current : nextSubjectCode,
    );
  }, [availableSubjects, selectedSubjectCode]);

  useEffect(() => {
    const nextPaperKey = resolveOfficialSimulationPaperKey(
      papers,
      selectedPaperKey,
    );

    setSelectedPaperKey((current) =>
      current === nextPaperKey ? current : nextPaperKey,
    );
  }, [papers, selectedPaperKey]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedPaper) {
      setSelectedExam(null);
      setPreviewError(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    void fetchStudyExamBySujet(selectedPaper.examId, selectedPaper.sujetNumber)
      .then((exam) => {
        if (cancelled) {
          return;
        }

        setSelectedExam(exam);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setSelectedExam(null);
        setPreviewError(
          error instanceof Error
            ? error.message
            : "تعذر تحميل بيانات المحاكاة الرسمية.",
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
  }, [selectedPaper]);

  async function startSimulation() {
    if (!selectedPaper || !selectedExam || startingSimulation) {
      return;
    }

    setStartingSimulation(true);
    setStartError(null);

    try {
      const session = await createOfficialPaperSimulationSession({
        examId: selectedPaper.examId,
        sujetNumber: selectedPaper.sujetNumber,
        subjectCode: selectedPaper.subjectCode,
        streamCode: selectedPaper.streamCode,
        year: selectedPaper.year,
        sessionType: selectedPaper.sessionType,
        title:
          selectedExam.selectedSujetLabel ??
          `محاكاة ${selectedPaper.subjectName} · ${selectedPaper.year}`,
      });

      router.push(buildStudentTrainingSessionRoute(session.id));
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : "تعذر بدء المحاكاة الرسمية.",
      );
    } finally {
      setStartingSimulation(false);
    }
  }

  if (!catalog) {
    return (
      <StudyShell>
        <StudentNavbar />
        <section className="student-main-frame student-main-frame-builder">
          <StudyHeader title="محاكاة امتحان كاملة" />
          <EmptyState
            title="تعذر تحميل المواضيع الرسمية"
            description="أعد المحاولة لتحميل فهرس المحاكاة."
            action={
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-5"
                onClick={() => {
                  startRefreshingCatalog(() => {
                    router.refresh();
                  });
                }}
                disabled={refreshingCatalog}
              >
                {refreshingCatalog ? "جارٍ التحديث..." : "إعادة المحاولة"}
              </Button>
            }
          />
        </section>
      </StudyShell>
    );
  }

  if (!availableStreams.length || !activeStream) {
    return (
      <StudyShell>
        <StudentNavbar />
        <section className="student-main-frame student-main-frame-builder">
          <StudyHeader title="محاكاة امتحان كاملة" />
          <EmptyState
            title="لا توجد مواضيع رسمية جاهزة للمحاكاة"
            description="أكمل اختيار الشعبة أو عُد لاحقاً بعد نشر المحتوى."
            action={
              <Button asChild variant="outline" className="h-10 rounded-full px-5">
                <Link href={STUDENT_TRAINING_ROUTE}>العودة إلى التدريب</Link>
              </Button>
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
          eyebrow="المحاكاة"
          title="محاكاة امتحان كاملة"
          subtitle="اختر مادة، ثم موضوع BAC رسمي، ثم راجع بياناته قبل البدء."
          actions={
            <Button asChild variant="outline" className="h-10 rounded-full px-5">
              <Link href={STUDENT_TRAINING_ROUTE}>العودة إلى التدريب</Link>
            </Button>
          }
        />

        <section className="builder-preview-card builder-preview-summary-card">
          <h3>حصة المحاكاة</h3>
          <p>
            {studyEntitlements?.tier === "PREMIUM"
              ? "Premium · بدء غير محدود للمحاكاة الرسمية."
              : `Free · المتبقي هذا الشهر: ${
                  simulationQuota?.monthlyLimit === null
                    ? "غير محدود"
                    : `${simulationQuota?.remaining}/${simulationQuota?.monthlyLimit ?? 0}`
                }`}
          </p>
        </section>

        {simulationStartBlocked && simulationStartBlockedMessage ? (
          <section className="builder-wizard-alert" role="status">
            <h3>بدء محاكاة جديدة غير متاح حالياً</h3>
            <p>{simulationStartBlockedMessage}</p>
          </section>
        ) : null}

        {!user?.stream && availableStreams.length > 1 ? (
          <section className="builder-preview-card">
            <h3>الشعبة</h3>
            <div className="chip-grid">
              {availableStreams.map((stream) => (
                <FilterChip
                  key={stream.code}
                  type="button"
                  active={activeStream.code === stream.code}
                  onClick={() => setSelectedStreamCode(stream.code)}
                >
                  {stream.name}
                </FilterChip>
              ))}
            </div>
          </section>
        ) : null}

        <section className="builder-preview-card">
          <h3>المادة</h3>
          <div className="builder-subject-grid">
            {availableSubjects.map((subject) => (
              <SelectionCard
                key={subject.code}
                type="button"
                active={selectedSubjectCode === subject.code}
                className="min-h-44 content-start border-primary/20 bg-secondary/60"
                onClick={() => setSelectedSubjectCode(subject.code)}
              >
                <span className="builder-card-icon" aria-hidden="true">
                  <SubjectIcon
                    subjectCode={subject.code}
                    subjectName={subject.name}
                    size={24}
                  />
                </span>
                <strong>{subject.name}</strong>
              </SelectionCard>
            ))}
          </div>
        </section>

        {papers.length ? (
          <section className="builder-preview-card">
            <h3>الموضوع الرسمي</h3>
            <div className="builder-preview-exercises">
              {papers.map((paper) => {
                const isActive =
                  buildOfficialSimulationPaperKey(paper) === selectedPaperKey;

                return (
                  <SelectionCard
                    key={buildOfficialSimulationPaperKey(paper)}
                    type="button"
                    active={isActive}
                    className="min-h-0 grid-cols-[1fr_auto] items-center"
                    onClick={() =>
                      setSelectedPaperKey(buildOfficialSimulationPaperKey(paper))
                    }
                  >
                    <div>
                      <strong>
                        بكالوريا {paper.year} · {paper.label}
                      </strong>
                      <p>
                        {activeStream.name} · {formatSessionType(paper.sessionType)}
                      </p>
                    </div>
                    <span>{paper.exerciseCount} تمارين</span>
                  </SelectionCard>
                );
              })}
            </div>
          </section>
        ) : (
          <EmptyState
            title="لا توجد مواضيع منشورة لهذه المادة بعد"
            description="اختر مادة أخرى أو عُد لاحقاً."
          />
        )}

        {previewError ? <p className="error-text">{previewError}</p> : null}
        {startError ? <p className="error-text">{startError}</p> : null}

        {previewLoading && selectedPaper ? (
          <section className="builder-assembling-state">
            <span className="builder-loading-orb" aria-hidden="true" />
            <div>
              <strong>جاري تحميل بيانات الموضوع</strong>
              <p>تحضير بطاقة المحاكاة الرسمية</p>
            </div>
          </section>
        ) : null}

        {selectedPaper && selectedExam ? (
          <section className="builder-preview-card builder-preview-summary-card">
            <h3>بطاقة المحاكاة</h3>
            <p>
              {selectedExam.subject.name} · {selectedExam.stream.name} ·{" "}
              {selectedExam.year} · {selectedExam.selectedSujetLabel ?? selectedPaper.label}
            </p>
            <div className="study-meta-row">
              <span className="study-meta-pill">
                <strong>النوع</strong>
                <span>{formatSessionType(selectedExam.sessionType)}</span>
              </span>
              <span className="study-meta-pill">
                <strong>المدة</strong>
                <span>{selectedExam.durationMinutes} دقيقة</span>
              </span>
              <span className="study-meta-pill">
                <strong>التمارين</strong>
                <span>{selectedExam.exerciseCount}</span>
              </span>
            </div>
            <p>
              تبدأ المحاكاة بزمن الامتحان الكامل، ويستمر العد حتى لو خرجت من
              الصفحة ثم عدت لاحقاً. التصحيح والدعم يفتحان فقط بعد التسليم أو
              انتهاء الوقت.
            </p>
            <div className="study-action-row">
              <Button
                type="button"
                className="h-11 rounded-full px-5"
                onClick={() => {
                  void startSimulation();
                }}
                disabled={startingSimulation || simulationStartBlocked}
              >
                {startingSimulation ? "جارٍ بدء المحاكاة..." : "ابدأ المحاكاة"}
              </Button>
            </div>
          </section>
        ) : null}
      </section>
    </StudyShell>
  );
}
