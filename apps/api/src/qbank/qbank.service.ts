import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CatalogResponse,
  CreateSessionResponse,
  ExamResponse,
  FiltersResponse,
  PracticeSessionResponse,
  RecentExamActivitiesResponse,
  RecentPracticeSessionsResponse,
  SessionPreviewResponse,
  UpsertExamActivityResponse,
  UpdateSessionProgressResponse,
} from '@bac-bank/contracts/qbank';
import {
  ExamNodeType,
  PracticeSessionStatus,
  Prisma,
  PublicationStatus,
  SessionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { UpsertExamActivityDto } from './dto/upsert-exam-activity.dto';
import { QbankExamActivityService } from './qbank-exam-activity.service';
import { UpdatePracticeSessionProgressDto } from './dto/update-practice-session-progress.dto';
import { QbankPracticeSessionService } from './qbank-practice-session.service';
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
@Injectable()
export class QbankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly practiceSessionService: QbankPracticeSessionService,
    private readonly examActivityService: QbankExamActivityService,
  ) {}

  async getFilters(): Promise<FiltersResponse> {
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

  async getCatalog(): Promise<CatalogResponse> {
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

  async getExamById(id: string, sujetNumber?: number): Promise<ExamResponse> {
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
            id: true,
            durationMinutes: true,
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
      paperId: exam.paper.id,
      year: exam.year,
      sessionType: exam.sessionType,
      durationMinutes: exam.paper.durationMinutes,
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

  async listRecentPracticeSessions(
    userId: string,
    limit = 8,
  ): Promise<RecentPracticeSessionsResponse> {
    return this.practiceSessionService.listRecentPracticeSessions(userId, limit);
  }

  async listRecentExamActivities(
    userId: string,
    limit = 8,
  ): Promise<RecentExamActivitiesResponse> {
    return this.examActivityService.listRecentExamActivities(userId, limit);
  }

  async upsertExamActivity(
    userId: string,
    examId: string,
    payload: UpsertExamActivityDto,
  ): Promise<UpsertExamActivityResponse> {
    return this.examActivityService.upsertExamActivity(userId, examId, payload);
  }

  async previewPracticeSession(
    payload: CreatePracticeSessionDto,
  ): Promise<SessionPreviewResponse> {
    return this.practiceSessionService.previewPracticeSession(payload);
  }

  async createPracticeSession(
    userId: string,
    payload: CreatePracticeSessionDto,
  ): Promise<CreateSessionResponse> {
    return this.practiceSessionService.createPracticeSession(userId, payload);
  }

  async getPracticeSessionById(
    userId: string,
    id: string,
  ): Promise<PracticeSessionResponse> {
    return this.practiceSessionService.getPracticeSessionById(userId, id);
  }

  async updatePracticeSessionProgress(
    userId: string,
    id: string,
    payload: UpdatePracticeSessionProgressDto,
  ): Promise<UpdateSessionProgressResponse> {
    return this.practiceSessionService.updatePracticeSessionProgress(
      userId,
      id,
      payload,
    );
  }
}
