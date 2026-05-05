import { EvalBuiltIn } from "function-plot";

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

export type FunctionValueTable = {
  rows: FunctionValueRow[];
  error: string | null;
};

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

export function evaluateFunctionAt(
  expression: string,
  x: number,
): number | null {
  const validation = validateFunctionExpression(expression);

  if (validation.error) {
    return null;
  }

  try {
    const value = EvalBuiltIn({ fn: validation.expression }, "fn", { x });

    return typeof value === "number" && Number.isFinite(value)
      ? roundDisplayNumber(value)
      : null;
  } catch {
    return null;
  }
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

  const [left, right] = xDomain[0] <= xDomain[1] ? xDomain : [xDomain[1], xDomain[0]];
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
