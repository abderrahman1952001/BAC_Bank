"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  LineChart,
  ListChecks,
  Sigma,
} from "lucide-react";
import type { LabMissionItem, MathSequencesPreset } from "@bac-bank/contracts/lab";
import { ActiveLabMissionPanel } from "@/components/lab-active-mission-panel";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionCard } from "@/components/ui/selection-card";
import { Textarea } from "@/components/ui/textarea";
import {
  buildMathSequencesWorkbenchResult,
  evaluateMathSequencesWorkbenchAnswer,
  getMathSequenceGraphPoints,
  getMathSequencesWorkbenchPreset,
  makeMathSequencesInitialAnswerCells,
  toggleMathSequenceObservation,
  updateMathSequencesAnswerCell,
} from "@/lib/lab-math-sequences-workbench";
import { STUDENT_LAB_ROUTE } from "@/lib/student-routes";

type MathSequencesWorkbenchLabProps = {
  missionItem?: LabMissionItem | null;
};

function getMissionPreset(missionItem?: LabMissionItem | null) {
  return getMathSequencesWorkbenchPreset(missionItem?.mission.preset);
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
  preset: MathSequencesPreset,
  rowId: string,
  columnId: string,
) {
  return preset.expectedCells.some(
    (cell) => cell.rowId === rowId && cell.columnId === columnId,
  );
}

function SequenceGraph({
  preset,
  answerCells,
}: {
  preset: MathSequencesPreset;
  answerCells: { rowId: string; columnId: string; value: string | number | null }[];
}) {
  const points = getMathSequenceGraphPoints(preset, answerCells);

  if (points.length < 2) {
    return (
      <div className="math-seq-empty-graph">
        <LineChart size={22} strokeWidth={2.1} />
        <p>أكمل u₁ و u₂ حتى يظهر اتجاه الحدود على الرسم.</p>
      </div>
    );
  }

  const width = 420;
  const height = 220;
  const padding = 34;
  const minN = Math.min(...points.map((point) => point.n));
  const maxN = Math.max(...points.map((point) => point.n));
  const minValue = Math.min(...points.map((point) => point.value));
  const maxValue = Math.max(...points.map((point) => point.value));
  const nSpan = maxN - minN || 1;
  const valueSpan = maxValue - minValue || 1;
  const toSvgPoint = (point: { n: number; value: number }) => ({
    x: padding + ((point.n - minN) / nSpan) * (width - padding * 2),
    y:
      height -
      padding -
      ((point.value - minValue) / valueSpan) * (height - padding * 2),
  });

  return (
    <svg
      className="svt-exp-graph"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="تمثيل حدود المتتالية"
      direction="ltr"
    >
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
      />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
      <text x={width / 2} y={height - 7} textAnchor="middle">
        n
      </text>
      <text x={padding} y={padding - 10} textAnchor="start">
        uₙ
      </text>
      <polyline
        points={points
          .map((point) => {
            const svgPoint = toSvgPoint(point);

            return `${svgPoint.x},${svgPoint.y}`;
          })
          .join(" ")}
      />
      {points.map((point) => {
        const svgPoint = toSvgPoint(point);

        return (
          <circle
            key={`${point.n}:${point.value}`}
            cx={svgPoint.x}
            cy={svgPoint.y}
            r="4"
          />
        );
      })}
    </svg>
  );
}

export function MathSequencesWorkbenchLab({
  missionItem = null,
}: MathSequencesWorkbenchLabProps) {
  const preset = useMemo(() => getMissionPreset(missionItem), [missionItem]);
  const [answerCells, setAnswerCells] = useState(() =>
    makeMathSequencesInitialAnswerCells(preset),
  );
  const [selectedObservationIds, setSelectedObservationIds] = useState<
    string[]
  >([]);
  const [conclusion, setConclusion] = useState("");
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const evaluation = useMemo(
    () =>
      evaluateMathSequencesWorkbenchAnswer(preset, {
        answerCells,
        selectedObservationIds,
        conclusion,
      }),
    [answerCells, conclusion, preset, selectedObservationIds],
  );
  const resultJson = useMemo(
    () =>
      buildMathSequencesWorkbenchResult({
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
      updateMathSequencesAnswerCell(current, rowId, columnId, value),
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
          title="ورشة المتتاليات"
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
            { label: "السياق", value: "متتاليات BAC" },
            { label: "الخلايا", value: `${preset.expectedCells.length}` },
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

        <div className="lab-workspace math-seq-workspace">
          <aside className="lab-control-panel math-seq-control">
            <div className="lab-control-panel-head">
              <span className="lab-panel-icon" aria-hidden="true">
                <Sigma size={22} strokeWidth={2.1} />
              </span>
              <div>
                <p className="page-kicker">ملف المتتالية</p>
                <h2>{preset.title}</h2>
              </div>
            </div>

            <div className="lab-note">
              <span>تعريف</span>
              <p>{preset.definition.formulaLabel}</p>
              <small>{preset.definition.description}</small>
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
                placeholder="اربط الحساب بالرتابة أو التحويل أو النهاية..."
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

          <section className="svt-document-stack" aria-label="ورشة المتتاليات">
            <article className="svt-document-card math-seq-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">جدول المتتالية</p>
                  <h3>{preset.table.title}</h3>
                </div>
                <StudyBadge tone="accent">Sequence</StudyBadge>
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

            <article className="svt-document-card math-seq-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">تمثيل الحدود</p>
                  <h3>قراءة الاتجاه بصريا</h3>
                </div>
                <LineChart size={20} strokeWidth={2.1} />
              </div>
              <SequenceGraph preset={preset} answerCells={answerCells} />
            </article>

            <article className="svt-document-card math-seq-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">اختيار الملاحظات</p>
                  <h3>ما الذي يدعمه الحساب؟</h3>
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
                          toggleMathSequenceObservation(current, item.id),
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
