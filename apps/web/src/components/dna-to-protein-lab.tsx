"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Dna, Shuffle } from "lucide-react";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectionCard } from "@/components/ui/selection-card";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  analyzeDnaSequence,
  buildMutatedDnaSequence,
  compareDnaAnalyses,
  dnaToProteinPresets,
  type AminoAcidEntry,
  type DnaAnalysis,
  type DnaBase,
  type MutationKind,
  type SequenceCodon,
} from "@/lib/lab-dna-to-protein";
import { STUDENT_LAB_ROUTE } from "@/lib/student-routes";

const mutationKindLabels: Record<MutationKind, string> = {
  substitution: "استبدال",
  insertion: "إضافة",
  deletion: "حذف",
};

const baseOptions: DnaBase[] = ["A", "C", "G", "T"];

function CodonRow({
  title,
  codons,
}: {
  title: string;
  codons: SequenceCodon[];
}) {
  return (
    <div className="dna-pipeline-row">
      <span>{title}</span>
      <div className="dna-codon-strip" dir="ltr">
        {codons.length ? (
          codons.map((codon) => (
            <small
              key={`${title}:${codon.index}:${codon.value}`}
              className={codon.complete ? "" : "incomplete"}
            >
              {codon.value}
            </small>
          ))
        ) : (
          <small className="incomplete">---</small>
        )}
      </div>
    </div>
  );
}

function AminoAcidRow({ aminoAcids }: { aminoAcids: AminoAcidEntry[] }) {
  return (
    <div className="dna-pipeline-row">
      <span>الأحماض الأمينية</span>
      <div className="dna-codon-strip" dir="ltr">
        {aminoAcids.length ? (
          aminoAcids.map((aminoAcid, index) => (
            <small
              key={`${aminoAcid.codon}:${index}`}
              className={aminoAcid.isStop ? "stop" : ""}
              title={aminoAcid.name}
            >
              {aminoAcid.shortCode}
            </small>
          ))
        ) : (
          <small className="incomplete">---</small>
        )}
      </div>
    </div>
  );
}

function DnaPipeline({
  title,
  analysis,
}: {
  title: string;
  analysis: DnaAnalysis;
}) {
  return (
    <article className="dna-pipeline-card">
      <div className="dna-pipeline-head">
        <div>
          <p className="page-kicker">{title}</p>
          <h3 dir="ltr">{analysis.normalizedSequence || "DNA"}</h3>
        </div>
        <StudyBadge tone={analysis.warnings.length ? "warning" : "success"}>
          {analysis.warnings.length ? "تنبيه" : "صالح"}
        </StudyBadge>
      </div>
      <CodonRow title="DNA" codons={analysis.dnaCodons} />
      <CodonRow title="mRNA" codons={analysis.mrnaCodons} />
      <AminoAcidRow aminoAcids={analysis.aminoAcids} />
      {analysis.warnings.length ? (
        <div className="dna-warning-list">
          {analysis.warnings.map((warning) => (
            <small key={warning}>{warning}</small>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function DnaToProteinLab() {
  const [presetId, setPresetId] = useState(dnaToProteinPresets[0].id);
  const [sequence, setSequence] = useState(dnaToProteinPresets[0].sequence);
  const [mutationKind, setMutationKind] =
    useState<MutationKind>("substitution");
  const [mutationIndex, setMutationIndex] = useState(4);
  const [mutationBase, setMutationBase] = useState<DnaBase>("C");

  const selectedPreset =
    dnaToProteinPresets.find((preset) => preset.id === presetId) ??
    dnaToProteinPresets[0];
  const original = useMemo(() => analyzeDnaSequence(sequence), [sequence]);
  const boundedMutationIndex = Math.max(
    0,
    Math.min(
      mutationIndex,
      mutationKind === "insertion"
        ? original.normalizedSequence.length
        : Math.max(0, original.normalizedSequence.length - 1),
    ),
  );
  const mutation = useMemo(
    () =>
      buildMutatedDnaSequence(original.normalizedSequence, {
        kind: mutationKind,
        index: boundedMutationIndex,
        base: mutationBase,
      }),
    [boundedMutationIndex, mutationBase, mutationKind, original.normalizedSequence],
  );
  const mutated = useMemo(
    () => analyzeDnaSequence(mutation.sequence),
    [mutation.sequence],
  );
  const comparison = useMemo(
    () => compareDnaAnalyses(original, mutated, mutationKind),
    [mutationKind, mutated, original],
  );

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame lab-page lab-tool-page">
        <StudyHeader
          eyebrow="SVT Lab"
          title="من DNA إلى بروتين"
          subtitle="تابع السلسلة من DNA إلى mRNA ثم إلى الأحماض الأمينية، وجرّب كيف تغير الطفرة النتيجة."
          actions={
            <Button asChild variant="outline" className="h-11 rounded-full px-5">
              <Link href={STUDENT_LAB_ROUTE}>
                <ArrowRight size={17} strokeWidth={2.1} />
                المختبر
              </Link>
            </Button>
          }
          meta={[
            { label: "الخطوات", value: "DNA → mRNA → Protein" },
            { label: "الطفرات", value: "3 أنواع" },
          ]}
        />

        <div className="lab-workspace dna-workspace">
          <aside className="lab-control-panel">
            <div className="lab-control-panel-head">
              <span className="lab-panel-icon" aria-hidden="true">
                <Dna size={22} strokeWidth={2.1} />
              </span>
              <div>
                <p className="page-kicker">السلسلة الأصلية</p>
                <h2>اكتب DNA coding sequence</h2>
              </div>
            </div>

            <div className="lab-preset-grid">
              {dnaToProteinPresets.map((preset) => (
                <SelectionCard
                  key={preset.id}
                  type="button"
                  active={preset.id === presetId}
                  className="min-h-20 content-start rounded-2xl p-3"
                  onClick={() => {
                    setPresetId(preset.id);
                    setSequence(preset.sequence);
                  }}
                >
                  <strong>{preset.title}</strong>
                  <span dir="ltr">{preset.sequence}</span>
                </SelectionCard>
              ))}
            </div>

            <label className="lab-input-field">
              <span>DNA</span>
              <Textarea
                dir="ltr"
                value={sequence}
                onChange={(event) => setSequence(event.target.value)}
                spellCheck={false}
                rows={4}
              />
            </label>

            <div className="lab-note">
              <span>مثال مختار</span>
              <p>{selectedPreset.note}</p>
            </div>

            <div className="dna-mutation-controls">
              <div className="lab-control-panel-head compact">
                <span className="lab-panel-icon" aria-hidden="true">
                  <Shuffle size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <p className="page-kicker">Mutation</p>
                  <h2>جرّب طفرة</h2>
                </div>
              </div>

              <label className="lab-input-field">
                <span>النوع</span>
                <NativeSelect
                  value={mutationKind}
                  onChange={(event) =>
                    setMutationKind(event.target.value as MutationKind)
                  }
                >
                  {Object.entries(mutationKindLabels).map(([kind, label]) => (
                    <option key={kind} value={kind}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </label>

              <label className="lab-input-field">
                <span>الموضع</span>
                <Input
                  dir="ltr"
                  type="number"
                  min={0}
                  max={Math.max(0, original.normalizedSequence.length)}
                  value={boundedMutationIndex}
                  onChange={(event) =>
                    setMutationIndex(Number(event.target.value) || 0)
                  }
                />
              </label>

              {mutationKind !== "deletion" ? (
                <ToggleGroup
                  type="single"
                  value={mutationBase}
                  onValueChange={(value) => {
                    if (baseOptions.includes(value as DnaBase)) {
                      setMutationBase(value as DnaBase);
                    }
                  }}
                  variant="outline"
                  className="flex flex-wrap justify-start gap-2"
                  aria-label="اختيار القاعدة"
                >
                  {baseOptions.map((base) => (
                    <ToggleGroupItem
                      key={base}
                      value={base}
                      className="h-9 min-w-11 rounded-xl px-3 font-bold"
                    >
                      {base}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              ) : null}
            </div>
          </aside>

          <div className="lab-result-panel">
            <section className="dna-comparison-banner">
              <StudyBadge
                tone={
                  comparison.kind === "NO_VISIBLE_CHANGE"
                    ? "success"
                    : comparison.kind === "FRAMESHIFT" ||
                        comparison.kind === "PREMATURE_STOP"
                      ? "warning"
                      : "accent"
                }
              >
                {comparison.title}
              </StudyBadge>
              <h2>{comparison.title}</h2>
              <p>{comparison.explanation}</p>
            </section>

            <div className="dna-pipeline-grid">
              <DnaPipeline title="الأصلية" analysis={original} />
              <DnaPipeline title="بعد الطفرة" analysis={mutated} />
            </div>

            <section className="lab-note dna-bac-note">
              <span>استعمال BAC</span>
              <p>
                في الوثائق، لا تقف عند تغيير القاعدة فقط. اربط: تغير الثلاثية
                ثم الحمض الأميني ثم البنية والوظيفة المحتملة للبروتين.
              </p>
            </section>
          </div>
        </div>
      </section>
    </StudyShell>
  );
}
