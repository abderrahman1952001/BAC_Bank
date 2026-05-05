import { getAuthoredCourseTopicContent } from './course-authored-content';

describe('course authored content registry', () => {
  it('serves SVT proteins from the canonical course blueprint', () => {
    const topic = getAuthoredCourseTopicContent('NATURAL_SCIENCES', 'proteins');

    expect(topic).toMatchObject({
      subjectCode: 'NATURAL_SCIENCES',
      topicSlug: 'proteins',
    });
    const conceptSlugs = topic?.concepts.map((concept) => concept.slug);

    expect(conceptSlugs?.slice(0, 5)).toEqual([
      'protein-world',
      'protein-synthesis-unit-intro',
      'dna-instruction',
      'transcription-working-copy',
      'genetic-code',
    ]);
    expect(conceptSlugs).toEqual(
      expect.arrayContaining([
        'enzyme-conditions',
        'humoral-response',
        'synaptic-transmission',
        'protein-field-synthesis',
      ]),
    );
    expect(topic?.concepts.length).toBeGreaterThanOrEqual(30);
    expect(topic?.concepts[0]).toMatchObject({
      role: 'FIELD_INTRO',
      roadmapTitle: 'مدخل المجال',
      title: 'لماذا تبدأ الحياة بالبروتينات؟',
    });
    expect(
      topic?.concepts.filter((concept) => concept.role === 'UNIT_INTRO'),
    ).toHaveLength(5);
    expect(new Set(topic?.concepts.map((concept) => concept.unitCode))).toEqual(
      new Set([
        'PROTEIN_SYNTHESIS',
        'STRUCTURE_FUNCTION',
        'ENZYMES',
        'IMMUNITY',
        'NERVOUS_COMMUNICATION',
      ]),
    );
    expect(topic?.concepts[0].summary).toContain('آلات خلوية');
    expect(topic?.concepts[0].depthPortals?.[0]?.slug).toBe(
      'why-proteins-are-machines',
    );
  });

  it('keeps existing static math content available', () => {
    const topic = getAuthoredCourseTopicContent('MATHEMATICS', 'functions');

    expect(topic?.concepts[0]).toMatchObject({
      conceptCode: 'NUMERIC_FUNCTION',
      slug: 'numeric-function',
    });
  });
});
