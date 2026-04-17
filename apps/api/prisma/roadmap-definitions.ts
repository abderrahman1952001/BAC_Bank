type RoadmapTopicSummary = {
  code: string;
  name: string;
  studentLabel: string | null;
  childrenCount: number;
  displayOrder: number;
};

type RoadmapNodeSeedDefinition = {
  topicCode: string;
  title?: string;
  description?: string;
  estimatedSessions?: number;
  isOptional?: boolean;
  recommendedPreviousTopicCode?: string | null;
};

type RoadmapSectionSeedDefinition = {
  code: string;
  title: string;
  description?: string;
  nodes: RoadmapNodeSeedDefinition[];
};

type SubjectRoadmapSeedDefinition = {
  title?: string;
  description?: string;
  sections: RoadmapSectionSeedDefinition[];
};

export type ResolvedRoadmapNodeDefinition = {
  topicCode: string;
  title: string;
  description: string | null;
  estimatedSessions: number;
  isOptional: boolean;
  recommendedPreviousTopicCode: string | null;
};

export type ResolvedRoadmapSectionDefinition = {
  code: string;
  title: string;
  description: string | null;
  nodes: ResolvedRoadmapNodeDefinition[];
};

export type ResolvedSubjectRoadmapDefinition = {
  title: string;
  description: string | null;
  sections: ResolvedRoadmapSectionDefinition[];
};

const CURATED_ROADMAP_OVERRIDES: Record<string, SubjectRoadmapSeedDefinition> = {
  MATHEMATICS: {
    title: "خارطة الرياضيات",
    description:
      "مسار مراجعة متدرج يثبت التحليل أولاً ثم ينتقل إلى النمذجة والهندسة قبل المحاكاة.",
    sections: [
      {
        code: "ANALYSIS_CORE",
        title: "التحليل والأساس",
        description:
          "هذه المرحلة تبني المحاور التي تظهر كثيراً وتؤثر على ثقة الطالب في المادة كلها.",
        nodes: [
          {
            topicCode: "FUNCTIONS",
            description:
              "راجع دراسة الدوال والأسية واللوغاريتم حتى تصبح القراءة السريعة للمنحنى طبيعية.",
          },
          {
            topicCode: "SEQUENCES",
            description:
              "ثبّت البرهنة في المتتاليات، الحصر، والاستدلال على النهايات قبل الانتقال للتكامل.",
          },
          {
            topicCode: "INTEGRALS",
            description:
              "درّب اختيار طريقة التكامل المناسبة وربط النتيجة بالمساحة والتفسير الهندسي.",
          },
        ],
      },
      {
        code: "MODELING_AND_SPACE",
        title: "النمذجة والفضاء",
        description:
          "بعد تثبيت الأساس، ركّز على النمذجة الاحتمالية والأدوات الجبرية والهندسة في الفضاء.",
        nodes: [
          {
            topicCode: "PROBABILITY",
            description:
              "ابنِ النماذج الاحتمالية خطوة بخطوة مع الانتباه لقراءة المعطيات والشجرة أو الجداول.",
          },
          {
            topicCode: "COMPLEX_NUMBERS",
            description:
              "ثبّت الانتقال بين الكتابات المختلفة للأعداد المركبة واستعمالها في التمثيل الهندسي.",
          },
          {
            topicCode: "SPACE_GEOMETRY",
            description:
              "اختم بالاستدلال في الفضاء، المتجهات، والمستقيمات والمستويات تحت ضغط BAC الحقيقي.",
          },
        ],
      },
    ],
  },
  PHYSICS: {
    title: "خارطة الفيزياء",
    description:
      "مسار يبدأ بالكيمياء المنظمة ثم ينتقل إلى الكهرباء والميكانيك قبل الإغلاق بالتحولات النووية.",
    sections: [
      {
        code: "CHEMISTRY",
        title: "الكيمياء المنظمة",
        description:
          "ابدأ بالمحاور التي تعتمد على خطوات واضحة ومنهجية ثابتة لرفع الثقة سريعاً.",
        nodes: [
          {
            topicCode: "CHEMICAL_TRANSFORMATIONS",
            description:
              "راجع تقدم التحول، الجداول، واستنتاج الحالة النهائية بدون ارتباك في الترميز.",
          },
          {
            topicCode: "CHEMICAL_EQUILIBRIUM",
            description:
              "ثبّت شروط التوازن والكميات المميزة وكيفية تبرير الاتجاه التطوري للنظام.",
          },
          {
            topicCode: "DIFFUSION",
            description:
              "استعمل الانتشار كمحور قصير لتثبيت القراءة الفيزيائية للعلاقة بين الظاهرة والنموذج.",
          },
        ],
      },
      {
        code: "FIELDS_AND_MOTION",
        title: "الكهرباء والحركة",
        description:
          "هذه المرحلة تجمع المحاور الأكثر ثقلاً في الامتحان وتحتاج انتظاماً أكثر من الحفظ.",
        nodes: [
          {
            topicCode: "ELECTRICITY",
            description:
              "راجع الدارات، الاستجابة الزمنية، والقراءة المنهجية للمنحنيات والتوصيلات.",
          },
          {
            topicCode: "MECHANICS",
            description:
              "ثبّت الرسم، الجرد الطاقوي، والتعامل مع النواقل قبل الدخول في التفاصيل الحسابية.",
          },
          {
            topicCode: "OSCILLATIONS",
            description:
              "أعد بناء حدسك حول الاهتزازات الدورية، الطور، والطاقة داخل التمرين الطويل.",
          },
          {
            topicCode: "NUCLEAR_TRANSFORMATIONS",
            description:
              "اختم بالتحولات النووية وربط العلاقات بالحفظ والوحدات قبل المحاكاة الكاملة.",
          },
        ],
      },
    ],
  },
  NATURAL_SCIENCES: {
    title: "خارطة علوم الطبيعة",
    description:
      "مسار هادئ يركز على فهم المنطق البيولوجي قبل تكثيف تطبيقات الوثائق والتحليل.",
    sections: [
      {
        code: "LIVING_SYSTEMS",
        title: "الأنظمة الحية",
        description:
          "ابدأ بالمحاور التي تبني اللغة العلمية والمنهجية الأساسية في تحليل الوثائق.",
        nodes: [
          {
            topicCode: "PROTEINS",
            description:
              "راجع العلاقة بين البنية والوظيفة، التركيب، والآليات المنظمة حتى تصبح الوثائق أوضح.",
          },
          {
            topicCode: "ENERGY_TRANSFORMATIONS",
            description:
              "ثبّت تحويل الطاقة من خلال الربط بين التركيب الضوئي والتنفس والتخمر.",
          },
        ],
      },
      {
        code: "EARTH_DYNAMIC",
        title: "ديناميكية الأرض",
        description:
          "اختم بالمحور الجيولوجي مع تدريب على القراءة الدقيقة للوثائق والتفسير المرحلي.",
        nodes: [
          {
            topicCode: "PLATE_TECTONICS",
            description:
              "درّب تفسير الظواهر التكتونية وبناء الاستنتاج من الخرائط والرسوم والوثائق.",
          },
        ],
      },
    ],
  },
};

function buildDefaultNodeDescription(topic: RoadmapTopicSummary) {
  const label = topic.studentLabel ?? topic.name;

  if (topic.childrenCount > 0) {
    return `راجع ${label} عبر ${topic.childrenCount} محاور فرعية ثم ثبّته بأسئلة BAC مركزة.`;
  }

  return `ثبّت ${label} عبر جلسات قصيرة، ثم اختبر نفسك على تمارين BAC من نفس المحور.`;
}

function defaultEstimatedSessions(topic: RoadmapTopicSummary) {
  return Math.max(1, Math.min(5, topic.childrenCount || 1));
}

function chunkTopics<T>(items: T[], chunkCount: number) {
  if (!items.length) {
    return [];
  }

  const safeChunkCount = Math.max(1, Math.min(chunkCount, items.length));
  const minChunkSize = Math.floor(items.length / safeChunkCount);
  const remainder = items.length % safeChunkCount;
  const chunks: T[][] = [];
  let cursor = 0;

  for (let index = 0; index < safeChunkCount; index += 1) {
    const currentSize = minChunkSize + (index < remainder ? 1 : 0);
    chunks.push(items.slice(cursor, cursor + currentSize));
    cursor += currentSize;
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

function buildFallbackSections(
  subjectName: string,
  topics: RoadmapTopicSummary[],
): RoadmapSectionSeedDefinition[] {
  const sectionShells =
    topics.length <= 3
      ? [
          {
            code: "CORE",
            title: "المسار الأساسي",
            description: `ابدأ بأهم محاور ${subjectName} في ترتيب واضح وقابل للمراجعة اليومية.`,
          },
        ]
      : topics.length <= 6
        ? [
            {
              code: "FOUNDATION",
              title: "الانطلاقة",
              description:
                "ابدأ بالمحاور التي تمنحك أكبر استقرار منهجي قبل التوسع في بقية المادة.",
            },
            {
              code: "CONSOLIDATION",
              title: "التثبيت",
              description:
                "بعد بناء الأساس، ثبّت المحاور المتبقية وراجع نقاط الضعف قبل المحاكاة.",
            },
          ]
        : [
            {
              code: "FOUNDATION",
              title: "الانطلاقة",
              description:
                "ابدأ بالمحاور الأولى لبناء الثقة والروتين اليومي داخل المادة.",
            },
            {
              code: "BUILD",
              title: "التوسع",
              description:
                "وسّع المراجعة على بقية المحاور مع الحفاظ على جلسات قصيرة ومنتظمة.",
            },
            {
              code: "POLISH",
              title: "التثبيت قبل المحاكاة",
              description:
                "اختم هذه المرحلة بتثبيت المحاور الأخيرة وتحويلها إلى سرعة وثبات في الأداء.",
            },
          ];
  const chunks = chunkTopics(topics, sectionShells.length);

  return sectionShells.map((section, index) => ({
    ...section,
    nodes: chunks[index].map((topic) => ({
      topicCode: topic.code,
    })),
  }));
}

export function resolveSubjectRoadmapDefinition(input: {
  subjectCode: string;
  subjectName: string;
  topics: RoadmapTopicSummary[];
}): ResolvedSubjectRoadmapDefinition {
  const sortedTopics = [...input.topics].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
  const topicByCode = new Map(sortedTopics.map((topic) => [topic.code, topic]));
  const override = CURATED_ROADMAP_OVERRIDES[input.subjectCode];
  const sourceSections =
    override?.sections ?? buildFallbackSections(input.subjectName, sortedTopics);
  const seenTopicCodes = new Set<string>();
  let previousTopicCode: string | null = null;

  const sections = sourceSections.map((section) => ({
    code: section.code,
    title: section.title,
    description: section.description ?? null,
    nodes: section.nodes.map((node) => {
      const topic = topicByCode.get(node.topicCode);

      if (!topic) {
        throw new Error(
          `Roadmap definition for ${input.subjectCode} references unknown topic ${node.topicCode}.`,
        );
      }

      seenTopicCodes.add(topic.code);

      const resolvedNode: ResolvedRoadmapNodeDefinition = {
        topicCode: topic.code,
        title: node.title ?? topic.studentLabel ?? topic.name,
        description: node.description ?? buildDefaultNodeDescription(topic),
        estimatedSessions:
          node.estimatedSessions ?? defaultEstimatedSessions(topic),
        isOptional: node.isOptional ?? false,
        recommendedPreviousTopicCode:
          node.recommendedPreviousTopicCode === undefined
            ? previousTopicCode
            : node.recommendedPreviousTopicCode,
      };

      previousTopicCode = topic.code;

      return resolvedNode;
    }),
  }));

  const missingTopics = sortedTopics.filter((topic) => !seenTopicCodes.has(topic.code));

  if (missingTopics.length) {
    const fallbackSection =
      sections[sections.length - 1] ?? {
        code: "CORE",
        title: "المسار الأساسي",
        description: null,
        nodes: [],
      };

    fallbackSection.nodes.push(
      ...missingTopics.map((topic) => {
        const resolvedNode: ResolvedRoadmapNodeDefinition = {
          topicCode: topic.code,
          title: topic.studentLabel ?? topic.name,
          description: buildDefaultNodeDescription(topic),
          estimatedSessions: defaultEstimatedSessions(topic),
          isOptional: false,
          recommendedPreviousTopicCode: previousTopicCode,
        };

        previousTopicCode = topic.code;

        return resolvedNode;
      }),
    );
  }

  return {
    title: override?.title ?? `خارطة ${input.subjectName}`,
    description:
      override?.description ??
      `مسار مراجعة منظم لمادة ${input.subjectName} مبني على المحاور الأساسية وإشارات الأداء الفعلية.`,
    sections,
  };
}
