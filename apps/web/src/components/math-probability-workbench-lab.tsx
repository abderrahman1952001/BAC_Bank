"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Dice5,
  Sigma,
  Table2,
  Workflow,
} from "lucide-react";
import type {
  LabMissionItem,
  MathProbabilityPreset,
  MathProbabilityTreeNode,
} from "@bac-bank/contracts/lab";
import { ActiveLabMissionPanel } from "@/components/lab-active-mission-panel";
import { ProbabilityTreeSvg } from "@/components/probability-tree-svg";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildMathProbabilityWorkbenchResult,
  evaluateMathProbabilityWorkbenchAnswer,
  getMathProbabilityWorkbenchPreset,
  makeMathProbabilityInitialAnswerCells,
  updateMathProbabilityAnswerCell,
} from "@/lib/lab-math-probability-workbench";
import { STUDENT_LAB_ROUTE } from "@/lib/student-routes";

type MathProbabilityWorkbenchLabProps = {
  missionItem?: LabMissionItem | null;
};

function getMissionPreset(missionItem?: LabMissionItem | null) {
  return getMathProbabilityWorkbenchPreset(missionItem?.mission.preset);
}

function collectTreeAnswerNodes(root: MathProbabilityTreeNode) {
  const nodes: MathProbabilityTreeNode[] = [];

  const walk = (node: MathProbabilityTreeNode) => {
    if (node.answerCell) {
      nodes.push(node);
    }

    for (const child of node.children ?? []) {
      walk(child);
    }
  };

  walk(root);
  return nodes;
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
  preset: MathProbabilityPreset,
  rowId: string,
  columnId: string,
) {
  return preset.expectedCells.some(
    (cell) => cell.rowId === rowId && cell.columnId === columnId,
  );
}

export function MathProbabilityWorkbenchLab({
  missionItem = null,
}: MathProbabilityWorkbenchLabProps) {
  const preset = useMemo(() => getMissionPreset(missionItem), [missionItem]);
  const treeAnswerNodes = useMemo(
    () => (preset.tree ? collectTreeAnswerNodes(preset.tree.root) : []),
    [preset],
  );
  const [answerCells, setAnswerCells] = useState(() =>
    makeMathProbabilityInitialAnswerCells(preset),
  );
  const [conclusion, setConclusion] = useState("");
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const evaluation = useMemo(
    () =>
      evaluateMathProbabilityWorkbenchAnswer(preset, {
        answerCells,
        conclusion,
      }),
    [answerCells, conclusion, preset],
  );
  const resultJson = useMemo(
    () =>
      buildMathProbabilityWorkbenchResult({
        missionId: missionItem?.mission.id ?? null,
        preset,
        answerCells,
        conclusion,
      }),
    [answerCells, conclusion, missionItem?.mission.id, preset],
  );

  function updateAnswer(rowId: string, columnId: string, value: string) {
    setAnswerCells((current) =>
      updateMathProbabilityAnswerCell(current, rowId, columnId, value),
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
          title="ورشة الاحتمالات"
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
            { label: "السياق", value: "احتمالات BAC" },
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

        <div className="lab-workspace math-prob-workspace">
          <aside className="lab-control-panel math-prob-control">
            <div className="lab-control-panel-head">
              <span className="lab-panel-icon" aria-hidden="true">
                <Dice5 size={22} strokeWidth={2.1} />
              </span>
              <div>
                <p className="page-kicker">ملف الاحتمالات</p>
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

            {treeAnswerNodes.length ? (
              <section className="math-prob-answer-stack">
                <div className="math-prob-section-head">
                  <Workflow size={18} strokeWidth={2.1} />
                  <h3>فروع الشجرة الناقصة</h3>
                </div>
                {treeAnswerNodes.map((node) =>
                  node.answerCell ? (
                    <label key={node.id} className="lab-input-field">
                      <span>
                        {node.edgeLabel ?? node.label} : {node.label}
                      </span>
                      <Input
                        value={getAnswerValue(
                          answerCells,
                          node.answerCell.rowId,
                          node.answerCell.columnId,
                        )}
                        onChange={(event) =>
                          updateAnswer(
                            node.answerCell?.rowId ?? "",
                            node.answerCell?.columnId ?? "",
                            event.target.value,
                          )
                        }
                        placeholder="مثال: 2/5 أو 0.4"
                      />
                    </label>
                  ) : null,
                )}
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
                placeholder="اكتب قاعدة الحساب أو تفسير الجدول..."
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
              اختبر الحل
            </Button>

            {feedbackVisible ? (
              <section
                className="svt-workbench-feedback"
                data-passed={evaluation.passed ? "true" : "false"}
                aria-live="polite"
              >
                <div>
                  <Sigma size={18} strokeWidth={2.1} />
                  <strong>
                    {evaluation.passed ? "الحل متماسك" : "الحل يحتاج ضبطا"}
                  </strong>
                </div>
                {evaluation.passed ? (
                  <p>الخلايا والاستنتاج يوافقان هدف المهمة.</p>
                ) : (
                  <>
                    {!evaluation.tablePassed ? (
                      <p>
                        راجع الخلايا غير الصحيحة:{" "}
                        {evaluation.table.cells
                          .filter((cell) => !cell.passed)
                          .map((cell) => `${cell.rowId}/${cell.columnId}`)
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

          <section className="svt-document-stack" aria-label="ورشة الاحتمالات">
            {preset.tree ? (
              <article className="svt-document-card math-prob-card">
                <div className="svt-document-card-head">
                  <div>
                    <p className="page-kicker">شجرة احتمالات</p>
                    <h3>{preset.tree.title}</h3>
                  </div>
                  <StudyBadge tone="neutral">Tree</StudyBadge>
                </div>
                <ProbabilityTreeSvg
                  data={{
                    type: "probability_tree",
                    direction: preset.tree.direction,
                    root: preset.tree.root,
                  }}
                  title={preset.tree.title}
                />
              </article>
            ) : null}

            <article className="svt-document-card math-prob-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">جدول العمل</p>
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
                                  placeholder="أدخل القيمة"
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

            <article className="svt-document-card math-prob-card">
              <div className="svt-document-card-head">
                <div>
                  <p className="page-kicker">مراقبة الحل</p>
                  <h3>كيف تقرأ النتيجة؟</h3>
                </div>
                <Table2 size={20} strokeWidth={2.1} />
              </div>
              <div className="svt-evidence-list">
                {preset.expectedCells.map((cell) => {
                  const checked = evaluation.table.cells.find(
                    (item) =>
                      item.rowId === cell.rowId &&
                      item.columnId === cell.columnId,
                  );

                  return (
                    <div
                      key={`${cell.rowId}:${cell.columnId}`}
                      className="math-prob-check-row"
                      data-passed={checked?.passed ? "true" : "false"}
                    >
                      <strong>
                        {cell.rowId} / {cell.columnId}
                      </strong>
                      <span>{checked?.passed ? "صحيح" : "ينتظر التحقق"}</span>
                    </div>
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
