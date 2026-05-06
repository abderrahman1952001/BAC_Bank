"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Grid3X3, Sigma } from "lucide-react";
import { FormulaGraphPlot } from "@/components/formula-graph-plot";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionCard } from "@/components/ui/selection-card";
import {
  buildFunctionValueTable,
  detectApproximateRoots,
  functionExplorerPresets,
  getFunctionExplorerPreset,
  validateFunctionExpression,
  type FunctionExplorerPreset,
} from "@/lib/lab-function-explorer";
import { STUDENT_LAB_ROUTE } from "@/lib/student-routes";

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

export function FunctionExplorerLab() {
  const [presetId, setPresetId] =
    useState<FunctionExplorerPreset["id"]>("quadratic");
  const [expression, setExpression] = useState(
    getFunctionExplorerPreset("quadratic")?.expression ?? "x^2",
  );
  const [gridEnabled, setGridEnabled] = useState(true);

  const selectedPreset =
    getFunctionExplorerPreset(presetId) ?? functionExplorerPresets[0];
  const validation = useMemo(
    () => validateFunctionExpression(expression),
    [expression],
  );
  const table = useMemo(
    () =>
      buildFunctionValueTable(
        expression,
        buildTableSamples(selectedPreset.xDomain),
      ),
    [expression, selectedPreset.xDomain],
  );
  const roots = useMemo(
    () => detectApproximateRoots(expression, selectedPreset.xDomain),
    [expression, selectedPreset.xDomain],
  );

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame lab-page lab-tool-page">
        <StudyHeader
          eyebrow="Math Lab"
          title="مستكشف الدوال"
          subtitle="اكتب عبارة دالة، شاهد المنحنى، ثم اربط الجذور وجدول القيم بما يطلبه تمرين BAC."
          actions={
            <Button asChild variant="outline" className="h-11 rounded-full px-5">
              <Link href={STUDENT_LAB_ROUTE}>
                <ArrowRight size={17} strokeWidth={2.1} />
                المختبر
              </Link>
            </Button>
          }
          meta={[
            { label: "النسخة", value: "دوال أساسية" },
            { label: "المحرك", value: "function-plot" },
          ]}
        />

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
                  onClick={() => {
                    setPresetId(preset.id);
                    setExpression(preset.expression);
                  }}
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
              <span>استعمال BAC</span>
              <p>
                الجذور تعني حلول المعادلة f(x)=0، وجدول القيم يساعدك على
                قراءة تغير الإشارة قبل البرهان أو التدريب.
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
                <StudyBadge tone={validation.error ? "warning" : "success"}>
                  {validation.error ? "تحقق من العبارة" : "جاهز للرسم"}
                </StudyBadge>
              </div>

              {validation.error ? (
                <div className="lab-empty-graph">
                  <strong>{validation.error}</strong>
                  <span>استخدم x والعمليات الأساسية مثل + - * / ^.</span>
                </div>
              ) : (
                <FormulaGraphPlot
                  data={{
                    title: `f(x) = ${validation.expression}`,
                    xDomain: selectedPreset.xDomain,
                    yDomain: selectedPreset.yDomain,
                    grid: gridEnabled,
                    curves: [
                      {
                        fn: validation.expression,
                        color: "#14b8a6",
                      },
                    ],
                  }}
                />
              )}
            </section>

            <section className="lab-insight-grid">
              <article className="lab-insight-card">
                <p className="page-kicker">الجذور التقريبية</p>
                <h3>f(x)=0</h3>
                {roots.length ? (
                  <div className="lab-chip-row" dir="ltr">
                    {roots.map((root) => (
                      <span key={root}>{root}</span>
                    ))}
                  </div>
                ) : (
                  <p>لم تظهر جذور موثوقة داخل المجال الحالي.</p>
                )}
              </article>

              <article className="lab-insight-card">
                <p className="page-kicker">المثال الحالي</p>
                <h3>{selectedPreset.title}</h3>
                <p>{selectedPreset.note}</p>
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
          </div>
        </div>
      </section>
    </StudyShell>
  );
}
