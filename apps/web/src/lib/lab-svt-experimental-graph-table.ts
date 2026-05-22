import type {
  SvtExperimentalExpectedReading,
  SvtExperimentalGraphSeries,
  SvtExperimentalGraphTablePreset,
  SvtExperimentalGraphTableResult,
  SvtExperimentalObservationItem,
  SvtExperimentalReadingAnswer,
} from "@bac-bank/contracts/lab";
import {
  parseSvtExperimentalGraphTablePreset,
  parseSvtExperimentalGraphTableResult,
} from "@bac-bank/contracts/lab";
import {
  evaluateDocumentReasoning,
} from "@/lib/lab-document-reasoning-engine";
import {
  findGraphExtrema,
  getGraphSeries,
  interpolateGraphYAtX,
  estimateGraphSlopeAtX,
  type LabGraphModel,
} from "@/lib/lab-graph-engine";
import {
  evaluateLabTableCells,
  type LabTableCellValue,
} from "@/lib/lab-table-engine";

export type SvtExperimentalGraphTableAnswer = {
  readings: SvtExperimentalReadingAnswer[];
  selectedObservationIds: string[];
  conclusion: string;
};

export type SvtExperimentalReadingEvaluation = {
  id: string;
  label: string;
  expectedValue: number | null;
  actualValue: LabTableCellValue;
  tolerance: number;
  passed: boolean;
};

export type SvtExperimentalGraphTableEvaluation = {
  passed: boolean;
  readingsPassed: boolean;
  observationsPassed: boolean;
  conclusionPassed: boolean;
  selectedRequiredObservationCount: number;
  requiredObservationCount: number;
  selectedObservationCount: number;
  missingObservationIds: string[];
  missingObservationItems: SvtExperimentalObservationItem[];
  missingKeywords: string[];
  missingReadingIds: string[];
  readingEvaluations: SvtExperimentalReadingEvaluation[];
};

export type SvtExperimentalGraphInsight = {
  seriesId: string;
  title: string;
  minimum: { x: number; y: number } | null;
  maximum: { x: number; y: number } | null;
  sampleSlope: number | null;
};

const DEFAULT_READING_TOLERANCE = 0.35;

export const svtExperimentalGraphTablePresets: SvtExperimentalGraphTablePreset[] =
  [
    {
      id: "glucobay-alpha-glucosidase",
      title: "Glucobay ونشاط α غلوكوزيداز",
      subtitle: "قراءة منحنيين تجريبيين لتفسير أثر دواء على نشاط إنزيم.",
      bacContext:
        "نمط BAC متكرر في وحدة الإنزيمات: مقارنة منحنيين بوجود/غياب مثبط، قراءة قيمة قصوى، ثم ربط النتيجة بالموقع الفعال ونسبة السكر في الدم.",
      sourceHint:
        "مستوحى من SVT SE 2016: نشاط α غلوكوزيداز بوجود وغياب Glucobay.",
      protocol: {
        title: "بروتوكول مختصر",
        steps: [
          "نحضّر أوساطا بتراكيز متزايدة من السكريات قليلة التعدد.",
          "نقيس نشاط إنزيم α غلوكوزيداز في غياب الدواء ثم في وجود Glucobay.",
          "نقارن سرعة النشاط ونستنتج أثر الدواء على تشكل الغلوكوز.",
        ],
      },
      table: {
        title: "جدول النتائج التجريبية",
        columns: [
          { id: "substrate", label: "تركيز الركيزة", unit: "mmol" },
          { id: "without", label: "النشاط دون Glucobay", unit: "و.ت" },
          { id: "with", label: "النشاط مع Glucobay", unit: "و.ت" },
        ],
        rows: [
          {
            id: "s0",
            label: "0 mmol",
            cells: { substrate: 0, without: 0, with: 0 },
          },
          {
            id: "s5",
            label: "5 mmol",
            cells: { substrate: 5, without: 4, with: 1.2 },
          },
          {
            id: "s10",
            label: "10 mmol",
            cells: { substrate: 10, without: 7, with: 2.2 },
          },
          {
            id: "s15",
            label: "15 mmol",
            cells: { substrate: 15, without: 8.5, with: 3.2 },
          },
          {
            id: "s25",
            label: "25 mmol",
            cells: { substrate: 25, without: 9, with: 4.2 },
          },
          {
            id: "s30",
            label: "30 mmol",
            cells: { substrate: 30, without: 9, with: 4.4 },
          },
        ],
      },
      graph: {
        title: "تغير نشاط الإنزيم حسب تركيز الركيزة",
        xAxis: { label: "تركيز الركيزة", unit: "mmol", min: 0, max: 30 },
        yAxis: { label: "نشاط الإنزيم", unit: "و.ت", min: 0, max: 10 },
        series: [
          {
            id: "without-glucobay",
            title: "دون Glucobay",
            kind: "line",
            points: [
              { x: 0, y: 0 },
              { x: 5, y: 4 },
              { x: 10, y: 7 },
              { x: 15, y: 8.5 },
              { x: 25, y: 9 },
              { x: 30, y: 9 },
            ],
          },
          {
            id: "with-glucobay",
            title: "مع Glucobay",
            kind: "line",
            points: [
              { x: 0, y: 0 },
              { x: 5, y: 1.2 },
              { x: 10, y: 2.2 },
              { x: 15, y: 3.2 },
              { x: 25, y: 4.2 },
              { x: 30, y: 4.4 },
            ],
          },
        ],
      },
      expectedReadings: [
        {
          id: "without-activity-25",
          label: "النشاط دون الدواء عند 25 mmol",
          source: "graph",
          seriesId: "without-glucobay",
          x: 25,
          expectedValue: 9,
          tolerance: 0.4,
          unit: "و.ت",
        },
        {
          id: "with-activity-25",
          label: "النشاط مع Glucobay عند 25 mmol",
          source: "graph",
          seriesId: "with-glucobay",
          x: 25,
          expectedValue: 4.2,
          tolerance: 0.45,
          unit: "و.ت",
        },
      ],
      observationItems: [
        {
          id: "without-rises-plateaus",
          label: "في غياب Glucobay يرتفع النشاط بسرعة ثم يبلغ قيمة أعظمية تقارب 9.",
          detail: "هذا يحدد السلوك المرجعي للإنزيم قبل إضافة الدواء.",
          kind: "trend",
        },
        {
          id: "glucobay-lowers-activity",
          label: "في وجود Glucobay يبقى نشاط α غلوكوزيداز أقل في كل التراكيز.",
          detail: "المقارنة بين المنحنيين هي الدليل المباشر على التثبيط.",
          kind: "comparison",
        },
        {
          id: "active-site-competition",
          label: "تشابه Glucobay مع الركيزة يسمح له بمنافسة الركيزة على الموقع الفعال.",
          detail: "هذه الفكرة تفسر لماذا ينخفض تشكل الغلوكوز في الدم.",
          kind: "mechanism",
        },
        {
          id: "glucobay-raises-activity",
          label: "Glucobay يزيد نشاط الإنزيم ويزيد إنتاج الغلوكوز.",
          detail: "اختيار مضلل: المنحنى مع الدواء أدنى من المنحنى المرجعي.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "استنتج أثر Glucobay على النشاط الإنزيمي.",
        task: "اقرأ القيمتين عند 25 mmol، اختر الملاحظات الصحيحة، ثم اكتب استنتاجا يربط الدواء بنشاط α غلوكوزيداز ونسبة السكر في الدم.",
        requiredObservationIds: [
          "without-rises-plateaus",
          "glucobay-lowers-activity",
          "active-site-competition",
        ],
        requiredConclusionKeywords: [
          "Glucobay",
          "α غلوكوزيداز",
          "يثبط",
          "الموقع الفعال",
          "الغلوكوز",
        ],
        scaffoldPhrases: [
          "عند 25 mmol يبلغ نشاط الإنزيم دون الدواء حوالي 9 و.ت.",
          "وجود Glucobay يخفض نشاط α غلوكوزيداز مقارنة بالشاهد.",
          "أستنتج أن الدواء يثبط الإنزيم فينقص تشكل الغلوكوز.",
        ],
      },
    },
    {
      id: "enzyme-ph-optimum",
      title: "pH والنشاط الإنزيمي",
      subtitle: "تحديد pH الأمثل وربط تغير النشاط ببنية الموقع الفعال.",
      bacContext:
        "نمط BAC متكرر: منحنى نشاط إنزيمي بدلالة pH، قراءة القيمة المثلى، ثم تفسير أثر الحموضة على البنية الفراغية والموقع الفعال.",
      sourceHint:
        "مستوحى من SVT SE 2008: تأثير pH على النشاط الإنزيمي.",
      protocol: {
        title: "بروتوكول مختصر",
        steps: [
          "نحضر أوساطا لها قيم pH مختلفة مع نفس كمية الإنزيم والركيزة.",
          "نقيس سرعة النشاط الإنزيمي في كل وسط.",
          "نحدد الوسط الأمثل ونفسر انخفاض النشاط في الأوساط الشديدة الحموضة أو القاعدية.",
        ],
      },
      table: {
        title: "نشاط الإنزيم حسب pH الوسط",
        columns: [
          { id: "ph", label: "pH الوسط" },
          { id: "activity", label: "النشاط الإنزيمي", unit: "%" },
        ],
        rows: [
          { id: "ph3", label: "pH 3", cells: { ph: 3, activity: 12 } },
          { id: "ph5", label: "pH 5", cells: { ph: 5, activity: 58 } },
          { id: "ph7", label: "pH 7", cells: { ph: 7, activity: 100 } },
          { id: "ph9", label: "pH 9", cells: { ph: 9, activity: 52 } },
          { id: "ph11", label: "pH 11", cells: { ph: 11, activity: 9 } },
        ],
      },
      graph: {
        title: "تأثير pH على سرعة النشاط",
        xAxis: { label: "pH", min: 3, max: 11 },
        yAxis: { label: "النشاط النسبي", unit: "%", min: 0, max: 100 },
        series: [
          {
            id: "ph-activity",
            title: "نشاط الإنزيم",
            kind: "line",
            points: [
              { x: 3, y: 12 },
              { x: 5, y: 58 },
              { x: 7, y: 100 },
              { x: 9, y: 52 },
              { x: 11, y: 9 },
            ],
          },
        ],
      },
      expectedReadings: [
        {
          id: "optimum-ph",
          label: "قيمة pH التي يكون فيها النشاط أعظميا",
          source: "table",
          rowId: "ph7",
          columnId: "ph",
          expectedValue: 7,
          tolerance: 0.1,
        },
        {
          id: "max-activity",
          label: "النشاط النسبي عند pH = 7",
          source: "graph",
          seriesId: "ph-activity",
          x: 7,
          expectedValue: 100,
          tolerance: 3,
          unit: "%",
        },
      ],
      observationItems: [
        {
          id: "ph7-optimum",
          label: "النشاط أعظمي عند pH = 7.",
          detail: "هذه هي القراءة المركزية للمنحنى.",
          kind: "trend",
        },
        {
          id: "activity-drops-extremes",
          label: "ينخفض النشاط في الوسط الحمضي القوي والقاعدي القوي.",
          detail: "المقارنة مع pH 7 تكشف أثر شروط الوسط.",
          kind: "comparison",
        },
        {
          id: "ph-active-site-charges",
          label: "تغير pH يؤثر في شحنات أحماض أمينية في الموقع الفعال.",
          detail: "هذا يفسر فقدان التكامل بين الإنزيم والركيزة.",
          kind: "mechanism",
        },
        {
          id: "all-ph-equal",
          label: "يبقى نشاط الإنزيم ثابتا مهما تغير pH.",
          detail: "اختيار مضلل: القيم التجريبية تتغير بوضوح.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "حدد pH الأمثل وفسر تغير النشاط.",
        task: "اقرأ pH الأمثل والنشاط الموافق، اختر الملاحظات الصحيحة، ثم اكتب استنتاجا يربط pH ببنية الموقع الفعال.",
        requiredObservationIds: [
          "ph7-optimum",
          "activity-drops-extremes",
          "ph-active-site-charges",
        ],
        requiredConclusionKeywords: [
          "pH",
          "7",
          "النشاط",
          "الموقع الفعال",
          "بنية",
        ],
        scaffoldPhrases: [
          "تبلغ سرعة النشاط قيمة أعظمية عند pH = 7.",
          "تنخفض سرعة النشاط في الأوساط الشديدة الحموضة أو القاعدية.",
          "أستنتج أن pH يؤثر في بنية الموقع الفعال وتكامله مع الركيزة.",
        ],
      },
    },
  ];

function toGraphModel(preset: SvtExperimentalGraphTablePreset): LabGraphModel {
  return {
    xAxis: preset.graph.xAxis,
    yAxis: preset.graph.yAxis,
    series: preset.graph.series,
  };
}

function readTableNumber(
  preset: SvtExperimentalGraphTablePreset,
  rowId: string | undefined,
  columnId: string | undefined,
) {
  const value = preset.table.rows.find((row) => row.id === rowId)?.cells[
    columnId ?? ""
  ];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function getSvtExperimentalWorkbenchPresetById(presetId: string) {
  return (
    svtExperimentalGraphTablePresets.find((preset) => preset.id === presetId) ??
    null
  );
}

export function getSvtExperimentalWorkbenchPreset(value: unknown) {
  if (!value) {
    return svtExperimentalGraphTablePresets[0];
  }

  try {
    return parseSvtExperimentalGraphTablePreset(value);
  } catch {
    return svtExperimentalGraphTablePresets[0];
  }
}

export function getSvtExperimentalGraphSeries(
  preset: SvtExperimentalGraphTablePreset,
  seriesId: string,
): SvtExperimentalGraphSeries | null {
  return getGraphSeries(toGraphModel(preset), seriesId) as
    | SvtExperimentalGraphSeries
    | null;
}

export function getSvtExperimentalExpectedReadingValue(
  preset: SvtExperimentalGraphTablePreset,
  reading: SvtExperimentalExpectedReading,
) {
  if (typeof reading.expectedValue === "number") {
    return reading.expectedValue;
  }

  if (reading.source === "table") {
    return readTableNumber(preset, reading.rowId, reading.columnId);
  }

  if (reading.seriesId && typeof reading.x === "number") {
    const series = getSvtExperimentalGraphSeries(preset, reading.seriesId);

    return series ? interpolateGraphYAtX(series, reading.x) : null;
  }

  return null;
}

export function getSvtExperimentalGraphInsights(
  preset: SvtExperimentalGraphTablePreset,
): SvtExperimentalGraphInsight[] {
  return preset.graph.series.map((series) => {
    const extrema = findGraphExtrema(series);
    const middlePoint = series.points[Math.floor(series.points.length / 2)];

    return {
      seriesId: series.id,
      title: series.title,
      minimum: extrema.minimum,
      maximum: extrema.maximum,
      sampleSlope: middlePoint
        ? estimateGraphSlopeAtX(series, middlePoint.x)
        : null,
    };
  });
}

export function makeSvtExperimentalInitialReadings(
  preset: SvtExperimentalGraphTablePreset,
): SvtExperimentalReadingAnswer[] {
  return preset.expectedReadings.map((reading) => ({
    id: reading.id,
    value: null,
  }));
}

export function updateSvtExperimentalReading(
  readings: SvtExperimentalReadingAnswer[],
  readingId: string,
  value: number | null,
) {
  const next = readings.some((reading) => reading.id === readingId)
    ? readings.map((reading) =>
        reading.id === readingId ? { ...reading, value } : reading,
      )
    : [...readings, { id: readingId, value }];

  return next;
}

export function toggleSvtExperimentalObservation(
  selectedObservationIds: string[],
  observationId: string,
) {
  return selectedObservationIds.includes(observationId)
    ? selectedObservationIds.filter((selectedId) => selectedId !== observationId)
    : [...selectedObservationIds, observationId];
}

export function evaluateSvtExperimentalWorkbenchAnswer(
  preset: SvtExperimentalGraphTablePreset,
  answer: SvtExperimentalGraphTableAnswer,
): SvtExperimentalGraphTableEvaluation {
  const expectedCells = preset.expectedReadings.map((reading) => ({
    rowId: "readings",
    columnId: reading.id,
    expectedValue: getSvtExperimentalExpectedReadingValue(preset, reading),
    tolerance: reading.tolerance ?? DEFAULT_READING_TOLERANCE,
  }));
  const answerCells = answer.readings.map((reading) => ({
    rowId: "readings",
    columnId: reading.id,
    value: reading.value,
  }));
  const tableEvaluation = evaluateLabTableCells(expectedCells, answerCells);
  const reasoningEvaluation = evaluateDocumentReasoning(
    {
      requiredEvidenceIds: preset.prompt.requiredObservationIds,
      requiredConclusionKeywords: preset.prompt.requiredConclusionKeywords,
    },
    {
      selectedEvidenceIds: answer.selectedObservationIds,
      conclusion: answer.conclusion,
    },
  );
  const readingEvaluations = tableEvaluation.cells.map((cell) => {
    const reading = preset.expectedReadings.find(
      (expectedReading) => expectedReading.id === cell.columnId,
    );

    return {
      id: cell.columnId,
      label: reading?.label ?? cell.columnId,
      expectedValue:
        typeof cell.expectedValue === "number" ? cell.expectedValue : null,
      actualValue: cell.actualValue,
      tolerance: reading?.tolerance ?? DEFAULT_READING_TOLERANCE,
      passed: cell.passed,
    };
  });
  const missingObservationItems = preset.observationItems.filter((item) =>
    reasoningEvaluation.missingEvidenceIds.includes(item.id),
  );

  return {
    passed: tableEvaluation.passed && reasoningEvaluation.passed,
    readingsPassed: tableEvaluation.passed,
    observationsPassed: reasoningEvaluation.missingEvidenceIds.length === 0,
    conclusionPassed: reasoningEvaluation.missingKeywords.length === 0,
    selectedRequiredObservationCount:
      reasoningEvaluation.selectedRequiredCount,
    requiredObservationCount: reasoningEvaluation.requiredEvidenceCount,
    selectedObservationCount: answer.selectedObservationIds.length,
    missingObservationIds: reasoningEvaluation.missingEvidenceIds,
    missingObservationItems,
    missingKeywords: reasoningEvaluation.missingKeywords,
    missingReadingIds: readingEvaluations
      .filter((reading) => !reading.passed)
      .map((reading) => reading.id),
    readingEvaluations,
  };
}

export function buildSvtExperimentalWorkbenchResult({
  missionId,
  preset,
  readings,
  selectedObservationIds,
  conclusion,
}: {
  missionId?: string | null;
  preset: SvtExperimentalGraphTablePreset;
  readings: SvtExperimentalReadingAnswer[];
  selectedObservationIds: string[];
  conclusion: string;
}): SvtExperimentalGraphTableResult {
  return parseSvtExperimentalGraphTableResult({
    tool: "svt-experimental-graph-table",
    missionId: missionId ?? null,
    presetId: preset.id,
    readings,
    selectedObservationIds,
    conclusion,
    evaluation: evaluateSvtExperimentalWorkbenchAnswer(preset, {
      readings,
      selectedObservationIds,
      conclusion,
    }),
  });
}
