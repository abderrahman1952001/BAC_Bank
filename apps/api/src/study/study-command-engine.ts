import type {
  StudyCommandClarification,
  StudyCommandProposal,
  StudyCommandProposalAction,
  StudyCommandStarter,
  StudyCommandStarterMode,
} from '@bac-bank/contracts/study-command';
import type { DueFlashcardsResponse } from '@bac-bank/contracts/flashcards';
import type { LabToolsResponse } from '@bac-bank/contracts/lab';
import type {
  CatalogResponse,
  CurriculumJourneysResponse,
  FiltersResponse,
  MyMistakesResponse,
  RecentExamActivitiesResponse,
  RecentStudySessionsResponse,
  SessionType,
  StudySessionKind,
  WeakPointInsightsResponse,
} from '@bac-bank/contracts/study';

export type StudyCommandContext = {
  sessions: RecentStudySessionsResponse['data'];
  recentExamActivities: RecentExamActivitiesResponse['data'];
  myMistakes: MyMistakesResponse['data'];
  curriculumJourneys: CurriculumJourneysResponse['data'];
  weakPointInsights: WeakPointInsightsResponse['data'];
  dueFlashcards: DueFlashcardsResponse['data'];
  labTools: LabToolsResponse['data'];
  filters?: FiltersResponse | null;
  catalog?: CatalogResponse | null;
  userStreamCode?: string | null;
};

const STUDENT_COURSES_ROUTE = '/student/courses';
const STUDENT_FLASHCARDS_ROUTE = '/student/flashcards';
const STUDENT_LAB_ROUTE = '/student/lab';
const STUDENT_LIBRARY_ROUTE = '/student/library';
const STUDENT_TRAINING_ROUTE = '/student/training';
const STUDENT_TRAINING_DRILL_ROUTE = '/student/training/drill';
const STUDENT_TRAINING_SIMULATION_ROUTE = '/student/training/simulation';
const STUDENT_TRAINING_WEAK_POINTS_ROUTE = '/student/training/weak-points';

function buildRouteWithSearchParams(
  pathname: string,
  searchParams: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function buildStudentTrainingSessionRoute(sessionId: string) {
  return `${STUDENT_TRAINING_ROUTE}/${encodeURIComponent(sessionId)}`;
}

function buildStudentCourseSubjectRoute(subjectCode: string) {
  return `${STUDENT_COURSES_ROUTE}/${encodeURIComponent(subjectCode)}`;
}

function buildStudentCourseTopicRoute(subjectCode: string, topicSlug: string) {
  return `${buildStudentCourseSubjectRoute(subjectCode)}/topics/${encodeURIComponent(
    topicSlug,
  )}`;
}

function buildStudentLibraryRoute(input?: {
  streamCode?: string | null;
  subjectCode?: string | null;
}) {
  return buildRouteWithSearchParams(STUDENT_LIBRARY_ROUTE, {
    stream: input?.streamCode ?? undefined,
    subject: input?.subjectCode ?? undefined,
  });
}

function buildStudentLabRoute(subjectCode?: string | null) {
  return buildRouteWithSearchParams(STUDENT_LAB_ROUTE, {
    subject: subjectCode ?? undefined,
  });
}

function subjectCodeToLabSlug(subjectCode: string | null | undefined) {
  switch (subjectCode) {
    case 'MATHEMATICS':
    case 'MATH':
      return 'math';
    case 'NATURAL_SCIENCES':
    case 'SVT':
      return 'svt';
    default:
      return null;
  }
}

function buildStudentLabToolRoute(subjectSlug: string, toolSlug: string) {
  return `${STUDENT_LAB_ROUTE}/${encodeURIComponent(
    subjectSlug,
  )}/${encodeURIComponent(toolSlug)}`;
}

function buildStudentTrainingDrillRoute(input?: {
  subjectCode?: string | null;
  topicCodes?: string[] | null;
}) {
  const params = new URLSearchParams();

  if (input?.subjectCode) {
    params.set('subject', input.subjectCode);
  }

  for (const topicCode of input?.topicCodes ?? []) {
    if (topicCode) {
      params.append('topic', topicCode);
    }
  }

  const query = params.toString();

  return query
    ? `${STUDENT_TRAINING_DRILL_ROUTE}?${query}`
    : STUDENT_TRAINING_DRILL_ROUTE;
}

function buildStudentTrainingWeakPointsRoute(subjectCode?: string | null) {
  return buildRouteWithSearchParams(STUDENT_TRAINING_WEAK_POINTS_ROUTE, {
    subject: subjectCode ?? undefined,
  });
}

function buildStudentTrainingSimulationRoute(subjectCode?: string | null) {
  return buildRouteWithSearchParams(STUDENT_TRAINING_SIMULATION_ROUTE, {
    subject: subjectCode ?? undefined,
  });
}

function formatStudySessionKind(kind: StudySessionKind) {
  switch (kind) {
    case 'TOPIC_DRILL':
      return 'تدريب بالمحاور';
    case 'MIXED_DRILL':
      return 'تدريب مختلط';
    case 'WEAK_POINT_DRILL':
      return 'تدريب نقاط الضعف';
    case 'PAPER_SIMULATION':
      return 'محاكاة كاملة';
  }
}

type SubjectHint = {
  preferredCodes: string[];
  name: string;
  aliases: string[];
};

type InferredSubject = {
  code: string;
  name: string;
  canCreateSession: boolean;
};

type TopicHint = {
  preferredCodes: string[];
  name: string;
  aliases: string[];
};

type InferredTopic = {
  code: string | null;
  name: string;
  slug?: string | null;
  canUseCode: boolean;
};

type SubjectContextSource =
  | 'weak-points'
  | 'curriculum'
  | 'recent-exam'
  | 'mistake'
  | 'flashcard';

type ContextSubjectCandidate = {
  source: SubjectContextSource;
  subject: {
    code: string;
    name: string;
  };
};

const SUBJECT_HINTS: SubjectHint[] = [
  {
    preferredCodes: ['MATHEMATICS', 'MATH'],
    name: 'الرياضيات',
    aliases: [
      'math',
      'maths',
      'mathematique',
      'mathématique',
      'رياضيات',
      'الرياضيات',
      'دوال',
      'الدوال',
      'fonctions',
      'function',
      'suites',
      'متتاليات',
      'احتمالات',
      'probabilité',
    ],
  },
  {
    preferredCodes: ['PHYSICS', 'PHYS'],
    name: 'العلوم الفيزيائية',
    aliases: [
      'physics',
      'physique',
      'phys',
      'فيزياء',
      'الفيزياء',
      'علوم فيزيائية',
      'العلوم الفيزيائية',
      'كهرباء',
      'electricity',
      'mecanique',
      'ميكانيك',
      'مغناطيسية',
    ],
  },
  {
    preferredCodes: ['CHEMISTRY', 'CHEM', 'PHYSICS', 'PHYS'],
    name: 'الكيمياء',
    aliases: [
      'chemistry',
      'chimie',
      'كيمياء',
      'الكيمياء',
      'عضوية',
      'organic',
      'reaction',
      'تفاعل',
    ],
  },
  {
    preferredCodes: ['NATURAL_SCIENCES', 'SVT'],
    name: 'علوم الطبيعة والحياة',
    aliases: [
      'svt',
      'science',
      'natural science',
      'علوم',
      'علوم الطبيعة',
      'علوم طبيعية',
      'العلوم الطبيعية',
      'علوم الحياة',
      'بروتين',
      'بروتينات',
      'adn',
      'dna',
      'arn',
      'وراثة',
    ],
  },
  {
    preferredCodes: ['HISTORY_GEOGRAPHY', 'HIST_GEO'],
    name: 'التاريخ والجغرافيا',
    aliases: [
      'history',
      'geo',
      'geography',
      'histoire',
      'géographie',
      'تاريخ',
      'جغرافيا',
      'خرائط',
      'maps',
      'تواريخ',
      'شخصيات',
    ],
  },
  {
    preferredCodes: ['PHILOSOPHY', 'PHILO'],
    name: 'الفلسفة',
    aliases: ['philo', 'philosophy', 'فلسفة', 'الفلسفة', 'مقالة', 'مقالات'],
  },
  {
    preferredCodes: ['ARABIC'],
    name: 'اللغة العربية',
    aliases: ['arabic', 'عربية', 'العربية', 'لغة عربية', 'نص'],
  },
  {
    preferredCodes: ['FRENCH'],
    name: 'اللغة الفرنسية',
    aliases: ['french', 'français', 'francais', 'فرنسية', 'الفرنسية'],
  },
  {
    preferredCodes: ['ENGLISH'],
    name: 'اللغة الإنجليزية',
    aliases: ['english', 'anglais', 'انجليزية', 'إنجليزية', 'الانجليزية'],
  },
];

const TOPIC_HINTS: TopicHint[] = [
  {
    preferredCodes: ['FUNCTIONS', 'FUNC'],
    name: 'الدوال',
    aliases: ['الدوال', 'دوال', 'fonctions', 'function', 'functions'],
  },
  {
    preferredCodes: ['SEQUENCES', 'SUITES'],
    name: 'المتتاليات',
    aliases: ['المتتاليات', 'متتاليات', 'suites', 'sequences'],
  },
  {
    preferredCodes: ['PROBABILITY', 'PROBABILITIES'],
    name: 'الاحتمالات',
    aliases: ['الاحتمالات', 'احتمالات', 'probabilité', 'probability'],
  },
  {
    preferredCodes: ['ELECTRICITY'],
    name: 'الكهرباء',
    aliases: ['الكهرباء', 'كهرباء', 'électricité', 'electricity'],
  },
  {
    preferredCodes: ['MECHANICS'],
    name: 'الميكانيك',
    aliases: ['الميكانيك', 'ميكانيك', 'mecanique', 'mechanics'],
  },
  {
    preferredCodes: ['PROTEIN_SYNTHESIS'],
    name: 'تركيب البروتين',
    aliases: [
      'تركيب البروتين',
      'اصطناع البروتين',
      'تركيب بروتين',
      'synthese proteique',
      'synthèse protéique',
      'adn',
      'dna',
      'arn',
      'protein synthesis',
    ],
  },
  {
    preferredCodes: ['PROTEINS'],
    name: 'البروتينات',
    aliases: ['البروتينات', 'بروتينات', 'بروتين', 'proteins'],
  },
  {
    preferredCodes: ['STRUCTURE_FUNCTION'],
    name: 'العلاقة بين البنية والوظيفة',
    aliases: ['البنية والوظيفة', 'بنية ووظيفة', 'structure function'],
  },
  {
    preferredCodes: ['PHOTOSYNTHESIS'],
    name: 'التركيب الضوئي',
    aliases: [
      'التركيب الضوئي',
      'بناء ضوئي',
      'photosynthesis',
      'photosynthese',
      'photosynthèse',
    ],
  },
  {
    preferredCodes: ['RESPIRATION_FERMENTATION'],
    name: 'التنفس والتخمر',
    aliases: ['التنفس', 'التخمر', 'respiration', 'fermentation'],
  },
  {
    preferredCodes: ['ENZYMES'],
    name: 'الإنزيمات',
    aliases: ['الإنزيمات', 'انزيمات', 'أنزيمات', 'enzyme', 'enzymes'],
  },
  {
    preferredCodes: ['GENETICS'],
    name: 'الوراثة',
    aliases: ['الوراثة', 'وراثة', 'genetics'],
  },
  {
    preferredCodes: ['IMMUNITY'],
    name: 'المناعة',
    aliases: ['المناعة', 'مناعة', 'immunité', 'immunity'],
  },
  {
    preferredCodes: ['NERVOUS_COMMUNICATION'],
    name: 'الاتصال العصبي',
    aliases: ['الاتصال العصبي', 'عصبي', 'مشابك', 'neurone', 'nervous'],
  },
  {
    preferredCodes: ['EARTH_STRUCTURE'],
    name: 'بنية الكرة الأرضية',
    aliases: [
      'بنية الكرة الأرضية',
      'بنية الارض',
      'الكرة الأرضية',
      'المعطيات الزلزالية',
      'earth structure',
    ],
  },
  {
    preferredCodes: ['PLATE_ACTIVITY'],
    name: 'نشاط الصفائح',
    aliases: [
      'نشاط الصفائح',
      'الصفائح التكتونية',
      'تكتونية الصفائح',
      'زحزحة الصفائح',
      'plate tectonics',
    ],
  },
  {
    preferredCodes: ['TECTONIC_INTERPRETATION'],
    name: 'التفسير التكتوني',
    aliases: [
      'التفسير التكتوني',
      'البنيات الجيولوجية',
      'سلاسل جبلية',
      'tectonic interpretation',
    ],
  },
  {
    preferredCodes: ['MAPS'],
    name: 'الخرائط',
    aliases: ['الخرائط', 'خرائط', 'maps'],
  },
  {
    preferredCodes: ['HISTORICAL_DATES'],
    name: 'التواريخ',
    aliases: ['التواريخ', 'تواريخ', 'dates'],
  },
  {
    preferredCodes: ['ORGANIC_CHEMISTRY'],
    name: 'الكيمياء العضوية',
    aliases: ['الكيمياء العضوية', 'عضوية', 'organic', 'organique'],
  },
];

function normalizeCommandText(value: string) {
  return value.trim().toLocaleLowerCase();
}

function includesAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle.toLocaleLowerCase()));
}

function findBestAliasHint<T extends { aliases: string[] }>(
  text: string,
  hints: T[],
) {
  const normalized = normalizeCommandText(text);

  return (
    hints
      .flatMap((hint) =>
        hint.aliases.map((alias) => ({
          hint,
          alias,
        })),
      )
      .filter(({ alias }) => normalized.includes(alias.toLocaleLowerCase()))
      .sort((left, right) => right.alias.length - left.alias.length)[0]?.hint ??
    null
  );
}

function matchLooseText(value: string | null | undefined, query: string) {
  if (!value || !query) {
    return false;
  }

  const normalizedValue = normalizeCommandText(value);
  const normalizedQuery = normalizeCommandText(query);

  return (
    normalizedValue.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedValue)
  );
}

function findActiveSession(sessions: RecentStudySessionsResponse['data']) {
  return (
    sessions.find(
      (session) =>
        session.status !== 'COMPLETED' && session.status !== 'EXPIRED',
    ) ?? null
  );
}

function subjectFromFilters(
  hint: SubjectHint,
  context?: StudyCommandContext,
): InferredSubject | null {
  const subjects = context?.filters?.subjects ?? [];
  const preferredCode = hint.preferredCodes.find((code) =>
    subjects.some((subject) => subject.code === code),
  );

  if (preferredCode) {
    const subject = subjects.find((item) => item.code === preferredCode);

    if (subject) {
      return {
        code: subject.code,
        name: subject.name,
        canCreateSession: true,
      };
    }
  }

  const subject = subjects.find((item) => {
    const fields = [
      item.code,
      item.name,
      item.family?.code,
      item.family?.name,
      ...item.streams.map((stream) => stream.name),
    ];

    return hint.aliases.some((alias) =>
      fields.some((field) => matchLooseText(field, alias)),
    );
  });

  return subject
    ? {
        code: subject.code,
        name: subject.name,
        canCreateSession: true,
      }
    : null;
}

function subjectFromTopicMention(
  command: string,
  context?: StudyCommandContext,
): InferredSubject | null {
  const topicHint = findBestAliasHint(command, TOPIC_HINTS);

  if (!topicHint) {
    return null;
  }

  const matchingTopic = context?.filters?.topics.find((topic) => {
    const fields = [topic.code, topic.name, topic.slug];
    const preferredCodeMatches = topicHint.preferredCodes.includes(topic.code);
    const aliasMatches = topicHint.aliases.some((alias) =>
      fields.some((field) => matchLooseText(field, alias)),
    );

    return preferredCodeMatches || aliasMatches;
  });
  const topicSubjectCode = matchingTopic?.subject.code ?? null;

  if (!topicSubjectCode) {
    return null;
  }

  const subject = context?.filters?.subjects.find(
    (item) => item.code === topicSubjectCode,
  );

  return subject
    ? {
        code: subject.code,
        name: subject.name,
        canCreateSession: true,
      }
    : null;
}

function inferSubject(
  command: string,
  context?: StudyCommandContext,
  mode?: StudyCommandStarterMode,
): InferredSubject | null {
  const exactSubject = findBestAliasHint(command, SUBJECT_HINTS);

  if (exactSubject) {
    const filteredSubject = subjectFromFilters(exactSubject, context);

    if (filteredSubject) {
      return filteredSubject;
    }

    return {
      code: exactSubject.preferredCodes[0] ?? '',
      name: exactSubject.name,
      canCreateSession: false,
    };
  }

  const topicSubject = subjectFromTopicMention(command, context);

  if (topicSubject) {
    return topicSubject;
  }

  const normalized = normalizeCommandText(command);
  const contextSubjects: ContextSubjectCandidate[] = [
    ...((context?.weakPointInsights[0]?.subject
      ? [
          {
            source: 'weak-points' as const,
            subject: context.weakPointInsights[0].subject,
          },
        ]
      : []) satisfies ContextSubjectCandidate[]),
    ...((context?.curriculumJourneys[0]?.subject
      ? [
          {
            source: 'curriculum' as const,
            subject: context.curriculumJourneys[0].subject,
          },
        ]
      : []) satisfies ContextSubjectCandidate[]),
    ...((context?.recentExamActivities[0]?.subject
      ? [
          {
            source: 'recent-exam' as const,
            subject: context.recentExamActivities[0].subject,
          },
        ]
      : []) satisfies ContextSubjectCandidate[]),
    ...((context?.myMistakes[0]?.exam.subject
      ? [
          {
            source: 'mistake' as const,
            subject: context.myMistakes[0].exam.subject,
          },
        ]
      : []) satisfies ContextSubjectCandidate[]),
    ...((context?.dueFlashcards[0]?.card.subject
      ? [
          {
            source: 'flashcard' as const,
            subject: context.dueFlashcards[0].card.subject,
          },
        ]
      : []) satisfies ContextSubjectCandidate[]),
  ];

  const contextSubject =
    contextSubjects.find((candidate) =>
      shouldUsePassiveContextSubject({
        mode: mode ?? 'BAC_TRAINING',
        command,
        candidate,
      }),
    )?.subject ?? null;

  if (contextSubject) {
    return {
      ...contextSubject,
      canCreateSession: true,
    };
  }

  const filterSubject = context?.filters?.subjects.find((subject) => {
    const fields = [subject.code, subject.name, subject.family?.name];

    return fields.some((field) => matchLooseText(field, normalized));
  });

  return filterSubject
    ? {
        code: filterSubject.code,
        name: filterSubject.name,
        canCreateSession: true,
      }
    : null;
}

function topicSubjectMatches(
  topic: FiltersResponse['topics'][number],
  subject: InferredSubject | null,
) {
  if (!subject?.canCreateSession) {
    return true;
  }

  return (
    topic.subject.code === subject.code ||
    topic.subject.family?.code === subject.code
  );
}

function subjectReferenceMatches(
  subjectRef: { code: string; family?: { code: string } },
  subject: InferredSubject | null,
) {
  if (!subject?.canCreateSession) {
    return true;
  }

  return (
    subjectRef.code === subject.code || subjectRef.family?.code === subject.code
  );
}

function topicFromFilters(
  hint: TopicHint,
  subject: InferredSubject | null,
  context?: StudyCommandContext,
): InferredTopic | null {
  const topics =
    context?.filters?.topics.filter((topic) =>
      topicSubjectMatches(topic, subject),
    ) ?? [];
  const preferredCode = hint.preferredCodes.find((code) =>
    topics.some((topic) => topic.code === code),
  );

  if (preferredCode) {
    const topic = topics.find((item) => item.code === preferredCode);

    if (topic) {
      return {
        code: topic.code,
        name: topic.name,
        slug: topic.slug,
        canUseCode: true,
      };
    }
  }

  const topic = topics.find((item) => {
    const fields = [item.code, item.name, item.slug, item.subject.name];

    return hint.aliases.some((alias) =>
      fields.some((field) => matchLooseText(field, alias)),
    );
  });

  return topic
    ? {
        code: topic.code,
        name: topic.name,
        slug: topic.slug,
        canUseCode: true,
      }
    : null;
}

function inferTopic(
  command: string,
  subject: InferredSubject | null,
  context?: StudyCommandContext,
): InferredTopic | null {
  const directTopic = findBestAliasHint(command, TOPIC_HINTS);

  if (directTopic) {
    const filteredTopic = topicFromFilters(directTopic, subject, context);

    if (filteredTopic) {
      return filteredTopic;
    }

    return {
      code: null,
      name: directTopic.name,
      canUseCode: false,
    };
  }

  const weakPoint = context?.weakPointInsights.find((insight) =>
    subjectReferenceMatches(insight.subject, subject),
  );
  const weakTopic = weakPoint?.topTopics[0] ?? null;

  if (weakTopic) {
    return {
      code: weakTopic.code,
      name: weakTopic.name,
      slug: null,
      canUseCode: true,
    };
  }

  const journeyTopicCode =
    context?.curriculumJourneys[0]?.nextAction?.curriculumNodeCode ??
    context?.curriculumJourneys[0]?.nextAction?.topicCode ??
    null;
  const journeyTopicName =
    context?.curriculumJourneys[0]?.nextAction?.curriculumNodeName ??
    context?.curriculumJourneys[0]?.nextAction?.topicName ??
    null;

  if (journeyTopicCode || journeyTopicName) {
    return {
      code: journeyTopicCode,
      name: journeyTopicName ?? journeyTopicCode ?? 'هذا الجزء',
      slug: null,
      canUseCode: Boolean(journeyTopicCode),
    };
  }

  return null;
}

function inferDeadline(command: string) {
  const normalized = normalizeCommandText(command);

  if (includesAny(normalized, ['غدوة', 'غدا', 'غداً', 'tomorrow', 'demain'])) {
    return 'غداً';
  }

  if (
    includesAny(normalized, [
      'بعد يومين',
      'بعد 2',
      'two days',
      '2 days',
      'deux jours',
    ])
  ) {
    return 'بعد يومين';
  }

  if (includesAny(normalized, ['هذا الأسبوع', 'week', 'semaine'])) {
    return 'هذا الأسبوع';
  }

  return null;
}

function wantsShortSession(command: string) {
  return includesAny(normalizeCommandText(command), [
    'أقصر',
    'قصيرة',
    'خفيفة',
    'shorter',
    'quick',
    '20 دقيقة',
    '20 minutes',
  ]);
}

function wantsMoreExercises(command: string) {
  return includesAny(normalizeCommandText(command), [
    'أصعب',
    'زد تمرين',
    'تمريناً واحداً',
    'تمرين واحد',
    'أكثر',
    'harder',
    'deeper',
  ]);
}

function wantsRecentThreeYears(command: string) {
  return includesAny(normalizeCommandText(command), [
    'آخر 3',
    'اخر 3',
    '3 سنوات',
    'ثلاث سنوات',
    'last 3',
  ]);
}

function hasSimulationIntent(command: string) {
  return includesAny(normalizeCommandText(command), [
    'محاكاة',
    'simulation',
    'bac blanc',
    'mock',
    'اختبار كامل',
    'امتحان كامل',
    'موضوع كامل',
    'full exam',
    'full paper',
    'exam complet',
  ]);
}

function shouldUsePassiveContextSubject(input: {
  mode: StudyCommandStarterMode;
  command: string;
  candidate: ContextSubjectCandidate;
}) {
  const normalized = normalizeCommandText(input.command);

  if (input.mode === 'MISTAKE_REPAIR') {
    return (
      input.candidate.source === 'weak-points' ||
      input.candidate.source === 'mistake'
    );
  }

  if (input.mode === 'MEMORIZATION_REVIEW') {
    return input.candidate.source === 'flashcard';
  }

  if (input.mode === 'CONTINUE_SESSION') {
    return input.candidate.source === 'recent-exam';
  }

  return (
    input.mode === 'LESSON_UNDERSTANDING' &&
    input.candidate.source === 'curriculum' &&
    includesAny(normalized, ['مساري', 'رحلتي', 'الدرس التالي', 'next lesson'])
  );
}

export function inferStudyCommandMode(
  command: string,
  context?: StudyCommandContext,
): StudyCommandStarterMode {
  const normalized = normalizeCommandText(command);

  if (
    findActiveSession(context?.sessions ?? []) &&
    includesAny(normalized, ['واصل', 'كمل', 'continue', 'resume'])
  ) {
    return 'CONTINUE_SESSION';
  }

  if (hasSimulationIntent(normalized)) {
    return 'SIMULATION';
  }

  if (
    includesAny(normalized, [
      'فرض',
      'fard',
      'اختبار',
      'امتحان',
      'test',
      'exam',
      'devoir',
      'controle',
      'contrôle',
      'kontrol',
      'exam school',
    ])
  ) {
    return 'SCHOOL_TEST_PREP';
  }

  if (
    includesAny(normalized, [
      'cours',
      'tutor',
      'أستاذ',
      'استاذ',
      'prof',
      'professeur',
      'دعم',
      'خصوصي',
      'soutien',
      'cour',
    ])
  ) {
    return 'TUTOR_REPLAY';
  }

  if (
    includesAny(normalized, [
      'احفظ',
      'حفظ',
      'راجعلي',
      'تعريف',
      'تعريفات',
      'تواريخ',
      'خرائط',
      'maps',
      'flashcard',
      'بطاقات',
    ])
  ) {
    return 'MEMORIZATION_REVIEW';
  }

  if (includesAny(normalized, ['مختبر', 'lab', 'تجربة', 'visualiser', 'رسم'])) {
    return 'LAB_EXPLORATION';
  }

  if (
    includesAny(normalized, [
      'مافهمتش',
      'لم أفهم',
      'اشرح',
      'شرح',
      'understand',
      'explain',
      'expliquer',
    ])
  ) {
    return 'LESSON_UNDERSTANDING';
  }

  if (
    includesAny(normalized, [
      'أخطائي',
      'اخطائي',
      'غلط',
      'غلطت',
      'غلطة',
      'mistake',
      'weak',
      'weakness',
      'ضعف',
      'نقطة ضعفي',
    ])
  ) {
    return 'MISTAKE_REPAIR';
  }

  if (
    includesAny(normalized, [
      'مكتبة',
      'المكتبة',
      'أرشيف',
      'ارشيف',
      'archive',
      'library',
      'annales',
    ])
  ) {
    return 'LIBRARY_SEARCH';
  }

  if (includesAny(normalized, ['مواضيع', 'باك', 'paper'])) {
    return 'BAC_TRAINING';
  }

  return 'BAC_TRAINING';
}

function buildProposalSteps(input: {
  mode: StudyCommandStarterMode;
  subjectName: string | null;
  topic: string | null;
}) {
  const topic = input.topic ?? input.subjectName ?? 'هذا الجزء';

  switch (input.mode) {
    case 'CONTINUE_SESSION':
      return [
        {
          title: 'الرجوع إلى نفس السياق',
          detail: 'نفتح الجلسة التي توقفت عندها بدون تغيير المسار.',
        },
        {
          title: 'إكمال الأسئلة المتبقية',
          detail: 'نحافظ على نفس التقدم والأخطاء والمراجعة.',
        },
      ];
    case 'SCHOOL_TEST_PREP':
      return [
        {
          title: `ملخص سريع في ${topic}`,
          detail: 'نبدأ بالقواعد والنقاط التي تظهر غالباً في الفروض.',
        },
        {
          title: 'تمارين مركزة',
          detail: 'نختار تدريباً قصيراً بدل فتح مسار طويل.',
        },
        {
          title: 'تثبيت الأخطاء',
          detail: 'أي خطأ واضح يتحول إلى مراجعة لاحقة.',
        },
      ];
    case 'TUTOR_REPLAY':
      return [
        {
          title: 'استرجاع ما حدث في الحصة',
          detail: 'نحوّل موضوع الحصة إلى recap قصير قبل التمارين.',
        },
        {
          title: 'تمارين مشابهة',
          detail: 'نفتح تدريباً قريباً من نفس الفكرة حتى تثبت الطريقة.',
        },
      ];
    case 'MEMORIZATION_REVIEW':
      return [
        {
          title: 'استدعاء سريع',
          detail: 'نبدأ بالبطاقات المستحقة أو الأقرب لموضوعك.',
        },
        {
          title: 'تحويل الضعف إلى حفظ',
          detail: 'التعريفات والقوانين المهمة تبقى في مسار مراجعة.',
        },
      ];
    case 'LESSON_UNDERSTANDING':
      return [
        {
          title: `فتح شرح ${topic}`,
          detail: 'نبدأ من الدرس بدل القفز مباشرة إلى التمارين.',
        },
        {
          title: 'مثال ثم تطبيق',
          detail: 'بعد الفهم ننتقل إلى سؤال قصير يختبر الفكرة.',
        },
      ];
    case 'SIMULATION':
      return [
        {
          title: 'جلسة بتوقيت واضح',
          detail: 'نفتح وضعاً صارماً قريباً من الامتحان.',
        },
        {
          title: 'تشخيص بعد النهاية',
          detail: 'النتيجة تتحول إلى أخطاء ونقاط ضعف قابلة للعلاج.',
        },
      ];
    case 'MISTAKE_REPAIR':
      return [
        {
          title: 'أخطاء مستحقة',
          detail: 'نبدأ بما ظهر سابقاً بدل البحث من الصفر.',
        },
        {
          title: 'تمارين علاجية',
          detail: 'نربط الخطأ بسؤال مشابه لتثبيت الطريقة.',
        },
      ];
    case 'LAB_EXPLORATION':
      return [
        {
          title: 'تجربة بصرية',
          detail: 'نفتح المختبر عندما يكون الفهم البصري مفيداً.',
        },
        {
          title: 'ربطها بسؤال',
          detail: 'المهمة لا تبقى لعبة؛ نربطها بما يمكن أن يظهر في BAC.',
        },
      ];
    case 'LIBRARY_SEARCH':
    case 'BAC_TRAINING':
      return [
        {
          title: 'تدريب على نمط BAC',
          detail: 'نبدأ من أسئلة رسمية أو قريبة من الرسمي.',
        },
        {
          title: 'تصحيح موثوق',
          detail: 'التصحيح الرسمي يسبق أي شرح إضافي.',
        },
      ];
  }
}

function buildProposalRationale(input: {
  mode: StudyCommandStarterMode;
  subjectName: string | null;
  topic: string | null;
  deadline: string | null;
}) {
  const target = input.topic ?? input.subjectName ?? 'هذا الهدف';

  switch (input.mode) {
    case 'SCHOOL_TEST_PREP':
      return input.deadline
        ? `لأن عندك موعداً قريباً، نضغط ${target} في جلسة قصيرة تجمع تذكيراً سريعاً وتماريناً مباشرة.`
        : `نحوّل ${target} إلى جلسة مراجعة قصيرة بدل فتح مسار طويل.`;
    case 'TUTOR_REPLAY':
      return `نستعمل موضوع الحصة كمدخل، ثم نثبت الفهم بتمارين قريبة من نفس الفكرة.`;
    case 'MEMORIZATION_REVIEW':
      return `هذا النوع مناسب للحفظ السريع: تعريفات، قوانين، خرائط، تواريخ، أو نقاط متكررة.`;
    case 'LESSON_UNDERSTANDING':
      return `نبدأ من الفهم أولاً، ثم ننتقل إلى تطبيق صغير حتى لا يبقى الشرح معزولاً.`;
    case 'SIMULATION':
      return `المحاكاة مناسبة عندما تريد قياساً صارماً ثم تشخيصاً بعد النهاية.`;
    case 'MISTAKE_REPAIR':
      return `نبدأ من الأخطاء أو إشارات الضعف لأنها أقصر طريق لمنع تكرار نفس الخسارة.`;
    case 'LAB_EXPLORATION':
      return `المختبر مناسب عندما تحتاج أن ترى المفهوم يتحرك قبل العودة إلى التمرين.`;
    case 'CONTINUE_SESSION':
      return `لديك جلسة مفتوحة؛ إكمالها يقلل التشتت ويحافظ على السياق.`;
    case 'LIBRARY_SEARCH':
    case 'BAC_TRAINING':
      return `نبدأ من تدريب قريب من BAC حتى تبقى المراجعة مرتبطة بما سيظهر في الامتحان.`;
  }
}

function buildDefaultStreamCodes(input: {
  subject: InferredSubject | null;
  context?: StudyCommandContext;
}) {
  const userStreamCode = input.context?.userStreamCode ?? null;

  if (!input.subject?.canCreateSession) {
    return userStreamCode ? [userStreamCode] : undefined;
  }

  const filters = input.context?.filters;

  if (!filters) {
    return userStreamCode ? [userStreamCode] : undefined;
  }

  const subject = filters.subjects.find(
    (item) => item.code === input.subject?.code,
  );
  const subjectStreamCodes = subject?.streamCodes ?? [];

  if (!subjectStreamCodes.length) {
    return undefined;
  }

  if (!userStreamCode) {
    return subjectStreamCodes;
  }

  const matchingStreamCodes = filters.streams
    .filter(
      (stream) =>
        subjectStreamCodes.includes(stream.code) &&
        (stream.code === userStreamCode ||
          stream.family?.code === userStreamCode),
    )
    .map((stream) => stream.code);

  return matchingStreamCodes.length ? matchingStreamCodes : subjectStreamCodes;
}

function buildDefaultYears(
  mode: StudyCommandStarterMode,
  command: string,
  context?: StudyCommandContext,
) {
  const years = context?.filters?.years ?? [];

  if (!years.length) {
    return undefined;
  }

  if (wantsRecentThreeYears(command)) {
    return years.slice(0, 3);
  }

  if (mode === 'BAC_TRAINING') {
    return years.slice(0, 5);
  }

  return years.slice(0, 3);
}

function buildDefaultSessionTypes(context?: StudyCommandContext) {
  const sessionTypes = context?.filters?.sessionTypes ?? [];
  return sessionTypes.length
    ? sessionTypes
    : (['NORMAL', 'MAKEUP'] as SessionType[]);
}

function buildDefaultExerciseCount(
  mode: StudyCommandStarterMode,
  command: string,
) {
  const baseCount = (() => {
    switch (mode) {
      case 'BAC_TRAINING':
        return 4;
      case 'SCHOOL_TEST_PREP':
      case 'TUTOR_REPLAY':
        return 3;
      default:
        return 2;
    }
  })();

  if (wantsShortSession(command)) {
    return Math.max(1, baseCount - 1);
  }

  if (wantsMoreExercises(command)) {
    return Math.min(8, baseCount + 1);
  }

  return baseCount;
}

function canCreateStudySessionFromMode(mode: StudyCommandStarterMode) {
  return (
    mode === 'SCHOOL_TEST_PREP' ||
    mode === 'TUTOR_REPLAY' ||
    mode === 'BAC_TRAINING'
  );
}

function hasCatalogCoverage(input: {
  subject: InferredSubject | null;
  context?: StudyCommandContext;
}) {
  if (!input.subject?.canCreateSession || !input.context?.catalog) {
    return true;
  }

  const userStreamCode = input.context.userStreamCode ?? null;
  const streams = userStreamCode
    ? input.context.catalog.streams.filter(
        (stream) => stream.code === userStreamCode,
      )
    : input.context.catalog.streams;

  return streams.some((stream) =>
    stream.subjects.some((subject) => subject.code === input.subject?.code),
  );
}

function buildEstimatedMinutes(mode: StudyCommandStarterMode, command: string) {
  const baseMinutes = {
    SCHOOL_TEST_PREP: 35,
    TUTOR_REPLAY: 30,
    BAC_TRAINING: 35,
    LESSON_UNDERSTANDING: 25,
    MEMORIZATION_REVIEW: 15,
    SIMULATION: 90,
    MISTAKE_REPAIR: 25,
    LAB_EXPLORATION: 20,
    LIBRARY_SEARCH: 15,
    CONTINUE_SESSION: 20,
  }[mode];

  if (!canCreateStudySessionFromMode(mode)) {
    return baseMinutes;
  }

  if (wantsShortSession(command)) {
    return Math.max(15, baseMinutes - 10);
  }

  if (wantsMoreExercises(command)) {
    return baseMinutes + 10;
  }

  return baseMinutes;
}

function buildFineTuneOptions(mode: StudyCommandStarterMode) {
  if (canCreateStudySessionFromMode(mode)) {
    return ['اجعلها أقصر', 'زد تمريناً واحداً', 'آخر 3 سنوات فقط'];
  }

  if (mode === 'CONTINUE_SESSION') {
    return ['راجع الأخطاء أولاً', 'أكمل بسرعة'];
  }

  return [];
}

function buildSubjectClarificationOptions(context?: StudyCommandContext) {
  const userStreamCode = context?.userStreamCode ?? null;
  const subjects = context?.filters?.subjects ?? [];
  const userStreamSubjects = userStreamCode
    ? subjects.filter((subject) =>
        subject.streams.some(
          (stream) =>
            stream.code === userStreamCode ||
            stream.family?.code === userStreamCode,
        ),
      )
    : [];
  const candidates = userStreamSubjects.length ? userStreamSubjects : subjects;

  return candidates
    .filter((subject) =>
      context?.catalog
        ? hasCatalogCoverage({
            subject: {
              code: subject.code,
              name: subject.name,
              canCreateSession: true,
            },
            context,
          })
        : true,
    )
    .slice(0, 5)
    .map((subject) => subject.name);
}

function buildProposalClarification(input: {
  mode: StudyCommandStarterMode;
  subject: InferredSubject | null;
  context?: StudyCommandContext;
}): StudyCommandClarification | undefined {
  const subjectRequiredModes: StudyCommandStarterMode[] = [
    'SCHOOL_TEST_PREP',
    'TUTOR_REPLAY',
    'BAC_TRAINING',
    'LESSON_UNDERSTANDING',
    'SIMULATION',
    'LAB_EXPLORATION',
  ];

  if (!subjectRequiredModes.includes(input.mode)) {
    return undefined;
  }

  if (input.subject?.canCreateSession) {
    return undefined;
  }

  return {
    question: 'أي مادة تقصد؟',
    options: buildSubjectClarificationOptions(input.context),
  };
}

function buildSurfaceAvailability(input: {
  mode: StudyCommandStarterMode;
  subject: InferredSubject | null;
  context?: StudyCommandContext;
}) {
  switch (input.mode) {
    case 'MEMORIZATION_REVIEW':
      return input.context?.dueFlashcards.length
        ? {
            status: 'READY' as const,
            matchingExerciseCount: input.context.dueFlashcards.length,
          }
        : {
            status: 'NEEDS_CONTENT' as const,
            matchingExerciseCount: 0,
            message:
              'لا توجد بطاقات مستحقة الآن. افتح البطاقات لاختيار Deck أو إنشاء بطاقات من الدروس والتمارين.',
          };
    case 'MISTAKE_REPAIR':
      return (input.context?.myMistakes.length ?? 0) > 0 ||
        (input.context?.weakPointInsights.length ?? 0) > 0
        ? {
            status: 'READY' as const,
            matchingExerciseCount:
              (input.context?.myMistakes.length ?? 0) +
              (input.context?.weakPointInsights.length ?? 0),
          }
        : {
            status: 'NEEDS_CONTENT' as const,
            matchingExerciseCount: 0,
            message:
              'لا توجد أخطاء أو إشارات ضعف كافية بعد. ابدأ تدريباً قصيراً حتى نبني حلقة إصلاح حقيقية.',
          };
    case 'LAB_EXPLORATION':
      if (!input.subject?.canCreateSession) {
        return undefined;
      }

      return findMatchingReadyLabTool(input.subject, input.context)
        ? {
            status: 'READY' as const,
            matchingExerciseCount: 1,
          }
        : {
            status: 'NEEDS_CONTENT' as const,
            matchingExerciseCount: 0,
            message:
              'لا يوجد مختبر جاهز لهذا السياق حالياً. افتح صفحة المختبر لرؤية الأدوات المتاحة عند نشرها.',
          };
    case 'LIBRARY_SEARCH':
      return input.context?.catalog?.streams.length
        ? {
            status: 'READY' as const,
          }
        : {
            status: 'NEEDS_CONTENT' as const,
            matchingExerciseCount: 0,
            message:
              'لا توجد مواضيع منشورة كافية في المكتبة لهذا الطلب حالياً.',
          };
    default:
      return undefined;
  }
}

function buildLessonHref(input: {
  subjectCode: string | null;
  topic: InferredTopic | null;
}) {
  if (!input.subjectCode) {
    return STUDENT_COURSES_ROUTE;
  }

  if (input.topic?.slug) {
    return buildStudentCourseTopicRoute(input.subjectCode, input.topic.slug);
  }

  return buildStudentCourseSubjectRoute(input.subjectCode);
}

function findMatchingReadyLabTool(
  subject: InferredSubject | null,
  context?: StudyCommandContext,
) {
  if (!subject?.canCreateSession) {
    return null;
  }

  return (
    context?.labTools.find((tool) => {
      if (tool.status !== 'READY') {
        return false;
      }

      return tool.subject
        ? subjectReferenceMatches(tool.subject, subject)
        : false;
    }) ?? null
  );
}

function buildLabHref(input: {
  subject: InferredSubject | null;
  context?: StudyCommandContext;
}) {
  const subjectCode = input.subject?.canCreateSession
    ? input.subject.code
    : null;
  const matchingTool = findMatchingReadyLabTool(input.subject, input.context);
  const subjectSlug = subjectCodeToLabSlug(
    matchingTool?.subject?.code ?? subjectCode,
  );

  if (!matchingTool || !subjectSlug) {
    return buildStudentLabRoute(subjectCode);
  }

  return buildStudentLabToolRoute(subjectSlug, matchingTool.slug);
}

function buildLibraryHref(input: {
  subjectCode: string | null;
  context?: StudyCommandContext;
}) {
  return buildStudentLibraryRoute({
    streamCode: input.context?.userStreamCode ?? null,
    subjectCode: input.subjectCode,
  });
}

function findCatalogTrainingSubject(context: StudyCommandContext) {
  const streams = context.userStreamCode
    ? context.catalog?.streams.filter(
        (stream) =>
          stream.code === context.userStreamCode ||
          stream.family?.code === context.userStreamCode,
      )
    : context.catalog?.streams;
  const candidates =
    streams?.flatMap((stream) =>
      stream.subjects.map((subject) => ({
        stream,
        subject,
        exerciseCount: subject.years.reduce(
          (sum, year) =>
            sum +
            year.sujets.reduce(
              (yearSum, sujet) => yearSum + sujet.exerciseCount,
              0,
            ),
          0,
        ),
        latestYear: Math.max(...subject.years.map((year) => year.year)),
      })),
    ) ?? [];

  return (
    candidates
      .filter((candidate) => candidate.exerciseCount > 0)
      .sort((left, right) => {
        if (right.latestYear !== left.latestYear) {
          return right.latestYear - left.latestYear;
        }

        return right.exerciseCount - left.exerciseCount;
      })[0] ?? null
  );
}

function buildProposalAction(input: {
  mode: StudyCommandStarterMode;
  command: string;
  title: string;
  primaryHref: string;
  subject: InferredSubject | null;
  topic: InferredTopic | null;
  context?: StudyCommandContext;
}): StudyCommandProposalAction {
  if (
    !canCreateStudySessionFromMode(input.mode) ||
    !input.subject?.canCreateSession ||
    !hasCatalogCoverage({
      subject: input.subject,
      context: input.context,
    })
  ) {
    return {
      kind: 'OPEN_ROUTE',
      href: input.primaryHref,
    };
  }

  const topicCodes =
    input.topic?.canUseCode && input.topic.code
      ? [input.topic.code]
      : undefined;
  const streamCodes = buildDefaultStreamCodes({
    subject: input.subject,
    context: input.context,
  });

  return {
    kind: 'CREATE_STUDY_SESSION',
    request: {
      title: input.title,
      subjectCode: input.subject.code,
      kind: topicCodes?.length ? 'TOPIC_DRILL' : 'MIXED_DRILL',
      topicCodes,
      streamCodes,
      years: buildDefaultYears(input.mode, input.command, input.context),
      sessionTypes: buildDefaultSessionTypes(input.context),
      exerciseCount: buildDefaultExerciseCount(input.mode, input.command),
      timingEnabled: false,
    },
  };
}

export function buildStudyCommandProposal(
  command: string,
  context?: StudyCommandContext,
): StudyCommandProposal | null {
  const trimmedCommand = command.trim();

  if (!trimmedCommand) {
    return null;
  }

  const activeSession = findActiveSession(context?.sessions ?? []);
  const mode = inferStudyCommandMode(trimmedCommand, context);
  const subject = inferSubject(trimmedCommand, context, mode);
  const topic = inferTopic(trimmedCommand, subject, context);
  const deadline = inferDeadline(trimmedCommand);
  const subjectName = subject?.name ?? null;
  const subjectCode = subject?.canCreateSession ? subject.code : null;
  const topicName = topic?.name ?? null;
  const topicCodes = topic?.canUseCode && topic.code ? [topic.code] : [];

  if (mode === 'CONTINUE_SESSION' && activeSession) {
    const title =
      activeSession.title ?? formatStudySessionKind(activeSession.kind);
    const href = buildStudentTrainingSessionRoute(activeSession.id);

    return {
      mode,
      title: `مواصلة ${title}`,
      subtitle: 'نرجع مباشرة إلى آخر موضع توقفت عنده.',
      estimatedMinutes: 20,
      rationale: 'لديك جلسة مفتوحة؛ إكمالها يقلل التشتت ويحافظ على السياق.',
      primaryHref: href,
      primaryLabel: 'مواصلة الجلسة',
      primaryAction: {
        kind: 'OPEN_ROUTE',
        href,
      },
      steps: buildProposalSteps({ mode, subjectName, topic: topicName }),
      fineTuneOptions: ['راجع الأخطاء أولاً', 'أكمل بسرعة'],
    };
  }

  const titleSubject = subjectName ? `${subjectName}` : 'جلسة BAC';
  const topicSuffix = topicName ? ` · ${topicName}` : '';
  const deadlineSuffix = deadline ? ` · ${deadline}` : '';
  const baseTitle = {
    SCHOOL_TEST_PREP: `تحضير فرض ${titleSubject}${topicSuffix}`,
    TUTOR_REPLAY: `استرجاع حصة ${titleSubject}${topicSuffix}`,
    BAC_TRAINING: `تدريب BAC ${titleSubject}${topicSuffix}`,
    LESSON_UNDERSTANDING: `فهم درس ${titleSubject}${topicSuffix}`,
    MEMORIZATION_REVIEW: `مراجعة حفظ ${titleSubject}${topicSuffix}`,
    SIMULATION: `محاكاة ${titleSubject}`,
    MISTAKE_REPAIR: `إصلاح أخطاء ${titleSubject}${topicSuffix}`,
    LAB_EXPLORATION: `مختبر ${titleSubject}${topicSuffix}`,
    LIBRARY_SEARCH: `بحث في مكتبة ${titleSubject}${topicSuffix}`,
    CONTINUE_SESSION: `مواصلة الدراسة`,
  }[mode];

  const primaryHref = {
    SCHOOL_TEST_PREP: buildStudentTrainingDrillRoute({
      subjectCode,
      topicCodes,
    }),
    TUTOR_REPLAY: buildStudentTrainingDrillRoute({
      subjectCode,
      topicCodes,
    }),
    BAC_TRAINING: buildStudentTrainingDrillRoute({
      subjectCode,
      topicCodes,
    }),
    LESSON_UNDERSTANDING: buildLessonHref({
      subjectCode,
      topic,
    }),
    MEMORIZATION_REVIEW: STUDENT_FLASHCARDS_ROUTE,
    SIMULATION: buildStudentTrainingSimulationRoute(subjectCode),
    MISTAKE_REPAIR: buildStudentTrainingWeakPointsRoute(subjectCode),
    LAB_EXPLORATION: buildLabHref({
      subject,
      context,
    }),
    LIBRARY_SEARCH: buildLibraryHref({
      subjectCode,
      context,
    }),
    CONTINUE_SESSION: STUDENT_TRAINING_ROUTE,
  }[mode];

  const estimatedMinutes = buildEstimatedMinutes(mode, trimmedCommand);
  const title = `${baseTitle}${deadlineSuffix}`;
  const clarification = buildProposalClarification({
    mode,
    subject,
    context,
  });
  const availability = buildSurfaceAvailability({
    mode,
    subject,
    context,
  });
  const primaryAction = buildProposalAction({
    mode,
    command: trimmedCommand,
    title,
    primaryHref,
    subject,
    topic,
    context,
  });

  return {
    mode,
    title,
    subtitle: trimmedCommand,
    estimatedMinutes,
    rationale: buildProposalRationale({
      mode,
      subjectName,
      topic: topicName,
      deadline,
    }),
    clarification,
    availability,
    primaryHref,
    primaryLabel:
      clarification && primaryAction.kind === 'OPEN_ROUTE'
        ? 'فتح اختيار المادة'
        : primaryAction.kind === 'OPEN_ROUTE' &&
            canCreateStudySessionFromMode(mode)
          ? 'ضبط الجلسة'
          : mode === 'MEMORIZATION_REVIEW'
            ? 'فتح البطاقات'
            : mode === 'LESSON_UNDERSTANDING'
              ? 'فتح الدروس'
              : mode === 'SIMULATION'
                ? 'فتح المحاكاة'
                : mode === 'LAB_EXPLORATION'
                  ? 'فتح المختبر'
                  : 'بدء الجلسة',
    primaryAction,
    steps: buildProposalSteps({ mode, subjectName, topic: topicName }),
    fineTuneOptions: clarification?.options.length
      ? clarification.options
      : buildFineTuneOptions(mode),
  };
}

export function markStudyCommandProposalReady(
  proposal: StudyCommandProposal,
  matchingExerciseCount: number,
): StudyCommandProposal {
  return {
    ...proposal,
    availability: {
      status: 'READY',
      matchingExerciseCount,
    },
  };
}

export function markStudyCommandProposalUnavailable(
  proposal: StudyCommandProposal,
  message = 'لم نجد تمارين مطابقة بهذا الربط المنهجي حالياً. افتح إعداد الجلسة وغيّر الموضوع أو السنوات.',
): StudyCommandProposal {
  return {
    ...proposal,
    availability: {
      status: 'UNAVAILABLE',
      matchingExerciseCount: 0,
      message,
    },
    primaryLabel: 'فتح إعداد الجلسة',
    primaryAction: {
      kind: 'OPEN_ROUTE',
      href: proposal.primaryHref,
    },
  };
}

export function markStudyCommandProposalNeedsContent(
  proposal: StudyCommandProposal,
  message = 'لم نجد تمارين مطابقة بهذا الربط المنهجي حالياً. افتح إعداد الجلسة وغيّر الموضوع أو السنوات.',
): StudyCommandProposal {
  return {
    ...proposal,
    availability: {
      status: 'NEEDS_CONTENT',
      matchingExerciseCount: 0,
      message,
    },
    primaryLabel: 'فتح إعداد الجلسة',
    primaryAction: {
      kind: 'OPEN_ROUTE',
      href: proposal.primaryHref,
    },
  };
}

export function buildStudyCommandStarters(
  context: StudyCommandContext,
): StudyCommandStarter[] {
  const starters: StudyCommandStarter[] = [];
  const activeSession = findActiveSession(context.sessions);

  if (activeSession) {
    const title =
      activeSession.title ?? formatStudySessionKind(activeSession.kind);
    starters.push({
      id: `active-session:${activeSession.id}`,
      title: `واصل ${title}`,
      prompt: `أريد مواصلة جلسة ${title} الآن`,
      reason: 'جلسة مفتوحة من آخر دراسة',
      tone: 'primary',
      mode: 'CONTINUE_SESSION',
      href: buildStudentTrainingSessionRoute(activeSession.id),
    });
  }

  if (context.dueFlashcards.length > 0) {
    const firstCardSubject = context.dueFlashcards[0]?.card.subject?.name;
    starters.push({
      id: 'due-flashcards',
      title: `${context.dueFlashcards.length} بطاقة مستحقة`,
      prompt: firstCardSubject
        ? `أريد مراجعة بطاقات ${firstCardSubject} المستحقة بسرعة`
        : 'أريد مراجعة البطاقات المستحقة بسرعة',
      reason: firstCardSubject
        ? `مراجعة حفظ في ${firstCardSubject}`
        : 'مراجعة حفظ جاهزة',
      tone: 'cool',
      mode: 'MEMORIZATION_REVIEW',
      href: STUDENT_FLASHCARDS_ROUTE,
    });
  }

  const dueMistake =
    context.myMistakes.find((mistake) => mistake.isDue) ??
    context.myMistakes[0] ??
    null;

  if (dueMistake) {
    starters.push({
      id: `mistake:${dueMistake.exerciseNodeId}`,
      title: `أصلح أخطاء ${dueMistake.exam.subject.name}`,
      prompt: `أريد إصلاح أخطائي في ${dueMistake.exam.subject.name}`,
      reason: dueMistake.isDue ? 'خطأ مستحق الآن' : 'آخر خطأ مفتوح',
      tone: 'danger',
      mode: 'MISTAKE_REPAIR',
      href: buildStudentTrainingWeakPointsRoute(dueMistake.exam.subject.code),
    });
  }

  const weakPoint = context.weakPointInsights[0] ?? null;

  if (weakPoint) {
    const weakTopicNames = weakPoint.topTopics
      .slice(0, 2)
      .map((topic) => topic.name)
      .join(' و ');
    starters.push({
      id: `weak-point:${weakPoint.subject.code}`,
      title: weakTopicNames
        ? `دريل علاجي في ${weakTopicNames}`
        : `دريل علاجي في ${weakPoint.subject.name}`,
      prompt: weakTopicNames
        ? `أريد جلسة قصيرة لإصلاح ${weakTopicNames} في ${weakPoint.subject.name}`
        : `أريد جلسة قصيرة لإصلاح نقطة ضعفي في ${weakPoint.subject.name}`,
      reason: `${weakPoint.weakSignalCount} إشارات ضعف`,
      tone: 'warning',
      mode: 'MISTAKE_REPAIR',
      href: buildStudentTrainingWeakPointsRoute(weakPoint.subject.code),
    });
  }

  const journey = context.curriculumJourneys[0] ?? null;

  if (journey?.nextAction) {
    starters.push({
      id: `journey:${journey.id}`,
      title: journey.nextAction.label,
      prompt: `حوّل ${journey.nextAction.label} في ${journey.subject.name} إلى جلسة دراسة`,
      reason: 'من مسار المنهج',
      tone: 'neutral',
      mode:
        journey.nextAction.type === 'REVIEW_MISTAKES'
          ? 'MISTAKE_REPAIR'
          : 'BAC_TRAINING',
      href:
        journey.nextAction.type === 'PAPER_SIMULATION'
          ? STUDENT_TRAINING_SIMULATION_ROUTE
          : buildStudentTrainingDrillRoute({
              subjectCode: journey.subject.code,
              topicCodes: journey.nextAction.curriculumNodeCode
                ? [journey.nextAction.curriculumNodeCode]
                : [],
            }),
    });
  }

  const labTool =
    context.labTools.find((tool) => tool.inProgressMissionCount > 0) ??
    context.labTools.find(
      (tool) => tool.completedMissionCount < tool.missionCount,
    ) ??
    null;

  if (labTool) {
    const labSubjectName = labTool.subject?.name ?? 'هذا المفهوم';

    starters.push({
      id: `lab:${labTool.id}`,
      title: labTool.inProgressMissionCount
        ? `أكمل مهمة ${labTool.title}`
        : `افهم ${labSubjectName} بالمختبر`,
      prompt: `أريد استعمال ${labTool.title} لفهم ${labSubjectName}`,
      reason: labTool.inProgressMissionCount
        ? 'مهمة مختبر بدأت سابقاً'
        : 'مختبر مرتبط بالمادة',
      tone: 'cool',
      mode: 'LAB_EXPLORATION',
      href: STUDENT_LAB_ROUTE,
    });
  }

  const catalogTrainingSubject = findCatalogTrainingSubject(context);

  if (
    catalogTrainingSubject &&
    !starters.some(
      (starter) =>
        starter.mode === 'BAC_TRAINING' &&
        starter.prompt.includes(catalogTrainingSubject.subject.name),
    )
  ) {
    starters.push({
      id: `catalog-training:${catalogTrainingSubject.stream.code}:${catalogTrainingSubject.subject.code}`,
      title: `BAC ${catalogTrainingSubject.subject.name}`,
      prompt: `أريد تدريب BAC في ${catalogTrainingSubject.subject.name} آخر 3 سنوات فقط`,
      reason: `متوفر لشعبة ${catalogTrainingSubject.stream.name}`,
      tone: 'neutral',
      mode: 'BAC_TRAINING',
      href: buildStudentTrainingDrillRoute({
        subjectCode: catalogTrainingSubject.subject.code,
      }),
    });
  }

  const recentExam = context.recentExamActivities[0] ?? null;

  if (recentExam) {
    starters.push({
      id: `recent-exam:${recentExam.examId}:${recentExam.sujetNumber}`,
      title: `تدريب شبيه بباك ${recentExam.year}`,
      prompt: `أريد تدريب BAC في ${recentExam.subject.name} مثل موضوع ${recentExam.year}`,
      reason: 'من آخر موضوع فتحته',
      tone: 'neutral',
      mode: 'BAC_TRAINING',
      href: buildStudentTrainingDrillRoute({
        subjectCode: recentExam.subject.code,
      }),
    });
  }

  const uniqueStarters = new Map<string, StudyCommandStarter>();

  for (const starter of starters) {
    if (!uniqueStarters.has(starter.id)) {
      uniqueStarters.set(starter.id, starter);
    }
  }

  return [...uniqueStarters.values()].slice(0, 6);
}
