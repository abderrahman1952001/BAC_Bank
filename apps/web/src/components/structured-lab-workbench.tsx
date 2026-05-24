"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Atom,
  Beaker,
  CheckCircle2,
  Cpu,
  Gauge,
  LineChart,
  ListChecks,
  PenTool,
  Zap,
} from "lucide-react";
import type {
  LabMissionItem,
  StructuredLabWorkbenchPreset,
} from "@bac-bank/contracts/lab";
import { ActiveLabMissionPanel } from "@/components/lab-active-mission-panel";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionCard } from "@/components/ui/selection-card";
import { Textarea } from "@/components/ui/textarea";
import {
  buildStructuredLabWorkbenchResult,
  evaluateStructuredLabWorkbenchAnswer,
  getStructuredLabWorkbenchPreset,
  makeStructuredInitialAnswerCells,
  makeStructuredInitialLabels,
  makeStructuredInitialMeasurements,
  toggleStructuredObservation,
  updateStructuredAnswerCell,
  updateStructuredLabel,
  updateStructuredMeasurement,
} from "@/lib/lab-structured-workbench";
import { STUDENT_LAB_ROUTE } from "@/lib/student-routes";

type StructuredLabWorkbenchProps = {
  toolId: string;
  missionItem?: LabMissionItem | null;
  fallbackPreset: StructuredLabWorkbenchPreset;
};

function InstrumentIcon({
  kind,
}: {
  kind?: StructuredLabWorkbenchPreset["instrument"]["iconKind"];
}) {
  switch (kind) {
    case "circuit":
      return <Zap size={22} strokeWidth={2.1} />;
    case "mechanics":
      return <Gauge size={22} strokeWidth={2.1} />;
    case "chemistry":
      return <Beaker size={22} strokeWidth={2.1} />;
    case "technical":
      return <Cpu size={22} strokeWidth={2.1} />;
    case "graph":
      return <LineChart size={22} strokeWidth={2.1} />;
    default:
      return <Atom size={22} strokeWidth={2.1} />;
  }
}

function getAnswerValue(
  answerCells: { rowId: string; columnId: string; value: string | number | null }[],
  rowId: string,
  columnId: string,
) {
  const value =
    answerCells.find(
      (cell) => cell.rowId === rowId && cell.columnId === columnId,
    )?.value ?? "";

  return value === null ? "" : String(value);
}

function hasExpectedCell(
  preset: StructuredLabWorkbenchPreset,
  rowId: string,
  columnId: string,
) {
  return (preset.expectedCells ?? []).some(
    (cell) => cell.rowId === rowId && cell.columnId === columnId,
  );
}

function StructuredGraph({ preset }: { preset: StructuredLabWorkbenchPreset }) {
  const graph = preset.graph;

  if (!graph) {
    return null;
  }

  const points = graph.series.flatMap((series) => series.points);
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const xMin = graph.xAxis.min ?? Math.min(...xValues);
  const xMax = graph.xAxis.max ?? Math.max(...xValues);
  const yMin = graph.yAxis.min ?? Math.min(...yValues);
  const yMax = graph.yAxis.max ?? Math.max(...yValues);
  const width = 460;
  const height = 260;
  const padding = 36;
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const toSvgPoint = (point: { x: number; y: number }) => ({
    x: padding + ((point.x - xMin) / xSpan) * (width - padding * 2),
    y:
      height -
      padding -
      ((point.y - yMin) / ySpan) * (height - padding * 2),
  });

  return (
    <article className="svt-document-card structured-workbench-card">
      <div className="svt-document-card-head">
        <div>
          <p className="page-kicker">منحنى</p>
          <h3>{graph.title}</h3>
        </div>
        <StudyBadge tone="accent">Graph</StudyBadge>
      </div>
      <svg
        className="svt-exp-graph"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={graph.title}
        direction="ltr"
      >
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
        />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
        <text x={width / 2} y={height - 8} textAnchor="middle">
          {graph.xAxis.label}
          {graph.xAxis.unit ? ` (${graph.xAxis.unit})` : ""}
        </text>
        <text x={padding} y={padding - 10} textAnchor="start">
          {graph.yAxis.label}
          {graph.yAxis.unit ? ` (${graph.yAxis.unit})` : ""}
        </text>
        {graph.series.map((series, index) => (
          <g key={series.id} data-series={index + 1}>
            <polyline
              points={series.points
                .map((point) => {
                  const svgPoint = toSvgPoint(point);

                  return `${svgPoint.x},${svgPoint.y}`;
                })
                .join(" ")}
            />
            {series.points.map((point) => {
              const svgPoint = toSvgPoint(point);

              return (
                <circle
                  key={`${series.id}:${point.x}:${point.y}`}
                  cx={svgPoint.x}
                  cy={svgPoint.y}
                  r="4"
                />
              );
            })}
          </g>
        ))}
      </svg>
      <div className="svt-exp-graph-legend">
        {graph.series.map((series, index) => (
          <span key={series.id} data-series={index + 1}>
            {series.title}
          </span>
        ))}
      </div>
    </article>
  );
}

export function StructuredLabWorkbench({
  toolId,
  missionItem = null,
  fallbackPreset,
}: StructuredLabWorkbenchProps) {
  const preset = useMemo(
    () =>
      getStructuredLabWorkbenchPreset(
        missionItem?.mission.preset,
        fallbackPreset,
      ),
    [fallbackPreset, missionItem],
  );
  const [answerCells, setAnswerCells] = useState(() =>
    makeStructuredInitialAnswerCells(preset),
  );
  const [measurements, setMeasurements] = useState(() =>
    makeStructuredInitialMeasurements(preset),
  );
  const [labels, setLabels] = useState(() => makeStructuredInitialLabels(preset));
  const [selectedObservationIds, setSelectedObservationIds] = useState<
    string[]
  >([]);
  const [conclusion, setConclusion] = useState("");
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const evaluation = useMemo(
    () =>
      evaluateStructuredLabWorkbenchAnswer(preset, {
        answerCells,
        measurements,
        labels,
        selectedObservationIds,
        conclusion,
      }),
    [answerCells, conclusion, labels, measurements, preset, selectedObservationIds],
  );
  const resultJson = useMemo(
    () =>
      buildStructuredLabWorkbenchResult({
        tool: toolId,
        missionId: missionItem?.mission.id ?? null,
        preset,
        answerCells,
        measurements,
        labels,
        selectedObservationIds,
        conclusion,
      }),
    [
      answerCells,
      conclusion,
      labels,
      measurements,
      missionItem?.mission.id,
      preset,
      selectedObservationIds,
      toolId,
    ],
  );

  function appendScaffoldPhrase(phrase: string) {
    setConclusion((current) =>
      current.trim() ? `${current.trim()}\n${phrase}` : phrase,
    );
    setFeedbackVisible(false);
  }

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame lab-page lab-tool-page">
        <StudyHeader
          eyebrow={preset.instrument.subjectLabel}
          title={preset.instrument.title}
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
            { label: "السياق", value: "BAC Lab" },
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

        <div className="lab-workspace structured-workbench">
          <aside className="lab-control-panel structured-workbench-control">
            <div className="lab-control-panel-head">
              <span className="lab-panel-icon" aria-hidden="true">
                <InstrumentIcon kind={preset.instrument.iconKind} />
              </span>
              <div>
                <p className="page-kicker">ملف العمل</p>
                <h2>{preset.title}</h2>
              </div>
            </div>

            <div className="lab-note">
              <span>سياق BAC</span>
              <p>{preset.bacContext}</p>
              {preset.sourceHint ? <small>{preset.sourceHint}</small> : null}
            </div>

            <section className="svt-workbench-task">
              <div>
                <p className="page-kicker">المطلوب</p>
                <h3>{preset.prompt.title}</h3>
              </div>
              <p>{preset.prompt.task}</p>
            </section>

            {evaluation.totalCellCount ? (
              <div className="svt-evidence-progress">
                <span>
                  {evaluation.correctCellCount}/{evaluation.totalCellCount}
                </span>
                <strong>خلايا صحيحة</strong>
                <i
                  style={{
                    width: `${
                      evaluation.totalCellCount
                        ? (evaluation.correctCellCount /
                            evaluation.totalCellCount) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            ) : null}

            {preset.measurements?.length ? (
              <section className="structured-workbench-section">
                <div className="math-prob-section-head">
                  <PenTool size={18} strokeWidth={2.1} />
                  <h3>قيم ووحدات</h3>
                </div>
                {preset.measurements.map((measurement) => {
                  const answer = measurements.find(
                    (item) => item.id === measurement.id,
                  );

                  return (
                    <div key={measurement.id} className="structured-measure-row">
                      <label className="lab-input-field">
                        <span>{measurement.label}</span>
                        <Input
                          type="number"
                          value={answer?.value ?? ""}
                          onChange={(event) => {
                            const rawValue = event.target.value;
                            setMeasurements((current) =>
                              updateStructuredMeasurement(current, measurement.id, {
                                value:
                                  rawValue === "" ? null : Number(rawValue),
                              }),
                            );
                            setFeedbackVisible(false);
                          }}
                        />
                      </label>
                      <label className="lab-input-field">
                        <span>الوحدة</span>
                        <Input
                          value={answer?.unit ?? ""}
                          onChange={(event) => {
                            setMeasurements((current) =>
                              updateStructuredMeasurement(current, measurement.id, {
                                unit: event.target.value,
                              }),
                            );
                            setFeedbackVisible(false);
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </section>
            ) : null}

            <label className="lab-input-field">
              <span>الاستنتاج</span>
              <Textarea
                value={conclusion}
                onChange={(event) => {
                  setConclusion(event.target.value);
                  setFeedbackVisible(false);
                }}
                rows={7}
                placeholder="اربط القراءات بالمفهوم الفيزيائي أو التقني..."
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
              اختبر التحليل
            </Button>

            {feedbackVisible ? (
              <section
                className="svt-workbench-feedback"
                data-passed={evaluation.passed ? "true" : "false"}
                aria-live="polite"
              >
                <div>
                  <ListChecks size={18} strokeWidth={2.1} />
                  <strong>
                    {evaluation.passed ? "التحليل متماسك" : "التحليل ناقص"}
                  </strong>
                </div>
                {evaluation.passed ? (
                  <p>المدخلات والملاحظات والاستنتاج توافق هدف المهمة.</p>
                ) : (
                  <>
                    {!evaluation.tablePassed ? (
                      <p>
                        راجع الخلايا:{" "}
                        {evaluation.table.cells
                          .filter((cell) => !cell.passed)
                          .map((cell) => `${cell.rowId}/${cell.columnId}`)
                          .join("، ")}
                      </p>
                    ) : null}
                    {!evaluation.measurementsPassed ? (
                      <p>راجع القيم أو الوحدات في خانة الحسابات.</p>
                    ) : null}
                    {!evaluation.labelsPassed ? (
                      <p>راجع تسميات الرسم أو المخطط.</p>
                    ) : null}
                    {evaluation.missingObservationItems.length ? (
                      <p>
                        ينقصك ملاحظة:{" "}
                        {evaluation.missingObservationItems
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

          <section className="svt-document-stack" aria-label="لوحة العمل">
            {preset.sourceDocuments?.length ? (
              <article className="svt-document-card structured-workbench-card">
                <div className="svt-document-card-head">
                  <div>
                    <p className="page-kicker">وثائق</p>
                    <h3>ملف التجربة</h3>
                  </div>
                </div>
                <div className="svt-document-blocks">
                  {preset.sourceDocuments.map((document) => (
                    <section key={document.id} className="svt-doc-text-block">
                      <h4>{document.title}</h4>
                      {document.body ? <p>{document.body}</p> : null}
                      {document.bullets?.length ? (
                        <ol>
                          {document.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ol>
                      ) : null}
                    </section>
                  ))}
                </div>
              </article>
            ) : null}

            {preset.table ? (
              <article className="svt-document-card structured-workbench-card">
                <div className="svt-document-card-head">
                  <div>
                    <p className="page-kicker">جدول</p>
                    <h3>{preset.table.title}</h3>
                  </div>
                  <StudyBadge tone="accent">Table</StudyBadge>
                </div>
                <div className="math-prob-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {preset.table.columns.map((column) => (
                          <th key={column.id}>
                            {column.label}
                            {column.unit ? <span>{column.unit}</span> : null}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preset.table.rows.map((row) => (
                        <tr key={row.id}>
                          {preset.table?.columns.map((column) => {
                            const editable = hasExpectedCell(
                              preset,
                              row.id,
                              column.id,
                            );

                            return (
                              <td key={`${row.id}:${column.id}`}>
                                {editable ? (
                                  <Input
                                    value={getAnswerValue(
                                      answerCells,
                                      row.id,
                                      column.id,
                                    )}
                                    onChange={(event) => {
                                      setAnswerCells((current) =>
                                        updateStructuredAnswerCell(
                                          current,
                                          row.id,
                                          column.id,
                                          event.target.value,
                                        ),
                                      );
                                      setFeedbackVisible(false);
                                    }}
                                    placeholder="القيمة"
                                  />
                                ) : (
                                  (row.cells[column.id] ?? "")
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ) : null}

            <StructuredGraph preset={preset} />

            {preset.diagram ? (
              <article className="svt-document-card structured-workbench-card">
                <div className="svt-document-card-head">
                  <div>
                    <p className="page-kicker">مخطط</p>
                    <h3>{preset.diagram.title}</h3>
                  </div>
                </div>
                <p>{preset.diagram.description}</p>
                <div className="structured-diagram">
                  {preset.diagram.targets.map((target) => {
                    const answer = labels.find(
                      (label) => label.targetId === target.id,
                    );

                    return (
                      <label
                        key={target.id}
                        className="structured-diagram-target"
                        style={{ insetInlineStart: `${target.x}%`, top: `${target.y}%` }}
                      >
                        <span>{target.label}</span>
                        <Input
                          value={answer?.label ?? ""}
                          onChange={(event) => {
                            setLabels((current) =>
                              updateStructuredLabel(
                                current,
                                target.id,
                                event.target.value,
                              ),
                            );
                            setFeedbackVisible(false);
                          }}
                          placeholder="التسمية"
                        />
                      </label>
                    );
                  })}
                </div>
              </article>
            ) : null}

            <article className="svt-document-card structured-workbench-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">اختيار الملاحظات</p>
                  <h3>ما الذي تدعمه المعطيات؟</h3>
                </div>
              </div>
              <div className="svt-evidence-list">
                {preset.observationItems.map((item) => {
                  const selected = selectedObservationIds.includes(item.id);

                  return (
                    <SelectionCard
                      key={item.id}
                      type="button"
                      active={selected}
                      className="min-h-0 rounded-2xl p-3"
                      onClick={() => {
                        setSelectedObservationIds((current) =>
                          toggleStructuredObservation(current, item.id),
                        );
                        setFeedbackVisible(false);
                      }}
                    >
                      <strong>{item.label}</strong>
                      {item.detail ? <small>{item.detail}</small> : null}
                    </SelectionCard>
                  );
                })}
              </div>
            </article>
          </section>
        </div>
      </section>
    </StudyShell>
  );
}
