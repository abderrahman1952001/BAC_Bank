import { CourseAuthoredContentService } from './course-authored-content';
import { TheoryContentStorageService } from './theory-content-storage';

describe('course authored content registry', () => {
  const service = new CourseAuthoredContentService(
    new TheoryContentStorageService(),
  );

  it('serves SVT proteins from the canonical course blueprint', async () => {
    const topic = await service.getAuthoredCourseTopicContent(
      'NATURAL_SCIENCES',
      'proteins',
    );

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
      curriculumJourneyTitle: 'مدخل المجال',
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
    expect(topic?.concepts[0].steps[0]?.visual?.asset?.url).toContain(
      '/api/v1/courses/assets?path=canonical%2Fsvt%2FSE%2Fproteins%2Fassets%2Fgenerated%2F',
    );
  });

  it('keeps existing static math content available', async () => {
    const topic = await service.getAuthoredCourseTopicContent(
      'MATHEMATICS',
      'functions',
    );

    expect(topic?.concepts[0]).toMatchObject({
      conceptCode: 'NUMERIC_FUNCTION',
      slug: 'numeric-function',
    });
  });

  it('does not serve the removed scientific math sequences draft', async () => {
    const topic = await service.getAuthoredCourseTopicContent(
      'MATHEMATICS',
      'sequences',
    );

    expect(topic).toBeNull();
  });
});
