'use client';

import katex from 'katex';
import Image, { ImageLoaderProps } from 'next/image';
import { ReactNode } from 'react';
import {
  FormulaGraphJson,
  FormulaGraphPlot,
} from '@/components/formula-graph-plot';
import {
  ProbabilityTreeJson,
  ProbabilityTreeSvg,
} from '@/components/probability-tree-svg';
import {
  ExamHierarchyBlock,
  toAssetUrl,
} from '@/lib/study-api';

const INLINE_MATH_REGEX = /\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$|`([^`\n]+?)`/g;

function passthroughLoader({ src }: ImageLoaderProps): string {
  return src;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringField(value: unknown, field: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = value[field];
  return typeof candidate === 'string' ? candidate : null;
}

function renderKatexToHtml(latex: string, displayMode: boolean): string {
  return katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    strict: 'ignore',
  });
}

function normalizeMathDelimiters(text: string): string {
  return text
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, value: string) => `$$${value}$$`)
    .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, value: string) => `$${value}$`);
}

function renderInlineMathText(text: string, keyPrefix: string): ReactNode {
  const normalized = normalizeMathDelimiters(text);
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = 0;

  for (const match of normalized.matchAll(INLINE_MATH_REGEX)) {
    const token = match[0];
    const start = match.index ?? -1;

    if (start < 0) {
      continue;
    }

    if (start > cursor) {
      parts.push(
        <span key={`${keyPrefix}-text-${matchIndex}`}>
          {normalized.slice(cursor, start)}
        </span>,
      );
    }

    const displayLatex = token.startsWith('$$') ? match[1] ?? '' : null;
    const inlineLatex =
      token.startsWith('$') && !token.startsWith('$$') ? match[2] ?? '' : null;
    const backtickLatex = token.startsWith('`') ? match[3] ?? '' : null;

    if (displayLatex !== null) {
      parts.push(
        <span
          key={`${keyPrefix}-display-${matchIndex}`}
          className="math-display"
          dangerouslySetInnerHTML={{
            __html: renderKatexToHtml(displayLatex.trim(), true),
          }}
        />,
      );
    } else {
      const latex = inlineLatex ?? backtickLatex ?? '';
      parts.push(
        <span
          key={`${keyPrefix}-inline-${matchIndex}`}
          className="math-inline"
          dangerouslySetInnerHTML={{
            __html: renderKatexToHtml(latex.trim(), false),
          }}
        />,
      );
    }

    cursor = start + token.length;
    matchIndex += 1;
  }

  if (cursor < normalized.length) {
    parts.push(
      <span key={`${keyPrefix}-tail`}>{normalized.slice(cursor)}</span>,
    );
  }

  return parts.length ? parts : text;
}

function parseTableRows(block: ExamHierarchyBlock): string[][] {
  if (Array.isArray((block.data as { rows?: unknown[] } | null)?.rows)) {
    return (block.data as { rows: unknown[] }).rows
      .map((row) =>
        Array.isArray(row)
          ? row.map((cell) => (typeof cell === 'string' ? cell : String(cell ?? '')))
          : [],
      )
      .filter((row) => row.length > 0);
  }

  const rawText = block.textValue?.trim();

  if (!rawText) {
    return [];
  }

  return rawText
    .split('\n')
    .map((line) =>
      line
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean),
    )
    .filter((row) => row.length > 0);
}

function isProbabilityTreeNode(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.children) ||
    typeof value.label === 'string' ||
    typeof value.edgeLabel === 'string' ||
    typeof value.probability === 'string' ||
    typeof value.probability === 'number'
  );
}

function asProbabilityTreePayload(value: unknown): ProbabilityTreeJson | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidates: unknown[] = [
    value,
    value.probabilityTree,
    value.tree,
    value.payload,
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const directionRaw = candidate.direction;
    const direction = directionRaw === 'rtl' ? 'rtl' : 'ltr';
    const root = candidate.root;

    if (isProbabilityTreeNode(root)) {
      return {
        type: 'probability_tree',
        direction,
        root: root as ProbabilityTreeJson['root'],
      };
    }

    if (isProbabilityTreeNode(candidate)) {
      return {
        type: 'probability_tree',
        direction,
        root: candidate as ProbabilityTreeJson['root'],
      };
    }
  }

  return null;
}

function extractProbabilityTreeFromBlock(
  block: ExamHierarchyBlock,
): ProbabilityTreeJson | null {
  const fromData = asProbabilityTreePayload(block.data);
  if (fromData) {
    return fromData;
  }

  if (!block.textValue) {
    return null;
  }

  const trimmed = block.textValue.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }

  try {
    return asProbabilityTreePayload(JSON.parse(trimmed) as unknown);
  } catch {
    return null;
  }
}

function isFormulaCurve(value: unknown): boolean {
  return isRecord(value) && typeof value.fn === 'string' && value.fn.length > 0;
}

function asFormulaGraphPayload(value: unknown): FormulaGraphJson | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidates: unknown[] = [value, value.formulaGraph, value.graph, value.payload];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const curves = Array.isArray(candidate.curves)
      ? candidate.curves.filter((curve) => isFormulaCurve(curve))
      : Array.isArray(candidate.functions)
        ? candidate.functions.filter((curve) => isFormulaCurve(curve))
        : [];

    if (!curves.length) {
      continue;
    }

    return {
      type: 'formula_graph',
      title: typeof candidate.title === 'string' ? candidate.title : undefined,
      xDomain: Array.isArray(candidate.xDomain)
        ? (candidate.xDomain as [number, number])
        : undefined,
      yDomain: Array.isArray(candidate.yDomain)
        ? (candidate.yDomain as [number, number])
        : undefined,
      width: typeof candidate.width === 'number' ? candidate.width : undefined,
      height: typeof candidate.height === 'number' ? candidate.height : undefined,
      grid: typeof candidate.grid === 'boolean' ? candidate.grid : undefined,
      curves: curves as FormulaGraphJson['curves'],
    };
  }

  return null;
}

function extractFormulaGraphFromBlock(
  block: ExamHierarchyBlock,
): FormulaGraphJson | null {
  const fromData = asFormulaGraphPayload(block.data);
  if (fromData) {
    return fromData;
  }

  if (!block.textValue) {
    return null;
  }

  const trimmed = block.textValue.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }

  try {
    return asFormulaGraphPayload(JSON.parse(trimmed) as unknown);
  } catch {
    return null;
  }
}

function renderTextBlock(block: string, key: string) {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  if (lines.every((line) => /^[-*•]\s+/.test(line))) {
    return (
      <ul key={key}>
        {lines.map((line, index) => (
          <li key={`${key}-${index}`} className="study-text-block">
            {renderInlineMathText(line.replace(/^[-*•]\s+/, ''), `${key}-${index}`)}
          </li>
        ))}
      </ul>
    );
  }

  if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
    return (
      <ol key={key}>
        {lines.map((line, index) => (
          <li key={`${key}-${index}`} className="study-text-block">
            {renderInlineMathText(
              line.replace(/^\d+[.)]\s+/, ''),
              `${key}-${index}`,
            )}
          </li>
        ))}
      </ol>
    );
  }

  if (block.startsWith('### ')) {
    return (
      <h4 key={key} className="study-text-block">
        {renderInlineMathText(block.slice(4), key)}
      </h4>
    );
  }

  if (block.startsWith('## ')) {
    return (
      <h3 key={key} className="study-text-block">
        {renderInlineMathText(block.slice(3), key)}
      </h3>
    );
  }

  if (block.startsWith('# ')) {
    return (
      <h3 key={key} className="study-text-block">
        {renderInlineMathText(block.slice(2), key)}
      </h3>
    );
  }

  if (block.startsWith('```') && block.endsWith('```')) {
    return (
      <pre key={key}>
        <code>{block.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '')}</code>
      </pre>
    );
  }

  return (
    <p key={key} className="study-text-block">
      {renderInlineMathText(block, key)}
    </p>
  );
}

export function StudyMarkdown({ text }: { text: string }) {
  const blocks = normalizeMathDelimiters(text)
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="study-prose">
      {blocks.length
        ? blocks.map((block, index) => renderTextBlock(block, `block-${index}`))
        : null}
    </div>
  );
}

export function StudySectionCard({
  tone = 'neutral',
  title,
  children,
}: {
  tone?: 'neutral' | 'prompt' | 'solution' | 'hint' | 'commentary';
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className={`study-section-card tone-${tone}`}>
      {title ? <h3>{title}</h3> : null}
      {children}
    </section>
  );
}

export function StudyHierarchyBlockView({
  block,
  blockKey,
  compact = false,
}: {
  block: ExamHierarchyBlock;
  blockKey: string;
  compact?: boolean;
}) {
  const source = block.media?.url ?? readStringField(block.data, 'url');
  const imageUrl = source ? toAssetUrl(source) : null;
  const formulaGraph = extractFormulaGraphFromBlock(block);
  const resolvedFormulaGraph =
    compact && formulaGraph
      ? {
          ...formulaGraph,
          width: Math.min(formulaGraph.width ?? 760, 320),
          height: Math.min(formulaGraph.height ?? 440, 220),
        }
      : formulaGraph;
  const mediaBlockClassName = compact
    ? 'study-media-block study-block-compact'
    : 'study-media-block';
  const mediaFrameClassName = compact
    ? 'study-media-frame study-block-compact'
    : 'study-media-frame';
  const tableWrapClassName = compact
    ? 'study-table-wrap study-block-compact'
    : 'study-table-wrap';

  if (block.blockType === 'GRAPH') {
    if (resolvedFormulaGraph) {
      return (
        <div key={blockKey} className={mediaBlockClassName}>
          <FormulaGraphPlot data={resolvedFormulaGraph} />
        </div>
      );
    }

    if (imageUrl) {
      return (
        <figure key={blockKey} className={mediaFrameClassName}>
          <Image
            src={imageUrl}
            loader={passthroughLoader}
            alt="Graph asset"
            width={1400}
            height={1000}
            unoptimized
          />
        </figure>
      );
    }

    return null;
  }

  if (resolvedFormulaGraph) {
    return (
      <div key={blockKey} className={mediaBlockClassName}>
        <FormulaGraphPlot data={resolvedFormulaGraph} />
      </div>
    );
  }

  const probabilityTree = extractProbabilityTreeFromBlock(block);

  if (block.blockType === 'TREE') {
    if (probabilityTree) {
      return (
        <div key={blockKey} className={mediaBlockClassName}>
          <ProbabilityTreeSvg data={probabilityTree} title="Probability tree" />
        </div>
      );
    }

    if (imageUrl) {
      return (
        <figure key={blockKey} className={mediaFrameClassName}>
          <Image
            src={imageUrl}
            loader={passthroughLoader}
            alt="Tree asset"
            width={1400}
            height={1000}
            unoptimized
          />
        </figure>
      );
    }

    return null;
  }

  if (probabilityTree) {
    return (
      <div key={blockKey} className={mediaBlockClassName}>
        <ProbabilityTreeSvg data={probabilityTree} title="Probability tree" />
      </div>
    );
  }

  if (block.blockType === 'IMAGE') {
    if (!imageUrl) {
      return null;
    }

    return (
      <figure key={blockKey} className={mediaFrameClassName}>
        <Image
          src={imageUrl}
          loader={passthroughLoader}
          alt="Question asset"
          width={1400}
          height={1000}
          unoptimized
        />
      </figure>
    );
  }

  if (block.blockType === 'LATEX') {
    return (
      <div
        key={blockKey}
        className="math-display"
        dangerouslySetInnerHTML={{
          __html: renderKatexToHtml((block.textValue ?? '').trim(), true),
        }}
      />
    );
  }

  if (block.blockType === 'CODE') {
    return (
      <pre key={blockKey}>
        <code>{block.textValue ?? ''}</code>
      </pre>
    );
  }

  if (block.blockType === 'HEADING') {
    return (
      <h3 key={blockKey} className="study-text-block">
        {renderInlineMathText(block.textValue ?? '', blockKey)}
      </h3>
    );
  }

  if (block.blockType === 'TABLE') {
    const rows = parseTableRows(block);

    if (!rows.length) {
      if (imageUrl) {
        return (
          <figure key={blockKey} className={mediaFrameClassName}>
            <Image
              src={imageUrl}
              loader={passthroughLoader}
              alt="Table asset"
              width={1400}
              height={1000}
              unoptimized
            />
          </figure>
        );
      }

      return null;
    }

    return (
      <div key={blockKey} className={tableWrapClassName}>
        <table className="study-table">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${blockKey}-row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${blockKey}-cell-${rowIndex}-${cellIndex}`}>
                    {renderInlineMathText(
                      cell,
                      `${blockKey}-cell-${rowIndex}-${cellIndex}`,
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.blockType === 'LIST') {
    return (
      <div key={blockKey} className="study-prose">
        {renderTextBlock(block.textValue ?? '', blockKey)}
      </div>
    );
  }

  return (
    <div key={blockKey} className="study-prose">
      <StudyMarkdown text={block.textValue ?? ''} />
    </div>
  );
}

export function StudyHierarchyBlocks({
  blocks,
}: {
  blocks: ExamHierarchyBlock[];
}) {
  return (
    <div className="study-hierarchy-blocks">
      {blocks.map((block, index) => (
        <StudyHierarchyBlockView
          key={`${block.id}-${index}`}
          block={block}
          blockKey={`${block.id}-${index}`}
        />
      ))}
    </div>
  );
}
