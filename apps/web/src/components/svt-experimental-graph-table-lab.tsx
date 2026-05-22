"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Beaker, CheckCircle2, LineChart } from "lucide-react";
import type {
  LabMissionItem,
  SvtExperimentalGraphTablePreset,
} from "@bac-bank/contracts/lab";
import { ActiveLabMissionPanel } from "@/components/lab-active-mission-panel";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionCard } from "@/components/ui/selection-card";
import { Textarea } from "@/components/ui/textarea";
import {
  buildSvtExperimentalWorkbenchResult,
  evaluateSvtExperimentalWorkbenchAnswer,
  getSvtExperimentalGraphInsights,
  getSvtExperimentalWorkbenchPreset,
  makeSvtExperimentalInitialReadings,
  toggleSvtExperimentalObservation,
  updateSvtExperimentalReading,
} from "@/lib/lab-svt-experimental-graph-table";
import { STUDENT_LAB_ROUTE } from "@/lib/student-routes";

type SvtExperimentalGraphTableLabProps = {
  missionItem?: LabMissionItem | null;
};

function getMissionPreset(missionItem?: LabMissionItem | null) {
  return getSvtExperimentalWorkbenchPreset(missionItem?.mission.preset);
}

function ExperimentGraph({
  preset,
}: {
  preset: SvtExperimentalGraphTablePreset;
}) {
  const points = preset.graph.series.flatMap((series) => series.points);
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const xMin = preset.graph.xAxis.min ?? Math.min(...xValues);
  const xMax = preset.graph.xAxis.max ?? Math.max(...xValues);
  const yMin = preset.graph.yAxis.min ?? Math.min(...yValues);
  const yMax = preset.graph.yAxis.max ?? Math.max(...yValues);
  const width = 420;
  const height = 230;
  const padding = 34;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;

  function toSvgPoint(point: { x: number; y: number }) {
    return {
      x: padding + ((point.x - xMin) / xSpan) * plotWidth,
      y: height - padding - ((point.y - yMin) / ySpan) * plotHeight,
    };
  }

  return (
    <div className="svt-doc-graph-block">
      <h4>{preset.graph.title}</h4>
      <svg
        className="svt-doc-graph"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        direction="ltr"
        aria-label={preset.graph.title}
      >
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
        />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
        <text x={width / 2} y={height - 6} textAnchor="middle" direction="rtl">
          {preset.graph.xAxis.label}
          {preset.graph.xAxis.unit ? ` (${preset.graph.xAxis.unit})` : ""}
        </text>
        <text x={padding} y={padding - 10} textAnchor="start" direction="rtl">
          {preset.graph.yAxis.label}
          {preset.graph.yAxis.unit ? ` (${preset.graph.yAxis.unit})` : ""}
        </text>
        {preset.graph.series.map((series, index) => (
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
                  r="3.5"
                />
              );
            })}
          </g>
        ))}
      </svg>
      <div className="svt-doc-graph-legend">
        {preset.graph.series.map((series, index) => (
          <span key={series.id} data-series={index + 1}>
            {series.title}
          </span>
        ))}
      </div>
    </div>
  );
}

function ExperimentTable({
  preset,
}: {
  preset: SvtExperimentalGraphTablePreset;
}) {
  return (
    <div className="svt-doc-table-block">
      <h4>{preset.table.title}</h4>
      <div className="svt-doc-table-wrap">
        <table>
          <thead>
            <tr>
              {preset.table.columns.map((column) => (
                <th key={column.id}>
                  {column.label}
                  {column.unit ? ` (${column.unit})` : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preset.table.rows.map((row) => (
              <tr key={row.id}>
                {preset.table.columns.map((column) => (
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

export function SvtExperimentalGraphTableLab({
  missionItem = null,
}: SvtExperimentalGraphTableLabProps) {
  const preset = useMemo(() => getMissionPreset(missionItem), [missionItem]);
  const insights = useMemo(() => getSvtExperimentalGraphInsights(preset), [
    preset,
  ]);
  const [readings, setReadings] = useState(() =>
    makeSvtExperimentalInitialReadings(preset),
  );
  const [selectedObservationIds, setSelectedObservationIds] = useState<
    string[]
  >([]);
  const [conclusion, setConclusion] = useState("");
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const evaluation = useMemo(
    () =>
      evaluateSvtExperimentalWorkbenchAnswer(preset, {
        readings,
        selectedObservationIds,
        conclusion,
      }),
    [conclusion, preset, readings, selectedObservationIds],
  );
  const resultJson = useMemo(
    () =>
      buildSvtExperimentalWorkbenchResult({
        missionId: missionItem?.mission.id ?? null,
        preset,
        readings,
        selectedObservationIds,
        conclusion,
      }),
    [conclusion, missionItem?.mission.id, preset, readings, selectedObservationIds],
  );

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
          title="ورشة التجارب والمنحنيات"
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
            { label: "السياق", value: "تجربة BAC" },
            { label: "القراءات", value: `${preset.expectedReadings.length}` },
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
                <Beaker size={22} strokeWidth={2.1} />
              </span>
              <div>
                <p className="page-kicker">ملف التجربة</p>
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

            <div className="svt-evidence-progress">
              <span>
                {evaluation.selectedRequiredObservationCount}/
                {evaluation.requiredObservationCount}
              </span>
              <strong>ملاحظات أساسية</strong>
              <i
                style={{
                  width: `${
                    evaluation.requiredObservationCount
                      ? (evaluation.selectedRequiredObservationCount /
                          evaluation.requiredObservationCount) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="svt-document-blocks">
              {preset.expectedReadings.map((reading) => {
                const answer = readings.find((item) => item.id === reading.id);

                return (
                  <label key={reading.id} className="lab-input-field">
                    <span>
                      {reading.label}
                      {reading.unit ? ` (${reading.unit})` : ""}
                    </span>
                    <Input
                      type="number"
                      value={answer?.value ?? ""}
                      onChange={(event) => {
                        const rawValue = event.target.value;
                        setReadings((current) =>
                          updateSvtExperimentalReading(
                            current,
                            reading.id,
                            rawValue === "" ? null : Number(rawValue),
                          ),
                        );
                        setFeedbackVisible(false);
                      }}
                    />
                  </label>
                );
              })}
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
                placeholder="اربط القراءات والملاحظات في استنتاج علمي..."
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
                  <LineChart size={18} strokeWidth={2.1} />
                  <strong>
                    {evaluation.passed ? "التحليل متماسك" : "التحليل ناقص"}
                  </strong>
                </div>
                {evaluation.passed ? (
                  <p>القراءات والملاحظات والاستنتاج توافق هدف المهمة.</p>
                ) : (
                  <>
                    {evaluation.missingReadingIds.length ? (
                      <p>
                        راجع القراءات:{" "}
                        {evaluation.readingEvaluations
                          .filter((item) => !item.passed)
                          .map((item) => item.label)
                          .join("، ")}
                      </p>
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

          <section className="svt-document-stack" aria-label="وثائق التجربة">
            <article className="svt-document-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">{preset.protocol.title}</p>
                  <h3>{preset.table.title}</h3>
                </div>
                <StudyBadge tone="neutral">جدول ومنحنى</StudyBadge>
              </div>
              <div className="svt-doc-text-block">
                <ol>
                  {preset.protocol.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              <ExperimentTable preset={preset} />
              <ExperimentGraph preset={preset} />
            </article>

            <article className="svt-document-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">مؤشرات المنحنى</p>
                  <h3>قراءات سريعة</h3>
                </div>
              </div>
              <div className="svt-evidence-list">
                {insights.map((insight) => (
                  <SelectionCard
                    key={insight.seriesId}
                    type="button"
                    active={false}
                    className="min-h-0 rounded-2xl p-3"
                  >
                    <strong>{insight.title}</strong>
                    <small>
                      أقصى قيمة:{" "}
                      {insight.maximum
                        ? `${insight.maximum.y} عند ${insight.maximum.x}`
                        : "غير متاحة"}
                    </small>
                  </SelectionCard>
                ))}
              </div>
            </article>

            <article className="svt-document-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">اختيار الملاحظات</p>
                  <h3>ما الذي تدعمه التجربة؟</h3>
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
                          toggleSvtExperimentalObservation(current, item.id),
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
