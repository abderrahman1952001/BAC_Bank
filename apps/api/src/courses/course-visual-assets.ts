import { dirname, relative, sep } from 'node:path';
import type {
  CourseConceptVisual,
  CourseConceptVisualAsset,
} from '@bac-bank/contracts/courses';
import type {
  CourseBlueprint,
  CourseBlueprintVisualStyle,
} from './course-blueprint';

export type CourseVisualAssetJob = {
  id: string;
  conceptSlug: string;
  stepId: string;
  visualTitle: string;
  prompt: string;
  assetPath: string;
  assetUrl: string;
  status: CourseConceptVisualAsset['status'];
  model: string;
  width: number;
  height: number;
};

export type CourseVisualAssetPlan = {
  updatedBlueprint: CourseBlueprint;
  jobs: CourseVisualAssetJob[];
};

export function buildCourseVisualAssetPlan(input: {
  blueprint: CourseBlueprint;
  courseFilePath: string;
  canonicalRootDir: string;
  limit?: number;
  force?: boolean;
  includeExistingPending?: boolean;
}): CourseVisualAssetPlan {
  const updatedBlueprint = cloneBlueprint(input.blueprint);
  const jobs: CourseVisualAssetJob[] = [];
  const courseDir = dirname(input.courseFilePath);
  const courseRoutePrefix = normalizeRoutePath(
    relative(input.canonicalRootDir, courseDir),
  );
  const limit = input.limit ?? Number.POSITIVE_INFINITY;

  for (const concept of updatedBlueprint.concepts) {
    if (concept.quality !== 'POLISHED') {
      continue;
    }

    for (const step of concept.steps) {
      if (!step.visual) {
        continue;
      }

      if (step.visual.asset && !input.force) {
        if (
          input.includeExistingPending &&
          step.visual.asset.status === 'PENDING'
        ) {
          jobs.push(
            buildAssetJob({
              blueprint: updatedBlueprint,
              conceptSlug: concept.slug,
              stepId: step.id,
              visual: step.visual,
              asset: step.visual.asset,
            }),
          );

          if (jobs.length >= limit) {
            return { updatedBlueprint, jobs };
          }
        }

        continue;
      }

      const assetPath = buildAssetPath(concept.slug, step.id);
      const assetUrl = `/api/course-assets/${courseRoutePrefix}/${assetPath}`;
      const asset = buildPendingAsset({
        assetPath,
        assetUrl,
        model: updatedBlueprint.visualStyle.imageModel,
      });

      step.visual.asset = asset;
      jobs.push(
        buildAssetJob({
          blueprint: updatedBlueprint,
          conceptSlug: concept.slug,
          stepId: step.id,
          visual: step.visual,
          asset,
        }),
      );

      if (jobs.length >= limit) {
        return { updatedBlueprint, jobs };
      }
    }
  }

  return { updatedBlueprint, jobs };
}

function cloneBlueprint(blueprint: CourseBlueprint): CourseBlueprint {
  return JSON.parse(JSON.stringify(blueprint)) as CourseBlueprint;
}

function buildPendingAsset(input: {
  assetPath: string;
  assetUrl: string;
  model: string;
}): CourseConceptVisualAsset {
  return {
    status: 'PENDING',
    path: input.assetPath,
    url: input.assetUrl,
    mimeType: 'image/png',
    width: 1536,
    height: 1024,
    model: input.model,
    generatedAt: null,
    reviewStatus: 'UNREVIEWED',
  };
}

function buildAssetJob(input: {
  blueprint: CourseBlueprint;
  conceptSlug: string;
  stepId: string;
  visual: CourseConceptVisual;
  asset: CourseConceptVisualAsset;
}): CourseVisualAssetJob {
  return {
    id: `${input.blueprint.id}:${input.conceptSlug}:${input.stepId}`,
    conceptSlug: input.conceptSlug,
    stepId: input.stepId,
    visualTitle: input.visual.title,
    prompt: buildCourseVisualGenerationPrompt(
      input.blueprint.visualStyle,
      input.visual.prompt,
    ),
    assetPath: input.asset.path,
    assetUrl: input.asset.url,
    status: input.asset.status,
    model: input.asset.model,
    width: input.asset.width,
    height: input.asset.height,
  };
}

function buildAssetPath(conceptSlug: string, stepId: string) {
  return [
    'assets',
    'generated',
    sanitizePathSegment(conceptSlug),
    `${sanitizePathSegment(stepId)}.png`,
  ].join('/');
}

function normalizeRoutePath(path: string) {
  return path.split(sep).filter(Boolean).join('/');
}

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function collectGeneratedVisualAssets(blueprint: CourseBlueprint) {
  const assets: Array<{
    conceptSlug: string;
    stepId: string;
    visual: CourseConceptVisual;
  }> = [];

  for (const concept of blueprint.concepts) {
    for (const step of concept.steps) {
      if (step.visual?.asset) {
        assets.push({
          conceptSlug: concept.slug,
          stepId: step.id,
          visual: step.visual,
        });
      }
    }
  }

  return assets;
}

export function buildCourseVisualGenerationPrompt(
  visualStyle: CourseBlueprintVisualStyle,
  visualPrompt: string,
) {
  const prompt = visualPrompt.trim();
  const prefix = visualStyle.promptPrefix.trim();

  return [
    prompt.startsWith(prefix) ? null : prefix,
    prompt,
    `Avoid: ${visualStyle.negativePrompt.trim()}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
