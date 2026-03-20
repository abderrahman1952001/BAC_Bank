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
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto';

const SYSTEM_PLACEHOLDER_PASSWORD_HASH = 'pending_auth_setup';
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

type HierarchyNodePayload = {
  id: string;
  nodeType: ExamNodeType;
  orderIndex: number;
  label: string | null;
  title: string | null;
  maxPoints: number | null;
  status: PublicationStatus;
  metadata: Prisma.JsonValue | null;
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
    title: string | null;
    maxPoints: Prisma.Decimal | null;
    status: PublicationStatus;
    metadata: Prisma.JsonValue | null;
    blocks: HierarchyBlockPayload[];
  }>;
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
          streamMappings: {
            select: {
              stream: {
                select: {
                  code: true,
                  name: true,
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

    return {
      streams: streams.map((stream) => ({
        code: stream.code,
        name: stream.name,
        subjectCodes: stream.subjectMappings
          .map((mapping) => mapping.subject.code)
          .sort((a, b) => a.localeCompare(b)),
      })),
      subjects: subjects.map((subject) => ({
        code: subject.code,
        name: subject.name,
        streams: subject.streamMappings
          .map((mapping) => mapping.stream)
          .sort((a, b) => a.name.localeCompare(b.name)),
        streamCodes: subject.streamMappings
          .map((mapping) => mapping.stream.code)
          .sort((a, b) => a.localeCompare(b)),
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
        },
        streamCodes: topic.subject.streamMappings
          .map((mapping) => mapping.stream.code)
          .sort((a, b) => a.localeCompare(b)),
      })),
      sessionTypes: Object.values(SessionType),
    };
  }

  async getCatalog() {
    const exams = await this.prisma.exam.findMany({
      where: {
        isPublished: true,
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
          },
        },
        subject: {
          select: {
            code: true,
            name: true,
          },
        },
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
                nodeType: ExamNodeType.EXERCISE,
                parentId: null,
              },
              select: {
                id: true,
              },
            },
          },
        },
        exercises: {
          orderBy: { orderIndex: 'asc' },
          select: {
            title: true,
            orderIndex: true,
          },
        },
      },
    });

    const streamMap = new Map<
      string,
      {
        code: string;
        name: string;
        subjects: Map<
          string,
          {
            code: string;
            name: string;
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
          subjects: new Map(),
        };
        streamMap.set(streamKey, streamEntry);
      }

      let subjectEntry = streamEntry.subjects.get(subjectKey);
      if (!subjectEntry) {
        subjectEntry = {
          code: exam.subject.code,
          name: exam.subject.name,
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

      if (exam.variants.length) {
        for (const variant of exam.variants) {
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
      } else {
        const sujetBuckets = this.groupExercisesBySujet(
          exam.exercises,
          exam.sessionType,
        );

        for (const [sujetNumber, exerciseCount] of sujetBuckets) {
          const sujetKey = `${exam.id}:${sujetNumber}`;
          yearEntry.sujets.set(sujetKey, {
            examId: exam.id,
            sujetNumber,
            label: this.getSujetLabel(sujetNumber),
            sessionType: exam.sessionType,
            exerciseCount,
          });
        }
      }
    }

    return {
      streams: Array.from(streamMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((stream) => ({
          code: stream.code,
          name: stream.name,
          subjects: Array.from(stream.subjects.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((subject) => ({
              code: subject.code,
              name: subject.name,
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
        durationMinutes: true,
        totalPoints: true,
        officialSourceReference: true,
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
                title: true,
                maxPoints: true,
                status: true,
                metadata: true,
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
        exercises: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            orderIndex: true,
            title: true,
            introText: true,
            totalPoints: true,
            questions: {
              where: { isActive: true },
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                orderIndex: true,
                points: true,
                difficultyLevel: true,
                contentFormat: true,
                contents: {
                  orderBy: { versionNumber: 'desc' },
                  take: 1,
                  select: {
                    contentMarkdown: true,
                    versionNumber: true,
                  },
                },
                assets: {
                  orderBy: { orderIndex: 'asc' },
                  select: {
                    id: true,
                    fileUrl: true,
                    assetType: true,
                    orderIndex: true,
                    caption: true,
                  },
                },
                questionTopics: {
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
                answer: {
                  select: {
                    officialAnswerMarkdown: true,
                    markingSchemeMarkdown: true,
                    commonMistakesMarkdown: true,
                    examinerCommentaryMarkdown: true,
                    updatedAt: true,
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

    const availableVariantEntries = exam.variants
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
        ): value is { sujetNumber: SujetNumber; variant: ExamVariantWithNodes } =>
          value !== null,
      )
      .sort((a, b) => a.sujetNumber - b.sujetNumber);

    if (availableVariantEntries.length) {
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
      const normalizedExercises = this.buildLegacyExercisesFromHierarchy(
        hierarchy.exercises,
        selectedVariantEntry.sujetNumber,
      );

      return {
        id: exam.id,
        year: exam.year,
        sessionType: exam.sessionType,
        durationMinutes: exam.durationMinutes,
        totalPoints: exam.totalPoints,
        officialSourceReference: exam.officialSourceReference,
        stream: exam.stream,
        subject: exam.subject,
        renderMode: 'hierarchy' as const,
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
        exerciseCount: hierarchy.exercises.length,
        exercises: normalizedExercises,
      };
    }

    const exercises = exam.exercises.map((exercise) => {
      const derivedSujetNumber = this.deriveSujetNumber(
        exercise.title,
        exam.sessionType,
      );

      return {
        id: exercise.id,
        orderIndex: exercise.orderIndex,
        title: exercise.title,
        introText: exercise.introText,
        totalPoints: exercise.totalPoints,
        sujetNumber: derivedSujetNumber,
        sujetLabel: this.getSujetLabel(derivedSujetNumber),
        questionCount: exercise.questions.length,
        questions: exercise.questions.map((question) => {
          const latestContent = question.contents[0] ?? null;
          return {
            id: question.id,
            orderIndex: question.orderIndex,
            points: question.points,
            difficultyLevel: question.difficultyLevel,
            contentFormat: question.contentFormat,
            contentVersion: latestContent?.versionNumber ?? null,
            contentMarkdown: latestContent?.contentMarkdown ?? null,
            assets: question.assets,
            topics: question.questionTopics
              .map((qt) => ({
                ...qt.topic,
                isPrimary: qt.isPrimary,
                weight: Number(qt.weight),
              }))
              .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
            answer: question.answer,
          };
        }),
      };
    });

    const availableSujetNumbers = Array.from(
      new Set(exercises.map((exercise) => exercise.sujetNumber)),
    ).sort((a, b) => a - b);

    const filteredExercises = selectedSujet
      ? exercises.filter((exercise) => exercise.sujetNumber === selectedSujet)
      : exercises;

    if (selectedSujet && !filteredExercises.length) {
      throw new BadRequestException(
        `Sujet ${selectedSujet} is not available for this exam.`,
      );
    }

    return {
      id: exam.id,
      year: exam.year,
      sessionType: exam.sessionType,
      durationMinutes: exam.durationMinutes,
      totalPoints: exam.totalPoints,
      officialSourceReference: exam.officialSourceReference,
      stream: exam.stream,
      subject: exam.subject,
      renderMode: 'legacy' as const,
      selectedVariantCode: null,
      selectedSujetNumber: selectedSujet ?? null,
      selectedSujetLabel: selectedSujet
        ? this.getSujetLabel(selectedSujet)
        : null,
      availableSujets: availableSujetNumbers.map((value) => ({
        sujetNumber: value,
        label: this.getSujetLabel(value),
      })),
      hierarchy: null,
      exerciseCount: filteredExercises.length,
      exercises: filteredExercises,
    };
  }

  async listQuestions(query: GetQuestionsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.QuestionWhereInput = {
      isActive: true,
      exercise: {
        exam: {
          isPublished: true,
          ...(query.year ? { year: query.year } : {}),
          ...(query.session ? { sessionType: query.session } : {}),
          ...(query.subjectCode
            ? {
                subject: {
                  code: query.subjectCode,
                },
              }
            : {}),
          ...(query.streamCode
            ? {
                stream: {
                  code: query.streamCode,
                },
              }
            : {}),
        },
      },
      ...(query.topicCode
        ? {
            questionTopics: {
              some: {
                topic: this.buildSingleTopicWhere(
                  query.topicCode,
                  query.subjectCode,
                  query.streamCode,
                ),
              },
            },
          }
        : {}),
      ...(query.search ? this.buildQuestionSearchWhere(query.search) : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { exercise: { exam: { year: 'desc' } } },
          { exercise: { orderIndex: 'asc' } },
          { orderIndex: 'asc' },
        ],
        select: {
          id: true,
          orderIndex: true,
          points: true,
          difficultyLevel: true,
          contentFormat: true,
          exercise: {
            select: {
              orderIndex: true,
              exam: {
                select: {
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
          contents: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            select: {
              contentMarkdown: true,
              versionNumber: true,
            },
          },
          assets: {
            orderBy: { orderIndex: 'asc' },
            take: 3,
            select: {
              fileUrl: true,
              assetType: true,
              orderIndex: true,
              caption: true,
            },
          },
          answer: {
            select: { id: true },
          },
          questionTopics: {
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
          _count: {
            select: {
              assets: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => {
        const latestContent = item.contents[0] ?? null;

        return {
          id: item.id,
          orderIndex: item.orderIndex,
          points: item.points,
          difficultyLevel: item.difficultyLevel,
          contentFormat: item.contentFormat,
          contentVersion: latestContent?.versionNumber ?? null,
          contentMarkdown: latestContent?.contentMarkdown ?? null,
          exerciseOrder: item.exercise.orderIndex,
          exam: {
            year: item.exercise.exam.year,
            sessionType: item.exercise.exam.sessionType,
            subject: item.exercise.exam.subject,
            stream: item.exercise.exam.stream,
          },
          assets: item.assets,
          assetCount: item._count.assets,
          hasOfficialAnswer: Boolean(item.answer),
          topics: item.questionTopics
            .map((qt) => ({
              ...qt.topic,
              isPrimary: qt.isPrimary,
              weight: Number(qt.weight),
            }))
            .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
        };
      }),
      meta: {
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  }

  async getQuestionById(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        orderIndex: true,
        points: true,
        difficultyLevel: true,
        contentFormat: true,
        exercise: {
          select: {
            id: true,
            orderIndex: true,
            title: true,
            introText: true,
            exam: {
              select: {
                id: true,
                year: true,
                sessionType: true,
                durationMinutes: true,
                totalPoints: true,
                officialSourceReference: true,
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
        contents: {
          orderBy: { versionNumber: 'desc' },
          select: {
            versionNumber: true,
            contentMarkdown: true,
            createdAt: true,
          },
        },
        assets: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            fileUrl: true,
            assetType: true,
            orderIndex: true,
            caption: true,
          },
        },
        questionTopics: {
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
        answer: {
          select: {
            officialAnswerMarkdown: true,
            markingSchemeMarkdown: true,
            commonMistakesMarkdown: true,
            examinerCommentaryMarkdown: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question ${id} not found`);
    }

    return {
      ...question,
      topics: question.questionTopics.map((qt) => ({
        ...qt.topic,
        isPrimary: qt.isPrimary,
        weight: Number(qt.weight),
      })),
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
    const where = this.buildPracticeExerciseWhere(filters);

    const [matchingExerciseCount, matchingExercises] = await Promise.all([
      this.prisma.exercise.count({ where }),
      this.prisma.exercise.findMany({
        where,
        orderBy: [
          { exam: { year: 'desc' } },
          { exam: { stream: { name: 'asc' } } },
          { exam: { subject: { name: 'asc' } } },
          { exam: { sessionType: 'asc' } },
          { orderIndex: 'asc' },
        ],
        select: {
          id: true,
          title: true,
          exam: {
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
            },
          },
        },
      }),
    ]);

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

    for (const exercise of matchingExercises) {
      const sujetNumber = this.deriveSujetNumber(
        exercise.title,
        exercise.exam.sessionType,
      );
      const key = `${exercise.exam.id}:${sujetNumber}`;
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
        sujetNumber,
        sujetLabel: this.getSujetLabel(sujetNumber),
        matchingExerciseCount: 1,
      });
    }

    const matchingSujets = Array.from(matchingSujetsMap.values())
      .sort((a, b) => {
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
      })
      .slice(0, DEFAULT_PREVIEW_SUJETS_LIMIT);

    return {
      subjectCode: filters.subjectCode,
      streamCode: filters.streamCode ?? null,
      years: filters.years,
      topicCodes: filters.topicCodes,
      sessionTypes: filters.sessionTypes,
      matchingExerciseCount,
      matchingSujetCount: matchingSujets.length,
      matchingSujets,
      maxSelectableExercises: Math.min(20, matchingExerciseCount),
    };
  }

  async createPracticeSession(payload: CreatePracticeSessionDto) {
    const filters = await this.resolvePracticeSessionFilters(payload);
    const exerciseWhere = this.buildPracticeExerciseWhere(filters);
    const exerciseCount = filters.exerciseCount;

    const candidates = await this.prisma.exercise.findMany({
      where: exerciseWhere,
      select: {
        id: true,
      },
    });

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
          exerciseId: exercise.id,
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
        createdAt: true,
        updatedAt: true,
        exercises: {
          orderBy: { orderIndex: 'asc' },
          select: {
            orderIndex: true,
            exercise: {
              select: {
                id: true,
                orderIndex: true,
                title: true,
                introText: true,
                totalPoints: true,
                exam: {
                  select: {
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
                questions: {
                  where: { isActive: true },
                  orderBy: { orderIndex: 'asc' },
                  select: {
                    id: true,
                    orderIndex: true,
                    points: true,
                    difficultyLevel: true,
                    contentFormat: true,
                    contents: {
                      orderBy: { versionNumber: 'desc' },
                      take: 1,
                      select: {
                        contentMarkdown: true,
                        versionNumber: true,
                      },
                    },
                    assets: {
                      orderBy: { orderIndex: 'asc' },
                      select: {
                        id: true,
                        fileUrl: true,
                        assetType: true,
                        orderIndex: true,
                        caption: true,
                      },
                    },
                    questionTopics: {
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
                    answer: {
                      select: {
                        officialAnswerMarkdown: true,
                        markingSchemeMarkdown: true,
                        commonMistakesMarkdown: true,
                        examinerCommentaryMarkdown: true,
                        updatedAt: true,
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

    return {
      id: session.id,
      title: session.title,
      status: session.status,
      requestedExerciseCount: session.requestedExerciseCount,
      exerciseCount: session.exercises.length,
      filters: session.filtersJson,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      exercises: session.exercises.map((entry) => ({
        sessionOrder: entry.orderIndex,
        id: entry.exercise.id,
        orderIndex: entry.exercise.orderIndex,
        title: entry.exercise.title,
        introText: entry.exercise.introText,
        totalPoints: entry.exercise.totalPoints,
        exam: entry.exercise.exam,
        questionCount: entry.exercise.questions.length,
        questions: entry.exercise.questions.map((question) => {
          const latestContent = question.contents[0] ?? null;
          return {
            id: question.id,
            orderIndex: question.orderIndex,
            points: question.points,
            difficultyLevel: question.difficultyLevel,
            contentFormat: question.contentFormat,
            contentVersion: latestContent?.versionNumber ?? null,
            contentMarkdown: latestContent?.contentMarkdown ?? null,
            assets: question.assets,
            topics: question.questionTopics
              .map((qt) => ({
                ...qt.topic,
                isPrimary: qt.isPrimary,
                weight: Number(qt.weight),
              }))
              .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
            answer: question.answer,
          };
        }),
      })),
    };
  }

  async createAttempt(questionId: string, payload: CreateAttemptDto) {
    const questionExists = await this.prisma.question.count({
      where: { id: questionId, isActive: true },
    });

    if (!questionExists) {
      throw new NotFoundException(`Question ${questionId} not found`);
    }

    const user = await this.prisma.user.upsert({
      where: { email: payload.email.toLowerCase() },
      update: payload.fullName
        ? {
            fullName: payload.fullName,
          }
        : {},
      create: {
        email: payload.email.toLowerCase(),
        fullName: payload.fullName,
        passwordHash: SYSTEM_PLACEHOLDER_PASSWORD_HASH,
      },
      select: { id: true, email: true },
    });

    const attempt = await this.prisma.userAttempt.create({
      data: {
        userId: user.id,
        questionId,
        selectedAnswer: payload.selectedAnswer,
        isCorrect: payload.isCorrect,
        scoreAwarded: payload.scoreAwarded,
        maxScore: payload.maxScore,
        timeSpentSeconds: payload.timeSpentSeconds,
      },
      select: {
        id: true,
        questionId: true,
        userId: true,
        selectedAnswer: true,
        isCorrect: true,
        scoreAwarded: true,
        maxScore: true,
        timeSpentSeconds: true,
        attemptedAt: true,
      },
    });

    return {
      ...attempt,
      scoreAwarded: attempt.scoreAwarded ? Number(attempt.scoreAwarded) : null,
      maxScore: attempt.maxScore ? Number(attempt.maxScore) : null,
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
    const nodesByParent = new Map<string | null, ExamVariantWithNodes['nodes']>();

    for (const node of variant.nodes) {
      const parentKey = node.parentId ?? null;
      const siblings = nodesByParent.get(parentKey) ?? [];
      siblings.push(node);
      nodesByParent.set(parentKey, siblings);
    }

    for (const siblings of nodesByParent.values()) {
      siblings.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    const mapNode = (node: ExamVariantWithNodes['nodes'][number]): HierarchyNodePayload => {
      const children = (nodesByParent.get(node.id) ?? []).map((child) =>
        mapNode(child),
      );

      return {
        id: node.id,
        nodeType: node.nodeType,
        orderIndex: node.orderIndex,
        label: node.label,
        title: node.title,
        maxPoints: node.maxPoints !== null ? Number(node.maxPoints) : null,
        status: node.status,
        metadata: node.metadata,
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
      title: variant.title || 'Sujet',
      status: variant.status,
      nodeCount: variant.nodes.length,
      exercises: mappedExercises.length ? mappedExercises : mappedRoots,
    };
  }

  private buildLegacyExercisesFromHierarchy(
    exercises: HierarchyNodePayload[],
    sujetNumber: SujetNumber,
  ) {
    const defaultAnswerUpdatedAt = new Date(0).toISOString();

    return exercises.map((exerciseNode, exerciseIndex) => {
      const questionNodes = this.collectQuestionNodes(exerciseNode.children);
      const exerciseStemBlocks = this.blocksByRoles(exerciseNode.blocks, [
        BlockRole.STEM,
        BlockRole.PROMPT,
      ]);
      const contextBlocks = exerciseNode.children
        .filter((node) => node.nodeType === ExamNodeType.CONTEXT)
        .flatMap((node) => node.blocks);
      const introText = this.blocksToMarkdown([
        ...exerciseStemBlocks,
        ...contextBlocks,
      ]);

      const questions = questionNodes.map((questionNode, questionIndex) => {
        const promptBlocks = this.blocksByRoles(questionNode.blocks, [
          BlockRole.PROMPT,
          BlockRole.STEM,
        ]);
        const solutionBlocks = this.blocksByRoles(questionNode.blocks, [
          BlockRole.SOLUTION,
        ]);
        const rubricBlocks = this.blocksByRoles(questionNode.blocks, [
          BlockRole.RUBRIC,
        ]);
        const hintBlocks = this.blocksByRoles(questionNode.blocks, [BlockRole.HINT]);
        const promptText = this.blocksToMarkdown(promptBlocks);
        const solutionText = this.blocksToMarkdown(solutionBlocks);
        const rubricText = this.blocksToMarkdown(rubricBlocks);
        const hintText = this.blocksToMarkdown(hintBlocks);

        return {
          id: questionNode.id,
          orderIndex: questionIndex + 1,
          points:
            questionNode.maxPoints !== null ? Number(questionNode.maxPoints) : 0,
          difficultyLevel: null,
          contentFormat: 'HYBRID' as const,
          contentVersion: null,
          contentMarkdown:
            promptText ||
            questionNode.title ||
            questionNode.label ||
            `Question ${questionIndex + 1}`,
          assets: this.toLegacyAssetsFromBlocks(promptBlocks),
          topics: [],
          answer: solutionText
            ? {
                officialAnswerMarkdown: solutionText,
                markingSchemeMarkdown: rubricText || null,
                commonMistakesMarkdown: hintText || null,
                examinerCommentaryMarkdown: null,
                updatedAt: defaultAnswerUpdatedAt,
              }
            : null,
        };
      });

      const pointsFromQuestions = questions.reduce(
        (sum, question) => sum + question.points,
        0,
      );
      const totalPoints =
        exerciseNode.maxPoints !== null
          ? Number(exerciseNode.maxPoints)
          : pointsFromQuestions;

      return {
        id: exerciseNode.id,
        orderIndex: exerciseNode.orderIndex || exerciseIndex + 1,
        title:
          exerciseNode.title ||
          exerciseNode.label ||
          `Exercise ${exerciseIndex + 1}`,
        introText: introText || null,
        totalPoints,
        sujetNumber,
        sujetLabel: this.getSujetLabel(sujetNumber),
        questionCount: questions.length,
        questions,
      };
    });
  }

  private collectQuestionNodes(nodes: HierarchyNodePayload[]): HierarchyNodePayload[] {
    const ordered = [...nodes].sort((a, b) => a.orderIndex - b.orderIndex);
    const items: HierarchyNodePayload[] = [];

    for (const node of ordered) {
      if (
        node.nodeType === ExamNodeType.QUESTION ||
        node.nodeType === ExamNodeType.SUBQUESTION
      ) {
        items.push(node);
      }

      if (node.children.length) {
        items.push(...this.collectQuestionNodes(node.children));
      }
    }

    return items;
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

  private toLegacyAssetsFromBlocks(blocks: HierarchyBlockPayload[]) {
    const imageBlocks = blocks.filter((block) => block.blockType === BlockType.IMAGE);

    return imageBlocks
      .map((block, index) => {
        const fileUrl =
          block.media?.url || this.readStringField(block.data, 'url');

        if (!fileUrl) {
          return null;
        }

        return {
          fileUrl,
          assetType: 'IMAGE' as const,
          orderIndex: index + 1,
          caption:
            this.readStringField(block.data, 'caption') ??
            this.readStringField(block.media?.metadata ?? null, 'caption') ??
            null,
        };
      })
      .filter(
        (
          value,
        ): value is {
          fileUrl: string;
          assetType: 'IMAGE';
          orderIndex: number;
          caption: string | null;
        } => value !== null,
      );
  }

  private readStringField(
    value: Prisma.JsonValue | null,
    field: string,
  ): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const candidate = (value as Prisma.JsonObject)[field];
    return typeof candidate === 'string' ? candidate : null;
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

  private groupExercisesBySujet(
    exercises: Array<{
      title: string | null;
      orderIndex: number;
    }>,
    sessionType: SessionType,
  ): Map<SujetNumber, number> {
    const counts = new Map<SujetNumber, number>();

    for (const exercise of exercises) {
      const sujetNumber = this.deriveSujetNumber(exercise.title, sessionType);
      counts.set(sujetNumber, (counts.get(sujetNumber) ?? 0) + 1);
    }

    return counts;
  }

  private deriveSujetNumber(
    exerciseTitle: string | null,
    sessionType: SessionType,
  ): SujetNumber {
    const explicitFromTitle = this.parseSujetNumberFromTitle(exerciseTitle);
    if (explicitFromTitle) {
      return explicitFromTitle;
    }

    return sessionType === SessionType.MAKEUP ? 2 : 1;
  }

  private parseSujetNumberFromTitle(title: string | null): SujetNumber | null {
    if (!title) {
      return null;
    }

    const normalizedTitle = title.toLowerCase();

    if (
      normalizedTitle.includes('الموضوع الأول') ||
      normalizedTitle.includes('الموضوع الاول') ||
      normalizedTitle.includes('sujet 1') ||
      normalizedTitle.includes('sujet n 1') ||
      normalizedTitle.includes('subject 1')
    ) {
      return 1;
    }

    if (
      normalizedTitle.includes('الموضوع الثاني') ||
      normalizedTitle.includes('sujet 2') ||
      normalizedTitle.includes('sujet n 2') ||
      normalizedTitle.includes('subject 2')
    ) {
      return 2;
    }

    return null;
  }

  private getSujetLabel(sujetNumber: SujetNumber): string {
    return `Sujet ${sujetNumber}`;
  }

  private getSessionTypeRank(sessionType: SessionType): number {
    return sessionType === SessionType.NORMAL ? 1 : 2;
  }

  private buildQuestionSearchWhere(search: string): Prisma.QuestionWhereInput {
    return {
      OR: [
        {
          contents: {
            some: {
              contentMarkdown: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          answer: {
            is: {
              officialAnswerMarkdown: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ],
    };
  }

  private buildSingleTopicWhere(
    topicCode: string,
    subjectCode?: string,
    streamCode?: string,
  ): Prisma.TopicWhereInput {
    const subjectWhere = this.buildSubjectFilterWhere(
      subjectCode ? [subjectCode] : [],
      streamCode ? [streamCode] : [],
    );

    return {
      code: topicCode,
      ...(subjectWhere ? { subject: subjectWhere } : {}),
    };
  }

  private buildMultiTopicWhere(
    topicCodes: string[],
    subjectCodes: string[],
    streamCodes: string[],
  ): Prisma.TopicWhereInput {
    const subjectWhere = this.buildSubjectFilterWhere(
      subjectCodes,
      streamCodes,
    );

    return {
      code: { in: topicCodes },
      ...(subjectWhere ? { subject: subjectWhere } : {}),
    };
  }

  private buildPracticeExerciseWhere(filters: {
    years: number[];
    streamCode?: string;
    subjectCode: string;
    topicCodes: string[];
    sessionTypes: SessionType[];
    search?: string;
  }): Prisma.ExerciseWhereInput {
    return {
      exam: {
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
      questions: {
        some: {
          isActive: true,
          ...(filters.topicCodes.length
            ? {
                questionTopics: {
                  some: {
                    topic: {
                      code: { in: filters.topicCodes },
                      subject: {
                        code: filters.subjectCode,
                      },
                    },
                  },
                },
              }
            : {}),
          ...(filters.search
            ? this.buildQuestionSearchWhere(filters.search)
            : {}),
        },
      },
    };
  }

  private buildSubjectFilterWhere(
    subjectCodes: string[],
    streamCodes: string[],
  ): Prisma.SubjectWhereInput | null {
    if (!subjectCodes.length && !streamCodes.length) {
      return null;
    }

    const where: Prisma.SubjectWhereInput = {};

    if (subjectCodes.length) {
      where.code = { in: subjectCodes };
    }

    if (streamCodes.length) {
      where.streamMappings = {
        some: {
          stream: {
            code: {
              in: streamCodes,
            },
          },
        },
      };
    }

    return where;
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

    const allowedStreamCodes = subject.streamMappings.map(
      (mapping) => mapping.stream.code,
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
