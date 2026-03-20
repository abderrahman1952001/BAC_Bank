'use client';

import katex from 'katex';
import Image, { ImageLoaderProps } from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppNavbar } from '@/components/app-navbar';
import {
  FormulaGraphJson,
  FormulaGraphPlot,
} from '@/components/formula-graph-plot';
import {
  ProbabilityTreeJson,
  ProbabilityTreeSvg,
} from '@/components/probability-tree-svg';
import {
  InlineEditTarget,
  SujetInlineEditor,
} from '@/components/sujet-inline-editor';
import { getClientRole } from '@/lib/client-auth';
import {
  API_BASE_URL,
  BlockRole,
  ExamHierarchyBlock,
  ExamHierarchyNode,
  ExamResponse,
  fetchJson,
  formatSessionType,
  toAssetUrl,
} from '@/lib/qbank';

const INLINE_MATH_REGEX = /\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$|`([^`\n]+?)`/g;

function passthroughLoader({ src }: ImageLoaderProps): string {
  return src;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringField(value: unknown, field: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = value[field];
  return typeof candidate === 'string' ? candidate : null;
}

function splitQuestionSegments(content: string | null): string[] {
  if (!content || !content.trim()) {
    return ['لا يوجد نص مباشر لهذا السؤال حالياً.'];
  }

  const normalized = content.replace(/\r/g, '').trim();
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs;
  }

  const lines = normalized
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  if (lines.length > 1 && lines.length <= 8) {
    return lines;
  }

  return [normalized];
}

function blocksByRoles(
  blocks: ExamHierarchyBlock[],
  roles: BlockRole[],
): ExamHierarchyBlock[] {
  return blocks
    .filter((block) => roles.includes(block.role))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

function resolveImageUrl(block: ExamHierarchyBlock): string | null {
  return block.media?.url ?? readStringField(block.data, 'url');
}

function resolveImageCaption(block: ExamHierarchyBlock): string | null {
  return (
    readStringField(block.data, 'caption') ??
    readStringField(block.media?.metadata, 'caption')
  );
}

function renderKatexToHtml(latex: string, displayMode: boolean): string {
  return katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    strict: 'ignore',
  });
}

function normalizeMathDelimiters(text: string): string {
  return text
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, value: string) => `$$${value}$$`)
    .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, value: string) => `$${value}$`);
}

function renderTextWithMath(
  text: string,
  keyPrefix: string,
  fallback: 'pre' | 'span' = 'pre',
) {
  const normalized = normalizeMathDelimiters(text);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let matchIndex = 0;
  let hasMath = false;

  for (const match of normalized.matchAll(INLINE_MATH_REGEX)) {
    const token = match[0];
    const matchStart = match.index ?? -1;

    if (matchStart < 0) {
      continue;
    }

    if (matchStart > cursor) {
      parts.push(
        <span key={`${keyPrefix}-txt-${matchIndex}`} className="math-text-chunk">
          {normalized.slice(cursor, matchStart)}
        </span>,
      );
    }

    const displayLatex = token.startsWith('$$') ? match[1] ?? '' : null;
    const inlineLatex =
      token.startsWith('$') && !token.startsWith('$$') ? match[2] ?? '' : null;
    const backtickLatex = token.startsWith('`') ? match[3] ?? '' : null;

    if (displayLatex !== null) {
      hasMath = true;
      parts.push(
        <span
          key={`${keyPrefix}-disp-${matchIndex}`}
          className="math-display"
          dangerouslySetInnerHTML={{
            __html: renderKatexToHtml(displayLatex.trim(), true),
          }}
        />,
      );
    } else if (inlineLatex !== null) {
      hasMath = true;
      parts.push(
        <span
          key={`${keyPrefix}-inl-${matchIndex}`}
          className="math-inline"
          dangerouslySetInnerHTML={{
            __html: renderKatexToHtml(inlineLatex.trim(), false),
          }}
        />,
      );
    } else if (backtickLatex !== null) {
      hasMath = true;
      parts.push(
        <span
          key={`${keyPrefix}-bt-${matchIndex}`}
          className="math-inline"
          dangerouslySetInnerHTML={{
            __html: renderKatexToHtml(backtickLatex.trim(), false),
          }}
        />,
      );
    }

    cursor = matchStart + token.length;
    matchIndex += 1;
  }

  if (cursor < normalized.length) {
    parts.push(
      <span key={`${keyPrefix}-tail`} className="math-text-chunk">
        {normalized.slice(cursor)}
      </span>,
    );
  }

  if (!hasMath) {
    if (fallback === 'span') {
      return <span>{text}</span>;
    }

    return <pre>{text}</pre>;
  }

  return <div className="math-rich-text">{parts}</div>;
}

function isProbabilityTreeNode(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const hasChildren = Array.isArray(value.children);
  const hasLabel = typeof value.label === 'string';
  const hasEdge = typeof value.edgeLabel === 'string';
  const hasProbability =
    typeof value.probability === 'string' || typeof value.probability === 'number';

  return hasChildren || hasLabel || hasEdge || hasProbability;
}

function asProbabilityTreePayload(value: unknown): ProbabilityTreeJson | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidates: unknown[] = [
    value,
    value.probabilityTree,
    value.tree,
    value.payload,
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const type = candidate.type;
    const kind = candidate.kind;
    const directionRaw = candidate.direction;
    const direction = directionRaw === 'rtl' ? 'rtl' : 'ltr';
    const root = candidate.root;

    if (isProbabilityTreeNode(root)) {
      if (type === 'probability_tree' || kind === 'probability_tree' || !type) {
        return {
          type: 'probability_tree',
          direction,
          root: root as ProbabilityTreeJson['root'],
        };
      }
    }

    if (isProbabilityTreeNode(candidate)) {
      return {
        type: 'probability_tree',
        direction,
        root: candidate as ProbabilityTreeJson['root'],
      };
    }
  }

  return null;
}

function extractProbabilityTreeFromBlock(
  block: ExamHierarchyBlock,
): ProbabilityTreeJson | null {
  const fromData = asProbabilityTreePayload(block.data);
  if (fromData) {
    return fromData;
  }

  if (block.textValue) {
    const trimmed = block.textValue.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return asProbabilityTreePayload(parsed);
      } catch {
        return null;
      }
    }
  }

  return null;
}

function isFormulaCurve(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.fn === 'string' && value.fn.trim().length > 0;
}

function asFormulaGraphPayload(value: unknown): FormulaGraphJson | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidates: unknown[] = [
    value,
    value.formulaGraph,
    value.graph,
    value.payload,
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const type = candidate.type;
    const kind = candidate.kind;

    const curves = Array.isArray(candidate.curves)
      ? candidate.curves.filter((curve) => isFormulaCurve(curve))
      : Array.isArray(candidate.functions)
      ? candidate.functions.filter((curve) => isFormulaCurve(curve))
      : [];

    if (!curves.length) {
      continue;
    }

    if (
      type === 'formula_graph' ||
      kind === 'formula_graph' ||
      !type
    ) {
      return {
        type: 'formula_graph',
        title: typeof candidate.title === 'string' ? candidate.title : undefined,
        xDomain: Array.isArray(candidate.xDomain)
          ? (candidate.xDomain as [number, number])
          : undefined,
        yDomain: Array.isArray(candidate.yDomain)
          ? (candidate.yDomain as [number, number])
          : undefined,
        width: typeof candidate.width === 'number' ? candidate.width : undefined,
        height: typeof candidate.height === 'number' ? candidate.height : undefined,
        grid: typeof candidate.grid === 'boolean' ? candidate.grid : undefined,
        curves: curves as FormulaGraphJson['curves'],
      };
    }
  }

  return null;
}

function extractFormulaGraphFromBlock(
  block: ExamHierarchyBlock,
): FormulaGraphJson | null {
  const fromData = asFormulaGraphPayload(block.data);
  if (fromData) {
    return fromData;
  }

  if (block.textValue) {
    const trimmed = block.textValue.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return asFormulaGraphPayload(parsed);
      } catch {
        return null;
      }
    }
  }

  return null;
}

function renderHierarchyBlock(
  block: ExamHierarchyBlock,
  key: string,
) {
  const formulaGraph = extractFormulaGraphFromBlock(block);

  if (formulaGraph) {
    return <FormulaGraphPlot key={key} data={formulaGraph} />;
  }

  const probabilityTree = extractProbabilityTreeFromBlock(block);

  if (probabilityTree) {
    return (
      <ProbabilityTreeSvg
        key={key}
        data={probabilityTree}
        title={resolveImageCaption(block) ?? 'Probability tree'}
      />
    );
  }

  if (block.blockType === 'IMAGE') {
    const source = resolveImageUrl(block);
    const imageUrl = source ? toAssetUrl(source) : null;

    if (!imageUrl) {
      return null;
    }

    return (
      <figure key={key}>
        <Image
          src={imageUrl}
          loader={passthroughLoader}
          alt={resolveImageCaption(block) ?? 'Question image'}
          width={1400}
          height={1000}
          unoptimized
        />
        {resolveImageCaption(block) ? (
          <figcaption>{resolveImageCaption(block)}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.blockType === 'HEADING') {
    return <h3 key={key}>{renderTextWithMath(block.textValue ?? '', key, 'span')}</h3>;
  }

  if (block.blockType === 'CODE') {
    return (
      <pre key={key}>
        <code>{block.textValue ?? ''}</code>
      </pre>
    );
  }

  if (block.blockType === 'LATEX') {
    return (
      <div
        key={key}
        className="math-display"
        dangerouslySetInnerHTML={{
          __html: renderKatexToHtml((block.textValue ?? '').trim(), true),
        }}
      />
    );
  }

  return <div key={key}>{renderTextWithMath(block.textValue ?? '', key)}</div>;
}

type HierarchyQuestionItem = {
  id: string;
  orderIndex: number;
  label: string | null;
  title: string | null;
  maxPoints: number | null;
  depth: number;
  promptBlocks: ExamHierarchyBlock[];
  solutionBlocks: ExamHierarchyBlock[];
  hintBlocks: ExamHierarchyBlock[];
  rubricBlocks: ExamHierarchyBlock[];
};

function collectHierarchyQuestionItems(
  nodes: ExamHierarchyNode[],
  depth = 0,
): HierarchyQuestionItem[] {
  const ordered = [...nodes].sort((a, b) => a.orderIndex - b.orderIndex);
  const items: HierarchyQuestionItem[] = [];

  for (const node of ordered) {
    const isQuestionNode =
      node.nodeType === 'QUESTION' || node.nodeType === 'SUBQUESTION';

    if (isQuestionNode) {
      items.push({
        id: node.id,
        orderIndex: node.orderIndex,
        label: node.label,
        title: node.title,
        maxPoints: node.maxPoints,
        depth,
        promptBlocks: blocksByRoles(node.blocks, ['PROMPT', 'STEM']),
        solutionBlocks: blocksByRoles(node.blocks, ['SOLUTION']),
        hintBlocks: blocksByRoles(node.blocks, ['HINT']),
        rubricBlocks: blocksByRoles(node.blocks, ['RUBRIC']),
      });
    }

    if (node.children.length) {
      const nextDepth = isQuestionNode ? depth + 1 : depth;
      items.push(...collectHierarchyQuestionItems(node.children, nextDepth));
    }
  }

  return items;
}

function getExerciseContextBlocks(exercise: ExamHierarchyNode): ExamHierarchyBlock[] {
  const ownContext = blocksByRoles(exercise.blocks, ['STEM', 'PROMPT']);
  const nestedContext = [...exercise.children]
    .filter((child) => child.nodeType === 'CONTEXT')
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((child) => blocksByRoles(child.blocks, ['STEM', 'PROMPT']));

  return [...ownContext, ...nestedContext];
}

type ExerciseOverviewCard = {
  id: string;
  orderIndex: number;
  title: string;
  totalPoints: number;
  questionIds: string[];
};

type ScreenMode = 'overview' | 'exercise';

export function SujetViewer({
  streamCode,
  subjectCode,
  year,
  examId,
  sujetNumber,
}: {
  streamCode: string;
  subjectCode: string;
  year: string;
  examId: string;
  sujetNumber: string;
}) {
  const [exam, setExam] = useState<ExamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<ScreenMode>('overview');
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);
  const [inlineEditTarget, setInlineEditTarget] = useState<InlineEditTarget | null>(
    null,
  );
  const [role] = useState<'USER' | 'ADMIN'>(() => getClientRole());

  const [showAnswerByQuestion, setShowAnswerByQuestion] = useState<
    Record<string, boolean>
  >({});
  const [completedQuestionById, setCompletedQuestionById] = useState<
    Record<string, boolean>
  >({});
  const [revealedSegmentsByQuestion, setRevealedSegmentsByQuestion] = useState<
    Record<string, number>
  >({});

  const decodedStreamCode = decodeURIComponent(streamCode || '');
  const decodedSubjectCode = decodeURIComponent(subjectCode || '');
  const decodedExamId = decodeURIComponent(examId || '');
  const decodedYear = Number.parseInt(year, 10);
  const fallbackYear = Number.isFinite(decodedYear) ? decodedYear : null;
  const parsedSujetNumber = Number(sujetNumber);
  const isAdmin = role === 'ADMIN';

  const loadExam = useCallback(
    async (resetViewerState: boolean) => {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<ExamResponse>(
          `${API_BASE_URL}/qbank/exams/${decodedExamId}?sujetNumber=${parsedSujetNumber}`,
        );

        setExam(payload);

        if (resetViewerState) {
          setMode('overview');
          setActiveExerciseId(null);
          setOpenQuestionId(null);
          setCompletedQuestionById({});
          setShowAnswerByQuestion({});
          setRevealedSegmentsByQuestion({});
          setInlineEditTarget(null);
        }
      } catch {
        setError('تعذر تحميل هذا sujet.');
      } finally {
        setLoading(false);
      }
    },
    [decodedExamId, parsedSujetNumber],
  );

  useEffect(() => {
    void loadExam(true);
  }, [loadExam]);

  const hierarchyExercises = useMemo(
    () =>
      exam?.renderMode === 'hierarchy' && exam.hierarchy
        ? exam.hierarchy.exercises
        : [],
    [exam],
  );
  const isHierarchyMode = Boolean(
    exam?.renderMode === 'hierarchy' && exam?.hierarchy,
  );

  const overviewExercises = useMemo<ExerciseOverviewCard[]>(() => {
    if (!exam) {
      return [];
    }

    if (isHierarchyMode) {
      return hierarchyExercises.map((exercise, index) => {
        const questionItems = collectHierarchyQuestionItems(exercise.children);

        return {
          id: exercise.id,
          orderIndex: index + 1,
          title:
            exercise.title ||
            exercise.label ||
            `Exercise ${index + 1}`,
          totalPoints: exercise.maxPoints ?? 0,
          questionIds: questionItems.map((item) => item.id),
        };
      });
    }

    return exam.exercises.map((exercise) => ({
      id: exercise.id,
      orderIndex: exercise.orderIndex,
      title: exercise.title ?? `Exercise ${exercise.orderIndex}`,
      totalPoints: exercise.totalPoints,
      questionIds: exercise.questions.map((question) => question.id),
    }));
  }, [exam, hierarchyExercises, isHierarchyMode]);

  useEffect(() => {
    if (!overviewExercises.length) {
      setActiveExerciseId(null);
      return;
    }

    setActiveExerciseId((current) =>
      current && overviewExercises.some((exercise) => exercise.id === current)
        ? current
        : overviewExercises[0].id,
    );
  }, [overviewExercises]);

  const activeLegacyExercise = useMemo(() => {
    if (!exam || isHierarchyMode || !activeExerciseId) {
      return null;
    }

    return exam.exercises.find((exercise) => exercise.id === activeExerciseId) ?? null;
  }, [exam, isHierarchyMode, activeExerciseId]);

  const activeHierarchyExercise = useMemo(() => {
    if (!isHierarchyMode || !activeExerciseId) {
      return null;
    }

    return (
      hierarchyExercises.find((exercise) => exercise.id === activeExerciseId) ?? null
    );
  }, [activeExerciseId, hierarchyExercises, isHierarchyMode]);

  const activeLegacyQuestions = useMemo(
    () => activeLegacyExercise?.questions ?? [],
    [activeLegacyExercise],
  );
  const activeHierarchyQuestions = useMemo(
    () =>
      activeHierarchyExercise
        ? collectHierarchyQuestionItems(activeHierarchyExercise.children)
        : [],
    [activeHierarchyExercise],
  );
  const activeQuestionIds = useMemo(
    () =>
      isHierarchyMode
        ? activeHierarchyQuestions.map((question) => question.id)
        : activeLegacyQuestions.map((question) => question.id),
    [activeHierarchyQuestions, activeLegacyQuestions, isHierarchyMode],
  );

  const completedInActiveExercise = useMemo(
    () => activeQuestionIds.filter((id) => completedQuestionById[id]).length,
    [activeQuestionIds, completedQuestionById],
  );

  useEffect(() => {
    if (!activeQuestionIds.length) {
      setOpenQuestionId(null);
      return;
    }

    const defaultQuestionId = activeQuestionIds[0];

    setOpenQuestionId((current) =>
      current && activeQuestionIds.includes(current) ? current : defaultQuestionId,
    );

    if (!isHierarchyMode) {
      setRevealedSegmentsByQuestion((current) => ({
        ...current,
        [defaultQuestionId]: current[defaultQuestionId] ?? 1,
      }));
    }
  }, [activeQuestionIds, isHierarchyMode]);

  const activeExerciseOrder = useMemo(() => {
    if (!activeExerciseId) {
      return -1;
    }

    return overviewExercises.findIndex((exercise) => exercise.id === activeExerciseId);
  }, [activeExerciseId, overviewExercises]);

  const activeHierarchyContextBlocks = useMemo(
    () =>
      activeHierarchyExercise
        ? getExerciseContextBlocks(activeHierarchyExercise)
        : [],
    [activeHierarchyExercise],
  );

  function openExercise(exerciseId: string) {
    setActiveExerciseId(exerciseId);
    setMode('exercise');
  }

  function markQuestionCompleted(questionId: string, completed: boolean) {
    setCompletedQuestionById((current) => ({
      ...current,
      [questionId]: completed,
    }));
  }

  function revealNextSegment(questionId: string, totalSegments: number) {
    setRevealedSegmentsByQuestion((current) => ({
      ...current,
      [questionId]: Math.min((current[questionId] ?? 1) + 1, totalSegments),
    }));
  }

  function moveToExercise(direction: -1 | 1) {
    if (activeExerciseOrder < 0) {
      return;
    }

    const nextIndex = activeExerciseOrder + direction;

    if (nextIndex < 0 || nextIndex >= overviewExercises.length) {
      return;
    }

    setActiveExerciseId(overviewExercises[nextIndex].id);
    setMode('exercise');
  }

  return (
    <main className="app-shell">
      <AppNavbar />

      <section className="page-hero">
        <p className="page-kicker">Sujet Viewer</p>
        <h1>{exam?.selectedSujetLabel ?? `Sujet ${sujetNumber}`}</h1>
        <p>
          {exam?.subject.name ?? decodedSubjectCode} ·{' '}
          {exam?.stream.name ?? decodedStreamCode} ·{' '}
          {exam?.year ?? fallbackYear ?? '-'}
        </p>
      </section>

      <section className="panel">
        <div className="breadcrumb">
          <Link href="/app/browse">الشعب</Link>
          <span>/</span>
          <Link href={`/app/browse/${decodedStreamCode}`}>
            {exam?.stream.name ?? decodedStreamCode}
          </Link>
          <span>/</span>
          <Link href={`/app/browse/${decodedStreamCode}/${decodedSubjectCode}`}>
            {exam?.subject.name ?? decodedSubjectCode}
          </Link>
          <span>/</span>
          <span>{exam?.year ?? fallbackYear ?? '-'}</span>
        </div>

        {loading ? <p>جاري تحميل sujet...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {exam && mode === 'overview' ? (
          <div className="exam-overview">
            <article className="exam-overview-head">
              <h2>
                {exam.subject.name} - {exam.selectedSujetLabel ?? `Sujet ${sujetNumber}`}
              </h2>
              <div className="exam-overview-grid">
                <p>
                  <strong>Year:</strong> {exam.year}
                </p>
                <p>
                  <strong>Stream:</strong> {exam.stream.name}
                </p>
                <p>
                  <strong>Session:</strong> {formatSessionType(exam.sessionType)}
                </p>
                <p>
                  <strong>Subject:</strong> {exam.subject.name}
                </p>
                <p>
                  <strong>Total marks:</strong> {exam.totalPoints}
                </p>
                <p>
                  <strong>Total exercises:</strong> {overviewExercises.length}
                </p>
              </div>
            </article>

            <section className="exercise-overview-grid">
              {overviewExercises.map((exercise) => {
                const completed = exercise.questionIds.filter(
                  (questionId) => completedQuestionById[questionId],
                ).length;

                return (
                  <article key={exercise.id} className="exercise-overview-card">
                    <header>
                      <h3>Exercise {exercise.orderIndex}</h3>
                      <span>{exercise.totalPoints} pts</span>
                    </header>
                    <p>{exercise.title}</p>
                    <p>
                      Progress: {completed} / {exercise.questionIds.length} questions completed
                    </p>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        openExercise(exercise.id);
                      }}
                    >
                      Open Exercise
                    </button>
                    {isAdmin && isHierarchyMode ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setInlineEditTarget({
                            kind: 'exercise',
                            exerciseId: exercise.id,
                            title: exercise.title,
                          });
                        }}
                      >
                        Edit Exercise
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </section>
          </div>
        ) : null}

        {exam && isHierarchyMode && activeHierarchyExercise && mode === 'exercise' ? (
          <div className="exercise-progressive-page">
            <div className="exercise-progressive-head">
              <div className="table-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setMode('overview');
                  }}
                >
                  Back to Overview
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setInlineEditTarget({
                        kind: 'exercise',
                        exerciseId: activeHierarchyExercise.id,
                        title:
                          activeHierarchyExercise.title ||
                          activeHierarchyExercise.label ||
                          `Exercise ${activeExerciseOrder + 1}`,
                      });
                    }}
                  >
                    Edit Exercise
                  </button>
                ) : null}
              </div>
              <h2>
                Exercise {activeExerciseOrder + 1} - {activeHierarchyExercise.maxPoints ?? 0} pts
              </h2>
              <p>
                Progress: {completedInActiveExercise} / {activeHierarchyQuestions.length}{' '}
                questions completed
              </p>
            </div>

            {activeHierarchyContextBlocks.length ? (
              <div className="exercise-intro">
                {activeHierarchyContextBlocks.map((block, index) =>
                  renderHierarchyBlock(block, `context-${block.id}-${index}`),
                )}
              </div>
            ) : null}

            <section className="question-stack">
              {activeHierarchyQuestions.map((question, index) => {
                const unlocked = index <= completedInActiveExercise;
                const isOpen = openQuestionId === question.id;
                const hasAnswer = question.solutionBlocks.length > 0;
                const showAnswer = Boolean(showAnswerByQuestion[question.id]);
                const label =
                  question.label ||
                  question.title ||
                  `${question.orderIndex}`;

                return (
                  <article
                    key={question.id}
                    className={isOpen ? 'question-card open' : 'question-card'}
                    style={{ marginInlineStart: `${Math.min(question.depth, 6) * 14}px` }}
                  >
                    <button
                      type="button"
                      className="question-line"
                      disabled={!unlocked}
                      onClick={() => {
                        if (!unlocked) {
                          return;
                        }

                        setOpenQuestionId(question.id);
                      }}
                    >
                      <span>
                        {label}. {question.maxPoints ?? 0} pts {!unlocked ? '(Locked)' : ''}
                      </span>
                      <strong>{isOpen ? 'Hide' : 'Open'}</strong>
                    </button>

                    {isOpen && unlocked ? (
                      <div className="question-content">
                        {question.promptBlocks.length ? (
                          <div className="asset-grid">
                            {question.promptBlocks.map((block, blockIndex) =>
                              renderHierarchyBlock(
                                block,
                                `${question.id}-prompt-${block.id}-${blockIndex}`,
                              ),
                            )}
                          </div>
                        ) : (
                          <pre>لا يوجد نص مباشر لهذا السؤال حالياً.</pre>
                        )}

                        <div className="session-question-actions">
                          {isAdmin ? (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => {
                                setInlineEditTarget({
                                  kind: 'question',
                                  exerciseId: activeHierarchyExercise.id,
                                  questionId: question.id,
                                  title:
                                    question.title ||
                                    question.label ||
                                    `Question ${question.orderIndex}`,
                                });
                              }}
                            >
                              Edit Question
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              markQuestionCompleted(
                                question.id,
                                !Boolean(completedQuestionById[question.id]),
                              );
                            }}
                          >
                            {completedQuestionById[question.id]
                              ? 'Mark as not completed'
                              : 'Mark as completed'}
                          </button>

                          {hasAnswer ? (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() =>
                                setShowAnswerByQuestion((current) => ({
                                  ...current,
                                  [question.id]: !current[question.id],
                                }))
                              }
                            >
                              {showAnswer ? 'Hide solution' : 'Show solution'}
                            </button>
                          ) : null}
                        </div>

                        {showAnswer ? (
                          <section className="official-answer">
                            <h3>Official solution</h3>
                            {question.solutionBlocks.map((block, blockIndex) =>
                              renderHierarchyBlock(
                                block,
                                `${question.id}-solution-${block.id}-${blockIndex}`,
                              ),
                            )}

                            {question.rubricBlocks.length ? (
                              <>
                                <h3>Marking rubric</h3>
                                {question.rubricBlocks.map((block, blockIndex) =>
                                  renderHierarchyBlock(
                                    block,
                                    `${question.id}-rubric-${block.id}-${blockIndex}`,
                                  ),
                                )}
                              </>
                            ) : null}

                            {question.hintBlocks.length ? (
                              <>
                                <h3>Hints</h3>
                                {question.hintBlocks.map((block, blockIndex) =>
                                  renderHierarchyBlock(
                                    block,
                                    `${question.id}-hint-${block.id}-${blockIndex}`,
                                  ),
                                )}
                              </>
                            ) : null}
                          </section>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>

            <div className="completion-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={activeExerciseOrder <= 0}
                onClick={() => {
                  moveToExercise(-1);
                }}
              >
                Previous Exercise
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={activeExerciseOrder < 0 || activeExerciseOrder >= overviewExercises.length - 1}
                onClick={() => {
                  moveToExercise(1);
                }}
              >
                Next Exercise
              </button>
            </div>
          </div>
        ) : null}

        {exam && !isHierarchyMode && activeLegacyExercise && mode === 'exercise' ? (
          <div className="exercise-progressive-page">
            <div className="exercise-progressive-head">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setMode('overview');
                }}
              >
                Back to Overview
              </button>
              <h2>
                Exercise {activeLegacyExercise.orderIndex} - {activeLegacyExercise.totalPoints} pts
              </h2>
              <p>
                Progress: {completedInActiveExercise} / {activeLegacyQuestions.length} questions
                completed
              </p>
            </div>

            {activeLegacyExercise.introText ? (
              <div className="exercise-intro">
                {renderTextWithMath(
                  activeLegacyExercise.introText,
                  `legacy-intro-${activeLegacyExercise.id}`,
                )}
              </div>
            ) : null}

            <section className="question-stack">
              {activeLegacyQuestions.map((question, index) => {
                const unlocked = index <= completedInActiveExercise;
                const isOpen = openQuestionId === question.id;
                const hasAnswer = Boolean(question.answer?.officialAnswerMarkdown);
                const showAnswer = Boolean(showAnswerByQuestion[question.id]);
                const segments = splitQuestionSegments(question.contentMarkdown);
                const revealedCount = Math.max(
                  1,
                  Math.min(revealedSegmentsByQuestion[question.id] ?? 1, segments.length),
                );

                return (
                  <article
                    key={question.id}
                    className={isOpen ? 'question-card open' : 'question-card'}
                  >
                    <button
                      type="button"
                      className="question-line"
                      disabled={!unlocked}
                      onClick={() => {
                        if (!unlocked) {
                          return;
                        }

                        setOpenQuestionId(question.id);
                        setRevealedSegmentsByQuestion((current) => ({
                          ...current,
                          [question.id]: current[question.id] ?? 1,
                        }));
                      }}
                    >
                      <span>
                        {question.orderIndex}. {question.points} pts {!unlocked ? '(Locked)' : ''}
                      </span>
                      <strong>{isOpen ? 'Hide' : 'Open'}</strong>
                    </button>

                    {isOpen && unlocked ? (
                      <div className="question-content">
                        {segments.slice(0, revealedCount).map((segment, segmentIndex) => (
                          <div key={`${question.id}-segment-${segmentIndex}`}>
                            {renderTextWithMath(
                              segment,
                              `${question.id}-segment-${segmentIndex}`,
                            )}
                          </div>
                        ))}

                        {revealedCount < segments.length ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              revealNextSegment(question.id, segments.length);
                            }}
                          >
                            Reveal next part
                          </button>
                        ) : null}

                        {question.assets.length ? (
                          <div className="asset-grid">
                            {question.assets.map((asset) => {
                              const assetUrl = toAssetUrl(asset.fileUrl);

                              if (!assetUrl) {
                                return null;
                              }

                              return (
                                <figure key={`${question.id}-${asset.orderIndex}`}>
                                  <Image
                                    src={assetUrl}
                                    loader={passthroughLoader}
                                    alt={
                                      asset.caption ??
                                      `Asset for question ${question.orderIndex}`
                                    }
                                    width={1400}
                                    height={1000}
                                    unoptimized
                                  />
                                  {asset.caption ? (
                                    <figcaption>{asset.caption}</figcaption>
                                  ) : null}
                                </figure>
                              );
                            })}
                          </div>
                        ) : null}

                        <div className="session-question-actions">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              markQuestionCompleted(
                                question.id,
                                !Boolean(completedQuestionById[question.id]),
                              );
                            }}
                          >
                            {completedQuestionById[question.id]
                              ? 'Mark as not completed'
                              : 'Mark as completed'}
                          </button>

                          {hasAnswer ? (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() =>
                                setShowAnswerByQuestion((current) => ({
                                  ...current,
                                  [question.id]: !current[question.id],
                                }))
                              }
                            >
                              {showAnswer ? 'Hide solution' : 'Show solution'}
                            </button>
                          ) : null}
                        </div>

                        {showAnswer ? (
                          <section className="official-answer">
                            <h3>Official solution</h3>
                            {renderTextWithMath(
                              question.answer?.officialAnswerMarkdown ?? '',
                              `${question.id}-legacy-answer`,
                            )}
                          </section>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>

            <div className="completion-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={activeExerciseOrder <= 0}
                onClick={() => {
                  moveToExercise(-1);
                }}
              >
                Previous Exercise
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={activeExerciseOrder < 0 || activeExerciseOrder >= overviewExercises.length - 1}
                onClick={() => {
                  moveToExercise(1);
                }}
              >
                Next Exercise
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {isAdmin ? (
        <SujetInlineEditor
          target={inlineEditTarget}
          onClose={() => {
            setInlineEditTarget(null);
          }}
          onSaved={async () => {
            await loadExam(false);
          }}
        />
      ) : null}
    </main>
  );
}
