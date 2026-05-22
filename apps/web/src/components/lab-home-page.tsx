import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { LabMissionPanel } from "@/components/lab-mission-panel";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import type { LabToolMissionsResponse, LabToolSummary } from "@/lib/lab-api";
import {
  listLabSubjectGroups,
  listLabToolsForSubjectCode,
  subjectCodeToLabSlug,
  type LabTool,
} from "@/lib/lab-surface";

function getToolStatusPresentation(status: LabTool["status"]) {
  switch (status) {
    case "READY":
      return {
        label: "جاهز",
        tone: "success" as const,
      };
    case "DRAFT":
      return {
        label: "قيد التحضير",
        tone: "warning" as const,
      };
    case "HIDDEN":
      return {
        label: "مخفي",
        tone: "neutral" as const,
      };
  }
}

function LabToolInstrument({ tool }: { tool: LabTool }) {
  const isDnaTool = tool.id === "dna-to-protein";
  const isDocumentTool = tool.engineKinds.includes("document-reasoning");

  return (
    <div
      className={`instrument-visual lab-tool-visual ${
        isDnaTool || isDocumentTool ? "is-biology" : "is-function"
      }`}
      aria-hidden="true"
    >
      {isDnaTool ? (
        <svg
          className="instrument-vector lab-tool-vector"
          viewBox="0 0 240 150"
          fill="none"
        >
          <path d="M82 18c60 0 78 114 78 114" />
          <path d="M158 18c-60 0-78 114-78 114" />
          <path d="M92 38h56" />
          <path d="M84 66h72" />
          <path d="M84 94h72" />
          <path d="M92 122h56" />
        </svg>
      ) : (
        <svg
          className="instrument-vector lab-tool-vector"
          viewBox="0 0 240 150"
          fill="none"
        >
          <path d="M28 106c38-88 62-88 92 0s56 88 92 0" />
          <path d="M28 108h184" />
          <path d="M120 24v104" />
          <path d="M54 76h132" />
        </svg>
      )}

      <div className="instrument-mini-ui lab-tool-mini">
        {isDnaTool ? (
          <>
            <span>A</span>
            <span>T</span>
            <span>C</span>
            <span>G</span>
          </>
        ) : (
          <>
            <span>f(x)</span>
            <span>f&apos;</span>
            <span>0</span>
          </>
        )}
      </div>
    </div>
  );
}

export function LabHomePage({
  initialTools,
  initialToolMissions,
  requestedSubjectCode,
}: {
  initialTools?: LabToolSummary[];
  initialToolMissions?: Record<string, LabToolMissionsResponse>;
  requestedSubjectCode?: string | null;
}) {
  const requestedSubjectSlug = subjectCodeToLabSlug(requestedSubjectCode);
  const groups = listLabSubjectGroups({
    subjectSlug: requestedSubjectSlug,
  });
  const requestedSubjectTools = listLabToolsForSubjectCode(
    requestedSubjectCode,
  );
  const requestedSubjectUnavailable = Boolean(
    requestedSubjectCode && requestedSubjectTools.length === 0,
  );
  const toolCount = groups.reduce((sum, group) => sum + group.tools.length, 0);
  const readyToolCount = groups.reduce(
    (sum, group) => sum + group.readyToolCount,
    0,
  );
  const draftToolCount = groups.reduce(
    (sum, group) => sum + group.draftToolCount,
    0,
  );
  const missionCount =
    initialTools?.reduce((sum, tool) => sum + tool.missionCount, 0) ?? 0;
  const completedMissionCount =
    initialTools?.reduce((sum, tool) => sum + tool.completedMissionCount, 0) ??
    0;

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame lab-page">
        <StudyHeader
          eyebrow="المختبر"
          title="مختبر الأدوات"
          meta={[
            { label: "الأدوات", value: `${toolCount}` },
            { label: "المواد", value: `${groups.length}` },
            { label: "جاهزة", value: `${readyToolCount}` },
            { label: "قيد التحضير", value: `${draftToolCount}` },
            ...(initialTools
              ? [
                  {
                    label: "المهمات",
                    value: `${completedMissionCount}/${missionCount}`,
                  },
                ]
              : []),
          ]}
        />

        {requestedSubjectUnavailable ? (
          <section className="builder-wizard-alert" role="status">
            <h3>لا يوجد مختبر جاهز لهذه المادة بعد</h3>
            <p>
              طلب Study Command مادة {requestedSubjectCode}. إن كانت المادة
              ضمن الخطة فسترى أدواتها التحضيرية هنا، ولن نفتحها كأدوات جاهزة
              حتى تنشر.
            </p>
          </section>
        ) : null}

        {initialTools === undefined ? (
          <div className="hub-sync-notice">
            <p>تعذر تحميل تقدم مهمات المختبر الآن. الأدوات الأساسية متاحة.</p>
          </div>
        ) : null}

        <div className="lab-subject-sections">
          {groups.map((group) => (
            <section key={group.subjectSlug} className="lab-subject-section">
              <div className="lab-section-head">
                <div>
                  <p className="page-kicker">{group.title}</p>
                  <h2>{group.description}</h2>
                </div>
                <div className="lab-chip-row" aria-label="حالة أدوات المختبر">
                  <span>{group.readyToolCount} جاهزة</span>
                  <span>{group.draftToolCount} قيد التحضير</span>
                </div>
              </div>

              <div className="lab-tool-grid">
                {group.tools.map((tool) => {
                  const status = getToolStatusPresentation(tool.status);

                  return (
                    <article
                      key={tool.id}
                      className={`instrument-card lab-tool-card lab-tool-card-${tool.id}`}
                      data-status={tool.status}
                    >
                      <LabToolInstrument tool={tool} />
                      <div className="lab-tool-card-main">
                        <div className="lab-tool-card-head">
                          <div>
                            <p className="page-kicker">{group.title}</p>
                            <h3>{tool.title}</h3>
                          </div>
                          <StudyBadge tone={status.tone}>
                            {status.label}
                          </StudyBadge>
                        </div>
                        <p>{tool.description}</p>
                        <div className="lab-tool-use-case">
                          <span>BAC</span>
                          <strong>{tool.bacUseCase}</strong>
                        </div>
                        {tool.status === "READY" ? (
                          <Button asChild className="h-11 rounded-full px-5">
                            <Link href={tool.href}>
                              افتح الأداة
                              <ArrowUpLeft
                                data-icon
                                size={17}
                                strokeWidth={2.1}
                              />
                            </Link>
                          </Button>
                        ) : (
                          <Button disabled className="h-11 rounded-full px-5">
                            لم ينشر بعد
                          </Button>
                        )}
                      </div>

                      {tool.status === "READY" ? (
                        <LabMissionPanel
                          missions={
                            initialToolMissions?.[tool.id]?.missions ?? []
                          }
                          toolHref={tool.href}
                        />
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </StudyShell>
  );
}
