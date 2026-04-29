"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StudyBadge } from "@/components/study-shell";
import type { PrototypeConcept } from "@/lib/course-prototype-content";

export function CourseConceptPlayer({
  concept,
  topicTitle,
  subjectName,
  backHref,
  nextHref,
}: {
  concept: PrototypeConcept;
  topicTitle: string;
  subjectName: string;
  backHref: string;
  nextHref?: string | null;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const currentStep = concept.steps[stepIndex];
  const isLastStep = stepIndex === concept.steps.length - 1;
  const quizResult = useMemo(() => {
    if (!submitted || selectedAnswer === null) {
      return null;
    }

    return selectedAnswer === concept.quiz.correctIndex;
  }, [selectedAnswer, submitted, concept.quiz.correctIndex]);

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
            <StudyBadge tone="brand">{concept.estimatedMinutes} دقائق</StudyBadge>
            <StudyBadge tone="accent">
              {stepIndex + 1}/{concept.steps.length}
            </StudyBadge>
          </div>
        </div>

        <article className="course-concept-step-card">
          <div className="course-concept-step-eyebrow">{currentStep.eyebrow}</div>
          <h2>{currentStep.title}</h2>
          <p>{currentStep.body}</p>
          {currentStep.bullets?.length ? (
            <ul className="course-concept-bullets">
              {currentStep.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </article>

        <div className="course-concept-stage-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
            disabled={stepIndex === 0}
          >
            السابق
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              setStepIndex((value) =>
                Math.min(concept.steps.length - 1, value + 1),
              )
            }
            disabled={isLastStep}
          >
            التالي
          </button>
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
            <button
              key={option}
              type="button"
              className={`course-quiz-option${
                selectedAnswer === index ? " selected" : ""
              }`}
              onClick={() => {
                setSelectedAnswer(index);
                setSubmitted(false);
              }}
            >
              <span>{index + 1}</span>
              <strong>{option}</strong>
            </button>
          ))}
        </div>

        <div className="course-quiz-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setSubmitted(true)}
            disabled={selectedAnswer === null}
          >
            تحقق من الإجابة
          </button>
          <Link href={backHref} className="btn-secondary">
            العودة إلى الموضوع
          </Link>
          {nextHref ? (
            <Link href={nextHref} className="btn-secondary">
              المفهوم التالي
            </Link>
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
    </div>
  );
}
