"use client";

import { StudySectionCard } from "@/components/study-content";
import { StudyBadge } from "@/components/study-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatSessionType,
  formatStudyReviewReason,
  type StudySessionPedagogy,
  type StudySupportStyle,
} from "@/lib/study-api";
import {
  buildMethodGuidance,
  buildPedagogyAssistActions,
  getStudyPedagogyProfile,
  getWeakPointIntroStartLabel,
} from "@/lib/study-pedagogy";
import type { StudyQuestionModel } from "@/lib/study-surface";

export function StudyQuestionAssistCard({
  supportStyle,
  hasHints,
  hasMethodGuidance,
  canRevealSolution,
  onOpenHint,
  onOpenMethod,
  onRevealSolution,
}: {
  supportStyle: StudySupportStyle;
  hasHints: boolean;
  hasMethodGuidance: boolean;
  canRevealSolution: boolean;
  onOpenHint: () => void;
  onOpenMethod: () => void;
  onRevealSolution: () => void;
}) {
  const profile = getStudyPedagogyProfile(supportStyle);
  const actions = buildPedagogyAssistActions({
    supportStyle,
    hasHints,
    hasMethodGuidance,
    canRevealSolution,
  });
  const actionHandlers = {
    hint: onOpenHint,
    method: onOpenMethod,
    solution: onRevealSolution,
  } as const;

  return (
    <StudySectionCard tone="commentary" title={profile.assistTitle}>
      <p className="pedagogy-support-copy">{profile.assistCopy}</p>
      <div className="pedagogy-support-actions">
        {actions.map((action) => (
          <Button
            key={action.id}
            type="button"
            variant={action.tone === "primary" ? "default" : "outline"}
            className="h-10 rounded-full px-5"
            onClick={actionHandlers[action.id]}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </StudySectionCard>
  );
}

export function StudyQuestionMethodPanel({
  supportStyle,
  question,
}: {
  supportStyle: StudySupportStyle;
  question: StudyQuestionModel;
}) {
  const guidance = buildMethodGuidance({
    supportStyle,
    question,
  });

  return (
    <StudySectionCard tone="commentary" title={guidance.title}>
      <p className="pedagogy-support-copy">{guidance.summary}</p>
      <div className="pedagogy-checklist">
        {guidance.steps.map((step) => (
          <article key={step}>
            <strong>افعل هذا</strong>
            <span>{step}</span>
          </article>
        ))}
      </div>
    </StudySectionCard>
  );
}

export function StudyWeakPointIntroCard({
  intro,
  supportStyle,
  onStart,
}: {
  intro: StudySessionPedagogy["weakPointIntro"];
  supportStyle: StudySupportStyle;
  onStart: () => void;
}) {
  if (!intro) {
    return null;
  }

  return (
    <StudySectionCard tone="commentary" title={intro.title}>
      <div className="pedagogy-intro-stack">
        <div className="study-meta-row">
          {intro.topics.map((topic) => (
            <span key={topic.code} className="study-meta-pill">
              <strong>المحور</strong>
              <span>{topic.name}</span>
            </span>
          ))}
        </div>

        {intro.dominantReason ? (
          <div className="hub-spotlight-meta">
            <StudyBadge tone="warning">
              السبب الأوضح: {formatStudyReviewReason(intro.dominantReason)}
            </StudyBadge>
          </div>
        ) : null}

        <div className="pedagogy-checklist">
          {intro.keyRules.map((rule) => (
            <article key={rule}>
              <strong>ثبّت هذه القاعدة</strong>
              <span>{rule}</span>
            </article>
          ))}
        </div>

        {intro.commonTrap ? (
          <div className="pedagogy-trap-card">
            <strong>الفخ المتكرر</strong>
            <p>{intro.commonTrap}</p>
          </div>
        ) : null}

        {intro.prerequisiteTopics.length ? (
          <div className="chip-grid">
            {intro.prerequisiteTopics.map((topic) => (
              <Badge
                key={topic.code}
                variant="secondary"
                className="px-3 py-1.5"
              >
                {topic.name}
              </Badge>
            ))}
          </div>
        ) : null}

        {intro.starterExercise ? (
          <div className="pedagogy-example-card">
            <strong>سنبدأ بهذا المثال</strong>
            <p>
              {intro.starterExercise.exerciseTitle ?? "تمرين علاجي"}{" "}
              {intro.starterExercise.questionLabel
                ? `· ${intro.starterExercise.questionLabel}`
                : ""}
            </p>
            <small>
              {intro.starterExercise.source.subject.name} ·{" "}
              {intro.starterExercise.source.year} ·{" "}
              {formatSessionType(intro.starterExercise.source.sessionType)}
            </small>
            {intro.starterExercise.promptPreview ? (
              <p>{intro.starterExercise.promptPreview}</p>
            ) : null}
          </div>
        ) : null}

        <div className="study-action-row">
          <Button
            type="button"
            className="h-10 rounded-full px-5"
            onClick={onStart}
          >
            {getWeakPointIntroStartLabel(supportStyle)}
          </Button>
        </div>
      </div>
    </StudySectionCard>
  );
}
