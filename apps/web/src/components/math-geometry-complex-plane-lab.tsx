"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  DraftingCompass,
  ListChecks,
} from "lucide-react";
import type {
  LabMissionItem,
  MathGeometryComplexPreset,
} from "@bac-bank/contracts/lab";
import { ActiveLabMissionPanel } from "@/components/lab-active-mission-panel";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionCard } from "@/components/ui/selection-card";
import { Textarea } from "@/components/ui/textarea";
import {
  buildMathGeometryComplexWorkbenchResult,
  evaluateMathGeometryComplexWorkbenchAnswer,
  getMathGeometryComplexPreset,
  makeMathGeometryComplexInitialAnswerCells,
  toggleMathGeometryComplexObservation,
  updateMathGeometryComplexAnswerCell,
} from "@/lib/lab-math-geometry-complex-plane";
import { STUDENT_LAB_ROUTE } from "@/lib/student-routes";

type MathGeometryComplexPlaneLabProps = {
  missionItem?: LabMissionItem | null;
};

function getMissionPreset(missionItem?: LabMissionItem | null) {
  return getMathGeometryComplexPreset(missionItem?.mission.preset);
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
  preset: MathGeometryComplexPreset,
  rowId: string,
  columnId: string,
) {
  return preset.expectedCells.some(
    (cell) => cell.rowId === rowId && cell.columnId === columnId,
  );
}

function ComplexPlane({ preset }: { preset: MathGeometryComplexPreset }) {
  const { plane } = preset;
  const width = 460;
  const height = 300;
  const padding = 34;
  const xSpan = plane.xMax - plane.xMin || 1;
  const ySpan = plane.yMax - plane.yMin || 1;
  const toSvg = (point: { x: number; y: number }) => ({
    x: padding + ((point.x - plane.xMin) / xSpan) * (width - padding * 2),
    y:
      height -
      padding -
      ((point.y - plane.yMin) / ySpan) * (height - padding * 2),
  });
  const origin = toSvg({ x: 0, y: 0 });
  const xAxisVisible = plane.yMin <= 0 && 0 <= plane.yMax;
  const yAxisVisible = plane.xMin <= 0 && 0 <= plane.xMax;

  return (
    <svg
      className="math-geo-plane"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={plane.title}
      direction="ltr"
    >
      {xAxisVisible ? (
        <line x1={padding} y1={origin.y} x2={width - padding} y2={origin.y} />
      ) : null}
      {yAxisVisible ? (
        <line x1={origin.x} y1={padding} x2={origin.x} y2={height - padding} />
      ) : null}
      <rect
        x={padding}
        y={padding}
        width={width - padding * 2}
        height={height - padding * 2}
        rx="16"
      />
      {plane.points.map((point) => {
        const svgPoint = toSvg(point);

        return (
          <g key={point.id}>
            <circle cx={svgPoint.x} cy={svgPoint.y} r="5" />
            <text x={svgPoint.x + 8} y={svgPoint.y - 8}>
              {point.label}
            </text>
            <text className="affix" x={svgPoint.x + 8} y={svgPoint.y + 12}>
              {point.affixLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MathGeometryComplexPlaneLab({
  missionItem = null,
}: MathGeometryComplexPlaneLabProps) {
  const preset = useMemo(() => getMissionPreset(missionItem), [missionItem]);
  const [answerCells, setAnswerCells] = useState(() =>
    makeMathGeometryComplexInitialAnswerCells(preset),
  );
  const [selectedObservationIds, setSelectedObservationIds] = useState<
    string[]
  >([]);
  const [conclusion, setConclusion] = useState("");
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const evaluation = useMemo(
    () =>
      evaluateMathGeometryComplexWorkbenchAnswer(preset, {
        answerCells,
        selectedObservationIds,
        conclusion,
      }),
    [answerCells, conclusion, preset, selectedObservationIds],
  );
  const resultJson = useMemo(
    () =>
      buildMathGeometryComplexWorkbenchResult({
        missionId: missionItem?.mission.id ?? null,
        preset,
        answerCells,
        selectedObservationIds,
        conclusion,
      }),
    [
      answerCells,
      conclusion,
      missionItem?.mission.id,
      preset,
      selectedObservationIds,
    ],
  );

  function updateAnswer(rowId: string, columnId: string, value: string) {
    setAnswerCells((current) =>
      updateMathGeometryComplexAnswerCell(current, rowId, columnId, value),
    );
    setFeedbackVisible(false);
  }

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
          eyebrow="Math Lab"
          title="ورشة الهندسة والمستوى المركب"
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
            { label: "السياق", value: "هندسة BAC" },
            { label: "النقاط", value: `${preset.plane.points.length}` },
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

        <div className="lab-workspace math-geo-workspace">
          <aside className="lab-control-panel math-geo-control">
            <div className="lab-control-panel-head">
              <span className="lab-panel-icon" aria-hidden="true">
                <DraftingCompass size={22} strokeWidth={2.1} />
              </span>
              <div>
                <p className="page-kicker">ملف الهندسة</p>
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

            <label className="lab-input-field">
              <span>الاستنتاج</span>
              <Textarea
                value={conclusion}
                onChange={(event) => {
                  setConclusion(event.target.value);
                  setFeedbackVisible(false);
                }}
                rows={7}
                placeholder="اربط اللواحق بالشكل الهندسي..."
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
                  <p>الجدول والملاحظات والاستنتاج يوافقون هدف المهمة.</p>
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

          <section
            className="svt-document-stack"
            aria-label="ورشة الهندسة والمستوى المركب"
          >
            <article className="svt-document-card math-geo-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">المستوى المركب</p>
                  <h3>{preset.plane.title}</h3>
                </div>
                <StudyBadge tone="accent">Plane</StudyBadge>
              </div>
              <ComplexPlane preset={preset} />
            </article>

            <article className="svt-document-card math-geo-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">جدول القراءة</p>
                  <h3>{preset.table.title}</h3>
                </div>
                <Compass size={20} strokeWidth={2.1} />
              </div>
              <div className="math-prob-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {preset.table.columns.map((column) => (
                        <th key={column.id}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preset.table.rows.map((row) => (
                      <tr key={row.id}>
                        {preset.table.columns.map((column) => {
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
                                  onChange={(event) =>
                                    updateAnswer(
                                      row.id,
                                      column.id,
                                      event.target.value,
                                    )
                                  }
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

            <article className="svt-document-card math-geo-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">اختيار الملاحظات</p>
                  <h3>ما الذي تثبته الحسابات؟</h3>
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
                          toggleMathGeometryComplexObservation(
                            current,
                            item.id,
                          ),
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
