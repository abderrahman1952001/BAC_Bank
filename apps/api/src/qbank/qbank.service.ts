import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BlockRole,
  BlockType,
  ExamNodeType,
  ExamVariantCode,
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

const SESSION_YEAR_MIN = 2008;
const SESSION_YEAR_MAX = 2025;
const DEFAULT_PREVIEW_SUJETS_LIMIT = 80;

type SujetNumber = 1 | 2;

type HierarchyBlockPayload = {
  id: string;
  role: BlockRole;
  orderIndex: number;
  blockType: BlockType;
  textValue: string | null;
  data: Prisma.JsonValue | null;
  media: {
    id: string;
    url: string;
    type: string;
    metadata: Prisma.JsonValue | null;
  } | null;
};

type HierarchyTopicTagPayload = {
  code: string;
  name: string;
  isPrimary: boolean;
  weight: number;
};

type HierarchyNodePayload = {
  id: string;
  nodeType: ExamNodeType;
  orderIndex: number;
  label: string | null;
  maxPoints: number | null;
  status: PublicationStatus;
  metadata: Prisma.JsonValue | null;
  topics: HierarchyTopicTagPayload[];
  blocks: HierarchyBlockPayload[];
  children: HierarchyNodePayload[];
};

type ExamVariantWithNodes = {
  id: string;
  code: ExamVariantCode;
  title: string | null;
  status: PublicationStatus;
  nodes: Array<{
    id: string;
    parentId: string | null;
    nodeType: ExamNodeType;
    orderIndex: number;
    label: string | null;
    maxPoints: Prisma.Decimal | null;
    status: PublicationStatus;
    metadata: Prisma.JsonValue | null;
    topicMappings: Array<{
      isPrimary: boolean;
      weight: Prisma.Decimal;
      topic: {
        code: string;
        name: string;
      };
    }>;
    blocks: HierarchyBlockPayload[];
  }>;
};

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

type PracticeSessionExerciseCandidate = {
  exerciseNodeId: string;
  orderIndex: number;
  title: string | null;
  totalPoints: number;
  questionCount: number;
  sujetNumber: SujetNumber;
  sujetLabel: string;
  variantId: string;
  variantCode: ExamVariantCode;
  variantTitle: string | null;
  exam: {
    id: string;
    year: number;
    sessionType: SessionType;
    subject: {
      code: string;
      name: string;
    };
    stream: {
      code: string;
      name: string;
    };
  };
  hierarchy: SessionExerciseHierarchyPayload;
  searchableText: string;
};

type SessionHierarchyQuestionPayload = {
  id: string;
  orderIndex: number;
  label: string;
  points: number;
  depth: number;
  topics: HierarchyTopicTagPayload[];
  promptBlocks: HierarchyBlockPayload[];
  solutionBlocks: HierarchyBlockPayload[];
  hintBlocks: HierarchyBlockPayload[];
  rubricBlocks: HierarchyBlockPayload[];
};

type SessionExerciseHierarchyPayload = {
  exerciseNodeId: string;
  exerciseLabel: string | null;
  contextBlocks: HierarchyBlockPayload[];
  questions: SessionHierarchyQuestionPayload[];
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
        name: topic.name,
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
        const sujetNumber = this.toSujetNumberFromVariantCode(variant.code);

        if (!sujetNumber) {
          continue;
        }

        const sujetKey = `${exam.id}:${sujetNumber}`;
        yearEntry.sujets.set(sujetKey, {
          examId: exam.id,
          sujetNumber,
          label: variant.title || this.getSujetLabel(sujetNumber),
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
                      this.getSessionTypeRank(a.sessionType) -
                      this.getSessionTypeRank(b.sessionType)
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
                      orderBy: [{ isPrimary: 'desc' }, { weight: 'desc' }],
                      select: {
                        isPrimary: true,
                        weight: true,
                        topic: {
                          select: {
                            code: true,
                            name: true,
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

    if (!exam) {
      throw new NotFoundException(`Exam ${id} not found`);
    }

    const availableVariantEntries = exam.paper.variants
      .map((variant) => {
        const number = this.toSujetNumberFromVariantCode(variant.code);

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

    const hierarchy = this.mapVariantHierarchy(selectedVariantEntry.variant);
    const selectedVariantLabel =
      selectedVariantEntry.variant.title ||
      this.getSujetLabel(selectedVariantEntry.sujetNumber);
    const exerciseSummaries = this.buildHierarchyExerciseSummaries(
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
        label: entry.variant.title || this.getSujetLabel(entry.sujetNumber),
      })),
      hierarchy: {
        ...hierarchy,
        title: selectedVariantLabel,
      },
      exerciseCount: exerciseSummaries.length,
      exercises: exerciseSummaries,
    };
  }

  async listRecentPracticeSessions(limit = 8) {
    const cappedLimit = Math.min(Math.max(limit, 1), 20);

    const sessions = await this.prisma.practiceSession.findMany({
      where: {
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
      yearsDistributionMap.set(
        exercise.exam.year,
        (yearsDistributionMap.get(exercise.exam.year) ?? 0) + 1,
      );

      const streamEntry = streamsDistributionMap.get(exercise.exam.stream.code);
      if (streamEntry) {
        streamEntry.matchingExerciseCount += 1;
      } else {
        streamsDistributionMap.set(exercise.exam.stream.code, {
          stream: exercise.exam.stream,
          matchingExerciseCount: 1,
        });
      }

      const key = `${exercise.exam.id}:${exercise.sujetNumber}`;
      const current = matchingSujetsMap.get(key);

      if (current) {
        current.matchingExerciseCount += 1;
        continue;
      }

      matchingSujetsMap.set(key, {
        examId: exercise.exam.id,
        year: exercise.exam.year,
        stream: exercise.exam.stream,
        subject: exercise.exam.subject,
        sessionType: exercise.exam.sessionType,
        sujetNumber: exercise.sujetNumber,
        sujetLabel: exercise.sujetLabel,
        matchingExerciseCount: 1,
      });
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
          this.getSessionTypeRank(a.sessionType) -
          this.getSessionTypeRank(b.sessionType)
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
      examId: exercise.exam.id,
      year: exercise.exam.year,
      stream: exercise.exam.stream,
      subject: exercise.exam.subject,
      sessionType: exercise.exam.sessionType,
      sujetNumber: exercise.sujetNumber,
      sujetLabel: exercise.sujetLabel,
    }));

    return {
      subjectCode: filters.subjectCode,
      streamCode: filters.streamCode ?? null,
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

  async createPracticeSession(payload: CreatePracticeSessionDto) {
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
      streamCode: filters.streamCode ?? null,
      subjectCode: filters.subjectCode,
      topicCodes: filters.topicCodes,
      sessionTypes: filters.sessionTypes,
      search: filters.search ?? null,
    };

    const created = await this.prisma.$transaction(async (tx) => {
      const session = await tx.practiceSession.create({
        data: {
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
          orderIndex: index + 1,
        })),
      });

      return session;
    });

    return this.getPracticeSessionById(created.id);
  }

  async getPracticeSessionById(id: string) {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id },
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
            exerciseNode: {
              select: {
                id: true,
                orderIndex: true,
                maxPoints: true,
                variantId: true,
                variant: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
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
                  },
                },
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
                  orderBy: [{ isPrimary: 'desc' }, { weight: 'desc' }],
                  select: {
                    isPrimary: true,
                    weight: true,
                    topic: {
                      select: {
                        code: true,
                        name: true,
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
        exam: {
          id: string;
          year: number;
          sessionType: SessionType;
          subject: {
            code: string;
            name: string;
          };
          stream: {
            code: string;
            name: string;
          };
        };
      }
    >();

    for (const variant of variants) {
      const hierarchy = this.mapVariantHierarchy(
        variant as ExamVariantWithNodes,
      );
      const representativeExam = this.pickRepresentativeExamOffering(
        variant.paper.offerings,
      );

      if (!representativeExam) {
        continue;
      }

      for (const exercise of hierarchy.exercises) {
        exerciseByNodeId.set(exercise.id, {
          exercise,
          exam: representativeExam,
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

        const questions = this.collectHierarchyQuestionItemsForSession(
          linkedExercise.exercise.children,
        );
        const totalPoints =
          linkedExercise.exercise.maxPoints ??
          questions.reduce((sum, question) => sum + question.points, 0);
        const hierarchy = this.buildSessionExerciseHierarchyPayload(
          linkedExercise.exercise,
          questions,
        );

        return {
          sessionOrder: entry.orderIndex,
          id: linkedExercise.exercise.id,
          orderIndex: linkedExercise.exercise.orderIndex,
          title: linkedExercise.exercise.label || null,
          totalPoints,
          hierarchy,
          exam: linkedExercise.exam,
          questionCount: questions.length,
        };
      }),
    };
  }

  async updatePracticeSessionProgress(
    id: string,
    payload: UpdatePracticeSessionProgressDto,
  ) {
    const exists = await this.prisma.practiceSession.count({
      where: { id },
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

  private toSujetNumberFromVariantCode(
    code: ExamVariantCode,
  ): SujetNumber | null {
    if (code === ExamVariantCode.SUJET_1) {
      return 1;
    }

    if (code === ExamVariantCode.SUJET_2) {
      return 2;
    }

    return null;
  }

  private mapVariantHierarchy(variant: ExamVariantWithNodes): {
    variantId: string;
    variantCode: ExamVariantCode;
    title: string;
    status: PublicationStatus;
    nodeCount: number;
    exercises: HierarchyNodePayload[];
  } {
    const nodesByParent = new Map<
      string | null,
      ExamVariantWithNodes['nodes']
    >();

    for (const node of variant.nodes) {
      const parentKey = node.parentId ?? null;
      const siblings = nodesByParent.get(parentKey) ?? [];
      siblings.push(node);
      nodesByParent.set(parentKey, siblings);
    }

    for (const siblings of nodesByParent.values()) {
      siblings.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    const mapNode = (
      node: ExamVariantWithNodes['nodes'][number],
    ): HierarchyNodePayload => {
      const children = (nodesByParent.get(node.id) ?? []).map((child) =>
        mapNode(child),
      );

      return {
        id: node.id,
        nodeType: node.nodeType,
        orderIndex: node.orderIndex,
        label: node.label,
        maxPoints: node.maxPoints !== null ? Number(node.maxPoints) : null,
        status: node.status,
        metadata: node.metadata,
        topics: node.topicMappings
          .map((mapping) => ({
            code: mapping.topic.code,
            name: mapping.topic.name,
            isPrimary: mapping.isPrimary,
            weight: Number(mapping.weight),
          }))
          .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
        blocks: [...node.blocks]
          .sort((a, b) => {
            const roleDelta =
              this.getBlockRoleRank(a.role) - this.getBlockRoleRank(b.role);
            if (roleDelta !== 0) {
              return roleDelta;
            }

            return a.orderIndex - b.orderIndex;
          })
          .map((block) => ({
            id: block.id,
            role: block.role,
            orderIndex: block.orderIndex,
            blockType: block.blockType,
            textValue: block.textValue,
            data: block.data,
            media: block.media
              ? {
                  id: block.media.id,
                  url: block.media.url,
                  type: block.media.type,
                  metadata: block.media.metadata,
                }
              : null,
          })),
        children,
      };
    };

    const rootNodes = nodesByParent.get(null) ?? [];
    const mappedRoots = rootNodes.map((rootNode) => mapNode(rootNode));
    const mappedExercises = mappedRoots.filter(
      (node) => node.nodeType === ExamNodeType.EXERCISE,
    );

    return {
      variantId: variant.id,
      variantCode: variant.code,
      title: variant.title || 'الموضوع',
      status: variant.status,
      nodeCount: variant.nodes.length,
      exercises: mappedExercises.length ? mappedExercises : mappedRoots,
    };
  }

  private collectHierarchyQuestionItemsForSession(
    nodes: HierarchyNodePayload[],
    depth = 0,
  ): SessionHierarchyQuestionPayload[] {
    const ordered = [...nodes].sort((a, b) => a.orderIndex - b.orderIndex);
    const items: SessionHierarchyQuestionPayload[] = [];

    for (const node of ordered) {
      const isQuestionNode =
        node.nodeType === ExamNodeType.QUESTION ||
        node.nodeType === ExamNodeType.SUBQUESTION;

      if (isQuestionNode) {
        items.push({
          id: node.id,
          orderIndex: node.orderIndex,
          label: node.label || `السؤال ${node.orderIndex}`,
          points: node.maxPoints ?? 0,
          depth,
          topics: node.topics,
          promptBlocks: this.blocksByRoles(node.blocks, [
            BlockRole.PROMPT,
            BlockRole.STEM,
          ]),
          solutionBlocks: this.blocksByRoles(node.blocks, [BlockRole.SOLUTION]),
          hintBlocks: this.blocksByRoles(node.blocks, [BlockRole.HINT]),
          rubricBlocks: this.blocksByRoles(node.blocks, [BlockRole.RUBRIC]),
        });
      }

      if (node.children.length) {
        items.push(
          ...this.collectHierarchyQuestionItemsForSession(
            node.children,
            isQuestionNode ? depth + 1 : depth,
          ),
        );
      }
    }

    return items;
  }

  private getExerciseContextBlocksFromHierarchy(
    exerciseNode: HierarchyNodePayload,
    contextNodes?: HierarchyNodePayload[],
  ): HierarchyBlockPayload[] {
    const ownContext = this.blocksByRoles(exerciseNode.blocks, [
      BlockRole.STEM,
      BlockRole.PROMPT,
    ]);
    const nestedContext = [...(contextNodes ?? exerciseNode.children)]
      .filter((child) => child.nodeType === ExamNodeType.CONTEXT)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .flatMap((child) =>
        this.blocksByRoles(child.blocks, [BlockRole.STEM, BlockRole.PROMPT]),
      );

    return [...ownContext, ...nestedContext];
  }

  private buildSessionExerciseHierarchyPayload(
    exerciseNode: HierarchyNodePayload,
    questions: SessionHierarchyQuestionPayload[],
    contextNodes?: HierarchyNodePayload[],
  ): SessionExerciseHierarchyPayload {
    return {
      exerciseNodeId: exerciseNode.id,
      exerciseLabel: exerciseNode.label || null,
      contextBlocks: this.getExerciseContextBlocksFromHierarchy(
        exerciseNode,
        contextNodes,
      ),
      questions,
    };
  }

  private buildHierarchyExerciseSummaries(exercises: HierarchyNodePayload[]) {
    return exercises.map((exercise) => {
      const questions = this.collectHierarchyQuestionItemsForSession(
        exercise.children,
      );
      const totalPoints =
        exercise.maxPoints ??
        questions.reduce((sum, question) => sum + question.points, 0);

      return {
        id: exercise.id,
        orderIndex: exercise.orderIndex,
        title: exercise.label || null,
        totalPoints,
        questionCount: questions.length,
      };
    });
  }

  private async listPracticeSessionExerciseCandidates(filters: {
    years: number[];
    streamCode?: string;
    subjectCode: string;
    topicCodes: string[];
    sessionTypes: SessionType[];
    search?: string;
  }): Promise<PracticeSessionExerciseCandidate[]> {
    const exams = await this.prisma.exam.findMany({
      where: {
        isPublished: true,
        subject: {
          code: filters.subjectCode,
        },
        ...(filters.streamCode
          ? {
              stream: {
                code: filters.streamCode,
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
                      orderBy: [{ isPrimary: 'desc' }, { weight: 'desc' }],
                      select: {
                        isPrimary: true,
                        weight: true,
                        topic: {
                          select: {
                            code: true,
                            name: true,
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
      for (const variant of exam.paper.variants) {
        const sujetNumber = this.toSujetNumberFromVariantCode(variant.code);

        if (!sujetNumber) {
          continue;
        }

        const hierarchy = this.mapVariantHierarchy(
          variant as ExamVariantWithNodes,
        );

        for (const exercise of hierarchy.exercises) {
          if (candidateMap.has(exercise.id)) {
            continue;
          }

          const questions = this.collectHierarchyQuestionItemsForSession(
            exercise.children,
          );

          if (!questions.length) {
            continue;
          }

          const searchableText = this.buildPracticeSearchCorpus(
            exercise,
            questions,
          );

          if (
            filters.topicCodes.length &&
            !questions.some((question) =>
              question.topics.some((topic) =>
                filters.topicCodes.includes(topic.code),
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
            sujetLabel: variant.title || this.getSujetLabel(sujetNumber),
            variantId: variant.id,
            variantCode: variant.code,
            variantTitle: variant.title,
            exam: {
              id: exam.id,
              year: exam.year,
              sessionType: exam.sessionType,
              subject: exam.subject,
              stream: exam.stream,
            },
            hierarchy: this.buildSessionExerciseHierarchyPayload(
              exercise,
              questions,
            ),
            searchableText,
          } satisfies PracticeSessionExerciseCandidate);
        }
      }
    }

    const candidates = Array.from(candidateMap.values());

    return candidates.sort((a, b) => {
      if (a.exam.year !== b.exam.year) {
        return b.exam.year - a.exam.year;
      }

      const streamOrder = a.exam.stream.name.localeCompare(b.exam.stream.name);
      if (streamOrder !== 0) {
        return streamOrder;
      }

      if (a.sujetNumber !== b.sujetNumber) {
        return a.sujetNumber - b.sujetNumber;
      }

      const sessionRankDelta =
        this.getSessionTypeRank(a.exam.sessionType) -
        this.getSessionTypeRank(b.exam.sessionType);

      if (sessionRankDelta !== 0) {
        return sessionRankDelta;
      }

      return a.orderIndex - b.orderIndex;
    });
  }

  private buildPracticeSearchCorpus(
    exercise: HierarchyNodePayload,
    questions: SessionHierarchyQuestionPayload[],
  ): string {
    return [
      exercise.label,
      this.blocksToMarkdown(exercise.blocks),
      this.blocksToMarkdown(
        this.getExerciseContextBlocksFromHierarchy(exercise),
      ),
      ...questions.flatMap((question) => [
        question.label,
        this.blocksToMarkdown(question.promptBlocks),
        this.blocksToMarkdown(question.solutionBlocks),
        this.blocksToMarkdown(question.hintBlocks),
        this.blocksToMarkdown(question.rubricBlocks),
        ...question.topics.map((topic) => topic.code),
        ...question.topics.map((topic) => topic.name),
      ]),
    ]
      .filter(
        (value): value is string =>
          typeof value === 'string' && value.length > 0,
      )
      .join('\n')
      .toLowerCase();
  }

  private blocksByRoles(
    blocks: HierarchyBlockPayload[],
    roles: BlockRole[],
  ): HierarchyBlockPayload[] {
    return blocks
      .filter((block) => roles.includes(block.role))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  private blocksToMarkdown(blocks: HierarchyBlockPayload[]): string {
    return blocks
      .map((block) => {
        const structuredText = this.structuredBlockText(block);

        if (structuredText) {
          return structuredText;
        }

        if (block.blockType === BlockType.IMAGE) {
          return '';
        }

        if (block.blockType === BlockType.HEADING) {
          return block.textValue ? `## ${block.textValue}` : '';
        }

        if (block.blockType === BlockType.LATEX) {
          return block.textValue ? `$$${block.textValue}$$` : '';
        }

        if (block.blockType === BlockType.CODE) {
          return block.textValue ? `\`\`\`\n${block.textValue}\n\`\`\`` : '';
        }

        return block.textValue ?? '';
      })
      .map((value) => value.trim())
      .filter((value) => Boolean(value))
      .join('\n\n');
  }

  private structuredBlockText(block: HierarchyBlockPayload) {
    if (block.blockType === BlockType.TABLE) {
      const rows = this.readStructuredTableRows(block.data);

      if (rows.length > 0) {
        return rows.map((row) => row.join(' | ')).join('\n');
      }
    }

    if (
      !block.data ||
      typeof block.data !== 'object' ||
      Array.isArray(block.data)
    ) {
      return null;
    }

    const data = block.data as Record<string, unknown>;
    const values: string[] = [];

    if (typeof data.kind === 'string') {
      values.push(data.kind);
    }

    if (typeof data.caption === 'string') {
      values.push(data.caption);
    }

    const formulaGraph =
      this.readStructuredRecord(data.formulaGraph) ??
      this.readStructuredRecord(data.graph);
    const probabilityTree =
      this.readStructuredRecord(data.probabilityTree) ??
      this.readStructuredRecord(data.tree);

    if (formulaGraph) {
      if (typeof formulaGraph.title === 'string') {
        values.push(formulaGraph.title);
      }

      const curves = Array.isArray(formulaGraph.curves)
        ? formulaGraph.curves
        : Array.isArray(formulaGraph.functions)
          ? formulaGraph.functions
          : [];

      for (const curve of curves) {
        if (curve && typeof curve === 'object' && !Array.isArray(curve)) {
          if (typeof (curve as Record<string, unknown>).label === 'string') {
            values.push((curve as Record<string, unknown>).label as string);
          }

          if (typeof (curve as Record<string, unknown>).fn === 'string') {
            values.push((curve as Record<string, unknown>).fn as string);
          }
        }
      }
    }

    if (probabilityTree) {
      this.collectProbabilityTreeText(probabilityTree, values);
    }

    return values
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .join('\n');
  }

  private readStructuredTableRows(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return [];
    }

    const rows = (value as Record<string, unknown>).rows;

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row) =>
        Array.isArray(row)
          ? row.map((cell) => String(cell ?? '').trim()).filter(Boolean)
          : [],
      )
      .filter((row) => row.length > 0);
  }

  private readStructuredRecord(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private collectProbabilityTreeText(
    node: Record<string, unknown>,
    values: string[],
  ) {
    if (typeof node.label === 'string') {
      values.push(node.label);
    }

    if (typeof node.edgeLabel === 'string') {
      values.push(node.edgeLabel);
    }

    if (typeof node.probability === 'string') {
      values.push(node.probability);
    }

    if (!Array.isArray(node.children)) {
      return;
    }

    for (const child of node.children) {
      const childRecord = this.readStructuredRecord(child);

      if (childRecord) {
        this.collectProbabilityTreeText(childRecord, values);
      }
    }
  }

  private getBlockRoleRank(role: BlockRole): number {
    switch (role) {
      case BlockRole.STEM:
        return 1;
      case BlockRole.PROMPT:
        return 2;
      case BlockRole.HINT:
        return 3;
      case BlockRole.SOLUTION:
        return 4;
      case BlockRole.RUBRIC:
        return 5;
      case BlockRole.META:
        return 6;
      default:
        return 99;
    }
  }

  private getSujetLabel(sujetNumber: SujetNumber): string {
    return `الموضوع ${sujetNumber}`;
  }

  private getSessionTypeRank(sessionType: SessionType): number {
    return sessionType === SessionType.NORMAL ? 1 : 2;
  }

  private pickRepresentativeExamOffering<
    T extends {
      id: string;
      year: number;
      sessionType: SessionType;
      subject: {
        code: string;
        name: string;
      };
      stream: {
        code: string;
        name: string;
      };
    },
  >(offerings: T[]) {
    return offerings[0] ?? null;
  }

  private async resolvePracticeSessionFilters(
    payload: CreatePracticeSessionDto,
  ) {
    const years = this.uniqueNumbers(payload.years).filter(
      (year) => year >= SESSION_YEAR_MIN && year <= SESSION_YEAR_MAX,
    );
    const subjectCode = payload.subjectCode.trim().toUpperCase();
    const streamCode = payload.streamCode?.trim().toUpperCase();
    const topicCodes = this.uniqueCodes(payload.topicCodes);
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

    if (streamCode && !allowedStreamCodes.includes(streamCode)) {
      throw new BadRequestException(
        'The selected stream is not available for this subject.',
      );
    }

    if (topicCodes.length) {
      const topicCount = await this.prisma.topic.count({
        where: {
          code: { in: topicCodes },
          subject: {
            code: subjectCode,
          },
        },
      });

      if (topicCount !== topicCodes.length) {
        throw new BadRequestException(
          'One or more selected topics are invalid for this subject.',
        );
      }
    }

    return {
      years,
      streamCode,
      subjectCode,
      topicCodes,
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
