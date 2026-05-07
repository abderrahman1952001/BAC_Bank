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

  it('serves the scientific math sequences canonical blueprint', () => {
    const topic = getAuthoredCourseTopicContent('MATHEMATICS', 'sequences');

    expect(topic).toMatchObject({
      subjectCode: 'MATHEMATICS',
      stream: 'SE-M-MT',
      topicSlug: 'sequences',
      requiredUnitCodes: ['SEQUENCES'],
    });
    expect(topic?.concepts).toHaveLength(13);
    expect(topic?.concepts[0]).toMatchObject({
      conceptCode: 'SEQ_FIELD_GATE',
      role: 'FIELD_INTRO',
      quality: 'POLISHED',
      roadmapTitle: 'مدخل المتتاليات',
    });
    expect(topic?.concepts[1]).toMatchObject({
      conceptCode: 'SEQ_UNIT_MAP',
      role: 'UNIT_INTRO',
    });
    const lastConcept = topic?.concepts[topic.concepts.length - 1];

    expect(lastConcept).toMatchObject({
      conceptCode: 'SEQ_BAC_BOSS',
      role: 'FIELD_SYNTHESIS',
    });
    expect(
      topic?.concepts.every(
        (concept) =>
          concept.steps.length >= 3 &&
          concept.steps.filter((step) => step.visual).length >= 2 &&
          concept.steps.filter((step) => step.interaction).length >= 2 &&
          concept.steps.filter((step) => step.examLens).length >= 2,
      ),
    ).toBe(true);
  });
});
