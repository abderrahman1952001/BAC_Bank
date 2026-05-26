import {
  filterSvtMCurriculumNodeCodes,
  inferSvtMCurriculumNodeCodesFromText,
  inferSvtSeCurriculumNodeCodesFromText,
} from './svt-se-curriculum-mapping';

describe('SVT SE curriculum mapping', () => {
  it('maps protein synthesis prompts from ARN and translation evidence', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'تتدخل البروتينات في التضاعف الخلوي ويتم تركيبها بتدخل أنواع مختلفة من جزيئات الـ ARN باستعمال مادة RIP.',
      ),
    ).toContain('PROTEIN_SYNTHESIS');
  });

  it('does not treat ARNm inside a nervous-system prompt as protein synthesis training by itself', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'تتحكم المشابك المثبطة في نضج الخلايا العصبية ويبين الشكل تطور كمية ARNm للبروتينات الغشائية NKCC1 و KCC2.',
      ),
    ).toEqual(['NERVOUS_COMMUNICATION']);
  });

  it('maps ribonuclease prompts to enzymes instead of broad protein synthesis', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'الريبونوكلياز A أنزيم ينشط في شروط محددة ويفكك الروابط بعد النكليوتيدات في جزيئة ARN.',
      ),
    ).toEqual(['ENZYMES']);
  });

  it('maps photosynthesis prompts without leaking into the enzyme unit', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'في النباتات الخضراء خلال المرحلة الكيموحيوية يحفز أنزيم Rubisco تثبيت جزيئة CO2 على Rudip.',
      ),
    ).toEqual(['PHOTOSYNTHESIS']);
  });

  it('maps nervous communication prompts from synapse and neurotransmitter evidence', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'تؤمن البروتينات الغشائية توازنا بين تنبيه وتثبيط الخلايا العصبية بعد المشبكية بتدخل Glutamate و GABA.',
      ),
    ).toContain('NERVOUS_COMMUNICATION');
  });

  it('maps immunity prompts from ABO and immune tolerance evidence', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'تمثل جزيئات نظام ABO مؤشرات الهوية البيولوجية وتساهم في تحقيق التسامح المناعي خلال نقل الدم.',
      ),
    ).toContain('IMMUNITY');
  });

  it('maps respiration and fermentation prompts from glycolysis evidence', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'التنفس يسمح بتحويل الطاقة الكيميائية في الغلوكوز إلى ATP ويبدأ بالتحلل السكري باستعمال 2-DG.',
      ),
    ).toEqual(['ENZYMES', 'RESPIRATION_FERMENTATION', 'ENERGY_BALANCE']);
  });

  it('maps Earth structure prompts from seismic evidence', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'مكنت المعطيات الزلزالية من معرفة بنية وخصائص الكرة الأرضية والقشرة والرداء.',
      ),
    ).toContain('EARTH_STRUCTURE');
  });

  it('maps historical photosynthesis prompts from green plant oxygen and ATP evidence', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'يستمد النبات الأخضر طاقته لبناء مادته العضوية وتضمن الصانعة الخضراء انطلاق الأكسجين وتشكل الـ ATP.',
      ),
    ).toContain('PHOTOSYNTHESIS');
  });

  it('does not map redox-potential energy prompts to nervous communication by generic potential wording', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'يمثل الشكل مخططا لتفاعلات الأكسدة والإرجاع في التيلاكوئيد، وتدل القيم المعطاة بالفولط على كمون الأكسدة والإرجاع خلال تركيب ATP.',
      ),
    ).toEqual(['PHOTOSYNTHESIS', 'ENERGY_BALANCE']);
  });

  it('maps tectonic activity prompts from Andes and explosive volcanism evidence', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'تقع سلسلة جبال الأنديز على طول الساحل الغربي وتتميز بنشاط تكتوني وبركان انفجاري.',
      ),
    ).toEqual(['PLATE_ACTIVITY', 'TECTONIC_INTERPRETATION']);
  });

  it('does not map immunity prompts to nervous communication just because infected cells are neural cells', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'تم حقن فئران بفيروس ممرض يصيب الخلايا العصبية ثم استخلصت لمفاويات محصنة لدراسة تخريب الخلايا المصابة.',
      ),
    ).toEqual(['IMMUNITY']);
  });

  it('does not map nervous immunofluorescence methods to the immunity unit', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'تمثل الوثيقة صورة للغشاء بعد مشبكي، وقد بينت الدراسة بتقنية الفلورة المناعية التي تعتمد على حقن أجسام مضادة مفلورة ترتبط بمركبات غشائية ذات طبيعة بروتينية.',
      ),
    ).toEqual(['NERVOUS_COMMUNICATION']);
  });

  it('does not map protein-synthesis prompts to the enzyme unit by incidental enzyme wording', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'نضع في أنبوب اختبار مستخلصا خلويا يحتوي على ADN ونكليوتيدات ريبية وإنزيم ARN بوليميراز ثم نقيس كمية ARNm المركبة.',
      ),
    ).toEqual(['PROTEIN_SYNTHESIS']);
  });

  it('does not map protein structure prompts to respiration by symptom wording alone', () => {
    expect(
      inferSvtSeCurriculumNodeCodesFromText(
        'فقر الدم المنجلي مرض من أعراضه صعوبة في التنفس، وتبرز الوثيقة علاقة بنية الهيموغلوبين بوظيفته.',
      ),
    ).toEqual(['STRUCTURE_FUNCTION']);
  });

  it('does not map atmosphere-pollution prompts to Earth structure by generic Earth wording', () => {
    expect(
      inferSvtMCurriculumNodeCodesFromText(
        'يتغير سمك طبقة الأوزون في الغلاف الجوي قرب قطبي الكرة الأرضية بفعل تلوث الجو.',
      ),
    ).toEqual(['AIR_POLLUTION']);
  });

  it('keeps M stream mappings inside the confirmed M curriculum slice', () => {
    expect(
      filterSvtMCurriculumNodeCodes([
        'PROTEIN_SYNTHESIS',
        'ENZYMES',
        'IMMUNITY',
        'NERVOUS_COMMUNICATION',
      ]),
    ).toEqual(['PROTEIN_SYNTHESIS', 'IMMUNITY']);
  });

  it('maps old M atmosphere pollution prompts to the M environment field', () => {
    expect(
      inferSvtMCurriculumNodeCodesFromText(
        'تتركز طبقة الأوزون في الجزء العلوي من الغلاف الجوي وتحمي من الأشعة فوق البنفسجية، ويدرس التمرين أثر تلوث الجو.',
      ),
    ).toEqual(['AIR_POLLUTION']);
  });

  it('does not map UV disinfection protein prompts to M air pollution by UV wording alone', () => {
    expect(
      inferSvtMCurriculumNodeCodesFromText(
        'يرتبط التخصص الوظيفي للبروتينات ببنيتها الفراغية ويتم الاعتماد على الأشعة فوق البنفسجية UV-C كطريقة للتعقيم.',
      ),
    ).toEqual(['STRUCTURE_FUNCTION']);
  });
});
