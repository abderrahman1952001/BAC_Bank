import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCourseBlueprint } from './course-blueprint';
import {
  buildCourseVisualAssetPlan,
  buildCourseVisualGenerationPrompt,
} from './course-visual-assets';

const blueprint = parseCourseBlueprint({
  id: 'svt-se-proteins-assets',
  status: 'draft',
  title: 'Proteins',
  description: 'Protein course.',
  subjectCode: 'NATURAL_SCIENCES',
  stream: 'SE',
  fieldCode: 'PROTEINS',
  requiredUnitCodes: ['PROTEIN_SYNTHESIS'],
  visualStyle: {
    imageModel: 'gpt-image-1',
    name: 'premium-3d-biology-atlas',
    description: 'Premium biology visual style.',
    promptPrefix: 'Use the premium biology visual style.',
    negativePrompt: 'No clutter.',
  },
  topicCode: 'PROTEINS',
  topicSlug: 'proteins',
  sourceIntelligence: {
    programmePath: 'bac_theory_content/programmes/svt/SE.yml',
    sourceIds: ['source-1'],
    notes: ['Canonical authored content.'],
  },
  concepts: [
    {
      conceptCode: 'FIELD_OPENING',
      unitCode: 'PROTEIN_SYNTHESIS',
      role: 'FIELD_INTRO',
      quality: 'POLISHED',
      slug: 'field-opening',
      roadmapTitle: 'مدخل المجال',
      title: 'لماذا البروتينات؟',
      summary: 'مدخل.',
      learningObjective: 'يفهم الطالب خريطة المجال.',
      estimatedMinutes: 5,
      steps: [
        {
          id: 'hook',
          type: 'HOOK',
          eyebrow: 'مدخل',
          title: 'بروتينات',
          body: 'البروتينات آلات خلوية.',
          bullets: [],
          visual: {
            kind: 'DIAGRAM',
            title: 'آلة خلوية',
            description: 'بروتين كآلة خلوية.',
            prompt: 'Show a protein as a cellular machine.',
            altText: 'بروتين كآلة.',
          },
          interaction: {
            kind: 'TAP_REVEAL',
            prompt: 'اكشف الدور.',
            items: ['تحفيز', 'تعرف'],
            answer: null,
          },
          examLens: {
            bacSkill: 'ربط البنية بالوظيفة',
            prompt: 'اربط الشكل بالوظيفة.',
            trap: 'حفظ الوظيفة دون دليل.',
          },
        },
        {
          id: 'map',
          type: 'EXPLAIN',
          eyebrow: 'خريطة',
          title: 'من معلومة إلى وظيفة',
          body: 'المعلومة تتحول إلى بنية ثم وظيفة.',
          bullets: [],
          visual: {
            kind: 'SEQUENCE',
            title: 'خريطة',
            description: 'من ADN إلى بروتين.',
            prompt: 'Show DNA to protein function.',
            altText: 'خريطة من ADN إلى بروتين.',
          },
          interaction: {
            kind: 'ORDERING',
            prompt: 'رتب المسار.',
            items: ['ADN', 'بروتين'],
            answer: 'ADN -> بروتين',
          },
          examLens: {
            bacSkill: 'بناء تفسير',
            prompt: 'ابن سلسلة سببية.',
            trap: 'القفز إلى النتيجة.',
          },
        },
        {
          id: 'unit-intro',
          type: 'TAKEAWAY',
          eyebrow: 'خلاصة',
          title: 'خلاصة',
          body: 'خلاصة المسار.',
          bullets: [],
          visual: null,
          interaction: null,
          examLens: null,
        },
      ],
      depthPortals: [],
      quiz: {
        question: 'ما الخيط؟',
        options: ['معلومة ثم وظيفة', 'لا شيء'],
        correctIndex: 0,
        explanation: 'الخيط هو المعلومة إلى الوظيفة.',
      },
    },
    {
      conceptCode: 'UNIT_INTRO',
      unitCode: 'PROTEIN_SYNTHESIS',
      role: 'UNIT_INTRO',
      quality: 'SKELETON',
      slug: 'unit-intro',
      roadmapTitle: 'تركيب البروتين',
      title: 'تركيب البروتين',
      summary: 'مدخل الوحدة.',
      learningObjective: 'يعرف الطالب خريطة الوحدة.',
      estimatedMinutes: 4,
      steps: [
        {
          id: 'hook',
          type: 'HOOK',
          eyebrow: 'مدخل',
          title: 'خريطة',
          body: 'خريطة الوحدة.',
          bullets: [],
          visual: {
            kind: 'DIAGRAM',
            title: 'خريطة',
            description: 'خريطة.',
            prompt: 'Show map.',
            altText: 'خريطة.',
          },
          interaction: {
            kind: 'SIMPLE_CHOICE',
            prompt: 'اختر.',
            items: ['صحيح', 'خطأ'],
            answer: 'صحيح',
          },
          examLens: {
            bacSkill: 'تحديد الظاهرة',
            prompt: 'حدد الظاهرة.',
            trap: 'خلط الظواهر.',
          },
        },
      ],
      depthPortals: [],
      quiz: {
        question: 'ما الوحدة؟',
        options: ['تركيب البروتين', 'المناعة'],
        correctIndex: 0,
        explanation: 'الوحدة هي تركيب البروتين.',
      },
    },
  ],
});

describe('course visual asset planner', () => {
  it('plans canonical generated image assets for polished visual steps', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'course-assets-'));
    const courseFilePath = join(
      rootDir,
      'svt',
      'SE',
      'proteins',
      'course.json',
    );

    const plan = buildCourseVisualAssetPlan({
      blueprint,
      courseFilePath,
      canonicalRootDir: rootDir,
      limit: 1,
    });

    expect(plan.jobs).toHaveLength(1);
    expect(plan.jobs[0]).toMatchObject({
      conceptSlug: 'field-opening',
      stepId: 'hook',
      assetPath: 'assets/generated/field-opening/hook.png',
      assetUrl:
        '/api/course-assets/svt/SE/proteins/assets/generated/field-opening/hook.png',
      status: 'PENDING',
      model: 'gpt-image-1',
    });
    expect(plan.jobs[0].prompt).toContain(
      'Use the premium biology visual style.',
    );
    expect(plan.jobs[0].prompt).toContain(
      'Show a protein as a cellular machine.',
    );
    expect(plan.jobs[0].prompt).toContain('No clutter.');
    expect(plan.updatedBlueprint.concepts[0].steps[0].visual?.asset).toEqual(
      expect.objectContaining({
        status: 'PENDING',
        path: 'assets/generated/field-opening/hook.png',
        url: '/api/course-assets/svt/SE/proteins/assets/generated/field-opening/hook.png',
        reviewStatus: 'UNREVIEWED',
      }),
    );
  });

  it('can plan an existing pending asset for generation', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'course-assets-'));
    const courseFilePath = join(
      rootDir,
      'svt',
      'SE',
      'proteins',
      'course.json',
    );
    const prepared = buildCourseVisualAssetPlan({
      blueprint,
      courseFilePath,
      canonicalRootDir: rootDir,
      limit: 1,
    });

    const generationPlan = buildCourseVisualAssetPlan({
      blueprint: prepared.updatedBlueprint,
      courseFilePath,
      canonicalRootDir: rootDir,
      limit: 1,
      includeExistingPending: true,
    });

    expect(generationPlan.jobs).toHaveLength(1);
    expect(generationPlan.jobs[0]).toMatchObject({
      conceptSlug: 'field-opening',
      stepId: 'hook',
      assetPath: 'assets/generated/field-opening/hook.png',
      status: 'PENDING',
    });
  });

  it('does not duplicate the global style prefix when a visual prompt already has it', () => {
    const generationPrompt = buildCourseVisualGenerationPrompt(
      blueprint.visualStyle,
      `${blueprint.visualStyle.promptPrefix} Show the diagram.`,
    );

    expect(
      generationPrompt.match(/Use the premium biology visual style\./g),
    ).toHaveLength(1);
    expect(generationPrompt).toContain('Show the diagram.');
    expect(generationPrompt).toContain('Avoid: No clutter.');
  });
});
