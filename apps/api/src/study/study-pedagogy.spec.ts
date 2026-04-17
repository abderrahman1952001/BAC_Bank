import {
  buildCommonTrapMessage,
  getFallbackPedagogyRules,
  resolveStudySupportStyle,
} from './study-pedagogy';

describe('study pedagogy profiles', () => {
  it('resolves support style from subject code', () => {
    expect(resolveStudySupportStyle('HISTORY_GEOGRAPHY')).toBe('CONTENT_HEAVY');
    expect(resolveStudySupportStyle('PHILOSOPHY')).toBe('ESSAY_HEAVY');
    expect(resolveStudySupportStyle('MATHEMATICS')).toBe('LOGIC_HEAVY');
  });

  it('returns profile fallback rules per support style', () => {
    expect(getFallbackPedagogyRules('CONTENT_HEAVY')).toEqual([
      'استخرج الفكرة أو الحدث المركزي أولاً.',
      'رتّب الإجابة في عناصر قصيرة قبل التوسع.',
      'تحقق من المصطلحات أو الكلمات المفتاحية قبل كشف الحل.',
    ]);
  });

  it('builds common trap copy from the support profile', () => {
    expect(
      buildCommonTrapMessage({
        supportStyle: 'ESSAY_HEAVY',
        dominantReason: 'REVEALED',
      }),
    ).toBe(
      'أكثر ما يضعف هذا المحور هو مقارنة الجواب بالنموذج قبل تثبيت البناء المنهجي للإجابة الخاصة بك.',
    );
  });
});
