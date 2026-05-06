"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { StudyBadge } from "@/components/study-shell";
import {
  getRoadmapNodePresentation,
  getRoadmapSectionSummary,
  type Roadmap,
  type RoadmapNode,
  type RoadmapTone,
} from "@/lib/subject-roadmap-view";
import { buildStudentTrainingDrillRoute } from "@/lib/student-routes";
import { formatRelativeStudyTimestamp } from "@/lib/study-time";

const nodeSpring = {
  type: "spring" as const,
  stiffness: 210,
  damping: 24,
  mass: 0.85,
};

function buildRoadmapNodeAction(roadmap: Roadmap, node: RoadmapNode) {
  if (node.status === "NEEDS_REVIEW") {
    return {
      label: "عالج المحور",
      href: buildStudentTrainingDrillRoute({
        subjectCode: roadmap.subject.code,
        topicCodes: [node.topicCode],
      }),
      tone: "warning" as const,
    };
  }

  if (node.status === "IN_PROGRESS") {
    return {
      label: "واصل المحور",
      href: buildStudentTrainingDrillRoute({
        subjectCode: roadmap.subject.code,
        topicCodes: [node.topicCode],
      }),
      tone: "brand" as const,
    };
  }

  if (node.status === "NOT_STARTED") {
    return {
      label: "ابدأ المحور",
      href: buildStudentTrainingDrillRoute({
        subjectCode: roadmap.subject.code,
        topicCodes: [node.topicCode],
      }),
      tone: "accent" as const,
    };
  }

  return {
    label: "ثبّت المستوى",
    href: buildStudentTrainingDrillRoute({
      subjectCode: roadmap.subject.code,
      topicCodes: [node.topicCode],
    }),
    tone: "success" as const,
  };
}

function RoadmapRailPath({
  pathLength,
  prefersReducedMotion,
}: {
  pathLength: number;
  prefersReducedMotion: boolean | null;
}) {
  return (
    <svg
      className="roadmap-node-rail-line"
      viewBox="0 0 14 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className="roadmap-node-rail-track" d="M7 0 C7 28 7 72 7 100" />
      <motion.path
        className="roadmap-node-rail-progress"
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
  tone: RoadmapTone;
  isRecommended: boolean;
  isRight: boolean;
  isPending: boolean;
}) {
  return `roadmap-node roadmap-node-motion tone-${input.tone}${
    input.isRecommended ? " is-recommended" : ""
  }${input.isRight ? " side-right" : ""}${input.isPending ? " is-pending" : ""}`;
}

export function SubjectRoadmapTrail({
  roadmap,
  recommendedTopicCode,
}: {
  roadmap: Roadmap;
  recommendedTopicCode: string | null;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="roadmap-map-canvas">
      {roadmap.sections.map((section, sectionIndex) => {
        const sectionSummary = getRoadmapSectionSummary(section);
        const sectionStartIndex = roadmap.sections
          .slice(0, sectionIndex)
          .reduce((sum, currentSection) => sum + currentSection.nodes.length, 0);

        return (
          <motion.section
            key={section.id}
            className="roadmap-stage"
            initial={prefersReducedMotion ? false : { opacity: 0.92, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={nodeSpring}
          >
            <header className="roadmap-stage-head">
              <div>
                <span className="roadmap-stage-step">
                  المرحلة {sectionIndex + 1}
                </span>
                <h3>{section.title}</h3>
                {section.description ? <p>{section.description}</p> : null}
              </div>

              <div className="roadmap-stage-metrics">
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

            <div className="roadmap-trail">
              {section.nodes.map((node, nodeIndex) => {
                const nodeAction = buildRoadmapNodeAction(roadmap, node);
                const currentMapIndex = sectionStartIndex + nodeIndex;
                const isRight = (sectionIndex + nodeIndex) % 2 === 1;
                const isLast = nodeIndex === section.nodes.length - 1;
                const presentation = getRoadmapNodePresentation(node, {
                  index: currentMapIndex,
                  isLast,
                  isRecommended: recommendedTopicCode === node.topicCode,
                });

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
                    <div className="roadmap-node-rail" aria-hidden="true">
                      {!isLast ? (
                        <RoadmapRailPath
                          pathLength={presentation.connectorPathLength}
                          prefersReducedMotion={prefersReducedMotion}
                        />
                      ) : null}
                      <motion.span
                        className="roadmap-node-orb"
                        initial={prefersReducedMotion ? false : { scale: 0.94 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 22,
                        }}
                      >
                        <span className="roadmap-node-orb-shell">
                          <small>#{currentMapIndex + 1}</small>
                          <strong>{presentation.progressPercent}%</strong>
                        </span>
                      </motion.span>
                    </div>

                    <motion.div
                      className="roadmap-node-body"
                      transition={nodeSpring}
                    >
                      <div className="roadmap-node-copy">
                        <div className="roadmap-node-badges">
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
                            `راجع ${node.topicName} ثم انتقل إلى المحور التالي.`}
                        </p>
                      </div>

                      <div className="roadmap-node-meta">
                        <span>{node.topicName}</span>
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
                          <span>يفضّل بعد {node.recommendedPreviousNodeTitle}</span>
                        ) : null}
                      </div>

                      <div className="roadmap-node-actions">
                        <Link
                          href={nodeAction.href}
                          className={`hub-activity-action tone-${nodeAction.tone}`}
                        >
                          {nodeAction.label}
                        </Link>
                        <div className="roadmap-node-progress">
                          <div
                            className="hub-activity-progress-track"
                            aria-hidden="true"
                          >
                            <div
                              className={`hub-activity-progress-fill tone-${nodeAction.tone}`}
                              style={{
                                width: presentation.style["--roadmap-progress"],
                              }}
                            />
                          </div>
                          <small>
                            {presentation.style["--roadmap-progress"]} إتقان
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
