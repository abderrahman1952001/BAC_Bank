import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

type TopicNodeDefinition = {
  code: string;
  name: string;
  studentLabel?: string;
  isSelectable?: boolean;
  children?: TopicNodeDefinition[];
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
    subjects: [
      { code: 'ARABIC', name: 'اللغة العربية وآدابها', isDefault: true },
    ],
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
      {
        code: 'NATURAL_SCIENCES',
        name: 'علوم الطبيعة والحياة',
        isDefault: true,
      },
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
      {
        code: 'HISTORY_GEOGRAPHY',
        name: 'التاريخ والجغرافيا',
        isDefault: true,
      },
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
      {
        code: 'ACCOUNTING_FINANCE',
        name: 'التسيير المحاسبي والمالي',
        isDefault: true,
      },
    ],
  },
  {
    code: 'ECONOMICS_MANAGEMENT',
    name: 'الاقتصاد والمناجمنت',
    subjects: [
      {
        code: 'ECONOMICS_MANAGEMENT',
        name: 'الاقتصاد والمناجمنت',
        isDefault: true,
      },
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

const SUBJECT_TOPIC_TREES: Record<string, TopicNodeDefinition[]> = {
  MATHEMATICS: [
    {
      code: 'FUNCTIONS',
      name: 'الدوال',
      children: [
        { code: 'EXPONENTIAL', name: 'الدالة الأسية' },
        { code: 'LOGARITHM', name: 'الدالة اللوغاريتمية' },
      ],
    },
    { code: 'SEQUENCES', name: 'المتتاليات' },
    { code: 'INTEGRALS', name: 'التكامل' },
    { code: 'PROBABILITY', name: 'الاحتمالات' },
    { code: 'COMPLEX_NUMBERS', name: 'الأعداد المركبة' },
    { code: 'SPACE_GEOMETRY', name: 'الهندسة في الفضاء' },
  ],
  NATURAL_SCIENCES: [
    {
      code: 'PROTEINS',
      name: 'التخصص الوظيفي للبروتينات',
      studentLabel: 'البروتينات',
      children: [
        { code: 'PROTEIN_SYNTHESIS', name: 'تركيب البروتين' },
        { code: 'STRUCTURE_FUNCTION', name: 'العلاقة بين البنية والوظيفة' },
        { code: 'ENZYMES', name: 'الإنزيمات' },
        { code: 'IMMUNITY', name: 'المناعة' },
        { code: 'NERVOUS_COMMUNICATION', name: 'الاتصال العصبي' },
      ],
    },
    {
      code: 'ENERGY_TRANSFORMATIONS',
      name: 'تحويل الطاقة',
      children: [
        { code: 'PHOTOSYNTHESIS', name: 'التركيب الضوئي' },
        { code: 'RESPIRATION_FERMENTATION', name: 'التنفس والتخمر' },
      ],
    },
    {
      code: 'PLATE_TECTONICS',
      name: 'النشاط التكتوني للصفائح',
      studentLabel: 'النشاط التكتوني',
      children: [
        { code: 'PLATE_ACTIVITY', name: 'نشاط الصفائح' },
        { code: 'TECTONIC_INTERPRETATION', name: 'التفسير التكتوني' },
      ],
    },
  ],
  PHYSICS: [
    { code: 'CHEMICAL_TRANSFORMATIONS', name: 'التحول الكيميائي' },
    { code: 'CHEMICAL_EQUILIBRIUM', name: 'التوازن الكيميائي' },
    { code: 'ELECTRICITY', name: 'الظواهر الكهربائية' },
    { code: 'MECHANICS', name: 'الميكانيك' },
    { code: 'OSCILLATIONS', name: 'الاهتزازات' },
    { code: 'NUCLEAR_TRANSFORMATIONS', name: 'التحولات النووية' },
    { code: 'DIFFUSION', name: 'الانتشار' },
  ],
  TECHNOLOGY_ELECTRICAL: [
    { code: 'SEQUENTIAL_LOGIC', name: 'Logique séquentielle' },
    {
      code: 'AUTOMATION_GRAFCET_GEMMA',
      name: 'Automatisation / GRAFCET / GEMMA',
      studentLabel: 'Automatisation',
    },
    { code: 'MICROCONTROLLER', name: 'Microcontrôleur' },
    {
      code: 'ELECTRICAL_ENERGY_TRANSFORMATION',
      name: "Transformation de l'énergie électrique",
      studentLabel: "Transformation de l'énergie",
    },
    {
      code: 'THREE_PHASE',
      name: 'Triphasé',
      studentLabel: 'Triphasé',
    },
    {
      code: 'ELECTRICAL_MACHINES_ACTUATORS',
      name: 'Machines électriques / actionneurs',
      studentLabel: 'Machines électriques',
    },
    { code: 'POWER_AMPLIFICATION', name: 'Amplification de puissance' },
    {
      code: 'INFORMATION_ACQUISITION_CONVERSION',
      name: "Acquisition et conversion de l'information",
      studentLabel: 'Acquisition / conversion',
    },
    { code: 'PROJECT', name: 'Projet' },
  ],
  TECHNOLOGY_MECHANICAL: [
    { code: 'FUNCTIONAL_ANALYSIS', name: 'Analyse fonctionnelle' },
    {
      code: 'BEARING_JOINTS',
      name: 'Liaisons par roulements',
      studentLabel: 'Roulements',
    },
    {
      code: 'MOTION_TRANSMISSION_CONVERSION',
      name: 'Transmission et transformation de mouvement',
      studentLabel: 'Transmission / transformation',
    },
    {
      code: 'STRENGTH_OF_MATERIALS',
      name: 'Résistance des matériaux',
      studentLabel: 'RDM',
    },
    { code: 'MANUFACTURING_PREPARATION', name: 'Préparation de fabrication' },
    { code: 'NUMERICAL_CONTROL', name: 'Commande numérique' },
    {
      code: 'PNEUMATIC_AUTOMATION_SEQUENTIAL_LOGIC',
      name: 'Automatisation pneumatique / logique séquentielle',
      studentLabel: 'Automatisation pneumatique',
    },
  ],
  TECHNOLOGY_CIVIL: [
    {
      code: 'BUILDING_STRUCTURE',
      name: 'Bâtiment / structure du bâtiment',
      studentLabel: 'Bâtiment',
    },
    { code: 'TOPOGRAPHY', name: 'Topographie' },
    { code: 'ROADS', name: 'Routes' },
    { code: 'BRIDGES', name: 'Ponts' },
    {
      code: 'STRENGTH_OF_MATERIALS',
      name: 'Résistance des matériaux',
      studentLabel: 'RDM',
    },
    { code: 'TRUSS_SYSTEMS', name: 'Systèmes triangulés' },
    { code: 'SIMPLE_BENDING', name: 'Flexion simple' },
    {
      code: 'REINFORCED_CONCRETE',
      name: 'Béton armé',
    },
    {
      code: 'APPLIED_MECHANICS_TESTS',
      name: 'Mécanique appliquée / essais',
      studentLabel: 'Mécanique appliquée',
    },
    {
      code: 'CAD_DRAWING',
      name: 'DAO / dessin assisté par ordinateur',
      studentLabel: 'DAO',
    },
  ],
  TECHNOLOGY_PROCESS: [
    { code: 'HYDROCARBONS', name: 'Hydrocarbures' },
    { code: 'OXYGENATED_FUNCTIONS', name: 'Fonctions oxygénées' },
    { code: 'AMINES', name: 'Amines' },
    { code: 'POLYMERS', name: 'Polymères' },
    { code: 'LIPIDS', name: 'Lipides' },
    { code: 'AMINO_ACIDS', name: 'Acides aminés' },
    { code: 'PROTEINS', name: 'Protéines' },
    { code: 'THERMODYNAMICS', name: 'Thermodynamique' },
    { code: 'CHEMICAL_KINETICS', name: 'Cinétique chimique' },
  ],
  ECONOMICS_MANAGEMENT: [
    { code: 'MONEY', name: 'النقود' },
    { code: 'MARKET_PRICES', name: 'السوق والأسعار' },
    { code: 'BANKING_SYSTEM', name: 'النظام المصرفي' },
    { code: 'FOREIGN_TRADE', name: 'التجارة الخارجية' },
    { code: 'EXCHANGE', name: 'الصرف' },
    { code: 'UNEMPLOYMENT', name: 'البطالة' },
    { code: 'INFLATION', name: 'التضخم' },
    { code: 'LEADERSHIP_MOTIVATION', name: 'القيادة والتحفيز' },
    { code: 'COMMUNICATION', name: 'الاتصال' },
    { code: 'CONTROL', name: 'الرقابة' },
  ],
  ACCOUNTING_FINANCE: [
    { code: 'YEAR_END_WORK', name: 'أعمال نهاية السنة' },
    {
      code: 'DEPRECIATION_IMPAIRMENT',
      name: 'الاهتلاكات ونقص قيمة التثبيتات',
    },
    {
      code: 'BANKING_OPERATIONS_RECONCILIATION',
      name: 'العمليات المصرفية والتقارب البنكي',
    },
    {
      code: 'OTHER_ASSET_ADJUSTMENTS',
      name: 'تسوية عناصر الأصول الأخرى',
    },
    { code: 'PROVISIONS', name: 'مؤونة الأخطار' },
    {
      code: 'INCOME_STATEMENT_BY_NATURE',
      name: 'حساب النتائج حسب الطبيعة',
    },
    {
      code: 'INCOME_STATEMENT_BY_FUNCTION',
      name: 'حساب النتائج حسب الوظيفة',
    },
    { code: 'FUNCTIONAL_BALANCE_SHEET', name: 'الميزانية الوظيفية' },
    {
      code: 'COST_ACCOUNTING',
      name: 'المحاسبة التحليلية وحساب التكاليف',
    },
    {
      code: 'LOANS_INVESTMENT_PROJECT_CHOICE',
      name: 'القروض واختيار المشاريع الاستثمارية',
    },
  ],
  LAW: [
    { code: 'SALE_CONTRACT', name: 'عقد البيع' },
    { code: 'COMPANY_CONTRACT', name: 'عقد الشركة' },
    { code: 'GENERAL_PARTNERSHIP', name: 'شركة التضامن' },
    { code: 'INDIVIDUAL_LABOR_RELATIONS', name: 'علاقات العمل الفردية' },
    { code: 'COLLECTIVE_LABOR_RELATIONS', name: 'علاقات العمل الجماعية' },
    {
      code: 'STATE_BUDGET_FINANCE_LAW',
      name: 'الميزانية العامة للدولة وقانون المالية',
    },
    { code: 'TAXES_FEES', name: 'الضرائب والرسوم' },
    { code: 'GROSS_INCOME_TAX', name: 'الضريبة على الدخل الإجمالي' },
    { code: 'VAT', name: 'الرسم على القيمة المضافة' },
  ],
};

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
    .filter(
      (mapping) =>
        !expectedPairs.has(`${mapping.streamId}:${mapping.subjectId}`),
    )
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

function collectTopicCodes(nodes: TopicNodeDefinition[]): string[] {
  return nodes.flatMap((node) => [
    node.code,
    ...(node.children ? collectTopicCodes(node.children) : []),
  ]);
}

async function syncSubjectTopics(
  subjectId: string,
  topicTree: TopicNodeDefinition[],
): Promise<void> {
  const validCodes = collectTopicCodes(topicTree);

  await prisma.topic.deleteMany({
    where: {
      subjectId,
      code: {
        notIn: validCodes,
      },
    },
  });

  async function upsertLevel(
    nodes: TopicNodeDefinition[],
    parentId: string | null,
  ): Promise<void> {
    for (const [index, topic] of nodes.entries()) {
      const savedTopic = await prisma.topic.upsert({
        where: {
          subjectId_code: {
            subjectId,
            code: topic.code,
          },
        },
        update: {
          name: topic.name,
          slug: slugFromCode(topic.code),
          parentId,
          displayOrder: index + 1,
          isSelectable: topic.isSelectable ?? true,
          studentLabel: topic.studentLabel ?? null,
        },
        create: {
          subjectId,
          code: topic.code,
          name: topic.name,
          slug: slugFromCode(topic.code),
          parentId,
          displayOrder: index + 1,
          isSelectable: topic.isSelectable ?? true,
          studentLabel: topic.studentLabel ?? null,
        },
      });

      if (topic.children?.length) {
        await upsertLevel(topic.children, savedTopic.id);
      }
    }
  }

  await upsertLevel(topicTree, null);
}

async function main() {
  const streamIds = await seedStreams();
  const subjectIds = await seedSubjects();
  await syncCurriculumRules(streamIds, subjectIds);
  await cleanupObsoleteCatalog();

  for (const [subjectCode, topicTree] of Object.entries(SUBJECT_TOPIC_TREES)) {
    const subjectId = subjectIds.get(subjectCode);

    if (!subjectId) {
      throw new Error(
        `Could not resolve the ${subjectCode} subject during seed.`,
      );
    }

    await syncSubjectTopics(subjectId, topicTree);
  }

  console.log(
    'Seed complete: BAC catalog families, pathways, and starter topic trees synced.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
