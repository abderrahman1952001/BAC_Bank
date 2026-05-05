import { resolve } from 'node:path';
import { loadCanonicalCourseBlueprints } from '../src/courses/course-blueprint-files';

function parseRootArg(argv: string[]) {
  const rootIndex = argv.indexOf('--root');

  if (rootIndex < 0) {
    return undefined;
  }

  const value = argv[rootIndex + 1];

  if (!value) {
    throw new Error('--root requires a path value.');
  }

  return resolve(process.cwd(), value);
}

function main() {
  const rootDir = parseRootArg(process.argv.slice(2));
  const blueprints = loadCanonicalCourseBlueprints(rootDir);

  if (!blueprints.length) {
    throw new Error('No canonical course blueprints were found.');
  }

  console.log(`Validated ${blueprints.length} canonical course blueprint(s).`);

  for (const blueprint of blueprints) {
    console.log(
      `- ${blueprint.subjectCode}/${blueprint.stream}/${blueprint.topicSlug}: ${blueprint.concepts.length} concepts (${blueprint.status})`,
    );
  }
}

main();
