'use client';

import { useMemo } from 'react';
import { evaluateFunctionAt } from '@/lib/lab-function-explorer';

type FormulaCurve = {
  fn: string;
  color?: string;
  graphType?: 'polyline' | 'scatter';
};

export type FormulaGraphJson = {
  type?: 'formula_graph';
  title?: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  width?: number;
  height?: number;
  grid?: boolean;
  curves: FormulaCurve[];
};

function normalizeDomain(
  domain: [number, number] | undefined,
  fallback: [number, number],
): [number, number] {
  if (!domain || domain.length !== 2) {
    return fallback;
  }

  const [left, right] = domain;
  if (!Number.isFinite(left) || !Number.isFinite(right) || left === right) {
    return fallback;
  }

  return left < right ? domain : [right, left];
}

function buildTicks([start, end]: [number, number], targetCount = 6) {
  const step = (end - start) / Math.max(1, targetCount);

  return Array.from({ length: targetCount + 1 }, (_, index) => {
    const value = start + step * index;
    const rounded = Math.round(value * 100) / 100;

    return Object.is(rounded, -0) ? 0 : rounded;
  });
}

function formatTick(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildPathSegments({
  fn,
  xDomain,
  yDomain,
  width,
  height,
  padding,
}: {
  fn: string;
  xDomain: [number, number];
  yDomain: [number, number];
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}) {
  const sampleCount = Math.max(96, Math.min(260, Math.round(width / 3)));
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  const segments: string[][] = [];
  let current: string[] = [];

  function toPoint(xValue: number, yValue: number) {
    const x = padding.left + ((xValue - xMin) / (xMax - xMin)) * plotWidth;
    const y = padding.top + (1 - (yValue - yMin) / (yMax - yMin)) * plotHeight;

    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }

  for (let index = 0; index <= sampleCount; index += 1) {
    const x = xMin + ((xMax - xMin) * index) / sampleCount;
    const y = evaluateFunctionAt(fn, x);

    if (y === null || y < yMin || y > yMax) {
      if (current.length > 1) {
        segments.push(current);
      }

      current = [];
      continue;
    }

    current.push(toPoint(x, y));
  }

  if (current.length > 1) {
    segments.push(current);
  }

  return segments;
}

export function FormulaGraphPlot({
  data,
}: {
  data: FormulaGraphJson;
}) {
  const normalized = useMemo(
    () => ({
      width: data.width ?? 760,
      height: data.height ?? 440,
      xDomain: normalizeDomain(data.xDomain, [-5, 5]),
      yDomain: normalizeDomain(data.yDomain, [-5, 5]),
      grid: data.grid ?? true,
      curves: data.curves.filter((curve) => Boolean(curve.fn?.trim())),
    }),
    [data],
  );
  const padding = { top: 22, right: 24, bottom: 40, left: 48 };
  const plotWidth = normalized.width - padding.left - padding.right;
  const plotHeight = normalized.height - padding.top - padding.bottom;
  const xTicks = buildTicks(normalized.xDomain, 8);
  const yTicks = buildTicks(normalized.yDomain, 6);
  const xZero =
    normalized.xDomain[0] <= 0 && normalized.xDomain[1] >= 0
      ? padding.left +
        ((0 - normalized.xDomain[0]) /
          (normalized.xDomain[1] - normalized.xDomain[0])) *
          plotWidth
      : null;
  const yZero =
    normalized.yDomain[0] <= 0 && normalized.yDomain[1] >= 0
      ? padding.top +
        (1 -
          (0 - normalized.yDomain[0]) /
            (normalized.yDomain[1] - normalized.yDomain[0])) *
          plotHeight
      : null;

  return (
    <div className="formula-graph-wrap" dir="ltr">
      {data.title ? <p className="formula-graph-title">{data.title}</p> : null}
      <div className="formula-graph-host">
        <svg
          className="formula-graph-svg"
          viewBox={`0 0 ${normalized.width} ${normalized.height}`}
          role="img"
          aria-label={data.title ?? 'Function graph'}
        >
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            rx="12"
            className="formula-graph-plane"
          />

          {normalized.grid
            ? xTicks.map((tick) => {
                const x =
                  padding.left +
                  ((tick - normalized.xDomain[0]) /
                    (normalized.xDomain[1] - normalized.xDomain[0])) *
                    plotWidth;

                return (
                  <line
                    key={`x-grid-${tick}`}
                    x1={x}
                    x2={x}
                    y1={padding.top}
                    y2={padding.top + plotHeight}
                    className="formula-graph-grid-line"
                  />
                );
              })
            : null}

          {normalized.grid
            ? yTicks.map((tick) => {
                const y =
                  padding.top +
                  (1 -
                    (tick - normalized.yDomain[0]) /
                      (normalized.yDomain[1] - normalized.yDomain[0])) *
                    plotHeight;

                return (
                  <line
                    key={`y-grid-${tick}`}
                    x1={padding.left}
                    x2={padding.left + plotWidth}
                    y1={y}
                    y2={y}
                    className="formula-graph-grid-line"
                  />
                );
              })
            : null}

          {xZero === null ? null : (
            <line
              x1={xZero}
              x2={xZero}
              y1={padding.top}
              y2={padding.top + plotHeight}
              className="formula-graph-axis-line"
            />
          )}

          {yZero === null ? null : (
            <line
              x1={padding.left}
              x2={padding.left + plotWidth}
              y1={yZero}
              y2={yZero}
              className="formula-graph-axis-line"
            />
          )}

          {xTicks.map((tick) => {
            const x =
              padding.left +
              ((tick - normalized.xDomain[0]) /
                (normalized.xDomain[1] - normalized.xDomain[0])) *
                plotWidth;

            return (
              <text
                key={`x-label-${tick}`}
                x={x}
                y={normalized.height - 14}
                textAnchor="middle"
                className="formula-graph-tick"
              >
                {formatTick(tick)}
              </text>
            );
          })}

          {yTicks.map((tick) => {
            const y =
              padding.top +
              (1 -
                (tick - normalized.yDomain[0]) /
                  (normalized.yDomain[1] - normalized.yDomain[0])) *
                plotHeight;

            return (
              <text
                key={`y-label-${tick}`}
                x={padding.left - 12}
                y={y + 4}
                textAnchor="end"
                className="formula-graph-tick"
              >
                {formatTick(tick)}
              </text>
            );
          })}

          <text
            x={padding.left + plotWidth}
            y={padding.top + plotHeight + 28}
            textAnchor="end"
            className="formula-graph-axis-label"
          >
            x
          </text>
          <text
            x={padding.left - 28}
            y={padding.top + 10}
            textAnchor="middle"
            className="formula-graph-axis-label"
          >
            y
          </text>

          {normalized.curves.flatMap((curve, curveIndex) =>
            buildPathSegments({
              fn: curve.fn,
              xDomain: normalized.xDomain,
              yDomain: normalized.yDomain,
              width: normalized.width,
              height: normalized.height,
              padding,
            }).map((points, segmentIndex) => (
              <polyline
                key={`${curve.fn}-${curveIndex}-${segmentIndex}`}
                points={points.join(' ')}
                fill="none"
                stroke={curve.color ?? 'var(--app-accent)'}
                className="formula-graph-curve"
              />
            )),
          )}
        </svg>
      </div>
    </div>
  );
}
