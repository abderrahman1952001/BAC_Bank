#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const file = process.argv[2];

if (!file) {
  console.error("Usage: validate_source_md.js <path-to-extracted.md>");
  process.exit(2);
}

const absoluteFile = path.resolve(file);
const text = fs.readFileSync(absoluteFile, "utf8");
const dir = path.dirname(absoluteFile);

const imageLinks = [...text.matchAll(/\]\((assets\/[^)]+)\)/g)].map(
  (match) => match[1],
);
const missingAssets = imageLinks.filter(
  (assetPath) => !fs.existsSync(path.join(dir, assetPath)),
);

const sourcePages = [
  ...text.matchAll(/<!--\s*source-page:\s*([0-9]+)\s*-->/g),
].map((match) => Number(match[1]));

const duplicatePages = sourcePages.filter(
  (page, index) => sourcePages.indexOf(page) !== index,
);

const placeholderPhrases = [
  "تحسب الصفحة",
  "تستعمل الصفحة",
  "تلخص الصفحة",
  "الحل المختصر",
  "بقية الأحداث",
  "تتعرض الصفحة",
  "كما في المصدر فقط",
];

const placeholders = [];
for (const phrase of placeholderPhrases) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes(phrase)) {
      placeholders.push({ line: index + 1, phrase });
    }
  });
}

const result = {
  file: absoluteFile,
  imageLinks: imageLinks.length,
  missingAssets,
  sourcePageMarkers: sourcePages.length,
  duplicatePages: [...new Set(duplicatePages)],
  placeholders,
};

console.log(JSON.stringify(result, null, 2));

if (
  missingAssets.length > 0 ||
  duplicatePages.length > 0 ||
  placeholders.length > 0
) {
  process.exit(1);
}
