import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const svtEnergyMetabolismWorkbenchPresets: StructuredLabWorkbenchPreset[] = [
  {
    id: "photosynthesis-light-oxygen-release",
    title: "التركيب الضوئي وانطلاق O₂",
    subtitle: "قراءة تأثير شدة الإضاءة على انطلاق O₂ وربطه بتثبيت CO₂.",
    bacContext:
      "في BAC تظهر وثائق تبادل الغازات عند النبات الأخضر مع منحنى O₂ أو CO₂، ثم يطلب تفسير علاقة الضوء بالتركيب الضوئي.",
    sourceHint:
      "مستند إلى محور التحولات الطاقوية والتركيب الضوئي: وثيقة تجربة، جدول قياسات، ومنحنى مشبع.",
    instrument: {
      subjectLabel: "SVT Lab",
      title: "ورشة الطاقة الخلوية",
      iconKind: "graph",
    },
    sourceDocuments: [
      {
        id: "photosynthesis-protocol",
        title: "بروتوكول التجربة",
        bullets: [
          "نقيس كمية O₂ المنطلقة من نبات مائي عند شدات إضاءة مختلفة.",
          "تزداد كمية O₂ مع الإضاءة ثم تبلغ قيمة شبه ثابتة.",
          "انطلاق O₂ دليل على حدوث المرحلة الضوئية للتركيب الضوئي.",
        ],
      },
    ],
    table: {
      title: "قياسات انطلاق O₂",
      columns: [
        { id: "item", label: "العنصر" },
        { id: "value", label: "القيمة" },
        { id: "unit", label: "الوحدة" },
      ],
      rows: [
        { id: "rate-200", label: "200 lux", cells: { item: "O₂ عند 200 lux", value: null, unit: "u.a" } },
        { id: "rate-600", label: "600 lux", cells: { item: "O₂ عند 600 lux", value: null, unit: "u.a" } },
        { id: "threshold", label: "عتبة", cells: { item: "بداية التشبع", value: null, unit: "lux" } },
      ],
    },
    graph: {
      title: "تأثير شدة الإضاءة على انطلاق O₂",
      xAxis: { label: "شدة الإضاءة", unit: "lux", min: 0, max: 800 },
      yAxis: { label: "O₂ المنطلق", unit: "u.a", min: 0, max: 45 },
      series: [
        {
          id: "oxygen",
          title: "O₂",
          kind: "line",
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 8 },
            { x: 200, y: 18 },
            { x: 400, y: 33 },
            { x: 600, y: 40 },
            { x: 800, y: 41 },
          ],
        },
      ],
    },
    measurements: [
      { id: "plateau-rate", label: "قيمة التشبع التقريبية", unitHint: "u.a" },
    ],
    expectedCells: [
      { rowId: "rate-200", columnId: "value", expectedValue: 18, tolerance: 2 },
      { rowId: "rate-600", columnId: "value", expectedValue: 40, tolerance: 2 },
      { rowId: "threshold", columnId: "value", expectedValue: 600, tolerance: 80 },
    ],
    expectedMeasurements: [
      {
        id: "plateau-rate",
        expected: { value: 40, unit: "u.a" },
        tolerance: 3,
        acceptedUnits: ["ua", "وحدة"],
      },
    ],
    observationItems: [
      {
        id: "oxygen-rises-with-light",
        label: "يزداد انطلاق O₂ بزيادة شدة الإضاءة في البداية.",
        detail: "الإضاءة عامل محدد للمرحلة الضوئية.",
        kind: "trend",
      },
      {
        id: "oxygen-plateau",
        label: "بعد حوالي 600 lux يبلغ المنحنى قيمة شبه ثابتة.",
        detail: "عامل آخر غير الضوء يصبح محددا.",
        kind: "graph",
      },
      {
        id: "photosynthesis-link",
        label: "انطلاق O₂ يدل على تركيب ضوئي وتحرير الأكسجين.",
        detail: "يربط المعطى التجريبي بالآلية الحيوية.",
        kind: "mechanism",
      },
      {
        id: "dark-produces-oxygen",
        label: "في الظلام يكون انطلاق O₂ أعظميا.",
        detail: "اختيار مضلل: المنحنى يبدأ من قيمة شبه معدومة.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "حلل منحنى انطلاق O₂.",
      task: "اقرأ القيم من الجدول والمنحنى، اختر الملاحظات الصحيحة، ثم اكتب استنتاجا عن دور الضوء.",
      requiredObservationIds: [
        "oxygen-rises-with-light",
        "oxygen-plateau",
        "photosynthesis-link",
      ],
      requiredConclusionKeywords: ["O₂", "إضاءة", "تركيب", "تشبع"],
      scaffoldPhrases: [
        "يزداد انطلاق O₂ عندما ترتفع شدة الإضاءة.",
        "يصبح المنحنى شبه ثابت ابتداء من حوالي 600 lux.",
        "أستنتج أن الضوء عامل محدد للتركيب الضوئي إلى أن يظهر عامل محدد آخر.",
      ],
    },
  },
  {
    id: "respiration-fermentation-atp-yield",
    title: "تنفس وتخمر ومردود ATP",
    subtitle: "مقارنة مردود الطاقة بين التنفس الخلوي والتخمر.",
    bacContext:
      "في التحولات الطاقوية تقارن مواضيع BAC بين وثائق وجود O₂، استهلاك الغلوكوز، وكمية ATP الناتجة.",
    sourceHint:
      "مستوحى من جداول مقارنة التنفس والتخمر واستنتاج اختلاف المردود الطاقوي.",
    instrument: {
      subjectLabel: "SVT Lab",
      title: "ورشة الطاقة الخلوية",
      iconKind: "graph",
    },
    sourceDocuments: [
      {
        id: "metabolism-doc",
        title: "معطيات المقارنة",
        bullets: [
          "في وجود O₂ تستعمل الخلية التنفس الخلوي.",
          "في غياب O₂ تلجأ الخلية إلى التخمر.",
          "التنفس يعطي مردودا طاقويا أكبر من التخمر.",
        ],
      },
    ],
    table: {
      title: "مقارنة المسارين",
      columns: [
        { id: "condition", label: "الشرط" },
        { id: "pathway", label: "المسار" },
        { id: "atp", label: "ATP/glucose" },
      ],
      rows: [
        { id: "with-o2", label: "وجود O₂", cells: { condition: "وجود O₂", pathway: null, atp: null } },
        { id: "without-o2", label: "غياب O₂", cells: { condition: "غياب O₂", pathway: null, atp: null } },
        { id: "yield-ratio", label: "المقارنة", cells: { condition: "مردود الطاقة", pathway: "تنفس/تخمر", atp: null } },
      ],
    },
    expectedCells: [
      { rowId: "with-o2", columnId: "pathway", expectedValue: "تنفس", acceptedText: ["تنفس خلوي", "respiration"] },
      { rowId: "with-o2", columnId: "atp", expectedValue: 36, tolerance: 2, acceptedText: ["36 ATP"] },
      { rowId: "without-o2", columnId: "pathway", expectedValue: "تخمر", acceptedText: ["fermentation"] },
      { rowId: "without-o2", columnId: "atp", expectedValue: 2, tolerance: 0.5, acceptedText: ["2 ATP"] },
      { rowId: "yield-ratio", columnId: "atp", expectedValue: 18, tolerance: 2, acceptedText: ["18 مرة"] },
    ],
    observationItems: [
      {
        id: "oxygen-respiration",
        label: "وجود O₂ يسمح بالتنفس الخلوي.",
        detail: "الأكسجين مستقبل نهائي في المسار الهوائي.",
        kind: "condition",
      },
      {
        id: "no-oxygen-fermentation",
        label: "غياب O₂ يوجه الخلية نحو التخمر.",
        detail: "التخمر يسمح باستمرار إنتاج ATP ضعيف.",
        kind: "condition",
      },
      {
        id: "respiration-better-yield",
        label: "مردود التنفس أكبر بكثير: حوالي 36 ATP مقابل 2 ATP.",
        detail: "المقارنة الكمية هي قلب السؤال.",
        kind: "comparison",
      },
      {
        id: "fermentation-best-yield",
        label: "التخمر يعطي مردودا أكبر من التنفس.",
        detail: "اختيار مضلل: الجدول يعطي العكس.",
        kind: "distractor",
      },
    ],
    prompt: {
      title: "قارن التنفس والتخمر من حيث المردود.",
      task: "أكمل الجدول، اختر الملاحظات الصحيحة، ثم اكتب خلاصة تربط O₂ بمردود ATP.",
      requiredObservationIds: [
        "oxygen-respiration",
        "no-oxygen-fermentation",
        "respiration-better-yield",
      ],
      requiredConclusionKeywords: ["O₂", "تنفس", "تخمر", "ATP", "مردود"],
      scaffoldPhrases: [
        "في وجود O₂ يحدث التنفس الخلوي وينتج مردود ATP مرتفع.",
        "في غياب O₂ يحدث التخمر بمردود ضعيف.",
        "أستنتج أن التنفس أكثر فعالية طاقويا من التخمر.",
      ],
    },
  },
];

export function getSvtEnergyMetabolismWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(
    value,
    svtEnergyMetabolismWorkbenchPresets[0],
  );
}
