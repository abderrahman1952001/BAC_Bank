import type {
  CourseConceptQuiz,
  CourseConceptStep,
  CourseDepthPortal,
} from '@bac-bank/contracts/courses';
import {
  courseConceptQuizSchema,
  courseConceptStepSchema,
  courseDepthPortalSchema,
} from '@bac-bank/contracts/courses';
import { z } from 'zod';

export type CourseBlueprintStatus = 'draft' | 'reviewed' | 'published';
export type CourseBlueprintConceptQuality = 'SKELETON' | 'POLISHED';
export type CourseBlueprintConceptRole =
  | 'FIELD_INTRO'
  | 'UNIT_INTRO'
  | 'LESSON'
  | 'FIELD_SYNTHESIS';

export type CourseBlueprintSourceIntelligence = {
  programmePath: string;
  sourceIds: string[];
  notes: string[];
};

export type CourseBlueprintVisualStyle = {
  imageModel: string;
  name: string;
  description: string;
  promptPrefix: string;
  negativePrompt: string;
};

export type CourseBlueprintConcept = {
  conceptCode: string;
  unitCode: string;
  role: CourseBlueprintConceptRole;
  quality: CourseBlueprintConceptQuality;
  slug: string;
  roadmapTitle: string;
  title: string;
  summary: string;
  learningObjective: string;
  estimatedMinutes: number;
  steps: CourseConceptStep[];
  depthPortals: CourseDepthPortal[];
  quiz: CourseConceptQuiz;
};

export type CourseBlueprint = {
  id: string;
  status: CourseBlueprintStatus;
  title: string;
  description: string;
  subjectCode: string;
  stream: string;
  fieldCode: string;
  requiredUnitCodes: string[];
  visualStyle: CourseBlueprintVisualStyle;
  topicCode: string;
  topicSlug: string;
  sourceIntelligence: CourseBlueprintSourceIntelligence;
  concepts: CourseBlueprintConcept[];
};

export type CourseBlueprintAuthoredConceptContent = {
  conceptCode: string;
  unitCode?: string;
  role?: CourseBlueprintConceptRole;
  quality?: CourseBlueprintConceptQuality;
  slug: string;
  roadmapTitle?: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  steps: CourseConceptStep[];
  depthPortals?: CourseDepthPortal[];
  quiz: CourseConceptQuiz;
};

export type CourseBlueprintAuthoredTopicContent = {
  subjectCode: string;
  stream?: string;
  fieldCode?: string;
  topicCode?: string;
  topicSlug: string;
  title?: string;
  description?: string;
  requiredUnitCodes?: string[];
  concepts: CourseBlueprintAuthoredConceptContent[];
};

const courseBlueprintConceptSchema: z.ZodType<CourseBlueprintConcept> =
  z.object({
    conceptCode: z.string().min(1),
    unitCode: z.string().min(1),
    role: z.enum(['FIELD_INTRO', 'UNIT_INTRO', 'LESSON', 'FIELD_SYNTHESIS']),
    quality: z.enum(['SKELETON', 'POLISHED']),
    slug: z.string().min(1),
    roadmapTitle: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    learningObjective: z.string().min(1),
    estimatedMinutes: z.number().int().min(1),
    steps: z.array(courseConceptStepSchema).min(1),
    depthPortals: z.array(courseDepthPortalSchema).default([]),
    quiz: courseConceptQuizSchema,
  });

export const courseBlueprintSchema: z.ZodType<CourseBlueprint> = z
  .object({
    id: z.string().min(1),
    status: z.enum(['draft', 'reviewed', 'published']),
    title: z.string().min(1),
    description: z.string().min(1),
    subjectCode: z.string().min(1),
    stream: z.string().min(1),
    fieldCode: z.string().min(1),
    requiredUnitCodes: z.array(z.string().min(1)).min(1),
    visualStyle: z.object({
      imageModel: z.string().min(1),
      name: z.string().min(1),
      description: z.string().min(1),
      promptPrefix: z.string().min(1),
      negativePrompt: z.string().min(1),
    }),
    topicCode: z.string().min(1),
    topicSlug: z.string().min(1),
    sourceIntelligence: z.object({
      programmePath: z.string().min(1),
      sourceIds: z.array(z.string().min(1)),
      notes: z.array(z.string().min(1)),
    }),
    concepts: z.array(courseBlueprintConceptSchema).min(1),
  })
  .superRefine((blueprint, context) => {
    const conceptSlugs = new Set<string>();
    const conceptCodes = new Set<string>();
    const requiredUnitCodes = new Set<string>();
    const coveredUnitCodes = new Set<string>();
    const unitIntroCodes = new Set<string>();

    for (const [unitIndex, unitCode] of blueprint.requiredUnitCodes.entries()) {
      if (requiredUnitCodes.has(unitCode)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate required unit code "${unitCode}".`,
          path: ['requiredUnitCodes', unitIndex],
        });
      }

      requiredUnitCodes.add(unitCode);
    }

    for (const [conceptIndex, concept] of blueprint.concepts.entries()) {
      if (!requiredUnitCodes.has(concept.unitCode)) {
        context.addIssue({
          code: 'custom',
          message: `Concept "${concept.slug}" uses undeclared unit "${concept.unitCode}".`,
          path: ['concepts', conceptIndex, 'unitCode'],
        });
      }

      if (conceptSlugs.has(concept.slug)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate concept slug "${concept.slug}".`,
          path: ['concepts', conceptIndex, 'slug'],
        });
      }

      if (conceptCodes.has(concept.conceptCode)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate concept code "${concept.conceptCode}".`,
          path: ['concepts', conceptIndex, 'conceptCode'],
        });
      }

      conceptSlugs.add(concept.slug);
      conceptCodes.add(concept.conceptCode);
      coveredUnitCodes.add(concept.unitCode);

      if (concept.role === 'UNIT_INTRO') {
        unitIntroCodes.add(concept.unitCode);
      }

      validateConceptSteps(concept, conceptIndex, context);
    }

    if (blueprint.concepts[0]?.role !== 'FIELD_INTRO') {
      context.addIssue({
        code: 'custom',
        message: `Blueprint "${blueprint.id}" must start with a field introduction.`,
        path: ['concepts', 0, 'role'],
      });
    }

    for (const unitCode of requiredUnitCodes) {
      if (!coveredUnitCodes.has(unitCode)) {
        context.addIssue({
          code: 'custom',
          message: `Blueprint "${blueprint.id}" must include at least one concept for unit "${unitCode}".`,
          path: ['requiredUnitCodes'],
        });
      }

      if (!unitIntroCodes.has(unitCode)) {
        context.addIssue({
          code: 'custom',
          message: `Blueprint "${blueprint.id}" must include a unit introduction for unit "${unitCode}".`,
          path: ['requiredUnitCodes'],
        });
      }
    }
  });

function validateConceptSteps(
  concept: CourseBlueprintConcept,
  conceptIndex: number,
  context: z.RefinementCtx,
) {
  const stepIds = new Set<string>();
  let hasExamLens = false;
  let hasVisual = false;
  let hasInteraction = false;
  let visualCount = 0;
  let interactionCount = 0;
  let examLensCount = 0;

  for (const [stepIndex, step] of concept.steps.entries()) {
    if (stepIds.has(step.id)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate step id "${step.id}".`,
        path: ['concepts', conceptIndex, 'steps', stepIndex, 'id'],
      });
    }

    stepIds.add(step.id);
    hasExamLens = hasExamLens || Boolean(step.examLens);
    hasVisual = hasVisual || Boolean(step.visual);
    hasInteraction = hasInteraction || Boolean(step.interaction);
    visualCount += step.visual ? 1 : 0;
    interactionCount += step.interaction ? 1 : 0;
    examLensCount += step.examLens ? 1 : 0;
  }

  if (!hasExamLens) {
    context.addIssue({
      code: 'custom',
      message: `Concept "${concept.slug}" must include at least one BAC exam lens.`,
      path: ['concepts', conceptIndex, 'steps'],
    });
  }

  if (!hasVisual) {
    context.addIssue({
      code: 'custom',
      message: `Concept "${concept.slug}" must include at least one visual plan.`,
      path: ['concepts', conceptIndex, 'steps'],
    });
  }

  if (!hasInteraction) {
    context.addIssue({
      code: 'custom',
      message: `Concept "${concept.slug}" must include at least one interaction.`,
      path: ['concepts', conceptIndex, 'steps'],
    });
  }

  if (concept.quality === 'POLISHED') {
    if (concept.steps.length < 3) {
      context.addIssue({
        code: 'custom',
        message: `Polished concept "${concept.slug}" must include at least three steps.`,
        path: ['concepts', conceptIndex, 'steps'],
      });
    }

    if (visualCount < 2) {
      context.addIssue({
        code: 'custom',
        message: `Polished concept "${concept.slug}" must include at least two visual plans.`,
        path: ['concepts', conceptIndex, 'steps'],
      });
    }

    if (interactionCount < 2) {
      context.addIssue({
        code: 'custom',
        message: `Polished concept "${concept.slug}" must include at least two interactions.`,
        path: ['concepts', conceptIndex, 'steps'],
      });
    }

    if (examLensCount < 2) {
      context.addIssue({
        code: 'custom',
        message: `Polished concept "${concept.slug}" must include at least two BAC exam lenses.`,
        path: ['concepts', conceptIndex, 'steps'],
      });
    }
  }
}

export function parseCourseBlueprint(value: unknown) {
  const parsed = courseBlueprintSchema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  const details = parsed.error.issues
    .slice(0, 5)
    .map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`)
    .join('; ');

  throw new Error(`CourseBlueprint is invalid. ${details}`);
}

function formatIssuePath(path: PropertyKey[]) {
  if (!path.length) {
    return 'root';
  }

  return path
    .map((segment) =>
      typeof segment === 'number' ? `[${segment}]` : String(segment),
    )
    .join('.');
}

export function toAuthoredCourseTopicContent(
  blueprint: CourseBlueprint,
): CourseBlueprintAuthoredTopicContent {
  return {
    subjectCode: blueprint.subjectCode,
    stream: blueprint.stream,
    fieldCode: blueprint.fieldCode,
    topicCode: blueprint.topicCode,
    topicSlug: blueprint.topicSlug,
    title: blueprint.title,
    description: blueprint.description,
    requiredUnitCodes: blueprint.requiredUnitCodes,
    concepts: blueprint.concepts.map((concept) => ({
      conceptCode: concept.conceptCode,
      unitCode: concept.unitCode,
      role: concept.role,
      quality: concept.quality,
      slug: concept.slug,
      roadmapTitle: concept.roadmapTitle,
      title: concept.title,
      summary: concept.summary,
      estimatedMinutes: concept.estimatedMinutes,
      steps: concept.steps,
      depthPortals: concept.depthPortals,
      quiz: concept.quiz,
    })),
  };
}
