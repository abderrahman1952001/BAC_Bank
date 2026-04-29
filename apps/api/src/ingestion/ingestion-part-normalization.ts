export type DetectedPartMarker = {
  partIndex: number;
  label: string;
  restText: string;
};

export type DetectedLabelPartMarker = {
  partIndex: number;
  label: string;
  restLabel: string | null;
};

export type PartMarkerSplit = {
  beforeText: string | null;
  marker: DetectedPartMarker;
};

export type DetectedQuestionMarker = {
  questionIndex: number;
  restText: string;
};

export type DetectedSubquestionMarker = {
  letter: string;
  restText: string;
};

export type SubquestionMarkerSplit = {
  beforeText: string | null;
  marker: DetectedSubquestionMarker;
};

const ROMAN_PART_VALUES = new Map<string, number>([
  ['I', 1],
  ['II', 2],
  ['III', 3],
  ['IV', 4],
  ['V', 5],
  ['VI', 6],
  ['VII', 7],
  ['VIII', 8],
  ['IX', 9],
  ['X', 10],
  ['XI', 11],
  ['XII', 12],
]);

const ORDINAL_PART_LABELS = [
  'الجزء الأول',
  'الجزء الثاني',
  'الجزء الثالث',
  'الجزء الرابع',
  'الجزء الخامس',
  'الجزء السادس',
  'الجزء السابع',
  'الجزء الثامن',
  'الجزء التاسع',
  'الجزء العاشر',
  'الجزء الحادي عشر',
  'الجزء الثاني عشر',
] as const;

const ARABIC_PART_LABELS = new Map<string, { index: number; label: string }>([
  ['الأول', { index: 1, label: 'الجزء الأول' }],
  ['الاول', { index: 1, label: 'الجزء الأول' }],
  ['الثاني', { index: 2, label: 'الجزء الثاني' }],
  ['الثالث', { index: 3, label: 'الجزء الثالث' }],
  ['الرابع', { index: 4, label: 'الجزء الرابع' }],
  ['الخامس', { index: 5, label: 'الجزء الخامس' }],
  ['السادس', { index: 6, label: 'الجزء السادس' }],
  ['السابع', { index: 7, label: 'الجزء السابع' }],
  ['الثامن', { index: 8, label: 'الجزء الثامن' }],
  ['التاسع', { index: 9, label: 'الجزء التاسع' }],
  ['العاشر', { index: 10, label: 'الجزء العاشر' }],
]);

const ROMAN_PART_PREFIX =
  /^(XII|XI|VIII|VII|VI|IX|IV|III|II|I|X)\s*(?:[-–—ـ.:)]|$)\s*(.*)$/i;
const ARABIC_PART_PREFIX =
  /^الجزء\s+([\u0621-\u064A]+)\s*(?:[-–—ـ.:)]|$)\s*(.*)$/;
const NUMERIC_QUESTION_PREFIX = /^\s*([\d٠-٩]+)\s*[-–—ـ.)]\s*([\s\S]*)$/;
const SUBQUESTION_PREFIX = /^\s*([أإآاٱبجحدههو](?:ـ)?)\s*[-–—ـ.)]\s*([\s\S]*)$/;
const QUESTION_MARKER_LINE =
  /^\s*(?:[\d٠-٩]+|[أإاٱبججددهـهو]|[a-z]|[αβ])\s*[-–—ـ.)]/i;

export function splitTextAtPartMarkerLine(
  value: string,
): PartMarkerSplit | null {
  const lines = value.replace(/\r\n/g, '\n').split('\n');

  for (const [index, line] of lines.entries()) {
    const marker = detectPartMarkerLine(line);

    if (!marker) {
      continue;
    }

    const beforeText = normalizeOptionalString(
      lines.slice(0, index).join('\n'),
    );
    const restText = normalizeOptionalString(
      [marker.restText, ...lines.slice(index + 1)].join('\n'),
    );

    return {
      beforeText,
      marker: {
        partIndex: marker.partIndex,
        label: marker.label,
        restText: restText ?? '',
      },
    };
  }

  return null;
}

export function detectPartMarkerFromLabel(
  value: string | null | undefined,
): DetectedLabelPartMarker | null {
  const trimmed = normalizeOptionalString(value);

  if (!trimmed) {
    return null;
  }

  const lineMarker = detectPartMarkerLine(trimmed);

  if (!lineMarker) {
    return null;
  }

  return {
    partIndex: lineMarker.partIndex,
    label: lineMarker.label,
    restLabel: normalizeOptionalString(lineMarker.restText),
  };
}

export function startsWithQuestionMarker(value: string) {
  return QUESTION_MARKER_LINE.test(value.trimStart());
}

export function splitLeadingQuestionMarker(
  value: string,
): DetectedQuestionMarker | null {
  const match = value.match(NUMERIC_QUESTION_PREFIX);

  if (!match) {
    return null;
  }

  const questionIndex = Number.parseInt(
    normalizeNumericString(match[1] ?? ''),
    10,
  );

  if (!Number.isInteger(questionIndex) || questionIndex < 1) {
    return null;
  }

  return {
    questionIndex,
    restText: match[2]?.trim() ?? '',
  };
}

export function splitLeadingSubquestionMarker(
  value: string,
): DetectedSubquestionMarker | null {
  const match = value.match(SUBQUESTION_PREFIX);

  if (!match) {
    return null;
  }

  const letter = normalizeSubquestionLetter(match[1] ?? '');

  if (!letter) {
    return null;
  }

  return {
    letter,
    restText: match[2]?.trim() ?? '',
  };
}

export function splitTextAtQuestionMarkerLine(value: string) {
  const lines = value.replace(/\r\n/g, '\n').split('\n');

  for (const [index, line] of lines.entries()) {
    if (!startsWithQuestionMarker(line)) {
      continue;
    }

    return {
      beforeText: normalizeOptionalString(lines.slice(0, index).join('\n')),
      questionText: normalizeOptionalString(lines.slice(index).join('\n')),
    };
  }

  return null;
}

export function splitTextAtSubquestionMarkerLine(
  value: string,
): SubquestionMarkerSplit | null {
  const lines = value.replace(/\r\n/g, '\n').split('\n');

  for (const [index, line] of lines.entries()) {
    const marker = splitLeadingSubquestionMarker(line);

    if (!marker) {
      continue;
    }

    const beforeText = normalizeOptionalString(
      lines.slice(0, index).join('\n'),
    );
    const restText = normalizeOptionalString(
      [marker.restText, ...lines.slice(index + 1)].join('\n'),
    );

    return {
      beforeText,
      marker: {
        letter: marker.letter,
        restText: restText ?? '',
      },
    };
  }

  return null;
}

export function splitLeadingPartContextBlocks<T extends { text: string }>(
  blocks: T[],
) {
  const partContextBlocks: T[] = [];

  for (const [index, block] of blocks.entries()) {
    if (startsWithQuestionMarker(block.text)) {
      return {
        partContextBlocks,
        promptBlocks: blocks.slice(index),
      };
    }

    const questionMarkerSplit = splitTextAtQuestionMarkerLine(block.text);

    if (questionMarkerSplit?.beforeText && questionMarkerSplit.questionText) {
      return {
        partContextBlocks: [
          ...partContextBlocks,
          {
            ...block,
            text: questionMarkerSplit.beforeText,
          },
        ],
        promptBlocks: [
          {
            ...block,
            text: questionMarkerSplit.questionText,
          },
          ...blocks.slice(index + 1),
        ],
      };
    }

    partContextBlocks.push(block);
  }

  return {
    partContextBlocks: [],
    promptBlocks: blocks,
  };
}

export function partLabelForIndex(partIndex: number) {
  return ORDINAL_PART_LABELS[partIndex - 1] ?? `الجزء ${partIndex}`;
}

export function questionLabelForIndex(questionIndex: number) {
  return `السؤال ${questionIndex}`;
}

export function subquestionLabelForLetter(letter: string) {
  return `الفقرة ${letter}`;
}

export function normalizeExerciseLabel(value: string) {
  const withoutScore = value
    .replace(/\s*[:：]?\s*\([\d٠-٩]+(?:[.,][\d٠-٩]+)?\s*نقاط?\)\s*$/g, '')
    .trim();

  return normalizeOptionalString(withoutScore);
}

export function inferPointsFromTextBlocks(blocks: Array<{ text: string }>) {
  return inferPointsFromText(blocks.map((block) => block.text).join('\n'));
}

function detectPartMarkerLine(line: string): DetectedPartMarker | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  const romanMatch = trimmed.match(ROMAN_PART_PREFIX);

  if (romanMatch) {
    const roman = romanMatch[1]?.toUpperCase();
    const partIndex = roman ? ROMAN_PART_VALUES.get(roman) : undefined;

    if (partIndex) {
      return {
        partIndex,
        label: partLabelForIndex(partIndex),
        restText: romanMatch[2]?.trim() ?? '',
      };
    }
  }

  const arabicMatch = trimmed.match(ARABIC_PART_PREFIX);

  if (arabicMatch) {
    const normalizedOrdinal = arabicMatch[1]?.replace(/[إأآ]/g, 'ا');
    const part = normalizedOrdinal
      ? ARABIC_PART_LABELS.get(normalizedOrdinal)
      : undefined;

    if (part) {
      return {
        partIndex: part.index,
        label: part.label,
        restText: arabicMatch[2]?.trim() ?? '',
      };
    }
  }

  return null;
}

function inferPointsFromText(value: string) {
  const explicitTotal = inferExplicitTotal(value);

  if (explicitTotal !== null) {
    return explicitTotal;
  }

  const scoredLines = value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => ({
      line,
      score: /(?:المجموع|مجموع)/.test(line) ? null : inferPointLineScore(line),
    }))
    .filter(
      (entry): entry is { line: string; score: number } => entry.score !== null,
    );
  const firstScoredLine = scoredLines[0];
  const remainingScores = scoredLines.slice(1);

  if (
    firstScoredLine &&
    remainingScores.length > 0 &&
    isPureNumberPointLine(firstScoredLine.line)
  ) {
    const remainingTotal = roundPoints(
      remainingScores.reduce((sum, entry) => sum + entry.score, 0),
    );
    const hasDetailedRemainder =
      remainingScores.length > 1 ||
      remainingScores.some((entry) => !isPureNumberPointLine(entry.line));

    if (
      hasDetailedRemainder &&
      Math.abs(firstScoredLine.score - remainingTotal) < 0.001
    ) {
      return firstScoredLine.score;
    }
  }

  let total = 0;
  let found = false;

  for (const line of value.replace(/\r\n/g, '\n').split('\n')) {
    if (/(?:المجموع|مجموع)/.test(line)) {
      continue;
    }

    const lineScore = inferPointLineScore(line);

    if (lineScore === null) {
      continue;
    }

    total += lineScore;
    found = true;
  }

  return found ? roundPoints(total) : null;
}

function isPureNumberPointLine(line: string) {
  const normalized = normalizeNumericString(line).replace(/,/g, '.').trim();

  return /^\d+(?:\.\d+)?$/.test(normalized);
}

function inferExplicitTotal(value: string) {
  let inferred: number | null = null;

  for (const line of value.replace(/\r\n/g, '\n').split('\n')) {
    if (!/(?:المجموع|مجموع)/.test(line)) {
      continue;
    }

    if (/مجموعة/.test(line)) {
      continue;
    }

    const score = inferPointLineScore(line);

    if (score !== null) {
      inferred = score;
    }
  }

  return inferred;
}

function inferPointLineScore(line: string) {
  let normalized = normalizeNumericString(line).replace(/,/g, '.');
  let total = 0;
  let found = false;

  normalized = normalized.replace(
    /(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/gi,
    (_match, left: string, right: string) => {
      total += Number.parseFloat(left) * Number.parseFloat(right);
      found = true;
      return ' ';
    },
  );

  normalized = normalized.replace(
    /\d+(?:\.\d+)?(?:\s*\+\s*\d+(?:\.\d+)?)+/g,
    (expression) => {
      total += expression
        .split('+')
        .map((part) => Number.parseFloat(part.trim()))
        .filter(Number.isFinite)
        .reduce((sum, value) => sum + value, 0);
      found = true;
      return ' ';
    },
  );

  const scoringText = normalized.includes(':')
    ? normalized.split(/[:：]/).slice(1).join(':')
    : normalized;

  const standaloneScores = Array.from(
    scoringText.matchAll(
      /(?<![\d.])(?:0?\.\d+|0?[1-9]\d?(?:\.\d+)?)(?![\d.])/g,
    ),
  )
    .map((match) => Number.parseFloat(match[0]))
    .filter(Number.isFinite);

  if (standaloneScores.length) {
    total += standaloneScores.reduce((sum, value) => sum + value, 0);
    found = true;
  }

  return found ? roundPoints(total) : null;
}

function normalizeSubquestionLetter(value: string) {
  const normalized = value.replace(/ـ/g, '').trim();

  if (['أ', 'إ', 'آ', 'ا', 'ٱ'].includes(normalized)) {
    return 'أ';
  }

  if (normalized === 'ه') {
    return 'هـ';
  }

  if (['ب', 'ج', 'ح', 'د'].includes(normalized)) {
    return normalized;
  }

  return null;
}

function roundPoints(value: number) {
  return Number.parseFloat(value.toFixed(3));
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNumericString(value: string) {
  return value.replace(/[٠-٩]/g, (digit) =>
    String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
  );
}
