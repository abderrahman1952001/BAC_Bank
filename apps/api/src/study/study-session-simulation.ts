import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { SessionPreviewResponse } from '@bac-bank/contracts/study';
import {
  Prisma,
  SessionType,
  StudySessionFamily,
  StudySessionKind,
} from '@prisma/client';
import { CreateStudySessionDto } from './dto/create-study-session.dto';
import {
  buildStudySessionSearchCorpus,
  collectHierarchyQuestionItemsForSession,
  getSujetLabel,
  mapVariantHierarchy,
  toStudySessionExamOffering,
  toSujetNumberFromVariantCode,
  type ExamVariantWithNodes,
  type StudySessionExerciseCandidate,
  type SujetNumber,
} from './study-session-helpers';

export type OfficialSimulationExamRecord = {
  id: string;
  year: number;
  sessionType: SessionType;
  stream: {
    code: string;
    name: string;
  };
  subject: {
    code: string;
    name: string;
  };
  paper: {
    durationMinutes: number;
    variants: ExamVariantWithNodes[];
  };
};

export type OfficialSimulationPlan = {
  sourceExam: {
    id: string;
    year: number;
    sessionType: SessionType;
    durationMinutes: number;
    stream: {
      code: string;
      name: string;
    };
    subject: {
      code: string;
      name: string;
    };
  };
  sujetNumber: SujetNumber;
  sujetLabel: string;
  exercises: StudySessionExerciseCandidate[];
};

export type OfficialSimulationExamLookupRecord =
  OfficialSimulationExamRecord & {
    isPublished: boolean;
  };

type OfficialSimulationVariantSelection = {
  variant: OfficialSimulationExamRecord['paper']['variants'][number];
  sujetNumber: SujetNumber;
  sujetLabel: string;
};

export function buildOfficialSimulationPlan(input: {
  exam: OfficialSimulationExamRecord;
  requestedSujetNumber: SujetNumber | null;
}): OfficialSimulationPlan {
  const variantSelection = resolveOfficialSimulationVariantSelection({
    variants: input.exam.paper.variants,
    requestedSujetNumber: input.requestedSujetNumber,
  });
  const exercises = buildOfficialSimulationExercises({
    exam: input.exam,
    variantSelection,
  });

  if (!exercises.length) {
    throw new NotFoundException(
      'The selected official paper does not contain published exercises yet.',
    );
  }

  return {
    sourceExam: {
      id: input.exam.id,
      year: input.exam.year,
      sessionType: input.exam.sessionType,
      durationMinutes: input.exam.paper.durationMinutes,
      stream: input.exam.stream,
      subject: input.exam.subject,
    },
    sujetNumber: variantSelection.sujetNumber,
    sujetLabel: variantSelection.sujetLabel,
    exercises,
  };
}

export function resolveOfficialSimulationVariantSelection(input: {
  variants: OfficialSimulationExamRecord['paper']['variants'];
  requestedSujetNumber: SujetNumber | null;
}): OfficialSimulationVariantSelection {
  const publishedVariants = input.variants
    .map((variant) => ({
      variant,
      sujetNumber: toSujetNumberFromVariantCode(variant.code),
    }))
    .filter(
      (
        entry,
      ): entry is {
        variant: OfficialSimulationExamRecord['paper']['variants'][number];
        sujetNumber: SujetNumber;
      } => entry.sujetNumber !== null,
    );

  const selectedVariantEntry = input.requestedSujetNumber
    ? publishedVariants.find(
        (entry) => entry.sujetNumber === input.requestedSujetNumber,
      )
    : publishedVariants.length === 1
      ? publishedVariants[0]
      : null;

  if (!selectedVariantEntry) {
    throw new BadRequestException(
      'Select the sujet number for the official paper simulation.',
    );
  }

  return {
    variant: selectedVariantEntry.variant,
    sujetNumber: selectedVariantEntry.sujetNumber,
    sujetLabel:
      selectedVariantEntry.variant.title ||
      getSujetLabel(selectedVariantEntry.sujetNumber),
  };
}

export function buildOfficialSimulationExercises(input: {
  exam: OfficialSimulationExamRecord;
  variantSelection: OfficialSimulationVariantSelection;
}): StudySessionExerciseCandidate[] {
  const hierarchy = mapVariantHierarchy(input.variantSelection.variant);
  const sourceExam = toStudySessionExamOffering(input.exam);

  return hierarchy.exercises
    .map((exercise) => {
      const questions = collectHierarchyQuestionItemsForSession(
        exercise.children,
        0,
        exercise.topics,
      );

      if (!questions.length) {
        return null;
      }

      const totalPoints =
        exercise.maxPoints ??
        questions.reduce((sum, question) => sum + question.points, 0);

      return {
        exerciseNodeId: exercise.id,
        orderIndex: exercise.orderIndex,
        title: exercise.label || null,
        totalPoints,
        questionCount: questions.length,
        questions: questions.map((question, questionIndex) => ({
          questionNodeId: question.id,
          sequenceIndex: questionIndex + 1,
        })),
        sujetNumber: input.variantSelection.sujetNumber,
        sujetLabel: input.variantSelection.sujetLabel,
        variantId: input.variantSelection.variant.id,
        variantCode: input.variantSelection.variant.code,
        variantTitle: input.variantSelection.variant.title,
        sourceExam,
        examOfferings: [sourceExam],
        searchableText: buildStudySessionSearchCorpus(exercise, questions),
      } satisfies StudySessionExerciseCandidate;
    })
    .filter(
      (exercise): exercise is StudySessionExerciseCandidate =>
        exercise !== null,
    );
}

export function assertOfficialSimulationRequested(sourceExamId: string | null) {
  if (!sourceExamId) {
    throw new BadRequestException(
      'An official paper simulation requires a source exam.',
    );
  }
}

export function assertOfficialSimulationExamMatchesRequest(input: {
  payload: CreateStudySessionDto;
  exam: OfficialSimulationExamLookupRecord | null;
}) {
  const { payload, exam } = input;

  if (!exam || !exam.isPublished) {
    throw new NotFoundException('The selected official paper was not found.');
  }

  if (exam.subject.code !== payload.subjectCode.trim().toUpperCase()) {
    throw new BadRequestException(
      'The selected official paper does not match the requested subject.',
    );
  }

  if (
    payload.years?.length &&
    !payload.years.some((year) => year === exam.year)
  ) {
    throw new BadRequestException(
      'The selected official paper falls outside the requested year range.',
    );
  }

  if (
    payload.streamCode &&
    payload.streamCode.trim().toUpperCase() !== exam.stream.code
  ) {
    throw new BadRequestException(
      'The selected official paper does not match the requested stream.',
    );
  }

  if (
    payload.streamCodes?.length &&
    !payload.streamCodes
      .map((streamCode) => streamCode.trim().toUpperCase())
      .includes(exam.stream.code)
  ) {
    throw new BadRequestException(
      'The selected official paper does not match the requested stream.',
    );
  }

  if (
    payload.sessionTypes?.length &&
    !payload.sessionTypes.includes(exam.sessionType)
  ) {
    throw new BadRequestException(
      'The selected official paper does not match the requested session type.',
    );
  }
}

export function buildOfficialSimulationPreviewResponse(input: {
  sessionFamily: StudySessionFamily;
  sessionKind: StudySessionKind;
  simulationPlan: OfficialSimulationPlan;
}): SessionPreviewResponse {
  const { simulationPlan } = input;

  return {
    sessionFamily: input.sessionFamily,
    sessionKind: input.sessionKind,
    subjectCode: simulationPlan.sourceExam.subject.code,
    streamCode: simulationPlan.sourceExam.stream.code,
    streamCodes: [simulationPlan.sourceExam.stream.code],
    years: [simulationPlan.sourceExam.year],
    topicCodes: [],
    sessionTypes: [simulationPlan.sourceExam.sessionType],
    sourceExamId: simulationPlan.sourceExam.id,
    durationMinutes: simulationPlan.sourceExam.durationMinutes,
    matchingExerciseCount: simulationPlan.exercises.length,
    matchingSujetCount: 1,
    sampleExercises: simulationPlan.exercises.slice(0, 6).map((exercise) => ({
      exerciseNodeId: exercise.exerciseNodeId,
      orderIndex: exercise.orderIndex,
      title: exercise.title,
      questionCount: exercise.questionCount,
      examId: simulationPlan.sourceExam.id,
      year: simulationPlan.sourceExam.year,
      stream: simulationPlan.sourceExam.stream,
      subject: simulationPlan.sourceExam.subject,
      sessionType: simulationPlan.sourceExam.sessionType,
      sujetNumber: simulationPlan.sujetNumber,
      sujetLabel: simulationPlan.sujetLabel,
    })),
    matchingSujets: [
      {
        examId: simulationPlan.sourceExam.id,
        year: simulationPlan.sourceExam.year,
        stream: simulationPlan.sourceExam.stream,
        subject: simulationPlan.sourceExam.subject,
        sessionType: simulationPlan.sourceExam.sessionType,
        sujetNumber: simulationPlan.sujetNumber,
        sujetLabel: simulationPlan.sujetLabel,
        matchingExerciseCount: simulationPlan.exercises.length,
      },
    ],
    yearsDistribution: [
      {
        year: simulationPlan.sourceExam.year,
        matchingExerciseCount: simulationPlan.exercises.length,
      },
    ],
    streamsDistribution: [
      {
        stream: simulationPlan.sourceExam.stream,
        matchingExerciseCount: simulationPlan.exercises.length,
      },
    ],
    maxSelectableExercises: simulationPlan.exercises.length,
  };
}

export function buildOfficialSimulationFiltersSnapshot(
  simulationPlan: OfficialSimulationPlan,
): Prisma.InputJsonObject {
  return {
    years: [simulationPlan.sourceExam.year],
    streamCode: simulationPlan.sourceExam.stream.code,
    streamCodes: [simulationPlan.sourceExam.stream.code],
    subjectCode: simulationPlan.sourceExam.subject.code,
    topicCodes: [],
    sessionTypes: [simulationPlan.sourceExam.sessionType],
  };
}

export function buildOfficialSimulationSessionTitle(input: {
  requestedTitle?: string;
  simulationPlan: OfficialSimulationPlan;
}): string {
  return (
    input.requestedTitle?.trim() ||
    `محاكاة ${input.simulationPlan.sourceExam.subject.name} · ${input.simulationPlan.sourceExam.year} · ${input.simulationPlan.sujetLabel}`
  );
}
