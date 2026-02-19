import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PracticeSessionStatus, Prisma, SessionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto';

const SYSTEM_PLACEHOLDER_PASSWORD_HASH = 'pending_auth_setup';
const SESSION_YEAR_MIN = 2008;
const SESSION_YEAR_MAX = 2025;

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

    const matchingExerciseCount = await this.prisma.exercise.count({ where });

    return {
      subjectCode: filters.subjectCode,
      streamCode: filters.streamCode ?? null,
      years: filters.years,
      topicCodes: filters.topicCodes,
      sessionTypes: filters.sessionTypes,
      matchingExerciseCount,
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
