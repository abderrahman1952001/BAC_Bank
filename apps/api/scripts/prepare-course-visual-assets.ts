import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';
import type { CourseBlueprint } from '../src/courses/course-blueprint';
import { parseCourseBlueprint } from '../src/courses/course-blueprint';
import { resolveCanonicalCourseRoot } from '../src/courses/course-blueprint-files';
import {
  buildCourseVisualLocalSvg,
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
  generateLocal: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    courseFilePath: null,
    limit: undefined,
    apply: false,
    force: false,
    generate: false,
    generateLocal: false,
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
      case '--generate-local':
        options.generateLocal = true;
        options.apply = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.generate && options.generateLocal) {
    throw new Error('Use either --generate or --generate-local, not both.');
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
    includeExistingPending: options.generate || options.generateLocal,
  });

  if (options.generate || options.generateLocal) {
    await generatePlannedAssets({
      blueprint: plan.updatedBlueprint,
      courseFilePath,
      jobAssetPaths: plan.jobs.map((job) => job.assetPath),
      mode: options.generateLocal ? 'local' : 'openai',
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
  mode: 'openai' | 'local';
}) {
  const jobAssetPaths = new Set(input.jobAssetPaths);

  if (input.mode === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when --generate is used.');
  }

  const assets = collectGeneratedVisualAssets(input.blueprint);

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
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

    if (input.mode === 'local') {
      const svg = buildCourseVisualLocalSvg({
        visualStyle: input.blueprint.visualStyle,
        visual: asset.visual,
        asset: asset.visual.asset,
        variantIndex: index,
      });

      await sharp(Buffer.from(svg)).png().toFile(outputPath);
      asset.visual.asset.status = 'GENERATED';
      asset.visual.asset.model = 'local-sharp-svg-v1';
      asset.visual.asset.generatedAt = new Date().toISOString();
      continue;
    }

    const response = await fetch(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
