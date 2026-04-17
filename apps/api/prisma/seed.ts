import { PrismaClient } from '@prisma/client';
import { resolveSubjectRoadmapDefinition } from './roadmap-definitions';
import {
  buildSubjectCurriculumTitle,
  resolveSubjectCurriculumDefinitions,
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

type SkillDefinition = {
  code: string;
  name: string;
  description?: string;
  displayOrder?: number;
  topicMappings: Array<{
    topicCode: string;
    weight?: number;
    isPrimary?: boolean;
  }>;
};

type CurriculumRuleDefinition = {
  streamCode: string;
  subjects: Array<{
    subjectCode: string;
    isOptional?: boolean;
  }>;
};

const DEFAULT_SUBJECT_ROADMAP_CODE = 'CORE_PATH';

function slugFromCode(code: string): string {
  return code.toLowerCase().replace(/_/g, '-');
}

function findSubjectName(subjectCode: string): string {
  return (
    SUBJECT_CATALOG.flatMap((family) => family.subjects).find(
      (subject) => subject.code === subjectCode,
    )?.name ?? subjectCode
  );
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
  ],
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

const SUBJECT_SKILLS: Record<string, SkillDefinition[]> = {
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
      topicMappings: [
        { topicCode: 'PROTEINS', weight: 1, isPrimary: true },
        { topicCode: 'PROTEIN_SYNTHESIS', weight: 1 },
        { topicCode: 'STRUCTURE_FUNCTION', weight: 1 },
        { topicCode: 'ENZYMES', weight: 0.8 },
        { topicCode: 'NERVOUS_COMMUNICATION', weight: 0.5 },
      ],
    },
    {
      code: 'IMMUNITY_REASONING',
      name: 'الاستدلال في المناعة',
      description: 'تمييز الاستجابة المناعية وربط المراحل بالوثائق والرسوم.',
      topicMappings: [{ topicCode: 'IMMUNITY', weight: 1, isPrimary: true }],
    },
    {
      code: 'ENERGY_PATHWAY_INTEGRATION',
      name: 'تكامل المسارات الطاقوية',
      description: 'المقارنة بين التركيب الضوئي والتنفس والحصيلة الطاقوية.',
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
      topicMappings: [
        { topicCode: 'PROTEINS', weight: 0.6 },
        { topicCode: 'ENERGY_TRANSFORMATIONS', weight: 0.6 },
        { topicCode: 'PLATE_TECTONICS', weight: 0.4 },
        { topicCode: 'IMMUNITY', weight: 0.7 },
        { topicCode: 'PHOTOSYNTHESIS', weight: 0.7 },
        { topicCode: 'RESPIRATION_FERMENTATION', weight: 0.7 },
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

async function seedSubjectCurricula(
  subjectIds: Map<string, string>,
): Promise<Map<string, Array<{ id: string; code: string }>>> {
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
      streamMappings: {
        select: {
          stream: {
            select: {
              id: true,
              code: true,
            },
          },
        },
      },
    },
  });
  const curriculumIds = new Map<string, Array<{ id: string; code: string }>>();

  for (const subject of subjects) {
    const definitions = resolveSubjectCurriculumDefinitions({
      subjectCode: subject.code,
      subjectStreamCodes: subject.streamMappings.map(
        (mapping) => mapping.stream.code,
      ),
    });
    const streamIdByCode = new Map(
      subject.streamMappings.map((mapping) => [
        mapping.stream.code,
        mapping.stream.id,
      ]),
    );
    const subjectCurricula: Array<{ id: string; code: string }> = [];

    for (const definition of definitions) {
      const curriculum = await prisma.subjectCurriculum.upsert({
        where: {
          subjectId_code: {
            subjectId: subject.id,
            code: definition.code,
          },
        },
        update: {
          familyCode: definition.familyCode,
          title: buildSubjectCurriculumTitle(subject.name, definition),
          validFromYear: definition.validFromYear,
          validToYear: definition.validToYear ?? null,
          isActive: true,
        },
        create: {
          subjectId: subject.id,
          code: definition.code,
          familyCode: definition.familyCode,
          title: buildSubjectCurriculumTitle(subject.name, definition),
          validFromYear: definition.validFromYear,
          validToYear: definition.validToYear ?? null,
          isActive: true,
        },
      });
      const resolvedStreamIds = definition.streamCodes.map((streamCode) => {
        const streamId = streamIdByCode.get(streamCode);

        if (!streamId) {
          throw new Error(
            `Could not resolve stream ${streamCode} for ${subject.code}:${definition.familyCode}.`,
          );
        }

        return streamId;
      });

      await prisma.subjectCurriculumStream.deleteMany({
        where: {
          curriculumId: curriculum.id,
          ...(resolvedStreamIds.length > 0
            ? {
                streamId: {
                  notIn: resolvedStreamIds,
                },
              }
            : {}),
        },
      });

      if (resolvedStreamIds.length > 0) {
        await prisma.subjectCurriculumStream.createMany({
          data: resolvedStreamIds.map((streamId) => ({
            curriculumId: curriculum.id,
            streamId,
          })),
          skipDuplicates: true,
        });
      }

      subjectCurricula.push({
        id: curriculum.id,
        code: definition.code,
      });
    }

    curriculumIds.set(subject.code, subjectCurricula);
  }

  return curriculumIds;
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
      (mapping: (typeof currentMappings)[number]) =>
        !expectedPairs.has(`${mapping.streamId}:${mapping.subjectId}`),
    )
    .map((mapping: (typeof currentMappings)[number]) => mapping.id);

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
  curriculumId: string,
  topicTree: TopicNodeDefinition[],
): Promise<void> {
  const validCodes = collectTopicCodes(topicTree);

  await prisma.topic.deleteMany({
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
      const savedTopic = await prisma.topic.upsert({
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
          kind: depth === 0 ? 'UNIT' : depth === 1 ? 'TOPIC' : 'SUBTOPIC',
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
          kind: depth === 0 ? 'UNIT' : depth === 1 ? 'TOPIC' : 'SUBTOPIC',
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

async function syncSubjectSkills(
  subjectId: string,
  curriculumId: string,
  skills: SkillDefinition[],
): Promise<void> {
  const topicRows = await prisma.topic.findMany({
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
  const validSkillCodes = skills.map((skill) => skill.code);

  const savedSkills = await Promise.all(
    skills.map((skill, index) =>
      prisma.skill.upsert({
        where: {
          curriculumId_code: {
            curriculumId,
            code: skill.code,
          },
        },
        update: {
          curriculumId,
          name: skill.name,
          slug: slugFromCode(skill.code),
          description: skill.description ?? null,
          displayOrder: skill.displayOrder ?? index + 1,
          isAssessable: true,
        },
        create: {
          subjectId,
          curriculumId,
          code: skill.code,
          name: skill.name,
          slug: slugFromCode(skill.code),
          description: skill.description ?? null,
          displayOrder: skill.displayOrder ?? index + 1,
          isAssessable: true,
        },
      }),
    ),
  );

  const skillIdsByCode = new Map(
    savedSkills.map((skill) => [skill.code, skill.id]),
  );
  const expectedMappings = new Set<string>();

  for (const skill of skills) {
    const skillId = skillIdsByCode.get(skill.code);

    if (!skillId) {
      throw new Error(
        `Missing saved skill ${skill.code} while syncing mappings.`,
      );
    }

    for (const mapping of skill.topicMappings) {
      const topicId = topicIdsByCode.get(mapping.topicCode);

      if (!topicId) {
        throw new Error(
          `Missing topic ${mapping.topicCode} while syncing skill ${skill.code}.`,
        );
      }

      expectedMappings.add(`${topicId}:${skillId}`);

      await prisma.topicSkill.upsert({
        where: {
          topicId_skillId: {
            topicId,
            skillId,
          },
        },
        update: {
          weight: mapping.weight ?? 1,
          isPrimary: mapping.isPrimary ?? false,
        },
        create: {
          topicId,
          skillId,
          weight: mapping.weight ?? 1,
          isPrimary: mapping.isPrimary ?? false,
        },
      });
    }
  }

  const currentMappings = await prisma.topicSkill.findMany({
    where: {
      skill: {
        curriculumId,
      },
    },
    select: {
      topicId: true,
      skillId: true,
    },
  });

  const mappingsToDelete = currentMappings.filter(
    (mapping) => !expectedMappings.has(`${mapping.topicId}:${mapping.skillId}`),
  );

  if (mappingsToDelete.length) {
    await prisma.topicSkill.deleteMany({
      where: {
        OR: mappingsToDelete.map((mapping) => ({
          topicId: mapping.topicId,
          skillId: mapping.skillId,
        })),
      },
    });
  }

  await prisma.skill.deleteMany({
    where: {
      curriculumId,
      code: {
        notIn: validSkillCodes,
      },
    },
  });
}

async function syncSubjectRoadmap(
  curriculumId: string,
  subjectCode: string,
): Promise<void> {
  const subjectName = findSubjectName(subjectCode);
  const roadmap = await prisma.subjectRoadmap.upsert({
    where: {
      curriculumId_code: {
        curriculumId,
        code: DEFAULT_SUBJECT_ROADMAP_CODE,
      },
    },
    update: {
      title: `خارطة ${subjectName}`,
      description: null,
      version: 1,
      isActive: true,
    },
    create: {
      curriculumId,
      code: DEFAULT_SUBJECT_ROADMAP_CODE,
      title: `خارطة ${subjectName}`,
      description: null,
      version: 1,
      isActive: true,
    },
  });
  const rootTopics = await prisma.topic.findMany({
    where: {
      curriculumId,
      parentId: null,
    },
    select: {
      id: true,
      code: true,
      name: true,
      studentLabel: true,
      displayOrder: true,
      _count: {
        select: {
          children: true,
        },
      },
    },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
  const roadmapDefinition = resolveSubjectRoadmapDefinition({
    subjectCode,
    subjectName,
    topics: rootTopics.map((topic) => ({
      code: topic.code,
      name: topic.name,
      studentLabel: topic.studentLabel,
      childrenCount: topic._count.children,
      displayOrder: topic.displayOrder,
    })),
  });
  const topicByCode = new Map(rootTopics.map((topic) => [topic.code, topic]));

  await prisma.subjectRoadmap.update({
    where: {
      id: roadmap.id,
    },
    data: {
      title: roadmapDefinition.title,
      description: roadmapDefinition.description,
    },
  });
  const desiredSectionCodes = roadmapDefinition.sections.map(
    (section) => section.code,
  );

  // Shift existing section order indexes out of the way so reseeding can
  // safely rewrite the curated order without unique-order collisions.
  await prisma.roadmapSection.updateMany({
    where: {
      roadmapId: roadmap.id,
    },
    data: {
      orderIndex: {
        increment: 1000,
      },
    },
  });

  await prisma.roadmapSection.deleteMany({
    where: {
      roadmapId: roadmap.id,
      ...(desiredSectionCodes.length > 0
        ? {
            code: {
              notIn: desiredSectionCodes,
            },
          }
        : {}),
    },
  });

  for (const [index, section] of roadmapDefinition.sections.entries()) {
    await prisma.roadmapSection.upsert({
      where: {
        roadmapId_code: {
          roadmapId: roadmap.id,
          code: section.code,
        },
      },
      update: {
        title: section.title,
        description: section.description,
        orderIndex: index + 1,
      },
      create: {
        roadmapId: roadmap.id,
        code: section.code,
        title: section.title,
        description: section.description,
        orderIndex: index + 1,
      },
    });
  }

  const sections = await prisma.roadmapSection.findMany({
    where: {
      roadmapId: roadmap.id,
    },
    select: {
      id: true,
      code: true,
    },
  });
  const sectionIdsByCode = new Map(
    sections.map((section) => [section.code, section.id]),
  );
  const expectedTopicIds: string[] = [];
  let orderIndex = 1;

  await prisma.roadmapNode.updateMany({
    where: {
      roadmapId: roadmap.id,
    },
    data: {
      orderIndex: {
        increment: 1000,
      },
    },
  });

  for (const section of roadmapDefinition.sections) {
    const sectionId = sectionIdsByCode.get(section.code);

    if (!sectionId) {
      throw new Error(
        `Could not resolve roadmap section ${section.code} for ${subjectCode}.`,
      );
    }

    for (const node of section.nodes) {
      const topic = topicByCode.get(node.topicCode);

      if (!topic) {
        throw new Error(
          `Could not resolve roadmap topic ${node.topicCode} for ${subjectCode}.`,
        );
      }

      expectedTopicIds.push(topic.id);

      await prisma.roadmapNode.upsert({
        where: {
          roadmapId_topicId: {
            roadmapId: roadmap.id,
            topicId: topic.id,
          },
        },
        update: {
          sectionId,
          title: node.title,
          description: node.description,
          orderIndex,
          parentRoadmapNodeId: null,
          recommendedPreviousRoadmapNodeId: null,
          estimatedSessions: node.estimatedSessions,
          isOptional: node.isOptional,
        },
        create: {
          roadmapId: roadmap.id,
          sectionId,
          topicId: topic.id,
          title: node.title,
          description: node.description,
          orderIndex,
          parentRoadmapNodeId: null,
          recommendedPreviousRoadmapNodeId: null,
          estimatedSessions: node.estimatedSessions,
          isOptional: node.isOptional,
        },
      });

      orderIndex += 1;
    }
  }

  await prisma.roadmapNode.deleteMany({
    where: {
      roadmapId: roadmap.id,
      ...(expectedTopicIds.length > 0
        ? {
            topicId: {
              notIn: expectedTopicIds,
            },
          }
        : {}),
    },
  });

  await prisma.roadmapSection.deleteMany({
    where: {
      roadmapId: roadmap.id,
      ...(desiredSectionCodes.length > 0
        ? {
            code: {
              notIn: desiredSectionCodes,
            },
          }
        : {}),
    },
  });

  const roadmapNodes = await prisma.roadmapNode.findMany({
    where: {
      roadmapId: roadmap.id,
    },
    select: {
      id: true,
      topic: {
        select: {
          code: true,
        },
      },
    },
  });
  const nodeIdsByTopicCode = new Map(
    roadmapNodes.map((node) => [node.topic.code, node.id]),
  );

  for (const section of roadmapDefinition.sections) {
    for (const node of section.nodes) {
      const nodeId = nodeIdsByTopicCode.get(node.topicCode);

      if (!nodeId) {
        throw new Error(
          `Could not resolve roadmap node for ${subjectCode}:${node.topicCode}.`,
        );
      }

      await prisma.roadmapNode.update({
        where: {
          id: nodeId,
        },
        data: {
          recommendedPreviousRoadmapNodeId: node.recommendedPreviousTopicCode
            ? (nodeIdsByTopicCode.get(node.recommendedPreviousTopicCode) ??
              null)
            : null,
        },
      });
    }
  }
}

export async function runCatalogSeed() {
  const streamIds = await seedStreams();
  const subjectIds = await seedSubjects();
  await syncCurriculumRules(streamIds, subjectIds);
  const subjectCurriculumIds = await seedSubjectCurricula(subjectIds);
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
      await syncSubjectTopics(subjectId, curriculum.id, topicTree);
    }
  }

  for (const [subjectCode, skills] of Object.entries(SUBJECT_SKILLS)) {
    const subjectId = subjectIds.get(subjectCode);
    const curricula = subjectCurriculumIds.get(subjectCode) ?? [];

    if (!subjectId || curricula.length === 0) {
      throw new Error(
        `Could not resolve the ${subjectCode} curriculum while syncing skills.`,
      );
    }

    for (const curriculum of curricula) {
      await syncSubjectSkills(subjectId, curriculum.id, skills);
    }
  }

  for (const subjectCode of Object.keys(SUBJECT_TOPIC_TREES)) {
    const curricula = subjectCurriculumIds.get(subjectCode) ?? [];

    if (curricula.length === 0) {
      throw new Error(
        `Could not resolve the ${subjectCode} curriculum while syncing roadmaps.`,
      );
    }

    for (const curriculum of curricula) {
      await syncSubjectRoadmap(curriculum.id, subjectCode);
    }
  }

  console.log(
    'Seed complete: BAC catalog families, pathways, active curricula, starter topic trees, skill mappings, and roadmap shells synced.',
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
