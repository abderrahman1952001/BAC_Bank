"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { StudyBadge } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { SelectionCard } from "@/components/ui/selection-card";
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
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const currentStep = concept.steps[stepIndex];
  const isLastStep = stepIndex === concept.steps.length - 1;
  const stepProgressPercent =
    concept.steps.length > 1
      ? Math.round((stepIndex / (concept.steps.length - 1)) * 100)
      : 100;
  const quizResult = useMemo(() => {
    if (!submitted || selectedAnswer === null) {
      return null;
    }

    return selectedAnswer === concept.quiz.correctIndex;
  }, [selectedAnswer, submitted, concept.quiz.correctIndex]);
  const currentVisualAsset = getVisualAsset(currentStep.visual);

  return (
    <div className="course-concept-player">
      <section className="course-concept-stage">
        <div className="course-concept-stage-head">
          <div>
            <p className="page-kicker">{subjectName}</p>
            <h1>{concept.title}</h1>
            <p>
              {topicTitle} · {concept.summary}
            </p>
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

        <div className="course-concept-lab-body">
          <nav className="course-concept-rail" aria-label="خطوات المفهوم">
            <div className="course-concept-rail-track" aria-hidden="true">
              <span style={{ height: `${stepProgressPercent}%` }} />
            </div>
            <div className="course-concept-step-dots">
              {concept.steps.map((step, index) => (
                <Button
                  key={`${step.type}:${step.title}`}
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn(
                    "size-10 rounded-full bg-card text-muted-foreground",
                    index <= stepIndex &&
                      "border-primary/40 bg-secondary text-primary",
                  )}
                  onClick={() => {
                    setStepIndex(index);
                  }}
                  aria-label={`الخطوة ${index + 1}: ${step.title}`}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </nav>

          <article
            className={`course-concept-step-card${
              currentStep.visual ? " has-visual" : ""
            }`}
          >
            {currentStep.visual ? (
              <figure className="course-concept-step-visual">
                {currentVisualAsset &&
                shouldRenderVisualAsset(currentVisualAsset) ? (
                  <Image
                    src={currentVisualAsset.url}
                    alt={currentStep.visual.altText}
                    width={currentVisualAsset.width}
                    height={currentVisualAsset.height}
                    loading="eager"
                    sizes="(max-width: 720px) 100vw, 32vw"
                    unoptimized
                  />
                ) : (
                  <div className="course-concept-visual-placeholder">
                    <span>{currentStep.visual.kind}</span>
                  </div>
                )}
                <figcaption>
                  <strong>{currentStep.visual.title}</strong>
                  <span>{currentStep.visual.description}</span>
                </figcaption>
              </figure>
            ) : null}

            <div className="course-concept-step-copy">
              <div className="course-concept-step-meta">
                <div className="course-concept-step-eyebrow">
                  {currentStep.eyebrow}
                </div>
                <span>
                  {stepTypeLabels[currentStep.type] ?? currentStep.type}
                </span>
              </div>
              <h2>{currentStep.title}</h2>
              <p>{currentStep.body}</p>
              {currentStep.bullets?.length ? (
                <ul className="course-concept-bullets">
                  {currentStep.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>

          <aside
            className="course-concept-inspector"
            aria-label="تفاصيل المفهوم"
          >
            {relatedLabTools.length ? (
              <section className="course-lab-links">
                <span>المختبر</span>
                <h3>جرّب هذا المفهوم</h3>
                <div className="course-lab-link-list">
                  {relatedLabTools.map((tool) => (
                    <Link key={tool.id} href={tool.href} className="course-lab-link">
                      <strong>{tool.title}</strong>
                      <small>{tool.bacUseCase}</small>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {currentStep.visual ? (
              <section>
                <span>Evidence</span>
                <h3>ما الذي يجب أن تراه؟</h3>
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
              </section>
            ) : null}

            {currentStep.interaction ? (
              <section>
                <span>Interaction</span>
                <h3>{currentStep.interaction.prompt}</h3>
                {currentStep.interaction.items.length ? (
                  <div className="course-interaction-chips">
                    {currentStep.interaction.items.map((item) => (
                      <small key={item}>{item}</small>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {currentStep.examLens ? (
              <section>
                <span>BAC Lens</span>
                <h3>{currentStep.examLens.bacSkill}</h3>
                <p>{currentStep.examLens.prompt}</p>
                <small>{currentStep.examLens.trap}</small>
              </section>
            ) : null}

            {!currentStep.visual &&
            !currentStep.interaction &&
            !currentStep.examLens ? (
              <section>
                <span>Focus</span>
                <h3>ثبت الفكرة الأساسية</h3>
                <p>اقرأ الخطوة، ثم انتقل مباشرة إلى التحقق السريع.</p>
              </section>
            ) : null}
          </aside>
        </div>

        <div className="course-concept-stage-actions">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full px-5"
            onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
            disabled={stepIndex === 0}
          >
            السابق
          </Button>
          <Button
            type="button"
            className="h-11 rounded-full px-5"
            onClick={() =>
              setStepIndex((value) =>
                Math.min(concept.steps.length - 1, value + 1),
              )
            }
            disabled={isLastStep}
          >
            التالي
          </Button>
        </div>
      </section>

      <section className="roadmap-map-shell course-quiz-shell">
        <div className="roadmap-map-head">
          <div>
            <p className="page-kicker">Micro Quiz</p>
            <h2>{concept.quiz.question}</h2>
            <p>اختبر الفكرة الأساسية قبل مغادرة هذا المفهوم.</p>
          </div>
        </div>

        <div className="course-quiz-options">
          {concept.quiz.options.map((option, index) => (
            <SelectionCard
              key={option}
              type="button"
              active={selectedAnswer === index}
              className="min-h-16 grid-cols-[auto_1fr] items-center rounded-[1.75rem]"
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
            تحقق من الإجابة
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-full px-5">
            <Link href={backHref}>العودة إلى الموضوع</Link>
          </Button>
          {nextHref ? (
            <Button asChild variant="outline" className="h-11 rounded-full px-5">
              <Link href={nextHref}>المفهوم التالي</Link>
            </Button>
          ) : null}
        </div>

        {quizResult !== null ? (
          <div
            className={`course-quiz-feedback${
              quizResult ? " tone-success" : " tone-warning"
            }`}
          >
            <strong>{quizResult ? "إجابة موفقة" : "أعد تثبيت الفكرة"}</strong>
            <p>{concept.quiz.explanation}</p>
          </div>
        ) : null}
      </section>

      {concept.depthPortals.length ? (
        <section className="roadmap-map-shell course-depth-shell">
          <div className="roadmap-map-head">
            <div>
              <p className="page-kicker">Explore Deeper</p>
              <h2>مسارات اختيارية لا توقف تقدمك</h2>
              <p>
                هذه التوسعات للفضول والفهم الأعمق. المسار الأساسي يبقى كاملاً
                حتى لو تركتها لوقت لاحق.
              </p>
            </div>
          </div>

          <div className="course-depth-grid">
            {concept.depthPortals.map((portal) => (
              <article key={portal.slug} className="course-depth-portal">
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
                <small>{portal.body}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
