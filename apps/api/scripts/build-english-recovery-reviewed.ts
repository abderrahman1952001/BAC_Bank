import { promises as fs } from 'fs';
import path from 'path';

type TextBlock = {
  type: 'paragraph' | 'heading' | 'latex';
  text: string;
};

type RawQuestion = {
  orderIndex: number;
  label?: string | null;
  maxPoints?: number | null;
  promptBlocks: TextBlock[];
  solutionBlocks: TextBlock[];
  hintBlocks?: TextBlock[];
  rubricBlocks: TextBlock[];
  assetIds?: string[];
};

type RawExercise = {
  orderIndex: number;
  title: string;
  maxPoints?: number | null;
  contextBlocks: TextBlock[];
  questions: RawQuestion[];
};

type RawVariant = {
  code: 'SUJET_1' | 'SUJET_2';
  title: string;
  exercises: RawExercise[];
};

type RawPaper = {
  variants: RawVariant[];
  exam?: Record<string, unknown>;
  paper?: Record<string, unknown>;
};

type DraftBlock = {
  id: string;
  role: 'PROMPT' | 'SOLUTION' | 'HINT' | 'RUBRIC' | 'META';
  type: 'paragraph' | 'heading' | 'latex' | 'table';
  value: string;
  data?: {
    rows: string[][];
  };
};

type DraftNode = {
  id: string;
  nodeType: 'EXERCISE' | 'QUESTION' | 'CONTEXT';
  parentId: string | null;
  orderIndex: number;
  label: string | null;
  maxPoints: number | null;
  topicCodes: string[];
  blocks: DraftBlock[];
};

const repoRoot = path.resolve(__dirname, '../../..');
const englishDir = path.join(repoRoot, 'extracted papers/english');
const outDir = path.join(englishDir, 'reviewed');

const recoveries = [
  {
    rawFile: '2016 le.txt',
    slug: 'bac-english-le-2016-normal',
    title: 'BAC 2016 ENGLISH LE',
    year: 2016,
    sessionType: 'NORMAL',
    patch: patch2016Le,
  },
  {
    rawFile: '2018 le.txt',
    slug: 'bac-english-le-2018-normal',
    title: 'BAC 2018 ENGLISH LE',
    year: 2018,
    sessionType: 'NORMAL',
    patch: patch2018Le,
  },
  {
    rawFile: '2020 le.txt',
    slug: 'bac-english-le-2020-normal',
    title: 'BAC 2020 ENGLISH LE',
    year: 2020,
    sessionType: 'NORMAL',
    patch: patch2020Le,
  },
  {
    rawFile: '2022 le.txt',
    slug: 'bac-english-le-2022-normal',
    title: 'BAC 2022 ENGLISH LE',
    year: 2022,
    sessionType: 'NORMAL',
    patch: patch2022Le,
  },
] as const;

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const results = [];
  for (const recovery of recoveries) {
    const rawPath = path.join(englishDir, recovery.rawFile);
    const raw = JSON.parse(await fs.readFile(rawPath, 'utf8')) as RawPaper;
    recovery.patch(raw);
    const reviewed = toReviewedGraph(raw, {
      title: recovery.title,
      year: recovery.year,
      sessionType: recovery.sessionType,
      sourceArtifact: `extracted papers/english/${recovery.rawFile}`,
    });
    const outPath = path.join(outDir, `${recovery.slug}.reviewed.json`);
    await fs.writeFile(`${outPath}.tmp`, `${JSON.stringify(reviewed, null, 2)}\n`);
    await fs.rename(`${outPath}.tmp`, outPath);
    results.push({
      slug: recovery.slug,
      rawFile: recovery.rawFile,
      reviewedFile: path.relative(repoRoot, outPath),
      variants: reviewed.variants.length,
      nodes: reviewed.variants.reduce(
        (sum, variant) => sum + variant.nodes.length,
        0,
      ),
    });
  }

  const manifestPath = path.join(outDir, 'recovery-manifest.json');
  await fs.writeFile(
    `${manifestPath}.tmp`,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        route:
          'gemini_partial_extract_plus_codex_visual_reconstruction_and_audit',
        results,
      },
      null,
      2,
    )}\n`,
  );
  await fs.rename(`${manifestPath}.tmp`, manifestPath);
  console.log(JSON.stringify(results, null, 2));
}

function patch2016Le(raw: RawPaper) {
  setPrompt(raw, 'SUJET_2', 2, 1, [
    paragraph(`1- Find in the text words that are closest in meaning to the following:
a. wide (§1) =.....    b. appeared (§3) =.....    c. developed (§3) =.....    d. really (§4) =.....`),
  ]);
  setPrompt(raw, 'SUJET_2', 2, 2, [
    paragraph(`2- Divide the following words into roots and affixes.
resettlement - migration - independent

| prefix | root | suffix |
|---|---|---|
| | | |
| | | |
| | | |`),
  ]);
  setPrompt(raw, 'SUJET_2', 2, 3, [
    paragraph(`3- Rewrite sentence ‘b’ so that it means the same as sentence ‘a’.
1. a. The English language and culture dominated all aspects of life in the region.
   b. All aspects of life ........................................................
2. a. Historians declared, “Many great changes influenced the Anglo-Saxon language.”
   b. Historians declared that ..................................................
3. a. The British came from different origins, but they succeeded to build a flourishing society.
   b. In spite of ................................................................`),
  ]);
  setPrompt(raw, 'SUJET_2', 2, 4, [
    paragraph(`4- Classify the words below according to their stressed syllable.
immigration - civilize - culture - Germanic

| 1st syllable | 2nd syllable | 3rd syllable |
|---|---|---|
| | | |`),
  ]);
  setPrompt(raw, 'SUJET_2', 2, 5, [
    paragraph(`5- Re-order the following statements to make a coherent passage:
a. they implemented French Norman as the language of administration.
b. but eventually its influence and use entered everyday speech.
c. The new language thus entered English first as a language of foreign rule,
d. After the Normans had conquered Anglo-Saxon territory,`),
  ]);
  setPrompt(raw, 'SUJET_2', 3, 1, [
    paragraph(`Part Two: Written Expression
Choose ONE of the following topics:

Topic one:
Languages and cultures become richer when they encounter others. Using the following notes, write a composition of 120 to 150 words about the factors that contributed to the enrichment of culture in Algeria.
- strategic geographic situation
- tolerance towards other cultures
- abundance of its resources
- contact with a variety of civilizations
- the genius of its people

Topic two:
Recently, the world of sport has been shaken by a violent corruption scandal. Members of the Federation of International Football Association (FIFA) were accused of bribery and other unethical practices. Write a composition of about 120 to 150 words about some of the wrongdoings that give a bad reputation to the practice of sports. Illustrate your production with concrete examples.`),
  ]);
}

function patch2018Le(raw: RawPaper) {
  setSolution(raw, 'SUJET_1', 2, 2, [
    paragraph(`2-

| Verb | Noun | adjective |
|---|---|---|
| To civilize | / | Civilized, civilizable, civilizational |
| To intensify | Intensification, intensifier, intensity | / |
| / | Influence, influenceability | Influenceable, influenced, influencing, influential |`),
  ]);
  setSolution(raw, 'SUJET_1', 2, 4, [
    paragraph(`4-

| 1st syllable | 2nd syllable | 3rd syllable | 4th syllable |
|---|---|---|---|
| Latin | Political | revolution | civilization |`),
  ]);
  setWrittenExpressionRubric(raw, 'SUJET_1', 3, 1, '6 pts');

  setSolution(raw, 'SUJET_2', 2, 2, [
    paragraph(`2-

| Verbs | Nouns | Adjectives |
|---|---|---|
| To free | Freedom | Free / freed |
| To prosper | Prosperity | Prosperous |
| To believe | Belief / believer | Believable |`),
  ]);
  setSolution(raw, 'SUJET_2', 2, 4, [
    paragraph(`4-

| One syllable | Two syllables | Three syllables | Four syllables |
|---|---|---|---|
| Brain | Social | Prosperous | Phenomenon |`),
  ]);
  setWrittenExpressionRubric(raw, 'SUJET_2', 3, 1, '06');
}

function patch2020Le(raw: RawPaper) {
  setSolution(raw, 'SUJET_1', 2, 2, [
    paragraph(`2-

| Verb | Noun | Adjective |
|---|---|---|
| to evolve | /// | evolutionary / evolved / -ing |
| /// | value | valuable / valued / -less |
| To differ | difference | //// |`),
  ]);
  setSolution(raw, 'SUJET_1', 2, 4, [
    paragraph(`4-

| /t/ | /d/ | /id/ |
|---|---|---|
| Renounced | privileged - used | neglected |`),
  ]);
  setWrittenExpressionRubric(raw, 'SUJET_1', 3, 1, '6');

  setSolution(raw, 'SUJET_2', 2, 2, [
    paragraph(`2- Morphology.

| prefix | root | suffix |
|---|---|---|
| im | moral | ////// |
| //////// | prevent | ive |
| //////// | comply | ance |`),
  ]);
  setSolution(raw, 'SUJET_2', 2, 4, [
    paragraph(`4-

| 1st syllable | 2nd syllable | 3rd syllable |
|---|---|---|
| Minimize | Authorities / Protect | Information |`),
  ]);
  setWrittenExpressionRubric(raw, 'SUJET_2', 3, 1, '6 Pts');
}

function patch2022Le(raw: RawPaper) {
  setSolution(raw, 'SUJET_1', 2, 4, [
    paragraph(`4) Phonology (number of syllables)

| 1 syllable | 2 syllables | 3 syllables | 4 syllables |
|---|---|---|---|
| change | regions | Saharans | prehistoric |`),
  ]);
  setWrittenExpressionRubric(raw, 'SUJET_1', 3, 1, '6');

  setSolution(raw, 'SUJET_2', 2, 2, [
    paragraph(`2. Morphology: (Roots and affixes)

| Prefix | Root | Suffix |
|---|---|---|
| inter | nation | al |
| | ultimate | ly |
| | extrem(e) | ist |`),
  ]);
  setSolution(raw, 'SUJET_2', 2, 4, [
    paragraph(`4. Phonology: (syllable stress)

| 1st syllable | 2nd syllable | 3rd syllable |
|---|---|---|
| harmful | resources / activity | destination |`),
  ]);
  setWrittenExpressionRubric(raw, 'SUJET_2', 3, 1, '6 pts');
}

function setWrittenExpressionRubric(
  raw: RawPaper,
  variantCode: RawVariant['code'],
  exerciseOrderIndex: number,
  questionOrderIndex: number,
  finalScore: string,
) {
  const table = `| Criteria | Relevance | Semantic coherence | Correct use of English | Excellence (vocabulary and creativity) | Final score |
|---|---|---|---|---|---|
| LE | 1.5 | 1 | 2 | 1.5 | ${finalScore} |`;
  setRubric(raw, variantCode, exerciseOrderIndex, questionOrderIndex, [
    paragraph(`Scoring grid:

${table}`),
  ]);
}

function setPrompt(
  raw: RawPaper,
  variantCode: RawVariant['code'],
  exerciseOrderIndex: number,
  questionOrderIndex: number,
  blocks: TextBlock[],
) {
  findQuestion(raw, variantCode, exerciseOrderIndex, questionOrderIndex)
    .promptBlocks = blocks;
}

function setSolution(
  raw: RawPaper,
  variantCode: RawVariant['code'],
  exerciseOrderIndex: number,
  questionOrderIndex: number,
  blocks: TextBlock[],
) {
  findQuestion(raw, variantCode, exerciseOrderIndex, questionOrderIndex)
    .solutionBlocks = blocks;
}

function setRubric(
  raw: RawPaper,
  variantCode: RawVariant['code'],
  exerciseOrderIndex: number,
  questionOrderIndex: number,
  blocks: TextBlock[],
) {
  findQuestion(raw, variantCode, exerciseOrderIndex, questionOrderIndex)
    .rubricBlocks = blocks;
}

function findQuestion(
  raw: RawPaper,
  variantCode: RawVariant['code'],
  exerciseOrderIndex: number,
  questionOrderIndex: number,
) {
  const variant = raw.variants.find((entry) => entry.code === variantCode);
  const exercise = variant?.exercises.find(
    (entry) => entry.orderIndex === exerciseOrderIndex,
  );
  const question = exercise?.questions.find(
    (entry) => entry.orderIndex === questionOrderIndex,
  );

  if (!variant || !exercise || !question) {
    throw new Error(
      `Missing ${variantCode} exercise ${exerciseOrderIndex} question ${questionOrderIndex}`,
    );
  }

  return question;
}

function toReviewedGraph(
  raw: RawPaper,
  meta: {
    title: string;
    year: number;
    sessionType: string;
    sourceArtifact: string;
  },
) {
  return {
    variants: raw.variants.map((variant, variantIndex) => ({
      code: variant.code,
      title:
        variant.title ||
        (variant.code === 'SUJET_1' ? 'الموضوع الأول' : 'الموضوع الثاني'),
      nodes: variantToNodes(variant, variantIndex + 1),
    })),
    assets: [],
    uncertainties: [],
    exam: {
      durationMinutes:
        readNumber(raw.exam?.durationMinutes) ??
        readNumber(raw.paper?.durationMinutes) ??
        150,
      hasCorrection: true,
      sourceLanguage: 'en',
      title: meta.title,
      totalPoints:
        readNumber(raw.exam?.totalPoints) ??
        readNumber(raw.paper?.totalPoints) ??
        20,
      metadata: {
        route:
          'gemini_partial_extract_plus_codex_visual_reconstruction_and_audit',
        sourceArtifact: meta.sourceArtifact,
        reconstructedTables: true,
      },
    },
  };
}

function variantToNodes(variant: RawVariant, variantIndex: number) {
  const nodes: DraftNode[] = [];
  for (const exercise of variant.exercises) {
    const exerciseId = `v${variantIndex}_ex${exercise.orderIndex}`;
    const exerciseBlocks = blocksFor(
      exerciseId,
      'PROMPT',
      exercise.contextBlocks,
    );
    nodes.push({
      id: exerciseId,
      nodeType: 'EXERCISE',
      parentId: null,
      orderIndex: exercise.orderIndex,
      label: normalizeLabel(exercise.title),
      maxPoints: exercise.maxPoints ?? pointsFromLabel(exercise.title),
      topicCodes: [],
      blocks: exerciseBlocks,
    });

    for (const question of exercise.questions) {
      const questionId = `${exerciseId}_q${question.orderIndex}`;
      nodes.push({
        id: questionId,
        nodeType: 'QUESTION',
        parentId: exerciseId,
        orderIndex: question.orderIndex,
        label: question.label ?? String(question.orderIndex),
        maxPoints: question.maxPoints ?? pointsFromBlocks(question.rubricBlocks),
        topicCodes: [],
        blocks: [
          ...blocksFor(questionId, 'PROMPT', question.promptBlocks),
          ...blocksFor(questionId, 'SOLUTION', question.solutionBlocks),
          ...blocksFor(questionId, 'HINT', question.hintBlocks ?? []),
          ...blocksFor(questionId, 'RUBRIC', question.rubricBlocks),
        ],
      });
    }
  }

  return nodes;
}

function blocksFor(
  nodeId: string,
  role: DraftBlock['role'],
  blocks: TextBlock[],
): DraftBlock[] {
  const out: DraftBlock[] = [];
  for (const block of blocks) {
    for (const entry of explodeTables(block)) {
      out.push({
        id: `${nodeId}_${role.toLowerCase()}_${out.length + 1}`,
        role,
        ...entry,
      });
    }
  }
  return out.filter((block) => block.value.trim().length > 0);
}

function explodeTables(block: TextBlock): Array<{
  type: DraftBlock['type'];
  value: string;
  data?: { rows: string[][] };
}> {
  const lines = block.text.replace(/\r\n/g, '\n').split('\n');
  const firstTableLine = lines.findIndex((line) => isTableLine(line));

  if (firstTableLine === -1) {
    return [{ type: block.type, value: block.text.trim() }];
  }

  const before = lines.slice(0, firstTableLine).join('\n').trim();
  const tableLines: string[] = [];
  const afterLines: string[] = [];
  let inTable = true;

  for (const line of lines.slice(firstTableLine)) {
    if (inTable && isTableLine(line)) {
      tableLines.push(line);
      continue;
    }
    inTable = false;
    afterLines.push(line);
  }

  const rows = tableLines
    .filter((line) => !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line))
    .map(parseTableRow)
    .filter((row) => row.some((cell) => cell.trim().length > 0));
  const tableValue = toMarkdownTable(rows);
  const after = afterLines.join('\n').trim();
  const parts: ReturnType<typeof explodeTables> = [];

  if (before) {
    parts.push({ type: block.type, value: before });
  }
  if (rows.length) {
    parts.push({
      type: 'table',
      value: tableValue,
      data: {
        rows,
      },
    });
  }
  if (after) {
    parts.push(...explodeTables({ ...block, text: after }));
  }

  return parts;
}

function isTableLine(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.includes('|', 1);
}

function parseTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function toMarkdownTable(rows: string[][]) {
  if (!rows.length) {
    return '';
  }
  const width = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => [
    ...row,
    ...Array.from({ length: width - row.length }, () => ''),
  ]);
  const separator = Array.from({ length: width }, () => '---');
  return [normalized[0], separator, ...normalized.slice(1)]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function pointsFromLabel(value: string) {
  const match = value.match(/\(?\s*(\d+(?:[.,]\d+)?)\s*(?:pts?|points?)\s*\)?/i);
  return match ? Number.parseFloat(match[1].replace(',', '.')) : null;
}

function pointsFromBlocks(blocks: TextBlock[]) {
  for (const block of blocks) {
    const match = block.text.match(/(\d+(?:[.,]\d+)?)\s*(?:pts?|points?)/i);
    if (match) {
      return Number.parseFloat(match[1].replace(',', '.'));
    }
  }
  return null;
}

function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function paragraph(text: string): TextBlock {
  return {
    type: 'paragraph',
    text,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
