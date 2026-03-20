'use client';

import { useMemo } from 'react';

export type ProbabilityTreeNode = {
  id?: string;
  label?: string;
  edgeLabel?: string;
  probability?: string | number | null;
  children?: ProbabilityTreeNode[];
};

export type ProbabilityTreeJson = {
  type?: 'probability_tree';
  direction?: 'ltr' | 'rtl';
  root: ProbabilityTreeNode;
};

type NormalizedNode = {
  id: string;
  label: string;
  edgeLabel: string;
  probability: string;
  children: NormalizedNode[];
};

type PositionedNode = {
  id: string;
  label: string;
  edgeLabel: string;
  probability: string;
  x: number;
  y: number;
  depth: number;
  children: PositionedNode[];
};

type Edge = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label: string;
};

function normalizeNode(
  node: ProbabilityTreeNode,
  counter: { value: number },
): NormalizedNode {
  const id = node.id || `node_${counter.value++}`;
  const label = node.label || '';
  const edgeLabel = node.edgeLabel || '';
  const probability =
    node.probability === null || node.probability === undefined
      ? ''
      : String(node.probability);
  const children = (node.children ?? []).map((child) =>
    normalizeNode(child, counter),
  );

  return {
    id,
    label,
    edgeLabel,
    probability,
    children,
  };
}

function layoutTree(
  root: NormalizedNode,
  direction: 'ltr' | 'rtl',
): {
  root: PositionedNode;
  width: number;
  height: number;
  edges: Edge[];
} {
  const leafBand = 98;
  const colGap = 230;
  const padX = 26;
  const padY = 24;
  const nodeRadius = 14;
  const maxDepthRef = { value: 0 };

  const position = (
    node: NormalizedNode,
    depth: number,
    top: number,
  ): {
    node: PositionedNode;
    span: number;
  } => {
    maxDepthRef.value = Math.max(maxDepthRef.value, depth);

    if (!node.children.length) {
      return {
        node: {
          ...node,
          x: padX + depth * colGap,
          y: top + leafBand / 2,
          depth,
          children: [],
        },
        span: leafBand,
      };
    }

    let cursor = top;
    const positionedChildren: PositionedNode[] = [];

    for (const child of node.children) {
      const childLayout = position(child, depth + 1, cursor);
      positionedChildren.push(childLayout.node);
      cursor += childLayout.span;
    }

    const firstY = positionedChildren[0]?.y ?? top + leafBand / 2;
    const lastY =
      positionedChildren[positionedChildren.length - 1]?.y ?? top + leafBand / 2;
    const y = (firstY + lastY) / 2;

    return {
      node: {
        ...node,
        x: padX + depth * colGap,
        y,
        depth,
        children: positionedChildren,
      },
      span: Math.max(cursor - top, leafBand),
    };
  };

  const layout = position(root, 0, 0);
  const treeWidth = padX * 2 + maxDepthRef.value * colGap + 260;
  const treeHeight = padY * 2 + layout.span;
  const flipX = (x: number) => treeWidth - x;

  const applyDirection = (node: PositionedNode): PositionedNode => {
    const x = direction === 'rtl' ? flipX(node.x) : node.x;
    return {
      ...node,
      x,
      children: node.children.map((child) => applyDirection(child)),
    };
  };

  const directedRoot = applyDirection(layout.node);
  const edges: Edge[] = [];

  const walk = (node: PositionedNode) => {
    for (const child of node.children) {
      const textParts = [child.edgeLabel, child.probability].filter(Boolean);
      edges.push({
        fromX: node.x + (direction === 'rtl' ? -nodeRadius : nodeRadius),
        fromY: node.y + padY,
        toX: child.x + (direction === 'rtl' ? nodeRadius : -nodeRadius),
        toY: child.y + padY,
        label:
          textParts.length > 1 ? `${textParts[0]} (${textParts[1]})` : textParts[0] ?? '',
      });
      walk(child);
    }
  };

  walk(directedRoot);

  const shiftY = (node: PositionedNode): PositionedNode => ({
    ...node,
    y: node.y + padY,
    children: node.children.map((child) => shiftY(child)),
  });

  return {
    root: shiftY(directedRoot),
    width: treeWidth,
    height: treeHeight,
    edges,
  };
}

function flattenNodes(root: PositionedNode): PositionedNode[] {
  const items: PositionedNode[] = [];

  const walk = (node: PositionedNode) => {
    items.push(node);
    for (const child of node.children) {
      walk(child);
    }
  };

  walk(root);
  return items;
}

export function ProbabilityTreeSvg({
  data,
  title = 'Probability tree',
}: {
  data: ProbabilityTreeJson;
  title?: string;
}) {
  const direction = data.direction === 'rtl' ? 'rtl' : 'ltr';

  const graph = useMemo(() => {
    const counter = { value: 1 };
    const root = normalizeNode(data.root, counter);
    return layoutTree(root, direction);
  }, [data.root, direction]);

  const nodes = useMemo(() => flattenNodes(graph.root), [graph.root]);
  const labelOffset = direction === 'rtl' ? -20 : 20;
  const labelAnchor = direction === 'rtl' ? 'end' : 'start';

  return (
    <div className="probability-tree-wrap" dir="ltr">
      <svg
        className="probability-tree-svg"
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        role="img"
        aria-label={title}
      >
        <g className="probability-tree-edges">
          {graph.edges.map((edge, index) => {
            const labelX = (edge.fromX + edge.toX) / 2;
            const labelY = (edge.fromY + edge.toY) / 2 - 7;

            return (
              <g key={`edge-${index}`}>
                <line x1={edge.fromX} y1={edge.fromY} x2={edge.toX} y2={edge.toY} />
                {edge.label ? (
                  <text x={labelX} y={labelY} textAnchor="middle">
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        <g className="probability-tree-nodes">
          {nodes.map((node) => (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={14} />
              <text
                x={node.x + labelOffset}
                y={node.y + 4}
                textAnchor={labelAnchor}
              >
                {node.label || node.id}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

