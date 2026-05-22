"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Microscope } from "lucide-react";
import type {
  LabMissionItem,
  SvtDocumentWorkbenchDocumentBlock,
  SvtDocumentWorkbenchGraphSeries,
  SvtDocumentWorkbenchPreset,
} from "@bac-bank/contracts/lab";
import { ActiveLabMissionPanel } from "@/components/lab-active-mission-panel";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { SelectionCard } from "@/components/ui/selection-card";
import { Textarea } from "@/components/ui/textarea";
import {
  buildSvtDocumentWorkbenchResult,
  evaluateSvtDocumentWorkbenchAnswer,
  getSvtDocumentKindLabel,
  getSvtDocumentWorkbenchPreset,
  groupSvtEvidenceByDocument,
  toggleSvtDocumentEvidence,
} from "@/lib/lab-svt-document-workbench";
import { STUDENT_LAB_ROUTE } from "@/lib/student-routes";

type SvtDocumentWorkbenchLabProps = {
  missionItem?: LabMissionItem | null;
};

function getMissionPreset(missionItem?: LabMissionItem | null) {
  return getSvtDocumentWorkbenchPreset(missionItem?.mission.preset);
}

function GraphBlock({ block }: { block: Extract<SvtDocumentWorkbenchDocumentBlock, { type: "graph" }> }) {
  const points = block.series.flatMap((series) => series.points);
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const width = 340;
  const height = 190;
  const padding = 30;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;

  function toSvgPoint(point: { x: number; y: number }) {
    const x = padding + ((point.x - xMin) / xSpan) * plotWidth;
    const y = height - padding - ((point.y - yMin) / ySpan) * plotHeight;

    return { x, y };
  }

  function makePolyline(series: SvtDocumentWorkbenchGraphSeries) {
    return series.points
      .map((point) => {
        const svgPoint = toSvgPoint(point);

        return `${svgPoint.x},${svgPoint.y}`;
      })
      .join(" ");
  }

  return (
    <div className="svt-doc-graph-block">
      {block.title ? <h4>{block.title}</h4> : null}
      <svg
        className="svt-doc-graph"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        direction="ltr"
        aria-label={block.title ?? "منحنى وثيقة SVT"}
      >
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
        <text x={width / 2} y={height - 5} textAnchor="middle" direction="rtl">
          {block.xAxis.label}
          {block.xAxis.unit ? ` (${block.xAxis.unit})` : ""}
        </text>
        <text x={padding} y={padding - 10} textAnchor="start" direction="rtl">
          {block.yAxis.label}
          {block.yAxis.unit ? ` (${block.yAxis.unit})` : ""}
        </text>
        {block.series.map((series, index) => (
          <g key={series.id} data-series={index + 1}>
            <polyline points={makePolyline(series)} />
            {series.points.map((point) => {
              const svgPoint = toSvgPoint(point);

              return (
                <circle
                  key={`${series.id}:${point.x}:${point.y}`}
                  cx={svgPoint.x}
                  cy={svgPoint.y}
                  r="3.4"
                />
              );
            })}
          </g>
        ))}
      </svg>
      <div className="svt-doc-graph-legend">
        {block.series.map((series, index) => (
          <span key={series.id} data-series={index + 1}>
            {series.title}
          </span>
        ))}
      </div>
    </div>
  );
}

function TableBlock({ block }: { block: Extract<SvtDocumentWorkbenchDocumentBlock, { type: "table" }> }) {
  return (
    <div className="svt-doc-table-block">
      {block.title ? <h4>{block.title}</h4> : null}
      <div className="svt-doc-table-wrap">
        <table>
          <thead>
            <tr>
              {block.columns.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.id}>
                {block.columns.map((column) => (
                  <td key={`${row.id}:${column.id}`}>
                    {row.cells[column.id] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DiagramBlock({ block }: { block: Extract<SvtDocumentWorkbenchDocumentBlock, { type: "diagram" }> }) {
  return (
    <div className="svt-doc-diagram-block">
      <div className="svt-doc-diagram-visual" aria-hidden="true">
        <span />
        <i />
        <b />
      </div>
      <div>
        {block.title ? <h4>{block.title}</h4> : null}
        <p>{block.description}</p>
        {block.labels?.length ? (
          <div className="svt-doc-label-row">
            {block.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DocumentBlock({ block }: { block: SvtDocumentWorkbenchDocumentBlock }) {
  switch (block.type) {
    case "text":
      return (
        <div className="svt-doc-text-block">
          {block.title ? <h4>{block.title}</h4> : null}
          <p>{block.body}</p>
        </div>
      );
    case "table":
      return <TableBlock block={block} />;
    case "graph":
      return <GraphBlock block={block} />;
    case "diagram":
      return <DiagramBlock block={block} />;
  }
}

function SourceDocuments({
  preset,
  selectedEvidenceIds,
  onToggleEvidence,
}: {
  preset: SvtDocumentWorkbenchPreset;
  selectedEvidenceIds: string[];
  onToggleEvidence: (evidenceId: string) => void;
}) {
  const evidenceGroups = useMemo(
    () => groupSvtEvidenceByDocument(preset.evidenceItems),
    [preset.evidenceItems],
  );

  return (
    <section className="svt-document-stack" aria-label="وثائق المهمة">
      {preset.sourceDocuments.map((document) => {
        const evidence =
          evidenceGroups.find((group) => group.documentId === document.id)
            ?.items ?? [];

        return (
          <article key={document.id} className="svt-document-card">
            <div className="svt-document-card-head">
              <div>
                <p className="page-kicker">
                  {document.sourceLabel ?? getSvtDocumentKindLabel(document.kind)}
                </p>
                <h3>{document.title}</h3>
              </div>
              <StudyBadge tone="neutral">
                {getSvtDocumentKindLabel(document.kind)}
              </StudyBadge>
            </div>

            <div className="svt-document-blocks">
              {document.blocks.map((block, index) => (
                <DocumentBlock key={`${document.id}:${index}`} block={block} />
              ))}
            </div>

            {evidence.length ? (
              <div className="svt-evidence-list">
                {evidence.map((item) => {
                  const selected = selectedEvidenceIds.includes(item.id);

                  return (
                    <SelectionCard
                      key={item.id}
                      type="button"
                      active={selected}
                      className="min-h-0 rounded-2xl p-3"
                      onClick={() => onToggleEvidence(item.id)}
                    >
                      <strong>{item.label}</strong>
                      {item.detail ? <small>{item.detail}</small> : null}
                    </SelectionCard>
                  );
                })}
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

export function SvtDocumentWorkbenchLab({
  missionItem = null,
}: SvtDocumentWorkbenchLabProps) {
  const preset = useMemo(() => getMissionPreset(missionItem), [missionItem]);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [conclusion, setConclusion] = useState("");
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const evaluation = useMemo(
    () =>
      evaluateSvtDocumentWorkbenchAnswer(preset, {
        selectedEvidenceIds,
        conclusion,
      }),
    [conclusion, preset, selectedEvidenceIds],
  );
  const resultJson = useMemo(
    () =>
      buildSvtDocumentWorkbenchResult({
        missionId: missionItem?.mission.id ?? null,
        preset,
        selectedEvidenceIds,
        conclusion,
      }),
    [conclusion, missionItem?.mission.id, preset, selectedEvidenceIds],
  );

  function handleToggleEvidence(evidenceId: string) {
    setSelectedEvidenceIds((current) =>
      toggleSvtDocumentEvidence(current, evidenceId),
    );
  }

  function appendScaffoldPhrase(phrase: string) {
    setConclusion((current) =>
      current.trim() ? `${current.trim()}\n${phrase}` : phrase,
    );
  }

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame lab-page lab-tool-page">
        <StudyHeader
          eyebrow="SVT Lab"
          title="ورشة الوثائق والمنحنيات"
          subtitle={preset.subtitle}
          actions={
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full px-5"
            >
              <Link href={STUDENT_LAB_ROUTE}>
                <ArrowRight data-icon size={17} strokeWidth={2.1} />
                المختبر
              </Link>
            </Button>
          }
          meta={[
            { label: "السياق", value: "وثائق BAC" },
            { label: "الأدلة", value: `${preset.evidenceItems.length}` },
            { label: "المطلوب", value: preset.prompt.title },
            ...(missionItem
              ? [{ label: "المهمة", value: missionItem.mission.title }]
              : []),
          ]}
        />

        <ActiveLabMissionPanel
          missionItem={missionItem}
          resultJson={resultJson}
        />

        <div className="lab-workspace svt-document-workspace">
          <aside className="lab-control-panel svt-document-control">
            <div className="lab-control-panel-head">
              <span className="lab-panel-icon" aria-hidden="true">
                <Microscope size={22} strokeWidth={2.1} />
              </span>
              <div>
                <p className="page-kicker">ملف المهمة</p>
                <h2>{preset.title}</h2>
              </div>
            </div>

            <div className="lab-note">
              <span>سياق BAC</span>
              <p>{preset.bacContext}</p>
            </div>

            <section className="svt-workbench-task">
              <div>
                <p className="page-kicker">المطلوب</p>
                <h3>{preset.prompt.title}</h3>
              </div>
              <p>{preset.prompt.task}</p>
            </section>

            <div className="svt-evidence-progress">
              <span>
                {evaluation.selectedRequiredCount}/
                {evaluation.requiredEvidenceCount}
              </span>
              <strong>أدلة أساسية</strong>
              <i
                style={{
                  width: `${
                    evaluation.requiredEvidenceCount
                      ? (evaluation.selectedRequiredCount /
                          evaluation.requiredEvidenceCount) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>

            <label className="lab-input-field">
              <span>الاستنتاج</span>
              <Textarea
                value={conclusion}
                onChange={(event) => {
                  setConclusion(event.target.value);
                  setFeedbackVisible(false);
                }}
                rows={8}
                placeholder="اربط الوثائق في نص قصير..."
              />
            </label>

            {preset.prompt.scaffoldPhrases?.length ? (
              <div className="svt-scaffold-phrases">
                {preset.prompt.scaffoldPhrases.map((phrase) => (
                  <Button
                    key={phrase}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => appendScaffoldPhrase(phrase)}
                  >
                    {phrase}
                  </Button>
                ))}
              </div>
            ) : null}

            <Button
              type="button"
              className="h-11 rounded-full"
              onClick={() => setFeedbackVisible(true)}
            >
              <CheckCircle2 data-icon="inline-start" strokeWidth={2.1} />
              اختبر الاستنتاج
            </Button>

            {feedbackVisible ? (
              <section
                className="svt-workbench-feedback"
                data-passed={evaluation.passed ? "true" : "false"}
                aria-live="polite"
              >
                <div>
                  <FileText size={18} strokeWidth={2.1} />
                  <strong>
                    {evaluation.passed ? "الملف متماسك" : "الملف ناقص"}
                  </strong>
                </div>
                {evaluation.passed ? (
                  <p>الأدلة الأساسية والاستنتاج يوافقان هدف المهمة.</p>
                ) : (
                  <>
                    {evaluation.missingEvidenceItems.length ? (
                      <p>
                        ينقصك دليل:{" "}
                        {evaluation.missingEvidenceItems
                          .map((item) => item.label)
                          .join("، ")}
                      </p>
                    ) : null}
                    {evaluation.missingKeywords.length ? (
                      <p>
                        أضف في الاستنتاج:{" "}
                        {evaluation.missingKeywords.join("، ")}
                      </p>
                    ) : null}
                  </>
                )}
              </section>
            ) : null}
          </aside>

          <SourceDocuments
            preset={preset}
            selectedEvidenceIds={selectedEvidenceIds}
            onToggleEvidence={handleToggleEvidence}
          />
        </div>
      </section>
    </StudyShell>
  );
}
