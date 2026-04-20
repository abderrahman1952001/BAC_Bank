import { describe, expect, it } from "vitest";
import {
  buildStudyExercisesFromExam,
  buildStudyExercisesFromSessionExercises,
  canRevealStudyQuestionSolution,
} from "./study-surface";
import type { ExamResponse, StudySessionResponse } from "./study-api";

describe("study surface helpers", () => {
  it("builds study exercises from exam hierarchy data", () => {
    const exam = {
      id: "exam-1",
      paperId: "paper-1",
      year: 2026,
      sessionType: "NORMAL",
      durationMinutes: 210,
      officialSourceReference: null,
      stream: {
        code: "SE",
        name: "Sciences experimentales",
      },
      subject: {
        code: "MATH",
        name: "Mathematiques",
      },
      selectedSujetNumber: 1,
      selectedSujetLabel: "Sujet 1",
      availableSujets: [{ sujetNumber: 1, label: "Sujet 1" }],
      selectedVariantCode: "SUJET_1",
      hierarchy: {
        variantId: "variant-1",
        variantCode: "SUJET_1",
        title: "Sujet 1",
        status: "PUBLISHED",
        nodeCount: 4,
        exercises: [
          {
            id: "exercise-1",
            nodeType: "EXERCISE",
            orderIndex: 2,
            label: "Exercice 1",
            maxPoints: null,
            status: "PUBLISHED",
            metadata: null,
            topics: [{ code: "ALG", name: "Algebre" }],
            blocks: [
              {
                id: "block-context-own",
                role: "STEM",
                orderIndex: 1,
                blockType: "PARAGRAPH",
                textValue: "Enonce general",
                data: null,
                media: null,
              },
            ],
            children: [
              {
                id: "context-1",
                nodeType: "CONTEXT",
                orderIndex: 0,
                label: null,
                maxPoints: null,
                status: "PUBLISHED",
                metadata: null,
                topics: [],
                blocks: [
                  {
                    id: "block-context-nested",
                    role: "PROMPT",
                    orderIndex: 1,
                    blockType: "PARAGRAPH",
                    textValue: "معطيات اضافية",
                    data: null,
                    media: null,
                  },
                ],
                children: [],
              },
              {
                id: "question-1",
                nodeType: "QUESTION",
                orderIndex: 1,
                label: null,
                maxPoints: 5,
                status: "PUBLISHED",
                metadata: null,
                topics: [{ code: "FUNC", name: "Fonctions" }],
                blocks: [
                  {
                    id: "block-prompt-1",
                    role: "PROMPT",
                    orderIndex: 1,
                    blockType: "PARAGRAPH",
                    textValue: "احسب النهاية",
                    data: null,
                    media: null,
                  },
                  {
                    id: "block-solution-1",
                    role: "SOLUTION",
                    orderIndex: 2,
                    blockType: "PARAGRAPH",
                    textValue: "الحل",
                    data: null,
                    media: null,
                  },
                ],
                children: [
                  {
                    id: "subquestion-1",
                    nodeType: "SUBQUESTION",
                    orderIndex: 2,
                    label: "1-b",
                    maxPoints: 3,
                    status: "PUBLISHED",
                    metadata: null,
                    topics: [],
                    blocks: [
                      {
                        id: "block-prompt-2",
                        role: "PROMPT",
                        orderIndex: 1,
                        blockType: "PARAGRAPH",
                        textValue: "استنتج",
                        data: null,
                        media: null,
                      },
                    ],
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      exerciseCount: 1,
      exercises: [
        {
          id: "exercise-1",
          orderIndex: 2,
          title: "Exercice 1",
          totalPoints: 8,
          questionCount: 2,
        },
      ],
    } satisfies ExamResponse;

    const [exercise] = buildStudyExercisesFromExam(exam);

    expect(exercise.displayOrder).toBe(2);
    expect(exercise.totalPoints).toBe(8);
    expect(exercise.contextBlocks).toHaveLength(2);
    expect(exercise.hierarchyNode?.id).toBe("exercise-1");
    expect(exercise.questions).toHaveLength(2);
    expect(exercise.questions[0]?.label).toBe("السؤال 1");
    expect(exercise.questions[0]?.topics.map((topic) => topic.code)).toEqual([
      "ALG",
      "FUNC",
    ]);
    expect(canRevealStudyQuestionSolution(exercise.questions[0])).toBe(true);
  });

  it("keeps session order when mapping session exercises", () => {
    const sessionExercises = [
      {
        sessionOrder: 4,
        id: "exercise-9",
        orderIndex: 2,
        title: "Exercice 9",
        totalPoints: 6,
        questionCount: 1,
        hierarchy: {
          exerciseNodeId: "exercise-9",
          exerciseLabel: "Exercice 9",
          contextBlocks: [],
          questions: [
            {
              id: "question-9",
              orderIndex: 1,
              label: "Q1",
              points: 6,
              depth: 0,
              interaction: {
                format: "GENERAL",
                captureMode: "TYPELESS",
                responseMode: "NONE",
                checkStrategy: "MODEL_COMPARISON",
              },
              topics: [],
              promptBlocks: [],
              solutionBlocks: [],
              hintBlocks: [],
              rubricBlocks: [],
            },
          ],
        },
        exam: {
          year: 2026,
          sessionType: "NORMAL",
          subject: {
            code: "MATH",
            name: "Mathematiques",
          },
          stream: {
            code: "SE",
            name: "Sciences experimentales",
          },
        },
      },
    ] satisfies StudySessionResponse["exercises"];

    const [exercise] = buildStudyExercisesFromSessionExercises(sessionExercises);

    expect(exercise.displayOrder).toBe(4);
    expect(exercise.hierarchyNode).toBeNull();
    expect(exercise.questions[0]?.label).toBe("Q1");
    expect(canRevealStudyQuestionSolution(exercise.questions[0])).toBe(false);
  });
});
