export type LabGraphPoint = {
  x: number;
  y: number;
  label?: string;
};

export type LabGraphAxis = {
  label: string;
  unit?: string;
  min?: number;
  max?: number;
};

export type LabGraphSeriesKind = "line" | "scatter" | "bar";

export type LabGraphSeries = {
  id: string;
  title: string;
  kind: LabGraphSeriesKind;
  points: LabGraphPoint[];
};

export type LabGraphModel = {
  xAxis: LabGraphAxis;
  yAxis: LabGraphAxis;
  series: LabGraphSeries[];
};

export type LabGraphExtrema = {
  minimum: LabGraphPoint | null;
  maximum: LabGraphPoint | null;
};

const EPSILON = 1e-9;

function roundGraphNumber(value: number) {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;

  return Object.is(rounded, -0) ? 0 : rounded;
}

function sortPointsByX(points: LabGraphPoint[]) {
  return [...points].sort((left, right) => left.x - right.x);
}

export function getGraphSeries(
  model: LabGraphModel,
  seriesId: string,
): LabGraphSeries | null {
  return model.series.find((series) => series.id === seriesId) ?? null;
}

export function calculateGraphSlope(
  first: LabGraphPoint,
  second: LabGraphPoint,
): number | null {
  const deltaX = second.x - first.x;

  if (Math.abs(deltaX) < EPSILON) {
    return null;
  }

  return roundGraphNumber((second.y - first.y) / deltaX);
}

export function interpolateGraphYAtX(
  series: LabGraphSeries,
  x: number,
): number | null {
  const points = sortPointsByX(series.points);

  for (const point of points) {
    if (Math.abs(point.x - x) < EPSILON) {
      return point.y;
    }
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];

    if (left.x <= x && x <= right.x && Math.abs(right.x - left.x) >= EPSILON) {
      const ratio = (x - left.x) / (right.x - left.x);

      return roundGraphNumber(left.y + ratio * (right.y - left.y));
    }
  }

  return null;
}

export function estimateGraphSlopeAtX(
  series: LabGraphSeries,
  x: number,
): number | null {
  const points = sortPointsByX(series.points);

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];

    if (left.x <= x && x <= right.x) {
      return calculateGraphSlope(left, right);
    }
  }

  return null;
}

export function findGraphExtrema(series: LabGraphSeries): LabGraphExtrema {
  if (!series.points.length) {
    return {
      minimum: null,
      maximum: null,
    };
  }

  return series.points.reduce<LabGraphExtrema>(
    (extrema, point) => ({
      minimum:
        !extrema.minimum || point.y < extrema.minimum.y
          ? point
          : extrema.minimum,
      maximum:
        !extrema.maximum || point.y > extrema.maximum.y
          ? point
          : extrema.maximum,
    }),
    {
      minimum: null,
      maximum: null,
    },
  );
}

export function findHorizontalGraphIntersections(
  series: LabGraphSeries,
  y: number,
): LabGraphPoint[] {
  const points = sortPointsByX(series.points);
  const intersections: LabGraphPoint[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];

    if (Math.abs(point.y - y) < EPSILON) {
      intersections.push({ x: point.x, y });
    }

    const next = points[index + 1];

    if (!next) {
      continue;
    }

    const leftDelta = point.y - y;
    const rightDelta = next.y - y;

    if (leftDelta * rightDelta >= 0 || Math.abs(next.y - point.y) < EPSILON) {
      continue;
    }

    const ratio = (y - point.y) / (next.y - point.y);
    intersections.push({
      x: roundGraphNumber(point.x + ratio * (next.x - point.x)),
      y,
    });
  }

  return intersections;
}
