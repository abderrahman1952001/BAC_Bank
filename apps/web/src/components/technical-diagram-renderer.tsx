"use client";

import type {
  TechnicalDiagramKind,
  TechnicalDiagramRenderData,
  TechnicalFlowConnector,
  TechnicalFlowFrame,
  TechnicalFlowNode,
  TechnicalGridCell,
  TechnicalGridGroup,
  TechnicalWaveformSignal,
} from "@bac-bank/contracts/ingestion";
import { type CSSProperties, type ReactNode, useId } from "react";

type TechnicalDiagramRendererProps = {
  data: TechnicalDiagramRenderData;
  fallback?: ReactNode;
  compact?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringField(value: unknown, field: string): string | null {
  return isRecord(value) ? readString(value[field]) : null;
}

function readNumberField(value: unknown, field: string): number | null {
  return isRecord(value) ? readNumber(value[field]) : null;
}

function resolveKind(
  value: Record<string, unknown>,
): TechnicalDiagramKind | null {
  const kind = readStringField(value, "kind");

  if (
    kind === "technical_flow" ||
    kind === "technical_grid" ||
    kind === "technical_waveform"
  ) {
    return kind;
  }

  if (kind === "technical_diagram") {
    const family =
      readStringField(value, "family") ?? readStringField(value, "type");

    if (family === "flow" || family === "grafcet" || family === "fast") {
      return "technical_flow";
    }

    if (family === "grid" || family === "karnaugh" || family === "form") {
      return "technical_grid";
    }

    if (family === "waveform" || family === "timing") {
      return "technical_waveform";
    }
  }

  return null;
}

function asFlowNode(value: unknown): TechnicalFlowNode | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readStringField(value, "id");
  const label =
    readStringField(value, "label") ?? readStringField(value, "text");
  const x = readNumberField(value, "x");
  const y = readNumberField(value, "y");
  const width = readNumberField(value, "width");
  const height = readNumberField(value, "height");

  if (
    !id ||
    !label ||
    x === null ||
    y === null ||
    width === null ||
    height === null
  ) {
    return null;
  }

  const type = readStringField(value, "type");

  return {
    id,
    label,
    x,
    y,
    width,
    height,
    type:
      type === "state" ||
      type === "step" ||
      type === "action" ||
      type === "decision" ||
      type === "junction" ||
      type === "terminal"
        ? type
        : "box",
    subtitle: readStringField(value, "subtitle") ?? undefined,
    rows: Array.isArray(value.rows)
      ? value.rows.filter((row): row is string => typeof row === "string")
      : undefined,
  };
}

function asPoint(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const x = readNumberField(value, "x");
  const y = readNumberField(value, "y");

  return x === null || y === null ? null : { x, y };
}

function asConnector(value: unknown): TechnicalFlowConnector | null {
  if (!isRecord(value)) {
    return null;
  }

  const from = readStringField(value, "from") ?? undefined;
  const to = readStringField(value, "to") ?? undefined;
  const points = Array.isArray(value.points)
    ? value.points
        .map((point) => asPoint(point))
        .filter((point): point is { x: number; y: number } => point !== null)
    : undefined;

  if (!from && !to && (!points || points.length < 2)) {
    return null;
  }

  return {
    from,
    to,
    points,
    label: readStringField(value, "label") ?? undefined,
    labelX: readNumberField(value, "labelX") ?? undefined,
    labelY: readNumberField(value, "labelY") ?? undefined,
    labelWidth: readNumberField(value, "labelWidth") ?? undefined,
    dashed: value.dashed === true,
    arrowStart: value.arrowStart === true,
    arrowEnd: value.arrowEnd !== false,
  };
}

function asFrame(value: unknown): TechnicalFlowFrame | null {
  if (!isRecord(value)) {
    return null;
  }

  const x = readNumberField(value, "x");
  const y = readNumberField(value, "y");
  const width = readNumberField(value, "width");
  const height = readNumberField(value, "height");

  if (x === null || y === null || width === null || height === null) {
    return null;
  }

  return {
    x,
    y,
    width,
    height,
    label: readStringField(value, "label") ?? undefined,
  };
}

function asGridCell(value: unknown): TechnicalGridCell | null {
  if (!isRecord(value)) {
    return null;
  }

  const row = readNumberField(value, "row");
  const col = readNumberField(value, "col");

  if (row === null || col === null) {
    return null;
  }

  const tone = readStringField(value, "tone");

  return {
    row,
    col,
    rowSpan: readNumberField(value, "rowSpan") ?? undefined,
    colSpan: readNumberField(value, "colSpan") ?? undefined,
    text: readStringField(value, "text") ?? undefined,
    label: readStringField(value, "label") ?? undefined,
    tone:
      tone === "header" || tone === "answer" || tone === "muted"
        ? tone
        : "neutral",
  };
}

function asGridGroup(value: unknown): TechnicalGridGroup | null {
  if (!isRecord(value)) {
    return null;
  }

  const row = readNumberField(value, "row");
  const col = readNumberField(value, "col");
  const rowSpan = readNumberField(value, "rowSpan");
  const colSpan = readNumberField(value, "colSpan");

  if (row === null || col === null || rowSpan === null || colSpan === null) {
    return null;
  }

  return {
    row,
    col,
    rowSpan,
    colSpan,
    label: readStringField(value, "label") ?? undefined,
  };
}

function asWaveformSignal(value: unknown): TechnicalWaveformSignal | null {
  if (!isRecord(value)) {
    return null;
  }

  const label =
    readStringField(value, "label") ?? readStringField(value, "name");
  const wave = readStringField(value, "wave");

  if (!label || !wave) {
    return null;
  }

  return {
    label,
    wave,
    values: Array.isArray(value.values)
      ? value.values.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : undefined,
  };
}

export function extractTechnicalDiagramRenderData(
  value: unknown,
): TechnicalDiagramRenderData | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidates: unknown[] = [
    value,
    value.technicalDiagram,
    value.technicalFlow,
    value.technicalGrid,
    value.technicalWaveform,
    value.payload,
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const kind = resolveKind(candidate) ?? resolveKind(value);

    if (!kind) {
      continue;
    }

    const nodes = Array.isArray(candidate.nodes)
      ? candidate.nodes
          .map((node) => asFlowNode(node))
          .filter((node): node is TechnicalFlowNode => node !== null)
      : [];
    const connectors = Array.isArray(candidate.connectors)
      ? candidate.connectors
          .map((connector) => asConnector(connector))
          .filter(
            (connector): connector is TechnicalFlowConnector =>
              connector !== null,
          )
      : [];
    const frames = Array.isArray(candidate.frames)
      ? candidate.frames
          .map((frame) => asFrame(frame))
          .filter((frame): frame is TechnicalFlowFrame => frame !== null)
      : [];
    const rows = Array.isArray(candidate.rows)
      ? candidate.rows
          .map((row) =>
            Array.isArray(row)
              ? row.map((cell) =>
                  typeof cell === "string" ? cell : String(cell ?? ""),
                )
              : [],
          )
          .filter((row) => row.length > 0)
      : [];
    const cells = Array.isArray(candidate.cells)
      ? candidate.cells
          .map((cell) => asGridCell(cell))
          .filter((cell): cell is TechnicalGridCell => cell !== null)
      : [];
    const groups = Array.isArray(candidate.groups)
      ? candidate.groups
          .map((group) => asGridGroup(group))
          .filter((group): group is TechnicalGridGroup => group !== null)
      : [];
    const signals = Array.isArray(candidate.signals)
      ? candidate.signals
          .map((signal) => asWaveformSignal(signal))
          .filter(
            (signal): signal is TechnicalWaveformSignal => signal !== null,
          )
      : [];

    if (
      (kind === "technical_flow" && !nodes.length) ||
      (kind === "technical_grid" && !rows.length && !cells.length) ||
      (kind === "technical_waveform" && !signals.length)
    ) {
      continue;
    }

    const direction = readStringField(candidate, "direction");
    const reviewStatus = readStringField(candidate, "reviewStatus");

    return {
      kind,
      title: readStringField(candidate, "title") ?? undefined,
      caption: readStringField(candidate, "caption") ?? undefined,
      width: readNumberField(candidate, "width") ?? undefined,
      height: readNumberField(candidate, "height") ?? undefined,
      direction: direction === "rtl" ? "rtl" : "ltr",
      reviewStatus:
        reviewStatus === "visual_checked" ? "visual_checked" : "candidate",
      nodes,
      connectors,
      frames,
      rows,
      cells,
      groups,
      cellWidth: readNumberField(candidate, "cellWidth") ?? undefined,
      cellHeight: readNumberField(candidate, "cellHeight") ?? undefined,
      signals,
      notes: Array.isArray(candidate.notes)
        ? candidate.notes.filter(
            (note): note is string => typeof note === "string",
          )
        : undefined,
    };
  }

  return null;
}

function wrapLabel(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines.slice(0, 5) : [text];
}

function renderSvgLabel({
  text,
  x,
  y,
  width,
  className,
  direction,
}: {
  text: string;
  x: number;
  y: number;
  width: number;
  className?: string;
  direction: "ltr" | "rtl";
}) {
  const lines = wrapLabel(text, Math.max(8, Math.floor(width / 12)));

  return (
    <text
      className={className ?? "technical-diagram-label"}
      direction={direction}
      dominantBaseline="middle"
      textAnchor="middle"
      x={x}
      y={y - (lines.length - 1) * 9}
    >
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : 18}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function nodeCenter(node: TechnicalFlowNode) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

function connectorPoints(
  connector: TechnicalFlowConnector,
  nodesById: Map<string, TechnicalFlowNode>,
) {
  if (connector.points && connector.points.length >= 2) {
    return connector.points;
  }

  const from = connector.from ? nodesById.get(connector.from) : null;
  const to = connector.to ? nodesById.get(connector.to) : null;

  if (!from || !to) {
    return [];
  }

  const start = nodeCenter(from);
  const end = nodeCenter(to);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);

  return [
    {
      x: start.x + (horizontal ? (Math.sign(dx || 1) * from.width) / 2 : 0),
      y: start.y + (horizontal ? 0 : (Math.sign(dy || 1) * from.height) / 2),
    },
    {
      x: end.x - (horizontal ? (Math.sign(dx || 1) * to.width) / 2 : 0),
      y: end.y - (horizontal ? 0 : (Math.sign(dy || 1) * to.height) / 2),
    },
  ];
}

function renderFlow(data: TechnicalDiagramRenderData, markerId: string) {
  const nodes = data.nodes ?? [];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const width = data.width ?? 900;
  const height = data.height ?? 520;
  const direction = data.direction ?? "ltr";

  return (
    <svg
      aria-label={data.title ?? "Technical flow diagram"}
      className="technical-diagram-svg"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <marker
          id={markerId}
          markerHeight="8"
          markerWidth="8"
          orient="auto"
          refX="7"
          refY="4"
          viewBox="0 0 8 8"
        >
          <path className="technical-diagram-marker" d="M 0 0 L 8 4 L 0 8 Z" />
        </marker>
      </defs>
      {(data.frames ?? []).map((frame) => (
        <g
          key={`${frame.x}-${frame.y}`}
          className="technical-diagram-frame-group"
        >
          <rect
            className="technical-diagram-frame-box"
            height={frame.height}
            rx="10"
            width={frame.width}
            x={frame.x}
            y={frame.y}
          />
          {frame.label
            ? renderSvgLabel({
                text: frame.label,
                x: frame.x + frame.width / 2,
                y: frame.y + 18,
                width: frame.width,
                className: "technical-diagram-frame-label",
                direction,
              })
            : null}
        </g>
      ))}
      {(data.connectors ?? []).map((connector, index) => {
        const points = connectorPoints(connector, nodesById);

        if (points.length < 2) {
          return null;
        }

        const d = points
          .map(
            (point, pointIndex) =>
              `${pointIndex === 0 ? "M" : "L"} ${point.x} ${point.y}`,
          )
          .join(" ");
        const midpoint = points[Math.floor(points.length / 2)];
        const labelPoint =
          connector.labelX !== undefined && connector.labelY !== undefined
            ? {
                x: connector.labelX,
                y: connector.labelY,
              }
            : midpoint;

        return (
          <g key={`${connector.from ?? "p"}-${connector.to ?? index}`}>
            <path
              className={[
                "technical-diagram-connector",
                connector.dashed ? "technical-diagram-dashed" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              d={d}
              markerEnd={
                connector.arrowEnd === false ? undefined : `url(#${markerId})`
              }
            />
            {connector.label && labelPoint
              ? renderSvgLabel({
                  text: connector.label,
                  x: labelPoint.x,
                  y: labelPoint.y,
                  width: connector.labelWidth ?? 140,
                  className: "technical-diagram-edge-label",
                  direction,
                })
              : null}
          </g>
        );
      })}
      {nodes.map((node) => {
        const center = nodeCenter(node);

        return (
          <g
            key={node.id}
            className={`technical-diagram-node technical-node-${node.type ?? "box"}`}
          >
            <rect
              className="technical-diagram-node-box"
              height={node.height}
              rx={node.type === "step" ? 2 : 8}
              width={node.width}
              x={node.x}
              y={node.y}
            />
            {renderSvgLabel({
              text: node.label,
              x: center.x,
              y: center.y - (node.subtitle ? 8 : 0),
              width: node.width,
              direction,
            })}
            {node.subtitle
              ? renderSvgLabel({
                  text: node.subtitle,
                  x: center.x,
                  y: center.y + 22,
                  width: node.width,
                  className: "technical-diagram-subtitle",
                  direction,
                })
              : null}
          </g>
        );
      })}
    </svg>
  );
}

function gridCells(data: TechnicalDiagramRenderData): TechnicalGridCell[] {
  if (data.cells?.length) {
    return data.cells;
  }

  return (data.rows ?? []).flatMap((row, rowIndex) =>
    row.map((text, colIndex): TechnicalGridCell => {
      return {
        row: rowIndex,
        col: colIndex,
        text,
        tone: rowIndex === 0 || colIndex === 0 ? "header" : "neutral",
      };
    }),
  );
}

function renderGrid(data: TechnicalDiagramRenderData) {
  const cells = gridCells(data);
  const groups = data.groups ?? [];
  const cellWidth = data.cellWidth ?? 110;
  const cellHeight = data.cellHeight ?? 48;
  const maxCol = Math.max(
    0,
    ...cells.map((cell) => cell.col + (cell.colSpan ?? 1)),
    ...groups.map((group) => group.col + group.colSpan),
  );
  const maxRow = Math.max(
    0,
    ...cells.map((cell) => cell.row + (cell.rowSpan ?? 1)),
    ...groups.map((group) => group.row + group.rowSpan),
  );
  const width = data.width ?? Math.max(320, maxCol * cellWidth);
  const height = data.height ?? Math.max(160, maxRow * cellHeight);
  const direction = data.direction ?? "ltr";

  return (
    <svg
      aria-label={data.title ?? "Technical grid diagram"}
      className="technical-diagram-svg"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      {cells.map((cell, index) => {
        const x = cell.col * cellWidth;
        const y = cell.row * cellHeight;
        const w = (cell.colSpan ?? 1) * cellWidth;
        const h = (cell.rowSpan ?? 1) * cellHeight;

        return (
          <g
            key={`${cell.row}-${cell.col}-${index}`}
            className={`technical-grid-cell technical-grid-${cell.tone ?? "neutral"}`}
          >
            <rect
              className="technical-grid-cell-box"
              height={h}
              width={w}
              x={x}
              y={y}
            />
            {renderSvgLabel({
              text: cell.text ?? cell.label ?? "",
              x: x + w / 2,
              y: y + h / 2,
              width: w,
              direction,
            })}
          </g>
        );
      })}
      {groups.map((group, index) => {
        const x = group.col * cellWidth;
        const y = group.row * cellHeight;
        const w = group.colSpan * cellWidth;
        const h = group.rowSpan * cellHeight;

        return (
          <g
            key={`${group.row}-${group.col}-${index}`}
            className="technical-grid-group"
          >
            <rect
              className="technical-grid-group-box"
              height={Math.max(4, h - 8)}
              rx="12"
              width={Math.max(4, w - 8)}
              x={x + 4}
              y={y + 4}
            />
            {group.label
              ? renderSvgLabel({
                  text: group.label,
                  x: x + w / 2,
                  y: y + 18,
                  width: w,
                  className: "technical-grid-group-label",
                  direction,
                })
              : null}
          </g>
        );
      })}
    </svg>
  );
}

function waveLevel(char: string) {
  if (char === "1" || char === "h") {
    return 0;
  }

  if (char === "0" || char === "l") {
    return 1;
  }

  return 0.5;
}

function renderWavePath(
  signal: TechnicalWaveformSignal,
  x: number,
  y: number,
  cell: number,
) {
  const chars = signal.wave.split("");
  const high = y + 8;
  const low = y + 34;
  const mid = y + 21;
  const yFor = (char: string) => {
    const level = waveLevel(char);
    return level === 0 ? high : level === 1 ? low : mid;
  };
  let d = "";
  let previousY = yFor(chars[0] ?? "x");

  chars.forEach((char, index) => {
    const startX = x + index * cell;
    const endX = startX + cell;
    const nextY = yFor(char === "." ? (chars[index - 1] ?? "x") : char);

    if (index === 0) {
      d += `M ${startX} ${nextY}`;
    } else if (nextY !== previousY) {
      d += ` L ${startX} ${previousY} L ${startX} ${nextY}`;
    } else {
      d += ` L ${startX} ${nextY}`;
    }

    d += ` L ${endX} ${nextY}`;
    previousY = nextY;
  });

  return d;
}

function renderWaveform(data: TechnicalDiagramRenderData) {
  const signals = data.signals ?? [];
  const cell = data.cellWidth ?? 52;
  const rowHeight = data.cellHeight ?? 48;
  const labelWidth = 150;
  const maxWave = Math.max(1, ...signals.map((signal) => signal.wave.length));
  const width = data.width ?? labelWidth + maxWave * cell + 30;
  const height = data.height ?? Math.max(110, signals.length * rowHeight + 36);

  return (
    <svg
      aria-label={data.title ?? "Technical timing diagram"}
      className="technical-diagram-svg"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      {Array.from({ length: maxWave + 1 }).map((_, index) => (
        <line
          key={`tick-${index}`}
          className="technical-wave-grid"
          x1={labelWidth + index * cell}
          x2={labelWidth + index * cell}
          y1="16"
          y2={height - 14}
        />
      ))}
      {signals.map((signal, index) => {
        const y = 26 + index * rowHeight;

        return (
          <g key={signal.label}>
            <text
              className="technical-wave-label"
              dominantBaseline="middle"
              x="12"
              y={y + 21}
            >
              {signal.label}
            </text>
            <path
              className="technical-wave-path"
              d={renderWavePath(signal, labelWidth, y, cell)}
            />
            {(signal.values ?? []).map((value, valueIndex) => (
              <text
                key={`${signal.label}-${valueIndex}`}
                className="technical-wave-value"
                dominantBaseline="middle"
                textAnchor="middle"
                x={labelWidth + valueIndex * cell + cell / 2}
                y={y + 21}
              >
                {value}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function TechnicalDiagramRenderer({
  data,
  fallback = null,
  compact = false,
}: TechnicalDiagramRendererProps) {
  const markerId = useId().replace(/:/g, "");
  const style = {
    "--technical-diagram-max-height": compact ? "260px" : "560px",
  } as CSSProperties;

  if (
    (data.kind === "technical_flow" && !data.nodes?.length) ||
    (data.kind === "technical_grid" &&
      !data.rows?.length &&
      !data.cells?.length) ||
    (data.kind === "technical_waveform" && !data.signals?.length)
  ) {
    return fallback;
  }

  return (
    <figure
      className={[
        "study-technical-diagram-block",
        compact ? "study-block-compact" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {data.title ? (
        <figcaption className="study-technical-diagram-title">
          {data.title}
        </figcaption>
      ) : null}
      <div className="study-technical-diagram-frame">
        {data.kind === "technical_flow"
          ? renderFlow(data, markerId)
          : data.kind === "technical_grid"
            ? renderGrid(data)
            : renderWaveform(data)}
      </div>
      {data.caption ? (
        <figcaption className="study-technical-diagram-caption">
          {data.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
