"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import { StudyHierarchyBlocks } from "@/components/study-content";
import {
  StudyQuestionPromptContent,
  StudyQuestionSolutionStack,
} from "@/components/study-stage";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import {
  type ExamHierarchyBlock,
  type ExamHierarchyNode,
  type ExamResponse,
  formatSessionType,
} from "@/lib/study-api";
import {
  canRevealStudyQuestionSolution,
  type StudyExerciseModel,
  type StudyQuestionModel,
} from "@/lib/study-surface";

export type SujetVariantLink = {
  href: string;
  label: string;
  isActive: boolean;
};

export type SujetExerciseTab = {
  id: string;
  label: string;
  isActive: boolean;
  onSelect: () => void;
};

export function formatSujetLabel(
  sujetNumber: 1 | 2,
  label: string | null | undefined,
) {
  const trimmedLabel = label?.trim();

  if (
    !trimmedLabel ||
    /^sujet\s*\d+$/i.test(trimmedLabel) ||
    /^subject\s*\d+$/i.test(trimmedLabel)
  ) {
    return sujetNumber === 2 ? "الموضوع الثاني" : "الموضوع الأول";
  }

  return trimmedLabel;
}

export function SujetViewerHero({
  exam,
  backToLibraryHref,
  backLabel = "العودة إلى المكتبة",
  simulationAction,
}: {
  exam: ExamResponse;
  backToLibraryHref: string;
  backLabel?: string;
  simulationAction?: ReactNode;
}) {
  const selectedSujetNumber = exam.selectedSujetNumber ?? 1;
  const sujetLabel = formatSujetLabel(
    selectedSujetNumber,
    exam.selectedSujetLabel,
  );

  return (
    <header className="sujet-browser-hero">
      <div className="sujet-browser-masthead">
        <div className="sujet-browser-title-block">
          <span className="sujet-browser-kicker">
            بكالوريا {exam.year} · {exam.stream.name}
          </span>
          <span className="sujet-browser-paper-label">{sujetLabel}</span>
          <div className="sujet-browser-title-stack">
            <span className="sujet-browser-subject-name">{exam.subject.name}</span>
            <span className="sujet-browser-title-detail">
              نسخة رقمية للتصفح فقط
            </span>
          </div>
        </div>

        <div className="sujet-browser-side-cluster">
          <div className="sujet-browser-meta-grid" aria-label="بيانات الموضوع">
            <div className="sujet-browser-meta-item">
              <span>الدورة</span>
              <strong>{formatSessionType(exam.sessionType)}</strong>
            </div>
            <div className="sujet-browser-meta-item">
              <span>المدة</span>
              <strong>{exam.durationMinutes} دقيقة</strong>
            </div>
            <div className="sujet-browser-meta-item">
              <span>التمارين</span>
              <strong>{exam.exerciseCount}</strong>
            </div>
          </div>

          {simulationAction ? (
            <div className="sujet-browser-actions">{simulationAction}</div>
          ) : null}
          <Button asChild variant="ghost" className="h-10 rounded-full px-4">
            <Link href={backToLibraryHref}>{backLabel}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SujetViewerNavigator({
  variantLinks,
  exerciseTabs,
}: {
  variantLinks: SujetVariantLink[];
  exerciseTabs: SujetExerciseTab[];
}) {
  return (
    <section className="sujet-browser-nav">
      {variantLinks.length > 1 ? (
        <div className="sujet-browser-nav-group">
          <span className="sujet-browser-nav-label">الموضوع</span>
          <div className="sujet-browser-pill-row">
            {variantLinks.map((variant) => (
              <FilterChip key={variant.href} asChild active={variant.isActive}>
                <Link
                key={variant.href}
                href={variant.href}
              >
                {variant.label}
                </Link>
              </FilterChip>
            ))}
          </div>
        </div>
      ) : null}

      <div className="sujet-browser-nav-group">
        <span className="sujet-browser-nav-label">التمارين</span>
        <div className="sujet-browser-pill-row">
          {exerciseTabs.map((exercise) => (
            <FilterChip
              key={exercise.id}
              type="button"
              active={exercise.isActive}
              onClick={exercise.onSelect}
            >
              {exercise.label}
            </FilterChip>
          ))}
        </div>
      </div>
    </section>
  );
}

function getPromptBlocks(blocks: ExamHierarchyBlock[]) {
  return blocks
    .filter((block) => block.role === "PROMPT" || block.role === "STEM")
    .sort((left, right) => left.orderIndex - right.orderIndex);
}

function formatNodeLabel(
  node: ExamHierarchyNode,
  question: StudyQuestionModel | null,
) {
  if (question?.label?.trim()) {
    return question.label.trim();
  }

  if (node.label?.trim()) {
    return node.label.trim();
  }

  if (node.nodeType === "SUBQUESTION") {
    return `الفقرة ${node.orderIndex}`;
  }

  if (node.nodeType === "PART") {
    return `الجزء ${node.orderIndex}`;
  }

  return `السؤال ${node.orderIndex}`;
}

function QuestionSolutionToggle({
  question,
  revealedSolutions,
  onToggleQuestionSolution,
}: {
  question: StudyQuestionModel;
  revealedSolutions: Record<string, boolean>;
  onToggleQuestionSolution: (questionId: string) => void;
}) {
  const canRevealSolution = canRevealStudyQuestionSolution(question);
  const isSolutionOpen = Boolean(revealedSolutions[question.id]);

  if (!canRevealSolution) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto gap-1 rounded-full px-0 py-0 text-sm text-primary hover:bg-transparent"
      onClick={() => onToggleQuestionSolution(question.id)}
    >
      {isSolutionOpen ? (
        <>
          <EyeOff size={16} aria-hidden="true" />
          إخفاء الحل
        </>
      ) : (
        <>
          <Eye size={16} aria-hidden="true" />
          إظهار الحل
        </>
      )}
    </Button>
  );
}

function SujetViewerStructuredQuestionNode({
  node,
  depth,
  question,
  revealedSolutions,
  onToggleQuestionSolution,
  renderChildNode,
}: {
  node: ExamHierarchyNode;
  depth: number;
  question: StudyQuestionModel | null;
  revealedSolutions: Record<string, boolean>;
  onToggleQuestionSolution: (questionId: string) => void;
  renderChildNode: (child: ExamHierarchyNode, depth: number) => ReactNode;
}) {
  const promptBlocks = question?.promptBlocks ?? getPromptBlocks(node.blocks);
  const points = question?.points ?? node.maxPoints ?? 0;
  const isSolutionOpen = question ? Boolean(revealedSolutions[question.id]) : false;

  return (
    <div
      className={`sujet-paper-question-row${
        node.nodeType === "SUBQUESTION" ? " is-subquestion" : ""
      }`}
      style={depth > 0 ? { marginInlineStart: `${depth * 1.15}rem` } : undefined}
    >
      <div className="sujet-paper-question-head">
        <div className="sujet-paper-question-meta">
          <div className="sujet-paper-question-index sujet-paper-question-index-label">
            {formatNodeLabel(node, question)}
          </div>
          {points > 0 ? (
            <span className="sujet-paper-question-points">{points} نقاط</span>
          ) : null}
        </div>

        {question ? (
          <QuestionSolutionToggle
            question={question}
            revealedSolutions={revealedSolutions}
            onToggleQuestionSolution={onToggleQuestionSolution}
          />
        ) : null}
      </div>

      {promptBlocks.length ? (
        <div className="sujet-paper-question-body">
          {question ? (
            <StudyQuestionPromptContent question={question} />
          ) : (
            <StudyHierarchyBlocks blocks={promptBlocks} />
          )}
        </div>
      ) : null}

      {node.children.length ? (
        <div className="sujet-paper-node-children">
          {node.children.map((child) => renderChildNode(child, depth + 1))}
        </div>
      ) : null}

      {question && isSolutionOpen ? (
        <div className="sujet-paper-solution">
          <StudyQuestionSolutionStack question={question} />
        </div>
      ) : null}
    </div>
  );
}

function SujetViewerStructuredBranchNode({
  node,
  depth,
  renderChildNode,
}: {
  node: ExamHierarchyNode;
  depth: number;
  renderChildNode: (child: ExamHierarchyNode, depth: number) => ReactNode;
}) {
  const promptBlocks = getPromptBlocks(node.blocks);
  const label = formatNodeLabel(node, null);

  return (
    <section
      className="sujet-paper-branch"
      style={depth > 0 ? { marginInlineStart: `${depth * 1.15}rem` } : undefined}
    >
      <div className="sujet-paper-branch-head">
        <h3 className="sujet-paper-branch-label">{label}</h3>
        {node.maxPoints && node.maxPoints > 0 ? (
          <span className="sujet-paper-question-points">
            {node.maxPoints} نقاط
          </span>
        ) : null}
      </div>

      {promptBlocks.length ? (
        <div className="sujet-paper-branch-body">
          <StudyHierarchyBlocks blocks={promptBlocks} />
        </div>
      ) : null}

      {node.children.length ? (
        <div className="sujet-paper-node-children">
          {node.children.map((child) => renderChildNode(child, depth + 1))}
        </div>
      ) : null}
    </section>
  );
}

function SujetViewerStructuredContextNode({
  node,
  depth,
}: {
  node: ExamHierarchyNode;
  depth: number;
}) {
  const promptBlocks = getPromptBlocks(node.blocks);

  if (!promptBlocks.length) {
    return null;
  }

  return (
    <section
      className="sujet-paper-context sujet-paper-context-inline"
      style={depth > 0 ? { marginInlineStart: `${depth * 1.15}rem` } : undefined}
    >
      {node.label?.trim() ? (
        <p className="sujet-paper-context-label">{node.label.trim()}</p>
      ) : null}
      <StudyHierarchyBlocks blocks={promptBlocks} />
    </section>
  );
}

function SujetViewerStructuredExerciseBody({
  exercise,
  revealedSolutions,
  onToggleQuestionSolution,
}: {
  exercise: StudyExerciseModel;
  revealedSolutions: Record<string, boolean>;
  onToggleQuestionSolution: (questionId: string) => void;
}) {
  if (!exercise.hierarchyNode) {
    return null;
  }

  const exerciseIntroBlocks = getPromptBlocks(exercise.hierarchyNode.blocks);
  const questionsById = new Map(
    exercise.questions.map((question) => [question.id, question] as const),
  );

  const renderNode = (node: ExamHierarchyNode, depth = 0): ReactNode => {
    if (node.nodeType === "PART") {
      return (
        <SujetViewerStructuredBranchNode
          key={node.id}
          node={node}
          depth={depth}
          renderChildNode={renderNode}
        />
      );
    }

    if (node.nodeType === "CONTEXT") {
      return (
        <SujetViewerStructuredContextNode key={node.id} node={node} depth={depth} />
      );
    }

    if (node.nodeType === "QUESTION" || node.nodeType === "SUBQUESTION") {
      return (
        <SujetViewerStructuredQuestionNode
          key={node.id}
          node={node}
          depth={depth}
          question={questionsById.get(node.id) ?? null}
          revealedSolutions={revealedSolutions}
          onToggleQuestionSolution={onToggleQuestionSolution}
          renderChildNode={renderNode}
        />
      );
    }

    return null;
  };

  return (
    <>
      {exerciseIntroBlocks.length ? (
        <div className="sujet-paper-context">
          <StudyHierarchyBlocks blocks={exerciseIntroBlocks} />
        </div>
      ) : null}

      <div className="sujet-paper-structure">
        {exercise.hierarchyNode.children.map((node) => renderNode(node))}
      </div>
    </>
  );
}

function SujetViewerFlatExerciseBody({
  exercise,
  revealedSolutions,
  onToggleQuestionSolution,
}: {
  exercise: StudyExerciseModel;
  revealedSolutions: Record<string, boolean>;
  onToggleQuestionSolution: (questionId: string) => void;
}) {
  return (
    <>
      {exercise.contextBlocks.length ? (
        <div className="sujet-paper-context">
          <StudyHierarchyBlocks blocks={exercise.contextBlocks} />
        </div>
      ) : null}

      <div className="sujet-paper-question-list">
        {exercise.questions.map((question, index) => {
          const canRevealSolution = canRevealStudyQuestionSolution(question);
          const isSolutionOpen = Boolean(revealedSolutions[question.id]);

          return (
            <div
              key={`${exercise.id}:${question.id}`}
              className="sujet-paper-question-row"
            >
              <div className="sujet-paper-question-head">
                <div className="sujet-paper-question-meta">
                  <div className="sujet-paper-question-index">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  {question.points > 0 ? (
                    <span className="sujet-paper-question-points">
                      {question.points} نقاط
                    </span>
                  ) : null}
                </div>

                {canRevealSolution ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto gap-1 rounded-full px-0 py-0 text-sm text-primary hover:bg-transparent"
                    onClick={() => onToggleQuestionSolution(question.id)}
                  >
                    {isSolutionOpen ? (
                      <>
                        <EyeOff size={16} aria-hidden="true" />
                        إخفاء الحل
                      </>
                    ) : (
                      <>
                        <Eye size={16} aria-hidden="true" />
                        إظهار الحل
                      </>
                    )}
                  </Button>
                ) : null}
              </div>

              <div className="sujet-paper-question-body">
                <StudyQuestionPromptContent question={question} />
              </div>

              {isSolutionOpen ? (
                <div className="sujet-paper-solution">
                  <StudyQuestionSolutionStack question={question} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function SujetViewerExercisePaper({
  exam,
  exercise,
  revealedSolutions,
  onToggleQuestionSolution,
  exerciseAction,
}: {
  exam: ExamResponse;
  exercise: StudyExerciseModel;
  revealedSolutions: Record<string, boolean>;
  onToggleQuestionSolution: (questionId: string) => void;
  exerciseAction?: ReactNode;
}) {
  const selectedSujetNumber = exam.selectedSujetNumber ?? 1;
  const exerciseNumber = String(exercise.displayOrder).padStart(2, "0");

  return (
    <section className="sujet-paper-shell">
      <div className="sujet-paper-toolbar">
        <div>
          <span>أرشيف مِراس</span>
          <strong>
            {exam.subject.name} · بكالوريا {exam.year}
          </strong>
        </div>
        <div className="sujet-paper-toolbar-actions">
          {exerciseAction}
        </div>
      </div>

      <article className="sujet-paper-sheet">
        <div className="sujet-paper-head">
          <div className="sujet-paper-head-copy">
            <p className="sujet-paper-kicker">
              {formatSujetLabel(selectedSujetNumber, exam.selectedSujetLabel)}
            </p>
            <div className="sujet-paper-exercise-line">
              <span className="sujet-paper-serial">{exerciseNumber}</span>
              <span className="sujet-paper-exercise-label">
                التمرين {exercise.displayOrder}
              </span>
            </div>
          </div>

          <div className="sujet-paper-head-side">
            <div className="sujet-paper-badges">
              {exercise.totalPoints > 0 ? (
                <span>{exercise.totalPoints} نقاط</span>
              ) : null}
              <span>{exercise.questions.length} أسئلة</span>
            </div>
          </div>
        </div>

        {exercise.hierarchyNode ? (
          <SujetViewerStructuredExerciseBody
            exercise={exercise}
            revealedSolutions={revealedSolutions}
            onToggleQuestionSolution={onToggleQuestionSolution}
          />
        ) : (
          <SujetViewerFlatExerciseBody
            exercise={exercise}
            revealedSolutions={revealedSolutions}
            onToggleQuestionSolution={onToggleQuestionSolution}
          />
        )}
      </article>
    </section>
  );
}
