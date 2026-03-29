import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExamNodeType,
  PracticeSessionStatus,
  Prisma,
  PublicationStatus,
  SessionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import {
  PracticeStudyMode,
  UpdatePracticeSessionProgressDto,
} from './dto/update-practice-session-progress.dto';
import {
  buildHierarchyExerciseSummaries,
  buildPracticeSearchCorpus,
  buildSessionExerciseHierarchyPayload,
  collectHierarchyQuestionItemsForSession,
  type ExamVariantWithNodes,
  getSessionTypeRank,
  getSujetLabel,
  type HierarchyNodePayload,
  mapVariantHierarchy,
  pickRepresentativeExamOffering,
  pushPracticeSessionExamOffering,
  sortPracticeSessionExamOfferings,
  toPracticeSessionExamOffering,
  toSujetNumberFromVariantCode,
  type PracticeSessionExamOffering,
  type PracticeSessionExerciseCandidate,
  type SujetNumber,
} from './qbank-session-helpers';
import { SESSION_YEAR_MAX, SESSION_YEAR_MIN } from './session-year-range';
const DEFAULT_PREVIEW_SUJETS_LIMIT = 80;

type PracticeSessionProgressSnapshot = {
  activeExerciseId: string | null;
  activeQuestionId: string | null;
  mode: PracticeStudyMode;
  questionStates: Array<{
    questionId: string;
    opened: boolean;
    completed: boolean;
    skipped: boolean;
    solutionViewed: boolean;
  }>;
  summary: {
    totalQuestionCount: number;
    completedQuestionCount: number;
    skippedQuestionCount: number;
    unansweredQuestionCount: number;
    solutionViewedCount: number;
  };
  updatedAt: string;
};

@Injectable()
export class QbankService {
  constructor(private readonly prisma: PrismaService) {}

  async getFilters() {
    const [streams, subjects, topics] = await Promise.all([
      this.prisma.stream.findMany({
        select: {
          code: true,
          name: true,
          isDefault: true,
          family: {
            select: {
              code: true,
              name: true,
            },
          },
          subjectMappings: {
            select: {
              subject: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.subject.findMany({
        select: {
          code: true,
          name: true,
          isDefault: true,
          family: {
            select: {
              code: true,
              name: true,
            },
          },
          streamMappings: {
            select: {
              stream: {
                select: {
                  code: true,
                  name: true,
                  family: {
                    select: {
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.topic.findMany({
        select: {
          code: true,
          name: true,
          slug: true,
          displayOrder: true,
          isSelectable: true,
          studentLabel: true,
          parent: {
            select: {
              code: true,
            },
          },
          subject: {
            select: {
              code: true,
              name: true,
              family: {
                select: {
                  code: true,
                  name: true,
                },
              },
              streamMappings: {
                select: {
                  stream: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ subject: { name: 'asc' } }, { name: 'asc' }],
      }),
    ]);

    const streamFamilies = Array.from(
      new Map(
        streams.map((stream) => [
          stream.family.code,
          {
            code: stream.family.code,
            name: stream.family.name,
            streams: [] as Array<{
              code: string;
              name: string;
              isDefault: boolean;
            }>,
          },
        ]),
      ).values(),
    );

    const streamFamilyMap = new Map(
      streamFamilies.map((family) => [family.code, family]),
    );

    for (const stream of streams) {
      streamFamilyMap.get(stream.family.code)?.streams.push({
        code: stream.code,
        name: stream.name,
        isDefault: stream.isDefault,
      });
    }

    const subjectFamilies = Array.from(
      new Map(
        subjects.map((subject) => [
          subject.family.code,
          {
            code: subject.family.code,
            name: subject.family.name,
            subjects: [] as Array<{
              code: string;
              name: string;
              isDefault: boolean;
            }>,
          },
        ]),
      ).values(),
    );

    const subjectFamilyMap = new Map(
      subjectFamilies.map((family) => [family.code, family]),
    );

    for (const subject of subjects) {
      subjectFamilyMap.get(subject.family.code)?.subjects.push({
        code: subject.code,
        name: subject.name,
        isDefault: subject.isDefault,
      });
    }

    return {
      streams: streams.map((stream) => ({
        code: stream.code,
        name: stream.name,
        isDefault: stream.isDefault,
        family: stream.family,
        subjectCodes: Array.from(
          new Set(
            stream.subjectMappings.map((mapping) => mapping.subject.code),
          ),
        ).sort((a, b) => a.localeCompare(b)),
      })),
      subjects: subjects.map((subject) => ({
        code: subject.code,
        name: subject.name,
        isDefault: subject.isDefault,
        family: subject.family,
        streams: Array.from(
          new Map(
            subject.streamMappings.map((mapping) => [
              mapping.stream.code,
              mapping.stream,
            ]),
          ).values(),
        ).sort((a, b) => a.name.localeCompare(b.name)),
        streamCodes: Array.from(
          new Set(subject.streamMappings.map((mapping) => mapping.stream.code)),
        ).sort((a, b) => a.localeCompare(b)),
      })),
      years: Array.from(
        { length: SESSION_YEAR_MAX - SESSION_YEAR_MIN + 1 },
        (_, index) => SESSION_YEAR_MAX - index,
      ),
      topics: topics.map((topic) => ({
        code: topic.code,
        name: topic.studentLabel ?? topic.name,
        slug: topic.slug,
        parentCode: topic.parent?.code ?? null,
        displayOrder: topic.displayOrder,
        isSelectable: topic.isSelectable,
        subject: {
          code: topic.subject.code,
          name: topic.subject.name,
          family: topic.subject.family,
        },
        streamCodes: Array.from(
          new Set(
            topic.subject.streamMappings.map((mapping) => mapping.stream.code),
          ),
        ).sort((a, b) => a.localeCompare(b)),
      })),
      streamFamilies: streamFamilies
        .map((family) => ({
          ...family,
          streams: family.streams.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      subjectFamilies: subjectFamilies
        .map((family) => ({
          ...family,
          subjects: family.subjects.sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      sessionTypes: Object.values(SessionType),
    };
  }

  async getCatalog() {
    const exams = await this.prisma.exam.findMany({
      where: {
        isPublished: true,
        paper: {
          variants: {
            some: {
              status: PublicationStatus.PUBLISHED,
            },
          },
        },
      },
      orderBy: [
        { stream: { name: 'asc' } },
        { subject: { name: 'asc' } },
        { year: 'desc' },
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
            family: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        subject: {
          select: {
            code: true,
            name: true,
            family: {
              select: {
                code: true,
                name: true,
              },
            },
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
                code: true,
                title: true,
                nodes: {
                  where: {
                    status: PublicationStatus.PUBLISHED,
                    nodeType: ExamNodeType.EXERCISE,
                    parentId: null,
                  },
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const streamMap = new Map<
      string,
      {
        code: string;
        name: string;
        family: {
          code: string;
          name: string;
        };
        subjects: Map<
          string,
          {
            code: string;
            name: string;
            family: {
              code: string;
              name: string;
            };
            years: Map<
              number,
              {
                year: number;
                sujets: Map<
                  string,
                  {
                    examId: string;
                    sujetNumber: SujetNumber;
                    label: string;
                    sessionType: SessionType;
                    exerciseCount: number;
                  }
                >;
              }
            >;
          }
        >;
      }
    >();

    for (const exam of exams) {
      const streamKey = exam.stream.code;
      const subjectKey = exam.subject.code;

      let streamEntry = streamMap.get(streamKey);
      if (!streamEntry) {
        streamEntry = {
          code: exam.stream.code,
          name: exam.stream.name,
          family: exam.stream.family,
          subjects: new Map(),
        };
        streamMap.set(streamKey, streamEntry);
      }

      let subjectEntry = streamEntry.subjects.get(subjectKey);
      if (!subjectEntry) {
        subjectEntry = {
          code: exam.subject.code,
          name: exam.subject.name,
          family: exam.subject.family,
          years: new Map(),
        };
        streamEntry.subjects.set(subjectKey, subjectEntry);
      }

      let yearEntry = subjectEntry.years.get(exam.year);
      if (!yearEntry) {
        yearEntry = {
          year: exam.year,
          sujets: new Map(),
        };
        subjectEntry.years.set(exam.year, yearEntry);
      }

      for (const variant of exam.paper.variants) {
        const sujetNumber = toSujetNumberFromVariantCode(variant.code);

        if (!sujetNumber) {
          continue;
        }

        const sujetKey = `${exam.id}:${sujetNumber}`;
        yearEntry.sujets.set(sujetKey, {
          examId: exam.id,
          sujetNumber,
          label: variant.title || getSujetLabel(sujetNumber),
          sessionType: exam.sessionType,
          exerciseCount: variant.nodes.length,
        });
      }
    }

    return {
      streams: Array.from(streamMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((stream) => ({
          code: stream.code,
          name: stream.name,
          family: stream.family,
          subjects: Array.from(stream.subjects.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((subject) => ({
              code: subject.code,
              name: subject.name,
              family: subject.family,
              years: Array.from(subject.years.values())
                .sort((a, b) => b.year - a.year)
                .map((yearEntry) => ({
                  year: yearEntry.year,
                  sujets: Array.from(yearEntry.sujets.values()).sort((a, b) => {
                    if (a.sujetNumber !== b.sujetNumber) {
                      return a.sujetNumber - b.sujetNumber;
                    }

                    return (
                      getSessionTypeRank(a.sessionType) -
                      getSessionTypeRank(b.sessionType)
                    );
                  }),
                })),
            })),
        })),
    };
  }

  async getExamById(id: string, sujetNumber?: number): Promise<unknown> {
    const selectedSujet =
      sujetNumber === 1 || sujetNumber === 2
        ? (sujetNumber as SujetNumber)
        : undefined;

    const exam = await this.prisma.exam.findUnique({
      where: { id },
      select: {
        id: true,
        year: true,
        sessionType: true,
        stream: {
          select: {
            code: true,
            name: true,
            family: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        subject: {
          select: {
            code: true,
            name: true,
            family: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        paper: {
          select: {
            durationMinutes: true,
            totalPoints: true,
            officialSourceReference: true,
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
                        media: true,
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

    if (!exam) {
      throw new NotFoundException(`Exam ${id} not found`);
    }

    const availableVariantEntries = exam.paper.variants
      .map((variant) => {
        const number = toSujetNumberFromVariantCode(variant.code);

        if (!number) {
          return null;
        }

        return {
          sujetNumber: number,
          variant: variant as ExamVariantWithNodes,
        };
      })
      .filter(
        (
          value,
        ): value is {
          sujetNumber: SujetNumber;
          variant: ExamVariantWithNodes;
        } => value !== null,
      )
      .sort((a, b) => a.sujetNumber - b.sujetNumber);

    if (!availableVariantEntries.length) {
      throw new NotFoundException(
        `Exam ${id} has no published sujet variants yet.`,
      );
    }

    const selectedVariantEntry =
      selectedSujet !== undefined
        ? availableVariantEntries.find(
            (entry) => entry.sujetNumber === selectedSujet,
          )
        : availableVariantEntries[0];

    if (!selectedVariantEntry) {
      throw new BadRequestException(
        `Sujet ${selectedSujet} is not available for this exam.`,
      );
    }

    const hierarchy = mapVariantHierarchy(selectedVariantEntry.variant);
    const selectedVariantLabel =
      selectedVariantEntry.variant.title ||
      getSujetLabel(selectedVariantEntry.sujetNumber);
    const exerciseSummaries = buildHierarchyExerciseSummaries(
      hierarchy.exercises,
    );

    return {
      id: exam.id,
      year: exam.year,
      sessionType: exam.sessionType,
      durationMinutes: exam.paper.durationMinutes,
      totalPoints: exam.paper.totalPoints,
      officialSourceReference: exam.paper.officialSourceReference,
      stream: exam.stream,
      subject: exam.subject,
      selectedVariantCode: selectedVariantEntry.variant.code,
      selectedSujetNumber: selectedVariantEntry.sujetNumber,
      selectedSujetLabel: selectedVariantLabel,
      availableSujets: availableVariantEntries.map((entry) => ({
        sujetNumber: entry.sujetNumber,
        label: entry.variant.title || getSujetLabel(entry.sujetNumber),
      })),
      hierarchy: {
        ...hierarchy,
        title: selectedVariantLabel,
      },
      exerciseCount: exerciseSummaries.length,
      exercises: exerciseSummaries,
    };
  }

  async listRecentPracticeSessions(userId: string, limit = 8) {
    const cappedLimit = Math.min(Math.max(limit, 1), 20);

    const sessions = await this.prisma.practiceSession.findMany({
      where: {
        userId,
        exercises: {
          some: {},
        },
      },
      take: cappedLimit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        requestedExerciseCount: true,
        createdAt: true,
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
        status: session.status,
        requestedExerciseCount: session.requestedExerciseCount,
        exerciseCount: session._count.exercises,
        createdAt: session.createdAt,
      })),
    };
  }

  async previewPracticeSession(payload: CreatePracticeSessionDto) {
    const filters = await this.resolvePracticeSessionFilters(payload);
    const matchingExercises =
      await this.listPracticeSessionExerciseCandidates(filters);
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
      subjectCode: filters.subjectCode,
      streamCode:
        filters.streamCodes.length === 1 ? filters.streamCodes[0] : null,
      streamCodes: filters.streamCodes,
      years: filters.years,
      topicCodes: filters.topicCodes,
      sessionTypes: filters.sessionTypes,
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

  async createPracticeSession(
    userId: string,
    payload: CreatePracticeSessionDto,
  ) {
    const filters = await this.resolvePracticeSessionFilters(payload);
    const exerciseCount = filters.exerciseCount;
    const candidates =
      await this.listPracticeSessionExerciseCandidates(filters);

    if (!candidates.length) {
      throw new NotFoundException(
        'No exercises match the selected filters. Try wider criteria.',
      );
    }

    const targetCount = Math.min(exerciseCount, candidates.length);
    const selected = this.pickRandom(candidates, targetCount);

    const filtersSnapshot: Prisma.InputJsonObject = {
      years: filters.years,
      streamCode:
        filters.streamCodes.length === 1 ? filters.streamCodes[0] : null,
      streamCodes: filters.streamCodes,
      subjectCode: filters.subjectCode,
      topicCodes: filters.topicCodes,
      sessionTypes: filters.sessionTypes,
      search: filters.search ?? null,
    };

    const created = await this.prisma.$transaction(async (tx) => {
      const session = await tx.practiceSession.create({
        data: {
          userId,
          title: payload.title,
          requestedExerciseCount: exerciseCount,
          status: PracticeSessionStatus.CREATED,
          filtersJson: filtersSnapshot,
        },
        select: { id: true },
      });

      await tx.practiceSessionExercise.createMany({
        data: selected.map((exercise, index) => ({
          sessionId: session.id,
          exerciseNodeId: exercise.exerciseNodeId,
          examId: exercise.sourceExam.id,
          orderIndex: index + 1,
        })),
      });

      return session;
    });

    return this.getPracticeSessionById(userId, created.id);
  }

  async getPracticeSessionById(userId: string, id: string) {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        status: true,
        requestedExerciseCount: true,
        filtersJson: true,
        progressJson: true,
        createdAt: true,
        updatedAt: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
          select: {
            orderIndex: true,
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
      throw new NotFoundException(`Practice session ${id} not found`);
    }

    if (!session.exercises.length) {
      throw new NotFoundException(
        `Practice session ${id} has no exercises. Create a new session.`,
      );
    }

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
        fallbackExam: PracticeSessionExamOffering | null;
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

    return {
      id: session.id,
      title: session.title,
      status: session.status,
      requestedExerciseCount: session.requestedExerciseCount,
      exerciseCount: session.exercises.length,
      filters: session.filtersJson,
      progress: session.progressJson,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      exercises: session.exercises.map((entry) => {
        const linkedExercise = exerciseByNodeId.get(entry.exerciseNode.id);

        if (!linkedExercise) {
          throw new NotFoundException(
            `Practice session ${id} references missing hierarchy exercise ${entry.exerciseNode.id}.`,
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
            `Practice session ${id} references missing exam context for exercise ${entry.exerciseNode.id}.`,
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
      }),
    };
  }

  async updatePracticeSessionProgress(
    userId: string,
    id: string,
    payload: UpdatePracticeSessionProgressDto,
  ) {
    const exists = await this.prisma.practiceSession.count({
      where: { id, userId },
    });

    if (!exists) {
      throw new NotFoundException(`Practice session ${id} not found`);
    }

    const progress = this.normalizePracticeSessionProgress(payload);
    const status = this.derivePracticeSessionStatusFromProgress(progress);

    const session = await this.prisma.practiceSession.update({
      where: { id },
      data: {
        progressJson: progress as unknown as Prisma.InputJsonObject,
        status,
      },
      select: {
        id: true,
        status: true,
        progressJson: true,
        updatedAt: true,
      },
    });

    return {
      id: session.id,
      status: session.status,
      progress: session.progressJson,
      updatedAt: session.updatedAt,
    };
  }

  private async listPracticeSessionExerciseCandidates(filters: {
    years: number[];
    streamCodes: string[];
    subjectCode: string;
    topicCodes: string[];
    topicMatchCodes: string[];
    sessionTypes: SessionType[];
    search?: string;
  }): Promise<PracticeSessionExerciseCandidate[]> {
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

    const candidateMap = new Map<string, PracticeSessionExerciseCandidate>();

    for (const exam of exams) {
      const examOffering = toPracticeSessionExamOffering(exam);

      for (const variant of exam.paper.variants) {
        const sujetNumber = toSujetNumberFromVariantCode(variant.code);

        if (!sujetNumber) {
          continue;
        }

        const hierarchy = mapVariantHierarchy(variant as ExamVariantWithNodes);

        for (const exercise of hierarchy.exercises) {
          const existingCandidate = candidateMap.get(exercise.id);

          if (existingCandidate) {
            pushPracticeSessionExamOffering(
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

          const searchableText = buildPracticeSearchCorpus(exercise, questions);

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
            sujetNumber,
            sujetLabel: variant.title || getSujetLabel(sujetNumber),
            variantId: variant.id,
            variantCode: variant.code,
            variantTitle: variant.title,
            sourceExam: examOffering,
            examOfferings: [examOffering],
            searchableText,
          } satisfies PracticeSessionExerciseCandidate);
        }
      }
    }

    const candidates = Array.from(candidateMap.values());

    for (const candidate of candidates) {
      candidate.examOfferings = sortPracticeSessionExamOfferings(
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

  private async resolvePracticeSessionFilters(
    payload: CreatePracticeSessionDto,
  ) {
    const years = this.uniqueNumbers(payload.years).filter(
      (year) => year >= SESSION_YEAR_MIN && year <= SESSION_YEAR_MAX,
    );
    const subjectCode = payload.subjectCode.trim().toUpperCase();
    const streamCodes = this.uniqueCodes([
      ...(payload.streamCodes ?? []),
      ...(payload.streamCode ? [payload.streamCode] : []),
    ]);
    const topicCodes = this.uniqueCodes(payload.topicCodes);
    let topicMatchCodes = topicCodes;
    const sessionTypes = this.uniqueSessionTypes(payload.sessionTypes);
    const search = payload.search?.trim() || undefined;
    const exerciseCount = payload.exerciseCount ?? 6;

    const subject = await this.prisma.subject.findUnique({
      where: { code: subjectCode },
      select: {
        id: true,
        streamMappings: {
          select: {
            validFromYear: true,
            validToYear: true,
            stream: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!subject) {
      throw new BadRequestException('The selected subject is invalid.');
    }

    const allowedStreamCodes = Array.from(
      new Set(
        subject.streamMappings
          .filter(
            (mapping) =>
              years.length === 0 ||
              years.some(
                (year) =>
                  year >= mapping.validFromYear &&
                  (mapping.validToYear === null || year <= mapping.validToYear),
              ),
          )
          .map((mapping) => mapping.stream.code),
      ),
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
          subject: {
            code: subjectCode,
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
      subjectCode,
      topicCodes,
      topicMatchCodes,
      sessionTypes,
      search,
      exerciseCount,
    };
  }

  private normalizePracticeSessionProgress(
    payload: UpdatePracticeSessionProgressDto,
  ): PracticeSessionProgressSnapshot {
    const statesByQuestion = new Map<
      string,
      PracticeSessionProgressSnapshot['questionStates'][number]
    >();

    for (const item of payload.questionStates ?? []) {
      statesByQuestion.set(item.questionId, {
        questionId: item.questionId,
        opened: Boolean(item.opened),
        completed: Boolean(item.completed),
        skipped: Boolean(item.skipped),
        solutionViewed: Boolean(item.solutionViewed),
      });
    }

    const questionStates = Array.from(statesByQuestion.values()).sort((a, b) =>
      a.questionId.localeCompare(b.questionId),
    );
    const derivedCompletedCount = questionStates.filter(
      (state) => state.completed,
    ).length;
    const derivedSkippedCount = questionStates.filter(
      (state) => state.skipped,
    ).length;
    const derivedSolutionViewedCount = questionStates.filter(
      (state) => state.solutionViewed,
    ).length;
    const totalQuestionCount = Math.max(
      payload.totalQuestionCount ?? 0,
      questionStates.length,
      Math.max(payload.completedQuestionCount ?? 0, derivedCompletedCount) +
        Math.max(payload.skippedQuestionCount ?? 0, derivedSkippedCount),
    );
    const completedQuestionCount = Math.min(
      Math.max(payload.completedQuestionCount ?? 0, derivedCompletedCount),
      totalQuestionCount,
    );
    const skippedQuestionCount = Math.min(
      Math.max(payload.skippedQuestionCount ?? 0, derivedSkippedCount),
      Math.max(totalQuestionCount - completedQuestionCount, 0),
    );
    const solutionViewedCount = Math.min(
      Math.max(payload.solutionViewedCount ?? 0, derivedSolutionViewedCount),
      totalQuestionCount,
    );

    return {
      activeExerciseId: payload.activeExerciseId ?? null,
      activeQuestionId: payload.activeQuestionId ?? null,
      mode: payload.mode ?? PracticeStudyMode.SOLVE,
      questionStates,
      summary: {
        totalQuestionCount,
        completedQuestionCount,
        skippedQuestionCount,
        unansweredQuestionCount: Math.max(
          totalQuestionCount - completedQuestionCount - skippedQuestionCount,
          0,
        ),
        solutionViewedCount,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  private derivePracticeSessionStatusFromProgress(
    progress: PracticeSessionProgressSnapshot,
  ): PracticeSessionStatus {
    const hasActivity =
      Boolean(progress.activeExerciseId) ||
      Boolean(progress.activeQuestionId) ||
      progress.mode === PracticeStudyMode.REVIEW ||
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
      return PracticeSessionStatus.COMPLETED;
    }

    if (hasActivity) {
      return PracticeSessionStatus.IN_PROGRESS;
    }

    return PracticeSessionStatus.CREATED;
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
