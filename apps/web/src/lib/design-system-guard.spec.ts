import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const bannedLegacyClasses = [
  "btn-primary",
  "btn-secondary",
  "btn-ghost",
  "study-toggle-button",
  "lab-toggle",
  "theme-toggle",
  "source-icon-button",
  "admin-icon-button",
  "student-icon-button",
  "library-clear-button",
  "theater-subtle-action",
  "choice-chip",
  "builder-choice-card",
  "builder-stepper-button",
  "builder-advanced-toggle",
  "library-year-button",
  "library-sujet-card",
  "source-list-item",
  "source-crop-chip",
  "lab-preset-button",
  "dna-base-picker",
  "course-quiz-option",
  "ingestion-status-chip",
  "ingestion-subfilter-chip",
  "source-markdown-crop",
  "sujet-browser-pill",
  "sujet-question-solution-toggle",
  "course-concept-step-dot",
];

const sourceExtensions = new Set([".css", ".ts", ".tsx"]);
const rawControlPattern = /<\s*(input|select|textarea)\b/;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSourceFile(filePath: string) {
  const extension = path.extname(filePath);

  return (
    sourceExtensions.has(extension) &&
    !filePath.endsWith(".spec.ts") &&
    !filePath.endsWith(".spec.tsx")
  );
}

function isUiPrimitiveFile(filePath: string) {
  return filePath.includes(`${path.sep}components${path.sep}ui${path.sep}`);
}

function hasClassToken(value: string, className: string) {
  return value.split(/\s+/).includes(className);
}

function hasClassNameUsage(source: string, className: string) {
  const staticClassNames = source.matchAll(/className\s*=\s*["']([^"']*)["']/g);

  for (const match of staticClassNames) {
    if (hasClassToken(match[1] ?? "", className)) {
      return true;
    }
  }

  const expressionClassNames = source.matchAll(/className\s*=\s*{([^}]*)}/g);

  for (const match of expressionClassNames) {
    const expression = match[1] ?? "";
    const quotedValues = expression.matchAll(/["'`]([^"'`]*)["'`]/g);

    for (const quotedValue of quotedValues) {
      if (hasClassToken(quotedValue[1] ?? "", className)) {
        return true;
      }
    }
  }

  return false;
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(entryPath);
      }

      return isSourceFile(entryPath) ? [entryPath] : [];
    }),
  );

  return files.flat();
}

describe("design system guardrails", () => {
  it("does not reintroduce legacy action/control classes", async () => {
    const files = await collectFiles(srcRoot);
    const violations: string[] = [];

    for (const filePath of files) {
      const source = await readFile(filePath, "utf8");
      const relativePath = path.relative(srcRoot, filePath);

      for (const className of bannedLegacyClasses) {
        const escapedClassName = escapeRegExp(className);
        const cssSelectorUsage = new RegExp(`\\.${escapedClassName}(?![\\w-])`);

        if (hasClassNameUsage(source, className) || cssSelectorUsage.test(source)) {
          violations.push(`${relativePath}: ${className}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps visible native form controls behind local ui primitives", async () => {
    const files = await collectFiles(srcRoot);
    const violations: string[] = [];

    for (const filePath of files) {
      if (isUiPrimitiveFile(filePath) || path.extname(filePath) !== ".tsx") {
        continue;
      }

      const source = await readFile(filePath, "utf8");

      if (rawControlPattern.test(source)) {
        violations.push(path.relative(srcRoot, filePath));
      }
    }

    expect(violations).toEqual([]);
  });
});
