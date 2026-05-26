import {
  FlashcardSourceType,
  FlashcardType,
  LearningTargetKind,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  buildCurriculumTitle,
  resolveCurriculumDefinitions,
} from '../src/catalog/curriculum-sharing';

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

type LearningTargetDefinition = {
  code: string;
  name: string;
  description?: string;
  kind?: LearningTargetKind;
  displayOrder?: number;
  topicMappings: Array<{
    topicCode: string;
    weight?: number;
    isPrimary?: boolean;
  }>;
};

type PlatformFlashcardDefinition = {
  code: string;
  front: string;
  back: string;
  learningTargetCode?: string;
  curriculumNodeCode?: string;
  orderIndex?: number;
};

type PlatformFlashcardDeckDefinition = {
  code: string;
  subjectCode: string;
  title: string;
  description: string;
  cards: PlatformFlashcardDefinition[];
};

type PlatformLabMissionDefinition = {
  code: string;
  title: string;
  goal: string;
  curriculumNodeCode?: string;
  learningTargetCode?: string;
  preset?: Record<string, unknown>;
  exitCheck?: Record<string, unknown>;
  orderIndex?: number;
};

type PlatformLabToolDefinition = {
  slug: string;
  subjectCode: string;
  title: string;
  description: string;
  status?: 'READY' | 'DRAFT' | 'HIDDEN';
  metadata?: Record<string, unknown>;
  missions: PlatformLabMissionDefinition[];
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

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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
    pathways: [
      { code: 'LE_GERMAN', name: 'لغات أجنبية - ألمانية' },
      { code: 'LE_SPANISH', name: 'لغات أجنبية - إسبانية' },
      { code: 'LE_ITALIAN', name: 'لغات أجنبية - إيطالية' },
    ],
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
    streamCode: 'LE_GERMAN',
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
    ],
  },
  {
    streamCode: 'LE_SPANISH',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'PHILOSOPHY' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'AMAZIGH', isOptional: true },
      { subjectCode: 'SPANISH' },
    ],
  },
  {
    streamCode: 'LE_ITALIAN',
    subjects: [
      { subjectCode: 'ARABIC' },
      { subjectCode: 'ISLAMIC_STUDIES' },
      { subjectCode: 'MATHEMATICS' },
      { subjectCode: 'ENGLISH' },
      { subjectCode: 'PHILOSOPHY' },
      { subjectCode: 'FRENCH' },
      { subjectCode: 'HISTORY_GEOGRAPHY' },
      { subjectCode: 'AMAZIGH', isOptional: true },
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

const NATURAL_SCIENCES_SE_TOPIC_TREE: TopicNodeDefinition[] = [
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
    studentLabel: 'تحويل الطاقة',
    children: [
      { code: 'PHOTOSYNTHESIS', name: 'التركيب الضوئي' },
      { code: 'RESPIRATION_FERMENTATION', name: 'التنفس والتخمر' },
      { code: 'ENERGY_BALANCE', name: 'الحصيلة الطاقوية' },
    ],
  },
  {
    code: 'PLATE_TECTONICS',
    name: 'النشاط التكتوني للصفائح',
    studentLabel: 'النشاط التكتوني',
    children: [
      { code: 'EARTH_STRUCTURE', name: 'بنية الكرة الأرضية' },
      { code: 'PLATE_ACTIVITY', name: 'نشاط الصفائح' },
      { code: 'TECTONIC_INTERPRETATION', name: 'التفسير التكتوني' },
    ],
  },
];

const NATURAL_SCIENCES_M_TOPIC_TREE: TopicNodeDefinition[] = [
  {
    code: 'PROTEINS',
    name: 'التخصص الوظيفي للبروتينات',
    studentLabel: 'البروتينات',
    children: [
      { code: 'PROTEIN_SYNTHESIS', name: 'تركيب البروتين' },
      { code: 'STRUCTURE_FUNCTION', name: 'العلاقة بين البنية والوظيفة' },
      { code: 'IMMUNITY', name: 'المناعة' },
    ],
  },
  {
    code: 'HUMAN_AND_PLANET_MANAGEMENT',
    name: 'الإنسان وتسيير الكوكب',
    studentLabel: 'الإنسان والكوكب',
    children: [
      { code: 'AIR_POLLUTION', name: 'تلوث الجو' },
      { code: 'WATER_POLLUTION', name: 'تلوث الماء' },
    ],
  },
];

const SUBJECT_TOPIC_TREES: Record<string, TopicNodeDefinition[]> = {
  MATHEMATICS: [
    {
      code: 'FUNCTIONS',
      name: 'الدوال والتحليل',
      studentLabel: 'الدوال',
      children: [
        { code: 'LIMITS_CONTINUITY', name: 'النهايات والاستمرارية' },
        { code: 'DERIVATIVES', name: 'الاشتقاق والتغيرات' },
        { code: 'EXPONENTIAL', name: 'الدالة الأسية' },
        { code: 'LOGARITHM', name: 'الدالة اللوغاريتمية' },
        { code: 'TRIGONOMETRY', name: 'المثلثيات' },
      ],
    },
    { code: 'SEQUENCES', name: 'المتتاليات' },
    { code: 'INTEGRALS', name: 'التكامل' },
    {
      code: 'PROBABILITY',
      name: 'الاحتمالات والإحصاء',
      studentLabel: 'الاحتمالات',
      children: [{ code: 'STATISTICS', name: 'الإحصاء وتفسير البيانات' }],
    },
    { code: 'COMPLEX_NUMBERS', name: 'الأعداد المركبة' },
    { code: 'SPACE_GEOMETRY', name: 'الهندسة في الفضاء' },
  ],
  ARABIC: [
    {
      code: 'READING_ANALYSIS',
      name: 'فهم النص وتحليله',
      studentLabel: 'فهم النص',
      children: [
        { code: 'RHETORIC_BALAGHAH', name: 'البلاغة والصور البيانية' },
      ],
    },
    {
      code: 'LANGUAGE_TOOLS',
      name: 'الأدوات اللغوية',
      studentLabel: 'اللغة',
      children: [
        { code: 'GRAMMAR_NAHW', name: 'النحو' },
        { code: 'MORPHOLOGY_SARF', name: 'الصرف' },
      ],
    },
    {
      code: 'WRITING_COMPOSITION',
      name: 'التعبير والإنشاء',
      studentLabel: 'الإنشاء',
      children: [
        { code: 'WRITING_TYPES', name: 'أنماط الكتابة: حجاج ووصف وسرد وتفسير' },
        { code: 'SUMMARY_SYNTHESIS', name: 'التلخيص والتركيب' },
      ],
    },
  ],
  ENGLISH: [
    {
      code: 'READING_COMPREHENSION',
      name: 'Reading comprehension / فهم النص',
    },
    {
      code: 'VOCABULARY_IN_CONTEXT',
      name: 'Vocabulary in context / المفردات',
    },
    {
      code: 'GRAMMAR_TRANSFORMATIONS',
      name: 'Grammar & transformations / القواعد',
    },
    {
      code: 'WRITING',
      name: 'Writing / الكتابة',
      studentLabel: 'Writing',
      children: [
        {
          code: 'GUIDED_WRITING',
          name: 'Guided paragraph writing / الفقرة الموجهة',
        },
        {
          code: 'ARGUMENTATIVE_WRITING',
          name: 'Opinion writing / الكتابة الحجاجية',
        },
        {
          code: 'FUNCTIONAL_WRITING',
          name: 'Functional writing / الرسائل والتواصل',
        },
      ],
    },
  ],
  FRENCH: [
    {
      code: 'READING_ANALYSIS',
      name: 'Compréhension et analyse du texte',
      studentLabel: 'Compréhension',
    },
    {
      code: 'TEXT_TYPES',
      name: 'Objets d’étude / types de discours',
      studentLabel: 'Types de discours',
      children: [
        { code: 'HISTORICAL_DISCOURSE', name: 'Le discours historique' },
        { code: 'ARGUMENTATIVE_DEBATE', name: "Le débat d'idées" },
        { code: 'EXHORTATIVE_DISCOURSE', name: "L'appel" },
      ],
    },
    {
      code: 'SYNTHESIS_SUMMARY',
      name: 'Résumé / synthèse / compte rendu',
      studentLabel: 'Synthèse',
    },
    {
      code: 'GRAMMAR_ENUNCIATION',
      name: 'Grammaire et énonciation',
      studentLabel: 'Grammaire',
    },
    {
      code: 'STRUCTURED_WRITING',
      name: 'Production écrite structurée',
      studentLabel: 'Production écrite',
    },
    { code: 'VOCABULARY_STYLE', name: 'Lexique et style' },
  ],
  NATURAL_SCIENCES: NATURAL_SCIENCES_SE_TOPIC_TREE,
  PHYSICS: [
    {
      code: 'CHEMICAL_TRANSFORMATIONS',
      name: 'التحولات الكيميائية',
      children: [{ code: 'CHEMICAL_KINETICS', name: 'الحركية الكيميائية' }],
    },
    {
      code: 'CHEMICAL_EQUILIBRIUM',
      name: 'التوازن والتحولات الموجهة',
      studentLabel: 'التوازن الكيميائي',
      children: [
        {
          code: 'FORCED_TRANSFORMATIONS',
          name: 'التحولات الموجهة والكهرباء الكيميائية',
        },
      ],
    },
    {
      code: 'ELECTRICITY',
      name: 'الظواهر الكهربائية',
      children: [{ code: 'RC_RL_CIRCUITS', name: 'دارات RC و RL' }],
    },
    { code: 'MECHANICS', name: 'الميكانيك' },
    {
      code: 'OSCILLATIONS',
      name: 'الاهتزازات',
      children: [{ code: 'RLC_OSCILLATIONS', name: 'اهتزازات LC و RLC' }],
    },
    { code: 'NUCLEAR_TRANSFORMATIONS', name: 'التحولات النووية' },
    {
      code: 'DIFFUSION',
      name: 'الأمواج والانتشار',
      studentLabel: 'الأمواج',
      children: [
        { code: 'WAVE_PROPAGATION', name: 'انتشار الموجات' },
        { code: 'INTERFERENCE_DIFFRACTION', name: 'التداخل والحيود' },
      ],
    },
  ],
  HISTORY_GEOGRAPHY: [
    {
      code: 'HISTORY_FOUNDATIONS',
      name: 'التاريخ الحديث وبدايات العالم المعاصر',
      studentLabel: 'التاريخ الحديث',
      children: [
        { code: 'ISLAMIC_WORLD_1453_1914', name: 'العالم الإسلامي 1453-1914' },
        { code: 'ALGERIA_OTTOMAN_1515_1830', name: 'الجزائر 1515-1830' },
        {
          code: 'EUROPE_TRANSFORMATIONS_1453_1914',
          name: 'تحولات أوروبا 1453-1914',
        },
        {
          code: 'IMPERIALISM_NATIONALISM',
          name: 'الاستعمار والحركات الوطنية',
        },
      ],
    },
    {
      code: 'ALGERIA_CONTEMPORARY_HISTORY',
      name: 'الجزائر من الاحتلال إلى الاستقلال',
      studentLabel: 'تاريخ الجزائر',
      children: [
        {
          code: 'COLONIAL_ALGERIA_1830_1954',
          name: 'الجزائر تحت الاستعمار 1830-1954',
        },
        {
          code: 'ALGERIAN_REVOLUTION_1954_1962',
          name: 'الثورة الجزائرية 1954-1962',
        },
        {
          code: 'DECOLONIZATION_COLD_WAR',
          name: 'حركات التحرر والحرب الباردة',
        },
        {
          code: 'HISTORY_DOCUMENT_METHOD',
          name: 'منهجية التاريخ والوثائق',
        },
      ],
    },
    {
      code: 'GEOGRAPHY_GLOBAL_SYSTEMS',
      name: 'الجغرافيا العامة والعولمة',
      studentLabel: 'الجغرافيا العامة',
      children: [
        {
          code: 'GEOGRAPHY_TOOLS_METHODS',
          name: 'أدوات الجغرافيا ومنهجيتها',
        },
        { code: 'DEVELOPMENT_INDICATORS', name: 'التنمية والتخلف' },
        { code: 'GLOBAL_FLOWS', name: 'التدفقات العالمية' },
        { code: 'ECONOMIC_POWERS', name: 'الأقطاب الاقتصادية الكبرى' },
      ],
    },
    {
      code: 'GEOGRAPHY_REGIONAL_CASES',
      name: 'دراسات إقليمية في العالم',
      studentLabel: 'دراسات إقليمية',
      children: [
        {
          code: 'EAST_SOUTHEAST_ASIA',
          name: 'شرق وجنوب شرق آسيا: السكان والتنمية',
        },
        { code: 'INDIA_DEVELOPMENT', name: 'الهند: السكان والتنمية' },
        { code: 'BRAZIL_DEVELOPMENT', name: 'البرازيل: التنمية والبيئة' },
      ],
    },
    {
      code: 'ALGERIA_GEO_POSITION',
      name: 'الجزائر في محيطها الاقتصادي والإقليمي',
      studentLabel: 'جغرافية الجزائر',
      children: [
        {
          code: 'ALGERIA_WORLD_ECONOMY',
          name: 'الجزائر في الاقتصاد العالمي',
        },
        {
          code: 'ALGERIA_MEDITERRANEAN',
          name: 'الجزائر في المتوسط وأفريقيا',
        },
        {
          code: 'ALGERIA_REGIONAL_DISPARITIES',
          name: 'التفاوتات الإقليمية في الجزائر',
        },
      ],
    },
  ],
  PHILOSOPHY: [
    {
      code: 'KNOWLEDGE_AND_SCIENCE',
      name: 'المعرفة والعلم',
      studentLabel: 'المعرفة والعلم',
      children: [
        { code: 'KNOWLEDGE_PERCEPTION', name: 'المعرفة والإدراك' },
        { code: 'SCIENCE_METHOD', name: 'العلم والمنهج' },
      ],
    },
    {
      code: 'HUMAN_SELF',
      name: 'الإنسان والوعي',
      studentLabel: 'الإنسان والوعي',
      children: [
        { code: 'CONSCIOUSNESS_MIND', name: 'الشعور والذات' },
        { code: 'FREEDOM_DETERMINISM', name: 'الحرية والحتمية' },
      ],
    },
    {
      code: 'VALUES_AND_SOCIETY',
      name: 'القيم والمجتمع',
      studentLabel: 'القيم والمجتمع',
      children: [
        { code: 'ETHICS_RESPONSIBILITY', name: 'الأخلاق والمسؤولية' },
        { code: 'POLITICS_STATE', name: 'الدولة والسياسة' },
        { code: 'LANGUAGE_TRUTH', name: 'اللغة والحقيقة' },
      ],
    },
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

const SUBJECT_LEARNING_TARGETS: Record<string, LearningTargetDefinition[]> = {
  MATHEMATICS: [
    {
      code: 'FUNCTION_ANALYSIS',
      name: 'تحليل الدوال',
      description:
        'قراءة الدالة وربط التمثيل البياني بالحسابات والخصائص الأساسية.',
      topicMappings: [
        { topicCode: 'FUNCTIONS', weight: 1, isPrimary: true },
        { topicCode: 'LIMITS_CONTINUITY', weight: 0.9 },
        { topicCode: 'DERIVATIVES', weight: 0.9 },
        { topicCode: 'EXPONENTIAL', weight: 0.7 },
        { topicCode: 'LOGARITHM', weight: 0.7 },
      ],
    },
    {
      code: 'LIMIT_REASONING',
      name: 'الاستدلال في النهايات',
      description: 'حساب النهايات وربطها بالاستمرارية والمقارب.',
      topicMappings: [
        { topicCode: 'LIMITS_CONTINUITY', weight: 1, isPrimary: true },
        { topicCode: 'FUNCTIONS', weight: 0.5 },
      ],
    },
    {
      code: 'DERIVATIVE_APPLICATIONS',
      name: 'توظيف الاشتقاق',
      description: 'استعمال المشتقة لدراسة التغيرات والقيم القصوى والمماس.',
      topicMappings: [
        { topicCode: 'DERIVATIVES', weight: 1, isPrimary: true },
        { topicCode: 'FUNCTIONS', weight: 0.6 },
      ],
    },
    {
      code: 'EXPONENTIAL_REASONING',
      name: 'الاستدلال بالدالة الأسية',
      description: 'حل أسئلة الأسية والتحويلات المرتبطة بها.',
      topicMappings: [{ topicCode: 'EXPONENTIAL', weight: 1, isPrimary: true }],
    },
    {
      code: 'LOGARITHM_REASONING',
      name: 'الاستدلال بالدالة اللوغاريتمية',
      description: 'حل أسئلة اللوغاريتم والتعامل مع خواصه.',
      topicMappings: [{ topicCode: 'LOGARITHM', weight: 1, isPrimary: true }],
    },
    {
      code: 'TRIGONOMETRIC_REASONING',
      name: 'الاستدلال في المثلثيات',
      description: 'حل المعادلات المثلثية وتوظيف الهويات الأساسية.',
      topicMappings: [
        { topicCode: 'TRIGONOMETRY', weight: 1, isPrimary: true },
      ],
    },
    {
      code: 'SEQUENCE_PROOF',
      name: 'البرهان في المتتاليات',
      description: 'استخراج حدود المتتالية ودراسة سلوكها وإثبات خواصها.',
      topicMappings: [{ topicCode: 'SEQUENCES', weight: 1, isPrimary: true }],
    },
    {
      code: 'INTEGRAL_METHODS',
      name: 'تقنيات التكامل',
      description: 'اختيار طريقة التكامل المناسبة وتفسير النتيجة.',
      topicMappings: [{ topicCode: 'INTEGRALS', weight: 1, isPrimary: true }],
    },
    {
      code: 'PROBABILITY_MODELING',
      name: 'النمذجة في الاحتمالات',
      description: 'بناء النماذج الاحتمالية وقراءة النتائج.',
      topicMappings: [{ topicCode: 'PROBABILITY', weight: 1, isPrimary: true }],
    },
    {
      code: 'STATISTICS_INTERPRETATION',
      name: 'تفسير المعطيات الإحصائية',
      description: 'قراءة الجداول والرسوم واستخراج المؤشرات الأساسية.',
      topicMappings: [
        { topicCode: 'STATISTICS', weight: 1, isPrimary: true },
        { topicCode: 'PROBABILITY', weight: 0.4 },
      ],
    },
    {
      code: 'COMPLEX_NUMBER_MANIPULATION',
      name: 'التعامل مع الأعداد المركبة',
      description: 'الكتابات المختلفة للأعداد المركبة وحساباتها.',
      topicMappings: [
        { topicCode: 'COMPLEX_NUMBERS', weight: 1, isPrimary: true },
      ],
    },
    {
      code: 'SPACE_REASONING',
      name: 'الاستدلال في الهندسة الفضائية',
      description: 'توظيف المتجهات والهندسة التحليلية في الفضاء.',
      topicMappings: [
        { topicCode: 'SPACE_GEOMETRY', weight: 1, isPrimary: true },
      ],
    },
  ],
  ARABIC: [
    {
      code: 'TEXT_COMPREHENSION',
      name: 'فهم النص',
      description:
        'استخراج الفكرة العامة والدلالات من النص مع الاستشهاد المناسب.',
      topicMappings: [
        { topicCode: 'READING_ANALYSIS', weight: 1, isPrimary: true },
        { topicCode: 'RHETORIC_BALAGHAH', weight: 0.4 },
      ],
    },
    {
      code: 'RHETORICAL_ANALYSIS',
      name: 'التحليل البلاغي',
      description: 'تمييز الصور البيانية والمحسنات وشرح أثرها في المعنى.',
      topicMappings: [
        { topicCode: 'RHETORIC_BALAGHAH', weight: 1, isPrimary: true },
        { topicCode: 'READING_ANALYSIS', weight: 0.3 },
      ],
    },
    {
      code: 'GRAMMAR_APPLICATION',
      name: 'تطبيق قواعد النحو',
      description: 'إعراب الجمل وتوظيف القواعد النحوية في السياق.',
      topicMappings: [
        { topicCode: 'GRAMMAR_NAHW', weight: 1, isPrimary: true },
        { topicCode: 'LANGUAGE_TOOLS', weight: 0.5 },
      ],
    },
    {
      code: 'MORPHOLOGY_APPLICATION',
      name: 'تطبيق قواعد الصرف',
      description: 'تحليل البنية الصرفية وتوليد الصيغ المناسبة داخل النص.',
      topicMappings: [
        { topicCode: 'MORPHOLOGY_SARF', weight: 1, isPrimary: true },
        { topicCode: 'LANGUAGE_TOOLS', weight: 0.5 },
      ],
    },
    {
      code: 'STRUCTURED_COMPOSITION',
      name: 'الإنشاء المنظم',
      description: 'بناء مقدمة وعرض وخاتمة مترابطة بحسب المطلوب.',
      topicMappings: [
        { topicCode: 'WRITING_COMPOSITION', weight: 1, isPrimary: true },
        { topicCode: 'WRITING_TYPES', weight: 0.9 },
      ],
    },
    {
      code: 'SUMMARY_SYNTHESIS',
      name: 'التلخيص والتركيب',
      description: 'اختصار الأفكار مع الحفاظ على تسلسلها ومعناها الأصلي.',
      topicMappings: [
        { topicCode: 'SUMMARY_SYNTHESIS', weight: 1, isPrimary: true },
        { topicCode: 'WRITING_COMPOSITION', weight: 0.4 },
      ],
    },
  ],
  ENGLISH: [
    {
      code: 'READING_INFERENCE',
      name: 'Reading inference',
      description: 'فهم الفكرة العامة والاستنتاج من النص بالاعتماد على الأدلة.',
      topicMappings: [
        { topicCode: 'READING_COMPREHENSION', weight: 1, isPrimary: true },
      ],
    },
    {
      code: 'VOCABULARY_CONTEXT',
      name: 'Vocabulary in context',
      description: 'استنتاج معنى الكلمة من السياق وتمييز العلاقات الدلالية.',
      topicMappings: [
        { topicCode: 'VOCABULARY_IN_CONTEXT', weight: 1, isPrimary: true },
      ],
    },
    {
      code: 'GRAMMAR_CONTROL',
      name: 'Grammar control',
      description: 'التحكم في الأزمنة والقواعد والتحويلات المطلوبة في BAC.',
      topicMappings: [
        { topicCode: 'GRAMMAR_TRANSFORMATIONS', weight: 1, isPrimary: true },
      ],
    },
    {
      code: 'GUIDED_PARAGRAPH_WRITING',
      name: 'Guided writing',
      description: 'كتابة فقرة واضحة تحترم المطلوب وتستعمل روابط مناسبة.',
      topicMappings: [
        { topicCode: 'GUIDED_WRITING', weight: 1, isPrimary: true },
        { topicCode: 'WRITING', weight: 0.5 },
      ],
    },
    {
      code: 'ARGUMENTATIVE_WRITING',
      name: 'Argumentative writing',
      description: 'تقديم رأي مدعوم بالأسباب والأمثلة في فقرة أو نص قصير.',
      topicMappings: [
        { topicCode: 'ARGUMENTATIVE_WRITING', weight: 1, isPrimary: true },
        { topicCode: 'WRITING', weight: 0.5 },
      ],
    },
    {
      code: 'FUNCTIONAL_WRITING_FORMAT',
      name: 'Functional writing',
      description: 'احترام صيغة الرسالة أو البريد أو النص الوظيفي المطلوب.',
      topicMappings: [
        { topicCode: 'FUNCTIONAL_WRITING', weight: 1, isPrimary: true },
        { topicCode: 'WRITING', weight: 0.5 },
      ],
    },
  ],
  FRENCH: [
    {
      code: 'TEXT_COMPREHENSION',
      name: 'Compréhension textuelle',
      description: 'فهم النص والجواب انطلاقاً من شواهد دقيقة.',
      topicMappings: [
        { topicCode: 'READING_ANALYSIS', weight: 1, isPrimary: true },
      ],
    },
    {
      code: 'DOCUMENT_SYNTHESIS',
      name: 'Synthèse des documents',
      description: 'تلخيص وتركيب المعلومات مع الحفاظ على الفكرة الأساسية.',
      topicMappings: [
        { topicCode: 'SYNTHESIS_SUMMARY', weight: 1, isPrimary: true },
        { topicCode: 'HISTORICAL_DISCOURSE', weight: 0.6 },
      ],
    },
    {
      code: 'ARGUMENTATIVE_WRITING',
      name: 'Écriture argumentative',
      description: 'بناء موقف منظم وتوظيف الحجج والروابط بشكل واضح.',
      topicMappings: [
        { topicCode: 'ARGUMENTATIVE_DEBATE', weight: 1, isPrimary: true },
        { topicCode: 'STRUCTURED_WRITING', weight: 0.7 },
        { topicCode: 'TEXT_TYPES', weight: 0.3 },
      ],
    },
    {
      code: 'EXHORTATIVE_WRITING',
      name: 'Écriture exhortative',
      description: 'صياغة نداء أو دعوة تحترم المقام والهدف والجمهور.',
      topicMappings: [
        { topicCode: 'EXHORTATIVE_DISCOURSE', weight: 1, isPrimary: true },
        { topicCode: 'TEXT_TYPES', weight: 0.3 },
      ],
    },
    {
      code: 'GRAMMAR_ENUNCIATION_CONTROL',
      name: 'Grammaire et énonciation',
      description: 'التحكم في الضمائر والأزمنة والروابط وعلامات الخطاب.',
      topicMappings: [
        { topicCode: 'GRAMMAR_ENUNCIATION', weight: 1, isPrimary: true },
      ],
    },
    {
      code: 'REGISTER_AND_STYLE',
      name: 'Lexique et style',
      description: 'اختيار المعجم المناسب وتحسين الاتساق والأسلوب.',
      topicMappings: [
        { topicCode: 'VOCABULARY_STYLE', weight: 1, isPrimary: true },
        { topicCode: 'STRUCTURED_WRITING', weight: 0.4 },
      ],
    },
    {
      code: 'STRUCTURED_WRITING',
      name: 'Production structurée',
      description: 'تنظيم المقدمة والعرض والخاتمة مع انسجام الفقرات.',
      topicMappings: [
        { topicCode: 'STRUCTURED_WRITING', weight: 1, isPrimary: true },
        { topicCode: 'SYNTHESIS_SUMMARY', weight: 0.4 },
      ],
    },
  ],
  NATURAL_SCIENCES: [
    {
      code: 'DOCUMENT_ANALYSIS',
      name: 'تحليل الوثائق',
      description: 'استخراج المعلومات من الوثائق العلمية وربطها بالاستنتاج.',
      kind: LearningTargetKind.METHOD,
      topicMappings: [
        { topicCode: 'PROTEINS', weight: 0.6 },
        { topicCode: 'PROTEIN_SYNTHESIS', weight: 1, isPrimary: true },
        { topicCode: 'STRUCTURE_FUNCTION', weight: 0.9 },
        { topicCode: 'ENZYMES', weight: 0.8 },
        { topicCode: 'IMMUNITY', weight: 0.8 },
        { topicCode: 'NERVOUS_COMMUNICATION', weight: 0.7 },
        { topicCode: 'PHOTOSYNTHESIS', weight: 0.8 },
        { topicCode: 'RESPIRATION_FERMENTATION', weight: 0.8 },
        { topicCode: 'ENERGY_BALANCE', weight: 0.8 },
        { topicCode: 'EARTH_STRUCTURE', weight: 0.8 },
        { topicCode: 'PLATE_ACTIVITY', weight: 0.8 },
        { topicCode: 'TECTONIC_INTERPRETATION', weight: 0.8 },
      ],
    },
    {
      code: 'PROTEIN_FUNCTION_REASONING',
      name: 'الاستدلال في البروتينات',
      description: 'ربط المعلومة الوراثية ببنية البروتين ووظيفته.',
      kind: LearningTargetKind.CONCEPTUAL_UNDERSTANDING,
      topicMappings: [
        { topicCode: 'PROTEINS', weight: 1, isPrimary: true },
        { topicCode: 'PROTEIN_SYNTHESIS', weight: 1 },
        { topicCode: 'STRUCTURE_FUNCTION', weight: 1 },
        { topicCode: 'ENZYMES', weight: 0.8 },
        { topicCode: 'NERVOUS_COMMUNICATION', weight: 0.5 },
      ],
    },
    {
      code: 'GENETIC_INFORMATION_REASONING',
      name: 'استدلال المعلومة الوراثية',
      description:
        'تتبع انتقال المعلومة الوراثية من ADN إلى ARN ثم إلى سلسلة ببتيدية.',
      kind: LearningTargetKind.CONCEPTUAL_UNDERSTANDING,
      topicMappings: [
        { topicCode: 'PROTEIN_SYNTHESIS', weight: 1, isPrimary: true },
        { topicCode: 'STRUCTURE_FUNCTION', weight: 0.5 },
      ],
    },
    {
      code: 'ENZYME_ACTIVITY_REASONING',
      name: 'استدلال النشاط الإنزيمي',
      description:
        'تحليل شروط النشاط الإنزيمي والتخصص النوعي والعوامل المؤثرة فيه.',
      kind: LearningTargetKind.CONCEPTUAL_UNDERSTANDING,
      topicMappings: [{ topicCode: 'ENZYMES', weight: 1, isPrimary: true }],
    },
    {
      code: 'IMMUNITY_REASONING',
      name: 'الاستدلال في المناعة',
      description: 'تمييز الاستجابة المناعية وربط المراحل بالوثائق والرسوم.',
      kind: LearningTargetKind.CONCEPTUAL_UNDERSTANDING,
      topicMappings: [{ topicCode: 'IMMUNITY', weight: 1, isPrimary: true }],
    },
    {
      code: 'NERVOUS_COMMUNICATION_REASONING',
      name: 'استدلال الاتصال العصبي',
      description:
        'تفسير الرسائل العصبية والمشابك والكمونات والاندماج العصبي.',
      kind: LearningTargetKind.CONCEPTUAL_UNDERSTANDING,
      topicMappings: [
        { topicCode: 'NERVOUS_COMMUNICATION', weight: 1, isPrimary: true },
      ],
    },
    {
      code: 'ENERGY_PATHWAY_INTEGRATION',
      name: 'تكامل المسارات الطاقوية',
      description: 'المقارنة بين التركيب الضوئي والتنفس والحصيلة الطاقوية.',
      kind: LearningTargetKind.CONCEPTUAL_UNDERSTANDING,
      topicMappings: [
        { topicCode: 'ENERGY_TRANSFORMATIONS', weight: 1, isPrimary: true },
        { topicCode: 'PHOTOSYNTHESIS', weight: 1 },
        { topicCode: 'RESPIRATION_FERMENTATION', weight: 1 },
        { topicCode: 'ENERGY_BALANCE', weight: 1 },
      ],
    },
    {
      code: 'GEOLOGICAL_INTERPRETATION',
      name: 'التفسير الجيولوجي',
      description:
        'قراءة الخرائط والرسوم الجيولوجية وبناء تفسير تكتوني متماسك.',
      kind: LearningTargetKind.METHOD,
      topicMappings: [
        { topicCode: 'PLATE_TECTONICS', weight: 1, isPrimary: true },
        { topicCode: 'EARTH_STRUCTURE', weight: 0.8 },
        { topicCode: 'PLATE_ACTIVITY', weight: 1 },
        { topicCode: 'TECTONIC_INTERPRETATION', weight: 1 },
      ],
    },
    {
      code: 'BIOLOGICAL_DATA_INTERPRETATION',
      name: 'تفسير المعطيات البيولوجية',
      description:
        'قراءة المنحنيات والجداول والصور المجهرية وتوظيفها في البرهان.',
      kind: LearningTargetKind.VISUAL_INTERPRETATION,
      topicMappings: [
        { topicCode: 'PROTEINS', weight: 0.6 },
        { topicCode: 'ENERGY_TRANSFORMATIONS', weight: 0.6 },
        { topicCode: 'PLATE_TECTONICS', weight: 0.4 },
        { topicCode: 'IMMUNITY', weight: 0.7 },
        { topicCode: 'PHOTOSYNTHESIS', weight: 0.7 },
        { topicCode: 'RESPIRATION_FERMENTATION', weight: 0.7 },
      ],
    },
    {
      code: 'EXPERIMENTAL_REASONING',
      name: 'الاستدلال التجريبي',
      description:
        'فهم الغرض من التجربة، ضبط الشروط، تفسير النتائج، واقتراح بروتوكول.',
      kind: LearningTargetKind.METHOD,
      topicMappings: [
        { topicCode: 'PROTEINS', weight: 0.5 },
        { topicCode: 'PROTEIN_SYNTHESIS', weight: 0.8 },
        { topicCode: 'STRUCTURE_FUNCTION', weight: 0.7 },
        { topicCode: 'ENZYMES', weight: 1, isPrimary: true },
        { topicCode: 'IMMUNITY', weight: 0.7 },
        { topicCode: 'NERVOUS_COMMUNICATION', weight: 0.7 },
        { topicCode: 'PHOTOSYNTHESIS', weight: 0.9 },
        { topicCode: 'RESPIRATION_FERMENTATION', weight: 0.9 },
      ],
    },
    {
      code: 'DIAGRAM_SCHEMA_LABELING',
      name: 'قراءة وإنجاز الرسوم التخطيطية',
      description:
        'تسمية البيانات، إكمال الرسوم، وتمثيل الآليات أو البنى في مخطط علمي.',
      kind: LearningTargetKind.VISUAL_INTERPRETATION,
      topicMappings: [
        { topicCode: 'PROTEINS', weight: 0.6 },
        { topicCode: 'PROTEIN_SYNTHESIS', weight: 0.8 },
        { topicCode: 'STRUCTURE_FUNCTION', weight: 0.8 },
        { topicCode: 'ENZYMES', weight: 0.8 },
        { topicCode: 'IMMUNITY', weight: 0.9 },
        { topicCode: 'NERVOUS_COMMUNICATION', weight: 0.9 },
        { topicCode: 'PHOTOSYNTHESIS', weight: 0.8 },
        { topicCode: 'RESPIRATION_FERMENTATION', weight: 0.7 },
        { topicCode: 'PLATE_TECTONICS', weight: 0.8 },
      ],
    },
    {
      code: 'MECHANISM_EXPLANATION',
      name: 'شرح الآليات العلمية',
      description:
        'بناء تفسير سببي متسلسل لآلية بيولوجية أو جيولوجية اعتمادا على المعطيات والمعارف.',
      kind: LearningTargetKind.CONCEPTUAL_UNDERSTANDING,
      topicMappings: [
        { topicCode: 'PROTEINS', weight: 0.6 },
        { topicCode: 'PROTEIN_SYNTHESIS', weight: 0.8 },
        { topicCode: 'STRUCTURE_FUNCTION', weight: 0.8 },
        { topicCode: 'ENZYMES', weight: 0.8 },
        { topicCode: 'IMMUNITY', weight: 0.9 },
        { topicCode: 'NERVOUS_COMMUNICATION', weight: 0.9 },
        { topicCode: 'PHOTOSYNTHESIS', weight: 0.8 },
        { topicCode: 'RESPIRATION_FERMENTATION', weight: 0.8 },
        { topicCode: 'ENERGY_BALANCE', weight: 0.7 },
        { topicCode: 'PLATE_ACTIVITY', weight: 0.8 },
        { topicCode: 'TECTONIC_INTERPRETATION', weight: 0.9 },
      ],
    },
    {
      code: 'SCIENTIFIC_ARGUMENTATION',
      name: 'الاستدلال والبرهنة العلمية',
      description:
        'تعليل الإجابة، تبرير الاستنتاج، الحكم على فرضية، أو تحرير نص علمي منظم.',
      kind: LearningTargetKind.BAC_MARKING_PATTERN,
      topicMappings: [
        { topicCode: 'PROTEINS', weight: 0.7 },
        { topicCode: 'ENERGY_TRANSFORMATIONS', weight: 0.7 },
        { topicCode: 'PLATE_TECTONICS', weight: 0.7 },
        { topicCode: 'STRUCTURE_FUNCTION', weight: 0.8 },
        { topicCode: 'IMMUNITY', weight: 0.8 },
        { topicCode: 'NERVOUS_COMMUNICATION', weight: 0.8 },
        { topicCode: 'TECTONIC_INTERPRETATION', weight: 0.8 },
      ],
    },
    {
      code: 'CALCULATION_QUANTIFICATION',
      name: 'الحساب والتكميم العلمي',
      description:
        'حساب قيم أو نسب أو أعداد أو سرعات انطلاقا من معطيات علمية.',
      kind: LearningTargetKind.FORMULA_APPLICATION,
      topicMappings: [
        { topicCode: 'PROTEIN_SYNTHESIS', weight: 0.6 },
        { topicCode: 'STRUCTURE_FUNCTION', weight: 0.5 },
        { topicCode: 'ENERGY_BALANCE', weight: 0.8 },
        { topicCode: 'EARTH_STRUCTURE', weight: 0.7 },
        { topicCode: 'PLATE_ACTIVITY', weight: 0.8 },
      ],
    },
  ],
  PHYSICS: [
    {
      code: 'EXPERIMENTAL_MODELING',
      name: 'النمذجة التجريبية',
      description:
        'اختيار النموذج المناسب وقراءة المعطيات والمنحنيات الفيزيائية.',
      topicMappings: [
        { topicCode: 'CHEMICAL_TRANSFORMATIONS', weight: 0.5 },
        { topicCode: 'ELECTRICITY', weight: 0.6 },
        { topicCode: 'MECHANICS', weight: 0.6 },
        { topicCode: 'OSCILLATIONS', weight: 0.6 },
        { topicCode: 'DIFFUSION', weight: 0.6 },
      ],
    },
    {
      code: 'CHEMICAL_TRANSFORMATION_REASONING',
      name: 'الاستدلال في التحولات الكيميائية',
      description: 'تتبع تطور النظام الكيميائي وتفسير السرعة والعوامل المؤثرة.',
      topicMappings: [
        { topicCode: 'CHEMICAL_TRANSFORMATIONS', weight: 1, isPrimary: true },
        { topicCode: 'CHEMICAL_KINETICS', weight: 1 },
      ],
    },
    {
      code: 'EQUILIBRIUM_REASONING',
      name: 'الاستدلال في التوازن',
      description: 'فهم حالة التوازن والتمييز بين التحول التلقائي والموجه.',
      topicMappings: [
        { topicCode: 'CHEMICAL_EQUILIBRIUM', weight: 1, isPrimary: true },
        { topicCode: 'FORCED_TRANSFORMATIONS', weight: 0.9 },
      ],
    },
    {
      code: 'CIRCUIT_TRANSIENT_ANALYSIS',
      name: 'تحليل الدارات الزمنية',
      description: 'دراسة دارات RC وRL من خلال المنحنيات والثابت الزمني.',
      topicMappings: [
        { topicCode: 'ELECTRICITY', weight: 1, isPrimary: true },
        { topicCode: 'RC_RL_CIRCUITS', weight: 1 },
      ],
    },
    {
      code: 'MECHANICS_REASONING',
      name: 'الاستدلال في الميكانيك',
      description: 'توظيف القوانين الأساسية والطاقة والحركة في حل التمارين.',
      topicMappings: [{ topicCode: 'MECHANICS', weight: 1, isPrimary: true }],
    },
    {
      code: 'OSCILLATION_ANALYSIS',
      name: 'تحليل الاهتزازات',
      description: 'تمييز النظام المهتز وقراءة الدور والطاقة والتخامد.',
      topicMappings: [
        { topicCode: 'OSCILLATIONS', weight: 1, isPrimary: true },
        { topicCode: 'RLC_OSCILLATIONS', weight: 1 },
      ],
    },
    {
      code: 'NUCLEAR_ENERGY_REASONING',
      name: 'التحولات النووية والطاقة',
      description: 'استعمال علاقات الانحفاظ وربطها بالطاقة المنبعثة.',
      topicMappings: [
        { topicCode: 'NUCLEAR_TRANSFORMATIONS', weight: 1, isPrimary: true },
      ],
    },
    {
      code: 'WAVE_INTERPRETATION',
      name: 'تفسير الظواهر الموجية',
      description: 'قراءة انتشار الموجات والتداخل والحيود انطلاقاً من التجارب.',
      topicMappings: [
        { topicCode: 'DIFFUSION', weight: 1, isPrimary: true },
        { topicCode: 'WAVE_PROPAGATION', weight: 1 },
        { topicCode: 'INTERFERENCE_DIFFRACTION', weight: 1 },
      ],
    },
  ],
  HISTORY_GEOGRAPHY: [
    {
      code: 'HISTORICAL_TIMELINE_REASONING',
      name: 'التسلسل الزمني',
      description: 'ترتيب الأحداث وربط المراحل التاريخية بسياقها.',
      topicMappings: [
        { topicCode: 'HISTORY_FOUNDATIONS', weight: 0.6 },
        { topicCode: 'ISLAMIC_WORLD_1453_1914', weight: 1, isPrimary: true },
        { topicCode: 'ALGERIA_OTTOMAN_1515_1830', weight: 1 },
        { topicCode: 'EUROPE_TRANSFORMATIONS_1453_1914', weight: 0.9 },
        { topicCode: 'IMPERIALISM_NATIONALISM', weight: 0.8 },
        { topicCode: 'ALGERIA_CONTEMPORARY_HISTORY', weight: 0.6 },
        { topicCode: 'COLONIAL_ALGERIA_1830_1954', weight: 1 },
        { topicCode: 'ALGERIAN_REVOLUTION_1954_1962', weight: 1 },
        { topicCode: 'DECOLONIZATION_COLD_WAR', weight: 0.9 },
      ],
    },
    {
      code: 'HISTORICAL_DOCUMENT_ANALYSIS',
      name: 'تحليل الوثيقة التاريخية',
      description: 'استخراج المعطيات من الوثائق وبناء جواب تاريخي منظم.',
      topicMappings: [
        { topicCode: 'HISTORY_DOCUMENT_METHOD', weight: 1, isPrimary: true },
        { topicCode: 'HISTORY_FOUNDATIONS', weight: 0.5 },
        { topicCode: 'ALGERIA_CONTEMPORARY_HISTORY', weight: 0.5 },
        { topicCode: 'ALGERIAN_REVOLUTION_1954_1962', weight: 0.6 },
      ],
    },
    {
      code: 'STRUCTURED_HISTORY_WRITING',
      name: 'الكتابة التاريخية المنظمة',
      description: 'تنظيم الجواب التاريخي وربط الفكرة بالحجة والمثال.',
      topicMappings: [
        { topicCode: 'HISTORY_FOUNDATIONS', weight: 0.6 },
        {
          topicCode: 'ALGERIA_CONTEMPORARY_HISTORY',
          weight: 1,
          isPrimary: true,
        },
        { topicCode: 'COLONIAL_ALGERIA_1830_1954', weight: 0.8 },
        { topicCode: 'ALGERIAN_REVOLUTION_1954_1962', weight: 1 },
        { topicCode: 'DECOLONIZATION_COLD_WAR', weight: 0.8 },
      ],
    },
    {
      code: 'MAP_AND_LEGEND_READING',
      name: 'قراءة الخرائط والمفتاح',
      description: 'استعمال الخرائط والاتجاهات والمقياس والمفتاح في الجغرافيا.',
      topicMappings: [
        { topicCode: 'GEOGRAPHY_TOOLS_METHODS', weight: 1, isPrimary: true },
        { topicCode: 'GEOGRAPHY_GLOBAL_SYSTEMS', weight: 0.5 },
        { topicCode: 'GEOGRAPHY_REGIONAL_CASES', weight: 0.5 },
        { topicCode: 'ALGERIA_GEO_POSITION', weight: 0.5 },
      ],
    },
    {
      code: 'GEOGRAPHIC_DATA_INTERPRETATION',
      name: 'تفسير المعطيات الجغرافية',
      description: 'قراءة الجداول والرسوم والمؤشرات وربطها بالمجال الجغرافي.',
      topicMappings: [
        { topicCode: 'DEVELOPMENT_INDICATORS', weight: 1, isPrimary: true },
        { topicCode: 'GLOBAL_FLOWS', weight: 0.9 },
        { topicCode: 'ECONOMIC_POWERS', weight: 0.8 },
        { topicCode: 'ALGERIA_WORLD_ECONOMY', weight: 0.8 },
        { topicCode: 'ALGERIA_REGIONAL_DISPARITIES', weight: 0.8 },
      ],
    },
    {
      code: 'REGIONAL_CASE_STUDY_REASONING',
      name: 'الاستدلال في الدراسات الإقليمية',
      description:
        'مقارنة الحالات الإقليمية وربط العوامل السكانية والاقتصادية والبيئية.',
      topicMappings: [
        { topicCode: 'GEOGRAPHY_REGIONAL_CASES', weight: 1, isPrimary: true },
        { topicCode: 'EAST_SOUTHEAST_ASIA', weight: 1 },
        { topicCode: 'INDIA_DEVELOPMENT', weight: 1 },
        { topicCode: 'BRAZIL_DEVELOPMENT', weight: 1 },
        { topicCode: 'ALGERIA_MEDITERRANEAN', weight: 0.7 },
      ],
    },
  ],
  PHILOSOPHY: [
    {
      code: 'PROBLEMATIZATION',
      name: 'بناء الإشكالية',
      description: 'تحويل السؤال الفلسفي إلى إشكال واضح يقود بناء المقال.',
      topicMappings: [
        { topicCode: 'KNOWLEDGE_AND_SCIENCE', weight: 0.5 },
        { topicCode: 'HUMAN_SELF', weight: 0.5 },
        { topicCode: 'VALUES_AND_SOCIETY', weight: 0.5 },
      ],
    },
    {
      code: 'CONCEPT_DEFINITION',
      name: 'ضبط المفاهيم',
      description: 'تعريف المفاهيم المركزية والتمييز بينها بدقة.',
      topicMappings: [
        { topicCode: 'KNOWLEDGE_PERCEPTION', weight: 1, isPrimary: true },
        { topicCode: 'SCIENCE_METHOD', weight: 0.8 },
        { topicCode: 'CONSCIOUSNESS_MIND', weight: 0.8 },
        { topicCode: 'FREEDOM_DETERMINISM', weight: 0.8 },
        { topicCode: 'ETHICS_RESPONSIBILITY', weight: 0.8 },
        { topicCode: 'POLITICS_STATE', weight: 0.8 },
        { topicCode: 'LANGUAGE_TRUTH', weight: 0.8 },
      ],
    },
    {
      code: 'STRUCTURED_ESSAY_PLANNING',
      name: 'تخطيط المقال الفلسفي',
      description: 'تنظيم المقدمة والعرض والخاتمة وفق تسلسل منطقي واضح.',
      topicMappings: [
        { topicCode: 'KNOWLEDGE_AND_SCIENCE', weight: 0.7 },
        { topicCode: 'HUMAN_SELF', weight: 0.7 },
        { topicCode: 'VALUES_AND_SOCIETY', weight: 0.7 },
      ],
    },
    {
      code: 'ARGUMENT_WITH_EXAMPLES',
      name: 'بناء الحجة والأمثلة',
      description: 'تدعيم الموقف بأفكار مترابطة وأمثلة مناسبة دون حشو.',
      topicMappings: [
        { topicCode: 'KNOWLEDGE_PERCEPTION', weight: 0.8 },
        { topicCode: 'SCIENCE_METHOD', weight: 0.8 },
        { topicCode: 'CONSCIOUSNESS_MIND', weight: 0.8 },
        { topicCode: 'FREEDOM_DETERMINISM', weight: 0.8 },
        { topicCode: 'ETHICS_RESPONSIBILITY', weight: 0.8 },
        { topicCode: 'POLITICS_STATE', weight: 0.8 },
        { topicCode: 'LANGUAGE_TRUTH', weight: 0.8 },
      ],
    },
    {
      code: 'COUNTERARGUMENT',
      name: 'المناقشة والاعتراض',
      description: 'عرض الرأي المخالف ومناقشته من دون إضعاف الموقف النهائي.',
      topicMappings: [
        { topicCode: 'KNOWLEDGE_AND_SCIENCE', weight: 0.6 },
        { topicCode: 'HUMAN_SELF', weight: 0.6 },
        { topicCode: 'VALUES_AND_SOCIETY', weight: 0.6 },
      ],
    },
    {
      code: 'COHERENT_CONCLUSION',
      name: 'الخاتمة المنسجمة',
      description: 'إنهاء المقال بخلاصة تجيب عن الإشكال بوضوح واتزان.',
      topicMappings: [
        { topicCode: 'KNOWLEDGE_AND_SCIENCE', weight: 0.5 },
        { topicCode: 'HUMAN_SELF', weight: 0.5 },
        { topicCode: 'VALUES_AND_SOCIETY', weight: 0.5 },
      ],
    },
  ],
  ECONOMICS_MANAGEMENT: [
    {
      code: 'ECONOMIC_CONCEPTS',
      name: 'المفاهيم الاقتصادية',
      description:
        'استعمال المفاهيم الأساسية بدقة داخل الأسئلة التعريفية والتطبيقية.',
      topicMappings: [
        { topicCode: 'MONEY', weight: 0.8 },
        { topicCode: 'MARKET_PRICES', weight: 0.8 },
        { topicCode: 'BANKING_SYSTEM', weight: 0.8 },
      ],
    },
    {
      code: 'MARKET_REASONING',
      name: 'الاستدلال في السوق والأسعار',
      description: 'فهم تشكل الأسعار وتأثير العرض والطلب على السوق.',
      topicMappings: [
        { topicCode: 'MARKET_PRICES', weight: 1, isPrimary: true },
      ],
    },
    {
      code: 'BANKING_FINANCING_REASONING',
      name: 'النقود والتمويل',
      description: 'تحليل دور النقود والبنوك ووسائل التمويل في الاقتصاد.',
      topicMappings: [
        { topicCode: 'MONEY', weight: 1, isPrimary: true },
        { topicCode: 'BANKING_SYSTEM', weight: 1 },
        { topicCode: 'EXCHANGE', weight: 0.6 },
      ],
    },
    {
      code: 'MACRO_INDICATOR_INTERPRETATION',
      name: 'تفسير المؤشرات الاقتصادية',
      description: 'قراءة البطالة والتضخم وبقية المؤشرات وربطها بالوضع العام.',
      topicMappings: [
        { topicCode: 'UNEMPLOYMENT', weight: 1, isPrimary: true },
        { topicCode: 'INFLATION', weight: 1 },
      ],
    },
    {
      code: 'ENTERPRISE_MANAGEMENT_CASES',
      name: 'حالات التسيير في المؤسسة',
      description:
        'تحليل وضعيات المؤسسة من خلال القيادة والتحفيز والاتصال والرقابة.',
      topicMappings: [
        { topicCode: 'LEADERSHIP_MOTIVATION', weight: 1, isPrimary: true },
        { topicCode: 'COMMUNICATION', weight: 0.9 },
        { topicCode: 'CONTROL', weight: 0.9 },
      ],
    },
    {
      code: 'TRADE_AND_EXCHANGE_REASONING',
      name: 'التجارة الخارجية والصرف',
      description: 'فهم المبادلات الخارجية وآثار سعر الصرف على الاقتصاد.',
      topicMappings: [
        { topicCode: 'FOREIGN_TRADE', weight: 1, isPrimary: true },
        { topicCode: 'EXCHANGE', weight: 0.8 },
      ],
    },
  ],
  ACCOUNTING_FINANCE: [
    {
      code: 'YEAR_END_ADJUSTMENTS',
      name: 'تسويات نهاية السنة',
      description: 'ضبط الحسابات الختامية ومعالجة قيود نهاية الدورة.',
      topicMappings: [
        { topicCode: 'YEAR_END_WORK', weight: 1, isPrimary: true },
        { topicCode: 'OTHER_ASSET_ADJUSTMENTS', weight: 0.8 },
      ],
    },
    {
      code: 'DEPRECIATION_AND_PROVISIONS',
      name: 'الاهتلاكات والمؤونات',
      description: 'معالجة الاهتلاكات والمؤونات وقراءة أثرها المحاسبي.',
      topicMappings: [
        { topicCode: 'DEPRECIATION_IMPAIRMENT', weight: 1, isPrimary: true },
        { topicCode: 'PROVISIONS', weight: 0.9 },
      ],
    },
    {
      code: 'BANKING_AND_TREASURY_RECONCILIATION',
      name: 'العمليات المصرفية والخزينة',
      description: 'تسوية العمليات البنكية ومتابعة وضعية الخزينة.',
      topicMappings: [
        {
          topicCode: 'BANKING_OPERATIONS_RECONCILIATION',
          weight: 1,
          isPrimary: true,
        },
      ],
    },
    {
      code: 'FINANCIAL_STATEMENT_READING',
      name: 'قراءة القوائم المالية',
      description: 'فهم حسابات النتائج والميزانية وتحويلها إلى مؤشرات مفيدة.',
      topicMappings: [
        { topicCode: 'INCOME_STATEMENT_BY_NATURE', weight: 1, isPrimary: true },
        { topicCode: 'INCOME_STATEMENT_BY_FUNCTION', weight: 1 },
        { topicCode: 'FUNCTIONAL_BALANCE_SHEET', weight: 1 },
      ],
    },
    {
      code: 'COST_ACCOUNTING_ANALYSIS',
      name: 'المحاسبة التحليلية',
      description: 'تحليل التكاليف واستعمالها في اتخاذ القرار.',
      topicMappings: [
        { topicCode: 'COST_ACCOUNTING', weight: 1, isPrimary: true },
      ],
    },
    {
      code: 'INVESTMENT_AND_FINANCING_REASONING',
      name: 'التمويل والاستثمار',
      description: 'تقييم القروض واختيار المشاريع الاستثمارية بشكل منظم.',
      topicMappings: [
        {
          topicCode: 'LOANS_INVESTMENT_PROJECT_CHOICE',
          weight: 1,
          isPrimary: true,
        },
      ],
    },
  ],
  LAW: [
    {
      code: 'LEGAL_DEFINITIONS',
      name: 'تعريف المفاهيم القانونية',
      description: 'ضبط المصطلحات القانونية الأساسية بصياغة دقيقة.',
      topicMappings: [
        { topicCode: 'SALE_CONTRACT', weight: 0.5 },
        { topicCode: 'COMPANY_CONTRACT', weight: 0.5 },
        { topicCode: 'GENERAL_PARTNERSHIP', weight: 0.5 },
      ],
    },
    {
      code: 'CONTRACT_REASONING',
      name: 'الاستدلال في العقود',
      description: 'تحليل أركان العقد وآثاره في الوضعيات التطبيقية.',
      topicMappings: [
        { topicCode: 'SALE_CONTRACT', weight: 1, isPrimary: true },
        { topicCode: 'COMPANY_CONTRACT', weight: 0.9 },
      ],
    },
    {
      code: 'COMPANY_LAW_REASONING',
      name: 'قانون الشركات',
      description: 'تمييز أشكال الشركات واستنتاج آثارها القانونية.',
      topicMappings: [
        { topicCode: 'GENERAL_PARTNERSHIP', weight: 1, isPrimary: true },
        { topicCode: 'COMPANY_CONTRACT', weight: 0.8 },
      ],
    },
    {
      code: 'LABOR_LAW_APPLICATION',
      name: 'تطبيق قانون العمل',
      description:
        'تحليل علاقات العمل الفردية والجماعية وفق القاعدة القانونية.',
      topicMappings: [
        { topicCode: 'INDIVIDUAL_LABOR_RELATIONS', weight: 1, isPrimary: true },
        { topicCode: 'COLLECTIVE_LABOR_RELATIONS', weight: 1 },
      ],
    },
    {
      code: 'PUBLIC_FINANCE_AND_TAX_REASONING',
      name: 'المالية العامة والجباية',
      description: 'ربط قانون المالية بالضرائب والرسوم وتطبيقاتها.',
      topicMappings: [
        { topicCode: 'STATE_BUDGET_FINANCE_LAW', weight: 1, isPrimary: true },
        { topicCode: 'TAXES_FEES', weight: 0.9 },
        { topicCode: 'GROSS_INCOME_TAX', weight: 0.9 },
        { topicCode: 'VAT', weight: 0.9 },
      ],
    },
  ],
};

const NATURAL_SCIENCES_M_LEARNING_TARGETS: LearningTargetDefinition[] = [
  {
    code: 'DOCUMENT_ANALYSIS',
    name: 'تحليل الوثائق',
    description: 'استخراج المعلومات من الوثائق العلمية وربطها بالاستنتاج.',
    kind: LearningTargetKind.METHOD,
    topicMappings: [
      { topicCode: 'PROTEINS', weight: 0.6 },
      { topicCode: 'PROTEIN_SYNTHESIS', weight: 1, isPrimary: true },
      { topicCode: 'STRUCTURE_FUNCTION', weight: 0.9 },
      { topicCode: 'IMMUNITY', weight: 0.8 },
    ],
  },
  {
    code: 'PROTEIN_FUNCTION_REASONING',
    name: 'الاستدلال في البروتينات',
    description: 'ربط المعلومة الوراثية ببنية البروتين ووظيفته.',
    kind: LearningTargetKind.CONCEPTUAL_UNDERSTANDING,
    topicMappings: [
      { topicCode: 'PROTEINS', weight: 1, isPrimary: true },
      { topicCode: 'PROTEIN_SYNTHESIS', weight: 1 },
      { topicCode: 'STRUCTURE_FUNCTION', weight: 1 },
    ],
  },
  {
    code: 'GENETIC_INFORMATION_REASONING',
    name: 'استدلال المعلومة الوراثية',
    description:
      'تتبع انتقال المعلومة الوراثية من ADN إلى ARN ثم إلى سلسلة ببتيدية.',
    kind: LearningTargetKind.CONCEPTUAL_UNDERSTANDING,
    topicMappings: [
      { topicCode: 'PROTEIN_SYNTHESIS', weight: 1, isPrimary: true },
      { topicCode: 'STRUCTURE_FUNCTION', weight: 0.5 },
    ],
  },
  {
    code: 'IMMUNITY_REASONING',
    name: 'الاستدلال في المناعة',
    description: 'تمييز الاستجابة المناعية وربط المراحل بالوثائق والرسوم.',
    kind: LearningTargetKind.CONCEPTUAL_UNDERSTANDING,
    topicMappings: [{ topicCode: 'IMMUNITY', weight: 1, isPrimary: true }],
  },
  {
    code: 'BIOLOGICAL_DATA_INTERPRETATION',
    name: 'تفسير المعطيات البيولوجية',
    description:
      'قراءة المنحنيات والجداول والصور المجهرية وتوظيفها في البرهان.',
    kind: LearningTargetKind.VISUAL_INTERPRETATION,
    topicMappings: [
      { topicCode: 'PROTEINS', weight: 0.6 },
      { topicCode: 'IMMUNITY', weight: 0.7 },
    ],
  },
  {
    code: 'EXPERIMENTAL_REASONING',
    name: 'الاستدلال التجريبي',
    description:
      'فهم الغرض من التجربة، ضبط الشروط، تفسير النتائج، واقتراح بروتوكول.',
    kind: LearningTargetKind.METHOD,
    topicMappings: [
      { topicCode: 'PROTEINS', weight: 0.6 },
      { topicCode: 'PROTEIN_SYNTHESIS', weight: 0.8, isPrimary: true },
      { topicCode: 'STRUCTURE_FUNCTION', weight: 0.7 },
      { topicCode: 'IMMUNITY', weight: 0.7 },
    ],
  },
  {
    code: 'DIAGRAM_SCHEMA_LABELING',
    name: 'قراءة وإنجاز الرسوم التخطيطية',
    description:
      'تسمية البيانات، إكمال الرسوم، وتمثيل الآليات أو البنى في مخطط علمي.',
    kind: LearningTargetKind.VISUAL_INTERPRETATION,
    topicMappings: [
      { topicCode: 'PROTEINS', weight: 0.6 },
      { topicCode: 'PROTEIN_SYNTHESIS', weight: 0.8 },
      { topicCode: 'STRUCTURE_FUNCTION', weight: 0.8 },
      { topicCode: 'IMMUNITY', weight: 0.9, isPrimary: true },
    ],
  },
  {
    code: 'MECHANISM_EXPLANATION',
    name: 'شرح الآليات العلمية',
    description:
      'بناء تفسير سببي متسلسل لآلية بيولوجية اعتمادا على المعطيات والمعارف.',
    kind: LearningTargetKind.CONCEPTUAL_UNDERSTANDING,
    topicMappings: [
      { topicCode: 'PROTEINS', weight: 0.6 },
      { topicCode: 'PROTEIN_SYNTHESIS', weight: 0.8 },
      { topicCode: 'STRUCTURE_FUNCTION', weight: 0.8 },
      { topicCode: 'IMMUNITY', weight: 0.9, isPrimary: true },
    ],
  },
  {
    code: 'SCIENTIFIC_ARGUMENTATION',
    name: 'الاستدلال والبرهنة العلمية',
    description:
      'تعليل الإجابة، تبرير الاستنتاج، الحكم على فرضية، أو تحرير نص علمي منظم.',
    kind: LearningTargetKind.BAC_MARKING_PATTERN,
    topicMappings: [
      { topicCode: 'PROTEINS', weight: 0.7, isPrimary: true },
      { topicCode: 'STRUCTURE_FUNCTION', weight: 0.8 },
      { topicCode: 'IMMUNITY', weight: 0.8 },
    ],
  },
  {
    code: 'CALCULATION_QUANTIFICATION',
    name: 'الحساب والتكميم العلمي',
    description:
      'حساب قيم أو نسب أو أعداد انطلاقا من معطيات علمية.',
    kind: LearningTargetKind.FORMULA_APPLICATION,
    topicMappings: [
      { topicCode: 'PROTEIN_SYNTHESIS', weight: 0.6, isPrimary: true },
      { topicCode: 'STRUCTURE_FUNCTION', weight: 0.5 },
    ],
  },
  {
    code: 'ENVIRONMENTAL_DOCUMENT_ANALYSIS',
    name: 'تحليل وثائق الإنسان والكوكب',
    description:
      'قراءة وثائق التلوث الجوي والمائي وربطها بأثر الإنسان على الوسط.',
    kind: LearningTargetKind.METHOD,
    topicMappings: [
      {
        topicCode: 'HUMAN_AND_PLANET_MANAGEMENT',
        weight: 1,
        isPrimary: true,
      },
      { topicCode: 'AIR_POLLUTION', weight: 1 },
      { topicCode: 'WATER_POLLUTION', weight: 1 },
    ],
  },
];

const PLATFORM_FLASHCARD_DECKS: PlatformFlashcardDeckDefinition[] = [
  {
    code: 'MATHEMATICS_FUNCTIONS_PRE_EXAM',
    subjectCode: 'MATHEMATICS',
    title: 'الدوال قبل الامتحان',
    description:
      'بطاقات منصة لتثبيت قراءة الدوال والنهايات والمشتقات قبل التدريب.',
    cards: [
      {
        code: 'FUNCTION_ROOT_FROM_GRAPH',
        curriculumNodeCode: 'FUNCTIONS',
        learningTargetCode: 'FUNCTION_ANALYSIS',
        front: 'كيف تقرأ جذر الدالة من البيان؟',
        back: 'الجذر هو فاصلة نقطة تقاطع المنحنى مع محور الفواصل، أي حيث f(x)=0.',
      },
      {
        code: 'DERIVATIVE_SIGN_VARIATION',
        curriculumNodeCode: 'DERIVATIVES',
        learningTargetCode: 'DERIVATIVE_APPLICATIONS',
        front: "ماذا تعني إشارة f'(x) في جدول التغيرات؟",
        back: "إذا كانت f'(x) موجبة فالدالة متزايدة، وإذا كانت سالبة فالدالة متناقصة. تغيّر الإشارة حول قيمة حرجة قد يدل على قيمة قصوى.",
      },
      {
        code: 'LIMIT_HORIZONTAL_ASYMPTOTE',
        curriculumNodeCode: 'LIMITS_CONTINUITY',
        learningTargetCode: 'LIMIT_REASONING',
        front: 'متى نستنتج وجود مقارب أفقي؟',
        back: 'إذا كانت نهاية f(x) عندما يكبر x أو يصغر بلا حد تساوي عدداً حقيقياً L، فالمستقيم y=L مقارب أفقي.',
      },
      {
        code: 'EXPONENTIAL_ALWAYS_POSITIVE',
        curriculumNodeCode: 'EXPONENTIAL',
        learningTargetCode: 'EXPONENTIAL_REASONING',
        front: 'ما الخاصية التي لا تنساها عن e^x؟',
        back: 'e^x موجب دائماً لكل عدد حقيقي x، لذلك لا يغيّر إشارة عبارة مضروبة فيه.',
      },
    ],
  },
];

const MATH_PROBABILITY_WORKBENCH_PRESETS = [
  {
    id: 'conditional-tree-two-stage-draw',
    title: 'شجرة الاحتمالات في سحب على مرحلتين',
    subtitle: 'إكمال شجرة احتمالات ثم استخراج احتمال تقاطع واحتمال شرطي.',
    bacContext:
      'نمط متكرر في BAC رياضيات، خاصة شعبة العلوم التجريبية: نقل شجرة احتمالات ناقصة، إكمال الفروع، ثم استعمالها لحساب احتمال حدث مركب أو احتمال شرطي.',
    sourceHint:
      'مستوحى من مواضيع رياضيات 2025 حيث يطلب من الطالب: انقل وأكمل شجرة الاحتمالات المقابلة.',
    tree: {
      title: 'شجرة تجربة سحب كرتين تباعا',
      direction: 'rtl',
      root: {
        id: 'start',
        label: 'البداية',
        children: [
          {
            id: 'a',
            label: 'A',
            edgeLabel: 'A',
            probability: null,
            answerCell: { rowId: 'p-a', columnId: 'value' },
            children: [
              {
                id: 'a-b',
                label: 'B',
                edgeLabel: 'B',
                probability: null,
                answerCell: { rowId: 'p-b-given-a', columnId: 'value' },
              },
              {
                id: 'a-not-b',
                label: 'B̄',
                edgeLabel: 'B̄',
                probability: '9/10',
              },
            ],
          },
          {
            id: 'not-a',
            label: 'Ā',
            edgeLabel: 'Ā',
            probability: null,
            answerCell: { rowId: 'p-not-a', columnId: 'value' },
            children: [
              {
                id: 'not-a-b',
                label: 'B',
                edgeLabel: 'B',
                probability: '1/5',
              },
              {
                id: 'not-a-not-b',
                label: 'B̄',
                edgeLabel: 'B̄',
                probability: null,
                answerCell: {
                  rowId: 'p-not-b-given-not-a',
                  columnId: 'value',
                },
              },
            ],
          },
        ],
      },
    },
    table: {
      title: 'خلايا الإكمال والحساب',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
      ],
      rows: [
        { id: 'p-a', label: 'P(A)', cells: { item: 'P(A)', value: null } },
        { id: 'p-not-a', label: 'P(Ā)', cells: { item: 'P(Ā)', value: null } },
        {
          id: 'p-b-given-a',
          label: 'P(B/A)',
          cells: { item: 'P(B/A)', value: null },
        },
        {
          id: 'p-not-b-given-not-a',
          label: 'P(B̄/Ā)',
          cells: { item: 'P(B̄/Ā)', value: null },
        },
        {
          id: 'p-a-and-b',
          label: 'P(A∩B)',
          cells: { item: 'P(A∩B)', value: null },
        },
      ],
    },
    expectedCells: [
      {
        rowId: 'p-a',
        columnId: 'value',
        expectedValue: 0.4,
        tolerance: 0.005,
        acceptedText: ['2/5', '0,4'],
      },
      {
        rowId: 'p-not-a',
        columnId: 'value',
        expectedValue: 0.6,
        tolerance: 0.005,
        acceptedText: ['3/5', '0,6'],
      },
      {
        rowId: 'p-b-given-a',
        columnId: 'value',
        expectedValue: 0.1,
        tolerance: 0.005,
        acceptedText: ['1/10', '0,1'],
      },
      {
        rowId: 'p-not-b-given-not-a',
        columnId: 'value',
        expectedValue: 0.8,
        tolerance: 0.005,
        acceptedText: ['4/5', '0,8'],
      },
      {
        rowId: 'p-a-and-b',
        columnId: 'value',
        expectedValue: 0.04,
        tolerance: 0.005,
        acceptedText: ['1/25', '0,04'],
      },
    ],
    prompt: {
      title: 'أكمل الشجرة ثم احسب احتمال A∩B.',
      task: 'املأ الاحتمالات الناقصة في الشجرة والجدول، ثم اكتب جملة قصيرة تشرح استعمال قاعدة ضرب الاحتمالات.',
      requiredConclusionKeywords: ['P(A∩B)', 'P(A)', 'P(B/A)', 'ضرب'],
      scaffoldPhrases: [
        'نستعمل قاعدة ضرب الاحتمالات على فرع الشجرة.',
        'P(A∩B)=P(A)×P(B/A).',
        'إذن P(A∩B)=2/5×1/10=1/25.',
      ],
    },
  },
  {
    id: 'probability-law-expected-value',
    title: 'قانون احتمال متغير عشوائي',
    subtitle: 'ملء جدول قانون احتمال ثم حساب الأمل الرياضي.',
    bacContext:
      'تظهر في مواضيع الرياضيات أسئلة حول متغير عشوائي X: تحديد قيمه، ملء قانون الاحتمال، ثم حساب E(X) لتفسير ربح أو عدد كرات أو نتيجة لعبة.',
    sourceHint:
      'مستوحى من تمارين BAC 2025 التي تجمع بين جدول قانون احتمال وحساب الأمل الرياضي.',
    table: {
      title: 'قانون احتمال X',
      columns: [
        { id: 'x', label: 'قيمة X' },
        { id: 'probability', label: 'P(X=x)' },
        { id: 'weighted', label: 'x × P(X=x)' },
      ],
      rows: [
        { id: 'x0', label: 'X = 0', cells: { x: 0, probability: null, weighted: null } },
        { id: 'x1', label: 'X = 1', cells: { x: 1, probability: null, weighted: null } },
        { id: 'x2', label: 'X = 2', cells: { x: 2, probability: null, weighted: null } },
        {
          id: 'expectation',
          label: 'E(X)',
          cells: { x: 'E(X)', probability: '', weighted: null },
        },
      ],
    },
    expectedCells: [
      {
        rowId: 'x0',
        columnId: 'probability',
        expectedValue: 0.2,
        tolerance: 0.005,
        acceptedText: ['1/5', '0,2'],
      },
      {
        rowId: 'x1',
        columnId: 'probability',
        expectedValue: 0.5,
        tolerance: 0.005,
        acceptedText: ['1/2', '0,5'],
      },
      {
        rowId: 'x2',
        columnId: 'probability',
        expectedValue: 0.3,
        tolerance: 0.005,
        acceptedText: ['3/10', '0,3'],
      },
      {
        rowId: 'x0',
        columnId: 'weighted',
        expectedValue: 0,
        tolerance: 0.005,
        acceptedText: ['0'],
      },
      {
        rowId: 'x1',
        columnId: 'weighted',
        expectedValue: 0.5,
        tolerance: 0.005,
        acceptedText: ['1/2', '0,5'],
      },
      {
        rowId: 'x2',
        columnId: 'weighted',
        expectedValue: 0.6,
        tolerance: 0.005,
        acceptedText: ['3/5', '0,6'],
      },
      {
        rowId: 'expectation',
        columnId: 'weighted',
        expectedValue: 1.1,
        tolerance: 0.005,
        acceptedText: ['11/10', '1,1'],
      },
    ],
    prompt: {
      title: 'أتمم قانون احتمال X واحسب E(X).',
      task: 'املأ خلايا الاحتمال والمساهمة، ثم اكتب جملة تشرح أن الأمل الرياضي هو مجموع x×P(X=x).',
      requiredConclusionKeywords: ['E(X)', 'مجموع', 'x×P', '1.1'],
      scaffoldPhrases: [
        'نتحقق أولا أن مجموع الاحتمالات يساوي 1.',
        'نحسب كل مساهمة بالجداء x×P(X=x).',
        'إذن E(X)=0×1/5+1×1/2+2×3/10=1.1.',
      ],
    },
  },
];

const MATH_SEQUENCES_WORKBENCH_PRESETS = [
  {
    id: 'affine-recurrence-fixed-point',
    title: 'متتالية تراجعية ونقطة تثبيت',
    subtitle: 'حساب حدود، تحويل هندسي، ثم استنتاج الرتابة والنهاية.',
    bacContext:
      'نمط حاضر في مواضيع BAC: u₀ مع علاقة تراجعية خطية أو دالية، حساب أول الحدود، إثبات الحصر والرتابة، ثم تحويل vₙ إلى متتالية هندسية لاستخراج النهاية.',
    sourceHint:
      'مستوحى من رياضيات GE 2025: u₀=2 و uₙ₊₁=3/5 uₙ + 8/5 ثم vₙ=uₙ-4.',
    definition: {
      sequenceName: '(uₙ)',
      formulaLabel: 'u₀=2 ، uₙ₊₁ = 3/5 uₙ + 8/5',
      description:
        'نقطة التثبيت هي 4، لذلك ندرس vₙ=uₙ-4 لقراءة الأساس الهندسي والنهاية.',
      fixedPoint: 4,
    },
    table: {
      title: 'جدول الحدود والتحويل',
      columns: [
        { id: 'n', label: 'n' },
        { id: 'u', label: 'uₙ' },
        { id: 'v', label: 'vₙ = uₙ - 4' },
      ],
      rows: [
        { id: 'n0', label: 'n=0', cells: { n: 0, u: 2, v: null } },
        { id: 'n1', label: 'n=1', cells: { n: 1, u: null, v: null } },
        { id: 'n2', label: 'n=2', cells: { n: 2, u: null, v: null } },
        {
          id: 'ratio',
          label: 'أساس vₙ',
          cells: { n: 'q', u: 'vₙ₊₁/vₙ', v: null },
        },
        { id: 'limit', label: 'النهاية', cells: { n: '+∞', u: null, v: 0 } },
      ],
    },
    expectedCells: [
      { rowId: 'n0', columnId: 'v', expectedValue: -2, tolerance: 0.01 },
      {
        rowId: 'n1',
        columnId: 'u',
        expectedValue: 2.8,
        tolerance: 0.01,
        acceptedText: ['14/5', '2,8'],
      },
      {
        rowId: 'n1',
        columnId: 'v',
        expectedValue: -1.2,
        tolerance: 0.01,
        acceptedText: ['-6/5', '-1,2'],
      },
      {
        rowId: 'n2',
        columnId: 'u',
        expectedValue: 3.28,
        tolerance: 0.01,
        acceptedText: ['82/25', '3,28'],
      },
      {
        rowId: 'n2',
        columnId: 'v',
        expectedValue: -0.72,
        tolerance: 0.01,
        acceptedText: ['-18/25', '-0,72'],
      },
      {
        rowId: 'ratio',
        columnId: 'v',
        expectedValue: 0.6,
        tolerance: 0.01,
        acceptedText: ['3/5', '0,6'],
      },
      { rowId: 'limit', columnId: 'u', expectedValue: 4, tolerance: 0.01 },
    ],
    observationItems: [
      {
        id: 'terms-approach-4',
        label: 'القيم u₀،u₁،u₂ ترتفع وتقترب من 4.',
        detail: 'هذا يعطي تخمينا قبل البرهان بالحصر والفرق.',
        kind: 'variation',
      },
      {
        id: 'v-geometric-q',
        label: 'vₙ=uₙ-4 هندسية أساسها 3/5.',
        detail: 'التحويل يحول العلاقة التراجعية إلى شكل هندسي مباشر.',
        kind: 'transform',
      },
      {
        id: 'limit-fixed-point',
        label: 'بما أن |3/5|<1 فإن vₙ→0 ومنه uₙ→4.',
        detail: 'النهاية تأتي من الأساس الهندسي ونقطة التثبيت.',
        kind: 'limit',
      },
      {
        id: 'sequence-decreases',
        label: 'المتتالية متناقصة وتتجه إلى 0.',
        detail: 'اختيار مضلل: الحدود المحسوبة ترتفع من 2 نحو 4.',
        kind: 'distractor',
      },
    ],
    prompt: {
      title: 'استنتج الرتابة والنهاية من الجدول.',
      task: 'أكمل الحدود والتحويل vₙ، اختر الملاحظات الصحيحة، ثم اكتب استنتاجا يربط الأساس الهندسي بالنهاية.',
      requiredObservationIds: [
        'terms-approach-4',
        'v-geometric-q',
        'limit-fixed-point',
      ],
      requiredConclusionKeywords: ['vₙ', '3/5', 'هندسية', 'uₙ', '4'],
      scaffoldPhrases: [
        'نحسب u₁=14/5 و u₂=82/25.',
        'بطرح 4 نحصل على vₙ₊₁=(3/5)vₙ.',
        'بما أن |3/5|<1 فإن vₙ يؤول إلى 0 ومنه uₙ يؤول إلى 4.',
      ],
    },
  },
  {
    id: 'arithmetic-sequence-membership-sum',
    title: 'متتالية حسابية ومجموع حدود',
    subtitle: 'تحديد الأساس، اختبار انتماء حد، وحساب مجموع جزئي.',
    bacContext:
      'تتكرر في BAC أسئلة المتتاليات الحسابية: حساب الحدود الأولى، إثبات أن الأساس ثابت، حل uₙ=a، ثم استعمال صيغة المجموع.',
    sourceHint:
      'مستوحى من رياضيات LP/LE 2025: uₙ=3n-9، التحقق أن 2025 حد ثم حساب مجموع جزئي.',
    definition: {
      sequenceName: '(uₙ)',
      formulaLabel: 'uₙ = 3n - 9',
      description:
        'صيغة الحد العام مباشرة؛ نقرأ منها الأساس r=3 ونستعملها لحل uₙ=2025.',
    },
    table: {
      title: 'جدول التحقق والحساب',
      columns: [
        { id: 'item', label: 'المطلوب' },
        { id: 'value', label: 'القيمة' },
      ],
      rows: [
        { id: 'u0', label: 'u₀', cells: { item: 'u₀', value: null } },
        { id: 'u1', label: 'u₁', cells: { item: 'u₁', value: null } },
        { id: 'u2', label: 'u₂', cells: { item: 'u₂', value: null } },
        { id: 'r', label: 'r', cells: { item: 'الأساس r', value: null } },
        {
          id: 'n2025',
          label: 'uₙ=2025',
          cells: { item: 'رتبة الحد 2025', value: null },
        },
        {
          id: 'sum',
          label: 'S',
          cells: { item: 'u₀+...+u₆₇₈', value: null },
        },
      ],
    },
    expectedCells: [
      { rowId: 'u0', columnId: 'value', expectedValue: -9, tolerance: 0.01 },
      { rowId: 'u1', columnId: 'value', expectedValue: -6, tolerance: 0.01 },
      { rowId: 'u2', columnId: 'value', expectedValue: -3, tolerance: 0.01 },
      { rowId: 'r', columnId: 'value', expectedValue: 3, tolerance: 0.01 },
      {
        rowId: 'n2025',
        columnId: 'value',
        expectedValue: 678,
        tolerance: 0.01,
      },
      {
        rowId: 'sum',
        columnId: 'value',
        expectedValue: 684432,
        tolerance: 0.01,
      },
    ],
    observationItems: [
      {
        id: 'difference-constant',
        label: 'الفرق uₙ₊₁-uₙ ثابت ويساوي 3.',
        detail: 'هذه علامة المتتالية الحسابية.',
        kind: 'variation',
      },
      {
        id: 'membership-rank',
        label: 'حل 3n-9=2025 يعطي n=678.',
        detail: 'إذن 2025 حد من حدود المتتالية.',
        kind: 'term',
      },
      {
        id: 'sum-first-last',
        label: 'المجموع يحسب بعدد الحدود مضروبا في نصف مجموع الطرفين.',
        detail: 'هنا عدد الحدود من 0 إلى 678 هو 679.',
        kind: 'transform',
      },
      {
        id: 'geometric-ratio-3',
        label: 'النسبة uₙ₊₁/uₙ ثابتة وتساوي 3.',
        detail: 'اختيار مضلل: العلاقة حسابية وليست هندسية.',
        kind: 'distractor',
      },
    ],
    prompt: {
      title: 'أثبت أن 2025 حد واحسب المجموع.',
      task: 'أكمل الحدود والمعطيات، اختر الملاحظات الصحيحة، ثم اكتب خلاصة تبرر الأساس والانتماء والمجموع.',
      requiredObservationIds: [
        'difference-constant',
        'membership-rank',
        'sum-first-last',
      ],
      requiredConclusionKeywords: ['حسابية', '3', '678', 'مجموع'],
      scaffoldPhrases: [
        'بما أن uₙ₊₁-uₙ=3 فإن المتتالية حسابية أساسها 3.',
        'حل المعادلة 3n-9=2025 يعطي n=678.',
        'نحسب S بعدد الحدود 679 وبالحدين u₀ و u₆₇₈.',
      ],
    },
  },
];

const MATH_GEOMETRY_COMPLEX_PLANE_PRESETS = [
  {
    id: 'complex-circle-isosceles-triangle',
    title: 'لواحق ونقاط على دائرة',
    subtitle:
      'قراءة الشكل المثلثي، نصف القطر، وطبيعة المثلث من المستوى المركب.',
    bacContext:
      'نمط BAC متكرر: تعطى لواحق A وB وC، يطلب الشكل المثلثي، الانتماء إلى دائرة، ثم تحديد طبيعة المثلث أو مركزه.',
    sourceHint:
      'مستوحى من رياضيات SE 2025: zA=2i و zB=-√3+i و zC=conj(zB).',
    plane: {
      title: 'المستوى المركب (O; u, v)',
      xMin: -3,
      xMax: 3,
      yMin: -3,
      yMax: 3,
      points: [
        { id: 'a', label: 'A', x: 0, y: 2, affixLabel: '2i' },
        { id: 'b', label: 'B', x: -1.732, y: 1, affixLabel: '-√3+i' },
        { id: 'c', label: 'C', x: -1.732, y: -1, affixLabel: '-√3-i' },
      ],
    },
    table: {
      title: 'قراءات هندسية من اللواحق',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
      ],
      rows: [
        { id: 'mod-a', label: '|zA|', cells: { item: '|zA|', value: null } },
        {
          id: 'arg-a',
          label: 'arg zA',
          cells: { item: 'arg(zA)', value: null },
        },
        { id: 'mod-b', label: '|zB|', cells: { item: '|zB|', value: null } },
        {
          id: 'arg-b',
          label: 'arg zB',
          cells: { item: 'arg(zB)', value: null },
        },
        { id: 'mod-c', label: '|zC|', cells: { item: '|zC|', value: null } },
        {
          id: 'circle',
          label: 'الدائرة',
          cells: { item: 'المركز ونصف القطر', value: null },
        },
        {
          id: 'triangle',
          label: 'ABC',
          cells: { item: 'طبيعة المثلث', value: null },
        },
      ],
    },
    expectedCells: [
      { rowId: 'mod-a', columnId: 'value', expectedValue: 2, tolerance: 0.02 },
      {
        rowId: 'arg-a',
        columnId: 'value',
        expectedValue: 'π/2',
        acceptedText: ['90°', 'pi/2'],
      },
      { rowId: 'mod-b', columnId: 'value', expectedValue: 2, tolerance: 0.02 },
      {
        rowId: 'arg-b',
        columnId: 'value',
        expectedValue: '5π/6',
        acceptedText: ['150°', '5pi/6'],
      },
      { rowId: 'mod-c', columnId: 'value', expectedValue: 2, tolerance: 0.02 },
      {
        rowId: 'circle',
        columnId: 'value',
        expectedValue: 'O و 2',
        acceptedText: ['المركز O ونصف القطر 2', 'O,2'],
      },
      {
        rowId: 'triangle',
        columnId: 'value',
        expectedValue: 'متساوي الساقين في B',
        acceptedText: ['AB=BC', 'مثلث متساوي الساقين'],
      },
    ],
    observationItems: [
      {
        id: 'same-modulus',
        label: 'للنقط A وB وC نفس الطول OA=OB=OC=2.',
        detail: 'هذا هو دليل الانتماء إلى دائرة مركزها O.',
        kind: 'modulus',
      },
      {
        id: 'conjugate-symmetry',
        label: 'B و C متناظرتان بالنسبة لمحور الفواصل لأن zC مرافق zB.',
        detail: 'تناظر اللواحق يسهل قراءة الشكل.',
        kind: 'shape',
      },
      {
        id: 'isosceles-at-b',
        label: 'AB و BC لهما الطول نفسه، إذن ABC متساوي الساقين في B.',
        detail: 'المقارنة بالمسافات تكمل نتيجة الدائرة.',
        kind: 'distance',
      },
      {
        id: 'center-a',
        label: 'الدائرة مركزها A لأن zA على محور التراتيب.',
        detail: 'اختيار مضلل: تساوي OA وOB وOC يجعل المركز O.',
        kind: 'distractor',
      },
    ],
    prompt: {
      title: 'استنتج الدائرة وطبيعة المثلث.',
      task: 'أكمل جدول الأطوال والحجج، اختر الملاحظات الصحيحة، ثم اكتب خلاصة هندسية من اللواحق.',
      requiredObservationIds: [
        'same-modulus',
        'conjugate-symmetry',
        'isosceles-at-b',
      ],
      requiredConclusionKeywords: ['دائرة', 'O', '2', 'متساوي الساقين', 'B'],
      scaffoldPhrases: [
        'نلاحظ أن |zA|=|zB|=|zC|=2.',
        'إذن A وB وC تنتمي إلى دائرة مركزها O ونصف قطرها 2.',
        'كما أن AB=BC ومنه ABC مثلث متساوي الساقين في B.',
      ],
    },
  },
  {
    id: 'vectors-translation-alignment',
    title: 'متجهات وترجمة في المستوى المركب',
    subtitle: 'استعمال الفروق بين اللواحق لقراءة المتجهة والاستقامة والترجمة.',
    bacContext:
      'في تمارين الهندسة والأعداد المركبة تظهر أسئلة: احسب لاحقة متجهة، تحقق من الاستقامية، أو عين صورة نقطة بترجمة.',
    sourceHint:
      'مبني على نمط BAC: نقاط ذات لواحق ثم برهان باستعمال الفروق zB-zA و zC-zB.',
    plane: {
      title: 'نقاط A وB وC في معلم متعامد',
      xMin: 0,
      xMax: 8,
      yMin: 0,
      yMax: 5,
      points: [
        { id: 'a', label: 'A', x: 1, y: 2, affixLabel: '1+2i' },
        { id: 'b', label: 'B', x: 4, y: 3, affixLabel: '4+3i' },
        { id: 'c', label: 'C', x: 7, y: 4, affixLabel: '7+4i' },
      ],
    },
    table: {
      title: 'جدول المتجهات والتحويل',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
      ],
      rows: [
        { id: 'ab', label: 'zB-zA', cells: { item: 'zB-zA', value: null } },
        { id: 'bc', label: 'zC-zB', cells: { item: 'zC-zB', value: null } },
        { id: 'distance', label: 'AB', cells: { item: 'AB', value: null } },
        {
          id: 'alignment',
          label: 'الاستقامية',
          cells: { item: 'A,B,C', value: null },
        },
        {
          id: 'translation',
          label: 'الترجمة',
          cells: { item: 'صورة B بمتجهة AB', value: null },
        },
      ],
    },
    expectedCells: [
      {
        rowId: 'ab',
        columnId: 'value',
        expectedValue: '3+i',
        acceptedText: ['3 + i', '(3,1)'],
      },
      {
        rowId: 'bc',
        columnId: 'value',
        expectedValue: '3+i',
        acceptedText: ['3 + i', '(3,1)'],
      },
      {
        rowId: 'distance',
        columnId: 'value',
        expectedValue: '√10',
        acceptedText: ['sqrt(10)', 'racine 10'],
      },
      {
        rowId: 'alignment',
        columnId: 'value',
        expectedValue: 'مستقيمة',
        acceptedText: ['A وB وC مستقيمة', 'نعم'],
      },
      {
        rowId: 'translation',
        columnId: 'value',
        expectedValue: 'C',
        acceptedText: ['النقطة C'],
      },
    ],
    observationItems: [
      {
        id: 'same-vector',
        label: 'zB-zA و zC-zB متساويان ويساويان 3+i.',
        detail: 'هذا يقرأ المتجهتين AB وBC مباشرة.',
        kind: 'vector',
      },
      {
        id: 'aligned-points',
        label: 'تساوي المتجهتين يدل أن A وB وC مستقيمة وB منتصف [AC].',
        detail: 'نفس الاتجاه ونفس الطول.',
        kind: 'shape',
      },
      {
        id: 'translation-image',
        label: 'صورة B بالترجمة ذات المتجهة AB هي C.',
        detail: 'لأن zC=zB+(zB-zA).',
        kind: 'vector',
      },
      {
        id: 'right-triangle',
        label: 'A وB وC تشكل مثلثا قائما.',
        detail: 'اختيار مضلل: النقاط على استقامة واحدة.',
        kind: 'distractor',
      },
    ],
    prompt: {
      title: 'اربط الفروق بين اللواحق بالترجمة.',
      task: 'املأ جدول المتجهات، اختر الملاحظات الصحيحة، ثم اكتب خلاصة حول الاستقامية وصورة B.',
      requiredObservationIds: [
        'same-vector',
        'aligned-points',
        'translation-image',
      ],
      requiredConclusionKeywords: ['zB-zA', '3+i', 'مستقيمة', 'ترجمة', 'C'],
      scaffoldPhrases: [
        'نحسب zB-zA=3+i و zC-zB=3+i.',
        'إذن المتجهتان AB وBC متساويتان، فتكون A وB وC مستقيمة.',
        'صورة B بالترجمة ذات المتجهة AB هي C.',
      ],
    },
  },
];

const PHYSICS_EXPERIMENT_GRAPH_PRESETS = [
  {
    id: 'rc-charging-time-constant',
    title: 'شحن مكثفة وقراءة ثابت الزمن',
    subtitle: 'قراءة منحنى uC(t)، تحديد τ، وربطه بثابت الدارة RC.',
    bacContext:
      'نمط شائع في الفيزياء: وثيقة دارة RC ومنحنى شحن/تفريغ، قراءة القيمة النهائية و63% منها، ثم استخراج ثابت الزمن.',
    sourceHint:
      'مستند إلى أنماط دارات RC وRL في برنامج الفيزياء، حيث تربط المهمة المنحنى بالثابت الزمني والوحدة.',
    instrument: {
      subjectLabel: 'Physics Lab',
      title: 'منحنيات التجربة',
      iconKind: 'graph',
    },
    sourceDocuments: [
      {
        id: 'protocol',
        title: 'بروتوكول التجربة',
        bullets: [
          'نغلق القاطعة عند t=0 ونقيس التوتر uC بين مربطي المكثفة.',
          'المولد مثالي وتوتره E=6 V.',
          'يمثل ثابت الزمن τ اللحظة التي يبلغ فيها uC حوالي 0.63E.',
        ],
      },
    ],
    table: {
      title: 'قراءات المنحنى',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
      ],
      rows: [
        { id: 'u-final', label: 'E', cells: { item: 'القيمة النهائية E', value: null } },
        { id: 'u-tau', label: '0.63E', cells: { item: 'uC عند τ', value: null } },
        { id: 'tau', label: 'τ', cells: { item: 'ثابت الزمن', value: null } },
        { id: 'initial-slope', label: 'الميل البدئي', cells: { item: 'duC/dt عند 0', value: null } },
      ],
    },
    graph: {
      title: 'تطور توتر المكثفة أثناء الشحن',
      xAxis: { label: 't', unit: 'ms', min: 0, max: 12 },
      yAxis: { label: 'uC', unit: 'V', min: 0, max: 6 },
      series: [
        {
          id: 'uc',
          title: 'uC(t)',
          kind: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1.33 },
            { x: 2, y: 2.36 },
            { x: 4, y: 3.79 },
            { x: 6, y: 4.66 },
            { x: 8, y: 5.19 },
            { x: 12, y: 5.7 },
          ],
        },
      ],
    },
    expectedCells: [
      { rowId: 'u-final', columnId: 'value', expectedValue: 6, tolerance: 0.2 },
      {
        rowId: 'u-tau',
        columnId: 'value',
        expectedValue: 3.8,
        tolerance: 0.25,
        acceptedText: ['0.63E'],
      },
      {
        rowId: 'tau',
        columnId: 'value',
        expectedValue: 4,
        tolerance: 0.5,
        acceptedText: ['4 ms'],
      },
      {
        rowId: 'initial-slope',
        columnId: 'value',
        expectedValue: 1.5,
        tolerance: 0.25,
        acceptedText: ['E/tau'],
      },
    ],
    observationItems: [
      {
        id: 'uc-increases-asymptote',
        label: 'uC يزداد ثم يقترب تدريجيا من E=6 V.',
        detail: 'هذه قراءة الشحن الأسي وليست علاقة خطية كاملة.',
        kind: 'trend',
      },
      {
        id: 'tau-at-63',
        label: 'عند τ يكون uC≈0.63E أي حوالي 3.8 V.',
        detail: 'هذه هي طريقة القراءة البيانية لثابت الزمن.',
        kind: 'reading',
      },
      {
        id: 'tau-rc-link',
        label: 'ثابت الزمن يساوي RC وتزداد مدة الشحن بزيادته.',
        detail: 'الاستنتاج الفيزيائي يربط المنحنى بعناصر الدارة.',
        kind: 'model',
      },
      {
        id: 'linear-forever',
        label: 'يستمر uC في الزيادة خطيا دون قيمة حدية.',
        detail: 'اختيار مضلل: المنحنى يتسطح قرب E.',
        kind: 'distractor',
      },
    ],
    prompt: {
      title: 'استخرج τ من منحنى الشحن.',
      task: 'املأ القراءات الأساسية من المنحنى، اختر الملاحظات الصحيحة، ثم اكتب استنتاجا يربط τ بدارة RC.',
      requiredObservationIds: [
        'uc-increases-asymptote',
        'tau-at-63',
        'tau-rc-link',
      ],
      requiredConclusionKeywords: ['τ', '63', 'RC', 'شحن'],
      scaffoldPhrases: [
        'القيمة النهائية للتوتر هي E≈6 V.',
        'نقرأ τ عندما uC≈0.63E أي حوالي 3.8 V.',
        'أستنتج أن τ≈4 ms ويمثل ثابت الزمن RC للدارة.',
      ],
    },
  },
  {
    id: 'velocity-time-slope-acceleration',
    title: 'منحنى السرعة والزمن',
    subtitle: 'قراءة ميل v(t)، السرعة الابتدائية، والتسارع من تجربة حركة.',
    bacContext:
      'في الميكانيك التجريبي يطلب من الطالب غالبا قراءة v(t)، حساب الميل، ثم تفسيره كتسارع وحكم طبيعة الحركة.',
    sourceHint:
      'مستوحى من أسئلة الحركة حيث يكون المنحنى v=f(t) خطيا ويستخرج منه التسارع والسرعة الابتدائية.',
    instrument: {
      subjectLabel: 'Physics Lab',
      title: 'منحنيات التجربة',
      iconKind: 'graph',
    },
    sourceDocuments: [
      {
        id: 'motion-protocol',
        title: 'معطيات التجربة',
        body: 'نقيس سرعة جسم يتحرك على مستقيم خلال فواصل زمنية متساوية، ثم نمثل v بدلالة t.',
      },
    ],
    table: {
      title: 'قراءات v(t)',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
      ],
      rows: [
        { id: 'v0', label: 'v0', cells: { item: 'السرعة الابتدائية', value: null } },
        { id: 'v3', label: 'v(3s)', cells: { item: 'v عند t=3s', value: null } },
        { id: 'slope', label: 'a', cells: { item: 'ميل المنحنى', value: null } },
        { id: 'motion-kind', label: 'النوع', cells: { item: 'طبيعة الحركة', value: null } },
      ],
    },
    graph: {
      title: 'تطور السرعة بدلالة الزمن',
      xAxis: { label: 't', unit: 's', min: 0, max: 4 },
      yAxis: { label: 'v', unit: 'm/s', min: 0, max: 10 },
      series: [
        {
          id: 'velocity',
          title: 'v(t)',
          kind: 'line',
          points: [
            { x: 0, y: 1 },
            { x: 1, y: 3 },
            { x: 2, y: 5 },
            { x: 3, y: 7 },
            { x: 4, y: 9 },
          ],
        },
      ],
    },
    expectedCells: [
      { rowId: 'v0', columnId: 'value', expectedValue: 1, tolerance: 0.1, acceptedText: ['1 m/s'] },
      { rowId: 'v3', columnId: 'value', expectedValue: 7, tolerance: 0.1, acceptedText: ['7 m/s'] },
      {
        rowId: 'slope',
        columnId: 'value',
        expectedValue: 2,
        tolerance: 0.1,
        acceptedText: ['2 m/s²', '2 m/s^2'],
      },
      {
        rowId: 'motion-kind',
        columnId: 'value',
        expectedValue: 'حركة مستقيمة متسارعة بانتظام',
        acceptedText: ['متسارعة بانتظام', 'MRUA'],
      },
    ],
    observationItems: [
      {
        id: 'straight-line',
        label: 'منحنى v(t) مستقيم، إذن التسارع ثابت.',
        detail: 'خطية v بدلالة الزمن هي العلامة التجريبية الأساسية.',
        kind: 'trend',
      },
      {
        id: 'slope-is-acceleration',
        label: 'ميل v(t) يساوي 2 m/s² ويمثل التسارع.',
        detail: 'الميل هو Δv/Δt.',
        kind: 'slope',
      },
      {
        id: 'positive-acceleration',
        label: 'التسارع موجب، لذلك السرعة تزداد.',
        detail: 'هذا يحدد طبيعة الحركة.',
        kind: 'model',
      },
      {
        id: 'uniform-speed',
        label: 'الحركة منتظمة لأن السرعة ثابتة.',
        detail: 'اختيار مضلل: السرعة ترتفع من 1 إلى 9 m/s.',
        kind: 'distractor',
      },
    ],
    prompt: {
      title: 'استخرج التسارع من v(t).',
      task: 'املأ القراءات، اختر الملاحظات المدعومة، ثم اكتب استنتاجا يربط الميل بالتسارع وطبيعة الحركة.',
      requiredObservationIds: [
        'straight-line',
        'slope-is-acceleration',
        'positive-acceleration',
      ],
      requiredConclusionKeywords: ['ميل', 'تسارع', '2', 'متسارعة'],
      scaffoldPhrases: [
        'نقرأ v0=1 m/s و v(3s)=7 m/s.',
        'ميل المنحنى هو Δv/Δt=2 m/s².',
        'بما أن الميل ثابت وموجب فالحركة مستقيمة متسارعة بانتظام.',
      ],
    },
  },
];

const PHYSICS_CIRCUITS_WORKBENCH_PRESETS = [
  {
    id: 'rc-circuit-capacitance-from-tau',
    title: 'دارة RC وحساب سعة المكثفة',
    subtitle: 'تسمية عناصر الدارة، قراءة τ، ثم حساب C من العلاقة τ=RC.',
    bacContext:
      'في دارات RC يطلب من الطالب قراءة المخطط، استخراج ثابت الزمن من منحنى الشحن، ثم استعمال الوحدات لحساب C أو R.',
    sourceHint:
      'مستند إلى محور دارات RC وRL في برنامج الفيزياء، حيث تربط الأسئلة بين الرسم، المنحنى، وقانون τ=RC.',
    instrument: {
      subjectLabel: 'Physics Lab',
      title: 'ورشة الدارات الكهربائية',
      iconKind: 'circuit',
    },
    sourceDocuments: [
      {
        id: 'rc-data',
        title: 'معطيات الدارة',
        bullets: [
          'المولد مثالي: E=6 V.',
          'المقاومة R=100 Ω.',
          'من منحنى الشحن نقرأ τ=4 ms.',
          'العلاقة المستعملة في دارة RC هي τ=RC.',
        ],
      },
    ],
    table: {
      title: 'ملف المعطيات',
      columns: [
        { id: 'symbol', label: 'الرمز' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'r', label: 'R', cells: { symbol: 'R', value: 100, unit: 'Ω' } },
        { id: 'tau', label: 'τ', cells: { symbol: 'τ', value: 4, unit: 'ms' } },
        { id: 'c', label: 'C', cells: { symbol: 'C', value: null, unit: 'F' } },
      ],
    },
    diagram: {
      title: 'مخطط دارة RC',
      description:
        'ضع تسميات العناصر الأساسية قبل استعمال العلاقة. المواضع تقريبية وتمثل مخططا مدرسيا مبسطا.',
      targets: [
        {
          id: 'generator',
          label: '1',
          x: 18,
          y: 52,
          expectedLabel: 'مولد',
          acceptedLabels: ['E'],
        },
        {
          id: 'resistor',
          label: '2',
          x: 45,
          y: 28,
          expectedLabel: 'مقاومة',
          acceptedLabels: ['R'],
        },
        {
          id: 'capacitor',
          label: '3',
          x: 72,
          y: 54,
          expectedLabel: 'مكثفة',
          acceptedLabels: ['C'],
        },
        {
          id: 'switch',
          label: '4',
          x: 45,
          y: 76,
          expectedLabel: 'قاطعة',
          acceptedLabels: ['K'],
        },
      ],
    },
    measurements: [
      { id: 'capacitance', label: 'سعة المكثفة C', unitHint: 'F' },
    ],
    expectedCells: [
      {
        rowId: 'c',
        columnId: 'value',
        expectedValue: 0.00004,
        tolerance: 0.000002,
        acceptedText: ['40 µF', '4e-5'],
      },
    ],
    expectedMeasurements: [
      {
        id: 'capacitance',
        expected: { value: 0.00004, unit: 'F' },
        tolerance: 0.000002,
        acceptedUnits: ['farad'],
      },
    ],
    observationItems: [
      {
        id: 'tau-from-graph',
        label: 'τ=4 ms تقرأ عند 63% من التوتر النهائي.',
        detail: 'هذه قراءة ثابت الزمن من منحنى الشحن.',
        kind: 'reading',
      },
      {
        id: 'capacitance-formula',
        label: 'من τ=RC نستنتج C=τ/R.',
        detail: 'يجب تحويل ms إلى s قبل الحساب.',
        kind: 'formula',
      },
      {
        id: 'units-converted',
        label: '4 ms = 4×10⁻³ s، ومنه C=4×10⁻⁵ F.',
        detail: 'التحويل هو بوابة صحة الوحدة.',
        kind: 'unit',
      },
      {
        id: 'tau-equals-r-over-c',
        label: 'نستعمل τ=R/C مباشرة.',
        detail: 'اختيار مضلل: في دارة RC العلاقة τ=RC.',
        kind: 'distractor',
      },
    ],
    prompt: {
      title: 'احسب سعة المكثفة من ثابت الزمن.',
      task: 'سمّ عناصر الدارة، أكمل قيمة C، اكتب القياس بوحدته، ثم صغ استنتاجا قصيرا.',
      requiredObservationIds: [
        'tau-from-graph',
        'capacitance-formula',
        'units-converted',
      ],
      requiredConclusionKeywords: ['τ', 'RC', 'C', 'F'],
      scaffoldPhrases: [
        'من المنحنى نقرأ τ=4 ms=4×10⁻³ s.',
        'بما أن τ=RC فإن C=τ/R.',
        'إذن C=4×10⁻³/100=4×10⁻⁵ F.',
      ],
    },
  },
  {
    id: 'rl-circuit-inductance-from-tau',
    title: 'دارة RL وحساب معامل التحريض',
    subtitle: 'قراءة دارة RL، تحديد τ، ثم حساب L من العلاقة τ=L/R.',
    bacContext:
      'في دارات RL ينتقل الطالب بين مخطط الدارة ومنحنى شدة التيار، ثم يستعمل τ=L/R لاستخراج معامل التحريض.',
    sourceHint:
      'مبني على أسئلة دارات RL حيث يطلب تحديد الوشيعة وقراءة ثابت الزمن من i(t).',
    instrument: {
      subjectLabel: 'Physics Lab',
      title: 'ورشة الدارات الكهربائية',
      iconKind: 'circuit',
    },
    sourceDocuments: [
      {
        id: 'rl-data',
        title: 'معطيات الدارة',
        bullets: [
          'المقاومة الكلية R=20 Ω.',
          'من منحنى i(t) نقرأ τ=2 ms.',
          'ثابت الزمن في دارة RL يحقق τ=L/R.',
        ],
      },
    ],
    table: {
      title: 'ملف المعطيات',
      columns: [
        { id: 'symbol', label: 'الرمز' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'r', label: 'R', cells: { symbol: 'R', value: 20, unit: 'Ω' } },
        { id: 'tau', label: 'τ', cells: { symbol: 'τ', value: 2, unit: 'ms' } },
        { id: 'l', label: 'L', cells: { symbol: 'L', value: null, unit: 'H' } },
      ],
    },
    diagram: {
      title: 'مخطط دارة RL',
      description: 'حدد الوشيعة والمقاومة والمولد قبل استعمال العلاقة.',
      targets: [
        {
          id: 'generator',
          label: '1',
          x: 18,
          y: 52,
          expectedLabel: 'مولد',
          acceptedLabels: ['E'],
        },
        {
          id: 'resistor',
          label: '2',
          x: 42,
          y: 30,
          expectedLabel: 'مقاومة',
          acceptedLabels: ['R'],
        },
        {
          id: 'inductor',
          label: '3',
          x: 72,
          y: 54,
          expectedLabel: 'وشيعة',
          acceptedLabels: ['L'],
        },
      ],
    },
    measurements: [
      { id: 'inductance', label: 'معامل التحريض L', unitHint: 'H' },
    ],
    expectedCells: [
      {
        rowId: 'l',
        columnId: 'value',
        expectedValue: 0.04,
        tolerance: 0.002,
        acceptedText: ['40 mH'],
      },
    ],
    expectedMeasurements: [
      {
        id: 'inductance',
        expected: { value: 0.04, unit: 'H' },
        tolerance: 0.002,
        acceptedUnits: ['henry'],
      },
    ],
    observationItems: [
      {
        id: 'current-rises',
        label: 'شدة التيار في RL ترتفع تدريجيا نحو قيمة حدية.',
        detail: 'الوشيعة تعارض تغير التيار في البداية.',
        kind: 'trend',
      },
      {
        id: 'tau-l-over-r',
        label: 'ثابت الزمن في دارة RL يساوي L/R.',
        detail: 'لذلك L=τR بعد تحويل الزمن إلى الثانية.',
        kind: 'formula',
      },
      {
        id: 'l-unit-henry',
        label: 'القيمة L=0.04 H تكافئ 40 mH.',
        detail: 'التحويل يساعد على قراءة جواب BAC.',
        kind: 'unit',
      },
      {
        id: 'capacitor-stores-current',
        label: 'المكثفة هي العنصر الذي يخزن التيار في هذه الدارة.',
        detail: 'اختيار مضلل: العنصر المميز هنا هو الوشيعة.',
        kind: 'distractor',
      },
    ],
    prompt: {
      title: 'احسب معامل التحريض من τ.',
      task: 'سمّ عناصر دارة RL، أكمل L في الجدول، اكتب قياسه بوحدته، ثم اربط ذلك بتغير التيار.',
      requiredObservationIds: ['current-rises', 'tau-l-over-r', 'l-unit-henry'],
      requiredConclusionKeywords: ['τ', 'L/R', 'وشيعة', 'H'],
      scaffoldPhrases: [
        'نحوّل τ=2 ms إلى 2×10⁻³ s.',
        'بما أن τ=L/R فإن L=τR.',
        'إذن L=2×10⁻³×20=0.04 H.',
      ],
    },
  },
];

const PHYSICS_MECHANICS_WORKBENCH_PRESETS = [
  {
    id: 'inclined-plane-newton-law',
    title: 'مستوى مائل وتطبيق القانون الثاني',
    subtitle: 'تسمية القوى، قراءة التسارع من v(t)، ثم حساب محصلة القوى.',
    bacContext:
      'في مسائل الميكانيك يطلب BAC عادة تمثيل القوى، قراءة التسارع من منحنى السرعة، ثم استعمال ΣF=m.a.',
    instrument: {
      subjectLabel: 'Physics Lab',
      title: 'ورشة الميكانيك',
      iconKind: 'mechanics',
    },
    sourceDocuments: [
      {
        id: 'incline-data',
        title: 'معطيات الحركة',
        bullets: [
          'كتلة الجسم m=0.50 kg.',
          'من منحنى v(t) يكون الميل ثابتا ويساوي التسارع.',
          'القانون المستعمل على محور الحركة هو ΣF=m.a.',
        ],
      },
    ],
    table: {
      title: 'قراءات الحركة',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'mass', label: 'm', cells: { item: 'الكتلة', value: 0.5, unit: 'kg' } },
        { id: 'acceleration', label: 'a', cells: { item: 'التسارع', value: null, unit: 'm/s²' } },
        { id: 'resultant', label: 'ΣF', cells: { item: 'محصلة القوى', value: null, unit: 'N' } },
      ],
    },
    graph: {
      title: 'تطور السرعة على محور الحركة',
      xAxis: { label: 't', unit: 's', min: 0, max: 4 },
      yAxis: { label: 'v', unit: 'm/s', min: 0, max: 8 },
      series: [
        {
          id: 'velocity',
          title: 'v(t)',
          kind: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 6 },
            { x: 4, y: 8 },
          ],
        },
      ],
    },
    diagram: {
      title: 'مخطط القوى',
      description: 'حدد القوى المؤثرة على الجسم قبل الإسقاط على محور الحركة.',
      targets: [
        { id: 'weight', label: '1', x: 48, y: 70, expectedLabel: 'الثقل', acceptedLabels: ['P'] },
        { id: 'normal', label: '2', x: 58, y: 32, expectedLabel: 'رد الفعل', acceptedLabels: ['R', 'N'] },
        { id: 'friction', label: '3', x: 34, y: 50, expectedLabel: 'احتكاك', acceptedLabels: ['f'] },
      ],
    },
    measurements: [
      { id: 'resultant-force', label: 'محصلة القوى ΣF', unitHint: 'N' },
    ],
    expectedCells: [
      { rowId: 'acceleration', columnId: 'value', expectedValue: 2, tolerance: 0.1, acceptedText: ['2 m/s²', '2 m/s^2'] },
      { rowId: 'resultant', columnId: 'value', expectedValue: 1, tolerance: 0.05, acceptedText: ['1 N'] },
    ],
    expectedMeasurements: [
      {
        id: 'resultant-force',
        expected: { value: 1, unit: 'N' },
        tolerance: 0.05,
        acceptedUnits: ['newton'],
      },
    ],
    observationItems: [
      { id: 'slope-constant', label: 'منحنى v(t) مستقيم وميله ثابت.', detail: 'هذا يعني أن التسارع ثابت.', kind: 'graph' },
      { id: 'acceleration-two', label: 'الميل Δv/Δt يساوي 2 m/s².', detail: 'قراءة التسارع من المنحنى مباشرة.', kind: 'slope' },
      { id: 'newton-resultant', label: 'من ΣF=m.a نحصل على ΣF=0.5×2=1 N.', detail: 'المحصلة على محور الحركة هي سبب التسارع.', kind: 'formula' },
      { id: 'zero-resultant', label: 'محصلة القوى منعدمة لأن الجسم يتحرك.', detail: 'اختيار مضلل: التسارع غير منعدم.', kind: 'distractor' },
    ],
    prompt: {
      title: 'استخرج محصلة القوى من الحركة.',
      task: 'سمّ القوى، اقرأ التسارع من v(t)، أكمل الجدول، ثم اكتب خلاصة باستعمال القانون الثاني لنيوتن.',
      requiredObservationIds: [
        'slope-constant',
        'acceleration-two',
        'newton-resultant',
      ],
      requiredConclusionKeywords: ['ميل', 'تسارع', 'ΣF', 'm.a', 'N'],
      scaffoldPhrases: [
        'من ميل v(t) نجد a=2 m/s².',
        'بتطبيق القانون الثاني على محور الحركة: ΣF=m.a.',
        'إذن ΣF=0.50×2=1 N في جهة الحركة.',
      ],
    },
  },
  {
    id: 'spring-oscillator-stiffness',
    title: 'نواس مرن وحساب ثابت الصلابة',
    subtitle: 'قراءة الدور من x(t)، ثم حساب k من علاقة النواس المرن.',
    bacContext:
      'في الاهتزازات الميكانيكية يربط الطالب بين منحنى x(t)، الدور T، والعلاقة T=2π√(m/k).',
    instrument: {
      subjectLabel: 'Physics Lab',
      title: 'ورشة الميكانيك',
      iconKind: 'mechanics',
    },
    sourceDocuments: [
      {
        id: 'oscillator-data',
        title: 'معطيات النواس',
        bullets: [
          'كتلة الجسم m=0.10 kg.',
          'من المنحنى x(t) نقرأ دورا T=0.40 s.',
          'علاقة النواس المرن: T=2π√(m/k).',
        ],
      },
    ],
    table: {
      title: 'قراءات النواس المرن',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'period', label: 'T', cells: { item: 'الدور', value: null, unit: 's' } },
        { id: 'mass', label: 'm', cells: { item: 'الكتلة', value: 0.1, unit: 'kg' } },
        { id: 'stiffness', label: 'k', cells: { item: 'ثابت الصلابة', value: null, unit: 'N/m' } },
      ],
    },
    graph: {
      title: 'استطالة النواس المرن بدلالة الزمن',
      xAxis: { label: 't', unit: 's', min: 0, max: 0.8 },
      yAxis: { label: 'x', unit: 'cm', min: -4, max: 4 },
      series: [
        {
          id: 'elongation',
          title: 'x(t)',
          kind: 'line',
          points: [
            { x: 0, y: 3 },
            { x: 0.2, y: -3 },
            { x: 0.4, y: 3 },
            { x: 0.6, y: -3 },
            { x: 0.8, y: 3 },
          ],
        },
      ],
    },
    diagram: {
      title: 'نموذج النواس المرن',
      description: 'سمّ عناصر النموذج قبل استعمال علاقة الدور.',
      targets: [
        { id: 'spring', label: '1', x: 34, y: 38, expectedLabel: 'نابض', acceptedLabels: ['spring'] },
        { id: 'mass', label: '2', x: 62, y: 52, expectedLabel: 'جسم', acceptedLabels: ['كتلة'] },
        { id: 'equilibrium', label: '3', x: 78, y: 50, expectedLabel: 'موضع التوازن', acceptedLabels: ['O'] },
      ],
    },
    measurements: [
      { id: 'stiffness', label: 'ثابت الصلابة k', unitHint: 'N/m' },
    ],
    expectedCells: [
      { rowId: 'period', columnId: 'value', expectedValue: 0.4, tolerance: 0.03, acceptedText: ['0.40 s'] },
      { rowId: 'stiffness', columnId: 'value', expectedValue: 24.7, tolerance: 0.8, acceptedText: ['25 N/m'] },
    ],
    expectedMeasurements: [
      {
        id: 'stiffness',
        expected: { value: 24.7, unit: 'N/m' },
        tolerance: 0.8,
        acceptedUnits: ['N.m-1', 'newton/m'],
      },
    ],
    observationItems: [
      { id: 'period-reading', label: 'الدور هو الزمن بين قمتين متتاليتين: T≈0.40 s.', detail: 'قراءة دور الاهتزاز من المنحنى.', kind: 'reading' },
      { id: 'spring-period-law', label: 'علاقة النواس المرن تعطي k=4π²m/T².', detail: 'نربع علاقة الدور ثم نعزل k.', kind: 'formula' },
      { id: 'stiffness-value', label: 'باستعمال m=0.10 kg وT=0.40 s نجد k≈24.7 N/m.', detail: 'القيمة توافق وحدة صلابة النابض.', kind: 'unit' },
      { id: 'period-amplitude', label: 'الدور هو أكبر استطالة على المنحنى.', detail: 'اختيار مضلل: أكبر استطالة هي السعة.', kind: 'distractor' },
    ],
    prompt: {
      title: 'احسب ثابت صلابة النابض.',
      task: 'اقرأ الدور، أكمل الجدول والقياس، ثم اكتب استنتاجا يربط المنحنى بعلاقة النواس المرن.',
      requiredObservationIds: [
        'period-reading',
        'spring-period-law',
        'stiffness-value',
      ],
      requiredConclusionKeywords: ['T', 'k', 'π', 'N/m', 'دور'],
      scaffoldPhrases: [
        'نقرأ من المنحنى T≈0.40 s بين قمتين.',
        'من T=2π√(m/k) نستنتج k=4π²m/T².',
        'إذن k≈24.7 N/m.',
      ],
    },
  },
];

const PHYSICS_CHEMISTRY_REACTION_WORKBENCH_PRESETS = [
  {
    id: 'acid-base-titration-equivalence',
    title: 'معايرة حمضية قاعدية وحساب التركيز',
    subtitle: 'قراءة حجم التكافؤ من منحنى pH، ثم حساب تركيز المحلول المدروس.',
    bacContext:
      'في كيمياء BAC يطلب كثيرا تحديد نقطة التكافؤ من منحنى معايرة، ثم استغلال العلاقة الستوكيومترية لحساب التركيز.',
    instrument: {
      subjectLabel: 'Physics Lab',
      title: 'ورشة الكيمياء والتفاعلات',
      iconKind: 'chemistry',
    },
    sourceDocuments: [
      {
        id: 'titration-protocol',
        title: 'بروتوكول المعايرة',
        bullets: [
          'نعاير حجما VA=20.0 mL من حمض أحادي القاعدة بمحلول NaOH تركيزه CB=0.10 mol/L.',
          'يقابل التكافؤ نقطة الانعطاف حيث يحدث تغير سريع في pH.',
        ],
      },
    ],
    table: {
      title: 'ملف المعايرة',
      columns: [
        { id: 'symbol', label: 'الرمز' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'va', label: 'VA', cells: { symbol: 'VA', value: 20.0, unit: 'mL' } },
        { id: 'cb', label: 'CB', cells: { symbol: 'CB', value: 0.10, unit: 'mol/L' } },
        { id: 've', label: 'VE', cells: { symbol: 'VE', value: null, unit: 'mL' } },
        { id: 'ca', label: 'CA', cells: { symbol: 'CA', value: null, unit: 'mol/L' } },
      ],
    },
    graph: {
      title: 'منحنى المعايرة pH=f(VB)',
      xAxis: { label: 'VB', unit: 'mL', min: 0, max: 20 },
      yAxis: { label: 'pH', min: 2, max: 12 },
      series: [
        {
          id: 'ph',
          title: 'pH',
          kind: 'line',
          points: [
            { x: 0, y: 2.8 },
            { x: 8, y: 4.1 },
            { x: 11, y: 5.8 },
            { x: 12, y: 8.4 },
            { x: 13, y: 10.4 },
            { x: 20, y: 11.5 },
          ],
        },
      ],
    },
    diagram: {
      title: 'جهاز المعايرة',
      description: 'سمّ العناصر التي تظهر في تركيب المعايرة قبل استعمال المنحنى.',
      targets: [
        { id: 'burette', label: '1', x: 36, y: 28, expectedLabel: 'سحاحة', acceptedLabels: ['burette'] },
        { id: 'beaker', label: '2', x: 54, y: 70, expectedLabel: 'بيشر', acceptedLabels: ['كأس'] },
        { id: 'ph-meter', label: '3', x: 74, y: 52, expectedLabel: 'pH متر', acceptedLabels: ['pH-meter'] },
      ],
    },
    measurements: [
      { id: 'acid-concentration', label: 'تركيز الحمض CA', unitHint: 'mol/L' },
    ],
    expectedCells: [
      { rowId: 've', columnId: 'value', expectedValue: 12, tolerance: 0.5, acceptedText: ['12 mL'] },
      { rowId: 'ca', columnId: 'value', expectedValue: 0.06, tolerance: 0.004, acceptedText: ['6e-2'] },
    ],
    expectedMeasurements: [
      {
        id: 'acid-concentration',
        expected: { value: 0.06, unit: 'mol/L' },
        tolerance: 0.004,
        acceptedUnits: ['mol.L-1', 'mol/L'],
      },
    ],
    observationItems: [
      { id: 'equivalence-jump', label: 'القفزة السريعة في pH تحدد مجال التكافؤ.', detail: 'نقطة الانعطاف وسط القفزة تعطي VE.', kind: 'graph' },
      { id: 've-reading', label: 'من المنحنى نقرأ VE≈12 mL.', detail: 'هذه القراءة تدخل مباشرة في علاقة التكافؤ.', kind: 'reading' },
      { id: 'concentration-relation', label: 'عند التكافؤ: CA.VA=CB.VE، ومنه CA=0.060 mol/L.', detail: 'التفاعل حمض/قاعدة بنسبة 1:1.', kind: 'formula' },
      { id: 'initial-ph-is-ve', label: 'حجم التكافؤ يقرأ عند pH الابتدائي.', detail: 'اختيار مضلل: التكافؤ يقرأ عند القفزة.', kind: 'distractor' },
    ],
    prompt: {
      title: 'احسب تركيز الحمض من منحنى المعايرة.',
      task: 'سمّ الجهاز، اقرأ VE، أكمل الجدول والقياس، ثم اكتب خلاصة تربط التكافؤ بالتركيز.',
      requiredObservationIds: [
        'equivalence-jump',
        've-reading',
        'concentration-relation',
      ],
      requiredConclusionKeywords: ['VE', 'تكافؤ', 'CA', '0.060', 'mol/L'],
      scaffoldPhrases: [
        'نحدد VE من وسط قفزة pH، فنقرأ VE≈12 mL.',
        'عند التكافؤ: CA.VA=CB.VE.',
        'إذن CA=0.10×12/20=0.060 mol/L.',
      ],
    },
  },
  {
    id: 'zinc-acid-advancement-table',
    title: 'جدول تقدم تفاعل الزنك مع الحمض',
    subtitle: 'تحديد المتفاعل المحد، xmax، وكمية H2 المتشكلة.',
    bacContext:
      'جداول التقدم من أدوات الكيمياء المركزية في BAC: يحدد الطالب xmax والمتفاعل المحد ثم يستنتج الكميات النهائية.',
    instrument: {
      subjectLabel: 'Physics Lab',
      title: 'ورشة الكيمياء والتفاعلات',
      iconKind: 'chemistry',
    },
    sourceDocuments: [
      {
        id: 'reaction-data',
        title: 'معطيات التفاعل',
        bullets: [
          'المعادلة: Zn + 2H⁺ → Zn²⁺ + H₂.',
          'n(Zn)=0.030 mol و n(H⁺)=0.050 mol.',
          'نقارن n(Zn)/1 و n(H⁺)/2 لتحديد xmax.',
        ],
      },
    ],
    table: {
      title: 'جدول التقدم المختصر',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'zn-initial', label: 'n0(Zn)', cells: { item: 'كمية Zn', value: 0.030, unit: 'mol' } },
        { id: 'h-initial', label: 'n0(H+)', cells: { item: 'كمية H⁺', value: 0.050, unit: 'mol' } },
        { id: 'xmax', label: 'xmax', cells: { item: 'التقدم الأعظمي', value: null, unit: 'mol' } },
        { id: 'limiting', label: 'المحد', cells: { item: 'المتفاعل المحد', value: null, unit: '-' } },
        { id: 'h2-final', label: 'n(H2)', cells: { item: 'كمية H₂ النهائية', value: null, unit: 'mol' } },
      ],
    },
    graph: {
      title: 'تغير حجم H₂ بدلالة الزمن',
      xAxis: { label: 't', unit: 'min', min: 0, max: 8 },
      yAxis: { label: 'V(H2)', unit: 'mL', min: 0, max: 620 },
      series: [
        {
          id: 'hydrogen',
          title: 'V(H2)',
          kind: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 2, y: 380 },
            { x: 4, y: 520 },
            { x: 8, y: 600 },
          ],
        },
      ],
    },
    diagram: {
      title: 'تركيب متابعة التفاعل',
      description: 'حدد عناصر التركيب التجريبي لتجميع الغاز.',
      targets: [
        { id: 'flask', label: '1', x: 30, y: 62, expectedLabel: 'دورق', acceptedLabels: ['flask'] },
        { id: 'gas-tube', label: '2', x: 54, y: 42, expectedLabel: 'أنبوب غاز', acceptedLabels: ['أنبوب'] },
        { id: 'graduated-cylinder', label: '3', x: 78, y: 50, expectedLabel: 'مخبار مدرج', acceptedLabels: ['مخبار'] },
      ],
    },
    measurements: [
      { id: 'hydrogen-amount', label: 'كمية H₂ النهائية', unitHint: 'mol' },
    ],
    expectedCells: [
      { rowId: 'xmax', columnId: 'value', expectedValue: 0.025, tolerance: 0.001, acceptedText: ['2.5e-2'] },
      { rowId: 'limiting', columnId: 'value', expectedValue: 'H⁺', acceptedText: ['H+', 'أيونات الهيدروجين', 'الحمض'] },
      { rowId: 'h2-final', columnId: 'value', expectedValue: 0.025, tolerance: 0.001, acceptedText: ['2.5e-2'] },
    ],
    expectedMeasurements: [
      {
        id: 'hydrogen-amount',
        expected: { value: 0.025, unit: 'mol' },
        tolerance: 0.001,
      },
    ],
    observationItems: [
      { id: 'stoichiometry-two-h', label: 'المعادلة تستهلك 2 mol من H⁺ لكل 1 mol من Zn.', detail: 'المعاملات الستوكيومترية ضرورية في مقارنة التقدم.', kind: 'reaction' },
      { id: 'limiting-h', label: 'n(H⁺)/2=0.025 mol أصغر من n(Zn)=0.030 mol.', detail: 'لذلك H⁺ هو المتفاعل المحد.', kind: 'comparison' },
      { id: 'h2-equals-xmax', label: 'بما أن معامل H₂ هو 1 فإن n(H₂)=xmax=0.025 mol.', detail: 'كمية الغاز النهائية تساوي التقدم النهائي.', kind: 'table' },
      { id: 'zn-limiting', label: 'الزنك هو المتفاعل المحد لأنه صلب.', detail: 'اختيار مضلل: المقارنة الكمية هي الحاسمة.', kind: 'distractor' },
    ],
    prompt: {
      title: 'أكمل جدول التقدم وحدد الغاز المتشكل.',
      task: 'سمّ تركيب المتابعة، احسب xmax، حدد المتفاعل المحد، ثم اربط كمية H₂ بالتقدم.',
      requiredObservationIds: [
        'stoichiometry-two-h',
        'limiting-h',
        'h2-equals-xmax',
      ],
      requiredConclusionKeywords: ['xmax', 'H⁺', 'محدد', 'H₂', '0.025'],
      scaffoldPhrases: [
        'نقارن n0(Zn)/1=0.030 و n0(H⁺)/2=0.025.',
        'إذن H⁺ هو المتفاعل المحد وxmax=0.025 mol.',
        'بما أن معامل H₂ يساوي 1 فإن n(H₂)=0.025 mol.',
      ],
    },
  },
];

const SVT_EXPERIMENTAL_GRAPH_TABLE_PRESETS = [
  {
    id: 'glucobay-alpha-glucosidase',
    title: 'Glucobay ونشاط α غلوكوزيداز',
    subtitle: 'قراءة منحنيين تجريبيين لتفسير أثر دواء على نشاط إنزيم.',
    bacContext:
      'نمط BAC متكرر في وحدة الإنزيمات: مقارنة منحنيين بوجود/غياب مثبط، قراءة قيمة قصوى، ثم ربط النتيجة بالموقع الفعال ونسبة السكر في الدم.',
    sourceHint:
      'مستوحى من SVT SE 2016: نشاط α غلوكوزيداز بوجود وغياب Glucobay.',
    protocol: {
      title: 'بروتوكول مختصر',
      steps: [
        'نحضّر أوساطا بتراكيز متزايدة من السكريات قليلة التعدد.',
        'نقيس نشاط إنزيم α غلوكوزيداز في غياب الدواء ثم في وجود Glucobay.',
        'نقارن سرعة النشاط ونستنتج أثر الدواء على تشكل الغلوكوز.',
      ],
    },
    table: {
      title: 'جدول النتائج التجريبية',
      columns: [
        { id: 'substrate', label: 'تركيز الركيزة', unit: 'mmol' },
        { id: 'without', label: 'النشاط دون Glucobay', unit: 'و.ت' },
        { id: 'with', label: 'النشاط مع Glucobay', unit: 'و.ت' },
      ],
      rows: [
        { id: 's0', label: '0 mmol', cells: { substrate: 0, without: 0, with: 0 } },
        { id: 's5', label: '5 mmol', cells: { substrate: 5, without: 4, with: 1.2 } },
        { id: 's10', label: '10 mmol', cells: { substrate: 10, without: 7, with: 2.2 } },
        { id: 's15', label: '15 mmol', cells: { substrate: 15, without: 8.5, with: 3.2 } },
        { id: 's25', label: '25 mmol', cells: { substrate: 25, without: 9, with: 4.2 } },
        { id: 's30', label: '30 mmol', cells: { substrate: 30, without: 9, with: 4.4 } },
      ],
    },
    graph: {
      title: 'تغير نشاط الإنزيم حسب تركيز الركيزة',
      xAxis: { label: 'تركيز الركيزة', unit: 'mmol', min: 0, max: 30 },
      yAxis: { label: 'نشاط الإنزيم', unit: 'و.ت', min: 0, max: 10 },
      series: [
        {
          id: 'without-glucobay',
          title: 'دون Glucobay',
          kind: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 4 },
            { x: 10, y: 7 },
            { x: 15, y: 8.5 },
            { x: 25, y: 9 },
            { x: 30, y: 9 },
          ],
        },
        {
          id: 'with-glucobay',
          title: 'مع Glucobay',
          kind: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 1.2 },
            { x: 10, y: 2.2 },
            { x: 15, y: 3.2 },
            { x: 25, y: 4.2 },
            { x: 30, y: 4.4 },
          ],
        },
      ],
    },
    expectedReadings: [
      {
        id: 'without-activity-25',
        label: 'النشاط دون الدواء عند 25 mmol',
        source: 'graph',
        seriesId: 'without-glucobay',
        x: 25,
        expectedValue: 9,
        tolerance: 0.4,
        unit: 'و.ت',
      },
      {
        id: 'with-activity-25',
        label: 'النشاط مع Glucobay عند 25 mmol',
        source: 'graph',
        seriesId: 'with-glucobay',
        x: 25,
        expectedValue: 4.2,
        tolerance: 0.45,
        unit: 'و.ت',
      },
    ],
    observationItems: [
      {
        id: 'without-rises-plateaus',
        label: 'في غياب Glucobay يرتفع النشاط بسرعة ثم يبلغ قيمة أعظمية تقارب 9.',
        detail: 'هذا يحدد السلوك المرجعي للإنزيم قبل إضافة الدواء.',
        kind: 'trend',
      },
      {
        id: 'glucobay-lowers-activity',
        label: 'في وجود Glucobay يبقى نشاط α غلوكوزيداز أقل في كل التراكيز.',
        detail: 'المقارنة بين المنحنيين هي الدليل المباشر على التثبيط.',
        kind: 'comparison',
      },
      {
        id: 'active-site-competition',
        label: 'تشابه Glucobay مع الركيزة يسمح له بمنافسة الركيزة على الموقع الفعال.',
        detail: 'هذه الفكرة تفسر لماذا ينخفض تشكل الغلوكوز في الدم.',
        kind: 'mechanism',
      },
      {
        id: 'glucobay-raises-activity',
        label: 'Glucobay يزيد نشاط الإنزيم ويزيد إنتاج الغلوكوز.',
        detail: 'اختيار مضلل: المنحنى مع الدواء أدنى من المنحنى المرجعي.',
        kind: 'distractor',
      },
    ],
    prompt: {
      title: 'استنتج أثر Glucobay على النشاط الإنزيمي.',
      task: 'اقرأ القيمتين عند 25 mmol، اختر الملاحظات الصحيحة، ثم اكتب استنتاجا يربط الدواء بنشاط α غلوكوزيداز ونسبة السكر في الدم.',
      requiredObservationIds: [
        'without-rises-plateaus',
        'glucobay-lowers-activity',
        'active-site-competition',
      ],
      requiredConclusionKeywords: [
        'Glucobay',
        'α غلوكوزيداز',
        'يثبط',
        'الموقع الفعال',
        'الغلوكوز',
      ],
      scaffoldPhrases: [
        'عند 25 mmol يبلغ نشاط الإنزيم دون الدواء حوالي 9 و.ت.',
        'وجود Glucobay يخفض نشاط α غلوكوزيداز مقارنة بالشاهد.',
        'أستنتج أن الدواء يثبط الإنزيم فينقص تشكل الغلوكوز.',
      ],
    },
  },
  {
    id: 'enzyme-ph-optimum',
    title: 'pH والنشاط الإنزيمي',
    subtitle: 'تحديد pH الأمثل وربط تغير النشاط ببنية الموقع الفعال.',
    bacContext:
      'نمط BAC متكرر: منحنى نشاط إنزيمي بدلالة pH، قراءة القيمة المثلى، ثم تفسير أثر الحموضة على البنية الفراغية والموقع الفعال.',
    sourceHint: 'مستوحى من SVT SE 2008: تأثير pH على النشاط الإنزيمي.',
    protocol: {
      title: 'بروتوكول مختصر',
      steps: [
        'نحضر أوساطا لها قيم pH مختلفة مع نفس كمية الإنزيم والركيزة.',
        'نقيس سرعة النشاط الإنزيمي في كل وسط.',
        'نحدد الوسط الأمثل ونفسر انخفاض النشاط في الأوساط الشديدة الحموضة أو القاعدية.',
      ],
    },
    table: {
      title: 'نشاط الإنزيم حسب pH الوسط',
      columns: [
        { id: 'ph', label: 'pH الوسط' },
        { id: 'activity', label: 'النشاط الإنزيمي', unit: '%' },
      ],
      rows: [
        { id: 'ph3', label: 'pH 3', cells: { ph: 3, activity: 12 } },
        { id: 'ph5', label: 'pH 5', cells: { ph: 5, activity: 58 } },
        { id: 'ph7', label: 'pH 7', cells: { ph: 7, activity: 100 } },
        { id: 'ph9', label: 'pH 9', cells: { ph: 9, activity: 52 } },
        { id: 'ph11', label: 'pH 11', cells: { ph: 11, activity: 9 } },
      ],
    },
    graph: {
      title: 'تأثير pH على سرعة النشاط',
      xAxis: { label: 'pH', min: 3, max: 11 },
      yAxis: { label: 'النشاط النسبي', unit: '%', min: 0, max: 100 },
      series: [
        {
          id: 'ph-activity',
          title: 'نشاط الإنزيم',
          kind: 'line',
          points: [
            { x: 3, y: 12 },
            { x: 5, y: 58 },
            { x: 7, y: 100 },
            { x: 9, y: 52 },
            { x: 11, y: 9 },
          ],
        },
      ],
    },
    expectedReadings: [
      {
        id: 'optimum-ph',
        label: 'قيمة pH التي يكون فيها النشاط أعظميا',
        source: 'table',
        rowId: 'ph7',
        columnId: 'ph',
        expectedValue: 7,
        tolerance: 0.1,
      },
      {
        id: 'max-activity',
        label: 'النشاط النسبي عند pH = 7',
        source: 'graph',
        seriesId: 'ph-activity',
        x: 7,
        expectedValue: 100,
        tolerance: 3,
        unit: '%',
      },
    ],
    observationItems: [
      {
        id: 'ph7-optimum',
        label: 'النشاط أعظمي عند pH = 7.',
        detail: 'هذه هي القراءة المركزية للمنحنى.',
        kind: 'trend',
      },
      {
        id: 'activity-drops-extremes',
        label: 'ينخفض النشاط في الوسط الحمضي القوي والقاعدي القوي.',
        detail: 'المقارنة مع pH 7 تكشف أثر شروط الوسط.',
        kind: 'comparison',
      },
      {
        id: 'ph-active-site-charges',
        label: 'تغير pH يؤثر في شحنات أحماض أمينية في الموقع الفعال.',
        detail: 'هذا يفسر فقدان التكامل بين الإنزيم والركيزة.',
        kind: 'mechanism',
      },
      {
        id: 'all-ph-equal',
        label: 'يبقى نشاط الإنزيم ثابتا مهما تغير pH.',
        detail: 'اختيار مضلل: القيم التجريبية تتغير بوضوح.',
        kind: 'distractor',
      },
    ],
    prompt: {
      title: 'حدد pH الأمثل وفسر تغير النشاط.',
      task: 'اقرأ pH الأمثل والنشاط الموافق، اختر الملاحظات الصحيحة، ثم اكتب استنتاجا يربط pH ببنية الموقع الفعال.',
      requiredObservationIds: [
        'ph7-optimum',
        'activity-drops-extremes',
        'ph-active-site-charges',
      ],
      requiredConclusionKeywords: [
        'pH',
        '7',
        'النشاط',
        'الموقع الفعال',
        'بنية',
      ],
      scaffoldPhrases: [
        'تبلغ سرعة النشاط قيمة أعظمية عند pH = 7.',
        'تنخفض سرعة النشاط في الأوساط الشديدة الحموضة أو القاعدية.',
        'أستنتج أن pH يؤثر في بنية الموقع الفعال وتكامله مع الركيزة.',
      ],
    },
  },
];

const SVT_DIAGRAM_LABELING_WORKBENCH_PRESETS = [
  {
    id: 'enzyme-active-site-labeling',
    title: 'رسم إنزيم وموقع فعال',
    subtitle: 'تسمية عناصر الرسم ثم ربط البنية بالتكامل مع الركيزة.',
    bacContext:
      'تتكرر في BAC رسومات بنية البروتين والإنزيم، حيث يطلب من الطالب تسمية عناصر الرسم واستنتاج علاقة البنية بالوظيفة.',
    instrument: {
      subjectLabel: 'SVT Lab',
      title: 'ورشة تسمية الرسوم الحيوية',
    },
    sourceDocuments: [
      {
        id: 'enzyme-doc',
        title: 'مفتاح قراءة الرسم',
        bullets: [
          'يمثل الشكل إنزيما قبل وبعد ارتباط الركيزة.',
          'يحدث التفاعل عندما تكون الركيزة مكملة للموقع الفعال.',
        ],
      },
    ],
    diagram: {
      title: 'إنزيم وركيزة',
      description: 'استعمل التسميات العلمية الدقيقة للأجزاء الأساسية في الرسم.',
      targets: [
        { id: 'enzyme', label: '1', x: 34, y: 58, expectedLabel: 'إنزيم', acceptedLabels: ['enzyme'] },
        { id: 'active-site', label: '2', x: 48, y: 34, expectedLabel: 'موقع فعال', acceptedLabels: ['الموقع الفعال'] },
        { id: 'substrate', label: '3', x: 68, y: 30, expectedLabel: 'ركيزة', acceptedLabels: ['substrat'] },
        { id: 'products', label: '4', x: 76, y: 64, expectedLabel: 'نواتج', acceptedLabels: ['produits'] },
      ],
    },
    observationItems: [
      { id: 'specific-fit', label: 'الركيزة ترتبط بالموقع الفعال بتكامل شكلي.', detail: 'التكامل يفسر نوعية النشاط الإنزيمي.', kind: 'structure' },
      { id: 'active-site-function', label: 'الموقع الفعال هو جزء من بنية الإنزيم المسؤول عن التفاعل.', detail: 'هذه تسمية ووظيفة في الوقت نفسه.', kind: 'label' },
      { id: 'products-after-reaction', label: 'بعد التفاعل تتحول الركيزة إلى نواتج.', detail: 'قراءة تسلسل الرسم.', kind: 'process' },
      { id: 'substrate-is-enzyme', label: 'الركيزة هي الإنزيم نفسه.', detail: 'اختيار مضلل: الركيزة جزيء يتثبت على الإنزيم.', kind: 'distractor' },
    ],
    prompt: {
      title: 'سمّ الرسم واربط البنية بالوظيفة.',
      task: 'أدخل تسميات العناصر، اختر الملاحظات الصحيحة، ثم اكتب خلاصة عن دور الموقع الفعال.',
      requiredObservationIds: [
        'specific-fit',
        'active-site-function',
        'products-after-reaction',
      ],
      requiredConclusionKeywords: ['موقع فعال', 'ركيزة', 'إنزيم', 'تكامل'],
      scaffoldPhrases: [
        'يمتلك الإنزيم موقعا فعالا نوعيا.',
        'ترتبط الركيزة بالموقع الفعال بسبب التكامل الشكلي.',
        'ينتج عن ذلك تحول الركيزة إلى نواتج.',
      ],
    },
  },
  {
    id: 'chloroplast-ultrastructure-labeling',
    title: 'رسم بلاستيدة خضراء',
    subtitle: 'تسمية البنية الداخلية وربطها بمرحلتَي التركيب الضوئي.',
    bacContext:
      'في أسئلة التركيب الضوئي تظهر رسوم البلاستيدة الخضراء مع طلب تسمية الغرانا، الستروما، والأغشية.',
    instrument: {
      subjectLabel: 'SVT Lab',
      title: 'ورشة تسمية الرسوم الحيوية',
    },
    sourceDocuments: [
      {
        id: 'chloroplast-doc',
        title: 'مفتاح قراءة البلاستيدة',
        bullets: [
          'توجد التفاعلات الضوئية على مستوى أغشية التيلاكويد.',
          'تتم تفاعلات تثبيت CO₂ في الستروما.',
        ],
      },
    ],
    diagram: {
      title: 'بنية البلاستيدة الخضراء',
      description: 'سمّ البنيات الداخلية التي تظهر في الرسم التخطيطي.',
      targets: [
        { id: 'outer-membrane', label: '1', x: 24, y: 50, expectedLabel: 'غشاء خارجي', acceptedLabels: ['غشاء'] },
        { id: 'stroma', label: '2', x: 52, y: 50, expectedLabel: 'ستروما', acceptedLabels: ['stroma'] },
        { id: 'granum', label: '3', x: 66, y: 32, expectedLabel: 'غرانوم', acceptedLabels: ['غرانا'] },
        { id: 'thylakoid', label: '4', x: 70, y: 66, expectedLabel: 'تيلاكويد', acceptedLabels: ['thylakoid'] },
      ],
    },
    observationItems: [
      { id: 'light-reactions-thylakoid', label: 'التفاعلات الضوئية ترتبط بأغشية التيلاكويد.', detail: 'هذه البنية تحمل أصبغة اليخضور.', kind: 'location' },
      { id: 'co2-fixation-stroma', label: 'تثبيت CO₂ يتم في الستروما.', detail: 'الستروما وسط إنزيمي داخل البلاستيدة.', kind: 'location' },
      { id: 'grana-are-stacks', label: 'الغرانا تراكمات من التيلاكويدات.', detail: 'هذه علاقة بنيوية تساعد على التسمية.', kind: 'structure' },
      { id: 'mitochondria-site', label: 'البلاستيدة هي مقر التخمر اللبني.', detail: 'اختيار مضلل: التخمر لا يحدث في البلاستيدة.', kind: 'distractor' },
    ],
    prompt: {
      title: 'سمّ البلاستيدة واربط البنية بالتركيب الضوئي.',
      task: 'أكمل التسميات، اختر الملاحظات المدعومة، ثم اكتب خلاصة عن مكان حدوث التفاعلات.',
      requiredObservationIds: [
        'light-reactions-thylakoid',
        'co2-fixation-stroma',
        'grana-are-stacks',
      ],
      requiredConclusionKeywords: ['تيلاكويد', 'ستروما', 'CO₂', 'ضوئية'],
      scaffoldPhrases: [
        'تتم التفاعلات الضوئية على أغشية التيلاكويد.',
        'توجد تفاعلات تثبيت CO₂ في الستروما.',
        'الغرانا تراكمات من التيلاكويدات داخل البلاستيدة.',
      ],
    },
  },
];

const SVT_ENERGY_METABOLISM_WORKBENCH_PRESETS = [
  {
    id: 'photosynthesis-light-oxygen-release',
    title: 'التركيب الضوئي وانطلاق O₂',
    subtitle: 'قراءة تأثير شدة الإضاءة على انطلاق O₂ وربطه بتثبيت CO₂.',
    bacContext:
      'في BAC تظهر وثائق تبادل الغازات عند النبات الأخضر مع منحنى O₂ أو CO₂، ثم يطلب تفسير علاقة الضوء بالتركيب الضوئي.',
    instrument: {
      subjectLabel: 'SVT Lab',
      title: 'ورشة الطاقة الخلوية',
      iconKind: 'graph',
    },
    sourceDocuments: [
      {
        id: 'photosynthesis-protocol',
        title: 'بروتوكول التجربة',
        bullets: [
          'نقيس كمية O₂ المنطلقة من نبات مائي عند شدات إضاءة مختلفة.',
          'انطلاق O₂ دليل على حدوث المرحلة الضوئية للتركيب الضوئي.',
        ],
      },
    ],
    table: {
      title: 'قياسات انطلاق O₂',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'rate-200', label: '200 lux', cells: { item: 'O₂ عند 200 lux', value: null, unit: 'u.a' } },
        { id: 'rate-600', label: '600 lux', cells: { item: 'O₂ عند 600 lux', value: null, unit: 'u.a' } },
        { id: 'threshold', label: 'عتبة', cells: { item: 'بداية التشبع', value: null, unit: 'lux' } },
      ],
    },
    graph: {
      title: 'تأثير شدة الإضاءة على انطلاق O₂',
      xAxis: { label: 'شدة الإضاءة', unit: 'lux', min: 0, max: 800 },
      yAxis: { label: 'O₂ المنطلق', unit: 'u.a', min: 0, max: 45 },
      series: [
        {
          id: 'oxygen',
          title: 'O₂',
          kind: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 200, y: 18 },
            { x: 400, y: 33 },
            { x: 600, y: 40 },
            { x: 800, y: 41 },
          ],
        },
      ],
    },
    measurements: [
      { id: 'plateau-rate', label: 'قيمة التشبع التقريبية', unitHint: 'u.a' },
    ],
    expectedCells: [
      { rowId: 'rate-200', columnId: 'value', expectedValue: 18, tolerance: 2 },
      { rowId: 'rate-600', columnId: 'value', expectedValue: 40, tolerance: 2 },
      { rowId: 'threshold', columnId: 'value', expectedValue: 600, tolerance: 80 },
    ],
    expectedMeasurements: [
      {
        id: 'plateau-rate',
        expected: { value: 40, unit: 'u.a' },
        tolerance: 3,
        acceptedUnits: ['ua', 'وحدة'],
      },
    ],
    observationItems: [
      { id: 'oxygen-rises-with-light', label: 'يزداد انطلاق O₂ بزيادة شدة الإضاءة في البداية.', detail: 'الإضاءة عامل محدد للمرحلة الضوئية.', kind: 'trend' },
      { id: 'oxygen-plateau', label: 'بعد حوالي 600 lux يبلغ المنحنى قيمة شبه ثابتة.', detail: 'عامل آخر غير الضوء يصبح محددا.', kind: 'graph' },
      { id: 'photosynthesis-link', label: 'انطلاق O₂ يدل على تركيب ضوئي وتحرير الأكسجين.', detail: 'يربط المعطى التجريبي بالآلية الحيوية.', kind: 'mechanism' },
      { id: 'dark-produces-oxygen', label: 'في الظلام يكون انطلاق O₂ أعظميا.', detail: 'اختيار مضلل: المنحنى يبدأ من قيمة شبه معدومة.', kind: 'distractor' },
    ],
    prompt: {
      title: 'حلل منحنى انطلاق O₂.',
      task: 'اقرأ القيم من الجدول والمنحنى، اختر الملاحظات الصحيحة، ثم اكتب استنتاجا عن دور الضوء.',
      requiredObservationIds: [
        'oxygen-rises-with-light',
        'oxygen-plateau',
        'photosynthesis-link',
      ],
      requiredConclusionKeywords: ['O₂', 'إضاءة', 'تركيب', 'تشبع'],
      scaffoldPhrases: [
        'يزداد انطلاق O₂ عندما ترتفع شدة الإضاءة.',
        'يصبح المنحنى شبه ثابت ابتداء من حوالي 600 lux.',
        'أستنتج أن الضوء عامل محدد للتركيب الضوئي إلى أن يظهر عامل محدد آخر.',
      ],
    },
  },
  {
    id: 'respiration-fermentation-atp-yield',
    title: 'تنفس وتخمر ومردود ATP',
    subtitle: 'مقارنة مردود الطاقة بين التنفس الخلوي والتخمر.',
    bacContext:
      'في التحولات الطاقوية تقارن مواضيع BAC بين وثائق وجود O₂، استهلاك الغلوكوز، وكمية ATP الناتجة.',
    instrument: {
      subjectLabel: 'SVT Lab',
      title: 'ورشة الطاقة الخلوية',
      iconKind: 'graph',
    },
    sourceDocuments: [
      {
        id: 'metabolism-doc',
        title: 'معطيات المقارنة',
        bullets: [
          'في وجود O₂ تستعمل الخلية التنفس الخلوي.',
          'في غياب O₂ تلجأ الخلية إلى التخمر.',
          'التنفس يعطي مردودا طاقويا أكبر من التخمر.',
        ],
      },
    ],
    table: {
      title: 'مقارنة المسارين',
      columns: [
        { id: 'condition', label: 'الشرط' },
        { id: 'pathway', label: 'المسار' },
        { id: 'atp', label: 'ATP/glucose' },
      ],
      rows: [
        { id: 'with-o2', label: 'وجود O₂', cells: { condition: 'وجود O₂', pathway: null, atp: null } },
        { id: 'without-o2', label: 'غياب O₂', cells: { condition: 'غياب O₂', pathway: null, atp: null } },
        { id: 'yield-ratio', label: 'المقارنة', cells: { condition: 'مردود الطاقة', pathway: 'تنفس/تخمر', atp: null } },
      ],
    },
    expectedCells: [
      { rowId: 'with-o2', columnId: 'pathway', expectedValue: 'تنفس', acceptedText: ['تنفس خلوي', 'respiration'] },
      { rowId: 'with-o2', columnId: 'atp', expectedValue: 36, tolerance: 2, acceptedText: ['36 ATP'] },
      { rowId: 'without-o2', columnId: 'pathway', expectedValue: 'تخمر', acceptedText: ['fermentation'] },
      { rowId: 'without-o2', columnId: 'atp', expectedValue: 2, tolerance: 0.5, acceptedText: ['2 ATP'] },
      { rowId: 'yield-ratio', columnId: 'atp', expectedValue: 18, tolerance: 2, acceptedText: ['18 مرة'] },
    ],
    observationItems: [
      { id: 'oxygen-respiration', label: 'وجود O₂ يسمح بالتنفس الخلوي.', detail: 'الأكسجين مستقبل نهائي في المسار الهوائي.', kind: 'condition' },
      { id: 'no-oxygen-fermentation', label: 'غياب O₂ يوجه الخلية نحو التخمر.', detail: 'التخمر يسمح باستمرار إنتاج ATP ضعيف.', kind: 'condition' },
      { id: 'respiration-better-yield', label: 'مردود التنفس أكبر بكثير: حوالي 36 ATP مقابل 2 ATP.', detail: 'المقارنة الكمية هي قلب السؤال.', kind: 'comparison' },
      { id: 'fermentation-best-yield', label: 'التخمر يعطي مردودا أكبر من التنفس.', detail: 'اختيار مضلل: الجدول يعطي العكس.', kind: 'distractor' },
    ],
    prompt: {
      title: 'قارن التنفس والتخمر من حيث المردود.',
      task: 'أكمل الجدول، اختر الملاحظات الصحيحة، ثم اكتب خلاصة تربط O₂ بمردود ATP.',
      requiredObservationIds: [
        'oxygen-respiration',
        'no-oxygen-fermentation',
        'respiration-better-yield',
      ],
      requiredConclusionKeywords: ['O₂', 'تنفس', 'تخمر', 'ATP', 'مردود'],
      scaffoldPhrases: [
        'في وجود O₂ يحدث التنفس الخلوي وينتج مردود ATP مرتفع.',
        'في غياب O₂ يحدث التخمر بمردود ضعيف.',
        'أستنتج أن التنفس أكثر فعالية طاقويا من التخمر.',
      ],
    },
  },
];

const SVT_NERVOUS_IMMUNE_RESPONSE_WORKBENCH_PRESETS = [
  {
    id: 'reflex-arc-synapse-flow',
    title: 'قوس انعكاسية ومشبك عصبي',
    subtitle: 'تسمية عناصر المسار العصبي وترتيب انتقال السيالة.',
    bacContext:
      'في BAC تظهر وثائق قوس انعكاسية أو مشبك عصبي، ويطلب تحديد المستقبل والعصبونات والمركز العصبي ثم تفسير اتجاه السيالة.',
    instrument: {
      subjectLabel: 'SVT Lab',
      title: 'ورشة الاستجابة العصبية والمناعية',
    },
    sourceDocuments: [
      {
        id: 'reflex-doc',
        title: 'مفتاح قراءة القوس الانعكاسية',
        bullets: [
          'ينشأ التنبيه في مستقبل حسي.',
          'تنتقل السيالة عبر عصبون حسي نحو النخاع الشوكي.',
          'يغادر الأمر الحركي عبر عصبون حركي نحو العضلة.',
        ],
      },
    ],
    diagram: {
      title: 'قوس انعكاسية مبسطة',
      description: 'سمّ عناصر المسار حسب اتجاه السيالة العصبية.',
      targets: [
        { id: 'receptor', label: '1', x: 18, y: 54, expectedLabel: 'مستقبل حسي', acceptedLabels: ['مستقبل'] },
        { id: 'sensory-neuron', label: '2', x: 38, y: 38, expectedLabel: 'عصبون حسي', acceptedLabels: ['وارد'] },
        { id: 'spinal-cord', label: '3', x: 56, y: 48, expectedLabel: 'نخاع شوكي', acceptedLabels: ['مركز عصبي'] },
        { id: 'motor-neuron', label: '4', x: 70, y: 62, expectedLabel: 'عصبون حركي', acceptedLabels: ['صادر'] },
        { id: 'muscle', label: '5', x: 86, y: 52, expectedLabel: 'عضلة', acceptedLabels: ['مستجيب'] },
      ],
    },
    observationItems: [
      { id: 'sensory-before-center', label: 'السيالة الحسية تنتقل من المستقبل إلى المركز العصبي.', detail: 'العصبون الحسي وارد نحو النخاع الشوكي.', kind: 'flow' },
      { id: 'motor-after-center', label: 'العصبون الحركي ينقل الأمر من المركز إلى العضلة.', detail: 'هذه المرحلة مسؤولة عن الاستجابة.', kind: 'flow' },
      { id: 'synapse-one-way', label: 'الاتصال المشبكي يفرض انتقالا في اتجاه واحد.', detail: 'يساعد ذلك على ترتيب مراحل الاستجابة.', kind: 'mechanism' },
      { id: 'muscle-is-receptor', label: 'العضلة هي المستقبل الحسي الأول في المسار.', detail: 'اختيار مضلل: العضلة مستجيب حركي.', kind: 'distractor' },
    ],
    prompt: {
      title: 'سمّ القوس الانعكاسية وفسر اتجاه السيالة.',
      task: 'أدخل التسميات، اختر الملاحظات الصحيحة، ثم اكتب خلاصة قصيرة عن انتقال السيالة.',
      requiredObservationIds: [
        'sensory-before-center',
        'motor-after-center',
        'synapse-one-way',
      ],
      requiredConclusionKeywords: ['مستقبل', 'عصبون حسي', 'نخاع', 'عصبون حركي', 'عضلة'],
      scaffoldPhrases: [
        'تنطلق السيالة من مستقبل حسي ثم تمر عبر عصبون حسي.',
        'يعالج المركز العصبي الرسالة ثم يرسل أمرا عبر عصبون حركي.',
        'تصل الرسالة إلى العضلة فتحدث الاستجابة.',
      ],
    },
  },
  {
    id: 'immune-response-cell-chain',
    title: 'سلسلة الاستجابة المناعية النوعية',
    subtitle: 'تسمية الخلايا والجزيئات وربطها بإنتاج الأجسام المضادة.',
    bacContext:
      'في المناعة النوعية يطلب BAC غالبا قراءة مخطط تفاعل مولد الضد مع الخلايا اللمفاوية ثم تفسير إنتاج الأجسام المضادة.',
    instrument: {
      subjectLabel: 'SVT Lab',
      title: 'ورشة الاستجابة العصبية والمناعية',
    },
    sourceDocuments: [
      {
        id: 'immune-doc',
        title: 'مفتاح قراءة السلسلة المناعية',
        bullets: [
          'تعرض الخلية العارضة محددات مولد الضد.',
          'ينشط LT4 خلايا LB النوعية.',
          'تتمايز LB إلى خلايا بلازمية تفرز أجساما مضادة نوعية.',
        ],
      },
    ],
    diagram: {
      title: 'استجابة مناعية خلطية',
      description: 'سمّ العناصر حسب ترتيب تنشيط الاستجابة.',
      targets: [
        { id: 'antigen', label: '1', x: 18, y: 40, expectedLabel: 'مولد ضد', acceptedLabels: ['antigene', 'antigen'] },
        { id: 'apc', label: '2', x: 34, y: 58, expectedLabel: 'خلية عارضة', acceptedLabels: ['CPA'] },
        { id: 't-helper', label: '3', x: 52, y: 35, expectedLabel: 'LT4', acceptedLabels: ['لمفاوية T4'] },
        { id: 'b-cell', label: '4', x: 68, y: 58, expectedLabel: 'LB', acceptedLabels: ['لمفاوية B'] },
        { id: 'antibody', label: '5', x: 86, y: 40, expectedLabel: 'جسم مضاد', acceptedLabels: ['anticorps'] },
      ],
    },
    observationItems: [
      { id: 'antigen-specificity', label: 'مولد الضد يحمل محددات نوعية تتعرف عليها اللمفاويات.', detail: 'النوعية هي أساس الاستجابة المناعية.', kind: 'specificity' },
      { id: 'lt4-activates-lb', label: 'LT4 ينشط LB النوعية بعد العرض.', detail: 'هذه حلقة تنظيمية في الاستجابة الخلطية.', kind: 'interaction' },
      { id: 'plasma-secretes-antibodies', label: 'تتمايز LB إلى خلايا بلازمية تفرز أجساما مضادة.', detail: 'الأجسام المضادة ترتبط بمولد الضد نوعيا.', kind: 'process' },
      { id: 'antibodies-activate-lt4-first', label: 'الأجسام المضادة هي التي تنشط LT4 في البداية.', detail: 'اختيار مضلل: التنشيط يبدأ بالعرض والتعرف الخلوي.', kind: 'distractor' },
    ],
    prompt: {
      title: 'رتب سلسلة الاستجابة المناعية الخلطية.',
      task: 'سمّ الخلايا والجزيئات، اختر الملاحظات الصحيحة، ثم اكتب خلاصة عن إنتاج الأجسام المضادة.',
      requiredObservationIds: [
        'antigen-specificity',
        'lt4-activates-lb',
        'plasma-secretes-antibodies',
      ],
      requiredConclusionKeywords: ['مولد ضد', 'LT4', 'LB', 'أجسام مضادة', 'نوعية'],
      scaffoldPhrases: [
        'تعرض الخلية العارضة مولد الضد وتنشط LT4.',
        'ينشط LT4 الخلايا LB النوعية.',
        'تتمايز LB إلى خلايا بلازمية مفرزة للأجسام المضادة.',
      ],
    },
  },
];

const SVT_TECTONICS_WORKBENCH_PRESETS = [
  {
    id: 'subduction-cross-section-interpretation',
    title: 'مقطع اندساس وتفسير زلزالي',
    subtitle: 'تسمية عناصر منطقة اندساس وربط الزلازل بمستوى بنيوف.',
    bacContext:
      'في الجيولوجيا تظهر خرائط ومقاطع اندساس مع توزع بؤر زلزالية، ويطلب استنتاج طبيعة حركة الصفائح.',
    instrument: {
      subjectLabel: 'SVT Lab',
      title: 'ورشة التكتونية',
      iconKind: 'graph',
    },
    sourceDocuments: [
      {
        id: 'subduction-doc',
        title: 'مفتاح قراءة المقطع',
        bullets: [
          'تنتظم بؤر الزلازل على مستوى مائل يسمى مستوى بنيوف.',
          'تنغرز الصفيحة المحيطية تحت صفيحة قارية.',
          'يرافق الاندساس خندق محيطي ونشاط بركاني.',
        ],
      },
    ],
    diagram: {
      title: 'منطقة اندساس',
      description: 'سمّ العناصر الأساسية في المقطع الجيولوجي.',
      targets: [
        { id: 'oceanic-plate', label: '1', x: 28, y: 62, expectedLabel: 'صفيحة محيطية', acceptedLabels: ['ليتوسفير محيطي'] },
        { id: 'continental-plate', label: '2', x: 70, y: 42, expectedLabel: 'صفيحة قارية', acceptedLabels: ['ليتوسفير قاري'] },
        { id: 'trench', label: '3', x: 44, y: 48, expectedLabel: 'خندق محيطي', acceptedLabels: ['خندق'] },
        { id: 'benioff', label: '4', x: 58, y: 66, expectedLabel: 'مستوى بنيوف', acceptedLabels: ['Benioff'] },
        { id: 'volcano', label: '5', x: 78, y: 28, expectedLabel: 'بركان', acceptedLabels: ['قوس بركاني'] },
      ],
    },
    observationItems: [
      { id: 'inclined-earthquakes', label: 'تنتظم بؤر الزلازل على مستوى مائل نحو العمق.', detail: 'هذا هو مؤشر الاندساس في المقطع.', kind: 'evidence' },
      { id: 'oceanic-descends', label: 'الصفيحة المحيطية تنغرز تحت الصفيحة القارية.', detail: 'تفسر الخندق والنشاط الزلزالي.', kind: 'model' },
      { id: 'volcanism-related', label: 'النشاط البركاني يرافق منطقة الاندساس.', detail: 'القوس البركاني من دلائل الحدود التقاربية.', kind: 'evidence' },
      { id: 'divergence-at-trench', label: 'الخندق يدل على تباعد صفائح وتكون قشرة جديدة.', detail: 'اختيار مضلل: تكون القشرة الجديدة عند الذروة المحيطية.', kind: 'distractor' },
    ],
    prompt: {
      title: 'فسر المقطع كمنطقة اندساس.',
      task: 'سمّ عناصر المقطع، اختر الأدلة الصحيحة، ثم اكتب خلاصة عن حركة الصفائح.',
      requiredObservationIds: [
        'inclined-earthquakes',
        'oceanic-descends',
        'volcanism-related',
      ],
      requiredConclusionKeywords: ['اندساس', 'صفيحة محيطية', 'بنيوف', 'خندق'],
      scaffoldPhrases: [
        'توزع الزلازل على مستوى مائل يمثل مستوى بنيوف.',
        'تنغرز الصفيحة المحيطية تحت الصفيحة القارية.',
        'يدل وجود الخندق والقوس البركاني على حد تقاربي اندساسي.',
      ],
    },
  },
  {
    id: 'ocean-ridge-spreading-rate',
    title: 'ذروة محيطية وسرعة الاتساع',
    subtitle: 'قراءة أشرطة العمر حول الذروة ثم حساب سرعة اتساع الصفيحة.',
    bacContext:
      'في تكتونية الصفائح يستغل الطالب خرائط عمر القشرة المحيطية حول الذروة لحساب سرعة الاتساع ودعم فرضية التباعد.',
    instrument: {
      subjectLabel: 'SVT Lab',
      title: 'ورشة التكتونية',
      iconKind: 'graph',
    },
    sourceDocuments: [
      {
        id: 'ridge-doc',
        title: 'معطيات الخريطة',
        bullets: [
          'توجد صخور عمرها 2 Ma على بعد 40 km من محور الذروة.',
          'الأعمار متماثلة تقريبا على جانبي الذروة.',
          'سرعة الاتساع الجانبية تحسب من المسافة/العمر.',
        ],
      },
    ],
    table: {
      title: 'حساب سرعة الاتساع',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'distance', label: 'd', cells: { item: 'المسافة عن الذروة', value: 40, unit: 'km' } },
        { id: 'age', label: 't', cells: { item: 'العمر', value: 2, unit: 'Ma' } },
        { id: 'rate', label: 'v', cells: { item: 'سرعة الاتساع', value: null, unit: 'cm/year' } },
      ],
    },
    diagram: {
      title: 'خريطة أعمار حول ذروة محيطية',
      description: 'سمّ محور الذروة واتجاه اتساع القشرة.',
      targets: [
        { id: 'ridge-axis', label: '1', x: 50, y: 50, expectedLabel: 'محور الذروة', acceptedLabels: ['ذروة'] },
        { id: 'new-crust', label: '2', x: 44, y: 42, expectedLabel: 'قشرة حديثة', acceptedLabels: ['صخور حديثة'] },
        { id: 'old-crust', label: '3', x: 20, y: 64, expectedLabel: 'قشرة أقدم', acceptedLabels: ['صخور قديمة'] },
        { id: 'spreading', label: '4', x: 68, y: 36, expectedLabel: 'اتساع', acceptedLabels: ['تباعد'] },
      ],
    },
    measurements: [
      { id: 'spreading-rate', label: 'سرعة الاتساع', unitHint: 'cm/year' },
    ],
    expectedCells: [
      { rowId: 'rate', columnId: 'value', expectedValue: 2, tolerance: 0.2, acceptedText: ['2 cm/year', '2 cm/an'] },
    ],
    expectedMeasurements: [
      {
        id: 'spreading-rate',
        expected: { value: 2, unit: 'cm/year' },
        tolerance: 0.2,
        acceptedUnits: ['cm/an', 'cm.yr-1'],
      },
    ],
    observationItems: [
      { id: 'ages-symmetric', label: 'الأعمار متماثلة على جانبي الذروة.', detail: 'يدعم ذلك اتساعا ثنائيا من المحور.', kind: 'map' },
      { id: 'young-at-axis', label: 'أحدث القشرة توجد عند محور الذروة.', detail: 'تتكون القشرة المحيطية الجديدة عند الذروة.', kind: 'evidence' },
      { id: 'rate-calculation', label: '40 km خلال 2 Ma تعطي 2 cm/year.', detail: 'تحويل km/Ma إلى cm/year ضروري.', kind: 'calculation' },
      { id: 'old-at-axis', label: 'أقدم الصخور توجد في محور الذروة.', detail: 'اختيار مضلل: الأحدث توجد في المحور.', kind: 'distractor' },
    ],
    prompt: {
      title: 'احسب سرعة الاتساع عند ذروة محيطية.',
      task: 'سمّ الخريطة، أكمل السرعة، اكتب القياس بوحدته، ثم استنتج حركة الصفائح.',
      requiredObservationIds: [
        'ages-symmetric',
        'young-at-axis',
        'rate-calculation',
      ],
      requiredConclusionKeywords: ['ذروة', 'اتساع', '2', 'cm/year', 'تباعد'],
      scaffoldPhrases: [
        'الأعمار متماثلة على جانبي الذروة وتزداد بالابتعاد عن المحور.',
        'نحسب v=d/t=40 km/2 Ma=20 km/Ma.',
        'بعد التحويل نحصل على v≈2 cm/year، ما يدل على تباعد الصفائح.',
      ],
    },
  },
];

const CIVIL_BEAM_STATICS_WORKBENCH_PRESETS = [
  {
    id: 'simply-supported-beam-reactions',
    title: 'جائزة بسيطة وردود الأفعال',
    subtitle: 'تسمية المساند، كتابة معادلات التوازن، وحساب RA وRB.',
    bacContext:
      'في التكنولوجيا المدنية يطلب BAC قراءة جائزة محملة، تحديد المساند والقوى، ثم حساب ردود الأفعال باستعمال شروط التوازن.',
    instrument: {
      subjectLabel: 'Civil Tech Lab',
      title: 'تحليل الجوائز',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'beam-data',
        title: 'معطيات الجائزة',
        bullets: [
          'جائزة AB طولها L=6 m محمولة على مسندين بسيطين.',
          'حمل مركز P=12 kN مطبق في منتصف الجائزة.',
          'بسبب التناظر ننتظر RA=RB.',
        ],
      },
    ],
    table: {
      title: 'جدول ردود الأفعال',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'load', label: 'P', cells: { item: 'الحمل المركز', value: 12, unit: 'kN' } },
        { id: 'ra', label: 'RA', cells: { item: 'رد الفعل عند A', value: null, unit: 'kN' } },
        { id: 'rb', label: 'RB', cells: { item: 'رد الفعل عند B', value: null, unit: 'kN' } },
      ],
    },
    diagram: {
      title: 'مخطط الجائزة البسيطة',
      description: 'سمّ المساند والحمل قبل حل التوازن.',
      targets: [
        { id: 'support-a', label: '1', x: 20, y: 70, expectedLabel: 'مسند A', acceptedLabels: ['A'] },
        { id: 'point-load', label: '2', x: 50, y: 36, expectedLabel: 'حمل مركز', acceptedLabels: ['P'] },
        { id: 'support-b', label: '3', x: 80, y: 70, expectedLabel: 'مسند B', acceptedLabels: ['B'] },
      ],
    },
    measurements: [
      { id: 'reaction-a', label: 'رد الفعل RA', unitHint: 'kN' },
      { id: 'reaction-b', label: 'رد الفعل RB', unitHint: 'kN' },
    ],
    expectedCells: [
      { rowId: 'ra', columnId: 'value', expectedValue: 6, tolerance: 0.2, acceptedText: ['6 kN'] },
      { rowId: 'rb', columnId: 'value', expectedValue: 6, tolerance: 0.2, acceptedText: ['6 kN'] },
    ],
    expectedMeasurements: [
      { id: 'reaction-a', expected: { value: 6, unit: 'kN' }, tolerance: 0.2 },
      { id: 'reaction-b', expected: { value: 6, unit: 'kN' }, tolerance: 0.2 },
    ],
    observationItems: [
      { id: 'symmetry', label: 'الحمل في المنتصف يجعل ردَي الفعل متساويين.', detail: 'التناظر يختصر التوازن.', kind: 'model' },
      { id: 'vertical-equilibrium', label: 'من ΣFy=0 نحصل على RA+RB=12 kN.', detail: 'توازن القوى العمودية.', kind: 'equilibrium' },
      { id: 'reaction-six', label: 'إذن RA=RB=6 kN.', detail: 'تقسيم الحمل بالتساوي بين المسندين.', kind: 'calculation' },
      { id: 'one-support-takes-all', label: 'المسند A يحمل كامل P لأن الجائزة تبدأ منه.', detail: 'اختيار مضلل: الحمل متمركز والجائزة متناظرة.', kind: 'distractor' },
    ],
    prompt: {
      title: 'احسب ردود الأفعال لجائزة بسيطة.',
      task: 'سمّ عناصر الجائزة، أكمل RA وRB، ثم اكتب خلاصة التوازن.',
      requiredObservationIds: ['symmetry', 'vertical-equilibrium', 'reaction-six'],
      requiredConclusionKeywords: ['ΣFy', 'RA', 'RB', '6', 'kN'],
      scaffoldPhrases: [
        'بسبب التناظر يكون RA=RB.',
        'من توازن القوى العمودية: RA+RB=P=12 kN.',
        'إذن RA=RB=6 kN.',
      ],
    },
  },
  {
    id: 'cantilever-uniform-load-bending',
    title: 'جائزة كابولية وحمل موزع',
    subtitle: 'حساب القص الأعظمي والعزم الأعظمي عند التثبيت.',
    bacContext:
      'في تمارين المقاومة يطلب من الطالب قراءة حمل موزع على كابولي ثم استنتاج Vmax وMmax عند التثبيت.',
    instrument: {
      subjectLabel: 'Civil Tech Lab',
      title: 'تحليل الجوائز',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'cantilever-data',
        title: 'معطيات المقاومة',
        bullets: [
          'جائزة كابولية طولها L=4 m مثبتة عند A.',
          'حمل موزع منتظم q=3 kN/m على كامل الطول.',
          'أكبر قص وعزم يظهران عند التثبيت.',
        ],
      },
    ],
    table: {
      title: 'قيم القص والعزم',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'q', label: 'q', cells: { item: 'الحمل الموزع', value: 3, unit: 'kN/m' } },
        { id: 'vmax', label: 'Vmax', cells: { item: 'القص الأعظمي', value: null, unit: 'kN' } },
        { id: 'mmax', label: 'Mmax', cells: { item: 'العزم الأعظمي', value: null, unit: 'kN.m' } },
      ],
    },
    diagram: {
      title: 'جائزة كابولية',
      description: 'حدد التثبيت والحمل الموزع ومقطع العزم الأعظمي.',
      targets: [
        { id: 'fixed-support', label: '1', x: 18, y: 62, expectedLabel: 'تثبيت', acceptedLabels: ['encastrement', 'A'] },
        { id: 'uniform-load', label: '2', x: 52, y: 34, expectedLabel: 'حمل موزع', acceptedLabels: ['q'] },
        { id: 'free-end', label: '3', x: 84, y: 62, expectedLabel: 'طرف حر', acceptedLabels: ['B'] },
      ],
    },
    measurements: [
      { id: 'max-shear', label: 'Vmax', unitHint: 'kN' },
      { id: 'max-moment', label: 'Mmax', unitHint: 'kN.m' },
    ],
    expectedCells: [
      { rowId: 'vmax', columnId: 'value', expectedValue: 12, tolerance: 0.4, acceptedText: ['12 kN'] },
      { rowId: 'mmax', columnId: 'value', expectedValue: 24, tolerance: 0.8, acceptedText: ['24 kN.m'] },
    ],
    expectedMeasurements: [
      { id: 'max-shear', expected: { value: 12, unit: 'kN' }, tolerance: 0.4 },
      {
        id: 'max-moment',
        expected: { value: 24, unit: 'kN.m' },
        tolerance: 0.8,
        acceptedUnits: ['kN.m', 'kN⋅m'],
      },
    ],
    observationItems: [
      { id: 'fixed-end-max', label: 'في الكابولي تظهر القيم العظمى عند التثبيت.', detail: 'التثبيت يقاوم القص والعزم.', kind: 'mechanics' },
      { id: 'shear-q-l', label: 'القص الأعظمي يساوي qL=3×4=12 kN.', detail: 'محصلة الحمل الموزع.', kind: 'calculation' },
      { id: 'moment-q-l2', label: 'العزم الأعظمي يساوي qL²/2=24 kN.m.', detail: 'محصلة الحمل تؤثر عند L/2.', kind: 'calculation' },
      { id: 'max-at-free-end', label: 'العزم الأعظمي عند الطرف الحر.', detail: 'اختيار مضلل: عند الطرف الحر العزم معدوم.', kind: 'distractor' },
    ],
    prompt: {
      title: 'احسب Vmax وMmax لجائزة كابولية.',
      task: 'سمّ الرسم، أكمل الجدول، اكتب القياسات بوحداتها، ثم استنتج مكان الخطر.',
      requiredObservationIds: ['fixed-end-max', 'shear-q-l', 'moment-q-l2'],
      requiredConclusionKeywords: ['qL', 'Vmax', 'Mmax', 'تثبيت'],
      scaffoldPhrases: [
        'محصلة الحمل الموزع هي qL=12 kN.',
        'إذن Vmax=12 kN عند التثبيت.',
        'العزم الأعظمي Mmax=qL²/2=24 kN.m عند التثبيت.',
      ],
    },
  },
];

const CIVIL_STRUCTURES_MATERIALS_WORKBENCH_PRESETS = [
  {
    id: 'reinforced-concrete-steel-area',
    title: 'مقطع خرسانة مسلحة ومساحة التسليح',
    subtitle: 'تسمية عناصر المقطع وحساب مساحة قضبان الشد.',
    bacContext:
      'في الهندسة المدنية تظهر مقاطع خرسانة مسلحة مع جدول قضبان، ويطلب حساب مساحة التسليح وقراءة دور الخرسانة والفولاذ.',
    instrument: {
      subjectLabel: 'Civil Tech Lab',
      title: 'ورشة المنشآت والمواد',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'rc-section-data',
        title: 'معطيات المقطع',
        bullets: [
          'مقطع جائز مستطيل b=20 cm و h=40 cm.',
          'تسليح الشد: 4HA12.',
          'مساحة قضيب واحد قطره 12 mm هي تقريبا 113 mm².',
        ],
      },
    ],
    table: {
      title: 'جدول التسليح',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'bar-count', label: 'n', cells: { item: 'عدد القضبان', value: 4, unit: '-' } },
        { id: 'bar-area', label: 'A1', cells: { item: 'مساحة قضيب HA12', value: 113, unit: 'mm²' } },
        { id: 'steel-area', label: 'As', cells: { item: 'مساحة التسليح', value: null, unit: 'mm²' } },
      ],
    },
    diagram: {
      title: 'مقطع خرسانة مسلحة',
      description: 'سمّ مواد وعناصر المقطع قبل استغلال جدول التسليح.',
      targets: [
        { id: 'concrete', label: '1', x: 48, y: 42, expectedLabel: 'خرسانة', acceptedLabels: ['béton', 'concrete'] },
        { id: 'tension-steel', label: '2', x: 42, y: 74, expectedLabel: 'تسليح الشد', acceptedLabels: ['HA12', 'فولاذ'] },
        { id: 'stirrup', label: '3', x: 65, y: 60, expectedLabel: 'كانة', acceptedLabels: ['étrier'] },
      ],
    },
    measurements: [
      { id: 'steel-area', label: 'مساحة التسليح As', unitHint: 'mm²' },
    ],
    expectedCells: [
      { rowId: 'steel-area', columnId: 'value', expectedValue: 452, tolerance: 8, acceptedText: ['452 mm²'] },
    ],
    expectedMeasurements: [
      {
        id: 'steel-area',
        expected: { value: 452, unit: 'mm²' },
        tolerance: 8,
        acceptedUnits: ['mm2', 'mm^2'],
      },
    ],
    observationItems: [
      { id: 'steel-in-tension', label: 'قضبان الشد توضع في منطقة الجر أسفل الجائز.', detail: 'الفولاذ يقاوم قوى الشد.', kind: 'material' },
      { id: 'area-count', label: 'مساحة التسليح تساوي عدد القضبان في مساحة قضيب واحد.', detail: 'As=n×A1.', kind: 'calculation' },
      { id: 'as-value', label: '4×113=452 mm².', detail: 'هذه القيمة تدخل في تحقق المقطع.', kind: 'calculation' },
      { id: 'concrete-tension-best', label: 'الخرسانة وحدها هي الأفضل لمقاومة الشد.', detail: 'اختيار مضلل: الخرسانة ضعيفة في الشد.', kind: 'distractor' },
    ],
    prompt: {
      title: 'احسب مساحة تسليح الشد.',
      task: 'سمّ المقطع، أكمل As، اكتب القياس بوحدته، ثم اربط المادة بوظيفتها.',
      requiredObservationIds: ['steel-in-tension', 'area-count', 'as-value'],
      requiredConclusionKeywords: ['As', '4', '113', '452', 'mm²'],
      scaffoldPhrases: [
        'التسليح السفلي هو تسليح الشد.',
        'مساحة التسليح As=n×A1.',
        'إذن As=4×113=452 mm².',
      ],
    },
  },
  {
    id: 'material-stress-check',
    title: 'تحقق إجهاد في مادة',
    subtitle: 'قراءة مقطع ومواد ثم حساب الإجهاد σ=N/A.',
    bacContext:
      'في ملفات المنشآت والمواد يقرأ الطالب قوة محورية ومساحة مقطع ثم يقارن الإجهاد بالمقاومة المسموحة.',
    instrument: {
      subjectLabel: 'Civil Tech Lab',
      title: 'ورشة المنشآت والمواد',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'stress-data',
        title: 'معطيات التحقق',
        bullets: [
          'عمود مستطيل أبعاده 20 cm × 30 cm.',
          'قوة ضغط محورية N=120 kN.',
          'الإجهاد المسموح للمادة σadm=8 MPa.',
        ],
      },
    ],
    table: {
      title: 'جدول التحقق',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'area', label: 'A', cells: { item: 'مساحة المقطع', value: null, unit: 'm²' } },
        { id: 'stress', label: 'σ', cells: { item: 'الإجهاد', value: null, unit: 'MPa' } },
        { id: 'decision', label: 'قرار', cells: { item: 'المقارنة مع σadm', value: null, unit: '-' } },
      ],
    },
    diagram: {
      title: 'مقطع عمود مضغوط',
      description: 'حدد القوة المحورية والمقطع قبل الحساب.',
      targets: [
        { id: 'axial-load', label: '1', x: 50, y: 22, expectedLabel: 'قوة ضغط', acceptedLabels: ['N'] },
        { id: 'section', label: '2', x: 50, y: 58, expectedLabel: 'مقطع', acceptedLabels: ['A'] },
        { id: 'material', label: '3', x: 70, y: 58, expectedLabel: 'مادة', acceptedLabels: ['خرسانة'] },
      ],
    },
    measurements: [
      { id: 'stress', label: 'الإجهاد σ', unitHint: 'MPa' },
    ],
    expectedCells: [
      { rowId: 'area', columnId: 'value', expectedValue: 0.06, tolerance: 0.003, acceptedText: ['0.06 m²'] },
      { rowId: 'stress', columnId: 'value', expectedValue: 2, tolerance: 0.2, acceptedText: ['2 MPa'] },
      { rowId: 'decision', columnId: 'value', expectedValue: 'مقبول', acceptedText: ['آمن', 'غير متجاوز'] },
    ],
    expectedMeasurements: [
      { id: 'stress', expected: { value: 2, unit: 'MPa' }, tolerance: 0.2 },
    ],
    observationItems: [
      { id: 'area-conversion', label: '20 cm × 30 cm = 0.06 m².', detail: 'تحويل cm² إلى m² ضروري.', kind: 'unit' },
      { id: 'stress-formula', label: 'الإجهاد يحسب بالعلاقة σ=N/A.', detail: 'N=120 kN و A=0.06 m².', kind: 'formula' },
      { id: 'stress-safe', label: 'σ≈2 MPa أصغر من σadm=8 MPa، إذن التحقق مقبول.', detail: 'المقارنة النهائية هي قرار تقني.', kind: 'decision' },
      { id: 'stress-too-high', label: '2 MPa أكبر من 8 MPa.', detail: 'اختيار مضلل: 2 أصغر من 8.', kind: 'distractor' },
    ],
    prompt: {
      title: 'تحقق إجهاد الضغط في المقطع.',
      task: 'سمّ العناصر، أكمل المساحة والإجهاد والقرار، ثم اكتب خلاصة التحقق.',
      requiredObservationIds: ['area-conversion', 'stress-formula', 'stress-safe'],
      requiredConclusionKeywords: ['σ', 'N/A', '2', 'MPa', 'مقبول'],
      scaffoldPhrases: [
        'نحسب مساحة المقطع A=0.20×0.30=0.06 m².',
        'الإجهاد σ=N/A=120 kN/0.06 m²≈2 MPa.',
        'بما أن 2 MPa أصغر من 8 MPa فالتحقق مقبول.',
      ],
    },
  },
];

const CIVIL_TECHNICAL_SHEET_WORKBENCH_PRESETS = [
  {
    id: 'foundation-quantity-takeoff',
    title: 'قراءة مخطط وحساب كمية خرسانة',
    subtitle: 'استخراج أبعاد أساس شريطي من بطاقة تقنية ثم حساب الحجم.',
    bacContext:
      'في ملفات الهندسة المدنية يطلب BAC قراءة مخطط أو بطاقة تقنية، استخراج الأبعاد، ثم حساب الكميات اللازمة للإنجاز.',
    instrument: {
      subjectLabel: 'Civil Tech Lab',
      title: 'ورشة البطاقة التقنية المدنية',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'foundation-sheet',
        title: 'بطاقة تقنية للأساس',
        bullets: [
          'طول الأساس L=8.0 m.',
          'عرض الأساس b=0.50 m.',
          'ارتفاع الخرسانة h=0.40 m.',
          'حجم الخرسانة يحسب بالعلاقة V=L×b×h.',
        ],
      },
    ],
    table: {
      title: 'جدول الكميات',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'length', label: 'L', cells: { item: 'الطول', value: 8, unit: 'm' } },
        { id: 'width', label: 'b', cells: { item: 'العرض', value: 0.5, unit: 'm' } },
        { id: 'height', label: 'h', cells: { item: 'الارتفاع', value: 0.4, unit: 'm' } },
        { id: 'volume', label: 'V', cells: { item: 'حجم الخرسانة', value: null, unit: 'm³' } },
      ],
    },
    diagram: {
      title: 'مقطع أساس شريطي',
      description: 'سمّ عناصر المقطع قبل حساب الكمية.',
      targets: [
        { id: 'foundation', label: '1', x: 48, y: 66, expectedLabel: 'أساس', acceptedLabels: ['semelle'] },
        { id: 'concrete', label: '2', x: 58, y: 54, expectedLabel: 'خرسانة', acceptedLabels: ['béton'] },
        { id: 'dimensions', label: '3', x: 74, y: 38, expectedLabel: 'أبعاد', acceptedLabels: ['L b h'] },
      ],
    },
    measurements: [
      { id: 'concrete-volume', label: 'حجم الخرسانة', unitHint: 'm³' },
    ],
    expectedCells: [
      { rowId: 'volume', columnId: 'value', expectedValue: 1.6, tolerance: 0.05, acceptedText: ['1.6 m³'] },
    ],
    expectedMeasurements: [
      {
        id: 'concrete-volume',
        expected: { value: 1.6, unit: 'm³' },
        tolerance: 0.05,
        acceptedUnits: ['m3', 'm^3'],
      },
    ],
    observationItems: [
      { id: 'dimensions-from-sheet', label: 'الأبعاد L وb وh تستخرج من البطاقة التقنية.', detail: 'القراءة الدقيقة للأبعاد تسبق الحساب.', kind: 'document' },
      { id: 'volume-formula', label: 'حجم الأساس المستطيل يحسب بالعلاقة V=L×b×h.', detail: 'كل الأبعاد بالمتر.', kind: 'formula' },
      { id: 'volume-value', label: 'V=8×0.50×0.40=1.6 m³.', detail: 'هذه كمية الخرسانة المطلوبة.', kind: 'quantity' },
      { id: 'add-dimensions', label: 'الحجم يحسب بجمع L+b+h.', detail: 'اختيار مضلل: الحجم حاصل ضرب الأبعاد.', kind: 'distractor' },
    ],
    prompt: {
      title: 'احسب كمية الخرسانة من بطاقة تقنية.',
      task: 'سمّ عناصر المقطع، أكمل الحجم، اكتب القياس بوحدته، ثم اكتب خلاصة الكمية.',
      requiredObservationIds: [
        'dimensions-from-sheet',
        'volume-formula',
        'volume-value',
      ],
      requiredConclusionKeywords: ['V', 'L', 'b', 'h', '1.6', 'm³'],
      scaffoldPhrases: [
        'نستخرج الأبعاد من البطاقة: L=8 m وb=0.50 m وh=0.40 m.',
        'نطبق V=L×b×h.',
        'إذن V=1.6 m³ من الخرسانة.',
      ],
    },
  },
  {
    id: 'construction-sequence-answer-file',
    title: 'ترتيب مراحل إنجاز أساس',
    subtitle: 'إكمال جدول مراحل التنفيذ كما في ملف الإجابة التقنية.',
    bacContext:
      'في التكنولوجيا المدنية تظهر أسئلة ترتيب خطوات الإنجاز وربط كل خطوة بأداة أو مراقبة، وهو نمط قريب من ملف الإجابة.',
    instrument: {
      subjectLabel: 'Civil Tech Lab',
      title: 'ورشة البطاقة التقنية المدنية',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'sequence-sheet',
        title: 'مقتطف من بطاقة التنفيذ',
        bullets: [
          'لا يبدأ الصب قبل وضع التسليح ومراقبة القوالب.',
          'الحفر يأتي بعد التوقيع الطبوغرافي.',
          'المعالجة تأتي بعد صب الخرسانة.',
        ],
      },
    ],
    table: {
      title: 'ملف الإجابة: ترتيب المراحل',
      columns: [
        { id: 'step', label: 'الرتبة' },
        { id: 'operation', label: 'العملية' },
        { id: 'control', label: 'المراقبة' },
      ],
      rows: [
        { id: 'step-1', label: '1', cells: { step: 1, operation: null, control: 'المحاور' } },
        { id: 'step-2', label: '2', cells: { step: 2, operation: null, control: 'المنسوب' } },
        { id: 'step-3', label: '3', cells: { step: 3, operation: null, control: 'الأبعاد' } },
        { id: 'step-4', label: '4', cells: { step: 4, operation: null, control: 'التموضع' } },
        { id: 'step-5', label: '5', cells: { step: 5, operation: null, control: 'الجودة' } },
      ],
    },
    expectedCells: [
      { rowId: 'step-1', columnId: 'operation', expectedValue: 'توقيع', acceptedText: ['توقيع المحاور', 'implantation'] },
      { rowId: 'step-2', columnId: 'operation', expectedValue: 'حفر', acceptedText: ['الحفر', 'terrassement'] },
      { rowId: 'step-3', columnId: 'operation', expectedValue: 'قوالب', acceptedText: ['وضع القوالب', 'coffrage'] },
      { rowId: 'step-4', columnId: 'operation', expectedValue: 'تسليح', acceptedText: ['وضع التسليح', 'ferraillage'] },
      { rowId: 'step-5', columnId: 'operation', expectedValue: 'صب', acceptedText: ['صب الخرسانة', 'coulage'] },
    ],
    observationItems: [
      { id: 'layout-before-digging', label: 'التوقيع الطبوغرافي يسبق الحفر.', detail: 'يحدد المحاور والمنسوب.', kind: 'sequence' },
      { id: 'formwork-before-steel', label: 'القوالب تضبط الأبعاد قبل وضع التسليح.', detail: 'تسلسل إنجاز منطقي.', kind: 'sequence' },
      { id: 'casting-after-steel', label: 'الصب يأتي بعد التسليح والمراقبة.', detail: 'لا يصب العنصر قبل التحقق.', kind: 'sequence' },
      { id: 'casting-before-digging', label: 'الصب هو أول مرحلة في إنجاز الأساس.', detail: 'اختيار مضلل: الصب مرحلة متأخرة.', kind: 'distractor' },
    ],
    prompt: {
      title: 'أكمل ترتيب مراحل الإنجاز.',
      task: 'املأ جدول العمليات، اختر قواعد الترتيب الصحيحة، ثم اكتب خلاصة مختصرة.',
      requiredObservationIds: [
        'layout-before-digging',
        'formwork-before-steel',
        'casting-after-steel',
      ],
      requiredConclusionKeywords: ['توقيع', 'حفر', 'قوالب', 'تسليح', 'صب'],
      scaffoldPhrases: [
        'نبدأ بتوقيع المحاور ثم الحفر.',
        'بعد ذلك توضع القوالب ثم التسليح.',
        'يأتي صب الخرسانة بعد المراقبة.',
      ],
    },
  },
];

const ELECTRICAL_CONTROL_LOGIC_WORKBENCH_PRESETS = [
  {
    id: 'motor-safety-truth-table',
    title: 'جدول صدق لدارة تشغيل محرك',
    subtitle: 'إكمال خرج منطقي مع شرط تشغيل وحماية.',
    bacContext:
      'في التكنولوجيا الكهربائية يطلب BAC إكمال جدول صدق أو معادلة منطقية لنظام تحكم مع شروط أمن وتشغيل.',
    instrument: {
      subjectLabel: 'Electrical Tech Lab',
      title: 'ورشة التحكم والمنطق',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'logic-spec',
        title: 'مواصفة التحكم',
        bullets: [
          'يعمل المحرك إذا كان أمر التشغيل M=1.',
          'يجب أن يكون شرط الأمان S=1.',
          'خرج الكونتاكتور KM يحقق KM=M.S.',
        ],
      },
    ],
    table: {
      title: 'جدول الصدق',
      columns: [
        { id: 'm', label: 'M' },
        { id: 's', label: 'S' },
        { id: 'km', label: 'KM' },
      ],
      rows: [
        { id: '00', label: '0 0', cells: { m: 0, s: 0, km: null } },
        { id: '01', label: '0 1', cells: { m: 0, s: 1, km: null } },
        { id: '10', label: '1 0', cells: { m: 1, s: 0, km: null } },
        { id: '11', label: '1 1', cells: { m: 1, s: 1, km: null } },
      ],
    },
    diagram: {
      title: 'سلسلة تحكم منطقية',
      description: 'سمّ المداخل والخرج في منطق التشغيل.',
      targets: [
        { id: 'start-input', label: '1', x: 24, y: 44, expectedLabel: 'M', acceptedLabels: ['تشغيل'] },
        { id: 'safety-input', label: '2', x: 24, y: 66, expectedLabel: 'S', acceptedLabels: ['أمان'] },
        { id: 'output', label: '3', x: 76, y: 54, expectedLabel: 'KM', acceptedLabels: ['كونتاكتور'] },
      ],
    },
    expectedCells: [
      { rowId: '00', columnId: 'km', expectedValue: 0 },
      { rowId: '01', columnId: 'km', expectedValue: 0 },
      { rowId: '10', columnId: 'km', expectedValue: 0 },
      { rowId: '11', columnId: 'km', expectedValue: 1 },
    ],
    observationItems: [
      { id: 'and-gate', label: 'العلاقة KM=M.S هي علاقة AND.', detail: 'يلزم تحقق الشرطين معا.', kind: 'logic' },
      { id: 'safety-blocks', label: 'إذا كان S=0 يبقى KM=0 مهما كان M.', detail: 'شرط الأمان يمنع التشغيل.', kind: 'safety' },
      { id: 'only-11-on', label: 'الحالة الوحيدة التي تشغل KM هي M=1 وS=1.', detail: 'هذه قراءة جدول الصدق.', kind: 'table' },
      { id: 'or-gate', label: 'KM=1 إذا تحقق M أو S فقط.', detail: 'اختيار مضلل: هذه علاقة OR وليست AND.', kind: 'distractor' },
    ],
    prompt: {
      title: 'أكمل جدول صدق تشغيل المحرك.',
      task: 'سمّ المداخل والخرج، أكمل KM، ثم اكتب خلاصة المعادلة المنطقية.',
      requiredObservationIds: ['and-gate', 'safety-blocks', 'only-11-on'],
      requiredConclusionKeywords: ['KM', 'M.S', 'AND', 'أمان'],
      scaffoldPhrases: [
        'خرج الكونتاكتور يحقق العلاقة KM=M.S.',
        'إذا غاب شرط الأمان S يكون الخرج 0.',
        'إذن لا يعمل المحرك إلا في الحالة M=1 وS=1.',
      ],
    },
  },
  {
    id: 'grafcet-fill-transitions',
    title: 'GRAFCET لنظام دفع أسطوانة',
    subtitle: 'إكمال خطوات وانتقالات تسلسل أوتوماتيكي بسيط.',
    bacContext:
      'في GRAFCET يطلب BAC تحديد الخطوة الابتدائية، الأفعال، وشروط الانتقال بين المراحل.',
    instrument: {
      subjectLabel: 'Electrical Tech Lab',
      title: 'ورشة التحكم والمنطق',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'grafcet-spec',
        title: 'مواصفة GRAFCET',
        bullets: [
          'الخطوة 0: انتظار أمر البدء dcy.',
          'الخطوة 1: خروج الأسطوانة A+ حتى الحساس a1.',
          'الخطوة 2: رجوع الأسطوانة A- حتى الحساس a0.',
        ],
      },
    ],
    table: {
      title: 'ملف GRAFCET',
      columns: [
        { id: 'step', label: 'الخطوة' },
        { id: 'action', label: 'الفعل' },
        { id: 'transition', label: 'شرط الانتقال' },
      ],
      rows: [
        { id: 's0', label: '0', cells: { step: '0', action: null, transition: null } },
        { id: 's1', label: '1', cells: { step: '1', action: null, transition: null } },
        { id: 's2', label: '2', cells: { step: '2', action: null, transition: null } },
      ],
    },
    diagram: {
      title: 'هيكل GRAFCET',
      description: 'سمّ الخطوة الابتدائية والانتقالات الأساسية.',
      targets: [
        { id: 'initial-step', label: '1', x: 48, y: 24, expectedLabel: 'خطوة ابتدائية', acceptedLabels: ['0'] },
        { id: 'transition-dcy', label: '2', x: 48, y: 40, expectedLabel: 'dcy', acceptedLabels: ['بدء'] },
        { id: 'action-a-plus', label: '3', x: 66, y: 56, expectedLabel: 'A+', acceptedLabels: ['خروج'] },
        { id: 'action-a-minus', label: '4', x: 66, y: 78, expectedLabel: 'A-', acceptedLabels: ['رجوع'] },
      ],
    },
    expectedCells: [
      { rowId: 's0', columnId: 'action', expectedValue: 'انتظار', acceptedText: ['repos', 'لا فعل'] },
      { rowId: 's0', columnId: 'transition', expectedValue: 'dcy', acceptedText: ['بدء'] },
      { rowId: 's1', columnId: 'action', expectedValue: 'A+', acceptedText: ['خروج'] },
      { rowId: 's1', columnId: 'transition', expectedValue: 'a1', acceptedText: ['نهاية الخروج'] },
      { rowId: 's2', columnId: 'action', expectedValue: 'A-', acceptedText: ['رجوع'] },
      { rowId: 's2', columnId: 'transition', expectedValue: 'a0', acceptedText: ['نهاية الرجوع'] },
    ],
    observationItems: [
      { id: 'initial-waits', label: 'الخطوة 0 تنتظر أمر البدء dcy.', detail: 'هي حالة الراحة أو الاستعداد.', kind: 'sequence' },
      { id: 'a-plus-until-a1', label: 'الفعل A+ يستمر حتى تحقق الحساس a1.', detail: 'a1 شرط نهاية الخروج.', kind: 'transition' },
      { id: 'a-minus-until-a0', label: 'الفعل A- يعيد الأسطوانة حتى a0.', detail: 'a0 شرط نهاية الرجوع.', kind: 'transition' },
      { id: 'return-before-extend', label: 'يجب تنفيذ A- قبل A+ مباشرة بعد dcy.', detail: 'اختيار مضلل: التسلسل يبدأ بالخروج.', kind: 'distractor' },
    ],
    prompt: {
      title: 'أكمل GRAFCET أسطوانة بسيطة.',
      task: 'أكمل أفعال الخطوات وشروط الانتقال، ثم اكتب خلاصة التسلسل.',
      requiredObservationIds: [
        'initial-waits',
        'a-plus-until-a1',
        'a-minus-until-a0',
      ],
      requiredConclusionKeywords: ['dcy', 'A+', 'a1', 'A-', 'a0'],
      scaffoldPhrases: [
        'من الخطوة 0 ننتظر dcy.',
        'ثم تنفذ الخطوة 1 الفعل A+ حتى a1.',
        'بعدها تنفذ الخطوة 2 الفعل A- حتى a0.',
      ],
    },
  },
];

const ELECTRICAL_CIRCUITS_CHRONOGRAMS_WORKBENCH_PRESETS = [
  {
    id: 'relay-control-circuit-reading',
    title: 'قراءة دارة تحكم بمرحل',
    subtitle: 'تسمية عناصر الدارة واستنتاج حالة المصباح من تلامس NO.',
    bacContext:
      'في ملفات التكنولوجيا الكهربائية يطلب BAC قراءة مخطط تحكم، التعرف على المرحل والتلامسات، ثم استنتاج حالة المشغل.',
    instrument: {
      subjectLabel: 'Electrical Tech Lab',
      title: 'ورشة الدارات والكرونوغرامات',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'relay-spec',
        title: 'مبدأ العمل',
        bullets: [
          'عند ضغط S يتغذى ملف المرحل KA.',
          'يغلق التلامس KA المفتوح عادة NO.',
          'عند غلق التلامس يضيء المصباح H.',
        ],
      },
    ],
    table: {
      title: 'حالات الدارة',
      columns: [
        { id: 's', label: 'S' },
        { id: 'ka', label: 'KA' },
        { id: 'h', label: 'H' },
      ],
      rows: [
        { id: 'open', label: 'S=0', cells: { s: 0, ka: null, h: null } },
        { id: 'closed', label: 'S=1', cells: { s: 1, ka: null, h: null } },
      ],
    },
    diagram: {
      title: 'دارة تحكم بمرحل',
      description: 'سمّ عناصر المخطط قبل ملء جدول الحالات.',
      targets: [
        { id: 'switch', label: '1', x: 22, y: 44, expectedLabel: 'زر S', acceptedLabels: ['S'] },
        { id: 'coil', label: '2', x: 46, y: 50, expectedLabel: 'ملف KA', acceptedLabels: ['KA'] },
        { id: 'contact', label: '3', x: 64, y: 38, expectedLabel: 'تلامس NO', acceptedLabels: ['NO'] },
        { id: 'lamp', label: '4', x: 82, y: 58, expectedLabel: 'مصباح H', acceptedLabels: ['H'] },
      ],
    },
    expectedCells: [
      { rowId: 'open', columnId: 'ka', expectedValue: 0 },
      { rowId: 'open', columnId: 'h', expectedValue: 0 },
      { rowId: 'closed', columnId: 'ka', expectedValue: 1 },
      { rowId: 'closed', columnId: 'h', expectedValue: 1 },
    ],
    observationItems: [
      { id: 's-energizes-coil', label: 'عند S=1 يتغذى ملف المرحل KA.', detail: 'الملف يحول الأمر الكهربائي إلى تبديل تلامس.', kind: 'circuit' },
      { id: 'no-contact-closes', label: 'التلامس NO يغلق عندما يتغذى KA.', detail: 'NO يعني مفتوح في حالة الراحة.', kind: 'contact' },
      { id: 'lamp-on-when-contact-closed', label: 'يضيء H عندما يغلق تلامس KA.', detail: 'هذا يربط دارة التحكم بدارة الإشارة.', kind: 'state' },
      { id: 'no-closed-at-rest', label: 'تلامس NO يكون مغلقا في حالة الراحة.', detail: 'اختيار مضلل: NO مفتوح عادة.', kind: 'distractor' },
    ],
    prompt: {
      title: 'اقرأ دارة المرحل واستنتج الحالات.',
      task: 'سمّ عناصر الدارة، أكمل KA وH في الجدول، ثم اكتب خلاصة عمل التلامس NO.',
      requiredObservationIds: [
        's-energizes-coil',
        'no-contact-closes',
        'lamp-on-when-contact-closed',
      ],
      requiredConclusionKeywords: ['S', 'KA', 'NO', 'H'],
      scaffoldPhrases: [
        'عند ضغط S يتغذى ملف المرحل KA.',
        'يغلق التلامس NO المرتبط بالمرحل.',
        'عندئذ يضيء المصباح H.',
      ],
    },
  },
  {
    id: 'timer-chronogram-output',
    title: 'كرونوغرام مؤقت تشغيل',
    subtitle: 'إكمال خرج مؤقت TON من إشارة دخل متغيرة.',
    bacContext:
      'في الكرونوغرامات يقرأ الطالب إشارات زمنية للدخل والمخرج، خصوصا المؤقتات TON/TOF داخل التحكم الآلي.',
    instrument: {
      subjectLabel: 'Electrical Tech Lab',
      title: 'ورشة الدارات والكرونوغرامات',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'timer-spec',
        title: 'مواصفة المؤقت TON',
        bullets: [
          'زمن الضبط T=2 s.',
          'إذا بقي الدخل I=1 لمدة 2 s يصبح الخرج Q=1.',
          'عند سقوط I يعود Q إلى 0 مباشرة.',
        ],
      },
    ],
    table: {
      title: 'جدول الكرونوغرام',
      columns: [
        { id: 'interval', label: 'المجال الزمني' },
        { id: 'i', label: 'I' },
        { id: 'q', label: 'Q' },
      ],
      rows: [
        { id: '0-1', label: '0-1s', cells: { interval: '0-1', i: 0, q: null } },
        { id: '1-3', label: '1-3s', cells: { interval: '1-3', i: 1, q: null } },
        { id: '3-5', label: '3-5s', cells: { interval: '3-5', i: 1, q: null } },
        { id: '5-6', label: '5-6s', cells: { interval: '5-6', i: 0, q: null } },
      ],
    },
    graph: {
      title: 'إشارة الدخل I',
      xAxis: { label: 't', unit: 's', min: 0, max: 6 },
      yAxis: { label: 'I', min: 0, max: 1 },
      series: [
        {
          id: 'input',
          title: 'I(t)',
          kind: 'line',
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 5, y: 1 },
            { x: 6, y: 0 },
          ],
        },
      ],
    },
    expectedCells: [
      { rowId: '0-1', columnId: 'q', expectedValue: 0 },
      { rowId: '1-3', columnId: 'q', expectedValue: 0 },
      { rowId: '3-5', columnId: 'q', expectedValue: 1 },
      { rowId: '5-6', columnId: 'q', expectedValue: 0 },
    ],
    observationItems: [
      { id: 'ton-delay', label: 'TON لا يرفع Q إلا بعد مرور زمن الضبط.', detail: 'الخروج يتأخر بعد ارتفاع الدخل.', kind: 'timer' },
      { id: 'q-on-after-3', label: 'بما أن I ارتفع عند 1s وT=2s يصبح Q=1 عند 3s.', detail: '1+2=3s.', kind: 'chronogram' },
      { id: 'q-off-immediate', label: 'عند سقوط I في 5s يعود Q إلى 0 مباشرة.', detail: 'هذا سلوك TON عند فقدان الدخل.', kind: 'state' },
      { id: 'q-on-immediate', label: 'Q يصبح 1 مباشرة عند t=1s.', detail: 'اختيار مضلل: يوجد تأخر 2s.', kind: 'distractor' },
    ],
    prompt: {
      title: 'أكمل كرونوغرام خرج TON.',
      task: 'املأ Q في المجالات الزمنية، اختر قواعد القراءة الصحيحة، ثم اكتب خلاصة عن التأخر.',
      requiredObservationIds: ['ton-delay', 'q-on-after-3', 'q-off-immediate'],
      requiredConclusionKeywords: ['TON', '2s', '3s', 'Q'],
      scaffoldPhrases: [
        'الدخل I يرتفع عند 1s ويبقى 1.',
        'بعد تأخر 2s يصبح Q=1 عند 3s.',
        'عند سقوط I في 5s يعود Q إلى 0.',
      ],
    },
  },
];

const ELECTRICAL_TECHNICAL_FILE_WORKBENCH_PRESETS = [
  {
    id: 'motor-starter-component-identification',
    title: 'قراءة ملف تقني لمشغل محرك',
    subtitle: 'تسمية مكونات سلسلة القدرة والحماية.',
    bacContext:
      'في ملفات التكنولوجيا الكهربائية يطلب BAC التعرف على المكونات من مخطط قدرة/تحكم وربط كل رمز بوظيفته.',
    sourceHint:
      'مستند إلى ملف مشغل محرك: قاطع/مصهر، كونتاكتور، مرحل حراري، محرك.',
    instrument: {
      subjectLabel: 'Electrical Tech Lab',
      title: 'ورشة الملف التقني الكهربائي',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'starter-file',
        title: 'مقتطف من الملف التقني',
        bullets: [
          'QF يحمي الدارة من القصر.',
          'KM ينجز وصل وفصل المحرك.',
          'RT يحمي من زيادة الحمل.',
          'M هو المحرك ثلاثي الأطوار.',
        ],
      },
    ],
    table: {
      title: 'جدول تعريف المكونات',
      columns: [
        { id: 'symbol', label: 'الرمز' },
        { id: 'component', label: 'المكون' },
        { id: 'function', label: 'الوظيفة' },
      ],
      rows: [
        { id: 'qf', label: 'QF', cells: { symbol: 'QF', component: null, function: null } },
        { id: 'km', label: 'KM', cells: { symbol: 'KM', component: null, function: null } },
        { id: 'rt', label: 'RT', cells: { symbol: 'RT', component: null, function: null } },
        { id: 'm', label: 'M', cells: { symbol: 'M', component: null, function: null } },
      ],
    },
    diagram: {
      title: 'سلسلة قدرة مشغل محرك',
      description: 'سمّ الرموز الأساسية في ملف القدرة.',
      targets: [
        { id: 'breaker', label: '1', x: 22, y: 38, expectedLabel: 'QF', acceptedLabels: ['قاطع'] },
        { id: 'contactor', label: '2', x: 42, y: 46, expectedLabel: 'KM', acceptedLabels: ['كونتاكتور'] },
        { id: 'thermal-relay', label: '3', x: 62, y: 54, expectedLabel: 'RT', acceptedLabels: ['مرحل حراري'] },
        { id: 'motor', label: '4', x: 82, y: 60, expectedLabel: 'M', acceptedLabels: ['محرك'] },
      ],
    },
    expectedCells: [
      { rowId: 'qf', columnId: 'component', expectedValue: 'قاطع', acceptedText: ['مصهر', 'disjoncteur'] },
      { rowId: 'qf', columnId: 'function', expectedValue: 'حماية', acceptedText: ['حماية من القصر'] },
      { rowId: 'km', columnId: 'component', expectedValue: 'كونتاكتور', acceptedText: ['contacteur'] },
      { rowId: 'km', columnId: 'function', expectedValue: 'وصل', acceptedText: ['تشغيل', 'فصل'] },
      { rowId: 'rt', columnId: 'component', expectedValue: 'مرحل حراري', acceptedText: ['relais thermique'] },
      { rowId: 'm', columnId: 'component', expectedValue: 'محرك', acceptedText: ['moteur'] },
    ],
    observationItems: [
      { id: 'qf-protects-short', label: 'QF عنصر حماية من القصر أو زيادة التيار.', detail: 'يوضع في بداية سلسلة القدرة.', kind: 'component' },
      { id: 'km-switches-power', label: 'KM عنصر وصل وفصل يتحكم في تغذية المحرك.', detail: 'الملف في التحكم والتلامسات في القدرة.', kind: 'component' },
      { id: 'rt-overload', label: 'RT يحمي المحرك من زيادة الحمل.', detail: 'الحماية الحرارية مرتبطة بتيار المحرك.', kind: 'safety' },
      { id: 'motor-is-protection', label: 'M هو عنصر حماية الدارة.', detail: 'اختيار مضلل: M هو المحرك.', kind: 'distractor' },
    ],
    prompt: {
      title: 'عرّف مكونات ملف مشغل محرك.',
      task: 'سمّ عناصر المخطط، أكمل جدول التعريف، ثم اكتب خلاصة وظيفة الحماية والتحكم.',
      requiredObservationIds: [
        'qf-protects-short',
        'km-switches-power',
        'rt-overload',
      ],
      requiredConclusionKeywords: ['QF', 'KM', 'RT', 'محرك'],
      scaffoldPhrases: [
        'QF عنصر حماية في بداية الدارة.',
        'KM ينجز وصل وفصل تغذية المحرك.',
        'RT يحمي المحرك من زيادة الحمل.',
      ],
    },
  },
  {
    id: 'motor-current-protection-choice',
    title: 'حساب تيار محرك واختيار حماية',
    subtitle: 'استغلال بطاقة محرك أحادي الطور لاختيار عيار حماية مناسب.',
    bacContext:
      'في الملف التقني يقرأ الطالب القدرة والتوتر وعوامل التصحيح ثم يحسب التيار لاختيار عيار الحماية.',
    sourceHint: 'مستند إلى بطاقات المحركات حيث I=P/(U.cosφ.η).',
    instrument: {
      subjectLabel: 'Electrical Tech Lab',
      title: 'ورشة الملف التقني الكهربائي',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'motor-plate',
        title: 'بطاقة محرك',
        bullets: [
          'القدرة المفيدة P=1.5 kW.',
          'التوتر U=230 V.',
          'cosφ=0.8 و المردود η=0.75.',
          'نختار حماية معيارية أعلى مباشرة من التيار المحسوب.',
        ],
      },
    ],
    table: {
      title: 'ملف الحساب والحماية',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'power', label: 'P', cells: { item: 'القدرة', value: 1.5, unit: 'kW' } },
        { id: 'voltage', label: 'U', cells: { item: 'التوتر', value: 230, unit: 'V' } },
        { id: 'current', label: 'I', cells: { item: 'تيار المحرك', value: null, unit: 'A' } },
        { id: 'protection', label: 'QF', cells: { item: 'عيار الحماية', value: null, unit: 'A' } },
      ],
    },
    measurements: [
      { id: 'motor-current', label: 'تيار المحرك I', unitHint: 'A' },
    ],
    expectedCells: [
      { rowId: 'current', columnId: 'value', expectedValue: 10.9, tolerance: 0.5, acceptedText: ['10.9 A'] },
      { rowId: 'protection', columnId: 'value', expectedValue: 16, tolerance: 0.5, acceptedText: ['16 A'] },
    ],
    expectedMeasurements: [
      {
        id: 'motor-current',
        expected: { value: 10.9, unit: 'A' },
        tolerance: 0.5,
        acceptedUnits: ['ampere'],
      },
    ],
    observationItems: [
      { id: 'power-converted', label: 'نحوّل 1.5 kW إلى 1500 W قبل الحساب.', detail: 'الواط هو وحدة القدرة في العلاقة.', kind: 'unit' },
      { id: 'current-formula', label: 'I=P/(U.cosφ.η).', detail: 'العلاقة تستغل التوتر ومعامل القدرة والمردود.', kind: 'formula' },
      { id: 'protection-above-current', label: 'نختار عيارا معياريا أعلى من 10.9 A، أي 16 A.', detail: 'لا نختار عيارا أصغر من تيار التشغيل.', kind: 'choice' },
      { id: 'choose-10a', label: 'نختار حماية 10 A لأنها أقرب إلى التيار.', detail: 'اختيار مضلل: 10 A أصغر من تيار التشغيل المحسوب.', kind: 'distractor' },
    ],
    prompt: {
      title: 'احسب تيار المحرك واختر الحماية.',
      task: 'أكمل التيار وعيار الحماية، اكتب القياس، ثم اشرح الاختيار.',
      requiredObservationIds: [
        'power-converted',
        'current-formula',
        'protection-above-current',
      ],
      requiredConclusionKeywords: ['I', '10.9', 'A', '16'],
      scaffoldPhrases: [
        'نحوّل القدرة إلى P=1500 W.',
        'نحسب I=1500/(230×0.8×0.75)≈10.9 A.',
        'نختار عيار حماية أعلى مباشرة: 16 A.',
      ],
    },
  },
];

const MECHANICAL_DRAWING_WORKBENCH_PRESETS = [
  {
    id: 'assembly-nomenclature-reading',
    title: 'قراءة رسم تجميعي ومدونة قطع',
    subtitle: 'ربط أرقام القطع بالتعيين والمادة داخل مجموعة ميكانيكية.',
    bacContext:
      'في مواضيع الهندسة الميكانيكية يقرأ الطالب الرسم التجميعي، يحدد القطع، ثم يكمل جدول المدونة أو يستعمله في الأسئلة اللاحقة.',
    sourceHint:
      'مستند إلى أنماط BAC: رسم تجميعي لمحرك-مخفض، جدول مدونة، وأرقام قطع.',
    instrument: {
      subjectLabel: 'Mechanical Tech Lab',
      title: 'ورشة الرسم الميكانيكي',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'assembly-note',
        title: 'مقتطف من ملف تقني',
        bullets: [
          'الرسم التجميعي يبين صندوقا، عمودا، ترسا، ومحملين.',
          'جدول المدونة يربط رقم القطعة بالتعيين والمادة والعدد.',
          'القطع الدوارة غالبا: عمود، ترس، ومحمل.',
        ],
      },
    ],
    table: {
      title: 'جدول المدونة',
      columns: [
        { id: 'mark', label: 'رقم' },
        { id: 'qty', label: 'عدد' },
        { id: 'designation', label: 'تعيين' },
        { id: 'material', label: 'مادة' },
      ],
      rows: [
        { id: '08', label: '08', cells: { mark: '08', qty: 1, designation: null, material: null } },
        { id: '12', label: '12', cells: { mark: '12', qty: 2, designation: null, material: null } },
        { id: '13', label: '13', cells: { mark: '13', qty: 1, designation: null, material: null } },
        { id: '22', label: '22', cells: { mark: '22', qty: 1, designation: null, material: null } },
      ],
    },
    diagram: {
      title: 'رسم تجميعي مبسط',
      description: 'سمّ مناطق الرسم قبل إكمال جدول المدونة.',
      targets: [
        { id: 'shaft', label: 'A', x: 46, y: 50, expectedLabel: 'عمود', acceptedLabels: ['shaft', 'arbre'] },
        { id: 'bearing', label: 'B', x: 30, y: 50, expectedLabel: 'محمل', acceptedLabels: ['roulement', 'bearing'] },
        { id: 'gear', label: 'C', x: 62, y: 45, expectedLabel: 'ترس', acceptedLabels: ['pignon', 'gear'] },
        { id: 'housing', label: 'D', x: 50, y: 72, expectedLabel: 'علبة', acceptedLabels: ['carter', 'boitier'] },
      ],
    },
    expectedCells: [
      { rowId: '08', columnId: 'designation', expectedValue: 'عمود', acceptedText: ['arbre', 'محور'] },
      { rowId: '08', columnId: 'material', expectedValue: 'فولاذ' },
      { rowId: '12', columnId: 'designation', expectedValue: 'محمل', acceptedText: ['roulement'] },
      { rowId: '13', columnId: 'designation', expectedValue: 'علبة', acceptedText: ['carter'] },
      { rowId: '22', columnId: 'designation', expectedValue: 'ترس', acceptedText: ['pignon'] },
    ],
    observationItems: [
      { id: 'nomenclature-links-mark', label: 'رقم القطعة في الرسم يقود إلى نفس الرقم في جدول المدونة.', detail: 'هذه هي طريقة التعرف على التعيين والعدد والمادة.', kind: 'drawing' },
      { id: 'bearings-support-shaft', label: 'المحامل تسند العمود وتسمح بالدوران.', detail: 'تظهر عادة حول العمود داخل العلبة.', kind: 'function' },
      { id: 'housing-fixed', label: 'العلبة قطعة ثابتة تحمل عناصر المجموعة.', detail: 'لا تعامل كقطعة دوارة.', kind: 'assembly' },
      { id: 'all-parts-rotate', label: 'كل القطع في الرسم التجميعي دوارة.', detail: 'اختيار مضلل: العلبة والسدادات ثابتة غالبا.', kind: 'distractor' },
    ],
    prompt: {
      title: 'اقرأ الرسم التجميعي والمدونة.',
      task: 'سمّ القطع الأساسية، أكمل جدول المدونة، ثم اكتب خلاصة دور المدونة.',
      requiredObservationIds: [
        'nomenclature-links-mark',
        'bearings-support-shaft',
        'housing-fixed',
      ],
      requiredConclusionKeywords: ['رقم', 'مدونة', 'محمل', 'عمود'],
      scaffoldPhrases: [
        'نبحث عن رقم القطعة في الرسم ثم نرجع إلى المدونة.',
        'المحمل يسند العمود ويسمح بدورانه.',
        'العلبة تحمل المجموعة ولا تعد قطعة دوارة.',
      ],
    },
  },
  {
    id: 'definition-drawing-section-tolerances',
    title: 'قراءة رسم تعريفي ومقطع',
    subtitle: 'تحديد الأبعاد الوظيفية، السماحات، الخشونة، والمقطع.',
    bacContext:
      'أسئلة BAC الميكانيك تطلب غالبا إتمام رسم تعريفي جزئي مباشرة على ورقة الإجابة: أقطار وظيفية، سماحات هندسية، خشونة، ومقطع A-A.',
    sourceHint:
      'مستند إلى أسئلة دراسة تعريفية جزئية للعمود/العلبة في مواضيع 2022 وأشباهها.',
    instrument: {
      subjectLabel: 'Mechanical Tech Lab',
      title: 'ورشة الرسم الميكانيكي',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'definition-note',
        title: 'تعليمات الرسم التعريفي',
        bullets: [
          'السطح الأسطواني العامل يحمل قطرا وظيفيا.',
          'المقطع A-A يكشف الشكل الداخلي ولا يغير مقياس الأبعاد.',
          'رمز الخشونة يربط حالة السطح بعملية التشغيل.',
        ],
      },
    ],
    table: {
      title: 'ملف الرسم التعريفي',
      columns: [
        { id: 'feature', label: 'العنصر' },
        { id: 'answer', label: 'الإتمام' },
        { id: 'reason', label: 'الدلالة' },
      ],
      rows: [
        { id: 'diameter', label: 'قطر وظيفي', cells: { feature: 'قطر', answer: null, reason: null } },
        { id: 'tolerance', label: 'سماحة', cells: { feature: 'سماحة هندسية', answer: null, reason: null } },
        { id: 'roughness', label: 'خشونة', cells: { feature: 'حالة السطح', answer: null, reason: null } },
        { id: 'section', label: 'مقطع', cells: { feature: 'مقطع', answer: null, reason: null } },
      ],
    },
    diagram: {
      title: 'رسم تعريفي جزئي',
      description: 'سمّ الرموز الفنية في الرسم.',
      targets: [
        { id: 'diameter-symbol', label: '1', x: 34, y: 42, expectedLabel: 'Ø25 h7', acceptedLabels: ['قطر وظيفي', 'diametre'] },
        { id: 'datum', label: '2', x: 52, y: 62, expectedLabel: 'مرجع A', acceptedLabels: ['A', 'datum'] },
        { id: 'roughness-symbol', label: '3', x: 68, y: 36, expectedLabel: 'Ra 1.6', acceptedLabels: ['خشونة'] },
        { id: 'section-view', label: '4', x: 78, y: 66, expectedLabel: 'مقطع A-A', acceptedLabels: ['A-A', 'coupe'] },
      ],
    },
    expectedCells: [
      { rowId: 'diameter', columnId: 'answer', expectedValue: 'Ø25 h7', acceptedText: ['25 h7', 'قطر'] },
      { rowId: 'diameter', columnId: 'reason', expectedValue: 'توجيه المحمل', acceptedText: ['سطح وظيفي'] },
      { rowId: 'tolerance', columnId: 'answer', expectedValue: 'توازي', acceptedText: ['موازاة', 'parallelisme'] },
      { rowId: 'roughness', columnId: 'answer', expectedValue: 'Ra 1.6', acceptedText: ['خشونة'] },
      { rowId: 'section', columnId: 'answer', expectedValue: 'مقطع A-A', acceptedText: ['coupe A-A', 'A-A'] },
    ],
    observationItems: [
      { id: 'functional-diameter-is-controlled', label: 'القطر الوظيفي يحمل سماحة لأنه يركب مع قطعة أخرى.', detail: 'سطح تركيب المحمل مثال واضح.', kind: 'dimension' },
      { id: 'section-reveals-interior', label: 'المقطع A-A يكشف الشكل الداخلي على مستوى القطع.', detail: 'المقطع ليس منظرا خارجيا عاديا.', kind: 'section' },
      { id: 'roughness-linked-to-machining', label: 'رمز الخشونة يصف حالة السطح المطلوبة بعد التشغيل.', detail: 'يستعمل لاحقا في اختيار العملية أو المراقبة.', kind: 'surface' },
      { id: 'roughness-is-material', label: 'Ra 1.6 هو نوع مادة القطعة.', detail: 'اختيار مضلل: Ra قيمة خشونة.', kind: 'distractor' },
    ],
    prompt: {
      title: 'أتمم قراءة الرسم التعريفي.',
      task: 'سمّ الرموز، أكمل جدول الإتمام، ثم اشرح وظيفة القطر والمقطع والخشونة.',
      requiredObservationIds: [
        'functional-diameter-is-controlled',
        'section-reveals-interior',
        'roughness-linked-to-machining',
      ],
      requiredConclusionKeywords: ['قطر', 'سماحة', 'خشونة', 'مقطع'],
      scaffoldPhrases: [
        'القطر الوظيفي يضبط سطح تركيب قطعة أخرى.',
        'المقطع A-A يكشف الشكل الداخلي.',
        'الخشونة Ra تحدد حالة السطح المطلوبة.',
      ],
    },
  },
];

const MECHANICAL_MECHANISM_KINEMATICS_WORKBENCH_PRESETS = [
  {
    id: 'gear-reducer-speed-ratio',
    title: 'ناقل حركة بالتروس',
    subtitle: 'قراءة زوج تروس وحساب سرعة الخرج ونسبة التخفيض.',
    bacContext:
      'تتكرر في BAC أسئلة قراءة آلية نقل الحركة: تحديد العضو القائد والمقاد، اتجاه الدوران، وحساب السرعة أو النسبة.',
    sourceHint:
      'مستند إلى ملفات المحرك-المخفض وأسئلة transmission de mouvement.',
    instrument: {
      subjectLabel: 'Mechanical Tech Lab',
      title: 'ورشة الآليات والحركيات',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'gear-data',
        title: 'معطيات زوج تروس',
        bullets: [
          'الترس القائد Z1=20 سن ويدور بسرعة n1=1200 tr/min.',
          'الترس المقاد Z2=60 سن.',
          'في تعشيق خارجي يكون اتجاه دوران الخرج معاكس لاتجاه القائد.',
        ],
      },
    ],
    table: {
      title: 'جدول قراءة النقل',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة/الدلالة' },
      ],
      rows: [
        { id: 'z1', label: 'Z1', cells: { item: 'القائد', value: 20, unit: 'سن' } },
        { id: 'z2', label: 'Z2', cells: { item: 'المقاد', value: 60, unit: 'سن' } },
        { id: 'ratio', label: 'r', cells: { item: 'النسبة', value: null, unit: null } },
        { id: 'n2', label: 'n2', cells: { item: 'سرعة الخرج', value: null, unit: 'tr/min' } },
        { id: 'direction', label: 'اتجاه', cells: { item: 'اتجاه الخرج', value: null, unit: null } },
      ],
    },
    diagram: {
      title: 'زوج تروس خارجي',
      description: 'سمّ القائد والمقاد وحدد اتجاه الخرج.',
      targets: [
        { id: 'driver', label: '1', x: 34, y: 48, expectedLabel: 'ترس قائد', acceptedLabels: ['Z1', 'قائد'] },
        { id: 'driven', label: '2', x: 62, y: 48, expectedLabel: 'ترس مقاد', acceptedLabels: ['Z2', 'مقاد'] },
        { id: 'input-speed', label: '3', x: 25, y: 28, expectedLabel: 'n1', acceptedLabels: ['1200'] },
        { id: 'opposite-direction', label: '4', x: 74, y: 28, expectedLabel: 'اتجاه معاكس', acceptedLabels: ['معاكس'] },
      ],
    },
    measurements: [
      { id: 'output-speed', label: 'سرعة الخرج n2', unitHint: 'tr/min' },
    ],
    expectedCells: [
      { rowId: 'ratio', columnId: 'value', expectedValue: 0.33, tolerance: 0.02, acceptedText: ['1/3'] },
      { rowId: 'ratio', columnId: 'unit', expectedValue: 'تخفيض', acceptedText: ['reduction'] },
      { rowId: 'n2', columnId: 'value', expectedValue: 400, tolerance: 5, acceptedText: ['400 tr/min'] },
      { rowId: 'direction', columnId: 'value', expectedValue: 'معاكس', acceptedText: ['opposé'] },
    ],
    expectedMeasurements: [
      {
        id: 'output-speed',
        expected: { value: 400, unit: 'tr/min' },
        tolerance: 5,
        acceptedUnits: ['rpm'],
      },
    ],
    observationItems: [
      { id: 'ratio-z1-over-z2', label: 'في زوج تروس خارجي n2=n1×Z1/Z2.', detail: 'السرعة تتناسب عكسيا مع عدد الأسنان.', kind: 'formula' },
      { id: 'speed-reduced', label: 'لأن Z2 أكبر من Z1 فالسرعة تنخفض.', detail: '20/60=1/3.', kind: 'trend' },
      { id: 'external-gears-opposite', label: 'التعشيق الخارجي يعكس اتجاه الدوران.', detail: 'كل زوج خارجي يغير الاتجاه مرة واحدة.', kind: 'direction' },
      { id: 'bigger-gear-faster', label: 'الترس الأكبر يدور أسرع من الأصغر.', detail: 'اختيار مضلل: في التعشيق تكون سرعته أقل.', kind: 'distractor' },
    ],
    prompt: {
      title: 'احسب سرعة الخرج في مخفض تروس.',
      task: 'سمّ القائد والمقاد، أكمل النسبة والاتجاه، ثم احسب n2.',
      requiredObservationIds: [
        'ratio-z1-over-z2',
        'speed-reduced',
        'external-gears-opposite',
      ],
      requiredConclusionKeywords: ['Z1', 'Z2', '400', 'معاكس'],
      scaffoldPhrases: [
        'نطبق n2=n1×Z1/Z2.',
        'n2=1200×20/60=400 tr/min.',
        'اتجاه الخرج معاكس بسبب التعشيق الخارجي.',
      ],
    },
  },
  {
    id: 'rack-pinion-motion-conversion',
    title: 'تحويل حركة بترس وجريدة مسننة',
    subtitle: 'تحويل الدوران إلى انتقال وحساب الإزاحة.',
    bacContext:
      'أسئلة الآليات تطلب تمييز نوع الحركة ثم حساب إزاحة أو سرعة خطية من حركة دورانية.',
    sourceHint:
      'مستند إلى آليات pignon-crémaillère وتحويل الحركة في الهندسة الميكانيكية.',
    instrument: {
      subjectLabel: 'Mechanical Tech Lab',
      title: 'ورشة الآليات والحركيات',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'rack-data',
        title: 'معطيات آلية جريدة مسننة',
        bullets: [
          'قطر دائرة الخطوة للترس d=40 mm.',
          'يدور الترس دورتين كاملتين.',
          'إزاحة الجريدة تساوي محيط دائرة الخطوة مضروبا في عدد الدورات.',
        ],
      },
    ],
    table: {
      title: 'جدول تحويل الحركة',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'answer', label: 'الإجابة' },
        { id: 'unit', label: 'الوحدة/الدلالة' },
      ],
      rows: [
        { id: 'input', label: 'الدخل', cells: { item: 'حركة الدخل', answer: null, unit: null } },
        { id: 'output', label: 'الخرج', cells: { item: 'حركة الخرج', answer: null, unit: null } },
        { id: 'law', label: 'العلاقة', cells: { item: 'الإزاحة', answer: null, unit: null } },
        { id: 'displacement', label: 'L', cells: { item: 'قيمة الإزاحة', answer: null, unit: 'mm' } },
      ],
    },
    diagram: {
      title: 'ترس وجريدة مسننة',
      description: 'سمّ العضوين واتجاه الحركة الناتجة.',
      targets: [
        { id: 'pinion', label: '1', x: 42, y: 44, expectedLabel: 'ترس', acceptedLabels: ['pignon'] },
        { id: 'rack', label: '2', x: 60, y: 64, expectedLabel: 'جريدة', acceptedLabels: ['crémaillère', 'cremaillere'] },
        { id: 'rotation', label: '3', x: 33, y: 28, expectedLabel: 'دوران', acceptedLabels: ['rotation'] },
        { id: 'translation', label: '4', x: 72, y: 64, expectedLabel: 'انتقال', acceptedLabels: ['translation'] },
      ],
    },
    measurements: [
      { id: 'rack-displacement', label: 'إزاحة الجريدة L', unitHint: 'mm' },
    ],
    expectedCells: [
      { rowId: 'input', columnId: 'answer', expectedValue: 'دوران', acceptedText: ['rotation'] },
      { rowId: 'output', columnId: 'answer', expectedValue: 'انتقال', acceptedText: ['translation'] },
      { rowId: 'law', columnId: 'answer', expectedValue: 'L=πdn', acceptedText: ['pi*d*n', 'محيط'] },
      { rowId: 'displacement', columnId: 'answer', expectedValue: 251, tolerance: 4, acceptedText: ['251 mm'] },
    ],
    expectedMeasurements: [
      {
        id: 'rack-displacement',
        expected: { value: 251, unit: 'mm' },
        tolerance: 4,
        acceptedUnits: ['millimeter', 'millimetre'],
      },
    ],
    observationItems: [
      { id: 'rotation-to-translation', label: 'الترس والجريدة يحولان الدوران إلى انتقال.', detail: 'الترس يدور والجريدة تتحرك خطيا.', kind: 'motion' },
      { id: 'displacement-per-turn', label: 'كل دورة تعطي إزاحة تساوي محيط دائرة الخطوة πd.', detail: 'd=40 mm، إذن دورة واحدة تقريبا 126 mm.', kind: 'formula' },
      { id: 'two-turns-double', label: 'دورتان تضاعفان الإزاحة إلى حوالي 251 mm.', detail: 'L=π×40×2.', kind: 'calculation' },
      { id: 'rack-rotates', label: 'الجريدة تدور حول محورها مثل الترس.', detail: 'اختيار مضلل: الجريدة تتحرك انتقاليا.', kind: 'distractor' },
    ],
    prompt: {
      title: 'حلل تحويل الحركة بترس وجريدة.',
      task: 'حدد نوع حركة الدخل والخرج، أكمل العلاقة، ثم احسب إزاحة الجريدة.',
      requiredObservationIds: [
        'rotation-to-translation',
        'displacement-per-turn',
        'two-turns-double',
      ],
      requiredConclusionKeywords: ['دوران', 'انتقال', '251', 'mm'],
      scaffoldPhrases: [
        'الدخل هو دوران الترس.',
        'الخرج انتقال الجريدة.',
        'L=π×40×2≈251 mm.',
      ],
    },
  },
];

const MECHANICAL_MANUFACTURING_TOLERANCES_WORKBENCH_PRESETS = [
  {
    id: 'shaft-machining-process-sheet',
    title: 'ورقة تحضير تصنيع محور',
    subtitle: 'ترتيب العمليات واختيار الآلة والأداة والمراقبة.',
    bacContext:
      'في دراسة التحضير يملأ طالب BAC جدول وسائل الصنع: المادة، الخام، الآلة، أدوات القطع، وأدوات المراقبة لسطوح محددة.',
    sourceHint:
      'مستند إلى ملفات 2022: محور توجيه من 35C وقطر خام Ø37 mm.',
    instrument: {
      subjectLabel: 'Mechanical Tech Lab',
      title: 'ورشة التصنيع والتسامحات',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'process-brief',
        title: 'مقتطف من بطاقة التحضير',
        bullets: [
          'القطعة: محور توجيه مصنوع من فولاذ 35C.',
          'الخام: قضيب دائري Ø37 mm.',
          'السطحان 7 و8 أسطوانيان ويشغلان على المخرطة.',
          'المراقبة النهائية للقطر تتم بميكرومتر.',
        ],
      },
    ],
    table: {
      title: 'جدول وسائل الصنع',
      columns: [
        { id: 'surface', label: 'السطح' },
        { id: 'operation', label: 'العملية' },
        { id: 'machine', label: 'الآلة' },
        { id: 'tool', label: 'الأداة' },
        { id: 'control', label: 'المراقبة' },
      ],
      rows: [
        { id: 'end-face', label: 'وجه', cells: { surface: 'وجه البداية', operation: null, machine: null, tool: null, control: null } },
        { id: 'cylinder', label: 'أسطوانة', cells: { surface: 'سطح أسطواني', operation: null, machine: null, tool: null, control: null } },
        { id: 'groove', label: 'مجرى', cells: { surface: 'مجرى تثبيت', operation: null, machine: null, tool: null, control: null } },
      ],
    },
    expectedCells: [
      { rowId: 'end-face', columnId: 'operation', expectedValue: 'تسوية وجه', acceptedText: ['dressage'] },
      { rowId: 'end-face', columnId: 'machine', expectedValue: 'مخرطة', acceptedText: ['tour'] },
      { rowId: 'cylinder', columnId: 'operation', expectedValue: 'خراطة', acceptedText: ['chariotage'] },
      { rowId: 'cylinder', columnId: 'control', expectedValue: 'ميكرومتر', acceptedText: ['micromètre', 'micrometre'] },
      { rowId: 'groove', columnId: 'tool', expectedValue: 'أداة مجرى', acceptedText: ['outil a gorge', 'outil à gorge'] },
    ],
    observationItems: [
      { id: 'shaft-on-lathe', label: 'السطوح الأسطوانية للمحور تشغل على المخرطة.', detail: 'الدوران حول محور القطعة يطابق الخراطة.', kind: 'process' },
      { id: 'diameter-control-micrometer', label: 'القطر النهائي يراقب بميكرومتر.', detail: 'الميكرومتر أنسب للدقة من المسطرة.', kind: 'control' },
      { id: 'operation-order-matters', label: 'نبدأ بتسوية الوجه ثم الخراطة قبل المجرى.', detail: 'التدرج يحافظ على المرجع وعلى شروط التشغيل.', kind: 'sequence' },
      { id: 'use-drill-for-cylinder', label: 'تشغيل السطح الأسطواني الخارجي يتم بالمثقاب.', detail: 'اختيار مضلل: المثقاب للثقوب، لا للخراطة الخارجية.', kind: 'distractor' },
    ],
    prompt: {
      title: 'أكمل ورقة تحضير تصنيع محور.',
      task: 'املأ العمليات والآلة والأداة والمراقبة، ثم اكتب خلاصة اختيار وسائل الصنع.',
      requiredObservationIds: [
        'shaft-on-lathe',
        'diameter-control-micrometer',
        'operation-order-matters',
      ],
      requiredConclusionKeywords: ['مخرطة', 'خراطة', 'ميكرومتر'],
      scaffoldPhrases: [
        'المحور ذو سطوح أسطوانية لذلك نختار المخرطة.',
        'نراقب القطر النهائي بميكرومتر.',
        'نرتب العمليات من التسوية إلى الخراطة ثم المجرى.',
      ],
    },
  },
  {
    id: 'fit-clearance-tolerance-check',
    title: 'تحقق من تلاؤم H7/g6',
    subtitle: 'حساب الخلوص الأدنى والأكبر من حدود الثقب والعمود.',
    bacContext:
      'تظهر التسامحات والملاءمات في الرسم التعريفي وتحضير التصنيع، ويطلب من الطالب تفسير نوع الملاءمة أو حساب الخلوص.',
    sourceHint: 'مهمة V1 مبسطة لقراءة حدود ثقب 40H7 وعمود 40g6.',
    instrument: {
      subjectLabel: 'Mechanical Tech Lab',
      title: 'ورشة التصنيع والتسامحات',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'fit-data',
        title: 'حدود الملاءمة',
        bullets: [
          'الثقب 40H7: من 40.000 mm إلى 40.025 mm.',
          'العمود 40g6: من 39.975 mm إلى 39.991 mm.',
          'الخلوص الأدنى = أصغر ثقب - أكبر عمود.',
          'الخلوص الأكبر = أكبر ثقب - أصغر عمود.',
        ],
      },
    ],
    table: {
      title: 'جدول التحقق من الملاءمة',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'min', label: 'الصغرى' },
        { id: 'max', label: 'الكبرى' },
        { id: 'type', label: 'الدلالة' },
      ],
      rows: [
        { id: 'hole', label: 'ثقب', cells: { item: '40H7', min: 40, max: 40.025, type: 'ثقب' } },
        { id: 'shaft', label: 'عمود', cells: { item: '40g6', min: 39.975, max: 39.991, type: 'عمود' } },
        { id: 'clearance-min', label: 'Jmin', cells: { item: 'خلوص أدنى', min: null, max: null, type: null } },
        { id: 'clearance-max', label: 'Jmax', cells: { item: 'خلوص أكبر', min: null, max: null, type: null } },
      ],
    },
    measurements: [
      { id: 'min-clearance', label: 'الخلوص الأدنى Jmin', unitHint: 'mm' },
      { id: 'max-clearance', label: 'الخلوص الأكبر Jmax', unitHint: 'mm' },
    ],
    expectedCells: [
      { rowId: 'clearance-min', columnId: 'min', expectedValue: 0.009, tolerance: 0.002, acceptedText: ['0.009 mm'] },
      { rowId: 'clearance-min', columnId: 'type', expectedValue: 'خلوص', acceptedText: ['jeu'] },
      { rowId: 'clearance-max', columnId: 'max', expectedValue: 0.05, tolerance: 0.002, acceptedText: ['0.050 mm'] },
      { rowId: 'clearance-max', columnId: 'type', expectedValue: 'خلوص', acceptedText: ['jeu'] },
    ],
    expectedMeasurements: [
      { id: 'min-clearance', expected: { value: 0.009, unit: 'mm' }, tolerance: 0.002 },
      { id: 'max-clearance', expected: { value: 0.05, unit: 'mm' }, tolerance: 0.002 },
    ],
    observationItems: [
      { id: 'jmin-small-hole-big-shaft', label: 'Jmin يحسب من أصغر ثقب وأكبر عمود.', detail: '40.000-39.991=0.009 mm.', kind: 'tolerance' },
      { id: 'jmax-big-hole-small-shaft', label: 'Jmax يحسب من أكبر ثقب وأصغر عمود.', detail: '40.025-39.975=0.050 mm.', kind: 'tolerance' },
      { id: 'positive-clearance-fit', label: 'بما أن الخلوصين موجبان فالملاءمة بخلوص.', detail: 'لا يوجد تداخل في الحدود المعطاة.', kind: 'fit' },
      { id: 'negative-clearance', label: 'النتائج تدل على ملاءمة بتداخل.', detail: 'اختيار مضلل: القيم موجبة.', kind: 'distractor' },
    ],
    prompt: {
      title: 'تحقق من ملاءمة H7/g6.',
      task: 'احسب Jmin وJmax، أكمل نوع الملاءمة، ثم اكتب خلاصة قصيرة.',
      requiredObservationIds: [
        'jmin-small-hole-big-shaft',
        'jmax-big-hole-small-shaft',
        'positive-clearance-fit',
      ],
      requiredConclusionKeywords: ['Jmin', 'Jmax', 'خلوص'],
      scaffoldPhrases: [
        'Jmin=40.000-39.991=0.009 mm.',
        'Jmax=40.025-39.975=0.050 mm.',
        'القيم موجبة إذن الملاءمة بخلوص.',
      ],
    },
  },
];

const PROCESS_REACTION_WORKBENCH_PRESETS = [
  {
    id: 'esterification-reaction-scheme',
    title: 'قراءة مخطط أسترة',
    subtitle: 'تحديد المتفاعلات، النواتج، الوسيط، ونوع التفاعل.',
    bacContext:
      'في هندسة الطرائق يقرأ الطالب مخططات تفاعلات عضوية ويستنتج الوظائف الكيميائية، الشروط، والنواتج.',
    sourceHint:
      'مستند إلى أنماط BAC: أسترة حمض كربوكسيلي بكحول وحساب مردود لاحق.',
    instrument: {
      subjectLabel: 'Process Tech Lab',
      title: 'ورشة مخططات التفاعل',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'esterification-note',
        title: 'مخطط تفاعل عضوي',
        bullets: [
          'حمض كربوكسيلي + كحول يعطيان إستر + ماء.',
          'التفاعل عكوس ويستعمل وسيطا حمضيا مثل H2SO4.',
          'التسخين الراجع يسرع التفاعل ويحد من ضياع المواد.',
        ],
      },
    ],
    table: {
      title: 'جدول قراءة المخطط',
      columns: [
        { id: 'slot', label: 'الموضع' },
        { id: 'compound', label: 'المركب/الدور' },
        { id: 'family', label: 'العائلة/الدلالة' },
      ],
      rows: [
        { id: 'a', label: 'A', cells: { slot: 'A', compound: null, family: null } },
        { id: 'b', label: 'B', cells: { slot: 'B', compound: null, family: null } },
        { id: 'c', label: 'C', cells: { slot: 'C', compound: null, family: null } },
        { id: 'condition', label: 'شرط', cells: { slot: 'شرط', compound: null, family: null } },
      ],
    },
    diagram: {
      title: 'سلسلة أسترة',
      description: 'سمّ العقد الأساسية في المخطط.',
      targets: [
        { id: 'acid', label: 'A', x: 18, y: 48, expectedLabel: 'حمض كربوكسيلي', acceptedLabels: ['acide'] },
        { id: 'alcohol', label: 'B', x: 35, y: 48, expectedLabel: 'كحول', acceptedLabels: ['alcool'] },
        { id: 'ester', label: 'C', x: 64, y: 48, expectedLabel: 'إستر', acceptedLabels: ['ester'] },
        { id: 'water', label: 'D', x: 80, y: 48, expectedLabel: 'ماء', acceptedLabels: ['H2O'] },
        { id: 'catalyst', label: 'E', x: 50, y: 30, expectedLabel: 'H2SO4', acceptedLabels: ['وسيط حمضي'] },
      ],
    },
    expectedCells: [
      { rowId: 'a', columnId: 'compound', expectedValue: 'حمض', acceptedText: ['acide'] },
      { rowId: 'a', columnId: 'family', expectedValue: 'حمض كربوكسيلي' },
      { rowId: 'b', columnId: 'compound', expectedValue: 'كحول', acceptedText: ['alcool'] },
      { rowId: 'c', columnId: 'compound', expectedValue: 'إستر', acceptedText: ['ester'] },
      { rowId: 'condition', columnId: 'compound', expectedValue: 'H2SO4', acceptedText: ['حمض كبريتيك'] },
      { rowId: 'condition', columnId: 'family', expectedValue: 'وسيط', acceptedText: ['catalyseur'] },
    ],
    observationItems: [
      { id: 'acid-alcohol-form-ester', label: 'حمض كربوكسيلي مع كحول يعطي إستر وماء.', detail: 'هذه قراءة عائلة المتفاعلات والنواتج.', kind: 'scheme' },
      { id: 'esterification-reversible', label: 'الأسترة تفاعل عكوس ومحدود.', detail: 'لهذا تظهر أسئلة المردود والتوازن.', kind: 'reaction' },
      { id: 'acid-catalyst', label: 'H2SO4 يعمل كوسيط حمضي في الأسترة.', detail: 'يسرع التفاعل ولا يستهلك كمتفاعل أساسي.', kind: 'condition' },
      { id: 'water-reactant', label: 'الماء متفاعل أساسي في جهة البداية.', detail: 'اختيار مضلل: الماء ناتج في الأسترة.', kind: 'distractor' },
    ],
    prompt: {
      title: 'حلل مخطط الأسترة.',
      task: 'سمّ عائلات المتفاعلات والنواتج، أكمل شرط التفاعل، ثم اكتب خلاصة.',
      requiredObservationIds: [
        'acid-alcohol-form-ester',
        'esterification-reversible',
        'acid-catalyst',
      ],
      requiredConclusionKeywords: ['حمض', 'كحول', 'إستر', 'H2SO4'],
      scaffoldPhrases: [
        'نحدد عائلة الحمض والكحول من الوظائف.',
        'الناتج العضوي هو الإستر ويظهر الماء كناتج ثانوي.',
        'H2SO4 وسيط حمضي للتفاعل.',
      ],
    },
  },
  {
    id: 'polyester-condensation-scheme',
    title: 'مخطط بلمرة بولي إستر',
    subtitle: 'تعرف نوع البلمرة والوحدة المتكررة والناتج الثانوي.',
    bacContext:
      'تظهر في مواضيع هندسة الطرائق مخططات بوليمرات، خصوصا البولي إستر، مع سؤال نوع البلمرة والوحدة المتكررة.',
    sourceHint:
      'مستند إلى أسئلة polyester في أوراق هندسة الطرائق 2012 و2017 و2019.',
    instrument: {
      subjectLabel: 'Process Tech Lab',
      title: 'ورشة مخططات التفاعل',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'polymer-note',
        title: 'مقتطف مخطط بوليمر',
        bullets: [
          'ثنائي حمض + ثنائي كحول يعطيان بولي إستر.',
          'تتكرر رابطة -COO- داخل السلسلة.',
          'ينطلق الماء في بلمرة التكاثف.',
        ],
      },
    ],
    table: {
      title: 'جدول قراءة البلمرة',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'answer', label: 'الإجابة' },
        { id: 'meaning', label: 'الدلالة' },
      ],
      rows: [
        { id: 'monomer-a', label: 'مونومير 1', cells: { item: 'A', answer: null, meaning: null } },
        { id: 'monomer-b', label: 'مونومير 2', cells: { item: 'B', answer: null, meaning: null } },
        { id: 'polymer', label: 'البوليمر', cells: { item: 'P', answer: null, meaning: null } },
        { id: 'byproduct', label: 'ناتج ثانوي', cells: { item: 'ثانوي', answer: null, meaning: null } },
      ],
    },
    diagram: {
      title: 'مخطط تكاثف',
      description: 'سمّ عائلات المونوميرات والبوليمر.',
      targets: [
        { id: 'diacid', label: '1', x: 18, y: 50, expectedLabel: 'ثنائي حمض', acceptedLabels: ['diacide'] },
        { id: 'diol', label: '2', x: 35, y: 50, expectedLabel: 'ثنائي كحول', acceptedLabels: ['diol'] },
        { id: 'polyester', label: '3', x: 64, y: 50, expectedLabel: 'بولي إستر', acceptedLabels: ['polyester'] },
        { id: 'water-loss', label: '4', x: 78, y: 36, expectedLabel: 'H2O', acceptedLabels: ['ماء'] },
      ],
    },
    expectedCells: [
      { rowId: 'monomer-a', columnId: 'answer', expectedValue: 'ثنائي حمض', acceptedText: ['diacide'] },
      { rowId: 'monomer-b', columnId: 'answer', expectedValue: 'ثنائي كحول', acceptedText: ['diol'] },
      { rowId: 'polymer', columnId: 'answer', expectedValue: 'بولي إستر', acceptedText: ['polyester'] },
      { rowId: 'polymer', columnId: 'meaning', expectedValue: 'رابطة إستر', acceptedText: ['-COO-'] },
      { rowId: 'byproduct', columnId: 'answer', expectedValue: 'ماء', acceptedText: ['H2O'] },
    ],
    observationItems: [
      { id: 'condensation-polymerization', label: 'البولي إستر ينتج غالبا ببلمرة تكاثف.', detail: 'يتكون جزيء صغير مثل الماء.', kind: 'polymer' },
      { id: 'ester-link-repeats', label: 'الوحدة المتكررة تحتوي رابطة إستر -COO-.', detail: 'هذه علامة عائلة البولي إستر.', kind: 'structure' },
      { id: 'diacid-diol-needed', label: 'ثنائي حمض وثنائي كحول يسمحان ببناء سلسلة طويلة.', detail: 'وظيفتان في كل طرف ضرورية للتكرار.', kind: 'monomer' },
      { id: 'addition-polymerization', label: 'هذا المثال بلمرة إضافة بدون ناتج ثانوي.', detail: 'اختيار مضلل هنا: وجود الماء يدل على التكاثف.', kind: 'distractor' },
    ],
    prompt: {
      title: 'اقرأ مخطط بلمرة بولي إستر.',
      task: 'حدد المونوميرات، نوع البلمرة، والناتج الثانوي، ثم اكتب خلاصة.',
      requiredObservationIds: [
        'condensation-polymerization',
        'ester-link-repeats',
        'diacid-diol-needed',
      ],
      requiredConclusionKeywords: ['بولي إستر', 'تكاثف', 'ماء'],
      scaffoldPhrases: [
        'المونوميران ثنائي حمض وثنائي كحول.',
        'تتكرر رابطة الإستر داخل السلسلة.',
        'انطلاق الماء يدل على بلمرة بالتكاثف.',
      ],
    },
  },
];

const PROCESS_MATERIAL_BALANCE_ADVANCEMENT_WORKBENCH_PRESETS = [
  {
    id: 'ester-yield-mass-balance',
    title: 'موازنة مادة ومردود أسترة',
    subtitle: 'استعمال المردود لحساب كمية وكتلة الإستر.',
    bacContext:
      'تتكرر في هندسة الطرائق حسابات المردود والكتلة من كمية مادة المتفاعل أو الناتج، خاصة في الأسترة.',
    sourceHint:
      'مستند إلى نمط محلي: R=60%، n(acide)=0.5 mol، و M(ester)=130 g/mol.',
    instrument: {
      subjectLabel: 'Process Tech Lab',
      title: 'ورشة الموازنة والتقدم',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'yield-data',
        title: 'معطيات الإنتاج',
        bullets: [
          'كمية الحمض الابتدائية n0=0.5 mol.',
          'مردود التفاعل R=60%.',
          'الكتلة المولية للإستر M=130 g/mol.',
          'n(ester)=R×n0/100 ثم m=n×M.',
        ],
      },
    ],
    table: {
      title: 'جدول المردود والكتلة',
      columns: [
        { id: 'item', label: 'العنصر' },
        { id: 'value', label: 'القيمة' },
        { id: 'unit', label: 'الوحدة' },
      ],
      rows: [
        { id: 'n0', label: 'n0', cells: { item: 'كمية الحمض', value: 0.5, unit: 'mol' } },
        { id: 'yield', label: 'R', cells: { item: 'المردود', value: 60, unit: '%' } },
        { id: 'n-ester', label: 'n ester', cells: { item: 'كمية الإستر', value: null, unit: 'mol' } },
        { id: 'm-ester', label: 'm ester', cells: { item: 'كتلة الإستر', value: null, unit: 'g' } },
      ],
    },
    measurements: [
      { id: 'ester-amount', label: 'كمية الإستر', unitHint: 'mol' },
      { id: 'ester-mass', label: 'كتلة الإستر', unitHint: 'g' },
    ],
    expectedCells: [
      { rowId: 'n-ester', columnId: 'value', expectedValue: 0.3, tolerance: 0.02, acceptedText: ['0.3 mol'] },
      { rowId: 'm-ester', columnId: 'value', expectedValue: 39, tolerance: 1, acceptedText: ['39 g'] },
    ],
    expectedMeasurements: [
      { id: 'ester-amount', expected: { value: 0.3, unit: 'mol' }, tolerance: 0.02 },
      { id: 'ester-mass', expected: { value: 39, unit: 'g' }, tolerance: 1 },
    ],
    observationItems: [
      { id: 'yield-reduces-theoretical', label: 'المردود 60% يعني أن n(ester)=0.60×n0.', detail: 'نحوّل النسبة المئوية إلى عدد عشري.', kind: 'yield' },
      { id: 'amount-before-mass', label: 'نحسب كمية الإستر قبل الكتلة.', detail: 'm=n×M بعد إيجاد n.', kind: 'sequence' },
      { id: 'mass-is-39', label: '0.3 mol من إستر كتلته المولية 130 g/mol تعطي 39 g.', detail: '0.3×130=39.', kind: 'calculation' },
      { id: 'use-yield-as-60', label: 'نعوض R=60 مباشرة دون القسمة على 100.', detail: 'اختيار مضلل: يجب استعمال 0.60.', kind: 'distractor' },
    ],
    prompt: {
      title: 'احسب كمية وكتلة الإستر من المردود.',
      task: 'أكمل جدول الموازنة، أدخل القيم المحسوبة، ثم اكتب خلاصة قصيرة.',
      requiredObservationIds: [
        'yield-reduces-theoretical',
        'amount-before-mass',
        'mass-is-39',
      ],
      requiredConclusionKeywords: ['0.3', '39', 'مردود'],
      scaffoldPhrases: [
        'نحول R=60% إلى 0.60.',
        'n(ester)=0.60×0.5=0.3 mol.',
        'm=0.3×130=39 g.',
      ],
    },
  },
  {
    id: 'advancement-limiting-reagent-table',
    title: 'جدول تقدم وتفاعل محدود',
    subtitle: 'تحديد المتفاعل المحد والتقدم الأقصى والنواتج.',
    bacContext:
      'جدول التقدم أداة أساسية في مسائل الطرائق والكيمياء، خاصة عندما يطلب تحديد المتفاعل المحد والكمية النهائية.',
    sourceHint:
      'نموذج مبسط لتفاعل N2 + 3H2 -> 2NH3 مع n0(N2)=2 mol و n0(H2)=3 mol.',
    instrument: {
      subjectLabel: 'Process Tech Lab',
      title: 'ورشة الموازنة والتقدم',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'advancement-data',
        title: 'معطيات جدول التقدم',
        bullets: [
          'المعادلة: N2 + 3H2 -> 2NH3.',
          'n0(N2)=2 mol و n0(H2)=3 mol.',
          'xmax يحدد من أصغر n0/المعامل الستوكيومتري.',
        ],
      },
    ],
    table: {
      title: 'جدول التقدم',
      columns: [
        { id: 'species', label: 'النوع' },
        { id: 'initial', label: 'ابتدائي' },
        { id: 'change', label: 'تغير' },
        { id: 'final', label: 'نهائي' },
      ],
      rows: [
        { id: 'n2', label: 'N2', cells: { species: 'N2', initial: 2, change: '-x', final: null } },
        { id: 'h2', label: 'H2', cells: { species: 'H2', initial: 3, change: '-3x', final: null } },
        { id: 'nh3', label: 'NH3', cells: { species: 'NH3', initial: 0, change: '+2x', final: null } },
        { id: 'xmax', label: 'xmax', cells: { species: 'xmax', initial: null, change: null, final: null } },
      ],
    },
    measurements: [
      { id: 'xmax', label: 'التقدم الأقصى xmax', unitHint: 'mol' },
      { id: 'ammonia-final', label: 'كمية NH3 النهائية', unitHint: 'mol' },
    ],
    expectedCells: [
      { rowId: 'n2', columnId: 'final', expectedValue: 1, tolerance: 0.05, acceptedText: ['1 mol'] },
      { rowId: 'h2', columnId: 'final', expectedValue: 0, tolerance: 0.05 },
      { rowId: 'nh3', columnId: 'final', expectedValue: 2, tolerance: 0.05, acceptedText: ['2 mol'] },
      { rowId: 'xmax', columnId: 'final', expectedValue: 1, tolerance: 0.05, acceptedText: ['1 mol'] },
    ],
    expectedMeasurements: [
      { id: 'xmax', expected: { value: 1, unit: 'mol' }, tolerance: 0.05 },
      { id: 'ammonia-final', expected: { value: 2, unit: 'mol' }, tolerance: 0.05 },
    ],
    observationItems: [
      { id: 'h2-limiting', label: 'H2 هو المتفاعل المحد لأن 3/3=1 أصغر من 2/1=2.', detail: 'نقارن n0 على المعامل.', kind: 'limiting' },
      { id: 'xmax-one', label: 'التقدم الأقصى xmax=1 mol.', detail: 'عندها ينعدم H2.', kind: 'advancement' },
      { id: 'nh3-two', label: 'كمية NH3 النهائية تساوي 2xmax=2 mol.', detail: 'معامل NH3 هو 2.', kind: 'stoichiometry' },
      { id: 'n2-limiting', label: 'N2 هو المتفاعل المحد لأنه كميته الابتدائية أكبر.', detail: 'اختيار مضلل: لا نقارن الكميات وحدها.', kind: 'distractor' },
    ],
    prompt: {
      title: 'أكمل جدول التقدم وحدد المتفاعل المحد.',
      task: 'املأ الكميات النهائية، أدخل xmax وكمية NH3، ثم اكتب خلاصة.',
      requiredObservationIds: ['h2-limiting', 'xmax-one', 'nh3-two'],
      requiredConclusionKeywords: ['H2', 'xmax', '2'],
      scaffoldPhrases: [
        'نقارن 2/1 و3/3، فنجد H2 محدا.',
        'xmax=1 mol.',
        'n(NH3)=2xmax=2 mol.',
      ],
    },
  },
];

const PROCESS_FLOW_INSTRUMENTATION_WORKBENCH_PRESETS = [
  {
    id: 'distillation-flow-diagram-reading',
    title: 'قراءة مخطط تقطير',
    subtitle: 'تسمية التجهيزات والتيارات الأساسية في وحدة فصل.',
    bacContext:
      'تتضمن أوراق هندسة الطرائق مخططات أجهزة وفصل ومواد/أدوات، حيث يجب قراءة اتجاه الجريان ووظيفة كل جهاز.',
    sourceHint:
      'مهمة V1 مستوحاة من مخططات التجهيزات والفصل التي تبقى غالبا image-backed في الأوراق.',
    instrument: {
      subjectLabel: 'Process Tech Lab',
      title: 'ورشة الجريان والقياس',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'distillation-note',
        title: 'مبدأ وحدة تقطير',
        bullets: [
          'يدخل المزيج إلى العمود كتيار تغذية.',
          'المكثف يحول البخار العلوي إلى سائل مقطر.',
          'الغلاية/المسخن السفلي يعطي الحرارة ويخرج الراسب الثقيل.',
        ],
      },
    ],
    table: {
      title: 'جدول تجهيزات وتيارات',
      columns: [
        { id: 'tag', label: 'الرمز' },
        { id: 'name', label: 'التسمية' },
        { id: 'function', label: 'الوظيفة' },
      ],
      rows: [
        { id: 'c1', label: 'C1', cells: { tag: 'C1', name: null, function: null } },
        { id: 'e1', label: 'E1', cells: { tag: 'E1', name: null, function: null } },
        { id: 'b1', label: 'B1', cells: { tag: 'B1', name: null, function: null } },
        { id: 'f', label: 'F', cells: { tag: 'F', name: null, function: null } },
      ],
    },
    diagram: {
      title: 'PFD تقطير مبسط',
      description: 'سمّ العمود، المكثف، المسخن، وتيار التغذية.',
      targets: [
        { id: 'column', label: '1', x: 45, y: 48, expectedLabel: 'عمود تقطير', acceptedLabels: ['colonne'] },
        { id: 'condenser', label: '2', x: 70, y: 24, expectedLabel: 'مكثف', acceptedLabels: ['condenseur'] },
        { id: 'reboiler', label: '3', x: 66, y: 74, expectedLabel: 'غلاية', acceptedLabels: ['rebouilleur', 'مسخن'] },
        { id: 'feed', label: '4', x: 24, y: 52, expectedLabel: 'تغذية', acceptedLabels: ['feed', 'alimentation'] },
      ],
    },
    expectedCells: [
      { rowId: 'c1', columnId: 'name', expectedValue: 'عمود تقطير', acceptedText: ['colonne'] },
      { rowId: 'c1', columnId: 'function', expectedValue: 'فصل', acceptedText: ['séparation', 'separation'] },
      { rowId: 'e1', columnId: 'name', expectedValue: 'مكثف', acceptedText: ['condenseur'] },
      { rowId: 'b1', columnId: 'name', expectedValue: 'غلاية', acceptedText: ['rebouilleur', 'مسخن'] },
      { rowId: 'f', columnId: 'name', expectedValue: 'تغذية', acceptedText: ['alimentation'] },
    ],
    observationItems: [
      { id: 'feed-enters-column', label: 'تيار التغذية يدخل إلى العمود قبل الفصل.', detail: 'هذا يحدد اتجاه قراءة المخطط.', kind: 'flow' },
      { id: 'top-vapor-condensed', label: 'المكثف يحول بخار القمة إلى سائل.', detail: 'وظيفته تبادل حراري في أعلى الوحدة.', kind: 'equipment' },
      { id: 'bottom-reboiler-heats', label: 'الغلاية السفلية تزود العمود بالحرارة.', detail: 'تساعد على إعادة تبخير جزء من السائل.', kind: 'energy' },
      { id: 'condenser-heats-bottom', label: 'المكثف يوجد أسفل العمود لتسخين الراسب.', detail: 'اختيار مضلل: هذا دور الغلاية.', kind: 'distractor' },
    ],
    prompt: {
      title: 'اقرأ مخطط جريان تقطير.',
      task: 'سمّ التجهيزات والتيارات، أكمل جدول الوظائف، ثم اكتب خلاصة الجريان.',
      requiredObservationIds: [
        'feed-enters-column',
        'top-vapor-condensed',
        'bottom-reboiler-heats',
      ],
      requiredConclusionKeywords: ['تغذية', 'عمود', 'مكثف', 'غلاية'],
      scaffoldPhrases: [
        'التغذية تدخل العمود.',
        'البخار العلوي يتكثف في المكثف.',
        'الغلاية السفلية تزود الحرارة.',
      ],
    },
  },
  {
    id: 'reactor-instrumentation-control-loop',
    title: 'حلقة قياس وتحكم في مفاعل',
    subtitle: 'قراءة رموز TT/TIC/TV وربط المتغير بالمشغل.',
    bacContext:
      'ملفات الطرائق قد تعرض مخطط أجهزة وتحكم؛ المطلوب قراءة المتغير المقاس والعضو المنفذ ومسار الإشارة.',
    sourceHint: 'مهمة V1 مبسطة لحلقة تحكم في درجة حرارة مفاعل مبرد.',
    instrument: {
      subjectLabel: 'Process Tech Lab',
      title: 'ورشة الجريان والقياس',
      iconKind: 'technical',
    },
    sourceDocuments: [
      {
        id: 'control-loop-note',
        title: 'مخطط تحكم',
        bullets: [
          'TT يقيس درجة حرارة المفاعل.',
          'TIC يقارن القياس بالقيمة المرجعية ويرسل أمرا.',
          'TV صمام يغير تدفق ماء التبريد.',
        ],
      },
    ],
    table: {
      title: 'جدول رموز القياس والتحكم',
      columns: [
        { id: 'tag', label: 'الرمز' },
        { id: 'role', label: 'الدور' },
        { id: 'variable', label: 'المتغير' },
      ],
      rows: [
        { id: 'tt', label: 'TT', cells: { tag: 'TT', role: null, variable: null } },
        { id: 'tic', label: 'TIC', cells: { tag: 'TIC', role: null, variable: null } },
        { id: 'tv', label: 'TV', cells: { tag: 'TV', role: null, variable: null } },
        { id: 'cooling', label: 'تبريد', cells: { tag: 'ماء تبريد', role: null, variable: null } },
      ],
    },
    diagram: {
      title: 'حلقة تحكم في مفاعل',
      description: 'سمّ القياس، المتحكم، والصمام.',
      targets: [
        { id: 'reactor', label: '1', x: 42, y: 52, expectedLabel: 'مفاعل', acceptedLabels: ['reacteur', 'reactor'] },
        { id: 'temperature-transmitter', label: '2', x: 34, y: 34, expectedLabel: 'TT', acceptedLabels: ['حساس حرارة'] },
        { id: 'controller', label: '3', x: 62, y: 30, expectedLabel: 'TIC', acceptedLabels: ['متحكم'] },
        { id: 'control-valve', label: '4', x: 72, y: 66, expectedLabel: 'TV', acceptedLabels: ['صمام'] },
      ],
    },
    expectedCells: [
      { rowId: 'tt', columnId: 'role', expectedValue: 'قياس', acceptedText: ['transmetteur'] },
      { rowId: 'tt', columnId: 'variable', expectedValue: 'درجة الحرارة', acceptedText: ['temperature'] },
      { rowId: 'tic', columnId: 'role', expectedValue: 'تحكم', acceptedText: ['controller', 'régulateur'] },
      { rowId: 'tv', columnId: 'role', expectedValue: 'صمام', acceptedText: ['valve'] },
      { rowId: 'cooling', columnId: 'variable', expectedValue: 'تدفق', acceptedText: ['debit', 'débit'] },
    ],
    observationItems: [
      { id: 'tt-measures-temperature', label: 'TT هو مرسل/حساس درجة الحرارة.', detail: 'الحرف T يدل على temperature.', kind: 'instrument' },
      { id: 'tic-controls-valve', label: 'TIC يرسل أمر التحكم إلى TV.', detail: 'المتحكم يقرر فتح أو غلق صمام التبريد.', kind: 'control' },
      { id: 'cooling-flow-removes-heat', label: 'زيادة تدفق ماء التبريد تخفض حرارة المفاعل.', detail: 'هذه علاقة تشغيلية بين المتغير والمشغل.', kind: 'operation' },
      { id: 'tv-measures-temperature', label: 'TV يقيس درجة الحرارة مباشرة.', detail: 'اختيار مضلل: TV صمام تحكم.', kind: 'distractor' },
    ],
    prompt: {
      title: 'حلل حلقة تحكم في مفاعل.',
      task: 'سمّ الرموز، أكمل وظائفها، ثم اشرح كيف يصحح النظام ارتفاع الحرارة.',
      requiredObservationIds: [
        'tt-measures-temperature',
        'tic-controls-valve',
        'cooling-flow-removes-heat',
      ],
      requiredConclusionKeywords: ['TT', 'TIC', 'TV', 'تبريد'],
      scaffoldPhrases: [
        'TT يقيس درجة الحرارة.',
        'TIC يرسل الأمر إلى TV.',
        'فتح صمام التبريد يزيد إزالة الحرارة.',
      ],
    },
  },
];

const PLATFORM_LAB_TOOLS: PlatformLabToolDefinition[] = [
  {
    slug: 'function-explorer',
    subjectCode: 'MATHEMATICS',
    title: 'مستكشف الدوال',
    description:
      'مهمات قصيرة تربط المنحنى بالجذور، جدول القيم، ولغة أسئلة BAC.',
    metadata: {
      subjectSlug: 'math',
      route: '/student/lab/math/function-explorer',
      registryToolId: 'function-explorer',
    },
    missions: [
      {
        code: 'FUNCTION_ROOTS_FROM_GRAPH',
        title: 'اقرأ جذور المنحنى',
        goal: 'استعمل الدالة المقترحة لتحديد حلول f(x)=0 تقريبياً ثم قارِنها بجدول القيم.',
        curriculumNodeCode: 'FUNCTIONS',
        learningTargetCode: 'FUNCTION_ANALYSIS',
        preset: {
          toolPresetId: 'quadratic',
          expression: 'x^2 - 4*x + 3',
          expectedRoots: [1, 3],
        },
        exitCheck: {
          kind: 'ROOTS_NEAR',
          expectedRoots: [1, 3],
          tolerance: 0.25,
        },
        orderIndex: 1,
      },
      {
        code: 'FUNCTION_SIGN_INTERVALS',
        title: 'استنتج مجالات الإشارة',
        goal: 'غيّر مجال النظر حول الجذرين ولاحظ أين تكون الدالة موجبة أو سالبة قبل كتابة جدول الإشارة.',
        curriculumNodeCode: 'FUNCTIONS',
        learningTargetCode: 'FUNCTION_ANALYSIS',
        preset: {
          toolPresetId: 'quadratic',
          expression: '(x + 2)*(x - 1)',
          expectedRoots: [-2, 1],
          expectedPositiveIntervals: ['x < -2', 'x > 1'],
          expectedNegativeIntervals: ['-2 < x < 1'],
        },
        exitCheck: {
          kind: 'SIGN_INTERVALS',
          expectedRoots: [-2, 1],
        },
        orderIndex: 2,
      },
      {
        code: 'FUNCTION_MINIMUM_READING',
        title: 'اربط القمة بجدول التغيرات',
        goal: 'استعمل شكل القطع المكافئ لتحديد القيمة الصغرى بصرياً ثم اربطها بفكرة التغيرات.',
        curriculumNodeCode: 'DERIVATIVES',
        learningTargetCode: 'DERIVATIVE_APPLICATIONS',
        preset: {
          toolPresetId: 'quadratic',
          expression: 'x^2 - 2*x - 3',
          expectedVertex: { x: 1, y: -4 },
        },
        exitCheck: {
          kind: 'VERTEX_NEAR',
          expectedVertex: { x: 1, y: -4 },
          tolerance: 0.5,
        },
        orderIndex: 3,
      },
    ],
  },
  {
    slug: 'math-probability-workbench',
    subjectCode: 'MATHEMATICS',
    title: 'ورشة الاحتمالات',
    description: 'شجرات، جداول قانون احتمال، واحتمال شرطي.',
    status: 'READY',
    metadata: {
      subjectSlug: 'math',
      route: '/student/lab/math/probability-workbench',
      registryToolId: 'math-probability-workbench',
      engineKinds: ['table', 'document-reasoning'],
    },
    missions: [
      {
        code: 'MATH_PROBABILITY_TREE_TWO_STAGE',
        title: 'أكمل شجرة احتمال واحسب تقاطعا',
        goal: 'املأ الفروع الناقصة في شجرة احتمال على مرحلتين، ثم احسب P(A∩B) باستعمال قاعدة الضرب.',
        curriculumNodeCode: 'PROBABILITY',
        learningTargetCode: 'PROBABILITY_MODELING',
        preset: MATH_PROBABILITY_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: MATH_PROBABILITY_WORKBENCH_PRESETS[0].expectedCells,
        },
        orderIndex: 1,
      },
      {
        code: 'MATH_PROBABILITY_LAW_EXPECTATION',
        title: 'أتمم قانون احتمال واحسب الأمل',
        goal: 'املأ قانون احتمال المتغير X ثم احسب E(X) من مجموع x×P(X=x).',
        curriculumNodeCode: 'PROBABILITY',
        learningTargetCode: 'PROBABILITY_MODELING',
        preset: MATH_PROBABILITY_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: MATH_PROBABILITY_WORKBENCH_PRESETS[1].expectedCells,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'math-sequences-workbench',
    subjectCode: 'MATHEMATICS',
    title: 'ورشة المتتاليات',
    description: 'حدود، علاقة تراجعية، رتابة، وتحويل هندسي.',
    status: 'READY',
    metadata: {
      subjectSlug: 'math',
      route: '/student/lab/math/sequences-workbench',
      registryToolId: 'math-sequences-workbench',
      engineKinds: ['table', 'graph', 'document-reasoning'],
    },
    missions: [
      {
        code: 'MATH_SEQUENCES_AFFINE_FIXED_POINT',
        title: 'حلل متتالية تراجعية بنقطة تثبيت',
        goal: 'أكمل حدود uₙ و vₙ، بين أن vₙ هندسية، ثم استنتج اتجاه الحدود ونهاية uₙ.',
        curriculumNodeCode: 'SEQUENCES',
        learningTargetCode: 'SEQUENCE_PROOF',
        preset: MATH_SEQUENCES_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: MATH_SEQUENCES_WORKBENCH_PRESETS[0].expectedCells,
        },
        orderIndex: 1,
      },
      {
        code: 'MATH_SEQUENCES_ARITHMETIC_SUM',
        title: 'تحقق من حد واحسب مجموعا',
        goal: 'استعمل صيغة uₙ=3n-9 لتحديد الأساس ورتبة الحد 2025 ثم حساب مجموع جزئي.',
        curriculumNodeCode: 'SEQUENCES',
        learningTargetCode: 'SEQUENCE_PROOF',
        preset: MATH_SEQUENCES_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: MATH_SEQUENCES_WORKBENCH_PRESETS[1].expectedCells,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'math-geometry-complex-plane',
    subjectCode: 'MATHEMATICS',
    title: 'ورشة الهندسة والمستوى المركب',
    description: 'نقاط، لواحق، متجهات، مسافات، وتحويلات.',
    status: 'READY',
    metadata: {
      subjectSlug: 'math',
      route: '/student/lab/math/geometry-complex-plane',
      registryToolId: 'math-geometry-complex-plane',
      engineKinds: ['diagram-labeling', 'table', 'formula-unit'],
    },
    missions: [
      {
        code: 'MATH_COMPLEX_CIRCLE_TRIANGLE',
        title: 'استنتج دائرة وطبيعة مثلث من اللواحق',
        goal: 'أكمل الأطوال والحجج، ثم استنتج الدائرة وطبيعة المثلث من نقاط المستوى المركب.',
        curriculumNodeCode: 'COMPLEX_NUMBERS',
        learningTargetCode: 'COMPLEX_NUMBER_MANIPULATION',
        preset: MATH_GEOMETRY_COMPLEX_PLANE_PRESETS[0],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: MATH_GEOMETRY_COMPLEX_PLANE_PRESETS[0].expectedCells,
        },
        orderIndex: 1,
      },
      {
        code: 'MATH_COMPLEX_VECTOR_TRANSLATION',
        title: 'اقرأ متجهة وترجمة من فروق اللواحق',
        goal: 'احسب zB-zA و zC-zB، ثم استنتج الاستقامية وصورة B بترجمة.',
        curriculumNodeCode: 'COMPLEX_NUMBERS',
        learningTargetCode: 'COMPLEX_NUMBER_MANIPULATION',
        preset: MATH_GEOMETRY_COMPLEX_PLANE_PRESETS[1],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: MATH_GEOMETRY_COMPLEX_PLANE_PRESETS[1].expectedCells,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'dna-to-protein',
    subjectCode: 'NATURAL_SCIENCES',
    title: 'من DNA إلى بروتين',
    description: 'مهمات قصيرة لتحويل DNA إلى mRNA ثم بروتين، وفهم أثر الطفرات.',
    metadata: {
      subjectSlug: 'svt',
      route: '/student/lab/svt/dna-to-protein',
      registryToolId: 'dna-to-protein',
    },
    missions: [
      {
        code: 'DNA_TRANSCRIPTION_CHAIN',
        title: 'حوّل DNA إلى mRNA',
        goal: 'اتبع قواعد التكامل لتحويل السلسلة إلى mRNA ثم قسّمها إلى رامزات.',
        curriculumNodeCode: 'PROTEIN_SYNTHESIS',
        learningTargetCode: 'PROTEIN_FUNCTION_REASONING',
        preset: {
          dna: 'ATGCTTGAA',
          expectedMrna: 'AUGCUUGAA',
          expectedCodons: ['AUG', 'CUU', 'GAA'],
        },
        exitCheck: {
          kind: 'MRNA_AND_CODONS',
          expectedMrna: 'AUGCUUGAA',
          expectedCodons: ['AUG', 'CUU', 'GAA'],
        },
        orderIndex: 1,
      },
      {
        code: 'DNA_MUTATION_EFFECT',
        title: 'صنّف أثر الطفرة',
        goal: 'غيّر قاعدة واحدة ولاحظ هل يتغير الحمض الأميني أم تظهر إشارة توقف.',
        curriculumNodeCode: 'PROTEIN_SYNTHESIS',
        learningTargetCode: 'PROTEIN_FUNCTION_REASONING',
        preset: {
          dna: 'ATGCTTGAA',
          mutation: {
            index: 3,
            base: 'A',
          },
          expectedEffect: 'amino-acid-change',
        },
        exitCheck: {
          kind: 'MUTATION_EFFECT',
          acceptedEffects: ['silent', 'amino-acid-change', 'stop'],
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'svt-document-workbench',
    subjectCode: 'NATURAL_SCIENCES',
    title: 'ورشة الوثائق والمنحنيات',
    description: 'قراءة وثائق، اختيار أدلة، وبناء استنتاج.',
    status: 'READY',
    metadata: {
      subjectSlug: 'svt',
      route: '/student/lab/svt/document-workbench',
      registryToolId: 'svt-document-workbench',
      engineKinds: ['document-reasoning', 'graph', 'table'],
    },
    missions: [
      {
        code: 'SVT_DOC_LDL_RECEPTOR_REASONING',
        title: 'فسّر مرضا انطلاقا من وثائق المستقبل R',
        goal: 'اختر الأدلة التي تربط الطفرة بتغير بنية المستقبل ثم اكتب استنتاجا يفسر تراكم LDL عند المصاب.',
        curriculumNodeCode: 'STRUCTURE_FUNCTION',
        learningTargetCode: 'PROTEIN_FUNCTION_REASONING',
        preset: {
          id: 'ldl-receptor-structure-function',
          title: 'مستقبل LDL والبنية الوظيفية',
          subtitle: 'استغلال وثائق بنية البروتين لتفسير حالة مرضية.',
          bacContext:
            'نمط متكرر في مواضيع SVT: وثائق عن أليل سليم/مصاب، جدول أحماض أمينية، ثم مناقشة علاقة البنية بالوظيفة.',
          sourceDocuments: [
            {
              id: 'doc-ldl-entry',
              title: 'الوثيقة 1: دخول LDL إلى الخلية',
              kind: 'diagram',
              sourceLabel: 'رسم وظيفي',
              blocks: [
                {
                  type: 'diagram',
                  title: 'آلية التثبيت والاقتناص',
                  description:
                    'يرتبط LDL بمستقبل غشائي نوعي R، ثم تقتنصه الخلية لاستعمال الكولسترول. إذا اختل المستقبل لا يتم تثبيت LDL بكفاءة.',
                  labels: ['LDL', 'المستقبل R', 'غشاء الخلية', 'اقتناص خلوي'],
                },
              ],
            },
            {
              id: 'doc-r-alleles',
              title: 'الوثيقة 2: مقارنة جزء من الأليلين R1 و R2',
              kind: 'table',
              sourceLabel: 'جدول مقارنة',
              blocks: [
                {
                  type: 'table',
                  title: 'أثر اختلاف رامزة واحدة في البروتين',
                  columns: [
                    { id: 'allele', label: 'الأليل' },
                    { id: 'codon', label: 'الرامزة عند الموضع 33' },
                    { id: 'protein', label: 'الأثر على السلسلة' },
                  ],
                  rows: [
                    {
                      id: 'r1',
                      cells: {
                        allele: 'R1',
                        codon: 'CAG',
                        protein: 'Gln ثم استمرار تركيب المستقبل',
                      },
                    },
                    {
                      id: 'r2',
                      cells: {
                        allele: 'R2',
                        codon: 'UAG',
                        protein: 'رامزة توقف مبكرة وسلسلة قصيرة',
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'doc-ldl-graph',
              title: 'الوثيقة 3: تغير LDL في الدم',
              kind: 'graph',
              sourceLabel: 'منحنى',
              blocks: [
                {
                  type: 'graph',
                  title: 'كمية LDL المتبقية في الدم بعد وجبة دسمة',
                  xAxis: { label: 'الزمن', unit: 'ساعات' },
                  yAxis: { label: 'LDL في الدم', unit: 'وحدة نسبية' },
                  series: [
                    {
                      id: 'healthy',
                      title: 'شخص سليم',
                      kind: 'line',
                      points: [
                        { x: 0, y: 72 },
                        { x: 2, y: 58 },
                        { x: 4, y: 43 },
                        { x: 6, y: 32 },
                      ],
                    },
                    {
                      id: 'affected',
                      title: 'شخص مصاب',
                      kind: 'line',
                      points: [
                        { x: 0, y: 74 },
                        { x: 2, y: 78 },
                        { x: 4, y: 82 },
                        { x: 6, y: 86 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          evidenceItems: [
            {
              id: 'ldl-normal-entry',
              documentId: 'doc-ldl-entry',
              label: 'المستقبل R السليم يسمح بتثبيت LDL واقتناصه.',
              detail:
                'هذه المعلومة تربط البنية الغشائية بالوظيفة الخلوية المباشرة.',
              keywords: ['مستقبل', 'LDL', 'اقتناص'],
            },
            {
              id: 'r2-stop-codon',
              documentId: 'doc-r-alleles',
              label: 'الأليل R2 يعطي رامزة توقف مبكرة UAG.',
              detail:
                'رامزة التوقف تختصر السلسلة البروتينية، فتتغير البنية الفراغية.',
              keywords: ['طفرة', 'رامزة توقف', 'سلسلة قصيرة'],
            },
            {
              id: 'ldl-accumulation',
              documentId: 'doc-ldl-graph',
              label: 'LDL يبقى مرتفعا عند المصاب بدل أن ينخفض.',
              detail: 'المنحنى يدعم أن الخلايا لا تقتنص LDL بالفعالية نفسها.',
              keywords: ['LDL', 'يتراكم', 'المصاب'],
            },
          ],
          prompt: {
            title: 'ناقش العلاقة بين بنية المستقبل R والحالة الصحية.',
            task: 'اختر الأدلة التي تربط الطفرة بتغير بنية المستقبل ثم اكتب استنتاجا يفسر تراكم LDL عند المصاب.',
            requiredEvidenceIds: [
              'ldl-normal-entry',
              'r2-stop-codon',
              'ldl-accumulation',
            ],
            requiredConclusionKeywords: [
              'LDL',
              'مستقبل',
              'طفرة',
              'رامزة توقف',
              'بنية',
            ],
            scaffoldPhrases: [
              'تدل الوثيقة 1 على أن المستقبل R السليم يثبت LDL.',
              'يبين جدول الأليلين أن الطفرة حولت رامزة إلى رامزة توقف.',
              'أستنتج أن تغير البنية الفراغية للمستقبل يمنع اقتناص LDL.',
            ],
          },
        },
        exitCheck: {
          kind: 'DOCUMENT_EVIDENCE',
          requiredEvidenceIds: [
            'ldl-normal-entry',
            'r2-stop-codon',
            'ldl-accumulation',
          ],
          requiredConclusionKeywords: [
            'LDL',
            'مستقبل',
            'طفرة',
            'رامزة توقف',
            'بنية',
          ],
        },
        orderIndex: 1,
      },
      {
        code: 'SVT_DOC_PROTEIN_SYNTHESIS_CHAIN',
        title: 'ابن نصا علميا من وثائق تركيب البروتين',
        goal: 'اختر أدلة سلسلة ADN إلى ARNm إلى أحماض أمينية، ثم اكتب خلاصة تربط ترتيب المعلومة بالبنية الفراغية.',
        curriculumNodeCode: 'PROTEIN_SYNTHESIS',
        learningTargetCode: 'DOCUMENT_ANALYSIS',
        preset: {
          id: 'protein-synthesis-document-chain',
          title: 'من الوثائق إلى نص تركيب البروتين',
          subtitle: 'ربط ADN و ARNm والترجمة بالبنية الفراغية للبروتين.',
          bacContext:
            'نمط BAC كلاسيكي: وثيقة مراحل تركيب البروتين، جدول عناصر ضرورية، ثم نص علمي يربط المعلومة الوراثية بالبنية.',
          sourceDocuments: [
            {
              id: 'doc-synthesis-diagram',
              title: 'الوثيقة 1: مرحلتا تركيب البروتين',
              kind: 'diagram',
              sourceLabel: 'رسم تخطيطي',
              blocks: [
                {
                  type: 'diagram',
                  title: 'من المورثة إلى السلسلة البيبتيدية',
                  description:
                    'داخل النواة تستنسخ المورثة إلى ARNm، ثم ينتقل ARNm إلى الهيولى حيث تقرأ الريبوزومات رامزاته لتشكيل سلسلة أحماض أمينية.',
                  labels: ['ADN', 'ARNm', 'ريبوزوم', 'أحماض أمينية'],
                },
              ],
            },
            {
              id: 'doc-synthesis-elements',
              title: 'الوثيقة 2: عناصر المرحلتين',
              kind: 'table',
              sourceLabel: 'جدول عناصر',
              blocks: [
                {
                  type: 'table',
                  title: 'العناصر الضرورية ودورها',
                  columns: [
                    { id: 'stage', label: 'المرحلة' },
                    { id: 'element', label: 'عنصر ضروري' },
                    { id: 'role', label: 'دوره' },
                  ],
                  rows: [
                    {
                      id: 'transcription',
                      cells: {
                        stage: 'الاستنساخ',
                        element: 'ADN + نكليوتيدات ريبية',
                        role: 'تشكيل ARNm وفق ترتيب المورثة',
                      },
                    },
                    {
                      id: 'translation',
                      cells: {
                        stage: 'الترجمة',
                        element: 'ARNm + ريبوزومات + ARNt',
                        role: 'تحويل الرامزات إلى أحماض أمينية',
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'doc-amino-count',
              title: 'الوثيقة 3: قراءة عدد الرامزات',
              kind: 'text',
              sourceLabel: 'معطى حسابي',
              blocks: [
                {
                  type: 'text',
                  body: 'إذا كان ARNm يحتوي 327 نكليوتيدة، وتوجد رامزة بداية ورامزة توقف، فإن عدد الأحماض الأمينية في السلسلة الوظيفية يحسب من الرامزات المترجمة فقط.',
                },
              ],
            },
          ],
          evidenceItems: [
            {
              id: 'dna-carries-message',
              documentId: 'doc-synthesis-diagram',
              label: 'ADN يحمل المعلومة الوراثية في ترتيب نكليوتيداته.',
              detail: 'هذه بداية سلسلة البرهان من المورثة.',
              keywords: ['ADN', 'معلومة وراثية'],
            },
            {
              id: 'mrna-working-copy',
              documentId: 'doc-synthesis-elements',
              label: 'ARNm نسخة عمل تنقل ترتيب المورثة إلى الهيولى.',
              detail: 'الاستنساخ يحافظ على ترتيب الرامزات.',
              keywords: ['ARNm', 'استنساخ'],
            },
            {
              id: 'ribosome-translates',
              documentId: 'doc-synthesis-elements',
              label: 'الريبوزوم يترجم رامزات ARNm إلى أحماض أمينية.',
              detail: 'هذه خطوة تحويل الرسالة إلى سلسلة بروتينية.',
              keywords: ['ترجمة', 'أحماض أمينية'],
            },
            {
              id: 'amino-order-shapes-protein',
              documentId: 'doc-amino-count',
              label: 'عدد وترتيب الأحماض الأمينية يحددان بنية البروتين.',
              detail: 'البنية الفراغية تظهر من السلسلة البيبتيدية الناتجة.',
              keywords: ['بنية فراغية', 'سلسلة'],
            },
          ],
          prompt: {
            title: 'اكتب نصا علميا يبين كيف يتحكم ADN في بنية البروتين.',
            task: 'اختر الأدلة التي تبني سلسلة ADN إلى ARNm إلى أحماض أمينية، ثم اكتب خلاصة تربط ترتيب المعلومة بالبنية الفراغية.',
            requiredEvidenceIds: [
              'dna-carries-message',
              'mrna-working-copy',
              'ribosome-translates',
              'amino-order-shapes-protein',
            ],
            requiredConclusionKeywords: [
              'ADN',
              'ARNm',
              'ترجمة',
              'أحماض',
              'بنية',
            ],
            scaffoldPhrases: [
              'يحمل ADN المعلومة الوراثية في ترتيب النيكليوتيدات.',
              'ينقل ARNm نسخة من هذه المعلومة إلى الهيولى.',
              'تترجم الريبوزومات الرامزات إلى أحماض أمينية تحدد بنية البروتين.',
            ],
          },
        },
        exitCheck: {
          kind: 'DOCUMENT_EVIDENCE',
          requiredEvidenceIds: [
            'dna-carries-message',
            'mrna-working-copy',
            'ribosome-translates',
            'amino-order-shapes-protein',
          ],
          requiredConclusionKeywords: [
            'ADN',
            'ARNm',
            'ترجمة',
            'أحماض',
            'بنية',
          ],
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'svt-experimental-graph-table',
    subjectCode: 'NATURAL_SCIENCES',
    title: 'ورشة المنحنيات والجداول التجريبية',
    description: 'تجارب، جداول، منحنيات، واستنتاج علمي.',
    status: 'READY',
    metadata: {
      subjectSlug: 'svt',
      route: '/student/lab/svt/experimental-graph-table',
      registryToolId: 'svt-experimental-graph-table',
      engineKinds: ['graph', 'table', 'document-reasoning'],
    },
    missions: [
      {
        code: 'SVT_EXP_GLUCOBAY_ENZYME_ACTIVITY',
        title: 'حلل تأثير Glucobay على نشاط الإنزيم',
        goal: 'اقرأ القيمتين عند 25 mmol، قارن المنحنيين، ثم اكتب استنتاجا يفسر أثر الدواء على نسبة الغلوكوز.',
        curriculumNodeCode: 'ENZYMES',
        learningTargetCode: 'DOCUMENT_ANALYSIS',
        preset: SVT_EXPERIMENTAL_GRAPH_TABLE_PRESETS[0],
        exitCheck: {
          kind: 'SVT_EXPERIMENTAL_GRAPH_TABLE',
          expectedReadings:
            SVT_EXPERIMENTAL_GRAPH_TABLE_PRESETS[0].expectedReadings,
          requiredObservationIds:
            SVT_EXPERIMENTAL_GRAPH_TABLE_PRESETS[0].prompt
              .requiredObservationIds,
          requiredConclusionKeywords:
            SVT_EXPERIMENTAL_GRAPH_TABLE_PRESETS[0].prompt
              .requiredConclusionKeywords,
        },
        orderIndex: 1,
      },
      {
        code: 'SVT_EXP_ENZYME_PH_OPTIMUM',
        title: 'حدد pH الأمثل لنشاط إنزيمي',
        goal: 'استخرج pH الأمثل من الجدول والمنحنى، ثم فسر لماذا ينخفض النشاط خارج هذا الوسط.',
        curriculumNodeCode: 'ENZYMES',
        learningTargetCode: 'PROTEIN_FUNCTION_REASONING',
        preset: SVT_EXPERIMENTAL_GRAPH_TABLE_PRESETS[1],
        exitCheck: {
          kind: 'SVT_EXPERIMENTAL_GRAPH_TABLE',
          expectedReadings:
            SVT_EXPERIMENTAL_GRAPH_TABLE_PRESETS[1].expectedReadings,
          requiredObservationIds:
            SVT_EXPERIMENTAL_GRAPH_TABLE_PRESETS[1].prompt
              .requiredObservationIds,
          requiredConclusionKeywords:
            SVT_EXPERIMENTAL_GRAPH_TABLE_PRESETS[1].prompt
              .requiredConclusionKeywords,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'svt-diagram-labeling-workbench',
    subjectCode: 'NATURAL_SCIENCES',
    title: 'ورشة تسمية الرسوم الحيوية',
    description: 'مواقع فعالة، عضيات، وبنيات حيوية.',
    status: 'READY',
    metadata: {
      subjectSlug: 'svt',
      route: '/student/lab/svt/diagram-labeling-workbench',
      registryToolId: 'svt-diagram-labeling-workbench',
      engineKinds: ['diagram-labeling', 'document-reasoning'],
    },
    missions: [
      {
        code: 'SVT_DIAGRAM_ENZYME_ACTIVE_SITE',
        title: 'سمّ موقعا فعالا واربطه بوظيفة الإنزيم',
        goal: 'أدخل تسميات الرسم ثم اكتب خلاصة عن التكامل بين الموقع الفعال والركيزة.',
        curriculumNodeCode: 'PROTEIN_SYNTHESIS',
        learningTargetCode: 'PROTEIN_FUNCTION_REASONING',
        preset: SVT_DIAGRAM_LABELING_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'DIAGRAM_LABELS',
          targets: SVT_DIAGRAM_LABELING_WORKBENCH_PRESETS[0].diagram.targets,
        },
        orderIndex: 1,
      },
      {
        code: 'SVT_DIAGRAM_CHLOROPLAST_STRUCTURE',
        title: 'سمّ بلاستيدة خضراء واربط البنية بالتركيب الضوئي',
        goal: 'حدد التيلاكويد والغرانا والستروما ثم اربط البنية بمكان حدوث التفاعلات.',
        curriculumNodeCode: 'PHOTOSYNTHESIS',
        learningTargetCode: 'BIOLOGICAL_DATA_INTERPRETATION',
        preset: SVT_DIAGRAM_LABELING_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'DIAGRAM_LABELS',
          targets: SVT_DIAGRAM_LABELING_WORKBENCH_PRESETS[1].diagram.targets,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'svt-energy-metabolism-workbench',
    subjectCode: 'NATURAL_SCIENCES',
    title: 'ورشة الطاقة الخلوية',
    description: 'تركيب ضوئي، تنفس، تخمر، وATP.',
    status: 'READY',
    metadata: {
      subjectSlug: 'svt',
      route: '/student/lab/svt/energy-metabolism-workbench',
      registryToolId: 'svt-energy-metabolism-workbench',
      engineKinds: ['graph', 'table', 'document-reasoning', 'formula-unit'],
    },
    missions: [
      {
        code: 'SVT_ENERGY_PHOTOSYNTHESIS_OXYGEN',
        title: 'حلل انطلاق O₂ حسب شدة الإضاءة',
        goal: 'اقرأ القيم من المنحنى ثم استنتج دور الضوء وحدود التشبع.',
        curriculumNodeCode: 'PHOTOSYNTHESIS',
        learningTargetCode: 'BIOLOGICAL_DATA_INTERPRETATION',
        preset: SVT_ENERGY_METABOLISM_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            SVT_ENERGY_METABOLISM_WORKBENCH_PRESETS[0].expectedMeasurements,
        },
        orderIndex: 1,
      },
      {
        code: 'SVT_ENERGY_RESPIRATION_FERMENTATION_ATP',
        title: 'قارن مردود ATP بين التنفس والتخمر',
        goal: 'أكمل جدول المقارنة ثم اربط وجود O₂ بالمردود الطاقوي.',
        curriculumNodeCode: 'RESPIRATION_FERMENTATION',
        learningTargetCode: 'BIOLOGICAL_DATA_INTERPRETATION',
        preset: SVT_ENERGY_METABOLISM_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells:
            SVT_ENERGY_METABOLISM_WORKBENCH_PRESETS[1].expectedCells,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'svt-nervous-immune-response-workbench',
    subjectCode: 'NATURAL_SCIENCES',
    title: 'ورشة الاستجابة العصبية والمناعية',
    description: 'منعكسات، مشابك، خلايا مناعية، وأجسام مضادة.',
    status: 'READY',
    metadata: {
      subjectSlug: 'svt',
      route: '/student/lab/svt/nervous-immune-response-workbench',
      registryToolId: 'svt-nervous-immune-response-workbench',
      engineKinds: ['diagram-labeling', 'document-reasoning'],
    },
    missions: [
      {
        code: 'SVT_RESPONSE_REFLEX_ARC',
        title: 'سمّ قوسا انعكاسية وفسر اتجاه السيالة',
        goal: 'حدد عناصر المسار العصبي ثم اربطها باتجاه السيالة والاستجابة.',
        curriculumNodeCode: 'NERVOUS_COMMUNICATION',
        learningTargetCode: 'DOCUMENT_ANALYSIS',
        preset: SVT_NERVOUS_IMMUNE_RESPONSE_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'DIAGRAM_LABELS',
          targets:
            SVT_NERVOUS_IMMUNE_RESPONSE_WORKBENCH_PRESETS[0].diagram.targets,
        },
        orderIndex: 1,
      },
      {
        code: 'SVT_RESPONSE_HUMORAL_IMMUNITY',
        title: 'رتب سلسلة الاستجابة المناعية الخلطية',
        goal: 'سمّ مولد الضد والخلايا اللمفاوية ثم اربطها بإنتاج الأجسام المضادة.',
        curriculumNodeCode: 'IMMUNITY',
        learningTargetCode: 'IMMUNITY_REASONING',
        preset: SVT_NERVOUS_IMMUNE_RESPONSE_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'DIAGRAM_LABELS',
          targets:
            SVT_NERVOUS_IMMUNE_RESPONSE_WORKBENCH_PRESETS[1].diagram.targets,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'svt-tectonics-workbench',
    subjectCode: 'NATURAL_SCIENCES',
    title: 'ورشة التكتونية',
    description: 'خرائط، مقاطع، زلازل، وحركة صفائح.',
    status: 'READY',
    metadata: {
      subjectSlug: 'svt',
      route: '/student/lab/svt/tectonics-workbench',
      registryToolId: 'svt-tectonics-workbench',
      engineKinds: ['diagram-labeling', 'table', 'formula-unit'],
    },
    missions: [
      {
        code: 'SVT_TECTONICS_SUBDUCTION_SECTION',
        title: 'فسر مقطع اندساس من بؤر زلزالية',
        goal: 'سمّ عناصر المقطع ثم استنتج حركة الاندساس من مستوى بنيوف والخندق.',
        curriculumNodeCode: 'TECTONIC_INTERPRETATION',
        learningTargetCode: 'GEOLOGICAL_INTERPRETATION',
        preset: SVT_TECTONICS_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'DIAGRAM_LABELS',
          targets: SVT_TECTONICS_WORKBENCH_PRESETS[0].diagram.targets,
        },
        orderIndex: 1,
      },
      {
        code: 'SVT_TECTONICS_RIDGE_SPREADING_RATE',
        title: 'احسب سرعة اتساع عند ذروة محيطية',
        goal: 'استعمل المسافة والعمر لحساب سرعة الاتساع واستنتاج التباعد.',
        curriculumNodeCode: 'PLATE_ACTIVITY',
        learningTargetCode: 'GEOLOGICAL_INTERPRETATION',
        preset: SVT_TECTONICS_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            SVT_TECTONICS_WORKBENCH_PRESETS[1].expectedMeasurements,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'physics-experiment-graphs',
    subjectCode: 'PHYSICS',
    title: 'منحنيات التجربة',
    description: 'ميل، ثابت زمني، وحدات، واستنتاج تجريبي.',
    status: 'READY',
    metadata: {
      subjectSlug: 'physics',
      route: '/student/lab/physics/experiment-graphs',
      registryToolId: 'physics-experiment-graphs',
      engineKinds: ['graph', 'table', 'formula-unit', 'document-reasoning'],
    },
    missions: [
      {
        code: 'PHYSICS_GRAPH_RC_TIME_CONSTANT',
        title: 'استخرج ثابت الزمن من منحنى RC',
        goal: 'اقرأ القيمة النهائية و0.63E من منحنى الشحن ثم استنتج ثابت الزمن τ.',
        curriculumNodeCode: 'RC_RL_CIRCUITS',
        learningTargetCode: 'CIRCUIT_TRANSIENT_ANALYSIS',
        preset: PHYSICS_EXPERIMENT_GRAPH_PRESETS[0],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: PHYSICS_EXPERIMENT_GRAPH_PRESETS[0].expectedCells,
        },
        orderIndex: 1,
      },
      {
        code: 'PHYSICS_GRAPH_VELOCITY_SLOPE',
        title: 'اقرأ التسارع من منحنى السرعة',
        goal: 'استعمل v(t) لاستخراج السرعة الابتدائية والميل ثم حدد طبيعة الحركة.',
        curriculumNodeCode: 'MECHANICS',
        learningTargetCode: 'MECHANICS_REASONING',
        preset: PHYSICS_EXPERIMENT_GRAPH_PRESETS[1],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: PHYSICS_EXPERIMENT_GRAPH_PRESETS[1].expectedCells,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'physics-circuits-workbench',
    subjectCode: 'PHYSICS',
    title: 'ورشة الدارات الكهربائية',
    description: 'RC/RL، مخططات، ثابت الزمن، ووحدات.',
    status: 'READY',
    metadata: {
      subjectSlug: 'physics',
      route: '/student/lab/physics/circuits-workbench',
      registryToolId: 'physics-circuits-workbench',
      engineKinds: ['diagram-labeling', 'table', 'formula-unit'],
    },
    missions: [
      {
        code: 'PHYSICS_CIRCUITS_RC_CAPACITANCE',
        title: 'احسب سعة مكثفة من τ في دارة RC',
        goal: 'سمّ عناصر دارة RC، حوّل ثابت الزمن، ثم احسب سعة المكثفة بوحدة صحيحة.',
        curriculumNodeCode: 'RC_RL_CIRCUITS',
        learningTargetCode: 'CIRCUIT_TRANSIENT_ANALYSIS',
        preset: PHYSICS_CIRCUITS_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            PHYSICS_CIRCUITS_WORKBENCH_PRESETS[0].expectedMeasurements,
        },
        orderIndex: 1,
      },
      {
        code: 'PHYSICS_CIRCUITS_RL_INDUCTANCE',
        title: 'استخرج معامل تحريض وشيعة من τ في دارة RL',
        goal: 'حدد عناصر دارة RL، استعمل العلاقة τ=L/R، ثم اكتب L بوحدة الهنري.',
        curriculumNodeCode: 'RC_RL_CIRCUITS',
        learningTargetCode: 'CIRCUIT_TRANSIENT_ANALYSIS',
        preset: PHYSICS_CIRCUITS_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            PHYSICS_CIRCUITS_WORKBENCH_PRESETS[1].expectedMeasurements,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'physics-mechanics-workbench',
    subjectCode: 'PHYSICS',
    title: 'ورشة الميكانيك',
    description: 'قوى، حركة، ميل منحنى، واهتزازات.',
    status: 'READY',
    metadata: {
      subjectSlug: 'physics',
      route: '/student/lab/physics/mechanics-workbench',
      registryToolId: 'physics-mechanics-workbench',
      engineKinds: ['diagram-labeling', 'graph', 'table', 'formula-unit'],
    },
    missions: [
      {
        code: 'PHYSICS_MECHANICS_NEWTON_RESULTANT',
        title: 'استخرج محصلة القوى من منحنى السرعة',
        goal: 'سمّ قوى جسم على مستوى مائل، اقرأ التسارع من v(t)، ثم طبق ΣF=m.a.',
        curriculumNodeCode: 'MECHANICS',
        learningTargetCode: 'MECHANICS_REASONING',
        preset: PHYSICS_MECHANICS_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            PHYSICS_MECHANICS_WORKBENCH_PRESETS[0].expectedMeasurements,
        },
        orderIndex: 1,
      },
      {
        code: 'PHYSICS_MECHANICS_SPRING_STIFFNESS',
        title: 'احسب صلابة نابض من دور الاهتزاز',
        goal: 'اقرأ الدور من x(t)، استعمل علاقة النواس المرن، ثم احسب k بوحدة N/m.',
        curriculumNodeCode: 'MECHANICS',
        learningTargetCode: 'MECHANICS_REASONING',
        preset: PHYSICS_MECHANICS_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            PHYSICS_MECHANICS_WORKBENCH_PRESETS[1].expectedMeasurements,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'physics-chemistry-reaction-workbench',
    subjectCode: 'PHYSICS',
    title: 'ورشة الكيمياء والتفاعلات',
    description: 'معايرة، جداول تقدم، منحنيات، وتركيز.',
    status: 'READY',
    metadata: {
      subjectSlug: 'physics',
      route: '/student/lab/physics/chemistry-reaction-workbench',
      registryToolId: 'physics-chemistry-reaction-workbench',
      engineKinds: ['diagram-labeling', 'graph', 'table', 'formula-unit'],
    },
    missions: [
      {
        code: 'PHYSICS_CHEMISTRY_TITRATION_CONCENTRATION',
        title: 'احسب تركيز حمض من منحنى معايرة',
        goal: 'اقرأ حجم التكافؤ من منحنى pH، ثم استعمل علاقة التكافؤ لحساب CA.',
        curriculumNodeCode: 'CHEMICAL_TRANSFORMATIONS',
        learningTargetCode: 'CHEMICAL_TRANSFORMATION_REASONING',
        preset: PHYSICS_CHEMISTRY_REACTION_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            PHYSICS_CHEMISTRY_REACTION_WORKBENCH_PRESETS[0]
              .expectedMeasurements,
        },
        orderIndex: 1,
      },
      {
        code: 'PHYSICS_CHEMISTRY_ADVANCEMENT_LIMITING_REAGENT',
        title: 'أكمل جدول تقدم وحدد المتفاعل المحد',
        goal: 'استعمل معاملات المعادلة لتحديد xmax والمتفاعل المحد وكمية H₂.',
        curriculumNodeCode: 'CHEMICAL_TRANSFORMATIONS',
        learningTargetCode: 'CHEMICAL_TRANSFORMATION_REASONING',
        preset: PHYSICS_CHEMISTRY_REACTION_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            PHYSICS_CHEMISTRY_REACTION_WORKBENCH_PRESETS[1]
              .expectedMeasurements,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-civil-beam-statics',
    subjectCode: 'TECHNOLOGY_CIVIL',
    title: 'تحليل الجوائز',
    description: 'ردود أفعال، مخططات قوى، وجداول مقاطع.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-civil',
      route: '/student/lab/technology-civil/beam-statics',
      registryToolId: 'technology-civil-beam-statics',
      engineKinds: ['diagram-labeling', 'graph', 'table', 'formula-unit'],
    },
    missions: [
      {
        code: 'CIVIL_BEAM_SIMPLE_REACTIONS',
        title: 'احسب ردود الأفعال لجائزة بسيطة',
        goal: 'سمّ المساند والحمل ثم استعمل التوازن لحساب RA وRB.',
        curriculumNodeCode: 'STRENGTH_OF_MATERIALS',
        preset: CIVIL_BEAM_STATICS_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            CIVIL_BEAM_STATICS_WORKBENCH_PRESETS[0].expectedMeasurements,
        },
        orderIndex: 1,
      },
      {
        code: 'CIVIL_BEAM_CANTILEVER_BENDING',
        title: 'استخرج القص والعزم الأعظميين في كابولي',
        goal: 'اقرأ الحمل الموزع ثم احسب Vmax وMmax عند التثبيت.',
        curriculumNodeCode: 'SIMPLE_BENDING',
        preset: CIVIL_BEAM_STATICS_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            CIVIL_BEAM_STATICS_WORKBENCH_PRESETS[1].expectedMeasurements,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-civil-structures-materials',
    subjectCode: 'TECHNOLOGY_CIVIL',
    title: 'ورشة المنشآت والمواد',
    description: 'مقاطع، خرسانة مسلحة، فولاذ، وإجهادات.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-civil',
      route: '/student/lab/technology-civil/structures-materials',
      registryToolId: 'technology-civil-structures-materials',
      engineKinds: ['diagram-labeling', 'table', 'formula-unit'],
    },
    missions: [
      {
        code: 'CIVIL_STRUCTURES_REINFORCED_CONCRETE_STEEL',
        title: 'احسب مساحة تسليح الشد',
        goal: 'اقرأ مقطع خرسانة مسلحة وجدول القضبان ثم احسب As.',
        curriculumNodeCode: 'REINFORCED_CONCRETE',
        preset: CIVIL_STRUCTURES_MATERIALS_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            CIVIL_STRUCTURES_MATERIALS_WORKBENCH_PRESETS[0]
              .expectedMeasurements,
        },
        orderIndex: 1,
      },
      {
        code: 'CIVIL_STRUCTURES_MATERIAL_STRESS_CHECK',
        title: 'تحقق إجهاد مادة من قوة ومقطع',
        goal: 'حوّل أبعاد المقطع، احسب σ=N/A، ثم قارنها بالإجهاد المسموح.',
        curriculumNodeCode: 'APPLIED_MECHANICS_TESTS',
        preset: CIVIL_STRUCTURES_MATERIALS_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            CIVIL_STRUCTURES_MATERIALS_WORKBENCH_PRESETS[1]
              .expectedMeasurements,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-civil-technical-sheet',
    subjectCode: 'TECHNOLOGY_CIVIL',
    title: 'ورشة البطاقة التقنية المدنية',
    description: 'مخططات، كميات، مراحل إنجاز، وملف إجابة.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-civil',
      route: '/student/lab/technology-civil/technical-sheet',
      registryToolId: 'technology-civil-technical-sheet',
      engineKinds: [
        'diagram-labeling',
        'table',
        'formula-unit',
        'technical-workbench',
      ],
    },
    missions: [
      {
        code: 'CIVIL_TECH_SHEET_FOUNDATION_QUANTITY',
        title: 'احسب كمية خرسانة من بطاقة تقنية',
        goal: 'استخرج أبعاد أساس شريطي ثم احسب حجم الخرسانة المطلوب.',
        curriculumNodeCode: 'BUILDING_STRUCTURE',
        preset: CIVIL_TECHNICAL_SHEET_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            CIVIL_TECHNICAL_SHEET_WORKBENCH_PRESETS[0].expectedMeasurements,
        },
        orderIndex: 1,
      },
      {
        code: 'CIVIL_TECH_SHEET_CONSTRUCTION_SEQUENCE',
        title: 'رتب مراحل إنجاز أساس في ملف الإجابة',
        goal: 'أكمل جدول العمليات من التوقيع إلى الصب حسب منطق الإنجاز.',
        curriculumNodeCode: 'BUILDING_STRUCTURE',
        preset: CIVIL_TECHNICAL_SHEET_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells:
            CIVIL_TECHNICAL_SHEET_WORKBENCH_PRESETS[1].expectedCells,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-electrical-control-logic',
    subjectCode: 'TECHNOLOGY_ELECTRICAL',
    title: 'التحكم والمنطق',
    description: 'GRAFCET، جداول صدق، خرائط Karnaugh، وكرونوغرام.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-electrical',
      route: '/student/lab/technology-electrical/control-logic',
      registryToolId: 'technology-electrical-control-logic',
      engineKinds: ['table', 'diagram-labeling', 'technical-workbench'],
    },
    missions: [
      {
        code: 'ELECTRICAL_LOGIC_MOTOR_SAFETY_TABLE',
        title: 'أكمل جدول صدق تشغيل محرك بشرط أمان',
        goal: 'استعمل العلاقة KM=M.S لإكمال جدول الصدق وتفسير شرط الأمان.',
        curriculumNodeCode: 'SEQUENTIAL_LOGIC',
        preset: ELECTRICAL_CONTROL_LOGIC_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells:
            ELECTRICAL_CONTROL_LOGIC_WORKBENCH_PRESETS[0].expectedCells,
        },
        orderIndex: 1,
      },
      {
        code: 'ELECTRICAL_GRAFCET_CYLINDER_SEQUENCE',
        title: 'أكمل GRAFCET أسطوانة دفع ورجوع',
        goal: 'املأ أفعال الخطوات وشروط الانتقال حسب تسلسل dcy ثم A+ ثم A-.',
        curriculumNodeCode: 'AUTOMATION_GRAFCET_GEMMA',
        preset: ELECTRICAL_CONTROL_LOGIC_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells:
            ELECTRICAL_CONTROL_LOGIC_WORKBENCH_PRESETS[1].expectedCells,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-electrical-circuits-chronograms',
    subjectCode: 'TECHNOLOGY_ELECTRICAL',
    title: 'ورشة الدارات والكرونوغرامات',
    description: 'مرحلات، تلامسات، مؤقتات، وإشارات زمنية.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-electrical',
      route: '/student/lab/technology-electrical/circuits-chronograms',
      registryToolId: 'technology-electrical-circuits-chronograms',
      engineKinds: [
        'diagram-labeling',
        'table',
        'graph',
        'technical-workbench',
      ],
    },
    missions: [
      {
        code: 'ELECTRICAL_CIRCUITS_RELAY_STATE_READING',
        title: 'اقرأ دارة مرحل واستنتج حالات الخرج',
        goal: 'سمّ عناصر الدارة ثم أكمل حالات KA وH حسب حالة S.',
        curriculumNodeCode: 'ELECTRICAL_MACHINES_ACTUATORS',
        preset: ELECTRICAL_CIRCUITS_CHRONOGRAMS_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells:
            ELECTRICAL_CIRCUITS_CHRONOGRAMS_WORKBENCH_PRESETS[0]
              .expectedCells,
        },
        orderIndex: 1,
      },
      {
        code: 'ELECTRICAL_CHRONOGRAM_TON_OUTPUT',
        title: 'أكمل كرونوغرام خرج مؤقت TON',
        goal: 'اقرأ دخل المؤقت وزمن الضبط ثم أكمل Q في المجالات الزمنية.',
        curriculumNodeCode: 'AUTOMATION_GRAFCET_GEMMA',
        preset: ELECTRICAL_CIRCUITS_CHRONOGRAMS_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells:
            ELECTRICAL_CIRCUITS_CHRONOGRAMS_WORKBENCH_PRESETS[1]
              .expectedCells,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-electrical-technical-file',
    subjectCode: 'TECHNOLOGY_ELECTRICAL',
    title: 'ورشة الملف التقني الكهربائي',
    description: 'مكونات، بطاقات محرك، حماية، وملف إجابة.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-electrical',
      route: '/student/lab/technology-electrical/technical-file',
      registryToolId: 'technology-electrical-technical-file',
      engineKinds: [
        'diagram-labeling',
        'table',
        'formula-unit',
        'technical-workbench',
      ],
    },
    missions: [
      {
        code: 'ELECTRICAL_TECH_FILE_COMPONENT_IDENTIFICATION',
        title: 'عرّف مكونات ملف مشغل محرك',
        goal: 'سمّ QF وKM وRT وM ثم أكمل جدول وظيفة كل عنصر.',
        curriculumNodeCode: 'ELECTRICAL_MACHINES_ACTUATORS',
        preset: ELECTRICAL_TECHNICAL_FILE_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells:
            ELECTRICAL_TECHNICAL_FILE_WORKBENCH_PRESETS[0].expectedCells,
        },
        orderIndex: 1,
      },
      {
        code: 'ELECTRICAL_TECH_FILE_MOTOR_CURRENT_PROTECTION',
        title: 'احسب تيار محرك واختر عيار الحماية',
        goal: 'استغل بطاقة المحرك لحساب I ثم اختر عيار حماية أعلى مباشرة.',
        curriculumNodeCode: 'ELECTRICAL_MACHINES_ACTUATORS',
        preset: ELECTRICAL_TECHNICAL_FILE_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            ELECTRICAL_TECHNICAL_FILE_WORKBENCH_PRESETS[1]
              .expectedMeasurements,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-mechanical-drawing-workbench',
    subjectCode: 'TECHNOLOGY_MECHANICAL',
    title: 'ورشة الرسم الميكانيكي',
    description: 'رسم تجميعي، مدونة قطع، مقاطع، سماحات، وخشونة.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-mechanical',
      route: '/student/lab/technology-mechanical/drawing-workbench',
      registryToolId: 'technology-mechanical-drawing-workbench',
      engineKinds: ['diagram-labeling', 'table', 'document-reasoning'],
    },
    missions: [
      {
        code: 'MECHANICAL_DRAWING_ASSEMBLY_NOMENCLATURE',
        title: 'اقرأ رسم تجميعي ومدونة قطع',
        goal: 'اربط أرقام القطع بالتعيين والمادة ثم اشرح دور المدونة.',
        curriculumNodeCode: 'FUNCTIONAL_ANALYSIS',
        preset: MECHANICAL_DRAWING_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: MECHANICAL_DRAWING_WORKBENCH_PRESETS[0].expectedCells,
        },
        orderIndex: 1,
      },
      {
        code: 'MECHANICAL_DRAWING_SECTION_TOLERANCES',
        title: 'أتمم قراءة رسم تعريفي ومقطع',
        goal: 'حدد القطر الوظيفي والسماحة والخشونة والمقطع A-A.',
        curriculumNodeCode: 'MANUFACTURING_PREPARATION',
        preset: MECHANICAL_DRAWING_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: MECHANICAL_DRAWING_WORKBENCH_PRESETS[1].expectedCells,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-mechanical-mechanism-kinematics',
    subjectCode: 'TECHNOLOGY_MECHANICAL',
    title: 'ورشة الآليات والحركيات',
    description: 'نسب نقل، تروس، تحويل حركة، وسرعات/إزاحات.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-mechanical',
      route: '/student/lab/technology-mechanical/mechanism-kinematics',
      registryToolId: 'technology-mechanical-mechanism-kinematics',
      engineKinds: [
        'diagram-labeling',
        'table',
        'formula-unit',
        'technical-workbench',
      ],
    },
    missions: [
      {
        code: 'MECHANICAL_KINEMATICS_GEAR_REDUCER_SPEED',
        title: 'احسب سرعة خرج مخفض تروس',
        goal: 'حدد القائد والمقاد ثم احسب n2 ونسبة التخفيض.',
        curriculumNodeCode: 'MOTION_TRANSMISSION_CONVERSION',
        preset: MECHANICAL_MECHANISM_KINEMATICS_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            MECHANICAL_MECHANISM_KINEMATICS_WORKBENCH_PRESETS[0]
              .expectedMeasurements,
        },
        orderIndex: 1,
      },
      {
        code: 'MECHANICAL_KINEMATICS_RACK_PINION_DISPLACEMENT',
        title: 'احسب إزاحة جريدة مسننة',
        goal: 'ميز تحويل الدوران إلى انتقال ثم احسب إزاحة الجريدة.',
        curriculumNodeCode: 'MOTION_TRANSMISSION_CONVERSION',
        preset: MECHANICAL_MECHANISM_KINEMATICS_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            MECHANICAL_MECHANISM_KINEMATICS_WORKBENCH_PRESETS[1]
              .expectedMeasurements,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-mechanical-manufacturing-tolerances',
    subjectCode: 'TECHNOLOGY_MECHANICAL',
    title: 'ورشة التصنيع والتسامحات',
    description: 'تحضير تصنيع، عمليات، أدوات مراقبة، وتساميحات/تلاؤم.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-mechanical',
      route: '/student/lab/technology-mechanical/manufacturing-tolerances',
      registryToolId: 'technology-mechanical-manufacturing-tolerances',
      engineKinds: ['table', 'formula-unit', 'document-reasoning'],
    },
    missions: [
      {
        code: 'MECHANICAL_MANUFACTURING_SHAFT_PROCESS_SHEET',
        title: 'أكمل ورقة تحضير تصنيع محور',
        goal: 'رتب العمليات واختر الآلة والأداة والمراقبة المناسبة.',
        curriculumNodeCode: 'MANUFACTURING_PREPARATION',
        preset: MECHANICAL_MANUFACTURING_TOLERANCES_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells:
            MECHANICAL_MANUFACTURING_TOLERANCES_WORKBENCH_PRESETS[0]
              .expectedCells,
        },
        orderIndex: 1,
      },
      {
        code: 'MECHANICAL_TOLERANCE_CLEARANCE_FIT',
        title: 'احسب خلوص ملاءمة H7/g6',
        goal: 'استعمل حدود الثقب والعمود لحساب Jmin وJmax ونوع الملاءمة.',
        curriculumNodeCode: 'MANUFACTURING_PREPARATION',
        preset: MECHANICAL_MANUFACTURING_TOLERANCES_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            MECHANICAL_MANUFACTURING_TOLERANCES_WORKBENCH_PRESETS[1]
              .expectedMeasurements,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-process-reaction-workbench',
    subjectCode: 'TECHNOLOGY_PROCESS',
    title: 'ورشة مخططات التفاعل',
    description: 'أسترة، بلمرة، عائلات عضوية، شروط، ونواتج.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-process',
      route: '/student/lab/technology-process/reaction-workbench',
      registryToolId: 'technology-process-reaction-workbench',
      engineKinds: ['diagram-labeling', 'table', 'document-reasoning'],
    },
    missions: [
      {
        code: 'PROCESS_REACTION_ESTERIFICATION_SCHEME',
        title: 'حلل مخطط أسترة',
        goal: 'حدد عائلات المتفاعلات والنواتج والوسيط الحمضي.',
        curriculumNodeCode: 'OXYGENATED_FUNCTIONS',
        preset: PROCESS_REACTION_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: PROCESS_REACTION_WORKBENCH_PRESETS[0].expectedCells,
        },
        orderIndex: 1,
      },
      {
        code: 'PROCESS_REACTION_POLYESTER_CONDENSATION',
        title: 'اقرأ مخطط بلمرة بولي إستر',
        goal: 'حدد المونوميرات ونوع البلمرة والناتج الثانوي.',
        curriculumNodeCode: 'POLYMERS',
        preset: PROCESS_REACTION_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells: PROCESS_REACTION_WORKBENCH_PRESETS[1].expectedCells,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-process-material-balance-advancement',
    subjectCode: 'TECHNOLOGY_PROCESS',
    title: 'ورشة الموازنة والتقدم',
    description: 'مردود، كتل، جداول تقدم، ومتفاعل محد.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-process',
      route: '/student/lab/technology-process/material-balance-advancement',
      registryToolId: 'technology-process-material-balance-advancement',
      engineKinds: ['table', 'formula-unit', 'document-reasoning'],
    },
    missions: [
      {
        code: 'PROCESS_BALANCE_ESTER_YIELD_MASS',
        title: 'احسب كمية وكتلة إستر من المردود',
        goal: 'استعمل R=60% وn0=0.5 mol لحساب كمية وكتلة الإستر.',
        curriculumNodeCode: 'OXYGENATED_FUNCTIONS',
        preset: PROCESS_MATERIAL_BALANCE_ADVANCEMENT_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            PROCESS_MATERIAL_BALANCE_ADVANCEMENT_WORKBENCH_PRESETS[0]
              .expectedMeasurements,
        },
        orderIndex: 1,
      },
      {
        code: 'PROCESS_ADVANCEMENT_LIMITING_REAGENT',
        title: 'أكمل جدول تقدم وحدد المتفاعل المحد',
        goal: 'املأ الكميات النهائية وحدد H2 كمتفاعل محد.',
        curriculumNodeCode: 'CHEMICAL_KINETICS',
        preset: PROCESS_MATERIAL_BALANCE_ADVANCEMENT_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'FORMULA_VALUE',
          expectedMeasurements:
            PROCESS_MATERIAL_BALANCE_ADVANCEMENT_WORKBENCH_PRESETS[1]
              .expectedMeasurements,
        },
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'technology-process-flow-instrumentation',
    subjectCode: 'TECHNOLOGY_PROCESS',
    title: 'ورشة الجريان والقياس',
    description: 'PFD، تجهيزات، تيارات، رموز قياس، وتحكم.',
    status: 'READY',
    metadata: {
      subjectSlug: 'technology-process',
      route: '/student/lab/technology-process/flow-instrumentation',
      registryToolId: 'technology-process-flow-instrumentation',
      engineKinds: ['diagram-labeling', 'table', 'document-reasoning'],
    },
    missions: [
      {
        code: 'PROCESS_FLOW_DISTILLATION_DIAGRAM',
        title: 'اقرأ مخطط جريان تقطير',
        goal: 'سمّ العمود والمكثف والغلاية وتيار التغذية.',
        curriculumNodeCode: 'THERMODYNAMICS',
        preset: PROCESS_FLOW_INSTRUMENTATION_WORKBENCH_PRESETS[0],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells:
            PROCESS_FLOW_INSTRUMENTATION_WORKBENCH_PRESETS[0].expectedCells,
        },
        orderIndex: 1,
      },
      {
        code: 'PROCESS_INSTRUMENTATION_REACTOR_LOOP',
        title: 'حلل حلقة تحكم في مفاعل',
        goal: 'اربط TT وTIC وTV بمتغير الحرارة وماء التبريد.',
        curriculumNodeCode: 'CHEMICAL_KINETICS',
        preset: PROCESS_FLOW_INSTRUMENTATION_WORKBENCH_PRESETS[1],
        exitCheck: {
          kind: 'TABLE_CELLS',
          expectedCells:
            PROCESS_FLOW_INSTRUMENTATION_WORKBENCH_PRESETS[1].expectedCells,
        },
        orderIndex: 2,
      },
    ],
  },
];

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

function resolveSubjectStreamCodes(subjectCode: string): string[] {
  return Array.from(
    new Set(
      CURRICULUM_RULES.flatMap((rule) =>
        rule.subjects.some((subject) => subject.subjectCode === subjectCode)
          ? [rule.streamCode]
          : [],
      ),
    ),
  );
}

type SeededCurriculumRecord = {
  id: string;
  code: string;
  streamCodes: string[];
  validFromYear: number;
  validToYear: number | null;
};

async function seedSubjectCurricula(
  subjectIds: Map<string, string>,
  streamIds: Map<string, string>,
): Promise<Map<string, SeededCurriculumRecord[]>> {
  const subjects = await prisma.subject.findMany({
    where: {
      id: {
        in: Array.from(subjectIds.values()),
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });
  const curriculumIds = new Map<string, SeededCurriculumRecord[]>();

  for (const subject of subjects) {
    const subjectStreamCodes = resolveSubjectStreamCodes(subject.code);
    const definitions = resolveCurriculumDefinitions({
      subjectCode: subject.code,
      subjectStreamCodes,
    }).filter((definition) =>
      definition.streamCodes.every((streamCode) => streamIds.has(streamCode)),
    );
    const subjectCurricula: SeededCurriculumRecord[] = [];

    for (const definition of definitions) {
      const curriculum = await prisma.curriculum.upsert({
        where: {
          subjectId_code: {
            subjectId: subject.id,
            code: definition.code,
          },
        },
        update: {
          familyCode: definition.familyCode,
          title: buildCurriculumTitle(subject.name, definition),
          validFromYear: definition.validFromYear,
          validToYear: definition.validToYear ?? null,
          isActive: true,
        },
        create: {
          subjectId: subject.id,
          code: definition.code,
          familyCode: definition.familyCode,
          title: buildCurriculumTitle(subject.name, definition),
          validFromYear: definition.validFromYear,
          validToYear: definition.validToYear ?? null,
          isActive: true,
        },
      });

      subjectCurricula.push({
        id: curriculum.id,
        code: definition.code,
        streamCodes: definition.streamCodes,
        validFromYear: definition.validFromYear,
        validToYear: definition.validToYear ?? null,
      });
    }

    curriculumIds.set(subject.code, subjectCurricula);
  }

  return curriculumIds;
}

async function syncSubjectOfferings(
  streamIds: Map<string, string>,
  subjectIds: Map<string, string>,
  curriculaBySubject: Map<string, SeededCurriculumRecord[]>,
): Promise<void> {
  const expectedOfferings = new Map<
    string,
    {
      streamId: string;
      subjectId: string;
      curriculumId: string;
      isOptional: boolean;
      validFromYear: number;
      validToYear: number | null;
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

      const curricula = curriculaBySubject.get(subjectRule.subjectCode) ?? [];
      const matchingCurricula = curricula.filter((curriculum) =>
        curriculum.streamCodes.includes(rule.streamCode),
      );

      if (!matchingCurricula.length) {
        throw new Error(
          `Missing curriculum for ${rule.streamCode}:${subjectRule.subjectCode}.`,
        );
      }

      for (const curriculum of matchingCurricula) {
        expectedOfferings.set(
          `${streamId}:${subjectId}:${curriculum.validFromYear}`,
          {
            streamId,
            subjectId,
            curriculumId: curriculum.id,
            isOptional: subjectRule.isOptional ?? false,
            validFromYear: curriculum.validFromYear,
            validToYear: curriculum.validToYear,
          },
        );
      }
    }
  }

  const currentMappings = await prisma.subjectOffering.findMany({
    where: {
      streamId: {
        in: Array.from(streamIds.values()),
      },
      subjectId: {
        in: Array.from(subjectIds.values()),
      },
    },
    select: {
      id: true,
      streamId: true,
      subjectId: true,
      validFromYear: true,
    },
  });

  const mappingIdsToDelete = currentMappings
    .filter(
      (mapping: (typeof currentMappings)[number]) =>
        !expectedOfferings.has(
          `${mapping.streamId}:${mapping.subjectId}:${mapping.validFromYear}`,
        ),
    )
    .map((mapping: (typeof currentMappings)[number]) => mapping.id);

  if (mappingIdsToDelete.length > 0) {
    await prisma.subjectOffering.deleteMany({
      where: {
        id: {
          in: mappingIdsToDelete,
        },
      },
    });
  }

  for (const rule of expectedOfferings.values()) {
    await prisma.subjectOffering.upsert({
      where: {
        streamId_subjectId_validFromYear: {
          streamId: rule.streamId,
          subjectId: rule.subjectId,
          validFromYear: rule.validFromYear,
        },
      },
      update: {
        curriculumId: rule.curriculumId,
        coefficient: null,
        isOptional: rule.isOptional,
        validToYear: rule.validToYear,
      },
      create: {
        streamId: rule.streamId,
        subjectId: rule.subjectId,
        curriculumId: rule.curriculumId,
        coefficient: null,
        isOptional: rule.isOptional,
        validFromYear: rule.validFromYear,
        validToYear: rule.validToYear,
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
      curriculumNodes: { none: {} },
      subjectOfferings: { none: {} },
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
  curriculumId: string,
  topicTree: TopicNodeDefinition[],
): Promise<void> {
  const validCodes = collectTopicCodes(topicTree);

  await prisma.curriculumNode.deleteMany({
    where: {
      curriculumId,
      code: {
        notIn: validCodes,
      },
    },
  });

  async function upsertLevel(
    nodes: TopicNodeDefinition[],
    parentId: string | null,
    depth: number,
    parentPath: string | null,
  ): Promise<void> {
    for (const [index, topic] of nodes.entries()) {
      const path = parentPath ? `${parentPath}/${topic.code}` : topic.code;
      const savedTopic = await prisma.curriculumNode.upsert({
        where: {
          curriculumId_code: {
            curriculumId,
            code: topic.code,
          },
        },
        update: {
          curriculumId,
          name: topic.name,
          slug: slugFromCode(topic.code),
          parentId,
          kind: depth === 0 ? 'UNIT' : depth === 1 ? 'TOPIC' : 'CONCEPT',
          depth,
          path,
          displayOrder: index + 1,
          isSelectable: topic.isSelectable ?? true,
          studentLabel: topic.studentLabel ?? null,
        },
        create: {
          subjectId,
          curriculumId,
          code: topic.code,
          name: topic.name,
          slug: slugFromCode(topic.code),
          parentId,
          kind: depth === 0 ? 'UNIT' : depth === 1 ? 'TOPIC' : 'CONCEPT',
          depth,
          path,
          displayOrder: index + 1,
          isSelectable: topic.isSelectable ?? true,
          studentLabel: topic.studentLabel ?? null,
        },
      });

      if (topic.children?.length) {
        await upsertLevel(topic.children, savedTopic.id, depth + 1, path);
      }
    }
  }

  await upsertLevel(topicTree, null, 0, null);
}

async function syncSubjectLearningTargets(
  subjectId: string,
  curriculumId: string,
  learningTargets: LearningTargetDefinition[],
): Promise<void> {
  const topicRows = await prisma.curriculumNode.findMany({
    where: {
      curriculumId,
    },
    select: {
      id: true,
      code: true,
    },
  });
  const topicIdsByCode = new Map(
    topicRows.map((topic) => [topic.code, topic.id]),
  );
  const validLearningTargetCodes = learningTargets.map(
    (learningTarget) => learningTarget.code,
  );

  const savedLearningTargets = await Promise.all(
    learningTargets.map((learningTarget, index) =>
      prisma.learningTarget.upsert({
        where: {
          curriculumId_code: {
            curriculumId,
            code: learningTarget.code,
          },
        },
        update: {
          curriculumId,
          name: learningTarget.name,
          slug: slugFromCode(learningTarget.code),
          description: learningTarget.description ?? null,
          displayOrder: learningTarget.displayOrder ?? index + 1,
          kind: learningTarget.kind ?? LearningTargetKind.PROCEDURE,
          isAssessable: true,
        },
        create: {
          subjectId,
          curriculumId,
          code: learningTarget.code,
          name: learningTarget.name,
          slug: slugFromCode(learningTarget.code),
          description: learningTarget.description ?? null,
          displayOrder: learningTarget.displayOrder ?? index + 1,
          kind: learningTarget.kind ?? LearningTargetKind.PROCEDURE,
          isAssessable: true,
        },
      }),
    ),
  );

  const learningTargetIdsByCode = new Map(
    savedLearningTargets.map((learningTarget) => [
      learningTarget.code,
      learningTarget.id,
    ]),
  );
  const expectedMappings = new Set<string>();

  for (const learningTarget of learningTargets) {
    const learningTargetId = learningTargetIdsByCode.get(learningTarget.code);

    if (!learningTargetId) {
      throw new Error(
        `Missing saved learning target ${learningTarget.code} while syncing mappings.`,
      );
    }

    for (const mapping of learningTarget.topicMappings) {
      const topicId = topicIdsByCode.get(mapping.topicCode);

      if (!topicId) {
        throw new Error(
          `Missing topic ${mapping.topicCode} while syncing learning target ${learningTarget.code}.`,
        );
      }

      expectedMappings.add(`${topicId}:${learningTargetId}`);

      await prisma.curriculumNodeLearningTarget.upsert({
        where: {
          curriculumNodeId_learningTargetId: {
            curriculumNodeId: topicId,
            learningTargetId,
          },
        },
        update: {
          weight: mapping.weight ?? 1,
          isPrimary: mapping.isPrimary ?? false,
        },
        create: {
          curriculumNodeId: topicId,
          learningTargetId,
          weight: mapping.weight ?? 1,
          isPrimary: mapping.isPrimary ?? false,
        },
      });
    }
  }

  const currentMappings = await prisma.curriculumNodeLearningTarget.findMany({
    where: {
      learningTarget: {
        curriculumId,
      },
    },
    select: {
      curriculumNodeId: true,
      learningTargetId: true,
    },
  });

  const mappingsToDelete = currentMappings.filter(
    (mapping) =>
      !expectedMappings.has(
        `${mapping.curriculumNodeId}:${mapping.learningTargetId}`,
      ),
  );

  if (mappingsToDelete.length) {
    await prisma.curriculumNodeLearningTarget.deleteMany({
      where: {
        OR: mappingsToDelete.map((mapping) => ({
          curriculumNodeId: mapping.curriculumNodeId,
          learningTargetId: mapping.learningTargetId,
        })),
      },
    });
  }

  await prisma.learningTarget.deleteMany({
    where: {
      curriculumId,
      code: {
        notIn: validLearningTargetCodes,
      },
    },
  });
}

function resolveCurrentCurriculum(
  subjectCode: string,
  curriculaBySubject: Map<string, SeededCurriculumRecord[]>,
): SeededCurriculumRecord {
  const curricula = curriculaBySubject.get(subjectCode) ?? [];
  const currentCurriculum = [...curricula].sort((left, right) => {
    const leftIsOpen = left.validToYear === null ? 1 : 0;
    const rightIsOpen = right.validToYear === null ? 1 : 0;

    if (leftIsOpen !== rightIsOpen) {
      return rightIsOpen - leftIsOpen;
    }

    return right.validFromYear - left.validFromYear;
  })[0];

  if (!currentCurriculum) {
    throw new Error(
      `Could not resolve a current curriculum for ${subjectCode} while syncing platform flashcards.`,
    );
  }

  return currentCurriculum;
}

async function syncPlatformFlashcardDecks(
  subjectIds: Map<string, string>,
  curriculaBySubject: Map<string, SeededCurriculumRecord[]>,
): Promise<void> {
  for (const deckDefinition of PLATFORM_FLASHCARD_DECKS) {
    const subjectId = subjectIds.get(deckDefinition.subjectCode);

    if (!subjectId) {
      throw new Error(
        `Missing subject ${deckDefinition.subjectCode} while syncing platform flashcards.`,
      );
    }

    const curriculum = resolveCurrentCurriculum(
      deckDefinition.subjectCode,
      curriculaBySubject,
    );
    const metadata = {
      seedCode: deckDefinition.code,
      subjectCode: deckDefinition.subjectCode,
      curriculumCode: curriculum.code,
    };
    const existingDeck = await prisma.flashcardDeck.findFirst({
      where: {
        subjectId,
        sourceType: FlashcardSourceType.PLATFORM,
        isPlatformSeed: true,
        metadata: {
          path: ['seedCode'],
          equals: deckDefinition.code,
        },
      },
      select: {
        id: true,
      },
    });
    const deck = existingDeck
      ? await prisma.flashcardDeck.update({
          where: {
            id: existingDeck.id,
          },
          data: {
            subjectId,
            curriculumId: curriculum.id,
            title: deckDefinition.title,
            description: deckDefinition.description,
            sourceType: FlashcardSourceType.PLATFORM,
            isPlatformSeed: true,
            metadata,
          },
          select: {
            id: true,
          },
        })
      : await prisma.flashcardDeck.create({
          data: {
            subjectId,
            curriculumId: curriculum.id,
            title: deckDefinition.title,
            description: deckDefinition.description,
            sourceType: FlashcardSourceType.PLATFORM,
            isPlatformSeed: true,
            metadata,
          },
          select: {
            id: true,
          },
        });

    const [curriculumNodes, learningTargets] = await Promise.all([
      prisma.curriculumNode.findMany({
        where: {
          curriculumId: curriculum.id,
          code: {
            in: deckDefinition.cards.flatMap((card) =>
              card.curriculumNodeCode ? [card.curriculumNodeCode] : [],
            ),
          },
        },
        select: {
          id: true,
          code: true,
        },
      }),
      prisma.learningTarget.findMany({
        where: {
          curriculumId: curriculum.id,
          code: {
            in: deckDefinition.cards.flatMap((card) =>
              card.learningTargetCode ? [card.learningTargetCode] : [],
            ),
          },
        },
        select: {
          id: true,
          code: true,
        },
      }),
    ]);
    const curriculumNodeIdsByCode = new Map(
      curriculumNodes.map((node) => [node.code, node.id]),
    );
    const learningTargetIdsByCode = new Map(
      learningTargets.map((learningTarget) => [
        learningTarget.code,
        learningTarget.id,
      ]),
    );
    const validCardIds: string[] = [];

    for (const [index, cardDefinition] of deckDefinition.cards.entries()) {
      const curriculumNodeId = cardDefinition.curriculumNodeCode
        ? curriculumNodeIdsByCode.get(cardDefinition.curriculumNodeCode)
        : null;
      const learningTargetId = cardDefinition.learningTargetCode
        ? learningTargetIdsByCode.get(cardDefinition.learningTargetCode)
        : null;

      if (cardDefinition.curriculumNodeCode && !curriculumNodeId) {
        throw new Error(
          `Missing curriculum node ${cardDefinition.curriculumNodeCode} while syncing flashcard ${cardDefinition.code}.`,
        );
      }

      if (cardDefinition.learningTargetCode && !learningTargetId) {
        throw new Error(
          `Missing learning target ${cardDefinition.learningTargetCode} while syncing flashcard ${cardDefinition.code}.`,
        );
      }

      const cardMetadata = {
        seedCode: cardDefinition.code,
        deckCode: deckDefinition.code,
        subjectCode: deckDefinition.subjectCode,
        curriculumCode: curriculum.code,
      };
      const existingCard = await prisma.flashcard.findFirst({
        where: {
          subjectId,
          sourceType: FlashcardSourceType.PLATFORM,
          data: {
            path: ['seedCode'],
            equals: cardDefinition.code,
          },
        },
        select: {
          id: true,
        },
      });
      const card = existingCard
        ? await prisma.flashcard.update({
            where: {
              id: existingCard.id,
            },
            data: {
              subjectId,
              curriculumNodeId: curriculumNodeId ?? null,
              learningTargetId: learningTargetId ?? null,
              type: FlashcardType.FRONT_BACK,
              sourceType: FlashcardSourceType.PLATFORM,
              front: cardDefinition.front,
              back: cardDefinition.back,
              data: cardMetadata,
            },
            select: {
              id: true,
            },
          })
        : await prisma.flashcard.create({
            data: {
              subjectId,
              curriculumNodeId: curriculumNodeId ?? null,
              learningTargetId: learningTargetId ?? null,
              type: FlashcardType.FRONT_BACK,
              sourceType: FlashcardSourceType.PLATFORM,
              front: cardDefinition.front,
              back: cardDefinition.back,
              data: cardMetadata,
            },
            select: {
              id: true,
            },
          });

      validCardIds.push(card.id);

      await prisma.flashcardDeckCard.upsert({
        where: {
          deckId_cardId: {
            deckId: deck.id,
            cardId: card.id,
          },
        },
        update: {
          orderIndex: cardDefinition.orderIndex ?? index + 1,
        },
        create: {
          deckId: deck.id,
          cardId: card.id,
          orderIndex: cardDefinition.orderIndex ?? index + 1,
        },
      });
    }

    await prisma.flashcardDeckCard.deleteMany({
      where: {
        deckId: deck.id,
        cardId: {
          notIn: validCardIds,
        },
      },
    });
  }
}

async function syncPlatformLabTools(
  subjectIds: Map<string, string>,
  curriculaBySubject: Map<string, SeededCurriculumRecord[]>,
): Promise<void> {
  for (const toolDefinition of PLATFORM_LAB_TOOLS) {
    const subjectId = subjectIds.get(toolDefinition.subjectCode);

    if (!subjectId) {
      throw new Error(
        `Missing subject ${toolDefinition.subjectCode} while syncing Lab tools.`,
      );
    }

    const curriculum = resolveCurrentCurriculum(
      toolDefinition.subjectCode,
      curriculaBySubject,
    );
    const tool = await prisma.labTool.upsert({
      where: {
        slug: toolDefinition.slug,
      },
      update: {
        subjectId,
        title: toolDefinition.title,
        description: toolDefinition.description,
        status: toolDefinition.status ?? 'READY',
        metadata: toJsonValue({
          seedSlug: toolDefinition.slug,
          subjectCode: toolDefinition.subjectCode,
          curriculumCode: curriculum.code,
          ...(toolDefinition.metadata ?? {}),
        }),
      },
      create: {
        subjectId,
        slug: toolDefinition.slug,
        title: toolDefinition.title,
        description: toolDefinition.description,
        status: toolDefinition.status ?? 'READY',
        metadata: toJsonValue({
          seedSlug: toolDefinition.slug,
          subjectCode: toolDefinition.subjectCode,
          curriculumCode: curriculum.code,
          ...(toolDefinition.metadata ?? {}),
        }),
      },
      select: {
        id: true,
      },
    });
    const [curriculumNodes, learningTargets] = await Promise.all([
      prisma.curriculumNode.findMany({
        where: {
          curriculumId: curriculum.id,
          code: {
            in: toolDefinition.missions.flatMap((mission) =>
              mission.curriculumNodeCode ? [mission.curriculumNodeCode] : [],
            ),
          },
        },
        select: {
          id: true,
          code: true,
        },
      }),
      prisma.learningTarget.findMany({
        where: {
          curriculumId: curriculum.id,
          code: {
            in: toolDefinition.missions.flatMap((mission) =>
              mission.learningTargetCode ? [mission.learningTargetCode] : [],
            ),
          },
        },
        select: {
          id: true,
          code: true,
        },
      }),
    ]);
    const curriculumNodeIdsByCode = new Map(
      curriculumNodes.map((node) => [node.code, node.id]),
    );
    const learningTargetIdsByCode = new Map(
      learningTargets.map((learningTarget) => [
        learningTarget.code,
        learningTarget.id,
      ]),
    );

    for (const [
      index,
      missionDefinition,
    ] of toolDefinition.missions.entries()) {
      const curriculumNodeId = missionDefinition.curriculumNodeCode
        ? curriculumNodeIdsByCode.get(missionDefinition.curriculumNodeCode)
        : null;
      const learningTargetId = missionDefinition.learningTargetCode
        ? learningTargetIdsByCode.get(missionDefinition.learningTargetCode)
        : null;

      if (missionDefinition.curriculumNodeCode && !curriculumNodeId) {
        throw new Error(
          `Missing curriculum node ${missionDefinition.curriculumNodeCode} while syncing Lab mission ${missionDefinition.code}.`,
        );
      }

      if (missionDefinition.learningTargetCode && !learningTargetId) {
        throw new Error(
          `Missing learning target ${missionDefinition.learningTargetCode} while syncing Lab mission ${missionDefinition.code}.`,
        );
      }

      const preset = toJsonValue({
        seedCode: missionDefinition.code,
        toolSlug: toolDefinition.slug,
        ...(missionDefinition.preset ?? {}),
      });
      const exitCheck =
        missionDefinition.exitCheck === undefined
          ? Prisma.JsonNull
          : toJsonValue({
              seedCode: missionDefinition.code,
              toolSlug: toolDefinition.slug,
              ...missionDefinition.exitCheck,
            });
      const existingMission = await prisma.labMission.findFirst({
        where: {
          toolId: tool.id,
          preset: {
            path: ['seedCode'],
            equals: missionDefinition.code,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingMission) {
        await prisma.labMission.update({
          where: {
            id: existingMission.id,
          },
          data: {
            curriculumNodeId: curriculumNodeId ?? null,
            learningTargetId: learningTargetId ?? null,
            courseLessonId: null,
            title: missionDefinition.title,
            goal: missionDefinition.goal,
            preset,
            exitCheck,
            orderIndex: missionDefinition.orderIndex ?? index + 1,
          },
        });
      } else {
        await prisma.labMission.create({
          data: {
            toolId: tool.id,
            curriculumNodeId: curriculumNodeId ?? null,
            learningTargetId: learningTargetId ?? null,
            title: missionDefinition.title,
            goal: missionDefinition.goal,
            preset,
            exitCheck,
            orderIndex: missionDefinition.orderIndex ?? index + 1,
          },
        });
      }
    }
  }
}

function resolveSeedTopicTree(
  subjectCode: string,
  curriculumCode: string,
  defaultTree: TopicNodeDefinition[],
): TopicNodeDefinition[] {
  if (
    subjectCode === 'NATURAL_SCIENCES' &&
    curriculumCode === 'M__2008__OPEN'
  ) {
    return NATURAL_SCIENCES_M_TOPIC_TREE;
  }

  return defaultTree;
}

function resolveSeedLearningTargets(
  subjectCode: string,
  curriculumCode: string,
  defaultLearningTargets: LearningTargetDefinition[],
): LearningTargetDefinition[] {
  if (
    subjectCode === 'NATURAL_SCIENCES' &&
    curriculumCode === 'M__2008__OPEN'
  ) {
    return NATURAL_SCIENCES_M_LEARNING_TARGETS;
  }

  return defaultLearningTargets;
}

export async function runCatalogSeed() {
  const streamIds = await seedStreams();
  const subjectIds = await seedSubjects();
  const subjectCurriculumIds = await seedSubjectCurricula(
    subjectIds,
    streamIds,
  );
  await syncSubjectOfferings(streamIds, subjectIds, subjectCurriculumIds);
  await cleanupObsoleteCatalog();

  for (const [subjectCode, topicTree] of Object.entries(SUBJECT_TOPIC_TREES)) {
    const subjectId = subjectIds.get(subjectCode);
    const curricula = subjectCurriculumIds.get(subjectCode) ?? [];

    if (!subjectId || curricula.length === 0) {
      throw new Error(
        `Could not resolve the ${subjectCode} curriculum during seed.`,
      );
    }

    for (const curriculum of curricula) {
      await syncSubjectTopics(
        subjectId,
        curriculum.id,
        resolveSeedTopicTree(subjectCode, curriculum.code, topicTree),
      );
    }
  }

  for (const [subjectCode, learningTargets] of Object.entries(
    SUBJECT_LEARNING_TARGETS,
  )) {
    const subjectId = subjectIds.get(subjectCode);
    const curricula = subjectCurriculumIds.get(subjectCode) ?? [];

    if (!subjectId || curricula.length === 0) {
      throw new Error(
        `Could not resolve the ${subjectCode} curriculum while syncing learning targets.`,
      );
    }

    for (const curriculum of curricula) {
      await syncSubjectLearningTargets(
        subjectId,
        curriculum.id,
        resolveSeedLearningTargets(
          subjectCode,
          curriculum.code,
          learningTargets,
        ),
      );
    }
  }

  await syncPlatformFlashcardDecks(subjectIds, subjectCurriculumIds);
  await syncPlatformLabTools(subjectIds, subjectCurriculumIds);

  console.log(
    'Seed complete: BAC catalog families, pathways, subject offerings, active curricula, starter curriculum nodes, learning target mappings, platform flashcards, and Lab missions synced.',
  );
}

if (process.env.BAC_BANK_IMPORT_CATALOG_SEED !== '1') {
  runCatalogSeed()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
