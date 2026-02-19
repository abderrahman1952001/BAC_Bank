import {
  AssetType,
  ContentFormat,
  PrismaClient,
  SessionType,
} from '@prisma/client';

const prisma = new PrismaClient();

const SOURCE_PDF_PATH = '/home/abderrahman/dzexams-bac-mathematiques-2229208.pdf';

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

type TopicCode = (typeof SE_MATH_TOPICS)[number]['code'];

type BaseTaxonomy = {
  streamId: string;
  subjectId: string;
};

type ExerciseSeed = {
  orderIndex: number;
  title: string;
  totalPoints: number;
  introText?: string;
  questions: Array<{
    orderIndex: number;
    points: number;
    prompt: string;
    topicCodes: TopicCode[];
    officialAnswerMarkdown: string;
    markingSchemeMarkdown?: string;
    commonMistakesMarkdown?: string;
    examinerCommentaryMarkdown?: string;
    assets?: Array<{
      fileUrl: string;
      caption: string;
    }>;
  }>;
};

const SUBJECT_CATALOG = [
  { code: 'ARABIC', name: 'اللغة العربية وآدابها' },
  { code: 'ISLAMIC_STUDIES', name: 'العلوم الإسلامية' },
  { code: 'MATHEMATICS', name: 'الرياضيات' },
  { code: 'ENGLISH', name: 'اللغة الإنجليزية' },
  { code: 'NATURAL_SCIENCES', name: 'علوم الطبيعة والحياة' },
  { code: 'PHYSICS', name: 'العلوم الفيزيائية' },
  { code: 'FRENCH', name: 'اللغة الفرنسية' },
  { code: 'HISTORY_GEOGRAPHY', name: 'التاريخ والجغرافيا' },
  { code: 'AMAZIGH', name: 'اللغة الأمازيغية' },
  { code: 'PHILOSOPHY', name: 'الفلسفة' },
  { code: 'TECHNOLOGY_MECHANICAL', name: 'التكنولوجيا (هندسة ميكانيكية)' },
  { code: 'TECHNOLOGY_ELECTRICAL', name: 'التكنولوجيا (هندسة كهربائية)' },
  { code: 'TECHNOLOGY_CIVIL', name: 'التكنولوجيا (هندسة مدنية)' },
  { code: 'TECHNOLOGY_PROCESS', name: 'التكنولوجيا (هندسة الطرائق)' },
  { code: 'LAW', name: 'القانون' },
  { code: 'ACCOUNTING_FINANCE', name: 'التسيير المحاسبي والمالي' },
  { code: 'ECONOMICS_MANAGEMENT', name: 'الاقتصاد والمناجمنت' },
  {
    code: 'THIRD_FOREIGN_LANGUAGE',
    name: 'لغة أجنبية ثالثة (ألمانية أو إسبانية أو إيطالية)',
  },
] as const;

const STREAM_DEFINITIONS = [
  {
    code: 'SE',
    name: 'علوم تجريبية',
    subjectCodes: [
      'ARABIC',
      'ISLAMIC_STUDIES',
      'MATHEMATICS',
      'ENGLISH',
      'NATURAL_SCIENCES',
      'PHYSICS',
      'FRENCH',
      'HISTORY_GEOGRAPHY',
      'AMAZIGH',
      'PHILOSOPHY',
    ],
  },
  {
    code: 'M',
    name: 'رياضيات',
    subjectCodes: [
      'ARABIC',
      'ISLAMIC_STUDIES',
      'MATHEMATICS',
      'ENGLISH',
      'NATURAL_SCIENCES',
      'PHYSICS',
      'FRENCH',
      'HISTORY_GEOGRAPHY',
      'AMAZIGH',
      'PHILOSOPHY',
    ],
  },
  {
    code: 'MT_MECH',
    name: 'تقني رياضي - هندسة ميكانيكية',
    subjectCodes: [
      'ARABIC',
      'ISLAMIC_STUDIES',
      'MATHEMATICS',
      'ENGLISH',
      'TECHNOLOGY_MECHANICAL',
      'PHYSICS',
      'FRENCH',
      'HISTORY_GEOGRAPHY',
      'AMAZIGH',
      'PHILOSOPHY',
    ],
  },
  {
    code: 'MT_ELEC',
    name: 'تقني رياضي - هندسة كهربائية',
    subjectCodes: [
      'ARABIC',
      'ISLAMIC_STUDIES',
      'MATHEMATICS',
      'ENGLISH',
      'TECHNOLOGY_ELECTRICAL',
      'PHYSICS',
      'FRENCH',
      'HISTORY_GEOGRAPHY',
      'AMAZIGH',
      'PHILOSOPHY',
    ],
  },
  {
    code: 'MT_CIVIL',
    name: 'تقني رياضي - هندسة مدنية',
    subjectCodes: [
      'ARABIC',
      'ISLAMIC_STUDIES',
      'MATHEMATICS',
      'ENGLISH',
      'TECHNOLOGY_CIVIL',
      'PHYSICS',
      'FRENCH',
      'HISTORY_GEOGRAPHY',
      'AMAZIGH',
      'PHILOSOPHY',
    ],
  },
  {
    code: 'MT_PROC',
    name: 'تقني رياضي - هندسة الطرائق',
    subjectCodes: [
      'ARABIC',
      'ISLAMIC_STUDIES',
      'MATHEMATICS',
      'ENGLISH',
      'TECHNOLOGY_PROCESS',
      'PHYSICS',
      'FRENCH',
      'HISTORY_GEOGRAPHY',
      'AMAZIGH',
      'PHILOSOPHY',
    ],
  },
  {
    code: 'GE',
    name: 'تسيير و اقتصاد',
    subjectCodes: [
      'ARABIC',
      'LAW',
      'ISLAMIC_STUDIES',
      'MATHEMATICS',
      'ENGLISH',
      'ACCOUNTING_FINANCE',
      'FRENCH',
      'HISTORY_GEOGRAPHY',
      'AMAZIGH',
      'ECONOMICS_MANAGEMENT',
      'PHILOSOPHY',
    ],
  },
  {
    code: 'LP',
    name: 'آداب و فلسفة',
    subjectCodes: [
      'ARABIC',
      'ISLAMIC_STUDIES',
      'MATHEMATICS',
      'ENGLISH',
      'PHILOSOPHY',
      'FRENCH',
      'HISTORY_GEOGRAPHY',
      'AMAZIGH',
    ],
  },
  {
    code: 'LE',
    name: 'لغات أجنبية',
    subjectCodes: [
      'ARABIC',
      'ISLAMIC_STUDIES',
      'MATHEMATICS',
      'ENGLISH',
      'PHILOSOPHY',
      'FRENCH',
      'HISTORY_GEOGRAPHY',
      'AMAZIGH',
      'THIRD_FOREIGN_LANGUAGE',
    ],
  },
] as const;

async function seedBaseTaxonomy(): Promise<BaseTaxonomy> {
  const seStream = await prisma.stream.findUnique({ where: { code: 'SE' } });

  if (!seStream) {
    await prisma.stream.updateMany({
      where: { code: 'SCI' },
      data: { code: 'SE', name: 'علوم تجريبية' },
    });
  }

  const streamIds = new Map<string, string>();
  const subjectIds = new Map<string, string>();

  for (const subject of SUBJECT_CATALOG) {
    const savedSubject = await prisma.subject.upsert({
      where: { code: subject.code },
      update: { name: subject.name },
      create: {
        code: subject.code,
        name: subject.name,
      },
    });

    subjectIds.set(subject.code, savedSubject.id);
  }

  for (const stream of STREAM_DEFINITIONS) {
    const savedStream = await prisma.stream.upsert({
      where: { code: stream.code },
      update: { name: stream.name },
      create: {
        code: stream.code,
        name: stream.name,
      },
    });

    streamIds.set(stream.code, savedStream.id);

    for (const subjectCode of stream.subjectCodes) {
      const subjectId = subjectIds.get(subjectCode);

      if (!subjectId) {
        throw new Error(`Missing subject ${subjectCode} while building mappings.`);
      }

      await prisma.streamSubject.upsert({
        where: {
          streamId_subjectId: {
            streamId: savedStream.id,
            subjectId,
          },
        },
        update: {},
        create: {
          streamId: savedStream.id,
          subjectId,
        },
      });
    }
  }

  const scienceStreamId = streamIds.get('SE');

  if (!scienceStreamId) {
    throw new Error('Could not resolve the SE stream during seed.');
  }

  const mathSubject = await prisma.subject.findUnique({
    where: { code: 'MATHEMATICS' },
  });

  if (!mathSubject) {
    throw new Error('Could not resolve the MATHEMATICS subject during seed.');
  }

  return {
    streamId: scienceStreamId,
    subjectId: mathSubject.id,
  };
}

async function syncSeMathTopics(subjectId: string): Promise<Record<TopicCode, string>> {
  const validCodes = SE_MATH_TOPICS.map((topic) => topic.code);

  await prisma.topic.deleteMany({
    where: {
      subjectId,
      code: {
        notIn: validCodes,
      },
    },
  });

  const ids = {} as Record<TopicCode, string>;

  for (const topic of SE_MATH_TOPICS) {
    const saved = await prisma.topic.upsert({
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

    ids[topic.code] = saved.id;
  }

  return ids;
}

async function seedOcrExercises(
  base: BaseTaxonomy,
  topicIds: Record<TopicCode, string>,
): Promise<void> {
  // Remove older seeded SE mathematics exams to keep one curated source of truth.
  await prisma.exam.deleteMany({
    where: {
      streamId: base.streamId,
      subjectId: base.subjectId,
    },
  });

  const exam = await prisma.exam.create({
    data: {
      year: 2025,
      streamId: base.streamId,
      subjectId: base.subjectId,
      sessionType: SessionType.NORMAL,
      durationMinutes: 210,
      totalPoints: 40,
      isPublished: true,
      officialSourceReference: [
        'Baccalauréat 2025 - Sciences Expérimentales - Mathématiques',
        `Primary source PDF: ${SOURCE_PDF_PATH}`,
        'Seed source: curated Markdown exam statement + official correction.',
      ].join(' | '),
    },
  });

  const exercises: ExerciseSeed[] = [
    {
      orderIndex: 1,
      title: 'الموضوع الأول - التمرين الأول',
      totalPoints: 4,
      introText: [
        'يحتوي الصندوق U1 على 5 كريات (2 حمراء، 3 خضراء) والصندوق U2 على 5 كريات (3 حمراء، 2 خضراء).',
        'نسحب كرية من U1:',
        '- إذا كانت حمراء نعيدها إلى U1 ثم نسحب منه كريتين معا.',
        '- إذا كانت خضراء ننقلها إلى U2 ثم نسحب من U2 كريتين معا.',
        'الحوادث: R (حمراء)، V (خضراء)، A (3 كريات من نفس اللون)، B (على الأقل كرية خضراء).',
      ].join('\n'),
      questions: [
        {
          orderIndex: 1,
          points: 1,
          prompt: 'انقل وأكمل شجرة الاحتمالات المقابلة مع جميع الاحتمالات الشرطية.',
          topicCodes: ['PROBABILITY'],
          officialAnswerMarkdown: [
            'المرحلة الأولى: `P(R)=2/5` و `P(V)=3/5`.',
            'إذا كانت الأولى حمراء (السحب من U1: 2R,3V):',
            '- `P(RR|R)=C(2,2)/C(5,2)=1/10`',
            '- `P(RV|R)=C(2,1)C(3,1)/C(5,2)=3/5`',
            '- `P(VV|R)=C(3,2)/C(5,2)=3/10`',
            'إذا كانت الأولى خضراء (السحب من U2 بعد الإضافة: 3R,3V):',
            '- `P(RR|V)=C(3,2)/C(6,2)=1/5`',
            '- `P(RV|V)=C(3,1)C(3,1)/C(6,2)=3/5`',
            '- `P(VV|V)=C(3,2)/C(6,2)=1/5`',
          ].join('\n'),
          markingSchemeMarkdown:
            'تنقيط: 0.5 لاحتمالي الفرع الأول + 0.5 لباقي الفروع الشرطية الصحيحة.',
          commonMistakesMarkdown:
            'خطأ شائع: نسيان تأثير إضافة الكرة الخضراء إلى U2 قبل السحب الثاني.',
          examinerCommentaryMarkdown:
            'يجب كتابة كل احتمال شرطي على الشجرة ثم استخراج احتمالات الأوراق بالضرب.',
          assets: [
            {
              fileUrl: '/samples/dzexams/2025/math-sci/assets/subject1_ex1_graph.jpg',
              caption: 'الشجرة المرجعية - الموضوع الأول - التمرين 1',
            },
          ],
        },
        {
          orderIndex: 2,
          points: 1,
          prompt: 'احسب احتمالي الحادثتين A و B.',
          topicCodes: ['PROBABILITY'],
          officialAnswerMarkdown: 'الناتج: `P(A)=4/25` و `P(B)=24/25`.',
          markingSchemeMarkdown:
            'تنقيط: احتساب صحيح لـ A ثم استعمال المتممة أو الحساب المباشر لـ B.',
          commonMistakesMarkdown:
            'الخلط بين حدث (3 من نفس اللون) وحدث (كريتان من نفس اللون في السحب الثاني فقط).',
        },
        {
          orderIndex: 3,
          points: 2,
          prompt:
            'ليكن X عدد الكريات الحمراء المسحوبة في العملية. عين قانون احتمال X واحسب E(X).',
          topicCodes: ['PROBABILITY'],
          officialAnswerMarkdown: [
            'القيم الممكنة: `X ∈ {0,1,2,3}`',
            'قانون الاحتمال:',
            '- `P(X=0)=3/25`',
            '- `P(X=1)=12/25`',
            '- `P(X=2)=9/25`',
            '- `P(X=3)=1/25`',
            'الأمل الرياضي:',
            '`E(X)=0·3/25 + 1·12/25 + 2·9/25 + 3·1/25 = 33/25`.',
          ].join('\n'),
          markingSchemeMarkdown:
            'تنقيط: 1 نقطة لقانون الاحتمال + 1 نقطة لحساب الأمل بشكل صحيح.',
        },
      ],
    },
    {
      orderIndex: 2,
      title: 'الموضوع الأول - التمرين الثاني',
      totalPoints: 4,
      introText: [
        'f معرفة على `[0;+∞[` بـ: `f(x)=(x+2)/(x+1)` و (Δ): `y=x`.',
        'u0=-1 و `u_{n+1}=f(u_n)`، كما عرفت المتتالية `v_n=(1-u_n)/(3+u_n)`.',
      ].join('\n'),
      questions: [
        {
          orderIndex: 1,
          points: 1,
          prompt:
            'مثل بيانيا الحدود الأولى `u0,u1,u2,u3` ثم ضع تخمينا حول اتجاه تغير `(u_n)` وتقاربها.',
          topicCodes: ['NUMERICAL_SEQUENCES', 'COMPARATIVE_GROWTH_FUNCTION_STUDY'],
          officialAnswerMarkdown:
            'التخمين الصحيح: `(u_n)` ليست رتيبة لكنها متقاربة نحو 1.',
          assets: [
            {
              fileUrl: '/samples/dzexams/2025/math-sci/assets/subject1_ex2_graph.jpg',
              caption: 'الشكل البياني المرجعي للتمرين 2 - الموضوع الأول',
            },
          ],
        },
        {
          orderIndex: 2,
          points: 2,
          prompt:
            'بين أن `(v_n)` هندسية أساسها `-1/3` ثم استنتج عبارة `u_n` بدلالة `n` ونهايتها.',
          topicCodes: ['NUMERICAL_SEQUENCES', 'COMPARATIVE_GROWTH_FUNCTION_STUDY'],
          officialAnswerMarkdown: [
            '`v_{n+1}=-(1/3) v_n` وبالتالي `v_n=(-1/3)^n`.',
            '`u_n=(1-3(-1/3)^n)/(1+(-1/3)^n)`.',
            '`lim_{n→+∞} u_n = 1`.',
          ].join('\n'),
          markingSchemeMarkdown:
            'تنقيط: إثبات العلاقة العودية لـ v_n ثم استخراج u_n والنهاية.',
        },
        {
          orderIndex: 3,
          points: 1,
          prompt:
            'احسب بدلالة `n` كلا من `S_n` و `T_n` حيث `T_n=Σ_{k=0}^{n} ln|v_k|`.',
          topicCodes: ['NUMERICAL_SEQUENCES'],
          officialAnswerMarkdown: [
            '`S_n = (3/4)(1-(-1/3)^{n+1})`.',
            '`T_n = -(1/2) n(n+1) ln(3)`.',
          ].join('\n'),
        },
      ],
    },
    {
      orderIndex: 3,
      title: 'الموضوع الأول - التمرين الثالث',
      totalPoints: 5,
      introText:
        'في الأعداد المركبة: `(iz+2)(z^2+2√3 z+4)=0` و `z_A=2i`, `z_B=-√3+i`, `z_C=\\overline{z_B}`.',
      questions: [
        {
          orderIndex: 1,
          points: 2,
          prompt: 'حل في C المعادلة `(iz+2)(z^2+2√3 z+4)=0`.',
          topicCodes: ['COMPLEX_NUMBERS'],
          officialAnswerMarkdown:
            'مجموعة الحلول: `{2i, -√3-i, -√3+i}`.',
        },
        {
          orderIndex: 2,
          points: 2,
          prompt:
            'اكتب `z_A,z_B,z_C` بالشكل المثلثي ثم استنتج الدائرة المشتركة وطبيعة المثلث `ABC` ولاحقة مركز ثقله.',
          topicCodes: ['COMPLEX_NUMBERS', 'POINT_TRANSFORMATIONS'],
          officialAnswerMarkdown: [
            '`z_A=2(cos(π/2)+i sin(π/2))`.',
            '`z_B=2(cos(5π/6)+i sin(5π/6))`.',
            '`z_C=2(cos(7π/6)+i sin(7π/6))`.',
            '`|z_A|=|z_B|=|z_C|=2` ⇒ النقط على دائرة مركزها O ونصف قطرها 2.',
            'طبيعة المثلث: متساوي الساقين.',
            'لاحقة مركز الثقل: `(-2√3)/3 + (2/3)i`.',
          ].join('\n'),
        },
        {
          orderIndex: 3,
          points: 1,
          prompt:
            'إذا كان `Z=(cos θ + i sin θ) z_A` و `0<θ<π/2`، عين `θ` بحيث `5π/6` عمدة لـ Z.',
          topicCodes: ['COMPLEX_NUMBERS'],
          officialAnswerMarkdown: '`θ = π/3`.',
        },
      ],
    },
    {
      orderIndex: 4,
      title: 'الموضوع الأول - التمرين الرابع',
      totalPoints: 7,
      introText:
        'الدالة `f(x)=e^{2x}-e^x-x-2` على R وتمثيلها `(C_f)` مع المستقيم `(Δ): y=-x-2`.',
      questions: [
        {
          orderIndex: 1,
          points: 1,
          prompt:
            'احسب النهايات عند ±∞ وبيّن أن `(Δ): y=-x-2` مقارب مائل عند `-∞` وحدد الوضع النسبي.',
          topicCodes: ['LIMITS', 'EXPONENTIAL_LOGARITHMIC'],
          officialAnswerMarkdown: [
            '`lim_{x→+∞} f(x)=+∞` و `lim_{x→-∞} f(x)=+∞`.',
            '`lim_{x→-∞}(f(x)-(-x-2))=0` إذن `(Δ)` مقارب مائل عند `-∞`.',
            '(Cf) أسفل (Δ) لما `x<0`، وأعلى منه لما `x>0`، ويتقاطعان في `A(0,-2)`.',
          ].join('\n'),
        },
        {
          orderIndex: 2,
          points: 1,
          prompt:
            "بين أن مشتقة f تعطى بـ `f'(x)=(e^x-1)(2e^x+1)` ثم استنتج اتجاه تغير f.",
          topicCodes: ['DIFFERENTIABILITY_CONTINUITY', 'EXPONENTIAL_LOGARITHMIC'],
          officialAnswerMarkdown:
            'الدالة متناقصة تماما على `]-∞,0]` ومتزايدة تماما على `[0,+∞[`.',
        },
        {
          orderIndex: 3,
          points: 1,
          prompt: 'عين معادلة المماس `(T)` الموازي لـ `(Δ)`.',
          topicCodes: ['DIFFERENTIABILITY_CONTINUITY'],
          officialAnswerMarkdown: 'المماس: `y=-x-9/4`.',
        },
        {
          orderIndex: 4,
          points: 1,
          prompt:
            'أثبت أن للمعادلة `f(x)=0` حلين فقط `α,β` مع الحصر `-2.2<α<-2.1` و `0.8<β<0.9`.',
          topicCodes: ['LIMITS', 'EXPONENTIAL_LOGARITHMIC'],
          officialAnswerMarkdown:
            'توجد قيمتان فقط `α,β` وتحققان فعلا الحصرين المعطيين.',
        },
        {
          orderIndex: 5,
          points: 1,
          prompt: 'عين نقطة الانعطاف للمنحنى `(C_f)`.',
          topicCodes: ['DIFFERENTIABILITY_CONTINUITY'],
          officialAnswerMarkdown: 'نقطة الانعطاف: `B(-ln 4, -35/16 + ln 4)`.',
        },
        {
          orderIndex: 6,
          points: 1,
          prompt:
            'ناقش بيانيا حسب قيم `m` عدد حلول `e^{2x}-e^x-m-2=0`.',
          topicCodes: ['COMPARATIVE_GROWTH_FUNCTION_STUDY'],
          officialAnswerMarkdown: [
            'إذا `m < -9/4`: لا حل.',
            'إذا `m = -9/4` أو `m > -2`: حل وحيد.',
            'إذا `-9/4 < m < -2`: حلان.',
          ].join('\n'),
        },
        {
          orderIndex: 7,
          points: 1,
          prompt:
            'احسب مساحة الحيز المحدد بـ `(C_f)` و `x=-1`, `x=0`, `y=-x-2` (بالـ cm²).',
          topicCodes: ['ANTIDERIVATIVES_INTEGRAL_CALCULUS'],
          officialAnswerMarkdown:
            'المساحة: `A = (2 - 4/e + 2/e^2) cm²`.',
        },
      ],
    },
    {
      orderIndex: 5,
      title: 'الموضوع الثاني - التمرين الأول',
      totalPoints: 4,
      introText:
        'في C: `z^2=8i` مع `z_A=2+2i`, `z_B=-z_A`, `z_C=\\overline{z_B}`.',
      questions: [
        {
          orderIndex: 1,
          points: 1,
          prompt: 'انشر `(1+i)^2` ثم حل المعادلة `z^2=8i`.',
          topicCodes: ['COMPLEX_NUMBERS'],
          officialAnswerMarkdown:
            '`(1+i)^2=2i`، وحلول `z^2=8i` هي: `z=2+2i` أو `z=-2-2i`.',
        },
        {
          orderIndex: 2,
          points: 1,
          prompt:
            'اكتب `z_A,z_B,z_C` بالشكل المثلثي واستنتج الدائرة المشتركة.',
          topicCodes: ['COMPLEX_NUMBERS', 'POINT_TRANSFORMATIONS'],
          officialAnswerMarkdown: [
            '`z_A=2√2(cos(π/4)+i sin(π/4))`.',
            '`z_B=2√2(cos(5π/4)+i sin(5π/4))`.',
            '`z_C=2√2(cos(3π/4)+i sin(3π/4))`.',
            'جميعها على دائرة مركزها O ونصف قطرها `2√2`.',
          ].join('\n'),
          assets: [
            {
              fileUrl: '/samples/dzexams/2025/math-sci/assets/subject2_ex1_graph.jpg',
              caption: 'الشكل المرجعي - الموضوع الثاني - التمرين 1',
            },
          ],
        },
        {
          orderIndex: 3,
          points: 1,
          prompt:
            'تحقق أن `z_A-z_C=i(z_B-z_C)` ثم حدد طبيعة المثلث `ABC`.',
          topicCodes: ['POINT_TRANSFORMATIONS'],
          officialAnswerMarkdown:
            '`(z_A-z_C)/(z_B-z_C)=i`، إذن المثلث قائم في C ومتساوي الساقين.',
        },
        {
          orderIndex: 4,
          points: 1,
          prompt:
            'عين `z_D` و `z_E` حتى تكون النقطة C مركز المربع `ABDE`.',
          topicCodes: ['POINT_TRANSFORMATIONS'],
          officialAnswerMarkdown: '`z_D=-6+2i` و `z_E=-2+6i`.',
        },
      ],
    },
    {
      orderIndex: 6,
      title: 'الموضوع الثاني - التمرين الثاني',
      totalPoints: 4,
      introText:
        'احتمالات على الصندوقين U1 و U2 كما في نص الموضوع الثاني (التمرين 2).',
      questions: [
        {
          orderIndex: 1,
          points: 1,
          prompt:
            '(I) احسب `P(E)` حيث E: الحصول على كرية حمراء واحدة فقط عند سحب كريتين من U1.',
          topicCodes: ['PROBABILITY'],
          officialAnswerMarkdown: '`P(E)=8/15`.',
        },
        {
          orderIndex: 2,
          points: 1,
          prompt:
            '(I) بين أن `P(F)=4/15` ثم استنتج احتمال الحصول على لونين مختلفين.',
          topicCodes: ['PROBABILITY'],
          officialAnswerMarkdown:
            '`P(F)=4/15` و `P(\\overline{F})=11/15`.',
        },
        {
          orderIndex: 3,
          points: 1,
          prompt:
            '(II) انقل واملأ شجرة الاحتمالات الخاصة بالسحب المتتالي.',
          topicCodes: ['PROBABILITY'],
          officialAnswerMarkdown:
            'تملأ الشجرة حسب فروع السحب من U2 ثم السحب الشرطي من U2 أو U1 وفق لون الكرة الأولى.',
          assets: [
            {
              fileUrl: '/samples/dzexams/2025/math-sci/assets/subject2_ex2_graph.jpg',
              caption: 'شجرة الاحتمالات - الموضوع الثاني - التمرين 2',
            },
          ],
        },
        {
          orderIndex: 4,
          points: 1,
          prompt:
            '(II) احسب احتمال الحصول على كرية حمراء في السحب الثاني ثم `P(V_1|R_2)`.',
          topicCodes: ['PROBABILITY'],
          officialAnswerMarkdown:
            'احتمال الأحمر في السحب الثاني: `17/45`، كما أن `P(V_1|R_2)=12/17`.',
        },
      ],
    },
    {
      orderIndex: 7,
      title: 'الموضوع الثاني - التمرين الثالث',
      totalPoints: 5,
      introText:
        'الدالة `f(x)=5x/(2x+1)` على `[0,+∞[`، والمتتاليتان `(u_n)` و `(v_n)` كما في نص التمرين.',
      questions: [
        {
          orderIndex: 1,
          points: 1,
          prompt: 'ادرس اتجاه تغير الدالة `f`.',
          topicCodes: ['COMPARATIVE_GROWTH_FUNCTION_STUDY'],
          officialAnswerMarkdown: 'الدالة `f` متزايدة تماما على `[0,+∞[`.',
        },
        {
          orderIndex: 2,
          points: 1,
          prompt:
            'احسب `u1,u2` ثم اثبت أن `2<u_n≤3` لكل `n` وادرس اتجاه تغير `(u_n)`.',
          topicCodes: ['NUMERICAL_SEQUENCES'],
          officialAnswerMarkdown: [
            '`u1=15/7` و `u2=75/37`.',
            'بالتراجع: `2<u_n≤3` لكل `n`.',
            '`(u_n)` متناقصة تماما.',
          ].join('\n'),
        },
        {
          orderIndex: 3,
          points: 2,
          prompt:
            'بين أن `v_n=3^n(1-2/u_n)` هندسية أساسها `3/5`، ثم استنتج `S_n` وعبارة `u_n` والنهاية.',
          topicCodes: ['NUMERICAL_SEQUENCES'],
          officialAnswerMarkdown: [
            '`v_n=(1/3)(3/5)^n`.',
            '`S_n=(1/6)(3^{n+1}-1)`.',
            '`u_n=6/(3-(1/5)^n)`.',
            '`lim_{n→+∞}u_n=2`.',
          ].join('\n'),
        },
        {
          orderIndex: 4,
          points: 1,
          prompt:
            'تحقق من `6/u_n=3-(1/5)^n` ثم استنتج `T_n=Σ_{k=0}^{n} 6/u_k`.',
          topicCodes: ['NUMERICAL_SEQUENCES'],
          officialAnswerMarkdown:
            '`T_n=(1/4)(1/5)^n + 3n + 7/4`.',
        },
      ],
    },
    {
      orderIndex: 8,
      title: 'الموضوع الثاني - التمرين الرابع',
      totalPoints: 7,
      introText:
        'الجزء (I): `g(x)= [x^2 + (x^2+8x)ln(x+4)]/(x+4)^2`.\nالجزء (II): `f(x)=x^2 ln(x+4)/(x+4)` على `]-4,+∞[`.',
      questions: [
        {
          orderIndex: 1,
          points: 1,
          prompt:
            '(I) حدد إشارة `g` بيانيا وتحقق من الحصر `-2.5<α<-2.4`.',
          topicCodes: ['COMPARATIVE_GROWTH_FUNCTION_STUDY'],
          officialAnswerMarkdown:
            'إشارة g سالبة بين `α` و `0` وموجبة خارجهما، مع `-2.5<α<-2.4`.',
        },
        {
          orderIndex: 2,
          points: 1,
          prompt:
            ' (II) احسب نهايتي `f` عند `-4` و `+∞` ثم بين أن مشتقة `f` هي `g(x)`.',
          topicCodes: ['LIMITS', 'DIFFERENTIABILITY_CONTINUITY'],
          officialAnswerMarkdown:
            "`lim_{x→-4}f(x)=-∞`, `lim_{x→+∞}f(x)=+∞` و `f'(x)=g(x)`.",
        },
        {
          orderIndex: 3,
          points: 2,
          prompt:
            'استنتج اتجاه تغير `f` وفواصل تقاطع `(C_f)` مع محور الفواصل، ثم ناقش حلول `f(x)=ln(m)` (m>0).',
          topicCodes: ['COMPARATIVE_GROWTH_FUNCTION_STUDY', 'EXPONENTIAL_LOGARITHMIC'],
          officialAnswerMarkdown: [
            'f متزايدة على `]-4,α]` و `[0,+∞[` ومتناقصة على `[α,0]`.',
            'فواصل التقاطع: `x=-3` و `x=0`.',
            'للمعادلة `f(x)=ln(m)` ثلاثة حلول مختلفة عندما `1<m<e^{f(α)}`.',
          ].join('\n'),
        },
        {
          orderIndex: 4,
          points: 1,
          prompt:
            'احسب `f(2)` و `f(4)` وبيّن على `[-3,0]` أن `h(x)-f(x)≥0` حيث `h(x)=((x^2+1)ln(x+4))/(x+4)`.',
          topicCodes: ['DIFFERENTIABILITY_CONTINUITY', 'EXPONENTIAL_LOGARITHMIC'],
          officialAnswerMarkdown:
            '`h(x)-f(x)=ln(x+4)/(x+4) ≥ 0` على `[-3,0]`.',
        },
        {
          orderIndex: 5,
          points: 2,
          prompt:
            'احسب مساحة الحيز المحدد بـ `(C_f)` و `(C_h)` والمستقيمين `x=-3` و `x=0`.',
          topicCodes: ['ANTIDERIVATIVES_INTEGRAL_CALCULUS'],
          officialAnswerMarkdown: 'المساحة: `A = 2(ln 2)^2` (وحدة مساحة).',
        },
      ],
    },
  ];

  for (const exerciseSeed of exercises) {
    const exercise = await prisma.exercise.create({
      data: {
        examId: exam.id,
        orderIndex: exerciseSeed.orderIndex,
        title: exerciseSeed.title,
        introText: exerciseSeed.introText,
        totalPoints: exerciseSeed.totalPoints,
      },
    });

    for (const questionSeed of exerciseSeed.questions) {
      const question = await prisma.question.create({
        data: {
          exerciseId: exercise.id,
          orderIndex: questionSeed.orderIndex,
          points: questionSeed.points,
          contentFormat: questionSeed.assets?.length
            ? ContentFormat.HYBRID
            : ContentFormat.MARKDOWN,
          isActive: true,
        },
      });

      await prisma.questionContent.create({
        data: {
          questionId: question.id,
          versionNumber: 1,
          contentMarkdown: questionSeed.prompt,
        },
      });

      await prisma.answer.create({
        data: {
          questionId: question.id,
          officialAnswerMarkdown: questionSeed.officialAnswerMarkdown,
          markingSchemeMarkdown: questionSeed.markingSchemeMarkdown,
          commonMistakesMarkdown: questionSeed.commonMistakesMarkdown,
          examinerCommentaryMarkdown: questionSeed.examinerCommentaryMarkdown,
        },
      });

      for (const [assetIndex, asset] of (questionSeed.assets ?? []).entries()) {
        await prisma.questionAsset.create({
          data: {
            questionId: question.id,
            fileUrl: asset.fileUrl,
            assetType: AssetType.IMAGE,
            orderIndex: assetIndex + 1,
            caption: asset.caption,
          },
        });
      }

      for (const [topicIndex, topicCode] of questionSeed.topicCodes.entries()) {
        await prisma.questionTopic.create({
          data: {
            questionId: question.id,
            topicId: topicIds[topicCode],
            isPrimary: topicIndex === 0,
            weight: topicIndex === 0 ? 1 : 0.6,
          },
        });
      }
    }
  }
}

async function main() {
  const base = await seedBaseTaxonomy();
  const topicIds = await syncSeMathTopics(base.subjectId);
  await seedOcrExercises(base, topicIds);

  console.log('Seed complete: BAC 2025 mathematics exam seeded with official corrections.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
