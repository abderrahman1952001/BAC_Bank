"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SaveFlashcardButton } from "@/components/save-flashcard-button";
import { StudyBadge } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { SelectionCard } from "@/components/ui/selection-card";
import { buildCourseStepFlashcardDraft } from "@/lib/flashcards-surface";
import type { CourseConceptPageModel } from "@/lib/courses-surface";
import type { LabTool } from "@/lib/lab-surface";
import { cn } from "@/lib/utils";

const stepTypeLabels: Record<string, string> = {
  HOOK: "مدخل",
  EXPLAIN: "شرح",
  INSPECT: "تفقد بصري",
  RULE: "قاعدة",
  WORKED_EXAMPLE: "مثال",
  COMMON_TRAP: "فخ شائع",
  QUICK_CHECK: "تحقق سريع",
  EXAM_LENS: "BAC Lens",
  TAKEAWAY: "خلاصة",
};

const portalKindLabels: Record<string, string> = {
  EXPERIMENT: "تجربة",
  MECHANISM: "آلية",
  ADVANCED_CONTEXT: "سياق متقدم",
  HISTORICAL_NOTE: "لمحة",
  EXAM_EXTENSION: "امتداد BAC",
};

const visualAssetStatusLabels: Record<string, string> = {
  PENDING: "قيد التوليد",
  GENERATED: "مولدة",
  APPROVED: "معتمدة",
  NEEDS_REVISION: "تحتاج مراجعة",
};

type CourseConceptVisualAssetView = {
  status: string;
  url: string;
  width: number;
  height: number;
  model: string;
};

type CourseConceptStepView = CourseConceptPageModel["concept"]["steps"][number];

type StepDirection = "next" | "previous";
type SupportPanelId =
  | "exam-lens"
  | "visual"
  | "interaction"
  | "lab"
  | "depth"
  | "focus";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getVisualAsset(visual: unknown): CourseConceptVisualAssetView | null {
  if (!isRecord(visual) || !isRecord(visual.asset)) {
    return null;
  }

  const { asset } = visual;

  if (
    typeof asset.status !== "string" ||
    typeof asset.url !== "string" ||
    typeof asset.width !== "number" ||
    typeof asset.height !== "number" ||
    typeof asset.model !== "string"
  ) {
    return null;
  }

  return {
    status: asset.status,
    url: asset.url,
    width: asset.width,
    height: asset.height,
    model: asset.model,
  };
}

function shouldRenderVisualAsset(asset: CourseConceptVisualAssetView) {
  return asset.status === "GENERATED" || asset.status === "APPROVED";
}

function isRoadblockStep(step: CourseConceptStepView) {
  return Boolean(step.interaction) || step.type === "QUICK_CHECK";
}

function CourseStepVisual({
  step,
  asset,
}: {
  step: CourseConceptStepView;
  asset: CourseConceptVisualAssetView | null;
}) {
  if (!step.visual) {
    return null;
  }

  const renderableAsset =
    asset && shouldRenderVisualAsset(asset) ? asset : null;

  return (
    <figure
      className={cn(
        "course-concept-step-visual",
        !renderableAsset && "is-caption-only",
      )}
    >
      {renderableAsset ? (
        <Image
          src={renderableAsset.url}
          alt={step.visual.altText}
          width={renderableAsset.width}
          height={renderableAsset.height}
          loading="eager"
          sizes="(max-width: 720px) 100vw, 34vw"
          unoptimized
        />
      ) : null}
      <figcaption>
        <strong>{step.visual.title}</strong>
        <span>{step.visual.description}</span>
      </figcaption>
    </figure>
  );
}

function CourseStepCopy({
  step,
  requiresReveal,
  revealed,
  onReveal,
}: {
  step: CourseConceptStepView;
  requiresReveal: boolean;
  revealed: boolean;
  onReveal: () => void;
}) {
  return (
    <div className="course-concept-step-copy">
      <div className="course-concept-step-meta">
        <div className="course-concept-step-eyebrow">{step.eyebrow}</div>
        <span>{stepTypeLabels[step.type] ?? step.type}</span>
      </div>
      <h2>{step.title}</h2>
      <p>{step.body}</p>
      {step.bullets?.length ? (
        <ul className="course-concept-bullets">
          {step.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
      {step.interaction ? (
        <div className="course-roadblock-prompt">
          <span>تحقق قبل المتابعة</span>
          <strong>{step.interaction.prompt}</strong>
          {step.interaction.items.length ? (
            <div className="course-interaction-chips">
              {step.interaction.items.map((item) => (
                <small key={item}>{item}</small>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {requiresReveal ? (
        <Button
          type="button"
          variant="outline"
          className="course-flip-button h-11 rounded-full px-5"
          onClick={onReveal}
        >
          <RotateCcw data-icon />
          {revealed ? "العودة للبطاقة" : "اقلب للتفسير"}
        </Button>
      ) : null}
    </div>
  );
}

function CourseRoadblockBack({
  step,
  onHide,
  onNext,
  nextDisabled,
}: {
  step: CourseConceptStepView;
  onHide: () => void;
  onNext: () => void;
  nextDisabled: boolean;
}) {
  const explanation =
    step.examLens?.prompt ??
    step.examLens?.bacSkill ??
    step.visual?.description ??
    step.body;

  return (
    <div className="course-roadblock-back">
      <div className="course-roadblock-back-copy">
        <p className="page-kicker">Reveal</p>
        <h2>ثبّت الفكرة ثم واصل</h2>
        <p>{explanation}</p>
        {step.examLens?.trap ? <small>{step.examLens.trap}</small> : null}
        {step.bullets?.length ? (
          <ul className="course-concept-bullets">
            {step.bullets.slice(0, 3).map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="course-roadblock-back-actions">
        <Button
          type="button"
          className="h-11 rounded-full px-5"
          onClick={onNext}
          disabled={nextDisabled}
        >
          واصل
          <ChevronLeft data-icon />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-5"
          onClick={onHide}
        >
          <RotateCcw data-icon />
          رجوع
        </Button>
      </div>
    </div>
  );
}

function getSupportPanelForStep(
  step: CourseConceptStepView,
  relatedLabTools: Pick<
    LabTool,
    "id" | "title" | "shortTitle" | "href" | "bacUseCase"
  >[],
  depthPortals: CourseConceptPageModel["concept"]["depthPortals"],
): SupportPanelId {
  if (step.examLens) {
    return "exam-lens";
  }

  if (step.visual) {
    return "visual";
  }

  if (step.interaction) {
    return "interaction";
  }

  if (relatedLabTools.length) {
    return "lab";
  }

  if (depthPortals.length) {
    return "depth";
  }

  return "focus";
}

function CourseSupportPanel({
  id,
  label,
  title,
  children,
  expanded,
  onToggle,
}: {
  id: SupportPanelId;
  label: string;
  title: string;
  children: ReactNode;
  expanded: boolean;
  onToggle: (id: SupportPanelId) => void;
}) {
  return (
    <section
      className={`course-support-panel ${expanded ? "is-expanded" : ""}`}
    >
      <Button
        type="button"
        variant="ghost"
        className="course-support-trigger"
        onClick={() => onToggle(id)}
        aria-expanded={expanded}
      >
        <span>{label}</span>
        <strong>{title}</strong>
        <ChevronDown data-icon />
      </Button>
      {expanded ? <div className="course-support-body">{children}</div> : null}
    </section>
  );
}

export function CourseConceptPlayer({
  concept,
  topicTitle,
  subjectName,
  backHref,
  nextHref,
  relatedLabTools = [],
}: {
  concept: CourseConceptPageModel["concept"];
  topicTitle: string;
  subjectName: string;
  backHref: string;
  nextHref?: string | null;
  relatedLabTools?: Pick<
    LabTool,
    "id" | "title" | "shortTitle" | "href" | "bacUseCase"
  >[];
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepDirection, setStepDirection] = useState<StepDirection>("next");
  const [revealedStepKeys, setRevealedStepKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [expandedPanel, setExpandedPanel] =
    useState<SupportPanelId>("exam-lens");
  const [quizOpen, setQuizOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const currentStep = concept.steps[stepIndex];
  const isLastStep = stepIndex === concept.steps.length - 1;
  const currentStepKey = `${stepIndex}:${currentStep.type}:${currentStep.title}`;
  const requiresReveal = isRoadblockStep(currentStep);
  const revealed = revealedStepKeys.has(currentStepKey);
  const canAdvance = !requiresReveal || revealed;
  const quizResult = useMemo(() => {
    if (!submitted || selectedAnswer === null) {
      return null;
    }

    return selectedAnswer === concept.quiz.correctIndex;
  }, [selectedAnswer, submitted, concept.quiz.correctIndex]);
  const currentVisualAsset = getVisualAsset(currentStep.visual);
  const cardInitial = reduceMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        x: stepDirection === "next" ? -52 : 52,
        rotateY: stepDirection === "next" ? -4 : 4,
      };
  const cardExit = reduceMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        x: stepDirection === "next" ? 52 : -52,
        rotateY: stepDirection === "next" ? 4 : -4,
      };

  function goToStep(nextIndex: number, direction?: StepDirection) {
    const clampedIndex = Math.max(
      0,
      Math.min(concept.steps.length - 1, nextIndex),
    );

    if (clampedIndex === stepIndex) {
      return;
    }

    if (clampedIndex > stepIndex && !canAdvance) {
      return;
    }

    setStepDirection(
      direction ?? (clampedIndex > stepIndex ? "next" : "previous"),
    );
    setStepIndex(clampedIndex);
    setExpandedPanel(
      getSupportPanelForStep(
        concept.steps[clampedIndex],
        relatedLabTools,
        concept.depthPortals,
      ),
    );
  }

  function revealCurrentStep() {
    setRevealedStepKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      if (nextKeys.has(currentStepKey)) {
        nextKeys.delete(currentStepKey);
      } else {
        nextKeys.add(currentStepKey);
      }

      return nextKeys;
    });
  }

  function forceRevealCurrentStep() {
    setRevealedStepKeys((currentKeys) => {
      if (currentKeys.has(currentStepKey)) {
        return currentKeys;
      }

      const nextKeys = new Set(currentKeys);
      nextKeys.add(currentStepKey);
      return nextKeys;
    });
  }

  function goNext() {
    if (!canAdvance) {
      forceRevealCurrentStep();
      return;
    }

    if (isLastStep) {
      setQuizOpen(true);
      return;
    }

    goToStep(stepIndex + 1, "next");
  }

  function goPrevious() {
    goToStep(stepIndex - 1, "previous");
  }

  function toggleSupportPanel(panelId: SupportPanelId) {
    setExpandedPanel((currentPanel) =>
      currentPanel === panelId ? "focus" : panelId,
    );
  }

  return (
    <div className="course-concept-player course-player-premium">
      <section className="course-concept-stage course-player-theater">
        <div
          className="course-player-storybar"
          aria-label="تقدم بطاقات المفهوم"
        >
          {concept.steps.map((step, index) => (
            <button
              key={`${step.type}:${step.title}`}
              type="button"
              className={`course-story-segment${
                index <= stepIndex ? " is-filled" : ""
              }${index === stepIndex ? " is-current" : ""}`}
              onClick={() => {
                goToStep(index);
              }}
              aria-label={`البطاقة ${index + 1}: ${step.title}`}
            >
              <span />
            </button>
          ))}
        </div>

        <div className="course-concept-stage-head course-player-head">
          <div>
            <p className="page-kicker">
              {subjectName} · {topicTitle}
            </p>
            <h1>{concept.title}</h1>
          </div>
          <div className="course-concept-stage-meta">
            <StudyBadge tone="brand">
              {concept.estimatedMinutes} دقائق
            </StudyBadge>
            <StudyBadge tone="accent">
              {stepIndex + 1}/{concept.steps.length}
            </StudyBadge>
          </div>
        </div>

        <div className="course-player-body">
          <div className="course-player-deck" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.article
                key={currentStepKey}
                className={cn(
                  "course-concept-step-card course-player-card",
                  currentStep.visual && "has-visual",
                  requiresReveal && "is-roadblock",
                  revealed && "is-revealed",
                )}
                custom={stepDirection}
                initial={cardInitial}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={cardExit}
                transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.14}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 64) {
                    goNext();
                  }

                  if (info.offset.x < -64) {
                    goPrevious();
                  }
                }}
              >
                <motion.div
                  className="course-card-flip"
                  animate={{ rotateY: revealed ? 180 : 0 }}
                  transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="course-card-face course-card-front">
                    <CourseStepVisual
                      step={currentStep}
                      asset={currentVisualAsset}
                    />
                    <CourseStepCopy
                      step={currentStep}
                      requiresReveal={requiresReveal}
                      revealed={revealed}
                      onReveal={revealCurrentStep}
                    />
                  </div>
                  {requiresReveal ? (
                    <div className="course-card-face course-card-back">
                      <CourseRoadblockBack
                        step={currentStep}
                        onHide={revealCurrentStep}
                        onNext={() => goToStep(stepIndex + 1, "next")}
                        nextDisabled={isLastStep}
                      />
                    </div>
                  ) : null}
                </motion.div>
              </motion.article>
            </AnimatePresence>
          </div>

          <aside
            className="course-concept-inspector course-player-inspector"
            aria-label="تفاصيل المفهوم"
          >
            <CourseSupportPanel
              id="focus"
              label="Card"
              title={
                requiresReveal ? (revealed ? "التفسير" : "تثبيت") : "المسار"
              }
              expanded={expandedPanel === "focus"}
              onToggle={toggleSupportPanel}
            >
              <p>
                {requiresReveal
                  ? revealed
                    ? (currentStep.examLens?.prompt ?? currentStep.body)
                    : (currentStep.interaction?.prompt ?? currentStep.title)
                  : currentStep.eyebrow}
              </p>
            </CourseSupportPanel>

            {relatedLabTools.length ? (
              <CourseSupportPanel
                id="lab"
                label="Lab"
                title="أداة المختبر"
                expanded={expandedPanel === "lab"}
                onToggle={toggleSupportPanel}
              >
                <div className="course-lab-link-list">
                  {relatedLabTools.map((tool) => (
                    <Link
                      key={tool.id}
                      href={tool.href}
                      className="course-lab-link"
                    >
                      <strong>{tool.title}</strong>
                      <small>{tool.bacUseCase}</small>
                    </Link>
                  ))}
                </div>
              </CourseSupportPanel>
            ) : null}

            {currentStep.visual ? (
              <CourseSupportPanel
                id="visual"
                label="Visual"
                title={currentStep.visual.title}
                expanded={expandedPanel === "visual"}
                onToggle={toggleSupportPanel}
              >
                <p>{currentStep.visual.altText}</p>
                {currentVisualAsset ? (
                  <div className="course-visual-asset-meta">
                    <small>
                      {visualAssetStatusLabels[currentVisualAsset.status] ??
                        currentVisualAsset.status}
                    </small>
                    <small>{currentVisualAsset.model}</small>
                  </div>
                ) : null}
              </CourseSupportPanel>
            ) : null}

            {currentStep.interaction ? (
              <CourseSupportPanel
                id="interaction"
                label="Check"
                title={currentStep.interaction.prompt}
                expanded={expandedPanel === "interaction"}
                onToggle={toggleSupportPanel}
              >
                {currentStep.interaction.items.length ? (
                  <div className="course-interaction-chips">
                    {currentStep.interaction.items.map((item) => (
                      <small key={item}>{item}</small>
                    ))}
                  </div>
                ) : null}
              </CourseSupportPanel>
            ) : null}

            {currentStep.examLens ? (
              <CourseSupportPanel
                id="exam-lens"
                label="BAC Lens"
                title={currentStep.examLens.bacSkill}
                expanded={expandedPanel === "exam-lens"}
                onToggle={toggleSupportPanel}
              >
                <p>{currentStep.examLens.prompt}</p>
                <small>{currentStep.examLens.trap}</small>
              </CourseSupportPanel>
            ) : null}

            {concept.depthPortals.length ? (
              <CourseSupportPanel
                id="depth"
                label="Dive"
                title="تعمق أكثر"
                expanded={expandedPanel === "depth"}
                onToggle={toggleSupportPanel}
              >
                <div className="course-depth-list">
                  {concept.depthPortals.map((portal) => (
                    <article key={portal.slug}>
                      <div>
                        <StudyBadge tone="accent">
                          {portalKindLabels[portal.kind] ?? portal.kind}
                        </StudyBadge>
                        <StudyBadge tone="brand">
                          {portal.estimatedMinutes} دقائق
                        </StudyBadge>
                      </div>
                      <h3>{portal.title}</h3>
                      <p>{portal.summary}</p>
                    </article>
                  ))}
                </div>
              </CourseSupportPanel>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="course-quiz-toggle h-11 rounded-full px-5"
              onClick={() => setQuizOpen((isOpen) => !isOpen)}
            >
              {quizOpen ? "أخف الاختبار" : "اختبار قصير"}
              <Sparkles data-icon />
            </Button>

            <SaveFlashcardButton
              draft={buildCourseStepFlashcardDraft(currentStep, {
                conceptTitle: concept.title,
                topicTitle,
                subjectName,
              })}
              label="احفظ هذه البطاقة"
              successLabel="حُفظت للمراجعة"
              className="course-save-flashcard h-11 px-5"
            />
          </aside>
        </div>

        <div className="course-concept-stage-actions">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full px-5"
            onClick={goPrevious}
            disabled={stepIndex === 0}
          >
            <ChevronRight data-icon />
            السابق
          </Button>
          <Button
            type="button"
            className="h-11 rounded-full px-5"
            onClick={goNext}
          >
            {isLastStep ? "الاختبار" : canAdvance ? "التالي" : "اقلب أولاً"}
            {canAdvance ? <ChevronLeft data-icon /> : <Sparkles data-icon />}
          </Button>
        </div>

        {quizOpen ? (
          <div className="course-quiz-dock">
            <div className="course-quiz-dock-head">
              <div>
                <p className="page-kicker">Micro Quiz</p>
                <h2>{concept.quiz.question}</h2>
              </div>
            </div>

            <div className="course-quiz-options">
              {concept.quiz.options.map((option, index) => (
                <SelectionCard
                  key={`${option}:${index}`}
                  type="button"
                  active={selectedAnswer === index}
                  className="min-h-14 grid-cols-[auto_1fr] items-center rounded-[1.35rem]"
                  onClick={() => {
                    setSelectedAnswer(index);
                    setSubmitted(false);
                  }}
                >
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <strong>{option}</strong>
                </SelectionCard>
              ))}
            </div>

            <div className="course-quiz-actions">
              <Button
                type="button"
                className="h-11 rounded-full px-5"
                onClick={() => setSubmitted(true)}
                disabled={selectedAnswer === null}
              >
                تحقق
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full px-5"
              >
                <Link href={backHref}>الموضوع</Link>
              </Button>
              {nextHref ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-full px-5"
                >
                  <Link href={nextHref}>التالي</Link>
                </Button>
              ) : null}
            </div>

            {quizResult !== null ? (
              <div
                className={`course-quiz-feedback${
                  quizResult ? " tone-success" : " tone-warning"
                }`}
              >
                <strong>{quizResult ? "صحيح" : "راجع البطاقة"}</strong>
                <p>{concept.quiz.explanation}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
