import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  BlockRole,
  BlockType,
  ExamNodeType,
  ExamVariantCode,
  PublicationStatus,
  SessionType,
} from '@prisma/client';
import {
  assertOfficialSimulationExamMatchesRequest,
  assertOfficialSimulationRequested,
  buildOfficialSimulationFiltersSnapshot,
  buildOfficialSimulationPlan,
  buildOfficialSimulationPreviewResponse,
  buildOfficialSimulationSessionTitle,
  resolveOfficialSimulationVariantSelection,
  type OfficialSimulationPlan,
  type OfficialSimulationExamRecord,
} from './study-session-simulation';

function makeSimulationExam(input?: {
  variantCodes?: ExamVariantCode[];
  variantTitles?: Array<string | null>;
  questionByVariantCode?: Partial<Record<ExamVariantCode, string>>;
  withQuestions?: boolean;
}): OfficialSimulationExamRecord {
  const variantCodes = input?.variantCodes ?? [ExamVariantCode.SUJET_1];

  return {
    id: 'exam-sim',
    year: 2024,
    sessionType: SessionType.NORMAL,
    stream: {
      code: 'SE',
      name: 'Sciences experimentales',
    },
    subject: {
      code: 'MATH',
      name: 'Mathematics',
    },
    paper: {
      durationMinutes: 180,
      variants: variantCodes.map((code, index) => {
        const exerciseId = `exercise-${index + 1}`;
        const nodes: OfficialSimulationExamRecord['paper']['variants'][number]['nodes'] =
          [
            {
              id: exerciseId,
              parentId: null,
              nodeType: ExamNodeType.EXERCISE,
              orderIndex: 1,
              label: `Exercise ${index + 1}`,
              maxPoints: null,
              status: PublicationStatus.PUBLISHED,
              metadata: null,
              topicMappings: [],
              blocks: [],
            },
          ];

        if (input?.withQuestions !== false) {
          nodes.push({
            id: `question-${index + 1}`,
            parentId: exerciseId,
            nodeType: ExamNodeType.QUESTION,
            orderIndex: 1,
            label: `Q${index + 1}`,
            maxPoints: 5,
            status: PublicationStatus.PUBLISHED,
            metadata: null,
            topicMappings: [],
            blocks: [
              {
                id: `prompt-${index + 1}`,
                role: BlockRole.PROMPT,
                orderIndex: 1,
                blockType: BlockType.PARAGRAPH,
                textValue:
                  input?.questionByVariantCode?.[code] ?? 'Solve the equation.',
                data: null,
                media: null,
              },
            ],
          });
        }

        return {
          id: `variant-${index + 1}`,
          code,
          title: input?.variantTitles?.[index] ?? `Sujet ${index + 1}`,
          status: PublicationStatus.PUBLISHED,
          nodes,
        };
      }),
    },
  };
}

describe('study session simulation helpers', () => {
  it('requires a source exam and validates the selected paper against the request', () => {
    expect(() => assertOfficialSimulationRequested(null)).toThrow(
      new BadRequestException(
        'An official paper simulation requires a source exam.',
      ),
    );

    expect(() =>
      assertOfficialSimulationExamMatchesRequest(
        {
          subjectCode: 'MATH',
          years: [2024],
          streamCodes: ['TM'],
        },
        {
          ...makeSimulationExam(),
          isPublished: true,
        },
      ),
    ).toThrow(
      new BadRequestException(
        'The selected official paper does not match the requested stream.',
      ),
    );
  });

  it('builds a simulation plan for the selected sujet', () => {
    const plan = buildOfficialSimulationPlan({
      exam: makeSimulationExam({
        variantCodes: [ExamVariantCode.SUJET_1, ExamVariantCode.SUJET_2],
        questionByVariantCode: {
          [ExamVariantCode.SUJET_1]: 'Question from sujet 1',
          [ExamVariantCode.SUJET_2]: 'Question from sujet 2',
        },
      }),
      requestedSujetNumber: 2,
    });

    expect(plan.sujetNumber).toBe(2);
    expect(plan.sujetLabel).toBe('Sujet 2');
    expect(plan.sourceExam).toEqual(
      expect.objectContaining({
        id: 'exam-sim',
        durationMinutes: 180,
      }),
    );
    expect(plan.exercises[0]?.exerciseNodeId).toBe('exercise-2');
    expect(plan.exercises[0]?.sujetNumber).toBe(2);
    expect(plan.exercises[0]?.searchableText).toContain(
      'question from sujet 2',
    );
  });

  it('builds preview and persistence metadata from a simulation plan', () => {
    const simulationPlan: OfficialSimulationPlan = buildOfficialSimulationPlan({
      exam: makeSimulationExam(),
      requestedSujetNumber: 1,
    });

    expect(
      buildOfficialSimulationPreviewResponse({
        sessionFamily: 'SIMULATION',
        sessionKind: 'PAPER_SIMULATION',
        simulationPlan,
      }),
    ).toEqual(
      expect.objectContaining({
        sourceExamId: 'exam-sim',
        durationMinutes: 180,
        matchingExerciseCount: 1,
        matchingSujetCount: 1,
      }),
    );
    expect(buildOfficialSimulationFiltersSnapshot(simulationPlan)).toEqual({
      years: [2024],
      streamCode: 'SE',
      streamCodes: ['SE'],
      subjectCode: 'MATH',
      topicCodes: [],
      sessionTypes: [SessionType.NORMAL],
    });
    expect(
      buildOfficialSimulationSessionTitle({
        simulationPlan,
      }),
    ).toBe('محاكاة Mathematics · 2024 · Sujet 1');
  });

  it('falls back to the only published sujet when no sujet number is requested', () => {
    const selection = resolveOfficialSimulationVariantSelection({
      variants: makeSimulationExam().paper.variants,
      requestedSujetNumber: null,
    });

    expect(selection).toEqual(
      expect.objectContaining({
        sujetNumber: 1,
        sujetLabel: 'Sujet 1',
      }),
    );
  });

  it('requires an explicit sujet number when multiple sujets are published', () => {
    expect(() =>
      resolveOfficialSimulationVariantSelection({
        variants: makeSimulationExam({
          variantCodes: [ExamVariantCode.SUJET_1, ExamVariantCode.SUJET_2],
        }).paper.variants,
        requestedSujetNumber: null,
      }),
    ).toThrow(
      new BadRequestException(
        'Select the sujet number for the official paper simulation.',
      ),
    );
  });

  it('rejects selected sujets without published questions', () => {
    expect(() =>
      buildOfficialSimulationPlan({
        exam: makeSimulationExam({
          withQuestions: false,
        }),
        requestedSujetNumber: 1,
      }),
    ).toThrow(
      new NotFoundException(
        'The selected official paper does not contain published exercises yet.',
      ),
    );
  });
});
