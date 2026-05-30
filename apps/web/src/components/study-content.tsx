"use client";

import katex from "katex";
import "katex/contrib/mhchem";
import Image, { ImageLoaderProps } from "next/image";
import { ReactNode } from "react";
import {
  CivilDiagramRenderer,
  extractCivilDiagramRenderData,
} from "@/components/civil-diagram-renderer";
import {
  ChemistryStructureRenderer,
  extractChemistryStructureRenderData,
} from "@/components/chemistry-structure-renderer";
import {
  FormulaGraphJson,
  FormulaGraphPlot,
} from "@/components/formula-graph-plot";
import {
  ProbabilityTreeJson,
  ProbabilityTreeSvg,
} from "@/components/probability-tree-svg";
import {
  TechnicalDiagramRenderer,
  extractTechnicalDiagramRenderData,
} from "@/components/technical-diagram-renderer";
import { ExamHierarchyBlock, toAssetUrl } from "@/lib/study-api";

const INLINE_MATH_REGEX = /\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$|`([^`\n]+?)`/g;
const INLINE_BOLD_REGEX = /\*\*([^*\n]+?)\*\*/g;
const KATEX_MISSING_METRICS_WARNING =
  /^No character metrics for '.+' in style '.+' and mode '.+'$/;

function passthroughLoader({ src }: ImageLoaderProps): string {
  return src;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(value: unknown, field: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = value[field];
  return typeof candidate === "string" ? candidate : null;
}

type ScripturePresentation = {
  kind: "quran" | "hadith";
  displayText: string;
  intro: string | null;
  reference: string | null;
  sourceLabel: string | null;
  riwaya: string | null;
};

function resolveScripturePresentation(
  block: ExamHierarchyBlock,
): ScripturePresentation | null {
  const payload = isRecord(block.data)
    ? isRecord(block.data.scripture)
      ? block.data.scripture
      : block.data
    : null;

  if (!payload) {
    return null;
  }

  const rawKind = readStringField(payload, "kind");
  const kind =
    rawKind === "quran" || rawKind === "quran_quote"
      ? "quran"
      : rawKind === "hadith" || rawKind === "hadith_quote"
        ? "hadith"
        : null;

  if (!kind) {
    return null;
  }

  const displayText = readStringField(payload, "displayText");
  const resolvedDisplayText = displayText ?? block.textValue ?? "";

  if (!resolvedDisplayText.trim()) {
    return null;
  }

  return {
    kind,
    displayText: resolvedDisplayText,
    intro:
      readStringField(payload, "intro") ??
      (displayText ? (kind === "quran" ? "قال تعالى" : "حديث شريف") : null),
    reference: readStringField(payload, "reference"),
    sourceLabel:
      readStringField(payload, "sourceLabel") ??
      readStringField(payload, "collection"),
    riwaya: readStringField(payload, "riwaya"),
  };
}

function renderKatexToHtml(latex: string, displayMode: boolean): string {
  const render = () =>
    katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
    });

  if (typeof console === "undefined") {
    return render();
  }

  const originalWarn = console.warn;

  console.warn = (...args) => {
    const [message] = args;

    if (
      typeof message === "string" &&
      KATEX_MISSING_METRICS_WARNING.test(message)
    ) {
      return;
    }

    originalWarn(...args);
  };

  try {
    return render();
  } finally {
    console.warn = originalWarn;
  }
}

function normalizeMathDelimiters(text: string): string {
  return text
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, value: string) => `$$${value}$$`)
    .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, value: string) => `$${value}$`);
}

function renderInlineText(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(INLINE_BOLD_REGEX)) {
    const start = match.index ?? -1;

    if (start < 0) {
      continue;
    }

    if (start > cursor) {
      parts.push(
        <span key={`${keyPrefix}-text-${matchIndex}`}>
          {text.slice(cursor, start)}
        </span>,
      );
    }

    parts.push(
      <strong key={`${keyPrefix}-bold-${matchIndex}`}>{match[1] ?? ""}</strong>,
    );

    cursor = start + match[0].length;
    matchIndex += 1;
  }

  if (cursor < text.length) {
    parts.push(<span key={`${keyPrefix}-tail`}>{text.slice(cursor)}</span>);
  }

  return parts.length ? parts : text;
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
          {renderInlineText(
            normalized.slice(cursor, start),
            `${keyPrefix}-text-${matchIndex}`,
          )}
        </span>,
      );
    }

    const displayLatex = token.startsWith("$$") ? (match[1] ?? "") : null;
    const inlineLatex =
      token.startsWith("$") && !token.startsWith("$$")
        ? (match[2] ?? "")
        : null;
    const backtickLatex = token.startsWith("`") ? (match[3] ?? "") : null;

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
      const latex = inlineLatex ?? backtickLatex ?? "";
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
      <span key={`${keyPrefix}-tail`}>
        {renderInlineText(normalized.slice(cursor), `${keyPrefix}-tail`)}
      </span>,
    );
  }

  return parts.length ? parts : text;
}

function parseTableRows(block: ExamHierarchyBlock): string[][] {
  if (Array.isArray((block.data as { rows?: unknown[] } | null)?.rows)) {
    return (block.data as { rows: unknown[] }).rows
      .map((row) =>
        Array.isArray(row)
          ? row.map((cell) =>
              typeof cell === "string" ? cell : String(cell ?? ""),
            )
          : [],
      )
      .filter((row) => row.length > 0);
  }

  const rawText = block.textValue?.trim();

  if (!rawText) {
    return [];
  }

  return rawText
    .split("\n")
    .map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean),
    )
      .filter((row) => row.length > 0);
}

function parseTableDirection(
  block: ExamHierarchyBlock,
): "ltr" | "rtl" | undefined {
  if (!isRecord(block.data)) {
    return undefined;
  }

  const candidates = [
    readStringField(block.data, "direction"),
    isRecord(block.data.table)
      ? readStringField(block.data.table, "direction")
      : null,
  ];
  const direction = candidates.find(
    (candidate) => candidate === "ltr" || candidate === "rtl",
  );

  return direction === "ltr" || direction === "rtl" ? direction : undefined;
}

function isProbabilityTreeNode(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.children) ||
    typeof value.label === "string" ||
    typeof value.edgeLabel === "string" ||
    typeof value.probability === "string" ||
    typeof value.probability === "number"
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
    const direction = directionRaw === "rtl" ? "rtl" : "ltr";
    const root = candidate.root;

    if (isProbabilityTreeNode(root)) {
      return {
        type: "probability_tree",
        direction,
        root: root as ProbabilityTreeJson["root"],
      };
    }

    if (isProbabilityTreeNode(candidate)) {
      return {
        type: "probability_tree",
        direction,
        root: candidate as ProbabilityTreeJson["root"],
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

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    return asProbabilityTreePayload(JSON.parse(trimmed) as unknown);
  } catch {
    return null;
  }
}

function isFormulaCurve(value: unknown): boolean {
  return isRecord(value) && typeof value.fn === "string" && value.fn.length > 0;
}

function asFormulaGraphPayload(value: unknown): FormulaGraphJson | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidates: unknown[] = [
    value,
    value.formulaGraph,
    value.graph,
    value.payload,
  ];

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
      type: "formula_graph",
      title: typeof candidate.title === "string" ? candidate.title : undefined,
      xDomain: Array.isArray(candidate.xDomain)
        ? (candidate.xDomain as [number, number])
        : undefined,
      yDomain: Array.isArray(candidate.yDomain)
        ? (candidate.yDomain as [number, number])
        : undefined,
      width: typeof candidate.width === "number" ? candidate.width : undefined,
      height:
        typeof candidate.height === "number" ? candidate.height : undefined,
      grid: typeof candidate.grid === "boolean" ? candidate.grid : undefined,
      curves: curves as FormulaGraphJson["curves"],
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

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    return asFormulaGraphPayload(JSON.parse(trimmed) as unknown);
  } catch {
    return null;
  }
}

function extractChemistryStructureFromBlock(block: ExamHierarchyBlock) {
  const fromData = extractChemistryStructureRenderData(block.data);
  if (fromData) {
    return fromData;
  }

  if (!block.textValue) {
    return null;
  }

  const trimmed = block.textValue.trim();

  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    return extractChemistryStructureRenderData(JSON.parse(trimmed) as unknown);
  } catch {
    return null;
  }
}

function renderTextBlock(block: string, key: string) {
  const lines = block
    .split("\n")
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
            {renderInlineMathText(
              line.replace(/^[-*•]\s+/, ""),
              `${key}-${index}`,
            )}
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
              line.replace(/^\d+[.)]\s+/, ""),
              `${key}-${index}`,
            )}
          </li>
        ))}
      </ol>
    );
  }

  if (block.startsWith("### ")) {
    return (
      <h4 key={key} className="study-text-block">
        {renderInlineMathText(block.slice(4), key)}
      </h4>
    );
  }

  if (block.startsWith("## ")) {
    return (
      <h3 key={key} className="study-text-block">
        {renderInlineMathText(block.slice(3), key)}
      </h3>
    );
  }

  if (block.startsWith("# ")) {
    return (
      <h3 key={key} className="study-text-block">
        {renderInlineMathText(block.slice(2), key)}
      </h3>
    );
  }

  if (block.startsWith("```") && block.endsWith("```")) {
    return (
      <pre key={key}>
        <code>
          {block.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "")}
        </code>
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
    .replace(/\r/g, "")
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
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "prompt" | "solution" | "hint" | "commentary";
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

function StudyScriptureBlock({
  blockKey,
  compact,
  presentation,
}: {
  blockKey: string;
  compact: boolean;
  presentation: ScripturePresentation;
}) {
  const metaItems = [
    presentation.reference,
    presentation.kind === "quran" ? presentation.riwaya : null,
    presentation.sourceLabel,
  ].filter((item): item is string => Boolean(item));
  const className = [
    "study-scripture-block",
    `study-scripture-${presentation.kind}`,
    compact ? "study-block-compact" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <figure key={blockKey} className={className} dir="rtl">
      {presentation.intro ? (
        <figcaption className="study-scripture-intro">
          {presentation.intro}
        </figcaption>
      ) : null}
      <blockquote className="study-scripture-text">
        {renderInlineMathText(presentation.displayText, blockKey)}
      </blockquote>
      {metaItems.length ? (
        <figcaption className="study-scripture-meta">
          {metaItems.map((item, index) => (
            <span key={`${blockKey}-meta-${index}`}>{item}</span>
          ))}
        </figcaption>
      ) : null}
    </figure>
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
  const source = block.media?.url ?? readStringField(block.data, "url");
  const imageUrl = source ? toAssetUrl(source) : null;
  const formulaGraph = extractFormulaGraphFromBlock(block);
  const chemistryStructure = extractChemistryStructureFromBlock(block);
  const civilDiagram = extractCivilDiagramRenderData(block.data);
  const technicalDiagram = extractTechnicalDiagramRenderData(block.data);
  const resolvedFormulaGraph =
    compact && formulaGraph
      ? {
          ...formulaGraph,
          width: Math.min(formulaGraph.width ?? 760, 320),
          height: Math.min(formulaGraph.height ?? 440, 220),
        }
      : formulaGraph;
  const mediaBlockClassName = compact
    ? "study-media-block study-block-compact"
    : "study-media-block";
  const mediaFrameClassName = compact
    ? "study-media-frame study-block-compact"
    : "study-media-frame";
  const tableWrapClassName = compact
    ? "study-table-wrap study-block-compact"
    : "study-table-wrap";
  const scripturePresentation = resolveScripturePresentation(block);

  if (block.blockType === "GRAPH") {
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

  if (block.blockType === "TREE") {
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

  if (technicalDiagram) {
    const fallback = imageUrl ? (
      <Image
        src={imageUrl}
        loader={passthroughLoader}
        alt={technicalDiagram.title ?? "Technical diagram source"}
        width={1400}
        height={1000}
        unoptimized
      />
    ) : null;

    return (
      <TechnicalDiagramRenderer
        key={blockKey}
        compact={compact}
        data={technicalDiagram}
        fallback={fallback}
      />
    );
  }

  if (civilDiagram) {
    const fallback = imageUrl ? (
      <Image
        src={imageUrl}
        loader={passthroughLoader}
        alt={civilDiagram.title ?? "Civil engineering diagram source"}
        width={1400}
        height={1000}
        unoptimized
      />
    ) : null;

    return (
      <CivilDiagramRenderer
        key={blockKey}
        compact={compact}
        data={civilDiagram}
        fallback={fallback}
      />
    );
  }

  if (chemistryStructure) {
    const fallback = imageUrl ? (
      <Image
        src={imageUrl}
        loader={passthroughLoader}
        alt={chemistryStructure.title ?? "Chemical structure source"}
        width={1400}
        height={1000}
        unoptimized
      />
    ) : null;

    return (
      <ChemistryStructureRenderer
        key={blockKey}
        compact={compact}
        data={chemistryStructure}
        fallback={fallback}
      />
    );
  }

  if (block.blockType === "IMAGE") {
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

  if (block.blockType === "LATEX") {
    return (
      <div
        key={blockKey}
        className="math-display"
        dangerouslySetInnerHTML={{
          __html: renderKatexToHtml((block.textValue ?? "").trim(), true),
        }}
      />
    );
  }

  if (block.blockType === "CODE") {
    return (
      <pre key={blockKey}>
        <code>{block.textValue ?? ""}</code>
      </pre>
    );
  }

  if (scripturePresentation) {
    return (
      <StudyScriptureBlock
        blockKey={blockKey}
        compact={compact}
        presentation={scripturePresentation}
      />
    );
  }

  if (block.blockType === "HEADING") {
    return (
      <h3 key={blockKey} className="study-text-block">
        {renderInlineMathText(block.textValue ?? "", blockKey)}
      </h3>
    );
  }

  if (block.blockType === "TABLE") {
    const rows = parseTableRows(block);
    const tableDirection = parseTableDirection(block);

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
        <table className="study-table" dir={tableDirection}>
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

  if (block.blockType === "LIST") {
    return (
      <div key={blockKey} className="study-prose">
        {renderTextBlock(block.textValue ?? "", blockKey)}
      </div>
    );
  }

  return (
    <div key={blockKey} className="study-prose">
      <StudyMarkdown text={block.textValue ?? ""} />
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
