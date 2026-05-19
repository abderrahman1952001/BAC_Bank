import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleGenAI, createPartFromText } from '@google/genai';
import type {
  StudyQuestionAiExplanationResponse,
  StudySupportStyle,
} from '@bac-bank/contracts/study';
import type { ExamHierarchyBlock } from '@bac-bank/contracts/study';
import {
  buildAiUsageEvent,
  resolveStudyQuestionAiExplanationConfig,
} from '../ai/ai-runtime';

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

type AiExplanationPayload = {
  summary?: string;
  steps?: string[];
  pitfalls?: string[];
  nextMove?: string | null;
};

@Injectable()
export class StudyQuestionAiExplanationService {
  private readonly logger = new Logger(StudyQuestionAiExplanationService.name);

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
    const config = resolveStudyQuestionAiExplanationConfig();

    if (!config.configured || !config.apiKey) {
      throw new ServiceUnavailableException(
        'AI explanation is not configured on the server.',
      );
    }

    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const prompt = this.buildPrompt(input);
    const startedAt = Date.now();
    let rawText: string | null = null;

    let response: Awaited<ReturnType<typeof ai.models.generateContent>>;

    try {
      response = await ai.models.generateContent({
        model: config.model,
        contents: [createPartFromText(prompt)],
        config: {
          systemInstruction: AI_EXPLANATION_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseJsonSchema: AI_EXPLANATION_RESPONSE_SCHEMA,
          temperature: 0.2,
          maxOutputTokens: config.maxOutputTokens,
        },
      });
    } catch {
      this.logUsage({
        config,
        prompt,
        rawText,
        startedAt,
        status: 'FAILED',
        errorCode: 'PROVIDER_ERROR',
      });
      throw new ServiceUnavailableException('AI explanation provider failed.');
    }

    rawText = response.text?.trim() ?? null;

    if (!rawText) {
      this.logUsage({
        config,
        prompt,
        rawText,
        startedAt,
        status: 'FAILED',
        errorCode: 'EMPTY_RESPONSE',
      });
      throw new ServiceUnavailableException(
        'AI explanation returned an empty response.',
      );
    }

    let parsed: AiExplanationPayload;

    try {
      parsed = JSON.parse(rawText) as AiExplanationPayload;
    } catch {
      this.logUsage({
        config,
        prompt,
        rawText,
        startedAt,
        status: 'FAILED',
        errorCode: 'INVALID_JSON',
      });
      throw new ServiceUnavailableException(
        'AI explanation returned an invalid response.',
      );
    }

    const result = {
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

    this.logUsage({
      config,
      prompt,
      rawText,
      startedAt,
      status: 'SUCCESS',
    });

    return result;
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

  private logUsage(input: {
    config: ReturnType<typeof resolveStudyQuestionAiExplanationConfig>;
    prompt: string;
    rawText: string | null;
    startedAt: number;
    status: 'SUCCESS' | 'FAILED';
    errorCode?: string;
  }) {
    this.logger.log(
      JSON.stringify(
        buildAiUsageEvent({
          feature: input.config.feature,
          provider: input.config.provider,
          model: input.config.model,
          status: input.status,
          inputText: input.prompt,
          outputText: input.rawText,
          latencyMs: Date.now() - input.startedAt,
          errorCode: input.errorCode,
        }),
      ),
    );
  }
}
