import { describe, expect, it } from "vitest";
import {
  calculateGraphSlope,
  estimateGraphSlopeAtX,
  findGraphExtrema,
  findHorizontalGraphIntersections,
  getGraphSeries,
  interpolateGraphYAtX,
  type LabGraphModel,
  type LabGraphSeries,
} from "./lab-graph-engine";

const lineSeries = {
  id: "conductivity",
  title: "Conductivity",
  kind: "line",
  points: [
    { x: 0, y: 6 },
    { x: 2, y: 2 },
    { x: 4, y: -2 },
  ],
} satisfies LabGraphSeries;

describe("lab graph engine", () => {
  it("reads interpolated values and slopes from ordered graph points", () => {
    expect(interpolateGraphYAtX(lineSeries, 1)).toBe(4);
    expect(estimateGraphSlopeAtX(lineSeries, 3)).toBe(-2);
    expect(calculateGraphSlope({ x: 1, y: 3 }, { x: 1, y: 8 })).toBeNull();
  });

  it("finds extrema from sampled BAC graph data", () => {
    expect(
      findGraphExtrema({
        id: "enzyme-rate",
        title: "Enzyme rate",
        kind: "line",
        points: [
          { x: 20, y: 2 },
          { x: 37, y: 8 },
          { x: 60, y: 1 },
        ],
      }),
    ).toEqual({
      minimum: { x: 60, y: 1 },
      maximum: { x: 37, y: 8 },
    });
  });

  it("finds horizontal intersections by exact hits and linear interpolation", () => {
    expect(findHorizontalGraphIntersections(lineSeries, 0)).toEqual([
      { x: 3, y: 0 },
    ]);
    expect(findHorizontalGraphIntersections(lineSeries, 2)).toEqual([
      { x: 2, y: 2 },
    ]);
  });

  it("selects series by id from a graph model", () => {
    const model = {
      xAxis: { label: "t", unit: "s" },
      yAxis: { label: "u", unit: "V" },
      series: [lineSeries],
    } satisfies LabGraphModel;

    expect(getGraphSeries(model, "conductivity")).toBe(lineSeries);
    expect(getGraphSeries(model, "missing")).toBeNull();
  });
});
