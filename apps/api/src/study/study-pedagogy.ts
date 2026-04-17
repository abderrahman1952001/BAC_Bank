import type {
  StudyReviewReasonType,
  StudySupportStyle,
} from '@bac-bank/contracts/study';

const LOGIC_HEAVY_SUBJECT_CODES = new Set([
  'MATHEMATICS',
  'PHYSICS',
  'NATURAL_SCIENCES',
  'MATH',
  'PHYS',
  'SCI',
]);

const CONTENT_HEAVY_SUBJECT_CODES = new Set([
  'HISTORY_GEOGRAPHY',
  'HISTORY',
  'GEOGRAPHY',
  'ISLAMIC_STUDIES',
  'HIST_GEO',
]);

const ESSAY_HEAVY_SUBJECT_CODES = new Set([
  'PHILOSOPHY',
  'ARABIC',
  'PHILO',
]);

type StudyPedagogySupportProfile = {
  fallbackRules: string[];
  commonTrapMessages: Partial<Record<StudyReviewReasonType, string>>;
};

const STUDY_PEDAGOGY_SUPPORT_PROFILES: Record<
  StudySupportStyle,
  StudyPedagogySupportProfile
> = {
  GENERAL: {
    fallbackRules: [
      'حدّد المطلوب بدقة قبل البدء في الإجابة.',
      'ابدأ بخطوة قصيرة تكشف اتجاهك الحقيقي.',
      'استخدم التلميح أو الطريقة قبل كشف الحل الكامل.',
    ],
    commonTrapMessages: {
      MISSED:
        'الخطأ الأوضح هنا هو البدء في الحل قبل تثبيت الفكرة المركزية المطلوبة.',
      HARD:
        'التعثر الحالي غالباً من تحويل الفكرة إلى خطوات واضحة قابلة للتنفيذ.',
      SKIPPED:
        'أكثر ما يوقف هذا المحور هو غياب سطر انطلاق واضح. ابدأ بتحديد المطلوب والمعطيات قبل أي توسع.',
      REVEALED:
        'أكثر ما يضعف هذا المحور هو كشف الحل الكامل مبكراً. جرّب خطوة أولى قصيرة ثم قارن.',
      FLAGGED:
        'هذا المحور تكرر رجوعك إليه، لذلك نبدأ الآن بتثبيت القاعدة والطريقة قبل الدخول في التمرين.',
    },
  },
  LOGIC_HEAVY: {
    fallbackRules: [
      'ابدأ بكتابة المعطيات والمطلوب قبل أي حساب.',
      'حدّد القاعدة أو الخاصية المناسبة ثم نفّذ خطوة واحدة فقط.',
      'قارن اتجاهك مع التلميح قبل كشف الحل الكامل.',
    ],
    commonTrapMessages: {
      MISSED:
        'الخطأ الأوضح هنا هو القفز إلى الحساب قبل تثبيت القاعدة أو الخاصية المناسبة.',
      HARD:
        'التعثر الحالي غالباً من اختيار الطريقة المناسبة رغم فهم المعطيات.',
      SKIPPED:
        'أكثر ما يوقف هذا المحور هو غياب سطر انطلاق واضح. ابدأ بتحديد المطلوب والمعطيات قبل أي توسع.',
      REVEALED:
        'أكثر ما يضعف هذا المحور هو كشف الحل الكامل مبكراً. جرّب خطوة أولى قصيرة ثم قارن.',
      FLAGGED:
        'هذا المحور تكرر رجوعك إليه، لذلك نبدأ الآن بتثبيت القاعدة والطريقة قبل الدخول في التمرين.',
    },
  },
  CONTENT_HEAVY: {
    fallbackRules: [
      'استخرج الفكرة أو الحدث المركزي أولاً.',
      'رتّب الإجابة في عناصر قصيرة قبل التوسع.',
      'تحقق من المصطلحات أو الكلمات المفتاحية قبل كشف الحل.',
    ],
    commonTrapMessages: {
      MISSED:
        'الخطأ الأوضح هنا هو تذكّر الفكرة بشكل عام من دون استرجاع العناصر الدقيقة المطلوبة.',
      HARD:
        'التعثر الحالي غالباً من ترتيب المعلومات وربطها بالسؤال المطلوب بالضبط.',
      SKIPPED:
        'أكثر ما يوقف هذا المحور هو غياب عناصر الاسترجاع الأساسية. ابدأ بالكلمات المفتاحية أو الحدث المركزي ثم وسّع الإجابة.',
      REVEALED:
        'أكثر ما يضعف هذا المحور هو فتح التصحيح قبل محاولة استرجاع العناصر الأساسية من الذاكرة.',
      FLAGGED:
        'هذا المحور يحتاج الآن إلى تثبيت الكلمات المفتاحية والعلاقات الأساسية قبل الرجوع إلى السؤال الكامل.',
    },
  },
  ESSAY_HEAVY: {
    fallbackRules: [
      'حدّد الإشكال أو الفكرة المركزية أولاً.',
      'ابنِ الإجابة من موقف واضح ثم دعم منظم.',
      'راجع البناء والمنهجية قبل مقارنة الحل الكامل.',
    ],
    commonTrapMessages: {
      MISSED:
        'الخطأ الأوضح هنا هو البدء في الكتابة قبل تحديد الإشكال أو البناء المنهجي للإجابة.',
      HARD:
        'التعثر الحالي غالباً من تنظيم الحجة أو المثال أكثر من كونه نقصاً تاماً في الفكرة.',
      SKIPPED:
        'أكثر ما يوقف هذا المحور هو غياب قالب واضح للإجابة. ابدأ بالإشكال ثم وزّع الحجج أو الأمثلة قبل التوسع.',
      REVEALED:
        'أكثر ما يضعف هذا المحور هو مقارنة الجواب بالنموذج قبل تثبيت البناء المنهجي للإجابة الخاصة بك.',
      FLAGGED:
        'هذا المحور يحتاج الآن إلى تثبيت الإشكال والبناء المنهجي قبل الرجوع إلى النموذج الكامل.',
    },
  },
};

export function resolveStudySupportStyle(
  subjectCode: string | null | undefined,
): StudySupportStyle {
  const normalizedCode = subjectCode?.trim().toUpperCase() ?? '';

  if (LOGIC_HEAVY_SUBJECT_CODES.has(normalizedCode)) {
    return 'LOGIC_HEAVY';
  }

  if (CONTENT_HEAVY_SUBJECT_CODES.has(normalizedCode)) {
    return 'CONTENT_HEAVY';
  }

  if (ESSAY_HEAVY_SUBJECT_CODES.has(normalizedCode)) {
    return 'ESSAY_HEAVY';
  }

  return 'GENERAL';
}

export function getStudyPedagogySupportProfile(
  supportStyle: StudySupportStyle,
) {
  return STUDY_PEDAGOGY_SUPPORT_PROFILES[supportStyle];
}

export function getFallbackPedagogyRules(supportStyle: StudySupportStyle) {
  return getStudyPedagogySupportProfile(supportStyle).fallbackRules;
}

export function toPedagogyRule(input: {
  skillName: string;
  description?: string | null;
}) {
  const description = input.description?.trim();

  if (description) {
    return description.endsWith('.') || description.endsWith('؟')
      ? description
      : `${description}.`;
  }

  return `ركّز على مهارة ${input.skillName}.`;
}

export function buildCommonTrapMessage(input: {
  supportStyle: StudySupportStyle;
  dominantReason: StudyReviewReasonType | null;
}) {
  if (!input.dominantReason) {
    return null;
  }

  return (
    getStudyPedagogySupportProfile(input.supportStyle).commonTrapMessages[
      input.dominantReason
    ] ?? null
  );
}

export function extractPromptPreview(
  blocks: Array<{
    textValue: string | null;
  }>,
) {
  const mergedText = blocks
    .map((block) => block.textValue?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!mergedText) {
    return null;
  }

  return mergedText.length > 160 ? `${mergedText.slice(0, 157)}...` : mergedText;
}
