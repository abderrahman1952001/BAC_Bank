"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Grid3X3,
  ListChecks,
  Sigma,
  TrendingUp,
} from "lucide-react";
import { FormulaGraphPlot } from "@/components/formula-graph-plot";
import { ActiveLabMissionPanel } from "@/components/lab-active-mission-panel";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionCard } from "@/components/ui/selection-card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  analyzeFunctionExpression,
  buildFunctionValueTable,
  detectApproximateExtrema,
  evaluateFunctionMissionAnswer,
  functionExplorerPresets,
  getFunctionExplorerPreset,
  getFunctionSignLabel,
  getFunctionVariationDirectionLabel,
  type FunctionExplorerPreset,
  type FunctionFactConfidence,
} from "@/lib/lab-function-explorer";
import type { LabMissionItem } from "@/lib/lab-api";
import { STUDENT_LAB_ROUTE } from "@/lib/student-routes";

type LabMode = "explore" | "mission";
type LocalMissionId = "roots" | "sign" | "variation";

const localMissions = [
  {
    id: "roots",
    title: "اقرأ الجذور",
    goal: "حدد حلول f(x)=0 من الرسم ثم تحقق منها في جدول القيم.",
    mistake: "لا تخلط بين تقاطع المنحنى مع Ox وتقاطع المنحنى مع Oy.",
    checks: ["اذكر كل قيمة x تجعل f(x)=0.", "فسر هل النتيجة دقيقة أم تقريبية."],
  },
  {
    id: "sign",
    title: "ابن جدول الإشارة",
    goal: "استعمل الجذور أو القيم الممنوعة لتقسيم المستقيم إلى مجالات.",
    mistake: "الجذر المزدوج لا يعني بالضرورة تغير الإشارة بعد الجذر.",
    checks: ["ضع إشارة f(x) في كل مجال.", "فسر ماذا يحدث عند كل جذر."],
  },
  {
    id: "variation",
    title: "استنتج التغيرات",
    goal: "اربط إشارة المشتقة باتجاه تغير الدالة وقيمة الحد أو الرأس.",
    mistake: "لا تقرأ التزايد من شكل المنحنى فقط عندما يكون جدول المشتقة متاحاً.",
    checks: ["حدد مجالات التزايد والتناقص.", "اربط نقطة التحول بقيمة قصوى أو دنيا."],
  },
] satisfies Array<{
  id: LocalMissionId;
  title: string;
  goal: string;
  mistake: string;
  checks: string[];
}>;

const missionKindById = {
  roots: "ROOTS",
  sign: "SIGN_TABLE",
  variation: "VARIATION",
} as const satisfies Record<
  LocalMissionId,
  "ROOTS" | "SIGN_TABLE" | "VARIATION"
>;

function buildTableSamples(domain: [number, number]) {
  const [left, right] = domain;
  const start = Math.ceil(left);
  const end = Math.floor(right);
  const values: number[] = [];

  for (let value = start; value <= end; value += 1) {
    values.push(value);
  }

  return values.slice(0, 9);
}

function readMissionString(
  data: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = data?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isFunctionPresetId(
  value: string | null,
): value is FunctionExplorerPreset["id"] {
  return functionExplorerPresets.some((preset) => preset.id === value);
}

function getMissionPresetId(missionItem?: LabMissionItem | null) {
  const presetId = readMissionString(
    missionItem?.mission.preset,
    "toolPresetId",
  );

  return isFunctionPresetId(presetId) ? presetId : "quadratic";
}

function getMissionExpression(missionItem?: LabMissionItem | null) {
  return (
    readMissionString(missionItem?.mission.preset, "expression") ??
    getFunctionExplorerPreset(getMissionPresetId(missionItem))?.expression ??
    "x^2"
  );
}

function getDefaultTangentX(domain: [number, number]) {
  return Math.round(((domain[0] + domain[1]) / 2) * 100) / 100;
}

function getConfidenceTone(confidence: FunctionFactConfidence) {
  switch (confidence) {
    case "EXACT":
      return "success";
    case "ESTIMATED":
      return "accent";
    case "UNSUPPORTED":
      return "warning";
  }
}

function getConfidenceLabel(confidence: FunctionFactConfidence) {
  switch (confidence) {
    case "EXACT":
      return "دقيق";
    case "ESTIMATED":
      return "تقريبي";
    case "UNSUPPORTED":
      return "غير متاح";
  }
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: FunctionFactConfidence;
}) {
  return (
    <StudyBadge tone={getConfidenceTone(confidence)} size="sm">
      {getConfidenceLabel(confidence)}
    </StudyBadge>
  );
}

function formatPoint(value: number | null | undefined) {
  return typeof value === "number" ? value : "—";
}

export function FunctionExplorerLab({
  missionItem = null,
}: {
  missionItem?: LabMissionItem | null;
}) {
  const [presetId, setPresetId] = useState<FunctionExplorerPreset["id"]>(
    getMissionPresetId(missionItem),
  );
  const selectedPreset =
    getFunctionExplorerPreset(presetId) ?? functionExplorerPresets[0];
  const [expression, setExpression] = useState(
    getMissionExpression(missionItem),
  );
  const [gridEnabled, setGridEnabled] = useState(true);
  const [mode, setMode] = useState<LabMode>(missionItem ? "mission" : "explore");
  const [activeMissionId, setActiveMissionId] =
    useState<LocalMissionId>("roots");
  const [missionAnswer, setMissionAnswer] = useState("");
  const [tangentX, setTangentX] = useState(
    getDefaultTangentX(selectedPreset.xDomain),
  );

  const analysis = useMemo(
    () => analyzeFunctionExpression(expression, selectedPreset.xDomain, tangentX),
    [expression, selectedPreset.xDomain, tangentX],
  );
  const table = useMemo(
    () =>
      buildFunctionValueTable(
        expression,
        buildTableSamples(selectedPreset.xDomain),
      ),
    [expression, selectedPreset.xDomain],
  );
  const extrema = useMemo(
    () => detectApproximateExtrema(expression, selectedPreset.xDomain),
    [expression, selectedPreset.xDomain],
  );
  const activeMission =
    localMissions.find((mission) => mission.id === activeMissionId) ??
    localMissions[0];
  const missionCheck = useMemo(
    () =>
      missionAnswer.trim()
        ? evaluateFunctionMissionAnswer(analysis, {
            kind: missionKindById[activeMission.id],
            answer: missionAnswer,
          })
        : null,
    [activeMission.id, analysis, missionAnswer],
  );
  const missionResultJson = useMemo(
    () => ({
      tool: "function-explorer",
      toolVersion: "functions-lab-v2",
      missionId: missionItem?.mission.id ?? null,
      expression,
      family: analysis.family.kind,
      roots: analysis.roots,
      signIntervals: analysis.signIntervals,
      derivative: analysis.derivative,
      tangent: analysis.tangent,
      variation: analysis.variation,
      extrema,
      tableRows: table.rows,
      validationError: analysis.validation.error,
      localMission:
        mode === "mission"
          ? {
              id: activeMission.id,
              answer: missionAnswer,
              check: missionCheck,
            }
          : null,
    }),
    [
      activeMission.id,
      analysis.derivative,
      analysis.family.kind,
      analysis.roots,
      analysis.signIntervals,
      analysis.tangent,
      analysis.validation.error,
      analysis.variation,
      expression,
      extrema,
      missionAnswer,
      missionCheck,
      missionItem?.mission.id,
      mode,
      table.rows,
    ],
  );

  function handlePresetSelect(preset: FunctionExplorerPreset) {
    setPresetId(preset.id);
    setExpression(preset.expression);
    setTangentX(getDefaultTangentX(preset.xDomain));
  }

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame lab-page lab-tool-page">
        <StudyHeader
          eyebrow="Math Lab"
          title="مختبر الدوال"
          subtitle="استكشف الدالة كرسم وقيم وجذور وإشارة ومشتقة وتغيرات، مع تمييز واضح بين النتائج الدقيقة والتقريبية."
          actions={
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full px-5"
            >
              <Link href={STUDENT_LAB_ROUTE}>
                <ArrowRight size={17} strokeWidth={2.1} />
                المختبر
              </Link>
            </Button>
          }
          meta={[
            { label: "النسخة", value: "Functions Lab v2" },
            { label: "النمط", value: mode === "mission" ? "BAC Mission" : "Explore" },
            { label: "العائلة", value: analysis.family.label },
            ...(missionItem
              ? [{ label: "المهمة", value: missionItem.mission.title }]
              : []),
          ]}
        />

        <ActiveLabMissionPanel
          missionItem={missionItem}
          resultJson={missionResultJson}
        />

        <div className="lab-mode-strip">
          <div>
            <p className="page-kicker">Mode</p>
            <h2>حرية التجريب أو مهمة BAC موجهة</h2>
          </div>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(value) => {
              if (value === "explore" || value === "mission") {
                setMode(value);
              }
            }}
            variant="outline"
            size="sm"
            className="lab-mode-toggle"
          >
            <ToggleGroupItem value="explore">Explore</ToggleGroupItem>
            <ToggleGroupItem value="mission">BAC Mission</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="lab-workspace lab-function-workspace">
          <aside className="lab-control-panel">
            <div className="lab-control-panel-head">
              <span className="lab-panel-icon" aria-hidden="true">
                <Sigma size={22} strokeWidth={2.1} />
              </span>
              <div>
                <p className="page-kicker">العبارة</p>
                <h2>اختر مثالاً أو اكتب دالتك</h2>
              </div>
            </div>

            <div className="lab-preset-grid">
              {functionExplorerPresets.map((preset) => (
                <SelectionCard
                  key={preset.id}
                  type="button"
                  active={preset.id === presetId}
                  className="min-h-20 content-start rounded-2xl p-3"
                  onClick={() => handlePresetSelect(preset)}
                >
                  <strong>{preset.title}</strong>
                  <span dir="ltr">{preset.expression}</span>
                </SelectionCard>
              ))}
            </div>

            <label className="lab-input-field">
              <span>f(x)</span>
              <Input
                dir="ltr"
                value={expression}
                onChange={(event) => setExpression(event.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="x^2 - 4*x + 3"
              />
            </label>

            <label className="lab-input-field">
              <span>نقطة المماس a</span>
              <Input
                dir="ltr"
                type="number"
                step="0.5"
                value={tangentX}
                onChange={(event) => setTangentX(Number(event.target.value))}
              />
            </label>

            <Button
              type="button"
              variant={gridEnabled ? "secondary" : "outline"}
              className="h-10 rounded-full px-4"
              onClick={() => setGridEnabled((value) => !value)}
            >
              <Grid3X3 data-icon="inline-start" strokeWidth={2.1} />
              <span>الشبكة</span>
            </Button>

            <div className="lab-note">
              <span>قاعدة الثقة</span>
              <p>
                الدقيق يأتي من عائلات BAC المدعومة. التقريبي يأتي من الرسم
                والحساب العددي. غير المتاح يعني أن المختبر لا يدّعي برهاناً.
              </p>
            </div>
          </aside>

          <div className="lab-result-panel">
            <section className="lab-graph-panel">
              <div className="lab-panel-head-row">
                <div>
                  <p className="page-kicker">Graph</p>
                  <h2>المنحنى البياني</h2>
                </div>
                <StudyBadge tone={analysis.validation.error ? "warning" : "success"}>
                  {analysis.validation.error ? "تحقق من العبارة" : "جاهز للرسم"}
                </StudyBadge>
              </div>

              {analysis.validation.error ? (
                <div className="lab-empty-graph">
                  <strong>{analysis.validation.error}</strong>
                  <span>استخدم x والعمليات الأساسية مثل + - * / ^.</span>
                </div>
              ) : (
                <FormulaGraphPlot
                  data={{
                    title: `f(x) = ${analysis.validation.expression}`,
                    xDomain: selectedPreset.xDomain,
                    yDomain: selectedPreset.yDomain,
                    grid: gridEnabled,
                    curves: [
                      {
                        fn: analysis.validation.expression,
                        color: "#14b8a6",
                      },
                    ],
                  }}
                />
              )}
            </section>

            {mode === "mission" ? (
              <section className="function-mission-board">
                <div className="lab-panel-head-row">
                  <div>
                    <p className="page-kicker">BAC Mission</p>
                    <h2>{activeMission.title}</h2>
                  </div>
                  <StudyBadge tone="accent">موجه</StudyBadge>
                </div>

                <div className="function-mission-tabs">
                  {localMissions.map((mission) => (
                    <Button
                      key={mission.id}
                      type="button"
                      variant={
                        mission.id === activeMissionId ? "secondary" : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setActiveMissionId(mission.id);
                        setMissionAnswer("");
                      }}
                    >
                      {mission.title}
                    </Button>
                  ))}
                </div>

                <p>{activeMission.goal}</p>

                <div className="function-mission-checks">
                  <article>
                    <ListChecks size={18} strokeWidth={2.1} />
                    <div>
                      <strong>خطأ BAC شائع</strong>
                      <span>{activeMission.mistake}</span>
                    </div>
                  </article>
                  {activeMission.checks.map((check) => (
                    <article key={check}>
                      <CheckCircle2 size={18} strokeWidth={2.1} />
                      <div>
                        <strong>Exit check</strong>
                        <span>{check}</span>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="function-mission-answer">
                  <label className="lab-input-field">
                    <span>إجابتك</span>
                    <Input
                      dir="ltr"
                      value={missionAnswer}
                      onChange={(event) => setMissionAnswer(event.target.value)}
                      placeholder={
                        activeMission.id === "roots"
                          ? "1 ; 3"
                          : activeMission.id === "sign"
                            ? "+ 0 - 0 +"
                            : "decreasing ; increasing"
                      }
                    />
                  </label>

                  {missionCheck ? (
                    <div
                      className={`function-mission-feedback status-${missionCheck.status}`}
                    >
                      <StudyBadge
                        tone={
                          missionCheck.status === "correct"
                            ? "success"
                            : missionCheck.status === "unsupported"
                              ? "warning"
                              : "danger"
                        }
                        size="sm"
                      >
                        {missionCheck.status === "correct"
                          ? "صحيح"
                          : missionCheck.status === "unsupported"
                            ? "غير متاح"
                            : "راجع"}
                      </StudyBadge>
                      <p>{missionCheck.feedback}</p>
                      {missionCheck.expected ? (
                        <small dir="ltr">Expected: {missionCheck.expected}</small>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="function-fact-grid">
              <article className="lab-insight-card function-fact-card">
                <div className="function-fact-head">
                  <div>
                    <p className="page-kicker">Roots</p>
                    <h3>حلول f(x)=0</h3>
                  </div>
                  <ConfidenceBadge confidence={analysis.roots.confidence} />
                </div>
                {analysis.roots.value?.length ? (
                  <div className="lab-chip-row" dir="ltr">
                    {analysis.roots.value.map((root) => (
                      <span key={root}>{root}</span>
                    ))}
                  </div>
                ) : (
                  <p>{analysis.roots.reason ?? "لا توجد جذور داخل التحليل الحالي."}</p>
                )}
                <small>Oy: f(0) = {formatPoint(analysis.yIntercept.value)}</small>
              </article>

              <article className="lab-insight-card function-fact-card">
                <div className="function-fact-head">
                  <div>
                    <p className="page-kicker">Sign</p>
                    <h3>جدول الإشارة</h3>
                  </div>
                  <ConfidenceBadge
                    confidence={analysis.signIntervals.confidence}
                  />
                </div>
                {analysis.signIntervals.value ? (
                  <div className="function-sign-table">
                    {analysis.signIntervals.value.map((entry) => (
                      <div key={`${entry.kind}-${entry.label}`}>
                        <span dir="ltr">{entry.label}</span>
                        <strong>{getFunctionSignLabel(entry.sign)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{analysis.signIntervals.reason}</p>
                )}
              </article>

              <article className="lab-insight-card function-fact-card">
                <div className="function-fact-head">
                  <div>
                    <p className="page-kicker">Derivative</p>
                    <h3>المشتقة والمماس</h3>
                  </div>
                  <ConfidenceBadge confidence={analysis.derivative.confidence} />
                </div>
                {analysis.derivative.value ? (
                  <div className="function-math-stack" dir="ltr">
                    <span>{`f'(x) = ${analysis.derivative.value.expression}`}</span>
                    <span>
                      {`f'(${tangentX}) = ${formatPoint(
                        analysis.derivative.value.valueAtTangent,
                      )}`}
                    </span>
                    <span>{analysis.tangent.value?.equation ?? "—"}</span>
                  </div>
                ) : (
                  <p>{analysis.derivative.reason}</p>
                )}
              </article>

              <article className="lab-insight-card function-fact-card">
                <div className="function-fact-head">
                  <div>
                    <p className="page-kicker">Variation</p>
                    <h3>جدول التغيرات</h3>
                  </div>
                  <ConfidenceBadge confidence={analysis.variation.confidence} />
                </div>
                {analysis.variation.value ? (
                  <div className="function-variation-table">
                    {analysis.variation.value.map((entry) => (
                      <div key={`${entry.label}-${entry.direction}`}>
                        <span dir="ltr">{entry.label}</span>
                        <strong>
                          <TrendingUp size={15} strokeWidth={2.1} />
                          {getFunctionVariationDirectionLabel(entry.direction)}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{analysis.variation.reason}</p>
                )}
              </article>
            </section>

            <section className="lab-table-panel">
              <div className="lab-panel-head-row">
                <div>
                  <p className="page-kicker">Table</p>
                  <h2>جدول قيم سريع</h2>
                </div>
                {table.error ? (
                  <StudyBadge tone="warning">غير متاح</StudyBadge>
                ) : (
                  <StudyBadge tone="brand">{table.rows.length} قيم</StudyBadge>
                )}
              </div>
              <div className="lab-value-table" dir="ltr">
                <div className="lab-value-row head">
                  <span>x</span>
                  <span>f(x)</span>
                </div>
                {table.rows.map((row) => (
                  <div key={row.x} className="lab-value-row">
                    <span>{row.x}</span>
                    <span>{row.y === null ? "—" : row.y}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="function-bac-note">
              <Activity size={18} strokeWidth={2.1} />
              <p>
                في التدريب، استعمل الجذور لبناء الإشارة، واستعمل إشارة المشتقة
                لبناء التغيرات. إذا ظهرت شارة &quot;تقريبي&quot;، فهي ملاحظة
                بصرية وليست برهاناً نهائياً.
              </p>
            </section>
          </div>
        </div>
      </section>
    </StudyShell>
  );
}
