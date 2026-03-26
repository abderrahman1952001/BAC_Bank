import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SE_MATH_TOPICS = [
  { code: 'DIFFERENTIABILITY_CONTINUITY', name: 'الاشتقاقية و الاستمرارية' },
  { code: 'EXPONENTIAL_LOGARITHMIC', name: 'الدالتان الأسية و اللوغاريتمية' },
  { code: 'LIMITS', name: 'النهايات' },
  {
    code: 'COMPARATIVE_GROWTH_FUNCTION_STUDY',
    name: 'التزايد المقارن و دراسة الدوال',
  },
  { code: 'NUMERICAL_SEQUENCES', name: 'المتتاليات العددية' },
  {
    code: 'ANTIDERIVATIVES_INTEGRAL_CALCULUS',
    name: 'الدوال الأصلية و الحساب التكاملي',
  },
  { code: 'PROBABILITY', name: 'الاحتمالات' },
  { code: 'COMPLEX_NUMBERS', name: 'الأعداد المركبة' },
  { code: 'POINT_TRANSFORMATIONS', name: 'التحويلات النقطية' },
] as const;

type StreamPathwayDefinition = {
  code: string;
  name: string;
  isDefault?: boolean;
};

type StreamFamilyDefinition = {
  code: string;
  name: string;
  pathways: StreamPathwayDefinition[];
};

type SubjectLeafDefinition = {
  code: string;
  name: string;
  isDefault?: boolean;
};

type SubjectFamilyDefinition = {
  code: string;
  name: string;
  subjects: SubjectLeafDefinition[];
};

type CurriculumRuleDefinition = {
  streamCode: string;
  subjects: Array<{
    subjectCode: string;
    isOptional?: boolean;
  }>;
};

function slugFromCode(code: string): string {
  return code.toLowerCase().replace(/_/g, '-');
}

const STREAM_CATALOG: StreamFamilyDefinition[] = [
  {
    code: 'SE',
    name: 'علوم تجريبية',
    pathways: [{ code: 'SE', name: 'علوم تجريبية', isDefault: true }],
  },
  {
    code: 'M',
    name: 'رياضيات',
    pathways: [{ code: 'M', name: 'رياضيات', isDefault: true }],
  },
  {
    code: 'MT',
    name: 'تقني رياضي',
    pathways: [
      { code: 'MT_MECH', name: 'تقني رياضي - هندسة ميكانيكية' },
      { code: 'MT_ELEC', name: 'تقني رياضي - هندسة كهربائية' },
      { code: 'MT_CIVIL', name: 'تقني رياضي - هندسة مدنية' },
      { code: 'MT_PROC', name: 'تقني رياضي - هندسة الطرائق' },
    ],
  },
  {
    code: 'GE',
    name: 'تسيير و اقتصاد',
    pathways: [{ code: 'GE', name: 'تسيير و اقتصاد', isDefault: true }],
  },
  {
    code: 'LP',
    name: 'آداب و فلسفة',
    pathways: [{ code: 'LP', name: 'آداب و فلسفة', isDefault: true }],
  },
  {
    code: 'LE',
    name: 'لغات أجنبية',
    pathways: [{ code: 'LE', name: 'لغات أجنبية', isDefault: true }],
  },
  {
    code: 'ARTS',
    name: 'فنون',
    pathways: [{ code: 'ARTS', name: 'فنون', isDefault: true }],
  },
] as const;

const SUBJECT_CATALOG: SubjectFamilyDefinition[] = [
  {
    code: 'ARABIC',
    name: 'اللغة العربية وآدابها',
    subjects: [{ code: 'ARABIC', name: 'اللغة العربية وآدابها', isDefault: true }],
  },
  {
    code: 'ISLAMIC_STUDIES',
    name: 'العلوم الإسلامية',
    subjects: [
      { code: 'ISLAMIC_STUDIES', name: 'العلوم الإسلامية', isDefault: true },
    ],
  },
  {
    code: 'MATHEMATICS',
    name: 'الرياضيات',
    subjects: [{ code: 'MATHEMATICS', name: 'الرياضيات', isDefault: true }],
  },
  {
    code: 'ENGLISH',
    name: 'اللغة الإنجليزية',
    subjects: [{ code: 'ENGLISH', name: 'اللغة الإنجليزية', isDefault: true }],
  },
  {
    code: 'NATURAL_SCIENCES',
    name: 'علوم الطبيعة والحياة',
    subjects: [
      { code: 'NATURAL_SCIENCES', name: 'علوم الطبيعة والحياة', isDefault: true },
    ],
  },
  {
    code: 'PHYSICS',
    name: 'العلوم الفيزيائية',
    subjects: [{ code: 'PHYSICS', name: 'العلوم الفيزيائية', isDefault: true }],
  },
  {
    code: 'FRENCH',
    name: 'اللغة الفرنسية',
    subjects: [{ code: 'FRENCH', name: 'اللغة الفرنسية', isDefault: true }],
  },
  {
    code: 'HISTORY_GEOGRAPHY',
    name: 'التاريخ والجغرافيا',
    subjects: [
      { code: 'HISTORY_GEOGRAPHY', name: 'التاريخ والجغرافيا', isDefault: true },
    ],
  },
  {
    code: 'AMAZIGH',
    name: 'اللغة الأمازيغية',
    subjects: [{ code: 'AMAZIGH', name: 'اللغة الأمازيغية', isDefault: true }],
  },
  {
    code: 'PHILOSOPHY',
    name: 'الفلسفة',
    subjects: [{ code: 'PHILOSOPHY', name: 'الفلسفة', isDefault: true }],
  },
  {
    code: 'TECHNOLOGY',
    name: 'التكنولوجيا',
    subjects: [
      { code: 'TECHNOLOGY_MECHANICAL', name: 'التكنولوجيا (هندسة ميكانيكية)' },
      { code: 'TECHNOLOGY_ELECTRICAL', name: 'التكنولوجيا (هندسة كهربائية)' },
      { code: 'TECHNOLOGY_CIVIL', name: 'التكنولوجيا (هندسة مدنية)' },
      { code: 'TECHNOLOGY_PROCESS', name: 'التكنولوجيا (هندسة الطرائق)' },
    ],
  },
  {
    code: 'LAW',
    name: 'القانون',
    subjects: [{ code: 'LAW', name: 'القانون', isDefault: true }],
  },
  {
    code: 'ACCOUNTING_FINANCE',
    name: 'التسيير المحاسبي والمالي',
    subjects: [
      { code: 'ACCOUNTING_FINANCE', name: 'التسيير المحاسبي والمالي', isDefault: true },
    ],
  },
  {
    code: 'ECONOMICS_MANAGEMENT',
    name: 'الاقتصاد والمناجمنت',
    subjects: [
      { code: 'ECONOMICS_MANAGEMENT', name: 'الاقتصاد والمناجمنت', isDefault: true },
    ],
  },
  {
    code: 'THIRD_FOREIGN_LANGUAGE',
    name: 'اللغة الأجنبية الثالثة',
    subjects: [
      { code: 'GERMAN', name: 'اللغة الألمانية' },
      { code: 'SPANISH', name: 'اللغة الإسبانية' },
      { code: 'ITALIAN', name: 'اللغة الإيطالية' },
    ],
  },
  {
    code: 'ARTS',
    name: 'الفنون',
    subjects: [{ code: 'ARTS', name: 'الفنون', isDefault: true }],
  },
] as const;

const CURRICULUM_RULES: CurriculumRuleDefinition[] = [
  {
    streamCode: 'SE',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'NATURAL_SCIENCES' },
      { subjectCode: 'PHYSICS' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'AMAZIGH', isOptional: true },
      { subjectCode: 'PHILOSOPHY' },
    ],
  },
  {
    streamCode: 'M',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'NATURAL_SCIENCES' },
      { subjectCode: 'PHYSICS' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'AMAZIGH', isOptional: true },
      { subjectCode: 'PHILOSOPHY' },
    ],
  },
  {
    streamCode: 'MT_MECH',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'TECHNOLOGY_MECHANICAL' },
      { subjectCode: 'PHYSICS' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'AMAZIGH', isOptional: true },
      { subjectCode: 'PHILOSOPHY' },
    ],
  },
  {
    streamCode: 'MT_ELEC',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'TECHNOLOGY_ELECTRICAL' },
      { subjectCode: 'PHYSICS' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'AMAZIGH', isOptional: true },
      { subjectCode: 'PHILOSOPHY' },
    ],
  },
  {
    streamCode: 'MT_CIVIL',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'TECHNOLOGY_CIVIL' },
      { subjectCode: 'PHYSICS' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'AMAZIGH', isOptional: true },
      { subjectCode: 'PHILOSOPHY' },
    ],
  },
  {
    streamCode: 'MT_PROC',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'TECHNOLOGY_PROCESS' },
      { subjectCode: 'PHYSICS' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'AMAZIGH', isOptional: true },
      { subjectCode: 'PHILOSOPHY' },
    ],
  },
  {
    streamCode: 'GE',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'LAW' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'ACCOUNTING_FINANCE' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'AMAZIGH', isOptional: true },
      { subjectCode: 'ECONOMICS_MANAGEMENT' },
      { subjectCode: 'PHILOSOPHY' },
    ],
  },
  {
    streamCode: 'LP',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'PHILOSOPHY' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'AMAZIGH', isOptional: true },
    ],
  },
  {
    streamCode: 'LE',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'PHILOSOPHY' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'AMAZIGH', isOptional: true },
      { subjectCode: 'GERMAN' },
      { subjectCode: 'SPANISH' },
      { subjectCode: 'ITALIAN' },
    ],
  },
  {
    streamCode: 'ARTS',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ARTS' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'PHILOSOPHY' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'AMAZIGH', isOptional: true },
    ],
  },
] as const;

async function seedStreams(): Promise<Map<string, string>> {
  const pathwayIds = new Map<string, string>();

  for (const family of STREAM_CATALOG) {
    const savedFamily = await prisma.streamFamily.upsert({
      where: { code: family.code },
      update: {
        name: family.name,
        slug: slugFromCode(family.code),
      },
      create: {
        code: family.code,
        name: family.name,
        slug: slugFromCode(family.code),
      },
    });

    for (const pathway of family.pathways) {
      const savedPathway = await prisma.stream.upsert({
        where: { code: pathway.code },
        update: {
          familyId: savedFamily.id,
          name: pathway.name,
          slug: slugFromCode(pathway.code),
          isDefault: pathway.isDefault ?? false,
        },
        create: {
          familyId: savedFamily.id,
          code: pathway.code,
          name: pathway.name,
          slug: slugFromCode(pathway.code),
          isDefault: pathway.isDefault ?? false,
        },
      });

      pathwayIds.set(pathway.code, savedPathway.id);
    }
  }

  return pathwayIds;
}

async function seedSubjects(): Promise<Map<string, string>> {
  const subjectIds = new Map<string, string>();

  for (const family of SUBJECT_CATALOG) {
    const savedFamily = await prisma.subjectFamily.upsert({
      where: { code: family.code },
      update: {
        name: family.name,
        slug: slugFromCode(family.code),
      },
      create: {
        code: family.code,
        name: family.name,
        slug: slugFromCode(family.code),
      },
    });

    for (const subject of family.subjects) {
      const savedSubject = await prisma.subject.upsert({
        where: { code: subject.code },
        update: {
          familyId: savedFamily.id,
          name: subject.name,
          slug: slugFromCode(subject.code),
          isDefault: subject.isDefault ?? false,
        },
        create: {
          familyId: savedFamily.id,
          code: subject.code,
          name: subject.name,
          slug: slugFromCode(subject.code),
          isDefault: subject.isDefault ?? false,
        },
      });

      subjectIds.set(subject.code, savedSubject.id);
    }
  }

  return subjectIds;
}

async function syncCurriculumRules(
  streamIds: Map<string, string>,
  subjectIds: Map<string, string>,
): Promise<void> {
  const expectedPairs = new Map<
    string,
    {
      streamId: string;
      subjectId: string;
      isOptional: boolean;
    }
  >();

  for (const rule of CURRICULUM_RULES) {
    const streamId = streamIds.get(rule.streamCode);

    if (!streamId) {
      throw new Error(`Missing stream ${rule.streamCode} while syncing rules.`);
    }

    for (const subjectRule of rule.subjects) {
      const subjectId = subjectIds.get(subjectRule.subjectCode);

      if (!subjectId) {
        throw new Error(
          `Missing subject ${subjectRule.subjectCode} while syncing rules.`,
        );
      }

      expectedPairs.set(`${streamId}:${subjectId}`, {
        streamId,
        subjectId,
        isOptional: subjectRule.isOptional ?? false,
      });
    }
  }

  const currentMappings = await prisma.streamSubject.findMany({
    where: {
      validFromYear: 0,
    },
    select: {
      id: true,
      streamId: true,
      subjectId: true,
    },
  });

  const mappingIdsToDelete = currentMappings
    .filter((mapping) => !expectedPairs.has(`${mapping.streamId}:${mapping.subjectId}`))
    .map((mapping) => mapping.id);

  if (mappingIdsToDelete.length > 0) {
    await prisma.streamSubject.deleteMany({
      where: {
        id: {
          in: mappingIdsToDelete,
        },
      },
    });
  }

  for (const rule of expectedPairs.values()) {
    await prisma.streamSubject.upsert({
      where: {
        streamId_subjectId_validFromYear: {
          streamId: rule.streamId,
          subjectId: rule.subjectId,
          validFromYear: 0,
        },
      },
      update: {
        coefficient: null,
        isOptional: rule.isOptional,
        validToYear: null,
      },
      create: {
        streamId: rule.streamId,
        subjectId: rule.subjectId,
        coefficient: null,
        isOptional: rule.isOptional,
      },
    });
  }
}

async function cleanupObsoleteCatalog(): Promise<void> {
  await prisma.subject.deleteMany({
    where: {
      code: 'THIRD_FOREIGN_LANGUAGE',
      papers: { none: {} },
      exams: { none: {} },
      topics: { none: {} },
      streamMappings: { none: {} },
    },
  });
}

async function syncSeMathTopics(subjectId: string): Promise<void> {
  const validCodes = SE_MATH_TOPICS.map((topic) => topic.code);

  await prisma.topic.deleteMany({
    where: {
      subjectId,
      code: {
        notIn: validCodes,
      },
    },
  });

  for (const topic of SE_MATH_TOPICS) {
    await prisma.topic.upsert({
      where: {
        subjectId_code: {
          subjectId,
          code: topic.code,
        },
      },
      update: {
        name: topic.name,
      },
      create: {
        subjectId,
        code: topic.code,
        name: topic.name,
      },
    });
  }
}

async function main() {
  const streamIds = await seedStreams();
  const subjectIds = await seedSubjects();
  await syncCurriculumRules(streamIds, subjectIds);
  await cleanupObsoleteCatalog();

  const mathSubjectId = subjectIds.get('MATHEMATICS');

  if (!mathSubjectId) {
    throw new Error('Could not resolve the MATHEMATICS subject during seed.');
  }

  await syncSeMathTopics(mathSubjectId);

  console.log('Seed complete: BAC catalog families, pathways, and mathematics topics synced.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
