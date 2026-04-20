import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  CreateSessionResponse,
  StudySessionResponse,
  RecentStudySessionsResponse,
  SessionPreviewResponse,
  UpdateSessionProgressResponse,
} from '@bac-bank/contracts/study';
import {
  StudySessionFamily,
  StudySessionKind,
  SubscriptionStatus,
  Prisma,
  PublicationStatus,
  StudySessionResumeMode,
  StudySessionStatus,
} from '@prisma/client';
import { CatalogCurriculumService } from '../catalog/catalog-curriculum.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudySessionDto } from './dto/create-study-session.dto';
import {
  buildStudyEntitlements,
  canStartStudySessionKind,
  getStudyMonthlyQuotaWindow,
  resolveStudySessionFamilyFromKind,
} from './study-entitlements';
import { UpdateStudySessionProgressDto } from './dto/update-study-session-progress.dto';
import { SubmitStudyQuestionAnswerDto } from './dto/submit-study-question-answer.dto';
import { SubmitStudyQuestionEvaluationDto } from './dto/submit-study-question-evaluation.dto';
import {
  type StudySessionExerciseCandidate,
  type SujetNumber,
} from './study-session-helpers';
import { buildStudySessionExerciseCandidates } from './study-session-candidates';
import { buildStudySessionResponseExercises } from './study-session-details';
import {
  applyWeakPointTopicCodes,
  assertValidStudySessionStreamCodes,
  buildResolvedStudySessionFilters,
  inferStudySessionKindFromTopicCodes,
  normalizeRequestedStudySessionFilters,
  resolveStudySessionTopicMatchCodes,
  type ResolvedStudySessionFilters,
} from './study-session-filters';
import {
  buildStudySessionFiltersSnapshot,
  buildStudySessionPreviewResponse,
  selectStudySessionExercises,
} from './study-session-planning';
import {
  buildOfficialSimulationPlan,
  buildOfficialSimulationPreviewResponse,
  buildOfficialSimulationFiltersSnapshot,
  buildOfficialSimulationSessionTitle,
  assertOfficialSimulationExamMatchesRequest,
  assertOfficialSimulationRequested,
  type OfficialSimulationPlan,
} from './study-session-simulation';
import { SESSION_YEAR_MAX, SESSION_YEAR_MIN } from './session-year-range';
import {
  buildStudySessionExerciseState,
  buildStudySessionProgress,
  deriveStudySessionStatusFromProgress,
  resolveEffectiveStudySessionStatus,
} from './study-session-state';
import { buildStudySessionProgressUpdateDraft } from './study-session-progress-update';
import { buildStudyQuestionAutoRuleSubmission } from './study-question-auto-rule';
import { buildStudyQuestionEvaluation } from './study-question-evaluation';
import { resolveStudyQuestionAutoRuleConfig } from './study-question-auto-rule';
import {
  buildStudySessionResponse,
  resolveStudySessionPedagogyContext,
} from './study-session-response';
import { buildRecentStudySessionsResponse } from './study-session-summary';
import { buildWeakPointIntro as buildWeakPointIntroPayload } from './study-session-weak-point';
import { StudyReadModelService } from './study-read-model.service';
import { StudyWeakPointService } from './study-weak-point.service';

type PlannedStudySessionExercise = {
  id: string;
  exerciseNodeId: string;
  examId: string | null;
  orderIndex: number;
  questionSeeds: Array<{
    id: string;
    questionNodeId: string;
    sequenceIndex: number;
  }>;
};

type ResolvedStudySessionMode = {
  family: StudySessionFamily;
  kind: StudySessionKind;
  sourceExamId: string | null;
  sourceSujetNumber: SujetNumber | null;
};

@Injectable()
export class StudySessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogCurriculumService: CatalogCurriculumService,
    private readonly studyReadModelService: StudyReadModelService,
    private readonly studyWeakPointService: StudyWeakPointService,
  ) {}

  async listRecentStudySessions(
    userId: string,
    limit = 8,
  ): Promise<RecentStudySessionsResponse> {
    const cappedLimit = Math.min(Math.max(limit, 1), 20);

    const sessions = await this.prisma.studySession.findMany({
      where: {
        userId,
        exercises: {
          some: {},
        },
      },
      take: cappedLimit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        family: true,
        kind: true,
        status: true,
        sourceExamId: true,
        requestedExerciseCount: true,
        durationMinutes: true,
        startedAt: true,
        deadlineAt: true,
        completedAt: true,
        lastInteractedAt: true,
        createdAt: true,
        updatedAt: true,
        exercises: {
          select: {
            sessionQuestions: {
              select: {
                questionNodeId: true,
                sequenceIndex: true,
                answerState: true,
                resultStatus: true,
                evaluationMode: true,
                reflection: true,
                diagnosis: true,
                firstOpenedAt: true,
                lastInteractedAt: true,
                completedAt: true,
                skippedAt: true,
                solutionViewedAt: true,
                timeSpentSeconds: true,
                revealCount: true,
                answerPayloadJson: true,
              },
            },
          },
        },
        _count: {
          select: {
            exercises: true,
          },
        },
      },
    });

    return buildRecentStudySessionsResponse(sessions);
  }

  async previewStudySession(
    userId: string,
    payload: CreateStudySessionDto,
  ): Promise<SessionPreviewResponse> {
    const sessionMode = this.resolveStudySessionMode(payload);

    if (sessionMode.family === StudySessionFamily.SIMULATION) {
      return this.previewOfficialPaperSimulation(payload, sessionMode);
    }

    if (sessionMode.kind === StudySessionKind.WEAK_POINT_DRILL) {
      await this.ensureWeakPointAccess(userId);
    }

    const filters = await this.resolveStudySessionFilters(
      userId,
      payload,
      sessionMode,
    );
    const matchingExercises =
      await this.listStudySessionExerciseCandidates(filters);

    return buildStudySessionPreviewResponse({
      sessionFamily: sessionMode.family,
      sessionKind: sessionMode.kind,
      filters,
      matchingExercises,
    });
  }

  async createStudySession(
    userId: string,
    payload: CreateStudySessionDto,
  ): Promise<CreateSessionResponse> {
    const sessionMode = this.resolveStudySessionMode(payload);

    await this.ensureStudySessionStartAllowed(userId, sessionMode);

    if (sessionMode.family === StudySessionFamily.SIMULATION) {
      return this.createOfficialPaperSimulation(userId, payload, sessionMode);
    }

    const filters = await this.resolveStudySessionFilters(
      userId,
      payload,
      sessionMode,
    );
    const candidates = await this.listStudySessionExerciseCandidates(filters);

    if (!candidates.length) {
      throw new NotFoundException(
        'No exercises match the selected filters. Try wider criteria.',
      );
    }

    const selected = selectStudySessionExercises({
      filters,
      candidates,
      pickRandom: (items, count) => this.pickRandom(items, count),
    });

    const plannedExercises = this.planStudySessionExercises(
      selected.map((exercise, index) => ({
        exercise,
        orderIndex: index + 1,
        examId: exercise.sourceExam.id,
      })),
    );

    const filtersSnapshot = buildStudySessionFiltersSnapshot(filters);

    const created = await this.prisma.$transaction(async (tx) => {
      const session = await tx.studySession.create({
        data: {
          userId,
          title: payload.title,
          family: sessionMode.family,
          kind: sessionMode.kind,
          requestedExerciseCount: selected.length,
          timingEnabled: Boolean(payload.timingEnabled),
          resumeMode: StudySessionResumeMode.SOLVE,
          status: StudySessionStatus.CREATED,
          filtersJson: filtersSnapshot,
        },
        select: { id: true },
      });

      await this.persistStudySessionExercises(tx, session.id, plannedExercises);

      return session;
    });

    return this.getStudySessionById(userId, created.id);
  }

  async getStudySessionById(
    userId: string,
    id: string,
  ): Promise<StudySessionResponse> {
    const session = await this.prisma.studySession.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        family: true,
        kind: true,
        status: true,
        sourceExamId: true,
        requestedExerciseCount: true,
        durationMinutes: true,
        timingEnabled: true,
        filtersJson: true,
        resumeMode: true,
        startedAt: true,
        deadlineAt: true,
        submittedAt: true,
        completedAt: true,
        lastInteractedAt: true,
        activeExerciseNodeId: true,
        activeQuestionNodeId: true,
        createdAt: true,
        updatedAt: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            orderIndex: true,
            exerciseNodeId: true,
            createdAt: true,
            sessionQuestions: {
              orderBy: { sequenceIndex: 'asc' },
              select: {
                questionNodeId: true,
                sequenceIndex: true,
                answerState: true,
                resultStatus: true,
                evaluationMode: true,
                reflection: true,
                diagnosis: true,
                firstOpenedAt: true,
                lastInteractedAt: true,
                completedAt: true,
                skippedAt: true,
                solutionViewedAt: true,
                timeSpentSeconds: true,
                revealCount: true,
                answerPayloadJson: true,
              },
            },
            exam: {
              select: {
                id: true,
                year: true,
                sessionType: true,
                subject: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                stream: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
            exerciseNode: {
              select: {
                id: true,
                orderIndex: true,
                maxPoints: true,
                variantId: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Study session ${id} not found`);
    }

    if (!session.exercises.length) {
      throw new NotFoundException(
        `Study session ${id} has no exercises. Create a new session.`,
      );
    }

    const storedFilters = this.readStoredSessionFilters(session.filtersJson);

    const variantIds = Array.from(
      new Set(session.exercises.map((entry) => entry.exerciseNode.variantId)),
    );
    const variants = variantIds.length
      ? await this.prisma.examVariant.findMany({
          where: {
            id: {
              in: variantIds,
            },
            status: PublicationStatus.PUBLISHED,
          },
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            paper: {
              select: {
                offerings: {
                  where: {
                    isPublished: true,
                  },
                  orderBy: [
                    { year: 'desc' },
                    { stream: { name: 'asc' } },
                    { createdAt: 'asc' },
                  ],
                  select: {
                    id: true,
                    year: true,
                    sessionType: true,
                    subject: {
                      select: {
                        code: true,
                        name: true,
                      },
                    },
                    stream: {
                      select: {
                        code: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            nodes: {
              where: {
                status: PublicationStatus.PUBLISHED,
              },
              orderBy: [{ orderIndex: 'asc' }],
              select: {
                id: true,
                parentId: true,
                nodeType: true,
                orderIndex: true,
                label: true,
                maxPoints: true,
                status: true,
                metadata: true,
                topicMappings: {
                  select: {
                    topic: {
                      select: {
                        code: true,
                        name: true,
                        studentLabel: true,
                        displayOrder: true,
                      },
                    },
                  },
                },
                blocks: {
                  orderBy: [{ role: 'asc' }, { orderIndex: 'asc' }],
                  select: {
                    id: true,
                    role: true,
                    orderIndex: true,
                    blockType: true,
                    textValue: true,
                    data: true,
                    media: {
                      select: {
                        id: true,
                        url: true,
                        type: true,
                        metadata: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : [];
    const responseExercises = buildStudySessionResponseExercises({
      sessionId: id,
      entries: session.exercises,
      variants,
    });
    const pedagogyContext = resolveStudySessionPedagogyContext({
      storedFilters,
      responseExercises,
    });
    const pedagogy = {
      supportStyle: pedagogyContext.supportStyle,
      weakPointIntro: await this.buildWeakPointIntro({
        userId,
        sessionKind: session.kind,
        subjectCode: pedagogyContext.subjectCode,
        topicCodes: storedFilters?.topicCodes ?? [],
        exercises: responseExercises,
        supportStyle: pedagogyContext.supportStyle,
      }),
    } satisfies StudySessionResponse['pedagogy'];

    return buildStudySessionResponse({
      session,
      storedFilters,
      responseExercises,
      supportStyle: pedagogy.supportStyle,
      weakPointIntro: pedagogy.weakPointIntro,
    });
  }

  async submitStudyQuestionEvaluation(
    userId: string,
    sessionId: string,
    questionId: string,
    payload: SubmitStudyQuestionEvaluationDto,
  ): Promise<UpdateSessionProgressResponse> {
    const existingSession = await this.prisma.studySession.findFirst({
      where: { id: sessionId, userId },
      select: {
        id: true,
        family: true,
        status: true,
        timingEnabled: true,
        resumeMode: true,
        startedAt: true,
        deadlineAt: true,
        submittedAt: true,
        completedAt: true,
        activeExerciseNodeId: true,
        activeQuestionNodeId: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            exerciseNodeId: true,
            orderIndex: true,
            firstOpenedAt: true,
            lastInteractedAt: true,
            completedAt: true,
            createdAt: true,
            sessionQuestions: {
              orderBy: { sequenceIndex: 'asc' },
              select: {
                questionNodeId: true,
                sequenceIndex: true,
                answerState: true,
                resultStatus: true,
                evaluationMode: true,
                reflection: true,
                diagnosis: true,
                firstOpenedAt: true,
                lastInteractedAt: true,
                completedAt: true,
                skippedAt: true,
                solutionViewedAt: true,
                timeSpentSeconds: true,
                revealCount: true,
                answerPayloadJson: true,
              },
            },
          },
        },
      },
    });

    if (!existingSession) {
      throw new NotFoundException(`Study session ${sessionId} not found`);
    }

    const effectiveStatus = resolveEffectiveStudySessionStatus(existingSession);
    const now = new Date();
    const targetExercise = existingSession.exercises.find((exercise) =>
      exercise.sessionQuestions.some((question) => question.questionNodeId === questionId),
    );
    const currentQuestion = targetExercise?.sessionQuestions.find(
      (question) => question.questionNodeId === questionId,
    );

    if (!targetExercise || !currentQuestion) {
      throw new NotFoundException(
        `Question ${questionId} does not belong to study session ${sessionId}.`,
      );
    }

    const nextQuestion = buildStudyQuestionEvaluation({
      current: {
        questionId: currentQuestion.questionNodeId,
        sequenceIndex: currentQuestion.sequenceIndex,
        answerState: currentQuestion.answerState,
        resultStatus: currentQuestion.resultStatus,
        evaluationMode: currentQuestion.evaluationMode,
        reflection: currentQuestion.reflection,
        diagnosis: currentQuestion.diagnosis,
        firstOpenedAt: currentQuestion.firstOpenedAt,
        lastInteractedAt: currentQuestion.lastInteractedAt,
        completedAt: currentQuestion.completedAt,
        skippedAt: currentQuestion.skippedAt,
        solutionViewedAt: currentQuestion.solutionViewedAt,
        timeSpentSeconds: currentQuestion.timeSpentSeconds,
        revealCount: currentQuestion.revealCount,
        answerPayloadJson: currentQuestion.answerPayloadJson,
      },
      payload,
      sessionFamily: existingSession.family,
      effectiveStatus,
      now,
    });
    const nextExercises = existingSession.exercises.map((exercise) =>
      exercise.id !== targetExercise.id
        ? exercise
        : {
            ...exercise,
            sessionQuestions: exercise.sessionQuestions.map((question) =>
              question.questionNodeId === questionId
                ? {
                    ...question,
                    answerState: nextQuestion.answerState,
                    resultStatus: nextQuestion.resultStatus,
                    evaluationMode: nextQuestion.evaluationMode,
                    reflection: nextQuestion.reflection,
                    diagnosis: nextQuestion.diagnosis,
                    firstOpenedAt: nextQuestion.firstOpenedAt,
                    lastInteractedAt: nextQuestion.lastInteractedAt,
                    completedAt: nextQuestion.completedAt,
                    skippedAt: nextQuestion.skippedAt,
                    solutionViewedAt: nextQuestion.solutionViewedAt,
                    timeSpentSeconds: nextQuestion.timeSpentSeconds,
                    revealCount: nextQuestion.revealCount,
                    answerPayloadJson: nextQuestion.answerPayloadJson,
                  }
                : question,
            ),
          },
    );
    const progress = buildStudySessionProgress({
      resumeMode: existingSession.resumeMode,
      activeExerciseId: existingSession.activeExerciseNodeId,
      activeQuestionId: existingSession.activeQuestionNodeId,
      sessionQuestions: nextExercises.flatMap((exercise) =>
        exercise.sessionQuestions.map((question) => ({
          questionId: question.questionNodeId,
          sequenceIndex: question.sequenceIndex,
          answerState: question.answerState,
          resultStatus: question.resultStatus,
          evaluationMode: question.evaluationMode,
          reflection: question.reflection,
          diagnosis: question.diagnosis,
          firstOpenedAt: question.firstOpenedAt,
          lastInteractedAt: question.lastInteractedAt,
          completedAt: question.completedAt,
          skippedAt: question.skippedAt,
          solutionViewedAt: question.solutionViewedAt,
          timeSpentSeconds: question.timeSpentSeconds,
          revealCount: question.revealCount,
          answerPayloadJson: question.answerPayloadJson,
        })),
      ),
      updatedAt: now,
    });
    const status = deriveStudySessionStatusFromProgress(
      progress,
      existingSession.family,
      existingSession.deadlineAt,
      now,
      Boolean(existingSession.startedAt),
    );
    const updatedExerciseState = buildStudySessionExerciseState({
      ...targetExercise,
      sessionQuestions: nextExercises.find((exercise) => exercise.id === targetExercise.id)
        ?.sessionQuestions.map((question) => ({
          questionId: question.questionNodeId,
          sequenceIndex: question.sequenceIndex,
          answerState: question.answerState,
          resultStatus: question.resultStatus,
          evaluationMode: question.evaluationMode,
          reflection: question.reflection,
          diagnosis: question.diagnosis,
          firstOpenedAt: question.firstOpenedAt,
          lastInteractedAt: question.lastInteractedAt,
          completedAt: question.completedAt,
          skippedAt: question.skippedAt,
          solutionViewedAt: question.solutionViewedAt,
          timeSpentSeconds: question.timeSpentSeconds,
          revealCount: question.revealCount,
          answerPayloadJson: question.answerPayloadJson,
        })) ?? [],
    });

    const session = await this.prisma.$transaction(async (tx) => {
      await tx.studySessionQuestion.update({
        where: {
          sessionExerciseId_questionNodeId: {
            sessionExerciseId: targetExercise.id,
            questionNodeId: questionId,
          },
        },
        data: {
          answerState: nextQuestion.answerState,
          resultStatus: nextQuestion.resultStatus,
          evaluationMode: nextQuestion.evaluationMode,
          reflection: nextQuestion.reflection,
          diagnosis: nextQuestion.diagnosis,
          firstOpenedAt: nextQuestion.firstOpenedAt,
          lastInteractedAt: nextQuestion.lastInteractedAt,
          completedAt: nextQuestion.completedAt,
          skippedAt: nextQuestion.skippedAt,
          solutionViewedAt: nextQuestion.solutionViewedAt,
          timeSpentSeconds: nextQuestion.timeSpentSeconds,
          revealCount: nextQuestion.revealCount,
          answerPayloadJson: nextQuestion.answerPayloadJson ?? Prisma.JsonNull,
          finalizedAt: nextQuestion.completedAt ?? nextQuestion.skippedAt ?? null,
        },
      });

      await tx.studySessionExercise.update({
        where: { id: targetExercise.id },
        data: {
          firstOpenedAt: updatedExerciseState.firstOpenedAt,
          lastInteractedAt: updatedExerciseState.lastInteractedAt,
          completedAt: updatedExerciseState.completedAt,
        },
      });

      await this.studyReadModelService.refreshUserReadModels(userId, tx);

      return tx.studySession.update({
        where: { id: sessionId },
        data: {
          startedAt:
            existingSession.startedAt ??
            (status !== StudySessionStatus.CREATED ? now : undefined),
          lastInteractedAt:
            status !== StudySessionStatus.CREATED
              ? now
              : existingSession.startedAt
                ? now
                : null,
          completedAt:
            status === StudySessionStatus.COMPLETED
              ? (existingSession.completedAt ?? now)
              : null,
          submittedAt:
            existingSession.family === StudySessionFamily.SIMULATION &&
            status === StudySessionStatus.COMPLETED
              ? (existingSession.submittedAt ?? now)
              : existingSession.submittedAt,
          status,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });
    });

    return {
      id: session.id,
      status: session.status,
      progress,
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  async submitStudyQuestionAnswer(
    userId: string,
    sessionId: string,
    questionId: string,
    payload: SubmitStudyQuestionAnswerDto,
  ): Promise<UpdateSessionProgressResponse> {
    const existingSession = await this.prisma.studySession.findFirst({
      where: { id: sessionId, userId },
      select: {
        id: true,
        family: true,
        status: true,
        timingEnabled: true,
        resumeMode: true,
        startedAt: true,
        deadlineAt: true,
        submittedAt: true,
        completedAt: true,
        activeExerciseNodeId: true,
        activeQuestionNodeId: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            exerciseNodeId: true,
            orderIndex: true,
            firstOpenedAt: true,
            lastInteractedAt: true,
            completedAt: true,
            createdAt: true,
            sessionQuestions: {
              orderBy: { sequenceIndex: 'asc' },
              select: {
                questionNodeId: true,
                sequenceIndex: true,
                answerState: true,
                resultStatus: true,
                evaluationMode: true,
                reflection: true,
                diagnosis: true,
                firstOpenedAt: true,
                lastInteractedAt: true,
                completedAt: true,
                skippedAt: true,
                solutionViewedAt: true,
                timeSpentSeconds: true,
                revealCount: true,
                answerPayloadJson: true,
              },
            },
          },
        },
      },
    });

    if (!existingSession) {
      throw new NotFoundException(`Study session ${sessionId} not found`);
    }

    const effectiveStatus = resolveEffectiveStudySessionStatus(existingSession);
    const now = new Date();
    const targetExercise = existingSession.exercises.find((exercise) =>
      exercise.sessionQuestions.some(
        (question) => question.questionNodeId === questionId,
      ),
    );
    const currentQuestion = targetExercise?.sessionQuestions.find(
      (question) => question.questionNodeId === questionId,
    );

    if (!targetExercise || !currentQuestion) {
      throw new NotFoundException(
        `Question ${questionId} does not belong to study session ${sessionId}.`,
      );
    }

    const questionNode = await this.prisma.examNode.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!questionNode) {
      throw new NotFoundException(`Question ${questionId} not found.`);
    }

    const autoRule = resolveStudyQuestionAutoRuleConfig(questionNode.metadata);

    if (!autoRule) {
      throw new BadRequestException(
        'This question does not support automatic answer checking.',
      );
    }

    const nextQuestion = buildStudyQuestionAutoRuleSubmission({
      current: {
        questionId: currentQuestion.questionNodeId,
        sequenceIndex: currentQuestion.sequenceIndex,
        answerState: currentQuestion.answerState,
        resultStatus: currentQuestion.resultStatus,
        evaluationMode: currentQuestion.evaluationMode,
        reflection: currentQuestion.reflection,
        diagnosis: currentQuestion.diagnosis,
        firstOpenedAt: currentQuestion.firstOpenedAt,
        lastInteractedAt: currentQuestion.lastInteractedAt,
        completedAt: currentQuestion.completedAt,
        skippedAt: currentQuestion.skippedAt,
        solutionViewedAt: currentQuestion.solutionViewedAt,
        timeSpentSeconds: currentQuestion.timeSpentSeconds,
        revealCount: currentQuestion.revealCount,
        answerPayloadJson: currentQuestion.answerPayloadJson,
      },
      payload,
      autoRule,
      sessionFamily: existingSession.family,
      effectiveStatus,
      now,
    });
    const nextExercises = existingSession.exercises.map((exercise) =>
      exercise.id !== targetExercise.id
        ? exercise
        : {
            ...exercise,
            sessionQuestions: exercise.sessionQuestions.map((question) =>
              question.questionNodeId === questionId
                ? {
                    ...question,
                    answerState: nextQuestion.answerState,
                    resultStatus: nextQuestion.resultStatus,
                    evaluationMode: nextQuestion.evaluationMode,
                    reflection: nextQuestion.reflection,
                    diagnosis: nextQuestion.diagnosis,
                    firstOpenedAt: nextQuestion.firstOpenedAt,
                    lastInteractedAt: nextQuestion.lastInteractedAt,
                    completedAt: nextQuestion.completedAt,
                    skippedAt: nextQuestion.skippedAt,
                    solutionViewedAt: nextQuestion.solutionViewedAt,
                    timeSpentSeconds: nextQuestion.timeSpentSeconds,
                    revealCount: nextQuestion.revealCount,
                    answerPayloadJson: nextQuestion.answerPayloadJson,
                  }
                : question,
            ),
          },
    );
    const progress = buildStudySessionProgress({
      resumeMode: existingSession.resumeMode,
      activeExerciseId: existingSession.activeExerciseNodeId,
      activeQuestionId: existingSession.activeQuestionNodeId,
      sessionQuestions: nextExercises.flatMap((exercise) =>
        exercise.sessionQuestions.map((question) => ({
          questionId: question.questionNodeId,
          sequenceIndex: question.sequenceIndex,
          answerState: question.answerState,
          resultStatus: question.resultStatus,
          evaluationMode: question.evaluationMode,
          reflection: question.reflection,
          diagnosis: question.diagnosis,
          firstOpenedAt: question.firstOpenedAt,
          lastInteractedAt: question.lastInteractedAt,
          completedAt: question.completedAt,
          skippedAt: question.skippedAt,
          solutionViewedAt: question.solutionViewedAt,
          timeSpentSeconds: question.timeSpentSeconds,
          revealCount: question.revealCount,
          answerPayloadJson: question.answerPayloadJson,
        })),
      ),
      updatedAt: now,
    });
    const status = deriveStudySessionStatusFromProgress(
      progress,
      existingSession.family,
      existingSession.deadlineAt,
      now,
      Boolean(existingSession.startedAt),
    );
    const updatedExerciseState = buildStudySessionExerciseState({
      ...targetExercise,
      sessionQuestions:
        nextExercises
          .find((exercise) => exercise.id === targetExercise.id)
          ?.sessionQuestions.map((question) => ({
            questionId: question.questionNodeId,
            sequenceIndex: question.sequenceIndex,
            answerState: question.answerState,
            resultStatus: question.resultStatus,
            evaluationMode: question.evaluationMode,
            reflection: question.reflection,
            diagnosis: question.diagnosis,
            firstOpenedAt: question.firstOpenedAt,
            lastInteractedAt: question.lastInteractedAt,
            completedAt: question.completedAt,
            skippedAt: question.skippedAt,
            solutionViewedAt: question.solutionViewedAt,
            timeSpentSeconds: question.timeSpentSeconds,
            revealCount: question.revealCount,
            answerPayloadJson: question.answerPayloadJson,
          })) ?? [],
    });

    const session = await this.prisma.$transaction(async (tx) => {
      await tx.studySessionQuestion.update({
        where: {
          sessionExerciseId_questionNodeId: {
            sessionExerciseId: targetExercise.id,
            questionNodeId: questionId,
          },
        },
        data: {
          answerState: nextQuestion.answerState,
          resultStatus: nextQuestion.resultStatus,
          evaluationMode: nextQuestion.evaluationMode,
          reflection: nextQuestion.reflection,
          diagnosis: nextQuestion.diagnosis,
          firstOpenedAt: nextQuestion.firstOpenedAt,
          lastInteractedAt: nextQuestion.lastInteractedAt,
          completedAt: nextQuestion.completedAt,
          skippedAt: nextQuestion.skippedAt,
          solutionViewedAt: nextQuestion.solutionViewedAt,
          timeSpentSeconds: nextQuestion.timeSpentSeconds,
          revealCount: nextQuestion.revealCount,
          answerPayloadJson: nextQuestion.answerPayloadJson ?? Prisma.JsonNull,
          finalizedAt: nextQuestion.completedAt ?? nextQuestion.skippedAt ?? null,
        },
      });

      await tx.studySessionExercise.update({
        where: { id: targetExercise.id },
        data: {
          firstOpenedAt: updatedExerciseState.firstOpenedAt,
          lastInteractedAt: updatedExerciseState.lastInteractedAt,
          completedAt: updatedExerciseState.completedAt,
        },
      });

      await this.studyReadModelService.refreshUserReadModels(userId, tx);

      return tx.studySession.update({
        where: { id: sessionId },
        data: {
          startedAt:
            existingSession.startedAt ??
            (status !== StudySessionStatus.CREATED ? now : undefined),
          lastInteractedAt:
            status !== StudySessionStatus.CREATED
              ? now
              : existingSession.startedAt
                ? now
                : null,
          completedAt:
            status === StudySessionStatus.COMPLETED
              ? (existingSession.completedAt ?? now)
              : null,
          submittedAt:
            existingSession.family === StudySessionFamily.SIMULATION &&
            status === StudySessionStatus.COMPLETED
              ? (existingSession.submittedAt ?? now)
              : existingSession.submittedAt,
          status,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });
    });

    return {
      id: session.id,
      status: session.status,
      progress,
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  async updateStudySessionProgress(
    userId: string,
    id: string,
    payload: UpdateStudySessionProgressDto,
  ): Promise<UpdateSessionProgressResponse> {
    const existingSession = await this.prisma.studySession.findFirst({
      where: { id, userId },
      select: {
        id: true,
        family: true,
        status: true,
        timingEnabled: true,
        resumeMode: true,
        startedAt: true,
        deadlineAt: true,
        submittedAt: true,
        completedAt: true,
        activeExerciseNodeId: true,
        activeQuestionNodeId: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            exerciseNodeId: true,
            orderIndex: true,
            firstOpenedAt: true,
            lastInteractedAt: true,
            completedAt: true,
            createdAt: true,
            sessionQuestions: {
              orderBy: { sequenceIndex: 'asc' },
              select: {
                questionNodeId: true,
                sequenceIndex: true,
                answerState: true,
                resultStatus: true,
                evaluationMode: true,
                reflection: true,
                diagnosis: true,
                firstOpenedAt: true,
                lastInteractedAt: true,
                completedAt: true,
                skippedAt: true,
                solutionViewedAt: true,
                timeSpentSeconds: true,
                revealCount: true,
                answerPayloadJson: true,
              },
            },
          },
        },
      },
    });

    if (!existingSession) {
      throw new NotFoundException(`Study session ${id} not found`);
    }

    const effectiveStatus = resolveEffectiveStudySessionStatus(existingSession);

    if (effectiveStatus === StudySessionStatus.EXPIRED) {
      if (existingSession.status !== StudySessionStatus.EXPIRED) {
        await this.prisma.studySession.update({
          where: { id },
          data: {
            status: StudySessionStatus.EXPIRED,
            resumeMode: StudySessionResumeMode.REVIEW,
          },
        });
      }

      throw new ForbiddenException('This simulation has expired.');
    }

    const now = new Date();
    const {
      progress,
      status,
      resolvedResumeMode,
      changedQuestions,
      changedExercises,
    } = buildStudySessionProgressUpdateDraft({
      existingSession,
      payload,
      effectiveStatus,
      now,
    });

    const session = await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        changedQuestions.map(({ sessionExerciseId, question }) =>
          tx.studySessionQuestion.update({
            where: {
              sessionExerciseId_questionNodeId: {
                sessionExerciseId,
                questionNodeId: question.questionId,
              },
            },
            data: {
              answerState: question.answerState,
              reflection: question.reflection,
              diagnosis: question.diagnosis,
              firstOpenedAt: question.firstOpenedAt,
              lastInteractedAt: question.lastInteractedAt,
              completedAt: question.completedAt,
              skippedAt: question.skippedAt,
              solutionViewedAt: question.solutionViewedAt,
              timeSpentSeconds: question.timeSpentSeconds,
              revealCount: question.revealCount,
              finalizedAt: question.completedAt ?? question.skippedAt ?? null,
            },
          }),
        ),
      );

      await Promise.all(
        changedExercises.map((exercise) =>
          tx.studySessionExercise.update({
            where: { id: exercise.exerciseId },
            data: {
              firstOpenedAt: exercise.firstOpenedAt,
              lastInteractedAt: exercise.lastInteractedAt,
              completedAt: exercise.completedAt,
            },
          }),
        ),
      );

      if (changedQuestions.length > 0) {
        await this.studyReadModelService.refreshUserReadModels(userId, tx);
      }

      return tx.studySession.update({
        where: { id },
        data: {
          resumeMode: resolvedResumeMode,
          startedAt:
            existingSession.startedAt ??
            (status !== StudySessionStatus.CREATED ? now : undefined),
          activeExerciseNodeId: payload.activeExerciseId ?? null,
          activeQuestionNodeId: payload.activeQuestionId ?? null,
          lastInteractedAt:
            status !== StudySessionStatus.CREATED
              ? now
              : existingSession.startedAt
                ? now
                : null,
          completedAt:
            status === StudySessionStatus.COMPLETED
              ? (existingSession.completedAt ?? now)
              : null,
          submittedAt:
            existingSession.family === StudySessionFamily.SIMULATION &&
            status === StudySessionStatus.COMPLETED
              ? (existingSession.submittedAt ?? now)
              : existingSession.submittedAt,
          status,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });
    });

    return {
      id: session.id,
      status: session.status,
      progress,
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private readStoredSessionFilters(
    value: Prisma.JsonValue | null,
  ): StudySessionResponse['filters'] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as StudySessionResponse['filters'];
  }

  private async buildWeakPointIntro(input: {
    userId: string;
    sessionKind: StudySessionKind;
    subjectCode: string | null;
    topicCodes: string[];
    exercises: StudySessionResponse['exercises'];
    supportStyle: StudySessionResponse['pedagogy']['supportStyle'];
  }): Promise<StudySessionResponse['pedagogy']['weakPointIntro']> {
    if (
      input.sessionKind !== StudySessionKind.WEAK_POINT_DRILL ||
      !input.subjectCode ||
      input.topicCodes.length === 0
    ) {
      return null;
    }

    const requestedTopicCodes = Array.from(new Set(input.topicCodes));
    const topics = await this.prisma.topic.findMany({
      where: {
        code: {
          in: requestedTopicCodes,
        },
        subject: {
          code: input.subjectCode,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        studentLabel: true,
        displayOrder: true,
        parent: {
          select: {
            code: true,
            name: true,
            studentLabel: true,
          },
        },
        skillMappings: {
          select: {
            weight: true,
            isPrimary: true,
            skill: {
              select: {
                name: true,
                description: true,
                displayOrder: true,
              },
            },
          },
        },
      },
    });

    if (!topics.length) {
      return null;
    }

    const topicRollups = await this.prisma.studentTopicRollup.findMany({
      where: {
        userId: input.userId,
        topicId: {
          in: topics.map((topic) => topic.id),
        },
      },
      select: {
        topicId: true,
        missedCount: true,
        hardCount: true,
        skippedCount: true,
        revealedCount: true,
      },
    });
    return buildWeakPointIntroPayload({
      requestedTopicCodes,
      topics,
      topicRollups,
      exercises: input.exercises,
      supportStyle: input.supportStyle,
    });
  }

  private resolveStudySessionMode(
    payload: CreateStudySessionDto,
  ): ResolvedStudySessionMode {
    const requestedKind = payload.kind;
    const requestedFamily = payload.family;
    const kind =
      requestedKind ??
      (requestedFamily === StudySessionFamily.SIMULATION
        ? StudySessionKind.PAPER_SIMULATION
        : inferStudySessionKindFromTopicCodes(payload.topicCodes ?? []));
    const family = requestedFamily ?? resolveStudySessionFamilyFromKind(kind);

    if (resolveStudySessionFamilyFromKind(kind) !== family) {
      throw new BadRequestException(
        'The selected session family does not match the requested session kind.',
      );
    }

    return {
      family,
      kind,
      sourceExamId: payload.sourceExamId?.trim() ?? null,
      sourceSujetNumber:
        payload.sourceSujetNumber === 1 || payload.sourceSujetNumber === 2
          ? payload.sourceSujetNumber
          : null,
    };
  }

  private async ensureStudySessionStartAllowed(
    userId: string,
    sessionMode: ResolvedStudySessionMode,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Student account not found.');
    }

    const [drillStartsUsed, simulationStartsUsed] =
      await this.readMonthlySessionStartUsage(userId);
    const entitlements = buildStudyEntitlements({
      subscriptionStatus: user.subscriptionStatus,
      drillStartsUsed,
      simulationStartsUsed,
    });

    if (
      sessionMode.kind === StudySessionKind.WEAK_POINT_DRILL &&
      user.subscriptionStatus !== SubscriptionStatus.ACTIVE
    ) {
      throw new ForbiddenException(
        'Weak-point drill is available on premium plans only.',
      );
    }

    if (
      !canStartStudySessionKind({
        entitlements,
        family: sessionMode.family,
        kind: sessionMode.kind,
      })
    ) {
      const quotaBucket =
        sessionMode.family === StudySessionFamily.SIMULATION
          ? entitlements.quotas.simulationStarts
          : entitlements.quotas.drillStarts;
      const sessionLabel =
        sessionMode.family === StudySessionFamily.SIMULATION
          ? 'simulation'
          : 'drill session';

      throw new ForbiddenException(
        `Your monthly ${sessionLabel} quota is exhausted until ${quotaBucket.resetsAt}.`,
      );
    }
  }

  private async readMonthlySessionStartUsage(userId: string) {
    const quotaWindow = getStudyMonthlyQuotaWindow();

    return Promise.all([
      this.prisma.studySession.count({
        where: {
          userId,
          family: StudySessionFamily.DRILL,
          createdAt: {
            gte: quotaWindow.startsAt,
            lt: quotaWindow.resetsAt,
          },
        },
      }),
      this.prisma.studySession.count({
        where: {
          userId,
          family: StudySessionFamily.SIMULATION,
          createdAt: {
            gte: quotaWindow.startsAt,
            lt: quotaWindow.resetsAt,
          },
        },
      }),
    ]);
  }

  private async previewOfficialPaperSimulation(
    payload: CreateStudySessionDto,
    sessionMode: ResolvedStudySessionMode,
  ): Promise<SessionPreviewResponse> {
    const simulationPlan = await this.resolveOfficialPaperSimulationPlan(
      payload,
      sessionMode,
    );

    return buildOfficialSimulationPreviewResponse({
      sessionFamily: sessionMode.family,
      sessionKind: sessionMode.kind,
      simulationPlan,
    });
  }

  private async createOfficialPaperSimulation(
    userId: string,
    payload: CreateStudySessionDto,
    sessionMode: ResolvedStudySessionMode,
  ): Promise<CreateSessionResponse> {
    const simulationPlan = await this.resolveOfficialPaperSimulationPlan(
      payload,
      sessionMode,
    );
    const now = new Date();
    const deadlineAt = this.addMinutes(
      now,
      simulationPlan.sourceExam.durationMinutes,
    );
    const filtersSnapshot =
      buildOfficialSimulationFiltersSnapshot(simulationPlan);
    const sessionTitle = buildOfficialSimulationSessionTitle({
      requestedTitle: payload.title,
      simulationPlan,
    });
    const plannedExercises = this.planStudySessionExercises(
      simulationPlan.exercises.map((exercise, index) => ({
        exercise,
        orderIndex: index + 1,
        examId: simulationPlan.sourceExam.id,
      })),
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const session = await tx.studySession.create({
        data: {
          userId,
          title: sessionTitle,
          family: sessionMode.family,
          kind: sessionMode.kind,
          sourceExamId: simulationPlan.sourceExam.id,
          requestedExerciseCount: simulationPlan.exercises.length,
          durationMinutes: simulationPlan.sourceExam.durationMinutes,
          timingEnabled: false,
          filtersJson: filtersSnapshot,
          resumeMode: StudySessionResumeMode.SOLVE,
          status: StudySessionStatus.IN_PROGRESS,
          startedAt: now,
          deadlineAt,
          lastInteractedAt: now,
        },
        select: { id: true },
      });

      await this.persistStudySessionExercises(tx, session.id, plannedExercises);

      return session;
    });

    return this.getStudySessionById(userId, created.id);
  }

  private async resolveOfficialPaperSimulationPlan(
    payload: CreateStudySessionDto,
    sessionMode: ResolvedStudySessionMode,
  ): Promise<OfficialSimulationPlan> {
    const sourceExamId = sessionMode.sourceExamId;
    assertOfficialSimulationRequested(sourceExamId);

    const exam = await this.prisma.exam.findUnique({
      where: { id: sourceExamId },
      select: {
        id: true,
        year: true,
        sessionType: true,
        isPublished: true,
        stream: {
          select: {
            code: true,
            name: true,
          },
        },
        subject: {
          select: {
            code: true,
            name: true,
          },
        },
        paper: {
          select: {
            durationMinutes: true,
            variants: {
              where: {
                status: PublicationStatus.PUBLISHED,
              },
              orderBy: {
                code: 'asc',
              },
              select: {
                id: true,
                code: true,
                title: true,
                status: true,
                nodes: {
                  where: {
                    status: PublicationStatus.PUBLISHED,
                  },
                  orderBy: [{ orderIndex: 'asc' }],
                  select: {
                    id: true,
                    parentId: true,
                    nodeType: true,
                    orderIndex: true,
                    label: true,
                    maxPoints: true,
                    status: true,
                    metadata: true,
                    topicMappings: {
                      select: {
                        topic: {
                          select: {
                            code: true,
                            name: true,
                            studentLabel: true,
                            displayOrder: true,
                          },
                        },
                      },
                    },
                    blocks: {
                      orderBy: [{ role: 'asc' }, { orderIndex: 'asc' }],
                      select: {
                        id: true,
                        role: true,
                        orderIndex: true,
                        blockType: true,
                        textValue: true,
                        data: true,
                        media: {
                          select: {
                            id: true,
                            url: true,
                            type: true,
                            metadata: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    assertOfficialSimulationExamMatchesRequest(payload, exam);

    return buildOfficialSimulationPlan({
      exam,
      requestedSujetNumber: sessionMode.sourceSujetNumber,
    });
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private async listStudySessionExerciseCandidates(
    filters: ResolvedStudySessionFilters,
  ): Promise<StudySessionExerciseCandidate[]> {
    const exams = await this.prisma.exam.findMany({
      where: {
        isPublished: true,
        subject: {
          code: filters.subjectCode,
        },
        ...(filters.streamCodes.length
          ? {
              stream: {
                code: {
                  in: filters.streamCodes,
                },
              },
            }
          : {}),
        ...(filters.years.length ? { year: { in: filters.years } } : {}),
        ...(filters.sessionTypes.length
          ? { sessionType: { in: filters.sessionTypes } }
          : {}),
      },
      orderBy: [
        { year: 'desc' },
        { stream: { name: 'asc' } },
        { subject: { name: 'asc' } },
        { sessionType: 'asc' },
      ],
      select: {
        id: true,
        year: true,
        sessionType: true,
        stream: {
          select: {
            code: true,
            name: true,
          },
        },
        subject: {
          select: {
            code: true,
            name: true,
          },
        },
        paper: {
          select: {
            variants: {
              where: {
                status: PublicationStatus.PUBLISHED,
              },
              orderBy: {
                code: 'asc',
              },
              select: {
                id: true,
                code: true,
                title: true,
                status: true,
                nodes: {
                  where: {
                    status: PublicationStatus.PUBLISHED,
                  },
                  orderBy: [{ orderIndex: 'asc' }],
                  select: {
                    id: true,
                    parentId: true,
                    nodeType: true,
                    orderIndex: true,
                    label: true,
                    maxPoints: true,
                    status: true,
                    metadata: true,
                    topicMappings: {
                      select: {
                        topic: {
                          select: {
                            code: true,
                            name: true,
                            studentLabel: true,
                            displayOrder: true,
                          },
                        },
                      },
                    },
                    blocks: {
                      orderBy: [{ role: 'asc' }, { orderIndex: 'asc' }],
                      select: {
                        id: true,
                        role: true,
                        orderIndex: true,
                        blockType: true,
                        textValue: true,
                        data: true,
                        media: {
                          select: {
                            id: true,
                            url: true,
                            type: true,
                            metadata: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return buildStudySessionExerciseCandidates({
      exams,
      filters,
    });
  }

  private async resolveStudySessionFilters(
    userId: string,
    payload: CreateStudySessionDto,
    sessionMode: ResolvedStudySessionMode,
  ): Promise<ResolvedStudySessionFilters> {
    let normalizedRequest = normalizeRequestedStudySessionFilters(payload, {
      min: SESSION_YEAR_MIN,
      max: SESSION_YEAR_MAX,
    });
    const subjectScope =
      await this.catalogCurriculumService.resolveSubjectCurriculumScope({
        subjectCode: normalizedRequest.subjectCode,
        streamCodes: normalizedRequest.streamCodes,
        years: normalizedRequest.years,
      });

    if (!subjectScope) {
      throw new BadRequestException('The selected subject is invalid.');
    }

    if (sessionMode.kind === StudySessionKind.WEAK_POINT_DRILL) {
      const weakPointTarget =
        await this.studyWeakPointService.resolveWeakPointTarget(userId, {
          subjectCode: normalizedRequest.subjectCode,
        });

      if (!weakPointTarget?.topicCodes.length) {
        throw new NotFoundException(
          'No weak-point insight is available for this subject yet. Complete a few reviewed questions first.',
        );
      }

      normalizedRequest = applyWeakPointTopicCodes(
        normalizedRequest,
        weakPointTarget.topicCodes,
      );
    }

    assertValidStudySessionStreamCodes(
      normalizedRequest.streamCodes,
      subjectScope.allowedStreamCodes,
    );
    let topicMatchCodes = normalizedRequest.topicMatchCodes;

    if (normalizedRequest.topicCodes.length) {
      const subjectTopics = await this.prisma.topic.findMany({
        where: {
          subjectId: subjectScope.subjectId,
          curriculumId: {
            in: subjectScope.curriculumIds,
          },
        },
        select: {
          code: true,
          parent: {
            select: {
              code: true,
            },
          },
        },
      });
      topicMatchCodes = resolveStudySessionTopicMatchCodes({
        topicCodes: normalizedRequest.topicCodes,
        subjectTopicCodes: subjectTopics.map((topic) => topic.code),
        topicTree: subjectTopics.map((topic) => ({
          code: topic.code,
          parentCode: topic.parent?.code ?? null,
        })),
      });
    }

    return buildResolvedStudySessionFilters({
      normalizedRequest,
      subjectScope: {
        subjectId: subjectScope.subjectId,
        subjectCode: subjectScope.subjectCode,
        allowedStreamCodes: subjectScope.allowedStreamCodes,
        curriculumIds: subjectScope.curriculumIds,
      },
      topicCodes: normalizedRequest.topicCodes,
      topicMatchCodes,
    });
  }

  private async ensureWeakPointAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        subscriptionStatus: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Student account not found.');
    }

    if (user.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
      throw new ForbiddenException(
        'Weak-point drill is available on premium plans only.',
      );
    }
  }

  private planStudySessionExercises(
    entries: Array<{
      exercise: StudySessionExerciseCandidate;
      orderIndex: number;
      examId: string | null;
    }>,
  ): PlannedStudySessionExercise[] {
    return entries.map(({ exercise, orderIndex, examId }) => ({
      id: randomUUID(),
      exerciseNodeId: exercise.exerciseNodeId,
      examId,
      orderIndex,
      questionSeeds: exercise.questions.map((question) => ({
        id: randomUUID(),
        questionNodeId: question.questionNodeId,
        sequenceIndex: question.sequenceIndex,
      })),
    }));
  }

  private async persistStudySessionExercises(
    tx: Prisma.TransactionClient,
    sessionId: string,
    exercises: PlannedStudySessionExercise[],
  ) {
    if (!exercises.length) {
      return;
    }

    await tx.studySessionExercise.createMany({
      data: exercises.map((exercise) => ({
        id: exercise.id,
        sessionId,
        exerciseNodeId: exercise.exerciseNodeId,
        examId: exercise.examId,
        orderIndex: exercise.orderIndex,
      })),
    });

    const sessionQuestions = exercises.flatMap((exercise) =>
      exercise.questionSeeds.map((question) => ({
        id: question.id,
        sessionExerciseId: exercise.id,
        questionNodeId: question.questionNodeId,
        sequenceIndex: question.sequenceIndex,
      })),
    );

    if (!sessionQuestions.length) {
      return;
    }

    await tx.studySessionQuestion.createMany({
      data: sessionQuestions,
    });
  }

  private pickRandom<T>(items: T[], count: number): T[] {
    const pool = [...items];

    for (let index = pool.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
    }

    return pool.slice(0, count);
  }
}
