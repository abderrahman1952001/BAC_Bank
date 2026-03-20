'use client';

import { useEffect, useMemo, useRef, useId } from 'react';

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

function normalizeDomain(domain: [number, number] | undefined, fallback: [number, number]) {
  if (!domain || domain.length !== 2) {
    return fallback;
  }

  const [left, right] = domain;
  if (!Number.isFinite(left) || !Number.isFinite(right) || left === right) {
    return fallback;
  }

  return left < right ? domain : [right, left];
}

export function FormulaGraphPlot({
  data,
}: {
  data: FormulaGraphJson;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const reactId = useId();
  const graphId = useMemo(
    () => `formula-graph-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [reactId],
  );

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

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;

    async function draw() {
      if (!host) {
        return;
      }

      host.innerHTML = '';

      if (!normalized.curves.length) {
        return;
      }

      const functionPlotModule = (await import('function-plot')) as unknown as {
        default: (options: Record<string, unknown>) => void;
      };

      if (cancelled) {
        return;
      }

      functionPlotModule.default({
        target: `#${graphId}`,
        width: normalized.width,
        height: normalized.height,
        grid: normalized.grid,
        disableZoom: true,
        xAxis: {
          domain: normalized.xDomain,
          label: 'x',
        },
        yAxis: {
          domain: normalized.yDomain,
          label: 'y',
        },
        data: normalized.curves.map((curve) => ({
          fn: curve.fn,
          color: curve.color,
          graphType: curve.graphType ?? 'polyline',
        })),
      });
    }

    void draw();

    return () => {
      cancelled = true;
      if (host) {
        host.innerHTML = '';
      }
    };
  }, [graphId, normalized]);

  return (
    <div className="formula-graph-wrap" dir="ltr">
      {data.title ? <p className="formula-graph-title">{data.title}</p> : null}
      <div id={graphId} ref={hostRef} className="formula-graph-host" />
    </div>
  );
}
