"use client";

import { ReactNode } from "react";
import { StudySectionCard } from "@/components/study-content";
import { StudyBadge, StudyKeyHint } from "@/components/study-shell";

type StudyQuestionTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "accent";

export function StudyQuestionPanel({
  title,
  subtitle,
  isActive = true,
  stateLabel,
  stateTone,
  positionLabel,
  pointsLabel,
  modeLabel,
  solutionViewed,
  topics,
  keyboardHint,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  isActive?: boolean;
  stateLabel: string;
  stateTone: StudyQuestionTone;
  positionLabel: string;
  pointsLabel?: string;
  modeLabel?: string;
  solutionViewed?: boolean;
  topics?: Array<{
    key: string;
    label: string;
  }>;
  keyboardHint?: {
    keys: string[];
    label: string;
  };
  actions?: ReactNode;
  children: ReactNode;
}) {
  const visibleTopics = topics?.slice(0, 4) ?? [];
  const hiddenTopicsCount = Math.max(0, (topics?.length ?? 0) - visibleTopics.length);

  return (
    <StudySectionCard tone="prompt">
      <div className="study-question-panel">
        <div className="study-question-panel-head">
          <div className="study-question-heading">
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {keyboardHint ? (
            <StudyKeyHint keys={keyboardHint.keys} label={keyboardHint.label} />
          ) : null}
        </div>

        <div className="study-question-state-row">
          {isActive ? <StudyBadge tone="brand">قيد الدراسة</StudyBadge> : null}
          <StudyBadge tone={stateTone}>{stateLabel}</StudyBadge>
          <StudyBadge tone="neutral">{positionLabel}</StudyBadge>
          {pointsLabel ? (
            <StudyBadge tone="neutral">{pointsLabel}</StudyBadge>
          ) : null}
          {modeLabel ? (
            <StudyBadge tone="neutral">{modeLabel}</StudyBadge>
          ) : null}
          {solutionViewed ? (
            <StudyBadge tone="accent">تم كشف الحل</StudyBadge>
          ) : null}
        </div>

        <div className="study-question-body">{children}</div>

        {visibleTopics.length ? (
          <div className="topic-chip-row">
            {visibleTopics.map((topic) => (
              <span key={topic.key}>{topic.label}</span>
            ))}
            {hiddenTopicsCount ? <span>+{hiddenTopicsCount}</span> : null}
          </div>
        ) : null}

        {actions ? (
          <div className="study-action-row study-action-row-tight">
            {actions}
          </div>
        ) : null}
      </div>
    </StudySectionCard>
  );
}
