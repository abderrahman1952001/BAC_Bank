"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyShell } from "@/components/study-shell";
import {
  formatSujetLabel,
  SujetViewerExercisePaper,
  SujetViewerHero,
  SujetViewerNavigator,
  type SujetVariantLink,
} from "@/components/sujet-viewer-sections";
import type { ExamResponse } from "@/lib/study-api";
import {
  buildStudyExercisesFromExam,
  type StudyExerciseModel,
} from "@/lib/study-surface";
import { buildStudentIngestionPreviewRouteWithSearch } from "@/lib/student-routes";

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

export function AdminIngestionStudentPreviewPage({
  jobId,
  exam,
  editorHref,
  streamCode,
  initialExercise,
}: {
  jobId: string;
  exam: ExamResponse | null;
  editorHref: string;
  streamCode: string | null;
  initialExercise?: string;
}) {
  const router = useRouter();
  const [revealedSolutions, setRevealedSolutions] = useState<
    Record<string, boolean>
  >({});
  const exercises = useMemo(() => buildStudyExercisesFromExam(exam), [exam]);
  const requestedExerciseId = useMemo(
    () => resolveRequestedExerciseId(exercises, initialExercise),
    [exercises, initialExercise],
  );
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(
    requestedExerciseId,
  );

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
  const activeExerciseOrder = activeExercise?.orderIndex ?? 1;
  const selectedSujetNumber = exam?.selectedSujetNumber ?? 1;
  const variantLinks = useMemo<SujetVariantLink[]>(() => {
    if (!exam) {
      return [];
    }

    return exam.availableSujets.map((availableSujet) => ({
      href: buildStudentIngestionPreviewRouteWithSearch({
        jobId,
        sujetNumber: availableSujet.sujetNumber,
        exercise: activeExerciseOrder,
        streamCode,
      }),
      label: formatSujetLabel(
        availableSujet.sujetNumber,
        availableSujet.label,
      ),
      isActive: availableSujet.sujetNumber === selectedSujetNumber,
    }));
  }, [activeExerciseOrder, exam, jobId, selectedSujetNumber, streamCode]);

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
        buildStudentIngestionPreviewRouteWithSearch({
          jobId,
          sujetNumber: selectedSujetNumber,
          exercise: nextExercise.orderIndex,
          streamCode,
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

  if (exam && activeExercise) {
    return (
      <StudyShell>
        <StudentNavbar />

        <section className="student-main-frame student-main-frame-sujet student-main-frame-paper">
          <SujetViewerHero
            exam={exam}
            backToLibraryHref={editorHref}
            backLabel="العودة إلى المسودة"
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
          />
        </section>
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      <StudentNavbar />
      <EmptyState
        title="لا توجد معاينة جاهزة"
        description="تحتاج المسودة إلى موضوع واحد على الأقل وتمرين واحد حتى تظهر هنا."
      />
    </StudyShell>
  );
}
