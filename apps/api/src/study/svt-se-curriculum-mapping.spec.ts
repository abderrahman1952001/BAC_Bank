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
