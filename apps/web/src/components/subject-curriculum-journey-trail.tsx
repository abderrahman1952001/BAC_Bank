"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { StudyBadge } from "@/components/study-shell";
import {
  getCurriculumJourneyNodePresentation,
  getCurriculumJourneySectionSummary,
  type CurriculumJourney,
  type CurriculumJourneyNode,
  type CurriculumJourneyTone,
} from "@/lib/subject-curriculum-journey-view";
import { buildStudentTrainingDrillRoute } from "@/lib/student-routes";
import { formatRelativeStudyTimestamp } from "@/lib/study-time";

const nodeSpring = {
  type: "spring" as const,
  stiffness: 210,
  damping: 24,
  mass: 0.85,
};

function buildCurriculumJourneyNodeAction(
  curriculumJourney: CurriculumJourney,
  node: CurriculumJourneyNode,
) {
  if (node.status === "NEEDS_REVIEW") {
    return {
      label: "عالج المحور",
      href: buildStudentTrainingDrillRoute({
        subjectCode: curriculumJourney.subject.code,
        topicCodes: [node.curriculumNodeCode],
      }),
      tone: "warning" as const,
    };
  }

  if (node.status === "IN_PROGRESS") {
    return {
      label: "واصل المحور",
      href: buildStudentTrainingDrillRoute({
        subjectCode: curriculumJourney.subject.code,
        topicCodes: [node.curriculumNodeCode],
      }),
      tone: "brand" as const,
    };
  }

  if (node.status === "NOT_STARTED") {
    return {
      label: "ابدأ المحور",
      href: buildStudentTrainingDrillRoute({
        subjectCode: curriculumJourney.subject.code,
        topicCodes: [node.curriculumNodeCode],
      }),
      tone: "accent" as const,
    };
  }

  return {
    label: "ثبّت المستوى",
    href: buildStudentTrainingDrillRoute({
      subjectCode: curriculumJourney.subject.code,
      topicCodes: [node.curriculumNodeCode],
    }),
    tone: "success" as const,
  };
}

function CurriculumJourneyRailPath({
  pathLength,
  prefersReducedMotion,
}: {
  pathLength: number;
  prefersReducedMotion: boolean | null;
}) {
  return (
    <svg
      className="curriculum-journey-node-rail-line"
      viewBox="0 0 14 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="curriculum-journey-node-rail-track"
        d="M7 0 C7 28 7 72 7 100"
      />
      <motion.path
        className="curriculum-journey-node-rail-progress"
        d="M7 0 C7 28 7 72 7 100"
        initial={prefersReducedMotion ? false : { pathLength: 0 }}
        whileInView={{ pathLength }}
        viewport={{ once: true, margin: "-15% 0px -10% 0px" }}
        transition={{
          type: "spring",
          stiffness: 180,
          damping: 28,
        }}
      />
    </svg>
  );
}

function getNodeClassName(input: {
  tone: CurriculumJourneyTone;
  isRecommended: boolean;
  isRight: boolean;
  isPending: boolean;
}) {
  return `curriculum-journey-node curriculum-journey-node-motion tone-${input.tone}${
    input.isRecommended ? " is-recommended" : ""
  }${input.isRight ? " side-right" : ""}${input.isPending ? " is-pending" : ""}`;
}

export function SubjectCurriculumJourneyTrail({
  curriculumJourney,
  recommendedCurriculumNodeCode,
}: {
  curriculumJourney: CurriculumJourney;
  recommendedCurriculumNodeCode: string | null;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="curriculum-journey-map-canvas">
      {curriculumJourney.sections.map((section, sectionIndex) => {
        const sectionSummary = getCurriculumJourneySectionSummary(section);
        const sectionStartIndex = curriculumJourney.sections
          .slice(0, sectionIndex)
          .reduce(
            (sum, currentSection) => sum + currentSection.nodes.length,
            0,
          );

        return (
          <motion.section
            key={section.id}
            className="curriculum-journey-stage"
            initial={prefersReducedMotion ? false : { opacity: 0.92, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={nodeSpring}
          >
            <header className="curriculum-journey-stage-head">
              <div>
                <span className="curriculum-journey-stage-step">
                  المرحلة {sectionIndex + 1}
                </span>
                <h3>{section.title}</h3>
                {section.description ? <p>{section.description}</p> : null}
              </div>

              <div className="curriculum-journey-stage-metrics">
                <StudyBadge tone="brand">
                  {sectionSummary.progressPercent}% متوسط التقدم
                </StudyBadge>
                <StudyBadge tone="success">
                  {sectionSummary.solidCount} ثابتة
                </StudyBadge>
                {sectionSummary.needsReviewCount > 0 ? (
                  <StudyBadge tone="warning">
                    {sectionSummary.needsReviewCount} تحتاج مراجعة
                  </StudyBadge>
                ) : null}
              </div>
            </header>

            <div className="curriculum-journey-trail">
              {section.nodes.map((node, nodeIndex) => {
                const nodeAction = buildCurriculumJourneyNodeAction(
                  curriculumJourney,
                  node,
                );
                const currentMapIndex = sectionStartIndex + nodeIndex;
                const isRight = (sectionIndex + nodeIndex) % 2 === 1;
                const isLast = nodeIndex === section.nodes.length - 1;
                const presentation = getCurriculumJourneyNodePresentation(
                  node,
                  {
                    index: currentMapIndex,
                    isLast,
                    isRecommended:
                      recommendedCurriculumNodeCode ===
                      node.curriculumNodeCode,
                  },
                );

                return (
                  <motion.article
                    key={node.id}
                    className={getNodeClassName({
                      tone: presentation.tone,
                      isRecommended: presentation.isRecommended,
                      isRight,
                      isPending: node.status === "NOT_STARTED",
                    })}
                    style={presentation.style}
                    initial={
                      prefersReducedMotion
                        ? false
                        : { opacity: 0, y: 16, scale: 0.98 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={
                      prefersReducedMotion
                        ? undefined
                        : { y: presentation.isRecommended ? -4 : -2 }
                    }
                    transition={{
                      ...nodeSpring,
                      delay: prefersReducedMotion ? 0 : currentMapIndex * 0.035,
                    }}
                  >
                    <div
                      className="curriculum-journey-node-rail"
                      aria-hidden="true"
                    >
                      {!isLast ? (
                        <CurriculumJourneyRailPath
                          pathLength={presentation.connectorPathLength}
                          prefersReducedMotion={prefersReducedMotion}
                        />
                      ) : null}
                      <motion.span
                        className="curriculum-journey-node-orb"
                        initial={prefersReducedMotion ? false : { scale: 0.94 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 22,
                        }}
                      >
                        <span className="curriculum-journey-node-orb-shell">
                          <small>#{currentMapIndex + 1}</small>
                          <strong>{presentation.progressPercent}%</strong>
                        </span>
                      </motion.span>
                    </div>

                    <motion.div
                      className="curriculum-journey-node-body"
                      transition={nodeSpring}
                    >
                      <div className="curriculum-journey-node-copy">
                        <div className="curriculum-journey-node-badges">
                          <StudyBadge tone={presentation.tone}>
                            {presentation.statusLabel}
                          </StudyBadge>
                          {presentation.isRecommended ? (
                            <StudyBadge tone="brand">المقترح الآن</StudyBadge>
                          ) : null}
                          {node.weaknessScore > 0 ? (
                            <StudyBadge tone="warning">
                              ضعف {node.weaknessScore}
                            </StudyBadge>
                          ) : null}
                        </div>

                        <h4>{node.title}</h4>
                        <p>
                          {node.description ??
                            `راجع ${node.curriculumNodeName} ثم انتقل إلى المحور التالي.`}
                        </p>
                      </div>

                      <div className="curriculum-journey-node-meta">
                        <span>{node.curriculumNodeName}</span>
                        {node.estimatedSessions ? (
                          <span>{node.estimatedSessions} حصص تقريباً</span>
                        ) : null}
                        <span>
                          {node.attemptedQuestions > 0
                            ? `${node.correctCount}/${node.attemptedQuestions} صحيحة`
                            : "لم تبدأ بعد"}
                        </span>
                        <span>
                          {node.lastSeenAt
                            ? `آخر نشاط ${formatRelativeStudyTimestamp(
                                node.lastSeenAt,
                              )}`
                            : "جاهز للبدء"}
                        </span>
                        {node.recommendedPreviousNodeTitle ? (
                          <span>
                            يفضّل بعد {node.recommendedPreviousNodeTitle}
                          </span>
                        ) : null}
                      </div>

                      <div className="curriculum-journey-node-actions">
                        <Link
                          href={nodeAction.href}
                          className={`hub-activity-action tone-${nodeAction.tone}`}
                        >
                          {nodeAction.label}
                        </Link>
                        <div className="curriculum-journey-node-progress">
                          <div
                            className="hub-activity-progress-track"
                            aria-hidden="true"
                          >
                            <div
                              className={`hub-activity-progress-fill tone-${nodeAction.tone}`}
                              style={{
                                width:
                                  presentation.style[
                                    "--curriculum-journey-progress"
                                  ],
                              }}
                            />
                          </div>
                          <small>
                            {
                              presentation.style[
                                "--curriculum-journey-progress"
                              ]
                            }{" "}
                            إتقان
                          </small>
                        </div>
                      </div>
                    </motion.div>
                  </motion.article>
                );
              })}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
