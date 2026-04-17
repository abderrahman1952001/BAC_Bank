import type {
  StudyQuestionDiagnosis,
  StudySessionResponse,
  StudySupportStyle,
} from "@/lib/study-api";
import type { StudyQuestionModel } from "@/lib/study-surface";

const LOGIC_HEAVY_SUBJECT_CODES = new Set([
  "MATHEMATICS",
  "PHYSICS",
  "NATURAL_SCIENCES",
  "MATH",
  "PHYS",
  "SCI",
]);

const CONTENT_HEAVY_SUBJECT_CODES = new Set([
  "HISTORY_GEOGRAPHY",
  "HISTORY",
  "GEOGRAPHY",
  "ISLAMIC_STUDIES",
  "HIST_GEO",
]);

const ESSAY_HEAVY_SUBJECT_CODES = new Set(["PHILOSOPHY", "ARABIC", "PHILO"]);

type StudyPedagogyActionId = "hint" | "method" | "solution";

export type StudyPedagogyAssistAction = {
  id: StudyPedagogyActionId;
  label: string;
  tone: "primary" | "secondary";
};

type StudyQuestionMethodGuidance = {
  title: string;
  summary: string;
  steps: string[];
};

type StudyPedagogyProfile = {
  assistTitle: string;
  assistCopy: string;
  hintActionLabel: string;
  methodActionLabel: string;
  weakPointStartLabel: string;
  diagnosisPromptTitle: string;
  assistActionOrder: StudyPedagogyActionId[];
  diagnosisLabels: Record<StudyQuestionDiagnosis, string>;
  buildMethodGuidance: (input: {
    question: StudyQuestionModel;
  }) => StudyQuestionMethodGuidance;
};

function buildTopicFragment(question: StudyQuestionModel) {
  const topicNames = question.topics.map((topic) => topic.name).slice(0, 2);
  return topicNames.length ? ` في ${topicNames.join(" و ")}` : "";
}

const STUDY_PEDAGOGY_PROFILES: Record<StudySupportStyle, StudyPedagogyProfile> = {
  GENERAL: {
    assistTitle: "قبل فتح الحل",
    assistCopy: "اختر خطوة افتتاحية قصيرة قبل كشف الحل الكامل.",
    hintActionLabel: "تلميح",
    methodActionLabel: "طريقة البدء",
    weakPointStartLabel: "ابدأ العلاج",
    diagnosisPromptTitle: "ما الذي عطّلك؟",
    assistActionOrder: ["hint", "method", "solution"],
    diagnosisLabels: {
      CONCEPT: "الفكرة",
      METHOD: "كيف تبدأ",
      CALCULATION: "التنفيذ",
      TIME_PRESSURE: "ضيق الوقت",
    },
    buildMethodGuidance: ({ question }) => ({
      title: "طريقة البدء",
      summary: `اختر خطوة افتتاحية قصيرة${buildTopicFragment(question)} قبل كشف الحل الكامل.`,
      steps: [
        "حدّد المطلوب بدقة.",
        "اكتب أول سطر يثبت اتجاهك.",
        "استخدم التلميح إذا توقفت ثم قارن.",
      ],
    }),
  },
  LOGIC_HEAVY: {
    assistTitle: "قبل كشف الحل",
    assistCopy: "ثبّت المعطيات والقاعدة أولاً، ثم افتح الحل الكامل فقط عند الحاجة.",
    hintActionLabel: "تلميح",
    methodActionLabel: "الطريقة",
    weakPointStartLabel: "ابدأ الحل الموجّه",
    diagnosisPromptTitle: "ما الذي عطّلك؟",
    assistActionOrder: ["hint", "method", "solution"],
    diagnosisLabels: {
      CONCEPT: "الفكرة",
      METHOD: "الطريقة",
      CALCULATION: "التنفيذ / الدقة",
      TIME_PRESSURE: "ضيق الوقت",
    },
    buildMethodGuidance: ({ question }) => ({
      title: "طريقة الانطلاق",
      summary: `ثبّت قاعدة الحل${buildTopicFragment(question)} قبل كشف الجواب الكامل.`,
      steps: [
        "اكتب المعطيات والمطلوب بدقة.",
        "حدّد القاعدة أو الخاصية أو النظرية المناسبة.",
        "نفّذ خطوة واحدة فقط ثم قارنها بالتلميح.",
      ],
    }),
  },
  CONTENT_HEAVY: {
    assistTitle: "قبل فتح التصحيح",
    assistCopy:
      "جرّب استرجاع العناصر الأساسية بنفسك أولاً، ثم قارنها بالتصحيح عند الحاجة.",
    hintActionLabel: "مفتاح",
    methodActionLabel: "خطة الاسترجاع",
    weakPointStartLabel: "ابدأ الاسترجاع الموجّه",
    diagnosisPromptTitle: "أين كان التعثّر؟",
    assistActionOrder: ["method", "hint", "solution"],
    diagnosisLabels: {
      CONCEPT: "المعلومة",
      METHOD: "تنظيم التذكر",
      CALCULATION: "التفاصيل",
      TIME_PRESSURE: "ضيق الوقت",
    },
    buildMethodGuidance: ({ question }) => ({
      title: "خطة الاسترجاع",
      summary: `ابنِ الإجابة من معلومات مرتبة${buildTopicFragment(question)} لا من قراءة الحل مباشرة.`,
      steps: [
        "استخرج الفكرة أو الحدث أو المصطلح الأساسي.",
        "حوّل الإجابة إلى 3 عناصر قصيرة قبل التوسع.",
        "تحقق من الكلمات المفتاحية أو التواريخ أو العلاقات الأساسية.",
      ],
    }),
  },
  ESSAY_HEAVY: {
    assistTitle: "قبل مقارنة الإجابة بالنموذج",
    assistCopy:
      "ثبّت البناء والمنهجية أولاً، ثم افتح الجواب الكامل للمقارنة فقط عند الحاجة.",
    hintActionLabel: "مدخل",
    methodActionLabel: "المنهجية",
    weakPointStartLabel: "ابدأ البناء الموجّه",
    diagnosisPromptTitle: "أين كان الخلل؟",
    assistActionOrder: ["method", "hint", "solution"],
    diagnosisLabels: {
      CONCEPT: "الفكرة",
      METHOD: "البناء المنهجي",
      CALCULATION: "التعبير / التفصيل",
      TIME_PRESSURE: "ضيق الوقت",
    },
    buildMethodGuidance: ({ question }) => ({
      title: "منهجية الإجابة",
      summary: `ابدأ ببنية واضحة${buildTopicFragment(question)} قبل مقارنة الحل الكامل.`,
      steps: [
        "حدّد الإشكال أو الفكرة المركزية.",
        "رتّب موقفك أو حججك أو الأمثلة قبل الكتابة الطويلة.",
        "راجع التسلسل: مقدمة، بناء، خاتمة أو خلاصة.",
      ],
    }),
  },
};

export function resolveSessionSupportStyle(
  session: Pick<StudySessionResponse, "pedagogy" | "exercises"> | null,
): StudySupportStyle {
  if (session?.pedagogy?.supportStyle) {
    return session.pedagogy.supportStyle;
  }

  const subjectCode = session?.exercises[0]?.exam.subject.code?.trim().toUpperCase();

  if (!subjectCode) {
    return "GENERAL";
  }

  if (LOGIC_HEAVY_SUBJECT_CODES.has(subjectCode)) {
    return "LOGIC_HEAVY";
  }

  if (CONTENT_HEAVY_SUBJECT_CODES.has(subjectCode)) {
    return "CONTENT_HEAVY";
  }

  if (ESSAY_HEAVY_SUBJECT_CODES.has(subjectCode)) {
    return "ESSAY_HEAVY";
  }

  return "GENERAL";
}

export function getStudyPedagogyProfile(supportStyle: StudySupportStyle) {
  return STUDY_PEDAGOGY_PROFILES[supportStyle];
}

export function buildPedagogyAssistActions(input: {
  supportStyle: StudySupportStyle;
  hasHints: boolean;
  hasMethodGuidance: boolean;
  canRevealSolution: boolean;
}): StudyPedagogyAssistAction[] {
  const profile = getStudyPedagogyProfile(input.supportStyle);
  const actions: StudyPedagogyAssistAction[] = [];

  for (const actionId of profile.assistActionOrder) {
    if (actionId === "hint" && !input.hasHints) {
      continue;
    }

    if (actionId === "solution" && !input.canRevealSolution) {
      continue;
    }

    if (actionId === "method" && !input.hasMethodGuidance) {
      continue;
    }

    switch (actionId) {
      case "hint":
        actions.push({
          id: actionId,
          label: profile.hintActionLabel,
          tone: "secondary",
        });
        break;
      case "method":
        actions.push({
          id: actionId,
          label: profile.methodActionLabel,
          tone: "secondary",
        });
        break;
      case "solution":
        actions.push({
          id: actionId,
          label: "الحل الكامل",
          tone: "primary",
        });
        break;
    }
  }

  return actions;
}

export function getMethodActionLabel(supportStyle: StudySupportStyle) {
  return getStudyPedagogyProfile(supportStyle).methodActionLabel;
}

export function buildMethodGuidance(input: {
  supportStyle: StudySupportStyle;
  question: StudyQuestionModel;
}) {
  return getStudyPedagogyProfile(input.supportStyle).buildMethodGuidance({
    question: input.question,
  });
}

export function getDiagnosisPromptTitle(supportStyle: StudySupportStyle) {
  return getStudyPedagogyProfile(supportStyle).diagnosisPromptTitle;
}

export function formatStudyQuestionDiagnosisForSupportStyle(input: {
  diagnosis: StudyQuestionDiagnosis;
  supportStyle: StudySupportStyle;
}) {
  return getStudyPedagogyProfile(input.supportStyle).diagnosisLabels[input.diagnosis];
}

export function getWeakPointIntroStartLabel(supportStyle: StudySupportStyle) {
  return getStudyPedagogyProfile(supportStyle).weakPointStartLabel;
}

export function shouldOfferMethodGuidance(input: {
  supportStyle: StudySupportStyle;
  question: StudyQuestionModel;
}) {
  if (input.question.hintBlocks.length > 0) {
    return false;
  }

  const promptTextLength = input.question.promptBlocks.reduce(
    (total, block) => total + (block.textValue?.trim().length ?? 0),
    0,
  );

  if (input.supportStyle === "ESSAY_HEAVY") {
    return input.question.points >= 3 || promptTextLength >= 120;
  }

  if (input.supportStyle === "CONTENT_HEAVY") {
    return input.question.points >= 4 || promptTextLength >= 140;
  }

  return (
    input.question.points >= 4 ||
    input.question.depth > 0 ||
    promptTextLength >= 160
  );
}

export function shouldCollectDiagnosis(
  diagnosis: StudyQuestionDiagnosis | null | undefined,
  reflection: "MISSED" | "HARD" | "MEDIUM" | "EASY" | null | undefined,
) {
  return reflection === "MISSED" || diagnosis != null;
}
