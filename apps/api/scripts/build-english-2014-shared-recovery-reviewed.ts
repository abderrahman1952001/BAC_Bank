import { promises as fs } from 'fs';
import path from 'path';

type SourceBlock = {
  role: 'PROMPT' | 'SOLUTION' | 'HINT' | 'RUBRIC' | 'META';
  type: 'paragraph' | 'heading' | 'latex' | 'table';
  text: string;
};

type SourceNode = {
  localId: string;
  parentLocalId?: string;
  nodeType: 'PART' | 'EXERCISE' | 'QUESTION' | 'SUBQUESTION' | 'CONTEXT';
  orderIndex: number;
  label?: string | null;
  maxPoints?: number | null;
  blocks: SourceBlock[];
};

type SourceVariant = {
  code: 'SUJET_1' | 'SUJET_2';
  title: string;
  nodes: SourceNode[];
};

type SourceRoot = {
  paper?: Record<string, unknown>;
  variants: SourceVariant[];
};

type DraftBlock = {
  id: string;
  role: SourceBlock['role'];
  type: SourceBlock['type'];
  value: string;
  data?: {
    rows: string[][];
  };
};

const repoRoot = path.resolve(__dirname, '../../..');
const rawPath = path.join(repoRoot, 'extracted papers/english/2014 others.txt');
const outPath = path.join(
  repoRoot,
  'extracted papers/english/reviewed/bac-english-se-m-tm-ge-2014-normal.reviewed.json',
);

async function main() {
  const rawText = await fs.readFile(rawPath, 'utf8');
  const root = JSON.parse(repairTruncatedJson(rawText)) as SourceRoot;
  const reviewed = {
    variants: root.variants.map((variant) => ({
      code: variant.code,
      title: variant.title,
      nodes: normalizeSiblingOrder(
        variant.nodes.map((node) => ({
          id: node.localId,
          nodeType: node.nodeType,
          parentId: node.parentLocalId ?? null,
          orderIndex: node.orderIndex,
          label: node.label ?? null,
          maxPoints: node.maxPoints ?? null,
          topicCodes: [],
          blocks: node.blocks.flatMap((block, index) =>
            blockToDraftBlocks(node.localId, index + 1, block),
          ),
        })),
      ),
    })),
    assets: [],
    uncertainties: [],
    exam: {
      durationMinutes: readNumber(root.paper?.durationMinutes) ?? 150,
      hasCorrection: true,
      sourceLanguage: 'en',
      title: 'BAC 2014 ENGLISH SHARED',
      totalPoints: readNumber(root.paper?.totalPoints) ?? 20,
      metadata: {
        route:
          'gemini_truncated_extract_plus_codex_visual_reconstruction_and_audit',
        sourceArtifact: 'extracted papers/english/2014 others.txt',
        reconstructedTailFromScans: true,
      },
    },
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(`${outPath}.tmp`, `${JSON.stringify(reviewed, null, 2)}\n`);
  await fs.rename(`${outPath}.tmp`, outPath);
  console.log(
    JSON.stringify(
      {
        reviewedFile: path.relative(repoRoot, outPath),
        variants: reviewed.variants.length,
        nodes: reviewed.variants.reduce(
          (sum, variant) => sum + variant.nodes.length,
          0,
        ),
      },
      null,
      2,
    ),
  );
}

function normalizeSiblingOrder<
  T extends { parentId: string | null; orderIndex: number },
>(nodes: T[]): T[] {
  const counters = new Map<string, number>();
  return nodes.map((node) => {
    const key = node.parentId ?? '__root__';
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    return {
      ...node,
      orderIndex: next,
    };
  });
}

function repairTruncatedJson(rawText: string) {
  const marker = '        {\n          "localId": "S2_P1_B_Q3"';
  const index = rawText.indexOf(marker);

  if (index === -1) {
    throw new Error('Could not find 2014 shared truncation marker.');
  }

  const prefix = rawText.slice(0, index);
  const tailNodes: SourceNode[] = [
    {
      localId: 'S2_P1_B_Q3',
      parentLocalId: 'S2_PART_1_B',
      nodeType: 'QUESTION',
      orderIndex: 3,
      label: '3',
      maxPoints: 1.5,
      blocks: [
        p(
          'PROMPT',
          `Rewrite sentence B so that it means the same as sentence A.
1.a. A convention was signed by many nations in Switzerland.
b. Many nations ........................................................
2.a. "Making counterfeit coins was relatively easy", a historian said.
b. A historian said that.................................................`,
        ),
        p(
          'SOLUTION',
          `A. Many nations signed a convention in Switzerland.
B. A historian said that making counterfeit coins had been/was relatively easy.`,
        ),
        p('RUBRIC', '01.5 points (0.75 each)'),
      ],
    },
    {
      localId: 'S2_P1_B_Q4',
      parentLocalId: 'S2_PART_1_B',
      nodeType: 'QUESTION',
      orderIndex: 4,
      label: '4',
      maxPoints: 1,
      blocks: [
        p(
          'PROMPT',
          `Classify the following words according to the pronunciation of the final "ed".
passed - shortened - attempted - provided

| /t/ | /d/ | /Id/ |
|---|---|---|
| | | |`,
        ),
        t(
          'SOLUTION',
          `| /t/ | /d/ | /Id/ |
|---|---|---|
| passed | shortened | attempted provided |`,
        ),
        p('RUBRIC', '01 point (0.25 each)'),
      ],
    },
    {
      localId: 'S2_P1_B_Q5',
      parentLocalId: 'S2_PART_1_B',
      nodeType: 'QUESTION',
      orderIndex: 5,
      label: '5',
      maxPoints: 2,
      blocks: [
        p(
          'PROMPT',
          `Fill in the gaps with words from the list below.

hide - techniques - financial - and

Money laundering refers to the process of concealing ..........(1).......... transactions. Various laundering ..........(2).......... can be employed by individuals, groups, officials ..........(3).......... corporations. The goal of a money laundering operation is usually to ..........(4).......... either the source or the destination of money.`,
        ),
        t(
          'SOLUTION',
          `| 1 | 2 | 3 | 4 |
|---|---|---|---|
| financial | techniques | and | hide |`,
        ),
        p('RUBRIC', '02 points (0.5 each)'),
      ],
    },
    {
      localId: 'S2_PART_2',
      nodeType: 'PART',
      orderIndex: 2,
      label: 'Part Two: Written Expression',
      maxPoints: 5,
      blocks: [p('PROMPT', 'Part Two: Written Expression\nChoose ONE of the following topics:')],
    },
    {
      localId: 'S2_P2_TOPIC_1',
      parentLocalId: 'S2_PART_2',
      nodeType: 'EXERCISE',
      orderIndex: 1,
      label: 'Topic One',
      maxPoints: 5,
      blocks: [
        p(
          'PROMPT',
          `Counterfeit is something copied and passed as genuine. What should be done to fight this crime? Use the following notes to write a composition of about 80 to 120 words.
- Sensitize people: mass media / school programmes.
- Organize anti-counterfeiting associations.
- Government: pass legislation / protect consumers.`,
        ),
        p('RUBRIC', 'Topic One: Form: 02.5 Content: 02.5'),
      ],
    },
    {
      localId: 'S2_P2_TOPIC_2',
      parentLocalId: 'S2_PART_2',
      nodeType: 'EXERCISE',
      orderIndex: 2,
      label: 'Topic Two',
      maxPoints: 5,
      blocks: [
        p(
          'PROMPT',
          `Children and teens are often targeted by junk food advertisements.
Write a letter to the director of a fast food company to complain about their effects on those kids.
Sign the letter: John Smith.`,
        ),
        p('RUBRIC', 'Topic Two: Form: 02 Content: 03'),
      ],
    },
  ];

  const tail = tailNodes
    .map((node) =>
      JSON.stringify(node, null, 2)
        .split('\n')
        .map((line) => `        ${line}`)
        .join('\n'),
    )
    .join(',\n');

  return `${prefix}${tail}
      ]
    }
  ],
  "assets": [],
  "uncertainties": []
}
`;
}

function blockToDraftBlocks(
  nodeId: string,
  blockIndex: number,
  block: SourceBlock,
): DraftBlock[] {
  const exploded = explodeTables(block);
  return exploded.map((entry, index) => ({
    id: `${nodeId}_${block.role.toLowerCase()}_${blockIndex}_${index + 1}`,
    role: block.role,
    ...entry,
  }));
}

function explodeTables(block: SourceBlock): Array<{
  type: SourceBlock['type'];
  value: string;
  data?: { rows: string[][] };
}> {
  if (block.type === 'table') {
    const rows = parseTableRows(block.text);
    return [
      {
        type: 'table',
        value: toMarkdownTable(rows),
        data: { rows },
      },
    ];
  }

  const lines = block.text.replace(/\r\n/g, '\n').split('\n');
  const firstTableLine = lines.findIndex((line) => line.trim().startsWith('|'));
  if (firstTableLine === -1) {
    return [{ type: block.type, value: block.text.trim() }];
  }

  const before = lines.slice(0, firstTableLine).join('\n').trim();
  const tableLines: string[] = [];
  const afterLines: string[] = [];
  let inTable = true;
  for (const line of lines.slice(firstTableLine)) {
    if (inTable && line.trim().startsWith('|')) {
      tableLines.push(line);
    } else {
      inTable = false;
      afterLines.push(line);
    }
  }

  const parts: ReturnType<typeof explodeTables> = [];
  if (before) {
    parts.push({ type: block.type, value: before });
  }
  const rows = parseTableRows(tableLines.join('\n'));
  if (rows.length) {
    parts.push({ type: 'table', value: toMarkdownTable(rows), data: { rows } });
  }
  const after = afterLines.join('\n').trim();
  if (after) {
    parts.push(...explodeTables({ ...block, text: after }));
  }
  return parts;
}

function parseTableRows(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .filter((line) => !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim()),
    )
    .filter((row) => row.some((cell) => cell.length > 0));
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

function p(role: SourceBlock['role'], text: string): SourceBlock {
  return { role, type: 'paragraph', text };
}

function t(role: SourceBlock['role'], text: string): SourceBlock {
  return { role, type: 'table', text };
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
