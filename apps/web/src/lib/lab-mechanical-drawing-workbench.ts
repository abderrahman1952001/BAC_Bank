import type { StructuredLabWorkbenchPreset } from "@bac-bank/contracts/lab";
import { getStructuredLabWorkbenchPreset } from "@/lib/lab-structured-workbench";

export const mechanicalDrawingWorkbenchPresets: StructuredLabWorkbenchPreset[] =
  [
    {
      id: "assembly-nomenclature-reading",
      title: "قراءة رسم تجميعي ومدونة قطع",
      subtitle: "ربط أرقام القطع بالتعيين والمادة داخل مجموعة ميكانيكية.",
      bacContext:
        "في مواضيع الهندسة الميكانيكية يقرأ الطالب الرسم التجميعي، يحدد القطع، ثم يكمل جدول المدونة أو يستعمله في الأسئلة اللاحقة.",
      sourceHint:
        "مستند إلى أنماط BAC: رسم تجميعي لمحرك-مخفض، جدول مدونة، وأرقام قطع.",
      instrument: {
        subjectLabel: "Mechanical Tech Lab",
        title: "ورشة الرسم الميكانيكي",
        iconKind: "technical",
      },
      sourceDocuments: [
        {
          id: "assembly-note",
          title: "مقتطف من ملف تقني",
          bullets: [
            "الرسم التجميعي يبين صندوقا، عمودا، ترسا، ومحملين.",
            "جدول المدونة يربط رقم القطعة بالتعيين والمادة والعدد.",
            "القطع الدوارة غالبا: عمود، ترس، ومحمل.",
          ],
        },
      ],
      table: {
        title: "جدول المدونة",
        columns: [
          { id: "mark", label: "رقم" },
          { id: "qty", label: "عدد" },
          { id: "designation", label: "تعيين" },
          { id: "material", label: "مادة" },
        ],
        rows: [
          {
            id: "08",
            label: "08",
            cells: { mark: "08", qty: 1, designation: null, material: null },
          },
          {
            id: "12",
            label: "12",
            cells: { mark: "12", qty: 2, designation: null, material: null },
          },
          {
            id: "13",
            label: "13",
            cells: { mark: "13", qty: 1, designation: null, material: null },
          },
          {
            id: "22",
            label: "22",
            cells: { mark: "22", qty: 1, designation: null, material: null },
          },
        ],
      },
      diagram: {
        title: "رسم تجميعي مبسط",
        description: "سمّ مناطق الرسم قبل إكمال جدول المدونة.",
        targets: [
          {
            id: "shaft",
            label: "A",
            x: 46,
            y: 50,
            expectedLabel: "عمود",
            acceptedLabels: ["shaft", "arbre"],
          },
          {
            id: "bearing",
            label: "B",
            x: 30,
            y: 50,
            expectedLabel: "محمل",
            acceptedLabels: ["roulement", "bearing"],
          },
          {
            id: "gear",
            label: "C",
            x: 62,
            y: 45,
            expectedLabel: "ترس",
            acceptedLabels: ["pignon", "gear"],
          },
          {
            id: "housing",
            label: "D",
            x: 50,
            y: 72,
            expectedLabel: "علبة",
            acceptedLabels: ["carter", "boitier"],
          },
        ],
      },
      expectedCells: [
        {
          rowId: "08",
          columnId: "designation",
          expectedValue: "عمود",
          acceptedText: ["arbre", "محور"],
        },
        { rowId: "08", columnId: "material", expectedValue: "فولاذ" },
        {
          rowId: "12",
          columnId: "designation",
          expectedValue: "محمل",
          acceptedText: ["roulement"],
        },
        {
          rowId: "13",
          columnId: "designation",
          expectedValue: "علبة",
          acceptedText: ["carter"],
        },
        {
          rowId: "22",
          columnId: "designation",
          expectedValue: "ترس",
          acceptedText: ["pignon"],
        },
      ],
      observationItems: [
        {
          id: "nomenclature-links-mark",
          label: "رقم القطعة في الرسم يقود إلى نفس الرقم في جدول المدونة.",
          detail: "هذه هي طريقة التعرف على التعيين والعدد والمادة.",
          kind: "drawing",
        },
        {
          id: "bearings-support-shaft",
          label: "المحامل تسند العمود وتسمح بالدوران.",
          detail: "تظهر عادة حول العمود داخل العلبة.",
          kind: "function",
        },
        {
          id: "housing-fixed",
          label: "العلبة قطعة ثابتة تحمل عناصر المجموعة.",
          detail: "لا تعامل كقطعة دوارة.",
          kind: "assembly",
        },
        {
          id: "all-parts-rotate",
          label: "كل القطع في الرسم التجميعي دوارة.",
          detail: "اختيار مضلل: العلبة والسدادات ثابتة غالبا.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "اقرأ الرسم التجميعي والمدونة.",
        task: "سمّ القطع الأساسية، أكمل جدول المدونة، ثم اكتب خلاصة دور المدونة.",
        requiredObservationIds: [
          "nomenclature-links-mark",
          "bearings-support-shaft",
          "housing-fixed",
        ],
        requiredConclusionKeywords: ["رقم", "مدونة", "محمل", "عمود"],
        scaffoldPhrases: [
          "نبحث عن رقم القطعة في الرسم ثم نرجع إلى المدونة.",
          "المحمل يسند العمود ويسمح بدورانه.",
          "العلبة تحمل المجموعة ولا تعد قطعة دوارة.",
        ],
      },
    },
    {
      id: "definition-drawing-section-tolerances",
      title: "قراءة رسم تعريفي ومقطع",
      subtitle: "تحديد الأبعاد الوظيفية، السماحات، الخشونة، والمقطع.",
      bacContext:
        "أسئلة BAC الميكانيك تطلب غالبا إتمام رسم تعريفي جزئي مباشرة على ورقة الإجابة: أقطار وظيفية، سماحات هندسية، خشونة، ومقطع A-A.",
      sourceHint:
        "مستند إلى أسئلة دراسة تعريفية جزئية للعمود/العلبة في مواضيع 2022 وأشباهها.",
      instrument: {
        subjectLabel: "Mechanical Tech Lab",
        title: "ورشة الرسم الميكانيكي",
        iconKind: "technical",
      },
      sourceDocuments: [
        {
          id: "definition-note",
          title: "تعليمات الرسم التعريفي",
          bullets: [
            "السطح الأسطواني العامل يحمل قطرا وظيفيا.",
            "المقطع A-A يكشف الشكل الداخلي ولا يغير مقياس الأبعاد.",
            "رمز الخشونة يربط حالة السطح بعملية التشغيل.",
          ],
        },
      ],
      table: {
        title: "ملف الرسم التعريفي",
        columns: [
          { id: "feature", label: "العنصر" },
          { id: "answer", label: "الإتمام" },
          { id: "reason", label: "الدلالة" },
        ],
        rows: [
          {
            id: "diameter",
            label: "قطر وظيفي",
            cells: { feature: "قطر", answer: null, reason: null },
          },
          {
            id: "tolerance",
            label: "سماحة",
            cells: { feature: "سماحة هندسية", answer: null, reason: null },
          },
          {
            id: "roughness",
            label: "خشونة",
            cells: { feature: "حالة السطح", answer: null, reason: null },
          },
          {
            id: "section",
            label: "مقطع",
            cells: { feature: "مقطع", answer: null, reason: null },
          },
        ],
      },
      diagram: {
        title: "رسم تعريفي جزئي",
        description: "سمّ الرموز الفنية في الرسم.",
        targets: [
          {
            id: "diameter-symbol",
            label: "1",
            x: 34,
            y: 42,
            expectedLabel: "Ø25 h7",
            acceptedLabels: ["قطر وظيفي", "diametre"],
          },
          {
            id: "datum",
            label: "2",
            x: 52,
            y: 62,
            expectedLabel: "مرجع A",
            acceptedLabels: ["A", "datum"],
          },
          {
            id: "roughness-symbol",
            label: "3",
            x: 68,
            y: 36,
            expectedLabel: "Ra 1.6",
            acceptedLabels: ["خشونة"],
          },
          {
            id: "section-view",
            label: "4",
            x: 78,
            y: 66,
            expectedLabel: "مقطع A-A",
            acceptedLabels: ["A-A", "coupe"],
          },
        ],
      },
      expectedCells: [
        {
          rowId: "diameter",
          columnId: "answer",
          expectedValue: "Ø25 h7",
          acceptedText: ["25 h7", "قطر"],
        },
        {
          rowId: "diameter",
          columnId: "reason",
          expectedValue: "توجيه المحمل",
          acceptedText: ["سطح وظيفي"],
        },
        {
          rowId: "tolerance",
          columnId: "answer",
          expectedValue: "توازي",
          acceptedText: ["موازاة", "parallelisme"],
        },
        {
          rowId: "roughness",
          columnId: "answer",
          expectedValue: "Ra 1.6",
          acceptedText: ["خشونة"],
        },
        {
          rowId: "section",
          columnId: "answer",
          expectedValue: "مقطع A-A",
          acceptedText: ["coupe A-A", "A-A"],
        },
      ],
      observationItems: [
        {
          id: "functional-diameter-is-controlled",
          label: "القطر الوظيفي يحمل سماحة لأنه يركب مع قطعة أخرى.",
          detail: "سطح تركيب المحمل مثال واضح.",
          kind: "dimension",
        },
        {
          id: "section-reveals-interior",
          label: "المقطع A-A يكشف الشكل الداخلي على مستوى القطع.",
          detail: "المقطع ليس منظرا خارجيا عاديا.",
          kind: "section",
        },
        {
          id: "roughness-linked-to-machining",
          label: "رمز الخشونة يصف حالة السطح المطلوبة بعد التشغيل.",
          detail: "يستعمل لاحقا في اختيار العملية أو المراقبة.",
          kind: "surface",
        },
        {
          id: "roughness-is-material",
          label: "Ra 1.6 هو نوع مادة القطعة.",
          detail: "اختيار مضلل: Ra قيمة خشونة.",
          kind: "distractor",
        },
      ],
      prompt: {
        title: "أتمم قراءة الرسم التعريفي.",
        task: "سمّ الرموز، أكمل جدول الإتمام، ثم اشرح وظيفة القطر والمقطع والخشونة.",
        requiredObservationIds: [
          "functional-diameter-is-controlled",
          "section-reveals-interior",
          "roughness-linked-to-machining",
        ],
        requiredConclusionKeywords: ["قطر", "سماحة", "خشونة", "مقطع"],
        scaffoldPhrases: [
          "القطر الوظيفي يضبط سطح تركيب قطعة أخرى.",
          "المقطع A-A يكشف الشكل الداخلي.",
          "الخشونة Ra تحدد حالة السطح المطلوبة.",
        ],
      },
    },
  ];

export function getMechanicalDrawingWorkbenchPreset(value: unknown) {
  return getStructuredLabWorkbenchPreset(
    value,
    mechanicalDrawingWorkbenchPresets[0],
  );
}
