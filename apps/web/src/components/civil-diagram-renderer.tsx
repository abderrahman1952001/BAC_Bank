"use client";

import type {
  CivilDiagramDirection,
  CivilDiagramElement,
  CivilDiagramElementType,
  CivilDiagramPoint,
  CivilDiagramRenderData,
  CivilDiagramSupport,
  CivilDiagramTextAnchor,
} from "@bac-bank/contracts/ingestion";
import { type CSSProperties, type ReactNode, useId } from "react";

const CIVIL_DIAGRAM_ELEMENT_TYPES = new Set<CivilDiagramElementType>([
  "line",
  "member",
  "polyline",
  "polygon",
  "arrow",
  "load",
  "distributedLoad",
  "support",
  "dimension",
  "text",
  "node",
  "rect",
  "arc",
  "moment",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readPoint(value: unknown): CivilDiagramPoint | null {
  if (!isRecord(value)) {
    return null;
  }

  const x = readNumber(value.x);
  const y = readNumber(value.y);

  return x === null || y === null ? null : { x, y };
}

function readPoints(value: unknown): CivilDiagramPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => readPoint(entry))
    .filter((point): point is CivilDiagramPoint => point !== null);
}

function asTextAnchor(value: unknown): CivilDiagramTextAnchor | undefined {
  return value === "start" || value === "middle" || value === "end"
    ? value
    : undefined;
}

function asDirection(value: unknown): CivilDiagramDirection | undefined {
  return value === "up" ||
    value === "down" ||
    value === "left" ||
    value === "right"
    ? value
    : undefined;
}

function asSupport(value: unknown): CivilDiagramSupport | undefined {
  return value === "pin" || value === "roller" || value === "fixed"
    ? value
    : undefined;
}

function asElementType(value: unknown): CivilDiagramElementType | null {
  return typeof value === "string" &&
    CIVIL_DIAGRAM_ELEMENT_TYPES.has(value as CivilDiagramElementType)
    ? (value as CivilDiagramElementType)
    : null;
}

function readElement(value: unknown): CivilDiagramElement | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = asElementType(value.type);

  if (!type) {
    return null;
  }

  return {
    type,
    id: readString(value.id) ?? undefined,
    from: readPoint(value.from) ?? undefined,
    to: readPoint(value.to) ?? undefined,
    at: readPoint(value.at) ?? undefined,
    points: readPoints(value.points),
    center: readPoint(value.center) ?? undefined,
    x: readNumber(value.x) ?? undefined,
    y: readNumber(value.y) ?? undefined,
    width: readNumber(value.width) ?? undefined,
    height: readNumber(value.height) ?? undefined,
    radius: readNumber(value.radius) ?? undefined,
    startAngle: readNumber(value.startAngle) ?? undefined,
    endAngle: readNumber(value.endAngle) ?? undefined,
    label: readString(value.label) ?? undefined,
    text: readString(value.text) ?? undefined,
    support: asSupport(value.support),
    direction: asDirection(value.direction),
    anchor: asTextAnchor(value.anchor),
    offset: readNumber(value.offset) ?? undefined,
    length: readNumber(value.length) ?? undefined,
    count: readNumber(value.count) ?? undefined,
    closed: typeof value.closed === "boolean" ? value.closed : undefined,
    dashed: typeof value.dashed === "boolean" ? value.dashed : undefined,
    arrowStart:
      typeof value.arrowStart === "boolean" ? value.arrowStart : undefined,
    arrowEnd: typeof value.arrowEnd === "boolean" ? value.arrowEnd : undefined,
    strokeWidth: readNumber(value.strokeWidth) ?? undefined,
  };
}

export function extractCivilDiagramRenderData(
  value: unknown,
): CivilDiagramRenderData | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidates: unknown[] = [
    value,
    value.civilDiagram,
    value.diagram,
    value.payload,
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const kind = readString(candidate.kind) ?? readString(value.kind);
    const elements = Array.isArray(candidate.elements)
      ? candidate.elements
          .map((element) => readElement(element))
          .filter((element): element is CivilDiagramElement => element !== null)
      : [];

    if (kind !== "civil_diagram" && !elements.length) {
      continue;
    }

    if (!elements.length) {
      continue;
    }

    const viewBox = Array.isArray(candidate.viewBox)
      ? candidate.viewBox.map((entry) => readNumber(entry))
      : [];

    return {
      kind: "civil_diagram",
      title: readString(candidate.title) ?? undefined,
      caption: readString(candidate.caption) ?? undefined,
      width: readNumber(candidate.width) ?? undefined,
      height: readNumber(candidate.height) ?? undefined,
      viewBox:
        viewBox.length === 4 && viewBox.every((entry) => entry !== null)
          ? (viewBox as [number, number, number, number])
          : undefined,
      reviewStatus:
        readString(candidate.reviewStatus) === "visual_checked"
          ? "visual_checked"
          : "candidate",
      elements,
    };
  }

  return null;
}

function buildPolyline(points: CivilDiagramPoint[], closed?: boolean) {
  const body = points.map((point) => `${point.x},${point.y}`).join(" ");
  return closed && body ? `${body} ${points[0]?.x},${points[0]?.y}` : body;
}

function vector(from: CivilDiagramPoint, to: CivilDiagramPoint) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    dx,
    dy,
    length,
    ux: dx / length,
    uy: dy / length,
    nx: -dy / length,
    ny: dx / length,
  };
}

function labelPoint(
  from: CivilDiagramPoint,
  to: CivilDiagramPoint,
  offset = 0,
) {
  const direction = vector(from, to);

  return {
    x: (from.x + to.x) / 2 + direction.nx * offset,
    y: (from.y + to.y) / 2 + direction.ny * offset,
  };
}

function directionVector(direction: CivilDiagramDirection) {
  switch (direction) {
    case "up":
      return { x: 0, y: -1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    case "down":
    default:
      return { x: 0, y: 1 };
  }
}

function polarPoint(
  center: CivilDiagramPoint,
  radius: number,
  angleDegrees: number,
) {
  const angle = (angleDegrees * Math.PI) / 180;

  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };
}

function arcPath(
  center: CivilDiagramPoint,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarPoint(center, radius, startAngle);
  const end = polarPoint(center, radius, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const sweep = endAngle >= startAngle ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

function elementKey(element: CivilDiagramElement, index: number) {
  return element.id ?? `${element.type}-${index}`;
}

function ElementLabel({
  anchor = "middle",
  children,
  x,
  y,
}: {
  anchor?: CivilDiagramTextAnchor;
  children: ReactNode;
  x: number;
  y: number;
}) {
  return (
    <text className="civil-diagram-label" textAnchor={anchor} x={x} y={y}>
      {children}
    </text>
  );
}

function renderSupport(element: CivilDiagramElement, key: string) {
  if (!element.at || !element.support) {
    return null;
  }

  const { x, y } = element.at;
  const size = element.length ?? 22;

  if (element.support === "fixed") {
    const hatchCount = 5;

    return (
      <g key={key} className="civil-diagram-support">
        <line x1={x} y1={y - size} x2={x} y2={y + size} />
        {Array.from({ length: hatchCount }).map((_, index) => {
          const yy = y - size + index * (size / 2);

          return (
            <line
              key={`${key}-hatch-${index}`}
              x1={x}
              y1={yy}
              x2={x - size * 0.55}
              y2={yy + size * 0.45}
            />
          );
        })}
        {element.label ? (
          <ElementLabel x={x} y={y + size + 20}>
            {element.label}
          </ElementLabel>
        ) : null}
      </g>
    );
  }

  const trianglePath = `M ${x} ${y} L ${x - size} ${y + size} L ${x + size} ${
    y + size
  } Z`;

  return (
    <g key={key} className="civil-diagram-support">
      <path d={trianglePath} />
      {element.support === "roller"
        ? [-0.48, 0, 0.48].map((ratio, index) => (
            <circle
              key={`${key}-roller-${index}`}
              cx={x + size * ratio}
              cy={y + size + 7}
              r={4}
            />
          ))
        : null}
      <line
        x1={x - size * 1.16}
        y1={y + size + (element.support === "roller" ? 13 : 4)}
        x2={x + size * 1.16}
        y2={y + size + (element.support === "roller" ? 13 : 4)}
      />
      {element.label ? (
        <ElementLabel x={x} y={y + size + 30}>
          {element.label}
        </ElementLabel>
      ) : null}
    </g>
  );
}

function renderDistributedLoad(
  element: CivilDiagramElement,
  key: string,
  markerId: string,
) {
  if (!element.from || !element.to || !element.direction) {
    return null;
  }

  const count = Math.max(2, Math.round(element.count ?? 5));
  const length = element.length ?? 32;
  const direction = directionVector(element.direction);
  const points = Array.from({ length: count }).map((_, index) => {
    const ratio = count === 1 ? 0 : index / (count - 1);

    return {
      x: element.from!.x + (element.to!.x - element.from!.x) * ratio,
      y: element.from!.y + (element.to!.y - element.from!.y) * ratio,
    };
  });
  const label = element.label
    ? labelPoint(element.from, element.to, -length - 8)
    : null;

  return (
    <g key={key} className="civil-diagram-load">
      <line
        className="civil-diagram-stroke"
        x1={element.from.x}
        y1={element.from.y - direction.y * length}
        x2={element.to.x}
        y2={element.to.y - direction.y * length}
      />
      {points.map((point, index) => (
        <line
          key={`${key}-arrow-${index}`}
          className="civil-diagram-arrow"
          markerEnd={`url(#${markerId})`}
          x1={point.x - direction.x * length}
          y1={point.y - direction.y * length}
          x2={point.x}
          y2={point.y}
        />
      ))}
      {label ? (
        <ElementLabel x={label.x} y={label.y}>
          {element.label}
        </ElementLabel>
      ) : null}
    </g>
  );
}

function renderElement(
  element: CivilDiagramElement,
  index: number,
  markerId: string,
) {
  const key = elementKey(element, index);
  const strokeWidth = element.strokeWidth;
  const common = {
    className: [
      "civil-diagram-stroke",
      element.type === "member" ? "civil-diagram-member" : null,
      element.dashed ? "civil-diagram-dashed" : null,
    ]
      .filter(Boolean)
      .join(" "),
    style: strokeWidth ? { strokeWidth } : undefined,
  };

  if (
    (element.type === "line" || element.type === "member") &&
    element.from &&
    element.to
  ) {
    const label = element.label
      ? labelPoint(element.from, element.to, element.offset ?? -9)
      : null;

    return (
      <g key={key}>
        <line
          {...common}
          x1={element.from.x}
          y1={element.from.y}
          x2={element.to.x}
          y2={element.to.y}
        />
        {label ? (
          <ElementLabel x={label.x} y={label.y}>
            {element.label}
          </ElementLabel>
        ) : null}
      </g>
    );
  }

  if (
    (element.type === "polyline" || element.type === "polygon") &&
    element.points?.length
  ) {
    const points = buildPolyline(
      element.points,
      element.closed || element.type === "polygon",
    );

    return element.closed || element.type === "polygon" ? (
      <polygon key={key} {...common} points={points} />
    ) : (
      <polyline key={key} {...common} points={points} />
    );
  }

  if (
    (element.type === "arrow" || element.type === "load") &&
    element.from &&
    element.to
  ) {
    const label = element.label
      ? labelPoint(element.from, element.to, element.offset ?? -9)
      : null;

    return (
      <g key={key}>
        <line
          className={[
            "civil-diagram-arrow",
            element.dashed ? "civil-diagram-dashed" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          markerEnd={element.arrowStart ? undefined : `url(#${markerId})`}
          markerStart={element.arrowStart ? `url(#${markerId})` : undefined}
          x1={element.from.x}
          y1={element.from.y}
          x2={element.to.x}
          y2={element.to.y}
        />
        {label ? (
          <ElementLabel x={label.x} y={label.y}>
            {element.label}
          </ElementLabel>
        ) : null}
      </g>
    );
  }

  if (element.type === "distributedLoad") {
    return renderDistributedLoad(element, key, markerId);
  }

  if (element.type === "support") {
    return renderSupport(element, key);
  }

  if (element.type === "dimension" && element.from && element.to) {
    const offset = element.offset ?? 26;
    const direction = vector(element.from, element.to);
    const from = {
      x: element.from.x + direction.nx * offset,
      y: element.from.y + direction.ny * offset,
    };
    const to = {
      x: element.to.x + direction.nx * offset,
      y: element.to.y + direction.ny * offset,
    };
    const label = labelPoint(element.from, element.to, offset + 14);

    return (
      <g key={key} className="civil-diagram-dimension">
        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
        <line x1={element.from.x} y1={element.from.y} x2={from.x} y2={from.y} />
        <line x1={element.to.x} y1={element.to.y} x2={to.x} y2={to.y} />
        <line
          x1={from.x - direction.nx * 7}
          y1={from.y - direction.ny * 7}
          x2={from.x + direction.nx * 7}
          y2={from.y + direction.ny * 7}
        />
        <line
          x1={to.x - direction.nx * 7}
          y1={to.y - direction.ny * 7}
          x2={to.x + direction.nx * 7}
          y2={to.y + direction.ny * 7}
        />
        {element.label ? (
          <ElementLabel x={label.x} y={label.y}>
            {element.label}
          </ElementLabel>
        ) : null}
      </g>
    );
  }

  if (
    element.type === "text" &&
    element.at &&
    (element.text || element.label)
  ) {
    return (
      <ElementLabel
        key={key}
        anchor={element.anchor}
        x={element.at.x}
        y={element.at.y}
      >
        {element.text ?? element.label}
      </ElementLabel>
    );
  }

  if (element.type === "node" && element.at) {
    return (
      <g key={key} className="civil-diagram-node">
        <circle cx={element.at.x} cy={element.at.y} r={element.radius ?? 4} />
        {element.label ? (
          <ElementLabel x={element.at.x} y={element.at.y - 11}>
            {element.label}
          </ElementLabel>
        ) : null}
      </g>
    );
  }

  if (
    element.type === "rect" &&
    element.x !== undefined &&
    element.y !== undefined &&
    element.width !== undefined &&
    element.height !== undefined
  ) {
    return (
      <g key={key}>
        <rect
          className={[
            "civil-diagram-shape",
            element.dashed ? "civil-diagram-dashed" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          height={element.height}
          width={element.width}
          x={element.x}
          y={element.y}
        />
        {element.label ? (
          <ElementLabel
            x={element.x + element.width / 2}
            y={element.y + element.height / 2}
          >
            {element.label}
          </ElementLabel>
        ) : null}
      </g>
    );
  }

  if (
    (element.type === "arc" || element.type === "moment") &&
    element.center &&
    element.radius !== undefined &&
    element.startAngle !== undefined &&
    element.endAngle !== undefined
  ) {
    const middle = polarPoint(
      element.center,
      element.radius + 14,
      (element.startAngle + element.endAngle) / 2,
    );

    return (
      <g key={key}>
        <path
          className="civil-diagram-arrow"
          d={arcPath(
            element.center,
            element.radius,
            element.startAngle,
            element.endAngle,
          )}
          markerEnd={`url(#${markerId})`}
        />
        {element.label ? (
          <ElementLabel x={middle.x} y={middle.y}>
            {element.label}
          </ElementLabel>
        ) : null}
      </g>
    );
  }

  return null;
}

export function CivilDiagramRenderer({
  compact = false,
  data,
  fallback = null,
}: {
  compact?: boolean;
  data: CivilDiagramRenderData;
  fallback?: ReactNode;
}) {
  const markerId = `civil-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const width = data.width ?? data.viewBox?.[2] ?? 760;
  const height = data.height ?? data.viewBox?.[3] ?? 420;
  const viewBox = data.viewBox ?? [0, 0, width, height];
  const labelSize =
    Math.round(
      Math.max(9, Math.min(15, Math.min(viewBox[2], viewBox[3]) / 20)) * 10,
    ) / 10;
  const svgStyle = {
    "--civil-diagram-label-size": `${labelSize}px`,
  } as CSSProperties;

  if (!data.elements.length) {
    return fallback;
  }

  return (
    <figure
      className={[
        "study-civil-diagram-block",
        compact ? "study-block-compact" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {data.title ? (
        <figcaption className="study-civil-diagram-title">
          {data.title}
        </figcaption>
      ) : null}
      <div className="study-civil-diagram-frame">
        <svg
          aria-label={data.title ?? data.caption ?? "Civil engineering diagram"}
          className="civil-diagram-svg"
          height={height}
          role="img"
          style={svgStyle}
          viewBox={viewBox.join(" ")}
          width={width}
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
              <path className="civil-diagram-marker" d="M 0 0 L 8 4 L 0 8 Z" />
            </marker>
          </defs>
          <g>
            {data.elements.map((element, index) =>
              renderElement(element, index, markerId),
            )}
          </g>
        </svg>
      </div>
      {data.caption ? (
        <figcaption className="study-civil-diagram-caption">
          {data.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
