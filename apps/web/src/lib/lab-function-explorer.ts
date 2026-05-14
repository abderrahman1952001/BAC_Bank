export type FunctionExplorerPreset = {
  id: "linear" | "quadratic" | "cubic" | "rational";
  title: string;
  expression: string;
  xDomain: [number, number];
  yDomain: [number, number];
  note: string;
};

export type FunctionValueRow = {
  x: number;
  y: number | null;
};

export type FunctionPoint = {
  x: number;
  y: number;
};

export type FunctionValueTable = {
  rows: FunctionValueRow[];
  error: string | null;
};

export type FunctionExtrema = {
  minimum: FunctionPoint | null;
  maximum: FunctionPoint | null;
};

export type FunctionFactConfidence = "EXACT" | "ESTIMATED" | "UNSUPPORTED";

export type FunctionFact<T> = {
  confidence: FunctionFactConfidence;
  value: T | null;
  label: string;
  reason?: string;
};

export type FunctionFamily =
  | {
      kind: "linear";
      label: string;
      slope: number;
      intercept: number;
    }
  | {
      kind: "quadratic";
      label: string;
      a: number;
      b: number;
      c: number;
      vertex: FunctionPoint;
    }
  | {
      kind: "simple-rational";
      label: string;
      numerator: number;
      excludedValue: number;
    }
  | {
      kind: "free";
      label: string;
    };

export type FunctionSign = "positive" | "negative" | "zero" | "undefined";

export type FunctionSignInterval = {
  kind: "interval" | "point";
  label: string;
  start: number | null;
  end: number | null;
  sign: FunctionSign;
};

export type FunctionVariationDirection =
  | "increasing"
  | "decreasing"
  | "constant";

export type FunctionVariationInterval = {
  label: string;
  start: number | null;
  end: number | null;
  direction: FunctionVariationDirection;
  anchor?: FunctionPoint;
};

export type FunctionDerivativeSummary = {
  expression: string;
  valueAtTangent: number | null;
  signLabel: string;
};

export type FunctionTangentSummary = {
  x: number;
  y: number;
  slope: number;
  equation: string;
};

export type FunctionAnalysis = {
  validation: ReturnType<typeof validateFunctionExpression>;
  family: FunctionFamily;
  roots: FunctionFact<number[]>;
  yIntercept: FunctionFact<number>;
  signIntervals: FunctionFact<FunctionSignInterval[]>;
  derivative: FunctionFact<FunctionDerivativeSummary>;
  tangent: FunctionFact<FunctionTangentSummary>;
  variation: FunctionFact<FunctionVariationInterval[]>;
};

export type FunctionMissionAnswerInput =
  | {
      kind: "ROOTS";
      answer: string;
    }
  | {
      kind: "SIGN_TABLE";
      answer: string;
    }
  | {
      kind: "VARIATION";
      answer: string;
    };

export type FunctionMissionAnswerStatus =
  | "correct"
  | "incorrect"
  | "unsupported";

export type FunctionMissionAnswerResult = {
  status: FunctionMissionAnswerStatus;
  expected: string;
  normalizedAnswer: string;
  feedback: string;
};

const EPSILON = 1e-6;

const allowedTokens = new Set([
  "x",
  "sin",
  "cos",
  "tan",
  "sqrt",
  "abs",
  "exp",
  "log",
  "ln",
  "pi",
  "e",
]);

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma"; value: "," };

export const functionExplorerPresets = [
  {
    id: "quadratic",
    title: "دالة تربيعية",
    expression: "x^2 - 4*x + 3",
    xDomain: [-2, 6],
    yDomain: [-4, 8],
    note: "مثال مناسب لقراءة الجذور ورأس القطع المكافئ.",
  },
  {
    id: "linear",
    title: "دالة خطية",
    expression: "2*x - 3",
    xDomain: [-4, 5],
    yDomain: [-8, 8],
    note: "مثال سريع لربط الميل والتقاطع مع المحورين.",
  },
  {
    id: "cubic",
    title: "دالة كثيرة حدود",
    expression: "x^3 - 3*x",
    xDomain: [-3, 3],
    yDomain: [-6, 6],
    note: "مثال يساعد على رؤية تغير الإشارة وتعدد التقاطعات.",
  },
  {
    id: "rational",
    title: "دالة كسرية بسيطة",
    expression: "1/(x - 1)",
    xDomain: [-4, 5],
    yDomain: [-6, 6],
    note: "مثال يوضح أن بعض القيم غير معرفة وتظهر كفراغ في المنحنى.",
  },
] satisfies FunctionExplorerPreset[];

function roundDisplayNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function tokenizeExpression(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const start = index;
      index += 1;

      while (index < expression.length && /[0-9.]/.test(expression[index])) {
        index += 1;
      }

      const value = Number(expression.slice(start, index));

      if (!Number.isFinite(value)) {
        throw new Error("Invalid number");
      }

      tokens.push({ type: "number", value });
      continue;
    }

    if (/[A-Za-z]/.test(char)) {
      const start = index;
      index += 1;

      while (index < expression.length && /[A-Za-z]/.test(expression[index])) {
        index += 1;
      }

      tokens.push({
        type: "identifier",
        value: expression.slice(start, index).toLowerCase(),
      });
      continue;
    }

    if (
      char === "+" ||
      char === "-" ||
      char === "*" ||
      char === "/" ||
      char === "^"
    ) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: char });
      index += 1;
      continue;
    }

    throw new Error("Unsupported character");
  }

  return tokens;
}

function evaluateTokens(tokens: Token[], x: number): number {
  let index = 0;

  function peek() {
    return tokens[index] ?? null;
  }

  function consume() {
    const token = tokens[index];
    index += 1;
    return token;
  }

  function parseExpression(): number {
    let value = parseTerm();

    while (
      peek()?.type === "operator" &&
      (peek()?.value === "+" || peek()?.value === "-")
    ) {
      const operator = consume().value;
      const next = parseTerm();
      value = operator === "+" ? value + next : value - next;
    }

    return value;
  }

  function parseTerm(): number {
    let value = parsePower();

    while (
      peek()?.type === "operator" &&
      (peek()?.value === "*" || peek()?.value === "/")
    ) {
      const operator = consume().value;
      const next = parsePower();
      value = operator === "*" ? value * next : value / next;
    }

    return value;
  }

  function parsePower(): number {
    const base = parseUnary();

    if (peek()?.type === "operator" && peek()?.value === "^") {
      consume();
      return Math.pow(base, parsePower());
    }

    return base;
  }

  function parseUnary(): number {
    if (
      peek()?.type === "operator" &&
      (peek()?.value === "+" || peek()?.value === "-")
    ) {
      const operator = consume().value;
      const value = parseUnary();
      return operator === "-" ? -value : value;
    }

    return parsePrimary();
  }

  function parsePrimary(): number {
    const token = consume();

    if (!token) {
      throw new Error("Unexpected end of expression");
    }

    if (token.type === "number") {
      return token.value;
    }

    if (token.type === "paren" && token.value === "(") {
      const value = parseExpression();

      if (peek()?.type !== "paren" || peek()?.value !== ")") {
        throw new Error("Missing closing parenthesis");
      }

      consume();
      return value;
    }

    if (token.type !== "identifier") {
      throw new Error("Unexpected token");
    }

    if (token.value === "x") {
      return x;
    }

    if (token.value === "pi") {
      return Math.PI;
    }

    if (token.value === "e") {
      return Math.E;
    }

    if (peek()?.type !== "paren" || peek()?.value !== "(") {
      throw new Error("Function call expected");
    }

    consume();
    const argument = parseExpression();

    if (peek()?.type === "comma") {
      throw new Error("Multiple arguments are not supported");
    }

    if (peek()?.type !== "paren" || peek()?.value !== ")") {
      throw new Error("Missing function closing parenthesis");
    }

    consume();

    switch (token.value) {
      case "sin":
        return Math.sin(argument);
      case "cos":
        return Math.cos(argument);
      case "tan":
        return Math.tan(argument);
      case "sqrt":
        return Math.sqrt(argument);
      case "abs":
        return Math.abs(argument);
      case "exp":
        return Math.exp(argument);
      case "log":
      case "ln":
        return Math.log(argument);
      default:
        throw new Error("Unsupported function");
    }
  }

  const value = parseExpression();

  if (index !== tokens.length) {
    throw new Error("Unexpected trailing tokens");
  }

  return value;
}

export function getFunctionExplorerPreset(
  presetId: FunctionExplorerPreset["id"],
): FunctionExplorerPreset | null {
  return (
    functionExplorerPresets.find((preset) => preset.id === presetId) ?? null
  );
}

export function validateFunctionExpression(expression: string): {
  expression: string;
  error: string | null;
} {
  const normalized = expression.trim().replaceAll("X", "x");

  if (!normalized) {
    return {
      expression: normalized,
      error: "اكتب عبارة الدالة أولاً.",
    };
  }

  if (normalized.length > 120) {
    return {
      expression: normalized,
      error: "العبارة طويلة جداً لهذه النسخة من المختبر.",
    };
  }

  if (!/^[0-9A-Za-z+\-*/^().,\s]+$/.test(normalized)) {
    return {
      expression: normalized,
      error: "توجد رموز غير مدعومة في عبارة الدالة.",
    };
  }

  const tokens = normalized.match(/[A-Za-z]+/g) ?? [];
  const unsupportedTokens = tokens.filter(
    (token) => !allowedTokens.has(token.toLowerCase()),
  );

  if (unsupportedTokens.length) {
    return {
      expression: normalized,
      error: `كلمات غير مدعومة: ${Array.from(new Set(unsupportedTokens)).join(", ")}`,
    };
  }

  return {
    expression: normalized,
    error: null,
  };
}

function evaluateFunctionRaw(expression: string, x: number): number | null {
  const validation = validateFunctionExpression(expression);

  if (validation.error) {
    return null;
  }

  try {
    const value = evaluateTokens(tokenizeExpression(validation.expression), x);

    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function evaluateFunctionAt(
  expression: string,
  x: number,
): number | null {
  const value = evaluateFunctionRaw(expression, x);

  return value === null ? null : roundDisplayNumber(value);
}

export function buildFunctionValueTable(
  expression: string,
  xValues = [-3, -2, -1, 0, 1, 2, 3],
): FunctionValueTable {
  const validation = validateFunctionExpression(expression);

  if (validation.error) {
    return {
      rows: xValues.map((x) => ({ x, y: null })),
      error: validation.error,
    };
  }

  return {
    rows: xValues.map((x) => ({
      x,
      y: evaluateFunctionAt(validation.expression, x),
    })),
    error: null,
  };
}

export function detectApproximateRoots(
  expression: string,
  xDomain: [number, number],
  sampleCount = 160,
): number[] {
  const validation = validateFunctionExpression(expression);

  if (validation.error || sampleCount < 2) {
    return [];
  }

  const [left, right] =
    xDomain[0] <= xDomain[1] ? xDomain : [xDomain[1], xDomain[0]];
  const step = (right - left) / sampleCount;
  const roots: number[] = [];
  let previousX = left;
  let previousY = evaluateFunctionAt(validation.expression, previousX);

  function pushRoot(value: number) {
    const rounded = roundDisplayNumber(value);

    if (roots.every((root) => Math.abs(root - rounded) > 0.04)) {
      roots.push(rounded);
    }
  }

  for (let index = 1; index <= sampleCount; index += 1) {
    const x = left + step * index;
    const y = evaluateFunctionAt(validation.expression, x);

    if (y === null || previousY === null) {
      previousX = x;
      previousY = y;
      continue;
    }

    if (Math.abs(y) < 0.002) {
      pushRoot(x);
    } else if (Math.abs(previousY) < 0.002) {
      pushRoot(previousX);
    } else if (previousY * y < 0) {
      const ratio = Math.abs(previousY) / (Math.abs(previousY) + Math.abs(y));
      pushRoot(previousX + (x - previousX) * ratio);
    }

    previousX = x;
    previousY = y;
  }

  return roots.sort((first, second) => first - second).slice(0, 8);
}

export function detectApproximateExtrema(
  expression: string,
  xDomain: [number, number],
  sampleCount = 240,
): FunctionExtrema {
  const validation = validateFunctionExpression(expression);

  if (validation.error || sampleCount < 2) {
    return {
      minimum: null,
      maximum: null,
    };
  }

  const [left, right] =
    xDomain[0] <= xDomain[1] ? xDomain : [xDomain[1], xDomain[0]];
  const step = (right - left) / sampleCount;
  let minimum: FunctionPoint | null = null;
  let maximum: FunctionPoint | null = null;

  for (let index = 0; index <= sampleCount; index += 1) {
    const rawX = left + step * index;
    const y = evaluateFunctionAt(validation.expression, rawX);

    if (y === null) {
      continue;
    }

    const point = {
      x: roundDisplayNumber(rawX),
      y,
    };

    if (!minimum || point.y < minimum.y) {
      minimum = point;
    }

    if (!maximum || point.y > maximum.y) {
      maximum = point;
    }
  }

  return {
    minimum,
    maximum,
  };
}

function roundFactNumber(value: number): number {
  return roundDisplayNumber(Math.abs(value) < EPSILON ? 0 : value);
}

function formatFactNumber(value: number): string {
  const rounded = roundFactNumber(value);

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return String(rounded);
}

function makeFact<T>(
  confidence: FunctionFactConfidence,
  value: T | null,
  label: string,
  reason?: string,
): FunctionFact<T> {
  return {
    confidence,
    value,
    label,
    ...(reason ? { reason } : {}),
  };
}

function getSign(value: number | null): FunctionSign {
  if (value === null) {
    return "undefined";
  }

  if (Math.abs(value) < EPSILON) {
    return "zero";
  }

  return value > 0 ? "positive" : "negative";
}

function signLabel(sign: FunctionSign) {
  switch (sign) {
    case "positive":
      return "+";
    case "negative":
      return "-";
    case "zero":
      return "0";
    case "undefined":
      return "غير معرّف";
  }
}

export function getFunctionSignLabel(sign: FunctionSign) {
  return signLabel(sign);
}

function intervalLabel(start: number | null, end: number | null) {
  const left = start === null ? "-∞" : formatFactNumber(start);
  const right = end === null ? "+∞" : formatFactNumber(end);

  return `]${left}, ${right}[`;
}

function pointLabel(value: number) {
  return `{${formatFactNumber(value)}}`;
}

function uniqueSortedNumbers(values: number[]) {
  return values
    .map(roundFactNumber)
    .sort((first, second) => first - second)
    .filter(
      (value, index, sorted) =>
        index === 0 || Math.abs(value - sorted[index - 1]) > 0.0005,
    );
}

function hasOnlyPolynomialTokens(expression: string) {
  if (expression.includes("/")) {
    return false;
  }

  const identifiers = expression.match(/[A-Za-z]+/g) ?? [];

  return identifiers.every((identifier) => identifier.toLowerCase() === "x");
}

function inferPolynomialFamily(expression: string): FunctionFamily | null {
  if (!hasOnlyPolynomialTokens(expression)) {
    return null;
  }

  const samples = [-3, -2, -1, 0, 1, 2, 3];
  const values = samples.map((x) => evaluateFunctionRaw(expression, x));

  if (values.some((value) => value === null)) {
    return null;
  }

  const f0 = evaluateFunctionRaw(expression, 0);
  const f1 = evaluateFunctionRaw(expression, 1);
  const fMinus1 = evaluateFunctionRaw(expression, -1);

  if (f0 === null || f1 === null || fMinus1 === null) {
    return null;
  }

  const c = f0;
  const a = (f1 + fMinus1 - 2 * c) / 2;
  const b = (f1 - fMinus1) / 2;
  const matchesQuadratic = samples.every((x) => {
    const actual = evaluateFunctionRaw(expression, x);
    const expected = a * x * x + b * x + c;

    return actual !== null && Math.abs(actual - expected) < 0.00001;
  });

  if (!matchesQuadratic) {
    return null;
  }

  if (Math.abs(a) < EPSILON) {
    return {
      kind: "linear",
      label: "دالة خطية مع تحليل دقيق",
      slope: roundFactNumber(b),
      intercept: roundFactNumber(c),
    };
  }

  const vertexX = -b / (2 * a);
  const vertexY = a * vertexX * vertexX + b * vertexX + c;

  return {
    kind: "quadratic",
    label: "دالة تربيعية مع تحليل دقيق",
    a: roundFactNumber(a),
    b: roundFactNumber(b),
    c: roundFactNumber(c),
    vertex: {
      x: roundFactNumber(vertexX),
      y: roundFactNumber(vertexY),
    },
  };
}

function inferSimpleRationalFamily(expression: string): FunctionFamily | null {
  const compact = expression.replace(/\s+/g, "");
  const match = compact.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\/\(x([+-](?:\d+(?:\.\d+)?|\.\d+))\)$/,
  );

  if (!match) {
    return null;
  }

  const numerator = Number(match[1]);
  const shift = Number(match[2]);

  if (!Number.isFinite(numerator) || !Number.isFinite(shift)) {
    return null;
  }

  return {
    kind: "simple-rational",
    label: "دالة كسرية بسيطة مع قيمة ممنوعة",
    numerator: roundFactNumber(numerator),
    excludedValue: roundFactNumber(-shift),
  };
}

function inferFunctionFamily(expression: string): FunctionFamily {
  return (
    inferPolynomialFamily(expression) ??
    inferSimpleRationalFamily(expression) ?? {
      kind: "free",
      label: "استكشاف حر بنتائج تقريبية",
    }
  );
}

function buildExactRoots(family: FunctionFamily): number[] | null {
  if (family.kind === "linear") {
    if (Math.abs(family.slope) < EPSILON) {
      return [];
    }

    return [roundFactNumber(-family.intercept / family.slope)];
  }

  if (family.kind === "quadratic") {
    const discriminant = family.b * family.b - 4 * family.a * family.c;

    if (discriminant < -EPSILON) {
      return [];
    }

    if (Math.abs(discriminant) < EPSILON) {
      return [roundFactNumber(-family.b / (2 * family.a))];
    }

    const root = Math.sqrt(discriminant);

    return uniqueSortedNumbers([
      (-family.b - root) / (2 * family.a),
      (-family.b + root) / (2 * family.a),
    ]);
  }

  if (family.kind === "simple-rational") {
    return [];
  }

  return null;
}

function buildBoundaryIntervals(
  expression: string,
  boundaries: Array<{ value: number; kind: "root" | "excluded" }>,
): FunctionSignInterval[] {
  const intervals: FunctionSignInterval[] = [];
  let start: number | null = null;

  function sampleInInterval(left: number | null, right: number | null) {
    if (left === null && right === null) {
      return 0;
    }

    if (left === null) {
      return (right ?? 0) - 1;
    }

    if (right === null) {
      return left + 1;
    }

    return (left + right) / 2;
  }

  for (const boundary of boundaries) {
    if (start === null || boundary.value > start) {
      const sample = sampleInInterval(start, boundary.value);
      intervals.push({
        kind: "interval",
        label: intervalLabel(start, boundary.value),
        start,
        end: boundary.value,
        sign: getSign(evaluateFunctionRaw(expression, sample)),
      });
    }

    intervals.push({
      kind: "point",
      label: pointLabel(boundary.value),
      start: boundary.value,
      end: boundary.value,
      sign: boundary.kind === "root" ? "zero" : "undefined",
    });
    start = boundary.value;
  }

  const sample = sampleInInterval(start, null);
  intervals.push({
    kind: "interval",
    label: intervalLabel(start, null),
    start,
    end: null,
    sign: getSign(evaluateFunctionRaw(expression, sample)),
  });

  return intervals;
}

function buildEstimatedSignIntervals(
  expression: string,
  xDomain: [number, number],
  roots: number[],
): FunctionSignInterval[] {
  const [left, right] =
    xDomain[0] <= xDomain[1] ? xDomain : [xDomain[1], xDomain[0]];
  const boundaries = roots
    .filter((root) => root > left && root < right)
    .map((value) => ({ value, kind: "root" as const }));
  const intervals: FunctionSignInterval[] = [];
  let start = left;

  for (const boundary of boundaries) {
    const sample = (start + boundary.value) / 2;
    intervals.push({
      kind: "interval",
      label: `[${formatFactNumber(start)}, ${formatFactNumber(boundary.value)}]`,
      start,
      end: boundary.value,
      sign: getSign(evaluateFunctionRaw(expression, sample)),
    });
    intervals.push({
      kind: "point",
      label: pointLabel(boundary.value),
      start: boundary.value,
      end: boundary.value,
      sign: "zero",
    });
    start = boundary.value;
  }

  const sample = (start + right) / 2;
  intervals.push({
    kind: "interval",
    label: `[${formatFactNumber(start)}, ${formatFactNumber(right)}]`,
    start,
    end: right,
    sign: getSign(evaluateFunctionRaw(expression, sample)),
  });

  return intervals;
}

function buildExactSignIntervals(
  expression: string,
  family: FunctionFamily,
  roots: number[],
): FunctionSignInterval[] | null {
  if (family.kind === "free") {
    return null;
  }

  const boundaries: Array<{ value: number; kind: "root" | "excluded" }> =
    roots.map((value) => ({
      value,
      kind: "root",
    }));

  if (family.kind === "simple-rational") {
    boundaries.push({
      value: family.excludedValue,
      kind: "excluded",
    });
  }

  boundaries.sort((first, second) => first.value - second.value);

  return buildBoundaryIntervals(expression, boundaries);
}

function formatLinearExpression(slope: number, intercept: number) {
  const roundedSlope = roundFactNumber(slope);
  const roundedIntercept = roundFactNumber(intercept);

  if (Math.abs(roundedSlope) < EPSILON) {
    return formatFactNumber(roundedIntercept);
  }

  const slopeText =
    roundedSlope === 1
      ? "x"
      : roundedSlope === -1
        ? "-x"
        : `${formatFactNumber(roundedSlope)}*x`;

  if (Math.abs(roundedIntercept) < EPSILON) {
    return slopeText;
  }

  const operator = roundedIntercept > 0 ? "+" : "-";

  return `${slopeText} ${operator} ${formatFactNumber(Math.abs(roundedIntercept))}`;
}

function estimateDerivative(expression: string, x: number): number | null {
  const h = 0.0001;
  const left = evaluateFunctionRaw(expression, x - h);
  const right = evaluateFunctionRaw(expression, x + h);

  if (left === null || right === null) {
    return null;
  }

  return roundFactNumber((right - left) / (2 * h));
}

function derivativeValueForFamily(family: FunctionFamily, x: number) {
  if (family.kind === "linear") {
    return family.slope;
  }

  if (family.kind === "quadratic") {
    return 2 * family.a * x + family.b;
  }

  if (family.kind === "simple-rational") {
    if (Math.abs(x - family.excludedValue) < EPSILON) {
      return null;
    }

    return -family.numerator / Math.pow(x - family.excludedValue, 2);
  }

  return null;
}

function buildDerivativeSummary(
  family: FunctionFamily,
  tangentX: number,
  expression: string,
): FunctionFact<FunctionDerivativeSummary> {
  if (family.kind === "linear") {
    const value = roundFactNumber(family.slope);

    return makeFact("EXACT", {
      expression: formatFactNumber(value),
      valueAtTangent: value,
      signLabel: signLabel(getSign(value)),
    }, "اشتقاق دقيق");
  }

  if (family.kind === "quadratic") {
    const value = roundFactNumber(2 * family.a * tangentX + family.b);

    return makeFact("EXACT", {
      expression: formatLinearExpression(2 * family.a, family.b),
      valueAtTangent: value,
      signLabel: signLabel(getSign(value)),
    }, "اشتقاق دقيق");
  }

  if (family.kind === "simple-rational") {
    const value = derivativeValueForFamily(family, tangentX);

    return makeFact("EXACT", {
      expression: `${formatFactNumber(-family.numerator)}/(x - ${formatFactNumber(
        family.excludedValue,
      )})^2`,
      valueAtTangent: value === null ? null : roundFactNumber(value),
      signLabel: value === null ? "غير معرّف" : signLabel(getSign(value)),
    }, "اشتقاق دقيق للدالة الكسرية المدعومة");
  }

  const estimated = estimateDerivative(expression, tangentX);

  if (estimated === null) {
    return makeFact<FunctionDerivativeSummary>(
      "UNSUPPORTED",
      null,
      "غير متاح",
      "لا يمكن تقدير الميل عند هذه القيمة بثقة.",
    );
  }

  return makeFact("ESTIMATED", {
    expression: "تقريب عددي",
    valueAtTangent: estimated,
    signLabel: signLabel(getSign(estimated)),
  }, "ميل تقريبي");
}

function buildTangentSummary(
  expression: string,
  family: FunctionFamily,
  tangentX: number,
): FunctionFact<FunctionTangentSummary> {
  const y = evaluateFunctionRaw(expression, tangentX);
  const exactSlope = derivativeValueForFamily(family, tangentX);
  const slope =
    exactSlope === null ? estimateDerivative(expression, tangentX) : exactSlope;

  if (y === null || slope === null) {
    return makeFact<FunctionTangentSummary>(
      "UNSUPPORTED",
      null,
      "المماس غير متاح",
      "القيمة أو الميل غير معرّفين عند هذه النقطة.",
    );
  }

  const roundedSlope = roundFactNumber(slope);
  const roundedY = roundFactNumber(y);
  const intercept = roundFactNumber(y - slope * tangentX);
  const equation =
    Math.abs(roundedSlope) < EPSILON
      ? `y = ${formatFactNumber(roundedY)}`
      : `y = ${formatLinearExpression(roundedSlope, intercept)}`;

  return makeFact(
    family.kind === "free" ? "ESTIMATED" : "EXACT",
    {
      x: roundFactNumber(tangentX),
      y: roundedY,
      slope: roundedSlope,
      equation,
    },
    family.kind === "free" ? "مماس تقريبي" : "مماس دقيق",
  );
}

function buildExactVariation(
  family: FunctionFamily,
): FunctionVariationInterval[] | null {
  if (family.kind === "linear") {
    return [
      {
        label: intervalLabel(null, null),
        start: null,
        end: null,
        direction:
          Math.abs(family.slope) < EPSILON
            ? "constant"
            : family.slope > 0
              ? "increasing"
              : "decreasing",
      },
    ];
  }

  if (family.kind === "quadratic") {
    const firstDirection = family.a > 0 ? "decreasing" : "increasing";
    const secondDirection = family.a > 0 ? "increasing" : "decreasing";

    return [
      {
        label: intervalLabel(null, family.vertex.x),
        start: null,
        end: family.vertex.x,
        direction: firstDirection,
        anchor: family.vertex,
      },
      {
        label: intervalLabel(family.vertex.x, null),
        start: family.vertex.x,
        end: null,
        direction: secondDirection,
        anchor: family.vertex,
      },
    ];
  }

  if (family.kind === "simple-rational") {
    const direction = family.numerator > 0 ? "decreasing" : "increasing";

    return [
      {
        label: intervalLabel(null, family.excludedValue),
        start: null,
        end: family.excludedValue,
        direction,
      },
      {
        label: intervalLabel(family.excludedValue, null),
        start: family.excludedValue,
        end: null,
        direction,
      },
    ];
  }

  return null;
}

function getVariationDirectionLabel(direction: FunctionVariationDirection) {
  switch (direction) {
    case "increasing":
      return "متزايدة";
    case "decreasing":
      return "متناقصة";
    case "constant":
      return "ثابتة";
  }
}

export function getFunctionVariationDirectionLabel(
  direction: FunctionVariationDirection,
) {
  return getVariationDirectionLabel(direction);
}

export function analyzeFunctionExpression(
  expression: string,
  xDomain: [number, number] = [-5, 5],
  tangentX = 0,
): FunctionAnalysis {
  const validation = validateFunctionExpression(expression);
  const unsupportedFamily: FunctionFamily = {
    kind: "free",
    label: "استكشاف حر بنتائج تقريبية",
  };

  if (validation.error) {
    const unsupportedReason = validation.error;

    return {
      validation,
      family: unsupportedFamily,
      roots: makeFact<number[]>(
        "UNSUPPORTED",
        null,
        "غير متاح",
        unsupportedReason,
      ),
      yIntercept: makeFact<number>(
        "UNSUPPORTED",
        null,
        "غير متاح",
        unsupportedReason,
      ),
      signIntervals: makeFact<FunctionSignInterval[]>(
        "UNSUPPORTED",
        null,
        "غير متاح",
        unsupportedReason,
      ),
      derivative: makeFact<FunctionDerivativeSummary>(
        "UNSUPPORTED",
        null,
        "غير متاح",
        unsupportedReason,
      ),
      tangent: makeFact<FunctionTangentSummary>(
        "UNSUPPORTED",
        null,
        "غير متاح",
        unsupportedReason,
      ),
      variation: makeFact<FunctionVariationInterval[]>(
        "UNSUPPORTED",
        null,
        "غير متاح",
        unsupportedReason,
      ),
    };
  }

  const family = inferFunctionFamily(validation.expression);
  const exactRoots = buildExactRoots(family);
  const roots =
    exactRoots === null
      ? makeFact(
          "ESTIMATED",
          detectApproximateRoots(validation.expression, xDomain),
          "جذور تقريبية",
        )
      : makeFact("EXACT", exactRoots, "جذور دقيقة");
  const exactSignIntervals =
    exactRoots === null
      ? null
      : buildExactSignIntervals(validation.expression, family, exactRoots);
  const signIntervals =
    exactSignIntervals === null
      ? makeFact(
          "ESTIMATED",
          buildEstimatedSignIntervals(
            validation.expression,
            xDomain,
            roots.value ?? [],
          ),
          "إشارة تقريبية داخل مجال الرسم",
        )
      : makeFact("EXACT", exactSignIntervals, "جدول إشارة دقيق");
  const yInterceptValue = evaluateFunctionRaw(validation.expression, 0);
  const derivative = buildDerivativeSummary(
    family,
    tangentX,
    validation.expression,
  );
  const tangent = buildTangentSummary(validation.expression, family, tangentX);
  const exactVariation = buildExactVariation(family);
  const variation =
    exactVariation === null
      ? makeFact<FunctionVariationInterval[]>(
          "UNSUPPORTED",
          null,
          "غير متاح لهذه العبارة",
          "جدول التغيرات الدقيق يحتاج عائلة دوال مدعومة.",
        )
      : makeFact("EXACT", exactVariation, "جدول تغيرات دقيق");

  return {
    validation,
    family,
    roots,
    yIntercept:
      yInterceptValue === null
        ? makeFact<number>(
            "UNSUPPORTED",
            null,
            "غير متاح",
            "لا توجد قيمة معرفة عند x = 0.",
          )
        : makeFact(
            family.kind === "free" ? "ESTIMATED" : "EXACT",
            roundFactNumber(yInterceptValue),
            family.kind === "free" ? "تقاطع تقريبي مع Oy" : "تقاطع دقيق مع Oy",
          ),
    signIntervals,
    derivative,
    tangent,
    variation,
  };
}

function splitAnswerParts(answer: string) {
  return answer
    .trim()
    .replace(/[،؛]/g, ";")
    .split(/[;,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatExpectedNumbers(values: number[]) {
  return values.map(formatFactNumber).join(" ; ");
}

function normalizeRootAnswer(answer: string) {
  return splitAnswerParts(answer)
    .map((part) => Number(part.replace(",", ".")))
    .filter((value) => Number.isFinite(value))
    .map(roundFactNumber)
    .sort((first, second) => first - second);
}

function normalizeSignAnswer(answer: string) {
  return splitAnswerParts(answer).map((part) => {
    const normalized = part.toLowerCase();

    if (normalized === "+" || normalized === "positive" || normalized === "pos") {
      return "+";
    }

    if (normalized === "-" || normalized === "negative" || normalized === "neg") {
      return "-";
    }

    if (
      normalized === "0" ||
      normalized === "zero" ||
      normalized === "undefined" ||
      normalized === "غير"
    ) {
      return normalized === "undefined" || normalized === "غير" ? "غير معرّف" : "0";
    }

    return part;
  });
}

function normalizeVariationAnswer(answer: string) {
  return splitAnswerParts(answer).map((part) => {
    const normalized = part.toLowerCase();

    if (
      normalized === "increasing" ||
      normalized === "increase" ||
      normalized === "up" ||
      normalized === "متزايدة" ||
      normalized === "تزايد"
    ) {
      return "increasing";
    }

    if (
      normalized === "decreasing" ||
      normalized === "decrease" ||
      normalized === "down" ||
      normalized === "متناقصة" ||
      normalized === "تناقص"
    ) {
      return "decreasing";
    }

    if (
      normalized === "constant" ||
      normalized === "stable" ||
      normalized === "ثابتة" ||
      normalized === "ثابت"
    ) {
      return "constant";
    }

    return normalized;
  });
}

function arraysEqual<T>(left: T[], right: T[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function numberArraysClose(left: number[], right: number[], tolerance: number) {
  return (
    left.length === right.length &&
    left.every((value, index) => Math.abs(value - right[index]) <= tolerance)
  );
}

function signsFromIntervals(intervals: FunctionSignInterval[]) {
  return intervals.map((interval) => getFunctionSignLabel(interval.sign));
}

export function evaluateFunctionMissionAnswer(
  analysis: FunctionAnalysis,
  input: FunctionMissionAnswerInput,
): FunctionMissionAnswerResult {
  if (input.kind === "ROOTS") {
    const expectedValues = analysis.roots.value ?? [];
    const normalizedValues = normalizeRootAnswer(input.answer);
    const expected = formatExpectedNumbers(expectedValues);
    const normalizedAnswer = formatExpectedNumbers(normalizedValues);
    const tolerance = analysis.roots.confidence === "EXACT" ? 0.01 : 0.08;
    const isCorrect = numberArraysClose(normalizedValues, expectedValues, tolerance);

    return {
      status: isCorrect ? "correct" : "incorrect",
      expected,
      normalizedAnswer,
      feedback: isCorrect
        ? "الجذور صحيحة. اربطها الآن بجدول الإشارة."
        : "راجع كل تقاطع مع محور x ثم قارن بالنتيجة المتوقعة.",
    };
  }

  if (input.kind === "SIGN_TABLE") {
    if (!analysis.signIntervals.value) {
      return {
        status: "unsupported",
        expected: "",
        normalizedAnswer: input.answer.trim(),
        feedback: analysis.signIntervals.reason ?? "جدول الإشارة غير متاح لهذه العبارة.",
      };
    }

    const expectedSigns = signsFromIntervals(analysis.signIntervals.value);
    const normalizedSigns = normalizeSignAnswer(input.answer);
    const expected = expectedSigns.join(" ");
    const normalizedAnswer = normalizedSigns.join(" ");
    const isCorrect = arraysEqual(normalizedSigns, expectedSigns);

    return {
      status: isCorrect ? "correct" : "incorrect",
      expected,
      normalizedAnswer,
      feedback: isCorrect
        ? "جدول الإشارة صحيح."
        : "انتبه للجذور المزدوجة والقيم الممنوعة؛ ليست كلها تغيّر الإشارة.",
    };
  }

  if (!analysis.variation.value) {
    return {
      status: "unsupported",
      expected: "",
      normalizedAnswer: input.answer.trim(),
      feedback: analysis.variation.reason ?? "جدول التغيرات غير متاح لهذه العبارة.",
    };
  }

  const expectedDirections = analysis.variation.value.map((entry) => entry.direction);
  const normalizedDirections = normalizeVariationAnswer(input.answer);
  const expected = expectedDirections.join(" ; ");
  const normalizedAnswer = normalizedDirections.join(" ; ");
  const isCorrect = arraysEqual(normalizedDirections, expectedDirections);

  return {
    status: isCorrect ? "correct" : "incorrect",
    expected,
    normalizedAnswer,
    feedback: isCorrect
      ? "اتجاهات التغير صحيحة."
      : "راجع إشارة f'(x): الموجبة تعني تزايداً والسالبة تعني تناقصاً.",
  };
}
