import { AdminReferenceService } from './admin-reference.service';

describe('AdminReferenceService', () => {
  let prisma: {
    exam: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    examNode: {
      count: jest.Mock;
    };
    subject: {
      findMany: jest.Mock;
    };
    stream: {
      findMany: jest.Mock;
    };
    topic: {
      findMany: jest.Mock;
    };
  };
  let catalogCurriculumService: {
    listActiveFilterTopics: jest.Mock;
  };
  let service: AdminReferenceService;

  beforeEach(() => {
    prisma = {
      exam: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      examNode: {
        count: jest.fn(),
      },
      subject: {
        findMany: jest.fn(),
      },
      stream: {
        findMany: jest.fn(),
      },
      topic: {
        findMany: jest.fn(),
      },
    };
    catalogCurriculumService = {
      listActiveFilterTopics: jest.fn().mockResolvedValue([]),
    };
    service = new AdminReferenceService(
      prisma as never,
      catalogCurriculumService as never,
    );
  });

  it('builds admin dashboard totals and workflow counts', async () => {
    prisma.exam.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(7);
    prisma.examNode.count
      .mockResolvedValueOnce(34)
      .mockResolvedValueOnce(89)
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(23)
      .mockResolvedValueOnce(31)
      .mockResolvedValueOnce(58);

    await expect(service.getDashboard()).resolves.toEqual({
      totals: {
        exams: 12,
        exercises: 34,
        questions: 89,
      },
      workflow: {
        exams: {
          draft: 5,
          published: 7,
        },
        exercises: {
          draft: 11,
          published: 23,
        },
        questions: {
          draft: 31,
          published: 58,
        },
      },
    });
  });

  it('builds admin filters with families, years, and deduplicated topic stream codes', async () => {
    prisma.subject.findMany.mockResolvedValueOnce([
      {
        code: 'MATH',
        name: 'Mathematics',
        isDefault: true,
        family: {
          code: 'SCI',
          name: 'Sciences',
        },
      },
      {
        code: 'PHYS',
        name: 'Physics',
        isDefault: false,
        family: {
          code: 'SCI',
          name: 'Sciences',
        },
      },
    ]);
    prisma.stream.findMany.mockResolvedValueOnce([
      {
        code: 'SE',
        name: 'Sciences experimentales',
        isDefault: true,
        family: {
          code: 'GENERAL',
          name: 'General',
        },
      },
      {
        code: 'TM',
        name: 'Techniques mathematiques',
        isDefault: false,
        family: {
          code: 'GENERAL',
          name: 'General',
        },
      },
    ]);
    prisma.exam.findMany.mockResolvedValueOnce([
      { year: 2025 },
      { year: 2024 },
    ]);
    catalogCurriculumService.listActiveFilterTopics.mockResolvedValueOnce([
      {
        code: 'ALG',
        name: 'Algebra',
        displayOrder: 1,
        isSelectable: true,
        studentLabel: 'الجبر',
        streamCodes: ['SE', 'TM'],
        parent: {
          code: 'MATH_ROOT',
        },
        subject: {
          code: 'MATH',
          name: 'Mathematics',
        },
      },
    ]);

    await expect(service.getFilters()).resolves.toEqual({
      subjects: [
        {
          code: 'MATH',
          name: 'Mathematics',
          isDefault: true,
          family: {
            code: 'SCI',
            name: 'Sciences',
          },
        },
        {
          code: 'PHYS',
          name: 'Physics',
          isDefault: false,
          family: {
            code: 'SCI',
            name: 'Sciences',
          },
        },
      ],
      streams: [
        {
          code: 'SE',
          name: 'Sciences experimentales',
          isDefault: true,
          family: {
            code: 'GENERAL',
            name: 'General',
          },
        },
        {
          code: 'TM',
          name: 'Techniques mathematiques',
          isDefault: false,
          family: {
            code: 'GENERAL',
            name: 'General',
          },
        },
      ],
      subjectFamilies: [
        {
          code: 'SCI',
          name: 'Sciences',
        },
      ],
      streamFamilies: [
        {
          code: 'GENERAL',
          name: 'General',
        },
      ],
      years: [2025, 2024],
      topics: [
        {
          code: 'ALG',
          name: 'الجبر',
          parentCode: 'MATH_ROOT',
          displayOrder: 1,
          isSelectable: true,
          subject: {
            code: 'MATH',
            name: 'Mathematics',
          },
          streamCodes: ['SE', 'TM'],
        },
      ],
    });
  });
});
