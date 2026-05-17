import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CourseBlueprint } from './course-blueprint';
import { parseCourseBlueprint } from './course-blueprint';
import {
  createTheoryContentStorage,
  type TheoryContentStorage,
} from './theory-content-storage';

export type CanonicalCourseBlueprintEntry = {
  key: string;
  blueprint: CourseBlueprint;
};

export function resolveCanonicalCourseRoot(cwd = process.cwd()) {
  const candidates = [
    resolve(cwd, 'bac_theory_content/canonical'),
    resolve(cwd, '..', '..', 'bac_theory_content/canonical'),
    resolve(cwd, '..', '..', '..', 'bac_theory_content/canonical'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function findCourseBlueprintFiles(rootDir: string): string[] {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files: string[] = [];

  function walk(directory: string) {
    for (const entry of readdirSync(directory)) {
      const absolutePath = resolve(directory, entry);
      const stats = statSync(absolutePath);

      if (stats.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (entry === 'course.json') {
        files.push(absolutePath);
      }
    }
  }

  walk(rootDir);
  return files.sort((left, right) => left.localeCompare(right));
}

export function loadCanonicalCourseBlueprints(
  rootDir = resolveCanonicalCourseRoot(),
): CourseBlueprint[] {
  if (!rootDir) {
    return [];
  }

  const blueprints = findCourseBlueprintFiles(rootDir).map((filePath) =>
    parseCourseBlueprint(JSON.parse(readFileSync(filePath, 'utf8'))),
  );
  assertUniqueCourseBlueprints(blueprints);

  return blueprints;
}

export async function loadCanonicalCourseBlueprintsFromStorage(
  storage: TheoryContentStorage = createTheoryContentStorage(),
): Promise<CourseBlueprint[]> {
  return (await loadCanonicalCourseBlueprintEntriesFromStorage(storage)).map(
    (entry) => entry.blueprint,
  );
}

export async function loadCanonicalCourseBlueprintEntriesFromStorage(
  storage: TheoryContentStorage = createTheoryContentStorage(),
): Promise<CanonicalCourseBlueprintEntry[]> {
  const blueprintKeys = (await storage.listKeys('canonical/')).filter((key) =>
    key.endsWith('/course.json'),
  );
  const entries = await Promise.all(
    blueprintKeys.map(async (key) => ({
      key,
      blueprint: parseCourseBlueprint(JSON.parse(await storage.getText(key))),
    })),
  );
  const blueprints = entries.map((entry) => entry.blueprint);

  assertUniqueCourseBlueprints(blueprints);

  return entries;
}

function assertUniqueCourseBlueprints(blueprints: CourseBlueprint[]) {
  const blueprintByTopic = new Map<string, CourseBlueprint>();

  for (const blueprint of blueprints) {
    const key = [
      blueprint.subjectCode,
      blueprint.stream,
      blueprint.topicSlug,
    ].join(':');
    const existing = blueprintByTopic.get(key);

    if (existing) {
      throw new Error(
        `Duplicate canonical course blueprint for ${blueprint.subjectCode}/${blueprint.stream}/${blueprint.topicSlug}: ${existing.id} and ${blueprint.id}.`,
      );
    }

    blueprintByTopic.set(key, blueprint);
  }
}
