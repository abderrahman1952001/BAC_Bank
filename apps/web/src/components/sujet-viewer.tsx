"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useAuthSession } from "@/components/auth-provider";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyShell } from "@/components/study-shell";
import {
  formatSujetLabel,
  SujetViewerExercisePaper,
  SujetViewerHero,
  SujetViewerNavigator,
  type SujetVariantLink,
} from "@/components/sujet-viewer-sections";
import {
  createExerciseDrillSession,
  createOfficialPaperSimulationSession,
  type ExamResponse,
} from "@/lib/study-api";
import {
  buildStudyExercisesFromExam,
  type StudyExerciseModel,
} from "@/lib/study-surface";
import {
  buildRouteWithSearchParams,
  buildStudentLibraryExamRouteWithSearch,
  STUDENT_LIBRARY_ROUTE,
  buildStudentTrainingSessionRoute,
} from "@/lib/student-routes";

function resolveRequestedExerciseId(
  exercises: StudyExerciseModel[],
  requestedExercise?: string,
) {
  if (!exercises.length) {
    return null;
  }

  if (requestedExercise && /^\d+$/.test(requestedExercise)) {
    return (
      exercises.find(
        (exercise) => exercise.orderIndex === Number(requestedExercise),
      )?.id ??
      exercises[0]?.id ??
      null
    );
  }

  if (requestedExercise) {
    return (
      exercises.find((exercise) => exercise.id === requestedExercise)?.id ??
      exercises[0]?.id ??
      null
    );
  }

  return exercises[0]?.id ?? null;
}

export function SujetViewer({
  streamCode,
  subjectCode,
  year,
  examId,
  sujetNumber,
  initialExercise,
  initialExam,
}: {
  streamCode: string;
  subjectCode: string;
  year: string;
  examId: string;
  sujetNumber: string;
  initialExercise?: string;
  initialExam?: ExamResponse;
}) {
  const router = useRouter();
  const { user } = useAuthSession();
  const [refreshingExam, startRefreshingExam] = useTransition();
  const [startingSimulation, setStartingSimulation] = useState(false);
  const [startingDrillExerciseId, setStartingDrillExerciseId] = useState<
    string | null
  >(null);
  const [startError, setStartError] = useState<string | null>(null);

  const decodedStreamCode = decodeURIComponent(streamCode);
  const decodedSubjectCode = decodeURIComponent(subjectCode);
  const decodedExamId = decodeURIComponent(examId);
  const parsedSujetNumber = Number(sujetNumber);
  const hasValidSujetNumber = Number.isInteger(parsedSujetNumber);
  const exam = initialExam ?? null;
  const drillQuota = user?.studyEntitlements.quotas.drillStarts ?? null;
  const simulationQuota = user?.studyEntitlements.quotas.simulationStarts ?? null;

  const exercises = useMemo(
    () => buildStudyExercisesFromExam(exam),
    [exam],
  );
  const requestedExerciseId = useMemo(
    () => resolveRequestedExerciseId(exercises, initialExercise),
    [exercises, initialExercise],
  );
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(
    requestedExerciseId,
  );
  const [revealedSolutions, setRevealedSolutions] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setActiveExerciseId(requestedExerciseId);
  }, [requestedExerciseId]);

  useEffect(() => {
    setRevealedSolutions({});
  }, [exam?.id, exam?.selectedSujetNumber]);

  const activeExercise = useMemo(
    () =>
      exercises.find((exercise) => exercise.id === activeExerciseId) ??
      exercises[0] ??
      null,
    [activeExerciseId, exercises],
  );

  const backToLibraryHref = useMemo(
    () =>
      buildRouteWithSearchParams(STUDENT_LIBRARY_ROUTE, {
        stream: decodedStreamCode,
        subject: decodedSubjectCode,
        year,
        examId: decodedExamId,
        sujet: sujetNumber,
      }),
    [
      decodedExamId,
      decodedStreamCode,
      decodedSubjectCode,
      sujetNumber,
      year,
    ],
  );

  const activeExerciseOrder = activeExercise?.orderIndex ?? 1;
  const variantLinks = useMemo<SujetVariantLink[]>(() => {
    if (!exam) {
      return [];
    }

    return exam.availableSujets.map((availableSujet) => ({
      href: buildStudentLibraryExamRouteWithSearch({
        streamCode: decodedStreamCode,
        subjectCode: decodedSubjectCode,
        year,
        examId: decodedExamId,
        sujetNumber: availableSujet.sujetNumber,
        exercise: activeExerciseOrder,
      }),
      label: formatSujetLabel(
        availableSujet.sujetNumber,
        availableSujet.label,
      ),
      isActive:
        availableSujet.sujetNumber ===
        (exam.selectedSujetNumber ?? (parsedSujetNumber === 2 ? 2 : 1)),
    }));
  }, [
    activeExerciseOrder,
    decodedExamId,
    decodedStreamCode,
    decodedSubjectCode,
    exam,
    parsedSujetNumber,
    year,
  ]);

  function handleSelectExercise(exerciseId: string) {
    const nextExercise = exercises.find((exercise) => exercise.id === exerciseId);

    if (!nextExercise || nextExercise.id === activeExercise?.id) {
      return;
    }

    setActiveExerciseId(nextExercise.id);

    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    startTransition(() => {
      router.replace(
        buildStudentLibraryExamRouteWithSearch({
          streamCode: decodedStreamCode,
          subjectCode: decodedSubjectCode,
          year,
          examId: decodedExamId,
          sujetNumber: parsedSujetNumber,
          exercise: nextExercise.orderIndex,
        }),
        {
          scroll: false,
        },
      );
    });
  }

  function toggleQuestionSolution(questionId: string) {
    setRevealedSolutions((current) => {
      if (current[questionId]) {
        const next = { ...current };
        delete next[questionId];
        return next;
      }

      return {
        ...current,
        [questionId]: true,
      };
    });
  }

  async function handleStartSimulation() {
    if (!exam || !hasValidSujetNumber || startingSimulation) {
      return;
    }

    setStartError(null);
    setStartingSimulation(true);

    try {
      const session = await createOfficialPaperSimulationSession({
        examId: exam.id,
        sujetNumber: parsedSujetNumber as 1 | 2,
        subjectCode: exam.subject.code,
        streamCode: exam.stream.code,
        year: exam.year,
        sessionType: exam.sessionType,
        title: `محاكاة ${exam.subject.name} · ${formatSujetLabel(
          parsedSujetNumber as 1 | 2,
          exam.selectedSujetLabel,
        )}`,
      });

      router.push(buildStudentTrainingSessionRoute(session.id));
    } catch (error) {
      setStartError(
        error instanceof Error ? error.message : "تعذر بدء المحاكاة لهذا الموضوع.",
      );
    } finally {
      setStartingSimulation(false);
    }
  }

  async function handleStartExerciseDrill(exercise: StudyExerciseModel) {
    if (startingDrillExerciseId) {
      return;
    }

    setStartError(null);
    setStartingDrillExerciseId(exercise.id);

    try {
      const session = await createExerciseDrillSession({
        exerciseNodeIds: [exercise.exerciseNodeId],
        subjectCode: exam?.subject.code ?? decodedSubjectCode,
        streamCode: exam?.stream.code ?? decodedStreamCode,
        year: exam?.year ?? Number(year),
        sessionType: exam?.sessionType ?? null,
        title: `دريل التمرين ${exercise.displayOrder} · ${exam?.subject.name ?? ""}`.trim(),
      });

      router.push(buildStudentTrainingSessionRoute(session.id));
    } catch (error) {
      setStartError(
        error instanceof Error ? error.message : "تعذر إنشاء دريل لهذا التمرين.",
      );
    } finally {
      setStartingDrillExerciseId(null);
    }
  }

  if (exam && activeExercise) {
    return (
      <StudyShell>
        <StudentNavbar />

        <section className="student-main-frame student-main-frame-sujet student-main-frame-paper">
          <SujetViewerHero
            exam={exam}
            backToLibraryHref={backToLibraryHref}
            simulationAction={
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  void handleStartSimulation();
                }}
                disabled={startingSimulation || Boolean(simulationQuota?.exhausted)}
              >
                {startingSimulation
                  ? "جارٍ إنشاء المحاكاة..."
                  : simulationQuota?.exhausted
                    ? "نفدت حصة المحاكاة"
                    : "ابدأ محاكاة هذا الموضوع"}
              </button>
            }
          />

          <SujetViewerNavigator
            variantLinks={variantLinks}
            exerciseTabs={exercises.map((exercise) => ({
              id: exercise.id,
              label: `التمرين ${exercise.displayOrder}`,
              isActive: exercise.id === activeExercise.id,
              onSelect: () => handleSelectExercise(exercise.id),
            }))}
          />

          <SujetViewerExercisePaper
            exam={exam}
            exercise={activeExercise}
            revealedSolutions={revealedSolutions}
            onToggleQuestionSolution={toggleQuestionSolution}
            exerciseAction={
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  void handleStartExerciseDrill(activeExercise);
                }}
                disabled={
                  startingDrillExerciseId === activeExercise.id ||
                  Boolean(drillQuota?.exhausted)
                }
              >
                {startingDrillExerciseId === activeExercise.id
                  ? "جارٍ إنشاء الدريل..."
                  : drillQuota?.exhausted
                    ? "نفدت حصة الدريل"
                    : "ابدأ دريل هذا التمرين"}
              </button>
            }
          />

          {startError ? <p className="error-text">{startError}</p> : null}
        </section>
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      <StudentNavbar />

      {hasValidSujetNumber ? (
        <EmptyState
          title="تعذر تحميل الموضوع"
          description="أعد المحاولة أو عد إلى المكتبة."
          action={
            <div className="study-action-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  startRefreshingExam(() => {
                    router.refresh();
                  });
                }}
                disabled={refreshingExam}
              >
                {refreshingExam ? "جارٍ التحديث..." : "إعادة المحاولة"}
              </button>
              <Link href={backToLibraryHref} className="btn-secondary">
                العودة إلى المكتبة
              </Link>
            </div>
          }
        />
      ) : (
        <EmptyState
          title="لا توجد بيانات لهذا الموضوع"
          description="اختر موضوعاً آخر."
        />
      )}
    </StudyShell>
  );
}
