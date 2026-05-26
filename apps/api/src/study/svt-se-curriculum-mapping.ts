export const SVT_SE_CURRICULUM_NODE_CODES = [
  'PROTEIN_SYNTHESIS',
  'STRUCTURE_FUNCTION',
  'ENZYMES',
  'IMMUNITY',
  'NERVOUS_COMMUNICATION',
  'PHOTOSYNTHESIS',
  'RESPIRATION_FERMENTATION',
  'ENERGY_BALANCE',
  'EARTH_STRUCTURE',
  'PLATE_ACTIVITY',
  'TECTONIC_INTERPRETATION',
] as const;

export const SVT_M_CURRICULUM_NODE_CODES = [
  'PROTEIN_SYNTHESIS',
  'STRUCTURE_FUNCTION',
  'IMMUNITY',
  'AIR_POLLUTION',
  'WATER_POLLUTION',
] as const;

export type SvtSeCurriculumNodeCode =
  (typeof SVT_SE_CURRICULUM_NODE_CODES)[number];

export type SvtMAllowedCurriculumNodeCode =
  (typeof SVT_M_CURRICULUM_NODE_CODES)[number];

export type SvtCurriculumNodeCode =
  | SvtSeCurriculumNodeCode
  | SvtMAllowedCurriculumNodeCode;

type Rule = {
  code: SvtSeCurriculumNodeCode;
  patterns: string[];
  minimumMatches?: number;
};

type MOnlyRule = {
  code: Exclude<SvtMAllowedCurriculumNodeCode, SvtSeCurriculumNodeCode>;
  patterns: string[];
  minimumMatches?: number;
};

const RULES: Rule[] = [
  {
    code: 'PROTEIN_SYNTHESIS',
    patterns: [
      'تركيب البروتين',
      'تركيبها بتدخل',
      'تركيب بروتين',
      'التعبير عن المعلومة الوراثية',
      'التعبير عن المعلومه الوراثيه',
      'الترجمه',
      'الاستنساخ',
      'arnm',
      'arn بوليميراز',
      'adn',
      'الرامزه',
      'الشفره الوراثيه',
      'التسلسل النيكليوتيدي',
      'تتابع النيكليوتيدات',
      'الثلاثيات النيكليوتيديه',
      'الريبوزوم',
      'rip',
      'tetracycline',
      'oxazolidinone',
      'gentamicine',
      'الريسين',
    ],
  },
  {
    code: 'STRUCTURE_FUNCTION',
    patterns: [
      'البنيه الفراغيه',
      'بنيته الفراغيه',
      'بنيتها الفراغيه',
      'التخصص الوظيفي',
      'تخصصه الوظيفي',
      'الخصائص الوظيفيه للبروتينات',
      'العلاقه بين البنيه',
      'علاقه بنيه',
      'وظيفه البروتين',
      'البنيه والوظيفه',
      'تغير البنيه',
      'rastop',
      'بروتين وظيفي',
    ],
  },
  {
    code: 'ENZYMES',
    patterns: [
      'الانزيم',
      'الانزيمات',
      'انزيم',
      'انزيمات',
      'الموقع الفعال',
      'معقد انزيم',
      'النشاط الانزيمي',
      'sod',
      'superoxide dismutase',
      'ribonuclease',
      'الريبونوكلياز',
      'cellulase',
      'سيليلوز',
      'naga',
      'nagase',
      '2-dg',
    ],
  },
  {
    code: 'IMMUNITY',
    patterns: [
      'المناعه',
      'مناعيه',
      'الجهاز المناعي',
      'استجابه مناعيه',
      'استجابة مناعية',
      'الاجسام المضاده',
      'اجسام مضاده',
      'مستضد',
      'المستضدي',
      'لمفاويه',
      'لمفاويات',
      'الخلايا التائيه',
      'lt4',
      'lt8',
      'ltc',
      'vih',
      'داء فقدان المناعه المكتسبه',
      'الذات واللاذات',
      'اللاذات',
      'التسامح المناعي',
      'نظام ال abo',
      'abo',
      'نقل الدم',
      'زمر',
      'hla',
      'برفورين',
      'perforin',
      'الغرأنزيم',
      'انترلوكين',
      'بلعمه',
      'اناتوكسين',
      'bacterie',
      'bacteria',
    ],
  },
  {
    code: 'NERVOUS_COMMUNICATION',
    patterns: [
      'عصبي',
      'العصبون',
      'العصبونات',
      'الخلايا العصبيه',
      'الليف العصبي',
      'غشاء العصبون',
      'المشابك',
      'المشبك',
      'مشبكي',
      'بعد مشبكي',
      'التشابك',
      'مبلغات عصبيه',
      'كمون',
      'الاستقطاب',
      'مشابك تنبيهيه',
      'مشابك تثبيطيه',
      'اليقظه',
      'النوم',
      'الادينوزين',
      'gaba',
      'glutamate',
      'mtb',
      'psp3tx1',
      'tetanus',
      'als',
      'التصلب الجانبي الضموري',
      'المورفين',
    ],
  },
  {
    code: 'PHOTOSYNTHESIS',
    patterns: [
      'التركيب الضوئي',
      'الطاقه الضوئيه',
      'النباتات الخضراء',
      'النبات الاخضر',
      'الطحالب الخضراء',
      'الطحالب',
      'الصانعات الخضراء',
      'صانعاتها الخضراء',
      'الصانعه الخضراء',
      'الصانعه',
      'اليخضور',
      'الكلوروفيل',
      'انطلاق الاكسجين',
      'المرحله الكيموضوئيه',
      'المرحله الكيموحيويه',
      'rubisco',
      'rudip',
      'apg',
      'diuron',
      'dcmu',
      'تثبيت جزيئه co2',
      'تثبيت جزيئه الـ co2',
      'تيلاكوئيد',
      'التيلاكوئيدات',
    ],
  },
  {
    code: 'RESPIRATION_FERMENTATION',
    patterns: [
      'التنفس',
      'تخمر',
      'التخمر',
      'الغلوكوز',
      'glucose',
      'تحلل سكري',
      'التحلل السكري',
      'nadh',
      'nad+',
      'الميثان',
      'ch4',
      'الابقار',
      'المجتره',
      'هضم الاغذيه النباتيه',
      '2-dg',
      'desoxyglucose',
    ],
  },
  {
    code: 'ENERGY_BALANCE',
    patterns: [
      'الحصيله الطاقويه',
      'طاقة قابله للاستعمال',
      'طاقه قابله للاستعمال',
      'تحويل الطاقه',
      'الطاقه الكيميائيه',
      'انتاج الطاقه',
      'تركيب الـ atp',
      'تركيب atp',
      'تشكيل الـ atp',
      'تشكل الـ atp',
      'atp',
    ],
    minimumMatches: 2,
  },
  {
    code: 'EARTH_STRUCTURE',
    patterns: [
      'بنيه وخصائص الكره الارضيه',
      'بنيه الكره الارضيه',
      'الكره الارضيه',
      'المعطيات الزلزاليه',
      'الموجات الزلزاليه',
      'الزلازل',
      'القشره الارضيه',
      'رداء الكره الارضيه',
      'نواه الكره الارضيه',
      'الغلاف الصخري',
    ],
  },
  {
    code: 'PLATE_ACTIVITY',
    patterns: [
      'نشاط الصفائح',
      'النشاط التكتوني',
      'نشاط تكتوني',
      'الصفائح التكتونيه',
      'تكتونيه الصفائح',
      'زحزحه الصفائح',
      'حركه الصفائح',
      'الاندساس',
      'التمدد',
      'الظهرة',
      'الظهره',
      'جبال الانديز',
    ],
  },
  {
    code: 'TECTONIC_INTERPRETATION',
    patterns: [
      'التفسير التكتوني',
      'البنيات الجيولوجيه',
      'البنيات المرتبطه',
      'السلاسل الجبليه',
      'جبال الانديز',
      'البركان الانفجاري',
      'بركان انفجاري',
      'خندق محيطي',
      'القوس الجزري',
      'الحوض الرسوبي',
      'التشوهات التكتونيه',
    ],
  },
];

const M_ONLY_RULES: MOnlyRule[] = [
  {
    code: 'AIR_POLLUTION',
    patterns: [
      'تلوث الجو',
      'تلوث الهواء',
      'طبقه الاوزون',
      'الاوزون الجوي',
      'ثقب الاوزون',
      'الغلاف الجوي',
      'اشعه فوق بنفسجيه',
      'الاشعه فوق البنفسجيه',
      'الاحتباس الحراري',
      'غازات الدفيئه',
    ],
    minimumMatches: 2,
  },
  {
    code: 'WATER_POLLUTION',
    patterns: [
      'تلوث الماء',
      'تلوث المياه',
      'المياه القذره',
      'المياه المستعمله',
      'المياه العادمه',
      'صرف صحي',
      'نفايات سائله',
      'المواد العضويه في الماء',
      'الاوساط المائيه',
    ],
  },
];

const ENERGY_TOPIC_CODES = new Set<SvtSeCurriculumNodeCode>([
  'PHOTOSYNTHESIS',
  'RESPIRATION_FERMENTATION',
  'ENERGY_BALANCE',
]);

const NON_ENZYME_DOMINANT_CODES = new Set<SvtSeCurriculumNodeCode>([
  'PROTEIN_SYNTHESIS',
  'PHOTOSYNTHESIS',
  'RESPIRATION_FERMENTATION',
]);

export function inferSvtSeCurriculumNodeCodesFromText(
  text: string,
): SvtSeCurriculumNodeCode[] {
  const normalizedText = normalizeArabicSearchText(text);
  const matches = RULES.filter((rule) => {
    const matchCount = countRuleMatches(normalizedText, rule.patterns);
    return matchCount >= (rule.minimumMatches ?? 1);
  }).map((rule) => rule.code);

  const selected = new Set(matches);

  if (
    selected.has('ENZYMES') &&
    ([...NON_ENZYME_DOMINANT_CODES].some((code) => selected.has(code)) ||
      selected.has('IMMUNITY') ||
      selected.has('NERVOUS_COMMUNICATION')) &&
    !hasDedicatedEnzymeEvidence(normalizedText)
  ) {
    selected.delete('ENZYMES');
  }

  if (
    selected.has('ENERGY_BALANCE') &&
    ![...ENERGY_TOPIC_CODES].some(
      (code) => code !== 'ENERGY_BALANCE' && selected.has(code),
    )
  ) {
    selected.delete('ENERGY_BALANCE');
  }

  if (
    selected.has('STRUCTURE_FUNCTION') &&
    (selected.has('NERVOUS_COMMUNICATION') || selected.has('IMMUNITY')) &&
    !hasDedicatedStructureFunctionEvidence(normalizedText)
  ) {
    selected.delete('STRUCTURE_FUNCTION');
  }

  if (
    selected.has('PROTEIN_SYNTHESIS') &&
    (selected.has('NERVOUS_COMMUNICATION') ||
      selected.has('IMMUNITY') ||
      selected.has('STRUCTURE_FUNCTION')) &&
    !hasDedicatedProteinSynthesisEvidence(normalizedText)
  ) {
    selected.delete('PROTEIN_SYNTHESIS');
  }

  if (
    selected.has('NERVOUS_COMMUNICATION') &&
    selected.has('IMMUNITY') &&
    !hasDedicatedNervousCommunicationEvidence(normalizedText)
  ) {
    selected.delete('NERVOUS_COMMUNICATION');
  }

  if (
    selected.has('IMMUNITY') &&
    selected.has('NERVOUS_COMMUNICATION') &&
    !hasDedicatedImmunityEvidence(normalizedText)
  ) {
    selected.delete('IMMUNITY');
  }

  if (
    selected.has('NERVOUS_COMMUNICATION') &&
    [...ENERGY_TOPIC_CODES].some((code) => selected.has(code)) &&
    !hasDedicatedNervousCommunicationEvidence(normalizedText)
  ) {
    selected.delete('NERVOUS_COMMUNICATION');
  }

  if (
    selected.has('RESPIRATION_FERMENTATION') &&
    (selected.has('STRUCTURE_FUNCTION') ||
      selected.has('PROTEIN_SYNTHESIS') ||
      selected.has('IMMUNITY') ||
      selected.has('NERVOUS_COMMUNICATION')) &&
    !hasDedicatedRespirationFermentationEvidence(normalizedText)
  ) {
    selected.delete('RESPIRATION_FERMENTATION');
  }

  if (
    selected.has('EARTH_STRUCTURE') &&
    !hasDedicatedEarthStructureEvidence(normalizedText)
  ) {
    selected.delete('EARTH_STRUCTURE');
  }

  if (!selected.size && normalizedText.includes('بروتين')) {
    selected.add('STRUCTURE_FUNCTION');
  }

  return SVT_SE_CURRICULUM_NODE_CODES.filter((code) => selected.has(code));
}

export function filterSvtMCurriculumNodeCodes(
  codes: SvtCurriculumNodeCode[],
): SvtMAllowedCurriculumNodeCode[] {
  const allowedCodes = new Set<string>(SVT_M_CURRICULUM_NODE_CODES);

  return codes.filter((code): code is SvtMAllowedCurriculumNodeCode =>
    allowedCodes.has(code),
  );
}

export function inferSvtMCurriculumNodeCodesFromText(
  text: string,
): SvtMAllowedCurriculumNodeCode[] {
  const selected = new Set<SvtMAllowedCurriculumNodeCode>(
    filterSvtMCurriculumNodeCodes(inferSvtSeCurriculumNodeCodesFromText(text)),
  );
  const normalizedText = normalizeArabicSearchText(text);

  for (const rule of M_ONLY_RULES) {
    const matchCount = countRuleMatches(normalizedText, rule.patterns);

    if (matchCount >= (rule.minimumMatches ?? 1)) {
      selected.add(rule.code);
    }
  }

  return SVT_M_CURRICULUM_NODE_CODES.filter((code) => selected.has(code));
}

function countRuleMatches(text: string, patterns: string[]): number {
  return patterns.filter((pattern) =>
    text.includes(normalizeArabicSearchText(pattern)),
  ).length;
}

function hasDedicatedEnzymeEvidence(text: string): boolean {
  return [
    'sod',
    'superoxide dismutase',
    'ribonuclease',
    'الريبونوكلياز',
    'الموقع الفعال',
    'معقد انزيم',
    'النشاط الانزيمي',
    'سيليلوز',
    'naga',
    'nagase',
    '2-dg',
  ].some((pattern) => text.includes(normalizeArabicSearchText(pattern)));
}

function hasDedicatedStructureFunctionEvidence(text: string): boolean {
  return [
    'البنيه الفراغيه',
    'بنيته الفراغيه',
    'بنيتها الفراغيه',
    'التخصص الوظيفي',
    'تخصصه الوظيفي',
    'الخصائص الوظيفيه للبروتينات',
    'العلاقه بين البنيه',
    'البنيه والوظيفه',
    'rastop',
  ].some((pattern) => text.includes(normalizeArabicSearchText(pattern)));
}

function hasDedicatedProteinSynthesisEvidence(text: string): boolean {
  return [
    'تركيب البروتين',
    'تركيبها بتدخل',
    'تركيب بروتين',
    'التعبير عن المعلومه الوراثيه',
    'التعبير عن المعلومة الوراثية',
    'الترجمه',
    'الاستنساخ',
    'arn بوليميراز',
    'الشفره الوراثيه',
    'الرامزه',
    'تتابع النيكليوتيدات',
    'الثلاثيات النيكليوتيديه',
    'الريبوزوم',
    'tetracycline',
    'oxazolidinone',
    'gentamicine',
    'الريسين',
  ].some((pattern) => text.includes(normalizeArabicSearchText(pattern)));
}

function hasDedicatedImmunityEvidence(text: string): boolean {
  return [
    'المناعه',
    'استجابه مناعيه',
    'استجابة مناعية',
    'الجهاز المناعي',
    'مستضد',
    'المستضدي',
    'لمفاويه',
    'لمفاويات',
    'الخلايا التائيه',
    'lt4',
    'lt8',
    'ltc',
    'vih',
    'داء فقدان المناعه المكتسبه',
    'الذات واللاذات',
    'اللاذات',
    'التسامح المناعي',
    'نظام ال abo',
    'abo',
    'نقل الدم',
    'hla',
    'برفورين',
    'perforin',
    'الغرأنزيم',
    'انترلوكين',
    'بلعمه',
    'اناتوكسين',
    'bacterie',
    'bacteria',
  ].some((pattern) => text.includes(normalizeArabicSearchText(pattern)));
}

function hasDedicatedNervousCommunicationEvidence(text: string): boolean {
  return [
    'العصبون',
    'العصبونات',
    'الليف العصبي',
    'غشاء العصبون',
    'المشابك',
    'المشبك',
    'التشابك',
    'مشبكي',
    'بعد مشبكي',
    'مبلغات عصبيه',
    'كمون عمل',
    'كمون الراحه',
    'الاستقطاب',
    'مشابك تنبيهيه',
    'مشابك تثبيطيه',
    'gaba',
    'glutamate',
    'الادينوزين',
    'المورفين',
  ].some((pattern) => text.includes(normalizeArabicSearchText(pattern)));
}

function hasDedicatedRespirationFermentationEvidence(text: string): boolean {
  return [
    'تنفس خلوي',
    'الاكسده الخلويه',
    'الاكسدة الخلوية',
    'تحلل سكري',
    'التحلل السكري',
    'حمض البيروفيك',
    'البيروفيك',
    'الغلوكوز',
    'glucose',
    'nadh',
    'nad+',
    'التخمر',
    'تخمر',
    'فطر الخميره',
    'خلية الخميره',
    'خليه الخميره',
    'الميتوكوندري',
    'الفسفره التاكسديه',
    'السلسله التنفسيه',
    '2-dg',
    'desoxyglucose',
  ].some((pattern) => text.includes(normalizeArabicSearchText(pattern)));
}

function hasDedicatedEarthStructureEvidence(text: string): boolean {
  return [
    'بنيه وخصائص الكره الارضيه',
    'بنيه الكره الارضيه',
    'المعطيات الزلزاليه',
    'الموجات الزلزاليه',
    'الزلازل',
    'سرعه الموجات',
    'القشره الارضيه',
    'رداء الكره الارضيه',
    'نواه الكره الارضيه',
    'الغلاف الصخري',
    'الرداء',
    'النواه',
  ].some((pattern) => text.includes(normalizeArabicSearchText(pattern)));
}

function normalizeArabicSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[’'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
