import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { CourseBlueprint } from '../src/courses/course-blueprint';
import { parseCourseBlueprint } from '../src/courses/course-blueprint';
import { resolveCanonicalCourseRoot } from '../src/courses/course-blueprint-files';
import {
  buildCourseVisualAssetPlan,
  buildCourseVisualGenerationPrompt,
  collectGeneratedVisualAssets,
} from '../src/courses/course-visual-assets';

type CliOptions = {
  courseFilePath: string | null;
  limit: number | undefined;
  apply: boolean;
  force: boolean;
  generate: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    courseFilePath: null,
    limit: undefined,
    apply: false,
    force: false,
    generate: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--course':
        options.courseFilePath = resolveRequiredValue(argv, index, arg);
        index += 1;
        break;
      case '--limit':
        options.limit = Number.parseInt(resolveValue(argv, index, arg), 10);
        index += 1;
        break;
      case '--apply':
        options.apply = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--generate':
        options.generate = true;
        options.apply = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function resolveValue(argv: string[], index: number, name: string) {
  const value = argv[index + 1];

  if (!value) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

function resolveRequiredValue(argv: string[], index: number, name: string) {
  return resolve(process.cwd(), resolveValue(argv, index, name));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const canonicalRootDir = resolveCanonicalCourseRoot();

  if (!canonicalRootDir) {
    throw new Error('Could not resolve bac_theory_content/canonical.');
  }

  const courseFilePath =
    options.courseFilePath ??
    join(canonicalRootDir, 'svt', 'SE', 'proteins', 'course.json');

  const blueprint = parseCourseBlueprint(
    JSON.parse(readFileSync(courseFilePath, 'utf8')),
  );
  const plan = buildCourseVisualAssetPlan({
    blueprint,
    courseFilePath,
    canonicalRootDir,
    limit: options.limit,
    force: options.force,
    includeExistingPending: options.generate,
  });

  if (options.generate) {
    await generatePlannedAssets({
      blueprint: plan.updatedBlueprint,
      courseFilePath,
      jobAssetPaths: plan.jobs.map((job) => job.assetPath),
    });
  }

  if (options.apply) {
    writeBlueprint(courseFilePath, plan.updatedBlueprint);
    writeManifest(courseFilePath, plan.updatedBlueprint);
  }

  console.log(
    `${options.apply ? 'Prepared' : 'Planned'} ${plan.jobs.length} course visual asset job(s).`,
  );

  for (const job of plan.jobs) {
    console.log(`- ${job.conceptSlug}/${job.stepId}: ${job.assetPath}`);
  }
}

function writeBlueprint(filePath: string, blueprint: CourseBlueprint) {
  writeFileSync(filePath, `${JSON.stringify(blueprint, null, 2)}\n`, 'utf8');
}

function writeManifest(filePath: string, blueprint: CourseBlueprint) {
  const manifestPath = join(dirname(filePath), 'assets', 'generated');
  mkdirSync(manifestPath, { recursive: true });
  writeFileSync(
    join(manifestPath, 'visual-assets.json'),
    `${JSON.stringify(
      {
        blueprintId: blueprint.id,
        visualStyle: blueprint.visualStyle,
        assets: collectGeneratedVisualAssets(blueprint).map((asset) => ({
          conceptSlug: asset.conceptSlug,
          stepId: asset.stepId,
          title: asset.visual.title,
          prompt: asset.visual.prompt,
          generationPrompt: buildCourseVisualGenerationPrompt(
            blueprint.visualStyle,
            asset.visual.prompt,
          ),
          asset: asset.visual.asset,
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

async function generatePlannedAssets(input: {
  blueprint: CourseBlueprint;
  courseFilePath: string;
  jobAssetPaths: string[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const jobAssetPaths = new Set(input.jobAssetPaths);

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when --generate is used.');
  }

  for (const asset of collectGeneratedVisualAssets(input.blueprint)) {
    if (!asset.visual.asset || asset.visual.asset.status !== 'PENDING') {
      continue;
    }

    if (!jobAssetPaths.has(asset.visual.asset.path)) {
      continue;
    }

    const outputPath = join(
      dirname(input.courseFilePath),
      asset.visual.asset.path,
    );
    mkdirSync(dirname(outputPath), { recursive: true });

    const response = await fetch(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: asset.visual.asset.model,
          prompt: buildCourseVisualGenerationPrompt(
            input.blueprint.visualStyle,
            asset.visual.prompt,
          ),
          n: 1,
          size: `${asset.visual.asset.width}x${asset.visual.asset.height}`,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `OpenAI image generation failed for ${asset.conceptSlug}/${asset.stepId}: ${response.status} ${await response.text()}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
    };
    const base64Image = payload.data?.[0]?.b64_json;

    if (!base64Image) {
      throw new Error(
        `OpenAI image generation returned no image for ${asset.conceptSlug}/${asset.stepId}.`,
      );
    }

    writeFileSync(outputPath, Buffer.from(base64Image, 'base64'));
    asset.visual.asset.status = 'GENERATED';
    asset.visual.asset.generatedAt = new Date().toISOString();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
