import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI, createPartFromText } from '@google/genai';
import type {
  StudyQuestionAiExplanationResponse,
  StudySupportStyle,
} from '@bac-bank/contracts/study';
import type { ExamHierarchyBlock } from '@bac-bank/contracts/study';

const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

const AI_EXPLANATION_SYSTEM_INSTRUCTION = `
You are a BAC study coach.
Write in Arabic.
Your job is to explain the official answer in a calm, practical, student-friendly way.
Do not invent facts that are not supported by the question, hints, rubric, or official answer.
Do not restate the full official answer verbatim.
Stay concise and actionable.
`;

const AI_EXPLANATION_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['summary', 'steps', 'pitfalls', 'nextMove'],
  properties: {
    summary: {
      type: 'string',
    },
    steps: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    pitfalls: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    nextMove: {
      type: ['string', 'null'],
    },
  },
} as const;

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatBlocks(blocks: ExamHierarchyBlock[]) {
  const text = blocks
    .map((block) => normalizeOptionalString(block.textValue))
    .filter((value): value is string => value !== null)
    .join('\n')
    .trim();

  return text || 'غير متوفر نص واضح.';
}

function formatTopics(
  topics: Array<{
    code: string;
    name: string;
  }>,
) {
  return topics.length
    ? topics.map((topic) => topic.name).join('، ')
    : 'غير محدد';
}

@Injectable()
export class StudyQuestionAiExplanationService {
  async generate(input: {
    questionId: string;
    subjectName: string;
    supportStyle: StudySupportStyle;
    questionLabel: string;
    topics: Array<{
      code: string;
      name: string;
    }>;
    promptBlocks: ExamHierarchyBlock[];
    hintBlocks: ExamHierarchyBlock[];
    solutionBlocks: ExamHierarchyBlock[];
    rubricBlocks: ExamHierarchyBlock[];
  }): Promise<StudyQuestionAiExplanationResponse> {
    const apiKey =
      normalizeOptionalString(process.env.GEMINI_API_KEY) ??
      normalizeOptionalString(process.env.GOOGLE_API_KEY);

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'AI explanation is not configured on the server.',
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model:
        normalizeOptionalString(process.env.GEMINI_MODEL) ??
        DEFAULT_GEMINI_MODEL,
      contents: [createPartFromText(this.buildPrompt(input))],
      config: {
        systemInstruction: AI_EXPLANATION_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseJsonSchema: AI_EXPLANATION_RESPONSE_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 1600,
      },
    });

    const rawText = response.text?.trim();

    if (!rawText) {
      throw new ServiceUnavailableException(
        'AI explanation returned an empty response.',
      );
    }

    const parsed = JSON.parse(rawText) as {
      summary?: string;
      steps?: string[];
      pitfalls?: string[];
      nextMove?: string | null;
    };

    return {
      questionId: input.questionId,
      generatedAt: new Date().toISOString(),
      summary:
        normalizeOptionalString(parsed.summary) ?? 'تعذر توليد شرح مختصر.',
      steps: Array.isArray(parsed.steps)
        ? parsed.steps
            .map((item) => normalizeOptionalString(item))
            .filter((item): item is string => item !== null)
            .slice(0, 4)
        : [],
      pitfalls: Array.isArray(parsed.pitfalls)
        ? parsed.pitfalls
            .map((item) => normalizeOptionalString(item))
            .filter((item): item is string => item !== null)
            .slice(0, 3)
        : [],
      nextMove: normalizeOptionalString(parsed.nextMove),
    };
  }

  private buildPrompt(input: {
    subjectName: string;
    supportStyle: StudySupportStyle;
    questionLabel: string;
    topics: Array<{
      code: string;
      name: string;
    }>;
    promptBlocks: ExamHierarchyBlock[];
    hintBlocks: ExamHierarchyBlock[];
    solutionBlocks: ExamHierarchyBlock[];
    rubricBlocks: ExamHierarchyBlock[];
  }) {
    return [
      `المادة: ${input.subjectName}`,
      `نمط الدعم: ${input.supportStyle}`,
      `السؤال: ${input.questionLabel}`,
      `المحاور: ${formatTopics(input.topics)}`,
      '',
      'نص السؤال:',
      formatBlocks(input.promptBlocks),
      '',
      'التلميحات الرسمية:',
      formatBlocks(input.hintBlocks),
      '',
      'الحل الرسمي:',
      formatBlocks(input.solutionBlocks),
      '',
      'ملاحظات التصحيح أو السلم:',
      formatBlocks(input.rubricBlocks),
      '',
      'أعد شرحاً موجزاً يبني على الحل الرسمي بصيغة الطالب، ثم أعط:',
      '1. summary: لماذا يسير الحل بهذا الاتجاه.',
      '2. steps: 2 إلى 4 خطوات ذهنية أو عملية مختصرة.',
      '3. pitfalls: 0 إلى 3 أخطاء شائعة أو نقاط تعثر.',
      '4. nextMove: خطوة صغيرة ينصح الطالب بها بعد الفهم.',
      '',
      'التزم بالعربية الواضحة وتجنب الحشو.',
    ].join('\n');
  }
}
