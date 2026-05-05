import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  findCourseBlueprintFiles,
  loadCanonicalCourseBlueprints,
} from './course-blueprint-files';
import {
  parseCourseBlueprint,
  toAuthoredCourseTopicContent,
} from './course-blueprint';

const validBlueprint = {
  id: 'svt-se-proteins-foundation',
  status: 'draft',
  title: 'Proteins: From Code To Living Function',
  description: 'A narrow first SVT course slice.',
  subjectCode: 'NATURAL_SCIENCES',
  stream: 'SE',
  fieldCode: 'PROTEINS',
  requiredUnitCodes: ['PROTEIN_SYNTHESIS'],
  visualStyle: {
    imageModel: 'gpt-image-1',
    name: 'premium-3d-biology-atlas',
    description:
      'Premium 3D-ish biology visuals with luminous molecular surfaces, clean Arabic labels, deep navy background, teal/cyan highlights, and restrained gold accents.',
    promptPrefix:
      'Use the premium-3d-biology-atlas theme: cinematic 3D-ish biology render, luminous molecular surfaces, clean Arabic labels, deep navy background, teal/cyan highlights, restrained gold accents, high contrast, uncluttered educational composition.',
    negativePrompt:
      'No childish cartoon style, no cluttered textbook scans, no photoreal gore, no dense paragraphs inside the image.',
  },
  topicCode: 'PROTEINS',
  topicSlug: 'proteins',
  sourceIntelligence: {
    programmePath: 'bac_theory_content/programmes/svt/SE.yml',
    sourceIds: ['source-1-silver-series-svt-se'],
    notes: [
      'Sources inform scope and traps, not final expression.',
      'Canonical explanations and visuals are platform-authored.',
    ],
  },
  concepts: [
    {
      conceptCode: 'PROTEIN_FIELD_OPENING',
      unitCode: 'PROTEIN_SYNTHESIS',
      role: 'FIELD_INTRO',
      quality: 'SKELETON',
      slug: 'protein-field-opening',
      roadmapTitle: 'مدخل المجال',
      title: 'لماذا تبدأ الحياة بالبروتينات؟',
      summary: 'مدخل للمجال.',
      learningObjective: 'يربط الطالب البروتينات بوظائف حية قابلة للتحليل.',
      estimatedMinutes: 5,
      steps: [
        {
          id: 'hook',
          type: 'HOOK',
          eyebrow: 'مدخل',
          title: 'داخل الخلية توجد آلات لا عناوين',
          body: 'البروتينات آلات خلوية دقيقة وليست قائمة مصطلحات للحفظ.',
          bullets: [],
          visual: {
            kind: 'COMPARISON',
            title: 'أدوار البروتينات',
            description: 'لوحة مقارنة لأدوار البروتينات.',
            prompt: 'Show several protein roles as molecular machines.',
            altText: 'أدوار مختلفة للبروتينات.',
          },
          interaction: {
            kind: 'TAP_REVEAL',
            prompt: 'اكشف دور كل بروتين.',
            items: ['تحفيز', 'تعرف'],
            answer: null,
          },
          examLens: {
            bacSkill: 'ربط البنية بالوظيفة',
            prompt: 'اربط كل وظيفة بدليل من الوثيقة.',
            trap: 'حفظ الدور دون تفسيره.',
          },
        },
      ],
      depthPortals: [
        {
          slug: 'why-proteins-are-machines',
          kind: 'ADVANCED_CONTEXT',
          title: 'لماذا نقول آلة؟',
          summary: 'توسيع اختياري.',
          body: 'الشكل والحركة والانتقاء النوعي تجعل الاستعارة مفيدة.',
          estimatedMinutes: 3,
        },
      ],
      quiz: {
        question: 'ما الفكرة المركزية في المجال؟',
        options: ['حفظ أسماء البروتينات', 'ربط البنية بالوظيفة'],
        correctIndex: 1,
        explanation: 'المجال يدور حول تحول المعلومة إلى وظيفة.',
      },
    },
    {
      conceptCode: 'PROTEIN_SYNTHESIS_INTRO',
      unitCode: 'PROTEIN_SYNTHESIS',
      role: 'UNIT_INTRO',
      quality: 'SKELETON',
      slug: 'protein-synthesis-intro',
      roadmapTitle: 'تركيب البروتين',
      title: 'قبل أن نركب بروتينا: ما الرحلة التي سنمشيها؟',
      summary: 'مدخل وحدة تركيب البروتين.',
      learningObjective: 'يعرف الطالب خريطة وحدة تركيب البروتين قبل تفاصيلها.',
      estimatedMinutes: 4,
      steps: [
        {
          id: 'unit-hook',
          type: 'HOOK',
          eyebrow: 'مدخل',
          title: 'من رسالة إلى سلسلة',
          body: 'هذه الوحدة تحول المعلومة الوراثية إلى سلسلة أحماض أمينية.',
          bullets: [],
          visual: {
            kind: 'SEQUENCE',
            title: 'خريطة تركيب البروتين',
            description: 'مسار ADN إلى ARNm ثم ترجمة.',
            prompt: 'Show DNA to mRNA to protein synthesis map.',
            altText: 'خريطة تركيب البروتين.',
          },
          interaction: {
            kind: 'ORDERING',
            prompt: 'رتب المسار.',
            items: ['ADN', 'ARNm', 'بروتين'],
            answer: 'ADN -> ARNm -> بروتين',
          },
          examLens: {
            bacSkill: 'تحديد الظاهرة',
            prompt: 'حدد هل الوثيقة عن الاستنساخ أم الترجمة.',
            trap: 'خلط مراحل تركيب البروتين.',
          },
        },
      ],
      depthPortals: [],
      quiz: {
        question: 'ما المسار العام؟',
        options: ['ADN ثم ARNm ثم بروتين', 'بروتين ثم ADN'],
        correctIndex: 0,
        explanation: 'تركيب البروتين يبدأ من المعلومة وينتهي بسلسلة بروتينية.',
      },
    },
  ],
};

describe('course blueprint authoring boundary', () => {
  it('parses canonical course blueprints and maps them to authored topic content', () => {
    const blueprint = parseCourseBlueprint(validBlueprint);
    const authoredTopic = toAuthoredCourseTopicContent(blueprint);

    expect(authoredTopic).toMatchObject({
      subjectCode: 'NATURAL_SCIENCES',
      topicSlug: 'proteins',
    });
    expect(authoredTopic.concepts[0]).toMatchObject({
      conceptCode: 'PROTEIN_FIELD_OPENING',
      slug: 'protein-field-opening',
      roadmapTitle: 'مدخل المجال',
      role: 'FIELD_INTRO',
      depthPortals: [
        {
          slug: 'why-proteins-are-machines',
        },
      ],
    });
  });

  it('rejects duplicate concept slugs inside a blueprint', () => {
    expect(() =>
      parseCourseBlueprint({
        ...validBlueprint,
        concepts: [
          validBlueprint.concepts[0],
          {
            ...validBlueprint.concepts[0],
            conceptCode: 'PROTEIN_WORLD_DUPLICATE',
          },
        ],
      }),
    ).toThrow(/Duplicate concept slug/);
  });

  it('rejects concepts without visual and interaction support', () => {
    expect(() =>
      parseCourseBlueprint({
        ...validBlueprint,
        concepts: [
          {
            ...validBlueprint.concepts[0],
            steps: [
              {
                ...validBlueprint.concepts[0].steps[0],
                visual: null,
                interaction: null,
              },
            ],
          },
        ],
      }),
    ).toThrow(/must include at least one visual plan/);
  });

  it('rejects polished concepts that do not have enough visual coverage', () => {
    expect(() =>
      parseCourseBlueprint({
        ...validBlueprint,
        concepts: [
          {
            ...validBlueprint.concepts[0],
            quality: 'POLISHED',
            steps: validBlueprint.concepts[0].steps,
          },
          validBlueprint.concepts[1],
        ],
      }),
    ).toThrow(/must include at least two visual plans/);
  });

  it('rejects blueprints that miss required field unit coverage', () => {
    expect(() =>
      parseCourseBlueprint({
        ...validBlueprint,
        requiredUnitCodes: ['PROTEIN_SYNTHESIS', 'ENZYMES'],
      }),
    ).toThrow(/must include at least one concept for unit "ENZYMES"/);
  });

  it('rejects concepts assigned to units outside the declared coverage', () => {
    expect(() =>
      parseCourseBlueprint({
        ...validBlueprint,
        concepts: [
          {
            ...validBlueprint.concepts[0],
            unitCode: 'NERVOUS_COMMUNICATION',
          },
        ],
      }),
    ).toThrow(/uses undeclared unit "NERVOUS_COMMUNICATION"/);
  });

  it('rejects blueprints without a field introduction at the beginning', () => {
    expect(() =>
      parseCourseBlueprint({
        ...validBlueprint,
        concepts: [
          {
            ...validBlueprint.concepts[0],
            role: 'LESSON',
          },
          validBlueprint.concepts[1],
        ],
      }),
    ).toThrow(/must start with a field introduction/);
  });

  it('rejects blueprints without a unit introduction for every required unit', () => {
    expect(() =>
      parseCourseBlueprint({
        ...validBlueprint,
        concepts: [
          validBlueprint.concepts[0],
          {
            ...validBlueprint.concepts[1],
            role: 'LESSON',
          },
        ],
      }),
    ).toThrow(/must include a unit introduction for unit "PROTEIN_SYNTHESIS"/);
  });

  it('discovers and validates blueprint files from a canonical content root', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'bac-course-blueprints-'));
    const blueprintDir = join(rootDir, 'svt', 'SE', 'proteins');
    mkdirSync(blueprintDir, { recursive: true });
    writeFileSync(
      join(blueprintDir, 'course.json'),
      JSON.stringify(validBlueprint),
      'utf8',
    );

    expect(findCourseBlueprintFiles(rootDir)).toEqual([
      join(blueprintDir, 'course.json'),
    ]);
    expect(loadCanonicalCourseBlueprints(rootDir)).toHaveLength(1);
  });

  it('rejects duplicate canonical blueprints for the same subject and topic', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'bac-course-blueprints-'));
    const firstDir = join(rootDir, 'svt', 'SE', 'proteins');
    const secondDir = join(rootDir, 'svt', 'SE', 'proteins-copy');
    mkdirSync(firstDir, { recursive: true });
    mkdirSync(secondDir, { recursive: true });
    writeFileSync(
      join(firstDir, 'course.json'),
      JSON.stringify(validBlueprint),
      'utf8',
    );
    writeFileSync(
      join(secondDir, 'course.json'),
      JSON.stringify({
        ...validBlueprint,
        id: 'svt-se-proteins-copy',
      }),
      'utf8',
    );

    expect(() => loadCanonicalCourseBlueprints(rootDir)).toThrow(
      /Duplicate canonical course blueprint/,
    );
  });

  it('loads the repository SVT proteins blueprint from canonical content', () => {
    const blueprints = loadCanonicalCourseBlueprints();
    const proteinsBlueprint = blueprints.find(
      (blueprint) =>
        blueprint.subjectCode === 'NATURAL_SCIENCES' &&
        blueprint.topicSlug === 'proteins',
    );

    expect(proteinsBlueprint).toMatchObject({
      fieldCode: 'PROTEINS',
      topicCode: 'PROTEINS',
      visualStyle: {
        imageModel: 'gpt-image-1',
        name: 'premium-3d-biology-atlas',
      },
      requiredUnitCodes: [
        'PROTEIN_SYNTHESIS',
        'STRUCTURE_FUNCTION',
        'ENZYMES',
        'IMMUNITY',
        'NERVOUS_COMMUNICATION',
      ],
    });
    expect(proteinsBlueprint?.concepts.length).toBeGreaterThanOrEqual(20);
    expect(proteinsBlueprint?.concepts[0]).toMatchObject({
      role: 'FIELD_INTRO',
      quality: 'POLISHED',
      roadmapTitle: 'مدخل المجال',
    });
    expect(
      proteinsBlueprint?.concepts
        .filter((concept) => concept.quality === 'POLISHED')
        .map((concept) => concept.slug)
        .slice(0, 6),
    ).toEqual([
      'protein-world',
      'protein-synthesis-unit-intro',
      'dna-instruction',
      'transcription-working-copy',
      'genetic-code',
      'translation-chain',
    ]);
    expect(
      new Set(proteinsBlueprint?.concepts.map((concept) => concept.unitCode)),
    ).toEqual(
      new Set([
        'PROTEIN_SYNTHESIS',
        'STRUCTURE_FUNCTION',
        'ENZYMES',
        'IMMUNITY',
        'NERVOUS_COMMUNICATION',
      ]),
    );
    expect(
      proteinsBlueprint?.requiredUnitCodes.every((unitCode) =>
        proteinsBlueprint.concepts.some(
          (concept) =>
            concept.unitCode === unitCode && concept.role === 'UNIT_INTRO',
        ),
      ),
    ).toBe(true);
  });
});
