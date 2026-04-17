import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  CreateSessionResponse,
  StudyReviewReasonType,
  StudySessionProgress,
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
  SessionType,
  StudyQuestionAnswerState,
  StudyQuestionDiagnosis,
  StudyQuestionReflection,
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
import {
  StudySessionMode,
  UpdateStudySessionProgressDto,
} from './dto/update-study-session-progress.dto';
import {
  buildHierarchyExerciseSummaries,
  buildStudySessionSearchCorpus,
  buildSessionExerciseHierarchyPayload,
  collectHierarchyQuestionItemsForSession,
  type ExamVariantWithNodes,
  getSessionTypeRank,
  getSujetLabel,
  type HierarchyNodePayload,
  mapVariantHierarchy,
  pickRepresentativeExamOffering,
  pushStudySessionExamOffering,
  sortStudySessionExamOfferings,
  toStudySessionExamOffering,
  toSujetNumberFromVariantCode,
  type StudySessionExerciseCandidate,
  type StudySessionExamOffering,
  type SujetNumber,
} from './study-session-helpers';
import { SESSION_YEAR_MAX, SESSION_YEAR_MIN } from './session-year-range';
import {
  buildCommonTrapMessage,
  extractPromptPreview,
  getFallbackPedagogyRules,
  resolveStudySupportStyle,
  toPedagogyRule,
} from './study-pedagogy';
import { StudyReadModelService } from './study-read-model.service';
import { StudyWeakPointService } from './study-weak-point.service';

const DEFAULT_PREVIEW_SUJETS_LIMIT = 80;

type StudySessionProgressSnapshot = StudySessionProgress;

type StoredStudySessionQuestionRow = {
  questionId: string;
  sequenceIndex: number;
  answerState: StudyQuestionAnswerState;
  reflection: StudyQuestionReflection | null;
  diagnosis: StudyQuestionDiagnosis | null;
  firstOpenedAt: Date | null;
  lastInteractedAt: Date | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  solutionViewedAt: Date | null;
  timeSpentSeconds: number;
  revealCount: number;
};

type RequestedStudySessionQuestionState = {
  questionId: string;
  opened?: boolean;
  completed?: boolean;
  skipped?: boolean;
  solutionViewed?: boolean;
  timeSpentSeconds?: number;
  reflection?: StudyQuestionReflection;
  diagnosis?: StudyQuestionDiagnosis;
};

type StoredStudySessionExerciseRow = {
  id: string;
  exerciseNodeId: string;
  orderIndex: number;
  firstOpenedAt: Date | null;
  lastInteractedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  sessionQuestions: StoredStudySessionQuestionRow[];
};

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

type OfficialSimulationPlan = {
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
        timingEnabled: true,
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
                reflection: true,
                diagnosis: true,
                firstOpenedAt: true,
                lastInteractedAt: true,
                completedAt: true,
                skippedAt: true,
                solutionViewedAt: true,
                timeSpentSeconds: true,
                revealCount: true,
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

    return {
      data: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        family: session.family,
        kind: session.kind,
        status: this.resolveEffectiveSessionStatus(session),
        sourceExamId: session.sourceExamId,
        requestedExerciseCount: session.requestedExerciseCount,
        exerciseCount: session._count.exercises,
        durationMinutes: session.durationMinutes,
        startedAt: session.startedAt?.toISOString() ?? null,
        deadlineAt: session.deadlineAt?.toISOString() ?? null,
        completedAt: session.completedAt?.toISOString() ?? null,
        lastInteractedAt: session.lastInteractedAt?.toISOString() ?? null,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        progressSummary: this.buildStudySessionProgress({
          resumeMode: StudySessionResumeMode.SOLVE,
          activeExerciseId: null,
          activeQuestionId: null,
          sessionQuestions: session.exercises.flatMap((exercise) =>
            (exercise.sessionQuestions ?? []).map((question) => ({
              questionId: question.questionNodeId,
              sequenceIndex: question.sequenceIndex,
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
            })),
          ),
          updatedAt: session.updatedAt,
        }).summary,
      })),
    };
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

    const filters = await this.resolveStudySessionFilters(userId, payload, sessionMode);
    const matchingExercises =
      await this.listStudySessionExerciseCandidates(filters);
    const matchingExerciseCount = matchingExercises.length;

    const matchingSujetsMap = new Map<
      string,
      {
        examId: string;
        year: number;
        stream: {
          code: string;
          name: string;
        };
        subject: {
          code: string;
          name: string;
        };
        sessionType: SessionType;
        sujetNumber: SujetNumber;
        sujetLabel: string;
        matchingExerciseCount: number;
      }
    >();
    const yearsDistributionMap = new Map<number, number>();
    const streamsDistributionMap = new Map<
      string,
      {
        stream: {
          code: string;
          name: string;
        };
        matchingExerciseCount: number;
      }
    >();

    for (const exercise of matchingExercises) {
      for (const exam of exercise.examOfferings) {
        yearsDistributionMap.set(
          exam.year,
          (yearsDistributionMap.get(exam.year) ?? 0) + 1,
        );

        const streamEntry = streamsDistributionMap.get(exam.stream.code);
        if (streamEntry) {
          streamEntry.matchingExerciseCount += 1;
        } else {
          streamsDistributionMap.set(exam.stream.code, {
            stream: exam.stream,
            matchingExerciseCount: 1,
          });
        }

        const key = `${exam.id}:${exercise.sujetNumber}`;
        const current = matchingSujetsMap.get(key);

        if (current) {
          current.matchingExerciseCount += 1;
          continue;
        }

        matchingSujetsMap.set(key, {
          examId: exam.id,
          year: exam.year,
          stream: exam.stream,
          subject: exam.subject,
          sessionType: exam.sessionType,
          sujetNumber: exercise.sujetNumber,
          sujetLabel: exercise.sujetLabel,
          matchingExerciseCount: 1,
        });
      }
    }

    const matchingSujetEntries = Array.from(matchingSujetsMap.values()).sort(
      (a, b) => {
        if (a.year !== b.year) {
          return b.year - a.year;
        }

        const streamOrder = a.stream.name.localeCompare(b.stream.name);
        if (streamOrder !== 0) {
          return streamOrder;
        }

        if (a.sujetNumber !== b.sujetNumber) {
          return a.sujetNumber - b.sujetNumber;
        }

        return (
          getSessionTypeRank(a.sessionType) - getSessionTypeRank(b.sessionType)
        );
      },
    );

    const matchingSujets = matchingSujetEntries.slice(
      0,
      DEFAULT_PREVIEW_SUJETS_LIMIT,
    );
    const sampleExercises = matchingExercises.slice(0, 6).map((exercise) => ({
      exerciseNodeId: exercise.exerciseNodeId,
      orderIndex: exercise.orderIndex,
      title: exercise.title,
      questionCount: exercise.questionCount,
      examId: exercise.sourceExam.id,
      year: exercise.sourceExam.year,
      stream: exercise.sourceExam.stream,
      subject: exercise.sourceExam.subject,
      sessionType: exercise.sourceExam.sessionType,
      sujetNumber: exercise.sujetNumber,
      sujetLabel: exercise.sujetLabel,
    }));

    return {
      sessionFamily: sessionMode.family,
      sessionKind: sessionMode.kind,
      subjectCode: filters.subjectCode,
      streamCode:
        filters.streamCodes.length === 1 ? filters.streamCodes[0] : null,
      streamCodes: filters.streamCodes,
      years: filters.years,
      topicCodes: filters.topicCodes,
      sessionTypes: filters.sessionTypes,
      sourceExamId: null,
      durationMinutes: null,
      matchingExerciseCount,
      matchingSujetCount: matchingSujetEntries.length,
      matchingSujets,
      sampleExercises,
      yearsDistribution: Array.from(yearsDistributionMap.entries())
        .map(([year, count]) => ({
          year,
          matchingExerciseCount: count,
        }))
        .sort((a, b) => b.year - a.year),
      streamsDistribution: Array.from(streamsDistributionMap.values()).sort(
        (a, b) => b.matchingExerciseCount - a.matchingExerciseCount,
      ),
      maxSelectableExercises: Math.min(20, matchingExerciseCount),
    };
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

    const filters = await this.resolveStudySessionFilters(userId, payload, sessionMode);
    const exerciseCount = filters.exerciseCount;
    const candidates =
      await this.listStudySessionExerciseCandidates(filters);

    if (!candidates.length) {
      throw new NotFoundException(
        'No exercises match the selected filters. Try wider criteria.',
      );
    }

    const selected = filters.exerciseNodeIds.length
      ? filters.exerciseNodeIds
          .map((exerciseNodeId) =>
            candidates.find((candidate) => candidate.exerciseNodeId === exerciseNodeId),
          )
          .filter(
            (candidate): candidate is StudySessionExerciseCandidate =>
              candidate !== undefined,
          )
      : this.pickRandom(candidates, Math.min(exerciseCount, candidates.length));

    if (filters.exerciseNodeIds.length && selected.length !== filters.exerciseNodeIds.length) {
      throw new NotFoundException(
        'One or more selected exercises are no longer available.',
      );
    }

    const plannedExercises = this.planStudySessionExercises(
      selected.map((exercise, index) => ({
        exercise,
        orderIndex: index + 1,
        examId: exercise.sourceExam.id,
      })),
    );

    const filtersSnapshot: Prisma.InputJsonObject = {
      years: filters.years,
      streamCode:
        filters.streamCodes.length === 1 ? filters.streamCodes[0] : null,
      streamCodes: filters.streamCodes,
      subjectCode: filters.subjectCode,
      topicCodes: filters.topicCodes,
      sessionTypes: filters.sessionTypes,
      search: filters.search ?? null,
      exerciseNodeIds: filters.exerciseNodeIds,
    };

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
                reflection: true,
                diagnosis: true,
                firstOpenedAt: true,
                lastInteractedAt: true,
                completedAt: true,
                skippedAt: true,
                solutionViewedAt: true,
                timeSpentSeconds: true,
                revealCount: true,
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
    const exerciseByNodeId = new Map<
      string,
      {
        exercise: HierarchyNodePayload;
        fallbackExam: StudySessionExamOffering | null;
      }
    >();

    for (const variant of variants) {
      const hierarchy = mapVariantHierarchy(variant as ExamVariantWithNodes);
      const representativeExam = pickRepresentativeExamOffering(
        variant.paper.offerings,
      );

      for (const exercise of hierarchy.exercises) {
        exerciseByNodeId.set(exercise.id, {
          exercise,
          fallbackExam: representativeExam,
        });
      }
    }

    const responseExercises = session.exercises.map((entry) => {
      const linkedExercise = exerciseByNodeId.get(entry.exerciseNode.id);

      if (!linkedExercise) {
        throw new NotFoundException(
          `Study session ${id} references missing hierarchy exercise ${entry.exerciseNode.id}.`,
        );
      }

      const questions = collectHierarchyQuestionItemsForSession(
        linkedExercise.exercise.children,
        0,
        linkedExercise.exercise.topics,
      );
      const totalPoints =
        linkedExercise.exercise.maxPoints ??
        questions.reduce((sum, question) => sum + question.points, 0);
      const hierarchy = buildSessionExerciseHierarchyPayload(
        linkedExercise.exercise,
        questions,
      );
      const exam = entry.exam ?? linkedExercise.fallbackExam;

      if (!exam) {
        throw new NotFoundException(
          `Study session ${id} references missing exam context for exercise ${entry.exerciseNode.id}.`,
        );
      }

      return {
        sessionOrder: entry.orderIndex,
        id: linkedExercise.exercise.id,
        orderIndex: linkedExercise.exercise.orderIndex,
        title: linkedExercise.exercise.label || null,
        totalPoints,
        hierarchy,
        exam,
        questionCount: questions.length,
      };
    });
    const sessionSubjectCode =
      responseExercises[0]?.exam.subject.code ?? storedFilters?.subjectCode ?? null;
    const supportStyle = resolveStudySupportStyle(sessionSubjectCode);
    const pedagogy = {
      supportStyle,
      weakPointIntro: await this.buildWeakPointIntro({
        userId,
        sessionKind: session.kind,
        subjectCode: sessionSubjectCode,
        topicCodes: storedFilters?.topicCodes ?? [],
        exercises: responseExercises,
        supportStyle,
      }),
    } satisfies StudySessionResponse['pedagogy'];

    return {
      timingEnabled: session.timingEnabled,
      id: session.id,
      title: session.title,
      family: session.family,
      kind: session.kind,
      status: this.resolveEffectiveSessionStatus(session),
      sourceExamId: session.sourceExamId,
      requestedExerciseCount: session.requestedExerciseCount,
      exerciseCount: session.exercises.length,
      durationMinutes: session.durationMinutes,
      filters: storedFilters,
      progress: this.buildStudySessionProgress({
        resumeMode:
          session.family === StudySessionFamily.SIMULATION &&
          this.resolveEffectiveSessionStatus(session) === StudySessionStatus.EXPIRED
            ? StudySessionResumeMode.REVIEW
            : session.resumeMode,
        activeExerciseId: session.activeExerciseNodeId,
        activeQuestionId: session.activeQuestionNodeId,
        sessionQuestions: session.exercises.flatMap((exercise) =>
          (exercise.sessionQuestions ?? []).map((question) => ({
            questionId: question.questionNodeId,
            sequenceIndex: question.sequenceIndex,
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
          })),
        ),
        updatedAt: session.updatedAt,
      }),
      pedagogy,
      startedAt: session.startedAt?.toISOString() ?? null,
      deadlineAt: session.deadlineAt?.toISOString() ?? null,
      submittedAt: session.submittedAt?.toISOString() ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      lastInteractedAt: session.lastInteractedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      exercises: responseExercises,
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
                reflection: true,
                diagnosis: true,
                firstOpenedAt: true,
                lastInteractedAt: true,
                completedAt: true,
                skippedAt: true,
                solutionViewedAt: true,
                timeSpentSeconds: true,
                revealCount: true,
              },
            },
          },
        },
      },
    });

    if (!existingSession) {
      throw new NotFoundException(`Study session ${id} not found`);
    }

    const effectiveStatus = this.resolveEffectiveSessionStatus(existingSession);

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
    const requestedMode =
      payload.mode === StudySessionMode.REVIEW
        ? StudySessionResumeMode.REVIEW
        : payload.mode === StudySessionMode.SOLVE
          ? StudySessionResumeMode.SOLVE
          : existingSession.resumeMode;
    const exercisesByNodeId = new Map(
      existingSession.exercises.map((exercise) => [
        exercise.exerciseNodeId,
        exercise,
      ]),
    );
    const questionsById = new Map<
      string,
      {
        exerciseNodeId: string;
        question: StoredStudySessionQuestionRow;
      }
    >();

    for (const exercise of existingSession.exercises) {
      for (const question of exercise.sessionQuestions) {
        questionsById.set(question.questionNodeId, {
          exerciseNodeId: exercise.exerciseNodeId,
          question: {
            questionId: question.questionNodeId,
            sequenceIndex: question.sequenceIndex,
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
          },
        });
      }
    }

    if (payload.activeExerciseId && !exercisesByNodeId.has(payload.activeExerciseId)) {
      throw new BadRequestException(
        'The active exercise does not belong to this study session.',
      );
    }

    if (payload.activeQuestionId && !questionsById.has(payload.activeQuestionId)) {
      throw new BadRequestException(
        'The active question does not belong to this study session.',
      );
    }

    if (payload.activeExerciseId && payload.activeQuestionId) {
      const questionOwner = questionsById.get(payload.activeQuestionId);
      if (questionOwner && questionOwner.exerciseNodeId !== payload.activeExerciseId) {
        throw new BadRequestException(
          'The active question does not belong to the selected exercise.',
        );
      }
    }

    const payloadQuestionStates = new Map(
      (payload.questionStates ?? []).map((questionState) => {
        if (!questionsById.has(questionState.questionId)) {
          throw new BadRequestException(
            'One or more question states do not belong to this study session.',
          );
        }

        return [questionState.questionId, questionState] as const;
      }),
    );
    const allowReviewSignals =
      existingSession.family !== StudySessionFamily.SIMULATION ||
      effectiveStatus === StudySessionStatus.COMPLETED;
    const nextExercises = existingSession.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseNodeId: exercise.exerciseNodeId,
      orderIndex: exercise.orderIndex,
      firstOpenedAt: exercise.firstOpenedAt,
      lastInteractedAt: exercise.lastInteractedAt,
      completedAt: exercise.completedAt,
      createdAt: exercise.createdAt,
      sessionQuestions: (exercise.sessionQuestions ?? []).map((question) =>
        this.resolveNextStudySessionQuestionState({
          current: {
            questionId: question.questionNodeId,
            sequenceIndex: question.sequenceIndex,
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
          },
          requested: payloadQuestionStates.get(question.questionNodeId),
          now,
          becameActive:
            payload.activeQuestionId === question.questionNodeId &&
            existingSession.activeQuestionNodeId !== question.questionNodeId,
          allowSolutionReveal: allowReviewSignals,
          allowReflection: allowReviewSignals,
          allowDiagnosis: allowReviewSignals,
          timingEnabled: existingSession.timingEnabled,
        }),
      ),
    }));
    let progress = this.buildStudySessionProgress({
      resumeMode: requestedMode,
      activeExerciseId: payload.activeExerciseId ?? null,
      activeQuestionId: payload.activeQuestionId ?? null,
      sessionQuestions: nextExercises.flatMap((exercise) =>
        exercise.sessionQuestions,
      ),
      updatedAt: now,
    });
    const status = this.deriveStudySessionStatusFromProgress(
      progress,
      existingSession.family,
      existingSession.deadlineAt,
      now,
      Boolean(existingSession.startedAt),
    );
    if (
      existingSession.family === StudySessionFamily.SIMULATION &&
      requestedMode === StudySessionResumeMode.REVIEW &&
      status !== StudySessionStatus.COMPLETED &&
      status !== StudySessionStatus.EXPIRED
    ) {
      throw new ForbiddenException(
        'Simulation review is available only after submission or expiry.',
      );
    }
    const resolvedResumeMode =
      existingSession.family === StudySessionFamily.SIMULATION &&
      (status === StudySessionStatus.COMPLETED ||
        status === StudySessionStatus.EXPIRED)
        ? StudySessionResumeMode.REVIEW
        : requestedMode;

    if (resolvedResumeMode !== requestedMode) {
      progress = this.buildStudySessionProgress({
        resumeMode: resolvedResumeMode,
        activeExerciseId: payload.activeExerciseId ?? null,
        activeQuestionId: payload.activeQuestionId ?? null,
        sessionQuestions: nextExercises.flatMap((exercise) =>
          exercise.sessionQuestions,
        ),
        updatedAt: now,
      });
    }
    const currentQuestionRowsById = new Map(
      existingSession.exercises.flatMap((exercise) =>
        (exercise.sessionQuestions ?? []).map((question) => [
          question.questionNodeId,
          {
            questionId: question.questionNodeId,
            sequenceIndex: question.sequenceIndex,
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
          } satisfies StoredStudySessionQuestionRow,
        ]),
      ),
    );
    const changedQuestions = nextExercises.flatMap((exercise) =>
      exercise.sessionQuestions
        .filter((question) =>
          this.hasStudySessionQuestionStateChanged(
            currentQuestionRowsById.get(question.questionId) ?? question,
            question,
          ),
        )
        .map((question) => ({
          sessionExerciseId: exercise.id,
          question,
        })),
    );
    const nextExerciseStates = nextExercises.map((exercise) => ({
      exerciseId: exercise.id,
      ...this.buildStudySessionExerciseState(exercise),
    }));
    const changedExercises = nextExerciseStates.filter((exerciseState) => {
      const current = existingSession.exercises.find(
        (exercise) => exercise.id === exerciseState.exerciseId,
      );

      if (!current) {
        return true;
      }

      return (
        this.dateOrNullToIso(current.firstOpenedAt) !==
          this.dateOrNullToIso(exerciseState.firstOpenedAt) ||
        this.dateOrNullToIso(current.lastInteractedAt) !==
          this.dateOrNullToIso(exerciseState.lastInteractedAt) ||
        this.dateOrNullToIso(current.completedAt) !==
          this.dateOrNullToIso(exerciseState.completedAt)
      );
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
              finalizedAt:
                question.completedAt ?? question.skippedAt ?? null,
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
              ? existingSession.completedAt ?? now
              : null,
          submittedAt:
            existingSession.family === StudySessionFamily.SIMULATION &&
            status === StudySessionStatus.COMPLETED
              ? existingSession.submittedAt ?? now
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

    const topicOrder = new Map(
      requestedTopicCodes.map((topicCode, index) => [topicCode, index]),
    );
    const orderedTopics = [...topics].sort((left, right) => {
      const leftIndex = topicOrder.get(left.code) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = topicOrder.get(right.code) ?? Number.MAX_SAFE_INTEGER;

      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return left.displayOrder - right.displayOrder;
    });
    const topicRollups = await this.prisma.studentTopicRollup.findMany({
      where: {
        userId: input.userId,
        topicId: {
          in: orderedTopics.map((topic) => topic.id),
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
    const rollupsByTopicId = new Map(
      topicRollups.map((rollup) => [rollup.topicId, rollup]),
    );
    const reasonTotals = [
      {
        reason: 'MISSED',
        count: orderedTopics.reduce(
          (sum, topic) => sum + (rollupsByTopicId.get(topic.id)?.missedCount ?? 0),
          0,
        ),
      },
      {
        reason: 'HARD',
        count: orderedTopics.reduce(
          (sum, topic) => sum + (rollupsByTopicId.get(topic.id)?.hardCount ?? 0),
          0,
        ),
      },
      {
        reason: 'SKIPPED',
        count: orderedTopics.reduce(
          (sum, topic) => sum + (rollupsByTopicId.get(topic.id)?.skippedCount ?? 0),
          0,
        ),
      },
      {
        reason: 'REVEALED',
        count: orderedTopics.reduce(
          (sum, topic) => sum + (rollupsByTopicId.get(topic.id)?.revealedCount ?? 0),
          0,
        ),
      },
    ] satisfies Array<{ reason: StudyReviewReasonType; count: number }>;
    const dominantReason = [...reasonTotals].sort(
      (left, right) => right.count - left.count,
    )[0];
    const keyRules = Array.from(
      new Set(
        orderedTopics.flatMap((topic) =>
          [...topic.skillMappings]
            .sort((left, right) => {
              if (left.isPrimary !== right.isPrimary) {
                return left.isPrimary ? -1 : 1;
              }

              const weightDelta = Number(right.weight) - Number(left.weight);

              if (weightDelta !== 0) {
                return weightDelta;
              }

              return left.skill.displayOrder - right.skill.displayOrder;
            })
            .map((mapping) =>
              toPedagogyRule({
                skillName: mapping.skill.name,
                description: mapping.skill.description,
              }),
            ),
        ),
      ),
    )
      .filter(Boolean)
      .slice(0, 3);
    const paddedRules = [...keyRules];

    for (const fallbackRule of getFallbackPedagogyRules(input.supportStyle)) {
      if (paddedRules.length >= 3) {
        break;
      }

      if (!paddedRules.includes(fallbackRule)) {
        paddedRules.push(fallbackRule);
      }
    }

    const prerequisiteTopics = Array.from(
      new Map(
        orderedTopics
          .map((topic) => topic.parent)
          .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic))
          .map((topic) => [
            topic.code,
            {
              code: topic.code,
              name: topic.studentLabel ?? topic.name,
            },
          ]),
      ).values(),
    );
    const starterExercise = input.exercises[0];
    const starterQuestion = starterExercise?.hierarchy.questions[0] ?? null;

    return {
      title:
        orderedTopics.length === 1
          ? `بطاقة علاج سريعة: ${orderedTopics[0].studentLabel ?? orderedTopics[0].name}`
          : 'بطاقة علاج سريعة للمحاور الأضعف',
      topicCodes: orderedTopics.map((topic) => topic.code),
      topics: orderedTopics.map((topic) => ({
        code: topic.code,
        name: topic.studentLabel ?? topic.name,
      })),
      prerequisiteTopics,
      keyRules: paddedRules,
      commonTrap: buildCommonTrapMessage({
        supportStyle: input.supportStyle,
        dominantReason:
          dominantReason && dominantReason.count > 0 ? dominantReason.reason : null,
      }),
      dominantReason:
        dominantReason && dominantReason.count > 0 ? dominantReason.reason : null,
      starterExercise: starterExercise
        ? {
            exerciseNodeId: starterExercise.hierarchy.exerciseNodeId,
            exerciseTitle: starterExercise.hierarchy.exerciseLabel ?? starterExercise.title,
            questionId: starterQuestion?.id ?? null,
            questionLabel: starterQuestion?.label ?? null,
            promptPreview: starterQuestion
              ? extractPromptPreview(starterQuestion.promptBlocks)
              : null,
            source: {
              year: starterExercise.exam.year,
              sessionType: starterExercise.exam.sessionType,
              subject: starterExercise.exam.subject,
              stream: starterExercise.exam.stream,
            },
          }
        : null,
    };
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
        : (payload.topicCodes?.length ?? 0) > 0
          ? StudySessionKind.TOPIC_DRILL
          : StudySessionKind.MIXED_DRILL);
    const family =
      requestedFamily ?? resolveStudySessionFamilyFromKind(kind);

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
      subscriptionStatus: user.subscriptionStatus as SubscriptionStatus,
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

    return {
      sessionFamily: sessionMode.family,
      sessionKind: sessionMode.kind,
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
    const filtersSnapshot: Prisma.InputJsonObject = {
      years: [simulationPlan.sourceExam.year],
      streamCode: simulationPlan.sourceExam.stream.code,
      streamCodes: [simulationPlan.sourceExam.stream.code],
      subjectCode: simulationPlan.sourceExam.subject.code,
      topicCodes: [],
      sessionTypes: [simulationPlan.sourceExam.sessionType],
    };
    const sessionTitle =
      payload.title?.trim() ||
      `محاكاة ${simulationPlan.sourceExam.subject.name} · ${simulationPlan.sourceExam.year} · ${simulationPlan.sujetLabel}`;
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
    if (!sessionMode.sourceExamId) {
      throw new BadRequestException(
        'An official paper simulation requires a source exam.',
      );
    }

    const exam = await this.prisma.exam.findUnique({
      where: { id: sessionMode.sourceExamId },
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

    const publishedVariants = exam.paper.variants
      .map((variant) => ({
        variant,
        sujetNumber: toSujetNumberFromVariantCode(variant.code),
      }))
      .filter(
        (
          entry,
        ): entry is {
          variant: (typeof exam.paper.variants)[number];
          sujetNumber: SujetNumber;
        } => entry.sujetNumber !== null,
      );
    const selectedVariantEntry = sessionMode.sourceSujetNumber
      ? publishedVariants.find(
          (entry) => entry.sujetNumber === sessionMode.sourceSujetNumber,
        )
      : publishedVariants.length === 1
        ? publishedVariants[0]
        : null;

    if (!selectedVariantEntry) {
      throw new BadRequestException(
        'Select the sujet number for the official paper simulation.',
      );
    }

    const hierarchy = mapVariantHierarchy(
      selectedVariantEntry.variant as ExamVariantWithNodes,
    );
    const exercises = hierarchy.exercises
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
          sujetNumber: selectedVariantEntry.sujetNumber,
          sujetLabel:
            selectedVariantEntry.variant.title ||
            getSujetLabel(selectedVariantEntry.sujetNumber),
          variantId: selectedVariantEntry.variant.id,
          variantCode: selectedVariantEntry.variant.code,
          variantTitle: selectedVariantEntry.variant.title,
          sourceExam: toStudySessionExamOffering(exam),
          examOfferings: [toStudySessionExamOffering(exam)],
          searchableText: buildStudySessionSearchCorpus(exercise, questions),
        } satisfies StudySessionExerciseCandidate;
      })
      .filter(
        (exercise): exercise is StudySessionExerciseCandidate =>
          exercise !== null,
      );

    if (!exercises.length) {
      throw new NotFoundException(
        'The selected official paper does not contain published exercises yet.',
      );
    }

    return {
      sourceExam: {
        id: exam.id,
        year: exam.year,
        sessionType: exam.sessionType,
        durationMinutes: exam.paper.durationMinutes,
        stream: exam.stream,
        subject: exam.subject,
      },
      sujetNumber: selectedVariantEntry.sujetNumber,
      sujetLabel:
        selectedVariantEntry.variant.title ||
        getSujetLabel(selectedVariantEntry.sujetNumber),
      exercises,
    };
  }

  private resolveEffectiveSessionStatus(
    session: {
      family: StudySessionFamily;
      status: StudySessionStatus;
      deadlineAt: Date | null;
    },
    now = new Date(),
  ) {
    if (
      session.status === StudySessionStatus.COMPLETED ||
      session.status === StudySessionStatus.EXPIRED
    ) {
      return session.status;
    }

    if (
      session.family === StudySessionFamily.SIMULATION &&
      session.deadlineAt &&
      session.deadlineAt.getTime() <= now.getTime()
    ) {
      return StudySessionStatus.EXPIRED;
    }

    return session.status;
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private async listStudySessionExerciseCandidates(filters: {
    years: number[];
    streamCodes: string[];
    subjectCode: string;
    topicCodes: string[];
    topicMatchCodes: string[];
    sessionTypes: SessionType[];
    search?: string;
    exerciseNodeIds: string[];
  }): Promise<StudySessionExerciseCandidate[]> {
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

    const candidateMap = new Map<string, StudySessionExerciseCandidate>();

    for (const exam of exams) {
      const examOffering = toStudySessionExamOffering(exam);

      for (const variant of exam.paper.variants) {
        const sujetNumber = toSujetNumberFromVariantCode(variant.code);

        if (!sujetNumber) {
          continue;
        }

        const hierarchy = mapVariantHierarchy(variant as ExamVariantWithNodes);

        for (const exercise of hierarchy.exercises) {
          if (
            filters.exerciseNodeIds.length &&
            !filters.exerciseNodeIds.includes(exercise.id)
          ) {
            continue;
          }

          const existingCandidate = candidateMap.get(exercise.id);

          if (existingCandidate) {
            pushStudySessionExamOffering(
              existingCandidate.examOfferings,
              examOffering,
            );
            continue;
          }

          const questions = collectHierarchyQuestionItemsForSession(
            exercise.children,
            0,
            exercise.topics,
          );

          if (!questions.length) {
            continue;
          }

          const searchableText = buildStudySessionSearchCorpus(exercise, questions);

          if (
            filters.topicMatchCodes.length &&
            !questions.some((question) =>
              question.topics.some((topic) =>
                filters.topicMatchCodes.includes(topic.code),
              ),
            )
          ) {
            continue;
          }

          if (
            filters.search &&
            !searchableText.includes(filters.search.trim().toLowerCase())
          ) {
            continue;
          }

          const totalPoints =
            exercise.maxPoints ??
            questions.reduce((sum, question) => sum + question.points, 0);

          candidateMap.set(exercise.id, {
            exerciseNodeId: exercise.id,
            orderIndex: exercise.orderIndex,
            title: exercise.label || null,
            totalPoints,
            questionCount: questions.length,
            questions: questions.map((question, questionIndex) => ({
              questionNodeId: question.id,
              sequenceIndex: questionIndex + 1,
            })),
            sujetNumber,
            sujetLabel: variant.title || getSujetLabel(sujetNumber),
            variantId: variant.id,
            variantCode: variant.code,
            variantTitle: variant.title,
            sourceExam: examOffering,
            examOfferings: [examOffering],
            searchableText,
          } satisfies StudySessionExerciseCandidate);
        }
      }
    }

    const candidates = Array.from(candidateMap.values());

    for (const candidate of candidates) {
      candidate.examOfferings = sortStudySessionExamOfferings(
        candidate.examOfferings,
      );
      candidate.sourceExam = candidate.examOfferings[0] ?? candidate.sourceExam;
    }

    return candidates.sort((a, b) => {
      if (a.sourceExam.year !== b.sourceExam.year) {
        return b.sourceExam.year - a.sourceExam.year;
      }

      const streamOrder = a.sourceExam.stream.name.localeCompare(
        b.sourceExam.stream.name,
      );
      if (streamOrder !== 0) {
        return streamOrder;
      }

      if (a.sujetNumber !== b.sujetNumber) {
        return a.sujetNumber - b.sujetNumber;
      }

      const sessionRankDelta =
        getSessionTypeRank(a.sourceExam.sessionType) -
        getSessionTypeRank(b.sourceExam.sessionType);

      if (sessionRankDelta !== 0) {
        return sessionRankDelta;
      }

      return a.orderIndex - b.orderIndex;
    });
  }

  private async resolveStudySessionFilters(
    userId: string,
    payload: CreateStudySessionDto,
    sessionMode: ResolvedStudySessionMode,
  ) {
    const years = this.uniqueNumbers(payload.years).filter(
      (year) => year >= SESSION_YEAR_MIN && year <= SESSION_YEAR_MAX,
    );
    const subjectCode = payload.subjectCode.trim().toUpperCase();
    const streamCodes = this.uniqueCodes([
      ...(payload.streamCodes ?? []),
      ...(payload.streamCode ? [payload.streamCode] : []),
    ]);
    let topicCodes = this.uniqueCodes(payload.topicCodes);
    const exerciseNodeIds = Array.from(new Set(payload.exerciseNodeIds ?? []));
    let topicMatchCodes = topicCodes;
    const sessionTypes = this.uniqueSessionTypes(payload.sessionTypes);
    const search = payload.search?.trim() || undefined;
    const exerciseCount =
      exerciseNodeIds.length > 0
        ? exerciseNodeIds.length
        : (payload.exerciseCount ?? 6);
    const subjectScope =
      await this.catalogCurriculumService.resolveSubjectCurriculumScope({
        subjectCode,
        streamCodes,
        years,
      });

    if (!subjectScope) {
      throw new BadRequestException('The selected subject is invalid.');
    }

    if (sessionMode.kind === StudySessionKind.WEAK_POINT_DRILL) {
      const weakPointTarget =
        await this.studyWeakPointService.resolveWeakPointTarget(userId, {
          subjectCode,
        });

      if (!weakPointTarget?.topicCodes.length) {
        throw new NotFoundException(
          'No weak-point insight is available for this subject yet. Complete a few reviewed questions first.',
        );
      }

      topicCodes = weakPointTarget.topicCodes;
      topicMatchCodes = weakPointTarget.topicCodes;
    }

    const allowedStreamCodes = Array.from(
      new Set(subjectScope.allowedStreamCodes),
    );

    const invalidStreamCodes = streamCodes.filter(
      (streamCode) => !allowedStreamCodes.includes(streamCode),
    );

    if (invalidStreamCodes.length) {
      throw new BadRequestException(
        'The selected stream is not available for this subject.',
      );
    }

    if (topicCodes.length) {
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
      const subjectTopicCodes = new Set(
        subjectTopics.map((topic) => topic.code),
      );

      if (!topicCodes.every((code) => subjectTopicCodes.has(code))) {
        throw new BadRequestException(
          'One or more selected topics are invalid for this subject.',
        );
      }

      topicMatchCodes = this.expandTopicCodesToDescendants(
        subjectTopics.map((topic) => ({
          code: topic.code,
          parentCode: topic.parent?.code ?? null,
        })),
        topicCodes,
      );
    }

    return {
      years,
      streamCodes,
      subjectCode: subjectScope.subjectCode,
      topicCodes,
      topicMatchCodes,
      sessionTypes,
      search,
      exerciseCount,
      exerciseNodeIds,
    };
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

  private buildStudySessionProgress(input: {
    resumeMode: StudySessionResumeMode;
    activeExerciseId: string | null;
    activeQuestionId: string | null;
    sessionQuestions: StoredStudySessionQuestionRow[];
    updatedAt: Date;
  }): StudySessionProgress {
    const questionStates = [...input.sessionQuestions]
      .sort((a, b) => {
        if (a.sequenceIndex !== b.sequenceIndex) {
          return a.sequenceIndex - b.sequenceIndex;
        }

        return a.questionId.localeCompare(b.questionId);
      })
      .map((question) => this.toStudySessionProgressQuestionState(question));
    const completedQuestionCount = questionStates.filter(
      (question) => question.completed,
    ).length;
    const skippedQuestionCount = questionStates.filter(
      (question) => question.skipped,
    ).length;
    const solutionViewedCount = questionStates.filter(
      (question) => question.solutionViewed,
    ).length;
    const trackedTimeSeconds = questionStates.reduce(
      (total, question) => total + question.timeSpentSeconds,
      0,
    );

    return {
      activeExerciseId: input.activeExerciseId,
      activeQuestionId: input.activeQuestionId,
      mode:
        input.resumeMode === StudySessionResumeMode.REVIEW
          ? StudySessionMode.REVIEW
          : StudySessionMode.SOLVE,
      questionStates,
      summary: {
        totalQuestionCount: questionStates.length,
        completedQuestionCount,
        skippedQuestionCount,
        unansweredQuestionCount: Math.max(
          questionStates.length - completedQuestionCount - skippedQuestionCount,
          0,
        ),
        solutionViewedCount,
        trackedTimeSeconds,
      },
      updatedAt: input.updatedAt.toISOString(),
    };
  }

  private toStudySessionProgressQuestionState(
    question: StoredStudySessionQuestionRow,
  ): StudySessionProgressSnapshot['questionStates'][number] {
    return {
      questionId: question.questionId,
      opened: this.isStudySessionQuestionOpened(question),
      completed: question.completedAt !== null,
      skipped: question.skippedAt !== null,
      solutionViewed:
        question.solutionViewedAt !== null || question.revealCount > 0,
      timeSpentSeconds: question.timeSpentSeconds,
      reflection: question.reflection,
      diagnosis: question.diagnosis,
    };
  }

  private isStudySessionQuestionOpened(question: StoredStudySessionQuestionRow) {
    return (
      question.firstOpenedAt !== null ||
      question.answerState !== StudyQuestionAnswerState.UNSEEN
    );
  }

  private resolveNextStudySessionQuestionState(input: {
    current: StoredStudySessionQuestionRow;
    requested: RequestedStudySessionQuestionState | undefined;
    now: Date;
    becameActive: boolean;
    allowSolutionReveal: boolean;
    allowReflection: boolean;
    allowDiagnosis: boolean;
    timingEnabled: boolean;
  }): StoredStudySessionQuestionRow {
    if (!input.requested && !input.becameActive) {
      return input.current;
    }

    const currentProgress = this.toStudySessionProgressQuestionState(
      input.current,
    );
    const desiredCompleted = Boolean(input.requested?.completed);
    const desiredSkipped = Boolean(input.requested?.skipped) && !desiredCompleted;
    const desiredSolutionViewed =
      (input.allowSolutionReveal && Boolean(input.requested?.solutionViewed)) ||
      currentProgress.solutionViewed;
    const desiredReflection =
      !input.allowReflection
        ? input.current.reflection
        : input.requested?.reflection === undefined
        ? input.current.reflection
        : input.requested.reflection;
    const requestedDiagnosis = input.requested?.diagnosis;
    const diagnosisAllowed =
      input.allowDiagnosis &&
      desiredReflection === StudyQuestionReflection.MISSED;
    const desiredDiagnosis = diagnosisAllowed
      ? requestedDiagnosis === undefined
        ? input.current.diagnosis
        : requestedDiagnosis
      : null;
    const desiredTimeSpentSeconds = input.timingEnabled
      ? Math.max(
          input.current.timeSpentSeconds,
          input.requested?.timeSpentSeconds ?? input.current.timeSpentSeconds,
        )
      : input.current.timeSpentSeconds;
    const desiredOpened =
      currentProgress.opened ||
      Boolean(input.requested?.opened) ||
      desiredCompleted ||
      desiredSkipped ||
      desiredSolutionViewed ||
      input.becameActive;
    const stateChanged =
      currentProgress.opened !== desiredOpened ||
      currentProgress.completed !== desiredCompleted ||
      currentProgress.skipped !== desiredSkipped ||
      currentProgress.solutionViewed !== desiredSolutionViewed ||
      currentProgress.timeSpentSeconds !== desiredTimeSpentSeconds ||
      currentProgress.reflection !== desiredReflection ||
      currentProgress.diagnosis !== desiredDiagnosis;
    const touchedAt =
      stateChanged || input.becameActive
        ? input.now
        : input.current.lastInteractedAt;

    return {
      ...input.current,
      answerState: desiredSkipped
        ? StudyQuestionAnswerState.SKIPPED
        : desiredCompleted
          ? StudyQuestionAnswerState.ANSWERED
          : desiredSolutionViewed
            ? StudyQuestionAnswerState.REVEALED
            : desiredOpened
              ? StudyQuestionAnswerState.OPENED
              : StudyQuestionAnswerState.UNSEEN,
      reflection: desiredReflection,
      diagnosis: desiredDiagnosis,
      firstOpenedAt: desiredOpened
        ? input.current.firstOpenedAt ?? input.now
        : null,
      lastInteractedAt: touchedAt,
      completedAt: desiredCompleted
        ? input.current.completedAt ?? input.now
        : null,
      skippedAt: desiredSkipped ? input.current.skippedAt ?? input.now : null,
      solutionViewedAt: desiredSolutionViewed
        ? input.current.solutionViewedAt ?? input.now
        : null,
      timeSpentSeconds: desiredTimeSpentSeconds,
      revealCount: desiredSolutionViewed
        ? Math.max(input.current.revealCount, 1)
        : 0,
    };
  }

  private hasStudySessionQuestionStateChanged(
    current: StoredStudySessionQuestionRow,
    next: StoredStudySessionQuestionRow,
  ) {
    return (
      current.answerState !== next.answerState ||
      current.reflection !== next.reflection ||
      current.diagnosis !== next.diagnosis ||
      current.timeSpentSeconds !== next.timeSpentSeconds ||
      this.dateOrNullToIso(current.firstOpenedAt) !==
        this.dateOrNullToIso(next.firstOpenedAt) ||
      this.dateOrNullToIso(current.lastInteractedAt) !==
        this.dateOrNullToIso(next.lastInteractedAt) ||
      this.dateOrNullToIso(current.completedAt) !==
        this.dateOrNullToIso(next.completedAt) ||
      this.dateOrNullToIso(current.skippedAt) !==
        this.dateOrNullToIso(next.skippedAt) ||
      this.dateOrNullToIso(current.solutionViewedAt) !==
        this.dateOrNullToIso(next.solutionViewedAt) ||
      current.revealCount !== next.revealCount
    );
  }

  private buildStudySessionExerciseState(
    exercise: StoredStudySessionExerciseRow,
  ) {
    const firstOpenedAt = exercise.sessionQuestions.reduce<Date | null>(
      (current, question) => {
        if (!question.firstOpenedAt) {
          return current;
        }

        if (!current || question.firstOpenedAt.getTime() < current.getTime()) {
          return question.firstOpenedAt;
        }

        return current;
      },
      null,
    );
    const lastInteractedAt = exercise.sessionQuestions.reduce<Date | null>(
      (current, question) => {
        if (!question.lastInteractedAt) {
          return current;
        }

        if (!current || question.lastInteractedAt.getTime() > current.getTime()) {
          return question.lastInteractedAt;
        }

        return current;
      },
      null,
    );
    const resolvedQuestions = exercise.sessionQuestions.filter(
      (question) => question.completedAt || question.skippedAt,
    );
    const completedAt =
      exercise.sessionQuestions.length > 0 &&
      resolvedQuestions.length === exercise.sessionQuestions.length
        ? resolvedQuestions.reduce<Date | null>((current, question) => {
            const resolvedAt = question.completedAt ?? question.skippedAt;

            if (!resolvedAt) {
              return current;
            }

            if (!current || resolvedAt.getTime() > current.getTime()) {
              return resolvedAt;
            }

            return current;
          }, null)
        : null;

    return {
      firstOpenedAt,
      lastInteractedAt,
      completedAt,
    };
  }

  private dateOrNullToIso(value: Date | null) {
    return value?.toISOString() ?? null;
  }

  private deriveStudySessionStatusFromProgress(
    progress: StudySessionProgressSnapshot,
    family: StudySessionFamily,
    deadlineAt: Date | null,
    now = new Date(),
    hasStarted = false,
  ): StudySessionStatus {
    if (
      family === StudySessionFamily.SIMULATION &&
      deadlineAt &&
      deadlineAt.getTime() <= now.getTime()
    ) {
      return StudySessionStatus.EXPIRED;
    }

    const hasActivity =
      Boolean(progress.activeExerciseId) ||
      Boolean(progress.activeQuestionId) ||
      progress.mode === StudySessionMode.REVIEW ||
      progress.questionStates.some(
        (state) =>
          state.opened ||
          state.completed ||
          state.skipped ||
          state.solutionViewed,
      ) ||
      progress.summary.completedQuestionCount > 0 ||
      progress.summary.skippedQuestionCount > 0 ||
      progress.summary.solutionViewedCount > 0;

    if (
      progress.summary.totalQuestionCount > 0 &&
      progress.summary.unansweredQuestionCount === 0
    ) {
      return StudySessionStatus.COMPLETED;
    }

    if (hasActivity) {
      return StudySessionStatus.IN_PROGRESS;
    }

    if (hasStarted) {
      return StudySessionStatus.IN_PROGRESS;
    }

    return StudySessionStatus.CREATED;
  }

  private expandTopicCodesToDescendants(
    topics: Array<{
      code: string;
      parentCode: string | null;
    }>,
    selectedCodes: string[],
  ): string[] {
    if (!selectedCodes.length) {
      return [];
    }

    const childrenByParent = new Map<string | null, string[]>();

    for (const topic of topics) {
      const bucket = childrenByParent.get(topic.parentCode) ?? [];
      bucket.push(topic.code);
      childrenByParent.set(topic.parentCode, bucket);
    }

    const expanded = new Set<string>(selectedCodes);
    const queue = [...selectedCodes];

    while (queue.length) {
      const currentCode = queue.shift();

      if (!currentCode) {
        continue;
      }

      for (const childCode of childrenByParent.get(currentCode) ?? []) {
        if (expanded.has(childCode)) {
          continue;
        }

        expanded.add(childCode);
        queue.push(childCode);
      }
    }

    return Array.from(expanded);
  }

  private uniqueCodes(input?: string[]): string[] {
    if (!input?.length) {
      return [];
    }

    return Array.from(new Set(input.map((item) => item.trim().toUpperCase())));
  }

  private uniqueNumbers(input?: number[]): number[] {
    if (!input?.length) {
      return [];
    }

    return Array.from(
      new Set(input.filter((item) => Number.isInteger(item))),
    ).sort((a, b) => b - a);
  }

  private uniqueSessionTypes(input?: SessionType[]): SessionType[] {
    if (!input?.length) {
      return [];
    }

    return Array.from(new Set(input));
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
